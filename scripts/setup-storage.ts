import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const bucket = process.argv[2] || 'business-logos';

const run = async () => {
  const { data: existing } = await supabase.storage.getBucket(bucket);
  if (existing) {
    console.log(`Bucket "${bucket}" ya existe`);
    return;
  }

  const { data, error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });

  if (error) {
    console.error('Error creando bucket:', error.message);
    process.exit(1);
  }

  console.log(`Bucket "${bucket}" creado correctamente`);
};

run();
