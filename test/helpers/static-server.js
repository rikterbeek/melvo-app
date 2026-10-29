import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serves a publish directory the way a static host does — `/` resolves to
 * `index.html` — so the artefact can be checked before it is ever deployed.
 * This proves the file, not the host: the host-assigned URL is observed
 * separately and recorded in docs/verification/.
 */
export async function startStaticServer(publishDir) {
  const root = fileURLToPath(publishDir);

  const server = createServer((request, response) => {
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = requested.endsWith('/') ? `${requested}index.html` : requested;
    const filePath = path.join(root, path.normalize(relative));

    if (!filePath.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }

    readFile(filePath).then(
      (body) => {
        response.writeHead(200, {
          'content-type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
        });
        response.end(body);
      },
      () => {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('not found');
      },
    );
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
