import {sections,tourFields,validateFields,validate,domainErrors} from './schema.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='gowithskill-intake-v1';
let data={tours:[{}],enquiryMethods:[]},step=0,config={ready:false,siteKey:''},token='',widget=null,busy=false,selectedPdf=null;
try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.data&&Array.isArray(saved.data.tours)){data=saved.data;step=Math.max(0,Math.min(5,Number(saved.step)||0));}}catch{}
const reference=new URLSearchParams(location.search).get('ref');if(reference&&!data.reference)data.reference=reference.slice(0,200);
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,3500);}
function save(notify=false){try{localStorage.setItem(key,JSON.stringify({data,step}));$('#save-status').textContent='Draft saved on this device';if(notify)toast('Draft saved. Return on this device to continue.');}catch{$('#save-status').textContent='Draft storage unavailable';if(notify)toast('This browser cannot save drafts. Keep this tab open.');}}
function field(q,values,prefix=''){
 const [name,label,type,required,meta]=q,id=prefix+name,value=values?.[name]??'',help=typeof meta==='string'?meta:'';
 let control='';const attrs=`id="${esc(id)}" data-name="${esc(name)}" ${prefix?`data-tour="${prefix.split('.')[1]}"`:''} ${required?'required':''} aria-describedby="${esc(id)}-help ${esc(id)}-error"`;
 if(type==='textarea')control=`<textarea ${attrs} maxlength="${name==='packageNotes'?30000:6000}" placeholder="${esc(help||'Your answer')}">${esc(value)}</textarea>`;
 else if(type==='select')control=`<select ${attrs}><option value="">Choose an option</option>${meta.map(x=>`<option ${value===x?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
 else if(type==='checks')control=`<div class="choices" id="${esc(id)}">${meta.map((x,i)=>`<label class="choice"><input type="checkbox" data-name="${esc(name)}" value="${esc(x)}" ${(Array.isArray(value)?value:[]).includes(x)?'checked':''}>${esc(x)}</label>`).join('')}</div>`;
 else control=`<input ${attrs} type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="any"':'maxlength="6000"'} ${type==='email'?'autocomplete="email"':type==='tel'?'autocomplete="tel"':''} placeholder="${esc(type==='url'?'https://…':type==='tel'?'+94 …':help?'':label)}">`;
 const isCards=type==='select'&&['businessType','brandReadiness','style','domainStatus'].includes(name);
 const isDrive=['logoLink','galleryLink','photos'].includes(name);
 const badge=required?'<span class="req">*</span>':'<span class="optional-badge">Optional</span>';
 if(isCards)control=`<div class="option-cards" id="${esc(id)}" role="radiogroup" aria-labelledby="${esc(id)}-label">${meta.map(x=>`<label class="option-card"><input type="radio" name="${esc(id)}" data-name="${esc(name)}" value="${esc(x)}" ${value===x?'checked':''}><span>${esc(x)}</span></label>`).join('')}</div>`;
 return `<div class="field ${['textarea','checks'].includes(type)||isCards||isDrive?'wide':''}" data-field="${esc(id)}">${type==='checks'||isCards?`<span class="field-label" id="${esc(id)}-label">${esc(label)}${badge}</span>`:`<label for="${esc(id)}">${esc(label)}${badge}</label>`}${control}<p class="hint" id="${esc(id)}-help">${esc(help)}</p>${isDrive?driveGuide():''}<p class="field-error" id="${esc(id)}-error" hidden></p></div>`;
}
function driveGuide(){return `<details class="drive-guide"><summary>How to share images with Google Drive <span class="expand-mark">+</span></summary><ol><li>Create a folder in <a href="https://drive.google.com/" target="_blank" rel="noopener noreferrer">Google Drive</a>. Name it after your business or tour.</li><li>Upload your logo, photos and videos. Use separate subfolders for different packages.</li><li>Open <strong>Share</strong> and invite your GoWithSkill project contact as a <strong>Viewer</strong>. Ask our team for the correct email if unsure.</li><li>Choose <strong>Copy link</strong> and paste it above. Keep access restricted to the people you choose.</li></ol><p>No photos ready? Leave this blank and send the link later. Only share content you have permission to use.</p></details>`;}
function fieldsGroup(fields,values,prefix=''){
 const primary=fields.filter(q=>q[3]||['domain','domainProvider','domainAccess','existingWebsite','domainHelp','preferredDomain','alternativeDomains','domainRegistration','domainUnsure','packageNotes','reference','colours','tagline','style','logoLink','galleryLink','priceType','price','currency','basis','enquiryEmail','photos'].includes(q[0]));
 const optional=fields.filter(q=>!primary.includes(q));
 return `<div class="fields">${primary.map(q=>field(q,values,prefix)).join('')}</div>${optional.length?`<details class="optional-section"><summary><span><strong>Add a little more detail</strong><small>${optional.length} optional details · complete now or later</small></span><span class="expand-mark">+</span></summary><div class="fields">${optional.map(q=>field(q,values,prefix)).join('')}</div></details>`:''}`;
}
function updateConditional(){
 document.querySelectorAll('[data-field]').forEach(wrapper=>{
 const name=wrapper.dataset.field;const tourMatch=name.match(/^tours\.(\d+)\.(price|currency|basis)$/);
 if(tourMatch)wrapper.hidden=!['Fixed price','From price'].includes(data.tours[Number(tourMatch[1])]?.priceType);
 const owned=['I own a domain','I have a website and domain'].includes(data.domainStatus);
 if(['domain','domainProvider','domainAccess','domainHelp'].includes(name))wrapper.hidden=!owned;
 if(name==='existingWebsite')wrapper.hidden=data.domainStatus!=='I have a website and domain';
 if(['preferredDomain','alternativeDomains','domainRegistration'].includes(name))wrapper.hidden=data.domainStatus!=='I need a new domain';
 if(name==='domainUnsure')wrapper.hidden=data.domainStatus!=='I am not sure';
 if(name==='domain'){
 const input=wrapper.querySelector('input');input.required=owned;
 const badge=wrapper.querySelector('.optional-badge,.req');if(badge){badge.className=owned?'req':'optional-badge';badge.textContent=owned?'*':'Optional';}
 }
 if(name==='enquiryEmail')wrapper.hidden=!data.enquiryMethods?.includes('Contact form');
 });
 document.querySelectorAll('.tour').forEach((el,i)=>{const label=el.querySelector('.tour-name');if(label)label.textContent=data.tours[i]?.name||'Your next experience';});
}
function review(){
 return sections.slice(0,5).map((section,i)=>{
 const rows=i===3?[["Package details",data.packageNotes||'To be supplied later'],['PDF',selectedPdf?.name||'No PDF attached']]:section.fields.filter(([name])=>data[name]?.length).map(([name,label])=>[label,Array.isArray(data[name])?data[name].join(', '):data[name]]);
 return `<section class="review"><div class="review-top"><h3>${esc(section.title)}</h3><button type="button" class="text-button" data-edit="${i}">Edit</button></div><dl>${rows.map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl></section>`;
 }).join('')+`<label class="consent"><input type="checkbox" id="consent" ${data.consent?'checked':''}><span>I authorise GoWithSkill to use these details to prepare my website. I have permission to share the supplied content and understand that public details, prices and policies will be reviewed before launch. <span class="req">*</span></span></label><p id="consent-error" class="field-error" hidden></p><div class="honeypot" aria-hidden="true"><label>Company website<input id="companyWebsite" tabindex="-1" autocomplete="off"></label></div><div id="security"></div><p class="hint">Your submission is stored privately for project preparation. Contact your GoWithSkill project representative to request a correction or deletion. Shared drafts stay in this browser until you clear them or successfully submit.</p>`;
}
function render(){
 token='';if(widget!==null&&window.turnstile){window.turnstile.remove(widget);widget=null;}
 $('#error-summary').hidden=true;
 $('#steps').innerHTML=sections.map((s,i)=>`<button class="step ${i===step?'active':i<step?'done':''}" data-step="${i}" ${i===step?'aria-current="step"':''}><span class="num">${i<step?'✓':String(i+1).padStart(2,'0')}</span><span class="step-name">${esc(s.title)}</span></button>`).join('');
 $('#step-label').textContent=`STEP ${String(step+1).padStart(2,'0')} OF 06`;
 const progress=Math.round((step+1)/sections.length*100);
 $('#progress-fill').style.width=progress+'%';
 $('#completion-value').textContent=progress+'%';
 $('#completion-fill').style.width=progress+'%';
 document.querySelector('.completion-track').setAttribute('aria-valuenow',String(progress));
 const section=sections[step];
 let content=`<h2 tabindex="-1">${esc(section.subtitle)}</h2><p class="intro section-description">${esc(section.description)}</p>`;
 if(step===3){content+=fieldsGroup(section.fields,data)+`<div class="pdf-box"><label for="package-pdf">Package brochure / itinerary <span class="optional-badge">Optional PDF</span></label><p class="hint">Attach one PDF, up to 2 MB. It will upload when you submit your brief.</p><input id="package-pdf" type="file" accept="application/pdf,.pdf"><p class="hint" id="pdf-status">${selectedPdf?esc(selectedPdf.name)+' attached.':data.packagePdfName?'Please reattach '+esc(data.packagePdfName)+' before submitting. Files are not saved in browser drafts.':'No file selected.'}</p><button type="button" class="text-button" id="remove-pdf" ${selectedPdf||data.packagePdfName?'':'hidden'}>Remove PDF</button></div><p class="package-email">Prefer email? Send your packages to <a href="mailto:contact@gowithskill.com">contact@gowithskill.com</a> and include your business name. You can also send them later.</p>`;}
 else if(step===5)content+=review();
 else content+=fieldsGroup(section.fields,data);
 $('#panel').innerHTML=content;
 $('#back').hidden=step===0;
 $('#next').innerHTML=step===5?'Send website brief':'Continue';
 $('#next').disabled=busy||(step===5&&!config.ready);
 updateConditional();
 if(step===5&&config.ready)mountSecurity();
}
function mountSecurity(){if(step!==5||!window.turnstile||!config.siteKey)return;widget=window.turnstile.render('#security',{sitekey:config.siteKey,action:'intake',callback:value=>token=value,'expired-callback':()=>token='','error-callback':()=>token=''});}
function currentErrors(){if(step===5)return validate(data);let errors=validateFields(sections[step].fields,data);if(step===4)errors.push(...domainErrors(data));if(step===4&&data.enquiryMethods?.includes('Contact form')&&!data.enquiryEmail?.trim())errors.push({key:'enquiryEmail',message:'Add the inbox for contact-form enquiries.'});return errors;}
function showErrors(errors){
 document.querySelectorAll('.field-error').forEach(e=>e.hidden=true);document.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
 const summary=$('#error-summary');summary.innerHTML='<strong>Please check these details:</strong>'+errors.map(e=>`<a href="#${esc(e.key)}">${esc(e.message)}</a>`).join('');summary.hidden=false;
 for(const e of errors){const input=document.getElementById(e.key),message=document.getElementById(e.key+'-error');if(input){let parent=input.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}}if(input)input.setAttribute('aria-invalid','true');if(message){message.textContent=e.message;message.hidden=false;}}
 summary.focus();
}
function go(next){step=next;save();render();$('#panel h2').focus();window.scrollTo({top:0,behavior:'smooth'});}
document.addEventListener('input',event=>{
 const el=event.target;if(el.id==='package-pdf')return;if(el.id==='consent'){data.consent=el.checked;save();updateConditional();return;}if(!el.dataset.name)return;
 const target=el.dataset.tour!==undefined?data.tours[Number(el.dataset.tour)]:data;
 target[el.dataset.name]=el.type==='checkbox'?[...document.querySelectorAll(`input[data-name="${el.dataset.name}"]:checked`)].map(x=>x.value):el.value;
 save();updateConditional();
});
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||busy)return;
 if(button.id==='remove-pdf'){selectedPdf=null;delete data.packagePdfName;save();render();}
 if(button.dataset.edit!==undefined)go(Number(button.dataset.edit));
 if(button.dataset.step!==undefined){const target=Number(button.dataset.step);if(target<=step)go(target);else if(target===step+1){const errors=currentErrors();if(errors.length)showErrors(errors);else go(target);}else toast('Complete each section before continuing.');}
 if(button.id==='add-tour'&&data.tours.length<20){data.tours.push({});save();render();document.querySelector('.tour:last-of-type summary')?.focus();}
 if(button.dataset.remove!==undefined&&confirm('Remove this package from your draft?')){data.tours.splice(Number(button.dataset.remove),1);save();render();}
});
document.addEventListener('change',async event=>{
 if(event.target.id!=='package-pdf')return;
 const file=event.target.files?.[0];if(!file)return;
 if(!/\.pdf$/i.test(file.name)||file.size>2*1024*1024){toast('Choose a PDF no larger than 2 MB.');event.target.value='';return;}
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'){toast('This file is not a valid PDF.');event.target.value='';return;}
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 selectedPdf={name:file.name,base64:btoa(binary)};data.packagePdfName=file.name;save();
 $('#pdf-status').textContent=file.name+' attached. It will upload with your brief.';$('#remove-pdf').hidden=false;
});
$('#save').onclick=()=>save(true);$('#back').onclick=()=>{if(!busy)go(Math.max(0,step-1));};
$('#clear').onclick=()=>{if(!busy&&confirm('Clear the draft saved on this device? This cannot be undone.')){data={tours:[{}],enquiryMethods:[]};try{localStorage.removeItem(key);}catch{}step=0;render();toast('Draft cleared.');}};
$('#next').onclick=async()=>{
 if(busy)return;const errors=currentErrors();if(errors.length){if(step===5){const first=errors[0].key;const index=first.startsWith('tours')?3:sections.findIndex(s=>s.fields.some(([name])=>name===first));if(index>=0){go(index);showErrors(errors.filter(e=>index===3?e.key.startsWith('tours'):sections[index].fields.some(([name])=>name===e.key)));return;}}showErrors(errors);return;}
 if(step<5){go(step+1);return;}if(data.packagePdfName&&!selectedPdf){go(3);toast('Please reattach your PDF or remove it to send the details later.');return;}if(!token){showErrors([{key:'security',message:'Please complete the security check.'}]);return;}
 busy=true;$('#next').disabled=true;$('#next').textContent='Sending…';
 try{
 const response=await fetch('/api/intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,packagePdf:selectedPdf,turnstileToken:token,companyWebsite:$('#companyWebsite').value})});const body=await response.json();
 if(!response.ok)throw new Error(body.error||'Unable to save your details. Please try again.');
 try{localStorage.removeItem(key);}catch{}
 $('#panel').innerHTML=`<div class="success"><h2>Website brief received</h2><p class="intro">Thank you, ${esc(data.contactName)}. Our team will review your details and follow up using your project contact information.</p><p class="receipt">Submission reference: ${esc(body.id)}</p><p class="hint">Keep this reference for your records. Your website is not published yet.</p><button class="secondary" type="button" id="download">Download my submitted details</button></div>`;
 $('#actions').hidden=true;$('#save').hidden=true;$('#clear').hidden=true;$('#save-status').textContent='Submitted successfully';
 $('#download').onclick=()=>{const blob=new Blob([JSON.stringify({submissionId:body.id,...data},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='my-website-brief.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
 document.querySelectorAll('#steps button').forEach(b=>b.disabled=true);
 }catch(error){showErrors([{key:'security',message:error.message}]);token='';if(widget!==null&&window.turnstile)window.turnstile.reset(widget);$('#next').disabled=false;$('#next').textContent='Send website brief';}finally{busy=false;}
};
render();
fetch('/api/config').then(r=>{if(!r.ok)throw Error();return r.json();}).then(value=>{
 config=value;
 if(!config.ready){$('#setup').textContent='Preview mode: you can complete and save a draft. Submission will be enabled when the website is connected to its secure storage.';$('#setup').hidden=false;}
 if(config.siteKey){const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=()=>{if(step===5)mountSecurity();};script.onerror=()=>toast('Security check could not load. Please refresh before submitting.');document.head.append(script);}
 render();
}).catch(()=>{$('#setup').textContent='Preview mode: submissions are not connected. You can still prepare a draft on this device.';$('#setup').hidden=false;});