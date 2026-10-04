# KIELS Next contact and HighLevel integration

## Request path

The contact page and both Firmenfitness forms use the same endpoint:

`Website form -> POST /api/contact -> server validation -> HighLevel API v2`

The read-only `GET /api/highlevel-readiness` deployment check reports only
whether both runtime variables are present and whether the existing contact
field definitions/options satisfy the implemented mappings. It never returns
credential values or field IDs, sends no lead data, and performs no write
request. Its result is cached in a warm function instance for five minutes.

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
| Interest selections | Existing `Interesse / Anliegen`, mapped to the listed German options |
| Message | Existing `Nachricht / Anfrage`, passed as entered (no trimming) |
| Checked callback checkbox | Existing `Rückruf erwünscht`, mapped to an actual available affirmative option; unchecked is omitted |
| Company name | Standard HighLevel `companyName` |
| Firmenfitness location, employee size, existing offer | Existing `Standort`, `Beschäftigtengröße`, and `Bestehendes Firmenfitness-Angebot` fields, when submitted |

The Firmenfitness-specific field names/options must be present in the live
contact-field definitions. If they are not, those submissions fail closed;
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
16 KiB request limit, honeypot and server-side field validation. Normal
contact requests require first name, last name, email, phone and message.
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
HighLevel variable is available to the local process. No live API request,
production lead, Vercel deployment or push has been made. Although Vercel
environment variables are reported as configured, runtime recognition by
the newly built function cannot be verified until an approved deployment.

Before production approval, verify the actual KIELS custom-field definitions
and options in the target location, the Vercel runtime variable scopes, and
the privacy information/processing agreement, legal basis and retention
period. The website privacy wording describes the technical transfer but
has not been legally reviewed. A controlled test lead still requires the
owner's approval.
