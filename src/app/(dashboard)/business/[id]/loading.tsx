// Esqueleto de carga para /business/[id] y todas sus secciones.
// Mantiene la altura aproximada del layout para evitar saltos de
// pantalla mientras se cargan el negocio y las features.

const BusinessLoading = () => (
  <div className="flex flex-col gap-6 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
    <div className="h-9 w-full rounded-md bg-neutral-200 dark:bg-neutral-800" />
    <div className="dashboard-card h-40 w-full rounded-xl skeleton-shimmer" />
  </div>
);

export default BusinessLoading;
