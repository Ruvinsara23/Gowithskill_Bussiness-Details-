export const sections = [
 {title:'Your business',subtitle:'Business details',description:'Your business name and project contact details.',fields:[
 ['businessName','Business name','text',true,'The name you want travellers to see'],
 ['contactName','Your name','text',true],['email','Project contact email','email',true,'For project communication. Choose public contact details below.'],
 ['phone','Phone / WhatsApp','tel',true,'Include the country code, for example +94'],
 ['businessType','Business type','select',true,['Independent tour guide','Chauffeur guide / private driver','Tour operator / travel agency','Activity / experience provider','Other']],
 ['province','Province','select',true,['Western','Central','Southern','Northern','Eastern','North Western','North Central','Uva','Sabaragamuwa','Outside Sri Lanka']],
 ['town','Base town','text',true],['serviceAreas','Destinations you serve','textarea',false,'For example: Colombo, Kandy, Ella and the south coast'],
 ['reference','Customer reference','text',false,'Optional reference provided by our team.']
 ]},
 {title:'Your brand',subtitle:'Branding details',description:'Already have a look you love? Share it. Starting fresh? We can help.',fields:[
 ['brandReadiness','How ready is your branding?','select',true,['I have a logo and brand colours','I have some branding materials','I need help choosing a style']],
 ['logoLink','Google Drive link for your logo / brand assets','url',false,'Upload your logo and brand files to Google Drive, then paste the folder link here. You can send it later.'],
 ['colours','Brand colours','text',false,'Colour names or hex codes, or “help me choose”'],
 ['tagline','Tagline','text',false],
 ['style','Preferred style','select',false,['Clean and simple','Luxury and premium','Adventure and nature','Warm and personal','Help me choose']],
 ['inspiration','Websites you like','textarea',false,'Add links and a few words about what you like.']
 ]},
 {title:'Your story',subtitle:'About your business',description:'A few honest sentences are enough. Rough notes are welcome.',fields:[
 ['about','About your business','textarea',true,'Who are you, what do you offer, and what makes your tours special?'],
 ['team','Guide / team introduction','textarea',false,'Names, experience, and short biographies'],
 ['languages','Languages spoken','text',false,'For example: English, Sinhala and German'],
 ['credentials','Credentials and memberships','textarea',false,'Only details you want published. Do not share identity documents.'],
 ['reviewLinks','Reviews and social profiles','textarea',false,'Google Maps, TripAdvisor, Facebook, Instagram or other links'],
 ['testimonials','Testimonials approved for your website','textarea',false,'Include a source or permission to use them. No private traveller contact details.'],
 ['galleryLink','Google Drive link for photos / videos','url',false,'Upload photos and videos to Google Drive, then paste the folder link. Include photographer credits where needed.']
 ]},
 {title:'Tour packages',subtitle:'Tour packages',description:'Paste your packages, attach a PDF, or send them later. No fixed format needed.',fields:[['packageNotes','Tours and packages','textarea',false,'Paste any itineraries, prices, inclusions or rough notes. Up to 30,000 characters.']]},
 {title:'Website details',subtitle:'Website preferences',description:'Choose how travellers should contact you and tell us about your domain.',fields:[
 ['publicPhone','Public phone / WhatsApp','tel',true],['publicEmail','Public business email','email',false],
 ['publicAddress','Public address / meeting point','text',false,'Only share an address you want published.'],
 ['enquiryMethods','Enquiry methods','checks',true,['WhatsApp','Contact form','Phone','Email']],
 ['enquiryEmail','Inbox for contact-form enquiries','email',false,'Required if you select Contact form.'],
 ['domainStatus','Do you have a domain?','select',true,['I own a domain','I have a website and domain','I need a new domain','I am not sure']],
 ['domain','Domain name','text',false,'For example yourbusiness.com. If you do not know it, write “Not sure”.'],
 ['domainProvider','Domain provider / registrar','text',false,'For example GoDaddy, Namecheap or Cloudflare. Leave blank if you do not know.'],
 ['domainAccess','Who manages the domain?','select',false,['I have access to the account','A previous developer / agency manages it','Someone else in my business manages it','I am not sure']],
 ['existingWebsite','Current website address','url',false,'Include https:// if you have a live website.'],
 ['domainHelp','Domain access or transfer notes','textarea',false,'Tell us if you need help contacting the account owner. Never share passwords or verification codes.'],
 ['preferredDomain','Preferred new domain name','text',false,'For example yourbusiness.com or yourbusiness.lk. Availability must be checked before registration.'],
 ['alternativeDomains','Alternative domain names','textarea',false,'Optional backup names, one per line.'],
 ['domainRegistration','Help with registration','select',false,['I will register the domain myself','I would like GoWithSkill to guide me','Help me choose a suitable name first']],
 ['domainUnsure','What do you know about your domain?','textarea',false,'A business name, old website link or who previously handled it can help us check.'],
 ['websiteLanguages','Website languages wanted','text',false,'Translation scope will be agreed with our team.'],
 ['notes','Anything else or content still to come?','textarea',false,'Tell us about missing photos, requested features or preferred timing.']
 ]},
 {title:'Review & send',subtitle:'Review your details',description:'Check your details. Our team will review your content with you before anything goes live.',fields:[]}
];
export const tourFields = [
 ['name','Package name','text',true],['description','Short description','textarea',true],
 ['duration','Duration','text',true,'For example: 6 hours or 7 days / 6 nights'],
 ['destinations','Destinations and highlights','textarea',true],['pickup','Pickup / drop-off locations','text',true],
 ['itinerary','Itinerary','textarea',false,'List stops or use Day 1, Day 2, etc.'],
 ['included','What is included?','textarea',true],['excluded','What is excluded?','textarea',false],
 ['groupSize','Group size and private / shared format','text',false],['availability','Availability and notice required','text',false],
 ['languages','Tour languages','text',false],['accessibility','Fitness, accessibility and what to bring','textarea',false],
 ['priceType','How should we display the price?','select',true,['Fixed price','From price','Price on request','Help me decide']],
 ['price','Price amount','number',false],['currency','Currency','select',false,['LKR','USD','EUR','GBP','Other - explain below']],
 ['basis','Price basis','select',false,['Per person','Per group','Per vehicle','Per day','Other - explain below']],
 ['priceNotes','Price conditions and extra charges','textarea',false,'Seasonal rates, taxes, group assumptions and supplements'],
 ['bookingTerms','Booking and payment terms','textarea',false,'Your terms for travellers, not website-development payments'],
 ['cancellation','Cancellation / refund policy','textarea',false,'Use your existing policy or say you need help.'],
 ['photos','Google Drive link for package photos','url',false]
];
export function validateFields(fields, values, prefix='') {
 const errors=[];
 for(const [key,label,type,required,meta] of fields){
 const value=values?.[key]; const populated=Array.isArray(value)?value.length>0:typeof value==='string'&&value.trim().length>0;
 if(required&&!populated) errors.push({key:prefix+key,message:label+' is required.'});
 if(value!==undefined&&((type==='checks'&&!Array.isArray(value))||(type!=='checks'&&typeof value!=='string'))) { errors.push({key:prefix+key,message:label+' has an invalid value.'});continue; }
 if(typeof value==='string'&&value.length>(key==='packageNotes'?30000:6000)) errors.push({key:prefix+key,message:label+' is too long.'});
 if(!populated)continue;
 if(type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) errors.push({key:prefix+key,message:'Enter a valid email address.'});
 if(type==='url'){try{if(!['https:','http:'].includes(new URL(value).protocol))throw Error();}catch{errors.push({key:prefix+key,message:'Enter a complete http or https link.'});}}
 if(type==='select'&&!meta.includes(value)) errors.push({key:prefix+key,message:'Choose one of the listed options.'});
 if(type==='checks'&&(!value.every(v=>meta.includes(v))||value.length>meta.length)) errors.push({key:prefix+key,message:'Choose valid options.'});
 if(type==='number'&&(!Number.isFinite(Number(value))||Number(value)<0))errors.push({key:prefix+key,message:'Enter a valid non-negative price.'});
 }
 return errors;
}
export function domainErrors(data){
 if(['I own a domain','I have a website and domain'].includes(data.domainStatus)&&!(typeof data.domain==='string'&&data.domain.trim()))return [{key:'domain',message:'Enter your domain name, or write “Not sure” so we can help.'}];
 return [];
}
export function validate(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return [{key:'form',message:'Invalid submission.'}];
 const errors=sections.flatMap(section=>validateFields(section.fields,data));
 errors.push(...domainErrors(data));
 if(Array.isArray(data.enquiryMethods)&&data.enquiryMethods.includes('Contact form')&&!(typeof data.enquiryEmail==='string'&&data.enquiryEmail.trim()))errors.push({key:'enquiryEmail',message:'Add the inbox for contact-form enquiries.'});
 if(data.consent!==true)errors.push({key:'consent',message:'Confirm your content permission before submitting.'});
 return errors;
}
export function clean(data){
 const out={};
 for(const [key,,type] of sections.flatMap(s=>s.fields))out[key]=type==='checks'?(data[key]||[]):(data[key]||'').trim();
 out.tours=(Array.isArray(data.tours)?data.tours:[]).slice(0,20).map(t=>Object.fromEntries(tourFields.map(([key])=>[key,(t[key]||'').trim()])));
 out.consent=true;return out;
}