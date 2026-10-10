const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const nextRoot = path.join(root, "site-versions", "02-next");
const sharedRoot = path.join(root, "site-versions", "shared");
const mediaExtension = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)(?:$|[?#])/i;

function normalizeReference(reference) {
 const value = reference.trim();
 if (!value || /^(?:data:|https?:|mailto:|tel:|#)/i.test(value)) return null;
 let pathname = value.split(/[?#]/, 1)[0].replace(/^\.\//, "").replace(/^\/+/, "");
 try { pathname = decodeURIComponent(pathname); }
 catch (error) {
  if (!(error instanceof URIError)) throw error;
  return { unsafe: true, path: pathname, reason: "invalid URL encoding" };
 }
 if (!/^(?:assets|wix-clone)\//.test(pathname)) return null;
 if (pathname.includes("\\") || pathname.split("/").includes("..")) {
  return { unsafe: true, path: pathname, reason: "unsafe path" };
 }
 return { unsafe: false, path: pathname };
}

function lineAt(text, index) {
 let line = 1;
 for (let position = 0; position < index; position++) if (text.charCodeAt(position) === 10) line++;
 return line;
}

function extractMediaReferences(text, sourceFile) {
 const references = [];
 const seen = new Set();
 function add(kind, raw, index) {
  if (!mediaExtension.test(raw)) return;
  const normalized = normalizeReference(raw);
  if (!normalized) return;
  const key = `${kind}\0${raw}\0${index}`;
  if (seen.has(key)) return;
  seen.add(key);
  references.push({
   sourceFile,
   line: lineAt(text, index),
   kind,
   raw,
   path: normalized.path,
   unsafe: normalized.unsafe,
   reason: normalized.reason || null
  });
 }
 for (const match of text.matchAll(/\b(src|href|poster)\s*=\s*["']([^"']+)["']/gi)) {
  add(match[1].toLowerCase(), match[2], match.index);
 }
 for (const match of text.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
  for (const candidate of match[1].split(",")) {
   const value = candidate.trim().split(/\s+/, 1)[0];
   add("srcset", value, match.index);
  }
 }
 for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
  add("css-url", match[1], match.index);
 }
 if (path.extname(sourceFile).toLowerCase() === ".js") {
  for (const match of text.matchAll(/["'`]([^"'`]+\.(?:avif|gif|ico|jpe?g|png|svg|webp)(?:[?#][^"'`]*)?)["'`]/gi)) {
   add("javascript-string", match[1], match.index);
  }
 }
 return references;
}

function productiveSourceFiles() {
 const htmlFiles = fs.readdirSync(nextRoot).filter(name => name.endsWith(".html"));
 const files = new Set(htmlFiles);
 for (const htmlFile of htmlFiles) {
  const text = fs.readFileSync(path.join(nextRoot, htmlFile), "utf8");
  for (const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+\.(?:css|js)(?:[?#][^"']*)?)["']/gi)) {
   const reference = match[1].split(/[?#]/, 1)[0].replace(/^\.\//, "");
   if (/^(?:https?:|\/)|\\|\.\./i.test(reference)) continue;
   if (fs.existsSync(path.join(nextRoot, reference))) files.add(reference);
  }
 }
 return [...files].sort();
}

function collectMediaReferences() {
 return productiveSourceFiles().flatMap(sourceFile => {
  const text = fs.readFileSync(path.join(nextRoot, sourceFile), "utf8");
  return extractMediaReferences(text, sourceFile);
 });
}

function hasExactCase(base, relative) {
 let directory = base;
 for (const segment of relative.split("/")) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return false;
  if (!fs.readdirSync(directory).includes(segment)) return false;
  directory = path.join(directory, segment);
 }
 return fs.existsSync(directory) && fs.statSync(directory).isFile();
}

function resolveSource(relative) {
 for (const [scope, base] of [["next", nextRoot], ["shared", sharedRoot]]) {
  const filename = path.join(base, ...relative.split("/"));
  if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {
   return { scope, filename, exactCase: hasExactCase(base, relative) };
  }
 }
 return null;
}

function validSignature(filename) {
 const extension = path.extname(filename).toLowerCase();
 const buffer = fs.readFileSync(filename);
 if (extension === ".webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
 if (extension === ".png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
 if (extension === ".jpg" || extension === ".jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
 if (extension === ".gif") return /^GIF8[79]a$/.test(buffer.toString("ascii", 0, 6));
 if (extension === ".svg") return /<svg[\s>]/i.test(buffer.toString("utf8", 0, Math.min(buffer.length, 4096)));
 if (extension === ".ico") return buffer.length >= 4 && buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0;
 if (extension === ".avif") return buffer.length >= 12 && buffer.toString("ascii", 4, 12).includes("ftyp");
 return false;
}

function approvedOriginal(relative) {
 const names = [
  [/^assets\/kiels-authentic\/aussenansicht-standort-\d+\.webp$/, "assets/kiels-authentic/kiels-aussenansicht-standort-freigabe-v01.png"],
  [/^assets\/kiels-authentic\/freihantelbereich-collage-\d+\.webp$/, "assets/kiels-authentic/KIELS-Freihantelbereich-Collage.png"],
  [/^assets\/kiels-authentic\/gastronomie-kaffeeuebergabe-\d+\.webp$/, "assets/kiels-authentic/KIELS-Gastronomie-Kaffeeuebergabe.png"],
  [/^assets\/kiels-authentic\/kinderhort-spiellandschaft-\d+\.webp$/, "assets/kiels-authentic/kiels-kinderhort-spiellandschaft-entwurf.png"],
  [/^assets\/kiels-authentic\/kinderhort-aufenthaltsbereich-\d+\.webp$/, "assets/kiels-authentic/kiels-kinderhort-aufenthaltsbereich-entwurf.png"]
 ];
 return names.find(([pattern]) => pattern.test(relative))?.[1] || null;
}

function trackedFiles() {
 const output = execFileSync("git", ["ls-files", "-z"], { cwd: root });
 return new Set(output.toString("utf8").split("\0").filter(Boolean).map(value => value.replaceAll("\\", "/")));
}

function encodePath(relative) {
 return relative.split("/").map(encodeURIComponent).join("/");
}

async function auditMedia({ buildRoot = null, baseUrl = null } = {}) {
 const tracked = trackedFiles();
 const statusByPath = new Map();
 const references = collectMediaReferences();
 if (baseUrl) {
  await Promise.all([...new Set(references.filter(item => !item.unsafe).map(item => item.path))].map(async relative => {
   const url = new URL(encodePath(relative), baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
   let response = await fetch(url, { method: "HEAD", redirect: "follow" });
   if (response.status === 405) response = await fetch(url, { method: "GET", redirect: "follow" });
   statusByPath.set(relative, { status: response.status, url: url.href });
  }));
 }
 return references.map(reference => {
  const resolved = reference.unsafe ? null : resolveSource(reference.path);
  const resolvedRelative = resolved ? path.relative(root, resolved.filename).replaceAll("\\", "/") : null;
  const original = approvedOriginal(reference.path);
  const buildFile = buildRoot && !reference.unsafe ? path.join(buildRoot, ...reference.path.split("/")) : null;
  const live = statusByPath.get(reference.path);
  return {
   ...reference,
   sourceExists: Boolean(resolved),
   exactCase: resolved?.exactCase || false,
   validMedia: resolved ? validSignature(resolved.filename) : false,
   resolvedSource: resolvedRelative,
   gitTracked: resolvedRelative ? tracked.has(resolvedRelative) : false,
   approvedOriginal: original,
   originalExists: original ? fs.existsSync(path.join(root, ...original.split("/"))) : null,
   buildExists: buildFile ? fs.existsSync(buildFile) && fs.statSync(buildFile).isFile() : null,
   liveStatus: live?.status || null,
   liveUrl: live?.url || null
  };
 });
}

function csvCell(value) {
 const text = value === null || value === undefined ? "" : String(value);
 return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(entries) {
 const columns = ["sourceFile", "line", "kind", "path", "resolvedSource", "sourceExists", "exactCase", "validMedia", "gitTracked", "approvedOriginal", "originalExists", "buildExists", "liveStatus", "liveUrl"];
 return [columns.join(","), ...entries.map(entry => columns.map(column => csvCell(entry[column])).join(","))].join("\n") + "\n";
}

function parseArguments(argv) {
 const result = {};
 for (let index = 0; index < argv.length; index++) {
  const argument = argv[index];
  if (["--base-url", "--build-root", "--json", "--csv"].includes(argument)) result[argument.slice(2)] = argv[++index];
  else throw new Error(`Unknown argument: ${argument}`);
 }
 return result;
}

async function main() {
 const options = parseArguments(process.argv.slice(2));
 const entries = await auditMedia({
  buildRoot: options["build-root"] ? path.resolve(options["build-root"]) : null,
  baseUrl: options["base-url"] || null
 });
 if (options.json) fs.writeFileSync(path.resolve(options.json), JSON.stringify(entries, null, 2) + "\n");
 if (options.csv) fs.writeFileSync(path.resolve(options.csv), toCsv(entries));
 const missingSource = entries.filter(entry => !entry.sourceExists || !entry.exactCase || !entry.validMedia);
 const missingBuild = entries.filter(entry => entry.buildExists === false);
 const failingLive = entries.filter(entry => entry.liveStatus && entry.liveStatus !== 200);
 const unique = new Set(entries.map(entry => entry.path));
 console.log(JSON.stringify({
  sourceFiles: productiveSourceFiles().length,
  references: entries.length,
  uniqueMedia: unique.size,
  missingSource: [...new Set(missingSource.map(entry => entry.path))],
  missingBuild: [...new Set(missingBuild.map(entry => entry.path))],
  failingLive: [...new Map(failingLive.map(entry => [entry.path, entry.liveStatus])).entries()].map(([mediaPath, status]) => ({ path: mediaPath, status }))
 }, null, 2));
 if (missingSource.length || missingBuild.length || failingLive.length) process.exitCode = 1;
}

if (require.main === module) main().catch(error => {
 console.error(error);
 process.exitCode = 1;
});

module.exports = {
 auditMedia,
 collectMediaReferences,
 extractMediaReferences,
 normalizeReference,
 productiveSourceFiles,
 toCsv
};
