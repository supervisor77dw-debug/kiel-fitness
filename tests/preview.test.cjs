const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createPreviewServer } = require("../tools/preview.cjs");
const root = path.resolve(__dirname, "..");
const versions = path.join(root, "site-versions");
let server, base;
before(async () => {
 server = createPreviewServer();
 await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
 base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
 await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("frozen current and resource snapshot match all reference hashes", () => {
 const manifest = JSON.parse(fs.readFileSync(path.join(versions, "reference-manifest.json")));
 assert.ok(manifest.files.length > 200);
 for (const file of manifest.files) {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(versions, file.path))).digest("hex");
  assert.equal(actual, file.sha256, file.path);
 }
});

test("next keeps independent delivery modules and the existing form contract", () => {
 assert.deepEqual(
  fs.readFileSync(path.join(versions, "01-current", "api/contact.js")),
  fs.readFileSync(path.join(versions, "02-next", "api/contact.js")),
  "api/contact.js"
 );
 const currentContact = fs.readFileSync(path.join(versions, "01-current", "lib/contact.js"), "utf8");
 const nextContact = fs.readFileSync(path.join(versions, "02-next", "lib/contact.js"), "utf8");
 assert.notEqual(nextContact, currentContact);
 assert.match(nextContact, /validateFirmFitnessRequest/);
 assert.doesNotMatch(currentContact, /validateFirmFitnessRequest/);
 const currentMapper = fs.readFileSync(path.join(versions, "01-current", "lib/highlevel.js"), "utf8");
 const nextMapper = fs.readFileSync(path.join(versions, "02-next", "lib/highlevel.js"), "utf8");
 assert.notEqual(nextMapper, currentMapper);
 assert.match(nextMapper, /companyName/);
 assert.doesNotMatch(currentMapper, /companyName/);
 const currentForm = fs.readFileSync(path.join(versions, "01-current", "kontakt.html"), "utf8");
 const nextForm = fs.readFileSync(path.join(versions, "02-next", "kontakt.html"), "utf8");
 const form = html => html.match(/<form class="contact-form"[\s\S]*?<\/form>/)[0];
 const currentFieldNames = [...form(currentForm).matchAll(/\bname="([^"]+)"/g)].map(match => match[1]);
 const nextContactForm = form(nextForm);
 const nextFieldNames = [...nextContactForm.matchAll(/\bname="([^"]+)"/g)].map(match => match[1]);
 assert.equal(nextFieldNames.join(","), currentFieldNames.join(","));
 assert.match(nextContactForm, /^<form class="contact-form" action="api\/contact" method="post" data-contact-form aria-describedby="contact-privacy">/);
 assert.match(nextContactForm, /HighLevel \(LeadConnector\)/);
 assert.notEqual(require("../site-versions/01-current/api/contact"), require("../site-versions/02-next/api/contact"));
 assert.notEqual(require("../site-versions/01-current/lib/contact"), require("../site-versions/02-next/lib/contact"));
});

test("selection, directory redirects and both complete sites are served", async () => {
 const chooser = await fetch(base);
 assert.match(await chooser.text(), /href="current\/"/);
 for (const version of ["current", "next"]) {
  const redirect = await fetch(base + "/" + version, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/" + version + "/");
  const pages = ["", "fitness.html", "health.html", "kurse.html", "wellness.html", "kontakt.html", "agbs.html", "impressum.html", "datenschutz.html", "script.js", "responsive.css"];
  if (version === "next") pages.push("firmenfitness.html", "arbeitgeber-empfehlen.html", "firmenfitness.js");
  for (const page of pages) {
   const response = await fetch(base + "/" + version + "/" + page);
   assert.equal(response.status, 200, version + "/" + page);
   assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  }
 }
 const next = await (await fetch(base + "/next/")).text();
 assert.match(next, /href="home\.css"/);
 assert.doesNotMatch(next, /href="home-prototype"|href="previews\//);
 assert.match(next, /href="index\.html" aria-current="page"/);
});

test("frozen resources resolve within each version without referencing live root assets", async () => {
 const expected = fs.readFileSync(path.join(versions, "shared", "assets", "home-hero.png"));
 for (const version of ["current", "next"]) {
  const response = await fetch(base + "/" + version + "/assets/home-hero.png");
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
 }
});

test("authentic homepage studio image is served from the optimized local WebP asset", async () => {
 const home = fs.readFileSync(path.join(versions, "02-next", "index.html"), "utf8");
 assert.match(home, /<img src="assets\/home-studio-kiels\.webp" alt="Trainingsfläche mit Kraftgeräten im KIELS-Studio in Kiel" loading="lazy" width="2000" height="1333">/);
 const expected = fs.readFileSync(path.join(versions, "shared", "assets", "home-studio-kiels.webp"));
 const response = await fetch(base + "/next/assets/home-studio-kiels.webp");
 assert.equal(response.status, 200);
 assert.match(response.headers.get("content-type"), /image\/webp/);
 assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
});

test("local API aliases preserve validation/spam and cannot activate HighLevel", async () => {
 const previousToken = process.env.HIGHLEVEL_PRIVATE_TOKEN;
 const previousLocation = process.env.HIGHLEVEL_LOCATION_ID;
 process.env.HIGHLEVEL_PRIVATE_TOKEN = "test";
 process.env.HIGHLEVEL_LOCATION_ID = "test";
 try {
  const local = createPreviewServer();
  await new Promise(resolve => local.listen(0, "127.0.0.1", resolve));
  const localBase = "http://127.0.0.1:" + local.address().port;
  try {
   const valid = { firstName: "Erika", lastName: "Muster", email: "erika@example.test", phone: "043154020", message: "Test", interests: ["trial"], callbackRequested: false, sourcePage: "Home", website: "", utmSource: "test", submissionId: "12345678-1234-4234-8234-123456789abc" };
   for (const endpoint of ["/api/contact", "/current/api/contact", "/next/api/contact"]) {
    for (const [body, status, code] of [[valid, 503, "delivery_not_configured"], [{ ...valid, email: "bad" }, 400, "validation_error"], [{ ...valid, website: "bot" }, 400, "spam_rejected"]]) {
     const response = await fetch(localBase + endpoint, { method: "POST", headers: { "content-type": "application/json", origin: localBase }, body: JSON.stringify(body) });
     assert.equal(response.status, status);
     const result = await response.json();
     assert.equal(result.code, code);
     assert.equal(result.success, false);
    }
   }
   const readiness = await fetch(localBase + "/next/api/highlevel-readiness", {
    headers: { origin: localBase }
   });
   assert.equal(readiness.status, 503);
   const result = await readiness.json();
   assert.deepEqual(result.runtime, { tokenPresent: false, locationPresent: false });
   assert.equal(result.error, "configuration_missing");
  } finally { await new Promise(resolve => local.close(resolve)); }
 } finally {
  if (previousToken === undefined) delete process.env.HIGHLEVEL_PRIVATE_TOKEN;
  else process.env.HIGHLEVEL_PRIVATE_TOKEN = previousToken;
  if (previousLocation === undefined) delete process.env.HIGHLEVEL_LOCATION_ID;
  else process.env.HIGHLEVEL_LOCATION_ID = previousLocation;
 }
});

test("private server files, backups and traversal are not exposed", async () => {
 for (const url of ["/next/api/contact.js", "/current/lib/highlevel.js", "/next/assets/home-hero.pre-fitness-spelling-fix.bak", "/next/assets/%2e%2e%2flib%2fhighlevel.js", "/site-versions/reference-manifest.json"]) {
  assert.equal((await fetch(base + url)).status, 404, url);
 }
});
