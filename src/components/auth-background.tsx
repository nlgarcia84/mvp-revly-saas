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

    {/* Animated light spheres */}
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          top: '-10%',
          left: '-5%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0) 70%)',
          animation: 'auth-float 14s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          bottom: '-8%',
          right: '-5%',
          background:
            'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)',
          animation: 'auth-float 12s ease-in-out infinite alternate-reverse',
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%)',
          animation: 'auth-pulse 10s ease-in-out infinite alternate',
        }}
      />
    </div>

    {children}

    <style>{`
      @keyframes auth-float {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(60px, -40px) scale(1.1); }
      }
      @keyframes auth-pulse {
        0% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
      }
    `}</style>
  </div>
);

export default AuthBackground;
