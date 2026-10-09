export const nCard =
  'rounded-2xl border border-white/70 bg-neutral-100 shadow-[-6px_-6px_14px_rgba(255,255,255,0.95),6px_6px_14px_rgba(163,163,163,0.42)] transition-[box-shadow,border-color] duration-200 dark:border-[#252B38] dark:bg-[#151922] dark:shadow-[8px_8px_20px_rgba(0,0,0,0.28),-4px_-4px_14px_rgba(55,65,81,0.12)]';

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
        : 'rounded-xl border border-neutral-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-[#252B38] dark:bg-[#151922] dark:shadow-[0_8px_24px_rgba(0,0,0,0.16)]'
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
