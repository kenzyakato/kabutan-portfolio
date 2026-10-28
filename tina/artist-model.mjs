export const PROJECT_ID = '413ed129-73d5-4372-b05b-bd9e3c0c3989';
export const START_ROUTE = '#/screens/start_here';
export function studioEntryRoute(hash) {
  return ['','#','#/','#/screens/start-here'].includes(hash) ? START_ROUTE : null;
}
export const savedMessage = 'Saved. Your website update may take a few minutes. Open the website to check it.';
export const artworkFields = ['title','visible','order','category','image','preview','alt'];
const pick = (value, fields) => Object.fromEntries(fields.map(key=>[key,value[key] ?? (key==='visible'?false:key==='order'?0:'')]));

export function mediaPath(value) {
  if (!value) return '';
  let path = value;
  if (value.startsWith('https://')) {
    const url = new URL(value);
    if (url.hostname !== 'assets.tina.io' || !url.pathname.startsWith(`/${PROJECT_ID}/`)) throw Error('Choose an image from this website.');
    path = url.pathname.slice(PROJECT_ID.length + 2).replace(/^__staging\/main\/__file\//,'');
    path = `/assets/${path}`;
  }
  if (!/^\/?assets\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(path) || path.split('/').includes('..') || path.includes('__staging/')) throw Error('Choose an image from this website.');
  return '/' + path.replace(/^\//,'');
}
export function artworkInput(value) {
  const item = pick(value,artworkFields);
  item.image = mediaPath(item.image);
  item.preview = mediaPath(item.preview);
  if (!item.title.trim()) throw Error('Please add a title.');
  if (!item.image) throw Error('Please choose a photo.');
  if (!item.category.trim()) throw Error('Please choose a category.');
  if (!item.alt.trim()) item.alt = item.title;
  if (!Number.isFinite(item.order)) throw Error('Please reload the artwork list.');
  return item;
}
export function sameArtwork(a,b) { return JSON.stringify(pick(a,artworkFields))===JSON.stringify(pick(b,artworkFields)); }
export function sortedArtworks(items) { return [...items].sort((a,b)=>a.order-b.order || a._sys.relativePath.localeCompare(b._sys.relativePath)); }
export function movePlan(items,id,direction) {
  const ordered=sortedArtworks(items), index=ordered.findIndex(a=>a._sys.relativePath===id), target=index+direction;
  if (index<0 || target<0 || target>=ordered.length) return [];
  const [item]=ordered.splice(index,1); ordered.splice(target,0,item);
  // Renumbering the list also handles duplicate order values deterministically.
  return ordered.map((a,index)=>({...a,order:(index+1)*10})).filter(a=>items.find(old=>old._sys.relativePath===a._sys.relativePath).order!==a.order);
}
export function newArtwork(items,categories,id) {
  return {title:'',visible:false,order:Math.max(0,...items.map(a=>a.order))+10,category:categories[0]?.name || '',image:'',preview:'',alt:'',_sys:{relativePath:`work-${id}.json`}};
}
export function uploadFilename(file,id) {
  if (!file || file.size>24*1024*1024) throw Error('Choose an image that is 24 MiB or smaller.');
  const extension=file.name.split('.').pop().toLowerCase();
  const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
  if (!types[extension] || (file.type && file.type!==types[extension])) throw Error('Choose a PNG, JPG, WebP or GIF image.');
  return `artwork-${id}.${extension}`;
}
export function settingsInput(value) {
  return {categories:value.categories.map(c=>pick(c,['name','color','shadowColor'])),menu:value.menu.map(c=>({...pick(c,['title','visible','note','extra']),rows:(c.rows || []).map(r=>pick(r,['label','note','price','detail']))}))};
}
