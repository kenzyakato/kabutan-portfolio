import React from 'react';
import {createRoot} from 'react-dom/client';
import {ArtistApp} from '../tina/artist-app';

const initial=JSON.parse(document.getElementById('preview-data').textContent);
let data=structuredClone(initial);
const api={
  load:async()=>structuredClone(data),
  saveArtwork:async(item,original)=>{data.artworks=original?data.artworks.map(a=>a._sys.relativePath===item._sys.relativePath?structuredClone(item):a):[...data.artworks,structuredClone(item)];},
  savePrices:async(settings)=>{data.settings=structuredClone(settings);},
  reorder:async(plan)=>{data.artworks=data.artworks.map(a=>structuredClone(plan.find(p=>p._sys.relativePath===a._sys.relativePath)||a));},
  upload:async()=>{window.alert('Preview only: uploads use a sample artwork. No selected file is sent anywhere.');return '/assets/originals/art-01.jpg';}
};
createRoot(document.getElementById('root')).render(<ArtistApp api={api} demo initialData={initial}/>);
