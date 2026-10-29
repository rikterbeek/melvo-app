import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot } from './helpers/repo.js';

const html = () => readFileSync(join(repoRoot, '_site', 'index.html'), 'utf8');

test('FR-PAGE-1: the document opens with an HTML5 doctype', () => {
  assert.match(html(), /^<!DOCTYPE html>/i);
});

test('FR-PAGE-1: the document declares a language, UTF-8 charset, viewport and title', () => {
  const source = html();

  assert.match(source, /<html[^>]*\slang="en"/i);
  assert.match(source, /<meta\s+charset="utf-8"\s*\/?>/i);
  assert.match(source, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"\s*\/?>/i);
  assert.match(source, /<title>[^<]+<\/title>/i);
});

test('FR-PAGE-2: the rendered body shows the literal text "Hello, world!"', () => {
  const body = html().match(/<body[^>]*>([\s\S]*)<\/body>/i);

  assert.ok(body, 'document has a body element');
  assert.match(body[1], /Hello, world!/);
});

test('FR-PAGE-4: the document issues no external requests', () => {
  const source = html();

  assert.doesNotMatch(source, /<script/i, 'document contains a script tag');
  assert.doesNotMatch(source, /https?:\/\//i, 'document references an absolute external URL');
  assert.doesNotMatch(source, /<link[^>]+rel="stylesheet"/i, 'document links an external stylesheet');
});
