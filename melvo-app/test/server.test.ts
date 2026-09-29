import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import { startServer, stopServer } from '../src/server.js';

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    await stopServer(server);
    server = undefined;
  }
});

function urlOf(running: Server): string {
  const { port } = running.address() as AddressInfo;
  return `http://127.0.0.1:${String(port)}/`;
}

/**
 * AC (TASK-jnhs8wns7p9f), end to end over a real socket: given the app is
 * running, a visitor opening the page route gets HTTP 200 and a page
 * containing "Hello World".
 */
describe('the running server', () => {
  it('serves the Hello World page over HTTP to an unauthenticated visitor', async () => {
    server = await startServer({ port: 0, host: '127.0.0.1' });

    const response = await fetch(urlOf(server));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Hello World');
  });

  it('binds the port and host given by the environment when none are passed', async () => {
    process.env['PORT'] = '0';
    process.env['HOST'] = '127.0.0.1';
    try {
      server = await startServer();

      expect((server.address() as AddressInfo).address).toBe('127.0.0.1');
    } finally {
      delete process.env['PORT'];
      delete process.env['HOST'];
    }
  });

  it('rejects when stopping a server that is no longer running', async () => {
    const running = await startServer({ port: 0, host: '127.0.0.1' });
    await stopServer(running);

    await expect(stopServer(running)).rejects.toThrow();
  });

  it('reports the error instead of hanging when the port is already taken', async () => {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const { port } = server.address() as AddressInfo;

    await expect(startServer({ port, host: '127.0.0.1' })).rejects.toThrow();
  });
});
