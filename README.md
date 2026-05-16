
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
KV_REST_API_URL=https://example.upstash.io
KV_REST_API_TOKEN=example-token
```

Do not commit `.env.local` with real secrets. Add these values in Vercel under **Project Settings > Environment Variables**.

HubSpot service key or private app scopes:

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
animax_utm_source
animax_utm_medium
```

Booked-call leads are handled by Calendly's native HubSpot integration. Quiz submissions are stored through `POST /api/leads/interest`.
