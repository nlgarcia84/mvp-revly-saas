import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        height: 56,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Reseñas MVP</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/sign-in" className="btn">Iniciar sesión</Link>
          <Link href="/sign-up" className="btn btn-primary">Registrarse</Link>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 640, textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
            Más reseñas en Google
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
            Ayuda a tu negocio a conseguir reseñas en Google de forma automática.
            Solicitudes personalizadas, seguimiento simple y más visibilidad online.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/sign-up" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 16 }}>
              Comenzar gratis
            </Link>
            <Link href="/sign-in" className="btn" style={{ padding: '12px 28px', fontSize: 16 }}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </main>

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-tertiary)',
      }}>
        Reseñas MVP
      </footer>
    </div>
  );
}
