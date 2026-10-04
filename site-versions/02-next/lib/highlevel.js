const API_BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";
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
 if (lead.requestType === "employer_referral") return "Firmenfitness Empfehlung";
 if (lead.requestType === "employer_inquiry") return "Firmenfitness";
 return lead.interests.includes("trial") ? "Probetraining" : "Kontaktformular";
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
  inspectField(definitions, "Interesse / Anliegen"),
  inspectField(definitions, "Standort"),
  inspectField(definitions, "Beschäftigtengröße"),
  inspectField(definitions, "Bestehendes Firmenfitness-Angebot")
 ];
 const find = name => fields.find(field => field.requestedName === name);
 const requirements = [
  ["Lead-Quelle", field => { customFieldValue(field, "Website"); }],
  ["Kampagne / Lead-Detail", field => {
   for (const value of ["Probetraining", "Kontaktformular", "Firmenfitness", "Firmenfitness Empfehlung"]) {
    customFieldValue(field, value);
   }
  }],
  ["Nachricht / Anfrage", field => {
   if (!["TEXT", "LARGE_TEXT"].includes(String(field.dataType || "").toUpperCase())) {
    throw new IntegrationError("message_field_type");
   }
  }],
  ["Rückruf erwünscht", field => { callbackValue(field, true); }],
  ["Interesse / Anliegen", field => {
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
   customFieldValue(field, "250+", [["250+", "250 oder mehr"]]);
   for (const value of ["1-9", "10-49", "50-249"]) customFieldValue(field, value);
  }],
  ["Bestehendes Firmenfitness-Angebot", field => {
   for (const value of [
    ["Ja", "Yes", "Ja, bereits vorhanden"],
    ["Nein", "No", "Nein, nicht vorhanden"],
     ["Nicht sicher", "Unsicher", "Unklar", "Unsure"]
   ]) {
    const option = findChoice(field, value);
    if (option === null && ["SINGLE_OPTIONS", "RADIO"].includes(String(field.dataType || "").toUpperCase())) {
     throw new IntegrationError("existing_offer_option_unavailable");
    }
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
 return {
  fields,
  missing: fields.filter(field => !field.found).map(field => field.name),
  incompatible: fields.filter(field => field.found && field.mapping !== "compatible").map(field => ({
   name: field.name,
   reason: field.mapping
  })),
  ready: fields.every(field => field.found && field.mapping === "compatible")
 };
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
   if (response.body) await response.body.cancel().catch(() => {});
   console.error("HighLevel readiness check failed.", "custom_fields", response.status);
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
  return {
   status: mapping.ready ? 200 : 422,
   body: { ready: mapping.ready, runtime, ...mapping }
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

 if (lead.message) {
  fields.push(customFieldValue(customFieldDefinition(definitions, "Nachricht / Anfrage"), lead.message));
 }
 if (lead.interests.length) {
  const interestField = customFieldDefinition(definitions, "Interesse / Anliegen");
  const labels = lead.interests.map(value => INTEREST_LABELS[value]);
  if (labels.some(value => !value)) throw new IntegrationError("interest_mapping_unavailable");
  fields.push(customFieldValue(interestField, labels, labels.map(value => [value])));
 }

 if (lead.requestType?.startsWith("employer_")) {
  if (lead.location) {
   fields.push(customFieldValue(
    customFieldDefinition(definitions, "Standort"),
    lead.location
   ));
  }
  if (lead.employeeSize) {
   fields.push(customFieldValue(
    customFieldDefinition(definitions, "Beschäftigtengröße"),
    lead.employeeSize,
    [lead.employeeSize === "250+" ? ["250+", "250 oder mehr"] : [lead.employeeSize]]
   ));
  }
  if (lead.existingOffer) {
   const choices = {
    yes: ["Ja", "Yes", "Ja, bereits vorhanden"],
    no: ["Nein", "No", "Nein, nicht vorhanden"],
    unsure: ["Nicht sicher", "Unsicher", "Unklar", "Unsure"]
   };
   fields.push(customFieldValue(
    customFieldDefinition(definitions, "Bestehendes Firmenfitness-Angebot"),
    lead.existingOffer,
    choices[lead.existingOffer] || [lead.existingOffer]
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
  const request = async (path, { method = "GET", body } = {}, stage) => {
   let response;
   try {
    response = await fetchImpl(`${API_BASE}${path}`, {
     method, headers, body: body === undefined ? undefined : JSON.stringify(body),
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
   getContactId(result);
   return deliveryResult("delivery_success");
  } catch (error) {
   if (error instanceof IntegrationError) {
    if (error.stage === "timeout") {
     console.error("HighLevel API request timed out.");
     return deliveryResult("delivery_timeout");
    }
    console.error("HighLevel API request failed.", error.stage, error.status || "");
   } else {
    console.error("HighLevel API request failed.", "unexpected");
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
 normalizePhone
};
