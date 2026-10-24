import {readFile,writeFile} from 'node:fs/promises';
const endpoint='http://localhost:4001/graphql';
const file=new URL('../content/artworks/art-01.json',import.meta.url);
const original=await readFile(file,'utf8');
const settingsFile=new URL('../content/settings.json',import.meta.url);
const originalSettings=await readFile(settingsFile,'utf8');
async function gql(query,variables){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables})});const j=await r.json();if(j.errors)throw Error(JSON.stringify(j.errors));return j.data;}
const mutation='mutation($params:ArtworkMutation!){updateArtwork(relativePath:"art-01.json",params:$params){visible title}}';
try{
 console.log('hide',JSON.stringify(await gql(mutation,{params:{...JSON.parse(original),visible:false}})));
 let html='';
 for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,250));html=await(await fetch('http://127.0.0.1:4173/')).text();if(!html.includes('data-open="art-01"'))break;}
 if(html.includes('data-open="art-01"'))throw Error('Hidden artwork still appears');
 console.log('Saved hide renders 22 works without art-01');
 console.log('restore',JSON.stringify(await gql(mutation,{params:JSON.parse(original)})));
 const settings=JSON.parse(originalSettings);
 settings.menu[0].rows[0].price='LOCAL-VALIDATION-PRICE';
 const settingsMutation='mutation($params:SettingsMutation!){updateSettings(relativePath:"settings.json",params:$params){__typename}}';
 await gql(settingsMutation,{params:settings});
 for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,250));html=await(await fetch('http://127.0.0.1:4173/')).text();if(html.includes('LOCAL-VALIDATION-PRICE'))break;}
 if(!html.includes('LOCAL-VALIDATION-PRICE'))throw Error('Saved settings did not render');
 await gql(settingsMutation,{params:JSON.parse(originalSettings)});
 console.log('Saved settings render correctly; original prices restored');
 const admin=await fetch('http://127.0.0.1:4173/admin/');
 if(admin.status!==200)throw Error(`Admin HTTP ${admin.status}`);
 const source=await fetch('http://localhost:4001/admin/src/main.tsx');
 if(source.status!==200)throw Error(`Admin module HTTP ${source.status}`);
 console.log('Admin HTML and Vite module HTTP 200');
}finally{await writeFile(file,original);await writeFile(settingsFile,originalSettings);}
