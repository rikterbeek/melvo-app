import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot, PUBLISH_DIR, listPublishDir, uploadArtifactPath } from './helpers/site.js';

const HOSTING_DOC = join(repoRoot, 'docs', 'hosting.md');
const WORKFLOW = join(repoRoot, '.github', 'workflows', 'deploy-pages.yml');

const read = (path) => readFileSync(path, 'utf8');

test('FR-PAGE-3 — the publish directory holds exactly one HTML document and it is index.html', () => {
  const html = listPublishDir().filter((entry) => entry.endsWith('.html'));
  assert.deepEqual(html, ['index.html']);
});

test('FR-PAGE-3 — no second document can serve / from a branch source', () => {
  for (const candidate of ['index.html', join('docs', 'index.html')]) {
    assert.equal(
      existsSync(join(repoRoot, candidate)),
      false,
      `${candidate} would let a branch Pages source serve / as well as ${PUBLISH_DIR}/`,
    );
  }
});

test('FR-PAGE-3 — exactly one Pages publish mechanism is defined in the repository', () => {
  const workflowDir = join(repoRoot, '.github', 'workflows');
  const deployers = readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .filter((name) => read(join(workflowDir, name)).includes('actions/deploy-pages'));
  assert.deepEqual(deployers, ['deploy-pages.yml']);
});

test('FR-PAGE-3 — the deploy workflow uploads the publish directory, not the repository root', () => {
  assert.equal(uploadArtifactPath(read(WORKFLOW)), `${PUBLISH_DIR}/`);
});

test('SEC-5 — the publish directory exposes no repository documentation or templates', () => {
  const forbidden = ['README.md', 'docs', 'skills', 'work-item-templates', 'artifact-templates'];
  const published = listPublishDir();
  for (const name of forbidden) {
    assert.equal(published.includes(name), false, `${name} must not be published at the site URL`);
  }
  assert.deepEqual(published, ['index.html']);
});

test('FR-PAGE-1 — the site document is a valid HTML5 document with the required head metadata', () => {
  const html = read(join(repoRoot, PUBLISH_DIR, 'index.html'));
  assert.match(html, /^<!DOCTYPE html>/i);
  assert.match(html, /<html[^>]*\slang="en"/i);
  assert.match(html, /<meta\s+charset="utf-8"\s*\/?>/i);
  assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"\s*\/?>/i);
  assert.match(html, /<title>[^<]+<\/title>/i);
});

test('FR-PAGE-2 — the site document renders the text "Hello, world!"', () => {
  const html = read(join(repoRoot, PUBLISH_DIR, 'index.html'));
  assert.match(html, /<h1>Hello, world!<\/h1>/);
});

test('SEC-5 — the site document makes no external request and runs no script', () => {
  const html = read(join(repoRoot, PUBLISH_DIR, 'index.html'));
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /https?:\/\//i);
});

test('FR-DOC-1 — docs/hosting.md documents the one source and the scoped publish directory', () => {
  const doc = read(HOSTING_DOC);
  assert.match(doc, /GitHub Actions/);
  assert.match(doc, new RegExp(`\`${PUBLISH_DIR}/\``));
  assert.match(doc, /`\.github\/workflows\/deploy-pages\.yml`/);
});

test('FR-DOC-1 — docs/hosting.md leaves no contradictory publish instruction behind', () => {
  const doc = read(HOSTING_DOC);
  assert.doesNotMatch(doc, /Deploy from a branch/i);
  assert.doesNotMatch(doc, /path:\s*\.\s*$/m);
});

test('FR-DOC-1 — README and docs/hosting.md agree on a single canonical URL', () => {
  const urlPattern = /https:\/\/[a-z0-9-]+\.github\.io\/[a-z0-9._-]+\//g;
  const found = [...read(join(repoRoot, 'README.md')).matchAll(urlPattern), ...read(HOSTING_DOC).matchAll(urlPattern)]
    .map((match) => match[0]);
  assert.ok(found.length >= 2, 'both README.md and docs/hosting.md must state the canonical URL');
  assert.equal(new Set(found).size, 1, `conflicting canonical URLs: ${[...new Set(found)].join(', ')}`);
});

test('FR-PAGE-3 — the publish directory is a directory containing only files', () => {
  const publishPath = join(repoRoot, PUBLISH_DIR);
  assert.ok(statSync(publishPath).isDirectory());
  for (const name of listPublishDir()) {
    assert.ok(statSync(join(publishPath, name)).isFile(), `${name} must be a file, not a subtree`);
  }
});
