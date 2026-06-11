'use client';
// ↑ Componente del lado del cliente (necesario para useState, useActionState,
//   y para manejar eventos del formulario como submit).

// ──────────────────────────────────────────────
// ACCIÓN (signUp):
//   1. Supabase Auth → crea el usuario con email + password
//   2. Prisma → guarda/actualiza el usuario en la tabla User
//      (el mismo ID de Supabase Auth)
// ──────────────────────────────────────────────
import { signUp } from '@/actions/auth';

// useActionState: hook de React 19 que reemplaza useFormState.
// Recibe:
//   - La Server Action (signUp)
//   - Valor inicial del estado (null)
// Devuelve:
//   - state: el valor devuelto por la action (o null al inicio)
//   - action: la action envuelta para usarla en <form action={}>
//   - pending: true mientras la action se está ejecutando
import { useActionState } from 'react';

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      {/*
        Contenedor del formulario.
        w-[420px] → ancho fijo de 420px
        Mismo estilo que usaba Clerk (border, rounded, shadow)
      */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-[420px] p-8">
        {/*
          Título y subtítulo del formulario.
          Antes los manejaba Clerk con localization.
          Ahora los escribimos directamente en el HTML.
        */}
        <h1 className="text-xl font-semibold mb-1">Crear cuenta en Revly</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Empieza a gestionar tus reseñas
        </p>

        {/*
          action={action} → cuando se envía el form, se ejecuta signUp()
          que está definida en src/actions/auth.ts
        */}
        <form action={action} className="flex flex-col gap-4">
          {/*
            ────────────────
            CAMPO: NOMBRE
            ────────────────
            name="name" → formData.get('name') en la Server Action
          */}
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

          {/*
            ────────────────
            CAMPO: EMAIL
            ────────────────
            type="email" → el navegador valida que tenga formato email
            required → el navegador no deja enviar si está vacío
            name="email" → formData.get('email') en la Server Action
          */}
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

          {/*
            ────────────────
            CAMPO: CONTRASEÑA
            ────────────────
            minLength={6} → validación mínima del lado del cliente
            Supabase también valida longitud mínima en el servidor
          */}
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

          {/*
            Mensaje de error: si la Server Action lanza un error,
            useActionState lo captura y lo deja disponible en state.
            Lo mostramos en rojo debajo del formulario.
          */}
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          {/*
            Botón de envío.
            disabled={pending} → mientras se envía, no se puede pulsar
            pending ? 'Creando cuenta...' : 'Crear cuenta'
              → cambia el texto mientras se procesa
          */}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-[18px] py-2.5 rounded-md text-sm font-medium border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        {/*
          Enlace a sign-in para usuarios que ya tienen cuenta.
          <a href="/sign-up"> en lugar de <Link> porque es una navegación
          simple entre páginas de auth, no necesita optimización de Next.js.
        */}
        <p className="text-xs text-neutral-400 text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/sign-in" className="text-neutral-950 font-medium underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
