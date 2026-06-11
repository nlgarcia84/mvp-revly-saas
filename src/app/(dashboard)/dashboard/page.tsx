import prisma from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  // TODO: obtener userId de Supabase
  const userId = '';
  const businesses = await prisma.business.findMany({
    where: { userId },
    include: { _count: { select: { customers: true } } },
  });

  const totalBusinesses = businesses.length;
  const totalCustomers = businesses.reduce((acc, b) => acc + b._count.customers, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
        <p className="text-sm text-neutral-500">Resumen de tu actividad</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
          <span className="text-xs text-neutral-500 font-medium">Negocios</span>
          <span className="text-4xl font-bold">{totalBusinesses}</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
          <span className="text-xs text-neutral-500 font-medium">Clientes</span>
          <span className="text-4xl font-bold">{totalCustomers}</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex flex-col gap-1">
          <span className="text-xs text-neutral-500 font-medium">Reseñas solicitadas</span>
          <span className="text-4xl font-bold">0</span>
        </div>
      </div>

      {totalBusinesses === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-neutral-400 text-center py-12">
            Crea tu primer negocio para empezar a recibir reseñas
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {businesses.map((b) => (
            <div key={b.id} className="bg-white border border-neutral-200 rounded-xl shadow-sm flex items-center justify-between px-5 py-4">
              <div>
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-neutral-400 ml-3">
                  {b._count.customers} clientes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
