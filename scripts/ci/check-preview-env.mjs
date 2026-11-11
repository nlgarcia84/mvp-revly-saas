import { pathToFileURL } from 'node:url';

export function checkPreviewEnvironment(env) {
  if (env.VERCEL_ENV !== 'preview') return;

  const projectRef = env.PREVIEW_SUPABASE_PROJECT_REF;
  if (!projectRef || !/^[a-z0-9]+$/.test(projectRef)) {
    throw new Error('Set PREVIEW_SUPABASE_PROJECT_REF to the dedicated test Supabase project.');
  }
  const supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const database = new URL(env.DATABASE_URL);
  const pooledDatabase = database.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(database.username) === `postgres.${projectRef}`;

  if (supabase.hostname !== `${projectRef}.supabase.co` || !pooledDatabase ||
      !['5432', '6543'].includes(database.port)) {
    throw new Error('Preview Auth and DATABASE_URL must use PREVIEW_SUPABASE_PROJECT_REF and an IPv4-compatible Supabase pooler (port 5432 or 6543).');
  }
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    throw new Error('Preview requires a Stripe test secret key.');
  }
  if (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_')) {
    throw new Error('Preview requires a Stripe test publishable key.');
  }
  if (env.RESEND_API_KEY && !/^(?:[^<>]*<)?onboarding@resend\.dev>?$/.test(env.EMAIL_FROM ?? '')) {
    throw new Error('Preview email must use the Resend test sender onboarding@resend.dev.');
  }
  if (env.WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Remove WHATSAPP_ACCESS_TOKEN from Preview to disable real notifications.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    checkPreviewEnvironment(process.env);
  } catch (error) {
    console.error(`Preview configuration rejected: ${error.message}`);
    process.exitCode = 1;
  }
}
