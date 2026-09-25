import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';

/**
 * TASK-0epry89ms2mg — AC1: the page content contains the exact text "Hello World".
 * TASK-0epry89ms2mg — AC2: the page answers 200 and requires no login.
 */
describe('GET /hello', () => {
  it('AC2: responds 200 with an HTML document', async () => {
    const response = await request(createApp()).get('/hello');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  it('AC1: renders the exact visible text "Hello World"', async () => {
    const response = await request(createApp()).get('/hello');

    expect(visibleText(response.text)).toContain('Hello World');
  });

  it('AC2: is reachable anonymously — no auth header, no redirect to a login page', async () => {
    const response = await request(createApp()).get('/hello').redirects(0);

    expect(response.status).toBe(200);
    expect(response.headers['www-authenticate']).toBeUndefined();
    expect(response.headers['location']).toBeUndefined();
  });
});

/** Strips tags and non-rendered elements so assertions only see what a visitor reads. */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
