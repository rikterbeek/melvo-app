#!/usr/bin/env node
'use strict';

/**
 * Serves the repository root the way a static host serves the deployed
 * artefact, so the page can be opened in a browser by hand at the same kind of
 * origin the launch checks use.
 *
 *   node scripts/serve.js            # 127.0.0.1, random free port
 *   PORT=8080 node scripts/serve.js
 */

const path = require('node:path');

const { startStaticServer } = require('../lib/static-server');

async function main() {
  const server = await startStaticServer({
    root: path.resolve(__dirname, '..'),
    host: process.env.HOST ?? '127.0.0.1',
    port: process.env.PORT ? Number(process.env.PORT) : 0,
  });

  process.stdout.write(`serving ${server.origin}/ — ctrl-c to stop\n`);

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.stop().then(() => process.exit(0));
    });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
