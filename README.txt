KIELS lokale Vorschau

index.html per Doppelklick öffnen. Alle Links sind relativ. Der Ordner assets muss daneben liegen.

responsive.css ergänzt die bestehenden Seitenlayouts; styles.css wird nicht eingebunden.
script.js steuert die gemeinsame Navigation. Das Hamburger-Menü gilt bis einschließlich 760 px.
Ohne JavaScript bleibt die Navigation sichtbar.

Etappe 3: Lokale Vorschau inklusive Kontakt-API mit node tools\preview.cjs starten.
Danach http://127.0.0.1:8766/kontakt.html öffnen. Ein anderer Port ist über PORT einstellbar.
API-Tests: node --test tests\contact.test.cjs
Die Tests umfassen auch den deaktivierten HighLevel-Adapter; externe Aufrufe werden ausschließlich gemockt.
Das Formular validiert und sendet an /api/contact, aber ohne freigegebenen Versandadapter
werden keine Nachrichten gespeichert oder verschickt. Der Endpunkt antwortet dann ausdrücklich mit HTTP 503.
Architektur, Datenvertrag und Voraussetzungen für den produktiven Versand: CONTACT.md.

Etappe 5A: Getrennte Startseiten-Preview unter http://127.0.0.1:8766/home-prototype
mit demselben lokalen Vorschau-Server. index.html und die Hauptseiten bleiben erhalten.
Die Dateien unter previews sind nur ein lokaler Prototyp, keine Produktionsumschaltung.

Etappe 5A.1: Vollständige lokale Versionen liegen unter site-versions.
01-current ist der eingefrorene Referenzstand vom 03.10.2026.
02-next ist die Arbeitsversion mit der neuen Startseite aus Etappe 5A.
Start mit node tools\preview.cjs; Auswahl unter http://127.0.0.1:8766/
Referenz: http://127.0.0.1:8766/current/
Neu: http://127.0.0.1:8766/next/
Ressourcen-Snapshot, Trennung und API-Verhalten: site-versions\README.txt.
HighLevel ist im lokalen Server unabhängig von Environment-Werten deaktiviert.
Versionen-/Routingtests: node --test tests\preview.test.cjs

Etappe 5B: Aktive Websiteentwicklung ausschließlich unter site-versions\02-next.
Current zusätzlich archiviert unter ARCHIV\2026-10-03_WIX_CLONE_CURRENT.
Gemeinsames Next-Design, Inhaltshinweise und Stagingarchitektur:
site-versions\02-next\README.txt.
Vercel-Preview-Paket: node tools\build-staging.cjs (Ausgabe .vercel\output).
Keine Production-Promotion, keine Wix-/DNS-Änderung; Versand bleibt deaktiviert.
Alle lokalen Tests: node --test tests\*.test.cjs

Etappe 5C: Next ist der führende Arbeitsstand. Vercel Production ist jetzt
ausdrücklich freigegeben, ausschließlich für kiel-fitness.vercel.app.
vercel.json baut den Next-Stand über tools\build-staging.cjs inklusive Ressourcen
und Node-HTTP-API. Keine Wix-/DNS-Migration. HighLevel bleibt deaktiviert.
Aktueller Late-Night-Nutzungszeitraum in Next: 20:00 bis 22:00 Uhr.
Current, Archiv, Root-Clone und die alte Etappe-5A-Preview sind historische
Referenzen, nicht der aktuelle fachliche Stand; dort bleiben frühere Zeiten.
Kurs-/Linkarbeitsliste: site-versions\02-next\README.txt (Etappe 5C).

Etappe 5D: Late-Night-Abrechnung bestätigt: 27,90 EUR alle 14 Tage.
Aufbau Rückbildung ist postnatal, Rückenfit bleibt ein eigenes Angebot.
Gesundheit/Wellness sowie Kurse besitzen vervollständigte SEO-Metadaten.
Acht geprüfte deutsche LES-MILLS-Links; Jumping/Zumba bleiben ohne externe Links.
SEO-Prüftabelle, Kursplan-Vorbereitung und zukünftiger geschützter Mitarbeiter-
Upload stehen in site-versions\02-next\README.txt. Upload nicht implementiert.
Wix, DNS, Unternehmensdomain und deaktivierter Versand bleiben unverändert.
