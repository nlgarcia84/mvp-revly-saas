type LandingCardProps = {
  children: React.ReactNode;
  className?: string;
};

export const LandingCard = ({ children, className = "" }: LandingCardProps) => (
  <div
    className={`rounded-3xl border border-neutral-200/70 bg-white/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300/80 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_18px_50px_rgba(0,0,0,0.10)] dark:border-neutral-800/80 dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgba(255,255,255,0.02),0_12px_40px_rgba(0,0,0,0.35)] dark:hover:border-neutral-700/80 ${className}`}
  >
    {children}
  </div>
);

export const LandingCardHeader = ({
  children,
  className = "",
}: LandingCardProps) => <div className={`mb-4 ${className}`}>{children}</div>;

export const LandingCardTitle = ({
  children,
  className = "",
}: LandingCardProps) => (
  <h3
    className={`text-lg font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 ${className}`}
  >
    {children}
  </h3>
);

export const LandingCardDescription = ({
  children,
  className = "",
}: LandingCardProps) => (
  <p
    className={`mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400 ${className}`}
  >
    {children}
  </p>
);

export const LandingCardContent = ({
  children,
  className = "",
}: LandingCardProps) => <div className={`${className}`}>{children}</div>;

export default LandingCard;
