import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir, open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { root, build, loadContent, mediaInfo } from '../scripts/build.mjs';

// Migration assertions use the original snapshot, never the artist's editable content.
async function fixtureWorkspace() {
  const temp=await mkdtemp(path.join(os.tmpdir(),'kabutan-fixture-'));
  for (const dir of ['assets','templates']) await cp(path.join(root,dir),path.join(temp,dir),{recursive:true});
  await cp(path.join(root,'tests/fixtures/content'),path.join(temp,'content'),{recursive:true});
  return temp;
}

test('migration preserves 23 works, categories, original price wording and all source hashes', async () => {
  const temp=await fixtureWorkspace();
  let artworks,settings;
  try { ({artworks,settings}=await loadContent(temp)); }
  finally { await rm(temp,{recursive:true,force:true}); }
  assert.equal(artworks.length,23);
  assert.deepEqual(Object.fromEntries(settings.categories.map(c => [c.name,artworks.filter(a=>a.category===c.name).length])),{'Illustration':9,'VTuber Models':6,'Character Design':8});
  assert.equal(settings.menu[0].rows[0].price,'50+ ');
  assert.equal(settings.menu[2].rows[1].price,'120 ');
  assert.equal(settings.categories.find(c=>c.name==='Character Design').shadowColor,'#6aa04e');
  const { createHash }=await import('node:crypto');
  const verification=JSON.parse(await readFile(path.join(root,'verification.json'),'utf8'));
  for (const f of verification.files) for (const key of ['original','preview']) {
    assert.equal(createHash('sha256').update(await readFile(path.join(root,f[key]))).digest('hex').toLowerCase(),f[`${key}_sha256`].toLowerCase());
  }
});

test('hide/restore, reorder, replacement, categories, price edits and empty gallery build safely', async () => {
  const temp=await mkdtemp(path.join(os.tmpdir(),'kabutan-cms-'));
  try {
    for (const dir of ['assets','templates']) await cp(path.join(root,dir),path.join(temp,dir),{recursive:true});
    await cp(path.join(root,'tests/fixtures/content'),path.join(temp,'content'),{recursive:true});
    const file=path.join(temp,'content/artworks/design-01.json');
    const a=JSON.parse(await readFile(file,'utf8'));
    a.visible=false; await writeFile(file,JSON.stringify(a));
    let html=await build(temp);
    assert.ok(!html.includes('data-open="design-01"'));
    a.visible=true;a.order=-1;a.title='<script>alert(1)</script>';a.image='assets/originals/art-01.jpg';a.preview='';
    await writeFile(file,JSON.stringify(a));
    const settingsFile=path.join(temp,'content/settings.json');
    const settings=JSON.parse(await readFile(settingsFile,'utf8'));
    settings.categories.push({name:'New category',color:'#112233'});
    a.category='New category';await writeFile(file,JSON.stringify(a));
    settings.menu[0].rows[0].price='USD 99';await writeFile(settingsFile,JSON.stringify(settings));
    html=await build(temp);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.indexOf('data-open="design-01"',html.indexOf('id="grid"')) < html.indexOf('data-open="art-01"',html.indexOf('id="grid"')));
    assert.ok(html.includes('USD 99'));assert.ok(html.includes('New category'));
    // Tina omits empty optional list fields when an extras card is saved.
    delete settings.menu[3].rows;
    await writeFile(settingsFile,JSON.stringify(settings));
    html=await build(temp);assert.ok(html.includes('+USD 10 each'));
    const added={title:'New uploaded work',category:'New category',order:-2,visible:false,image:'assets/originals/art-01.jpg',alt:'New work description'};
    const addedFile=path.join(temp,'content/artworks/new-work.json');
    await writeFile(addedFile,JSON.stringify(added));
    html=await build(temp);assert.ok(!html.includes('data-open="new-work"'));
    added.visible=true;await writeFile(addedFile,JSON.stringify(added));
    html=await build(temp);assert.ok(html.includes('data-open="new-work"'));assert.ok(html.includes('24 works.'));
    for (const entry of (await loadContent(temp)).artworks) {entry.visible=false;await writeFile(path.join(temp,'content/artworks',`${entry.id}.json`),JSON.stringify(entry));}
    html=await build(temp);assert.ok(!html.includes('data-open='));assert.ok(html.includes('0 works.'));
  } finally { await rm(temp,{recursive:true,force:true}); }
});

test('category filters render untrusted labels as text, with correct counts',async () => {
  const {runInNewContext}=await import('node:vm');
  const source=await readFile(path.join(root,'templates/index.html'),'utf8');
  const render=source.slice(source.indexOf('function renderFilters(){'),source.indexOf('function setFilter('));
  const malicious='\"><img src=x onerror=alert(1)>';
  const nodes={filters:null,heroChips:null,gallery:{hidden:false}};
  function node(){return {dataset:{},style:{},children:[],textContent:'',setAttribute(k,v){this[k]=String(v)},append(c){this.children.push(c)},replaceChildren(...c){this.children=c},set innerHTML(v){throw Error('Unsafe HTML insertion')}};}
  nodes.filters=node();nodes.heroChips=node();
  runInNewContext(`${render};renderFilters();`,{document:{createElement:node},$:id=>nodes[id],CATS:['All',malicious],TAG:{[malicious]:'#112233'},cards:[{dataset:{cat:malicious}}],filter:'All'});
  assert.equal(nodes.filters.children[1].textContent,malicious);
  assert.equal(nodes.filters.children[1].dataset.filter,malicious);
  assert.equal(nodes.filters.children[1].children[0].textContent,1);
  assert.equal(nodes.heroChips.children[0].textContent,malicious);
});

test('service rows hide and restore without deletion and omit empty price markup',async()=>{
  const temp=await fixtureWorkspace();
  try {
    const file=path.join(temp,'content/settings.json'),settings=JSON.parse(await readFile(file,'utf8'));
    const card=settings.menu[0],original=structuredClone(card.rows);card.rows.forEach(row=>row.visible=false);card.extra='   ';
    await writeFile(file,JSON.stringify(settings));let html=await build(temp);
    const rendered=html.slice(html.indexOf('<article class="price-card'),html.indexOf('</article>',html.indexOf('<article class="price-card')));
    assert.ok(!rendered.includes('<dl>'));assert.ok(!rendered.includes('extra-price'));assert.ok(!rendered.includes(original[0].label));
    card.rows[0].visible=true;await writeFile(file,JSON.stringify(settings));html=await build(temp);
    const restored=html.slice(html.indexOf('<article class="price-card'),html.indexOf('</article>',html.indexOf('<article class="price-card')));
    assert.ok(restored.includes(original[0].label));assert.ok(restored.includes(original[0].price));
    assert.equal(card.rows.length,original.length);assert.deepEqual(card.rows.map(({visible,...row})=>row),original);
  }finally{await rm(temp,{recursive:true,force:true});}
});

test('rejects disguised SVG content even with a permitted image extension',async () => {
  const temp=await mkdtemp(path.join(os.tmpdir(),'kabutan-image-'));
  try {
    await mkdir(path.join(temp,'assets'));
    await writeFile(path.join(temp,'assets/disguised.png'),'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    await assert.rejects(mediaInfo('assets/disguised.png',temp),/Unsupported image content/);
  } finally {await rm(temp,{recursive:true,force:true});}
});

test('editable content uses canonical repo media paths for Tina round trips',async () => {
  const {artworks}=await loadContent();
  for (const artwork of artworks) for (const field of ['image','preview']) {
    if (!artwork[field]) continue;
    assert.match(artwork[field],/^\/assets\//,'Tina requires a leading slash to resolve and save repo media');
    assert.ok(!artwork[field].includes('__staging/'),'CDN staging paths must not be committed as repo paths');
  }
  assert.deepEqual(await mediaInfo('/assets/originals/art-01.jpg'),await mediaInfo('assets/originals/art-01.jpg'));
});

test('rejects traversal, external URLs and unsupported image paths',async () => {
  for (const value of ['../private.png','assets/../secret.png','https://example.com/image.png','assets/x.svg','assets/a.png?x=1']) await assert.rejects(mediaInfo(value),/Unsafe image path/);
});

test('rejects files over the 24 MiB upload/build budget',async () => {
  const temp=await mkdtemp(path.join(os.tmpdir(),'kabutan-limit-'));
  try {
    await mkdir(path.join(temp,'assets'));
    const file=await open(path.join(temp,'assets/large.png'),'w');
    await file.truncate(24*1024*1024+1);await file.close();
    await assert.rejects(mediaInfo('assets/large.png',temp),/exceeds 24 MiB/);
  } finally {await rm(temp,{recursive:true,force:true});}
});
