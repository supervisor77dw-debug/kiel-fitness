KIELS Next – aktiver Website-Arbeitsstand, Etappe 5B, 03.10.2026

Alle Website-Optimierungen erfolgen hier. Current/Archiv und shared bleiben
eingefroren. Ressourcen können hier unter assets oder wix-clone überschrieben
werden; der lokale Server verwendet die eigene Datei vor dem shared-Snapshot.

Gemeinsames Designsystem
home.css gilt für sämtliche neun Seiten, script.js für Navigation und Formular.
1240 px maximale Contentbreite; 64 px Abschnittsabstand, mobil 40 px.
Trebuchet MS/Systemfallback; H1 38–62 px, H2 30–44 px; Navy, Weiß, Gelb.
Primär: Probetraining; sekundär: Leistungsanker und persönliche Beratung.
Sticky Header mit 96 px Desktop-/80 px Mobilhöhe; dezenter Blur nur im Header,
opaker Fallback; Scrollzustand ändert nur Hintergrunddeckung, nicht Geometrie.
Mobile Menü bis 760 px; Escape/Fokus/No-JS-Fallback; scrollbares kurzes Menü.
Zwei mobile Aktionen; Safe-Area-/Scrollabstände; reduced-motion ohne Transition.

Nutzerreisen
Home: Ziel finden, Studio kennenlernen, Mitgliedschaft, Besuch planen.
Fitness: Trainingsziel -> Trainingswege -> Betreuung/Zirkel -> Probetraining.
Gesundheit: Ausgangspunkt -> Analyse/Diagnostik -> Plan -> Betreuung/Kurse.
Kurse: Kurswelt wählen -> reale Kursangebote -> aktuellen Plan erfragen.
Wellness: vorhandene Bereiche -> Pause/Abkühlung -> aktuelle Verfügbarkeit.
Kontakt: Anliegen wählen -> direkt kontaktieren oder bestehendes Formular.
Rechtliches: unveränderter Hauptinhalt, nur gemeinsame Hülle/Styles.

SEO
Vorhandene Titles, Descriptions, Canonicals, OG/X und Schema unverändert
übernommen; keine zusätzliche LocalBusiness-Struktur, keine URL-Migration.
Gesundheit und Wellness besitzen im übernommenen Next-Bestand nur kurze Titles
und keine Description/Canonical. Das widerspricht der gewünschten vollständigen
Keyword-Zuordnung; ohne neue Freigabe wurden diese Metadaten nicht erfunden.
Sichtbar verbessert: eine H1, H2/H3, Leistungsinformationen, interne Zielpfade
und Bildbeschreibungen. Die Bilddaten selbst wurden nicht verändert.

Inhaltliche Grenzen
Keine pauschalen Heilversprechen, Prozent-/Kostenversprechen der Firmenfitness
oder unbestätigten Terminzusagen. Sauna-Samstag und Arzt-/Bereichsverfügbarkeit
werden zur aktuellen Bestätigung beim Team verwiesen.
24 tatsächliche Kursangebote bleiben sichtbar; keine erfundene PDF/Bodypump-URL.
Etappe 5C: Studio/Late-Night-Nutzung endet bestätigt um 22:00 Uhr.
Late-Night-Abrechnungsperiode bleibt offen; Preis 27,90 EUR unverändert.
Rechtstexte und Datenschutzhinweis der Form wurden nicht inhaltlich verändert.

Kontakttechnik
Bestehende Felder, native/JS/serverseitige Validierung, Honeypot, Attribution
und Submission-ID bleiben erhalten. Eigene api/contact.js und lib-Kopie.
Frontend verwendet die eigene relative api/contact-action.
Der sichtbare Staginghinweis sagt ausdrücklich: kein Versand/keine Speicherung.
Keine neue Einwilligung, kein CRM, keine lokale Lead-Datenbank.
Details des Datenvertrags: CONTACT.md.

Vercel-Staging
Projekt: kiel-fitness, Scope: supervisor77dw-debugs-projects.
Production-Branch main, Root unverändert; keine Wix-/Custom-Domain-Umschaltung.
node tools\build-staging.cjs aus dem Projekt-Root erzeugt .vercel\output im
Vercel Build Output API v3-Format; benötigt keine Pakete und keine Credentials.
Es enthält alle Next-Seiten und die tatsächlich referenzierten Ressourcen.
API-Function nutzt Node.js 22 mit unverändertem Validator und einem im
Staging-Paket ausdrücklich deaktivierten HighLevel-Adapter, unabhängig von ENV.
Alle Stagingantworten sind noindex/nofollow. Kein produktiver Versand.
tools\contact-http.cjs überbrückt rohe Node-Requests/Responses für den
Build-Output-Function-Launcher und den lokalen Server (begrenzter JSON-Body,
status/json-Response-Helfer). Der versionsspezifische Validator bleibt getrennt.
Seit Etappe 5C ist Production im bestehenden Vercel-Projekt freigegeben.
Dies betrifft nur kiel-fitness.vercel.app, niemals die Wix-/Unternehmensdomain.
vercel.json baut bei Git-Deployments exakt denselben Next-Build-Output;
Repository-Root und Production-Branch main bleiben unverändert.
Build/Production sind weiter noindex/nofollow und Versand-deaktiviert,
da Vercel Production hier ein Arbeits-/Demonstrationsstand bleibt.
Lokale .vercel-Anbindung/Output sind ignoriert und nicht für Git bestimmt.

Verifiziertes Preview vom 03.10.2026
URL: https://kiel-fitness-fsiii0hlr-supervisor77dw-debugs-projects.vercel.app/
Deployment-ID: dpl_3HGVVToDwq79g1MMq1VcxeYLjMu7
Target: Preview (READY), ohne Production-Alias.
Aus lokal geprüftem Arbeitsstand/.vercel/output, kein neuer Git-Commit nötig.
Git-Ausgangs-HEAD: f5f038a1e4b23635898bd1f4af512e621ee8bc1c.
Ein genehmigter Freigabelink ist nur für dieses Deployment erstellt.
Die Freigabe-Zugangsdaten liegen ausschließlich lokal im ignorierten .vercel,
nicht in Quellcode, Dokumentation oder Browser-JavaScript.
Projektweiter Login-Schutz bleibt unverändert. Der Preview-Stand von Etappe 5B
ist historisch; Etappe 5C ersetzt die Vercel-Production-Version nach Prüfung.
Online geprüft: neun Seiten, fünf Breiten, Reloads, Bilder, Menü, Sticky,
Formular/API 503, Attribution, Submission-ID, No-JS, SEO und Rechtsinhalte.


Etappe 5C – vollständige Kurs-/Linkarbeitsliste, 03.10.2026
Quelle: alle 24 sichtbaren Kurskarten in kurse.html; course-links.json bildet
die eindeutigen data-course-id-Zuordnungen ab. Alle officialUrl-Werte sind null.
Keine URL geraten, recherchiert oder ergänzt. Keine aktuelle Kurskarte besitzt
einen Detail-Link. LES-MILLS-Zuordnung nach bestehender Kursbezeichnung;
"LM Step" ist als LES-MILLS-Angebot zu bestätigen, bevor ein Link geliefert wird.
Jumping-/Zumba-Anbieter und offizielle Programmseite ebenfalls bestätigen.

Kurs | Kategorie | Gruppe | Verlinkt? | Ziel | Offizieller Link sinnvoll? | Status
|---|---|---|---|---|---|---|
| Bodypump | Power & Kraftausdauer | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| Strength Development | Power & Kraftausdauer | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| Wirbelsäulengymnastik | Rücken & Gesundheit | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Aufbau Rückenbildung | Rücken & Gesundheit | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Yoga | Body & Mind | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Pilates | Body & Mind | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Body Balance® | Body & Mind | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| Body Attack® | Cardio & Ausdauer | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| LM Step® | Cardio & Ausdauer | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| Cycling | Cardio & Ausdauer | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Bauch Beine Po | Cardio & Ausdauer | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Step BBP | Cardio & Ausdauer | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Jumping® | Cardio & Ausdauer | Externes Programm | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| Fitnessboxen | Cardio & Ausdauer | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Step Workout | Cardio & Ausdauer | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Body Combat® | Cardio & Ausdauer | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| Faszien Yoga | Beweglichkeit | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Flow Yoga | Beweglichkeit | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Ashtanga Yoga | Beweglichkeit | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Zumba® | Beweglichkeit | Externes Programm | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| Stretching | Beweglichkeit | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| Bauch Intensiv | Weitere Kurswelten | KIELS/lokales Angebot | Nein | – | Nein | Kein externer Link erforderlich |
| LES MILLS CORE® | Weitere Kurswelten | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |
| LES MILLS TONE® | Weitere Kurswelten | LES MILLS | Nein | – | Ja | URL FEHLT – vom Betreiber nachzuliefern |

Bereits korrekt verlinkt:
Keine externen Kursdetail-Links vorhanden.
Interne Kurswelt-Anker: #power, #gesundheit, #body-mind, #cardio,
#beweglichkeit und #weitere (jeweils in kurse.html).
Gesundheit verweist auf kurse.html#gesundheit; Firmenfitness auf
fitness.html#firmenfitness. Das sind lokale Orientierungspfade, keine externen
Kursdetail-Informationen.

Link vorhanden, aber prüfen:
Keine vorhandene konkrete externe Kursdetail-URL.
Historischer BODYPUMP-#-Platzhalter wurde bereits in Etappe 5B nicht als
klickbarer Link übernommen. Der Kursplan-PDF ist weiterhin nicht verfügbar.

Link fehlt – jeweils offizielle Programm-Detailseite vom Betreiber:
- Bodypump (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
- Strength Development (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
- Body Balance® (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
- Body Attack® (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
- LM Step® (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
- Jumping® (Externes Programm): URL FEHLT – vom Betreiber nachzuliefern
- Body Combat® (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
- Zumba® (Externes Programm): URL FEHLT – vom Betreiber nachzuliefern
- LES MILLS CORE® (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
- LES MILLS TONE® (LES MILLS): URL FEHLT – vom Betreiber nachzuliefern
Zusätzlich: gültige KIELS-Kursplan-PDF-Datei oder bestätigte Kursplan-URL.

Kein externer Link erforderlich:
- Wirbelsäulengymnastik: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Aufbau Rückenbildung: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Yoga: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Pilates: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Cycling: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Bauch Beine Po: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Step BBP: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Fitnessboxen: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Step Workout: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Faszien Yoga: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Flow Yoga: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Ashtanga Yoga: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Stretching: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.
- Bauch Intensiv: lokale/allgemeine Trainingsform; KIELS-Beschreibung und aktuelle Kursplanung sind maßgeblich.

Kursbereiche:
Power & Kraftausdauer / Rücken & Gesundheit / Body & Mind / Cardio & Ausdauer /
Beweglichkeit / Weitere Kurswelten sind interne Anker, keine fremden Programme.
"Rückenfitness" auf Gesundheit ist eine lokale Leistungsbeschreibung; der
Kurskatalog enthält "Aufbau Rückenbildung". Die genaue gemeinsame Bezeichnung
ist vom Betreiber zu bestätigen, kein zusätzlicher Kurs wurde erfunden.

UX-Vorbereitung:
Jede Karte besitzt eine feste data-course-id und ein unsichtbares
template[data-course-detail] für genau einen ergänzenden "Mehr erfahren"-Link.
Templates werden erst mit einer bestätigten offiziellen HTTPS-Zieladresse
aktiviert; aktuell kein href, kein toter Button, keine Roh-URL im Frontend.
Neuer Tab wird angekündigt, rel="noopener noreferrer"; keine Tracker/Embeds,
kein zusätzlicher Consent. Die Arbeitsliste ist nicht Teil des Deployment-
Outputs, die HTML-Templates allein führen keine externen Requests aus.
