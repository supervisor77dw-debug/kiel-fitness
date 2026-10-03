const { validateContact, MAX_BODY_BYTES } = require("../lib/contact");
const { createHighLevelAdapter } = require("../lib/highlevel");

function createContactHandler({ submitLead = createHighLevelAdapter() } = {}) {
 return async function contact(req, res) {
 res.setHeader("Cache-Control", "no-store");
 res.setHeader("X-Content-Type-Options", "nosniff");
 const reply = (status, body) => res.status(status).json(body);
 if (req.method !== "POST") {
  res.setHeader("Allow", "POST");
  return reply(405, { success: false, code: "method_not_allowed", message: "Bitte sende das Formular per POST." });
 }
 if (req.headers.origin) {
  let origin;
  try { origin = new URL(req.headers.origin); }
  catch (error) {
   if (!(error instanceof TypeError)) throw error;
   return reply(403, { success: false, code: "invalid_origin", message: "Diese Anfrage ist nicht erlaubt." });
  }
  if (!["http:", "https:"].includes(origin.protocol) || origin.host !== req.headers.host) {
   return reply(403, { success: false, code: "invalid_origin", message: "Diese Anfrage ist nicht erlaubt." });
  }
 }
 if ((req.headers["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/json") {
  return reply(415, { success: false, code: "invalid_content_type", message: "Das Formular ben\u00f6tigt JSON-Daten und JavaScript." });
 }
 if (Number(req.headers["content-length"]) > MAX_BODY_BYTES) {
  return reply(413, { success: false, code: "body_too_large", message: "Die Anfrage ist zu gro\u00df." });
 }
 let input = req.body;
 if (Buffer.isBuffer(input)) input = input.toString("utf8");
 if (typeof input === "string") {
  if (Buffer.byteLength(input) > MAX_BODY_BYTES) {
   return reply(413, { success: false, code: "body_too_large", message: "Die Anfrage ist zu gro\u00df." });
  }
  try { input = JSON.parse(input); }
  catch (error) {
   if (!(error instanceof SyntaxError)) throw error;
   return reply(400, { success: false, code: "validation_error", message: "Die Anfrage enth\u00e4lt ung\u00fcltige Daten." });
  }
 }
 if (Buffer.byteLength(JSON.stringify(input ?? null)) > MAX_BODY_BYTES) {
  return reply(413, { success: false, code: "body_too_large", message: "Die Anfrage ist zu gro\u00df." });
 }
 const result = validateContact(input);
 if (!result.valid) {
  const spam = typeof input?.website === "string" && input.website !== "";
  return reply(400, {
   success: false, code: spam ? "spam_rejected" : "validation_error",
   message: spam ? "Diese Anfrage konnte nicht verarbeitet werden." : "Bitte \u00fcberpr\u00fcfe deine Angaben.",
   errors: result.errors
  });
 }
 const delivery = await submitLead(result.lead);
 return reply(delivery.status, delivery.body);
 };
}

module.exports = createContactHandler();
module.exports.createContactHandler = createContactHandler;
