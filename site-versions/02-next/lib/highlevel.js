const API_BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";
const CHILDCARE_CAMPAIGN = "KIELS-P04-FAMILIENFITNESS";
const CHILDCARE_SUBMISSION_FIELD = "P04 Anfrage-ID";
// Lead-Ereignis je angenommener Website-Anfrage (AW-20261024-GE-CLAUDE-KIELS-LEAD-INTEGRATION-008).
// Nur technische, nicht personenbezogene Werte; Kontaktdaten bleiben ausschliesslich in HighLevel.
// Die Felder sind optional: Fehlen sie, bleibt das bisherige Verhalten unveraendert.
const EVENT_FIELDS = {
 requestId: "Website Anfrage-ID",
 requestType: "Website Anfrageart",
 submittedAt: "Website Anfrage-Zeitpunkt",
 sourcePage: "Website Herkunftsseite",
 status: "Website Anfrage-Status"
};
const EVENT_STATUS = {
 accepted: "angenommen",
 started: "Workflow gestartet",
 failed: "Workflow fehlgeschlagen"
};
const REQUEST_TYPE_LABELS = ["Kontakt", "Probetraining", "Firmenfitness", "Firmenfitness Empfehlung", "Kinderbetreuung"];
const WORKFLOW_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const INTEREST_LABELS = {
 trial: "Probetraining",
 membership: "Mitgliedschaft & Tarife",
 courses: "Kurse",
 health: "Gesundheit & Körperanalyse",
 wellness: "Sauna & Wellness",
 "existing-membership": "Bestehende Mitgliedschaft",
 other: "Sonstiges"
};

const RESULT = {
 delivery_not_configured: {
  status: 503,
  message: "Der Formularversand ist momentan nicht verfügbar. Es wurde nichts bestätigt. Bitte kontaktiere KIELS telefonisch oder per E-Mail."
 },
 delivery_timeout: {
  status: 504,
  message: "Die Bestätigung deiner Anfrage hat zu lange gedauert. Bitte kontaktiere KIELS telefonisch oder per E-Mail, bevor du die Anfrage erneut sendest."
 },
 delivery_failed: {
  status: 502,
  message: "Deine Anfrage konnte nicht bestätigt werden. Deine Eingaben bleiben erhalten. Bitte kontaktiere KIELS telefonisch oder per E-Mail."
 },
 delivery_success: {
  status: 200,
  message: "Vielen Dank für deine Nachricht. Deine Anfrage wurde an KIELS übermittelt."
 }
};

class IntegrationError extends Error {
 constructor(stage, status) {
  super(stage);
  this.stage = stage;
  this.status = status;
 }
}

function deliveryResult(code) {
 return {
  status: RESULT[code].status,
  body: { success: code === "delivery_success", code, message: RESULT[code].message }
 };
}

function normalizeLabel(value) {
 return String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");
}

function responseObject(value) {
 if (!value || typeof value !== "object" || Array.isArray(value)) {
  throw new IntegrationError("invalid_response");
 }
 return value;
}

function getContactId(value) {
 const body = responseObject(value);
 const id = body.contact?.id ?? body.id;
 if (typeof id !== "string" || !id) throw new IntegrationError("contact_not_confirmed");
 return id;
}

function mapCampaignDetail(lead) {
 if (lead.requestType === "childcare_inquiry") return CHILDCARE_CAMPAIGN;
 if (lead.requestType === "employer_referral") return "Firmenfitness Empfehlung";
 if (lead.requestType === "employer_inquiry") return "Firmenfitness";
 return lead.interests.includes("trial") ? "Probetraining" : "Kontaktformular";
}

function mapRequestType(lead) {
 if (lead.requestType === "childcare_inquiry") return "Kinderbetreuung";
 if (lead.requestType === "employer_referral") return "Firmenfitness Empfehlung";
 if (lead.requestType === "employer_inquiry") return "Firmenfitness";
 return lead.interests.includes("trial") ? "Probetraining" : "Kontakt";
}

// Strukturierte Betriebsprotokolle ohne Kontaktdaten: Anfrage-ID (UUID), Anfrageart, Stufe, Ergebnis.
function logLeadEvent(level, outcome, lead, details = {}) {
 const entry = {
  event: "kiels.lead",
  outcome,
  requestId: typeof lead?.submissionId === "string" ? lead.submissionId : null,
  requestType: lead ? mapRequestType(lead) : null,
  ...details
 };
 (level === "error" ? console.error : console.info)(JSON.stringify(entry));
}

function childcareMessage(lead) {
 const lines = [
  lead.message ? `Anfrage: ${lead.message}` : "Anfrage: KIELS mit Kinderbetreuung kennenlernen",
  "Betreuungsinteresse: Kinderbetreuung",
  `Kampagne: ${CHILDCARE_CAMPAIGN}`,
  `Quelle: ${lead.leadSource}`,
  `Landingpage: ${lead.landingPage || "nicht übermittelt"}`,
  `UTM Source: ${lead.utmSource || "nicht übermittelt"}`,
  `UTM Medium: ${lead.utmMedium || "nicht übermittelt"}`,
  `UTM Campaign: ${lead.utmCampaign || "nicht übermittelt"}`,
  `UTM Content: ${lead.utmContent || "nicht übermittelt"}`,
  `UTM Term: ${lead.utmTerm || "nicht übermittelt"}`,
  `Zeitpunkt: ${lead.submittedAt}`,
  "Datenschutzhinweis bestätigt: Ja",
  `Werbeeinwilligung: ${lead.marketingConsent ? "Ja" : "Nein"}`
 ];
 return lines.join("\n");
}

function customFieldDefinition(definitions, name) {
 const expected = normalizeLabel(name);
 const matches = definitions.filter(field =>
  field?.model !== "opportunity" &&
  [field?.name, field?.fieldKey?.replace(/^contact\./, "")].some(value => normalizeLabel(value) === expected)
 );
 if (matches.length !== 1 || typeof matches[0].id !== "string" || !matches[0].id) {
  throw new IntegrationError("custom_field_unavailable");
 }
 return matches[0];
}

function findChoice(field, aliases) {
 const options = Array.isArray(field.picklistOptions) ? field.picklistOptions : [];
 if (!options.length) return null;
 const choices = options.filter(option => aliases.some(alias => normalizeLabel(option) === normalizeLabel(alias)));
 if (choices.length !== 1) throw new IntegrationError("custom_field_option_unavailable");
 return choices[0];
}

function customFieldValue(field, value, aliases = [value]) {
 const dataType = String(field.dataType || "").toUpperCase();
 const options = Array.isArray(field.picklistOptions) ? field.picklistOptions : [];
 const multiValue = dataType === "MULTIPLE_OPTIONS" || dataType === "CHECKBOX";
 const values = Array.isArray(value) ? value : [value];
 if (!values.length || values.some(item => typeof item !== "string" || !item)) {
  throw new IntegrationError("custom_field_value_unavailable");
 }
 if (!multiValue && values.length > 1) {
  if (dataType === "SINGLE_OPTIONS" || dataType === "RADIO" || options.length) {
   throw new IntegrationError("custom_field_multiple_selection_unsupported");
  }
  if (dataType === "TEXT" || dataType === "LARGE_TEXT") {
   return { id: field.id, field_value: values.join(", ") };
  }
  throw new IntegrationError("custom_field_multiple_selection_unsupported");
 }
 const resolved = values.map((item, index) => {
  const choicesForItem = Array.isArray(aliases[index]) ? aliases[index] : [aliases[index] ?? item];
  if (options.length) return findChoice(field, choicesForItem);
  if (dataType === "SINGLE_OPTIONS" || dataType === "MULTIPLE_OPTIONS" || dataType === "RADIO" || dataType === "CHECKBOX") {
   throw new IntegrationError("custom_field_options_unavailable");
  }
  return item;
 });
 const fieldValue = multiValue ? resolved : resolved[0];
 return { id: field.id, field_value: fieldValue };
}

function exactOptionValue(field, value) {
 const result = customFieldValue(field, value);
 if (result.field_value !== value) throw new IntegrationError("custom_field_option_unavailable");
 return result;
}

function callbackValue(field, callbackRequested) {
 const dataType = String(field.dataType || "").toUpperCase();
 const aliases = callbackRequested
  ? ["Ja", "Yes", "True", "Erwünscht", "Rückruf erwünscht"]
  : ["Nein", "No", "False", "Nicht erwünscht", "Kein Rückruf"];
 const choice = findChoice(field, aliases);
 if (choice !== null) return customFieldValue(field, choice);
 if (["SINGLE_OPTIONS", "MULTIPLE_OPTIONS", "RADIO", "CHECKBOX"].includes(dataType)) {
  throw new IntegrationError("callback_option_unavailable");
 }
 return customFieldValue(field, callbackRequested ? "Ja" : "Nein");
}

function inspectField(definitions, name) {
 const matches = definitions.filter(field =>
  field?.model !== "opportunity" &&
  [field?.name, field?.fieldKey?.replace(/^contact\./, "")].some(value => normalizeLabel(value) === normalizeLabel(name))
 );
 if (matches.length !== 1) {
  return { name, requestedName: name, found: false, ambiguous: matches.length > 1 };
 }
 const field = matches[0];
 return {
  requestedName: name,
  found: true,
  name: field.name,
  fieldKey: field.fieldKey || null,
  dataType: field.dataType || null,
  options: Array.isArray(field.picklistOptions) ? field.picklistOptions : []
 };
}

function checkFieldDefinitions(definitions) {
 if (!Array.isArray(definitions)) throw new IntegrationError("custom_fields_unavailable");
 const fields = [
  inspectField(definitions, "Lead-Quelle"),
  inspectField(definitions, "Kampagne / Lead-Detail"),
  inspectField(definitions, "Nachricht / Anfrage"),
  inspectField(definitions, "Rückruf erwünscht"),
  inspectField(definitions, "Interesse / Anliegen (Mehrfach)"),
  inspectField(definitions, "Standort"),
  inspectField(definitions, "Beschäftigtengröße"),
  inspectField(definitions, "Bestehendes Firmenfitness-Angebot"),
  inspectField(definitions, CHILDCARE_SUBMISSION_FIELD)
 ];
 const find = name => fields.find(field => field.requestedName === name);
 const requirements = [
  ["Lead-Quelle", field => { customFieldValue(field, "Website"); }],
  ["Kampagne / Lead-Detail", field => {
   for (const value of ["Probetraining", "Kontaktformular", "Firmenfitness", "Firmenfitness Empfehlung", CHILDCARE_CAMPAIGN]) {
    customFieldValue(field, value);
   }
  }],
  ["Nachricht / Anfrage", field => {
   if (!["TEXT", "LARGE_TEXT"].includes(String(field.dataType || "").toUpperCase())) {
    throw new IntegrationError("message_field_type");
   }
  }],
  ["Rückruf erwünscht", field => { callbackValue(field, true); }],
  ["Interesse / Anliegen (Mehrfach)", field => {
   const labels = Object.values(INTEREST_LABELS);
   if (["MULTIPLE_OPTIONS", "CHECKBOX"].includes(String(field.dataType || "").toUpperCase())) {
    customFieldValue(field, labels, labels.map(value => [value]));
   } else if (["TEXT", "LARGE_TEXT"].includes(String(field.dataType || "").toUpperCase()) && !field.picklistOptions?.length) {
    customFieldValue(field, labels);
   } else {
    throw new IntegrationError("interest_field_type");
   }
  }],
  ["Standort", field => {
   if (!["TEXT", "LARGE_TEXT"].includes(String(field.dataType || "").toUpperCase())) {
    throw new IntegrationError("company_location_field_type");
   }
  }],
  ["Beschäftigtengröße", field => {
   for (const value of ["1-9", "10-49", "50-249", "250+"]) exactOptionValue(field, value);
  }],
  ["Bestehendes Firmenfitness-Angebot", field => {
   for (const value of ["Ja", "Nein", "Nicht sicher"]) exactOptionValue(field, value);
  }],
  [CHILDCARE_SUBMISSION_FIELD, field => {
   if (!["TEXT", "LARGE_TEXT"].includes(String(field.dataType || "").toUpperCase())) {
    throw new IntegrationError("childcare_submission_field_type");
   }
  }]
 ];
 for (const [name, validate] of requirements) {
  const field = find(name);
  if (!field?.found) continue;
  try {
   validate(customFieldDefinition(definitions, name));
   field.mapping = "compatible";
  } catch (error) {
   field.mapping = error instanceof IntegrationError ? error.stage : "invalid";
  }
 }
 const eventFields = Object.values(EVENT_FIELDS).map(name => {
  const field = inspectField(definitions, name);
  if (field.found) {
   field.mapping = ["TEXT", "LARGE_TEXT"].includes(String(field.dataType || "").toUpperCase()) ? "compatible" : "event_field_type";
  }
  return field;
 });
 return {
  fields,
  missing: fields.filter(field => !field.found).map(field => field.name),
  incompatible: fields.filter(field => field.found && field.mapping !== "compatible").map(field => ({
   name: field.name,
   reason: field.mapping
  })),
  ready: fields.every(field => field.found && field.mapping === "compatible"),
  events: {
   fields: eventFields,
   missing: eventFields.filter(field => !field.found).map(field => field.name),
   incompatible: eventFields.filter(field => field.found && field.mapping !== "compatible").map(field => ({
    name: field.name,
    reason: field.mapping
   })),
   ready: eventFields.every(field => field.found && field.mapping === "compatible")
  }
 };
}

// Alle fuenf Ereignisfelder oder keines: halbe Ereignisse wuerden Workflow und Dublettenpruefung verfaelschen.
function eventFieldDefinitions(definitions) {
 if (!Array.isArray(definitions)) return null;
 const result = {};
 for (const [key, name] of Object.entries(EVENT_FIELDS)) {
  let field;
  try { field = customFieldDefinition(definitions, name); }
  catch { return null; }
  if (!["TEXT", "LARGE_TEXT"].includes(String(field.dataType || "").toUpperCase())) return null;
  result[key] = field;
 }
 return result;
}

function workflowConfiguration(env) {
 const raw = typeof env.HIGHLEVEL_WEBSITE_WORKFLOW_ID === "string" ? env.HIGHLEVEL_WEBSITE_WORKFLOW_ID.trim() : "";
 const version = typeof env.HIGHLEVEL_WORKFLOW_API_VERSION === "string" && env.HIGHLEVEL_WORKFLOW_API_VERSION.trim()
  ? env.HIGHLEVEL_WORKFLOW_API_VERSION.trim()
  : API_VERSION;
 return { configured: Boolean(raw), valid: WORKFLOW_ID_PATTERN.test(raw), id: raw, version };
}

function customFieldsErrorCategory(status) {
 if (status === 401) return "authentication";
 if (status === 403) return "scope_or_location_access";
 if (status === 404) return "location_or_path_not_found";
 if (status === 429) return "rate_limit";
 if (status >= 500) return "provider_error";
 return "request_rejected";
}

async function logCustomFieldsFailure(response, token, locationId) {
 const diagnostic = {
  operation: "custom_fields_read",
  httpStatus: response.status,
  errorCode: customFieldsErrorCategory(response.status)
 };
 const safeCodes = new Set([
  "UNAUTHORIZED", "FORBIDDEN", "INVALID_TOKEN", "TOKEN_EXPIRED",
  "INSUFFICIENT_SCOPE", "ACCESS_DENIED", "NOT_FOUND", "LOCATION_NOT_FOUND",
  "RATE_LIMIT_EXCEEDED", "TOO_MANY_REQUESTS", "INTERNAL_SERVER_ERROR", "SERVICE_UNAVAILABLE"
 ]);
 const safeMessages = new Set([
  "Unauthorized", "Forbidden", "Invalid token", "Token expired", "Invalid JWT",
  "jwt expired", "Not Found", "Location not found", "Too Many Requests",
  "Internal Server Error", "Service Unavailable",
  "The token is not authorized for this scope.",
  "This token does not have access to this location."
 ]);
 const excludesSecrets = value => typeof value === "string" &&
  !value.includes(token) && !value.includes(locationId);
 const requestId = response.headers?.get("x-request-id") || response.headers?.get("x-correlation-id");
 if (excludesSecrets(requestId) && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) {
  diagnostic.requestId = requestId;
 }
 let reader;
 try {
  if (response.headers?.get("content-type")?.toLowerCase().includes("application/json") && response.body) {
   reader = response.body.getReader();
   const chunks = [];
   let size = 0;
   let complete = false;
   while (size <= 4096) {
    const { value, done } = await reader.read();
    if (done) { complete = true; break; }
    size += value.byteLength;
    if (size <= 4096) chunks.push(Buffer.from(value));
   }
   if (complete) {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body && typeof body === "object" && !Array.isArray(body)) {
     for (const code of [body.code, body.errorCode, body.error]) {
      if (excludesSecrets(code) && safeCodes.has(code)) {
       diagnostic.errorCode += `:${code}`;
       break;
      }
     }
     if (excludesSecrets(body.message) && safeMessages.has(body.message)) {
      diagnostic.message = body.message;
     }
    }
   }
  }
 } catch {
  // Unparseable or interrupted error bodies must not replace the provider status.
 } finally {
  try {
   if (reader) await reader.cancel();
   else if (response.body) await response.body.cancel();
  } catch {
   // Cancellation can fail for an already closed or aborted response stream.
  }
  console.error(JSON.stringify(diagnostic));
 }
}

async function checkHighLevelReadiness({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
 const token = typeof env.HIGHLEVEL_PRIVATE_TOKEN === "string" ? env.HIGHLEVEL_PRIVATE_TOKEN.trim() : "";
 const locationId = typeof env.HIGHLEVEL_LOCATION_ID === "string" ? env.HIGHLEVEL_LOCATION_ID.trim() : "";
 const runtime = { tokenPresent: Boolean(token), locationPresent: Boolean(locationId) };
 if (!token || !locationId || typeof fetchImpl !== "function") {
  return { status: 503, body: { ready: false, runtime, error: "configuration_missing" } };
 }
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), timeoutMs);
 try {
  const response = await fetchImpl(
   `${API_BASE}/locations/${encodeURIComponent(locationId)}/customFields`,
   {
    method: "GET",
    headers: {
     Authorization: `Bearer ${token}`,
     Accept: "application/json",
     Version: API_VERSION
    },
    signal: controller.signal,
    redirect: "error"
   }
  );
  if (controller.signal.aborted) throw new IntegrationError("timeout");
  if (!response.ok) {
   await logCustomFieldsFailure(response, token, locationId);
   return { status: 502, body: { ready: false, runtime, error: "custom_fields_unavailable" } };
  }
  let body;
  try {
   body = responseObject(await response.json());
  } catch {
   console.error("HighLevel readiness check failed.", "invalid_response");
   return { status: 502, body: { ready: false, runtime, error: "invalid_response" } };
  }
  const mapping = checkFieldDefinitions(body.customFields);
  const workflow = workflowConfiguration(env);
  return {
   status: mapping.ready ? 200 : 422,
   body: {
    ready: mapping.ready, runtime, ...mapping,
    // Die Workflow-ID ist keine Zugangsangabe, wird aber nicht ausgegeben; gemeldet wird nur der Konfigurationszustand.
    workflow: {
     configured: workflow.configured,
     valid: workflow.valid,
     ready: workflow.configured && workflow.valid && mapping.events.ready
    }
   }
  };
 } catch (error) {
  const stage = controller.signal.aborted ? "timeout" : error instanceof IntegrationError ? error.stage : "network";
  console.error("HighLevel readiness check failed.", stage);
  return {
   status: stage === "timeout" ? 504 : 502,
   body: { ready: false, runtime, error: stage }
  };
 } finally {
  clearTimeout(timeout);
 }
}

function buildCustomFields(lead, definitions) {
 if (!Array.isArray(definitions)) throw new IntegrationError("custom_fields_unavailable");
 const fields = [];
 const source = customFieldDefinition(definitions, "Lead-Quelle");
 const campaign = customFieldDefinition(definitions, "Kampagne / Lead-Detail");
 fields.push(customFieldValue(source, "Website"));
 fields.push(customFieldValue(campaign, mapCampaignDetail(lead)));
 if (lead.callbackRequested) {
  fields.push(callbackValue(customFieldDefinition(definitions, "Rückruf erwünscht"), true));
 }

 const message = lead.requestType === "childcare_inquiry" ? childcareMessage(lead) : lead.message;
 if (message) {
  fields.push(customFieldValue(customFieldDefinition(definitions, "Nachricht / Anfrage"), message));
 }
 if (lead.interests.length) {
  const interestField = customFieldDefinition(definitions, "Interesse / Anliegen (Mehrfach)");
  const labels = lead.interests.map(value => INTEREST_LABELS[value]);
  if (labels.some(value => !value)) throw new IntegrationError("interest_mapping_unavailable");
  fields.push(customFieldValue(interestField, labels, labels.map(value => [value])));
 }
 if (lead.requestType === "childcare_inquiry") {
  fields.push(customFieldValue(
   customFieldDefinition(definitions, CHILDCARE_SUBMISSION_FIELD),
   lead.submissionId
  ));
 }
 const events = eventFieldDefinitions(definitions);
 if (events) {
  fields.push(customFieldValue(events.requestId, lead.submissionId));
  fields.push(customFieldValue(events.requestType, mapRequestType(lead)));
  fields.push(customFieldValue(events.submittedAt, lead.submittedAt));
  fields.push(customFieldValue(events.sourcePage, lead.sourcePage));
  fields.push(customFieldValue(events.status, EVENT_STATUS.accepted));
 }

 if (lead.requestType?.startsWith("employer_")) {
  if (lead.location) {
   fields.push(customFieldValue(
    customFieldDefinition(definitions, "Standort"),
    lead.location
   ));
  }
  if (lead.employeeSize) {
   fields.push(exactOptionValue(
    customFieldDefinition(definitions, "Beschäftigtengröße"),
    lead.employeeSize
   ));
  }
  if (lead.existingOffer) {
   const choices = {
    yes: "Ja",
    no: "Nein",
    unsure: "Nicht sicher"
   };
   fields.push(exactOptionValue(
    customFieldDefinition(definitions, "Bestehendes Firmenfitness-Angebot"),
    choices[lead.existingOffer]
   ));
  }
 }
 return fields;
}

function normalizePhone(value) {
 if (typeof value !== "string" || !value) return "";
 const digits = value.replace(/\D/g, "");
 if (value.startsWith("+")) return digits;
 if (value.startsWith("00")) return digits.slice(2);
 return "49" + digits.replace(/^0/, "");
}

function exactEmail(contact, email) {
 return typeof contact.email === "string" && contact.email.trim().toLowerCase() === email.toLowerCase();
}

function exactPhone(contact, phone) {
 return typeof contact.phone === "string" && normalizePhone(contact.phone) === normalizePhone(phone);
}

function contactFieldValue(contact, fieldId) {
 if (!Array.isArray(contact.customFields)) return null;
 const field = contact.customFields.find(value => value?.id === fieldId);
 const value = field?.value ?? field?.fieldValue ?? field?.field_value;
 return typeof value === "string" ? value : null;
}

function createHighLevelAdapter({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 12000 } = {}) {
 return async function submitLead(lead) {
  const token = typeof env.HIGHLEVEL_PRIVATE_TOKEN === "string" ? env.HIGHLEVEL_PRIVATE_TOKEN.trim() : "";
  const locationId = typeof env.HIGHLEVEL_LOCATION_ID === "string" ? env.HIGHLEVEL_LOCATION_ID.trim() : "";
  if (!token || !locationId || typeof fetchImpl !== "function") return deliveryResult("delivery_not_configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
   Authorization: `Bearer ${token}`,
   "Content-Type": "application/json",
   Accept: "application/json",
   Version: API_VERSION
  };
  const workflow = workflowConfiguration(env);
  const request = async (path, { method = "GET", body, version } = {}, stage) => {
   let response;
   try {
    response = await fetchImpl(`${API_BASE}${path}`, {
     method, headers: version ? { ...headers, Version: version } : headers,
     body: body === undefined ? undefined : JSON.stringify(body),
     signal: controller.signal, redirect: "error"
    });
   } catch {
    throw new IntegrationError(controller.signal.aborted ? "timeout" : stage);
   }
   if (controller.signal.aborted) throw new IntegrationError("timeout");
   if (!response.ok) {
    if (response.body) await response.body.cancel().catch(() => {});
    throw new IntegrationError(stage, response.status);
   }
   try {
    return responseObject(await response.json());
   } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError("invalid_response", response.status);
   }
  };

  try {
   const fieldsResponse = await request(
    `/locations/${encodeURIComponent(locationId)}/customFields`,
    {},
    "custom_fields"
   );
   const definitions = fieldsResponse.customFields;
   const customFields = buildCustomFields(lead, definitions);
   const events = eventFieldDefinitions(definitions);
   const submissionField = events
    ? events.requestId
    : lead.requestType === "childcare_inquiry"
     ? customFieldDefinition(definitions, CHILDCARE_SUBMISSION_FIELD)
     : null;

   // Workflow-Start fuer genau diese Anfrage. Der Kontakt ist zu diesem Zeitpunkt bereits gespeichert:
   // Fehler hier fuehren nicht zum Verlust der Anfrage, sondern zu einem sichtbaren Status am Kontakt
   // und einem Alarmprotokoll. Kein automatischer Mehrfachstart.
   const setEventStatus = async (contactId, status) => {
    try {
     await request(`/contacts/${encodeURIComponent(contactId)}`, {
      method: "PUT", body: { customFields: [customFieldValue(events.status, status)] }
     }, "event_status");
     return true;
    } catch (error) {
     logLeadEvent("error", "event_status_failed", lead, { stage: error instanceof IntegrationError ? error.stage : "unexpected", status });
     return false;
    }
   };
   const startWorkflow = async contactId => {
    if (!workflow.configured) return "not_configured";
    if (!workflow.valid) {
     logLeadEvent("error", "workflow_misconfigured", lead, { stage: "workflow_id" });
     return "misconfigured";
    }
    if (!events) {
     logLeadEvent("error", "workflow_skipped", lead, { stage: "event_fields_missing" });
     return "skipped";
    }
    try {
     const started = await request(
      `/contacts/${encodeURIComponent(contactId)}/workflow/${encodeURIComponent(workflow.id)}`,
      { method: "POST", body: { eventStartTime: new Date().toISOString() }, version: workflow.version },
      "workflow_start"
     );
     if (started.succeeded !== true && started.succeded !== true) throw new IntegrationError("workflow_not_confirmed");
    } catch (error) {
     const stage = error instanceof IntegrationError ? error.stage : "unexpected";
     logLeadEvent("error", "workflow_failed", lead, { stage, httpStatus: error?.status || null });
     if (!controller.signal.aborted) await setEventStatus(contactId, EVENT_STATUS.failed);
     return "failed";
    }
    await setEventStatus(contactId, EVENT_STATUS.started);
    logLeadEvent("info", "workflow_started", lead);
    return "started";
   };
   const contactBody = {
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: lead.name,
    email: lead.email,
    locationId,
    source: "Website",
    customFields
   };
   if (lead.phone) contactBody.phone = lead.phone;
   if (lead.companyName) contactBody.companyName = lead.companyName;

   const searches = [
    { key: "email", value: lead.email },
    ...(lead.phone ? [{ key: "phone", value: lead.phone }] : [])
   ];
   const candidates = new Map();
   for (const search of searches) {
    const query = new URLSearchParams({ locationId, query: search.value, limit: "100" });
    const results = await request(`/contacts/?${query}`, {}, `search_${search.key}`);
    if (!Array.isArray(results.contacts)) throw new IntegrationError("invalid_search_response");
    if (results.contacts.length >= 100 || (Number.isFinite(results.count) && results.count > results.contacts.length)) {
     throw new IntegrationError("ambiguous_contact");
    }
    for (const candidate of results.contacts) {
     if (!candidate || typeof candidate.id !== "string" || !candidate.id) throw new IntegrationError("invalid_search_response");
     if (!candidates.has(candidate.id)) {
      const detail = await request(`/contacts/${encodeURIComponent(candidate.id)}`, {}, "contact_lookup");
      const contact = responseObject(detail.contact ?? detail);
      if (contact.id !== candidate.id) throw new IntegrationError("invalid_contact_response");
      candidates.set(candidate.id, contact);
     }
    }
   }

   const matches = [...candidates.values()].filter(contact =>
    exactEmail(contact, lead.email) || (lead.phone && exactPhone(contact, lead.phone))
   );
   if (matches.length > 1) throw new IntegrationError("ambiguous_contact");
   if (matches.length === 1 && submissionField &&
     contactFieldValue(matches[0], submissionField.id) === lead.submissionId) {
    // Wiederholung derselben Anfrage: kein zweiter Kontakt-Schreibvorgang. Der Workflow wird nur nachgeholt,
    // wenn er fuer diese Anfrage-ID nachweislich noch nicht gestartet wurde.
    const status = events ? contactFieldValue(matches[0], events.status.id) : null;
    if (events && workflow.configured && status !== EVENT_STATUS.started) {
     logLeadEvent("info", "duplicate_resume_workflow", lead, { previousStatus: status });
     await startWorkflow(matches[0].id);
    } else {
     logLeadEvent("info", "duplicate_acknowledged", lead);
    }
    return deliveryResult("delivery_success");
   }

   let result;
   if (matches.length === 1) {
    const updateBody = { ...contactBody };
    delete updateBody.locationId;
    result = await request(`/contacts/${encodeURIComponent(matches[0].id)}`, {
     method: "PUT", body: updateBody
    }, "contact_update");
   } else {
    result = await request("/contacts/upsert", {
     method: "POST", body: { ...contactBody, createNewIfDuplicateAllowed: false }
    }, "contact_upsert");
   }
   const contactId = getContactId(result);
   logLeadEvent("info", "contact_written", lead, { stage: matches.length === 1 ? "contact_update" : "contact_upsert" });
   await startWorkflow(contactId);
   return deliveryResult("delivery_success");
  } catch (error) {
   if (error instanceof IntegrationError) {
    if (error.stage === "timeout") {
     console.error("HighLevel API request timed out.");
     logLeadEvent("error", "delivery_timeout", lead, { stage: "timeout" });
     return deliveryResult("delivery_timeout");
    }
    console.error("HighLevel API request failed.", error.stage, error.status || "");
    logLeadEvent("error", "delivery_failed", lead, { stage: error.stage, httpStatus: error.status || null });
   } else {
    console.error("HighLevel API request failed.", "unexpected");
    logLeadEvent("error", "delivery_failed", lead, { stage: "unexpected" });
   }
   return deliveryResult("delivery_failed");
  } finally {
   clearTimeout(timeout);
  }
 };
}

module.exports = {
 createHighLevelAdapter,
 checkHighLevelReadiness,
 checkFieldDefinitions,
 buildCustomFields,
 mapCampaignDetail,
 mapRequestType,
 normalizePhone,
 EVENT_FIELDS,
 EVENT_STATUS,
 REQUEST_TYPE_LABELS
};
