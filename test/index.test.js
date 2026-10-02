import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const indexHtmlPath = fileURLToPath(new URL('../index.html', import.meta.url));

const readIndexHtml = () => readFile(indexHtmlPath, 'utf8');

test('R1: index.html declares the HTML5 doctype', async () => {
  const html = await readIndexHtml();

  assert.match(html, /^\s*<!doctype html>/i);
});

test('R1: index.html shows the greeting in a single h1', async () => {
  const html = await readIndexHtml();

  assert.ok(html.includes('Hello, world!'), 'expected the greeting text');
  assert.deepEqual(html.match(/<h1\b/gi)?.length, 1);
  assert.match(html, /<h1[^>]*>\s*Hello, world!\s*<\/h1>/);
});

test('R1: index.html is a complete HTML5 document', async () => {
  const html = await readIndexHtml();

  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta charset="utf-8">/i);
  assert.match(html, /<meta name="viewport" content="[^"]*width=device-width[^"]*">/i);
  assert.match(html, /<title>Hello world<\/title>/);
});

test('R2: index.html pulls in no external resources', async () => {
  const html = await readIndexHtml();

  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /<link\b/i);
});
