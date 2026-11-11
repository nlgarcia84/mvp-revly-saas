import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { smoke } from './smoke.mjs';

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('checks both pages and sends the protection bypass header', async () => {
  const paths = [];
  await withServer((request, response) => {
    paths.push(request.url);
    assert.equal(request.headers['x-vercel-protection-bypass'], 'test-bypass');
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<html>Revly</html>');
  }, (baseUrl) => smoke({ baseUrl, publicPath: '/demo', bypassSecret: 'test-bypass' }));
  assert.deepEqual(paths, ['/', '/demo']);
});

test('rejects auth redirects, errors and non-HTML responses', async () => {
  for (const [status, contentType] of [[302, 'text/html'], [500, 'text/html'], [200, 'application/json']]) {
    await withServer((request, response) => {
      response.writeHead(status, { 'content-type': contentType, location: '/sign-in' });
      response.end('unexpected');
    }, (baseUrl) => assert.rejects(smoke({ baseUrl, publicPath: '/demo', attempts: 1 }), /Smoke failed/));
  }
});

test('retries transient failures', async () => {
  let calls = 0;
  await withServer((request, response) => {
    response.writeHead(++calls === 1 ? 503 : 200, { 'content-type': 'text/html' });
    response.end('<html>Revly</html>');
  }, (baseUrl) => smoke({ baseUrl, publicPath: '/demo', attempts: 2, retryMs: 1 }));
  assert.equal(calls, 3);
});

test('rejects paths that could send the bypass secret to another origin', async () => {
  for (const publicPath of ['//external.example', '/\\external.example', 'https://external.example']) {
    await assert.rejects(smoke({ baseUrl: 'https://revly.example', publicPath, attempts: 1 }));
  }
});
