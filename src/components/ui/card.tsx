export const nCard =
  'dashboard-card rounded-xl bg-[#0A0A0A] text-neutral-100 transition-[box-shadow,transform] duration-200';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  neumorphic?: boolean;
};

export const Card = ({ children, className = '', neumorphic }: CardProps) => (
  <div
    className={`${nCard} ${className}`}
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
  <h3 className={`text-sm font-medium uppercase tracking-wider text-neutral-400 ${className}`}>
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
