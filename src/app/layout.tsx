import './globals.css';

export const metadata = {
  title: 'Revly | Gestión de reservas para negocios',
  description: 'Plantilla inicial para un SaaS',
};

// ──────────────────────────────────────────────
// RootLayout
// ──────────────────────────────────────────────
// Layout raíz que envuelve todas las páginas.
// Incluye un script inline que lee localStorage
// y añade la clase .dark al <html> ANTES de que
// React hidrate, evitando el flash de tema
// incorrecto al recargar en modo oscuro.
// ──────────────────────────────────────────────

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white dark:bg-neutral-950 text-neutral-950 dark:text-neutral-100 transition-colors">{children}</body>
    </html>
  );
};

export default RootLayout;
