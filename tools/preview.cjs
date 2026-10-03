const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { serveContact } = require("./contact-http.cjs");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 8766);
const versions = { current: "01-current", next: "02-next" };
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };

function deliveryFor(directory) {
 const { createContactHandler } = require(path.join(directory, "api", "contact.js"));
 const { createHighLevelAdapter } = require(path.join(directory, "lib", "highlevel.js"));
 const { MAX_BODY_BYTES } = require(path.join(directory, "lib", "contact.js"));
 // Local previews must never activate delivery, even with inherited production variables.
 return {
  handler: createContactHandler({ submitLead: createHighLevelAdapter({ env: { HIGHLEVEL_ENABLED: "false" } }) }),
  maxBytes: MAX_BODY_BYTES
 };
}

function createPreviewServer() {
 const deliveries = Object.fromEntries(Object.entries(versions).map(([name, folder]) => [
  name, deliveryFor(path.join(root, "site-versions", folder))
 ]));
 return http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(body)); };
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch (error) {
   if (!(error instanceof URIError) && !(error instanceof TypeError)) throw error;
   res.status(400).json({ success: false, message: "Ung\u00fcltige URL." });
   return;
  }
  const match = pathname.match(/^\/(current|next)(?:\/(.*))?$/);
  const version = match?.[1];
  if (version) res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const versionApi = version && match[2] === "api/contact";
  if (pathname === "/api/contact" || versionApi) {
   // The unchanged current form uses /api/contact; keep it on its frozen handler.
   const delivery = versionApi ? deliveries[version] : deliveries.current;
   await serveContact(req, res, { handler: delivery.handler, maxBytes: delivery.maxBytes });
   return;
  }
  if (!["GET", "HEAD"].includes(req.method)) {
   res.setHeader("Allow", "GET, HEAD");
   res.status(405).json({ success: false, message: "Methode nicht erlaubt." });
   return;
  }
  if (version && match[2] === undefined) {
   res.writeHead(302, { Location: "/" + version + "/" });
   res.end();
   return;
  }
  const prototype = pathname === "/home-prototype" || pathname === "/home-prototype/";
  if (pathname === "/home-prototype/" || pathname === "/previews/home-prototype.html") {
   res.writeHead(302, { Location: "/home-prototype" });
   res.end();
   return;
  }
  const selector = pathname === "/";
  const relative = version ? match[2] || "index.html" : prototype ? "previews/home-prototype.html" : selector ? "tools/preview-index.html" : pathname.slice(1);
  if (selector || prototype || relative.startsWith("previews/")) res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const permitted = /^(?:assets\/|wix-clone\/|(?:index|fitness|wellness|health|kurse|kontakt|agbs|impressum|datenschutz)\.html$|(?:script\.js|responsive\.css|styles\.css|home\.css)$|previews\/home-prototype\.(?:html|css)$)/;
  if ((!selector && !permitted.test(relative)) || /(?:^|\/)\.\.(?:\/|$)|\\/.test(relative) || relative.endsWith(".bak")) {
   res.status(404).end("Not found");
   return;
  }
  const directory = version ? path.join(root, "site-versions", versions[version]) : root;
  const file = path.resolve(directory, relative);
  if (!file.startsWith(directory + path.sep)) {
   res.status(403).end("Forbidden");
   return;
  }
  function serve(filename, canUseShared) {
   fs.readFile(filename, (error, data) => {
    if (error) {
     if (error.code === "ENOENT" && canUseShared) {
      serve(path.join(root, "site-versions", "shared", relative), false);
      return;
     }
     if (!["ENOENT", "EISDIR"].includes(error.code)) console.error("Preview file failed:", error.code);
     res.status(error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 500).end("File unavailable");
     return;
    }
    res.setHeader("Content-Type", mime[path.extname(filename)] || "application/octet-stream");
    res.end(req.method === "HEAD" ? undefined : data);
   });
  }
  serve(file, Boolean(version && /^(assets|wix-clone)\//.test(relative)));
 });
}

if (require.main === module) {
 createPreviewServer().listen(port, "127.0.0.1", () => console.log("KIELS version preview: http://127.0.0.1:" + port));
}
module.exports = { createPreviewServer };
