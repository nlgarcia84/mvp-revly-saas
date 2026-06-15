const AuthBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen flex items-center justify-center bg-neutral-950 p-4 overflow-hidden">
    {/* Dot grid pattern */}
    <div
      className="fixed inset-0 pointer-events-none opacity-[0.15]"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />

    {/* Large soft gradient glow */}
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(120,119,198,0.15) 0%, rgba(120,119,198,0) 100%)',
      }}
    />

    {/* Bottom glow */}
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 60% 30% at 50% 100%, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0) 100%)',
      }}
    />

    {children}
  </div>
);

export default AuthBackground;
