import React, {useEffect,useRef,useState} from 'react';
import {artworkInput,mediaPath,movePlan,newArtwork,savedMessage,sortedArtworks,uploadFilename,type Artwork,type PriceCard,type Settings} from './artist-model.mjs';
import './artist.css';

export type ArtistAPI={
  load():Promise<{artworks:Artwork[];settings:Settings}>;
  saveArtwork(item:Artwork,original:Artwork|null):Promise<void>;
  savePrices(settings:Settings,original:Settings):Promise<void>;
  reorder(plan:Artwork[],original:Artwork[]):Promise<void>;
  upload(file:File):Promise<string>;
  imageURL?(path:string):string;
};
export function ArtistApp({api,demo=false,initialData}: {api:ArtistAPI;demo?:boolean;initialData?:{artworks:Artwork[];settings:Settings}}) {
  const [data,setData]=useState<{artworks:Artwork[];settings:Settings}|null>(initialData||null);
  const [tab,setTab]=useState('artwork'), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('');
  const [draft,setDraft]=useState<Artwork|null>(null), [original,setOriginal]=useState<Artwork|null>(null);
  const [priceIndex,setPriceIndex]=useState<number|null>(null), [priceDraft,setPriceDraft]=useState<PriceCard|null>(null);
  const [dirty,setDirty]=useState(false), [filter,setFilter]=useState('All');
  const lock=useRef(false);
  useEffect(()=>{let alive=true;api.load().then(value=>{if(alive)setData(value)}).catch(()=>{if(alive)setError('We could not load your website. Check your connection and try again. If you cannot sign in, ask the website owner to check your existing invitation.');});return()=>{alive=false};},[api]);
  useEffect(()=>{const leave=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[dirty]);
  const leaveDraft=()=>!dirty || window.confirm('Discard your unsaved changes?');
  async function run(action:()=>Promise<void>,success=demo?'Saved in this local preview only. Refresh to reset. Your website has not changed.':savedMessage) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');setMessage('');
    try {await action();setData(await api.load());setMessage(success);}
    catch (problem) {setError(problem instanceof Error ? problem.message : 'We could not finish. Reload to check what was saved before trying again.');}
    finally {lock.current=false;setBusy(false);}
  }
  function changeArtwork<K extends keyof Artwork>(key:K,value:Artwork[K]){setDraft(draft?{...draft,[key]:value}:null);setDirty(true);}
  function closeEditor(){if(!busy&&leaveDraft()){setDraft(null);setPriceDraft(null);setPriceIndex(null);setDirty(false);}}
  function startEdit(item:Artwork|null) {
    if(!data||busy)return;
    setOriginal(item);setDraft(item?{...item}:newArtwork(data.artworks,data.settings.categories,crypto.randomUUID()));setDirty(false);setError('');setMessage('');
  }
  async function choosePhoto(file:File|undefined){
    if(!file||!draft||busy)return;
    try {uploadFilename(file,'check');} catch(problem){setError((problem as Error).message);return;}
    await run(async()=>{const image=await api.upload(file);setDraft({...draft,image:mediaPath(image),preview:''});setDirty(true);},'Photo uploaded. Add a title, then save. The uploaded photo stays in your library if you cancel.');
  }
  const visible=data?.artworks.filter(a=>a.visible).length || 0;
  return <main className="artist-app">
    {demo&&<div className="artist-demo">LOCAL PREVIEW · Sample edits stay in this tab. Nothing is published.</div>}
    <header className="artist-header"><div><span className="artist-eyebrow">KABUTAN'S STUDIO</span><h1>Your website, your way.</h1><p>Add a photo, make a change, and save when you are ready.</p></div><a className="artist-button secondary" href={demo?'/':'https://kabutan-portfolio.pages.dev/'} target="_blank" rel="noopener noreferrer">Open website ↗</a></header>
    <nav className="artist-tabs" aria-label="Edit your website">{[['artwork','My artwork'],['prices','My prices'],['help','Saving & help']].map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} disabled={busy} onClick={()=>{if(leaveDraft()){setTab(key);setDraft(null);setPriceDraft(null);setDirty(false);}}}>{label}</button>)}</nav>
    <div className="artist-status" role="status" aria-live="polite">{busy?'Working… Please keep this page open.':dirty?'You have unsaved changes.':message || 'Choose an artwork or a price card to get started.'}</div>
    {error&&<div className="artist-error" role="alert"><p>{error}</p><button disabled={busy} onClick={()=>{if(leaveDraft())run(async()=>{setDraft(null);setPriceDraft(null);setDirty(false);},'Website content reloaded.');}}>Reload content</button></div>}
    {!data&&!error&&<p>Loading your artwork…</p>}
    {data&&!draft&&!priceDraft&&tab==='artwork'&&<>
      <div className="artist-section-title"><div><h2>My artwork</h2><p>{visible} on your website · {data.artworks.length-visible} hidden. Hidden artwork is kept so you can show it again.</p></div><button className="artist-button" disabled={busy} onClick={()=>startEdit(null)}>＋ Add artwork</button></div>
      <label className="artist-filter">Show category <select value={filter} onChange={event=>setFilter(event.target.value)}><option>All</option>{data.settings.categories.map(c=><option key={c.name}>{c.name}</option>)}</select></label>
      <div className="artist-grid">{sortedArtworks(data.artworks).filter(item=>filter==='All'||item.category===filter).map((item)=>{const ordered=sortedArtworks(data.artworks),index=ordered.findIndex(a=>a._sys.relativePath===item._sys.relativePath);return <article className="artist-card" key={item._sys.relativePath}>
        <button className="artist-cover" aria-label={`Edit ${item.title}`} disabled={busy} onClick={()=>startEdit(item)}><img src={api.imageURL?.(item.preview||item.image)||item.preview||item.image} alt={item.alt} loading="lazy"/><span className={`artist-badge ${item.visible?'':'is-hidden'}`}>{item.visible?'On website':'Hidden'}</span></button>
        <div className="artist-card-body"><small>{item.category}</small><h3>{item.title}</h3><div className="artist-card-actions"><button disabled={busy} onClick={()=>startEdit(item)}>Edit artwork</button><button disabled={busy} onClick={()=>run(()=>api.saveArtwork({...item,visible:!item.visible},item))}>{item.visible?'Hide':'Show'}</button></div><div className="artist-move"><span>Move</span><button aria-label={`Move ${item.title} up`} disabled={busy||index===0} onClick={()=>run(()=>api.reorder(movePlan(data.artworks,item._sys.relativePath,-1),data.artworks))}>↑ Up</button><button aria-label={`Move ${item.title} down`} disabled={busy||index===ordered.length-1} onClick={()=>run(()=>api.reorder(movePlan(data.artworks,item._sys.relativePath,1),data.artworks))}>↓ Down</button></div></div>
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
    {data&&!priceDraft&&tab==='prices'&&<section><div className="artist-section-title"><div><h2>My prices</h2><p>Choose the same card you see on your website.</p></div></div><div className="artist-price-grid">{data.settings.menu.map((card,index)=><article className="artist-price-card" key={index}><span className="artist-badge-inline">{card.visible?'On website':'Hidden'}</span><h3>{card.title}</h3>{card.rows?.map((row,index)=><div className="artist-price-row" key={index}><span>{row.label}{row.note&&<small style={{display:"block"}}>{row.note}</small>}</span><span><strong>{row.price}</strong>{row.detail&&<small style={{display:"block"}}>{row.detail}</small>}</span></div>)}{card.note&&<p>{card.note}</p>}{card.extra&&<strong>{card.extra}</strong>}<button disabled={busy} onClick={()=>{setPriceIndex(index);setPriceDraft(structuredClone(card));setDirty(false);}}>Edit these prices</button></article>)}</div></section>}
    {data&&priceDraft&&priceIndex!==null&&<section className="artist-editor"><button className="artist-back" disabled={busy} onClick={closeEditor}>← My prices</button><h2>{priceDraft.title}</h2><p>Keep the price and currency exactly as you want visitors to see them.</p><form onSubmit={event=>{event.preventDefault();const updated=structuredClone(data.settings);updated.menu[priceIndex]=priceDraft;run(async()=>{await api.savePrices(updated,data.settings);setPriceDraft(null);setPriceIndex(null);setDirty(false);});}}><fieldset disabled={busy}>
      <label>Card title<input required value={priceDraft.title} onChange={e=>{setPriceDraft({...priceDraft,title:e.target.value});setDirty(true);}}/></label>
      {(priceDraft.rows||[]).map((row,index)=><div className="artist-price-edit" key={index}><label>Service{row.note&&<small style={{display:"block",fontWeight:400}}>{row.note}</small>}<input required value={row.label} onChange={e=>{const rows=structuredClone(priceDraft.rows!);rows[index].label=e.target.value;setPriceDraft({...priceDraft,rows});setDirty(true);}}/></label><label>Price<input required value={row.price} onChange={e=>{const rows=structuredClone(priceDraft.rows!);rows[index].price=e.target.value;setPriceDraft({...priceDraft,rows});setDirty(true);}}/></label></div>)}
      {(!priceDraft.rows?.length||priceDraft.extra)&&<label>Price text<input value={priceDraft.extra||''} onChange={e=>{setPriceDraft({...priceDraft,extra:e.target.value});setDirty(true);}}/></label>}
      <label>Card note<textarea value={priceDraft.note||''} onChange={e=>{setPriceDraft({...priceDraft,note:e.target.value});setDirty(true);}}/></label><label className="artist-check"><input type="checkbox" checked={priceDraft.visible} onChange={e=>{setPriceDraft({...priceDraft,visible:e.target.checked});setDirty(true);}}/>Show this price card on my website</label></fieldset><div className="artist-save"><button type="button" disabled={busy} onClick={closeEditor}>Cancel</button><button type="submit" className="artist-button" disabled={busy||!dirty}>{busy?'Saving…':'Save prices'}</button></div></form></section>}
    {tab==='help'&&<section className="artist-help"><h2>A little help, right here.</h2><h3>1. Make your changes</h3><p>Choose an artwork or a price card. Your typing stays here until you choose Save. Hide, Show and Move save immediately.</p><h3>2. Choose Save</h3><p>Wait for the “Saved” message. If you see an error, keep this page open and check before trying again.</p><h3>3. Check your website</h3><p>“Open website” shows the last published version. Saved changes may take a few minutes to appear. This is not a preview of unsaved edits.</p><h3>Want to take something down?</h3><p>Choose Hide on its artwork card. Choose Show to bring it back. Your original photo is kept.</p><h3>Cannot get in?</h3><p>Use the email address that received your invitation. If you cannot sign in, ask the website owner to check the existing invitation. You do not need access to the code.</p><p>For help changing categories, your introduction or social links, ask the website owner. Those changes are not available in this simple editor yet.</p></section>}
    <footer className="artist-footer">Made for small, easy updates. Your original pictures are kept.</footer>
  </main>;
}
