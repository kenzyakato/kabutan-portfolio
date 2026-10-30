import {mediaPath} from './artist-model.mjs';

export function newSection(){return {id:crypto.randomUUID(),title:'',body:'',image:'',alt:'',visible:false};}
export function sectionInput(value){
  if(!/^[a-zA-Z0-9_-]+$/.test(value.id||''))throw Error('Reload your sections before saving.');
  if(typeof value.title!=='string'||!value.title.trim())throw Error('Please add a section title.');
  const body=value.body??'',image=mediaPath(value.image||''),alt=value.alt??'';
  if(typeof body!=='string'||typeof alt!=='string'||typeof value.visible!=='boolean')throw Error('Please check your section fields.');
  if(!body.trim()&&!image)throw Error('Add some text or choose a photo for this section.');
  return {id:value.id,title:value.title,body,image,alt:image?(alt.trim()?alt:value.title):'',visible:value.visible};
}
export function sectionsInput(items){
  if(!Array.isArray(items))throw Error('Reload your sections before saving.');
  const result=(items||[]).map(sectionInput);
  if(new Set(result.map(item=>item.id)).size!==result.length)throw Error('Reload your sections before saving.');
  return result;
}
export function applySection(items,index,draft){
  if(!Number.isInteger(index)||index<0||index>items.length||index<items.length&&items[index].id!==draft.id)throw Error('Reload your sections before saving.');
  const result=structuredClone(items);result[index]=sectionInput(draft);return sectionsInput(result);
}
