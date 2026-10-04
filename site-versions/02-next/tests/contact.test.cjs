const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createContactHandler } = require("../api/contact");
const { createHighLevelAdapter, checkHighLevelReadiness, checkFieldDefinitions, mapCampaignDetail } = require("../lib/highlevel");
const { validateContact, MAX_BODY_BYTES, ATTRIBUTION_LIMITS } = require("../lib/contact");

const TEST_ENV = {
 HIGHLEVEL_PRIVATE_TOKEN: "unit-test-token",
 HIGHLEVEL_LOCATION_ID: "unit-test-location"
};
const interestOptions = [
 "Probetraining", "Mitgliedschaft & Tarife", "Kurse", "Gesundheit & Körperanalyse",
 "Sauna & Wellness", "Bestehende Mitgliedschaft", "Sonstiges"
];
const customFields = [
 { id: "source-id", name: "Lead-Quelle", model: "contact", dataType: "SINGLE_OPTIONS", picklistOptions: ["Website", "Google"] },
 { id: "detail-id", name: "Kampagne / Lead-Detail", model: "contact", dataType: "TEXT", picklistOptions: [] },
 { id: "message-id", name: "Nachricht / Anfrage", model: "contact", dataType: "LARGE_TEXT", picklistOptions: [] },
 { id: "callback-id", name: "Rückruf erwünscht", model: "contact", dataType: "SINGLE_OPTIONS", picklistOptions: ["Ja", "Nein"] },
 { id: "interest-id", name: "Interesse / Anliegen", model: "contact", dataType: "MULTIPLE_OPTIONS", picklistOptions: interestOptions },
 { id: "location-id", name: "Standort", model: "contact", dataType: "TEXT", picklistOptions: [] },
 { id: "size-id", name: "Beschäftigtengröße", model: "contact", dataType: "SINGLE_OPTIONS", picklistOptions: ["1-9", "10-49", "50-249", "250+"] },
 { id: "offer-id", name: "Bestehendes Firmenfitness-Angebot", model: "contact", dataType: "SINGLE_OPTIONS", picklistOptions: ["Ja", "Nein", "Nicht sicher"] }
];

const valid = () => ({
 firstName: " Erika ", lastName: " Muster ", email: "erika@example.test", phone: "0431 54020",
 message: "  Bitte um ein Probetraining.\nVielen Dank.  ", interests: ["trial"], callbackRequested: false,
 sourcePage: "Fitness", website: ""
});

function jsonResponse(body, status = 200) {
 return new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" }
 });
}

function mockApi({ existingContacts = [], failureAt, failureStatus = 502, delayUntilAbort = false } = {}) {
 const calls = [];
 const fetchImpl = async (url, options) => {
  const parsed = new URL(url);
  const method = options.method || "GET";
  calls.push({ url: parsed, method, options, body: options.body ? JSON.parse(options.body) : null });
  if (delayUntilAbort) {
   return new Promise((resolve, reject) => options.signal.addEventListener(
    "abort", () => reject(new Error("unit-test-token private lead data")), { once: true }
   ));
  }
  if (failureAt && parsed.pathname.includes(failureAt)) {
   return jsonResponse({ error: "unit-test-token sensitive@example.test private lead data" }, failureStatus);
  }
  if (parsed.pathname.endsWith("/customFields") && method === "GET") {
   return jsonResponse({ customFields });
  }
  if (parsed.pathname === "/contacts/" && method === "GET") {
   const query = parsed.searchParams.get("query");
   const matches = existingContacts.filter(contact => contact.email === query || contact.phone === query);
   return jsonResponse({ contacts: matches.map(({ id }) => ({ id })), count: matches.length });
  }
  const contactMatch = parsed.pathname.match(/^\/contacts\/([^/]+)$/);
  if (contactMatch && method === "GET") {
   const found = existingContacts.find(contact => contact.id === decodeURIComponent(contactMatch[1]));
   return found ? jsonResponse({ contact: found }) : jsonResponse({ message: "not found" }, 404);
  }
  if (contactMatch && method === "PUT") {
   return jsonResponse({ contact: { id: decodeURIComponent(contactMatch[1]) } });
  }
  if (parsed.pathname === "/contacts/upsert" && method === "POST") {
   return jsonResponse({ new: true, contact: { id: "created-contact-id" } }, 201);
  }
  throw new Error(`Unexpected mocked HighLevel request: ${method} ${parsed.pathname}`);
 };
 return { calls, fetchImpl };
}

function mockHandler(api, env = TEST_ENV, timeoutMs = 12000) {
 return createContactHandler({
  submitLead: createHighLevelAdapter({ env, fetchImpl: api.fetchImpl, timeoutMs })
 });
}

async function request(body, overrides = {}, handler = createContactHandler({
 submitLead: createHighLevelAdapter({ env: {}, fetchImpl: () => { throw new Error("Unexpected outbound request"); } })
})) {
 const req = {
  method: "POST",
  headers: { host: "kiels.example", origin: "https://kiels.example", "content-type": "application/json" },
  body,
  ...overrides
 };
 const result = { headers: {} };
 const res = {
  setHeader(key, value) { result.headers[key] = value; },
  status(code) { result.status = code; return this; },
  json(value) { result.body = value; return this; }
 };
 await handler(req, res);
 return result;
}

function firmFitnessInput(requestType = "employer_inquiry", overrides = {}) {
 return {
  schemaVersion: 1, requestType,
  sourcePage: requestType === "employer_referral" ? "Arbeitgeberempfehlen" : "Firmenfitness",
  companyName: "Kiel Beispiel GmbH", firstName: "Erika", lastName: "Muster",
  email: "erika@example.test", phone: "", location: "Kiel", callbackRequested: false, website: "",
  ...overrides
 };
}

function field(body, id) {
 return body.customFields.find(value => value.id === id)?.field_value;
}

test("readiness inspection validates every existing contact field and option without writing", async () => {
 const checked = checkFieldDefinitions(customFields);
 assert.equal(checked.ready, true);
 assert.deepEqual(checked.missing, []);
 assert.deepEqual(checked.incompatible, []);
 assert.deepEqual(checked.fields.find(item => item.requestedName === "Lead-Quelle").options, ["Website", "Google"]);
 const missing = checkFieldDefinitions(customFields.filter(item => item.id !== "interest-id"));
 assert.equal(missing.ready, false);
 assert.deepEqual(missing.missing, ["Interesse / Anliegen"]);
 let calls = 0;
 const readiness = await checkHighLevelReadiness({
  env: TEST_ENV,
  fetchImpl: async (url, options) => {
   calls++;
   assert.equal(new URL(url).pathname, "/locations/unit-test-location/customFields");
   assert.equal(options.method, "GET");
   assert.equal(options.headers.Version, "2021-07-28");
   return jsonResponse({ customFields });
  }
 });
 assert.equal(readiness.status, 200);
 assert.equal(readiness.body.runtime.tokenPresent, true);
 assert.equal(readiness.body.runtime.locationPresent, true);
 assert.equal(readiness.body.ready, true);
 assert.equal(calls, 1);
});

test("readiness logs bounded allowlisted diagnostics without exposing provider bodies", async () => {
 const logs = [];
 const original = console.error;
 console.error = (...args) => logs.push(args);
 try {
  for (const [status, category] of [
   [401, "authentication"], [403, "scope_or_location_access"],
   [404, "location_or_path_not_found"], [429, "rate_limit"],
   [503, "provider_error"], [400, "request_rejected"]
  ]) {
   let calls = 0;
   const result = await checkHighLevelReadiness({
    env: TEST_ENV,
    fetchImpl: async (url, options) => {
     calls++;
     assert.equal(options.method, "GET");
     return new Response(JSON.stringify({
      code: "ACCESS_DENIED", message: "Forbidden",
      details: `${TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN} ${TEST_ENV.HIGHLEVEL_LOCATION_ID} sensitive@example.test`
     }), { status, headers: {
      "content-type": "application/json",
      "x-request-id": "550e8400-e29b-41d4-a716-446655440000",
      "authorization": TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN
     } });
    }
   });
   assert.equal(calls, 1);
   assert.equal(result.status, 502);
   assert.equal(result.body.error, "custom_fields_unavailable");
   assert.equal(result.body.diagnostic, undefined);
   assert.deepEqual(JSON.parse(logs.at(-1)[0]), {
    operation: "custom_fields_read", httpStatus: status,
    errorCode: `${category}:ACCESS_DENIED`, message: "Forbidden",
    requestId: "550e8400-e29b-41d4-a716-446655440000"
   });
  }
  for (const body of [
   JSON.stringify({ code: TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN, message: "sensitive@example.test" }),
   JSON.stringify({ code: "UNAUTHORIZED", message: "Forbidden", extra: "x".repeat(5000) }),
   "<html>private lead data</html>", "{"
  ]) {
   await checkHighLevelReadiness({
    env: TEST_ENV,
    fetchImpl: async () => new Response(body, { status: 401, headers: {
     "content-type": "application/json", "x-request-id": TEST_ENV.HIGHLEVEL_LOCATION_ID
    } })
   });
   assert.deepEqual(JSON.parse(logs.at(-1)[0]), {
    operation: "custom_fields_read", httpStatus: 401, errorCode: "authentication"
   });
  }
  const output = JSON.stringify(logs);
  for (const forbidden of [
   TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN, TEST_ENV.HIGHLEVEL_LOCATION_ID,
   "sensitive@example.test", "private lead data", "authorization", "details"
  ]) assert.equal(output.includes(forbidden), false);
 } finally {
  console.error = original;
 }
});

test("valid contact is normalized while the free-text message stays byte-for-byte intact", () => {
 const result = validateContact({ ...valid(), interests: ["trial", "trial"], callbackRequested: true });
 assert.equal(result.valid, true);
 assert.equal(result.lead.name, "Erika Muster");
 assert.equal(result.lead.phone, "+4943154020");
 assert.equal(result.lead.message, valid().message);
 assert.equal(result.lead.preferredContact, "phone");
 assert.deepEqual(result.lead.interests, ["trial"]);
 assert.ok(Math.abs(Date.now() - Date.parse(result.lead.submittedAt)) < 1000);
});

test("missing required fields, invalid email and invalid phone fail server validation", async () => {
 for (const [key, value] of [
  ["firstName", " "], ["email", "bad@"], ["phone", "abc123"], ["message", ""]
 ]) {
  const result = await request({ ...valid(), [key]: value });
  assert.equal(result.status, 400, key);
  assert.equal(result.body.success, false);
  assert.ok(result.body.errors[key], key);
 }
});

test("Vercel parsed object and buffer bodies are accepted", async () => {
 const api = mockApi();
 const handler = mockHandler(api);
 for (const body of [valid(), Buffer.from(JSON.stringify(valid()))]) {
  const result = await request(body, {}, handler);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
 }
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

test("token and location are both required and missing configuration makes no API calls", async () => {
 let calls = 0;
 const fetchImpl = async () => { calls++; throw new Error("Must not call"); };
 for (const env of [
  {}, { HIGHLEVEL_PRIVATE_TOKEN: TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN },
  { HIGHLEVEL_LOCATION_ID: TEST_ENV.HIGHLEVEL_LOCATION_ID }
 ]) {
  const handler = createContactHandler({ submitLead: createHighLevelAdapter({ env, fetchImpl }) });
  const result = await request(valid(), {}, handler);
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "delivery_not_configured");
  assert.equal(result.body.success, false);
 }
 assert.equal(calls, 0);
});

test("a new regular contact uses API v2, actual field IDs, and the semantic website mapping", async () => {
 const api = mockApi();
 const result = await request({ ...valid(), interests: ["trial", "courses"] }, {}, mockHandler(api));
 assert.equal(result.status, 200);
 assert.equal(result.body.code, "delivery_success");
 const configRequest = api.calls[0];
 assert.equal(configRequest.url.pathname, "/locations/unit-test-location/customFields");
 assert.equal(configRequest.options.headers.Authorization, `Bearer ${TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN}`);
 assert.equal(configRequest.options.headers.Version, "2021-07-28");
 assert.equal(api.calls.filter(call => call.url.pathname === "/contacts/upsert").length, 1);
 const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
 assert.equal(create.body.createNewIfDuplicateAllowed, false);
 assert.equal(create.body.firstName, "Erika");
 assert.equal(create.body.lastName, "Muster");
 assert.equal(create.body.email, "erika@example.test");
 assert.equal(create.body.phone, "+4943154020");
 assert.equal(create.body.source, "Website");
 assert.equal(field(create.body, "source-id"), "Website");
 assert.equal(field(create.body, "detail-id"), "Probetraining");
 assert.equal(field(create.body, "message-id"), valid().message);
 assert.equal(field(create.body, "callback-id"), undefined);
 assert.deepEqual(field(create.body, "interest-id"), ["Probetraining", "Kurse"]);
 assert.equal("token" in result.body, false);
});

test("an existing contact found by email and phone is updated once", async () => {
 const existing = {
  id: "existing-contact-id", email: "erika@example.test", phone: "+4943154020",
  firstName: "Erika", lastName: "Muster"
 };
 const api = mockApi({ existingContacts: [existing] });
 const result = await request(valid(), {}, mockHandler(api));
 assert.equal(result.body.code, "delivery_success");
 assert.equal(api.calls.filter(call => call.method === "PUT" && call.url.pathname.endsWith(existing.id)).length, 1);
 assert.equal(api.calls.some(call => call.url.pathname === "/contacts/upsert"), false);
});

test("email and phone matches pointing to different contacts fail closed as ambiguous", async () => {
 const api = mockApi({ existingContacts: [
  { id: "email-contact", email: "erika@example.test", phone: "+49123456789" },
  { id: "phone-contact", email: "other@example.test", phone: "+4943154020" }
 ] });
 const result = await request(valid(), {}, mockHandler(api));
 assert.equal(result.status, 502);
 assert.equal(result.body.success, false);
 assert.equal(api.calls.some(call => call.method === "PUT" || call.url.pathname === "/contacts/upsert"), false);
});

test("unmatched custom field definitions and options never trigger a guessed mapping", async () => {
 const api = mockApi();
 api.fetchImpl = async (url, options) => {
  const parsed = new URL(url);
  api.calls.push({ url: parsed, method: options.method || "GET", options, body: options.body ? JSON.parse(options.body) : null });
  return jsonResponse({ customFields: customFields.filter(field => field.id !== "source-id") });
 };
 const result = await request(valid(), {}, mockHandler(api));
 assert.equal(result.status, 502);
 assert.equal(api.calls.some(call => call.url.pathname === "/contacts/upsert"), false);
});

test("multiple user interests are not discarded when the existing field is single-select", async () => {
 const api = mockApi();
 const standardFetch = api.fetchImpl;
 api.fetchImpl = async (url, options) => {
  if (new URL(url).pathname.endsWith("/customFields")) {
   const definitions = customFields.map(field => field.id === "interest-id"
    ? { ...field, dataType: "SINGLE_OPTIONS" }
    : field);
   api.calls.push({ url: new URL(url), method: "GET", options, body: null });
   return jsonResponse({ customFields: definitions });
  }
  return standardFetch(url, options);
 };
 const result = await request({ ...valid(), interests: ["trial", "courses"] }, {}, mockHandler(api));
 assert.equal(result.status, 502);
 assert.equal(result.body.success, false);
 assert.equal(api.calls.some(call => call.url.pathname === "/contacts/upsert"), false);
});

test("firm-fitness inquiry uses the same endpoint and maps its distinct lead detail", async () => {
 const input = firmFitnessInput("employer_inquiry", {
  location: "Kiel", employeeSize: "10-49", existingOffer: "no",
  message: "  Bitte um ein Gespräch.  ", callbackRequested: true, phone: "0431 54020"
 });
 const api = mockApi();
 const result = await request(input, {}, mockHandler(api));
 assert.equal(result.status, 200);
 const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
 assert.equal(create.body.companyName, input.companyName);
 assert.equal(create.body.phone, "+4943154020");
 assert.equal(field(create.body, "detail-id"), "Firmenfitness");
 assert.equal(field(create.body, "location-id"), "Kiel");
 assert.equal(field(create.body, "size-id"), "10-49");
 assert.equal(field(create.body, "offer-id"), "Nein");
 assert.equal(field(create.body, "message-id"), input.message);
 assert.equal(field(create.body, "callback-id"), "Ja");
});

test("firm-fitness referral maps without inventing optional phone, message, size, or offer values", async () => {
 const input = firmFitnessInput("employer_referral");
 const api = mockApi();
 const result = await request(input, {}, mockHandler(api));
 assert.equal(result.status, 200);
 const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
 assert.equal(create.body.companyName, input.companyName);
 assert.equal("phone" in create.body, false);
 assert.equal("companyName" in create.body && create.body.companyName, input.companyName);
 assert.equal(field(create.body, "detail-id"), "Firmenfitness Empfehlung");
 assert.equal(field(create.body, "location-id"), "Kiel");
 assert.equal(field(create.body, "message-id"), undefined);
 assert.equal(field(create.body, "size-id"), undefined);
 assert.equal(field(create.body, "offer-id"), undefined);
 assert.equal(field(create.body, "callback-id"), undefined);
});

test("invalid firm requests are rejected before any HighLevel calls", async () => {
 const api = mockApi();
 const handler = mockHandler(api);
 for (const [input, code] of [
  [firmFitnessInput("employer_referral", { location: "" }), "validation_error"],
  [firmFitnessInput("employer_inquiry", { phone: "", callbackRequested: true }), "validation_error"],
  [firmFitnessInput("employer_inquiry", { employeeSize: "100000" }), "validation_error"],
  [firmFitnessInput("employer_inquiry", { website: "bot" }), "spam_rejected"]
 ]) {
  const result = await request(input, {}, handler);
  assert.equal(result.status, 400);
  assert.equal(result.body.code, code);
 }
 assert.equal(api.calls.length, 0);
});

test("API failure responses and network errors do not expose credentials or lead data", async () => {
 const api = mockApi({ failureAt: "customFields", failureStatus: 500 });
 const logs = [];
 const original = console.error;
 console.error = (...args) => logs.push(args.join(" "));
 try {
  const result = await request(valid(), {}, mockHandler(api));
  assert.equal(result.status, 502);
  assert.equal(result.body.success, false);
  const serialized = JSON.stringify(result) + JSON.stringify(logs);
  for (const secret of [TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN, "sensitive@example.test", "private lead data", valid().message]) {
   assert.equal(serialized.includes(secret), false);
  }
 } finally {
  console.error = original;
 }
});

test("network failures and HTTP success without a contact ID are never reported as success", async () => {
 const logs = [];
 const original = console.error;
 console.error = (...args) => logs.push(args.join(" "));
 try {
  const unavailable = mockApi();
  unavailable.fetchImpl = async () => {
   throw new Error(`${TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN} sensitive@example.test ${valid().message}`);
  };
  const failed = await request(valid(), {}, mockHandler(unavailable));
  assert.equal(failed.status, 502);
  assert.equal(failed.body.success, false);

  const unconfirmed = mockApi();
  const standardFetch = unconfirmed.fetchImpl;
  unconfirmed.fetchImpl = async (url, options) => {
   if (new URL(url).pathname === "/contacts/upsert") {
    return jsonResponse({ message: "accepted without a contact reference" }, 202);
   }
   return standardFetch(url, options);
  };
  const response = await request(valid(), {}, mockHandler(unconfirmed));
  assert.equal(response.status, 502);
  assert.equal(response.body.success, false);
  assert.equal(JSON.stringify(logs).includes(TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN), false);
  assert.equal(JSON.stringify(logs).includes("sensitive@example.test"), false);
 } finally {
  console.error = original;
 }
});

test("API timeout returns a controlled failure without logging the token or request body", async () => {
 const api = mockApi({ delayUntilAbort: true });
 const logs = [];
 const original = console.error;
 console.error = (...args) => logs.push(args.join(" "));
 try {
  const result = await request(valid(), {}, mockHandler(api, TEST_ENV, 10));
  assert.equal(result.status, 504);
  assert.equal(result.body.code, "delivery_timeout");
  assert.equal(result.body.success, false);
  assert.equal(JSON.stringify(result).includes(TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN), false);
  assert.equal(JSON.stringify(logs).includes(TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN), false);
 } finally {
  console.error = original;
 }
});

test("custom source and interest values are fixed server mappings, not client supplied values", async () => {
 const api = mockApi();
 await request({ ...valid(), leadSource: "Facebook", leadSourceDetail: "Injected" }, {}, mockHandler(api));
 const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
 assert.equal(field(create.body, "source-id"), "Website");
 assert.equal(field(create.body, "detail-id"), "Probetraining");
 assert.equal(mapCampaignDetail({ requestType: "employer_referral", interests: [] }), "Firmenfitness Empfehlung");
 assert.equal(mapCampaignDetail({ requestType: "employer_inquiry", interests: [] }), "Firmenfitness");
});

test("message text is not trimmed by either server-side request contract", () => {
 const regular = validateContact(valid());
 const referral = validateContact(firmFitnessInput("employer_referral", { message: "\n  Bitte Rückruf.  \n" }));
 assert.equal(regular.lead.message, valid().message);
 assert.equal(referral.lead.message, "\n  Bitte Rückruf.  \n");
});

test("optional attribution is validated but is not invented or forwarded as contact data", async () => {
 const lead = validateContact(valid());
 assert.equal(lead.valid, true);
 for (const fieldName of Object.keys(ATTRIBUTION_LIMITS)) assert.equal(lead.lead[fieldName], null);
 const api = mockApi();
 await request(valid(), {}, mockHandler(api));
 const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
 assert.equal("utmCampaign" in create.body, false);
 assert.equal("leadSourceDetail" in create.body, false);
});

test("attribution boundaries, invalid URLs and invalid submission IDs remain rejected", () => {
 for (const [key, max] of Object.entries(ATTRIBUTION_LIMITS)) {
  const boundary = key === "landingPage" || key === "referrer"
   ? "https://example.invalid/" + "x".repeat(max - "https://example.invalid/".length)
   : "x".repeat(max);
  assert.equal(validateContact({ ...valid(), [key]: boundary }).valid, true, key);
  assert.equal(validateContact({ ...valid(), [key]: "x".repeat(max + 1) }).valid, false, key);
  assert.equal(validateContact({ ...valid(), [key]: {} }).valid, false, key);
  assert.equal(validateContact({ ...valid(), [key]: "bad\nvalue" }).valid, false, key);
 }
 for (const url of ["******example.invalid", "https://example.invalid/?email=private", "https://example.invalid/#private"]) {
  assert.equal(validateContact({ ...valid(), referrer: url }).valid, false);
 }
 assert.equal(validateContact({ ...valid(), submissionId: "invalid" }).valid, false);
});

test("the browser has no HighLevel configuration, and firm forms require confirmed success", () => {
 const browserCode = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
 const firmBrowserCode = fs.readFileSync(path.join(__dirname, "../firmenfitness.js"), "utf8");
 assert.equal(/HIGHLEVEL_|highlevel|webhook/i.test(browserCode + firmBrowserCode), false);
 assert.match(firmBrowserCode, /response\.ok && result\?\.success === true/);
});
