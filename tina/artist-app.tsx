import React, {useEffect,useMemo,useRef,useState} from 'react';
import {appendServiceRow,applyPriceCard,editPriceCard,artworkInput,mediaPath,movePlan,movePriceItem,newArtwork,newPriceCard,savedMessage,sortedArtworks,uploadFilename,type Artwork,type PriceCard,type Settings} from './artist-model.mjs';
import {sectionPageInput,type ContentSection,type PageContent,type SectionPage} from './section-model.mjs';
import {SectionStudio} from './section-studio';
import {artistStyles} from './artist-styles';

export type ArtistAPI={
  load():Promise<{artworks:Artwork[];settings:Settings;sections?:ContentSection[];sectionsUnavailable?:boolean;sectionPage?:SectionPage}>;
  saveArtwork(item:Artwork,original:Artwork|null):Promise<void>;
  savePrices(settings:Settings,original:Settings):Promise<void>;
  saveSectionPage(page:PageContent,original:SectionPage):Promise<void>;
  saveSections(items:ContentSection[],original:ContentSection[]):Promise<void>;
  reorder(plan:Artwork[],original:Artwork[]):Promise<void>;
  upload(file:File):Promise<string>;
  imageURL?(path:string):string;
};
export function ArtistApp({api,demo=false,initialData}: {api:ArtistAPI;demo?:boolean;initialData?:{artworks:Artwork[];settings:Settings;sections?:ContentSection[];sectionsUnavailable?:boolean;sectionPage?:SectionPage}}) {
  const [data,setData]=useState<{artworks:Artwork[];settings:Settings;sections?:ContentSection[];sectionsUnavailable?:boolean;sectionPage?:SectionPage}|null>(initialData||null);
  const [tab,setTab]=useState('artwork'), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('');
  const [draft,setDraft]=useState<Artwork|null>(null), [original,setOriginal]=useState<Artwork|null>(null);
  const [priceIndex,setPriceIndex]=useState<number|null>(null), [priceDraft,setPriceDraft]=useState<PriceCard|null>(null);
  const [priceValidation,setPriceValidation]=useState('');
  useEffect(()=>{setPriceValidation('');},[priceDraft]);
  const [dirty,setDirty]=useState(false), [filter,setFilter]=useState('All');
  const lock=useRef(false);
  useEffect(()=>{let alive=true;api.load().then(value=>{if(alive)setData(value)}).catch(()=>{if(alive)setError('We could not load your website. Check your connection and try again. If you cannot sign in, ask the website owner to check your existing invitation.');});return()=>{alive=false};},[api]);
  useEffect(()=>{const leave=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[dirty]);
  const leaveDraft=()=>!dirty || window.confirm('Discard your unsaved changes?');
  async function run(action:()=>Promise<void>,success=demo?'Saved in this local preview only. Refresh to reset. Your website has not changed.':savedMessage,reload=true) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');setMessage('');
    try {await action();if(reload)setData(await api.load());setMessage(success);}
    catch (problem) {setError(problem instanceof Error ? problem.message : 'We could not finish. Reload to check what was saved before trying again.');}
    finally {lock.current=false;setBusy(false);}
  }
  function changeArtwork<K extends keyof Artwork>(key:K,value:Artwork[K]){setDraft(draft?{...draft,[key]:value}:null);setDirty(true);}
  function closeEditor(){if(!busy&&leaveDraft()){setDraft(null);setPriceDraft(null);setPriceIndex(null);setDirty(false);setError('');}}
  function confirmImmediate(action:()=>void){if(window.confirm('This saves immediately and updates your website. My sections history does not undo artwork or price edits. Continue?'))action();}
  function startEdit(item:Artwork|null) {
    if(!data||busy)return;
    setOriginal(item);setDraft(item?{...item}:newArtwork(data.artworks,data.settings.categories,crypto.randomUUID()));setDirty(false);setError('');setMessage('');
  }
  async function choosePhoto(file:File|undefined){
    if(!file||!draft||busy)return;
    try {uploadFilename(file,'check');} catch(problem){setError((problem as Error).message);return;}
    await run(async()=>{const image=await api.upload(file);setDraft({...draft,image:mediaPath(image),preview:''});setDirty(true);},'Photo uploaded. Add a title, then save. The uploaded photo stays in your library if you cancel.',false);
  }
  const sectionPage=useMemo(()=>data?.sectionPage||sectionPageInput({items:data?.sections||[]}),[data]);
  const visible=data?.artworks.filter(a=>a.visible).length || 0;
  return <main className="artist-app"><style>{artistStyles}</style>
    {demo&&<div className="artist-demo">LOCAL PREVIEW · Sample edits stay in this tab. Nothing is published. Demo uploads use sample artwork; selected files are not uploaded.</div>}
    <header className="artist-header"><div><span className="artist-eyebrow">KABUTAN'S STUDIO</span><h1>Your website, your way.</h1><p>Add a photo, make a change, and save when you are ready.</p></div><a className="artist-button secondary" href={demo?'/':'https://kabutan-portfolio.pages.dev/'} target="_blank" rel="noopener noreferrer">Open website ↗</a></header>
    <nav className="artist-tabs" aria-label="Edit your website">{[['artwork','My artwork'],['prices','My prices'],['sections','My sections'],['help','Saving & help']].map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} disabled={busy} onClick={()=>{if(leaveDraft()){setTab(key);setDraft(null);setPriceDraft(null);setDirty(false);setError('');}}}>{label}</button>)}</nav>
    <div className="artist-status" role="status" aria-live="polite">{busy?'Working… Please keep this page open.':dirty?(message?message+' You have unsaved changes.':'You have unsaved changes.'):message || 'Choose artwork, prices or a section to get started.'}</div>
    {error&&<div className="artist-error" role="alert"><p>{error}</p><button disabled={busy} onClick={()=>{if(leaveDraft())run(async()=>{setDraft(null);setPriceDraft(null);setDirty(false);},'Website content reloaded.');}}>Reload content</button></div>}
    {!data&&!error&&<p>Loading your artwork…</p>}
    {data&&!draft&&!priceDraft&&tab==='artwork'&&<>
      <div className="artist-section-title"><div><h2>My artwork</h2><p>{visible} on your website · {data.artworks.length-visible} hidden. Hidden artwork is kept so you can show it again.</p></div><button className="artist-button" disabled={busy} onClick={()=>startEdit(null)}>＋ Add artwork</button></div>
      <label className="artist-filter">Show category <select value={filter} onChange={event=>setFilter(event.target.value)}><option>All</option>{data.settings.categories.map(c=><option key={c.name}>{c.name}</option>)}</select></label>
      <div className="artist-grid">{sortedArtworks(data.artworks).filter(item=>filter==='All'||item.category===filter).map((item)=>{const ordered=sortedArtworks(data.artworks),index=ordered.findIndex(a=>a._sys.relativePath===item._sys.relativePath);return <article className="artist-card" key={item._sys.relativePath}>
        <button className="artist-cover" aria-label={`Edit ${item.title}`} disabled={busy} onClick={()=>startEdit(item)}><img src={api.imageURL?.(item.preview||item.image)||item.preview||item.image} alt={item.alt} loading="lazy"/><span className={`artist-badge ${item.visible?'':'is-hidden'}`}>{item.visible?'On website':'Hidden'}</span></button>
        <div className="artist-card-body"><small>{item.category}</small><h3>{item.title}</h3><div className="artist-card-actions"><button disabled={busy} onClick={()=>startEdit(item)}>Edit artwork</button><button disabled={busy} onClick={()=>confirmImmediate(()=>run(()=>api.saveArtwork({...item,visible:!item.visible},item)))}>{item.visible?'Hide':'Show'}</button></div><div className="artist-move"><span>Move</span><button aria-label={`Move ${item.title} up`} disabled={busy||index===0} onClick={()=>confirmImmediate(()=>run(()=>api.reorder(movePlan(data.artworks,item._sys.relativePath,-1),data.artworks)))}>↑ Up</button><button aria-label={`Move ${item.title} down`} disabled={busy||index===ordered.length-1} onClick={()=>confirmImmediate(()=>run(()=>api.reorder(movePlan(data.artworks,item._sys.relativePath,1),data.artworks)))}>↓ Down</button></div></div>
      </article>})}</div>
      {!data.artworks.length&&<p>No artwork yet. Choose “Add artwork” to start with a photo.</p>}
    </>}
    {draft&&<section className="artist-editor"><button className="artist-back" disabled={busy} onClick={closeEditor}>← My artwork</button><h2>{original?'Edit artwork':'Add artwork'}</h2><p>One image is all you need. A thumbnail is handled for you.</p><form onSubmit={event=>{event.preventDefault();if(!data)return;let value:Artwork;try{value={...draft,...artworkInput(draft)};}catch(problem){setError((problem as Error).message);return;}run(async()=>{await api.saveArtwork(value,original);setDraft(null);setDirty(false);});}}>
      <fieldset disabled={busy}><div className="artist-photo">{draft.image?<img src={api.imageURL?.(draft.image)||draft.image} alt="Selected artwork"/>:<span>Start with your photo</span>}<label className="artist-upload">{draft.image?'Choose a different photo':'Choose a photo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event=>{choosePhoto(event.target.files?.[0]);event.currentTarget.value='';}}/></label></div><small>PNG, JPG, WebP or GIF · up to 24 MiB. Replacements keep the original file for recovery.</small>
      <label>Title<input required value={draft.title} onChange={event=>changeArtwork('title',event.target.value)} placeholder="Give your artwork a name"/></label>
      <label>Category<select required value={draft.category} onChange={event=>changeArtwork('category',event.target.value)}>{!data?.settings.categories.some(c=>c.name===draft.category)&&<option value={draft.category}>{draft.category||'Choose a category'}</option>}{data?.settings.categories.map(c=><option key={c.name}>{c.name}</option>)}</select></label>
      <label>Description <small>(optional, for people using screen readers)</small><textarea value={draft.alt} onChange={event=>changeArtwork('alt',event.target.value)} placeholder="Briefly describe the image. If empty, its title is used."/></label>
      <label className="artist-check"><input type="checkbox" checked={draft.visible} onChange={event=>changeArtwork('visible',event.target.checked)}/>Show this artwork on my website</label><p className="artist-note">New artwork starts hidden. Turn this on when you are ready to share it.</p></fieldset>
      <div className="artist-save"><button type="button" disabled={busy} onClick={closeEditor}>Cancel</button><button className="artist-button" disabled={busy||(!dirty&&!!original)} type="submit">{busy?'Saving…':'Save artwork'}</button></div></form></section>}
    {data&&!priceDraft&&tab==='prices'&&<section>
      <div className="artist-section-title"><div><h2>My prices</h2><p>Edit a card, or add a new service category. Hide, Show and Move save immediately.</p></div><button className="artist-button" disabled={busy} onClick={()=>{setPriceIndex(data.settings.menu.length);setPriceDraft(newPriceCard());setDirty(false);setError('');setMessage('');}}>Add price card</button></div>
      <div className="artist-price-grid">{data.settings.menu.map((card,index)=><article className="artist-price-card" key={index}>
        <span className="artist-badge-inline">{card.visible?'On website':'Hidden'}</span><h3>{card.title}</h3>
        {card.rows?.map((row,rowIndex)=><div className="artist-price-row" key={rowIndex}><span>{row.label}{row.visible===false&&<small> (Hidden)</small>}{row.note&&<small style={{display:'block'}}>{row.note}</small>}</span><span><strong>{row.price}</strong>{row.detail&&<small style={{display:'block'}}>{row.detail}</small>}</span></div>)}
        {card.note&&<p>{card.note}</p>}{card.extra&&<strong>{card.extra}</strong>}
        <div className="artist-card-actions"><button disabled={busy} onClick={()=>{setPriceIndex(index);setPriceDraft(editPriceCard(card));setDirty(false);setError('');}}>Edit these prices</button><button disabled={busy} onClick={()=>{const menu=data.settings.menu.map((c,i)=>i===index?{...c,visible:!c.visible}:c);confirmImmediate(()=>run(()=>api.savePrices({...data.settings,menu},data.settings)));}}>{card.visible?'Hide card':'Show card'}</button></div>
        <div className="artist-move"><span>Move card</span>{([-1,1] as const).map(direction=><button key={direction} aria-label={'Move '+card.title+' '+(direction<0?'up':'down')} disabled={busy||(direction<0?index===0:index===data.settings.menu.length-1)} onClick={()=>confirmImmediate(()=>run(()=>api.savePrices({...data.settings,menu:movePriceItem(data.settings.menu,index,direction)},data.settings)))}>{direction<0?'Up':'Down'}</button>)}</div>
      </article>)}</div>
    </section>}
    {data&&priceDraft&&priceIndex!==null&&<section className="artist-editor">
      <button className="artist-back" disabled={busy} onClick={closeEditor}>Back to My prices</button><h2>{priceIndex===data.settings.menu.length?'Add price card':'Edit price card'}</h2><p>Keep the price and currency exactly as you want visitors to see them.</p>
      <form noValidate onSubmit={event=>{event.preventDefault();let updated:Settings;try{updated=applyPriceCard(data.settings,priceIndex,priceDraft);}catch(problem){setPriceValidation((problem as Error).message);const missing=[...event.currentTarget.querySelectorAll<HTMLInputElement>('input[required]')].find(input=>!input.value.trim());missing?.focus();return;}run(async()=>{await api.savePrices(updated,data.settings);setPriceDraft(null);setPriceIndex(null);setDirty(false);});}}><fieldset disabled={busy}>
        {priceValidation&&<p className="artist-error" role="alert">{priceValidation}</p>}<label>Card title<input required value={priceDraft.title} onChange={e=>{setPriceDraft({...priceDraft,title:e.target.value});setDirty(true);}}/></label>
        {(priceDraft.rows||[]).map((row,index)=>{const update=(values:Partial<typeof row>)=>{setPriceDraft(current=>current?{...current,rows:current.rows!.map((r,i)=>i===index?{...r,...values}:r)}:null);setDirty(true);};return <section className="artist-service" key={row._draftKey||index} aria-label={'Service row '+(index+1)}>
          <h3>Service row {index+1}{row.visible===false?' (Hidden)':''}</h3><div className="artist-price-edit"><label>Service<input required value={row.label} onChange={e=>update({label:e.target.value})}/></label><label>Price<input required value={row.price} onChange={e=>update({price:e.target.value})}/></label></div>
          <details><summary>Notes (optional)</summary><label>Service note<input value={row.note||''} onChange={e=>update({note:e.target.value})}/></label><label>Price note<input value={row.detail||''} onChange={e=>update({detail:e.target.value})}/></label></details>
          <div className="artist-card-actions"><button type="button" onClick={()=>update({visible:row.visible===false})}>{row.visible===false?'Show row':'Hide row'}</button>{([-1,1] as const).map(direction=><button type="button" key={direction} aria-label={'Move service row '+(index+1)+' '+(direction<0?'up':'down')} disabled={direction<0?index===0:index===priceDraft.rows!.length-1} onClick={()=>{setPriceDraft(current=>current?{...current,rows:movePriceItem(current.rows!,index,direction)}:null);setDirty(true);}}>{direction<0?'Up':'Down'}</button>)}{row._newRow&&<button type="button" onClick={()=>{setPriceDraft(current=>current?{...current,rows:current.rows!.filter((_,i)=>i!==index)}:null);setDirty(true);}}>Cancel new row</button>}</div>
        </section>})}
        <button type="button" onClick={()=>{setPriceDraft(current=>current?appendServiceRow(current):null);setDirty(true);}}>Add service row</button><p className="artist-note">Row changes are saved when you choose Save prices.</p>
        {<label>Price text <small>(optional)</small><input value={priceDraft.extra||''} onChange={e=>{setPriceDraft({...priceDraft,extra:e.target.value});setDirty(true);}}/></label>}
        <label>Card note<textarea value={priceDraft.note||''} onChange={e=>{setPriceDraft({...priceDraft,note:e.target.value});setDirty(true);}}/></label>
        <label className="artist-check"><input type="checkbox" checked={priceDraft.visible} onChange={e=>{setPriceDraft({...priceDraft,visible:e.target.checked});setDirty(true);}}/>Show this price card on my website</label>{priceIndex===data.settings.menu.length&&<p className="artist-note">New cards start hidden. Turn this on when you are ready to share.</p>}
      </fieldset><div className="artist-save"><button type="button" disabled={busy} onClick={closeEditor}>Cancel</button><button type="submit" className="artist-button" disabled={busy||!dirty}>{busy?'Saving...':'Save prices'}</button></div></form>
    </section>}

    {data&&tab==='sections'&&(data.sectionsUnavailable?<section><h2>My sections</h2><p role="alert">Sections could not load. Artwork and prices are still available.</p><button disabled={busy} onClick={()=>run(async()=>{},'Website content reloaded.')}>Reload sections</button></section>:<SectionStudio page={sectionPage} artworks={data.artworks} settings={data.settings} api={api} onRefresh={setData} onDirty={setDirty} onBusy={setBusy} onArtwork={()=>{setTab('artwork');setDirty(false);}} onPrices={add=>{setTab('prices');setDirty(false);if(add){setPriceIndex(data.settings.menu.length);setPriceDraft(newPriceCard());setError('');}}}/>)}

    {tab==='help'&&<section className="artist-help"><h2>A little help, right here.</h2><h3>1. Make your changes</h3><p>Choose artwork, prices or My sections. In My sections, apply edits to the preview, then choose Save changes. In My artwork and My prices, Hide, Show and Move save immediately after confirmation.</p><h3>2. Choose Save</h3><p>Wait for the “Saved” message. If you see an error, keep this page open and check before trying again.</p><h3>3. Check your website</h3><p>“Open website” shows the last published version. Saved changes may take a few minutes to appear. This is not a preview of unsaved edits.</p><h3>Want to take something down?</h3><p>Choose Hide on its artwork card. Choose Show to bring it back. Your original photo is kept.</p><h3>Cannot get in?</h3><p>Use the email address that received your invitation. If you cannot sign in, ask the website owner to check the existing invitation. You do not need access to the code.</p><p>Use My sections for templates, page order, visibility and social links. Version history restores custom section content and page layout only; it does not restore artwork edits, prices or social settings. Ask the website owner about changing artwork categories or the fixed Hero.</p></section>}
    <footer className="artist-footer">Made for small, easy updates. Your original pictures are kept.</footer>
  </main>;
}
