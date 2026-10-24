// Optionale lokale Originalpruefung – NICHT Teil der verbindlichen Repository-Tests (tests/*.test.cjs).
// Die freigegebenen Original-PNG bleiben ausserhalb des oeffentlichen Repositorys. Wo sie lokal vorliegen (z. B. in der
// Projekt-Arbeitskopie unter assets/kiels-authentic/, per .git/info/exclude ausgeschlossen), prueft dieses Werkzeug ihre
// SHA-256 gegen site-versions/approved-media-manifest.json. Fehlende Originale werden gemeldet, nicht als Fehler gewertet.
// Aufruf: node tools/check-local-originals.cjs [Verzeichnis mit den Originalen; Standard: Repository-Wurzel]
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { approvedMediaManifest } = require("./media-audit.cjs");

const root = path.resolve(__dirname, "..");
const base = path.resolve(process.argv[2] || root);
let mismatches = 0, missing = 0;
for (const entry of approvedMediaManifest().originals) {
 const relative = process.argv[2] ? path.posix.basename(entry.original) : entry.original;
 const file = path.join(base, ...relative.split("/"));
 if (!fs.existsSync(file)) { missing++; console.log(`nicht lokal vorhanden: ${entry.original}`); continue; }
 const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
 if (actual === entry.originalSha256) console.log(`ok: ${entry.original}`);
 else { mismatches++; console.log(`ABWEICHUNG: ${entry.original} (${actual})`); }
}
console.log(`Originale geprueft: ${approvedMediaManifest().originals.length - missing - mismatches} ok, ${missing} nicht vorhanden, ${mismatches} abweichend`);
if (mismatches) process.exitCode = 1;
