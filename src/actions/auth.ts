'use server';
// ↑ Esta directiva indica que TODAS las funciones de este archivo
//   son Server Actions. Se ejecutan en el servidor, no en el navegador.
//   Pueden leer BD, hacer redirect, etc. sin exponer lógica al cliente.

import { createClient } from '@/lib/supabase/server';
//   createClient: función que crea un cliente de Supabase configurado
//   para usar cookies HTTP (sesión persistente entre peticiones).
//   Se usa en Server Components y Server Actions.

import prisma from '@/lib/db';
//   prisma: instancia del ORM Prisma conectada a PostgreSQL.
//   Con ella hacemos consultas a nuestras tablas (User, Business, Customer).

import { redirect } from 'next/navigation';
//   redirect: función de Next.js para redirigir al navegador a otra ruta.
//   Solo funciona en Server Components / Server Actions.

// ════════════════════════════════════════════════════════════════════
//  signUp
// ════════════════════════════════════════════════════════════════════
//  Crea una cuenta en Supabase Auth y sincroniza el usuario en la
//  tabla User de Prisma para que quede vinculado a sus datos.
// ════════════════════════════════════════════════════════════════════

export const signUp = async (formData: FormData) => {
  // formData: datos enviados desde el formulario de registro.
  // .get('email') obtiene el valor del <input name="email">.
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  // ──────────────────────────────────────────────
  // SUPABASE: crea el usuario en Supabase Auth
  // ──────────────────────────────────────────────

  // createClient() crea un cliente de Supabase vinculado a la sesión
  // actual (lee/escribe cookies HTTP con el access_token).
  const supabase = await createClient();

  // supabase.auth.signUp() envía una petición a Supabase Auth para:
  //   1. Crear un nuevo usuario con email + password
  //   2. Enviar un email de verificación (si está habilitado en el dashboard)
  //   3. Devolver los datos del usuario creado
  const { data, error } = await supabase.auth.signUp({
    email,                    // email único del usuario
    password,                 // contraseña en texto plano (Supabase la hashea)
    options: {
      data: { full_name: name },  // metadatos opcionales del usuario
    },
  });

  // Si Supabase devuelve un error (email duplicado, password débil, etc.)
  // lo lanzamos como excepción. El formulario lo capturará y mostrará.
  if (error) {
    throw new Error(error.message);
  }

  // ──────────────────────────────────────────────
  // PRISMA (upsert = INSERT OR UPDATE):
  //   - Busca al usuario por su id (el mismo que generó Supabase Auth)
  //   - Si existe → actualiza email y name
  //   - Si no existe → crea un registro nuevo con ese id
  //
  //   Necesitamos esto porque nuestros datos (negocios, clientes)
  //   están en Prisma/PostgreSQL y referencian al User.id.
  //   Si no guardamos el usuario aquí, las relaciones no funcionarían.
  // ──────────────────────────────────────────────

  if (data.user) {
    // data.user.id es el UUID que Supabase Auth generó para este usuario.
    // Lo usamos como clave primaria en nuestra tabla User para mantener
    // el mismo ID entre Supabase Auth y Prisma.

    await prisma
      .user                          // tabla User del schema Prisma
      .upsert({                      // INSERT OR UPDATE
        where: {                     // busca por:
          id: data.user.id,          // el mismo ID de Supabase Auth
        },
        update: {                    // si existe → actualiza:
          email,                     // email del formulario
          name,                      // name del formulario
        },
        create: {                    // si no existe → crea:
          id: data.user.id,          // mismo ID de Supabase Auth
          email,                     // email del formulario
          name,                      // name del formulario
        },
      });
  }

  // redirect lanza una redirección HTTP 303 al dashboard.
  // Como es Server Action, el navegador sigue la redirección
  // y el usuario llega a /dashboard con sesión iniciada.
  redirect('/dashboard');
};

// ════════════════════════════════════════════════════════════════════
//  signIn
// ════════════════════════════════════════════════════════════════════
//  Verifica email + contraseña contra Supabase Auth.
//  Si son correctos, crea una sesión (cookie) y redirige al dashboard.
//  No usa Prisma — solo valida credenciales.
// ════════════════════════════════════════════════════════════════════

export const signIn = async (formData: FormData) => {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // ──────────────────────────────────────────────
  // SUPABASE: verifica credenciales y crea sesión
  // ──────────────────────────────────────────────

  // Crea el cliente de Supabase para esta petición
  const supabase = await createClient();

  // signInWithPassword() envía email + password a Supabase Auth.
  // Si son válidos, Supabase devuelve un access_token + refresh_token
  // que el cliente guarda automáticamente en las cookies HTTP
  // (gracias a la configuración de createServerClient).
  const { error } = await supabase.auth.signInWithPassword({
    email,      // email del formulario
    password,   // contraseña en texto plano
  });

  // Si las credenciales son incorrectas, Supabase devuelve un error
  // (ej: "Invalid login credentials"). Lo propagamos al formulario.
  if (error) {
    throw new Error(error.message);
  }

  // Redirige al dashboard con la sesión activa
  redirect('/dashboard');
};

// ════════════════════════════════════════════════════════════════════
//  signOut
// ════════════════════════════════════════════════════════════════════
//  Destruye la sesión actual en Supabase Auth y redirige a /sign-in.
//  No usa Prisma — solo limpia la cookie de sesión.
// ════════════════════════════════════════════════════════════════════

export const signOut = async () => {
  // ──────────────────────────────────────────────
  // SUPABASE: destruye la sesión actual
  // ──────────────────────────────────────────────

  const supabase = await createClient();

  // signOut() invalida el access_token y refresh_token actuales
  // en Supabase Auth, y elimina las cookies HTTP de sesión.
  // Después de esto, el usuario no está autenticado.
  await supabase.auth.signOut();

  // Redirige a la página de inicio de sesión
  redirect('/sign-in');
};
