import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export async function smoke({ baseUrl, publicPath, bypassSecret, attempts = 5, retryMs = 3_000 }) {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('SMOKE_BASE_URL must be an HTTP(S) URL without credentials.');
  }
  if (!publicPath?.startsWith('/') || publicPath.startsWith('//')) {
    throw new Error('SMOKE_PUBLIC_PATH must be a local path such as /demo-business.');
  }

  const urls = [...new Set(['/', publicPath])].map((path) => new URL(path, base));
  if (urls.some((url) => url.origin !== base.origin)) {
    throw new Error('Smoke checks must use the deployment origin.');
  }
  for (const url of urls) {
    let failure;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await fetch(url, {
          redirect: 'manual',
          signal: AbortSignal.timeout(15_000),
          headers: bypassSecret ? { 'x-vercel-protection-bypass': bypassSecret } : {},
        });
        const html = await response.text();
        if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html') || !html.trim()) {
          throw new Error(`HTTP ${response.status}; expected a nonempty HTML page.`);
        }
        console.log(`Smoke passed: ${url.pathname}`);
        failure = undefined;
        break;
      } catch (error) {
        failure = error;
        if (attempt < attempts) await delay(retryMs);
      }
    }
    if (failure) throw new Error(`Smoke failed: ${url.pathname}`, { cause: failure });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  smoke({
    baseUrl: process.env.SMOKE_BASE_URL,
    publicPath: process.env.SMOKE_PUBLIC_PATH,
    bypassSecret: process.env.SMOKE_BYPASS_SECRET,
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
