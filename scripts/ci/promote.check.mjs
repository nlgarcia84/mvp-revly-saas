import assert from 'node:assert/strict';
import test from 'node:test';
import { promoteDeployment } from './promote.mjs';

const config = {
  token: 'test-token', teamId: 'team_test', projectId: 'prj_test',
  deploymentUrl: 'https://staged.vercel.app', commitSha: 'a'.repeat(40),
  sleep: async () => {}, attempts: 2,
};
const deployment = {
  id: 'dpl_test', ownerId: config.teamId, projectId: config.projectId,
  target: 'production', readyState: 'READY', meta: { githubCommitSha: config.commitSha },
};
const project = { id: config.projectId, accountId: config.teamId, targets: { production: { id: deployment.id } } };

function fixture({ stage = deployment, statuses = [project], postStatus = 200 } = {}) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, method: options.method });
    assert.equal(options.headers.Authorization, `Bearer ${config.token}`);
    assert.equal(new URL(url).searchParams.get('teamId'), config.teamId);
    const path = new URL(url).pathname;
    if (path === '/v13/deployments/staged.vercel.app') return Response.json(stage);
    if (path === '/v10/projects/prj_test/promote/dpl_test' && options.method === 'POST') {
      assert.equal(options.body, '{}');
      return new Response(null, { status: postStatus });
    }
    if (path === '/v9/projects/prj_test') return Response.json(statuses.length > 1 ? statuses.shift() : statuses[0]);
    throw new Error('Unexpected API request: ' + path);
  };
  return { calls, request };
}

test('promotes through the team API without requesting a personal user', async () => {
  const { request, calls } = fixture();
  await promoteDeployment({ ...config, request });
  assert.equal(calls.length, 3);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  assert.ok(calls.every((call) => !call.url.includes('/user')));
});

test('refuses to promote another team, project, commit, preview or unfinished build', async () => {
  for (const override of [
    { ownerId: 'team_other' }, { projectId: 'prj_other' },
    { meta: { githubCommitSha: 'b'.repeat(40) } },
    { target: 'preview' }, { readyState: 'BUILDING' },
  ]) {
    const { request, calls } = fixture({ stage: { ...deployment, ...override } });
    await assert.rejects(promoteDeployment({ ...config, request }), /does not match/);
    assert.ok(calls.every((call) => call.method === 'GET'));
  }
});

test('waits for the production target to change after an accepted promotion', async () => {
  const { request } = fixture({ postStatus: 202, statuses: [{ ...project, targets: { production: { id: 'dpl_previous' } } }, project] });
  await promoteDeployment({ ...config, request });
});

test('fails clearly on denied promotion or an unconfirmed target', async () => {
  await assert.rejects(promoteDeployment({ ...config, request: fixture({ postStatus: 403 }).request }), /HTTP 403/);
  await assert.rejects(promoteDeployment({ ...config, request: fixture({ statuses: [{ ...project, targets: {} }] }).request }), /not confirmed/);
});

test('rejects untrusted deployment URLs before sending the token', async () => {
  for (const deploymentUrl of ['http://staged.vercel.app', 'https://external.example', 'https://user:pass@staged.vercel.app', 'https://staged.vercel.app/path']) {
    let called = false;
    await assert.rejects(promoteDeployment({ ...config, deploymentUrl, request: async () => { called = true; } }));
    assert.equal(called, false);
  }
});
