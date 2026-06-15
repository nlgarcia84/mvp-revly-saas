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
      <div className="w-full max-w-[360px] flex flex-col items-center gap-8">
        <span className="text-lg font-semibold text-white">Revly</span>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-7">
          <h1 className="text-lg font-semibold text-white mb-1">Iniciar sesión</h1>
          <p className="text-sm text-neutral-400 mb-6">accede a tu cuenta de Revly</p>

          <form action={action} className="flex flex-col gap-4">
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
                className="w-full px-3 py-2 border border-neutral-700 rounded-lg text-sm text-white bg-transparent outline-none transition-all duration-150 focus:border-white/30 focus:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-neutral-500"
                placeholder="••••••••"
              />
            </div>

            {state && 'error' in state && state.error && (
              <p className="text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="bg-white text-neutral-950 border-white hover:bg-neutral-200 hover:border-neutral-200">
              {pending ? 'Entrando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="text-xs text-neutral-500 text-center mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/sign-up" className="text-white font-medium hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </AuthBackground>
  );
};

export default SignInPage;
