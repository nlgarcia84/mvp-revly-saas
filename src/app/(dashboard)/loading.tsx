// ──────────────────────────────────────────────
// DashboardLoading
// ──────────────────────────────────────────────
// Skeleton de carga para el dashboard (app router).
// Se muestra mientras Next.js renderiza el layout
// o las páginas hijas. Usa animate-pulse de Tailwind
// para el efecto de "parpadeo" suave.
// ──────────────────────────────────────────────
const DashboardLoading = () => {
  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      <div className="dashboard-card rounded-xl p-5">
        <div className="skeleton-shimmer h-6 w-28 rounded" />
        <div className="skeleton-shimmer mt-3 h-4 w-52 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="dashboard-card skeleton-shimmer h-24 rounded-xl" />)}
      </div>
      <div className="dashboard-card skeleton-shimmer h-48 rounded-xl" />
    </div>
  );
};

export default DashboardLoading;
