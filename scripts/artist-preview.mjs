import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {build} from 'esbuild';
import {root} from './build.mjs';

const output=path.join(root,'artist-preview');
await mkdir(output,{recursive:true});
const files=(await readdir(path.join(root,'content/artworks'))).filter(name=>name.endsWith('.json'));
const artworks=await Promise.all(files.map(async name=>({...JSON.parse(await readFile(path.join(root,'content/artworks',name),'utf8')),_sys:{relativePath:name}})));
const settings=JSON.parse(await readFile(path.join(root,'content/settings.json'),'utf8'));
await build({entryPoints:[path.join(root,'scripts/artist-preview.jsx')],bundle:true,outfile:path.join(output,'preview.js'),format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const json=JSON.stringify({artworks,settings}).replace(/</g,'\\u003c');
await writeFile(path.join(output,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kabutan - Simple editor preview</title><style>body{margin:0;background:#fffdf8}</style></head><body><div id="root"></div><script id="preview-data" type="application/json">${json}</script><script type="module" src="/preview.js"></script></body></html>`);
console.log('Built local editor preview. All writes are in-memory simulations; authentication is not bypassed in the real CMS.');
if(process.argv.includes('--serve')){
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif'};
  createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const base=pathname.startsWith('/assets/')?root:output;
      const file=path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(base+path.sep)||!types[path.extname(file)]){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));
    }catch{res.writeHead(404).end('Not found');}
  }).listen(4175,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4175/ (Ctrl+C to stop)'));
}
