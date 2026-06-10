import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const { userId } = await auth();
  const businesses = await prisma.business.findMany({
    where: { userId },
    include: { _count: { select: { customers: true } } },
  });

  const totalBusinesses = businesses.length;
  const totalCustomers = businesses.reduce((acc, b) => acc + b._count.customers, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Resumen de tu actividad</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Negocios</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>{totalBusinesses}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Clientes</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>{totalCustomers}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Reseñas solicitadas</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>0</span>
        </div>
      </div>

      {totalBusinesses === 0 ? (
        <div className="card">
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
            Crea tu primer negocio para empezar a recibir reseñas
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {businesses.map((b) => (
            <div key={b.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div>
                <span style={{ fontWeight: 500 }}>{b.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 12 }}>
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
