'use client';

import { signUp, type ActionResult } from '@/actions/auth';
import { useActionState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/button';

const SignUpPage = () => {
  const [state, action, pending] = useActionState(signUp, null as ActionResult);

  // Si el registro fue exitoso, mostramos la pantalla de verificación
  if (state && 'success' in state && state.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-full max-w-[400px] sm:max-w-[420px] p-6 sm:p-8 text-center">
          <h1 className="text-xl font-semibold mb-1">Revisa tu email</h1>
          <p className="text-sm text-neutral-500 mb-6">
            Te enviamos un enlace de confirmación. Revisa tu bandeja de entrada
            (y la carpeta de spam) para activar tu cuenta.
          </p>
          <Button as="link" variant="primary" href="/sign-in">
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-full max-w-[400px] sm:max-w-[420px] p-6 sm:p-8">
        <h1 className="text-xl font-semibold mb-1">Crear cuenta en Revly</h1>
        <p className="text-sm text-neutral-500 mb-6">Empieza a gestionar tus reseñas</p>

        <form action={action} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Nombre
            </label>
            <input
              name="name"
              type="text"
              required
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Correo electrónico
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="text-xs text-neutral-400 text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/sign-in" className="text-neutral-950 font-medium underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
