const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAiwLeadAdapter,mapLeadSubmission}=require('../site-versions/02-next/lib/aiw-lead');
const {createContactHandler}=require('../site-versions/02-next/api/contact');
const env={AIW_LEAD_ENABLED:'true',AIW_LEAD_ENDPOINT:'https://ingress.example.invalid/v1/website-submissions',AIW_LEAD_TOKEN:'a'.repeat(64),AIW_PRIVACY_NOTICE_VERSION:'synthetic-v1'};
const lead=()=>({firstName:'Synthetisch',lastName:'Test',email:'synthetic@example.invalid',phone:'+494315550100',message:'Test',interests:['trial','courses'],callbackRequested:false,sourcePage:'Kontakt',submissionId:'72f50ed3-67d9-402b-a142-70f331f05b5d',submittedAt:'2026-10-20T12:00:00.000Z'});
const input=()=>({...lead(),phone:'0431 5550100',website:''});
test('unconfigured, HTTP, local or credential-bearing endpoints fail closed without requests',async()=>{
 for(const config of [{},{...env,AIW_LEAD_ENABLED:'false'},{...env,AIW_LEAD_TOKEN:'short'},...['http://ingress.example.invalid/v1/website-submissions','https://localhost/v1/website-submissions','https://127.0.0.1/v1/website-submissions','https://a:b@example.invalid/v1/website-submissions','https://example.invalid/v1/website-submissions?token=x','https://example.invalid/api/leads'].map(AIW_LEAD_ENDPOINT=>({...env,AIW_LEAD_ENDPOINT}))]){
  const r=await createAiwLeadAdapter({env:config,fetchImpl:()=>{throw new Error('NO_NETWORK');}})(lead());assert.equal(r.status,503);
 }
});
test('mapping is stable, retains original form details and never accepts client routing',()=>{
 const l={...lead(),companyName:'Synthetic GmbH',requestType:'employer_inquiry',tenantId:'forged',marketingConsent:false};
 const mapped=mapLeadSubmission(l,{privacyVersion:'synthetic-v1'});assert.deepEqual(mapped.topics,['classes','trial']);
 assert.equal(mapped.submitted_at,l.submittedAt);assert.equal(mapped.website_context.companyName,l.companyName);
 assert.equal(JSON.stringify(mapped).includes('forged'),false);assert.equal(mapped.marketing_opt_in,false);
 assert.deepEqual(mapLeadSubmission(l,{privacyVersion:'synthetic-v1'}),mapped);
});
test('success requires an explicit bounded committed receipt, not an arbitrary 2xx',async()=>{
 for(const [status,body,ok]of [[201,'{"accepted":true}',true],[200,'{"accepted":true}',true],[202,'{"accepted":true}',false],[200,'{}',false],[200,'{"accepted":true,"leadId":"internal"}',false],[200,'x'.repeat(3000),false]]){
  let options;const r=await createAiwLeadAdapter({env,fetchImpl:async(url,o)=>{assert.equal(url,env.AIW_LEAD_ENDPOINT);options=o;return new Response(body,{status,headers:{'Content-Type':'application/json'}});}})(lead());
  assert.equal(r.body.success,ok);assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,`Bearer ${env.AIW_LEAD_TOKEN}`);
  assert.equal(JSON.stringify(r).includes('internal'),false);assert.equal(JSON.stringify(r).includes(lead().email),false);
 }
});
test('errors, source failures, conflicts, redirects and timeouts are sanitized without automatic retries',async()=>{
 for(const status of [401,403,409,422,429,500,503,302]){
  let calls=0;const r=await createAiwLeadAdapter({env,fetchImpl:async()=>{calls++;return new Response('private upstream '+env.AIW_LEAD_TOKEN,{status});}})(lead());
  assert.equal(calls,1);assert.equal(r.body.success,false);assert.equal(r.status,status===409?409:status===422?400:[429,503].includes(status)?503:502);assert.equal(JSON.stringify(r).includes('private'),false);
 }
 let calls=0;const r=await createAiwLeadAdapter({env,timeoutMs:10,fetchImpl:(_url,o)=>{calls++;return new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(new Error('secret'))));}})(lead());
 assert.equal(r.status,504);assert.equal(calls,1);
});
test('marketing is opt-in with explicit configured notice and stable timestamp evidence',async()=>{
 const l={...lead(),marketingConsent:true};assert.equal((await createAiwLeadAdapter({env})(l)).status,503);
 const b=mapLeadSubmission(l,{privacyVersion:'privacy-v1',marketingVersion:'marketing-v1'});
 assert.equal(b.marketing_opt_in,true);assert.equal(b.marketing_consented_at,l.submittedAt);assert.equal(b.marketing_notice_version,'marketing-v1');
});
test('public form requires same-origin JSON, stable receipt fields and rejects honeypot before adapter',async()=>{
 let calls=0;const handler=createContactHandler({requireReceipt:true,submitLead:async()=>{calls++;return{status:200,body:{success:true}};}});
 async function request(body,headers={}){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};await handler({method:'POST',headers:{host:'site.example.invalid',origin:'https://site.example.invalid','content-type':'application/json',...headers},body},res);return res;}
 for(const [body,headers,status]of [[input(),{origin:'https://evil.invalid'},403],[input(),{origin:undefined},403],[input(),{'sec-fetch-site':'cross-site'},403],[input(),{'content-encoding':'gzip'},415],[Buffer.from([0xc3,0x28]),{},400],[{...input(),submittedAt:undefined},{},400],[{...input(),website:'bot'},{},400]])assert.equal((await request(body,headers)).code,status);
 assert.equal(calls,0);assert.equal((await request(input())).code,200);assert.equal(calls,1);
});
