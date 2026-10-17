import {sections} from '../public/schema.js';
const safe=value=>String(value||'').replace(/[\r\n]+/g,' ').slice(0,160);
async function signature(secret,text){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(text)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function fileLink(origin,id,secret,expires=Math.floor(Date.now()/1000)+7*86400){
 const sig=await signature(secret,id+':'+expires);
 return origin+'/api/files/'+encodeURIComponent(id)+'?expires='+expires+'&signature='+sig;
}
export async function validFileLink(url,id,secret){
 const expiry=Number(url.searchParams.get('expires'));
 if(!secret||!Number.isInteger(expiry)||expiry<Math.floor(Date.now()/1000)||expiry>Math.floor(Date.now()/1000)+8*86400)return false;
 const actual=url.searchParams.get('signature')||'';
 const expected=await signature(secret,id+':'+expiry);
 if(actual.length!==expected.length)return false;
 let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}
export async function notificationBody(id,payload,env,origin){
 const lines=['A customer submitted a website brief.','Submission reference: '+id,'Customer reference: '+(payload.reference||'Not supplied'),''];
 for(const section of sections){
 const values=section.fields.filter(([key])=>Array.isArray(payload[key])?payload[key].length:payload[key]);
 if(!values.length)continue;
 lines.push(section.title.toUpperCase());
 for(const [key,label]of values)lines.push(label+': '+(Array.isArray(payload[key])?payload[key].join(', '):payload[key]));
 lines.push('');
 }
 if(payload.packagePdf){
 if(!env.FILE_LINK_SECRET)throw Error('file_link_not_configured');
 lines.push('PACKAGE PDF: '+payload.packagePdf.name,await fileLink(origin,id,env.FILE_LINK_SECRET),'Private download link: anyone with this link can access the PDF for 7 days. Do not forward outside your project team.','');
 }
 lines.push('Content permission confirmed by customer. Review content, links and attachments before publication.');
 return {from:env.EMAIL_FROM,to:[env.NOTIFICATION_EMAIL||'contact@gowithskill.com'],reply_to:payload.email,subject:'Website brief — '+safe(payload.businessName)+' — '+safe(payload.reference||id),text:lines.join('\n')};
}
export async function notifySubmission(id,payload,env,origin){
 if(!env.RESEND_API_KEY||!env.EMAIL_FROM)return 'pending';
 // A conditional update prevents two retries claiming the same record.
 const claimed=await env.DB.prepare("UPDATE email_notifications SET status='sending', attempts=attempts+1, updated_at=? WHERE submission_id=? AND status IN ('pending','failed') AND attempts<5 RETURNING submission_id").bind(new Date().toISOString(),id).first();
 if(!claimed)return 'skipped';
 let status='failed',providerId=null,error=null;
 try{
 const body=await notificationBody(id,payload,env,origin);
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'website-brief/'+id},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok||!result.id)throw Error('provider_http_'+response.status);
 status='accepted';providerId=result.id;
 }catch(e){error=e.message==='file_link_not_configured'?e.message:'email_send_failed';}
 await env.DB.prepare('UPDATE email_notifications SET status=?, provider_id=?, last_error=?, updated_at=? WHERE submission_id=?').bind(status,providerId,error,new Date().toISOString(),id).run();
 return status;
}