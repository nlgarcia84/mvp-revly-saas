import './globals.css';

export const metadata = {
  title: 'Revly | Gestión de reservas para negocios',
  description: 'Plantilla inicial para un SaaS',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
