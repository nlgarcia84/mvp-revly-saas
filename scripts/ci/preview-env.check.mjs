import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPreviewEnvironment } from './check-preview-env.mjs';

const preview = {
  VERCEL_ENV: 'preview',
  PREVIEW_SUPABASE_PROJECT_REF: 'testproject',
  NEXT_PUBLIC_SUPABASE_URL: 'https://testproject.supabase.co',
  DATABASE_URL: 'postgresql://postgres.testproject:password@aws-0-eu.pooler.supabase.com:6543/postgres',
  STRIPE_SECRET_KEY: 'sk_test_example',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_example',
  RESEND_API_KEY: 'test-key',
  EMAIL_FROM: 'Revly <onboarding@resend.dev>',
};

test('accepts isolated preview and direct database connections', () => {
  checkPreviewEnvironment(preview);
  checkPreviewEnvironment({ ...preview, DATABASE_URL: 'postgresql://postgres:password@db.testproject.supabase.co/postgres' });
});

test('rejects mixed databases, live payments and real notifications', () => {
  for (const override of [
    { PREVIEW_SUPABASE_PROJECT_REF: '' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://production.supabase.co' },
    { DATABASE_URL: 'postgresql://postgres.production:password@aws-0-eu.pooler.supabase.com/postgres' },
    { STRIPE_SECRET_KEY: 'sk_live_example' },
    { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_example' },
    { EMAIL_FROM: 'Revly <hola@revly.es>' },
    { WHATSAPP_ACCESS_TOKEN: 'live-token' },
  ]) {
    assert.throws(() => checkPreviewEnvironment({ ...preview, ...override }));
  }
});

test('does not impose preview settings on production or local builds', () => {
  checkPreviewEnvironment({ VERCEL_ENV: 'production' });
  checkPreviewEnvironment({});
});
