import{test}from'node:test';
import assert from'node:assert/strict';
import{mkdtemp,cp,readFile,writeFile,rm}from'node:fs/promises';
import os from'node:os';import path from'node:path';
import{newSection,sectionInput,sectionsInput,applySection}from'../tina/section-model.mjs';
import{movePriceItem}from'../tina/artist-model.mjs';
import{build,root}from'../scripts/build.mjs';

test('section drafts validate, remain hidden and preserve originals across add/edit/reorder',()=>{
 const original=[],draft=newSection();assert.equal(draft.visible,false);assert.throws(()=>sectionInput(draft),/title/);
 draft.title='User title';assert.throws(()=>sectionInput(draft),/text or choose/);draft.body='User text\nsecond line';
 const first=applySection(original,0,draft);assert.deepEqual(original,[]);const second=applySection(first,1,{...newSection(),title:'Second',body:'Text'});
 const edited=applySection(second,0,{...first[0],body:'Edited'});assert.equal(edited[1].id,second[1].id);assert.equal(first[0].body,draft.body);
 const moved=movePriceItem(edited,1,-1);assert.equal(moved[0].title,'Second');assert.deepEqual(movePriceItem(moved,0,1),edited);
 assert.throws(()=>applySection(second,0,{...draft,id:'wrong'}),/Reload/);assert.throws(()=>sectionsInput([draft,draft]),/Reload/);
 assert.throws(()=>sectionInput({...draft,image:'https://other.example/image.png'}),/website/);assert.throws(()=>sectionInput({...draft,id:'"><script>'}),/Reload/);
 const imageOnly=sectionInput({...draft,body:'',image:'/assets/originals/art-01.jpg',alt:''});assert.equal(imageOnly.alt,draft.title);
});

test('front end renders sections safely in order between gallery and commissions, hides/restores, and accepts absent legacy data',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'kabutan-sections-'));
 try{
  for(const folder of ['assets','templates'])await cp(path.join(root,folder),path.join(dir,folder),{recursive:true});
  await cp(path.join(root,'tests/fixtures/content'),path.join(dir,'content'),{recursive:true});
  const before=await build(dir);assert.ok(!before.includes('class="wrap custom-section"'));
  const a={...newSection(),title:'First <script>alert(1)</script>',body:'Hello <img src=x onerror=alert(1)>\nSecond line '+String.fromCharCode(36)+'& '+String.fromCharCode(36)+String.fromCharCode(96)+' '+String.fromCharCode(36)+String.fromCharCode(39)+' '+String.fromCharCode(36)+String.fromCharCode(36),visible:true};
  const b={...newSection(),title:'Second section',body:'',image:'/assets/originals/art-01.jpg',visible:true};
  const file=path.join(dir,'content/sections.json'),save=items=>writeFile(file,JSON.stringify({items}));
  await save([a,b]);let html=await build(dir);assert.ok(html.indexOf('id="gallery"')<html.indexOf('class="wrap custom-section"'));assert.ok(html.indexOf('Second section')<html.indexOf('id="commissions"'));
  assert.ok(html.includes('First &lt;script&gt;'));assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;\nSecond line'));assert.ok(html.includes('alt="Second section"'));assert.ok(html.includes(a.body.slice(a.body.indexOf('Second line')).replace(/&/g,'&amp;').replace(/'/g,'&#39;')),'Dollar replacement patterns stay literal');
  await save([{...a,visible:false},b]);html=await build(dir);assert.ok(!html.includes('First &lt;script&gt;'));assert.ok(html.includes('Second section'));
  await save([b,a]);html=await build(dir);assert.ok(html.indexOf('Second section')<html.indexOf('First &lt;script&gt;'));
  await save([]);assert.equal(await build(dir),before,'Empty new sections do not alter the prior visible page');
 }finally{await rm(dir,{recursive:true,force:true});}
});
