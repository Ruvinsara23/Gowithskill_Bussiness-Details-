import {notifySubmission,validFileLink} from './email.js';
import {validate,clean} from '../public/schema.js';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handle(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/config'&&request.method==='GET')return json({siteKey:env.TURNSTILE_SITE_KEY||'',ready:!!(env.DB&&env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_SITE_KEY)});
 if(url.pathname==='/api/submissions'&&request.method==='GET'){
  if(!env.ADMIN_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.ADMIN_TOKEN)return json({error:'Unauthorised'},401);
  if(!env.DB)return json({error:'Storage is not configured.'},503);
  const before=url.searchParams.get('before')||'9999';
  const result=await env.DB.prepare('SELECT id, created_at, business_name, contact_email, customer_reference, payload FROM submissions WHERE created_at < ? ORDER BY created_at DESC LIMIT 50').bind(before).all();
  return json({submissions:result.results,nextBefore:result.results.length===50?result.results.at(-1).created_at:null});
 }
 if(url.pathname==='/api/notifications/retry'&&request.method==='POST'){
  if(!env.ADMIN_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.ADMIN_TOKEN)return json({error:'Unauthorised'},401);
  if(!env.DB||!env.RESEND_API_KEY||!env.EMAIL_FROM)return json({error:'Email delivery is not configured.'},503);
  const rows=await env.DB.prepare("SELECT s.id,s.payload FROM submissions s JOIN email_notifications n ON n.submission_id=s.id WHERE n.status IN ('pending','failed') AND n.attempts<5 ORDER BY s.created_at LIMIT 10").all();
  const results=[];for(const row of rows.results)results.push({id:row.id,status:await notifySubmission(row.id,JSON.parse(row.payload),env,url.origin)});
  return json({results});
 }
 if(url.pathname.startsWith('/api/files/')&&request.method==='GET'){
  const id=url.pathname.slice('/api/files/'.length);
  if(!await validFileLink(url,id,env.FILE_LINK_SECRET))return json({error:'Download link expired or invalid. Contact GoWithSkill for assistance.'},403);
  if(!env.DB||!env.UPLOADS)return json({error:'File storage unavailable.'},503);
  const row=await env.DB.prepare('SELECT payload FROM submissions WHERE id=?').bind(id).first();
  const pdf=row&&JSON.parse(row.payload).packagePdf;if(!pdf)return json({error:'File not found.'},404);
  const object=await env.UPLOADS.get(pdf.key);if(!object)return json({error:'File not found.'},404);
  return new Response(object.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="package.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 }
 if(url.pathname==='/api/intake'){

  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin.'},403);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'Send JSON.'},415);
  if(!env.DB||!env.TURNSTILE_SECRET_KEY||!env.TURNSTILE_SITE_KEY)return json({error:'Submissions are not enabled yet. Your draft is still on this device.'},503);
  if(Number(request.headers.get('content-length')||0)>3000000)return json({error:'Submission is too large.'},413);
  let data;
  try{
   const reader=request.body?.getReader();if(!reader)return json({error:'Missing body.'},400);
   let size=0,chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();return json({error:'Submission is too large.'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   data=JSON.parse(new TextDecoder().decode(bytes));
  }catch{return json({error:'Invalid JSON.'},400);}
  const errors=validate(data);if(errors.length)return json({error:'Please check your details.',errors},400);
  if(data.companyWebsite)return json({error:'Unable to accept this submission.'},400);
  if(typeof data.turnstileToken!=='string'||data.turnstileToken.length>2048)return json({error:'Please complete the security check.'},400);
  let verification;
  try{
   const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:data.turnstileToken,remoteip:request.headers.get('CF-Connecting-IP')||''})});
   verification=await response.json();
  }catch{return json({error:'Security check unavailable. Please try again.'},503);}
  if(!verification.success||verification.hostname!==url.hostname||verification.action!=='intake')return json({error:'Security check expired or failed. Please try again.'},400);
  const id=crypto.randomUUID();const payload=clean(data);
  let pdfKey=null;
  if(data.packagePdf){
   const pdf=data.packagePdf;
   if(!env.UPLOADS)return json({error:'PDF uploads are not enabled yet. Remove the attachment and email it to contact@gowithskill.com, or try again later.'},503);
   if(typeof pdf.name!=='string'||typeof pdf.base64!=='string'||pdf.base64.length>2800000)return json({error:'Invalid PDF attachment.'},400);
   let bytes;try{bytes=Uint8Array.from(atob(pdf.base64),c=>c.charCodeAt(0));}catch{return json({error:'Invalid PDF attachment.'},400);}
   if(bytes.length>2*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({error:'Choose a PDF no larger than 2 MB.'},400);
   pdfKey='packages/'+id+'.pdf';
   try{await env.UPLOADS.put(pdfKey,bytes,{httpMetadata:{contentType:'application/pdf'}});}catch{return json({error:'The PDF could not be saved. Please try again.'},503);}
   payload.packagePdf={name:pdf.name.slice(0,200),key:pdfKey};
  }
  try{
   await env.DB.prepare('INSERT INTO submissions (id,created_at,business_name,contact_email,customer_reference,payload) VALUES (?,?,?,?,?,?)').bind(id,new Date().toISOString(),payload.businessName,payload.email,payload.reference,JSON.stringify(payload)).run();
  }catch{if(pdfKey)await env.UPLOADS.delete(pdfKey).catch(()=>{});return json({error:'We could not save your details. Please retry; your draft is still on this device.'},503);}
  // The database trigger has already queued the notification with the saved brief.
  // Email failure must not undo a successful customer submission.
  try{await notifySubmission(id,payload,env,url.origin);}catch{/* Pending/failed records remain available for team review. */}
  return json({id,message:'Your website brief has been received.'},201);
 }
 if(url.pathname.startsWith('/api/'))return json({error:'Not found.'},404);
 return env.ASSETS.fetch(request);
}
export default {async fetch(request,env){try{return await handle(request,env);}catch{return json({error:'Something went wrong. Please try again.'},500);}}};