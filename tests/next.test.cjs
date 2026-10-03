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
test("approved Late-Night terms are complete and missing course PDF is not fabricated", () => {
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 for (const price of ["23,90", "30,90", "27,90"]) assert.ok(home.includes(price));
 assert.match(home, /20:00 bis 22:00 Uhr/);
 assert.match(home, /27,90 € <span>\/14-tägig<\/span>/);
 assert.match(home, /20:00 bis 22:00 Uhr · 6 Monate Laufzeit/);
 assert.doesNotMatch(home, /Abrechnungsperiode noch nicht bestätigt|Abrechnungsintervall bitte|Preisbeispiel\*/);
 for (const file of fs.readdirSync(next).filter(n => n.endsWith(".html"))) {
  assert.doesNotMatch(fs.readFileSync(path.join(next, file), "utf8"), /23:00|23 Uhr|bis 23/, file);
 }
 const courses = fs.readFileSync(path.join(next, "kurse.html"), "utf8");
 assert.match(courses, /id="kursplan"/);
 assert.match(courses, /PDF-Download wird ergänzt, sobald der aktuelle Plan vorliegt/);
 assert.doesNotMatch(courses, /href="kursplan\.pdf"|href="#"/);
});
test("course inventory maps all existing offerings, verified LES MILLS links and local-only courses", () => {
 const inventory = JSON.parse(fs.readFileSync(path.join(next, "course-links.json"), "utf8"));
 const html = fs.readFileSync(path.join(next, "kurse.html"), "utf8");
 assert.equal(inventory.courses.length, 25);
 assert.equal(new Set(inventory.courses.map(c => c.id)).size, 25);
 assert.equal((html.match(/data-course-id="/g) || []).length, 25);
 assert.equal(inventory.courses.filter(c => c.group === "LES MILLS").length, 8);
 assert.equal(inventory.courses.filter(c => c.officialLinkUseful).length, 8);
 const programs = {
  "course-01": ["bodypump", "BODYPUMP"],
  "course-02": ["strength-development", "LES MILLS STRENGTH DEVELOPMENT"],
  "course-07": ["bodybalance", "BODYBALANCE"],
  "course-08": ["bodyattack", "BODYATTACK"],
  "course-09": ["lmi-step", "LMI STEP"],
  "course-16": ["bodycombat", "BODYCOMBAT"],
  "course-23": ["les-mills-core", "LES MILLS CORE"],
  "course-24": ["les-mills-tone", "LES MILLS TONE"]
 };
 for (const course of inventory.courses) {
  const card = html.match(new RegExp('<article class="media-card" data-course-id="' + course.id + '"[\\s\\S]*?</article>'))?.[0];
  assert.ok(card, course.id);
  assert.ok(card.includes("<h3>" + course.name + "</h3>"));
  const external = [...card.matchAll(/href="(https?:[^"]+)"/g)];
  if (programs[course.id]) {
   const [slug, program] = programs[course.id];
   const url = "https://www.lesmills.com/de/programme/" + slug;
   assert.equal(course.officialUrl, url);
   assert.equal(course.officialProgram, program);
   assert.equal(course.verifiedAt, "2026-10-03");
   assert.equal(course.linked, true);
   assert.deepEqual(course.currentTargets, [url]);
   assert.equal(external.length, 1);
   assert.equal(external[0][1], url);
   assert.match(card, /target="_blank" rel="noopener noreferrer"/);
   assert.ok(card.includes("Mehr über " + program + " erfahren"));
   assert.match(card, /offizielle LES-MILLS-Information, neuer Tab/);
  } else {
   assert.equal(course.officialUrl, null);
   assert.equal(external.length, 0);
   assert.equal(course.officialLinkUseful, false);
  }
  assert.doesNotMatch(card, /href="#"/);
 }
 assert.doesNotMatch(html, /<template data-course-detail>/);
 assert.doesNotMatch(html, /Heilwirkung|reinigt den Körper|reinigt das Herz-Kreislauf-System|Millionen Teilnehmer|schnellsten Methoden/);
});
test("postnatal Aufbau Rückbildung and established Rückenfit remain separate", () => {
 const courses = fs.readFileSync(path.join(next, "kurse.html"), "utf8");
 const health = fs.readFileSync(path.join(next, "health.html"), "utf8");
 const postnatal = courses.match(/data-course-id="course-04"[\s\S]*?<\/article>/)[0];
 const back = courses.match(/data-course-id="course-25"[\s\S]*?<\/article>/)[0];
 assert.match(postnatal, /Aufbau Rückbildung/);
 assert.match(postnatal, /nach einer Schwangerschaft oder Entbindung/);
 assert.match(back, /<h3>Rückenfit<\/h3>/);
 assert.match(back, /Kräftigung der Rumpfmuskulatur/);
 assert.match(health, /href="kurse.html#rueckbildung"/);
 assert.match(health, /id="rueckenfit"/);
 assert.doesNotMatch(courses + health, /Aufbau Rückenbildung|Rückenfitness/);
});
test("all main pages have unique local SEO metadata, meaningful headings and accessible images", () => {
 const focus = { index: "Fitnessstudio", fitness: "Fitnesstraining", health: "Gesundheitstraining", kurse: "Fitnesskurse", wellness: "Fitnessstudio mit Sauna", kontakt: "Kontakt" };
 const titles = new Set(), descriptions = new Set();
 for (const [page, intent] of Object.entries(focus)) {
  const html = fs.readFileSync(path.join(next, page + ".html"), "utf8");
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const meta = html.match(/<meta[^>]*name="description"[^>]*>|<meta[^>]*content="[^"]*"[^>]*name="description"[^>]*>/g) || [];
  assert.equal(meta.length, 1, page);
  const description = meta[0].match(/content="([^"]+)"/)[1];
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*>|<link[^>]*href="[^"]*"[^>]*rel="canonical"[^>]*>/g) || [];
  assert.equal(canonical.length, 1, page);
  assert.ok(canonical[0].includes('href="' + page + '.html"'));
  assert.ok(title.includes(intent) && title.includes("Kiel"), page);
  assert.ok(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].includes(intent), page);
  assert.ok(description.length >= 100 && description.length <= 180, page);
  assert.ok(!titles.has(title) && !descriptions.has(description));
  titles.add(title); descriptions.add(description);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) assert.match(image[0], /\balt="/);
 }
 assert.match(fs.readFileSync(path.join(next, "index.html"), "utf8"), /href="fitness.html#firmenfitness"/);
});
test("Git-triggered Vercel builds use only the same guarded Next output", () => {
 const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
 assert.equal(config.buildCommand, "node tools/build-staging.cjs");
 assert.equal(config.framework, null);
 const builder = fs.readFileSync(path.join(root, "tools", "build-staging.cjs"), "utf8");
 assert.match(builder, /"site-versions", "02-next"/);
 assert.match(builder, /mode: "demonstration"/);
});
