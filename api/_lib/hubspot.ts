type ContactProperties = Record<string, string | undefined>;

type LeadInput = {
  name?: string;
  email: string;
  phone?: string;
  age?: string;
  gender?: string;
  primaryGoal?: string;
  notes?: string;
  consentToContact?: boolean;
  source: 'booked_call' | 'interest_questionnaire';
  bookingUid?: string;
  bookingStatus?: string;
  bookingStart?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

export async function upsertHubSpotContact(input: LeadInput) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

  if (!token) {
    throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');
  }

  const properties = buildContactProperties(input);
  const existingId = await findContactIdByEmail(input.email, token);

  try {
    if (existingId) {
      return await updateContact(existingId, properties, token);
    }

    return await createContact(properties, token);
  } catch (error) {
    if (!isUnknownPropertyError(error)) {
      throw error;
    }

    const fallbackProperties = stripCustomProperties(properties);

    if (existingId) {
      return updateContact(existingId, fallbackProperties, token);
    }

    return createContact(fallbackProperties, token);
  }
}

function buildContactProperties(input: LeadInput) {
  const { firstname, lastname } = splitName(input.name);
  const properties: ContactProperties = {
    email: input.email,
    lifecyclestage: 'lead',
    firstname,
    lastname,
    phone: input.phone,
    hs_lead_status: 'NEW',
    animax_lead_source: input.source,
    animax_age: input.age,
    animax_gender: input.gender,
    animax_primary_goal: input.primaryGoal,
    animax_notes: input.notes,
    animax_consent_to_contact: String(Boolean(input.consentToContact)),
    animax_last_booking_uid: input.bookingUid,
    animax_last_booking_status: input.bookingStatus,
    animax_last_booking_start: input.bookingStart,
    animax_utm_source: input.utmSource,
    animax_utm_medium: input.utmMedium,
    animax_utm_campaign: input.utmCampaign,
  };

  return compactProperties(properties);
}

async function findContactIdByEmail(email: string, token: string) {
  const response = await hubspotRequest('/crm/v3/objects/contacts/search', token, {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      properties: ['email'],
      limit: 1,
    }),
  });

  return response.results?.[0]?.id as string | undefined;
}

async function createContact(properties: ContactProperties, token: string) {
  return hubspotRequest('/crm/v3/objects/contacts', token, {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });
}

async function updateContact(contactId: string, properties: ContactProperties, token: string) {
  return hubspotRequest(`/crm/v3/objects/contacts/${contactId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

async function hubspotRequest(path: string, token: string, init: RequestInit) {
  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.message || 'HubSpot request failed');
    (error as Error & { status?: number; body?: unknown }).status = response.status;
    (error as Error & { status?: number; body?: unknown }).body = body;
    throw error;
  }

  return body;
}

function compactProperties(properties: ContactProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function stripCustomProperties(properties: ContactProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => !key.startsWith('animax_'))
  );
}

function splitName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstname: undefined, lastname: undefined };
  }

  if (parts.length === 1) {
    return { firstname: parts[0], lastname: undefined };
  }

  return {
    firstname: parts.slice(0, -1).join(' '),
    lastname: parts[parts.length - 1],
  };
}

function isUnknownPropertyError(error: unknown) {
  const body = (error as Error & { body?: { message?: string } }).body;
  return typeof body?.message === 'string' && body.message.toLowerCase().includes('property');
}
