const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-md bg-[#111] ${className}`} />
);

export const SkeletonCard = () => (
  <div className="dashboard-card rounded-xl p-5 sm:p-6">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 ml-auto" />
      </div>
    ))}
  </div>
);

export default Skeleton;
