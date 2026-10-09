type LandingCardProps = {
  children: React.ReactNode;
  className?: string;
};

export const LandingCard = ({ children, className = "" }: LandingCardProps) => (
  <div
    className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-colors duration-200 hover:border-sky-400/50 dark:border-white/[0.08] dark:bg-[#151922] dark:shadow-[0_12px_40px_rgba(0,0,0,0.16)] dark:hover:border-sky-400/25 ${className}`}
  >
    {children}
  </div>
);

export const LandingCardHeader = ({
  children,
  className = "",
}: LandingCardProps) => <div className={`mb-6 ${className}`}>{children}</div>;

export const LandingCardTitle = ({
  children,
  className = "",
}: LandingCardProps) => (
  <h3
    className={`text-lg font-semibold tracking-tight text-neutral-950 dark:text-white ${className}`}
  >
    {children}
  </h3>
);

export const LandingCardDescription = ({
  children,
  className = "",
}: LandingCardProps) => (
  <p
    className={`mt-1.5 text-sm leading-6 text-neutral-600 dark:text-slate-400 ${className}`}
  >
    {children}
  </p>
);

export const LandingCardContent = ({
  children,
  className = "",
}: LandingCardProps) => <div className={`${className}`}>{children}</div>;

export default LandingCard;
