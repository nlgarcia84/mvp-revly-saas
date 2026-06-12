import './globals.css';

export const metadata = {
  title: 'Revly | Gestión de reservas para negocios',
  description: 'Plantilla inicial para un SaaS',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white dark:bg-neutral-950 text-neutral-950 dark:text-neutral-100 transition-colors">{children}</body>
    </html>
  );
};

export default RootLayout;
