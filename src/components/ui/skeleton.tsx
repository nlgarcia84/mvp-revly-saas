const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse ${className}`} />
);

export const SkeletonCard = () => (
  <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 shadow-[-5px_-5px_10px_#ffffff,5px_5px_10px_#d4d4d4] dark:shadow-[-5px_-5px_10px_#222222,5px_5px_10px_#0c0c0c]">
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
