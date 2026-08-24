import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

const usage = `
Uso:
  FACEBOOK_USER_TOKEN=<token de usuario del panel de Meta> FACEBOOK_BUSINESS_ID=<id del negocio> \\
    npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/manual-facebook-token.ts

Pasos:
  1. En developers.facebook.com > tu app > Facebook Login > "Genera identificador de acceso",
     logueado como el usuario que administra la página del cliente, copia el token corto.
     Añade antes el permiso pages_show_list y pages_read_engagement.
  2. Ejecuta el comando de arriba con ese token y el id del negocio de revly.es.
  3. El script lista las páginas que administra y guarda la primera en la BD.
`;

async function main() {
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  const userToken = process.env.FACEBOOK_USER_TOKEN;
  const businessId = process.env.FACEBOOK_BUSINESS_ID;

  if (!clientId || !clientSecret) {
    console.error('Faltan META_CLIENT_ID / META_CLIENT_SECRET en .env.local');
    process.exit(1);
  }
  if (!userToken || !businessId) {
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

  const GRAPH = 'https://graph.facebook.com/v21.0';

  // 0. Intercambiamos token corto -> long-lived (60 días)
  const longParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: userToken,
  });
  const longRes = await fetch(`${GRAPH}/oauth/access_token?${longParams.toString()}`);
  const longBody = await longRes.text();
  if (!longRes.ok) {
    console.error('Error intercambiando token:', longRes.status, longBody);
    process.exit(1);
  }
  const longData = JSON.parse(longBody) as { access_token?: string; expires_in?: number };
  const longLived = longData.access_token ?? userToken;
  const expiry = new Date(
    Date.now() + (longData.expires_in ?? 60 * 86400) * 1000,
  );
  console.log(
    `token long-lived OK, caduca: ${expiry.toISOString()}${longData.expires_in ? '' : ' (sin caducidad informada, usando 60 días)'}`,
  );

  // 1. Listamos las páginas que administra el usuario
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,username,access_token&access_token=${encodeURIComponent(longLived)}`,
  );
  const pagesBody = await pagesRes.text();
  if (!pagesRes.ok) {
    console.error('Error listando páginas:', pagesRes.status, pagesBody);
    process.exit(1);
  }
  const pagesJson = JSON.parse(pagesBody) as {
    data?: Array<{ id: string; name?: string; username?: string; access_token?: string }>;
  };
  const pages = (pagesJson.data ?? []).filter((p) => p.access_token);
  if (pages.length === 0) {
    console.error(
      'No se encontró ninguna página administrada por este usuario. Añade el permiso pages_show_list y reitera.',
    );
    process.exit(1);
  }
  console.log(`\nPáginas administradas:`);
  pages.forEach((p, i) => console.log(`  ${i}: ${p.name}${p.username ? ` (@${p.username})` : ''} (${p.id})`));

  const PAGE_INDEX = parseInt(process.env.FACEBOOK_PAGE_INDEX ?? '0', 10);
  const page = pages[PAGE_INDEX] ?? pages[0];
  if (!page.access_token) {
    console.error('La página seleccionada no devolvió token.');
    process.exit(1);
  }

  // 2. Guardamos la página en la BD
  await pool.query(
    `UPDATE "Business"
     SET "facebookAccessToken" = $1,
         "facebookTokenExpiry" = $2,
         "facebookPageId" = $3,
         "facebookPageName" = $4,
         "facebookUsername" = $5
     WHERE id = $6`,
    [page.access_token, expiry, page.id, page.name ?? null, page.username ?? null, businessId],
  );
  console.log(`\nPágina guardada: ${page.name} (${page.id})`);
  console.log('Token de página guardado en la BD del negocio.');

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});