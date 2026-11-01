// Server-only. Never import into a frontend bundle or forward provider responses.
const {createHmac}=require('node:crypto');
const {isIP}=require('node:net');
const TOPICS = { trial: 'trial', membership: 'membership', courses: 'classes', health: 'health', wellness: 'wellness', 'existing-membership': 'existing_membership', other: 'other' };
const CONTEXT = ['requestType','sourcePage','companyName','location','employeeSize','existingOffer','campaignId','privacyAccepted',
 'leadSource','leadSourceDetail','utmSource','utmMedium','utmCampaign','utmContent','utmTerm','landingPage','referrer','gclid','fbclid'];
const RESULTS = {
 delivery_not_configured: [503,'Der Formularversand ist momentan nicht verfügbar. Bitte kontaktiere KIELS telefonisch oder per E-Mail.'],
 delivery_success: [200,'Vielen Dank. Deine Anfrage wurde bei KIELS gespeichert.'],
 delivery_failed: [502,'Die Speicherung konnte nicht bestätigt werden. Deine Eingaben bleiben erhalten. Bitte versuche dieselbe Anfrage erneut.'],
 delivery_timeout: [504,'Die Bestätigung dauert zu lange. Deine Anfrage kann bereits gespeichert sein. Bitte wiederhole dieselbe Anfrage ohne Änderungen.'],
 validation_error: [400,'Bitte überprüfe deine Angaben und lade bei Bedarf das Formular erneut.'],
 idempotency_conflict: [409,'Diese Anfragekennung wurde bereits mit anderen Angaben verwendet. Bitte kontaktiere KIELS direkt.'],
 delivery_unavailable: [503,'Die Speicherung ist momentan nicht erreichbar. Deine Eingaben bleiben erhalten. Bitte versuche dieselbe Anfrage erneut.']
};
function result(code) { const [status,message]=RESULTS[code];return {status,body:{success:code==='delivery_success',code,message}}; }
const version = value => typeof value==='string' && /^[^\u0000-\u0020\u007f-\u009f]{1,100}$/.test(value) && value.isWellFormed();
function configuration(env) {
 if(env.AIW_LEAD_ENABLED!=='true'||!/^[a-f0-9]{64}$/.test(env.AIW_LEAD_TOKEN||'')||!version(env.AIW_PRIVACY_NOTICE_VERSION))return null;
 try {
  const url=new URL(env.AIW_LEAD_ENDPOINT);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/v1/website-submissions'||
    url.port||url.hostname==='localhost'||url.hostname.endsWith('.localhost')||url.hostname.endsWith('.local')||/^[\d.]+$/.test(url.hostname)||url.hostname.includes(':')||!url.hostname.includes('.'))return null;
  return {url:url.href,token:env.AIW_LEAD_TOKEN,privacyVersion:env.AIW_PRIVACY_NOTICE_VERSION,marketingVersion:env.AIW_MARKETING_NOTICE_VERSION};
 }catch{return null;}
}
function mapLeadSubmission(lead,config) {
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead.submissionId||'')||
  typeof lead.submittedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(lead.submittedAt)||
  !Number.isFinite(Date.parse(lead.submittedAt))||new Date(lead.submittedAt).toISOString()!==lead.submittedAt||Date.parse(lead.submittedAt)>Date.now()+300000)throw new Error('INVALID_RECEIPT');
 const marketing=lead.marketingConsent===true;
 if(marketing&&!version(config.marketingVersion))throw new Error('CONSENT_NOT_CONFIGURED');
 const context={};for(const key of CONTEXT)if(lead[key]!==undefined&&lead[key]!==null)context[key]=lead[key];
 const topics=[...new Set((lead.interests||[]).map(t=>TOPICS[t]))].sort();
 if(topics.some(t=>!t))throw new Error('INVALID_TOPICS');
 return {schema_version:1,submission_id:lead.submissionId,submitted_at:lead.submittedAt,
  first_name:lead.firstName,last_name:lead.lastName,email:lead.email,phone:lead.phone||null,
  topics:topics.length?topics:['other'],callback_requested:lead.callbackRequested,message:lead.message,
  privacy_notice_version:config.privacyVersion,marketing_opt_in:marketing,
  marketing_notice_version:marketing?config.marketingVersion:null,marketing_consented_at:marketing?lead.submittedAt:null,
  website_context:context};
}
async function receipt(response) {
 if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new Error('INVALID_RESPONSE');
 const reader=response.body.getReader();let size=0;const chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2048)throw new Error('INVALID_RESPONSE');chunks.push(Buffer.from(value));}
  return JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
// A1: Besucherherkunft fuer die Mengenbegrenzung im CRM. Vertrauenswuerdig nur der von Vercel selbst gesetzte Kopf (VERCEL=1);
// Client-Koepfe ausserhalb von Vercel werden ignoriert. Die IP verlaesst die Funktion nie, nur ein taeglich wechselnder HMAC-Kurzwert.
function besucherIp(req,env=process.env) {
 if(env.VERCEL!=='1')return null;
 const raw=req?.headers?.['x-vercel-forwarded-for'];
 const ip=typeof raw==='string'?raw.split(',')[0].trim():'';
 return ip.length<=45&&isIP(ip)?ip:null;
}
function besucherKennung(ip,token,now=new Date()) {
 const tagesSchluessel=createHmac('sha256',token).update('aiw-besucher-v1:'+now.toISOString().slice(0,10)).digest();
 return 'v1.'+createHmac('sha256',tagesSchluessel).update(ip).digest('base64url');
}
function createAiwLeadAdapter({env=process.env,fetchImpl=globalThis.fetch,timeoutMs=8000}={}) {
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw new Error('INVALID_TIMEOUT');
 return async (lead,{besucherIp:ip=null}={})=>{
  const config=configuration(env);if(!config)return result('delivery_not_configured');
  let body;try{body=JSON.stringify(mapLeadSubmission(lead,config));}catch(e){return result(e.message==='CONSENT_NOT_CONFIGURED'?'delivery_not_configured':'validation_error');}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const headers={'Content-Type':'application/json','Accept':'application/json',Authorization:`Bearer ${config.token}`};
  if(ip&&isIP(ip))headers['X-AIW-Besucher']=besucherKennung(ip,config.token);
  try {
   const response=await fetchImpl(config.url,{method:'POST',headers,
    body,redirect:'error',cache:'no-store',signal:controller.signal});
   if([200,201].includes(response.status)) {
    const confirmation=await receipt(response);
    return result(confirmation?.accepted===true&&Object.keys(confirmation).length===1?'delivery_success':'delivery_failed');
   }
   await response.body?.cancel();
   if(response.status===409)return result('idempotency_conflict');
   if([400,413,415,422].includes(response.status))return result('validation_error');
   return result(response.status===503||response.status===429?'delivery_unavailable':'delivery_failed');
  }catch{return result(controller.signal.aborted?'delivery_timeout':'delivery_failed');}
  finally{clearTimeout(timer);}
 };
}
module.exports={createAiwLeadAdapter,mapLeadSubmission,besucherIp,besucherKennung};
