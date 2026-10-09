const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseConfig() {
  if (!publicSupabaseUrl || !publicSupabaseAnonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  try {
    new URL(publicSupabaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no es una URL válida.");
  }

  return {
    url: publicSupabaseUrl,
    anonKey: publicSupabaseAnonKey,
  };
}
