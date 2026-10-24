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
 { id: "legacy-interest-id", name: "Interesse / Anliegen", model: "contact", dataType: "SINGLE_OPTIONS", picklistOptions: interestOptions },
 { id: "interest-id", name: "Interesse / Anliegen (Mehrfach)", model: "contact", dataType: "MULTIPLE_OPTIONS", picklistOptions: interestOptions },
 { id: "location-id", name: "Standort", model: "contact", dataType: "TEXT", picklistOptions: [] },
 { id: "size-id", name: "Beschäftigtengröße", model: "contact", dataType: "SINGLE_OPTIONS", picklistOptions: ["1-9", "10-49", "50-249", "250+"] },
 { id: "offer-id", name: "Bestehendes Firmenfitness-Angebot", model: "contact", dataType: "SINGLE_OPTIONS", picklistOptions: ["Ja", "Nein", "Nicht sicher"] },
 { id: "p04-submission-id", name: "P04 Anfrage-ID", model: "contact", dataType: "TEXT", picklistOptions: [] }
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
 const contacts = existingContacts.map(contact => ({
  ...contact,
  customFields: Array.isArray(contact.customFields) ? contact.customFields.map(field => ({ ...field })) : []
 }));
 const mergeContact = (contact, body) => {
  const fields = new Map(contact.customFields.map(field => [field.id, field]));
  for (const fieldValue of body.customFields || []) {
   fields.set(fieldValue.id, { id: fieldValue.id, value: fieldValue.field_value });
  }
  Object.assign(contact, body, { customFields: [...fields.values()] });
 };
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
   const matches = contacts.filter(contact => contact.email === query || contact.phone === query);
   return jsonResponse({ contacts: matches.map(({ id }) => ({ id })), count: matches.length });
  }
  const contactMatch = parsed.pathname.match(/^\/contacts\/([^/]+)$/);
  if (contactMatch && method === "GET") {
   const found = contacts.find(contact => contact.id === decodeURIComponent(contactMatch[1]));
   return found ? jsonResponse({ contact: found }) : jsonResponse({ message: "not found" }, 404);
  }
  if (contactMatch && method === "PUT") {
   const id = decodeURIComponent(contactMatch[1]);
   const contact = contacts.find(value => value.id === id);
   if (!contact) return jsonResponse({ message: "not found" }, 404);
   mergeContact(contact, options.body ? JSON.parse(options.body) : {});
   return jsonResponse({ contact: { id } });
  }
  if (parsed.pathname === "/contacts/upsert" && method === "POST") {
   const body = options.body ? JSON.parse(options.body) : {};
   const contact = { id: "created-contact-id", customFields: [] };
   mergeContact(contact, body);
   contacts.push(contact);
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

function childcareInput(overrides = {}) {
 return {
  schemaVersion: 1, requestType: "childcare_inquiry", sourcePage: "Kinderbetreuung",
  firstName: "Erika", lastName: "Muster", email: "erika@example.test", phone: "0431 54020",
  message: "", callbackRequested: false, privacyAccepted: true, marketingConsent: false,
  website: "", landingPage: "https://kiels.example/kinderbetreuung.html",
  utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "familienfitness",
  submissionId: "d473b2c0-a213-48fa-a17c-f13b4cddae87",
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
 assert.deepEqual(missing.missing, ["Interesse / Anliegen (Mehrfach)"]);
 const missingP04 = checkFieldDefinitions(customFields.filter(item => item.id !== "p04-submission-id"));
 assert.equal(missingP04.ready, false);
 assert.deepEqual(missingP04.missing, ["P04 Anfrage-ID"]);
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
 assert.equal(field(create.body, "legacy-interest-id"), undefined);
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

test("childcare campaign captures attribution and separate consent without triggering automation", async () => {
 const api = mockApi();
 const before = Date.now();
 const result = await request(childcareInput(), {}, mockHandler(api));
 assert.equal(result.status, 200);
 const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
 assert.equal(create.body.createNewIfDuplicateAllowed, false);
 assert.equal(create.body.source, "Website");
 assert.equal(field(create.body, "detail-id"), "KIELS-P04-FAMILIENFITNESS");
 const message = field(create.body, "message-id");
 assert.match(message, /Betreuungsinteresse: Kinderbetreuung/);
 assert.match(message, /Kampagne: KIELS-P04-FAMILIENFITNESS/);
 assert.match(message, /Landingpage: https:\/\/kiels\.example\/kinderbetreuung\.html/);
 assert.match(message, /UTM Source: facebook/);
 assert.match(message, /UTM Medium: paid_social/);
 assert.match(message, /UTM Campaign: familienfitness/);
 assert.match(message, /Datenschutzhinweis bestätigt: Ja/);
 assert.match(message, /Werbeeinwilligung: Nein/);
 assert.equal(field(create.body, "p04-submission-id"), childcareInput().submissionId);
 const submittedAt = message.match(/Zeitpunkt: (.+)/)[1];
 assert.ok(Date.parse(submittedAt) >= before);
 assert.equal(api.calls.some(call => /opportun|workflow|message|email|sms|calendar/i.test(call.url.pathname)), false);
});

test("an identical childcare retry is acknowledged without a second contact write", async () => {
 const api = mockApi();
 const handler = mockHandler(api);
 const input = childcareInput();
 assert.equal((await request(input, {}, handler)).status, 200);
 assert.equal((await request(input, {}, handler)).status, 200);
 const writes = api.calls.filter(call => call.method === "PUT" || call.url.pathname === "/contacts/upsert");
 assert.equal(writes.length, 1);
 assert.equal(writes[0].url.pathname, "/contacts/upsert");
});

test("a new childcare request for the same contact updates once with a new request id", async () => {
 const api = mockApi();
 const handler = mockHandler(api);
 assert.equal((await request(childcareInput(), {}, handler)).status, 200);
 const nextSubmissionId = "44f1c2f0-8fd6-48e8-99f0-b1180f7f5dd0";
 assert.equal((await request(childcareInput({
  submissionId: nextSubmissionId,
  message: "Neue Anfrage für einen anderen Trainingstag."
 }), {}, handler)).status, 200);
 const writes = api.calls.filter(call => call.method === "PUT" || call.url.pathname === "/contacts/upsert");
 assert.equal(writes.length, 2);
 assert.equal(writes[0].url.pathname, "/contacts/upsert");
 assert.equal(writes[1].method, "PUT");
 assert.equal(field(writes[1].body, "p04-submission-id"), nextSubmissionId);
});

test("P04 request id is required only for childcare delivery", async () => {
 const definitions = customFields.filter(item => item.id !== "p04-submission-id");
 const api = mockApi();
 const standardFetch = api.fetchImpl;
 api.fetchImpl = async (url, options) => {
  if (new URL(url).pathname.endsWith("/customFields")) {
   api.calls.push({ url: new URL(url), method: "GET", options, body: null });
   return jsonResponse({ customFields: definitions });
  }
  return standardFetch(url, options);
 };
 assert.equal((await request(valid(), {}, mockHandler(api))).status, 200);
 const childcareResult = await request(childcareInput(), {}, mockHandler(api));
 assert.equal(childcareResult.status, 502);
 assert.equal(childcareResult.body.code, "delivery_failed");
});

test("childcare campaign updates an exact contact and validates consent server-side", async () => {
 const existing = { id: "family-contact", email: "erika@example.test", phone: "+4943154020" };
 const api = mockApi({ existingContacts: [existing] });
 const result = await request(childcareInput({ marketingConsent: true }), {}, mockHandler(api));
 assert.equal(result.status, 200);
 const update = api.calls.find(call => call.method === "PUT" && call.url.pathname.endsWith(existing.id));
 assert.ok(update);
 assert.match(field(update.body, "message-id"), /Werbeeinwilligung: Ja/);
 assert.equal(api.calls.some(call => call.url.pathname === "/contacts/upsert"), false);
 for (const [key, value] of [
  ["privacyAccepted", false],
  ["marketingConsent", "false"],
  ["sourcePage", "Kontakt"],
  ["requestType", "unknown"]
 ]) {
  const invalid = await request(childcareInput({ [key]: value }));
  assert.equal(invalid.status, 400, key);
  assert.ok(invalid.body.errors[key], key);
 }
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

test("firm-fitness fields write only the confirmed size and offer options", async () => {
 for (const employeeSize of ["1-9", "10-49", "50-249", "250+"]) {
  for (const [existingOffer, expected] of [["yes", "Ja"], ["no", "Nein"], ["unsure", "Nicht sicher"]]) {
   const api = mockApi();
   const result = await request(firmFitnessInput("employer_inquiry", {
    employeeSize, existingOffer
   }), {}, mockHandler(api));
   assert.equal(result.status, 200);
   const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
   assert.equal(field(create.body, "size-id"), employeeSize);
   assert.equal(field(create.body, "offer-id"), expected);
   assert.equal(field(create.body, "legacy-interest-id"), undefined);
  }
 }
 for (const [id, options] of [
  ["size-id", ["1-9", "10-49", "50-249", "250 oder mehr"]],
  ["size-id", ["1–9", "10-49", "50-249", "250+"]],
  ["offer-id", ["Yes", "No", "Unsure"]]
 ]) {
  const definitions = customFields.map(item => item.id === id ? { ...item, picklistOptions: options } : item);
  const checked = checkFieldDefinitions(definitions);
  assert.equal(checked.ready, false);
  assert.ok(checked.incompatible.some(item => item.name === definitions.find(item => item.id === id).name));
 }
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

test("missing contact permissions fail without success or follow-up writes", async () => {
 const searchDenied = mockApi({ failureAt: "/contacts/", failureStatus: 403 });
 const searchResult = await request(childcareInput(), {}, mockHandler(searchDenied));
 assert.equal(searchResult.status, 502);
 assert.equal(searchResult.body.code, "delivery_failed");
 assert.equal(searchDenied.calls.some(call => call.method === "PUT" || call.url.pathname === "/contacts/upsert"), false);

 const writeDenied = mockApi({ failureAt: "/contacts/upsert", failureStatus: 403 });
 const writeResult = await request(childcareInput(), {}, mockHandler(writeDenied));
 assert.equal(writeResult.status, 502);
 assert.equal(writeResult.body.code, "delivery_failed");
 assert.equal(writeDenied.calls.filter(call => call.url.pathname === "/contacts/upsert").length, 1);
 assert.equal(writeDenied.calls.some(call => /workflow|opportun|message|email|sms/i.test(call.url.pathname)), false);
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
 assert.equal(mapCampaignDetail({ requestType: "childcare_inquiry", interests: [] }), "KIELS-P04-FAMILIENFITNESS");
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

// AW-20261024-GE-CLAUDE-KIELS-LEAD-INTEGRATION-008: Lead-Ereignisfelder und Workflow-Start je angenommener Anfrage.
const { EVENT_FIELDS, EVENT_STATUS, mapRequestType } = require("../lib/highlevel");
const eventFieldDefinitions = [
 { id: "event-request-id", name: EVENT_FIELDS.requestId, model: "contact", dataType: "TEXT", picklistOptions: [] },
 { id: "event-type-id", name: EVENT_FIELDS.requestType, model: "contact", dataType: "TEXT", picklistOptions: [] },
 { id: "event-time-id", name: EVENT_FIELDS.submittedAt, model: "contact", dataType: "TEXT", picklistOptions: [] },
 { id: "event-page-id", name: EVENT_FIELDS.sourcePage, model: "contact", dataType: "TEXT", picklistOptions: [] },
 { id: "event-status-id", name: EVENT_FIELDS.status, model: "contact", dataType: "TEXT", picklistOptions: [] }
];
const WORKFLOW_ENV = { ...TEST_ENV, HIGHLEVEL_WEBSITE_WORKFLOW_ID: "wf-website-anfrage-0001" };
const REQUEST_ID = "7b0f7a52-1c1e-4c43-9a55-2f8d1f3f6a10";

function mockEventApi({ definitions = [...customFields, ...eventFieldDefinitions], workflowStatus = 200, workflowBody = { succeeded: true }, workflowHangs = false, ...options } = {}) {
 const api = mockApi(options);
 const standardFetch = api.fetchImpl;
 api.workflowCalls = () => api.calls.filter(call => /\/workflow\//.test(call.url.pathname));
 api.fetchImpl = async (url, requestOptions) => {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith("/customFields")) {
   api.calls.push({ url: parsed, method: "GET", options: requestOptions, body: null });
   return jsonResponse({ customFields: definitions });
  }
  if (/^\/contacts\/[^/]+\/workflow\/[^/]+$/.test(parsed.pathname)) {
   api.calls.push({ url: parsed, method: requestOptions.method, options: requestOptions, body: JSON.parse(requestOptions.body) });
   if (workflowHangs) {
    return new Promise((resolve, reject) => requestOptions.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
   }
   return jsonResponse(workflowBody, workflowStatus);
  }
  return standardFetch(url, requestOptions);
 };
 return api;
}

function contactWrites(api) {
 return api.calls.filter(call => call.url.pathname === "/contacts/upsert" || (call.method === "PUT" && field(call.body, "event-request-id") !== undefined));
}

async function captureLogs(run) {
 const logs = [];
 const original = { error: console.error, info: console.info };
 console.error = (...args) => logs.push(args.join(" "));
 console.info = (...args) => logs.push(args.join(" "));
 try { return { result: await run(), logs }; }
 finally { console.error = original.error; console.info = original.info; }
}

test("readiness reports optional lead event fields and workflow configuration without changing core readiness", async () => {
 const core = checkFieldDefinitions(customFields);
 assert.equal(core.ready, true);
 assert.equal(core.events.ready, false);
 assert.deepEqual(core.events.missing, Object.values(EVENT_FIELDS));
 const full = checkFieldDefinitions([...customFields, ...eventFieldDefinitions]);
 assert.equal(full.events.ready, true);
 const wrongType = checkFieldDefinitions([...customFields, ...eventFieldDefinitions.slice(1),
  { ...eventFieldDefinitions[0], dataType: "SINGLE_OPTIONS", picklistOptions: ["x"] }]);
 assert.equal(wrongType.events.ready, false);
 assert.equal(wrongType.events.incompatible[0].reason, "event_field_type");
 const readiness = await checkHighLevelReadiness({
  env: WORKFLOW_ENV,
  fetchImpl: async () => jsonResponse({ customFields: [...customFields, ...eventFieldDefinitions] })
 });
 assert.equal(readiness.status, 200);
 assert.deepEqual(readiness.body.workflow, { configured: true, valid: true, ready: true });
 assert.equal(JSON.stringify(readiness.body).includes(WORKFLOW_ENV.HIGHLEVEL_WEBSITE_WORKFLOW_ID), false);
 const unconfigured = await checkHighLevelReadiness({ env: TEST_ENV, fetchImpl: async () => jsonResponse({ customFields }) });
 assert.deepEqual(unconfigured.body.workflow, { configured: false, valid: false, ready: false });
});

test("all four request types write a stable lead event and map type, origin and time", async () => {
 const cases = [
  [{ ...valid(), interests: ["courses"], submissionId: REQUEST_ID }, "Kontakt", "Fitness"],
  [{ ...valid(), submissionId: REQUEST_ID }, "Probetraining", "Fitness"],
  [firmFitnessInput("employer_inquiry", { submissionId: REQUEST_ID }), "Firmenfitness", "Firmenfitness"],
  [firmFitnessInput("employer_referral", { submissionId: REQUEST_ID }), "Firmenfitness Empfehlung", "Arbeitgeberempfehlen"],
  [childcareInput({ submissionId: REQUEST_ID }), "Kinderbetreuung", "Kinderbetreuung"]
 ];
 for (const [input, type, page] of cases) {
  const api = mockEventApi();
  const before = Date.now();
  const { result } = await captureLogs(() => request(input, {}, mockHandler(api)));
  assert.equal(result.status, 200, type);
  const create = api.calls.find(call => call.url.pathname === "/contacts/upsert");
  assert.equal(field(create.body, "event-request-id"), REQUEST_ID, type);
  assert.equal(field(create.body, "event-type-id"), type);
  assert.equal(field(create.body, "event-page-id"), page);
  assert.equal(field(create.body, "event-status-id"), EVENT_STATUS.accepted);
  assert.ok(Date.parse(field(create.body, "event-time-id")) >= before - 1000, type);
  assert.equal(api.workflowCalls().length, 0, `${type}: ohne Workflow-ID kein Workflow-Start`);
 }
 assert.equal(mapRequestType({ interests: [] }), "Kontakt");
});

test("a configured workflow is started exactly once per accepted request and marked as started", async () => {
 const api = mockEventApi();
 const { result, logs } = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(api, WORKFLOW_ENV)));
 assert.equal(result.status, 200);
 const [start] = api.workflowCalls();
 assert.equal(api.workflowCalls().length, 1);
 assert.equal(start.method, "POST");
 assert.equal(start.url.pathname, "/contacts/created-contact-id/workflow/wf-website-anfrage-0001");
 assert.equal(start.options.headers.Version, "2021-07-28");
 assert.ok(Date.parse(start.body.eventStartTime));
 const statusWrite = api.calls.find(call => call.method === "PUT" && field(call.body, "event-status-id") === EVENT_STATUS.started);
 assert.ok(statusWrite, "Status 'Workflow gestartet' fehlt");
 assert.deepEqual(Object.keys(statusWrite.body), ["customFields"]);
 assert.ok(logs.some(line => line.includes('"outcome":"workflow_started"')));
 const custom = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(mockEventApi(), { ...WORKFLOW_ENV, HIGHLEVEL_WORKFLOW_API_VERSION: "v3" })));
 assert.equal(custom.result.status, 200);
});

test("an identical retry of every request type writes nothing twice and does not restart the workflow", async () => {
 for (const input of [{ ...valid(), submissionId: REQUEST_ID }, firmFitnessInput("employer_inquiry", { submissionId: REQUEST_ID }), childcareInput({ submissionId: REQUEST_ID })]) {
  const api = mockEventApi();
  const handler = mockHandler(api, WORKFLOW_ENV);
  await captureLogs(async () => {
   assert.equal((await request(input, {}, handler)).status, 200);
   assert.equal((await request(input, {}, handler)).status, 200);
  });
  assert.equal(contactWrites(api).length, 1);
  assert.equal(api.workflowCalls().length, 1);
 }
});

test("a new request of the same contact updates once and starts the workflow again", async () => {
 const api = mockEventApi();
 const handler = mockHandler(api, WORKFLOW_ENV);
 await captureLogs(async () => {
  await request({ ...valid(), submissionId: REQUEST_ID }, {}, handler);
  await request({ ...valid(), message: "Zweite Anfrage.", submissionId: "0a4c2d5e-6f70-4b81-9c92-a3b4c5d6e7f8" }, {}, handler);
 });
 assert.equal(contactWrites(api).length, 2);
 assert.equal(api.workflowCalls().length, 2);
});

test("a failed workflow start keeps the lead, marks the contact and is resumed by the identical retry", async () => {
 const failing = mockEventApi({ workflowStatus: 500, workflowBody: { message: "unit-test-token sensitive@example.test" } });
 const handler = mockHandler(failing, WORKFLOW_ENV);
 const first = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, handler));
 assert.equal(first.result.status, 200, "Anfrage ist gespeichert und wird bestaetigt");
 assert.ok(failing.calls.some(call => call.method === "PUT" && field(call.body, "event-status-id") === EVENT_STATUS.failed));
 assert.ok(first.logs.some(line => line.includes('"outcome":"workflow_failed"') && line.includes('"httpStatus":500')));
 for (const secret of [TEST_ENV.HIGHLEVEL_PRIVATE_TOKEN, "sensitive@example.test", "erika@example.test", "Erika", "+4943154020", valid().message.trim()]) {
  assert.equal(first.logs.join("\n").includes(secret), false, secret);
 }
 const resumedApi = mockEventApi({ existingContacts: [{
  id: "existing-contact-id", email: "erika@example.test", phone: "+4943154020",
  customFields: [{ id: "event-request-id", value: REQUEST_ID }, { id: "event-status-id", value: EVENT_STATUS.failed }]
 }] });
 const resumed = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(resumedApi, WORKFLOW_ENV)));
 assert.equal(resumed.result.status, 200);
 assert.equal(contactWrites(resumedApi).length, 0, "kein zweiter Kontakt-Schreibvorgang");
 assert.equal(resumedApi.workflowCalls().length, 1, "Workflow wird genau einmal nachgeholt");
 assert.ok(resumed.logs.some(line => line.includes('"outcome":"duplicate_resume_workflow"')));
});

test("an unconfirmed or timed-out workflow start is never reported as started", async () => {
 const unconfirmed = mockEventApi({ workflowBody: { succeeded: false } });
 await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(unconfirmed, WORKFLOW_ENV)));
 assert.equal(unconfirmed.calls.some(call => call.method === "PUT" && field(call.body, "event-status-id") === EVENT_STATUS.started), false);
 assert.ok(unconfirmed.calls.some(call => call.method === "PUT" && field(call.body, "event-status-id") === EVENT_STATUS.failed));

 const hanging = mockEventApi({ workflowHangs: true });
 const { result, logs } = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(hanging, WORKFLOW_ENV, 200)));
 assert.equal(result.status, 200, "Kontakt war bereits bestaetigt gespeichert");
 assert.equal(hanging.calls.some(call => call.method === "PUT" && field(call.body, "event-status-id") === EVENT_STATUS.started), false);
 assert.ok(logs.some(line => line.includes('"outcome":"workflow_failed"') && line.includes('"stage":"timeout"')));
});

test("an already started workflow is not restarted when the identical request arrives again", async () => {
 const api = mockEventApi({ existingContacts: [{
  id: "existing-contact-id", email: "erika@example.test", phone: "+4943154020",
  customFields: [{ id: "event-request-id", value: REQUEST_ID }, { id: "event-status-id", value: EVENT_STATUS.started }]
 }] });
 const { result } = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(api, WORKFLOW_ENV)));
 assert.equal(result.status, 200);
 assert.equal(contactWrites(api).length, 0);
 assert.equal(api.workflowCalls().length, 0);
});

test("missing or partial event fields and an invalid workflow id never start a workflow but keep the lead", async () => {
 const partial = mockEventApi({ definitions: [...customFields, ...eventFieldDefinitions.slice(0, 4)] });
 const partialRun = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(partial, WORKFLOW_ENV)));
 assert.equal(partialRun.result.status, 200);
 const create = partial.calls.find(call => call.url.pathname === "/contacts/upsert");
 assert.equal(field(create.body, "event-request-id"), undefined, "keine halben Ereignisse");
 assert.equal(partial.workflowCalls().length, 0);
 assert.ok(partialRun.logs.some(line => line.includes('"stage":"event_fields_missing"')));

 const invalid = mockEventApi();
 const invalidRun = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(invalid, { ...WORKFLOW_ENV, HIGHLEVEL_WEBSITE_WORKFLOW_ID: "../../contacts" })));
 assert.equal(invalidRun.result.status, 200);
 assert.equal(invalid.workflowCalls().length, 0);
 assert.ok(invalidRun.logs.some(line => line.includes('"outcome":"workflow_misconfigured"')));
});

test("rejected, ambiguous and failed contact writes never start a workflow", async () => {
 const rejected = mockEventApi();
 await captureLogs(() => request({ ...valid(), email: "invalid", submissionId: REQUEST_ID }, {}, mockHandler(rejected, WORKFLOW_ENV)));
 assert.equal(rejected.calls.length, 0);
 const writeFailed = mockEventApi({ failureAt: "/contacts/upsert", failureStatus: 503 });
 const failed = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(writeFailed, WORKFLOW_ENV)));
 assert.equal(failed.result.status, 502);
 assert.equal(writeFailed.workflowCalls().length, 0);
 assert.ok(failed.logs.some(line => line.includes('"outcome":"delivery_failed"') && line.includes('"stage":"contact_upsert"')));
 const ambiguous = mockEventApi({ existingContacts: [
  { id: "contact-a", email: "erika@example.test" }, { id: "contact-b", phone: "+4943154020" }
 ] });
 const ambiguousRun = await captureLogs(() => request({ ...valid(), submissionId: REQUEST_ID }, {}, mockHandler(ambiguous, WORKFLOW_ENV)));
 assert.equal(ambiguousRun.result.status, 502);
 assert.equal(ambiguous.workflowCalls().length, 0);
});

test("firm forms keep one request id for identical retries and no longer claim to be a local preview", () => {
 const firmBrowserCode = fs.readFileSync(path.join(__dirname, "../firmenfitness.js"), "utf8");
 assert.match(firmBrowserCode, /form\.pendingSubmission\.fingerprint !== fingerprint/);
 assert.match(firmBrowserCode, /form\.pendingSubmission = null;/);
 assert.doesNotMatch(firmBrowserCode, /lokale(n)? Vorschau/);
});
