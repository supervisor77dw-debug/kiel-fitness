const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const next = path.join(root, "site-versions", "02-next");
const shared = path.join(root, "site-versions", "shared");
const vercelOutput = path.join(root, ".vercel");
const outputArgument = process.argv.indexOf("--output");
const output = outputArgument === -1
 ? path.join(vercelOutput, "output")
 : path.resolve(process.argv[outputArgument + 1] || "");
if (path.dirname(output) !== vercelOutput) {
 throw new Error("Custom build output must be a direct child of .vercel.");
}
if (fs.existsSync(output)) throw new Error("Staging output already exists. Inspect and explicitly remove this generated output before rebuilding.");
const staticRoot = path.join(output, "static");
const functionsRoot = path.join(output, "functions", "api");
const contactFunctionRoot = path.join(functionsRoot, "contact.func");
const readinessFunctionRoot = path.join(functionsRoot, "highlevel-readiness.func");
fs.mkdirSync(staticRoot, { recursive: true });
fs.mkdirSync(path.join(contactFunctionRoot, "lib"), { recursive: true });
fs.mkdirSync(path.join(readinessFunctionRoot, "lib"), { recursive: true });
const files = [];
function copy(source, destination, relative) {
 fs.mkdirSync(path.dirname(destination), { recursive: true });
 fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
 files.push({ path: relative, sha256: crypto.createHash("sha256").update(fs.readFileSync(source)).digest("hex") });
}
const resources = new Set();
for (const entry of fs.readdirSync(next)) {
 if (!entry.endsWith(".html") && !["home.css", "script.js"].includes(entry)) continue;
 copy(path.join(next, entry), path.join(staticRoot, entry), entry);
 const text = fs.readFileSync(path.join(next, entry), "utf8");
 for (const match of text.matchAll(/(?:src|href)="([^"]+)"|url\(["']?([^"')]+)["']?\)/g)) {
  const resource = decodeURIComponent(match[1] || match[2]);
  if (/^(assets|wix-clone)\//.test(resource)) {
   if (resource.split("/").includes("..") || resource.includes("\\")) throw new Error("Unsafe resource path.");
   resources.add(resource);
  }
 }
}
for (const relative of resources) {
 const own = path.join(next, relative);
 const source = fs.existsSync(own) ? own : path.join(shared, relative);
 copy(source, path.join(staticRoot, relative), relative);
}
const handler = fs.readFileSync(path.join(next, "api", "contact.js"), "utf8");
fs.mkdirSync(path.join(contactFunctionRoot, "api"), { recursive: true });
fs.writeFileSync(path.join(contactFunctionRoot, "api", "contact.js"), handler);
for (const file of ["contact.js", "highlevel.js"]) {
 copy(path.join(next, "lib", file), path.join(contactFunctionRoot, "lib", file), "function/lib/" + file);
}
copy(path.join(root, "tools", "contact-http.cjs"), path.join(contactFunctionRoot, "contact-http.cjs"), "function/contact-http.cjs");
fs.writeFileSync(path.join(contactFunctionRoot, "entry.cjs"), `const handler = require("./api/contact");
const { MAX_BODY_BYTES } = require("./lib/contact");
const { serveContact } = require("./contact-http.cjs");
module.exports = (req, res) => serveContact(req, res, { handler, maxBytes: MAX_BODY_BYTES });
`);
fs.writeFileSync(path.join(contactFunctionRoot, ".vc-config.json"), JSON.stringify({ runtime: "nodejs22.x", handler: "entry.cjs", launcherType: "Nodejs", maxDuration: 15 }, null, 2));
fs.mkdirSync(path.join(readinessFunctionRoot, "api"), { recursive: true });
copy(path.join(next, "api", "highlevel-readiness.js"), path.join(readinessFunctionRoot, "api", "highlevel-readiness.js"), "function/api/highlevel-readiness.js");
copy(path.join(next, "lib", "highlevel.js"), path.join(readinessFunctionRoot, "lib", "highlevel.js"), "function/readiness-lib/highlevel.js");
fs.writeFileSync(path.join(readinessFunctionRoot, "entry.cjs"), 'module.exports = require("./api/highlevel-readiness");\n');
fs.writeFileSync(path.join(readinessFunctionRoot, ".vc-config.json"), JSON.stringify({ runtime: "nodejs22.x", handler: "entry.cjs", launcherType: "Nodejs", shouldAddHelpers: true, maxDuration: 12 }, null, 2));
fs.writeFileSync(path.join(output, "config.json"), JSON.stringify({
 version: 3,
 routes: [
  { src: "/(.*)", headers: { "X-Robots-Tag": "noindex, nofollow" }, continue: true },
  { src: "/api/contact", dest: "/api/contact" },
  { src: "/api/highlevel-readiness", dest: "/api/highlevel-readiness" },
  { handle: "filesystem" },
  { src: "/", dest: "/index.html" }
 ]
}, null, 2));
fs.writeFileSync(path.join(output, "staging-manifest.json"), JSON.stringify({
 mode: "staging",
 delivery: "Server-only; requires HIGHLEVEL_PRIVATE_TOKEN and HIGHLEVEL_LOCATION_ID at runtime",
 sourceRoot: "site-versions/02-next",
 resources: resources.size,
 files
}, null, 2));
console.log("Staging output prepared:", files.length, "files,", resources.size, "resources. Delivery requires server-only runtime configuration; no credentials embedded.");
