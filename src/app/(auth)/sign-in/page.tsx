'use client';

import { signIn, type ActionResult } from '@/actions/auth';
import { useActionState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/button';
import AuthBackground from '@/components/auth-background';
import BackButton from '@/components/back-button';

const SignInPage = () => {
  const [state, action, pending] = useActionState(signIn, null as ActionResult);

  return (
    <AuthBackground>
      <div className="w-full max-w-[360px] flex flex-col items-center gap-8">
        <div className="self-start">
          <BackButton label="Volver al inicio" href="/" />
        </div>
        <span className="text-lg font-semibold text-white">Revly</span>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-7 relative overflow-hidden">
          <div className={`transition-all duration-300 ${pending ? 'opacity-0 scale-95 pointer-events-none' : ''}`}>
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

              <Button type="submit" variant="secondary" disabled={pending}>
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

          {pending && (
            <div className="absolute inset-0 flex items-center justify-center animate-fade-slide-in">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-neutral-400">Entrando...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthBackground>
  );
};

export default SignInPage;
