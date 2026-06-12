import './globals.css';

export const metadata = {
  title: 'Revly | Gestión de reservas para negocios',
  description: 'Plantilla inicial para un SaaS',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-white dark:bg-neutral-950 text-neutral-950 dark:text-neutral-100 transition-colors">{children}</body>
    </html>
  );
};

export default RootLayout;
