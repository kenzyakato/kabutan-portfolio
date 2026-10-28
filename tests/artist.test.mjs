import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {buildASTSchema,parse,validate} from 'graphql';
import {artworkInput,mediaPath,movePlan,newArtwork,PROJECT_ID,sameArtwork,settingsInput,START_ROUTE,studioEntryRoute,uploadFilename} from '../tina/artist-model.mjs';
import {runInNewContext} from 'node:vm';

test('studio entry matches the actual installed Tina screen router and repairs old links',async()=>{
  const source=await readFile('node_modules/tinacms/dist/index.js','utf8');
  const start=source.indexOf('const slugify = (text) => {');
  assert.ok(start>=0,'Pinned Tina router implementation is available for verification');
  const end=source.indexOf('\n};',start)+3;
  const slug=runInNewContext(source.slice(start,end)+';slugify("Start here");');
  assert.equal(START_ROUTE,'#/screens/'+slug);
  assert.equal(studioEntryRoute('#/screens/start-here'),START_ROUTE);
  assert.equal(studioEntryRoute(''),START_ROUTE);
  assert.equal(studioEntryRoute('#/collections/artwork/~'),null);
  assert.equal(studioEntryRoute(START_ROUTE),null,'Do not reload a correctly registered screen');
});

test('real Tina config bundling retains artist styles without an external CSS asset',async()=>{
  const result=await build({entryPoints:['tina/artist-app.tsx'],bundle:true,write:false,platform:'browser',format:'esm'});
  assert.equal(result.outputFiles.length,1,'Styles must stay in the screen JS, not a dropped config CSS sidecar');
  assert.ok(result.outputFiles[0].text.includes('.artist-app{'));
  assert.ok(result.outputFiles[0].text.includes('artistStyles'));
});

const artwork={title:'Artwork',visible:true,order:10,category:'Illustration',image:'/assets/originals/art-01.jpg',preview:'/assets/previews/art-01.png',alt:'Image description',_sys:{relativePath:'art-01.json'}};
test('simple editor creates hidden artwork with automatic IDs, order and accessible fallback',()=>{
  const draft=newArtwork([artwork],[{name:'Illustration'}],'unique-id');
  assert.equal(draft.visible,false);assert.equal(draft.order,20);assert.equal(draft._sys.relativePath,'work-unique-id.json');
  assert.throws(()=>artworkInput(draft),/title/);
  const input=artworkInput({...draft,title:'New artwork',image:artwork.image});
  assert.equal(input.alt,'New artwork');assert.equal(input.preview,'');assert.ok(!('_sys' in input));
  assert.equal(uploadFilename({name:'My photo.JPG',type:'image/jpeg',size:100},'unique-id'),'artwork-unique-id.jpg');
  assert.throws(()=>uploadFilename({name:'bad.svg',type:'image/svg+xml',size:100},'id'),/PNG/);
  assert.throws(()=>uploadFilename({name:'bad.png',type:'image/png',size:24*1024*1024+1},'id'),/24 MiB/);
});
test('repo and project CDN image paths round trip without staging paths or external images',()=>{
  for(const url of [artwork.image,`https://assets.tina.io/${PROJECT_ID}/originals/art-01.jpg`,`https://assets.tina.io/${PROJECT_ID}/__staging/main/__file/originals/art-01.jpg`])assert.equal(mediaPath(url),artwork.image);
  for(const url of ['https://example.com/a.jpg',`https://assets.tina.io/other/originals/a.jpg`,'/assets/../private.jpg',`https://assets.tina.io/${PROJECT_ID}/__staging/other/__file/a.jpg`])assert.throws(()=>mediaPath(url));
});
test('moving artwork changes presentation order and preserves visibility and images',()=>{
  const b={...artwork,title:'B',order:20,visible:false,_sys:{relativePath:'b.json'}};
  const c={...artwork,title:'C',order:30,_sys:{relativePath:'c.json'}};
  const plan=movePlan([artwork,b,c],'b.json',-1);
  assert.equal(plan.length,2);assert.equal(plan.find(a=>a.title==='B').order,10);
  assert.equal(plan.find(a=>a.title==='B').visible,false);assert.equal(plan.find(a=>a.title==='B').image,artwork.image);
  assert.deepEqual(movePlan([artwork,b,c],'art-01.json',-1),[]);
  assert.ok(sameArtwork({...artwork,_sys:{relativePath:'other.json'}},artwork));
});

const bundled=await build({entryPoints:['tina/artist-api.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {createArtistAPI}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const baseline=JSON.parse(await readFile('content/settings.json','utf8'));
const schema=buildASTSchema(JSON.parse(await readFile('tina/tina-lock.json','utf8')).graphql);
function fakeCMS(){
  const state={items:[structuredClone(artwork)],settings:structuredClone(baseline),writes:[],uploads:[]};
  const cms={api:{tina:{isLocalMode:true,request:async(query,{variables})=>{
    assert.deepEqual(validate(schema,parse(query)).map(error=>error.message),[],'Real adapter operations must validate against the committed Tina schema');
    if(query.includes('artworkConnection'))return {artworkConnection:{edges:state.items.map(node=>({node:structuredClone(node)})),pageInfo:{hasNextPage:false,endCursor:null}}};
    if(query.includes('StudioCheck('))return {artwork:structuredClone(state.items.find(a=>a._sys.relativePath===variables.path))};
    if(query.includes('StudioCheckPrices')||query.includes('query StudioPrices'))return {settings:structuredClone(state.settings)};
    state.writes.push({query,variables:structuredClone(variables)});
    if(query.includes('updateSettings'))state.settings=structuredClone(variables.params);
    else {const item={...variables.params,_sys:{relativePath:variables.path}};state.items=query.includes('createArtwork')?[...state.items,item]:state.items.map(a=>a._sys.relativePath===variables.path?item:a);}
    return {};
  }}},media:{persist:async files=>{state.uploads.push(files);return files.map(({file})=>({filename:file.name,src:`/assets/originals/${file.name}`}));}}};
  return {state,api:createArtistAPI(cms)};
}
test('authenticated adapter preserves content, blocks stale writes, and uses no delete mutation',async()=>{
  const {api,state}=fakeCMS();const loaded=await api.load();
  await api.saveArtwork({...loaded.artworks[0],visible:false},loaded.artworks[0]);
  assert.equal(state.items[0].visible,false);assert.equal(state.writes[0].variables.params.preview,artwork.preview);
  assert.equal(state.writes[0].variables.params.image,artwork.image);
  await assert.rejects(()=>api.saveArtwork({...artwork,title:'stale'},artwork),/another window/);
  assert.equal(state.writes.length,1);assert.ok(!state.writes.some(w=>w.query.includes('delete')));
  const latest=(await api.load()).artworks[0];
  await api.saveArtwork({...latest,image:'/assets/new.png',preview:''},latest);
  assert.equal(state.writes[1].variables.params.preview,'');
});
test('price changes preserve category colors, service notes and unknown currencies',async()=>{
  const {api,state}=fakeCMS();const loaded=await api.load(),updated=structuredClone(loaded.settings);
  updated.menu[0].rows[0].price='75+';
  await api.savePrices(updated,loaded.settings);
  assert.deepEqual(state.settings.categories,settingsInput(baseline).categories);
  assert.equal(state.settings.menu[0].rows[0].note,baseline.menu[0].rows[0].note);
  assert.equal(state.settings.menu[2].rows[1].price,'120 ');
  await assert.rejects(()=>api.savePrices(updated,loaded.settings),/another window/);
});
test('failed backend writes never produce fake success or reveal backend internals',async()=>{
  const api=createArtistAPI({api:{tina:{request:async()=>{throw Error('sensitive-internal-detail');}}}});
  await assert.rejects(()=>api.saveArtwork(artwork,null),error=>!error.message.includes('sensitive-internal-detail')&&error.message.includes('could not confirm'));
});

test('real upload adapter uses existing media transport and unique safe filenames',async()=>{
  const {api,state}=fakeCMS();
  const photo=new File([new Uint8Array([255,216,255,0])],'My picture.jpg',{type:'image/jpeg'});
  const first=await api.upload(photo),second=await api.upload(photo);
  assert.notEqual(first,second);
  assert.match(first,/^\/assets\/originals\/artwork-[0-9a-f-]+\.jpg$/);
  assert.equal(state.uploads[0][0].directory,'originals');
  assert.equal(state.writes.length,0,'A photo upload does not silently publish an artwork record');
});
