# KIELS Website – Datenschutz-Audit

Stand: 7. Oktober 2026  
Prüfgegenstand: aktueller Production-Code unter `site-versions/02-next` und die Bereitstellung über Vercel

Dieses Dokument beschreibt den technisch nachgewiesenen Stand. Es ersetzt keine rechtliche Freigabe. Wo Vertrags-, Account- oder Organisationsnachweise fehlen, ist dies ausdrücklich als offen gekennzeichnet.

## 1. Tatsächliche Datenflüsse

### Allgemeines Kontaktformular

| Stufe | Tatsächlich verarbeitete Daten | Nachweis |
|---|---|---|
| Browserformular | Vorname, Nachname, E-Mail, Telefon, Interessen, Rückrufwunsch, Nachricht, leeres Honeypot-Feld | `site-versions/02-next/kontakt.html` |
| Technische Zuordnung | Formular-/Quellseite, gekürzter Referrer aus Ursprung und Pfad, UTM-Parameter, `gclid`, `fbclid`, zufällige Übermittlungs-ID | `site-versions/02-next/script.js` |
| Vercel-Funktion | Formularinhalt sowie serverseitiger Übermittlungszeitpunkt; HTTP-Verbindungsdaten erreichen technisch die Hosting-Infrastruktur | `site-versions/02-next/api/contact.js`, `site-versions/02-next/lib/contact.js` |
| HighLevel | Vorname, Nachname, Name, E-Mail, Telefon; Leadquelle Website; Leadtyp; Nachricht; Interessen; Rückrufwunsch | `site-versions/02-next/lib/highlevel.js` |

Die Zuordnungsparameter werden zwischen Browser und Server validiert, vom aktuellen HighLevel-Mapping aber nicht als eigene CRM-Felder geschrieben. Die Anwendung legt keine zusätzliche Lead-Datenbank an.

### Firmenfitness-Arbeitgeberanfrage

| Stufe | Tatsächlich verarbeitete Daten |
|---|---|
| Browserformular | Unternehmen, optional Standort, Vorname, Nachname, E-Mail, optional Telefon, Rückrufwunsch, optional Beschäftigtengröße, optional bestehendes Firmenfitness-Angebot, optionale Nachricht, leeres Honeypot-Feld |
| Technische Zuordnung | Request-Typ `employer_inquiry`, Quellseite, gekürzter Referrer, Landingpage, UTM-/Click-Parameter, zufällige Übermittlungs-ID |
| HighLevel | Kontakt- und Unternehmensdaten, Leadquelle Website, Leadtyp Firmenfitness, Nachricht, Rückrufwunsch, Standort, Beschäftigtengröße und bestehendes Firmenfitness-Angebot |

### Arbeitgeber empfehlen

| Stufe | Tatsächlich verarbeitete Daten |
|---|---|
| Browserformular | Firmenname und Standort des Arbeitgebers; eigene Kontaktdaten der empfehlenden Person; optional Telefon, Rückrufwunsch und Nachricht; leeres Honeypot-Feld |
| Technische Zuordnung | Request-Typ `employer_referral`, Quellseite, gekürzter Referrer, Landingpage, UTM-/Click-Parameter, zufällige Übermittlungs-ID |
| HighLevel | Kontaktdaten der empfehlenden Person, Firmenname und Standort, Leadquelle Website, eigener Leadtyp Firmenfitness-Empfehlung, optionale Nachricht und Rückrufwunsch |

Das Formular fragt keine Kontaktdaten fremder HR-Personen ab. Der Website-Code versendet keine Nachricht an den vorgeschlagenen Arbeitgeber und startet selbst keine Marketingkommunikation. Ob das Erstellen oder Aktualisieren eines Kontakts in HighLevel einen dort konfigurierten Workflow auslöst, muss im HighLevel-Account zusätzlich geprüft werden.

### Hosting und technische Metadaten

Beim Seiten- und API-Aufruf erreichen Vercel technisch insbesondere:

- IP-Adresse und Netzwerkverbindungsdaten,
- Zeitpunkt und angeforderte Ressource,
- HTTP-Methode und technisch erforderliche Header,
- vom Browser übermittelte Browser-/Geräteangaben und gegebenenfalls Referrer,
- bei Formularen den JSON-Anfrageinhalt.

Der Anwendungscode wertet bei Formularen insbesondere `Origin`, `Host`, `Content-Type` und `Content-Length` aus. Er schreibt weder den vollständigen Request noch Formularinhalte in eigene Logs. Welche Daten Vercel in Projekt-, Runtime- oder Security-Logs speichert und welche Retention im konkreten Account gilt, ist im Vercel-Account nachzuweisen.

## 2. Dienste und Empfänger

| Dienst | Zweck | übermittelte Daten | Einbindung | Zustimmung erforderlich? | Nachweisstatus |
|---|---|---|---|---|---|
| Vercel | Hosting, Auslieferung, serverseitige Formulare | Verbindungs-/Anfragedaten; bei Formularen Anfrageinhalt | Technisch erforderlich, serverseitig | Kein Consent-Banner für die technisch erforderliche Bereitstellung; Rechtsgrundlage rechtlich freizugeben | Technisch belegt; Account-Vertrag/DPA offen |
| HighLevel / LeadConnector | CRM und Leadbearbeitung | Die oben je Formular genannten Kontakt-, Unternehmens- und Anfragedaten | Nur nach aktivem Formularversand, serverseitig | Keine Marketingeinwilligung durch Formularversand; Grundlage der Anfragebearbeitung rechtlich freizugeben | Technisch belegt; Account-Vertrag/DPA und Workflows offen |
| Google Maps / Google-Bewertungen | Karte, Route beziehungsweise eigener Bewertungsdialog | Keine Übermittlung beim Laden der KIELS-Seite; Verbindung erst nach Klick | Externer Link, kein Embed | Nein für den bloßen Link auf der KIELS-Seite | Im Code und im Production-Netzwerk geprüft |
| Facebook / Instagram | Social-Media-Profile | Keine Übermittlung beim Laden; Verbindung erst nach Klick | Externe Links, keine Social Plugins | Nein für den bloßen Link auf der KIELS-Seite | Im Code und im Production-Netzwerk geprüft |
| Matterport | Externer 3D-Rundgang | Keine Übermittlung beim Laden; Verbindung erst nach Klick | Externer Link, kein Embed | Nein für den bloßen Link auf der KIELS-Seite | Im Code und im Production-Netzwerk geprüft |
| YouTube | Externe Trainingsvideos | Keine Übermittlung beim Laden; Verbindung erst nach Klick | Externe Links, keine Video-Embeds | Nein für den bloßen Link auf der KIELS-Seite | Im Code und im Production-Netzwerk geprüft |
| Les Mills und weitere Kursseiten | Kursinformationen | Keine Übermittlung beim Laden; Verbindung erst nach Klick | Externe Links | Nein für den bloßen Link auf der KIELS-Seite | Im Code geprüft |

Nicht vorhanden: Analytics, Marketingpixel, externe Skripte, externe Stylesheets oder Fonts, eingebettete Karten, eingebettete Videos und Social Plugins.

## 3. Prüfvorschläge für Rechtsgrundlagen

Diese Vorschläge sind nicht freigegeben und wurden deshalb nicht als endgültige Rechtsgrundlagen in die öffentliche Datenschutzerklärung übernommen.

| Verarbeitung | vorgeschlagene Rechtsgrundlage | Begründung | noch freizugeben |
|---|---|---|---|
| Probetraining, Mitgliedschafts- oder sonstige konkrete Vertragsanbahnung durch die betroffene Person | Art. 6 Abs. 1 lit. b DSGVO prüfen | Bearbeitung einer auf einen möglichen Vertrag gerichteten Anfrage der betroffenen Person | JA |
| Anfrage eines bestehenden Mitglieds | Art. 6 Abs. 1 lit. b DSGVO prüfen | Bearbeitung im Zusammenhang mit einem bestehenden Vertragsverhältnis | JA |
| Allgemeine, nicht vertragsbezogene Kontaktanfrage | Art. 6 Abs. 1 lit. f DSGVO prüfen | Berechtigtes Interesse an der Beantwortung freiwillig eingehender Anfragen; Interessenabwägung dokumentieren | JA |
| Firmenfitness-Anfrage eines Einzelunternehmers oder einer selbst vertragsinteressierten Person | Art. 6 Abs. 1 lit. b DSGVO prüfen | Vorvertragliche Anfrage der betroffenen Person | JA |
| Firmenfitness-Anfrage einer Ansprechperson für eine juristische Person | Art. 6 Abs. 1 lit. f DSGVO prüfen | Geschäftliche Kommunikation und Bearbeitung der Unternehmensanfrage; Art. 6 Abs. 1 lit. b passt nicht automatisch zu jeder Ansprechperson | JA |
| Arbeitgeberempfehlung | Art. 6 Abs. 1 lit. f DSGVO als vorrangigen Vorschlag prüfen | Freiwillige Bearbeitung des eigenen Vorschlags und gegebenenfalls Rückmeldung an die empfehlende Person; keine fremden HR-Kontaktdaten | JA |
| Hosting, technische Auslieferung und Security-Logs | Art. 6 Abs. 1 lit. f DSGVO prüfen | Sicherer, stabiler und missbrauchsgeschützter Betrieb der Website; Interessenabwägung dokumentieren | JA |
| Newsletter oder sonstiges Direktmarketing | Gesonderte Einwilligung vor Einführung prüfen | Nicht Bestandteil der aktuellen Formulare und nicht mit Anfragebearbeitung vermischen | JA, nur bei künftiger Einführung |

## 4. AVV/DPA-Nachweis

Ein öffentlich bereitgestellter Vertrag oder eine Anbieterinformation beweist nicht, dass die für KIELS maßgebliche Fassung im konkreten Account wirksam akzeptiert beziehungsweise abgeschlossen wurde.

| Dienst | öffentlicher DPA-Status | konkreter KIELS-Account | Vertragsversion / Gesellschaft / Subprozessoren |
|---|---|---|---|
| Vercel | Öffentlicher DPA, zuletzt aktualisiert 17.03.2026, wirksam ab 31.03.2026; Vertragspartner laut Dokument: Vercel Inc. Der DPA gilt laut Text nur für Pro- und Enterprise-Kunden. | **NACHWEIS FEHLT – Verantwortlicher muss Account und Tarif prüfen** | Dashboard → Team auswählen → Settings → Compliance; direkter Pfad: `vercel.com/[team]/~/settings/compliance`. Dokument herunterladen und Activity/Audit Log sichern. |
| HighLevel / LeadConnector | Öffentliche DPA-Seite vorhanden; vollständige Fassung, Versionsdatum, Vertragspartner und Anlagen waren bei der technischen Prüfung nicht verlässlich abrufbar. | **NACHWEIS FEHLT – Verantwortlicher muss im Account beziehungsweise über den Support prüfen** | Kein offiziell dokumentierter Account-Menüpfad verifiziert. Keine vermutete Menüführung als Nachweis verwenden. Vollständigen DPA einschließlich Anlagen beim HighLevel-Support anfordern und Annahme/Vertragsbezug schriftlich bestätigen lassen. |

Erforderlicher Nachweis je Anbieter:

1. akzeptierte/abgeschlossene DPA-Fassung als PDF oder Account-Screenshot sichern,
2. Datum der Annahme und zuständiges KIELS-Konto dokumentieren,
3. vertragsschließende Gesellschaft feststellen,
4. aktuelle Subprozessorliste und Benachrichtigungsweg sichern,
5. bei Supportklärung Ticketnummer und Antwort archivieren.

## 5. Drittlandübermittlungen

| Dienst | mögliches Drittland | Mechanismus | Quelle/Nachweis | offen? |
|---|---|---|---|---|
| Vercel | Primäre Verarbeitung laut DPA in den USA; weitere Standorte von Vercel und Subprozessoren möglich | Öffentlicher DPA nennt EU-Standardvertragsklauseln 2021/914, Module 1 bis 3 je Rollenverteilung; Vercel dokumentiert außerdem eine DPF-Zertifizierung. Die konkrete Anwendbarkeit hängt vom KIELS-Vertrag und Tarif ab. | [Vercel DPA](https://vercel.com/legal/dpa), [Vercel DPF-Mitteilung](https://vercel.com/changelog/vercel-is-now-certified-under-the-eu-us-data-privacy-framework-dpf), [offizieller DPF-Registereintrag](https://www.dataprivacyframework.gov/participant/6847) | JA – Account-/Tarifbezug und aktueller Registerstatus manuell sichern |
| HighLevel / LeadConnector | USA beziehungsweise weitere Standorte möglich; aus direkt abrufbaren Primärquellen nicht abschließend bestimmt | Öffentliche DPA-Seite verweist auf SCCs; Module, Anlagen und zusätzliche Garantien konnten nicht aus der vollständigen Primärquelle verifiziert werden. DPF-Teilnahme nicht als belegt bewerten. | [HighLevel DPA](https://www.gohighlevel.com/data-processing-agreement), [HighLevel Subprozessorseite](https://www.gohighlevel.com/sub-processors), [zu prüfender DPF-Registereintrag](https://www.dataprivacyframework.gov/participant/4838) | JA |

Ohne Accountnachweis wird weder die Anwendbarkeit des EU-US Data Privacy Framework noch bestimmter Standardvertragsklauseln oder zusätzlicher Garantien als erfüllt bewertet.

## 6. Aufbewahrung und Löschung

| Datenkategorie | Löschkriterium | offener Organisationspunkt |
|---|---|---|
| Nicht vertragsbezogene Kontaktanfragen | Zweckfortfall; danach nur soweit gesetzliche Pflichten oder Rechtsansprüche eine weitere Speicherung erfordern | Löschkonzept organisatorisch noch festzulegen |
| Vertragsanbahnungen und vertragsbezogene Kommunikation | Zweckfortfall unter Berücksichtigung einschlägiger gesetzlicher Aufbewahrungspflichten und Rechtsverteidigung | Löschkonzept organisatorisch noch festzulegen |
| Arbeitgeberempfehlungen ohne Folgeprozess | Zweckfortfall nach Bearbeitung und gegebenenfalls gewünschter Rückmeldung | Löschkonzept organisatorisch noch festzulegen |
| HighLevel-Kontakte und Lead-Felder | Zweckfortfall, gesetzliche Pflichten und Rechtsverteidigung; Dubletten-/Upsert-Verhalten berücksichtigen | Zuständigkeit, Prüfrhythmus und dokumentierter Löschprozess in HighLevel festlegen |
| Vercel Runtime-/Security-Logs | Ende des technischen Sicherheits- und Diagnosezwecks unter Berücksichtigung rechtlicher Erfordernisse | Konkrete Logarten, Einstellungen und Anbieter-Retention im Account nachweisen |

Es wurden keine festen Fristen erfunden.

## 7. Cookies, Tracking und Consent

Code- und Production-Prüfung:

- keine `Set-Cookie`-Header auf Startseite, Kontaktseite oder Readiness-API,
- `document.cookie` leer,
- keine Local-Storage- oder Session-Storage-Einträge,
- alle beim Seitenaufruf geladenen Ressourcen stammen vom eigenen Vercel-Origin,
- keine Iframes, externen Skripte oder externen Stylesheets,
- keine Analytics- oder Marketingpixel.

Für den aktuellen Stand ist kein vorsorgliches Cookie-Banner erforderlich. Bei späteren Embeds, Analytics-, Marketing- oder vergleichbaren Technologien ist die Bewertung vor Aktivierung neu durchzuführen.

## 8. Datenminimierung

- Allgemeines Kontaktformular: sichtbarer Hinweis ergänzt, keine Gesundheitsdaten, Diagnosen oder InBody-Werte zu übermitteln.
- Firmenfitness: Hinweis gegen Gesundheitsdaten und Beschäftigten-Kontaktdaten vorhanden.
- Arbeitgeberempfehlung: Hinweis gegen Namen, Kontaktdaten und Gesundheitsdaten anderer Personen vorhanden.
- InBody-Werte, Gewicht, Körperfett, Diagnosen und medizinische Informationen besitzen keine eigenen Formular- oder CRM-Felder.
- Freitext kann technisch dennoch unerwünschte Inhalte enthalten. Die Hinweise reduzieren dieses Risiko, ersetzen aber keine organisatorische Lösch- und Bearbeitungsregel für versehentlich übermittelte sensible Daten.

## 9. Technische Sicherheit

| Kontrolle | Ergebnis |
|---|---|
| HighLevel-Zugangsdaten | Nur serverseitige Umgebungsvariablen; nicht im Browserpayload |
| Eigene Secrets im Frontend | Keine gefunden; Deployment-Test prüft auf eingebettete HighLevel-Werte |
| Honeypot | In allen drei Formularwegen aktiv; serverseitig geprüft |
| Serverseitige Validierung | Zulässige Felder, Typen, Maximallängen, Telefon/E-Mail, Request-Typ, Quellseite und maximale Request-Größe werden geprüft |
| Same-Origin-Prüfung | Browser-Requests mit fremdem `Origin` werden abgewiesen |
| Fehlerantworten | Generische Nutzertexte; keine Tokens, Provider-Bodies, URLs oder Formularinhalte in Fehlerlogs |
| Transport | Production über HTTPS erreichbar |
| Eigene Persistenz | Keine zusätzliche Datenbank oder Dateispeicherung im Anwendungscode |

## 10. Noch erforderliche Account-Prüfungen

### Vercel

- Dashboard öffnen → Team auswählen → **Settings → Compliance**. Direkter Pfad: `https://vercel.com/[team]/~/settings/compliance`.
- DPA auswählen und über **Download** beziehungsweise **Download All** sichern. Download/Preview werden laut Vercel im Activity Log und bei Enterprise-Team-Ownern im Audit Log als `compliance.document.previewed` beziehungsweise `compliance.document.downloaded` erfasst.
- Tarif prüfen: Der öffentliche DPA erklärt sich nur für Pro- und Enterprise-Kunden für anwendbar. Bei Hobby/Free ist die DPA-Abdeckung nicht nachgewiesen.
- Vertragspartner, Annahmedatum, Subprozessoren, Datenregionen und Transfermechanismen dokumentieren.
- Vercel benennt im DPA AWS, Microsoft Azure und Google Cloud Platform; die vollständige aktuelle Subprozessorübersicht verweist auf das zugangsbeschränkte [Vercel Trust Center](https://security.vercel.com/).
- Project Logs / Runtime Logs / Security- beziehungsweise Firewall-Logs auf aktivierte Logarten, Zugriff, Export und Retention prüfen.
- Falls kein eindeutiger Accountnachweis abrufbar ist: Vercel-Supportticket eröffnen und schriftliche Bestätigung sichern.

### HighLevel / LeadConnector

- Öffentliche [DPA-Seite](https://www.gohighlevel.com/data-processing-agreement) und [Subprozessorseite](https://www.gohighlevel.com/sub-processors) öffnen.
- Es wurde kein verifizierter offizieller Agency-/Location-Menüpfad zum Abruf oder Abschluss des DPA gefunden. Deshalb keine vermutete Menüführung als erfüllt markieren.
- Im Agency-/Location-Account nach Vertrags-/Compliance-Unterlagen suchen. Wenn dort kein eindeutiger Nachweis mit Version und Annahmedatum verfügbar ist, HighLevel-Support kontaktieren und vollständigen DPA einschließlich Anlagen sowie den Bezug zum konkreten KIELS-Account schriftlich anfordern.
- Vertragspartner, Annahmedatum, Subprozessoren, Hosting-/Datenstandorte und Transfermechanismen dokumentieren.
- Workflows, Automations, Campaigns und Trigger für Website, Firmenfitness und Firmenfitness-Empfehlung prüfen: Formularversand darf nicht allein Newsletter oder Marketing auslösen.
- Benutzerrollen, Exportzugriffe und den organisatorischen Löschprozess prüfen.
- Falls kein eindeutiger Accountnachweis abrufbar ist: HighLevel-Supportticket eröffnen und schriftliche Bestätigung sichern.

## 11. Anbieterquellen

| Quelle | Belegter Inhalt | Einschränkung |
|---|---|---|
| [Vercel Data Processing Addendum](https://vercel.com/legal/dpa) | Aktualisiert 17.03.2026, wirksam 31.03.2026; Vercel Inc.; nur Pro/Enterprise; US-Verarbeitung; SCC 2021/914; technische Maßnahmen; AWS, Azure und GCP genannt | Belegt nicht KIELS-Tarif oder konkreten Vertragsbezug |
| [Vercel Compliance-Dokumente](https://vercel.com/docs/security/attestations-and-compliance-report) | Offizieller Dashboardpfad Settings → Compliance und Download-/Log-Verhalten | Accountzugriff erforderlich |
| [Vercel Trust Center](https://security.vercel.com/) | Vom DPA referenzierte aktuelle Subprozessorinformationen | Vollständige Liste ist zugangs-/freigabebeschränkt |
| [Vercel DPF-Mitteilung](https://vercel.com/changelog/vercel-is-now-certified-under-the-eu-us-data-privacy-framework-dpf) | Vercel erklärt DPF-Zertifizierung für EU-USA, UK-Erweiterung und Schweiz-USA | Aktuellen Registerstatus zusätzlich manuell sichern |
| [Offizieller Vercel-DPF-Eintrag](https://www.dataprivacyframework.gov/participant/6847) | Offizielle Registeradresse | Registerinhalt war technisch clientseitig gerendert; aktuellen Status manuell prüfen |
| [HighLevel Data Processing Agreement](https://www.gohighlevel.com/data-processing-agreement) | Öffentliche DPA-Seite; abrufbarer Ausschnitt verweist auf SCCs | Vollständige Fassung, Datum, Gesellschaft und Anlagen nicht verifiziert |
| [HighLevel Sub-Processors](https://www.gohighlevel.com/sub-processors) | Öffentliche Subprozessorseite vorhanden | Tabelle war clientseitig gerendert und konnte nicht zuverlässig verifiziert werden |
| [Zu prüfender HighLevel-DPF-Eintrag](https://www.dataprivacyframework.gov/participant/4838) | Mögliche offizielle Registeradresse | Teilnahme und aktueller Status nicht direkt verifiziert; nicht als erfüllt behandeln |

Der konkrete KIELS-Accountnachweis bleibt unabhängig von öffentlichen Anbieterunterlagen erforderlich.

## 12. Freigabestatus

Technisch belegt sind Datenflüsse, Empfängerpfade, Datenminimierung, fehlende Tracking-Technologien und die serverseitigen Sicherheitskontrollen.

Vor einem rechtlich freigegebenen Domainwechsel verbleiben:

1. Rechtsgrundlagen und Interessenabwägungen je Verarbeitung final freigeben und in die Datenschutzerklärung übernehmen.
2. Akzeptierte DPA-/AVV-Fassung für Vercel und HighLevel/LeadConnector im jeweiligen Account nachweisen.
3. Für beide Anbieter die konkret anwendbaren Drittlandmechanismen und Subprozessoren nachweisen.
4. Organisatorisches Löschkonzept einschließlich HighLevel und Vercel-Logs festlegen.
5. HighLevel-Workflows bestätigen: kein Newsletter/Marketing allein durch Formularversand oder Arbeitgeberempfehlung.
