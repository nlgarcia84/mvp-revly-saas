/** @jest-environment node */
import {
  addCustomer, addCustomerBatch, getCustomers, getCustomerSummary,
  deleteCustomer, deleteSelectedCustomers, clearCustomers, clearCompletedCustomers,
  scanCustomerToken, findPublicCustomerByEmail, getPublicCustomer,
} from '@/actions/customers';
import { addPointToCustomer, addPointByEmployee, subtractPointFromCustomer, setCustomerPoints } from '@/actions/points';
import { redeemDiscountCodeInDashboard, redeemRewardByEmployee } from '@/actions/redeem';
import { sendInvitation, sendBatchInvitations, getWhatsAppLink } from '@/actions/send';
import { GET as report } from '@/app/api/report/[businessId]/route';
import { GET as confirmReview, POST as saveReview } from '@/app/api/review-confirm/[customerId]/route';
import { addPublicCustomer } from '@/actions/business';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email';

const mockGetUser = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mockGetUser } }) }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: jest.fn() }) }));
jest.mock('@/lib/email', () => ({ sendEmail: jest.fn(async () => true) }));
jest.mock('@/lib/notifications', () => ({ notifyCustomerDiscount: jest.fn(), notifyCustomerRegistered: jest.fn(), notifyBusinessNewCustomer: jest.fn() }));
jest.mock('@/lib/db', () => ({ __esModule: true, default: {
  customer: Object.fromEntries(['findFirst', 'findUnique', 'findMany', 'count', 'groupBy', 'aggregate', 'deleteMany', 'delete', 'update', 'create'].map(k => [k, jest.fn()])),
  business: { findFirst: jest.fn(), findUnique: jest.fn() },
  customerCapability: { create: jest.fn() },
  pointMovement: { count: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
} }));

const db = prisma as any;
const owners = { a: 'owner-a', a2: 'owner-a', b: 'owner-b' };
let rows: any[];
let userId: string | null;
const session = (id: string | null) => { userId = id; mockGetUser.mockResolvedValue({ data: { user: id ? { id } : null }, error: null }); };
function matches(row: any, w: any = {}) {
  return (!w.id || (typeof w.id === 'string' ? row.id === w.id : w.id.in.includes(row.id))) &&
    (!w.businessId || row.businessId === w.businessId) &&
    (!w.business?.userId || owners[row.businessId] === w.business.userId) &&
    (!w.status || row.status === w.status) && (!w.qrToken || row.qrToken === w.qrToken) &&
    (!w.discountCode || row.discountCode === w.discountCode) &&
    (!w.email_businessId || (row.email === w.email_businessId.email && row.businessId === w.email_businessId.businessId));
}
beforeEach(() => {
  jest.resetAllMocks();
  (sendEmail as jest.Mock).mockResolvedValue(true);
  session('owner-a');
  rows = ['a', 'a2', 'b'].map(businessId => ({ id: `customer-${businessId}`, businessId, name: 'Private name', email: `${businessId}@example.invalid`, phone: '34123456789', points: 5, discountCode: `CODE-${businessId}`, qrToken: `qr-${businessId}`, status: 'completed', business: { name: businessId, slug: businessId, loyaltyEnabled: true, googleLink: 'https://example.invalid', ticketFormat: null } }));
  db.customer.findFirst.mockImplementation(async ({ where }) => rows.find(r => matches(r, where)) ?? null);
  db.customer.findUnique.mockImplementation(async ({ where }) => rows.find(r => matches(r, where)) ?? null);
  db.customer.findMany.mockImplementation(async ({ where }) => rows.filter(r => matches(r, where)));
  db.customer.count.mockImplementation(async ({ where }) => rows.filter(r => matches(r, where)).length);
  db.customer.groupBy.mockImplementation(async ({ where }) => [{ status: 'completed', _count: { _all: rows.filter(r => matches(r, where)).length } }]);
  db.customer.deleteMany.mockImplementation(async ({ where }) => { const before = rows.length; rows = rows.filter(r => !matches(r, where)); return { count: before - rows.length }; });
  db.customer.update.mockImplementation(async ({ where, data }) => { const row = rows.find(r => matches(r, where)); if (!row) throw new Error('Missing'); Object.assign(row, data); return row; });
  db.business.findFirst.mockImplementation(async ({ where }) => owners[where.id] === where.userId ? { id: where.id, name: where.id, loyaltyEnabled: true, _count: { customers: 1 } } : null);
  db.business.findUnique.mockImplementation(async ({ where }) => owners[where.slug] ? { id: where.slug, name: where.slug } : null);
  // Each tenant has a different private number of redemptions.
  db.pointMovement.count.mockImplementation(async ({ where }) => where.business?.userId && owners[where.businessId] !== where.business.userId ? 0 : ({ a: 2, b: 9 }[where.businessId] ?? 0));
  db.$transaction.mockImplementation(async arg => typeof arg === 'function' ? arg(db) : Promise.all(arg));
});

it.each([['owner-a', 'b'], ['owner-b', 'a']])('isolates listing and summary for %s requesting %s', async (owner, businessId) => {
  session(owner);
  expect((await getCustomers(businessId)).customers).toEqual([]);
  expect((await getCustomers(businessId)).total).toBe(0);
  expect(await getCustomerSummary(businessId)).toEqual({ total: 0, pending: 0, invited: 0, completed: 0, redeemedThisMonth: 0 });
});
it.each([['owner-a', 'a', 2], ['owner-b', 'b', 9]])('preserves owned listing and summary for %s', async (owner, businessId, redeemed) => {
  session(owner);
  expect((await getCustomers(businessId as string)).customers.map(r => r.id)).toEqual([`customer-${businessId}`]);
  expect((await getCustomerSummary(businessId as string)).redeemedThisMonth).toBe(redeemed);
});
it('does not query data for anonymous listing or summary', async () => {
  session(null);
  expect((await getCustomers('a')).total).toBe(0);
  expect((await getCustomerSummary('a')).total).toBe(0);
  expect(db.$transaction).not.toHaveBeenCalled();
});

const throwing = [
  ['delete', (b: string) => deleteCustomer(`customer-${b}`)],
  ['clear', (b: string) => clearCustomers(b)],
  ['clear completed', (b: string) => clearCompletedCustomers(b)],
  ['create', (b: string) => addCustomer({ businessId: b, name: 'X', email: 'x@example.invalid', phone: '' })],
  ['import', (b: string) => addCustomerBatch(b, [{ email: 'x@example.invalid', phone: '' }])],
  ['invitation', (b: string) => sendInvitation(`customer-${b}`)],
  ['WhatsApp', (b: string) => getWhatsAppLink(`customer-${b}`)],
] as const;
describe.each(throwing)('%s', (_name, action) => {
  it.each([['owner-a', 'b'], ['owner-b', 'a'], [null, 'a']])('rejects %s accessing %s without mutations', async (owner, businessId) => {
    session(owner);
    const before = structuredClone(rows);
    await expect(action(businessId)).rejects.toThrow();
    expect(rows).toEqual(before);
    expect(db.customer.update).not.toHaveBeenCalled();
    if (_name !== 'delete' || !owner) expect(db.customer.deleteMany).not.toHaveBeenCalled();
    expect(db.customer.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    if (!owner) expect(db.customer.findFirst).not.toHaveBeenCalled();
  });
});
const results = [
  ['earn', (b: string) => addPointToCustomer(`customer-${b}`)],
  ['subtract', (b: string) => subtractPointFromCustomer(`customer-${b}`)],
  ['set points', (b: string) => setCustomerPoints(`customer-${b}`, 3)],
  ['employee earn', (b: string) => addPointByEmployee(`customer-${b}`, b)],
  ['employee redeem', (b: string) => redeemRewardByEmployee(`customer-${b}`, b)],
  ['code redeem', (b: string) => redeemDiscountCodeInDashboard(b, `CODE-${b}`)],
  ['scan', (b: string) => scanCustomerToken(`qr-${b}`, b)],
] as const;
describe.each(results)('%s', (_name, action) => {
  it.each([['owner-a', 'b'], ['owner-b', 'a'], [null, 'a']])('rejects %s accessing %s before mutation', async (owner, businessId) => {
    session(owner);
    expect((await action(businessId)).success).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.customer.update).not.toHaveBeenCalled();
    if (!owner) expect(db.customer.findFirst).not.toHaveBeenCalled();
  });
});
it('rejects mismatched customer and owned business in employee flows', async () => {
  expect((await addPointByEmployee('customer-b', 'a')).success).toBe(false);
  expect((await redeemRewardByEmployee('customer-b', 'a')).success).toBe(false);
  expect((await scanCustomerToken('qr-b', 'a')).success).toBe(false);
  expect(db.$transaction).not.toHaveBeenCalled();
});
it('deletes only owned customers in a mixed selection, including another owned business', async () => {
  expect(await deleteSelectedCustomers(['customer-a', 'customer-b', 'customer-a2', 'missing'])).toEqual({ deleted: 2 });
  expect(rows.map(r => r.id)).toEqual(['customer-b']);
});
it('rejects anonymous bulk deletion', async () => {
  session(null);
  await expect(deleteSelectedCustomers(['customer-a'])).rejects.toThrow('No autenticado');
  expect(db.customer.deleteMany).not.toHaveBeenCalled();
});
it.each(['delete', 'clear', 'completed'])('allows owned %s deletion and preserves foreign rows', async mode => {
  if (mode === 'delete') await deleteCustomer('customer-a');
  if (mode === 'clear') await clearCustomers('a');
  if (mode === 'completed') expect(await clearCompletedCustomers('a')).toEqual({ count: 1 });
  expect(rows.map(r => r.id)).toEqual(['customer-a2', 'customer-b']);
});
it('rejects a nonexistent customer with a generic deletion error', async () => {
  await expect(deleteCustomer('missing')).rejects.toThrow('Cliente no encontrado');
});
it('counts only owned recipients in invitation batches', async () => {
  expect(await sendBatchInvitations(['customer-a', 'customer-b'])).toEqual({ sent: 1, failed: 1 });
  expect(rows.find(r => r.id === 'customer-b').status).toBe('completed');
});
it.each([['owner-a', 'b', 404], ['owner-b', 'a', 404], [null, 'a', 401]])('protects report for %s accessing %s', async (owner, businessId, status) => {
  session(owner as string | null);
  expect((await report(new Request('https://example.invalid'), { params: Promise.resolve({ businessId: businessId as string }) })).status).toBe(status);
  expect(db.customer.findMany).not.toHaveBeenCalled();
  expect(db.customer.count).not.toHaveBeenCalled();
});

// Original exploit cases retained as regression assertions of denial.
describe('public paths require proof instead of identifiers', () => {
  it('does not expose a foreign customer by slug and email without a verified session', async () => {
    session(null);
    expect(await findPublicCustomerByEmail('b', 'b@example.invalid')).toBeNull();
    expect(db.customer.findUnique).not.toHaveBeenCalled();
  });
  it('does not expose QR capability by customer ID and slug', async () => {
    session(null);
    expect(await getPublicCustomer('customer-b', 'b')).toBeNull();
    expect(db.customer.findFirst).not.toHaveBeenCalled();
  });
  it('denies a mismatched slug without identity proof', async () => {
    expect(await getPublicCustomer('customer-b', 'a')).toBeNull();
  });
  it('does not overwrite existing customer via public registration before email verification', async () => {
    session(null);
    const before = structuredClone(rows);
    await addPublicCustomer({ slug: 'b', email: 'b@example.invalid', name: 'Attacker', phone: '0', consent: true });
    expect(rows).toEqual(before);
    expect(db.customer.update).not.toHaveBeenCalled();
  });
  it('never modifies a review from GET, including a legacy auto/rating URL', async () => {
    session(null);
    const before = structuredClone(rows);
    await confirmReview(new Request('https://example.invalid/api/review-confirm/customer-b?auto=1&rating=1'), { params: Promise.resolve({ customerId: 'customer-b' }) });
    expect(rows).toEqual(before);
    expect(db.customer.update).not.toHaveBeenCalled();
    expect(db.customer.findUnique).not.toHaveBeenCalled();
  });
  it('rejects foreign feedback submitted with only a known customer ID', async () => {
    session(null);
    const before = structuredClone(rows);
    const response = await saveReview(new Request('https://example.invalid/api/review-confirm/customer-b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', rating: 1, feedback: 'Attacker' }) }), { params: Promise.resolve({ customerId: 'customer-b' }) });
    expect(response.status).toBe(403);
    expect(rows).toEqual(before);
  });
});
