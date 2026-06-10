export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Resumen de tu actividad</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Negocios</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>0</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Clientes</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>0</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Reseñas solicitadas</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>0</span>
        </div>
      </div>

      <div className="card">
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
          Crea tu primer negocio para empezar a recibir reseñas
        </p>
      </div>
    </div>
  );
}
