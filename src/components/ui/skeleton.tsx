const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-neutral-200/80 shadow-[inset_1px_1px_3px_rgba(163,163,163,0.18)] dark:bg-[#202632] dark:shadow-none ${className}`} />
);

export const SkeletonCard = () => (
  <div className="rounded-2xl bg-neutral-100 p-5 shadow-[-5px_-5px_10px_#ffffff,5px_5px_10px_#d4d4d4] dark:border dark:border-[#252B38] dark:bg-[#151922] dark:shadow-[0_8px_24px_rgba(0,0,0,0.18)] sm:p-6">
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
