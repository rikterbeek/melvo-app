import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot } from './helpers/repo.js';

const CONTESTED_FILES = [
  'README.md',
  'docs/launch-verification-RFC-1.md',
  'package.json',
  '.github/workflows/deploy-pages.yml',
];

const CONFLICT_MARKER = /^(<{7}|={7}|>{7})(\s|$)/m;

for (const file of CONTESTED_FILES) {
  test(`FR-PAGE-3: ${file} exists in a single state with no conflict markers`, () => {
    const contents = readFileSync(join(repoRoot, file), 'utf8');

    assert.ok(contents.trim().length > 0, `${file} is empty`);
    assert.doesNotMatch(contents, CONFLICT_MARKER, `${file} still carries conflict markers`);
  });
}

test('FR-PAGE-3: package.json is valid JSON describing the single site repository', () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(pkg.name, 'melvo-app');
  assert.equal(pkg.private, true);
  assert.ok(pkg.scripts?.test, 'package.json defines a test script');
});

test('FR-PAGE-3: the README names _site as the one publish directory', () => {
  const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');

  assert.match(readme, /_site/);
  assert.match(readme, /melvo-app/);
});
