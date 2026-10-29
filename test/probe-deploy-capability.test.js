import assert from 'node:assert/strict';
import { afterEach, describe } from 'node:test';

import {
  probeApi,
  probeCli,
  probeDeployCapability,
  probeDns,
  probeToken,
} from '../tools/verification/probe-deploy-capability.js';
import { intent } from './helpers/intent.js';
import { startStaticServer } from './helpers/static-server.js';

const TOKEN_VARIABLE = 'PAGES_ADMIN_TOKEN';

describe('deploy capability probe', () => {
  afterEach(() => {
    delete process.env[TOKEN_VARIABLE];
  });

  intent('AC1', 'a resolvable host is reported as reachable by DNS', async () => {
    const result = await probeDns('localhost');
    assert.equal(result.ok, true);
    assert.match(result.detail, /localhost resolved to/);
  });

  intent('AC1', 'an unresolvable host is reported with its DNS error', async () => {
    const result = await probeDns('host.invalid');
    assert.equal(result.ok, false);
    assert.match(result.detail, /did not resolve/);
  });

  intent('AC1', 'a reachable endpoint is reported with its status code', async () => {
    const server = await startStaticServer(new URL('../', import.meta.url));
    try {
      const result = await probeApi(`${server.origin}/index.html`);
      assert.equal(result.ok, true);
      assert.match(result.detail, /answered HTTP 200/);
    } finally {
      await server.close();
    }
  });

  intent('AC1', 'an unreachable endpoint is reported as unreachable', async () => {
    const result = await probeApi('https://host.invalid/');
    assert.equal(result.ok, false);
    assert.match(result.detail, /unreachable/);
  });

  intent('AC1', 'an installed CLI is reported with its version', async () => {
    const result = await probeCli('node');
    assert.equal(result.ok, true);
    assert.match(result.detail, /^node: v\d+/);
  });

  intent('AC1', 'a missing CLI is reported as not installed', async () => {
    const result = await probeCli('definitely-not-a-real-cli');
    assert.equal(result.ok, false);
    assert.match(result.detail, /is not installed/);
  });

  intent('AC1', 'a present admin token is reported as available', () => {
    process.env[TOKEN_VARIABLE] = 'a-token';
    const result = probeToken();
    assert.equal(result.ok, true);
    assert.match(result.detail, new RegExp(TOKEN_VARIABLE));
  });

  intent('AC1', 'a blank token is treated as absent, not as a credential', () => {
    process.env[TOKEN_VARIABLE] = '   ';
    const result = probeToken();
    assert.equal(result.ok, false);
    assert.match(result.detail, /no token/);
  });

  intent('AC1', 'the probe reports every capability the deploy needs', async () => {
    const { checks, canObserveDeploy } = await probeDeployCapability();
    assert.deepEqual(Object.keys(checks), [
      'dns:api.github.com',
      'https:api.github.com',
      'token:pages-administration-write',
      'cli:gh',
    ]);
    for (const check of Object.values(checks)) {
      assert.equal(typeof check.ok, 'boolean');
      assert.ok(check.detail.length > 0);
    }
    assert.equal(canObserveDeploy, Object.values(checks).every((check) => check.ok));
  });
});
