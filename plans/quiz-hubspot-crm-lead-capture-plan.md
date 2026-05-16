# HubSpot CRM Lead Capture Plan

## Summary

Use HubSpot Contacts as the lead table and keep the custom quiz UI. Each completed quiz submission calls a Vercel API route, which securely creates or updates one HubSpot contact by email. The HubSpot service key/API token never reaches the browser.

Booked-call leads are handled separately by Calendly's native HubSpot integration. This plan does not touch that path except to remove the old custom webhook code and to disable any matching webhook subscription in Calendly if one exists. After this ships, exactly one CRM write path exists for booked-call leads: Calendly's native HubSpot integration.

## Key Changes

- Use `POST /api/leads/interest` as the only quiz submission endpoint.
- Require these request fields: `name`, `email`, `age`, `gender`, `weight`, `height`, `primaryGoal`, `consentToContact`.
- Allow these optional request fields: `phone`, `notes`, `utmSource`, `utmMedium`.
- Accept internal anti-spam field `companyWebsite` as a hidden honeypot. It must be backed by a real visually-hidden DOM input, must be blank, must never be stored in HubSpot, and must be included only in validation/spam checks.
- Return a structured `400` on validation failures so the frontend can recover instead of showing a generic error:
  ```json
  { "error": "validation_failed", "missing": ["age", "gender"], "invalid": ["email"] }
  ```
  - `consentToContact === undefined` → `missing: ["consentToContact"]`.
  - `consentToContact !== true` (for example `false`) → `invalid: ["consentToContact"]`.
- Store standard HubSpot contact fields: `email`, `firstname`, `lastname`, `phone`. Set `lifecyclestage=lead` and `hs_lead_status=NEW` **only on contact creation**, never on update.
- Store custom Animax fields on the HubSpot contact:
  - `animax_lead_source`
  - `animax_age`
  - `animax_gender`
  - `animax_weight`
  - `animax_height`
  - `animax_primary_goal`
  - `animax_notes`
  - `animax_consent_to_contact`
  - `animax_utm_source`
  - `animax_utm_medium`

## Implementation Plan

Order of operations inside `api/leads/interest.ts`:

1. Method check (POST).
2. Derive client IP from the first entry of `x-forwarded-for`, falling back to `x-real-ip`, then hash it before using it for rate limiting.
3. Rate-limit check (per hashed IP). Rate-limit attempts before honeypot/schema validation so invalid repeated submissions are still throttled.
4. Content-Length fast-path check (`>25kb` → `413`) when the header is present.
5. Read raw body with a streaming 25kb cap; abort and return `413` as soon as the cumulative bytes exceed the limit.
6. JSON parse with `invalid_json` `400` fallback.
7. Normalize fields, including `email = cleanString(body.email).toLowerCase()`.
8. Honeypot check (`companyWebsite` must be empty after trim). If tripped, return a stealth success response and do not call HubSpot.
9. Schema validation (`missing` / `invalid` per **Key Changes**).
10. HubSpot upsert.

Tasks:

- Delete `api/webhooks/calendly.ts`. Booked-call leads are now handled by Calendly's native HubSpot integration, so the custom webhook is no longer needed and would create duplicate/conflicting writes if left in place.
- Keep the existing Vercel backend path in `api/leads/interest.ts`.
- Harden backend validation as above. On failure return the structured `400` response. Use `missing` for absent/blank required strings and `invalid` for malformed values such as email, `consentToContact !== true`, disallowed enum values, and oversized fields. Do not include honeypot hits in `invalid`; handle them as stealth spam responses.
- Add server-side input limits before calling HubSpot:
  - Replace or supplement `readRawBody(req)` with a size-limited helper, for example `readRawBodyWithLimit(req, maxBytes)`, so oversized bodies are rejected while streaming instead of after the entire request is buffered.
  - Before reading the stream, check `content-length` when present. If it is numeric and greater than `25 * 1024`, return `413` and do not read the body or call HubSpot.
  - If Vercel or local tooling has already populated `req.body` as a string or object, convert it to the exact raw string the handler will parse (`req.body` for strings, `JSON.stringify(req.body)` for objects), then measure it with `Buffer.byteLength(rawString, 'utf8')` before returning it. Reject over-limit pre-parsed bodies with the same `413`.
  - While reading chunks from `req`, track cumulative bytes and throw/return a typed "body too large" result as soon as the total exceeds `25 * 1024`. Do not call `Buffer.concat(chunks)` after the cap has been exceeded.
  - In `api/leads/interest.ts`, use the size-limited raw-body helper instead of `readJsonBody(req)` so the handler can enforce the quiz payload limit before parsing.
  - Keep `api/_lib/http.ts`'s `readJsonBody` available for other routes, but do not use it in the quiz endpoint because it parses before enforcing the quiz payload limit.
  - Reject requests over `25kb` with `413` and do not call HubSpot.
  - Catch `JSON.parse` failures in `api/leads/interest.ts` and return `400` with `{ "error": "invalid_json" }`, not a generic `500`.
  - `name`: max 120 chars.
  - `email`: max 254 chars; trim, lowercase, then use the normalized value for validation, HubSpot search, create, and update.
  - `phone`: max 40 chars.
  - `age`: max 3 chars and numeric string from `13` to `100`.
  - `gender`: one of `Female`, `Male`, `Prefer not to say`.
  - `weight`: max 40 chars.
  - `height`: max 40 chars.
  - `primaryGoal`: max 1000 chars.
  - `notes`: max 3000 chars.
  - each accepted UTM field (`utmSource`, `utmMedium`): max 120 chars.
- In `api/_lib/hubspot.ts`, search contacts by normalized email, then create or update. The search request only needs `properties: ['email']`; do not fetch `animax_lead_source` unless future logic actually reads it.
- Implement attribution rules exactly:
  - On contact create: set `animax_lead_source = interest_questionnaire`.
  - On contact update: do **not** touch `animax_lead_source`. This prevents the quiz from clobbering the source value on contacts that originated as booked-call leads via the native integration.
  - If a booked-call contact created by Calendly's native HubSpot integration has no `animax_lead_source`, the quiz must still leave it blank rather than guessing. Use a HubSpot workflow or native integration field mapping to stamp booked-call attribution outside this quiz endpoint.
  - Do not include `companyWebsite` in `LeadInput`, `buildContactProperties`, create properties, or update properties. It is only an anti-spam signal at the API boundary.
  - Preserve the existing `compactProperties` behavior for both create and update property objects: drop `undefined`, `null`, and `''` values so optional empty fields do not overwrite existing HubSpot values with blanks.
- Remove booking-related fields from `api/_lib/hubspot.ts`:
  - From the `LeadInput` type: `source` (no longer needs the `'booked_call'` variant), `bookingUid`, `bookingStatus`, `bookingStart`.
  - From `buildContactProperties`: `animax_last_booking_uid`, `animax_last_booking_status`, `animax_last_booking_start`.
  - The single remaining caller becomes `api/leads/interest.ts`; the HubSpot helper should set `animax_lead_source = interest_questionnaire` internally only when creating a new quiz contact.
- Replace the silent custom-property fallback in `api/_lib/hubspot.ts`. On a HubSpot "property does not exist" error, log the missing property name and return HTTP 500 to the client. The frontend already gates download links on a 2xx response, so this prevents users seeing success when quiz answers were dropped. Narrow `isUnknownPropertyError` to HubSpot's `category: 'VALIDATION_ERROR'`, first inspect `errors[].context.propertyName` when present, and only fall back to message matching such as `Property "[^"]+" does not exist`. Never match an error merely because it contains the word "property".
- Set `lifecyclestage` and `hs_lead_status` **only when creating a new contact**, never on update. This avoids overwriting manual sales progress when a returning visitor re-submits the quiz. In `upsertHubSpotContact`, build the create-properties and update-properties separately, and omit `hs_lead_status`, `lifecyclestage`, and `animax_lead_source` from the update path.
- Add UTM capture in `src/app/App.tsx`. On mount, read `utm_source` and `utm_medium` from `window.location.search`. If either is present, overwrite the same key in `sessionStorage` (last-touch attribution). At quiz submit time, read the persisted values from `sessionStorage` and include them in the request payload when non-empty. Do not capture or send `utm_campaign` for v1 because the HubSpot account cannot create another custom property for it.
- Add frontend handling for structured validation errors. If the API returns `validation_failed`, parse `missing` and `invalid` and show a concise message in the quiz modal without advancing to the download screen. Keep the existing generic error state for `5xx` and network failures.
  - Add a separate frontend error message state such as `quizErrorMessage` instead of overloading the existing `'error'` status. Reset it when opening the quiz, when the user edits an input, and before a new submission.
  - Treat `400 validation_failed`, `400 invalid_json`, `413`, and `429` as expected API responses in the submit handler. Do not call `console.error` for those client-recoverable responses; reserve logging for network failures and unexpected `5xx` responses.
  - Use explicit recovery copy:
    - `400 validation_failed`: "Please check the highlighted fields and try again." Stay on the details step and summarize the `missing` / `invalid` arrays.
    - `400 invalid_json`: "Something went wrong. Please try again."
    - `413`: "Your answers are too long. Please shorten them and try again."
    - `429`: "You've submitted this a few times. Please wait a few minutes and try again." If the response includes a `Retry-After` header, disable the submit button until that delay expires.
- Add lightweight spam protection to the public quiz endpoint:
  - Add `companyWebsite: ''` to `initialQuizAnswers`.
  - Render a real honeypot `<input name="companyWebsite" autoComplete="off" tabIndex={-1} aria-hidden="true">` in the quiz modal, bind it to `answers.companyWebsite`, and include it in the JSON payload. Visually hide it off-screen with CSS such as `className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"`; do not use `display: none` because common form bots skip those fields.
  - Server-side, treat absent, `null`, and empty-after-trim as pass. For any non-empty value, return `200` with `{ "ok": true }` and do not call HubSpot. Do not return `invalid: ["companyWebsite"]` or any other response that reveals the honeypot field name.
  - Direct API spam is handled by per-IP rate limiting, schema validation, and input caps, not by the honeypot. The honeypot only catches bots that scrape and fill DOM form fields.
  - Use Upstash Redis REST via the `@upstash/redis` package for durable per-IP rate limiting. Add it with `npm install @upstash/redis`.
  - Apply rate limiting only to `POST /api/leads/interest`. Derive the client IP from the first entry of `x-forwarded-for`, falling back to `x-real-ip`, then `req.socket?.remoteAddress`, then the literal fallback `unknown`. Hash the chosen value with SHA-256 before using it in Redis so raw IPs are not stored.
  - Use a key shaped like `rate:interest-lead:<sha256-ip>`. Minimum v1 target: block after more than 5 submissions per 10 minutes from the same IP hash, returning `429`.
  - Use atomic counter operations, not read-then-write. With `@upstash/redis`, use `const count = await redis.incr(key)`, then `await redis.expire(key, 600)` only when `count === 1`; return `429` when `count > 5`. This creates a fixed 10-minute window from the first request and avoids races under concurrent submissions.
  - When returning `429`, set a `Retry-After` header from the key TTL when available, falling back to `600` seconds. The frontend can use this header to disable the submit button temporarily.
  - Count all POST attempts before honeypot/schema validation. A bot that trips the honeypot still increments the rate-limit counter even though the endpoint returns stealth success and skips HubSpot.
  - If either Vercel KV env var (`KV_REST_API_URL` or `KV_REST_API_TOKEN`) is missing, fail open locally and log a warning. If Upstash/Vercel KV is configured but unreachable, fail open and log a warning so a Redis outage does not break lead capture.
- Scrub server-side error logs. `console.error` paths in `api/leads/interest.ts` must not log the request body or any HubSpot error response field that echoes back submitted PII; log only an error class, HubSpot category, and the missing property name when applicable.
- Handle HubSpot rate limits intentionally. If HubSpot returns `429`, retry once after the `Retry-After` header delay when present, or after a short default delay such as one second. If the retry also fails, return the generic frontend-safe failure response without logging PII.
- Update documentation: `README.md` and the existing `.env.example` must list `VITE_CAL_LINK` (or `VITE_CALENDLY_URL`), `HUBSPOT_PRIVATE_APP_TOKEN`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`. Delete the README's Calendly webhook URL subsection, and remove references to `CAL_WEBHOOK_SECRET` / `CALENDLY_WEBHOOK_SECRET`, the `animax_last_booking_*` properties, and the custom Calendly webhook URL.
- Add a `vercel:dev` script to `package.json` for local API testing, for example `"vercel:dev": "vercel dev"`, and install Vercel locally with `npm install -D vercel` if it is not already available in the repo.
- Keep `HUBSPOT_PRIVATE_APP_TOKEN` only in Vercel/local environment variables.

## What We Need Before Implementation

- Create the HubSpot custom contact properties using the table below. Internal names must match exactly.

| Internal name | Field type | Group | Notes |
|---|---|---|---|
| `animax_lead_source` | Single-line text | Animax | Quiz endpoint sets `interest_questionnaire` on contact create only. A separate HubSpot workflow/native mapping may set `booked_call` for Calendly leads. |
| `animax_age` | Single-line text | Animax | Frontend submits a string, not a number. |
| `animax_gender` | Single-line text | Animax | Use text for v1 to avoid HubSpot dropdown internal-value mismatches. If converted to dropdown later, set internal option values exactly to `Female`, `Male`, and `Prefer not to say`, or update the API mapping. |
| `animax_weight` | Single-line text | Animax | Free-form (`78 kg`, `170 lbs`, etc.). |
| `animax_height` | Single-line text | Animax | Free-form (`5'10`, `178 cm`, etc.). |
| `animax_primary_goal` | Multi-line text | Animax | |
| `animax_notes` | Multi-line text | Animax | Synthesized from the four Y/N quiz answers. |
| `animax_consent_to_contact` | Single checkbox | Animax | Code sends `"true"` / `"false"` strings. Confirm the property's internal option values are exactly `true` and `false` in HubSpot before testing writes. |
| `animax_utm_source` | Single-line text | Animax | |
| `animax_utm_medium` | Single-line text | Animax | |

- Confirm the HubSpot service key or private app token has these scopes:
  - `crm.objects.contacts.read`
  - `crm.objects.contacts.write`
- Confirm Calendly's native HubSpot integration is connected and writing booked-call leads as Contacts. The custom webhook is removed in implementation, so booked-call CRM sync depends entirely on the native integration after this change ships.
- If a Calendly webhook subscription pointing to `/api/webhooks/calendly` exists, disable/delete it before or during deployment. Do not leave the webhook active after deleting the endpoint.
- Confirm how Calendly's native HubSpot integration marks booked-call attribution. If it does not write `animax_lead_source = booked_call`, create a HubSpot workflow or native mapping that stamps booked-call contacts independently of this quiz endpoint.
- Confirm HubSpot's `hs_lead_status` property still has an option with internal value `NEW`. If the account uses customized lead statuses, replace `NEW` in the implementation with the correct internal value for the equivalent new-lead status.
- Confirm this environment variable exists in Vercel for Production and Preview:
  - `HUBSPOT_PRIVATE_APP_TOKEN`
- Use the Vercel Marketplace Upstash Redis integration for rate limiting. The integration has already added these environment variables in Vercel for Production and Preview:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
- For local end-to-end CRM testing:
  - Install `vercel` (`npm i -D vercel`) and add an `npm run vercel:dev` script if the repo does not already have one.
  - Create a `.env.local` containing `HUBSPOT_PRIVATE_APP_TOKEN`, `VITE_CAL_LINK` (or `VITE_CALENDLY_URL`), `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
  - Run `npm run vercel:dev` (not `npm run dev`) so the `/api/*` routes are served. `npm run dev` alone will return 404 on quiz submission.
  - Update `.env.example` so it lists all required keys with placeholder values: `VITE_CAL_LINK`, `VITE_CALENDLY_URL`, `HUBSPOT_PRIVATE_APP_TOKEN`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
- After testing, filter HubSpot Contacts by `animax_lead_source = interest_questionnaire` to view quiz leads. Booked-call leads are filtered via HubSpot's native Calendly integration (Meetings object or whatever fields the native integration sets).

## Test Plan

- Submit a complete quiz with a test email and verify a HubSpot contact appears.
- Confirm all quiz fields populate: name, email, age, gender, weight, height, goal, notes, consent.
- Submit again with the same email and verify the same contact updates instead of creating a duplicate.
- Submit a request omitting `consentToContact` entirely and verify the API returns `400` with `missing: ["consentToContact"]`.
- Submit a request with `consentToContact: false` and verify the API returns `400` with `invalid: ["consentToContact"]`.
- Submit a request missing two required fields (for example `age` and `gender`) and verify the API returns the structured `400` with both names in the `missing` array.
- Submit malformed values and verify they appear in the `invalid` array: invalid email, age outside `13` to `100`, disallowed gender, and oversized text fields.
- Submit malformed JSON and verify the API returns `400` with `{ "error": "invalid_json" }`.
- Submit a request with `Content-Length` over `25kb` and verify the API returns `413` without reading/parsing the body or calling HubSpot.
- Submit a streamed/chunked body over `25kb` without `Content-Length` and verify the API returns `413` as soon as the cumulative body exceeds the cap, without calling HubSpot.
- Submit an over-25kb request in a local/Vercel path where `req.body` is already populated, and verify the helper still returns `413` before parsing/HubSpot work.
- Fill the hidden `companyWebsite` honeypot DOM input through devtools or an automated request and verify the API returns `200` with `{ "ok": true }` without calling HubSpot and without exposing the honeypot field name.
- Submit the quiz from a private window where `?utm_source=test_src&utm_medium=test_med&utm_campaign=test_cmp` is in the URL, and verify only `animax_utm_source` and `animax_utm_medium` are populated on the HubSpot contact. `utm_campaign` should be ignored for v1.
- Submit repeated requests from the same IP and verify the endpoint returns `429` after the configured burst without calling HubSpot.
- Confirm the `429` response includes a `Retry-After` header.
- Inspect the Upstash key created during the repeated-request test and verify it uses a SHA-256 IP hash, not a raw IP address, and that the key has a 10-minute TTL after the first increment.
- Submit two rapid concurrent requests from the same IP and verify the rate-limit counter increments correctly without lost updates.
- Confirm a booked-call lead created by Calendly's native HubSpot integration appears in HubSpot with no involvement from `/api/leads/interest`.
- If an old custom Calendly webhook subscription existed, confirm it is disabled/deleted and no longer sends requests to `/api/webhooks/calendly`.
- Confirm booked-call attribution is handled by the native integration or a HubSpot workflow, not by the deleted Vercel webhook.
- Book a free call with a test email, then submit the quiz with the same email, and verify the contact's `animax_lead_source` is **not** overwritten by the quiz path. The quiz fields (`animax_age`, `animax_primary_goal`, etc.) should be added without touching the existing source value.
- With one `animax_*` property intentionally deleted in HubSpot, submit the quiz and verify the API returns HTTP 500 and the frontend shows the error message, **not** the download links.
- Submit the quiz, manually set the contact's `hs_lead_status` to `IN_PROGRESS` in HubSpot, then submit again with the same email and verify `hs_lead_status` is still `IN_PROGRESS` and `lifecyclestage` is unchanged.
- Confirm download buttons only appear after the HubSpot save succeeds.

## Assumptions

- V1 stores quiz leads as HubSpot Contacts only, not Deals or Tasks.
- Booked-call leads are handled exclusively by Calendly's native HubSpot integration after this plan ships. The custom `/api/webhooks/calendly` code is deleted, and any Calendly webhook subscription pointing to it is disabled/deleted if one exists.
- We are not using HubSpot's separate Leads object for v1 because Contacts are enough for the current workflow and the Leads API can require higher Sales Hub tiers.
- Deduplication is by `email` only. Phone numbers are stored unnormalized for v1.
- `animax_lead_source` is set on quiz contact create only. Updates from the quiz never touch it, so booked-call contacts keep whatever source value Calendly's native integration or a HubSpot workflow assigns. If that value is blank, the quiz path intentionally leaves it blank.
- For quiz answer fields and UTM fields, last quiz submission wins on contact update. This is intentional for v1 so returning users can refresh their answers and attribution.
- The current implementation uses search-then-create/update, which has a small concurrent-duplicate window. For v1 traffic this is acceptable. If concurrent duplicates appear, consider HubSpot update-by-email or batch upsert by `idProperty=email`, but do not switch blindly: the replacement must preserve create-only behavior for `lifecyclestage`, `hs_lead_status`, and `animax_lead_source`.
- `hs_lead_status = NEW` and `lifecyclestage = lead` are written only on contact creation.
- HubSpot's free-tier private app rate limit (~100 requests / 10 seconds) is sufficient for expected v1 quiz traffic.
- HubSpot references:
  - Contacts API: https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/guide
  - Contact properties: https://knowledge.hubspot.com/properties/hubspots-default-contact-properties
  - App scopes: https://developers.hubspot.com/docs/apps/legacy-apps/authentication/scopes
