export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <aside>Sidebar (placeholder)</aside>
      <section>{children}</section>
    </div>
  );
}
