import {mediaPath} from './artist-model.mjs';
export const SECTION_LIMITS={count:20,title:120,body:12000,questions:20,answer:4000,totalText:120000,photoBytes:8*1024*1024,photoPixels:32*1024*1024};
export function newSection(kind='text'){return {id:crypto.randomUUID(),title:'',body:'',image:'',alt:'',visible:false,...(kind==='text'?{}:{kind}),...(kind==='faq'?{questions:[newQuestion()]}:{}),...(kind==='artwork'?{artworkIds:[]}:{})};}
export function newQuestion(){return {id:crypto.randomUUID(),question:'',answer:'',visible:true};}
const idOK=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]+$/.test(value);
const text=(value,label,max,required=false)=>{if(typeof value!=='string'||(required&&!value.trim()))throw Error('Please add '+label+'.');if(value.length>max)throw Error(label+' must be '+max+' characters or fewer.');return value;};
export function sectionInput(value){
 if(!idOK(value.id))throw Error('Reload your sections before saving.');
 const title=text(value.title,'a section title',SECTION_LIMITS.title,true),body=text(value.body??'','section text',SECTION_LIMITS.body),image=mediaPath(value.image||''),alt=text(value.alt??'','photo description',500),kind=value.kind||'text';
 if(typeof value.visible!=='boolean'||!['text','faq','artwork'].includes(kind))throw Error('Please check your section fields.');
 const result={id:value.id,title,body,image,alt:image?(alt.trim()?alt:title):'',visible:value.visible};
 if(kind==='text'){if(!body.trim()&&!image)throw Error('Add some text or choose a photo for this section.');return result;}
 result.kind=kind;result.body=title;result.image='';result.alt='';
 if(kind==='faq'){
  if(!Array.isArray(value.questions)||!value.questions.length||value.questions.length>SECTION_LIMITS.questions)throw Error('Add between 1 and 20 questions.');
  result.questions=value.questions.map(q=>{if(!idOK(q.id))throw Error('Reload your questions before saving.');return {id:q.id,question:text(q.question,'a question',300,true),answer:text(q.answer,'an answer',SECTION_LIMITS.answer,true),visible:q.visible!==false};});
  if(new Set(result.questions.map(q=>q.id)).size!==result.questions.length)throw Error('Reload your questions before saving.');
 }else{
  if(!Array.isArray(value.artworkIds)||!value.artworkIds.length||value.artworkIds.length>100||value.artworkIds.some(id=>typeof id!=='string'||!/^[-a-zA-Z0-9_/]+\.json$/.test(id)||id.split('/').includes('..')))throw Error('Choose at least one artwork (up to 100).');
  result.artworkIds=[...new Set(value.artworkIds)];
 }
 return result;
}
export function sectionsInput(items){
 if(!Array.isArray(items)||items.length>SECTION_LIMITS.count)throw Error('Keep up to 20 custom sections. Hide existing sections instead of creating duplicates.');
 const result=items.map(sectionInput);if(new Set(result.map(s=>s.id)).size!==result.length)throw Error('Reload your sections before saving.');
 if(result.reduce((n,s)=>n+s.title.length+s.body.length+(s.questions||[]).reduce((m,q)=>m+q.question.length+q.answer.length,0),0)>SECTION_LIMITS.totalText)throw Error('The page has too much text. Shorten it before saving.');return result;
}
export function applySection(items,index,draft){if(!Number.isInteger(index)||index<0||index>items.length||index<items.length&&items[index].id!==draft.id)throw Error('Reload your sections before saving.');const result=structuredClone(items);result[index]=sectionInput(draft);return sectionsInput(result);}
export const sectionType=s=>s.kind==='faq'?'FAQ':s.kind==='artwork'?'Artwork showcase':'Image & text';
export const builtInBlocks={gallery:'Artwork gallery',commissions:'Services & prices',find:'Social links'};
export function layoutInput(layout,items){
 const defaults=[{key:'gallery',visible:true},...items.map(s=>({key:'section:'+s.id,visible:s.visible})),{key:'commissions',visible:true},{key:'find',visible:true}];
 if(layout==null)return defaults;if(!Array.isArray(layout))throw Error('Reload your page layout before saving.');
 const keys=new Set(defaults.map(b=>b.key)),seen=new Set();const result=layout.map(b=>{if(typeof b?.key!=='string'||seen.has(b.key)||typeof b.visible!=='boolean')throw Error('Reload your page layout before saving.');seen.add(b.key);if(!keys.has(b.key)){if(/^section:[a-zA-Z0-9_-]+$/.test(b.key))return null;throw Error('Reload your page layout before saving.');}return {key:b.key,visible:b.visible};}).filter(Boolean);
 for(const b of defaults)if(!seen.has(b.key)){const position=result.findIndex(r=>r.key==='commissions');if(b.key.startsWith('section:')&&position>=0)result.splice(position,0,b);else result.push(b);}
 // A custom section has one visibility source, shared with the older editor.
 return result.map(b=>b.key.startsWith('section:')?{...b,visible:items.find(s=>'section:'+s.id===b.key).visible}:b);
}
export const DEFAULT_SOCIALS=[
 {id:'tiktok',name:'TikTok',url:'https://www.tiktok.com/@gabugabukabutan',label:'@gabugabukabutan',visible:true},
 {id:'twitch',name:'Twitch',url:'https://www.twitch.tv/gabugabukabutan',label:'gabugabukabutan',visible:true},
 {id:'youtube',name:'YouTube',url:'https://www.youtube.com/@GabuGabuKabutan',label:'@GabuGabuKabutan',visible:true},
 {id:'x',name:'X (Twitter)',url:'https://x.com/gabugabukabutan',label:'@gabugabukabutan',visible:true}
];
export function socialsInput(values){if(!Array.isArray(values)||values.length>20)throw Error('Keep up to 20 social links.');const links=values.map(s=>{if(!idOK(s.id)||typeof s.visible!=='boolean')throw Error('Reload your social links.');const name=text(s.name,'a platform name',60,true),label=text(s.label,'button text',160,true),rawURL=text(s.url,'an HTTPS link',2000,true),url=rawURL.trim();if(/[\u0000-\u001f\u007f]/.test(rawURL))throw Error('Use an HTTPS link without control characters.');let parsed;try{parsed=new URL(url);}catch{throw Error('Use a complete HTTPS link, such as https://discord.gg/your-invite.');}if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password||/[\u0000-\u0020]/.test(url))throw Error('Use HTTPS links without passwords, spaces or unsafe protocols.');return {id:s.id,name,url,label,visible:s.visible};});if(new Set(links.map(l=>l.id)).size!==links.length)throw Error('Reload your social links.');return links;}
function snapshotContent(value){const items=sectionsInput(value.items||[]);return {items,layout:layoutInput(value.layout,items)};}
export function pageContent(value){return {...snapshotContent(value),socials:socialsInput(value.socials??DEFAULT_SOCIALS)};}
export function sectionPageInput(value){const current=pageContent(value);const history=(value.history||[]).slice(0,10).map(h=>{if(!idOK(h.id)||typeof h.createdAt!=='string'||!Number.isFinite(Date.parse(h.createdAt)))throw Error('Section history could not load.');return {id:h.id,createdAt:h.createdAt,...snapshotContent(h)};});return {...current,history};}
export function withSectionHistory(next,current,now=new Date().toISOString(),id=crypto.randomUUID()){
 const clean=pageContent(next),before=sectionPageInput(current);const changed=JSON.stringify(snapshotContent(clean))!==JSON.stringify(snapshotContent(before));return {...clean,history:changed?[{id,createdAt:now,...snapshotContent(before)},...before.history].slice(0,10):before.history};
}
export function toggleBlock(page,key){const result=pageContent(page),block=result.layout.find(b=>b.key===key);if(!block)throw Error('Reload your layout.');block.visible=!block.visible;if(key.startsWith('section:'))result.items.find(s=>'section:'+s.id===key).visible=block.visible;return result;}

export function restoreSectionVersion(page,id){const current=sectionPageInput(page),version=current.history.find(h=>h.id===id);if(!version)throw Error("Choose an available saved version.");return pageContent({...version,socials:current.socials});}
