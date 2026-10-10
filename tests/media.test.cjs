const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { auditMedia, productiveSourceFiles } = require("../tools/media-audit.cjs");

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
  (entry.approvedOriginal && !entry.originalExists)
 );
 assert.equal(missing, "", missing);
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
