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
// A1 (AW-20261101-GE-CLAUDE-KIELS-WEBSITE-LEAD-GOLIVE-PRUEFUNG-001): Besucherkennung statt gemeinsamer Vercel-Ausgangs-IP
const {besucherIp,besucherKennung}=require('../site-versions/02-next/lib/aiw-lead');
test('visitor key: only Vercel-set header on Vercel, validated IP, daily HMAC, raw IP never sent',async()=>{
 const req=h=>({headers:h});
 assert.equal(besucherIp(req({'x-vercel-forwarded-for':'203.0.113.9'}),{}),null,'ausserhalb von Vercel kein Vertrauen');
 assert.equal(besucherIp(req({'x-forwarded-for':'203.0.113.9'}),{VERCEL:'1'}),null,'nur x-vercel-forwarded-for');
 assert.equal(besucherIp(req({'x-vercel-forwarded-for':'203.0.113.9, 10.0.0.1'}),{VERCEL:'1'}),'203.0.113.9');
 assert.equal(besucherIp(req({'x-vercel-forwarded-for':'2001:db8::1'}),{VERCEL:'1'}),'2001:db8::1');
 for(const bad of ['', 'evil', '999.1.1.1', '203.0.113.9<script>', 'a'.repeat(100)])assert.equal(besucherIp(req({'x-vercel-forwarded-for':bad}),{VERCEL:'1'}),null,bad);
 const day=new Date('2026-11-01T10:00:00Z'),next=new Date('2026-11-02T10:00:00Z');
 const k=besucherKennung('203.0.113.9',env.AIW_LEAD_TOKEN,day);
 assert.match(k,/^v1\.[A-Za-z0-9_-]{43}$/);assert.equal(k,besucherKennung('203.0.113.9',env.AIW_LEAD_TOKEN,new Date('2026-11-01T23:59:00Z')));
 assert.notEqual(k,besucherKennung('203.0.113.10',env.AIW_LEAD_TOKEN,day));assert.notEqual(k,besucherKennung('203.0.113.9',env.AIW_LEAD_TOKEN,next));
 assert.equal(k.includes('203'),false);
 const sent=[];const adapter=createAiwLeadAdapter({env,fetchImpl:async(_u,o)=>{sent.push(o);return new Response('{"accepted":true}',{status:201,headers:{'Content-Type':'application/json'}});}});
 assert.equal((await adapter(lead(),{besucherIp:'203.0.113.9'})).status,200);
 assert.match(sent[0].headers['X-AIW-Besucher'],/^v1\.[A-Za-z0-9_-]{43}$/);assert.equal(JSON.stringify(sent[0]).includes('203.0.113.9'),false);
 await adapter(lead());assert.equal(sent[1].headers['X-AIW-Besucher'],undefined,'ohne IP kein Kopf');
});
test('handler passes only the Vercel-derived visitor IP to the adapter',async()=>{
 const seen=[];const handler=createContactHandler({requireReceipt:true,env:{VERCEL:'1'},submitLead:async(_l,meta)=>{seen.push(meta);return{status:200,body:{success:true}};}});
 const res={headers:{},setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{host:'site.example.invalid',origin:'https://site.example.invalid','content-type':'application/json','sec-fetch-site':'same-origin','x-vercel-forwarded-for':'198.51.100.4','x-forwarded-for':'1.2.3.4'},body:JSON.stringify(input())},res);
 assert.equal(res.code,200);assert.deepEqual(seen,[{besucherIp:'198.51.100.4'}]);
});
test('endpoint port: only the approved ingress port 18444 is accepted, every other port fails closed',async()=>{
 const ok={...env,AIW_LEAD_ENDPOINT:'https://leads.dubai2025.synology.me:18444/v1/website-submissions'};let url;
 await createAiwLeadAdapter({env:ok,fetchImpl:async u=>{url=u;return new Response('{}',{status:500});}})(lead());
 assert.equal(url,ok.AIW_LEAD_ENDPOINT);
 for(const port of [443,8443,18443,18799]){let aufruf=0;const r=await createAiwLeadAdapter({env:{...env,AIW_LEAD_ENDPOINT:`https://leads.dubai2025.synology.me:${port}/v1/website-submissions`},fetchImpl:async()=>{aufruf++;}})(lead());
  if(port!==443)assert.equal(r.body.code,'delivery_not_configured');if(port!==443)assert.equal(aufruf,0);}
});
