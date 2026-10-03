Website-Versionen – 03.10.2026

01-current
KIELS Website – Current / Referenzstand vor UX-Redesign.
Status: eingefrorener lokaler Stand einschließlich Etappe 3/4.
HTML, CSS, JS, API, lib und Tests wurden bytegleich übernommen.
Nicht automatisch synchronisieren oder für Weiterentwicklung bearbeiten.

02-next
Status: aktiver Website-Arbeitsstand. Start: Etappe 5A; Ausbau: Etappe 5B.
Alle Hauptseiten nutzen jetzt das freigegebene Next-System in home.css.
Rechtsinhalte und Kontaktformular-Vertrag bleiben erhalten.
script.js sowie API/lib sind getrennte Kopien; Formular-action ist relativ.
Seitenspezifische Nutzerreisen, Design- und Stagingregeln: 02-next\README.txt.

Archiv seit 03.10.2026:
ARCHIV\2026-10-03_WIX_CLONE_CURRENT (im Projekt-Root).
Zusätzliche geprüfte Current-Kopie ohne erneute Asset-Duplizierung.
Current und Archiv werden nicht mehr aktiv weiterentwickelt.

Lokale Vorschau aus dem Projekt-Root: node tools\preview.cjs
Auswahl:  http://127.0.0.1:8766/
Current:  http://127.0.0.1:8766/current/
Next:     http://127.0.0.1:8766/next/
Die URLs sind virtuelle Mounts der beiden Ordner, keine Produktionsrouten.
Zum lokalen Anzeigen den Server verwenden, nicht HTML per Doppelklick öffnen.
Die ursprünglichen Root-Seiten und die alte /home-prototype-Preview bleiben erhalten.

shared
Einmaliger eingefrorener Snapshot von assets und Wix-Abhängigkeiten.
Keine Live-Verknüpfung zu Root-Dateien, keine Symlinks oder Hardlinks.
Gemeinsam genutzt werden Bilder, Fonts und bestehende Wix-Ressourcen,
einschließlich unveränderter Wix-CSS/JS-Abhängigkeiten. Kein gemeinsames
änderbares Design-CSS, kein gemeinsames Formularscript und keine gemeinsame API.
Nicht in shared bearbeiten: neue Bilder/Fonts/Wix-Anpassungen gehören in
02-next\assets beziehungsweise 02-next\wix-clone. Der Server verwendet
versionsspezifische Dateien zuerst und erst danach den shared-Snapshot.
So beeinflussen Next-Anpassungen weder Current noch den Root-Bestand.
Backups und HTML-Duplikate aus wix-clone wurden nicht in shared aufgenommen.

reference-manifest.json enthält SHA-256-Prüfsummen für 01-current und shared.
Neue Designentwicklung darf diese Dateien nicht verändern. Der Bestand ist
ein Referenzsnapshot, kein automatischer Schreibschutz des Dateisystems.
.gitattributes verhindert Git-Zeilenendekonvertierung für Current, Shared und
Archiv, damit die geprüften Snapshot-Bytes auch nach einem Checkout erhalten bleiben.

Kontakt
Current behält seine ursprüngliche /api/contact-action; der Preview-Server
ordnet diese immer dem eingefrorenen Current-Handler zu (auch ohne Referrer).
/current/api/contact ist ebenfalls verfügbar.
Next verwendet /next/api/contact und seine eigene API/lib-Kopie.
Alle lokalen Handler sind unabhängig von geerbten Environment-Werten immer
HighLevel-deaktiviert. Keine Speicherung, keine externen Anfragen.
Gültige Anfragen antworten weiterhin HTTP 503 delivery_not_configured.
Versandarchitektur: CONTACT.md innerhalb der jeweiligen Version.
Tests je Version: node --test site-versions\01-current\tests\contact.test.cjs
beziehungsweise node --test site-versions\02-next\tests\contact.test.cjs

Etappe 5D: Late-Night in Next bestätigt: 20:00–22:00 Uhr, 27,90 EUR alle
14 Tage, 6 Monate Laufzeit. Aufbau Rückbildung und Rückenfit sind getrennte
Angebote. Acht offizielle deutsche LES-MILLS-Programmseiten sind verlinkt.
Kursplan-PDF fehlt noch; Mitarbeiter-Upload ist nur eine Zukunftsanforderung.
Content-/SEO-Prüftabelle und konkrete offene Punkte: 02-next\README.txt.
Historische Zeitangaben in Current/Archiv bleiben absichtlich unverändert.
Fachliche Korrekturen erfolgen ausschließlich in Next, nicht in Referenzkopien.
Chrome meldet beim Wechsel von der bestehenden Home zur Fitness-Seite
gelegentlich "ViewTransition opt-in disabled". Im unveränderten Root-Bestand
reproduziert; Navigation funktioniert. Die bestehenden Wix-Transition-Regeln
wurden nicht verändert.
