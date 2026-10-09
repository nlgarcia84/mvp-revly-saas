export const nCard =
  'rounded-2xl border border-white/60 bg-neutral-100 shadow-[-5px_-5px_10px_#ffffff,5px_5px_10px_#d4d4d4] dark:border-[#252B38] dark:bg-[#151922] dark:shadow-[0_8px_24px_rgba(0,0,0,0.18)]';

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
        : 'rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-[#252B38] dark:bg-[#151922]'
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
