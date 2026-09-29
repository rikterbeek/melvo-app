import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';

/**
 * AC (TASK-jnhs8wns7p9f): Given the app is running, when a visitor opens the
 * page route, then the response is HTTP 200 and the rendered page contains the
 * text "Hello World".
 */
describe('the Hello World page', () => {
  it('responds 200 at the root path without any authentication', async () => {
    const response = await request(createApp()).get('/');

    expect(response.status).toBe(200);
  });

  it('renders the text "Hello World"', async () => {
    const response = await request(createApp()).get('/');

    expect(response.text).toContain('Hello World');
  });

  it('serves the page as HTML', async () => {
    const response = await request(createApp()).get('/');

    expect(response.headers['content-type']).toMatch(/text\/html/);
  });
});
