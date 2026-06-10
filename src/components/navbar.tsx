import { UserButton } from '@clerk/nextjs';

export default function Navbar() {
  return (
    <header style={{
      height: 56,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      background: 'var(--bg)',
    }}>
      <span style={{ fontWeight: 600, fontSize: 16 }}>Reseñas MVP</span>
      <div style={{ marginLeft: 'auto' }}>
        <UserButton />
      </div>
    </header>
  );
}
