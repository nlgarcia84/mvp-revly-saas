'use client';

// ──────────────────────────────────────────────
// ACCIÓN: llama a Supabase Auth (signInWithPassword)
// Prisma NO se usa aquí — solo verifica credenciales
// ──────────────────────────────────────────────
import { signIn, type ActionResult } from '@/actions/auth';
import { useActionState } from 'react';
import Link from 'next/link';

export default function SignInPage() {
  const [state, action, pending] = useActionState<ActionResult | null>(signIn, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-[420px] p-8">
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
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-[18px] py-2.5 rounded-md text-sm font-medium border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-xs text-neutral-400 text-center mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/sign-up" className="text-neutral-950 font-medium underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
