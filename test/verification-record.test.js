'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { renderRecord, CHECK_IDS, RECORD_PATH, EVIDENCE_PATH } = require('../lib/verification-record');

const REPO_ROOT = path.resolve(__dirname, '..');
const record = path.join(REPO_ROOT, RECORD_PATH);
const evidence = path.join(REPO_ROOT, EVIDENCE_PATH);

/** Titles carry the requirement they prove, per RFC-1-D §6.3. */
const intent = (id, title) => `${id}: ${title}`;

const readRecord = () => fs.readFileSync(record, 'utf8');
const readEvidence = () => JSON.parse(fs.readFileSync(evidence, 'utf8'));

test(intent('REC-1', 'the committed verification record exists alongside its raw evidence'), () => {
  assert.ok(fs.existsSync(record), `${RECORD_PATH} is missing`);
  assert.ok(fs.existsSync(evidence), `${EVIDENCE_PATH} is missing`);
});

test(intent('REC-2', 'the record no longer reports BLOCKED and states a definitive pass'), () => {
  const text = readRecord();

  assert.doesNotMatch(
    text,
    /^.*\bBLOCKED\b.*$/m,
    'the record still contains the word BLOCKED somewhere',
  );
  assert.match(text, /\*\*Launch gate\*\* \| \*\*PASS\*\*/, 'the launch gate is not a definitive PASS');
  assert.match(text, /\*\*Status\*\* \| Executed/, 'the record does not declare itself executed');
});

test(intent('REC-3', 'every checklist item CHK-1…CHK-8 is executed with a result and evidence'), () => {
  const text = readRecord();
  const { checks } = readEvidence();

  assert.deepEqual(
    checks.map((entry) => entry.id),
    CHECK_IDS,
    'the evidence does not cover exactly CHK-1…CHK-8',
  );

  for (const entry of checks) {
    assert.equal(entry.result, 'PASS', `${entry.id} is not a pass`);
    assert.equal(entry.executed, true, `${entry.id} is not marked executed`);
    assert.ok(entry.executedAt, `${entry.id} has no execution timestamp`);
    assert.ok(
      Object.keys(entry.evidence ?? {}).length > 0,
      `${entry.id} was recorded without evidence`,
    );
    assert.match(text, new RegExp(`\\| ${entry.id} \\|`), `${entry.id} has no row in the record`);
  }
});

test(intent('REC-4', 'both viewports, a zero-error console and zero foreign hosts are recorded'), () => {
  const { summary } = readEvidence();

  assert.equal(summary.desktopViewportPx >= 1280, true, 'no ≥1280 px desktop render recorded');
  assert.equal(summary.mobileViewportPx, 375);
  assert.equal(summary.horizontalScrollingViewports, 0);
  assert.equal(summary.consoleErrors, 0);
  assert.equal(summary.pageAuthoredConsoleWarnings, 0);
  assert.equal(summary.requestsToOtherHosts, 0);
  assert.equal(summary.hostInjectedScripts, 0);
});

test(intent('REC-5', 'the independent second check is recorded with its date and outcome'), () => {
  const { independentCheck } = readEvidence();

  assert.ok(independentCheck, 'no independent second check was recorded');
  assert.match(independentCheck.date, /^\d{4}-\d{2}-\d{2}$/, 'the second check has no ISO date');
  assert.equal(independentCheck.result, 'PASS');
  assert.notEqual(
    independentCheck.origin,
    readEvidence().origin,
    'the second check used the same origin as the first, so it is not independent',
  );
  assert.ok(independentCheck.route, 'the second check does not say how it reached the site');
  assert.match(readRecord(), /\| CHK-8 \|/);
});

test(intent('REC-6', 'the record is rendered from the evidence, never hand-edited'), () => {
  assert.equal(
    readRecord(),
    renderRecord(readEvidence()),
    `${RECORD_PATH} has drifted from ${EVIDENCE_PATH} — regenerate it with \`npm run verify:launch\``,
  );
});
