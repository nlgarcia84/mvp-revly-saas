import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto bg-neutral-100">
          {children}
        </main>
      </div>
    </div>
  );
}
