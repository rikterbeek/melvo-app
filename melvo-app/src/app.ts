import express, { type Express } from 'express';

import { renderHelloWorldPage } from './hello-world-page.js';

/**
 * Builds the HTTP application. The root path is public: it carries no
 * authentication or session requirement so any visitor can reach it.
 */
export function createApp(): Express {
  const app = express();

  app.get('/', (_request, response) => {
    response.type('html').send(renderHelloWorldPage());
  });

  return app;
}
