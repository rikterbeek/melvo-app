import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe } from 'node:test';

import { validateObservationRecord } from '../tools/verification/evidence.js';
import { intent } from './helpers/intent.js';

const RECORD_PATH = new URL(
  '../docs/verification/pages-deploy-observation.json',
  import.meta.url,
);

function observedRecord(overrides = {}) {
  return {
    task: 'TASK-fsh4jn5nb3wa',
    status: 'observed',
    runUrl: 'https://github.com/rikterbeek/melvo-app/actions/runs/1234567890',
    observedUrl: {
      value: 'https://rikterbeek.github.io/melvo-app/',
      source: 'GET /repos/rikterbeek/melvo-app/pages .html_url',
    },
    httpsResponse: {
      statusCode: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    },
    httpRedirect: {
      requestUrl: 'http://rikterbeek.github.io/melvo-app/',
      statusCode: 301,
      location: 'https://rikterbeek.github.io/melvo-app/',
    },
    certificate: { valid: true, issuer: 'Example CA', subject: '*.github.io' },
    ...overrides,
  };
}

function blockedRecord(overrides = {}) {
  return {
    task: 'TASK-fsh4jn5nb3wa',
    status: 'blocked',
    blockers: [
      {
        missing: 'GitHub token with the Pages "administration: write" permission',
        evidence: 'no token present in the environment',
      },
    ],
    ...overrides,
  };
}

describe('deploy observation evidence record', () => {
  intent('FR-DEPLOY-1', 'a complete observed record is accepted', () => {
    const result = validateObservationRecord(observedRecord());
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);
  });

  intent('AC6', 'an observed record must name a run URL', () => {
    const result = validateObservationRecord(observedRecord({ runUrl: undefined }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('runUrl')));
  });

  intent('AC6', 'a run URL that is not a GitHub Actions run is rejected', () => {
    const result = validateObservationRecord(
      observedRecord({ runUrl: 'https://github.com/rikterbeek/melvo-app/actions' }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('runUrl')));
  });

  intent('AC1', 'a URL derived from the git remote is rejected, not recorded', () => {
    const result = validateObservationRecord(
      observedRecord({
        observedUrl: {
          value: 'https://rikterbeek.github.io/melvo-app/',
          source: 'derived from the git remote',
        },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('observedUrl.source')));
  });

  intent('AC1', 'an observed URL must cite the host response it was read from', () => {
    const result = validateObservationRecord(
      observedRecord({ observedUrl: { value: 'https://rikterbeek.github.io/melvo-app/' } }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('observedUrl.source')));
  });

  intent('AC1', 'the observed URL must be HTTPS', () => {
    const result = validateObservationRecord(
      observedRecord({
        observedUrl: {
          value: 'http://rikterbeek.github.io/melvo-app/',
          source: 'GET /repos/rikterbeek/melvo-app/pages .html_url',
        },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('observedUrl.value')));
  });

  intent('FR-DEPLOY-1', 'GET / must be recorded as 200', () => {
    const result = validateObservationRecord(
      observedRecord({
        httpsResponse: { statusCode: 404, headers: { 'content-type': 'text/html' } },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('httpsResponse.statusCode')));
  });

  intent('FR-DEPLOY-1', 'GET / must be recorded as text/html', () => {
    const result = validateObservationRecord(
      observedRecord({
        httpsResponse: { statusCode: 200, headers: { 'content-type': 'application/json' } },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('content-type')));
  });

  intent('SEC-1', 'plain HTTP must be recorded as redirecting to the HTTPS URL', () => {
    const result = validateObservationRecord(
      observedRecord({
        httpRedirect: {
          requestUrl: 'http://rikterbeek.github.io/melvo-app/',
          statusCode: 200,
          location: 'https://rikterbeek.github.io/melvo-app/',
        },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('httpRedirect.statusCode')));
  });

  intent('SEC-1', 'a redirect that does not land on HTTPS is rejected', () => {
    const result = validateObservationRecord(
      observedRecord({
        httpRedirect: {
          requestUrl: 'http://rikterbeek.github.io/melvo-app/',
          statusCode: 301,
          location: 'http://elsewhere.example/',
        },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('httpRedirect.location')));
  });

  intent('SEC-1', 'an invalid certificate is rejected', () => {
    const result = validateObservationRecord(
      observedRecord({ certificate: { valid: false, issuer: 'x', subject: 'y' } }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('certificate')));
  });

  intent('AC1', 'a blocked record must state the exact missing permission', () => {
    const result = validateObservationRecord(blockedRecord());
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);
  });

  intent('AC1', 'a blocked record with an empty blocker list is rejected', () => {
    const result = validateObservationRecord(blockedRecord({ blockers: [] }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('blockers')));
  });

  intent('AC1', 'a blocked record must not carry an inferred URL', () => {
    const result = validateObservationRecord(
      blockedRecord({
        observedUrl: {
          value: 'https://rikterbeek.github.io/melvo-app/',
          source: 'derived from the git remote',
        },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('observedUrl')));
  });

  intent('AC1', 'a blocked record must not claim a deploy run', () => {
    const result = validateObservationRecord(
      blockedRecord({ runUrl: 'https://github.com/rikterbeek/melvo-app/actions/runs/1' }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('runUrl')));
  });

  intent('AC1', 'an unknown status is rejected', () => {
    const result = validateObservationRecord({ task: 'TASK-x', status: 'probably-fine' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('status')));
  });

  intent('AC1', 'an observed record with no URL at all is rejected', () => {
    const result = validateObservationRecord(observedRecord({ observedUrl: undefined }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('observedUrl.value')));
  });

  intent('FR-DEPLOY-1', 'an observed record with no captured headers is rejected', () => {
    const result = validateObservationRecord(observedRecord({ httpsResponse: undefined }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('httpsResponse.headers')));
  });

  intent('SEC-1', 'an observed record with no redirect evidence is rejected', () => {
    const result = validateObservationRecord(observedRecord({ httpRedirect: undefined }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('httpRedirect')));
  });

  intent('SEC-1', 'the redirect must start from the plain-HTTP form of the URL', () => {
    const result = validateObservationRecord(
      observedRecord({
        httpRedirect: {
          requestUrl: 'https://rikterbeek.github.io/melvo-app/',
          statusCode: 301,
          location: 'https://rikterbeek.github.io/melvo-app/',
        },
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('httpRedirect.requestUrl')));
  });

  intent('AC1', 'a blocker with a blank missing field is rejected', () => {
    const result = validateObservationRecord(
      blockedRecord({ blockers: [{ missing: '   ', evidence: 'probe output' }] }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('blockers[0].missing')));
  });

  intent('AC1', 'a blocker with no evidence of how it was observed is rejected', () => {
    const result = validateObservationRecord(
      blockedRecord({ blockers: [{ missing: 'Pages: write' }] }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('blockers[0].evidence')));
  });

  intent('AC1', 'a blocked record must not claim response evidence', () => {
    const result = validateObservationRecord(
      blockedRecord({ httpsResponse: { statusCode: 200, headers: {} } }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('response evidence')));
  });

  intent('AC6', 'a record with no task id is rejected', () => {
    const result = validateObservationRecord(observedRecord({ task: '  ' }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('task')));
  });

  intent('AC6', 'a missing record is rejected rather than throwing', () => {
    const result = validateObservationRecord(undefined);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  intent('AC6', 'the committed evidence record is itself valid', async () => {
    const record = JSON.parse(await readFile(RECORD_PATH, 'utf8'));
    const result = validateObservationRecord(record);
    assert.deepEqual(result.errors, []);
    assert.equal(record.task, 'TASK-fsh4jn5nb3wa');
  });
});
