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

export const signUp = async (_prevState: unknown, formData: FormData) => {
  // _prevState: estado anterior devuelto por useActionState (se ignora).
  // formData: datos del formulario (<input name="email"> → formData.get('email')).

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  // ──────────────────────────────────────────────
  // SUPABASE: crea el usuario en Supabase Auth
  // ──────────────────────────────────────────────

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  // Si Supabase devuelve error, lo devolvemos como objeto
  // para que useActionState lo muestre en el formulario.
  // NO usamos throw porque useActionState no lo captura.
  if (error) {
    return { error: error.message };
  }

  // ──────────────────────────────────────────────
  // PRISMA: guarda el usuario en nuestra tabla User
  // ──────────────────────────────────────────────

  if (data.user) {
    const exists = await prisma.user.findUnique({ where: { email } });

    if (exists) {
      // Usuario de la época de Clerk → lo reemplazamos
      await prisma.user.delete({ where: { id: exists.id } });
    }

    await prisma.user.create({
      data: { id: data.user.id, email, name },
    });
  }

  // Si Supabase devolvió sesión (confirmación desactivada),
  // redirigimos al dashboard directamente.
  // Si no, mostramos pantalla "Revisa tu email".
  if (data.session) {
    redirect('/dashboard');
  }

  return { success: true };
};

// ════════════════════════════════════════════════════════════════════
//  signIn
// ════════════════════════════════════════════════════════════════════
//  Verifica email + contraseña contra Supabase Auth.
//  Si son correctos, crea una sesión (cookie) y redirige al dashboard.
//  No usa Prisma — solo valida credenciales.
// ════════════════════════════════════════════════════════════════════

export const signIn = async (_prevState: unknown, formData: FormData) => {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // ──────────────────────────────────────────────
  // SUPABASE: verifica credenciales y crea sesión
  // ──────────────────────────────────────────────

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Si las credenciales son incorrectas, devolvemos el error
  // para que useActionState lo muestre en el formulario.
  if (error) {
    return { error: error.message };
  }

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
