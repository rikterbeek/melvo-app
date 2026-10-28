#!/usr/bin/env node
'use strict';

/**
 * Executes the PRD-1 §18 / RFC-1 §10 launch checklist (CHK-1…CHK-8) in a real
 * browser and rewrites `docs/launch-verification-RFC-1.md` plus its raw
 * evidence JSON from what the browser observed.
 *
 *   node scripts/run-launch-checks.js              # local static host
 *   node scripts/run-launch-checks.js <url>        # any deployed URL
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { launchBrowser } = require('../lib/browser');
const { startStaticServer, independentHost } = require('../lib/static-server');
const { runLaunchChecks } = require('../lib/launch-checks');
const {
  renderRecord,
  summarise,
  RECORD_PATH,
  EVIDENCE_PATH,
} = require('../lib/verification-record');

const REPO_ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(REPO_ROOT, 'index.html');

const isoDate = (at) => at.toISOString().slice(0, 10);
const isoSeconds = (at) => `${at.toISOString().slice(0, 19)}Z`;

/**
 * CHK-8. Independence is the whole point, so nothing is reused: a second
 * browser process with its own blank profile reaches the site over a different
 * network route and a different origin, and re-runs CHK-1…CHK-7 from scratch.
 */
async function runIndependentCheck({ url, repoBytes, servedLocally, now }) {
  const host = independentHost();
  const { browser, version } = await launchBrowser({ directHosts: [host] });
  let server;

  try {
    let target = url;
    let route = 'the deployed URL, reached again from a cold browser on a separate process';

    if (servedLocally) {
      server = await startStaticServer({ root: REPO_ROOT, host });
      target = `${server.origin}/`;
      route = `the host’s external network interface (${host}), not the loopback address the first check used`;
    }

    const result = await runLaunchChecks({ browser, url: target, repoBytes });

    return {
      date: isoDate(now),
      executedAt: isoSeconds(now),
      origin: result.origin,
      route,
      browser: version,
      result: result.passed ? 'PASS' : 'FAIL',
      checksPassed: result.checks.filter((entry) => entry.result === 'PASS').length,
      checksTotal: result.checks.length,
      failures: result.checks.filter((entry) => entry.result === 'FAIL'),
    };
  } finally {
    await server?.stop();
    await browser.close();
  }
}

async function main() {
  const now = new Date();
  const requested = process.argv[2] ?? process.env.LAUNCH_URL ?? null;
  const repoBytes = fs.readFileSync(INDEX_HTML);

  const { browser, version } = await launchBrowser();
  let server;

  try {
    let url = requested;

    if (!url) {
      server = await startStaticServer({ root: REPO_ROOT });
      url = `${server.origin}/`;
    }

    const result = await runLaunchChecks({ browser, url, repoBytes });
    const independentCheck = await runIndependentCheck({
      url,
      repoBytes,
      servedLocally: Boolean(server),
      now,
    });

    const checks = [
      ...result.checks.map((entry) => ({
        ...entry,
        executed: true,
        executedAt: isoSeconds(now),
      })),
      {
        id: 'CHK-8',
        requirement: 'PRD §18 GA stage',
        title: 'Independent second check from another network route and a cold browser',
        result: independentCheck.result,
        executed: true,
        executedAt: independentCheck.executedAt,
        evidence: independentCheck,
      },
    ];

    const record = {
      generatedAt: isoSeconds(now),
      date: isoDate(now),
      url: result.url,
      origin: result.origin,
      browser: version,
      artefactSha256: crypto.createHash('sha256').update(repoBytes).digest('hex'),
      targetNote: server
        ? 'the committed artefact served by a static host over a real HTTP origin, which is the' +
          ' site reachable from the verification environment; no deployed URL was supplied to' +
          ' this run (RFC-1 T2)'
        : 'the URL supplied to this run',
      summary: summarise({
        desktop: result.observations.desktop,
        mobile: result.observations.mobile,
        checks,
      }),
      checks,
      independentCheck,
    };

    fs.mkdirSync(path.join(REPO_ROOT, path.dirname(EVIDENCE_PATH)), { recursive: true });
    fs.writeFileSync(
      path.join(REPO_ROOT, EVIDENCE_PATH),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    fs.writeFileSync(path.join(REPO_ROOT, RECORD_PATH), renderRecord(record));

    const failed = checks.filter((entry) => entry.result === 'FAIL');
    for (const entry of checks) {
      process.stdout.write(`${entry.result === 'PASS' ? '✓' : '✗'} ${entry.id} — ${entry.title}\n`);
    }
    process.stdout.write(
      `\nLaunch gate: ${failed.length ? 'FAIL' : 'PASS'} — wrote ${RECORD_PATH}\n`,
    );
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    await server?.stop();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
