# Contact submission foundation

## Current behavior

The static Vercel website submits JSON to its own Node.js function at
`POST /api/contact` ([handler](api/contact.js)). A disabled, server-only
[HighLevel webhook adapter](lib/highlevel.js) is prepared. No packages,
secrets, persistence, cookies, local storage, analytics or production
connection have been added. n8n is not part of this stage.

Valid requests currently return **HTTP 503**, `success: false`,
`code: "delivery_not_configured"`. The UI explicitly says the message was
neither sent nor stored and preserves all inputs. This is intentional:
validation alone must never be reported as a successful contact request.

The success UI is ready for a future real delivery confirmation; it clears
the form and focuses the confirmation. It is tested using a mocked response,
not a live delivery. Without JavaScript the submit button stays disabled
and existing telephone/email links remain available.

## Request contract

```json
{
  "firstName": "Erika",
  "lastName": "Muster",
  "email": "erika@example.test",
  "phone": "0431 54020",
  "message": "Bitte um ein Probetraining.",
  "interests": ["trial"],
  "callbackRequested": false,
  "sourcePage": "Fitness",
  "website": ""
}
```

- Required: first/last name (80 characters each), email (254), telephone
  (32 input characters, 6 or more digits, maximum 15 normalized digits),
  message (5000). The existing asterisks and visible fields are unchanged.
- Optional interests: `trial`, `membership`, `courses`, `health`, `wellness`,
  `existing-membership`, `other`. No checkbox is preselected.
- `callbackRequested` is a boolean, separate from interests.
- `website` is an empty, off-screen, non-focusable honeypot.
- `sourcePage`: Home, Fitness, Wellness, Health, Kurse or Kontakt, derived
  from a same-origin referrer. Direct visits default to Kontakt.
  This is untrusted attribution metadata, not an identity/security signal.
- Submitted timestamps are generated on the server, not accepted from
  clients. No browser timestamp or personal data is kept in local storage.

[Server validation](lib/contact.js) creates:
`firstName`, `lastName`, `name`, `email`, `phone`, `message`, `interests`,
`callbackRequested`, `preferredContact`, `sourcePage`, `submittedAt`,
`submissionId`, and the optional attribution fields below.
Phone numbers are normalized using the displayed German default prefix;
explicit `+`/`00` international prefixes are respected.
`preferredContact` is derived: phone for a callback, email otherwise. It
does not represent a separate marketing consent or explicit preference field.

## Responses

All handler responses use JSON, `success` and `message`, with `no-store`.
Optional `errors` maps field names to validation messages.

| HTTP | Meaning |
| --- | --- |
| 400 | Invalid JSON/fields, or non-empty honeypot |
| 403 | Invalid or cross-origin browser origin |
| 405 | Method other than POST (`Allow: POST`) |
| 413 | Body exceeds 16 KiB |
| 415 | Content type other than application/json |
| 503 | Validated but no delivery/storage adapter configured |
| 502 | Configured webhook could not confirm acceptance |
| 504 | Configured webhook exceeded the 10-second timeout |
| 200 | Configured webhook accepted the request (2xx response) |

Browser requests carry a same-origin `Origin`. Requests without Origin
are still allowed for server tools, so origin checks and the honeypot are
only basic protections, not an authentication or reliable anti-bot system.
Do not add an in-memory serverless rate limiter and assume it is global.

## Local verification

Run `node tools/preview.cjs` and visit `http://127.0.0.1:8766/kontakt.html`.
This loopback-only preview serves the existing static site and calls the
same API handler. It is not a production server. The old static preview
on port 8765 cannot execute the Node.js API.

Run `node --test tests/contact.test.cjs`. No install is required.
Use a currently supported Node.js LTS version. On Vercel use the native
static deployment with Node.js functions; no SPA rewrite should mask `/api`.
The project has no build step or framework. Actual Vercel deployment and
environment settings must be checked before production activation.

## Planned HighLevel route

Website/landing page -> KIELS `/api/contact` -> adapter -> HighLevel inbound
webhook -> Contact -> linked Opportunity -> notifications/follow-up workflows.
MAC CenterCom remains the future leading membership/contract system.
No own personal lead database and no n8n integration are introduced.
The frontend knows only the KIELS API; it never receives the webhook URL.

This stage prepares the **inbound webhook variant**, not the direct
HighLevel Contacts/Opportunities REST API. The central mapper emits a
versioned **KIELS contract**, which the approved HighLevel workflow must map.
No HighLevel field, location, pipeline or stage ID is invented. A future
direct API variant would require a separately approved adapter/configuration.

### Server configuration

| Environment variable | Purpose |
| --- | --- |
| `HIGHLEVEL_ENABLED` | Only the exact string `true` enables the adapter |
| `HIGHLEVEL_WEBHOOK_URL` | Actual approved HighLevel inbound webhook URL |

No values have been set or committed. Missing, disabled or invalid
configuration gives `delivery_not_configured` and makes **zero** external
requests. The URL must be HTTPS, without URL-user/password credentials or
fragment. If the HighLevel URL contains a secret in its path/query it is
still server-only. Store it in the approved Vercel server environment, never
in public/client-prefixed variables, HTML, Git or browser JavaScript.

The request is JSON POST with redirects rejected and a fixed 10-second
abort timeout (shorter than the browser's 15-second timeout). The adapter
does not retry automatically, parse provider bodies, or log exceptions,
URLs, headers or personal data. Operational logs contain only fixed generic
failure/timeout messages. Browser responses contain only KIELS messages.

### Attribution

Optional internal fields:
`leadSource`, `leadSourceDetail`, `utmSource`, `utmMedium`, `utmCampaign`,
`utmContent`, `utmTerm`, `landingPage`, `referrer`, `gclid`, `fbclid`.
Absent, empty or null values become `null`; values are not invented.
`leadSource` and `leadSourceDetail` currently stay null in the frontend;
they are ready for a later approved source assignment.

The browser reads UTM/click IDs **only from the current contact-page URL**.
`landingPage` means the current submission page, not a reconstructed
first-touch page. `referrer` is the available browser referrer.
Both URL values retain only HTTP(S) origin and pathname: query strings,
fragments and URL credentials are deliberately not forwarded. Only the
explicit UTM/click-ID allowlist is sent separately, preventing unrelated
query secrets/contact data from being copied wholesale.

No cookies, local/session storage or cross-page attribution tracking is
introduced. UTM values on an earlier page that are not present on the
contact-page URL are therefore unavailable and remain null. Browser
referrer policy may omit or truncate the referrer. Attribution is untrusted
metadata, not identity, consent, verified source or proof of conversion.

Server limits: leadSource 120; leadSourceDetail and each UTM field 250;
landingPage/referrer 2048; gclid/fbclid 512 characters. Invalid types,
control characters, oversized values and non-HTTP(S)/non-sanitized URLs
are rejected with validation_error. `submittedAt` is always generated on
the server, irrespective of supplied client timestamps.

### Central mapping

`mapHighLevelPayload` is the only HighLevel-specific mapping boundary:

- `schemaVersion: 1`, `submissionId`: contract version and correlation.
- `contact`: firstName, lastName, name, email, normalized phone.
- `lead`: message, interests, callbackRequested, preferredContact,
  sourcePage, submittedAt and all attribution fields.
- `opportunity`: `initialStageName: "Neuer Lead"` and
  `contactReference: { submissionId }`.

`initialStageName` is an instruction for the future workflow, **not** a
HighLevel stage ID. The workflow must upsert/identify the Contact using the
agreed matching rules, then use the returned Contact ID to create/update
the Opportunity in the configured KIELS pipeline/stage. The submission
reference correlates both actions; it is not itself a HighLevel Contact ID.
KIELS lead information is mapped centrally to approved custom fields or
workflow variables after their actual keys/IDs/types are known.

HTTP 2xx from the configured webhook means **provider acceptance only**.
It does not prove completed Contact/Opportunity creation, downstream
workflow execution or email delivery. Monitoring and verified workflow
acceptance semantics are activation prerequisites. No success is returned
for timeouts, HTTP errors, redirects or network failures.

### Error contract

| Code | Behavior |
| --- | --- |
| `validation_error` | Invalid lead/attribution/JSON; no adapter call |
| `spam_rejected` | Non-empty honeypot; no adapter call |
| `delivery_not_configured` | Disabled/incomplete configuration; HTTP 503 |
| `delivery_timeout` | Abort timeout; HTTP 504; outcome may be uncertain |
| `delivery_failed` | HTTP/network/redirect failure; HTTP 502 |
| `delivery_success` | Confirmed webhook 2xx acceptance; HTTP 200 |

Existing method/content-type/body-size/origin protections remain.
Error submissions retain inputs. The frontend never displays success
for external failure or leaks technical provider responses.

### Submission IDs and duplicate handling

The browser generates a UUID v4 per unchanged form/context payload and
reuses it for manual retries in the same loaded page. Editing the payload
or a confirmed success causes the next attempt to use a new ID. The ID is
held only in memory, alongside the already entered form values. Double
clicks/parallel browser submits remain blocked.

For older clients without an ID the server generates a UUID. IDs supplied
by clients must be UUID v4. The ID is forwarded, but **is not a guaranteed
HighLevel idempotency key**. Reloads, separate tabs and server-side repeats
are not deduplicated here. HighLevel matching/idempotent workflow rules
must be confirmed before activation, particularly for ambiguous timeouts.
No persistent deduplication store, queue or automatic retry was added.

### Required HighLevel account decisions and activation checklist

1. Identify the correct KIELS sub-account/location and approved workflow
   owner. No location ID is presently required for the webhook call.
2. Create/approve the inbound webhook trigger and retrieve its real URL;
   confirm access/authentication and documented acceptance semantics.
3. Map contact fields and agree on Contact lookup/upsert rules
   (email/phone), including existing contacts and repeated submissions.
4. Create/select the KIELS pipeline and its **Neuer Lead** stage; retrieve
   real pipeline/stage IDs for workflow configuration, not the browser.
5. Define Opportunity naming, duplicate/update rules, assignment and
   linkage using the actual Contact ID.
6. Retrieve/create the actual custom field keys/IDs/types for message,
   interests, callback, preferred contact, source, attribution, timestamp
   and submission ID where those values should persist. Decide which
   values remain workflow-only variables.
7. Configure recipients/owners, workflow notifications/follow-up and
   failure monitoring. Do not interpret a contact request as marketing
   consent or automatically enable unapproved marketing workflows.
8. Confirm provider agreement, appropriate privacy information,
   retention/deletion, production rate limiting and abuse handling.
   Existing privacy texts have not been rewritten or legally certified.
9. Verify the approved test workflow with controlled test data, including
   Contact/Opportunity linkage, duplicates, ambiguous failures and all
   mapped data; obtain explicit production approval.
10. Only then set the approved URL and `HIGHLEVEL_ENABLED=true` in the
    appropriate Vercel server environment and deploy. Keep preview/test
    environments disabled unless explicitly approved. No real request
    was made as part of this stage.

Tests use dependency-injected fetch mocks and reserved `.invalid` test
URLs; no test needs a real credential or makes an external request.
