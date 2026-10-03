const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const next = path.join(root, "site-versions", "02-next");
test("archive exactly matches frozen current checksums without duplicating shared resources", () => {
 const manifest = JSON.parse(fs.readFileSync(path.join(root, "site-versions", "reference-manifest.json")));
 for (const item of manifest.files.filter(i => i.path.startsWith("01-current/"))) {
  const bytes = fs.readFileSync(path.join(root, "ARCHIV", "2026-10-03_WIX_CLONE_CURRENT", item.path));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), item.sha256);
 }
 assert.equal(fs.existsSync(path.join(root, "ARCHIV", "2026-10-03_WIX_CLONE_CURRENT", "shared")), false);
});
test("all Next pages share one header/footer and stylesheet, no clone transitions or embeds", () => {
 const files = fs.readdirSync(next).filter(n => n.endsWith(".html"));
 assert.equal(files.length, 9);
 let commonHeader, commonFooter;
 for (const file of files) {
  const text = fs.readFileSync(path.join(next, file), "utf8");
  const header = text.match(/<header[\s\S]*?<\/header>/)[0].replace(/ aria-current="page"/g, "");
  const footer = text.match(/<footer[\s\S]*?<\/footer>/)[0];
  commonHeader ??= header; commonFooter ??= footer;
  assert.equal(header, commonHeader, file);
  assert.equal(footer, commonFooter, file);
  assert.match(text, /href="home\.css"/);
  assert.doesNotMatch(text, /href="responsive\.css"|@view-transition|<iframe|href="\.\.\/current/);
  assert.equal((text.match(/<h1(?:\s|>)/g) || []).length, 1, file);
 }
});
test("staging builder cannot enable HighLevel, copy secrets or promote Production", () => {
 const source = fs.readFileSync(path.join(root, "tools", "build-staging.cjs"), "utf8");
 assert.match(source, /HIGHLEVEL_ENABLED: \\"false\\"|HIGHLEVEL_ENABLED: "false"/);
 assert.match(source, /noindex, nofollow/);
 assert.doesNotMatch(source, /--prod|HIGHLEVEL_WEBHOOK_URL:/);
});
test("approved 22:00 cutoff is consistent, billing interval stays open and missing course PDF is not fabricated", () => {
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 for (const price of ["23,90", "30,90", "27,90"]) assert.ok(home.includes(price));
 assert.match(home, /20:00 bis 22:00 Uhr/);
 assert.match(home, /Abrechnungsperiode noch nicht bestätigt/);
 for (const file of fs.readdirSync(next).filter(n => n.endsWith(".html"))) {
  assert.doesNotMatch(fs.readFileSync(path.join(next, file), "utf8"), /23:00|23 Uhr|bis 23/, file);
 }
 const courses = fs.readFileSync(path.join(next, "kurse.html"), "utf8");
 assert.match(courses, /PDF-Link ist nicht verfügbar/);
 assert.doesNotMatch(courses, /href="kursplan\.pdf"|href="#"/);
});
test("complete course inventory maps 24 real cards without invented URLs or visible dead links", () => {
 const inventory = JSON.parse(fs.readFileSync(path.join(next, "course-links.json"), "utf8"));
 const html = fs.readFileSync(path.join(next, "kurse.html"), "utf8");
 assert.equal(inventory.courses.length, 24);
 assert.equal(new Set(inventory.courses.map(c => c.id)).size, 24);
 assert.equal(inventory.courses.filter(c => c.group === "LES MILLS").length, 8);
 assert.equal(inventory.courses.filter(c => c.officialLinkUseful).length, 10);
 for (const course of inventory.courses) {
  assert.equal(course.officialUrl, null);
  assert.deepEqual(course.currentTargets, []);
  assert.ok(html.includes('data-course-id="' + course.id + '"'));
  assert.ok(html.includes("<h3>" + course.name + "</h3>"));
 }
 assert.equal((html.match(/<template data-course-detail>/g) || []).length, 24);
 for (const card of html.matchAll(/<article class="media-card"[\s\S]*?<\/article>/g)) {
  assert.doesNotMatch(card[0], /href="#"|href="https?:/);
 }
 assert.match(html, /rel="noopener noreferrer"/);
});
test("Git-triggered Vercel builds use only the same guarded Next output", () => {
 const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
 assert.equal(config.buildCommand, "node tools/build-staging.cjs");
 assert.equal(config.framework, null);
 const builder = fs.readFileSync(path.join(root, "tools", "build-staging.cjs"), "utf8");
 assert.match(builder, /"site-versions", "02-next"/);
 assert.match(builder, /mode: "demonstration"/);
});
