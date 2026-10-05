KIELS Next – aktiver Website-Arbeitsstand, UX-Finishing, 05.10.2026

Alle Website-Optimierungen erfolgen hier. Current/Archiv und shared bleiben
eingefroren. Eigene Ressourcen unter assets oder wix-clone haben Vorrang vor
dem shared-Snapshot. Versionsarchitektur: ..\README.txt.

Gemeinsames freigegebenes Designsystem
home.css gilt für alle neun Seiten, script.js für Navigation und Formular.
1240 px maximale Contentbreite; 64 px Abschnittsabstand, mobil 40 px.
Trebuchet MS/Systemfallback; Navy, Weiß, Gelb; Primär-CTA: Probetraining.
Sticky Header: 96 px Desktop/80 px Mobil innen, jeweils plus 1 px Kontur.
Der tatsächliche Header-Offset wird für Sprungziele per ResizeObserver gemessen.
Scrollzustand ändert Hintergrunddeckung, nicht Geometrie.
Mobile Menü bis 760 px, Escape/Fokus/No-JS; Safe-Area, reduced-motion.
Etappe 5D verändert weder CSS noch Header/Footer, Bilder oder Formulartechnik.

Fachlich bestätigt / korrigiert
- Late-Night: 20:00–22:00 Uhr, 27,90 EUR alle 14 Tage, 6 Monate Laufzeit.
  Die frühere offene Abrechnungsfrage ist erledigt; Preis/Laufzeit unverändert.
- Aufbau Rückbildung: für Frauen nach Schwangerschaft/Entbindung, postnatal.
  Falsche frühere Bezeichnung und rückenorientierte Beschreibung korrigiert.
- Rückenfit: eigenes bereits auf Gesundheit beschriebenes Angebot, getrennt
  von Rückbildung. Nun zusätzlich als eigene Karte im Kurskatalog sichtbar.
  25 Angebote im Inventar = bisherige 24 Karten plus vorhandenes Rückenangebot;
  kein neues Leistungsprogramm eingeführt.
- Pauschaler offener Punkt "Bereichszeiten" entfällt. Bestehende veröffentlichte
  Sauna-/Kinderbetreuungszeiten wurden nicht geändert.
- Kursbeschreibungen gekürzt; Wirkungs-/Heilversprechen und pauschale
  Marketingaussagen entfernt. Du-Ansprache und Programmnamen vereinheitlicht.

Content-/SEO-Prüftabelle
Alle Hauptseiten: genau eine H1, gegliederte H2/H3, eigener Title/Description,
relative seitenrichtige Canonical. Canonicals folgen der bestehenden relativen
Konvention und lösen auf dem jeweiligen Host auf; keine Wix-Domainmigration.
Vercel bleibt ausdrücklich noindex/nofollow, trotz vervollständigter Metadaten.
Keine SEO-Scores, keine neuen medizinischen Versprechen oder Schema-Fakten.

Seite | Fokus | H1 | Title | Meta Description | Canonical | Interne Links | Alt-Texte | Befund
Home | Fitnessstudio Kiel | Mehr als Fitness. Dein Fitnessstudio in Kiel. | Fitnessstudio Kiel – Sauna, Kurse & Kinderbetreuung | Vorhandene lokale Angebotsbeschreibung beibehalten | index.html | Leistungsseiten, Mitgliedschaft, Kinderbetreuung; Firmenfitness direkt #firmenfitness | Beschreibende Hauptbilder; leere Alt-Texte nur bei dekorativen verlinkten Kartenbildern mit gleichem Textziel | Kürzerer Hero, Google-Rating, unveränderte Tarife
Fitness | Fitnesstraining Kiel | Fitnesstraining in Kiel. Dein Trainingsweg. | Fitnesstraining Kiel – Personal, Ausdauer & Zirkel | Vorhandene Beschreibung beibehalten | fitness.html | Gesundheit, Zirkel, Firmenfitness, Kontakt | Hero/Trainingsbereich konkretisiert | Suchintention in H1; Trainingswege/Betreuung/Zirkel klar
Gesundheit | Gesundheitstraining Kiel | Gesundheitstraining in Kiel. Individuell begleitet. | Gesundheitstraining Kiel – Analyse & Betreuung | Neu: Körperanalyse, Sportdiagnostik, Trainingsplanung, Rückenfit | health.html | Fitness-Trainingswege, Gesundheitskurse, Rückbildung-Anker, Firmenfitness, Kontakt | Gesundheitsmotiv und Arztporträt konkretisiert | H1/Title/Description/Canonical vollständig; InBody 770, Planung und Betreuung erläutert
Kurse | Fitnesskurse Kiel | Fitnesskurse in Kiel. Deinen Kurs finden. | Fitnesskurse Kiel – LES MILLS, Yoga & Rückenfit | Neu: Kursangebot einschließlich Rückbildung; Kursplan anfragen | kurse.html | Sechs Kurswelten, Kursplan, Rückenfit/Gesundheit, Kontakt | Alle Karten mit Kursmotiv bezeichnet | 25 Angebote; acht ergänzende offizielle LES-MILLS-Links
Wellness | Fitnessstudio mit Sauna Kiel | Dein Fitnessstudio mit Sauna in Kiel. Training und Auszeit. | Fitnessstudio mit Sauna Kiel – Wellness & Ruhe | Neu: bestätigte Saunen, Dampfbad, Ruheraum und veröffentlichte Zeiten | wellness.html | Öffnungszeiten, Fitness, Kontakt | Sauna-/Ruheraum-/Wellnessmotive konkretisiert | H1/Title/Description/Canonical vollständig; keine Betriebs-/Terminzusage erfunden
Kontakt | KIELS Kiel Kontakt / Probetraining | Kontakt zu KIELS in Kiel. Deine Frage zählt. | Kontakt – KIELS Fitness Kiel, Probetraining & Fragen | Vorhandene Adresse/Telefon/Anfragebeschreibung beibehalten | kontakt.html | Öffnungszeiten, Datenschutz; direkte Telefon/Mail/Anfahrt | Logo vorhanden, keine zusätzlichen Inhaltsbilder | Einführung priorisiert echte Telefon-/Mailanfrage; Versandhinweis bleibt
Mitgliedschaft | Tarife / Mitgliedschaft Kiel | Nutzt Home-H1, eigener Abschnitt H2 "Welcher Tarif passt zu dir?" | Nutzt Home-Title | Nutzt Home-Description | index.html (kein separates Dokument) | index.html#mitgliedschaft, Mail-/Telefonberatung | Keine eigenen Bilder; keine künstlichen Alt-Texte | Alle drei Tarifkarten; Late-Night vollständig bestätigt
Rechtsseiten | AGB / Impressum / Datenschutz | Je eine bestehende H1 | Bestehende Titel | Unverändert | Unverändert | Gemeinsame Navigation/Rechtslinks | Gemeinsames Logo | Rechtlicher Hauptinhalt unverändert

LES-MILLS-Verifikation und eingebauter Stand
Grundlage: https://www.lesmills.com/de/programme/ leitet zur offiziellen
Programmübersicht https://www.lesmills.com/de/programme/all weiter.
Am 03.10.2026 wurden die deutschen Programmseiten direkt aufgerufen:
HTTP 200, passender Programmname und deutsche Inhaltsbeschreibung.
Nicht allein aus Namen konstruierte URLs; keine Studios/Blogs/Embeds.

KIELS-Kurs | Offizielles Programm | Offizielle geprüfte URL | Eingebaut
BODYPUMP | BODYPUMP | https://www.lesmills.com/de/programme/bodypump | Ja
Strength Development | LES MILLS STRENGTH DEVELOPMENT | https://www.lesmills.com/de/programme/strength-development | Ja
BODYBALANCE® | BODYBALANCE | https://www.lesmills.com/de/programme/bodybalance | Ja
BODYATTACK® | BODYATTACK | https://www.lesmills.com/de/programme/bodyattack | Ja
LM Step® | LMI STEP | https://www.lesmills.com/de/programme/lmi-step | Ja
BODYCOMBAT® | BODYCOMBAT | https://www.lesmills.com/de/programme/bodycombat | Ja
LES MILLS CORE® | LES MILLS CORE | https://www.lesmills.com/de/programme/les-mills-core | Ja
LES MILLS TONE® | LES MILLS TONE | https://www.lesmills.com/de/programme/les-mills-tone | Ja

LM Step wird auf der offiziellen deutschen Seite als LMI STEP geführt.
Step-Abfolgen, Cardio-/Kraftübungen, Step und optionale Gewichtsscheiben stimmen
mit dem vorhandenen KIELS-Kurs überein. Die abweichende offizielle Bezeichnung
bleibt transparent; die KIELS-Karte wurde nicht in einen anderen Kurs umbenannt.
Vollständiges 25-Angebote-Inventar und Zuordnungsbelege: course-links.json.

UX/Technik der Kurslinks
Je LES-MILLS-Karte genau ein "Mehr über [Programm] erfahren"-Textlink innerhalb
des Karteninhalts. Offizielle Zusatzinformation und neuer Tab werden im
zugänglichen Namen angekündigt; target="_blank", rel="noopener noreferrer".
Keine Trackingparameter, externen Scripts, Embeds oder neue Consent-Logik.
Normale Links laden beim Lesen der KIELS-Seite keine Drittanbieter-Ressourcen.
KIELS-Beschreibungen funktionieren eigenständig, ohne externe Seite zu öffnen.
Die alten unsichtbaren Linktemplates und der BODYPUMP-Offenhinweis entfallen.

Bewusst ohne externe Links
Jumping und Zumba bleiben auf ausdrückliche Freigabe lokal beschrieben.
Kein externer Anbieterlink erforderlich oder gesucht.
Lokale Angebote: Wirbelsäulengymnastik, Aufbau Rückbildung, Rückenfit, Yoga,
Pilates, Cycling, Bauch Beine Po, Step BBP, Fitnessboxen, Step Workout,
Faszien Yoga, Flow Yoga, Ashtanga Yoga, Stretching und Bauch Intensiv.
Rückenfit verlinkt ausschließlich intern auf health.html#rueckenfit.
Rückbildung hat den stabilen lokalen Anker kurse.html#rueckbildung.

Kursplan-PDF – vorbereitet, noch keine Datei
Bereich kurse.html#kursplan mit verständlichem Status und Kontaktlink.
Kein falscher Dateiname, leeres href, aktiver Download oder erfundene PDF.
Sobald die freigegebene PDF geliefert wird, dort genau einen beschreibenden
Download-Link einsetzen; Dateipfad, Version/Stand und Erreichbarkeit prüfen.
Eigene PDF-Ressourcen gehören unter 02-next\assets und werden vom vorhandenen
Builder übernommen, sobald sie im HTML unter assets referenziert sind.

Zukunftsanforderung: Kursplan-Upload für Mitarbeiter – NICHT IMPLEMENTIERT
Nur berechtigte Mitarbeiter sollen PDF-Pläne einfach austauschen können,
ohne Codeänderung oder vollständiges Website-Deployment.
Vor Umsetzung entscheiden und prüfen:
- Geschützter, authentifizierter Zugriff und Berechtigungen, keine öffentliche
  allgemeine Uploadfunktion; Hosting/Speicherlösung noch nicht festgelegt.
- Einfacher PDF-Upload, serverseitige Dateityp-/Inhalts- und Größenvalidierung;
  zulässige Maximalgröße in der Umsetzung festlegen.
- Möglichst stabile öffentliche Kursplan-URL, kontrollierter atomarer Ersatz.
- Versionierung/Rückfalloption, Rechte und Fehler-/Statusmeldung.
- Bedienung ohne technische Kenntnisse, optional Vorschau vor Veröffentlichung.
Keine Uploadroute, Datenbank oder externer Speicher in Etappe 5D angelegt.

Kontakttechnik und Vercel-Demonstrationsstand
Felder, native/JS/serverseitige Validierung, Honeypot, Attribution, Submission-ID
und relative api/contact-action unverändert. Kein Versand/keine Speicherung.
Eigene API/lib-Kopien; Details des Vertrags: CONTACT.md.
Projekt kiel-fitness, Scope supervisor77dw-debugs-projects, Git main.
Production: https://kiel-fitness.vercel.app/ – Next-Arbeits-/Demonstrationsstand,
nicht die Wix-Unternehmenswebsite. Keine Domain-/DNS-/Nameserveränderung.
vercel.json ruft tools\build-staging.cjs auf, Build Output API v3, Node.js 22.
Es baut nur Next-Seiten, referenzierte Ressourcen und den HTTP-API-Wrapper
tools\contact-http.cjs. Der Function-Handler nutzt HighLevel API v2 nur mit
HIGHLEVEL_PRIVATE_TOKEN und HIGHLEVEL_LOCATION_ID aus der Server-Runtime;
fehlende Variablen bleiben fail-closed. Keine Credentials oder lokalen
Vercel-Daten in Git.
Lokale Vorschau: node tools\preview.cjs, http://127.0.0.1:8766/next/
Tests: node --test tests\*.test.cjs site-versions\01-current\tests\contact.test.cjs
site-versions\02-next\tests\contact.test.cjs (aus Projekt-Root).

Historischer technischer Preview-Stand Etappe 5B (nicht aktueller Inhalt):
https://kiel-fitness-fsiii0hlr-supervisor77dw-debugs-projects.vercel.app/
Deployment dpl_3HGVVToDwq79g1MMq1VcxeYLjMu7, Preview ohne Production-Alias.
Genehmigter Freigabelink nur für dieses Deployment; Zugriffsdaten ausschließlich
lokal im ignorierten .vercel. Projektweiter Login-Schutz unverändert.

Konkrete verbleibende fachliche Punkte
- Aktuelle Kursplan-PDF liefern.
- Nächster Sauna-Samstag: kein konkreter Termin/Programm geliefert.
- Aktueller Betrieb des Dampfbads und Arzt-/Physiotherapie-Termine sind nicht
  neu bestätigt; vorhandene Hinweise zur persönlichen Nachfrage bleiben.
Keine pauschale Liste "offene Bereichszeiten". Keine offenen Late-Night-
Abrechnungsfragen oder fehlenden Gesundheit-/Wellness-Metadaten mehr.

Gestaltungsrunde – Navigation, Oberflächen und Interaktionen, 04.10.2026
Aktiver Prüfstand: lokal unter http://127.0.0.1:8766/next/
Keine Veröffentlichung, produktive Umschaltung oder Änderung an Produktion.

Einheitliches UI-System in home.css:
- Navy/Weiß/Gelb beibehalten; zentrale Glas-, Kontur-, Schatten- und
  Bewegungsvariablen ergänzt. Opake Flächen bleiben der backdrop-filter-Fallback.
- Sticky-Header erhält zurückhaltende Transparenz und einen optischen
  Scrollzustand ohne Geometriewechsel. Aktive Hauptnavigation klar markiert.
- Menüflächen, CTA, Fokus- und Druckzustände sowie Eingabefelder vereinheitlicht.
- Mobile Navigation bis 900 px: eigene aufklappbare Fläche, Scrollbegrenzung,
  Body-Scrollsperre, Escape-Schließen und Fokus-Rückgabe. Keine Dropdowns:
  die bestehende Informationsarchitektur benötigt sie nicht. Wenn JavaScript
  fehlt, bleibt die Navigation als statische Linkliste sichtbar.
- Verlinkte Leistungs-/Kurskacheln erhalten eine subtile Anhebung, Kontur,
  Bildaufhellung und internen Bildzoom. Rein informative Wellnesskacheln
  erhalten nur eine dezente Kontur-/Bildreaktion und erscheinen nicht wie Buttons.
- Blur auf Mobilgeräten wird auf Header/Formular begrenzt; Kartenflächen nutzen
  dort eine stärker deckende Oberfläche als Performance-Fallback.
- Kurswelten-Anker zeigen beim Scrollen die aktive Sektion. Keine neuen
  Inhalte oder Filter erfunden.
- Formulare behalten vorhandene Validierung/Endpunkte; Fokus, Fehler-,
  Disabled- und Statusoberflächen sind deutlicher. Versand und Speicherung
  bleiben aus.
- Keine Scroll-Einblendeanimation. Inhalte bleiben ohne JavaScript sichtbar.
  Reduced Motion schaltet weiches Scrollen und Übergänge ab. Blur wird nur
  auf größeren Flächen eingesetzt; keine Animationsbibliothek.

Vorher-/Nachher-Ansichten (gleiche lokale URLs, gleiche Inhalte):
- Startseite Desktop 1440 px: vorher kompakte Textnavigation und flache
  Kachelkonturen; nachher aktive Navigations-Pille, subtile Glasheaderfläche,
  stärker abgestufte Karten- und CTA-Zustände.
- Startseite Mobil 390 px: vorher einfacher Menüknopf/Grundlayout; nachher
  eigenständiges Menü mit Touch-Zeilen, Escape-/Fokusverhalten und Scrollsperre.
- Wellness/Sauna: nachher eigene Bild-/Konturreaktion, ohne informative
  Saunakarten als Links oder Buttons auszugeben.
Zum direkten Vergleich: /next/index.html und /next/wellness.html.

QA am 04.10.2026:
- Lokale Playwright-Ansichten bei 1440, 1024, 900, 768, 390 und 375 px.
  Kein Dokument-Overflow; Hauptbilder und Seitenstyles laden.
- Desktopnavigation bleibt bei 1440/1024 sichtbar; mobile Navigation ab
  900 px als Menü. Bei 768 px geprüft: Öffnen fokussiert Home, Escape schließt
  und stellt Fokus zum Menüknopf zurück, der Hintergrund scrollt nicht.
  Fallback ohne geladenes JavaScript bei 768 px hält alle acht Menüpunkte sichtbar.
- Aktive Kurswelt folgt der sichtbaren Sektion. Reduced-Motion-Regeln und
  alternative opake Oberflächen sind vorhanden.
- Kontakt- und Firmenfitness-API-Regression: `node --test
  site-versions\02-next\tests\contact.test.cjs` – 19 Tests bestanden.
  Firmenfitness bleibt bei delivery_not_configured, ohne Erfolgssignal;
  Eingaben bleiben erhalten.
- Gesamte bestehende Suite: `node --test tests\*.test.cjs
  site-versions\01-current\tests\contact.test.cjs
  site-versions\02-next\tests\contact.test.cjs` – 64 Tests bestanden.
- Geprüfte Seiten: Startseite, Fitness, Gesundheit, Wellness, Kurse, Kontakt,
  Firmenfitness und Arbeitgeberempfehlung. Firmenfitness bleibt außerhalb
  der Hauptnavigation.

Eingeschränkte Prüfung: Screenshots wurden in der lokalen Browseransicht
vor/nach der Änderung visuell verglichen; keine Bilddateien in den Website-
Ordner geschrieben. Tastaturfokus/Escape und Touch-Breakpoint wurden geprüft;
ein vollständiger Screenreader-/Gerätetest steht aus. Die Kursseite hat keine
Filtertabs, sondern vorhandene Sprunglinks; deren aktive Sektion wird markiert.
Historische Wix-Snapshots und vorhandene Löschungen unter shared/wix-clone
blieben außerhalb des Bearbeitungsumfangs.

HighLevel-API-v2-Integration, 04.10.2026
- Der gemeinsame Endpoint api/contact nutzt die serverseitige REST-API v2
  und die Vercel-Runtime-Variablen HIGHLEVEL_PRIVATE_TOKEN und
  HIGHLEVEL_LOCATION_ID. Die lokale Vorschau bleibt unabhängig davon
  deaktiviert; kein Credential wird in statische Dateien eingebettet.
- Custom-Field-IDs/Optionen werden durch GET locations/{id}/customFields
  aufgelöst. Kontakte werden per E-Mail und Telefon gesucht; eindeutige
  Treffer werden aktualisiert, uneindeutige Treffer abgebrochen, neue
  Kontakte über contacts/upsert mit Duplikat-Anlage ausgeschaltet erstellt.
- Kontakt-, Firmenfitness- und Empfehlungsformulare nutzen dieselbe Route.
  Erfolg wird nur nach einer API-Bestätigung mit Kontakt-ID angezeigt;
  Fehler erhalten Eingaben und erhalten keine Provider-/Lead-Daten im Log.
- GET /api/highlevel-readiness prüft in der Vercel-Function-Umgebung
  ausschließlich Variablen-Präsenz und vorhandene Felddefinitionen/
  Dropdown-Optionen. Keine IDs, Secrets oder Lead-Daten in der Antwort;
  ausschließlich GET-Aufrufe, keine Schreiboperation. Ergebnis je warmer
  Function-Instanz fünf Minuten gecacht.
- Automatisierte Tests verwenden ausschließlich gemockte API-Antworten.
  Der lokale Prozess hatte keine der beiden HighLevel-Variablen; Runtime-
  Erkennung des neuen Functions-Builds kann erst nach freigegebenem Deploy
  geprüft werden. Kein Live-Testlead, Push oder Deployment ausgeführt.
- Vor produktivem Einsatz: tatsächliche HighLevel-Felddefinitionen und
  Vercel-Scopes prüfen sowie Rechtsgrundlage, Auftragsverarbeitung und
  Aufbewahrungsfristen in der Datenschutzerklärung bestätigen.
  Technische Einzelheiten: CONTACT.md.

UX- und Design-Finishing – lokaler Abnahmestand, 05.10.2026
Zunächst lokal abgenommen; Commit, Push auf main und Production-Deployment
am 05.10.2026 ausdrücklich freigegeben. Visuelle Production-Endabnahme folgt separat.
Vor Veröffentlichung ausschließlich "Kennst du schon die KIELS App?" aus dem
allgemeinen Tariftext entfernt. Dort war kein weiterer App-Absatz vorhanden;
die folgende Late-Night-Tarifinformation bleibt unverändert. Keine künstliche
neue App-Platzierung und keine weiteren Designänderungen.

Umsetzung / Kundennutzen
- Startseiten-Hero auf "Mehr als Fitness. Dein Fitnessstudio in Kiel." gekürzt.
  Der bestehende Intro nennt weiterhin Fläche, Kurse, Wellness, Betreuung und
  Kinderbetreuung. Kostenloses Probetraining und Studio-Einstieg bleiben sichtbar.
- Früher Google-Trust-Layer mit 4,7/5 und 183 Bewertungen, vom Auftraggeber
  am 05.10.2026 bereitgestellt. Kein Live-Abruf, Drittanbieter-Widget, Tracking,
  Bewertungszitat oder erfundener Autor. Rating, Anzahl, Stand und Link sind
  zusammen in der einzelnen review-proof-Sektion von index.html editierbar.
  Der Google-Maps-Suchlink identifiziert KIELS und die Adresse; kein direkter
  Review-Permalink oder Live-Synchronisation behauptet.
- Bestehendes "Warum KIELS?" als Trust-Ebene beibehalten; keine neue
  Mitgliederzahl oder unbestätigte Eigenschaft ergänzt.
- Zentrale Dark-Oberflächen differenziert: Gesundheit etwas ruhiger,
  Kurse dynamischer, Wellness wärmer, Firmenfitness sachlicher. Keine neue
  Stylesammlung; vorhandene Tokens, Bilder und Seitenaufteilung bleiben.
- Gemeinsame Tarifleistungen sichtbarer eingerahmt. Preise, Laufzeiten und
  einmalige Pauschale unverändert; keine Monatsumrechnung und keine unbestätigte
  Zuordnung einzelner Leistungen zu einem bestimmten Tarif.
- Telefon direkt am Startseiten-Hero und beim bestehenden Kinderbetreuungs-
  Zeitblock erreichbar. Altersgruppen, Kosten und Ansprechpartner nicht geraten.
- Desktop-CTA jetzt auch bei 1024 px sichtbar; mobile Schnellaktionen bei
  768 px ebenfalls außerhalb des Menüs erreichbar. Hamburger-/Schließen-Symbol
  im gesamten mobilen Menübereich definiert. Menüscrollraum berücksichtigt
  die unten stehenden Aktionen.
- Headeroffset statt zusätzlichem Pixelabstand aus tatsächlicher Höhe ermittelt;
  Mitgliedschaft als aktives Sprungziel markiert. No-JS-Menü bleibt sichtbar,
  der hohe No-JS-Header ist mobil nicht sticky.
- Bildzoom/Anhebung nur bei Maus mit geeignetem Pointer; Bildgrenzen bleiben
  erhalten. Informative Kacheln haben nur eine dezente Konturreaktion, keine
  Button-Anhebung. Fokus bleibt auch ohne Hover erkennbar.

QA / Ergebnis
- Eigenständiges vorhandenes Playwright/Chrome, exakt gemessene 1440/1024/768/
  390/375 px; 40 Seitenansichten auf Home, Fitness, Gesundheit, Kurse, Wellness,
  Kontakt, Firmenfitness und Arbeitgeberempfehlung. Keine horizontalen
  Überläufe, abgeschnittenen Textboxen oder fehlenden Bildern festgestellt.
- Fünf Auflösungen mit direktem Mitgliedschaftsaufruf und In-Page-Navigation:
  Zielbeginn unter gemessenem Header, aktive Markierung korrekt. Mobil:
  Öffnen, Fokus auf erstem Link, Tab-/Shift-Tab-Fokusumlauf, Escape/Fokusrückgabe
  und Scrollsperre geprüft. Touch-Menü und Navigation erfolgreich.
- Reduced Motion und No-JS geprüft. Gemessener Layout-Shift im lokalen
  automatisierten Lauf: 0. Keine neuen JavaScript-Laufzeitfehler.
- Lokale Formularprüfung: leere Pflichtfelder blockieren; Kontakt, Firmenfitness
  und Empfehlung liefern mit gültigen Dummy-Eingaben weiterhin kontrolliert
  503 delivery_not_configured, Eingaben bleiben erhalten. Diese drei Anfragen
  gingen nur an die fail-closed lokale Vorschau, nicht an HighLevel/Production.
- Gesamte bestehende Testsuite einschließlich neuer Link-/Trust-Regressionen:
  70/70 bestanden. Interne .html-Links und Sprungziele vollständig geprüft.
- Exakte Vorher-/Nachher-Screenshots bei 1440/390 px sowie Nachher-Ansichten
  aller fünf Größen und weitere Bereichs-/Menübilder im lokalen Abnahmebericht.
  Keine Screenshot-Dateien oder QA-Werkzeuge in den Website-Ordner kopiert.

Bewusst unverändert / offene Daten
- HighLevel-Adapter, API, Scopes, Versand, Attribution, Validierung und
  Firmenfitnessformularlogik unverändert. Keine neuen Pflichtklicks.
- Logos, Bildmaterial, Preise, rechtliche Texte und historische Wix-Snapshots
  unverändert; bestehende shared/wix-clone-Löschungen nicht übernommen.
- TODO Inhalt: drei belegte Google-Originalstimmen mit Autoren/Quelle liefern.
  Bis dahin werden mit ausdrücklicher Zustimmung nur Rating und Anzahl gezeigt.
- TODO Inhalt: Kinderbetreuungs-Altersgruppen, genauer Anmeldeweg, Kosten/
  Tarifumfang und verantwortlicher Ansprechpartner verbindlich klären.
  Vorhandene veröffentlichte Zeiten und Hinweis "Mit Anmeldung" bleiben.
- Aktuelle Kursplan-PDF und andere schon dokumentierte Betriebsdaten bleiben offen.
- Einschränkung: lokale Chromium-/Touch-Emulation, kein echter iOS-/Android-
  Gerätetest und kein vollständiger Screenreader- oder Lab-Performance-Test.
  Externe Google-/Matterport-Ziele nicht als automatisch geprüfte Inhalte ausgeben.

Lokale Abnahmepfade
http://127.0.0.1:8766/next/index.html
http://127.0.0.1:8766/next/index.html#mitgliedschaft
http://127.0.0.1:8766/next/index.html#kinderbetreuung
http://127.0.0.1:8766/next/fitness.html
http://127.0.0.1:8766/next/health.html
http://127.0.0.1:8766/next/kurse.html
http://127.0.0.1:8766/next/wellness.html
http://127.0.0.1:8766/next/kontakt.html
http://127.0.0.1:8766/next/firmenfitness.html
http://127.0.0.1:8766/next/arbeitgeber-empfehlen.html
