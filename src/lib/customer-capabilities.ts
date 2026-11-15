import { createHash, randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
const WINDOW = 15 * 60_000;
export const REVIEW_TTL = 7 * 24 * 60 * 60_000;
export const hashCredential = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export const validToken = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const publicCookieName = (slug: string) => `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}revly_customer_${hashCredential(slug).slice(0, 16)}`;
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
// Google hosts only, HTTPS and no credentials. Never use the request's redirect parameter.
export function safeGoogleReviewUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!['google.com', 'www.google.com', 'maps.google.com', 'search.google.com', 'g.page', 'maps.app.goo.gl'].includes(host)) return null;
    // Prevent Google search/url redirectors becoming an open redirect in our UI.
    if (host.endsWith('google.com') && !/^\/(?:maps(?:\/|$)|local\/writereview(?:\/|$))/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

// Atomic persistent limits shared by all lambdas. Keys contain hashes, never email/IP.
export async function takePublicRateLimit(subject: string, max: number, now = new Date()) {
  const start = Math.floor(now.getTime() / WINDOW) * WINDOW;
  const row = await prisma.publicAccessRateLimit.upsert({
    where: { key: hashCredential(`${subject}:${start}`) },
    create: { key: hashCredential(`${subject}:${start}`), count: 1, expiresAt: new Date(start + WINDOW) },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return row.count <= max;
}

// Only call after authorizing the recipient: dashboard ownership or a verified registration.
export async function issueReviewToken(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { businessId: true, email: true } });
  if (!customer) throw new Error('Cliente no encontrado');
  const token = randomToken();
  await prisma.customerCapability.create({ data: { tokenHash: hashCredential(token), customerId, businessId: customer.businessId, email: customer.email, scope: 'review', expiresAt: new Date(Date.now() + REVIEW_TTL) } });
  return token;
}
export async function authorizeReview(customerId: string, token: unknown) {
  if (!validToken(token)) return null;
  const grant = await prisma.customerCapability.findFirst({
    where: { tokenHash: hashCredential(token), customerId, scope: 'review', expiresAt: { gt: new Date() } },
    include: { customer: { select: { email: true, businessId: true } } },
  });
  if (!grant || grant.email !== grant.customer.email || grant.businessId !== grant.customer.businessId) return null;
  return { businessId: grant.businessId, tokenHash: grant.tokenHash, email: grant.email };
}
