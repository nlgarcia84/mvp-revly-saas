import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export async function promoteDeployment({
  token, teamId, projectId, deploymentUrl, commitSha,
  request = fetch, sleep = delay, attempts = 20, intervalMs = 3_000,
}) {
  if (!token || !teamId?.startsWith('team_') || !projectId?.startsWith('prj_') ||
      !/^[a-f0-9]{40}$/.test(commitSha ?? '')) {
    throw new Error('Missing or invalid production promotion configuration.');
  }
  const url = new URL(deploymentUrl);
  if (url.protocol !== 'https:' || url.origin !== deploymentUrl || !url.hostname.endsWith('.vercel.app')) {
    throw new Error('Expected the exact staged Vercel deployment origin.');
  }

  async function api(path, method = 'GET') {
    const response = await request(`https://api.vercel.com${path}?teamId=${encodeURIComponent(teamId)}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: '{}' } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Vercel ${method} failed (HTTP ${response.status}).`);
    return method === 'GET' ? response.json() : undefined;
  }

  const deployment = await api(`/v13/deployments/${encodeURIComponent(url.hostname)}`);
  if (deployment.ownerId !== teamId || deployment.projectId !== projectId ||
      deployment.target !== 'production' || deployment.readyState !== 'READY' ||
      deployment.meta?.githubCommitSha !== commitSha || !deployment.id?.startsWith('dpl_')) {
    throw new Error('Staged deployment does not match the approved team, project, commit or production target.');
  }

  await api(`/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deployment.id)}`, 'POST');
  for (let attempt = 0; attempt < attempts; attempt++) {
    const project = await api(`/v9/projects/${encodeURIComponent(projectId)}`);
    if (project.id !== projectId || project.accountId !== teamId) {
      throw new Error('Promotion status returned a different project or team.');
    }
    if (project.targets?.production?.id === deployment.id) {
      console.log(`Production promotion verified: ${deployment.id} (${commitSha.slice(0,7)}).`);
      return;
    }
    if (attempt + 1 < attempts) await sleep(intervalMs);
  }
  throw new Error('Promotion requested but not confirmed within the timeout. Check Vercel before retrying.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  promoteDeployment({
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_ORG_ID,
    projectId: process.env.VERCEL_PROJECT_ID,
    deploymentUrl: process.env.DEPLOYMENT_URL,
    commitSha: process.env.GITHUB_SHA,
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
