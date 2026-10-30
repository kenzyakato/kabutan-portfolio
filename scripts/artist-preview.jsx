import React from 'react';
import {createRoot} from 'react-dom/client';
import {ArtistApp} from '../tina/artist-app';

const initial=JSON.parse(document.getElementById('preview-data').textContent);
let data=structuredClone(initial);
const api={
  load:async()=>structuredClone(data),
  saveArtwork:async(item,original)=>{data.artworks=original?data.artworks.map(a=>a._sys.relativePath===item._sys.relativePath?structuredClone(item):a):[...data.artworks,structuredClone(item)];},
  savePrices:async(settings)=>{data.settings=structuredClone(settings);},
  saveSections:async(items)=>{data.sections=structuredClone(items);},
  reorder:async(plan)=>{data.artworks=data.artworks.map(a=>structuredClone(plan.find(p=>p._sys.relativePath===a._sys.relativePath)||a));},
  upload:async()=>'/assets/originals/art-01.jpg'
};
createRoot(document.getElementById('root')).render(<ArtistApp api={api} demo initialData={initial}/>);
// Test only the isolated preview. This module is never imported by the real CMS.
if(new URLSearchParams(window.location.search).has('qa')||new URLSearchParams(window.location.search).has('view'))import('./artist-preview-qa.js');
