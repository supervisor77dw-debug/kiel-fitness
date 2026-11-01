const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('Vercel build packages the active AIW handler without HighLevel routes, code or credentials',()=>{
 const output=path.join(root,'.vercel',`output-aw090-test-${randomUUID()}`);
 try{
  execFileSync(process.execPath,[path.join(root,'tools','build-staging.cjs'),'--output',output]);
  const fn=path.join(output,'functions','api','contact.func');
  assert.equal(JSON.parse(fs.readFileSync(path.join(fn,'.vc-config.json'))).runtime,'nodejs22.x');
  assert.deepEqual(fs.readdirSync(path.join(output,'functions','api')),['contact.func']);
  assert.deepEqual(fs.readdirSync(path.join(fn,'lib')).sort(),['aiw-lead.js','contact.js']);
  assert.equal(typeof require(path.join(fn,'entry.cjs')),'function');
  const routes=JSON.parse(fs.readFileSync(path.join(output,'config.json'))).routes;
  assert.equal(routes.some(r=>r.src==='/api/contact'),true);assert.equal(JSON.stringify(routes).includes('highlevel'),false);
  const robots=routes.find(r=>r.headers?.['X-Robots-Tag']);
  assert.deepEqual(robots.missing,[{type:'host',value:'www.kiel-fitness.de'}]);assert.equal(robots.continue,true);
  assert.equal(routes.find(r=>r.has?.[0]?.value==='kiel-fitness.de').headers.Location,'https://www.kiel-fitness.de/$1');
  const wix=routes.find(r=>r.status===301&&!r.has);
  for(const page of ['kontakt','agbs','kurse','fitness','health','impressum','wellness','datenschutz']){
   assert.match('/'+page,new RegExp(wix.src));assert.match('/'+page+'/',new RegExp(wix.src));
   assert.ok(fs.existsSync(path.join(output,'static',page+'.html')),page+'.html fehlt als Weiterleitungsziel');
  }
  assert.doesNotMatch('/kontakt.html',new RegExp(wix.src));
  for(const file of ['kontakt.html','kinderbetreuung.html','firmenfitness.html','arbeitgeber-empfehlen.html','script.js','firmenfitness.js','home.css'])assert.ok(fs.existsSync(path.join(output,'static',file)),file);
  for(const file of ['script.js','firmenfitness.js']){
   const code=fs.readFileSync(path.join(output,'static',file),'utf8');assert.match(code,/submittedAt/);assert.doesNotMatch(code,/AIW_LEAD_TOKEN|AIW_SOURCE_CREDENTIAL|Bearer /);
  }
 }finally{
  const verified=path.resolve(output);assert.equal(path.dirname(verified),path.join(root,'.vercel'));assert.match(path.basename(verified),/^output-aw090-test-/);
  fs.rmSync(verified,{recursive:true,force:true});
 }
});
