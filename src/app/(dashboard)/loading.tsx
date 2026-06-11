const DashboardLoading = () => {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-6 w-28 bg-neutral-200 rounded" />
      <div className="h-4 w-52 bg-neutral-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-28 bg-neutral-200 rounded-xl" />
        <div className="h-28 bg-neutral-200 rounded-xl" />
        <div className="h-28 bg-neutral-200 rounded-xl" />
      </div>
      <div className="h-48 bg-neutral-200 rounded-xl" />
    </div>
  );
};

export default DashboardLoading;
