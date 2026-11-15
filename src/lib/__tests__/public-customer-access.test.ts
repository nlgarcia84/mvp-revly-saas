/** @jest-environment node */
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { requestEmailChallenge, exchangeEmailCode, requirePublicCustomerAccess } from '@/lib/public-customer-access';
import { hashCredential, publicCookieName, issueReviewToken, safeGoogleReviewUrl, takePublicRateLimit } from '@/lib/customer-capabilities';
import { getPublicCustomer, findPublicCustomerByEmail } from '@/actions/customers';
import { addPublicCustomer } from '@/actions/business';
import { GET, POST } from '@/app/api/review-confirm/[customerId]/route';
import { buildReviewEmail } from '@/lib/review-email';
import { sendInvitation, getWhatsAppLink } from '@/actions/send';

const mockCookies = new Map<string, string>();
const mockSetCookie = jest.fn((key: string, value: string, _options?: unknown) => { mockCookies.set(key, value); });
const mockGetUser = jest.fn();
jest.mock('next/headers', () => ({ cookies: async () => ({ get: (key: string) => mockCookies.has(key) ? { value: mockCookies.get(key) } : undefined, set: (key: string, value: string, options: unknown) => mockSetCookie(key, value, options) }) }));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mockGetUser } }) }));
jest.mock('@/lib/email', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ notifyCustomerRegistered: jest.fn(), scheduleReviewRequest: jest.fn() }));
jest.mock('@/lib/db', () => ({ __esModule: true, default: {
  business: { findUnique: jest.fn() },
  customer: Object.fromEntries(['findFirst','findUnique','create','update','updateMany'].map(k => [k, jest.fn()])),
  customerEmailChallenge: Object.fromEntries(['create','findUnique','updateMany','deleteMany'].map(k => [k, jest.fn()])),
  customerCapability: Object.fromEntries(['create','findFirst','deleteMany'].map(k => [k, jest.fn()])),
  publicAccessRateLimit: { upsert: jest.fn(), deleteMany: jest.fn() },
  pointMovement: { create: jest.fn() }, $transaction: jest.fn(),
} }));
const db = prisma as any;
const businesses = [{ id: 'business-a', slug: 'a', name: '<img src=x onerror=alert(1)>', userId: 'owner-a', googleLink: 'https://search.google.com/local/writereview?placeid=abc' }, { id: 'business-b', slug: 'b', name: 'B', userId: 'owner-b', googleLink: 'https://g.page/r/example/review' }];
let customers: any[], challenges: any[], grants: any[], limits: Map<string, any>;
const clone = (o: any) => o == null ? o : structuredClone(o);
const expires = (row: any, where: any) => (!where.expiresAt?.gt || row.expiresAt > where.expiresAt.gt) && (!where.expiresAt?.lt || row.expiresAt < where.expiresAt.lt);
function challengeMatches(r: any, w: any) {
  return (!w.id || r.id === w.id) && (w.consumedAt !== null || r.consumedAt === null) && expires(r,w) &&
    (!w.attempts?.lt || r.attempts < w.attempts.lt) && (!w.attempts?.lte || r.attempts <= w.attempts.lte) &&
    (!w.business?.slug || businesses.find(b => b.id === r.businessId)?.slug === w.business.slug);
}
function grantMatches(r: any, w: any) {
  return (!w.tokenHash || r.tokenHash === w.tokenHash) && (!w.scope || r.scope === w.scope) &&
    (!w.customerId || r.customerId === w.customerId) && expires(r,w) &&
    (!w.business?.slug || businesses.find(b => b.id === r.businessId)?.slug === w.business.slug);
}
function customerMatches(r: any, w: any) {
  const email = typeof w.email === 'string' ? r.email === w.email : !w.email || r.email.toLowerCase() === w.email.equals.toLowerCase();
  return (!w.id || r.id === w.id) && (!w.businessId || r.businessId === w.businessId) && email &&
    (!w.business?.userId || businesses.find(b => b.id === r.businessId)?.userId === w.business.userId) &&
    (!w.capabilities?.some || grants.some(g => g.customerId === r.id && g.businessId === r.businessId && grantMatches(g,w.capabilities.some)));
}
function withBusiness(c: any) { return c ? { ...clone(c), business: clone(businesses.find(b => b.id === c.businessId)) } : null; }
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(new Date('2026-11-15T12:00:00Z'));
  mockCookies.clear(); challenges = []; grants = []; limits = new Map();
  customers = ['a','b'].map(s => ({ id: `customer-${s}`, businessId: `business-${s}`, email: `${s}@example.invalid`, name: s.toUpperCase(), phone: '341234', qrToken: `qr-${s}`, discountCode: `discount-${s}`, points: 5, status: 'pending' }));
  (sendEmail as jest.Mock).mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-a' } } });
  mockSetCookie.mockImplementation((key, value) => { mockCookies.set(key, value); });
  db.business.findUnique.mockImplementation(async ({ where }) => clone(businesses.find(b => where.slug ? b.slug === where.slug : b.id === where.id) ?? null));
  db.customerEmailChallenge.create.mockImplementation(async ({ data }) => { challenges.push({ ...clone(data), registration: data.registration && 'name' in data.registration ? clone(data.registration) : null, attempts: 0, consumedAt: null }); return clone(challenges.at(-1)); });
  db.customerEmailChallenge.findUnique.mockImplementation(async ({ where }) => clone(challenges.find(c => c.id === where.id) ?? null));
  db.customerEmailChallenge.updateMany.mockImplementation(async ({ where, data }) => { const found = challenges.filter(c => challengeMatches(c,where)); found.forEach(c => { if (data.attempts) c.attempts += data.attempts.increment; if (data.consumedAt) { c.consumedAt = data.consumedAt; c.registration = null; } }); return { count: found.length }; });
  db.customerEmailChallenge.deleteMany.mockImplementation(async ({ where }) => { challenges = challenges.filter(c => !((where.id && where.id === c.id) || (where.expiresAt?.lt && c.expiresAt < where.expiresAt.lt))); return { count: 0 }; });
  db.customerCapability.create.mockImplementation(async ({ data }) => { grants.push(clone(data)); return clone(data); });
  db.customerCapability.findFirst.mockImplementation(async ({ where, include }) => { const g = grants.find(g => grantMatches(g,where)); return g ? { ...clone(g), ...(include ? { customer: clone(customers.find(c => c.id === g.customerId)) } : {}) } : null; });
  db.customerCapability.deleteMany.mockResolvedValue({ count: 0 });
  db.publicAccessRateLimit.deleteMany.mockResolvedValue({ count: 0 });
  db.publicAccessRateLimit.upsert.mockImplementation(async ({ where, create }) => { const r = limits.get(where.key); if (r) r.count++; else limits.set(where.key,clone(create)); return clone(limits.get(where.key)); });
  db.customer.findFirst.mockImplementation(async ({ where }) => withBusiness(customers.find(c => customerMatches(c,where))));
  db.customer.findUnique.mockImplementation(async ({ where }) => withBusiness(customers.find(c => c.id === where.id)));
  db.customer.update.mockImplementation(async ({ where, data }) => { const c = customers.find(c => customerMatches(c,where)); if (!c) throw Error('missing'); Object.assign(c,clone(data)); return withBusiness(c); });
  db.customer.updateMany.mockImplementation(async ({ where, data }) => { const found = customers.filter(c => customerMatches(c,where)); found.forEach(c => Object.assign(c,clone(data))); return { count: found.length }; });
  db.customer.create.mockImplementation(async ({ data }) => { const c = { id: `customer-new-${customers.length}`, ...clone(data) }; customers.push(c); return clone(c); });
  db.$transaction.mockImplementation(async fn => { const saved = clone({ customers, challenges, grants }); try { return await fn(db); } catch(e) { ({ customers, challenges, grants } = saved); throw e; } });
});
afterEach(() => jest.useRealTimers());

async function request(slug = 'a', email = 'a@example.invalid', registration?: any) {
  const result = await requestEmailChallenge(slug, email, registration);
  const call = (sendEmail as jest.Mock).mock.calls.at(-1)?.[0];
  const code = call?.html.match(/<strong>(\d{8})<\/strong>/)?.[1];
  return { id: result.challengeId, code, result };
}
async function verified(slug = 'a', email = 'a@example.invalid') {
  const c = await request(slug,email); return exchangeEmailCode(slug,c.id,c.code);
}
async function review(customerId: string, payload: any, extra?: any) {
  return POST(new Request(`https://revly.example/api/review-confirm/${customerId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(payload) }), { params: Promise.resolve({ customerId }) });
}
function expectNoCustomerMutation() {
  expect(db.customer.create).not.toHaveBeenCalled(); expect(db.customer.update).not.toHaveBeenCalled(); expect(db.customer.updateMany).not.toHaveBeenCalled(); expect(db.pointMovement.create).not.toHaveBeenCalled(); expect(mockSetCookie).not.toHaveBeenCalled();
}

it('gives identical generic responses and sends the same code message for new/existing email without looking up customers', async () => {
  const known = await request(); const fresh = await request('a','new@example.invalid');
  expect({ ...known.result, challengeId: '' }).toEqual({ ...fresh.result, challengeId: '' });
  expect(db.customer.findFirst).not.toHaveBeenCalled(); expectNoCustomerMutation();
  expect(grants).toHaveLength(0);
  expect(challenges[0].codeHash).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(challenges)).not.toContain(known.code);
});
it('stores profile data pending verification, with no customer overwrite or rewards', async () => {
  const before = clone(customers);
  const result = await addPublicCustomer({ slug: 'a', email: 'a@example.invalid', name: 'Changed', phone: '0', consent: true });
  expect(result.success).toBe(true); expect(customers).toEqual(before); expectNoCustomerMutation();
});
it('verifies existing customer, issues a scoped HttpOnly session and returns no token/private fields', async () => {
  const result = await verified();
  expect(result).toEqual({ success: true, customerId: 'customer-a' });
  expect(mockSetCookie).toHaveBeenCalledWith(publicCookieName('a'), expect.any(String), expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', expires: new Date('2026-11-16T12:00:00Z') }));
  expect(grants[0]).toMatchObject({ customerId: 'customer-a', businessId: 'business-a', scope: 'profile' });
  expect(grants[0].tokenHash).not.toBe(mockCookies.get(publicCookieName('a')));
  expect((await getPublicCustomer('customer-a','a'))?.qrToken).toBe('qr-a');
  expect(await getPublicCustomer('customer-b','a')).toBeNull();
  expect(await getPublicCustomer('customer-b','b')).toBeNull();
  expect(await findPublicCustomerByEmail('a','b@example.invalid')).toBeNull();
});
it('only applies pending existing-customer edits after a valid OTP for that business', async () => {
  const c = await request('b','b@example.invalid',{ name: 'Verified B', phone: '0', whatsappOptIn: true });
  expect(await exchangeEmailCode('a',c.id,c.code)).toMatchObject({ success: false });
  expect(customers[1].name).toBe('B');
  expect(await exchangeEmailCode('b',c.id,c.code)).toMatchObject({ success: true });
  expect(customers[1].name).toBe('Verified B'); expect(customers[0].name).toBe('A');
});
it('creates a verified customer once with one welcome movement and preserves replay protection', async () => {
  const c = await request('a','new@example.invalid',{ name: 'New', phone: '', whatsappOptIn: false });
  expectNoCustomerMutation();
  expect(await exchangeEmailCode('a',c.id,c.code)).toMatchObject({ success: true });
  expect(db.customer.create).toHaveBeenCalledTimes(1); expect(db.pointMovement.create).toHaveBeenCalledTimes(1);
  expect(await exchangeEmailCode('a',c.id,c.code)).toMatchObject({ success: false });
  expect(db.customer.create).toHaveBeenCalledTimes(1);
});
it('allows only one of two concurrent valid OTP redemptions', async () => {
  const c = await request();
  const results = await Promise.all([exchangeEmailCode('a',c.id,c.code),exchangeEmailCode('a',c.id,c.code)]);
  expect(results.filter(r => r.success)).toHaveLength(1); expect(grants).toHaveLength(1);
});
it.each(['bad','00000000',null,12345678])('rejects invalid OTP %p without customer writes', async value => {
  const c = await request();
  const bad = value === c.code ? '99999999' : value;
  expect(await exchangeEmailCode('a',c.id,bad)).toMatchObject({ success: false }); expectNoCustomerMutation();
});
it('expires OTP exactly at ten minutes', async () => {
  const c = await request(); jest.advanceTimersByTime(10*60_000);
  expect(await exchangeEmailCode('a',c.id,c.code)).toMatchObject({ success: false }); expectNoCustomerMutation();
});
it('locks a challenge after five wrong attempts, including a subsequent correct OTP', async () => {
  const c = await request();
  const wrong = c.code === '00000000' ? '11111111' : '00000000';
  for(let n=0;n<5;n++) await exchangeEmailCode('a',c.id,wrong);
  expect(await exchangeEmailCode('a',c.id,c.code)).toMatchObject({ success: false }); expectNoCustomerMutation();
});
it('rate limits email requests globally across different businesses, with generic acknowledgement', async () => {
  await request(); await request('b','a@example.invalid'); await request();
  const result = await request('b','a@example.invalid');
  expect(result.result.success).toBe(true); expect(sendEmail).toHaveBeenCalledTimes(3);
  expect(challenges).toHaveLength(3);
});
it('rate limits a business independently of email addresses', async () => {
  for(let n=0;n<61;n++) await request('a',`person${n}@example.invalid`);
  expect(sendEmail).toHaveBeenCalledTimes(60);
});
it('fails closed if delivery fails, without exposing credentials or editing a customer', async () => {
  (sendEmail as jest.Mock).mockResolvedValue(false);
  const c = await request(); expect(c.result.success).toBe(true); expect(challenges).toHaveLength(0); expectNoCustomerMutation();
});
it('never reveals private information for known identifiers without a cookie', async () => {
  expect(await getPublicCustomer('customer-a','a')).toBeNull(); expect(await findPublicCustomerByEmail('a','a@example.invalid')).toBeNull(); expectNoCustomerMutation();
});
it('denies expired, manipulated and wrong-business profile capabilities', async () => {
  await verified(); const original = mockCookies.get(publicCookieName('a'))!;
  mockCookies.set(publicCookieName('a'),'X'+original.slice(1)); expect(await requirePublicCustomerAccess('a')).toBeNull();
  mockCookies.set(publicCookieName('b'),original); expect(await requirePublicCustomerAccess('b')).toBeNull();
  mockCookies.set(publicCookieName('a'),original); jest.advanceTimersByTime(24*60*60_000); expect(await requirePublicCustomerAccess('a')).toBeNull();
});
it('rejects a profile session when the customer email changed after verification', async () => {
  await verified(); customers[0].email='changed@example.invalid'; expect(await requirePublicCustomerAccess('a')).toBeNull();
});
it('does not create a customer just because an unknown email completed recovery', async () => {
  const c = await request('a','absent@example.invalid');
  expect(await exchangeEmailCode('a',c.id,c.code)).toMatchObject({ success: false }); expectNoCustomerMutation();
});
it('rolls back code consumption if the database fails during session issuance', async () => {
  const c = await request(); db.customerCapability.create.mockRejectedValueOnce(Error('DB failed'));
  await expect(exchangeEmailCode('a',c.id,c.code)).rejects.toThrow(); expect(challenges[0].consumedAt).toBeNull(); expect(mockSetCookie).not.toHaveBeenCalled();
});

it('GET is a generic shell: no customer reads/writes, no auto-rating, no external redirect', async () => {
  const before = clone(customers);
  const response = await GET(new Request('https://revly.example/api/review-confirm/customer-a?auto=1&rating=5&redirect=https://evil.invalid'),{ params: Promise.resolve({ customerId: 'customer-a' }) });
  const html = await response.text(); expect(response.status).toBe(200); expect(customers).toEqual(before);
  expect(db.customer.findFirst).not.toHaveBeenCalled(); expect(db.customerCapability.findFirst).not.toHaveBeenCalled();
  expect(html).not.toContain('evil.invalid'); expect(html).not.toContain(businesses[0].name); expect(response.headers.get('content-security-policy')).toContain("default-src 'none'"); expectNoCustomerMutation();
});
it('issues review-only tokens stored as hashes, delivered as fragments in email and WhatsApp', async () => {
  const token = await issueReviewToken('customer-a');
  const built = buildReviewEmail({ customerId:'customer-a', customerName:'<script>x</script>', businessName: businesses[0].name, googleLink:businesses[0].googleLink, baseUrl:'https://revly.example', reviewToken: token });
  const url = new URL(built.reviewUrl); expect(url.searchParams.has('token')).toBe(false); expect(url.hash).toContain(token);
  expect(built.html).not.toContain('<script>'); expect(built.html).not.toContain('<img'); expect(JSON.stringify(grants)).not.toContain(token);
  const whatsapp = await getWhatsAppLink('customer-a'); expect(new URL(whatsapp.reviewUrl).hash).toContain('token=');
});
it('rejects arbitrary HTML attributes in review templates and escapes names', async () => {
  const built = buildReviewEmail({ customerId:'customer-a',customerName:'<img src=x>',businessName:'<script>x</script>',googleLink:businesses[0].googleLink,baseUrl:'https://revly.example',reviewToken:'A'.repeat(43),emailTemplate:'<script>alert(1)</script><p onclick="x">{{nombre}}</p><strong>{{negocio}}</strong>' });
  expect(built.html).not.toContain('<script>'); expect(built.html).not.toContain('<p onclick='); expect(built.html).toContain('<strong>&lt;script&gt;');
});
it('authorizes only the intended customer/business and scope, before any sensitive read or write', async () => {
  const token = await issueReviewToken('customer-a');
  expect((await review('customer-b',{ action:'view',token })).status).toBe(403);
  expect(db.customer.findFirst).not.toHaveBeenCalled(); expect(db.publicAccessRateLimit.upsert).not.toHaveBeenCalled();
  expect((await review('customer-a',{ action:'view',token })).status).toBe(200);
  const view = await (await review('customer-a',{ action:'view',token })).json(); expect(view.googleLink).toBe(businesses[0].googleLink); expectNoCustomerMutation();
  mockCookies.set(publicCookieName('a'),token); expect(await getPublicCustomer('customer-a','a')).toBeNull();
});
it('cannot use a profile capability to submit a review', async () => {
  await verified(); const token = mockCookies.get(publicCookieName('a'));
  db.customer.update.mockClear(); mockSetCookie.mockClear();
  expect((await review('customer-a',{ action:'submit',token,rating:1 })).status).toBe(403); expectNoCustomerMutation();
});
it.each([undefined,null,'bad','A'.repeat(43)])('denies missing/manipulated review token %p without side effects', async token => {
  expect((await review('customer-a',{ action:'submit',token,rating:5 })).status).toBe(403); expectNoCustomerMutation(); expect(db.publicAccessRateLimit.upsert).not.toHaveBeenCalled(); expect(db.customer.findFirst).not.toHaveBeenCalled();
});
it('rejects an expired review token at exactly seven days', async () => {
  const token=await issueReviewToken('customer-a'); jest.advanceTimersByTime(7*24*60*60_000);
  expect((await review('customer-a',{ action:'submit',token,rating:5 })).status).toBe(403); expectNoCustomerMutation();
});
it('supports a legitimate rating, later comment and subsequent access to Google, with bounded reuse', async () => {
  const token=await issueReviewToken('customer-a');
  expect((await review('customer-a',{ action:'submit',token,rating:4 })).status).toBe(200);
  expect((await review('customer-a',{ action:'submit',token,rating:4,feedback:'Buen servicio' })).status).toBe(200);
  expect(customers[0]).toMatchObject({ status:'completed', rating:4,feedback:'Buen servicio' }); expect(customers[1]).not.toHaveProperty('rating');
  for(let n=0;n<8;n++) await review('customer-a',{action:'submit',token,rating:4});
  expect((await review('customer-a',{action:'submit',token,rating:4})).status).toBe(429);
});
it.each([0,6,1.5,'5',null,{},[],true])('rejects invalid rating %p after authorization without mutation', async rating => {
  const token=await issueReviewToken('customer-a'); expect((await review('customer-a',{ action:'submit',token,rating })).status).toBe(400); expectNoCustomerMutation();
});
it.each([null,5,{},[], 'x'.repeat(2001)])('rejects invalid feedback without mutation', async feedback => {
  const token=await issueReviewToken('customer-a'); expect((await review('customer-a',{ action:'submit',token,rating:5,feedback })).status).toBe(400); expectNoCustomerMutation();
});
it('rejects extra fields, malformed JSON and cross-origin requests', async () => {
  const token=await issueReviewToken('customer-a');
  expect((await review('customer-a',{action:'submit',token,rating:5,businessId:'business-b'})).status).toBe(400);
  expect((await review('customer-a',{action:'submit',token,rating:5},{origin:'https://evil.invalid'})).status).toBe(403);
  const response=await POST(new Request('https://revly.example',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'}),{params:Promise.resolve({customerId:'customer-a'})}); expect(response.status).toBe(400); expectNoCustomerMutation();
});
it.each(['https://evil.invalid','javascript:alert(1)','https://www.google.com/url?q=https://evil.invalid','https://google.com.evil.invalid/maps','https://user:pass@google.com/maps','http://google.com/maps'])('rejects unsafe Google link %s', url => { expect(safeGoogleReviewUrl(url)).toBeNull(); });
it('limits atomically within a persistent time window and permits a later window', async () => {
  const now = new Date(); expect(await takePublicRateLimit('test',1,now)).toBe(true); expect(await takePublicRateLimit('test',1,now)).toBe(false); expect(await takePublicRateLimit('test',1,new Date(now.getTime()+15*60_000))).toBe(true);
});
it('checks ownership before issuing a WhatsApp review token or invitation', async () => {
  await expect(getWhatsAppLink('customer-b')).rejects.toThrow(); await expect(sendInvitation('customer-b')).rejects.toThrow(); expect(grants).toHaveLength(0); expect(sendEmail).not.toHaveBeenCalled();
});

it('rechecks expiry in the writing statement if a capability expires after initial authorization', async () => {
  const token = await issueReviewToken('customer-a');
  db.publicAccessRateLimit.upsert.mockImplementationOnce(async () => { grants[0].expiresAt = new Date(); return { count: 1 }; });
  expect((await review('customer-a',{action:'submit',token,rating:5})).status).toBe(403);
  expect(customers[0]).not.toHaveProperty('rating');
});
it('rejects a review capability after its recipient email changes', async () => {
  const token = await issueReviewToken('customer-a'); customers[0].email = 'other@example.invalid';
  expect((await review('customer-a',{action:'view',token})).status).toBe(403);
  expectNoCustomerMutation();
});
it('bounds streamed JSON before attempting authorization or customer access', async () => {
  const response=await review('customer-a',{action:'submit',rating:5,feedback:'x'.repeat(12001)});
  expect(response.status).toBe(400); expect(db.customerCapability.findFirst).not.toHaveBeenCalled(); expectNoCustomerMutation();
});
it('keeps the two profile sessions separate even for an identical verified email in two businesses', async () => {
  customers[1].email = customers[0].email;
  await verified('a','a@example.invalid'); await verified('b','a@example.invalid');
  expect((await getPublicCustomer('customer-a','a'))?.id).toBe('customer-a');
  expect((await getPublicCustomer('customer-b','b'))?.id).toBe('customer-b');
  expect(await getPublicCustomer('customer-b','a')).toBeNull();
});
