import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot, publishDirFromWorkflow, listFilesRecursively } from './helpers/repo.js';

const PUBLISH_DIR = '_site';

test('FR-PAGE-3: the publish directory holds exactly one file, index.html', () => {
  const entries = listFilesRecursively(join(repoRoot, PUBLISH_DIR));

  assert.deepEqual(entries, ['index.html']);
});

test('SEC-5: no Markdown, template or skills file is in the published artifact', () => {
  const entries = listFilesRecursively(join(repoRoot, PUBLISH_DIR));

  const leaked = entries.filter(
    (entry) =>
      entry.endsWith('.md') ||
      entry.startsWith('skills/') ||
      entry.startsWith('docs/') ||
      entry.includes('-templates/'),
  );

  assert.deepEqual(leaked, [], `publish directory leaks non-site files: ${leaked.join(', ')}`);
});

test('SEC-5: the deploy workflow uploads the publish directory, never the repository root', () => {
  assert.equal(publishDirFromWorkflow(), PUBLISH_DIR);
});

test('FR-PAGE-3: the repository contains exactly one index.html', () => {
  const found = listFilesRecursively(repoRoot, { skip: ['.git', 'node_modules'] }).filter((entry) =>
    entry.endsWith('index.html'),
  );

  assert.deepEqual(found, [`${PUBLISH_DIR}/index.html`]);
});

test('FR-PAGE-3: the repository contains exactly one Pages deploy workflow', () => {
  const workflows = readdirSync(join(repoRoot, '.github', 'workflows')).sort();

  assert.deepEqual(workflows, ['deploy-pages.yml']);
});

test('FR-PAGE-3: the published document is a file, not a directory redirect', () => {
  assert.ok(statSync(join(repoRoot, PUBLISH_DIR, 'index.html')).isFile());
});

test('SEC-5: the workflow never configures a repository-root artifact path', () => {
  const workflow = readFileSync(join(repoRoot, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');

  const rootUploads = workflow
    .split('\n')
    .filter((line) => /^\s*path:\s*(['"]?)(\.|\.\/|\$\{\{\s*github\.workspace\s*\}\})\1\s*$/.test(line));

  assert.deepEqual(rootUploads, [], 'workflow uploads the repository root');
});
