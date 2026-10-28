'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { launchBrowser } = require('../lib/browser');
const { startStaticServer, independentHost } = require('../lib/static-server');
const { runLaunchChecks, observeViewport, MOBILE } = require('../lib/launch-checks');

const REPO_ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(REPO_ROOT, 'index.html');

/** Titles carry the requirement they prove, per RFC-1-D §6.3. */
const intent = (id, title) => `${id}: ${title}`;

let browser;
let server;
let result;

test.before(async () => {
  ({ browser } = await launchBrowser());
  server = await startStaticServer({ root: REPO_ROOT });
  result = await runLaunchChecks({
    browser,
    url: `${server.origin}/`,
    repoBytes: fs.readFileSync(INDEX_HTML),
  });
});

test.after(async () => {
  await server?.stop();
  await browser?.close();
});

const checkFor = (id) => result.checks.find((entry) => entry.id === id);

const assertCheckPasses = (id) => {
  const entry = checkFor(id);
  assert.ok(entry, `${id} was never executed`);
  assert.equal(entry.result, 'PASS', `${id} failed with evidence ${JSON.stringify(entry.evidence)}`);
};

test(intent('CHK-1', 'GET / returns 200 text/html and renders "Hello, world!"'), () => {
  assertCheckPasses('CHK-1');
  assert.match(checkFor('CHK-1').evidence.renderedBodyText, /Hello, world!/);
});

test(intent('CHK-2', 'desktop ≥1280 px renders legibly with no horizontal scrolling'), () => {
  assertCheckPasses('CHK-2');
  const { evidence } = checkFor('CHK-2');
  assert.equal(evidence.horizontalScrollbar, false);
  assert.ok(evidence.viewportWidth >= 1280, 'desktop check must run at ≥1280 px');
});

test(intent('CHK-3', 'mobile 375 px renders legibly, unzoomed, with no horizontal scrolling'), () => {
  assertCheckPasses('CHK-3');
  const { evidence } = checkFor('CHK-3');
  assert.equal(evidence.viewportWidth, 375);
  assert.equal(evidence.horizontalScrollbar, false);
  assert.equal(evidence.zoomedOut, false);
  assert.ok(
    evidence.smallestTextFontPx >= evidence.minLegiblePx,
    `smallest rendered text ${evidence.smallestTextFontPx}px is below the legibility floor`,
  );
});

test(intent('CHK-4', 'console shows zero errors and zero page-authored warnings'), () => {
  assertCheckPasses('CHK-4');
  assert.deepEqual(checkFor('CHK-4').evidence.errors, []);
  assert.deepEqual(checkFor('CHK-4').evidence.pageAuthoredWarnings, []);
});

test(intent('CHK-5', 'network panel shows exactly one same-origin request'), () => {
  assertCheckPasses('CHK-5');
  for (const entry of checkFor('CHK-5').evidence.perViewport) {
    assert.equal(entry.total, 1, `${entry.viewport} issued ${entry.total} requests`);
    assert.deepEqual(entry.external, []);
  }
});

test(intent('CHK-6', 'R5: no host-injected script, analytics or third-party request'), () => {
  assertCheckPasses('CHK-6');
  const { evidence } = checkFor('CHK-6');
  assert.equal(evidence.scriptElementsInRenderedDom, 0);
  assert.equal(evidence.iframesInRenderedDom, 0);
  assert.deepEqual(evidence.externalRequests, []);
  assert.equal(
    evidence.servedBytesIdenticalToRepoFile,
    true,
    'served bytes differ from the committed file — something rewrote the response',
  );
});

test(intent('CHK-7', 'document basics as rendered: doctype, UTF-8, title, lang'), () => {
  assertCheckPasses('CHK-7');
  const { evidence } = checkFor('CHK-7');
  assert.equal(evidence.doctype.name, 'html');
  assert.equal(evidence.doctype.publicId, '');
  assert.equal(evidence.characterSet.toUpperCase(), 'UTF-8');
  assert.ok(evidence.title.trim().length > 0, 'title is empty');
  assert.ok(evidence.lang.trim().length > 0, 'lang attribute is missing');
});

test(intent('CHK-8', 'an independent re-check from a separate origin and clean profile passes'), async () => {
  const host = independentHost();
  const { browser: second } = await launchBrowser({ directHosts: [host] });
  const secondServer = await startStaticServer({ root: REPO_ROOT, host });

  try {
    const independent = await runLaunchChecks({
      browser: second,
      url: `${secondServer.origin}/`,
      repoBytes: fs.readFileSync(INDEX_HTML),
    });

    assert.notEqual(
      independent.origin,
      result.origin,
      'the second check must reach the site over a different origin to be independent',
    );
    assert.ok(
      independent.passed,
      `independent re-check failed: ${JSON.stringify(
        independent.checks.filter((entry) => entry.result === 'FAIL'),
      )}`,
    );
  } finally {
    await secondServer.stop();
    await second.close();
  }
});

test(
  intent('CHK-3-GUARD', 'the mobile check fails for a page with no width=device-width viewport'),
  async () => {
    const page = await browser.newPage();
    await page.close();

    const noViewportDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'no-viewport-'));
    fs.writeFileSync(
      path.join(noViewportDir, 'index.html'),
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body><h1>Hello, world!</h1></body></html>',
    );
    const unresponsive = await startStaticServer({ root: noViewportDir });

    try {
      const observed = await observeViewport({
        browser,
        url: `${unresponsive.origin}/`,
        viewport: MOBILE,
      });
      // Without the meta tag Chromium lays the page out wide and scales it
      // down; this is exactly the UI-4 failure CHK-3 has to be able to catch.
      assert.notEqual(
        observed.document.layout.layoutWidth,
        MOBILE.width,
        'CHK-3 cannot detect a zoomed-out mobile render',
      );
    } finally {
      await unresponsive.stop();
      fs.rmSync(noViewportDir, { recursive: true, force: true });
    }
  },
);
