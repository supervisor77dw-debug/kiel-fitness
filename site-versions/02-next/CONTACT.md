# KIELS Next contact and HighLevel integration

## Request path

The contact page, the Kinderbetreuung campaign form and both Firmenfitness
forms use the same endpoint:

`Website form -> POST /api/contact -> server validation -> HighLevel API v2`

The read-only `GET /api/highlevel-readiness` deployment check reports only
whether both runtime variables are present and whether the existing contact
field definitions/options satisfy the implemented mappings. It never returns
credential values or field IDs, sends no lead data, and performs no write
request. Its result is cached in a warm function instance for five minutes.

Read-only error diagnostics (2026-10-04): failed custom-field reads log only
`operation: custom_fields_read`, the actual provider HTTP status, a
status-based error classification, and allowlisted provider codes/messages.
401 indicates authentication; 403 cannot distinguish missing scopes from
location access; 404 cannot distinguish an unknown location from a wrong path;
429 indicates rate limiting; 5xx indicates a provider error. These are diagnostic
categories, not verified root causes.
Only UUID-shaped request/correlation IDs from the two explicit headers are
accepted. Error JSON is limited to 4096 bytes; unknown messages, arbitrary IDs,
credentials, location IDs and full response bodies are never logged or returned.
The public readiness response remains unchanged. No retries, scope changes,
mapping changes or contact writes are introduced by these diagnostics.

The browser only calls the KIELS endpoint. HighLevel credentials and API
requests are confined to `lib/highlevel.js`; the browser never receives the
private token, location ID, or provider response. The local preview is
deliberately configured with an empty environment and cannot deliver leads,
even if the developer shell has HighLevel credentials.

The Vercel build packages the regular server handler and reads configuration
from the function's runtime environment. It does not embed, copy, or print
credential values. Delivery fails closed unless both
`HIGHLEVEL_PRIVATE_TOKEN` and `HIGHLEVEL_LOCATION_ID` are non-empty.
`HIGHLEVEL_ENABLED` and webhook URL variables are not used.

## HighLevel API v2 calls

The adapter uses `https://services.leadconnectorhq.com` with Bearer
authorization and `Version: 2021-07-28`.

1. `GET /locations/{locationId}/customFields` loads existing contact-field
   definitions. Field IDs and allowed dropdown values are resolved from the
   returned definitions at runtime; no IDs are guessed and no fields are
   created.
2. `GET /contacts/?locationId=...&query=...&limit=100` searches by submitted
   email and, when present, phone. Candidate records are fetched through
   `GET /contacts/{contactId}` and compared exactly after case-insensitive
   email and normalized phone comparison.
3. A single unambiguous match is updated with `PUT /contacts/{contactId}`.
   If no exact match exists, `POST /contacts/upsert` creates/upserts with
   `createNewIfDuplicateAllowed: false`.

For P04, the adapter also writes the server-generated submission UUID to the
existing-or-required contact text field `P04 Anfrage-ID`. If a retry finds the
same UUID already stored on the exact contact, it confirms the contact state
without a second write. A later intentional request has a new UUID and causes
one update. This field is the idempotent trigger signal for a dedicated
HighLevel P04 workflow.

If email and phone resolve to different contacts, multiple exact matches
exist, a search result is incomplete, or a required HighLevel field/value
cannot be resolved, the adapter stops without updating or creating a
contact. HighLevel's upsert endpoint is a final duplicate safeguard for
contacts created concurrently after the search. No opportunity, workflow,
email, SMS, or marketing action is triggered.

Requests have a 12-second overall timeout and redirects are rejected.
Provider response bodies and exceptions are not logged or returned. Logs
contain only a generic operation category and HTTP status. The endpoint only
returns success after HighLevel confirms the contact operation with a
contact ID. A timeout can have an uncertain provider outcome; a retry
searches by email/phone rather than relying on the browser submission ID.

## Mapping

Only server-controlled values are used for source and campaign attribution:

| KIELS data | HighLevel destination |
| --- | --- |
| Lead source | Standard `source` and existing `Lead-Quelle` field: `Website` |
| Ordinary contact, trial selected | `Kampagne / Lead-Detail`: `Probetraining` |
| Other ordinary contact request | `Kampagne / Lead-Detail`: `Kontaktformular` |
| Employer inquiry | `Kampagne / Lead-Detail`: `Firmenfitness` |
| Employee referral | `Kampagne / Lead-Detail`: `Firmenfitness Empfehlung` |
| Kinderbetreuung campaign | `Kampagne / Lead-Detail`: `KIELS-P04-FAMILIENFITNESS` |
| Kinderbetreuung request identity | `P04 Anfrage-ID`: server-generated submission UUID |
| Interest selections | Existing `Interesse / Anliegen (Mehrfach)`, mapped to the listed German options; the legacy single-select `Interesse / Anliegen` is not written |
| Message | Existing `Nachricht / Anfrage`, passed as entered (no trimming) |
| Checked callback checkbox | Existing `Rückruf erwünscht`, mapped to an actual available affirmative option; unchecked is omitted |
| Company name | Standard HighLevel `companyName` |
| Firmenfitness location, employee size, existing offer | Existing `Standort`, `Beschäftigtengröße`, and `Bestehendes Firmenfitness-Angebot` fields, when submitted |

The Kinderbetreuung request writes its childcare interest, server timestamp,
campaign identifier, clean landing-page URL, UTM values, privacy
acknowledgement and the separate marketing-consent status as a structured
entry in the existing `Nachricht / Anfrage` field. This avoids inventing field
IDs or silently dropping campaign data. The campaign form never treats form
submission as marketing consent: the optional checkbox is recorded as `Ja` or
`Nein`. The adapter itself does not enroll the contact in a workflow, send a
message, create an opportunity or book an appointment.

## P04 workflow architecture

The existing published workflow `KIELS | 01 | Neuer Lead – Eingang & Pipeline`
is webhook-triggered and creates a contact itself. The website must not call
that webhook after its own deduplicated contact write: doing so would create
two competing contact paths and unsafe retry/email behavior.

P04 therefore keeps the direct contact adapter and requires a separate
HighLevel workflow triggered only when `P04 Anfrage-ID` changes, additionally
filtered by `Kampagne / Lead-Detail = KIELS-P04-FAMILIENFITNESS`. The workflow
can reuse the established opportunity, logging, confirmation-email and
internal-notification actions, but must omit both the inbound-webhook trigger
and the create-contact action. This design needs no API scopes beyond the
verified `locations/customFields.readonly`, `contacts.readonly` and
`contacts.write`.

The Firmenfitness-specific field names/options must be present in the live
contact-field definitions.
Employee-size options must include `1-9`, `10-49`, `50-249`, and `250+`.
Existing-offer options must include `Ja`, `Nein`, and `Nicht sicher`.
Alternative labels are not mapped for these fields.
If they are not, those submissions fail closed;
the integration will neither create substitute fields nor report success
after dropping supplied form data. Missing optional values are omitted.
Phone is omitted when not entered. No preferred-contact-time, priority,
closing-interest, or marketing-consent values are invented. No attribution
or arbitrary client-supplied lead source is forwarded as a trusted source.

Interest options are:
`Probetraining`, `Mitgliedschaft & Tarife`, `Kurse`,
`Gesundheit & Körperanalyse`, `Sauna & Wellness`,
`Bestehende Mitgliedschaft`, and `Sonstiges`.
Multi-select values are sent only to a compatible existing HighLevel field;
an unsupported selection/type fails closed.

## Validation and error behavior

The shared handler keeps its same-origin check, JSON content-type check,
16 KiB request limit, honeypot and server-side field validation. Normal contact requests require first name, last name, email, phone and
message. Kinderbetreuung requests require first name, last name, email, phone
and privacy acknowledgement; their message and marketing consent are optional.
Firmenfitness validates its own request schema and only requires a phone
when a callback is requested. Message line breaks and surrounding whitespace
are preserved.

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `validation_error` / `spam_rejected` | 400 | Invalid input; no HighLevel call |
| `invalid_origin` | 403 | Cross-origin or invalid browser origin |
| `method_not_allowed` | 405 | Only POST is accepted |
| `body_too_large` | 413 | Request exceeds the size limit |
| `invalid_content_type` | 415 | JSON is required |
| `delivery_not_configured` | 503 | Token or location ID missing |
| `delivery_timeout` | 504 | HighLevel did not confirm within the timeout |
| `delivery_failed` | 502 | HighLevel/API response could not be confirmed |
| `delivery_success` | 200 | HighLevel confirmed a contact ID |

On failure the browser retains form values and does not show success. The
contact and Firmenfitness clients only clear a form after a confirmed 2xx
response with `success: true` and a message.

## Verification

Run from the repository root:

```text
node --test site-versions\02-next\tests\contact.test.cjs
```

Tests inject mocked HighLevel responses. They cover required/invalid fields,
missing configuration, API v2 headers/endpoints, new and existing contacts,
ambiguous matches, custom-field resolution/mapping, contact and both
Firmenfitness request types, provider errors, timeouts and secret/data
redaction. The readiness check is a GET-only field/schema read. No
automated test sends a real lead.

The local environment was checked for variable presence only; neither
HighLevel variable is available to the local process. The production
readiness endpoint reported both runtime variables and all required field
definitions as ready on 2026-10-15. This was a read-only custom-field request;
no production lead was submitted.

The protected P04 preview deployment is
`https://kiel-fitness-cyk1izdxs-supervisor77dw-debugs-projects.vercel.app`.
Its preview runtime intentionally has no HighLevel variables and therefore
returns `delivery_not_configured` without an outbound HighLevel call. A real
end-to-end write still requires the owner's explicit approval.

Before production approval, verify the actual KIELS custom-field definitions
and options in the target location, the Vercel runtime variable scopes, and
the privacy information/processing agreement, legal basis and retention
period. The website privacy wording describes the technical transfer but
has not been legally reviewed. A controlled test lead still requires the
owner's approval. Manual HighLevel UI checks for token scopes, duplicate
settings, workflows, pipelines, ownership, notifications and calendars are
documented in the repository-root `KIELS_HIGHLEVEL_MANUELLE_EINRICHTUNG.md`.
