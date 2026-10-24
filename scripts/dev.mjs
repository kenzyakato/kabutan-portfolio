import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build, root } from './build.mjs';
await build();
let pending;
for (const folder of ['content','assets','templates']) watch(path.join(root,folder),{recursive:true},() => {
  clearTimeout(pending); pending=setTimeout(() => build().catch(console.error),200);
});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
createServer(async (req,res) => {
  try {
    const url=new URL(req.url,'http://localhost');
    let pathname=decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname+='index.html';
    const base=pathname.startsWith('/admin/') ? root : path.join(root,'dist');
    const file=path.resolve(base,'.'+pathname);
    if (!file.startsWith(base+path.sep)) {res.writeHead(403).end();return;}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.writeHead(404).end('Not found');}
}).listen(4173,'127.0.0.1',() => console.log('Site http://127.0.0.1:4173 / CMS http://127.0.0.1:4173/admin/'));
