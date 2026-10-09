const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-md bg-neutral-200/80 dark:bg-white/[0.08] ${className}`} />
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b0b0c] dark:shadow-none sm:p-6">
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
