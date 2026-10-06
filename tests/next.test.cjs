const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
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
 assert.equal(files.length, 11);
 let commonHeader, commonFooter;
 for (const file of files) {
  const text = fs.readFileSync(path.join(next, file), "utf8");
  const header = text.match(/<header[\s\S]*?<\/header>/)[0].replace(/\r\n/g, "\n").replace(/ aria-current="page"/g, "");
  const footer = text.match(/<footer[\s\S]*?<\/footer>/)[0].replace(/\r\n/g, "\n").replace(/<div class="wrap footer-bottom">[\s\S]*?<\/div>/, "<div class=\"wrap footer-bottom\"></div>");
  commonHeader ??= header; commonFooter ??= footer;
  assert.equal(header, commonHeader, file);
  assert.equal(footer, commonFooter, file);
  assert.match(text, /href="home\.css"/);
  assert.doesNotMatch(text, /href="responsive\.css"|@view-transition|<iframe|href="\.\.\/current/);
  assert.equal((text.match(/<h1(?:\s|>)/g) || []).length, 1, file);
 }
});
test("staging builder reads server runtime configuration without embedding credentials or promoting Production", () => {
 const source = fs.readFileSync(path.join(root, "tools", "build-staging.cjs"), "utf8");
 assert.match(source, /fs\.writeFileSync\(path\.join\(contactFunctionRoot, "api", "contact\.js"\), handler\)/);
 assert.match(source, /highlevel-readiness\.func/);
 assert.match(source, /api\/highlevel-readiness/);
 assert.match(source, /launcherType: "Nodejs", shouldAddHelpers: true/);
 assert.match(source, /HIGHLEVEL_PRIVATE_TOKEN and HIGHLEVEL_LOCATION_ID at runtime/);
 assert.doesNotMatch(source, /HIGHLEVEL_ENABLED:\s*["']false["']/);
 assert.doesNotMatch(source, /HIGHLEVEL_PRIVATE_TOKEN:\s*["'][^"']+["']/);
 assert.doesNotMatch(source, /HIGHLEVEL_LOCATION_ID:\s*["'][^"']+["']/);
 assert.match(source, /noindex, nofollow/);
 assert.doesNotMatch(source, /--prod|HIGHLEVEL_WEBHOOK_URL:/);
});
test("fresh deployment artifact includes every local script and stylesheet referenced by Next pages", async () => {
 const output = path.join(root, ".vercel", `output-test-${crypto.randomUUID()}`);
 try {
  execFileSync(process.execPath, [path.join(root, "tools", "build-staging.cjs"), "--output", output]);
  const staticRoot = path.join(output, "static");
  for (const file of fs.readdirSync(next).filter(name => name.endsWith(".html"))) {
   const html = fs.readFileSync(path.join(staticRoot, file), "utf8");
   for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
    const resource = match[1];
    if (/^https?:/.test(resource)) continue;
    assert.ok(fs.existsSync(path.join(staticRoot, resource)), `${file}: missing bundled ${resource}`);
    assert.deepEqual(fs.readFileSync(path.join(staticRoot, resource)), fs.readFileSync(path.join(next, resource)));
   }
  }
 } finally {
  await fs.promises.rm(output, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
 }
});
test("UX trust layer uses supplied rating without fabricated testimonials or external widgets", () => {
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 assert.match(home, /class="review-proof wrap"/);
 assert.match(home, /Was unsere Mitglieder über KIELS sagen/);
 assert.match(home, /4,7 von 5 bei Google, 183 Bewertungen/);
 assert.match(home, /Stand: 05\.10\.2026/);
 assert.doesNotMatch(home, /Ein gutes Gefühl vor dem ersten Besuch|Entdecke die Erfahrungen mit unserem Studio auf Google/);
 const reviews = home.match(/<section class="section review-carousel-section[\s\S]*?<\/section>/);
 assert.ok(reviews, "visible review cards exist below the overall rating");
 assert.equal((reviews[0].match(/class="review-quote"/g) || []).length, 6);
 assert.equal((reviews[0].match(/<blockquote class="review-excerpt">/g) || []).length, 6);
 for (const author of ["Mareike", "Anne Ahorn", "T. Riddle", "Robert Loos", "Michael S.", "Jonas Lennart"]) {
  assert.match(reviews[0], new RegExp(`<cite>${author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/cite>[\\s\\S]*?<span>Google-Bewertung<\\/span>`));
 }
 assert.match(reviews[0], /familiäre Stimmung und keine Massenabfertigung/);
 assert.match(reviews[0], /Ich bin mittlerweile seid fast 4 Jahren Mitglied und habe mich damals für dieses Fitnessstudio Aufgrund der Möglichkeit der Kinderbetreuung entschieden\. Meine Kinder freuen sich jedes Mal auf den "Sportkindergarten" und ich bin dankbar für 1 Stunde "Metime"\. Neben diesem Angebot überzeugt dieses Studio durch Sauberkeit, moderne Sportgeräte sowie Sanitäranlagen und eine sehr ruhige und angenehme Atmosphäre zum fokussierten trainieren\. Ich fühle mich hier sehr wohl und merke das dem Eigentümer seine Mitglieder und sein Studio am Herzen liegt\./);
 assert.match(reviews[0], /Mega nettes Team, sehr angenehmes Klientel dort\./);
 assert.match(reviews[0], /Seit 2006 meine Sport- und Begegnungsstätte\. Meine 2\. Familie\./);
 assert.match(reviews[0], /Super Gym\. Sehr nettes Personal und faire Mitgliedschaft\./);
 assert.match(reviews[0], /Bestes Gym in Kiel wenn einem wichtig ist in einer absolut familiären Atmosphäre zu trainieren\./);
 assert.doesNotMatch(reviews[0], /Zusammenfassung|Weitere Eindrücke|Originalzitat|<h3|review-kind|review-summary|★/);
 assert.match(reviews[0], /aria-roledescription="Karussell"/);
 assert.match(reviews[0], /aria-label="Vorherige Bewertung"/);
 assert.match(reviews[0], /aria-label="Nächste Bewertung"/);
 assert.match(reviews[0], /data-review-dialog/);
 assert.match(reviews[0], /Vollständige Bewertung lesen/);
 assert.match(reviews[0], /data-review-autoplay/);
 assert.match(reviews[0], /data-review-progress-fill/);
 assert.doesNotMatch(reviews[0], /maps\/search|<iframe|reviews\.js|<script/);
 assert.doesNotMatch(home, /verified-review-template/);
 assert.match(home, /href="tel:043154020">Betreuung telefonisch klären/);
 const script = fs.readFileSync(path.join(next, "script.js"), "utf8");
 assert.match(script, /ResizeObserver\(measureHeader\)/);
 assert.match(script, /--header-offset/);
 assert.match(script, /membershipLink\.setAttribute\("aria-current", "location"\)/);
 assert.match(script, /data-review-carousel/);
 assert.match(script, /ArrowLeft/);
 assert.match(script, /prefers-reduced-motion/);
 assert.match(script, /const interval = 8000/);
 assert.match(script, /showModal\(\)/);
 assert.match(script, /transitionend/);
 assert.match(script, /pointerup/);
 assert.match(script, /dialog\.open/);
});
test("Google reviews use desktop, tablet and mobile layouts without external review links", () => {
 const css = fs.readFileSync(path.join(next, "home.css"), "utf8");
 assert.match(css, /\.review-carousel \{ --review-visible: 3; --review-card-width: calc\(\(100% - 40px\) \/ 3\); \}/);
 assert.match(css, /@media \(max-width: 1000px\)[\s\S]*?\.review-carousel \{ --review-visible: 2; \}/);
 assert.match(css, /\.review-quote \{[^}]*height: 300px;/);
 assert.match(css, /-webkit-line-clamp: 5/);
 assert.match(css, /@media \(max-width: 699px\)[\s\S]*?\.review-carousel \{ --review-visible: 1; \}/);
 assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 assert.doesNotMatch(home.match(/<div class="review-proof[\s\S]*?<\/div>/)[0], /google\.com\/maps\/search/);
});
test("homepage places the complete trust and review block before Why KIELS and includes authentic optimized imagery", () => {
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 const ratingIndex = home.indexOf("Was unsere Mitglieder über KIELS sagen");
 const carouselIndex = home.indexOf("data-review-carousel");
 const whyIndex = home.indexOf('id="why-title"');
 assert.ok(ratingIndex >= 0 && ratingIndex < carouselIndex && carouselIndex < whyIndex);
 const trustBlock = home.slice(home.indexOf('class="trust-section"'), whyIndex);
 assert.match(trustBlock, /4,7 von 5 bei Google, 183 Bewertungen/);
 assert.match(trustBlock, /Stand: 05\.10\.2026/);
 assert.match(home, /So fühlt sich KIELS an\./);
 const fitness = fs.readFileSync(path.join(next, "fitness.html"), "utf8");
 assert.match(fitness, /fitness-spaces-title/);
 assert.match(fitness, /fitness-strength-authentic\.webp/);
 assert.match(fitness, /fitness-equipment-authentic\.webp/);
 const wellness = fs.readFileSync(path.join(next, "wellness.html"), "utf8");
 assert.match(wellness, /wellness-mixed-sauna-authentic\.webp/);
 assert.match(wellness, /wellness-women-sauna-authentic\.webp/);
 assert.match(wellness, /wellness-lounge-authentic\.webp/);
 const assets = [
  "home-arrival-authentic.webp", "home-training-authentic.webp", "home-lounge-authentic.webp",
  "fitness-strength-authentic.webp", "fitness-equipment-authentic.webp",
  "wellness-mixed-sauna-authentic.webp", "wellness-women-sauna-authentic.webp",
  "wellness-lounge-authentic.webp"
 ];
 for (const asset of assets) {
  const file = path.join(next, "assets", asset);
  assert.ok(fs.statSync(file).size < 500_000, `${asset} is optimized for web delivery`);
  assert.equal(fs.readFileSync(file).toString("ascii", 8, 12), "WEBP", `${asset} is WebP`);
  const references = [home, fitness, wellness].join("\n");
  assert.match(references, new RegExp(`src="assets/${asset}"[^>]*alt="[^"]+"[^>]*loading="lazy"[^>]*width="1800" height="(?:1200|1013)"`));
 }
});
test("premium pass removes demo footers without changing approved page content or tariffs", () => {
 for (const file of fs.readdirSync(next).filter(name => name.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(next, file), "utf8");
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
  assert.doesNotMatch(footer, /KIELS Next|Entwicklungs-|Demonstrationsstand|lokaler Firmenfitness-Entwurf/);
  assert.doesNotMatch(html, /Most Popular|wa\.me|whatsapp:/i);
 }
 const css = fs.readFileSync(path.join(next, "home.css"), "utf8");
 assert.match(css, /@media \(max-width: 699px\)/);
 assert.match(css, /\.usp-grid, \.footer-grid \{ grid-template-columns: 1fr; \}/);
});
test("micro polish adds only targeted card edges and compact wide cards below 375px", () => {
 const css = fs.readFileSync(path.join(next, "home.css"), "utf8");
 assert.match(css, /\.goal-card:is\(\[href="health\.html"\],\[href="kurse\.html"\]\)::after/);
 assert.match(css, /border: 1px solid rgba\(255,255,255,\.11\)/);
 assert.match(css, /@media \(max-width: 374px\)/);
 assert.match(css, /body\[data-page="index"\] \.goal-card\.wide \.goal-copy \{ padding: 20px; \}/);
});
test("all Next internal page links and fragment CTA destinations resolve", () => {
 for (const file of fs.readdirSync(next).filter(name => name.endsWith(".html"))) {
  const source = fs.readFileSync(path.join(next, file), "utf8");
  for (const match of source.matchAll(/href="([^"]+)"/g)) {
   const href = match[1];
   if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;
   assert.notEqual(href, "#", `${file}: dummy link`);
   const [destination, fragment] = href.split("#");
   const filename = destination.split("?")[0] || file;
   if (!filename.endsWith(".html")) continue;
   const targetPath = path.join(next, filename);
   assert.ok(fs.existsSync(targetPath), `${file}: missing ${href}`);
   if (fragment) {
    const target = fs.readFileSync(targetPath, "utf8");
    assert.ok(target.includes(`id="${decodeURIComponent(fragment)}"`), `${file}: missing anchor ${href}`);
   }
  }
 }
});
test("approved Late-Night terms are complete and missing course PDF is not fabricated", () => {
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 const membership = home.match(/<section\b[^>]*id="mitgliedschaft"[\s\S]*?<\/section>/);
 assert.ok(membership, "membership section exists");
 assert.doesNotMatch(membership[0], /KIELS App|KIELS-App/);
 const notes = home.match(/<div class="tariff-notes">([\s\S]*?)<\/div>/);
 assert.ok(notes, "general tariff notes exist");
 assert.doesNotMatch(notes[1], /Late-Night|27,90|20:00|22:00/);
 assert.match(notes[1], /Für Schüler, Studenten, Rentner und Angestellte unserer Kooperationspartner gibt es besondere Vergünstigungen/);
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
test("Git-triggered Vercel builds use the Next output with fail-closed runtime configuration", () => {
 const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
 assert.equal(config.buildCommand, "node tools/build-staging.cjs");
 assert.equal(config.framework, null);
 const builder = fs.readFileSync(path.join(root, "tools", "build-staging.cjs"), "utf8");
 assert.match(builder, /"site-versions", "02-next"/);
 assert.match(builder, /mode: "staging"/);
 assert.match(builder, /HIGHLEVEL_PRIVATE_TOKEN and HIGHLEVEL_LOCATION_ID at runtime/);
});
