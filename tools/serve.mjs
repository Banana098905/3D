// 依存なしの静的ファイルサーバ（ローカル確認用）。使い方: node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
export function startServer(port = 8080, dir = root) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(dir, p));
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end('forbidden'); }
    try { const st = statSync(file); if (!st.isFile()) throw 0; res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(file).pipe(res); }
    catch (_) { res.writeHead(404); res.end('not found'); }
  });
  return new Promise(r => server.listen(port, () => r(server)));
}
if (import.meta.url === 'file://' + process.argv[1]) { const port = Number(process.argv[2]) || 8080; startServer(port).then(() => console.log('http://localhost:' + port + '/')); }
