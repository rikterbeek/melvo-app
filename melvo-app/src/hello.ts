import { Router } from 'express';

/** The one string this page exists to prove reaches a browser. */
const GREETING = 'Hello World';

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${GREETING}</title>
  </head>
  <body>
    <h1>${GREETING}</h1>
  </body>
</html>
`;

/** Serves the public integration-check page at GET /hello. */
export function helloRouter(): Router {
  const router = Router();

  router.get('/hello', (_request, response) => {
    response.type('html').send(PAGE);
  });

  return router;
}
