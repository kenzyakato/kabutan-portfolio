import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './build.mjs';

export async function verifyOutput(directory=path.join(root,'dist'),buildCredential=process.env.TINA_TOKEN) {
  const admin=await readFile(path.join(directory,'admin/index.html'),'utf8');
  if (/localhost:\d+|127\.0\.0\.1:\d+/.test(admin)) throw Error('Development admin cannot be published');
  const page=await readFile(path.join(directory,'index.html'),'utf8');
  if (/<!-- CMS:/.test(page)) throw Error('Unresolved CMS content markers');
  async function inspect(folder) {
    for(const entry of await readdir(folder,{withFileTypes:true})) {
      const file=path.join(folder,entry.name);
      if(entry.isDirectory()) await inspect(file);
      else if(entry.isSymbolicLink()) throw Error('Static output cannot contain symlinks');
      else {
        if((await stat(file)).size>25*1024*1024) throw Error('Static asset exceeds the Pages 25 MiB limit');
        if(buildCredential && (await readFile(file)).includes(Buffer.from(buildCredential))) throw Error('Build credential detected in public output; publish blocked');
      }
    }
  }
  await inspect(directory);
  console.log('Static output contains production admin, resolved content, and no build credential');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await verifyOutput();
