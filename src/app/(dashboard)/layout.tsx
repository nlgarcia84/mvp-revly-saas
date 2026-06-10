import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { syncUser } from '@/lib/sync-user';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await syncUser();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 32, overflowY: 'auto', background: 'var(--bg-secondary)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
