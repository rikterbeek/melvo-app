import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, describe } from 'node:test';

import { inspectHtmlDocument } from '../tools/site/document-checks.js';
import { intent } from './helpers/intent.js';
import { startStaticServer } from './helpers/static-server.js';

const PUBLISH_DIR = new URL('../', import.meta.url);
const INDEX_PATH = new URL('../index.html', import.meta.url);

describe('the published Hello, world! document', () => {
  let html;
  let doc;

  before(async () => {
    html = await readFile(INDEX_PATH, 'utf8');
    doc = inspectHtmlDocument(html);
  });

  intent('FR-PAGE-1', 'the page renders the literal text "Hello, world!"', () => {
    assert.ok(doc.text.includes('Hello, world!'));
    assert.ok(doc.headings.includes('Hello, world!'));
  });

  intent('FR-PAGE-2', 'the document is a valid HTML5 skeleton', () => {
    assert.equal(doc.hasDoctype, true);
    assert.equal(doc.charset, 'utf-8');
    assert.equal(doc.lang, 'en');
    assert.ok(doc.title.length > 0);
  });

  intent('FR-PAGE-3', 'the document declares a responsive viewport', () => {
    assert.equal(doc.viewport, 'width=device-width, initial-scale=1');
  });

  intent('FR-PAGE-4', 'the page makes no external request and runs no script', () => {
    assert.deepEqual(doc.externalReferences, []);
    assert.deepEqual(doc.scriptTags, []);
  });
});

describe('serving the publish directory', () => {
  let server;

  before(async () => {
    server = await startStaticServer(PUBLISH_DIR);
  });

  after(async () => {
    await server.close();
  });

  intent('FR-DEPLOY-1', 'GET / returns 200 with Content-Type text/html', async () => {
    const response = await fetch(`${server.origin}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.ok((await response.text()).includes('Hello, world!'));
  });

  intent('FR-DEPLOY-1', 'a path outside the publish directory is refused', async () => {
    const response = await fetch(`${server.origin}/../../etc/passwd`, { redirect: 'manual' });
    assert.ok([403, 404].includes(response.status));
  });

  intent('FR-DEPLOY-1', 'an unknown path returns 404, not the index', async () => {
    const response = await fetch(`${server.origin}/nope.html`);
    assert.equal(response.status, 404);
  });

  intent('FR-DEPLOY-1', 'the publish directory root resolves to index.html', async () => {
    const [root, explicit] = await Promise.all([
      fetch(`${server.origin}/`).then((r) => r.text()),
      fetch(`${server.origin}/index.html`).then((r) => r.text()),
    ]);
    assert.equal(root, explicit);
  });
});
