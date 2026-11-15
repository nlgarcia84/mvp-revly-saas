import { randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { hashCredential, randomToken, validToken, publicCookieName, takePublicRateLimit } from '@/lib/customer-capabilities';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { generateQrToken } from '@/lib/qr-token';
import { generateDiscountCode } from '@/lib/discount-code';
import { notifyCustomerRegistered, scheduleReviewRequest } from '@/lib/notifications';

const MINUTE = 60_000;
export const PROFILE_TTL = 24 * 60 * MINUTE;
const OTP_TTL = 10 * MINUTE;
const MESSAGE = 'Si el correo es válido, recibirás un código para continuar. Revisa también spam.';
const DENIED = { success: false as const, error: 'Código no válido o caducado. Solicita otro código.' };
export type Registration = { name: string; phone: string; whatsappOptIn: boolean };
export async function requestEmailChallenge(slug: unknown, rawEmail: unknown, registration?: Registration) {
  const id = randomToken();
  const acknowledgement = { success: true as const, challengeId: id, message: MESSAGE };
  if (typeof slug !== 'string' || slug.length > 150 || typeof rawEmail !== 'string') return acknowledgement;
  const email = rawEmail.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return acknowledgement;
  // Global + per-business budgets also bound attacks using many distinct addresses/IPs.
  if (!await takePublicRateLimit('email:global', 300) ||
      !await takePublicRateLimit(`email:business:${slug}`, 60) ||
      !await takePublicRateLimit(`email:address:${email}`, 3)) return acknowledgement;
  const business = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (!business) return acknowledgement;
  const code = randomInt(0, 100_000_000).toString().padStart(8, '0');
  // Send the same verification message for new and existing addresses. No account lookup here.
  await prisma.customerEmailChallenge.create({ data: {
    id, businessId: business.id, email, codeHash: scryptSync(code, id, 32).toString('hex'),
    registration: registration ?? Prisma.JsonNull, expiresAt: new Date(Date.now() + OTP_TTL),
  } });
  const sent = await sendEmail({ to: email, subject: 'Tu código de acceso a Revly',
    html: `<p>Introduce este código en la página donde lo solicitaste:</p><p><strong>${code}</strong></p><p>Caduca en 10 minutos y solo se puede usar una vez. Si no lo solicitaste, ignora este correo.</p>`,
  });
  if (!sent) await prisma.customerEmailChallenge.deleteMany({ where: { id } });
  // Bounded retention; failed requests cannot create unbounded records beyond the budgets.
  await Promise.all([
    prisma.customerEmailChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.customerCapability.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.publicAccessRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
  return acknowledgement;
}

export async function exchangeEmailCode(slug: unknown, challengeId: unknown, code: unknown) {
  if (typeof slug !== 'string' || !validToken(challengeId) || typeof code !== 'string' || !/^\d{8}$/.test(code)) return DENIED;
  const now = new Date();
  // Increment before comparing; concurrent requests cannot exceed five guesses.
  const attempt = await prisma.customerEmailChallenge.updateMany({
    where: { id: challengeId, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: 5 }, business: { slug } },
    data: { attempts: { increment: 1 } },
  });
  if (attempt.count !== 1) return DENIED;
  const challenge = await prisma.customerEmailChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || !timingSafeEqual(Buffer.from(challenge.codeHash, 'hex'), scryptSync(code, challengeId, 32))) return DENIED;
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + PROFILE_TTL);
  const result = await prisma.$transaction(async tx => {
    // Single-use redemption is claimed in the same transaction as customer/session changes.
    const claimed = await tx.customerEmailChallenge.updateMany({
      where: { id: challengeId, consumedAt: null, expiresAt: { gt: now }, attempts: { lte: 5 }, business: { slug } },
      data: { consumedAt: now, registration: Prisma.JsonNull },
    });
    if (claimed.count !== 1) return null;
    let customer = await tx.customer.findFirst({ where: { businessId: challenge.businessId, email: { equals: challenge.email, mode: 'insensitive' } } });
    let created = false;
    const registration = challenge.registration as Registration | null;
    if (registration) {
      if (customer) {
        customer = await tx.customer.update({ where: { id: customer.id, businessId: challenge.businessId }, data: registration });
      } else {
        customer = await tx.customer.create({ data: { ...registration, email: challenge.email, businessId: challenge.businessId, source: 'qr', points: 1, discountCode: generateDiscountCode(), qrToken: generateQrToken() } });
        await tx.pointMovement.create({ data: { type: 'welcome', points: 1, businessId: challenge.businessId, customerId: customer.id } });
        created = true;
      }
    }
    if (!customer) return null;
    if (!customer.qrToken) customer = await tx.customer.update({ where: { id: customer.id, businessId: challenge.businessId }, data: { qrToken: generateQrToken() } });
    await tx.customerCapability.create({ data: { tokenHash: hashCredential(token), customerId: customer.id, businessId: challenge.businessId, email: customer.email, scope: 'profile', expiresAt } });
    return { customer, created };
  });
  if (!result) return DENIED;
  const cookieStore = await cookies();
  cookieStore.set(publicCookieName(slug), token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });
  if (result.created) {
    const business = await prisma.business.findUnique({ where: { id: challenge.businessId }, select: { name: true, googleLink: true, emailTemplate: true } });
    if (business) {
      // Auth has completed before any welcome/review notification. No credentials in error logs.
      await Promise.allSettled([
        notifyCustomerRegistered({ name: result.customer.name, email: result.customer.email, businessName: business.name, points: result.customer.points, discountCode: result.customer.discountCode }),
        scheduleReviewRequest({ customerId: result.customer.id, name: result.customer.name, email: result.customer.email, businessName: business.name, googleLink: business.googleLink, emailTemplate: business.emailTemplate }),
      ]);
    }
  }
  return { success: true as const, customerId: result.customer.id };
}

export async function requirePublicCustomerAccess(slug: string) {
  const token = (await cookies()).get(publicCookieName(slug))?.value;
  if (!validToken(token)) return null;
  const grant = await prisma.customerCapability.findFirst({
    where: { tokenHash: hashCredential(token), scope: 'profile', expiresAt: { gt: new Date() }, business: { slug } },
    include: { customer: { select: { id: true, businessId: true, email: true } } },
  });
  if (!grant || grant.email !== grant.customer.email || grant.businessId !== grant.customer.businessId) return null;
  return { customerId: grant.customerId, businessId: grant.businessId, email: grant.email };
}

