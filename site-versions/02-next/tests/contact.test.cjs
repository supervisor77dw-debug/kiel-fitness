const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createContactHandler } = require("../api/contact");
const { createHighLevelAdapter, mapHighLevelPayload } = require("../lib/highlevel");
const { validateContact, MAX_BODY_BYTES, ATTRIBUTION_LIMITS } = require("../lib/contact");
const contact = createContactHandler({ submitLead: createHighLevelAdapter({ env: {}, fetchImpl: () => { throw new Error("Unexpected external request"); } }) });
const valid = () => ({
 firstName: " Erika ", lastName: " Muster ", email: "erika@example.test", phone: "0431 54020",
 message: "Bitte um ein Probetraining.", interests: ["trial"], callbackRequested: false,
 sourcePage: "Fitness", website: ""
});
async function request(body, overrides = {}, handler = contact) {
 const req = { method: "POST", headers: { host: "kiels.example", origin: "https://kiels.example", "content-type": "application/json" }, body, ...overrides };
 const result = { headers: {} };
 const res = {
  setHeader(key, value) { result.headers[key] = value; },
  status(code) { result.status = code; return this; },
  json(value) { result.body = value; return this; }
 };
 await handler(req, res);
 return result;
}
test("normalizes a lead without storing it, including server timestamp", () => {
 const result = validateContact({ ...valid(), interests: ["trial", "trial"], callbackRequested: true });
 assert.equal(result.valid, true);
 assert.deepEqual(Object.keys(result.lead), ["firstName", "lastName", "name", "email", "phone", "message", "interests", "callbackRequested", "preferredContact", "sourcePage", "submittedAt", ...Object.keys(ATTRIBUTION_LIMITS), "submissionId"]);
 assert.equal(result.lead.name, "Erika Muster");
 assert.equal(result.lead.phone, "+4943154020");
 assert.equal(result.lead.preferredContact, "phone");
 assert.deepEqual(result.lead.interests, ["trial"]);
 assert.ok(Math.abs(Date.now() - Date.parse(result.lead.submittedAt)) < 1000);
});
test("valid data never receives a false delivery success", async () => {
 const result = await request(JSON.stringify(valid()));
 assert.equal(result.status, 503);
 assert.equal(result.body.success, false);
 assert.equal(result.body.code, "delivery_not_configured");
 assert.equal(result.headers["Cache-Control"], "no-store");
 assert.equal("lead" in result.body, false);
});
test("Vercel parsed object and buffer bodies are accepted", async () => {
 for (const body of [valid(), Buffer.from(JSON.stringify(valid()))]) assert.equal((await request(body)).status, 503);
});
test("required values, email, telephone, selections, source and honeypot are validated", async () => {
 const bad = { firstName: " ", lastName: 7, email: "bad@", phone: "abc123", message: "x".repeat(5001), interests: ["unknown"], callbackRequested: "true", sourcePage: "Unknown", website: "spam" };
 for (const [key, value] of Object.entries(bad)) {
  const result = await request({ ...valid(), [key]: value });
  assert.equal(result.status, 400, key);
  assert.equal(result.body.success, false);
  assert.ok(result.body.errors[key], key);
 }
 for (const body of [null, [], 42, {}, undefined]) assert.equal((await request(body)).status, 400);
});
test("method, origin, content type, malformed JSON and size fail explicitly", async () => {
 assert.equal((await request(valid(), { method: "GET" })).status, 405);
 for (const origin of ["https://other.example", "not a url", "null"]) {
  assert.equal((await request(valid(), { headers: { host: "kiels.example", origin, "content-type": "application/json" } })).status, 403);
 }
 assert.equal((await request(valid(), { headers: { "content-type": "text/plain" } })).status, 415);
 assert.equal((await request("{")).body.code, "validation_error");
 assert.equal((await request("x".repeat(MAX_BODY_BYTES + 1))).status, 413);
 assert.equal((await request({ ...valid(), extra: "x".repeat(MAX_BODY_BYTES) })).status, 413);
 assert.equal((await request(valid(), { headers: { "content-type": "application/json", "content-length": MAX_BODY_BYTES + 1 } })).status, 413);
});

const testEnv = { HIGHLEVEL_ENABLED: "true", HIGHLEVEL_WEBHOOK_URL: "https://webhook.example.invalid/test-secret" };
function mockHandler(fetchImpl, env = testEnv, timeoutMs = 10000) {
 return createContactHandler({ submitLead: createHighLevelAdapter({ env, fetchImpl, timeoutMs }) });
}
test("disabled, incomplete and invalid configuration never make external requests", async () => {
 let calls = 0;
 const fetchImpl = async () => { calls++; throw new Error("Must not call"); };
 for (const env of [
  {}, { HIGHLEVEL_ENABLED: "false", HIGHLEVEL_WEBHOOK_URL: testEnv.HIGHLEVEL_WEBHOOK_URL },
  { HIGHLEVEL_ENABLED: "true" }, { HIGHLEVEL_WEBHOOK_URL: testEnv.HIGHLEVEL_WEBHOOK_URL },
  { HIGHLEVEL_ENABLED: "TRUE", HIGHLEVEL_WEBHOOK_URL: testEnv.HIGHLEVEL_WEBHOOK_URL },
  { HIGHLEVEL_ENABLED: "true", HIGHLEVEL_WEBHOOK_URL: "not a URL" },
  { HIGHLEVEL_ENABLED: "true", HIGHLEVEL_WEBHOOK_URL: "http://example.invalid" },
  { HIGHLEVEL_ENABLED: "true", HIGHLEVEL_WEBHOOK_URL: "https://user:password@example.invalid" },
  { HIGHLEVEL_ENABLED: "true", HIGHLEVEL_WEBHOOK_URL: "https://example.invalid/#secret" }
 ]) {
  const response = await request(valid(), {}, mockHandler(fetchImpl, env));
  assert.equal(response.status, 503);
  assert.equal(response.body.code, "delivery_not_configured");
 }
 assert.equal(calls, 0);
});
test("invalid data, honeypot and invalid attribution never reach a configured adapter", async () => {
 let calls = 0;
 const handler = mockHandler(async () => { calls++; return new Response(null, { status: 200 }); });
 for (const [input,code] of [
  [{ ...valid(), email: "invalid" }, "validation_error"],
  [{ ...valid(), website: "bot" }, "spam_rejected"],
  [{ ...valid(), utmCampaign: 17 }, "validation_error"],
  [{ ...valid(), landingPage: "javascript:alert(1)" }, "validation_error"]
 ]) {
  const response = await request(input, {}, handler);
  assert.equal(response.status, 400);
  assert.equal(response.body.code, code);
 }
 assert.equal(calls, 0);
});
test("configured mock receives only central contact/lead/opportunity mapping", async () => {
 const submissionId = "d473b2c0-a213-48fa-a17c-f13b4cddae87";
 const input = {
  ...valid(), submissionId, submittedAt: "1900-01-01", leadSource: "Website",
  leadSourceDetail: "Fitness", utmSource: "search", utmMedium: "cpc", utmCampaign: "trial",
  utmContent: "a", utmTerm: "fitness", landingPage: "https://kiels.example/kontakt.html",
  referrer: "https://kiels.example/fitness.html", gclid: "test-click", fbclid: "test-social"
 };
 const calls = [];
 const handler = mockHandler(async (url, options) => {
  calls.push({ url, options });
  return new Response(null, { status: 202 });
 });
 const response = await request(input, {}, handler);
 assert.equal(response.status, 200);
 assert.equal(response.body.code, "delivery_success");
 assert.equal(response.body.success, true);
 assert.equal(calls.length, 1);
 assert.equal(calls[0].url, testEnv.HIGHLEVEL_WEBHOOK_URL);
 assert.equal(calls[0].options.method, "POST");
 assert.equal(calls[0].options.redirect, "error");
 const payload = JSON.parse(calls[0].options.body);
 assert.deepEqual(Object.keys(payload), ["schemaVersion", "submissionId", "contact", "lead", "opportunity"]);
 assert.deepEqual(payload.contact, { firstName: "Erika", lastName: "Muster", name: "Erika Muster", email: input.email, phone: "+4943154020" });
 for (const field of Object.keys(ATTRIBUTION_LIMITS)) assert.equal(payload.lead[field], input[field]);
 assert.notEqual(payload.lead.submittedAt, input.submittedAt);
 assert.equal(payload.submissionId, submissionId);
 assert.deepEqual(payload.opportunity, { initialStageName: "Neuer Lead", contactReference: { submissionId } });
 assert.equal("website" in payload.lead, false);
 assert.equal("contactId" in response.body, false);
});
test("missing optional attribution becomes null and is not fabricated", () => {
 const result = validateContact(valid());
 assert.equal(result.valid, true);
 for (const field of Object.keys(ATTRIBUTION_LIMITS)) assert.equal(result.lead[field], null);
 assert.match(result.lead.submissionId, /^[0-9a-f-]{36}$/);
 assert.equal(mapHighLevelPayload(result.lead).lead.utmSource, null);
});
test("attribution boundaries, invalid types, URLs and submission IDs fail validation", () => {
 for (const [key,max] of Object.entries(ATTRIBUTION_LIMITS)) {
  const boundary = key === "landingPage" || key === "referrer"
   ? "https://example.invalid/" + "x".repeat(max - "https://example.invalid/".length)
   : "x".repeat(max);
  assert.equal(validateContact({ ...valid(), [key]: boundary }).valid, true, key);
  assert.equal(validateContact({ ...valid(), [key]: "x".repeat(max + 1) }).valid, false, key);
  assert.equal(validateContact({ ...valid(), [key]: {} }).valid, false, key);
  assert.equal(validateContact({ ...valid(), [key]: "bad\nvalue" }).valid, false, key);
 }
 for (const url of ["https://user:pass@example.invalid", "https://example.invalid/?email=private", "https://example.invalid/#private"]) {
  assert.equal(validateContact({ ...valid(), referrer: url }).valid, false);
 }
 assert.equal(validateContact({ ...valid(), submissionId: "invalid" }).valid, false);
});
test("server-only configuration never enters frontend or browser responses", async () => {
 const browserCode = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
 assert.equal(/HIGHLEVEL_|highlevel|webhook/i.test(browserCode), false);
 let mapped;
 const handler = mockHandler(async (url,options) => {
  mapped = options.body;
  return new Response("provider token and internal data", { status: 200 });
 });
 const response = await request({ ...valid(), HIGHLEVEL_WEBHOOK_URL: "client-injected-secret", token: "client-token" }, {}, handler);
 assert.equal(response.body.code, "delivery_success");
 for (const secret of ["client-injected-secret", "client-token", "provider token", "test-secret", valid().email]) {
  assert.equal(JSON.stringify(response).includes(secret), false);
 }
 assert.equal(mapped.includes("client-injected-secret"), false);
 assert.equal(mapped.includes("client-token"), false);
});
test("HTTP/network/redirect errors never expose endpoint, credentials or personal data", async () => {
 const logs = [];
 const original = console.error;
 console.error = (...args) => logs.push(args.join(" "));
 try {
  for (const fetchImpl of [
   async () => new Response(testEnv.HIGHLEVEL_WEBHOOK_URL + valid().email, { status: 500 }),
   async () => new Response("internal credentials", { status: 429 }),
   async () => new Response(null, { status: 302 }),
   async () => { throw new Error(testEnv.HIGHLEVEL_WEBHOOK_URL + valid().email); }
  ]) {
   const response = await request(valid(), {}, mockHandler(fetchImpl));
   assert.equal(response.status, 502);
   assert.equal(response.body.code, "delivery_failed");
   assert.equal(response.body.success, false);
   const serialized = JSON.stringify(response) + JSON.stringify(logs);
   for (const secret of [testEnv.HIGHLEVEL_WEBHOOK_URL, "test-secret", valid().email, valid().message, "internal credentials"]) assert.equal(serialized.includes(secret), false, secret);
  }
  assert.equal(logs.length, 4);
 } finally { console.error = original; }
});
test("timeout aborts one request, returns controlled error and never retries", async () => {
 let calls = 0;
 const logs = [];
 const original = console.error;
 console.error = (...args) => logs.push(args.join(" "));
 try {
  const handler = mockHandler((url, options) => {
   calls++;
   return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error(url + valid().email)), { once: true }));
  }, testEnv, 10);
  const response = await request(valid(), {}, handler);
  assert.equal(response.status, 504);
  assert.equal(response.body.code, "delivery_timeout");
  assert.equal(response.body.success, false);
  assert.equal(calls, 1);
  assert.deepEqual(logs, ["HighLevel delivery timed out."]);
  assert.equal(JSON.stringify(response).includes("test-secret"), false);
 } finally { console.error = original; }
});
test("same submission ID is forwarded unchanged; no local persistent deduplication is claimed", async () => {
 const ids = [];
 const handler = mockHandler(async (url,options) => {
  ids.push(JSON.parse(options.body).submissionId);
  return new Response(null, { status: 200 });
 });
 const input = { ...valid(), submissionId: "d473b2c0-a213-48fa-a17c-f13b4cddae87" };
 await request(input, {}, handler);
 await request(input, {}, handler);
 assert.deepEqual(ids, [input.submissionId, input.submissionId]);
});
test("international phone input and optional interests remain supported", () => {
 for (const phone of ["+44 1234567890", "0044 1234567890"]) {
  const result = validateContact({ ...valid(), phone, interests: [] });
  assert.equal(result.lead.phone, "+441234567890");
  assert.equal(result.lead.preferredContact, "email");
 }
 assert.equal(validateContact({ ...valid(), phone: "123456789012345" }).valid, false);
 assert.equal(validateContact({ ...valid(), firstName: "Erika\nHeader" }).valid, false);
 assert.equal(validateContact({ ...valid(), message: "Zeile 1\nZeile 2" }).valid, true);
});
