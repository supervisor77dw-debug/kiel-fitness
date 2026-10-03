const INTERESTS = ["trial", "membership", "courses", "health", "wellness", "existing-membership", "other"];
const SOURCE_PAGES = ["Home", "Fitness", "Wellness", "Health", "Kurse", "Kontakt"];
const MAX_BODY_BYTES = 16384;
const { randomUUID } = require("node:crypto");
const ATTRIBUTION_LIMITS = {
 leadSource: 120, leadSourceDetail: 250,
 utmSource: 250, utmMedium: 250, utmCampaign: 250, utmContent: 250, utmTerm: 250,
 landingPage: 2048, referrer: 2048, gclid: 512, fbclid: 512
};

function validateContact(input) {
 if (!input || typeof input !== "object" || Array.isArray(input)) {
  return { valid: false, errors: {} };
 }
 const errors = {};
 const text = (key, max) => {
  const controls = key === "message" ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
  if (typeof input[key] !== "string" || !input[key].trim() || input[key].trim().length > max || controls.test(input[key])) {
   errors[key] = "Bitte f\u00fclle dieses Feld g\u00fcltig aus.";
   return "";
  }
  return input[key].trim();
 };
 const firstName = text("firstName", 80);
 const lastName = text("lastName", 80);
 const email = text("email", 254);
 const phone = text("phone", 32);
 const message = text("message", 5000);
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Bitte gib eine g\u00fcltige E-Mail-Adresse ein.";
 const digits = phone.replace(/\D/g, "");
 const normalizedDigits = phone.startsWith("+") ? digits : phone.startsWith("00") ? digits.slice(2) : "49" + digits.replace(/^0/, "");
 if (!/^\+?[0-9 ()/.\-]+$/.test(phone) || digits.length < 6 || normalizedDigits.length > 15) {
  errors.phone = "Bitte gib eine g\u00fcltige Telefonnummer ein.";
 }
 if (!Array.isArray(input.interests) || input.interests.length > INTERESTS.length || !input.interests.every(value => INTERESTS.includes(value))) {
  errors.interests = "Bitte \u00fcberpr\u00fcfe die Interessensbereiche.";
 }
 if (typeof input.callbackRequested !== "boolean") errors.callbackRequested = "Bitte \u00fcberpr\u00fcfe den R\u00fcckrufwunsch.";
 if (!SOURCE_PAGES.includes(input.sourcePage)) errors.sourcePage = "Bitte lade die Kontaktseite erneut.";
 if (typeof input.website !== "string" || input.website !== "") errors.website = "Die Anfrage konnte nicht verarbeitet werden.";
 const attribution = {};
 for (const [key, max] of Object.entries(ATTRIBUTION_LIMITS)) {
  const value = input[key];
  if (value === undefined || value === null || value === "") {
   attribution[key] = null;
  } else if (typeof value !== "string" || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
   errors[key] = "Bitte lade die Kontaktseite erneut.";
  } else {
   attribution[key] = value.trim() || null;
   if (attribution[key] && (key === "landingPage" || key === "referrer")) {
    try {
     const url = new URL(attribution[key]);
     if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      errors[key] = "Bitte lade die Kontaktseite erneut.";
     }
    } catch (error) {
     if (!(error instanceof TypeError)) throw error;
     errors[key] = "Bitte lade die Kontaktseite erneut.";
    }
   }
  }
 }
 if (input.submissionId != null && (typeof input.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId))) {
  errors.submissionId = "Bitte lade die Kontaktseite erneut.";
 }
 if (Object.keys(errors).length) return { valid: false, errors };
 const normalizedPhone = "+" + normalizedDigits;
 return {
  valid: true,
  lead: {
   firstName, lastName, name: firstName + " " + lastName, email, phone: normalizedPhone, message,
   interests: [...new Set(input.interests)], callbackRequested: input.callbackRequested,
   preferredContact: input.callbackRequested ? "phone" : "email",
   sourcePage: input.sourcePage, submittedAt: new Date().toISOString(),
   ...attribution, submissionId: input.submissionId || randomUUID()
  }
 };
}

module.exports = { validateContact, MAX_BODY_BYTES, ATTRIBUTION_LIMITS };
