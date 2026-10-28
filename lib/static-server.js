'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serves a directory over HTTP, the way a static host serves the deployed
 * artefact: `/` maps to `index.html` and nothing is rewritten on the way out.
 * Used by the launch checks so the page under test is reached over a real
 * origin rather than a `file://` URL.
 */
async function startStaticServer({ root, host = '127.0.0.1', port = 0 } = {}) {
  const requests = [];

  const server = http.createServer(async (req, res) => {
    requests.push({ method: req.method, url: req.url });

    const urlPath = new URL(req.url, 'http://placeholder').pathname;
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const target = path.join(root, relative);

    if (!target.startsWith(path.resolve(root))) {
      res.writeHead(403).end('forbidden');
      return;
    }

    try {
      const body = await fs.readFile(target);
      res.writeHead(200, {
        'content-type': CONTENT_TYPES[path.extname(target)] ?? 'application/octet-stream',
        'content-length': body.length,
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const boundPort = server.address().port;

  return {
    origin: `http://${host}:${boundPort}`,
    requests,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/**
 * The address the independent second check (CHK-8) reaches the site on. It has
 * to be a different route to the page than the first check used, otherwise
 * "independent" means nothing: the first check goes over loopback, so this
 * prefers the host's real external interface and only falls back to a second
 * loopback address when the machine has none.
 */
function independentHost() {
  const external = Object.values(os.networkInterfaces())
    .flat()
    .find((entry) => entry && entry.family === 'IPv4' && !entry.internal);

  return external ? external.address : '127.0.0.2';
}

module.exports = { startStaticServer, independentHost };
