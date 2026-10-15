# KIELS HighLevel – manuelle Einrichtung und Prüfung für P04

Stand: 15.10.2026  
Kampagne: `KIELS-P04-FAMILIENFITNESS`  
HighLevel-Location: `PgUgGcE7pj6GoqIzjEVr`

## Sicherheits- und Freigabegrenzen

- Diese Anleitung wird ausschließlich in der bereits angemeldeten regulären
  HighLevel-Browsersitzung des Auftraggebers ausgeführt.
- Keine produktiven Workflows aktivieren oder ändern, solange Trigger,
  Aktionen und Empfänger nicht vollständig geprüft sind.
- Keinen echten Kontakt anlegen, bevor der Auftraggeber den kontrollierten
  Ende-zu-Ende-Test ausdrücklich freigibt.
- Keine E-Mail, SMS, WhatsApp-Nachricht oder Terminerinnerung im Test auslösen.
- Private-Integration-Token niemals in Screenshots, Chats oder Dateien zeigen.
- Vor jeder Änderung einen Screenshot des Istzustands erstellen.

## 1. Bestätigter Istzustand

### Technisch bestätigt

- Der Website-Adapter verwendet HighLevel API v2 und die Location
  `PgUgGcE7pj6GoqIzjEVr`.
- Die Vercel-Production meldete am 15.10.2026 über den rein lesenden
  Readiness-Endpunkt `ready: true`.
- `HIGHLEVEL_PRIVATE_TOKEN` und `HIGHLEVEL_LOCATION_ID` sind in der
  Production-Runtime vorhanden. Das Token selbst wurde nicht ausgelesen.
- Die aktuelle geschützte Vercel-Preview besitzt diese Variablen nicht und
  bleibt deshalb absichtlich fail-closed. Sie kann keinen Kontakt schreiben.
- Der Adapter sucht vor jedem Schreiben exakt nach E-Mail und normalisierter
  Telefonnummer. Bei mehreren oder widersprüchlichen Treffern bricht er ab.
- Bei einem eindeutigen Treffer wird der Kontakt aktualisiert. Ohne Treffer
  wird `/contacts/upsert` mit `createNewIfDuplicateAllowed: false` verwendet.
- Der Adapter erstellt selbst keine Opportunity, startet keinen Workflow,
  sendet keine Nachricht und bucht keinen Termin.

### Bestätigte Kontaktfelder

| Feld | Typ | Bestätigte Optionen beziehungsweise Verwendung |
| --- | --- | --- |
| `Lead-Quelle` | Single options | Website, Google, Facebook, Instagram, Telefon, Persönlich / Studio, Empfehlung, Sonstige |
| `Kampagne / Lead-Detail` | Text | P04 schreibt `KIELS-P04-FAMILIENFITNESS` |
| `Nachricht / Anfrage` | Large text | Nachricht, Kinderbetreuungsinteresse, Kampagne, Landingpage, UTM-Werte, Serverzeitpunkt sowie Datenschutz- und Werbeeinwilligungsstatus |
| `Rückruf erwünscht` | Single options | Ja, Nein |
| `Interesse / Anliegen (Mehrfach)` | Multiple options | Probetraining, Mitgliedschaft & Tarife, Kurse, Gesundheit & Körperanalyse, Sauna & Wellness, Bestehende Mitgliedschaft, Sonstiges |
| `Standort` | Text | Für Firmenfitness |
| `Beschäftigtengröße` | Single options | 1-9, 10-49, 50-249, 250+ |
| `Bestehendes Firmenfitness-Angebot` | Single options | Ja, Nein, Nicht sicher |

### Noch nicht bestätigt

- Ob das Private-Integration-Token neben dem bestätigten Feld-Lesezugriff
  auch `contacts.readonly` und `contacts.write` besitzt.
- Welche aktiven Workflows auf Kontaktanlage oder Kontaktaktualisierung
  reagieren.
- Ob Kontakte automatisch einer Person, Pipeline oder Opportunity zugeordnet
  werden.
- Ob interne Benachrichtigungen existieren.
- Welche Kalender und Terminprozesse aktiv sind.
- Ob die Location doppelte Kontakte erlaubt und ob E-Mail oder Telefon als
  primäres Dublettenkriterium eingestellt ist.
- Es gibt im Adapter derzeit weder P04-Tag noch `assignedTo`, Opportunity oder
  Kalender-ID. Diese Werte dürfen nicht erfunden werden.

## 2. Location und Private Integration prüfen

**Menüpfad:** `Settings` → `Business Profile`  
**Zweck:** Sicherstellen, dass die Website in die richtige Location schreibt.

1. Location öffnen und die Location-ID kontrollieren.
2. Erwarteter Wert: `PgUgGcE7pj6GoqIzjEVr`.
3. Bei Abweichung nichts ändern und die abweichende ID melden.

**Benötigte Rückmeldung:**

- Screenshot des Bereichs mit Location-Name und Location-ID.
- Schriftliche Bestätigung, dass es die produktive KIELS-Location ist.

**Menüpfad:** `Settings` → `Private Integrations`  
Je nach HighLevel-Navigation kann der Punkt unter `Other Settings` liegen.

**Zweck:** Berechtigungen des vorhandenen, in Vercel hinterlegten Tokens
prüfen. Kein neues Token erstellen, solange das bestehende Token identifiziert
werden kann.

Erforderliche Mindestberechtigungen:

- `locations/customFields.readonly`
- `contacts.readonly`
- `contacts.write`

Nicht erforderlich für den aktuellen Adapter:

- Workflows schreiben oder veröffentlichen
- Opportunities schreiben
- Calendars oder Appointments schreiben
- Conversations, E-Mail oder SMS schreiben

**Kontrolle:**

1. Die für die Website bestimmte Private Integration öffnen.
2. Nur Name, Status und Scopes kontrollieren.
3. Tokenwert nicht anzeigen, kopieren oder fotografieren.
4. Fehlende Scopes notieren, aber nicht ungefragt hinzufügen.

**Benötigte Rückmeldung:**

- Screenshot nur der Scope-Liste, Token vollständig ausgeblendet.
- Kennzeichnung, welche der drei Mindestberechtigungen vorhanden sind.

## 3. Kontaktfelder kontrollieren

**Menüpfad:** `Settings` → `Custom Fields` → Objekt `Contact`  
**Zweck:** Sicherstellen, dass der Adapter exakt auf die vorhandenen Felder
auflösen kann.

1. Die acht Felder aus der Tabelle in Abschnitt 1 suchen.
2. Namen, Objekttyp `Contact`, Feldtyp und Optionen vergleichen.
3. Keine Feldnamen oder Optionen ändern: Der bestehende Adapter löst sie
   anhand der exakten normalisierten Namen auf.
4. Besonders prüfen:
   - `Kampagne / Lead-Detail` ist ein Textfeld.
   - `Nachricht / Anfrage` ist ein Large-Text-Feld.
   - `Rückruf erwünscht` enthält `Ja`.
   - `Interesse / Anliegen (Mehrfach)` ist mehrfach auswählbar.

**Bereits bestehend:** Alle acht Felder wurden über die Production-Readiness
gefunden und als kompatibel gemeldet.

**Noch erforderlich:** Nur visuelle Gegenprüfung; keine Neuerstellung.

**Benötigte Rückmeldung:**

- Ein Screenshot der Feldliste.
- Detail-Screenshots nur bei einer Abweichung.

## 4. Dubletten-Einstellungen kontrollieren

**Menüpfad:** `Settings` → `Business Profile` → Bereich
`Contact Deduplication Preferences` beziehungsweise `Allow Duplicate Contacts`

**Zweck:** Das Verhalten der Location dokumentieren, nicht eigenständig
verändern.

1. Status von `Allow Duplicate Contacts` notieren.
2. Notieren, ob E-Mail, Telefonnummer oder beide als Suchkriterium gelten.
3. Einstellung nicht ändern.

Der Website-Adapter schützt unabhängig davon zusätzlich:

- exakte Suche nach E-Mail und Telefonnummer,
- Abbruch bei widersprüchlichen Kontakten,
- Update nur bei genau einem Treffer,
- Upsert mit `createNewIfDuplicateAllowed: false`.

**Benötigte Rückmeldung:**

- Screenshot der vollständigen Dubletten-Einstellung.
- Schriftlich: Duplikate erlaubt `Ja/Nein`; Suchkriterium
  `E-Mail/Telefon/beide`.

## 5. Workflows und Automationsrisiken prüfen

**Menüpfad:** `Automation` → `Workflows`  
**Zweck:** Erkennen, ob API-Kontaktanlage oder -aktualisierung unbeabsichtigt
Nachrichten oder andere Aktionen auslösen kann.

Alle veröffentlichten Workflows auf folgende Trigger prüfen:

- `Contact Created`
- `Contact Changed`
- `Contact Updated`
- Änderung von `Lead-Quelle`
- Änderung von `Kampagne / Lead-Detail`
- Änderung von `Nachricht / Anfrage`
- Tag hinzugefügt
- Opportunity erstellt oder Stage geändert

Ein HighLevel-Trigger `Form Submitted` für ein internes HighLevel-Formular
sollte durch die KIELS-Website nicht ausgelöst werden, weil die Website direkt
die Contact API verwendet. Trotzdem dokumentieren, falls ein Workflow
zusätzlich auf Kontaktanlage oder Feldänderung reagiert.

Für jeden passenden Workflow dokumentieren:

1. Name und Status `Draft/Published`.
2. Trigger und sämtliche Filter.
3. Re-Entry-Einstellung.
4. Aktionen in Reihenfolge.
5. Enthaltene E-Mail-, SMS-, WhatsApp- oder Voicemail-Aktionen.
6. `Add Opportunity`, `Assign To User`, `Add Tag`,
   `Internal Notification` und Webhooks.
7. Absender, Empfänger und Wartezeiten, ohne persönliche Inhalte offenzulegen.

**Höchstes Risiko:** Ein allgemeiner veröffentlichter `Contact Created`- oder
`Contact Updated`-Workflow ohne Filter könnte bereits durch den späteren
E2E-Test ausgelöst werden.

**Benötigte Rückmeldung:**

- Screenshot der Workflow-Liste mit Status.
- Für jeden potenziell passenden Workflow je ein Screenshot von Trigger,
  Filtern und Aktionsübersicht.
- Schriftliche Bestätigung, ob eine externe Nachricht möglich ist.

## 6. P04-Tag und Lead-Zuordnung festlegen

**Menüpfad Tags:** `Settings` → `Tags`  
**Menüpfad Benutzer:** `Settings` → `My Staff` beziehungsweise `Team`  

**Aktueller Stand:**

- Der Adapter übermittelt keinen Tag.
- Der Adapter übermittelt keinen Benutzer in `assignedTo`.
- Die verlässliche technische Kennung steht in
  `Kampagne / Lead-Detail = KIELS-P04-FAMILIENFITNESS`.

**Empfehlung:**

1. Noch keinen Tag als Voraussetzung für die Lead-Erkennung verwenden.
2. Falls ein Tag gewünscht ist, exakter vorgeschlagener Wert:
   `KIELS-P04-FAMILIENFITNESS`.
3. Einen Tag erst nach Workflow-Prüfung erstellen.
4. Ein späterer P04-Workflow kann auf das Kampagnenfeld filtern und als erste
   Aktion diesen Tag hinzufügen.
5. Verantwortliche Person oder Team erst nach Benennung eintragen.

**Benötigte Entscheidung/Rückmeldung:**

- Soll der vorgeschlagene Tag verwendet werden: `Ja/Nein`?
- Name der verantwortlichen HighLevel-Person beziehungsweise des Teams.
- Screenshot der vorhandenen relevanten Tags und Benutzer, keine E-Mail-
  Adressen oder Telefonnummern veröffentlichen.

## 7. Pipeline-Struktur dokumentieren

**Menüpfad:** `Opportunities` → `Pipelines`  
Alternativ, je nach Navigation: `Settings` → `Pipelines`.

**Aktueller Stand:** Der Website-Adapter legt keine Opportunity an. Eine
vorhandene Pipeline-Zuordnung kann daher nur über eine bestehende Automation
erfolgen.

Zu dokumentieren:

1. Namen aller fachlich passenden Pipelines.
2. Stage-Namen und Reihenfolge.
3. Pflichtfelder, Standard-Owner und Lost-/Won-Logik.
4. Workflows, die Opportunities automatisch anlegen oder verschieben.

**Vorschlag, erst nach fachlicher Freigabe:**

- Vorhandene allgemeine Lead-Pipeline wiederverwenden, falls vorhanden.
- Start-Stage der P04-Leads eindeutig benennen beziehungsweise auswählen.
- Keine neue Pipeline nur für P04 anlegen, solange Volumen und Prozess das
  nicht rechtfertigen.

**Benötigte Rückmeldung:**

- Screenshot der Pipeline-Liste.
- Screenshot der vorgesehenen Pipeline mit allen Stages.
- Gewünschte Pipeline und Start-Stage als Text.

## 8. Interne Benachrichtigung vorbereiten

**Menüpfad:** `Automation` → `Workflows` → passender P04-Workflow  
**Mögliche Aktion:** `Send Internal Notification`

Eine sichere erste Ausbaustufe darf nur intern informieren:

- Trigger/Filter:
  `Kampagne / Lead-Detail` ist exakt `KIELS-P04-FAMILIENFITNESS`.
- Kein Trigger allein auf `Contact Created`.
- Re-Entry zunächst deaktivieren, bis das Update-Verhalten getestet ist.
- Empfänger: vom Auftraggeber benannte KIELS-Person oder Team.
- Inhalt:
  - Kontaktname
  - Telefonnummer und E-Mail
  - Rückrufwunsch
  - `Nachricht / Anfrage`
  - Link zum HighLevel-Kontakt
- Keine automatische Nachricht an den Kontakt.

Workflow zunächst nur als `Draft` erstellen. Veröffentlichung erst nach
separater Freigabe und kontrolliertem Test.

**Benötigte Rückmeldung:**

- Gewünschte interne Empfänger.
- Kanal: In-App, interne E-Mail oder beides.
- Screenshot des Draft-Workflows mit Trigger, Filter und Aktion.

## 9. Einwilligungen und Kommunikation

**Aktueller technischer Stand:**

- Datenschutzbestätigung ist für das P04-Formular verpflichtend.
- Werbeeinwilligung ist freiwillig.
- Beide Statuswerte und der serverseitige Zeitpunkt werden strukturiert im
  vorhandenen Feld `Nachricht / Anfrage` gespeichert.
- Das Absenden allein löst im Adapter keine Marketingkommunikation aus.

**Wichtige Grenze:**

Das aktuelle Freitextformat eignet sich zur Nachvollziehbarkeit, aber nicht
als sicherer Workflow-Filter für automatisches Marketing. Bis separate
dedizierte Consent-Felder fachlich und rechtlich freigegeben und technisch
angebunden sind:

- keine automatische Werbe-E-Mail,
- keine automatische Werbe-SMS,
- keine Aufnahme in Newsletter- oder Nurturing-Workflows,
- vorhandene globale Workflows auf entsprechende Ausschlüsse prüfen.

Eine direkte manuelle Antwort zur konkreten Anfrage ist von einer freiwilligen
Werbeeinwilligung getrennt zu behandeln. Die rechtliche Bewertung und
Aufbewahrungsfrist müssen vom Verantwortlichen freigegeben werden.

**Benötigte Rückmeldung:**

- Screenshot vorhandener DND-/Consent-Felder und ihrer Verwendung.
- Bestätigung, ob dedizierte P04-Consent-Felder künftig gewünscht sind.
- Falls ja: erst Feldnamen und Datentypen abstimmen, danach Code anpassen.

## 10. Kalender und Terminprozess prüfen

**Menüpfad:** `Calendars` → `Calendar Settings`  
Alternativ: `Settings` → `Calendars`.

**Aktueller Stand:**

- Der P04-Adapter bucht keinen Termin.
- Die Landingpage verspricht keinen automatisch bestätigten
  Betreuungszeitraum.
- Betreuung bleibt ausdrücklich an vorherige Anmeldung und Abstimmung
  gebunden.

Zu dokumentieren:

1. Bestehende Kalender für Probetraining, Beratung oder Rückruf.
2. Zuständiger Kalender-Owner.
3. Verfügbarkeit, Bestätigung, Erinnerungen und Stornierungslogik.
4. Automatische E-Mail-/SMS-Erinnerungen.
5. Öffentlicher Buchungslink, falls vorhanden.

**Empfehlung:**

- Für den ersten E2E-Test keine automatische Buchung integrieren.
- Nach der Anfrage zunächst interne Prüfung und persönliche Abstimmung.
- Einen Buchungslink erst einbinden, wenn Kalender, Erinnerungen,
  Betreuungsanmeldung und Datenschutzhinweise fachlich bestätigt sind.

**Benötigte Rückmeldung:**

- Screenshot der Kalenderliste.
- Detail-Screenshot des vorgesehenen Kalenders ohne sensible Zugangsdaten.
- Schriftlich: Kalendername, Owner, Buchungslink und aktive Erinnerungen.

## 11. Kontrollierter Ende-zu-Ende-Test

Erst nach ausdrücklicher Freigabe und nach Abschluss der Workflow-Prüfung:

1. Einen eindeutig gekennzeichneten Testkontakt vereinbaren:
   - freigegebene Test-E-Mail,
   - freigegebene Test-Telefonnummer,
   - keine Daten realer Interessenten.
2. Vorher in HighLevel nach beiden Werten suchen und Ergebnis dokumentieren.
3. Sämtliche potenziell passenden Workflows entweder nachweislich ausschließen
   oder den Testkontakt durch freigegebene Filter vom Versand ausnehmen.
4. Preview erst für diesen Test mit den notwendigen Runtime-Secrets verbinden.
5. Anfrage mit diesen Parametern absenden:
   - `utm_source=manual_e2e`
   - `utm_medium=qa`
   - `utm_campaign=KIELS-P04-FAMILIENFITNESS`
   - `utm_content=controlled_test`
6. Prüfen:
   - Kontakt wurde genau einmal angelegt,
   - Kampagnenkennung und UTM-Werte sind vorhanden,
   - Datenschutzstatus und Werbeeinwilligung stimmen,
   - keine externe Nachricht wurde versendet,
   - gewünschte interne Benachrichtigung wurde ausgelöst.
7. Dieselbe Anfrage mit geänderter Nachricht erneut senden.
8. Prüfen, dass derselbe Kontakt aktualisiert und kein Duplikat angelegt wurde.
9. Testkontakt nach dokumentierter Freigabe entweder kennzeichnen, behalten
   oder datenschutzgerecht löschen.

## 12. Rückmeldepaket für die technische Fortsetzung

Bitte gesammelt bereitstellen:

1. Location-ID-Bestätigung.
2. Scope-Liste der Private Integration ohne Token.
3. Dubletten-Einstellung.
4. Kontaktfeldliste.
5. Workflow-Liste und Details aller potenziell passenden Workflows.
6. Pipeline-Liste, gewünschte Pipeline und Start-Stage.
7. Verantwortliche Person beziehungsweise Team.
8. Gewünschter interner Benachrichtigungskanal.
9. Kalenderliste und vorgesehener Terminprozess.
10. Entscheidung zum P04-Tag.
11. Entscheidung zu dedizierten Consent-Feldern.
12. Separate ausdrückliche Freigabe für den echten E2E-Test.

Ohne dieses Rückmeldepaket bleibt die Integration technisch vorbereitet und
mock-getestet, darf aber nicht als real Ende-zu-Ende-funktionsfähig bezeichnet
werden.
