const results=[];
const check=(ok,name)=>{if(!ok)throw Error(name);results.push(name);};
const wait=async(predicate)=>{for(let i=0;i<100;i++){const result=predicate();if(result)return result;await new Promise(resolve=>setTimeout(resolve,30));}throw Error('UI did not reach the expected state');};
const button=(label)=>[...document.querySelectorAll('.artist-app button')].find(button=>button.textContent.trim()===label);
const click=async(label)=>{const target=await wait(()=>button(label));if(target.disabled)throw Error('Button disabled: '+label);target.click();await new Promise(resolve=>setTimeout(resolve,40));};
const setInput=async(element,value)=>{Object.getOwnPropertyDescriptor(element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,40));};
try{
  await wait(()=>document.querySelector('.artist-card'));
  const params=new URLSearchParams(window.location.search),view=params.get('view');
  if(view==='add')await click('＋ Add artwork');
  else if(view==='prices'||view==='price-edit'){await click('My prices');if(view==='price-edit')await click('Edit these prices');}
  if(params.has('qa')){
    check(document.querySelectorAll('.artist-card').length===23,'23 original artwork cards render');
    const first=document.querySelector('.artist-card h3').textContent;
    await click('Edit artwork');
    const title=document.querySelector('.artist-editor input[placeholder="Give your artwork a name"]');
    await setInput(title,first+'.');
    check(document.querySelector('[role=status]').textContent.includes('unsaved'),'Typing reports unsaved changes');
    await click('Save artwork');await wait(()=>document.querySelector('.artist-card h3')?.textContent===first+'.');
    check(document.querySelector('[role=status]').textContent.includes('local preview only'),'Confirmed demo save is explicitly not a production save');
    await click('Edit artwork');await setInput(document.querySelector('.artist-editor input[placeholder="Give your artwork a name"]'),first);await click('Save artwork');await wait(()=>document.querySelector('.artist-card h3')?.textContent===first);
    await click('Hide');await wait(()=>button('Show'));check(document.querySelector('.artist-badge.is-hidden')!==null,'Hide reports the actual hidden state');
    await click('Show');await wait(()=>document.querySelector('.artist-section-title p')?.textContent.startsWith('23 on'));
    await click('↓ Down');await wait(()=>document.querySelectorAll('.artist-card h3')[1]?.textContent===first);check(true,'Move down updates card order');
    const moved=document.querySelectorAll('.artist-card')[1];moved.querySelector('.artist-move button').click();await wait(()=>document.querySelector('.artist-card h3')?.textContent===first);check(true,'Move up restores original order');
    await click('＋ Add artwork');check(document.querySelector('.artist-check input').checked===false,'New artwork starts hidden');
    const photo=await(await fetch('/assets/originals/art-01.jpg')).blob();const transfer=new DataTransfer();transfer.items.add(new File([photo],'photo.jpg',{type:'image/jpeg'}));const picker=document.querySelector('input[type=file]');picker.files=transfer.files;picker.dispatchEvent(new Event('change',{bubbles:true}));
    await wait(()=>document.querySelector('.artist-photo img'));check(document.querySelectorAll('input[type=file]').length===1,'One photo picker handles image and thumbnail');
    await setInput(document.querySelector('input[placeholder="Give your artwork a name"]'),'Preview artwork');await click('Save artwork');await wait(()=>document.querySelectorAll('.artist-card').length===24);check(document.querySelector('.artist-section-title p').textContent.includes('1 hidden'),'Saving a new artwork keeps it hidden');
    await click('My prices');check(document.querySelectorAll('.artist-price-card').length===4,'All four price cards render');await click('Edit these prices');
    const priceInputs=[...document.querySelectorAll('.artist-price-edit input')],originalPrice=priceInputs[1].value;await setInput(priceInputs[1],'75+');await click('Save prices');await wait(()=>document.querySelector('.artist-price-row strong')?.textContent==='75+');check(true,'Price save updates the matching price card');
    await click('Edit these prices');await setInput(document.querySelectorAll('.artist-price-edit input')[1],originalPrice);await click('Save prices');await wait(()=>document.querySelector('.artist-price-row strong')?.textContent===originalPrice);check(true,'Original price text can be restored');
    await click('Saving & help');check(document.querySelector('.artist-help').textContent.includes('not a preview of unsaved edits'),'Preview and saved-versus-published distinction is explicit');
  }
  await new Promise(resolve=>setTimeout(resolve,300));
  check(document.documentElement.scrollWidth<=window.innerWidth,'Layout has no horizontal overflow');
  const output=document.createElement('pre');output.id='qa-result';output.hidden=true;output.textContent=JSON.stringify({pass:true,results,viewport:{width:window.innerWidth,documentWidth:document.documentElement.scrollWidth}});document.body.append(output);
}catch(error){const output=document.createElement('pre');output.id='qa-result';output.textContent=JSON.stringify({pass:false,results,error:error.message});document.body.append(output);}
