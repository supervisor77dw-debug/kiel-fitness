# AW-20261021-GE-CODEX-LEAD-090 — Homepage → AIW Lead Core

## Geprüfte Basis und Umfang

Bestehendes GitHub-Repository `supervisor77dw-debug/kiel-fitness`, Basis `750f72e`,
lokaler Zweig `codex/lead-090`. Isolierte Arbeitskopie außerhalb von Dropbox:
`C:\Users\dirk\Documents\Codex\2026-10-21\aw-20261021-codex-context-058a-zielumgebung\KIELS_Homepage_AW090`.
Die führende Entwicklung liegt laut README unter **site-versions/02-next**;
Root-Clone, 01-current und Archive sind historische Referenzen und bleiben erhalten.
Kein neues Homepage-Projekt, kein Frameworkwechsel und keine Installation.
Git Sparse-Checkout enthält den aktiven Stand und vorhandene Build-Ressourcen;
core.longpaths wurde nur in dieser Arbeitskopie für Windows aktiviert.

Vercel-Projekt `kiel-fitness` ist in der lesenden Projektliste nachgewiesen.
Team-geschützte Projektdetails sind mit dieser Verbindung nicht zugänglich;
Git-Zuordnung und tatsächliche Live-Environment-/Runtime-Einstellungen wurden
nicht als aktuell verifiziert. Keine Secrets gelesen, CLI-Verknüpfung angelegt,
Vercel-Konfiguration geändert oder Live-URL getestet.

## Implementierung

- `site-versions/02-next/lib/aiw-lead.js`: neuer serverseitiger Adapter, explizite
  Konfiguration, festes HTTPS-Ziel, Source-Bearer, Timeout, Redirect-Verweigerung,
  begrenzte Commit-Bestätigung und datensparsame Fehlerantworten.
- `.../api/contact.js`: bestehender POST-Endpunkt mit vorhandener Validierung,
  Origin-/Honeypot-Prüfung, erforderlichem Anfragebeleg, striktem UTF-8 und JSON.
  Aktiver Standardadapter ist AIW; **kein automatischer HighLevel-Fallback**.
- `.../script.js`, `.../firmenfitness.js`: vorhandene vier Formularvarianten;
  UUID und Zeitstempel bleiben beim unveränderten Wiederholen stabil. Timeout
  umfasst auch den Antwortbody; Fehler erhalten Eingaben, bestätigter Commit leert sie.
- `.../lib/contact.js`: Zusatzfelder submissionId/submittedAt bei spezialisierten
  Formularen zugelassen. Sonstige bestehende Feldprüfungen bleiben erhalten.
- `.../kontakt.html`: HighLevel aus dem formularbezogenen Übermittlungshinweis
  entfernt. Vollständige Datenschutzseite wurde nicht rechtlich neu formuliert.
- `tools/contact-http.cjs`: rohe Bytes bis zur strikten UTF-8-Prüfung beibehalten;
  Fehlerlog ausschließlich fester Text ohne Payload oder Exceptions.
- `tools/build-staging.cjs`: bisheriger Build-Output-API-Weg bleibt bestehen,
  Node-22-Function enthält jetzt AIW-Adapter statt HighLevel. Der eigenständige
  HighLevel-Readiness-Endpunkt wird ebenfalls nicht mehr paketiert/geroutet.
  Historischer HighLevel-Quellcode und gemockte Regressionen bleiben erhalten.
- `tests/aiw-lead.test.cjs`, `tests/aiw-build.test.cjs` und gezielt angepasster
  bestehender Build-Vertrag in `tests/next.test.cjs`.

Die bestehende Datenschutzerklärung enthält noch HighLevel-spezifische Angaben.
Sie muss vor Veröffentlichung passend zum freigegebenen tatsächlichen Datenfluss
geprüft werden. Der Entwicklungsbuild ist deswegen keine Veröffentlichungsfreigabe.

## Datenfluss und Konfiguration

Browser -> same-origin POST /api/contact -> HTTPS /v1/website-submissions ->
freizugebender TLS-Gateway -> Loopback-Eingang -> Node-24-API -> SQLite ->
vorhandene Hub-Sitzung und GET /api/leads -> CRM aus AW-081.

Keine Browserübertragung eines Schlüssels, kein öffentlicher CRM-Lesezugang.
Die Quellberechtigung auf Empfängerseite bindet Mandant und Website-Quelle fest.
Transport- und Quellberechtigung sind getrennte Schlüssel. TLS-Zertifikatsprüfung
bleibt eingeschaltet; HTTP, direkte IP-Ziele, lokale Hostnamen, URL-Credentials,
abweichender Pfad, Query und Fragment werden verweigert. Ziel ausschließlich aus
serverseitiger Konfiguration, niemals aus Formularfeldern. Keine zusätzlichen
Produkte oder Dienste installiert.

| Variable, ausschließlich serverseitig | Voraussetzung |
| --- | --- |
| AIW_LEAD_ENABLED | exakt `true`; sonst deaktiviert |
| AIW_LEAD_ENDPOINT | freigegebenes HTTPS-Ziel, fester Pfad /v1/website-submissions |
| AIW_LEAD_TOKEN | zufälliger 256-Bit-Ingress-Schlüssel, 64 Hexzeichen |
| AIW_PRIVACY_NOTICE_VERSION | fachlich freigegebene Hinweisversion, maximal 100 Zeichen |
| AIW_MARKETING_NOTICE_VERSION | zusätzlich nötig, wenn Marketing ausgewählt wurde |

Keine tatsächlichen Werte hinterlegt. Preview und Production benötigen getrennte
Schlüssel, Quellen und Mandanten; niemals NEXT_PUBLIC_-Variablen verwenden.
Konfiguration fehlt/ungültig -> 503, kein Versand und kein Erfolg. Auch vorhandene
HighLevel-Environment-Werte aktivieren den neuen Standardpfad nicht.

Formular-Vertrag bleibt camelCase; neu erforderlich UUID-v4 `submissionId` und
UTC-ISO-Zeit `submittedAt`. Interesse courses/existing-membership wird explizit auf
Core classes/existing_membership abgebildet. Leere Themen/Firmen/Kinderbetreuung
erhalten Core other, ihre genaue Formularart und Zusatzangaben bleiben im optionalen
`website_context` des unveränderlichen Anfrage-Snapshots erhalten. Der autorisierte
CRM-GET wird additiv um `request` erweitert: Anliegen, Nachricht, Rückrufwunsch,
Formularzeitpunkt sowie erlaubte Formular-/Firmenangaben. Die Detailansicht stellt
sie als Text dar. Keine fremden Anfragen oder zusätzlichen Tracking-/Einwilligungs-
daten im GET. Marketing ist separat und niemals vorausgewählt.

Die Zeit ist ein übermittelter Formularzeitpunkt und bleibt beim Retry stabil,
kein unabhängig verifizierter Ereigniszeitpunkt. Der Core speichert zusätzlich
seinen Empfangszeitpunkt. Bei Inhalts-/Hinweisversionskonflikt -> 409, kein Update.
Quelle, Mandant, Mitarbeiter und Pipelinezustand lassen sich nicht durch Formulardaten
festlegen. Neue Leads bleiben zunächst unzugewiesen.

Kein dauerhafter Eingangspuffer: Bestätigung nur nach DB-Commit. Bei Timeout kann
bereits gespeichert worden sein; unverändert erneut senden, damit die DB dedupliziert.
Nach Tabverlust/Reload fehlt der bisherige Beleg; keine Garantie gegen Neuanfragen
mit neuer Kennung. Geänderte Eingaben sind ebenfalls eine neue Anfrage. Es wird
kein Formulardatensatz im Browser dauerhaft gespeichert.

## Tests und Build

Homepage mit vorhandenem **Node 22.20.0**:

```powershell
& $siteNode --test tests/aiw-lead.test.cjs tests/aiw-build.test.cjs site-versions/02-next/tests/contact.test.cjs
& $siteNode --test tests/contact-http.test.cjs
& $siteNode --test --test-name-pattern='deployment builder|fresh deployment artifact' tests/next.test.cjs
```

37 + 1 + 2 = **40/40 Tests bestanden**, keine übersprungenen Fälle in diesen
gezielt ausgewählten Läufen. Die 30 bisherigen aktiven Adaptertests mocken HighLevel
vollständig; ihre Konsolenmeldungen sind synthetische Fehlerfälle, keine Live-Zugriffe.
Nicht die gesamte historische Website-/Archiv-/Bildtestsuite erneut ausgeführt.

Nachgewiesen: deaktivierter Versand, unsichere Zielkonfigurationen, feste Topics,
stabiler Beleg, Firmenfelder, separate Marketinghinweise, fehlende Authentifizierung,
fremder Origin, Honeypot, ungültiges UTF-8, beliebige 2xx ohne Commit-Beleg,
HTTP-Fehler/Timeout/409, fehlende Daten in Browserantworten und keine Secrets im
Frontend. Build prüft gepackte Function und sämtliche referenzierten lokalen Scripts.

Zusätzlich im benachbarten Core: **63/63 Tests bestanden**; davon neun neue
Website-Tests mit vier echten Browserformular-Flows, einschließlich verlorener
Bestätigung, Restart, zehn paralleler Zustellungen, Überlast und CRM-GET.
Diese Abnahme benötigt beide Repositories; siehe `AIW_Lead_Core/WEBSITE_AW090.md`.
Der tatsächliche Internet-/TLS-/Vercel-Weg wird im Test durch expliziten lokalen
Transport ersetzt. Browser dürfen dabei ausschließlich die beiden Test-Origins
kontaktieren. Externes E2E bleibt ausdrücklich offen.

Lokaler final geprüfter Build:
`node tools/build-staging.cjs --output .vercel/output-aw090-reviewed`.
137 erfasste Kopiervorgänge, 116 Medienressourcen; zusätzlich generierte Entry-/
Konfigurationsdateien. Build bleibt ignoriert und wurde nicht hochgeladen.
Der gewöhnliche Standardbuild mit .vercel/output bleibt unverändert verfügbar.

## Freigabe und Rückfall

**GO für lokale Entwicklungsabnahme; kein Produktiv-GO.** Offen sind: erreichbarer
Betriebshost, eng begrenztes HTTPS-Gateway, globaler Rate-/Botschutz, Prozessbetreuung,
Test-/Produktivquellen, getrennte Runtime-Secrets, fachlich freigegebene Datenschutz-
und Marketinghinweise, Mitarbeiterzuweisung, Backup/Restore und externes synthetisches
E2E nach gesonderter Freigabe. Insbesondere keine breite Freigabe des lokalen Hub-
oder Sidecar-Ports. Kein NAS-Netzlaufwerk als SQLite-Arbeitsdatei.

Rückfall zuerst AIW_LEAD_ENABLED deaktivieren -> expliziter 503 statt Erfolg.
Kein automatisches Zurückschreiben nach HighLevel und keine Doppelzustellung.
Bereits bestätigte Datensätze bleiben erhalten. Paketversionen gemeinsam zurückrollen;
neue Kontextfelder können von alten Eingängen verweigert werden. Keine DB-Löschung.

Skill angewandt: `vercel:env-vars` für ausschließlich serverseitige Schlüssel und
getrennte Umgebungen; es wurden keine Environment-Werte ausgelesen oder geändert.
Technische Repo-Übergabe, keine neue Workspace-Masterdatei. Optionaler späterer
freigegebener Berichtszielpfad, hier nicht angelegt:
`C:\Users\dirk\Dropbox\AI_Workspace\01_FOKUS\KIELS Optimierung\07_OUTPUT\AW-090_Homepage-Lead-Integration_2026-10-21.md`.
