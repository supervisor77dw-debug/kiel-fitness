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
- Die Private Integration `KIELS Website Lead Integration` besitzt bestätigt
  genau die benötigten Scopes `locations/customFields.readonly`,
  `contacts.readonly` und `contacts.write`.
- Mehrfachkontakte sind deaktiviert. HighLevel prüft primär E-Mail und
  sekundär Telefonnummer.
- Der Adapter sucht vor jedem Schreiben exakt nach E-Mail und normalisierter
  Telefonnummer. Bei mehreren oder widersprüchlichen Treffern bricht er ab.
- Bei einem eindeutigen Treffer wird der Kontakt aktualisiert. Ohne Treffer
  wird `/contacts/upsert` mit `createNewIfDuplicateAllowed: false` verwendet.
- Der Adapter erstellt selbst keine Opportunity, startet keinen Workflow,
  sendet keine Nachricht und bucht keinen Termin.
- Der veröffentlichte Workflow
  `KIELS | 01 | Neuer Lead – Eingang & Pipeline` startet ausschließlich über
  einen eingehenden Webhook und erstellt danach selbst Kontakt, Opportunity,
  Protokolleintrag, Bestätigungs-E-Mail und interne Benachrichtigung.
- Die vorhandene Opportunity nutzt `Marketing Pipeline` → `New Lead`,
  Status `Open`, vollständigen Kontaktnamen und bisher die Quelle
  `Website – Wix Kontakt`. Doppelte Opportunities sind deaktiviert.
- Die interne E-Mail-Benachrichtigung geht bestätigt von
  `kontakt@send.kiel-fitness.de` an den HighLevel-Benutzer `Dirk Wilkens`
  mit `dirk@kiel-fitness.de`.

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
| `P04 Anfrage-ID` | Text | Neu anzulegen; idempotentes Signal für genau einen P04-Workflow-Durchlauf pro Anfragevorgang |

### Noch nicht bestätigt

- Welche Kalender und Terminprozesse aktiv sind.
- Es gibt im Adapter derzeit weder P04-Tag noch `assignedTo`, Opportunity oder
  Kalender-ID. Diese Werte dürfen nicht erfunden werden.
- Das neue Feld `P04 Anfrage-ID` und der abgegrenzte P04-Workflow bestehen
  noch nicht.
- Ein echter Kontakt-Write und ein vollständiger Ende-zu-Ende-Test wurden
  noch nicht freigegeben oder ausgeführt.

## 2. Architekturentscheidung

Der bestehende Webhook-Workflow wird für P04 **nicht direkt aufgerufen**.
Seine erste Aktion erstellt selbst einen Kontakt. Die Website hat zu diesem
Zeitpunkt aber bereits dedupliziert und den Kontakt angelegt oder aktualisiert.
Ein zusätzlicher Webhook-Aufruf würde deshalb zwei konkurrierende
Kontaktpfade, unsichere Retry-Semantik und das Risiko doppelter
Bestätigungs-E-Mails erzeugen.

Gewählt wird die bestehende direkte Kontaktintegration mit einer minimalen,
klar abgegrenzten Ergänzung:

1. Die Website schreibt pro fachlichem Anfragevorgang eine UUID in
   `P04 Anfrage-ID`.
2. Ein identischer technischer Retry verwendet dieselbe UUID. Erkennt der
   Adapter diese UUID bereits am Kontakt, erfolgt kein zweiter Schreibvorgang.
3. Eine bewusst neue Anfrage desselben Kontakts erhält eine neue UUID und
   genau ein Kontakt-Update.
4. Ein separater HighLevel-Workflow reagiert ausschließlich auf die Änderung
   von `P04 Anfrage-ID` und filtert zusätzlich
   `Kampagne / Lead-Detail = KIELS-P04-FAMILIENFITNESS`.
5. Dieser Workflow kann die bewährten Opportunity-, Protokoll-, Bestätigungs-
   und internen Benachrichtigungsaktionen übernehmen, ohne erneut einen
   Kontakt anzulegen.

Damit bleiben die vorhandenen API-Rechte ausreichend. Es werden keine
Opportunity-, Workflow-, Kalender- oder Messaging-API-Scopes benötigt.

## 3. Location und Private Integration – bestätigt

**Deutscher Menüpfad:** `Einstellungen` → `Unternehmensprofil`
(`Settings` → `Business Profile`)

Bestätigte Location-ID: `PgUgGcE7pj6GoqIzjEVr`.

**Deutscher Menüpfad:** `Einstellungen` → `Private Integrationen`
(`Settings` → `Private Integrations`)
Je nach HighLevel-Navigation kann der Punkt unter `Other Settings` liegen.

**Zweck:** Den bestätigten minimalen Berechtigungsumfang dokumentieren. Kein
neues Token erstellen und keine zusätzlichen Scopes ergänzen.

Bestätigte Mindestberechtigungen:

- `locations/customFields.readonly`
- `contacts.readonly`
- `contacts.write`

Nicht erforderlich für den aktuellen Adapter:

- Workflows schreiben oder veröffentlichen
- Opportunities schreiben
- Calendars oder Appointments schreiben
- Conversations, E-Mail oder SMS schreiben

Integration: `KIELS Website Lead Integration`. Keine weiteren Berechtigungen
hinzufügen. Tokenwert weiterhin nicht anzeigen, kopieren oder fotografieren.

## 4. Kontaktfeld `P04 Anfrage-ID` anlegen

**Deutscher Menüpfad:** `Einstellungen` → `Benutzerdefinierte Felder` →
Objekt `Kontakt` (`Settings` → `Custom Fields` → `Contact`)

Die acht bisherigen Felder sind bestätigt und werden nicht verändert.

Neu anzulegen:

- Objekt: `Kontakt`
- Name: `P04 Anfrage-ID`
- Typ: einzeiliger Text beziehungsweise `Text`
- Optionen: keine
- Pflichtfeld: nein
- Standardwert: leer

Zweck: Technisches, nicht personenbezogenes Idempotenzsignal. Der Wert ist
eine serverseitig erzeugte UUID und darf nicht manuell vorbelegt werden.

**Benötigte Rückmeldung:** Screenshot der Felddefinition mit Name, Objekt und
Typ. Keine Feld-ID muss manuell in den Code eingetragen werden.

## 5. Dubletten-Einstellungen – bestätigt

**Deutscher Menüpfad:** `Einstellungen` → `Unternehmensprofil` → Bereich
`Kontakt-Deduplizierung` (`Contact Deduplication Preferences`)

**Zweck:** Das Verhalten der Location dokumentieren, nicht eigenständig
verändern.

- Mehrfachkontakte: deaktiviert
- Primärer Abgleich: E-Mail
- Sekundärer Abgleich: Telefonnummer
- Keine Änderung erforderlich.

Der Website-Adapter schützt unabhängig davon zusätzlich:

- exakte Suche nach E-Mail und Telefonnummer,
- Abbruch bei widersprüchlichen Kontakten,
- Update nur bei genau einem Treffer,
- Upsert mit `createNewIfDuplicateAllowed: false`.

## 6. Separaten P04-Workflow als Entwurf anlegen

**Deutscher Menüpfad:** `Automatisierungen` → `Workflows`
(`Automation` → `Workflows`)

Den veröffentlichten Workflow
`KIELS | 01 | Neuer Lead – Eingang & Pipeline` nicht verändern. Stattdessen
duplizieren und als Entwurf anlegen:

Vorgeschlagener Name:
`KIELS | P04 | Familienfitness – Eingang & Pipeline`

Änderungen gegenüber der Kopie:

1. Eingehenden Webhook-Trigger entfernen.
2. Aktion `Kontakt erstellen` entfernen.
3. Trigger setzen: Kontaktfeld `P04 Anfrage-ID` wurde geändert.
4. Triggerfilter ergänzen:
   `Kampagne / Lead-Detail` ist exakt
   `KIELS-P04-FAMILIENFITNESS`.
5. Re-Entry aktivieren, damit eine spätere neue Anfrage desselben Kontakts
   mit neuer Anfrage-ID verarbeitet werden kann.
6. Opportunity-Aktion prüfen:
   - Pipeline: `Marketing Pipeline`
   - Phase: `New Lead`
   - Name: vollständiger Kontaktname
   - Status: `Open`
   - Quelle: `Website – P04 Familienfitness`
   - doppelte Opportunities: deaktiviert
7. Bestehende Aktion `Website-Anfrage protokollieren` beibehalten und auf die
   aktuellen Kontaktfelder beziehen.
8. Bestehende Bestätigungs-E-Mail kopiert beibehalten, aber Inhalt und
   Absender vor Veröffentlichung fachlich kontrollieren.
9. Bestehende interne Benachrichtigung kopiert beibehalten:
   - Art: E-Mail
   - Absender: `kontakt@send.kiel-fitness.de`
   - Empfänger: Benutzer `Dirk Wilkens`
   - Zieladresse: `dirk@kiel-fitness.de`
10. Workflow als `Entwurf` speichern, nicht veröffentlichen.

**Benötigte Rückmeldung vor Code-/E2E-Freigabe:**

- Screenshot von Trigger und beiden Feldbedingungen.
- Screenshot der vollständigen Aktionsübersicht.
- Screenshot der Opportunity-Aktion.
- Screenshot der Bestätigungs-E-Mail-Einstellung.
- Screenshot der internen Benachrichtigung.
- Bestätigung, dass der Workflow weiterhin `Entwurf` ist.

## 7. P04-Tag und Lead-Zuordnung

**Deutscher Menüpfad Tags:** `Einstellungen` → `Tags`
(`Settings` → `Tags`)
**Deutscher Menüpfad Benutzer:** `Einstellungen` → `Mein Team`
(`Settings` → `My Staff` beziehungsweise `Team`)

**Aktueller Stand:**

- Der Adapter übermittelt keinen Tag.
- Der Adapter übermittelt keinen Benutzer in `assignedTo`.
- Die verlässliche technische Kennung steht in
  `Kampagne / Lead-Detail = KIELS-P04-FAMILIENFITNESS`.

Ein Tag ist für die gewählte Architektur nicht erforderlich. Die eindeutige
Zuordnung erfolgt über `Kampagne / Lead-Detail` und `P04 Anfrage-ID`.

Optional kann der Workflow nach erfolgreichem Start den Tag
`KIELS-P04-FAMILIENFITNESS` hinzufügen. Dies ist keine Voraussetzung für den
E2E-Test und sollte nicht als zusätzlicher Trigger verwendet werden.

**Benötigte Entscheidung/Rückmeldung:**

- Soll der vorgeschlagene Tag verwendet werden: `Ja/Nein`?
- Name der verantwortlichen HighLevel-Person beziehungsweise des Teams.
- Screenshot der vorhandenen relevanten Tags und Benutzer, keine E-Mail-
  Adressen oder Telefonnummern veröffentlichen.

## 8. Pipeline-Struktur – bestätigt

**Deutscher Menüpfad:** `Chancen` → `Pipelines`
(`Opportunities` → `Pipelines`)
Alternativ: `Einstellungen` → `Pipelines`.

- Pipeline: `Marketing Pipeline`
- Phase: `New Lead`
- Status: `Open`
- Name: vollständiger Kontaktname
- Doppelte Opportunities: deaktiviert
- P04-Quelle im neuen Workflow: `Website – P04 Familienfitness`

## 9. Interne Benachrichtigung – bestätigt

**Deutscher Menüpfad:** `Automatisierungen` → `Workflows` → P04-Workflow
**Aktion:** `Interne Benachrichtigung senden`
(`Send Internal Notification`)

- Art: E-Mail
- Absender: `kontakt@send.kiel-fitness.de`
- Empfänger: HighLevel-Benutzer `Dirk Wilkens`
- Zieladresse: `dirk@kiel-fitness.de`
- Keine automatische Weiterleitung an andere Mitarbeiter.
- Bestehende Aktion kopieren, nicht neu erfinden.

## 10. Einwilligungen und Kommunikation

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

## 11. Kalender und Terminprozess prüfen

**Deutscher Menüpfad:** `Kalender` → `Kalendereinstellungen`
(`Calendars` → `Calendar Settings`)
Alternativ: `Einstellungen` → `Kalender`.

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

## 12. Kontrollierter Ende-zu-Ende-Test

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

## 13. Rückmeldepaket für die technische Fortsetzung

Bitte gesammelt bereitstellen:

1. Screenshot des neuen Felds `P04 Anfrage-ID`.
2. Screenshots des P04-Workflow-Entwurfs gemäß Abschnitt 6.
3. Kalenderliste und vorgesehener Terminprozess, sofern ein Kalender später
   integriert werden soll.
4. Entscheidung zum optionalen P04-Tag.
5. Entscheidung zu dedizierten Consent-Feldern.
6. Separate ausdrückliche Freigabe für den echten E2E-Test.

Ohne dieses Rückmeldepaket bleibt die Integration technisch vorbereitet und
mock-getestet, darf aber nicht als real Ende-zu-Ende-funktionsfähig bezeichnet
werden.
