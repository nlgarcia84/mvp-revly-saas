import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

const usage = `
Uso:
  INSTAGRAM_SHORT_TOKEN=<token del panel de Meta> INSTAGRAM_BUSINESS_ID=<id del negocio> \\
    npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/manual-instagram-token.ts

Pasos:
  1. En developers.facebook.com > tu app > Instagram > "API setup with Instagram login" >
     "Genera identificador de acceso", logueado como @nlgarciadev, copia el token corto.
  2. Ejecuta el comando de arriba con ese token y el id del negocio de revly.es.
`;

async function main() {
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  const shortToken = process.env.INSTAGRAM_SHORT_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!clientId || !clientSecret) {
    console.error('Faltan META_CLIENT_ID / META_CLIENT_SECRET en .env.local');
    process.exit(1);
  }
  if (!shortToken || !businessId) {
    console.error(usage.trim());
    process.exit(1);
  }

  const business = await pool.query(
    `SELECT id, name FROM "Business" WHERE id = $1`,
    [businessId],
  );
  if (business.rows.length === 0) {
    console.error(`No existe negocio con id ${businessId}`);
    process.exit(1);
  }
  const b = business.rows[0];

  console.log(`\n=== ${b.name} (${b.id}) ===`);

  // 0. Probamos el token directamente (el del panel de Meta
  //    "Genera identificador" ya sale long-lived 60 días).
  const directRes = await fetch(
    `${'https://graph.instagram.com'}/me?fields=id,username,account_type&access_token=${encodeURIComponent(shortToken)}`,
  );
  const directBody = await directRes.text();

  if (directRes.ok) {
    const ig = JSON.parse(directBody) as {
      id: string;
      username: string;
      account_type?: string;
    };
    console.log(`token válido directamente (@${ig.username}, ${ig.account_type ?? '?'})`);
    const expiry = new Date(Date.now() + 60 * 86400 * 1000);
    await pool.query(
      `UPDATE "Business"
       SET "instagramAccessToken" = $1,
           "instagramTokenExpiry" = $2,
           "instagramBusinessAccountId" = $3,
           "instagramUsername" = $4
       WHERE id = $5`,
      [shortToken, expiry, String(ig.id), ig.username, businessId],
    );
    console.log(`Token guardado en la BD del negocio. Caduca: ${expiry.toISOString()}`);
    await pool.end();
    return;
  }
  console.log('token directo no válido, intentamos intercambio corto->long-lived...');

  // 1. Token corto -> long-lived (60 días)
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: clientSecret,
    access_token: shortToken,
  });
  const ex = await fetch(
    `${'https://graph.instagram.com'}/access_token?${params.toString()}`,
  );
  const exBody = await ex.text();
  if (!ex.ok) {
    console.error('Error intercambiando token:', ex.status, exBody);
    process.exit(1);
  }
  const exJson = JSON.parse(exBody) as { access_token: string; expires_in?: number };
  const longLived = exJson.access_token;
  const expiresIn = exJson.expires_in ?? 60 * 86400;
  const expiry = new Date(Date.now() + expiresIn * 1000);
  console.log(`token long-lived OK, caduca: ${expiry.toISOString()}`);

  // 2. Perfil de la cuenta conectada
  const prof = await fetch(
    `${'https://graph.instagram.com'}/me?fields=id,username,account_type&access_token=${encodeURIComponent(longLived)}`,
  );
  const profBody = await prof.text();
  if (!prof.ok) {
    console.error('Error obteniendo perfil:', prof.status, profBody);
    process.exit(1);
  }
  const ig = JSON.parse(profBody) as { id: string; username: string; account_type?: string };
  console.log(`cuenta: @${ig.username} (${ig.account_type ?? '?'}, ID ${ig.id})`);

  // 3. Guardamos en la BD
  await pool.query(
    `UPDATE "Business"
     SET "instagramAccessToken" = $1,
         "instagramTokenExpiry" = $2,
         "instagramBusinessAccountId" = $3,
         "instagramUsername" = $4
     WHERE id = $5`,
    [longLived, expiry, String(ig.id), ig.username, businessId],
  );
  console.log('Token guardado en la BD del negocio.');

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});