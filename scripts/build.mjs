import { readFile, readdir, mkdir, writeFile, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {pageContent,SECTION_LIMITS} from '../tina/section-model.mjs';
import{renderCustomSection,arrangePage}from'./section-render.mjs';
import { imageSize } from 'image-size';

export const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
export const MAX_MEDIA_BYTES = 24 * 1024 * 1024;
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw Error(`${label} is required`); };

export async function mediaInfo(file, directory = root) {
  if (typeof file !== 'string' || !/^\/?assets\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(file) || file.split('/').includes('..')) throw Error(`Unsafe image path: ${file}`);
  const relative = file.replace(/^\//, '');
  const full = path.join(directory, relative);
  if ((await stat(full)).size > MAX_MEDIA_BYTES) throw Error(`Image exceeds 24 MiB: ${file}`);
  const size = imageSize(await readFile(full));
  if (!['png','jpg','webp','gif'].includes(size.type)) throw Error(`Unsupported image content: ${file}`);
  if (!size.width || !size.height) throw Error(`Invalid image: ${file}`);
  return { src: relative, width: size.width, height: size.height };
}

export async function loadContent(directory = root) {
  const settings = JSON.parse(await readFile(path.join(directory, 'content/settings.json'), 'utf8'));
  settings.categories ??= [];
  settings.menu ??= [];
  if (!Array.isArray(settings.categories) || !Array.isArray(settings.menu)) throw Error('Invalid settings lists');
  const names = new Set();
  for (const c of settings.categories) {
    text(c.name, 'Category name');
    if (c.name === 'All' || names.has(c.name)) throw Error('Category names must be unique and cannot be All');
    if (!/^#[0-9a-f]{6}$/i.test(c.color)) throw Error('Category color must be a hex color');
    if (c.shadowColor && !/^#[0-9a-f]{6}$/i.test(c.shadowColor)) throw Error('Category shadow must be a hex color');
    names.add(c.name);
  }
  const artworks = [];
  for (const file of (await readdir(path.join(directory, 'content/artworks'))).filter(f => f.endsWith('.json')).sort()) {
    const a = JSON.parse(await readFile(path.join(directory, 'content/artworks', file), 'utf8'));
    text(a.title, 'Artwork title'); text(a.alt, 'Artwork alt text');
    if (!names.has(a.category)) throw Error(`Unknown category: ${a.category}`);
    if (!Number.isFinite(a.order) || typeof a.visible !== 'boolean') throw Error('Artwork needs numeric order and visibility');
    a.id = file.slice(0, -5);
    a.full = await mediaInfo(a.image, directory);
    a.thumb = await mediaInfo(a.preview || a.image, directory);
    artworks.push(a);
  }
  for (const card of settings.menu) {
    card.rows ??= [];
    text(card.title, 'Menu title');
    if (typeof card.visible !== 'boolean' || !Array.isArray(card.rows)) throw Error('Invalid menu card');
    for (const row of card.rows) { text(row.label, 'Service name'); text(row.price, 'Price text'); }
  }
  let sectionPage=pageContent({});try{sectionPage=pageContent(JSON.parse(await readFile(path.join(directory,'content/sections.json'),'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
  const sections=sectionPage.items,photos=new Set();let publishedPhotoBytes=0;
  for(const item of sections)if(item.image){item.photo=await mediaInfo(item.image,directory);const bytes=(await stat(path.join(directory,item.image.replace(/^\//,'')))).size;if(bytes>SECTION_LIMITS.photoBytes||item.photo.width>8192||item.photo.height>8192||item.photo.width*item.photo.height>SECTION_LIMITS.photoPixels)throw Error('Custom section photo exceeds the 8 MiB / 8192-pixel / 32-megapixel budget.');if(item.visible&&!photos.has(item.image)){publishedPhotoBytes+=bytes;photos.add(item.image);}}
  if(publishedPhotoBytes>64*1024*1024)throw Error('Published section photos exceed the 64 MiB page budget.');
  return { sectionPage, sections, settings, artworks: artworks.sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)) };
}

export async function build(directory = root, output = path.join(directory, 'dist')) {
  async function checkAssets(folder) {
    for (const entry of await readdir(folder,{withFileTypes:true})) {
      const file=path.join(folder,entry.name);
      if(entry.isDirectory()) await checkAssets(file);
      else if ((await stat(file)).size > MAX_MEDIA_BYTES) throw Error(`Asset exceeds 24 MiB: ${file}`);
    }
  }
  await checkAssets(path.join(directory,'assets'));
  const { settings, artworks, sections, sectionPage } = await loadContent(directory);
  const visible = artworks.filter(a => a.visible);
  const tags = Object.fromEntries(settings.categories.map(c => [c.name, c.color]));
  const shadows = Object.fromEntries(settings.categories.map(c => [c.name, c.shadowColor || c.color]));
  const rotations = [-1.2,.9,-.6,1.1,-.9,.7,-.4,1,-.8];
  const image = a => `<img src="${escape(a.thumb.src)}" data-full="${escape(a.full.src)}" data-fw="${a.full.width}" data-fh="${a.full.height}" width="${a.thumb.width}" height="${a.thumb.height}" loading="lazy" decoding="async" alt="${escape(a.alt)}">`;
  const gallery = (sectionPage.layout.find(b=>b.key==='gallery').visible?visible:[]).map((a,i) => `<figure class="card" data-cat="${escape(a.category)}" style="transform:rotate(${rotations[i % rotations.length]}deg)"><button class="art" type="button" data-open="${escape(a.id)}" data-title="${escape(a.title)}" data-category="${escape(a.category)}" aria-label="View full size: ${escape(a.title)}" style="box-shadow:6px 6px 0 ${shadows[a.category]}">${image(a)}</button><figcaption><span class="t">${escape(a.title)}</span><span class="cat" style="background:${tags[a.category]}">${escape(a.category)}</span></figcaption></figure>`).join('\n');
  const small = s => s ? `<small>${escape(s)}</small>` : '';
  const menu = settings.menu.filter(c => c.visible&&sectionPage.layout.find(b=>b.key==='commissions').visible).map(c => `<article class="price-card${c.extra?.trim() ? ' extras' : ''}"><h3 class="h">${escape(c.title)}</h3>${c.rows.some(r => r.visible !== false) ? `<dl>${c.rows.filter(r => r.visible !== false).map(r => `<dt>${escape(r.label)}${small(r.note)}</dt><dd>${escape(r.price)}${small(r.detail)}</dd>`).join('')}</dl>` : ''}${c.note ? `<p>${escape(c.note)}</p>` : ''}${c.extra?.trim() ? `<p class="extra-price">${escape(c.extra)}</p>` : ''}</article>`).join('\n');
  const customSections=new Map(sections.filter(s=>s.visible).map(s=>['section:'+s.id,renderCustomSection(s,artworks,escape)]));
  let html = await readFile(path.join(directory, 'templates/index.html'), 'utf8');
  html = html.replace('<!-- CMS:SECTIONS -->', '').replace('<!-- CMS:GALLERY -->', () => gallery).replace('<!-- CMS:MENU -->', () => menu).replace('<!-- CMS:COUNT -->', `${visible.length} works.`);
  // JSON used inside a script must also escape < to prevent closing the script tag.
  const js = value => JSON.stringify(value).replace(/</g, '\\u003c');
  html = html.replace('<!-- CMS:CATEGORIES -->', () => `const CATS=${js(['All', ...settings.categories.map(c => c.name)])};\nconst TAG=${js(tags)};`);
  let heroIndex = 0;
  html = html.replace(/<button class="(frame|sticker)"[\s\S]*?<\/button>/g, (original, cls) => {
    const preferred = cls === 'frame' ? 'design-01' : 'vtuber-06';
    const a = visible.find(a => a.id === preferred) || visible[heroIndex++ % visible.length];
    if (!a) return '';
    const tapes=(original.match(/<span class="tape"[\s\S]*?<\/span>/g)||[]).join('');
    return `<button class="${cls}" type="button" data-open="${escape(a.id)}" aria-label="View full size: ${escape(a.title)}">${image(a).replace('loading="lazy"', cls === 'frame' ? 'fetchpriority="high"' : 'loading="lazy"')}${tapes}</button>`;
  });
  html=arrangePage(html,sectionPage,customSections,escape);
  await mkdir(output, {recursive:true});
  await writeFile(path.join(output, 'index.html'), html);
  await cp(path.join(directory, 'assets'), path.join(output, 'assets'), {recursive:true});
  try { await cp(path.join(directory, 'admin'), path.join(output, 'admin'), {recursive:true}); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  console.log(`Built ${visible.length}/${artworks.length} artworks, ${settings.menu.filter(c => c.visible).length} menu cards`);
  return html;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
