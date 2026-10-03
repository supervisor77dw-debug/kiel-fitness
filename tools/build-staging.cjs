const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const next = path.join(root, "site-versions", "02-next");
const shared = path.join(root, "site-versions", "shared");
const output = path.join(root, ".vercel", "output");
if (fs.existsSync(output)) throw new Error("Staging output already exists. Inspect and explicitly remove this generated output before rebuilding.");
const staticRoot = path.join(output, "static");
const functionRoot = path.join(output, "functions", "api", "contact.func");
fs.mkdirSync(staticRoot, { recursive: true });
fs.mkdirSync(path.join(functionRoot, "lib"), { recursive: true });
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
fs.mkdirSync(path.join(functionRoot, "api"), { recursive: true });
fs.writeFileSync(path.join(functionRoot, "api", "contact.js"), handler.replace(
 "module.exports = createContactHandler();",
 'module.exports = createContactHandler({ submitLead: createHighLevelAdapter({ env: { HIGHLEVEL_ENABLED: "false" } }) });'
));
if (fs.readFileSync(path.join(functionRoot, "api", "contact.js"), "utf8") === handler) throw new Error("Failed to install staging-only delivery guard.");
for (const file of ["contact.js", "highlevel.js"]) {
 copy(path.join(next, "lib", file), path.join(functionRoot, "lib", file), "function/lib/" + file);
}
copy(path.join(root, "tools", "contact-http.cjs"), path.join(functionRoot, "contact-http.cjs"), "function/contact-http.cjs");
fs.writeFileSync(path.join(functionRoot, "entry.cjs"), `const handler = require("./api/contact");
const { MAX_BODY_BYTES } = require("./lib/contact");
const { serveContact } = require("./contact-http.cjs");
module.exports = (req, res) => serveContact(req, res, { handler, maxBytes: MAX_BODY_BYTES });
`);
fs.writeFileSync(path.join(functionRoot, ".vc-config.json"), JSON.stringify({ runtime: "nodejs22.x", handler: "entry.cjs", launcherType: "Nodejs", maxDuration: 15 }, null, 2));
fs.writeFileSync(path.join(output, "config.json"), JSON.stringify({
 version: 3,
 routes: [
  { src: "/(.*)", headers: { "X-Robots-Tag": "noindex, nofollow" }, continue: true },
  { src: "/api/contact", dest: "/api/contact" },
  { handle: "filesystem" },
  { src: "/", dest: "/index.html" }
 ]
}, null, 2));
fs.writeFileSync(path.join(output, "staging-manifest.json"), JSON.stringify({ mode: "demonstration", highLevelEnabled: false, sourceRoot: "site-versions/02-next", resources: resources.size, files }, null, 2));
console.log("Staging output prepared:", files.length, "files,", resources.size, "resources. Delivery is unconditionally disabled; no credentials embedded.");
