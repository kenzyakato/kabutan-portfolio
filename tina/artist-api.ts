import type { TinaCMS } from 'tinacms';
import type { ArtistAPI } from './artist-app';
import {sectionsInput,type ContentSection} from './section-model.mjs';
import {artworkInput,mediaPath,PROJECT_ID,sameArtwork,settingsInput,uploadFilename,type Artwork,type Settings} from './artist-model.mjs';

const artSelection='title visible order category image preview alt _sys { relativePath }';
const settingsSelection='categories { name color shadowColor } menu { title visible rows { label note price detail visible } note extra }';
const sectionsSelection='items { id title body image alt visible }';
const cleanArtwork=(value:Artwork):Artwork=>({...value,image:mediaPath(value.image),preview:mediaPath(value.preview||'')});
export function createArtistAPI(cms:TinaCMS):ArtistAPI {
  const request=<T,>(query:string,variables:object={})=>cms.api.tina!.request<T>(query,{variables});
  async function load(){
    const artworks:Artwork[]=[];let after:string|null=null;
    while(true){
      const page:{artworkConnection:{edges:{node:Artwork}[];pageInfo:{hasNextPage:boolean;endCursor:string}}}=await request(`query StudioArt($after:String){artworkConnection(first:100,after:$after){edges{node{${artSelection}}} pageInfo{hasNextPage endCursor}}}`,{after});
      artworks.push(...page.artworkConnection.edges.map(edge=>cleanArtwork(edge.node)));
      if(!page.artworkConnection.pageInfo.hasNextPage)break;
      const next:string=page.artworkConnection.pageInfo.endCursor;
      if(!next||next===after)throw Error('The artwork list could not finish loading. Please reload.');
      after=next;
    }
    const result=await request<{settings:Settings}>(`query StudioPrices{settings(relativePath:"settings.json"){${settingsSelection}}}`);
    const core={artworks,settings:{...result.settings,categories:result.settings.categories||[],menu:result.settings.menu||[]}};
    try {
      const extra=await request<{sections:{items:ContentSection[]}}>(`query StudioSections{sections(relativePath:"sections.json"){${sectionsSelection}}}`);
      return {...core,sections:sectionsInput(extra.sections.items||[])};
    }catch{return {...core,sectionsUnavailable:true};}
  }
  const changed='This was changed in another window, or your last save may already have gone through. Copy your unsaved text first, then Reload content to check.';
  async function guarded<T>(action:()=>Promise<T>):Promise<T>{
    try{return await action();}catch(error){
      if(error instanceof Error&&[changed,'Please add a title.','Please choose a photo.','Please choose a category.','Choose an image from this website.'].includes(error.message))throw error;
      // Do not show API internals, branch details, tokens or raw backend errors.
      throw Error('We could not confirm this change. Reload content to see what was saved before trying again. If this continues, ask the website owner for help.');
    }
  }
  async function saveArtwork(item:Artwork,original:Artwork|null){return guarded(async()=>{
    const id=item._sys.relativePath;
    if(!/^[a-zA-Z0-9_/-]+\.json$/.test(id)||id.split('/').includes('..'))throw Error(changed);
    if(original){const latest=await request<{artwork:Artwork}>(`query StudioCheck($path:String!){artwork(relativePath:$path){${artSelection}}}`,{path:id});if(!sameArtwork(cleanArtwork(latest.artwork),original))throw Error(changed);}
    const operation=original?'updateArtwork':'createArtwork';
    await request(`mutation StudioSave($path:String!,$params:ArtworkMutation!){${operation}(relativePath:$path,params:$params){id}}`,{path:id,params:artworkInput(item)});
  });}
  return {
    imageURL:path=>cms.api.tina!.isLocalMode ? path : `https://assets.tina.io/${PROJECT_ID}/${mediaPath(path).replace(/^\/assets\//,'')}`,
    load:()=>guarded(load),saveArtwork,
    saveSections:(items,original)=>guarded(async()=>{
      const latest=await request<{sections:{items:ContentSection[]}}>(`query StudioCheckSections{sections(relativePath:"sections.json"){${sectionsSelection}}}`);
      if(JSON.stringify(sectionsInput(latest.sections.items||[]))!==JSON.stringify(sectionsInput(original)))throw Error(changed);
      await request('mutation StudioSections($params:SectionsMutation!){updateSections(relativePath:"sections.json",params:$params){id}}',{params:{items:sectionsInput(items)}});
    }),
    savePrices:(settings,original)=>guarded(async()=>{
      const latest=await request<{settings:Settings}>(`query StudioCheckPrices{settings(relativePath:"settings.json"){${settingsSelection}}}`);
      if(JSON.stringify(settingsInput(latest.settings))!==JSON.stringify(settingsInput(original)))throw Error(changed);
      await request('mutation StudioPrices($params:SettingsMutation!){updateSettings(relativePath:"settings.json",params:$params){id}}',{params:settingsInput(settings)});
    }),
    reorder:async(plan,original)=>{for(const item of plan)await saveArtwork(item,original.find(a=>a._sys.relativePath===item._sys.relativePath)!);},
    upload:async(file)=>{
      const filename=uploadFilename(file,crypto.randomUUID());
      const uploaded=await guarded(()=>cms.media.persist([{directory:'originals',file:new File([file],filename,{type:file.type})}]));
      const image=uploaded.find(item=>item.filename===filename)?.src;
      if(!image)throw Error('The photo may have uploaded, but we could not confirm it. Reload content before trying again.');
      return mediaPath(image);
    }
  };
}
