"use client";

import { signIn, type ActionResult } from "@/actions/auth";
import { useActionState, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button";
import AuthBackground from "@/components/auth-background";
import BackButton from "@/components/back-button";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
    />
  </svg>
);

const SignInPage = () => {
  const [state, action, pending] = useActionState(signIn, null as ActionResult);
  const [googlePending, setGooglePending] = useState(false);

  const handleGoogle = async () => {
    setGooglePending(true);
    try {
      const supabase = createBrowserSupabase();
      const redirectTo = `${window.location.origin}/api/auth/callback`;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
    } catch (e) {
      setGooglePending(false);
      alert(
        "Error al iniciar sesión con Google. Comprueba que el proveedor está configurado en Supabase.",
      );
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-[360px] flex flex-col items-center gap-8">
        <div className="self-start">
          <BackButton label="Volver al inicio" href="/" />
        </div>
        <span className="text-lg font-semibold text-white">Revly</span>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-7 relative overflow-hidden">
          <div
            className={`transition-all duration-300 ${pending || googlePending ? "opacity-0 scale-95 pointer-events-none" : ""}`}
          >
            <h1 className="text-lg font-semibold text-white mb-1">
              Iniciar sesión
            </h1>
            <p className="text-sm text-neutral-400 mb-6">
              accede a tu cuenta de Revly
            </p>

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

              {state && "error" in state && state.error && (
                <p className="text-sm text-red-400">{state.error}</p>
              )}

              <Button type="submit" variant="secondary" disabled={pending}>
                {pending ? "Entrando..." : "Iniciar sesión"}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                o
              </span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googlePending}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-700 text-sm text-white hover:border-white/30 transition-all duration-150 disabled:opacity-50 cursor-pointer"
            >
              <GoogleIcon />
              {googlePending ? "Redirigiendo..." : "Continuar con Google"}
            </button>

            <p className="text-xs text-neutral-500 text-center mt-6">
              ¿No tienes cuenta?{" "}
              <Link
                href="/sign-up"
                className="text-white font-medium hover:underline"
              >
                Regístrate
              </Link>
            </p>
          </div>

          {(pending || googlePending) && (
            <div className="absolute inset-0 flex items-center justify-center animate-fade-slide-in">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="w-6 h-6 text-white animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
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
