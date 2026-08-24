import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import readline from 'readline';

const REDIRECT_URI =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env.local');
    process.exit(1);
  }

  // 1. URL de autorización (debe coincidir con el redirect_uri registrado
  //    en Google Cloud Console > Credenciales > OAuth client).
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${REDIRECT_URI}/api/google-business/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    state: 'test-script',
    access_type: 'offline',
    prompt: 'consent',
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  console.log('\n=== Comprobar acceso a Google Business Profile API ===\n');
  console.log('1. Abre esta URL en el navegador, con la cuenta de Google que');
  console.log('   administra el perfil del negocio:');
  console.log('\n   ' + authUrl + '\n');
  console.log('2. Autoriza el acceso.');
  console.log('3. Al terminar Google te redirigirá a una URL del tipo:');
  console.log(`   ${REDIRECT_URI}/api/google-business/callback?code=...`);
  console.log('4. Copia y pega AQUÍ esa URL completa:\n');

  const callbackUrl = await prompt('URL completa del callback: ');
  const parsed = new URL(callbackUrl);
  const code = parsed.searchParams.get('code');
  const error = parsed.searchParams.get('error');
  if (error) {
    console.error(`\nGoogle devolvió error: ${error}`);
    process.exit(1);
  }
  if (!code) {
    console.error('\nNo se encontró el parámetro code en la URL.');
    process.exit(1);
  }

  // 2. Intercambiamos el código por tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${REDIRECT_URI}/api/google-business/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const tokenBody = await tokenRes.text();
  if (!tokenRes.ok) {
    console.error(`\nError intercambiando código por tokens: HTTP ${tokenRes.status}`);
    console.error(tokenBody);
    process.exit(1);
  }
  const tokens = JSON.parse(tokenBody) as { access_token: string; refresh_token?: string };

  console.log('\n✓ Token de acceso obtenido (OK).');

  // 3. Llamamos a la Account Management API: si Google ha aprobado el
  //    proyecto, devuelve las cuentas; si no, 403 con SERVICE_DISABLED.
  console.log('\nComprobando acceso a la Business Profile API...');
  const accountsRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  const accountsBody = await accountsRes.text();

  if (!accountsRes.ok) {
    console.error(`\n✗ NO hay acceso a la API. HTTP ${accountsRes.status}`);
    console.error(accountsBody);
    const isDisabled =
      /SERVICE_DISABLED|not been used in project|is disabled|AUTH_PERMISSION_DENIED/.test(
        accountsBody,
      );
    if (isDisabled) {
      console.error(
        '\nGoogle NO ha habilitado aún la My Business API para tu proyecto.',
      );
      console.error(
        'Solicita el acceso en el formulario oficial:',
      );
      console.error(
        'https://docs.google.com/forms/d/e/1FAIpQLSfC_FKSWzbSae_5rOpgwFeIUzXUF1JCQnlsZM_gC1I2UHjA3w/viewform',
      );
    }
    process.exit(1);
  }

  const data = JSON.parse(accountsBody) as { accounts?: Array<{ name: string; accountName?: string }> };
  const accounts = data.accounts ?? [];
  console.log(`\n✓ ACCESO CONCEDIDO. Cuentas de Business Profile encontradas: ${accounts.length}`);
  accounts.forEach((a, i) =>
    console.log(`  ${i}: ${a.name}${a.accountName ? ` (${a.accountName})` : ''}`),
  );

  if (accounts.length === 0) {
    console.log('\nNota: hay acceso, pero esta cuenta de Google no administra');
    console.log('ningún Perfil de Empresa todavía.');
  }

  if (tokens.refresh_token) {
    console.log('\n✓ Se obtuvo refresh token (se guardará en la BD al conectar desde Settings).');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
