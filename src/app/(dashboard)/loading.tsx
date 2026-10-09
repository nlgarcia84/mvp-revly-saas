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
    <div className="flex min-w-0 flex-col gap-5 animate-pulse sm:gap-6">
      <div className="h-6 w-28 rounded bg-neutral-200 dark:bg-[#151922]" />
      <div className="h-4 w-52 rounded bg-neutral-200 dark:bg-[#151922]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="h-24 rounded-2xl bg-neutral-200 dark:bg-[#151922]" />
        <div className="h-24 rounded-2xl bg-neutral-200 dark:bg-[#151922]" />
        <div className="h-24 rounded-2xl bg-neutral-200 dark:bg-[#151922]" />
        <div className="h-24 rounded-2xl bg-neutral-200 dark:bg-[#151922]" />
      </div>
      <div className="h-48 rounded-2xl bg-neutral-200 dark:bg-[#151922]" />
    </div>
  );
};

export default DashboardLoading;
