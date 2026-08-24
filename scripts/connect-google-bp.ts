import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

const usage = `
Uso:
  GOOGLE_BUSINESS_ID=<id del negocio> \\
    npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/connect-google-bp.ts

Qué hace:
  1. Toma el refresh token de Google guardado en el negocio.
  2. Obtiene un access token nuevo.
  3. Lista cuentas de Business Profile y guarda accountId.
  4. Lista ubicaciones y guarda locationId.
  5. Muestra cuántas reseñas se pueden traer.

Requiere que Google haya aprobado la cuota de la Business
Profile API (si no, responde 429 con quota 0).
`;

async function main() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
  const businessId = process.env.GOOGLE_BUSINESS_ID;

  if (!businessId) {
    console.error(usage.trim());
    process.exit(1);
  }

  const { rows } = await pool.query(
    `SELECT id, name, "googleBusinessRefreshToken" FROM "Business" WHERE id = $1`,
    [businessId],
  );
  const business = rows[0];
  if (!business) {
    console.error(`No existe negocio con id ${businessId}`);
    process.exit(1);
  }
  if (!business.googleBusinessRefreshToken) {
    console.error(
      `El negocio ${business.name} no tiene refresh token de Google guardado.`,
    );
    process.exit(1);
  }

  console.log(`\n=== ${business.name} ===`);

  // 1. Access token nuevo con el refresh token guardado
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: business.googleBusinessRefreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenBody = await tokenRes.text();
  if (!tokenRes.ok) {
    console.error(`Error renovando token: HTTP ${tokenRes.status} | ${tokenBody}`);
    process.exit(1);
  }
  const tokens = JSON.parse(tokenBody) as { access_token: string; expires_in?: number };
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  console.log(`✓ Access token renovado, caduca ${expiresAt.toISOString()}`);

  // 2. Cuentas de Business Profile
  const accountsRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  const accountsBody = await accountsRes.text();
  if (!accountsRes.ok) {
    console.error(`\n✗ API no disponible: HTTP ${accountsRes.status}`);
    console.error(accountsBody);
    const noQuota = accountsRes.status === 429 && accountsBody.includes('quota');
    if (noQuota) {
      console.error('\nGoogle aún no ha aprobado la cuota de la Business Profile API.');
      console.error('Completa el formulario y espera el email de aprobación:');
      console.error('https://docs.google.com/forms/d/e/1FAIpQLSfC_FKSWzbSae_5rOpgwFeIUzXUF1JCQnlsZM_gC1I2UHjA3w/viewform');
    }
    process.exit(1);
  }
  const accountsData = JSON.parse(accountsBody) as {
    accounts?: Array<{ name: string; accountName?: string }>;
  };
  const accounts = accountsData.accounts ?? [];
  if (accounts.length === 0) {
    console.error('La cuenta de Google no administra ningún Perfil de Empresa.');
    process.exit(1);
  }
  const accountId = accounts[0].name.replace(/^accounts\//, '');
  console.log(`✓ Cuenta: ${accountId} (${accounts[0].accountName ?? 'sin nombre'})`);

  // 3. Ubicaciones (comodín "-" = todas las cuentas del usuario)
  const locRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?pageSize=100&readMask=name,title`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  const locBody = await locRes.text();
  if (!locRes.ok) {
    console.error(`\n✗ Error listando ubicaciones: HTTP ${locRes.status}`);
    console.error(locBody);
    process.exit(1);
  }
  const locData = JSON.parse(locBody) as { locations?: Array<{ name: string; title?: string }> };
  const locations = locData.locations ?? [];
  if (locations.length === 0) {
    console.error('No se encontraron ubicaciones en la cuenta.');
    process.exit(1);
  }

  console.log('\nUbicaciones encontradas:');
  locations.forEach((l, i) => console.log(`  ${i}: ${l.title} (${l.name})`));

  const match = locations.find((l) =>
    l.title?.toLowerCase().includes(business.name.toLowerCase()),
  );
  const locationId = (match ?? locations[0]).name.replace(/^accounts\/[^/]+\/locations\//, '');
  const locationName = (match ?? locations[0]).title;
  console.log(`\nUbicación elegida: ${locationName} (${locationId})`);

  // 4. Guardamos accountId, locationId y access token renovado
  await pool.query(
    `UPDATE "Business"
     SET "googleBusinessAccessToken" = $1,
         "googleBusinessTokenExpiry" = $2,
         "googleBusinessAccountId" = $3,
         "googleBusinessLocationId" = $4
     WHERE id = $5`,
    [tokens.access_token, expiresAt, accountId, locationId, businessId],
  );
  console.log('\n✓ Conexión completada y guardada en la BD.');

  // 5. Comprobamos cuántas reseñas se pueden traer
  const reviewsRes = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  const reviewsBody = await reviewsRes.text();
  if (!reviewsRes.ok) {
    console.error(`No se pudo listar reseñas (HTTP ${reviewsRes.status}): ${reviewsBody.slice(0, 300)}`);
    process.exit(1);
  }
  const reviewsData = JSON.parse(reviewsBody) as {
    reviews?: unknown[];
    averageRating?: number;
    totalReviewCount?: number;
  };
  console.log(`✓ Acceso a reseñas OK: ${reviewsData.reviews?.length ?? 0} en esta página, ` +
    `total ${reviewsData.totalReviewCount ?? '?'}, rating ${reviewsData.averageRating ?? '?'}.`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
