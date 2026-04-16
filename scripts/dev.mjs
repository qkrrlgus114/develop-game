import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer(async (request, response) => {
  const requestPath = request.url === '/' ? '/index.html' : request.url;
  const filePath = resolve(root, `.${requestPath}`);

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const fileStat = await stat(filePath);
  if (fileStat.isDirectory()) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Directory listing is disabled');
    return;
  }

  response.writeHead(200, {
    'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Dev server running at http://127.0.0.1:${port}`);
});
