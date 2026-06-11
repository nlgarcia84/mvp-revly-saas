import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';
import './globals.css';

export const metadata = {
  title: 'Revly | Gestión de reservas para negocios',
  description: 'Plantilla inicial para un SaaS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      localization={{
        ...esES,
        signIn: {
          ...esES.signIn,
          start: {
            ...esES.signIn.start,
            title: 'Iniciar sesión',
            subtitle: 'accede a tu cuenta de Revly',
            actionText: '¿No tienes cuenta?',
            actionLink: 'Regístrate',
          },
        },
        signUp: {
          ...esES.signUp,
          start: {
            ...esES.signUp.start,
            title: 'Crear cuenta en Revly',
            subtitle: 'Empieza a gestionar tus reseñas',
            actionText: '¿Ya tienes cuenta?',
            actionLink: 'Inicia sesión',
          },
        },
        formFieldInputPlaceholder__emailAddress: 'Su correo electrónico',
        formFieldInputPlaceholder__signUpPassword: 'Contraseña',
        formButtonPrimary: 'Continuar',
      }}
    >
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
