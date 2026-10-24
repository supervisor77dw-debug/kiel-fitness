const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { approvedMediaManifest, auditMedia, collectMediaReferences, productiveSourceFiles, webpSize } = require("../tools/media-audit.cjs");

const root = path.resolve(__dirname, "..");
const output = path.join(root, ".vercel", `media-audit-${process.pid}`);

function failures(entries, predicate) {
 return entries
  .filter(predicate)
  .map(entry => `${entry.sourceFile}:${entry.line} -> ${entry.path}`)
  .join("\n");
}

async function removeOutput() {
 for (let attempt = 0; attempt < 8 && fs.existsSync(output); attempt++) {
  try { fs.rmSync(output, { recursive: true, force: true }); }
  catch (error) {
   if (attempt === 7) throw error;
   await new Promise(resolve => setTimeout(resolve, 250));
  }
 }
}

test("all productive media references resolve with exact case and valid files", async () => {
 const entries = await auditMedia();
 assert.equal(productiveSourceFiles().filter(file => file.endsWith(".html")).length, 13);
 assert.ok(entries.length > 50, "expected a complete media inventory");
 const missing = failures(entries, entry =>
  entry.unsafe || !entry.sourceExists || !entry.exactCase || !entry.validMedia || !entry.gitTracked ||
  entry.approvedIntegrity === false
 );
 assert.equal(missing, "", missing);
});

// Etappe 6 (AW-20261024-GE-CLAUDE-KIELS-NEXT-UEBERNAHME-006-TESTFINAL): Die freigegebenen Originale bleiben bewusst ausserhalb des
// oeffentlichen Repositorys. Verbindlich sind die versionierten Ableitungen laut site-versions/approved-media-manifest.json.
test("approved authentic derivatives match the integrity manifest and originals stay out of the repository", () => {
 const manifest = approvedMediaManifest();
 const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString("utf8").split("\0").filter(Boolean).map(value => value.replaceAll("\\", "/"));
 const nextDir = path.join(root, "site-versions", "02-next");
 assert.equal(manifest.schema, "kiels.approved-media/1");
 assert.equal(manifest.originals.length, 5);
 const listed = new Set();
 for (const entry of manifest.originals) {
  assert.match(entry.originalSha256, /^[0-9a-f]{64}$/, entry.original);
  assert.equal(entry.originalInRepository, false, entry.original);
  const originalName = path.posix.basename(entry.original);
  assert.ok(!tracked.some(file => path.posix.basename(file) === originalName), `${originalName} darf nicht versioniert sein`);
  assert.ok(entry.derivatives.length >= 2, `${entry.original}: responsive Varianten fehlen`);
  const widths = entry.derivatives.map(item => item.width);
  assert.equal(Math.max(...widths), 2 * Math.min(...widths), `${entry.original}: Standard- und doppelte Breite erwartet`);
  for (const derivative of entry.derivatives) {
   listed.add(derivative.path);
   const relative = `site-versions/02-next/${derivative.path}`;
   assert.ok(tracked.includes(relative), `${relative} nicht versioniert`);
   const buffer = fs.readFileSync(path.join(nextDir, ...derivative.path.split("/")));
   assert.equal(buffer.length, derivative.bytes, `${derivative.path}: Groesse`);
   assert.deepEqual(webpSize(buffer), { width: derivative.width, height: derivative.height }, `${derivative.path}: kein gueltiges WebP oder falsche Masse`);
   assert.ok(derivative.width <= entry.originalWidth && derivative.height <= entry.originalHeight, `${derivative.path}: groesser als das Original`);
   assert.equal(createHash("sha256").update(buffer).digest("hex"), derivative.sha256, `${derivative.path}: Pruefsumme`);
  }
  for (const page of entry.pages) {
   const html = fs.readFileSync(path.join(nextDir, page), "utf8");
   for (const derivative of entry.derivatives) assert.ok(html.includes(derivative.path), `${page}: ${derivative.path} nicht referenziert`);
  }
 }
 // keine authentische Ableitung ausserhalb des Manifests, weder im Bestand noch in den Seiten
 const authenticFiles = tracked.filter(file => /^site-versions\/02-next\/assets\/kiels-authentic\/[^/]+$/.test(file)).map(file => file.slice("site-versions/02-next/".length));
 assert.deepEqual(authenticFiles.sort(), [...listed].sort());
 const referenced = new Set(collectMediaReferences().filter(item => /^assets\/kiels-authentic\//.test(item.path)).map(item => item.path));
 for (const item of referenced) assert.ok(listed.has(item), `${item} nicht im Freigabemanifest`);
 const declaredPages = new Set(manifest.originals.flatMap(entry => entry.pages));
 for (const item of referenced) assert.ok(manifest.originals.some(entry => entry.derivatives.some(d => d.path === item) && entry.pages.length), `${item}: verwendende Seite nicht im Manifest`);
 assert.ok(declaredPages.size > 0);
});

test("the published build contains and serves every local media URL", async () => {
 await removeOutput();
 try {
  execFileSync(process.execPath, [path.join(root, "tools", "build-staging.cjs"), "--output", output], { cwd: root });
  const staticRoot = path.join(output, "static");
  const built = await auditMedia({ buildRoot: staticRoot });
  const missing = failures(built, entry => entry.buildExists === false);
  assert.equal(missing, "", missing);

  const server = http.createServer((request, response) => {
   let pathname;
   try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, ""); }
   catch { response.writeHead(400).end(); return; }
   const filename = path.resolve(staticRoot, ...pathname.split("/"));
   if (!filename.startsWith(staticRoot + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    response.writeHead(404).end();
    return;
   }
   response.writeHead(200, { "Content-Length": fs.statSync(filename).size });
   response.end(request.method === "HEAD" ? undefined : fs.readFileSync(filename));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
   const baseUrl = `http://127.0.0.1:${server.address().port}/`;
   const served = await auditMedia({ baseUrl });
   const failing = failures(served, entry => entry.liveStatus !== 200);
   assert.equal(failing, "", failing);
  } finally {
   await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
 } finally {
  await removeOutput();
 }
});

test("deployed media URLs return HTTP 200 when MEDIA_AUDIT_BASE_URL is provided", {
 skip: !process.env.MEDIA_AUDIT_BASE_URL
}, async () => {
 const entries = await auditMedia({ baseUrl: process.env.MEDIA_AUDIT_BASE_URL });
 const failing = failures(entries, entry => entry.liveStatus !== 200);
 assert.equal(failing, "", failing);
});
