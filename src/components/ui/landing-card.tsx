type LandingCardProps = {
  children: React.ReactNode;
  className?: string;
};

export const LandingCard = ({ children, className = "" }: LandingCardProps) => (
  <div
    className={`rounded-3xl border border-white/80 bg-neutral-100 p-8 shadow-[-6px_-6px_14px_#ffffff,6px_6px_14px_#d4d4d4] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-200 dark:border-neutral-800 dark:bg-[#151922] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] dark:hover:border-neutral-700 ${className}`}
  >
    {children}
  </div>
);

export const LandingCardHeader = ({
  children,
  className = "",
}: LandingCardProps) => <div className={`mb-5 ${className}`}>{children}</div>;

export const LandingCardTitle = ({
  children,
  className = "",
}: LandingCardProps) => (
  <h3
    className={`text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 ${className}`}
  >
    {children}
  </h3>
);

export const LandingCardDescription = ({
  children,
  className = "",
}: LandingCardProps) => (
  <p
    className={`mt-1.5 text-sm leading-6 text-neutral-500 dark:text-neutral-400 ${className}`}
  >
    {children}
  </p>
);

export const LandingCardContent = ({
  children,
  className = "",
}: LandingCardProps) => <div className={`${className}`}>{children}</div>;

export default LandingCard;
