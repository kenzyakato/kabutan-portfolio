export function renderCustomSection(s,artworks,escape){
 const header=`<h2 class="h" id="section-${escape(s.id)}">${escape(s.title)}</h2>`;
 let content='';
 if(s.kind==='faq'){if(!(s.questions||[]).some(q=>q.visible))return '';content=(s.questions||[]).filter(q=>q.visible).map(q=>`<details class="custom-faq"><summary>${escape(q.question)}</summary><div class="custom-section-text">${escape(q.answer)}</div></details>`).join('');}
 else if(s.kind==='artwork'){
  const selected=artworks.filter(a=>a.visible&&s.artworkIds?.includes(a.id+'.json'));
  if(!selected.length)return '';
  content='<div class="custom-showcase">'+selected.map(a=>`<figure><a href="${escape(a.full.src)}" target="_blank" rel="noopener noreferrer" aria-label="${escape('Open full image: '+a.title)}"><img src="${escape(a.thumb.src)}" width="${a.thumb.width}" height="${a.thumb.height}" loading="lazy" decoding="async" alt="${escape(a.alt)}"></a><figcaption>${escape(a.title)}</figcaption></figure>`).join('')+'</div>';
 }else content=`${s.body.trim()?`<div class="custom-section-text">${escape(s.body)}</div>`:''}${s.photo?`<img src="${escape(s.photo.src)}" width="${s.photo.width}" height="${s.photo.height}" loading="lazy" decoding="async" alt="${escape(s.alt)}">`:''}`;
 return `<section class="wrap custom-section" aria-labelledby="section-${escape(s.id)}"><div class="custom-section-paper">${header}${content}</div></section>`;
}
export function arrangePage(html,page,custom,escape){
 const blocks={},positions={};const masked=html.replace(/<!--[\s\S]*?-->/g,m=>' '.repeat(m.length));
 for(const id of ['gallery','commissions','find']){const start=masked.indexOf(`<section id="${id}"`);let end=-1,depth=0;if(start>=0)for(const tag of masked.slice(start).matchAll(/<\/?section\b[^>]*>/g)){depth+=tag[0].startsWith('</')?-1:1;if(depth===0){end=start+tag.index+tag[0].length;break;}}if(start<0||end<0)throw Error('Page template is missing '+id);blocks[id]=html.slice(start,end);positions[id]={start,end};}
 if(!(positions.gallery.end<=positions.commissions.start&&positions.commissions.end<=positions.find.start))throw Error('Page template block order must be Gallery, Commissions, Social links.');
 for(const [left,right]of[['gallery','commissions'],['commissions','find']])if(masked.slice(positions[left].end,positions[right].start).trim())throw Error('Unexpected content between managed page blocks.');
 const first=positions.gallery.start,last=positions.find.end;
 const colors=['var(--pink)','var(--yellow)','var(--mint)','var(--paper)'];
 const social=page.layout.find(b=>b.key==='find').visible?page.socials.filter(l=>l.visible).map((l,i)=>`<li><a href="${escape(l.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(l.label)}" style="background:${colors[i%colors.length]}"><b>${escape(l.name)}</b><span>${escape(l.label)}</span><small>Opens in a new tab ↗</small></a></li>`).join(''):'';
 blocks.find=blocks.find.replace(/(<ul class="links">)[\s\S]*?(<\/ul>)/,(_,a,b)=>a+social+b);
 const content=page.layout.map(b=>{if(b.key.startsWith('section:'))return b.visible?(custom.get(b.key)||''):'';return b.visible?blocks[b.key]:blocks[b.key].replace('<section ','<section hidden ');}).join('\n\n');
 html=html.slice(0,first)+content+html.slice(last);
 for(const b of page.layout.filter(b=>!b.visible&&!b.key.startsWith('section:')))html=html.replaceAll('href="#'+b.key+'"','hidden href="#'+b.key+'"');
 return html;
}
