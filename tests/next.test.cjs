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
 assert.equal(files.length, 13);
 let commonHeader, commonFooter;
 for (const file of files) {
  const text = fs.readFileSync(path.join(next, file), "utf8");
  const header = text.match(/<header[\s\S]*?<\/header>/)[0].replace(/\r\n/g, "\n").replace(/>\s+</g, "><").replace(/ aria-current="page"/g, "");
  const footer = text.match(/<footer[\s\S]*?<\/footer>/)[0].replace(/\r\n/g, "\n").replace(/>\s+</g, "><").replace(/<div class="wrap footer-bottom">[\s\S]*?<\/div>/, "<div class=\"wrap footer-bottom\"></div>");
  commonHeader ??= header; commonFooter ??= footer;
  assert.equal(header, commonHeader, file);
  assert.equal(footer, commonFooter, file);
  assert.match(text, /href="home\.css"/);
  assert.doesNotMatch(text, /href="responsive\.css"|@view-transition|<iframe|href="\.\.\/current/);
  assert.equal((text.match(/<h1(?:\s|>)/g) || []).length, 1, file);
 }
});
test("legal pages and global footer use the unified accessible navigation and local social icons", () => {
 const legalPages = {
  "impressum.html": "Impressum",
  "datenschutz.html": "Datenschutz",
  "agbs.html": "AGB",
  "hausordnung.html": "Hausordnung"
 };
 const legalLinks = [
  ["impressum.html", "Impressum"],
  ["datenschutz.html", "Datenschutz"],
  ["agbs.html", "AGB"],
  ["hausordnung.html", "Hausordnung"]
 ];
 for (const [file, title] of Object.entries(legalPages)) {
  const html = fs.readFileSync(path.join(next, file), "utf8");
  assert.match(html, new RegExp(`<h1><strong>KIELS</strong><span aria-hidden="true">·</span><span>${title}</span></h1>`), file);
  const related = html.match(/<nav class="related" aria-label="Weitere Rechtstexte">([\s\S]*?)<\/nav>/)?.[0];
  assert.ok(related, `${file}: legal navigation missing`);
  assert.equal((related.match(/<a /g) || []).length, 4, file);
  for (const [href, label] of legalLinks) assert.match(related, new RegExp(`<a href="${href}"(?: aria-current="page")?>${label}</a>`), file);
  assert.match(related, new RegExp(`<a href="${file}" aria-current="page">${title}</a>`), file);
  assert.equal((related.match(/aria-current="page"/g) || []).length, 1, file);
  assert.ok(legalLinks.map(([href]) => related.indexOf(`href="${href}"`)).every((position, index, positions) => index === 0 || position > positions[index - 1]), `${file}: legal link order`);
 }

 const pages = fs.readdirSync(next).filter(name => name.endsWith(".html"));
 for (const file of pages) {
  const html = fs.readFileSync(path.join(next, file), "utf8");
  const footer = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer, `${file}: footer missing`);
  assert.match(footer, /href="https:\/\/www\.facebook\.com\/kielsfitness\/\?locale=de_DE">Facebook<\/a>/, file);
  assert.match(footer, /href="https:\/\/www\.instagram\.com\/kielsfitness\/\?hl=de">Instagram<\/a>/, file);
  assert.doesNotMatch(footer, /Facebook ↗|Instagram ↗/, file);
  assert.doesNotMatch(html, /facebook\.com\/plugins|instagram\.com\/embed|connect\.facebook\.net|platform\.instagram\.com/i, file);
 }

 const css = fs.readFileSync(path.join(next, "home.css"), "utf8");
 assert.match(css, /\.social-links a\[href\*="facebook\.com"\]::before/);
 assert.match(css, /\.social-links a\[href\*="instagram\.com"\]::before/);
 assert.equal((css.match(/data:image\/svg\+xml/g) || []).length, 4);
 assert.doesNotMatch(css, /https?:\/\/[^)"']*(?:icon|facebook|instagram)/i);
 assert.match(css, /\.social-links a \{[\s\S]*height: 44px;[\s\S]*border-radius: 999px;/);
 assert.match(css, /\.site-footer \.social-links a:hover \{[\s\S]*border-color: rgba\(253,199,30,\.62\);/);
 assert.match(css, /\.related \{ display: flex; flex-wrap: wrap;/);
 assert.match(css, /\.legal-content \.related a \{[\s\S]*min-height: 48px;/);
 assert.match(css, /\.legal-content \.related a\[aria-current="page"\]/);
 assert.match(css, /\.legal-content \.related a \{ flex: 1 1 140px; \}/);
});
test("deployment builder reads server runtime configuration without embedding credentials", () => {
 const source = fs.readFileSync(path.join(root, "tools", "build-staging.cjs"), "utf8");
 assert.match(source, /fs\.writeFileSync\(path\.join\(contactFunctionRoot, "api", "contact\.js"\), handler\)/);
 assert.match(source, /highlevel-readiness\.func/);
 assert.match(source, /api\/highlevel-readiness/);
 assert.match(source, /launcherType: "Nodejs", shouldAddHelpers: true/);
 assert.match(source, /HIGHLEVEL_PRIVATE_TOKEN and HIGHLEVEL_LOCATION_ID at runtime/);
 assert.doesNotMatch(source, /HIGHLEVEL_ENABLED:\s*["']false["']/);
 assert.doesNotMatch(source, /HIGHLEVEL_PRIVATE_TOKEN:\s*["'][^"']+["']/);
 assert.doesNotMatch(source, /HIGHLEVEL_LOCATION_ID:\s*["'][^"']+["']/);
 assert.match(source, /robots\.txt/);
 assert.match(source, /sitemap\.xml/);
 assert.doesNotMatch(source, /X-Robots-Tag|noindex, nofollow/);
 assert.doesNotMatch(source, /--prod|HIGHLEVEL_WEBHOOK_URL:/);
});
test("fresh deployment artifact includes every local script and stylesheet referenced by Next pages", async () => {
 const output = path.join(root, ".vercel", `output-test-${crypto.randomUUID()}`);
 try {
  execFileSync(process.execPath, [path.join(root, "tools", "build-staging.cjs"), "--output", output]);
  const staticRoot = path.join(output, "static");
  assert.ok(fs.existsSync(path.join(staticRoot, "robots.txt")));
  assert.ok(fs.existsSync(path.join(staticRoot, "sitemap.xml")));
  const config = JSON.parse(fs.readFileSync(path.join(output, "config.json")));
  assert.doesNotMatch(JSON.stringify(config), /noindex|nofollow/i);
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
test("go-live SEO files, canonicals and intent routing are complete", () => {
 const pages = fs.readdirSync(next).filter(name => name.endsWith(".html"));
 assert.equal(pages.length, 13);
 for (const file of pages) {
  const html = fs.readFileSync(path.join(next, file), "utf8");
  assert.doesNotMatch(html, /noindex|nofollow/i, file);
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"|<link\b[^>]*href="([^"]+)"[^>]*rel="canonical"/i);
  assert.ok(canonical, `${file}: canonical missing`);
  assert.match(canonical[1] || canonical[2], /^https:\/\/www\.kiel-fitness\.de\//, file);
 }
 const robots = fs.readFileSync(path.join(next, "robots.txt"), "utf8");
 assert.match(robots, /User-agent: \*/);
 assert.match(robots, /Allow: \//);
 assert.match(robots, /Sitemap: https:\/\/www\.kiel-fitness\.de\/sitemap\.xml/);
 const sitemap = fs.readFileSync(path.join(next, "sitemap.xml"), "utf8");
 for (const file of pages) {
  const location = file === "index.html" ? "https://www.kiel-fitness.de/" : `https://www.kiel-fitness.de/${file}`;
  assert.match(sitemap, new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
 }
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 assert.equal((home.match(/href="kontakt\.html\?interest=membership"/g) || []).length, 3);
 const script = fs.readFileSync(path.join(next, "script.js"), "utf8");
 assert.match(script, /requestedInterest/);
 assert.match(script, /interestInput\.checked = true/);
 assert.match(script, /kontakt\.html\?interest=\$\{interest\}/);
});
test("privacy publication matches actual forms and avoids unverified legal claims", () => {
 const privacy = fs.readFileSync(path.join(next, "datenschutz.html"), "utf8");
 const contact = fs.readFileSync(path.join(next, "kontakt.html"), "utf8");
 const employer = fs.readFileSync(path.join(next, "firmenfitness.html"), "utf8");
 const referral = fs.readFileSync(path.join(next, "arbeitgeber-empfehlen.html"), "utf8");
 for (const text of [
  "KIELS Fitness GmbH",
  "mail@kiel-fitness.de",
  "Vercel",
  "HighLevel beziehungsweise LeadConnector",
  "UTM- oder Anzeigenparameter",
  "keine eigenen Cookies",
  "weder Local Storage noch Session Storage",
  "keine Webanalyse-Dienste, Marketingpixel",
  "Diese Dienste sind nicht in die Website eingebettet.",
  "keine ausschließlich automatisierte Entscheidung"
 ]) assert.match(privacy, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
 for (const unsupported of [
  "DSGVO-konform",
  "EU-US Data Privacy Framework",
  "Standardvertragsklauseln",
  "Auftragsverarbeitungsvertrag abgeschlossen",
  "Datenschutzerklärungs-Generator"
 ]) assert.doesNotMatch(privacy, new RegExp(unsupported, "i"));
 assert.match(contact, /Bitte keine Gesundheitsdaten, Diagnosen oder InBody-Werte übermitteln\./);
 assert.match(employer, /Keine Gesundheitsdaten oder Kontaktdaten von Beschäftigten übermitteln\./);
 assert.match(referral, /Bitte keine Namen, Kontaktdaten oder Gesundheitsdaten anderer Personen angeben\./);
 for (const page of fs.readdirSync(next).filter(name => name.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(next, page), "utf8");
  assert.doesNotMatch(html, /<iframe|<script[^>]+src="https?:|<link[^>]+href="https?:[^>]+stylesheet/i, page);
 }
});
test("house rules mirror the approved working draft and are wired into legal navigation", () => {
 const pages = fs.readdirSync(next).filter(name => name.endsWith(".html"));
 const rules = fs.readFileSync(path.join(next, "hausordnung.html"), "utf8");
 const terms = fs.readFileSync(path.join(next, "agbs.html"), "utf8");
 assert.match(rules, /<title>Hausordnung \| KIELS Fitness GmbH<\/title>/);
 assert.match(rules, /href="https:\/\/www\.kiel-fitness\.de\/hausordnung\.html" rel="canonical"|rel="canonical" href="https:\/\/www\.kiel-fitness\.de\/hausordnung\.html"/);
 assert.equal((rules.match(/<section class="legal-section">/g) || []).length, 13);
 for (const text of [
  "Die Nutzung von Smartphones ist grundsätzlich erlaubt, solange andere Personen nicht beeinträchtigt werden.",
  "Foto-, Video- oder Tonaufnahmen, auf denen andere Mitglieder, Gäste oder Mitarbeitende erkennbar sind, dürfen nur mit deren vorheriger Einwilligung angefertigt und verwendet werden.",
  "Eigene Aufgüsse sowie das Mitbringen oder Verwenden eigener Saunaöle, Duftstoffe, ätherischer Öle oder sonstiger Zusätze sind ausdrücklich untersagt.",
  "Die Maßnahmen müssen verhältnismäßig sein; weitergehende gesetzliche Rechte bleiben unberührt.",
  "Arbeitsfassung V1 · Stand 07.10.2026 · Vor produktiver Einführung rechtlich final prüfen."
 ]) assert.match(rules, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
 assert.match(rules, /<nav class="related"[^>]*><a href="impressum\.html">Impressum<\/a><a href="datenschutz\.html">Datenschutz<\/a><a href="agbs\.html">AGB<\/a><a href="hausordnung\.html" aria-current="page">Hausordnung<\/a><\/nav>/);
 assert.match(terms, /<a href="hausordnung\.html">Hausordnung<\/a> dient Sicherheit/);
 for (const page of pages) {
  const html = fs.readFileSync(path.join(next, page), "utf8");
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] || "";
  assert.match(footer, /href="hausordnung\.html">Hausordnung<\/a>/, page);
 }
});
test("membership publication remains compatible with the contract master", () => {
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 const membership = home.match(/<section class="section membership[\s\S]*?<\/section>/)?.[0] || "";
 for (const term of ["24 Monate Laufzeit", "12 Monate Laufzeit", "6 Monate Laufzeit", "/14-tägig"]) {
  assert.match(membership, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
 }
 assert.match(membership, /Zusätzlich wird einmalig eine Betreuungspauschale fällig\./);
 assert.doesNotMatch(membership, /Betreuungspauschale[^.]*enthalten|Kündig|verlänger|Vertragsabschluss|Jetzt Mitglied werden/i);
 const terms = fs.readFileSync(path.join(next, "agbs.html"), "utf8");
 for (const legacy of [
  "6 Wochen zum Ablauf",
  "stillschweigend jeweils um ein Jahr",
  "bedürfen der Schriftform",
  "Gebühr von 3,00 €",
  "sofort zur Zahlung fällig",
  "leichte Fahrlässigkeit ausgeschlossen",
  "Umkreis von 3 km",
  "Übertragung des Vertragsgegenstandes auf Dritte ist jederzeit möglich"
 ]) assert.doesNotMatch(terms, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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
 assert.doesNotMatch(reviews[0], /Zusammenfassung|Weitere Eindrücke|Originalzitat|review-kind|review-summary|★/);
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
test("Google reviews use desktop, tablet and mobile layouts with one member review CTA", () => {
 const css = fs.readFileSync(path.join(next, "home.css"), "utf8");
 assert.match(css, /\.review-carousel \{ --review-visible: 3; --review-card-width: calc\(\(100% - 40px\) \/ 3\); \}/);
 assert.match(css, /@media \(max-width: 1000px\)[\s\S]*?\.review-carousel \{ --review-visible: 2; \}/);
 assert.match(css, /\.review-quote \{[^}]*height: 300px;/);
 assert.match(css, /-webkit-line-clamp: 5/);
 assert.match(css, /@media \(max-width: 699px\)[\s\S]*?\.review-carousel \{ --review-visible: 1; \}/);
 assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 assert.doesNotMatch(home.match(/<div class="review-proof[\s\S]*?<\/div>/)[0], /google\.com\/maps\/search/);
 const memberCta = home.match(/<aside class="review-member-cta"[\s\S]*?<\/aside>/);
 assert.ok(memberCta);
 assert.match(memberCta[0], /Du kennst KIELS aus eigener Erfahrung\?/);
 assert.match(memberCta[0], /KIELS auf Google bewerten/);
 assert.match(memberCta[0], /href="https:\/\/search\.google\.com\/local\/writereview\?placeid=ChIJyQuPqQxWskcRfugnGqTPgIg"/);
 assert.match(memberCta[0], /target="_blank" rel="noopener noreferrer"/);
 assert.doesNotMatch(memberCta[0], /positive Bewertung|5 Sterne|Gegenleistung/i);
 assert.equal((home.match(/search\.google\.com\/local\/writereview/g) || []).length, 1);
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
 const bistroIndex = home.indexOf('id="bistro-lounge"');
 const extrasIndex = home.indexOf('id="extras-title"');
 const openingIndex = home.indexOf('id="opening-title"');
 assert.ok(extrasIndex >= 0 && extrasIndex < bistroIndex && bistroIndex < openingIndex);
 assert.match(home, /href="#bistro-lounge">Bistro &amp; Lounge ansehen/);
 assert.match(home, /src="assets\/kiels-authentic\/gastronomie-kaffeeuebergabe-800\.webp"[^>]*alt="Eine KIELS-Mitarbeiterin reicht einem Mitglied am Bistro-Tresen einen Kaffee"[^>]*loading="lazy"[^>]*width="1600" height="1200"/);
 assert.doesNotMatch(home, /Bistro im Wellnessbereich|href="wellness\.html">Bistro/);
 const wellness = fs.readFileSync(path.join(next, "wellness.html"), "utf8");
 assert.match(wellness, /Bistro &amp; Lounge findest du direkt beim Empfang/);
 assert.match(wellness, /href="index\.html#bistro-lounge"/);
 assert.doesNotMatch(wellness, /<h2>Bistro &amp; Lounge<\/h2>|Zwischen den Saunagängen/);
 const fitness = fs.readFileSync(path.join(next, "fitness.html"), "utf8");
 assert.match(fitness, /fitness-spaces-title/);
 assert.match(fitness, /fitness-strength-authentic\.webp/);
 assert.match(fitness, /fitness-equipment-authentic\.webp/);
 assert.match(wellness, /wellness-mixed-sauna-authentic\.webp/);
 assert.match(wellness, /wellness-women-sauna-authentic\.webp/);
 const assets = [
  "home-arrival-authentic.webp", "home-training-authentic.webp", "home-lounge-authentic.webp",
  "fitness-strength-authentic.webp", "fitness-equipment-authentic.webp",
  "wellness-mixed-sauna-authentic.webp", "wellness-women-sauna-authentic.webp"
 ];
 for (const asset of assets) {
  const file = path.join(next, "assets", asset);
  assert.ok(fs.statSync(file).size < 500_000, `${asset} is optimized for web delivery`);
  assert.equal(fs.readFileSync(file).toString("ascii", 8, 12), "WEBP", `${asset} is WebP`);
  const references = [home, fitness, wellness].join("\n");
  assert.match(references, new RegExp(`src="assets/${asset}"[^>]*alt="[^"]+"[^>]*loading="lazy"[^>]*width="1800" height="(?:1200|1013)"`));
 }
});
test("current Biosauna photo is used while the mixed sauna and health diagnostics stay distinct", () => {
 const wellness = fs.readFileSync(path.join(next, "wellness.html"), "utf8");
 const styles = fs.readFileSync(path.join(next, "styles.css"), "utf8");
 const health = fs.readFileSync(path.join(next, "health.html"), "utf8");
 const biosaunaAsset = "studio-2026/kiels-fitness-biosauna-wellness-2026.webp";
 assert.match(wellness, new RegExp(`<img src="assets/${biosaunaAsset}" alt="Biosauna im KIELS Fitnessstudio in Kiel" loading="lazy" width="1800" height="1350">`));
 assert.doesNotMatch(`${wellness}\n${styles}`, /assets\/biosauna\.png/);
 assert.match(wellness, /wellness-mixed-sauna-authentic\.webp/);
 assert.match(wellness, /wellness-women-sauna-authentic\.webp/);
 assert.match(health, /Körperanalyse mit InBody 770/);
 assert.match(health, /Eingangsdiagnostik bilden sie eine nachvollziehbare Grundlage für deinen individuellen Trainingsplan/);
 assert.match(health, /health-dr-hosch-original\.png/);
 assert.match(health, /<h1>Gesundheitstraining in Kiel/);
 assert.match(fs.readFileSync(path.join(next, "home.css"), "utf8"), /body\[data-page="health"\] \.page-hero h1 \{ font-size: clamp\(28px,8vw,34px\); \}/);
 const image = fs.readFileSync(path.join(next, "assets", biosaunaAsset));
 assert.equal(image.toString("ascii", 8, 12), "WEBP");
 assert.ok(image.length < 500_000);
});
test("health page presents the authentic InBody 770 photo with a responsive assessment flow", () => {
 const health = fs.readFileSync(path.join(next, "health.html"), "utf8");
 const css = fs.readFileSync(path.join(next, "home.css"), "utf8");
 const asset = "assets/studio-2026/kiels-fitness-inbody-770-diagnostikraum-2026.webp";
 assert.match(health, new RegExp(`<img src="${asset}" alt="InBody 770 im Diagnostikraum des KIELS Fitnessstudios in Kiel" loading="lazy" width="1800" height="1350">`));
 assert.doesNotMatch(health, /inbody-770-placeholder|Übergangsvisual – ein eigenes KIELS-Foto folgt/);
 assert.match(health, /Körperfettanteil/);
 assert.match(health, /Muskelmasse/);
 assert.match(health, /Körperwasser · ECW\/ICW/);
 assert.match(health, /Viszerales Fett/);
 assert.match(health, /Phasenwinkel/);
 assert.match(health, /<strong>Analyse<\/strong>[\s\S]*<strong>Eingangsdiagnostik<\/strong>[\s\S]*<strong>Individueller Trainingsplan<\/strong>/);
 assert.match(css, /\.health-analysis \{ display: grid; grid-template-columns: minmax\(0,\.95fr\) minmax\(0,1\.05fr\);/);
 assert.match(css, /\.health-analysis \{ grid-template-columns: 1fr; \}/);
 assert.equal(fs.readFileSync(path.join(next, asset)).toString("ascii", 8, 12), "WEBP");
});
test("all six 2026 studio photos are optimized, four are placed, and both bistro views stay reserve-only", () => {
 const home = fs.readFileSync(path.join(next, "index.html"), "utf8");
 const wellness = fs.readFileSync(path.join(next, "wellness.html"), "utf8");
 const health = fs.readFileSync(path.join(next, "health.html"), "utf8");
 const used = {
  "kiels-fitness-biosauna-wellness-2026.webp": wellness,
  "kiels-fitness-inbody-770-diagnostikraum-2026.webp": health,
  "kiels-fitness-kneippgang-kaltwasserbereich-2026.webp": wellness,
  "kiels-fitness-wellness-aussenterrasse-2026.webp": wellness
 };
 for (const [asset, html] of Object.entries(used)) {
  const file = path.join(next, "assets", "studio-2026", asset);
  assert.ok(fs.statSync(file).size < 700_000, `${asset} is optimized for web delivery`);
  assert.equal(fs.readFileSync(file).toString("ascii", 8, 12), "WEBP", `${asset} is WebP`);
  assert.match(html, new RegExp(`src="assets/studio-2026/${asset}"[^>]*loading="lazy"[^>]*width="1800" height="1350"`));
 }
 for (const reserve of ["kiels-fitness-bistro-tresen-01-2026.webp", "kiels-fitness-bistro-tresen-02-2026.webp"]) {
  const reserveFile = path.join(next, "assets", "studio-2026", reserve);
  assert.ok(fs.statSync(reserveFile).size < 700_000);
  assert.equal(fs.readFileSync(reserveFile).toString("ascii", 8, 12), "WEBP");
  assert.doesNotMatch(`${home}\n${wellness}\n${health}`, new RegExp(reserve));
 }
 assert.match(wellness, /alt="Kneipp- und Kaltwasserbereich im KIELS Wellnessbereich"/);
 assert.match(wellness, /alt="Außenterrasse mit Liegen im KIELS Fitnessstudio in Kiel"/);
 assert.match(wellness, /Das Foto zeigt den Kneipp- und Kaltwasserbereich\./);
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
 const focus = { index: "Fitnessstudio", fitness: "Fitnesstraining", health: "Gesundheitstraining", kurse: "Fitnesskurse", wellness: "Fitnessstudio mit Sauna", kinderbetreuung: "Fitness", kontakt: "Kontakt" };
 const titles = new Set(), descriptions = new Set();
 for (const [page, intent] of Object.entries(focus)) {
  const html = fs.readFileSync(path.join(next, page + ".html"), "utf8");
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const meta = html.match(/<meta[^>]*name="description"[^>]*>|<meta[^>]*content="[^"]*"[^>]*name="description"[^>]*>/g) || [];
  assert.equal(meta.length, 1, page);
  const description = meta[0].match(/content="([^"]+)"/)[1];
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*>|<link[^>]*href="[^"]*"[^>]*rel="canonical"[^>]*>/g) || [];
  assert.equal(canonical.length, 1, page);
  const expectedCanonical = page === "index"
   ? "https://www.kiel-fitness.de/"
   : `https://www.kiel-fitness.de/${page}.html`;
  assert.ok(canonical[0].includes(`href="${expectedCanonical}"`));
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
