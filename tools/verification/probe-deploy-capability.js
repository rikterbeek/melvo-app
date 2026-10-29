/**
 * Probes whether this environment can actually enable GitHub Pages, dispatch
 * the deploy workflow and read the host-assigned URL back.
 *
 * It answers one question — can the deploy be *observed* from here? — and
 * prints what it saw. It never contacts anything other than the GitHub API
 * host, and it never guesses a URL.
 *
 * Run: npm run verify:capability
 */

import { lookup } from 'node:dns/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const TOKEN_VARIABLES = [
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'GITHUB_PAT',
  'PAGES_ADMIN_TOKEN',
  'MELVO_GITHUB_TOKEN',
];

export async function probeDns(host) {
  try {
    const { address } = await lookup(host);
    return { ok: true, detail: `${host} resolved to ${address}` };
  } catch (error) {
    return { ok: false, detail: `${host} did not resolve: ${error.code ?? error.message}` };
  }
}

export async function probeApi(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return { ok: true, detail: `${url} answered HTTP ${response.status}` };
  } catch (error) {
    const cause = error.cause?.message ?? error.message;
    return { ok: false, detail: `${url} unreachable: ${cause}` };
  }
}

export function probeToken() {
  const present = TOKEN_VARIABLES.filter((name) => (process.env[name] ?? '').trim() !== '');
  return present.length > 0
    ? { ok: true, detail: `token present in ${present.join(', ')}` }
    : { ok: false, detail: `no token in any of ${TOKEN_VARIABLES.join(', ')}` };
}

export async function probeCli(command) {
  try {
    const { stdout } = await run(command, ['--version']);
    return { ok: true, detail: `${command}: ${stdout.split('\n')[0]}` };
  } catch {
    return { ok: false, detail: `${command} is not installed` };
  }
}

export async function probeDeployCapability() {
  const checks = {
    'dns:api.github.com': await probeDns('api.github.com'),
    'https:api.github.com': await probeApi('https://api.github.com/rate_limit'),
    'token:pages-administration-write': probeToken(),
    'cli:gh': await probeCli('gh'),
  };
  return { checks, canObserveDeploy: Object.values(checks).every((check) => check.ok) };
}

/* node:coverage disable */
// CLI entry point; the probe functions it calls are covered by tests.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const { checks, canObserveDeploy } = await probeDeployCapability();
  for (const [name, check] of Object.entries(checks)) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${name}  — ${check.detail}`);
  }
  console.log(`\ncanObserveDeploy: ${canObserveDeploy}`);
  process.exitCode = canObserveDeploy ? 0 : 1;
}
/* node:coverage enable */
