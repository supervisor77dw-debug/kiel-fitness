// Option T (bis AVV Cross Media): Website-Leads werden ausschliesslich telefonisch bearbeitet.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validateContact } = require("../site-versions/02-next/lib/contact");
const next = path.resolve(__dirname, "..", "site-versions", "02-next");
const employer = (requestType, extra = {}) => ({
 schemaVersion: 1, requestType, sourcePage: requestType === "employer_referral" ? "Arbeitgeberempfehlen" : "Firmenfitness",
 companyName: "Synthetic GmbH", location: "Kiel", firstName: "Erika", lastName: "Muster", email: "erika@example.test",
 phone: "0431 54020", message: "", callbackRequested: false, website: "", ...extra
});
test("employer forms require a telephone number even without callback request", () => {
 for (const type of ["employer_inquiry", "employer_referral"]) {
  assert.equal(validateContact(employer(type)).valid, true, type);
  const missing = validateContact(employer(type, { phone: "" }));
  assert.equal(missing.valid, false, type);
  assert.match(missing.errors.phone, /Telefonnummer/);
 }
});
test("every lead form marks the telephone field as required", () => {
 for (const page of ["kontakt.html", "kinderbetreuung.html", "firmenfitness.html", "arbeitgeber-empfehlen.html"]) {
  const html = fs.readFileSync(path.join(next, page), "utf8");
  assert.match(html, /<input[^>]*name="phone"[^>]*required/, page);
 }
});
