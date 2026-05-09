# Book a Free Call Lead and CRM Integration Plan

## Summary

Use HubSpot as the lead database and CRM, Cal.com as the booking/calendar layer, and a thin Vercel serverless backend as the secure sync layer between the website, Cal.com, and HubSpot.

This is better than building a custom lead database for v1 because HubSpot already gives the owner contact records, lifecycle stages, follow-up status, lead history, filters, and future sales/marketing automation. A custom database would store submissions, but it would not help the business work those leads.

The desired user flow is:

1. A visitor clicks "Book a Free Call."
2. The website opens a Cal.com booking popup.
3. The visitor chooses a time and enters their details.
4. Cal.com checks the owner's connected Google Calendar availability.
5. Cal.com creates the event on the owner's calendar with a Google Meet link.
6. The visitor receives a calendar invite as an attendee.
7. Cal.com sends a webhook to the website backend.
8. The backend creates or updates the visitor as a HubSpot lead.

For visitors who are interested but do not want to book a call, a later questionnaire should create the same kind of HubSpot lead through the website backend.

## Recommended Tools

- **Cal.com** for scheduling, availability, booking links, reschedule/cancel links, Google Calendar sync, and Google Meet creation.
- **HubSpot CRM** as the source of truth for leads.
- **Vercel serverless functions** for backend endpoints.
- **Google Calendar + Google Meet** for the owner's calendar and meeting stack.

Avoid a custom calendar integration for v1. Directly writing to the user's personal calendar would require user OAuth and is not needed. The correct behavior is to add the user as an event attendee and send them a calendar invite.

## Implementation Changes

### Frontend Booking Flow

- Install `@calcom/embed-react`.
- Add `VITE_CAL_LINK=<cal-username>/free-call`.
- Update every booking CTA in `src/app/App.tsx` to open the same Cal.com popup:
  - Navigation "Book Free Call"
  - Hero "Book Your Free Call"
  - Coaching section "Book a Free Consultation"
  - Final CTA "Book a Free Call"
  - Feature card "Claim Your Guarantee"
- Keep "Join a Pod" separate for now.
- Use dark Cal.com popup styling to match the current Animax site:
  - `theme: dark`
  - `layout: month_view`
  - brand color: `#10b981`

### Cal.com Setup

- Create a one-on-one event type:
  - Name: `Free Transformation Call`
  - Slug: `free-call`
  - Duration: `30 minutes`
  - Minimum notice: `4 hours`
  - Booking window: `30 days`
  - Buffer: `15 minutes`
- Connect the owner's Google Calendar.
- Enable Google Meet as the conferencing app.
- Add required booking questions:
  - Name
  - Email
  - Phone or WhatsApp
  - Primary fitness goal
- Enable Cal.com webhooks for:
  - Booking created
  - Booking rescheduled
  - Booking cancelled
- Enable the Cal.com HubSpot integration if available on the selected Cal.com plan.

### Backend Lead Sync

- Add Vercel API functions at the repo root:
  - `POST /api/webhooks/cal`
  - `POST /api/leads/interest`
- Add backend-only env vars:
  - `HUBSPOT_PRIVATE_APP_TOKEN=<secret>`
  - `CAL_WEBHOOK_SECRET=<secret>`
- Add a shared HubSpot helper that upserts contacts by email.
- Never expose the HubSpot token in frontend code.

### HubSpot CRM Setup

- Use HubSpot Contacts as the canonical lead records.
- Set Lifecycle Stage to `Lead` for new submissions.
- Add custom contact properties:
  - `animax_lead_source`
  - `animax_primary_goal`
  - `animax_consent_to_contact`
  - `animax_last_booking_uid`
  - `animax_last_booking_status`
  - `animax_last_booking_start`
- Use `animax_lead_source` values:
  - `booked_call`
  - `interest_questionnaire`

## API Contracts

### `POST /api/webhooks/cal`

Purpose: receive booking lifecycle events from Cal.com and sync them into HubSpot.

Behavior:

- Verify the Cal.com webhook signature using `CAL_WEBHOOK_SECRET`.
- Accept booking created, rescheduled, and cancelled events.
- Extract:
  - attendee name
  - attendee email
  - phone or WhatsApp, if present
  - primary fitness goal, if present
  - booking UID
  - booking status
  - booking start time
- Create or update the HubSpot contact by email.
- Set:
  - Lifecycle Stage: `Lead`
  - `animax_lead_source`: `booked_call`
  - latest booking metadata fields
- Return `200` for valid handled events.
- Ignore unrelated valid webhook event types with `200`.
- Return `401` for invalid signatures.

### `POST /api/leads/interest`

Purpose: support the later questionnaire for interested visitors who do not book a call.

Request body:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "phone": "+1 555 123 4567",
  "primaryGoal": "Lose fat and build muscle",
  "notes": "Prefers evenings",
  "consentToContact": true,
  "utmSource": "instagram",
  "utmMedium": "paid",
  "utmCampaign": "spring_offer"
}
```

Required fields:

- `name`
- `email`
- `primaryGoal`
- `consentToContact`

Behavior:

- Validate required fields.
- Require `consentToContact: true`.
- Create or update the HubSpot contact by email.
- Set:
  - Lifecycle Stage: `Lead`
  - `animax_lead_source`: `interest_questionnaire`
  - `animax_primary_goal`
  - `animax_consent_to_contact`
- Return a success response without exposing HubSpot internals.

## Test Plan

- Run `npm run build`.
- Run the site locally.
- Click each booking CTA and confirm the Cal.com popup opens.
- Complete a test booking with a non-owner email.
- Confirm:
  - the event appears on the owner's Google Calendar,
  - a Google Meet link is attached,
  - the visitor receives the calendar invite,
  - the visitor is created or updated in HubSpot,
  - duplicate bookings update the same HubSpot contact.
- Send a sample Cal.com webhook payload and verify:
  - valid signatures are accepted,
  - invalid signatures are rejected,
  - booking created/rescheduled/cancelled statuses update HubSpot correctly.
- Submit a questionnaire payload to `/api/leads/interest` and verify:
  - the HubSpot contact is created or updated,
  - `animax_lead_source` is `interest_questionnaire`,
  - submissions without consent are rejected.

## Rollout Steps

1. Create the HubSpot account and private app token.
2. Create the HubSpot custom contact properties.
3. Create and configure the Cal.com event type.
4. Connect Google Calendar and Google Meet in Cal.com.
5. Add the Cal.com embed to the frontend CTAs.
6. Add the Vercel backend API functions.
7. Configure environment variables in local development and Vercel.
8. Add the Cal.com webhook URL after the preview or production backend is deployed.
9. Run full booking and CRM sync tests.
10. Launch with one owner calendar, then expand to round-robin scheduling later if needed.

## Assumptions

- There is one owner calendar for v1.
- The owner uses Google Calendar and Google Meet.
- HubSpot is the CRM and lead database.
- Cal.com is the scheduling provider.
- The first questionnaire version requires an email address for deduplication.
- Deployment target is Vercel unless the hosting stack changes.
- Visitor calendar sync means attendee calendar invite delivery, not silent direct writes to the visitor's personal calendar.

