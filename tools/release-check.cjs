// Freigabesperre vor Merge nach main: keine offenen Freigabe-Marker, Datenschutzhinweis freigegeben.
const fs = require("node:fs");
const path = require("node:path");
const next = path.resolve(__dirname, "..", "site-versions", "02-next");
const problems = [];
for (const name of fs.readdirSync(next).filter(n => n.endsWith(".html"))) {
 const html = fs.readFileSync(path.join(next, name), "utf8");
 for (const m of html.matchAll(/<!-- FREIGABE-OFFEN:([^>]*)-->/g)) problems.push(`${name}: offen –${m[1].trimEnd()}`);
}
const privacy = fs.readFileSync(path.join(next, "datenschutz.html"), "utf8");
const version = privacy.match(/<!-- Hinweisversion: (\S+) \(([^)]*)\) -->/);
if (!version) problems.push("datenschutz.html: Hinweisversion fehlt");
else if (version[2] !== "freigegeben") problems.push(`datenschutz.html: ${version[1]} ist "${version[2]}", nicht "freigegeben"`);
if (problems.length) {
 console.error("Release-Pruefung NICHT bestanden:\n- " + problems.join("\n- "));
 process.exit(1);
}
console.log(`Release-Pruefung bestanden: ${version[1]} freigegeben, keine offenen Marker.`);
