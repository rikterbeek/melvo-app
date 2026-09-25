import express, { type Express } from 'express';

import { helloRouter } from './hello.js';

/**
 * Builds the HTTP application.
 *
 * `/hello` is mounted first and deliberately ahead of any future auth
 * middleware: it is the public end-to-end check for build, deploy and routing.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helloRouter());

  return app;
}
