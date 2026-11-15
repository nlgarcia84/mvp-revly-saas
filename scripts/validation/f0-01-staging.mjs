// Optional browser integration. Install Playwright locally without changing package.json.
// Never enable traces, HAR, screenshots or console forwarding: they could capture credentials.
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';

const required = name => { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; };
const base = new URL(required('STAGING_BASE_URL'));
const ref = required('STAGING_SUPABASE_PROJECT_REF');
assert.equal(ref, 'lhtthnrakoxhdeakkkxv', 'Only the dedicated revly-preview project is allowed');
assert.equal(required('STAGING_CONFIRM_ISOLATED'), ref);
assert.equal(base.protocol, 'https:');
assert.ok(base.hostname.endsWith('.vercel.app'), 'Use an immutable Preview URL, not a production/custom domain');
assert.equal(base.pathname, '/');
assert.equal(base.search, ''); assert.equal(base.hash, ''); assert.equal(base.username, ''); assert.equal(base.password, '');
const fixture = label => ({
  ownerEmail: required(`STAGING_OWNER_${label}_EMAIL`), password: required(`STAGING_OWNER_${label}_PASSWORD`),
  businessId: required(`STAGING_BUSINESS_${label}_ID`), slug: required(`STAGING_BUSINESS_${label}_SLUG`),
  customerId: required(`STAGING_CUSTOMER_${label}_ID`), email: required(`STAGING_CUSTOMER_${label}_EMAIL`),
});
// Verify target/project/commit via Vercel before sending any test credentials to the app.
const readToken = required('STAGING_VERCEL_READ_TOKEN');
const deploymentId = required('STAGING_DEPLOYMENT_ID');
const expectedSha = required('STAGING_DEPLOYMENT_SHA');
const metadataUrl = new URL(`https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}`);
metadataUrl.searchParams.set('teamId', 'team_iJmUSCQQJICmYQgLo5UBbKok');
const metadataResponse = await fetch(metadataUrl, { headers: { Authorization: `Bearer ${readToken}` }, redirect: 'error' });
assert.equal(metadataResponse.status, 200, 'Cannot verify the Preview deployment; aborting');
const deployment = await metadataResponse.json();
assert.notEqual(deployment.target, 'production', 'Production deployment is forbidden');
assert.equal(deployment.projectId, 'prj_Br1CstB6M7ARzKJmr3wnUHDy4WpJ');
assert.equal(deployment.meta?.githubCommitRef, 'fix/f0-01-customer-status-ownership');
assert.equal(deployment.meta?.githubCommitSha, expectedSha);
assert.equal(deployment.url, base.hostname, 'Use the deployment URL itself, not an alias');
assert.equal(deployment.readyState, 'READY');
const a = fixture('A'), b = fixture('B');
assert.notEqual(a.ownerEmail, b.ownerEmail); assert.notEqual(a.businessId,b.businessId); assert.notEqual(a.customerId,b.customerId);
for (const f of [a,b]) assert.match(f.slug,/^f0-01-test-[a-z0-9-]+$/, 'Fixtures must have the dedicated test slug prefix');
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const bypass = process.env.STAGING_VERCEL_BYPASS;
const privateHeaders = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
const contexts = [];
async function context() {
  const c = await browser.newContext(); contexts.push(c);
  // Forward bypass ONLY to this Preview origin, never to Supabase, Google or email providers.
  await c.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname.endsWith('.supabase.co') && url.hostname !== `${ref}.supabase.co`) throw new Error('Unexpected Auth project; aborting');
    await route.continue({ headers: { ...route.request().headers(), ...(url.origin === base.origin ? privateHeaders : {}) } });
  });
  return c;
}
async function owner(f, foreign) {
  const c = await context(), page = await c.newPage();
  await page.goto(new URL('/sign-in',base).href);
  await page.locator('input[type=email]').fill(f.ownerEmail);
  await page.locator('input[type=password]').fill(f.password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.waitForURL(url => url.pathname === '/dashboard');
  const own = await c.request.get(new URL(`/api/report/${encodeURIComponent(f.businessId)}`,base).href,{headers:privateHeaders,maxRedirects:0});
  const denied = await c.request.get(new URL(`/api/report/${encodeURIComponent(foreign.businessId)}`,base).href,{headers:privateHeaders,maxRedirects:0});
  assert.equal(own.status(),200); assert.equal(denied.status(),404);
}
async function secretCode(label) {
  process.stdout.write(`Código recién recibido en el buzón de prueba ${label} (entrada oculta): `);
  const output = new Writable({ write(_chunk,_encoding,callback) { callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try { const value = await rl.question(''); assert.match(value,/^\d{8}$/); return value; }
  finally { rl.close(); process.stdout.write('\n'); }
}
async function publicCustomer(f, foreign, label) {
  const c = await context(), page = await c.newPage();
  await page.goto(new URL(`/${encodeURIComponent(f.slug)}/customer/${encodeURIComponent(f.customerId)}`,base).href);
  await page.waitForURL(url => url.pathname === `/${f.slug}`);
  assert.equal(await page.getByText('Tus puntos',{exact:true}).count(),0);
  const recovery = page.locator('form').filter({ has: page.getByRole('button',{name:'Recuperar mis puntos',exact:true}) });
  await recovery.locator('input[type=email]').fill(f.email);
  await recovery.getByRole('button').click();
  await page.getByLabel('Código recibido por email').waitFor();
  const code = await secretCode(label);
  await page.getByLabel('Código recibido por email').fill(code);
  await page.getByRole('button',{name:'Verificar y continuar',exact:true}).click();
  await page.waitForURL(url => url.pathname === `/${f.slug}/customer/${f.customerId}`);
  await page.getByText('Tus puntos',{exact:true}).waitFor();
  await page.goto(new URL(`/${foreign.slug}/customer/${foreign.customerId}`,base).href);
  await page.waitForURL(url => url.pathname === `/${foreign.slug}`);
  assert.equal(await page.getByText('Tus puntos',{exact:true}).count(),0);
  const response = await c.request.post(new URL(`/api/review-confirm/${foreign.customerId}`,base).href,{headers:{...privateHeaders,'Content-Type':'application/json'},data:{action:'submit',rating:1,feedback:'Unauthorized staging probe'}});
  assert.equal(response.status(),403);
}
try {
  await owner(a,b); await owner(b,a);
  await publicCustomer(a,b,'A'); await publicCustomer(b,a,'B');
  process.stdout.write('PASS: two actual owner sessions and two email-verified customer sessions are isolated. Review writes by ID are denied.\n');
} catch {
  // Never print Playwright exception attachments/call logs: they may include passwords or OTPs.
  process.stderr.write('FAIL: staging validation did not finish. Inspect the isolated test setup locally; do not publish credential-bearing logs.\n');
  process.exitCode=1;
} finally {
  await Promise.all(contexts.map(c=>c.close())); await browser.close();
}
