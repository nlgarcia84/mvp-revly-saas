/** @jest-environment node */

import { updateCustomerStatus } from '@/actions/customers';
import prisma from '@/lib/db';

type StatusMutation = {
  where: { id?: string; business?: { userId?: string } };
  data: { status: string };
};

type CustomerFixture = {
  id: string;
  businessId: string;
  status: string;
  email: string;
  qrToken: string;
  discountCode: string;
};

const mockGetUser = jest.fn();
const mockUpdateMany = jest.fn<Promise<{ count: number }>, [StatusMutation]>();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    customer: {
      updateMany: (args: StatusMutation) => mockUpdateMany(args),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const businessOwners = new Map([
  ['business-a', 'owner-a'],
  ['business-a-second', 'owner-a'],
  ['business-b', 'owner-b'],
]);

let customers: CustomerFixture[];

function session(userId: string | null) {
  return { data: { user: userId ? { id: userId } : null }, error: null };
}

function expectNoDatabaseAccess() {
  expect(mockUpdateMany).not.toHaveBeenCalled();
  expect(prisma.customer.update).not.toHaveBeenCalled();
  expect(prisma.customer.findUnique).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockReset().mockResolvedValue(session('owner-a'));
  mockUpdateMany.mockReset();
  customers = [
    { id: 'customer-a', businessId: 'business-a' },
    { id: 'customer-a-second', businessId: 'business-a-second' },
    { id: 'customer-b', businessId: 'business-b' },
  ].map((customer) => ({
    ...customer,
    status: 'pending',
    email: `${customer.id}@example.invalid`,
    qrToken: `private-qr-${customer.id}`,
    discountCode: `private-discount-${customer.id}`,
  }));

  // Model the two predicates against independent tenant fixtures. Omitting
  // either predicate permits broader writes, so the isolation tests catch it.
  mockUpdateMany.mockImplementation(async ({ where, data }) => {
    const matches = customers.filter((customer) =>
      (where.id === undefined || customer.id === where.id) &&
      (where.business?.userId === undefined ||
        businessOwners.get(customer.businessId) === where.business.userId),
    );
    matches.forEach((customer) => { customer.status = data.status; });
    return { count: matches.length };
  });
});

describe('updateCustomerStatus: ownership and return contract', () => {
  it.each(['pending', 'invited', 'completed'])(
    'allows an owner to set %s and returns only the success acknowledgement',
    async (status) => {
      const before = customers.map((customer) => ({ ...customer }));

      const result = await updateCustomerStatus('customer-a', status);

      expect(result).toStrictEqual({ success: true });
      expect(customers).toStrictEqual(before.map((customer) =>
        customer.id === 'customer-a' ? { ...customer, status } : customer,
      ));
      expect(mockUpdateMany).toHaveBeenCalledTimes(1);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: 'customer-a', business: { userId: 'owner-a' } },
        data: { status },
      });
      expect(prisma.customer.update).not.toHaveBeenCalled();
      expect(prisma.customer.findUnique).not.toHaveBeenCalled();
    },
  );

  it('allows another business owned by the same authenticated user', async () => {
    await expect(updateCustomerStatus('customer-a-second', 'invited'))
      .resolves.toStrictEqual({ success: true });
    expect(customers.map(({ status }) => status)).toEqual(['pending', 'invited', 'pending']);
  });

  it('uses the authenticated tenant rather than a fixed or cached owner', async () => {
    mockGetUser.mockResolvedValue(session('owner-b'));

    await expect(updateCustomerStatus('customer-b', 'completed'))
      .resolves.toStrictEqual({ success: true });
    expect(customers.map(({ status }) => status)).toEqual(['pending', 'pending', 'completed']);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'customer-b', business: { userId: 'owner-b' } },
      data: { status: 'completed' },
    });
  });

  it.each([
    ['owner-a', 'customer-b'],
    ['owner-b', 'customer-a'],
  ])('rejects %s updating %s without changing any tenant data', async (ownerId, customerId) => {
    mockGetUser.mockResolvedValue(session(ownerId));
    const before = customers.map((customer) => ({ ...customer }));

    await expect(updateCustomerStatus(customerId, 'completed'))
      .rejects.toThrow(/^Cliente no encontrado$/);

    expect(customers).toStrictEqual(before);
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('returns the same generic error for a missing customer as for a foreign tenant', async () => {
    const before = customers.map((customer) => ({ ...customer }));

    await expect(updateCustomerStatus('missing-customer', 'invited'))
      .rejects.toThrow(/^Cliente no encontrado$/);
    expect(customers).toStrictEqual(before);
  });

  it('rechecks the session on consecutive requests', async () => {
    mockGetUser.mockResolvedValueOnce(session('owner-a')).mockResolvedValueOnce(session('owner-b'));
    await updateCustomerStatus('customer-a', 'invited');

    await expect(updateCustomerStatus('customer-a', 'completed'))
      .rejects.toThrow(/^Cliente no encontrado$/);

    expect(mockGetUser).toHaveBeenCalledTimes(2);
    expect(customers[0].status).toBe('invited');
  });

  it('propagates a failed database write instead of reporting success', async () => {
    const error = new Error('Database unavailable');
    const before = customers.map((customer) => ({ ...customer }));
    mockUpdateMany.mockRejectedValueOnce(error);

    await expect(updateCustomerStatus('customer-a', 'completed')).rejects.toBe(error);
    expect(customers).toStrictEqual(before);
  });
});

describe('updateCustomerStatus: session and runtime validation', () => {
  it.each(['invited', 'invalid-status'])('rejects an absent session before validating %s or accessing data', async (status) => {
    mockGetUser.mockResolvedValue(session(null));

    await expect(updateCustomerStatus('customer-a', status)).rejects.toThrow(/^No autenticado$/);

    expectNoDatabaseAccess();
  });

  it('rejects a session rejected by the auth provider without accessing data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Expired session') });

    await expect(updateCustomerStatus('customer-a', 'completed')).rejects.toThrow(/^No autenticado$/);
    expectNoDatabaseAccess();
  });

  it('fails closed when the auth provider is unavailable', async () => {
    const error = new Error('Auth unavailable');
    mockGetUser.mockRejectedValue(error);

    await expect(updateCustomerStatus('customer-a', 'completed')).rejects.toBe(error);
    expectNoDatabaseAccess();
  });

  it.each([
    '', 'PENDING', 'Invited', 'COMPLETED', ' pending', 'completed ', 'deleted',
    null, undefined, 1, {}, [], ['pending'],
  ])('rejects invalid runtime status %p without accessing data', async (status) => {
    // Server Actions can receive malformed input despite the TS string signature.
    await expect(updateCustomerStatus('customer-a', status as string))
      .rejects.toThrow(/^Estado de cliente no válido$/);

    expectNoDatabaseAccess();
    expect(customers.every((customer) => customer.status === 'pending')).toBe(true);
  });
});
