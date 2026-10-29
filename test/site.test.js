import { describe, expect, it } from 'vitest';
import { read } from './helpers/docs.js';

const INDEX = 'site/index.html';

describe('PRD-1 — the published document', () => {
  it('is a valid HTML5 document with charset, viewport and title', () => {
    const html = read(INDEX);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toMatch(/<html\s+lang="en">/);
    expect(html).toMatch(/<meta\s+charset="utf-8"\s*\/?>/i);
    expect(html).toMatch(/name="viewport"[^>]*width=device-width/);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });

  it('renders the literal text "Hello, world!"', () => {
    expect(read(INDEX)).toMatch(/<h1>Hello, world!<\/h1>/);
  });

  it('makes no external request and runs no script', () => {
    const html = read(INDEX);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('is the document the publish directory serves at `/`', () => {
    expect(() => read(INDEX)).not.toThrow();
  });
});
