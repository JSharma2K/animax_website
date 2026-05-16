
# Fitness Coaching Landing Page

This is a code bundle for Fitness Coaching Landing Page. The original project is available at https://www.figma.com/design/tXC0y54i9aPTdg0qeX7MbZ/Fitness-Coaching-Landing-Page.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Booking and lead capture

The site uses Calendly for booking and HubSpot as the lead CRM.

Required environment variables:

```bash
VITE_CAL_LINK=https://calendly.com/animaxcoaching/free-call
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-example
CAL_WEBHOOK_SECRET=replace-with-a-random-shared-secret
```

Do not commit `.env.local` with real secrets. Add these values in Vercel under **Project Settings > Environment Variables**.

HubSpot private app scopes:

```text
crm.objects.contacts.read
crm.objects.contacts.write
```

Recommended HubSpot custom contact properties:

```text
animax_lead_source
animax_age
animax_gender
animax_weight
animax_height
animax_primary_goal
animax_notes
animax_consent_to_contact
animax_last_booking_uid
animax_last_booking_status
animax_last_booking_start
animax_utm_source
animax_utm_medium
animax_utm_campaign
```

Calendly webhook URL after Vercel deployment:

```text
https://YOUR-VERCEL-DOMAIN/api/webhooks/calendly
```

Enable Calendly webhook events for invitee created and invitee canceled.
