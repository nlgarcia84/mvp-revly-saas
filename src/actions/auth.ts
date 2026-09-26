"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";

export type ActionResult = { error: string } | { success: boolean } | null;

// Duración de la prueba gratuita al crear la cuenta (14 días).
const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

// Traduce los errores de Supabase Auth al español para el formulario.
function translateAuthError(error: { message: string; code?: string }): string {
  const message = (error.message || "").toLowerCase();
  const code = error.code;

  // La contraseña se detecta por el mensaje: Supabase puede devolver
  // "validation_failed" para una contraseña corta en vez de "weak_password".
  if (message.includes("password")) {
    if (
      message.includes("at least") ||
      message.includes("characters") ||
      message.includes("length")
    ) {
      return "La contraseña debe tener al menos 10 caracteres e incluir mayúsculas, minúsculas y números.";
    }
    return "La contraseña es demasiado débil. Usa mayúsculas, minúsculas, números y símbolos.";
  }

  if (
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    return "Ya existe una cuenta con ese email.";
  }

  if (code === "signup_disabled" || message.includes("signups not allowed")) {
    return "El registro está deshabilitado temporalmente.";
  }

  if (code === "validation_failed") {
    return "Revisa los datos: el email o la contraseña no son válidos.";
  }

  return error.message;
}

// Crea la cuenta en Supabase Auth y guarda el perfil en nuestra tabla User.
// Si Supabase exige confirmar el email no habrá sesión, y el formulario
// mostrará la pantalla "Revisa tu email".
export const signUp = async (
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("name") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  // Devolvemos el error como objeto (no throw) para que useActionState lo muestre.
  if (error) {
    return { error: translateAuthError(error) };
  }

  if (data.user) {
    // Si ya existía un usuario con ese email (p. ej. de la época de Clerk),
    // lo reemplazamos para evitar duplicados.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    await prisma.user.create({
      data: {
        id: data.user.id,
        email,
        name: fullName,
        subscription: {
          create: {
            plan: "free",
            status: "active",
            trialEndsAt: new Date(Date.now() + TRIAL_DURATION_MS),
          },
        },
      },
    });
  }

  // Con la confirmación de email desactivada Supabase devuelve sesión;
  // en ese caso entramos directamente al dashboard.
  if (data.session) {
    redirect("/dashboard");
  }

  return { success: true };
};

// Valida email y contraseña contra Supabase Auth y, si son correctos,
// crea la sesión y entra al dashboard.
export const signIn = async (
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
};

// Devuelve el perfil del usuario autenticado (nombre y email) o null.
export const getProfile = async () => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!dbUser) return null;

  return { name: dbUser.name ?? "", email: dbUser.email };
};

// Actualiza el nombre en nuestra tabla User y en los metadatos de Supabase.
export const updateProfileName = async (name: string) => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new Error("No autenticado");

  await prisma.user.update({
    where: { id: authUser.id },
    data: { name },
  });

  await supabase.auth.updateUser({ data: { full_name: name, name } });
};

// Cierra la sesión actual y vuelve a la pantalla de login.
export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
};
