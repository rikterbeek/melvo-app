import type { Server } from 'node:http';

import { createApp } from './app.js';

export interface ServerOptions {
  /** Defaults to `PORT`, then 3000. Use 0 to let the OS pick a free port. */
  readonly port?: number;
  /** Defaults to `HOST`, then all interfaces. */
  readonly host?: string;
}

function readPort(port: number | undefined): number {
  return port ?? Number.parseInt(process.env['PORT'] ?? '3000', 10);
}

/** Starts the HTTP server and resolves once it is accepting connections. */
export async function startServer(options: ServerOptions = {}): Promise<Server> {
  const port = readPort(options.port);
  const host = options.host ?? process.env['HOST'] ?? '0.0.0.0';

  return new Promise((resolve, reject) => {
    const server = createApp().listen(port, host);
    server.once('listening', () => {
      resolve(server);
    });
    server.once('error', reject);
  });
}

/** Stops a running server and resolves once every connection is closed. */
export async function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
