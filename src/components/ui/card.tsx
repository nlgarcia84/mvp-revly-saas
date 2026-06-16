export const nCard =
  'bg-neutral-100 dark:bg-neutral-900 rounded-2xl shadow-[-5px_-5px_10px_#ffffff,5px_5px_10px_#d4d4d4] dark:shadow-[-5px_-5px_10px_#222222,5px_5px_10px_#0c0c0c]';

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
        : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm'
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
