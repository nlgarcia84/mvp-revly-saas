'use client';

import { signIn, type ActionResult } from '@/actions/auth';
import { useActionState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/button';
import AuthBackground from '@/components/auth-background';

const SignInPage = () => {
  const [state, action, pending] = useActionState(signIn, null as ActionResult);

  return (
    <AuthBackground>
      <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-xl shadow-sm w-full max-w-[400px] sm:max-w-[420px] p-6 sm:p-8">
        <h1 className="text-xl font-semibold mb-1">Iniciar sesión</h1>
        <p className="text-sm text-neutral-500 mb-6">accede a tu cuenta de Revly</p>

        <form action={action} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Correo electrónico
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
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
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="••••••••"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? 'Entrando...' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="text-xs text-neutral-400 text-center mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/sign-up" className="text-neutral-950 dark:text-neutral-100 font-medium underline">
            Regístrate
          </Link>
        </p>
      </div>
    </AuthBackground>
  );
};

export default SignInPage;
