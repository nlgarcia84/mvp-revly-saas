'use client';

import { signUp, type ActionResult } from '@/actions/auth';
import { useActionState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/button';
import AuthBackground from '@/components/auth-background';

const SignUpPage = () => {
  const [state, action, pending] = useActionState(signUp, null as ActionResult);

  // Si el registro fue exitoso, mostramos la pantalla de verificación
  if (state && 'success' in state && state.success) {
    return (
      <AuthBackground>
        <div className="w-full max-w-[360px] flex flex-col items-center gap-8">
          <span className="text-lg font-semibold text-white">Revly</span>
          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-7 text-center">
            <h1 className="text-lg font-semibold text-white mb-1">Revisa tu email</h1>
            <p className="text-sm text-neutral-400 mb-6">
              Te enviamos un enlace de confirmación. Revisa tu bandeja de entrada
              (y la carpeta de spam) para activar tu cuenta.
            </p>
            <Button as="link" variant="secondary" href="/sign-in">
              Ir a iniciar sesión
            </Button>
          </div>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <div className="w-full max-w-[360px] flex flex-col items-center gap-8">
        <span className="text-lg font-semibold text-white">Revly</span>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-7">
          <h1 className="text-lg font-semibold text-white mb-1">Crear cuenta</h1>
          <p className="text-sm text-neutral-400 mb-6">Empieza a gestionar tus reseñas</p>

          <form action={action} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-neutral-400">
                Nombre
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-3 py-2 border border-neutral-700 rounded-lg text-sm text-white bg-transparent outline-none transition-all duration-150 focus:border-white/30 focus:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-neutral-500"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-neutral-400">
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 border border-neutral-700 rounded-lg text-sm text-white bg-transparent outline-none transition-all duration-150 focus:border-white/30 focus:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-neutral-500"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-neutral-400">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full px-3 py-2 border border-neutral-700 rounded-lg text-sm text-white bg-transparent outline-none transition-all duration-150 focus:border-white/30 focus:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-neutral-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {state && 'error' in state && state.error && (
              <p className="text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-xs text-neutral-500 text-center mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/sign-in" className="text-white font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </AuthBackground>
  );
};

export default SignUpPage;
