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
    <div className="flex flex-col gap-6" aria-label="Cargando dashboard" role="status">
      <div className="h-28 rounded-xl border border-neutral-200 bg-white dark:border-[#1B202B] dark:bg-[#151922]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="h-28 rounded-xl border border-neutral-200 bg-white dark:border-[#1B202B] dark:bg-[#151922]" />
        <div className="h-28 rounded-xl border border-neutral-200 bg-white dark:border-[#1B202B] dark:bg-[#151922]" />
        <div className="h-28 rounded-xl border border-neutral-200 bg-white dark:border-[#1B202B] dark:bg-[#151922]" />
        <div className="h-28 rounded-xl border border-neutral-200 bg-white dark:border-[#1B202B] dark:bg-[#151922]" />
      </div>
      <div className="h-64 rounded-xl border border-neutral-200 bg-white dark:border-[#1B202B] dark:bg-[#151922]" />
    </div>
  );
};

export default DashboardLoading;
