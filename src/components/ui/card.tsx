export const nCard =
  'rounded-xl border border-neutral-200/80 bg-white shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 dark:border-white/10 dark:bg-[#0b0b0c] dark:shadow-none';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  neumorphic?: boolean;
};

export const Card = ({ children, className = '', neumorphic }: CardProps) => (
  <div
    className={`${
      neumorphic
        ? nCard
        : 'rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0b0c] dark:shadow-none'
    } ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }: CardProps) => (
  <div className={`px-5 sm:px-6 pt-5 sm:pt-6 pb-3 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: CardProps) => (
  <h3 className={`text-sm font-medium text-neutral-500 uppercase tracking-wider ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }: CardProps) => (
  <p className={`text-xs text-neutral-400 mt-0.5 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }: CardProps) => (
  <div className={`px-5 sm:px-6 pb-5 sm:pb-6 ${className}`}>
    {children}
  </div>
);
