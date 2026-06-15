const AuthBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen flex items-center justify-center bg-neutral-950 p-4 overflow-hidden">
    {/* Luminous gradient orbs — Vercel style */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0) 70%)',
          animation: 'auth-drift 12s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0) 70%)',
          animation: 'auth-drift 10s ease-in-out infinite alternate-reverse',
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.08]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)',
          animation: 'auth-pulse 8s ease-in-out infinite alternate',
        }}
      />
    </div>
    {children}

    <style>{`
      @keyframes auth-drift {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(40px, -30px) scale(1.15); }
      }
      @keyframes auth-pulse {
        0% { opacity: 0.06; transform: translate(-50%, 0) scale(1); }
        100% { opacity: 0.12; transform: translate(-50%, -10px) scale(1.05); }
      }
    `}</style>
  </div>
);

export default AuthBackground;
