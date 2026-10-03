const RESULT = {
 delivery_not_configured: {
  status: 503,
  message: "Der Formularversand ist noch nicht eingerichtet. Deine Nachricht wurde nicht gesendet oder gespeichert. Bitte nutze die Telefonnummer oder den E-Mail-Link auf dieser Seite."
 },
 delivery_timeout: {
  status: 504,
  message: "Die Best\u00e4tigung deiner Anfrage hat zu lange gedauert. Bitte nutze bei Unsicherheit die Telefonnummer oder den E-Mail-Link auf dieser Seite."
 },
 delivery_failed: {
  status: 502,
  message: "Deine Anfrage konnte nicht best\u00e4tigt werden. Bitte nutze bei Unsicherheit die Telefonnummer oder den E-Mail-Link auf dieser Seite."
 },
 delivery_success: {
  status: 200,
  message: "Vielen Dank f\u00fcr deine Nachricht. Deine Anfrage wurde angenommen."
 }
};

function deliveryResult(code) {
 return {
  status: RESULT[code].status,
  body: { success: code === "delivery_success", code, message: RESULT[code].message }
 };
}

// KIELS webhook contract, not a direct HighLevel Contacts/Opportunities API body.
function mapHighLevelPayload(lead) {
 const {
  firstName, lastName, name, email, phone, submissionId,
  message, interests, callbackRequested, preferredContact, sourcePage, submittedAt,
  leadSource, leadSourceDetail, utmSource, utmMedium, utmCampaign, utmContent,
  utmTerm, landingPage, referrer, gclid, fbclid
 } = lead;
 return {
  schemaVersion: 1,
  submissionId,
  contact: { firstName, lastName, name, email, phone },
  lead: {
   message, interests: [...interests], callbackRequested, preferredContact, sourcePage, submittedAt,
   leadSource, leadSourceDetail, utmSource, utmMedium, utmCampaign, utmContent,
   utmTerm, landingPage, referrer, gclid, fbclid
  },
  opportunity: {
   initialStageName: "Neuer Lead",
   contactReference: { submissionId }
  }
 };
}

function configuredWebhook(env) {
 if (env.HIGHLEVEL_ENABLED !== "true" || typeof env.HIGHLEVEL_WEBHOOK_URL !== "string" || !env.HIGHLEVEL_WEBHOOK_URL.trim()) return null;
 let url;
 try { url = new URL(env.HIGHLEVEL_WEBHOOK_URL); }
 catch (error) {
  if (!(error instanceof TypeError)) throw error;
  return null;
 }
 if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
 return url.href;
}

function createHighLevelAdapter({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
 return async function submitLead(lead) {
  const url = configuredWebhook(env);
  if (!url) return deliveryResult("delivery_not_configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
   const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(mapHighLevelPayload(lead)),
    signal: controller.signal,
    redirect: "error"
   });
   // Provider bodies/headers may contain personal data or credentials; never expose them.
   if (response.body) await response.body.cancel();
   if (controller.signal.aborted) return deliveryResult("delivery_timeout");
   if (!response.ok) {
    console.error("HighLevel delivery failed.");
    return deliveryResult("delivery_failed");
   }
   return deliveryResult("delivery_success");
  } catch (error) {
   const code = controller.signal.aborted ? "delivery_timeout" : "delivery_failed";
   console.error(code === "delivery_timeout" ? "HighLevel delivery timed out." : "HighLevel delivery failed.");
   return deliveryResult(code);
  } finally {
   clearTimeout(timeout);
  }
 };
}

module.exports = { createHighLevelAdapter, mapHighLevelPayload };
