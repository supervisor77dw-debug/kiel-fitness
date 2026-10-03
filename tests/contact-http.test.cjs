const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { serveContact } = require("../tools/contact-http.cjs");
const { createContactHandler } = require("../site-versions/02-next/api/contact");
const { createHighLevelAdapter } = require("../site-versions/02-next/lib/highlevel");
const { MAX_BODY_BYTES } = require("../site-versions/02-next/lib/contact");
test("raw Node HTTP runtime preserves JSON parsing, validation, spam and disabled delivery", async () => {
 const handler = createContactHandler({ submitLead: createHighLevelAdapter({ env: {} }) });
 const server = http.createServer((req,res) => serveContact(req,res,{handler,maxBytes:MAX_BODY_BYTES}));
 await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
 const base = "http://127.0.0.1:"+server.address().port;
 try {
  const valid = {firstName:"Erika",lastName:"Muster",email:"erika@example.test",phone:"043154020",message:"Test",interests:[],callbackRequested:false,sourcePage:"Home",website:""};
  for(const [input,status,code] of [[JSON.stringify(valid),503,"delivery_not_configured"],[JSON.stringify({...valid,email:"bad"}),400,"validation_error"],[JSON.stringify({...valid,website:"bot"}),400,"spam_rejected"],["{",400,"validation_error"],["x".repeat(MAX_BODY_BYTES+1),413,"body_too_large"]]){
   const response=await fetch(base,{method:"POST",headers:{"content-type":"application/json",origin:base},body:input});
   assert.equal(response.status,status);
   assert.match(response.headers.get("content-type"),/application\/json/);
   assert.equal((await response.json()).code,code);
  }
 } finally { await new Promise(resolve=>server.close(resolve)); }
});
