type ContactProperties = Record<string, string | undefined>;

type LeadInput = {
  name?: string;
  email: string;
  phone?: string;
  age?: string;
  gender?: string;
  weight?: string;
  height?: string;
  primaryGoal?: string;
  notes?: string;
  consentToContact?: boolean;
  utmSource?: string;
  utmMedium?: string;
};

type OneOnOneLeadInput = {
  name: string;
  email: string;
  phone: string;
  age: string;
  consentToContact: true;
  utmSource?: string;
  utmMedium?: string;
};

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const HUBSPOT_TOKEN_ENV = 'HUBSPOT_PRIVATE_APP_TOKEN';
const ONE_ON_ONE_LEAD_SOURCE = 'one_on_one_guarantee';
const ONE_ON_ONE_NOTE = 'Requested 1:1 Guarantee Call from coaching card.';
const MAX_NOTES_LENGTH = 3000;
const ONE_ON_ONE_RETRYABLE_PROPERTIES = new Set([
  'animax_age',
  'animax_consent_to_contact',
  'animax_lead_source',
  'animax_notes',
  'animax_utm_medium',
  'animax_utm_source',
]);

export class MissingHubSpotPropertyError extends Error {
  constructor(public propertyName?: string) {
    super(propertyName ? `Missing HubSpot property: ${propertyName}` : 'Missing HubSpot property');
    this.name = 'MissingHubSpotPropertyError';
  }
}

export async function upsertHubSpotContact(input: LeadInput) {
  const token = getHubSpotToken();

  if (!token) {
    throw new Error(`Missing ${HUBSPOT_TOKEN_ENV}`);
  }

  const existing = await findContactByEmail(input.email, token, ['email']);

  try {
    if (existing?.id) {
      return await updateContact(existing.id, buildUpdateContactProperties(input), token);
    }

    return await createContact(buildCreateContactProperties(input), token);
  } catch (error) {
    const missingPropertyName = getMissingPropertyName(error);

    if (missingPropertyName !== undefined) {
      throw new MissingHubSpotPropertyError(missingPropertyName);
    }

    throw error;
  }
}

export async function upsertOneOnOneHubSpotContact(input: OneOnOneLeadInput) {
  const token = getHubSpotToken();

  if (!token) {
    throw new Error(`Missing ${HUBSPOT_TOKEN_ENV}`);
  }

  const existing = await findOneOnOneContactByEmail(input.email, token);

  try {
    if (existing?.id) {
      return await writeOneOnOneContact(
        'update',
        existing.id,
        buildOneOnOneUpdateContactProperties(input, existing.properties?.animax_notes),
        token
      );
    }

    return await writeOneOnOneContact('create', undefined, buildOneOnOneCreateContactProperties(input), token);
  } catch (error) {
    const missingPropertyName = getMissingPropertyName(error);

    if (missingPropertyName !== undefined) {
      throw new MissingHubSpotPropertyError(missingPropertyName);
    }

    throw error;
  }
}

async function findOneOnOneContactByEmail(email: string, token: string) {
  try {
    return await findContactByEmail(email, token, ['email', 'animax_notes']);
  } catch (error) {
    const missingPropertyName = getMissingPropertyName(error);

    if (missingPropertyName !== 'animax_notes') {
      throw error;
    }

    console.warn('One-on-one HubSpot lookup omitted unavailable property', {
      propertyName: missingPropertyName,
    });
    return findContactByEmail(email, token, ['email']);
  }
}

async function writeOneOnOneContact(
  operation: 'create' | 'update',
  contactId: string | undefined,
  properties: ContactProperties,
  token: string
) {
  const remainingProperties = { ...properties };
  const omittedProperties: string[] = [];

  for (let attempt = 0; attempt <= ONE_ON_ONE_RETRYABLE_PROPERTIES.size; attempt += 1) {
    try {
      if (operation === 'update' && contactId) {
        return await updateContact(contactId, compactProperties(remainingProperties), token);
      }

      return await createContact(compactProperties(remainingProperties), token);
    } catch (error) {
      const propertyName = getRetryableOneOnOnePropertyName(error, remainingProperties);

      if (!propertyName) {
        throw error;
      }

      omittedProperties.push(propertyName);
      delete remainingProperties[propertyName];
      console.warn('One-on-one HubSpot write retrying without rejected property', {
        propertyName,
        omittedProperties,
      });
    }
  }

  throw new Error('HubSpot one-on-one contact write exhausted retries');
}

function buildCreateContactProperties(input: LeadInput) {
  const { firstname, lastname } = splitName(input.name);
  const properties: ContactProperties = {
    email: input.email,
    lifecyclestage: 'lead',
    firstname,
    lastname,
    phone: input.phone,
    hs_lead_status: 'NEW',
    animax_lead_source: 'interest_questionnaire',
    animax_age: input.age,
    animax_gender: input.gender,
    animax_weight: input.weight,
    animax_height: input.height,
    animax_primary_goal: input.primaryGoal,
    animax_notes: input.notes,
    animax_consent_to_contact: String(Boolean(input.consentToContact)),
    animax_utm_source: input.utmSource,
    animax_utm_medium: input.utmMedium,
  };

  return compactProperties(properties);
}

function buildOneOnOneCreateContactProperties(input: OneOnOneLeadInput) {
  const { firstname, lastname } = splitName(input.name);
  const properties: ContactProperties = {
    email: input.email,
    lifecyclestage: 'lead',
    firstname,
    lastname,
    phone: input.phone,
    hs_lead_status: 'NEW',
    animax_lead_source: ONE_ON_ONE_LEAD_SOURCE,
    animax_age: input.age,
    animax_notes: ONE_ON_ONE_NOTE,
    animax_consent_to_contact: 'true',
    animax_utm_source: input.utmSource,
    animax_utm_medium: input.utmMedium,
  };

  return compactProperties(properties);
}

function buildOneOnOneUpdateContactProperties(input: OneOnOneLeadInput, existingNotes?: string) {
  const { firstname, lastname } = splitName(input.name);
  const properties: ContactProperties = {
    email: input.email,
    firstname,
    lastname,
    phone: input.phone,
    animax_lead_source: ONE_ON_ONE_LEAD_SOURCE,
    animax_age: input.age,
    animax_notes: mergeOneOnOneNotes(existingNotes),
    animax_consent_to_contact: 'true',
    animax_utm_source: input.utmSource,
    animax_utm_medium: input.utmMedium,
  };

  return compactProperties(properties);
}

function buildUpdateContactProperties(input: LeadInput) {
  const { firstname, lastname } = splitName(input.name);
  const properties: ContactProperties = {
    email: input.email,
    firstname,
    lastname,
    phone: input.phone,
    animax_age: input.age,
    animax_gender: input.gender,
    animax_weight: input.weight,
    animax_height: input.height,
    animax_primary_goal: input.primaryGoal,
    animax_notes: input.notes,
    animax_consent_to_contact: String(Boolean(input.consentToContact)),
    animax_utm_source: input.utmSource,
    animax_utm_medium: input.utmMedium,
  };

  return compactProperties(properties);
}

async function findContactByEmail(email: string, token: string, properties: string[]) {
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
      properties,
      limit: 1,
    }),
  });

  return response.results?.[0] as { id?: string; properties?: Record<string, string | undefined> } | undefined;
}

async function createContact(properties: ContactProperties, token: string) {
  return hubspotRequest('/crm/v3/objects/contacts', token, {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });
}

function mergeOneOnOneNotes(existingNotes = '') {
  const trimmedExistingNotes = existingNotes.trim();

  if (!trimmedExistingNotes) {
    return ONE_ON_ONE_NOTE;
  }

  if (trimmedExistingNotes.includes(ONE_ON_ONE_NOTE)) {
    return trimmedExistingNotes.slice(0, MAX_NOTES_LENGTH);
  }

  return `${ONE_ON_ONE_NOTE}\n\n${trimmedExistingNotes}`.slice(0, MAX_NOTES_LENGTH);
}

async function updateContact(contactId: string, properties: ContactProperties, token: string) {
  return hubspotRequest(`/crm/v3/objects/contacts/${contactId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

async function hubspotRequest(path: string, token: string, init: RequestInit, attempt = 0): Promise<any> {
  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (response.status === 429 && attempt === 0) {
    await delay(getRetryAfterMs(response.headers.get('retry-after')));
    return hubspotRequest(path, token, init, attempt + 1);
  }

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

function getMissingPropertyName(error: unknown) {
  const body = (error as Error & { body?: HubSpotErrorBody }).body;

  if (body?.category !== 'VALIDATION_ERROR') {
    return undefined;
  }

  const contextPropertyName = body.errors
    ?.map((item) => item.context?.propertyName)
    .find((value): value is string | string[] => typeof value === 'string' || Array.isArray(value));

  if (Array.isArray(contextPropertyName)) {
    return contextPropertyName[0];
  }

  if (typeof contextPropertyName === 'string') {
    return contextPropertyName;
  }

  const match = body.message?.match(/Property "([^"]+)" does not exist/i);
  return match?.[1];
}

function getRetryableOneOnOnePropertyName(error: unknown, properties: ContactProperties) {
  const propertyName = getHubSpotValidationPropertyName(error);

  if (propertyName && ONE_ON_ONE_RETRYABLE_PROPERTIES.has(propertyName) && propertyName in properties) {
    return propertyName;
  }

  const missingPropertyName = getMissingPropertyName(error);

  if (
    missingPropertyName &&
    ONE_ON_ONE_RETRYABLE_PROPERTIES.has(missingPropertyName) &&
    missingPropertyName in properties
  ) {
    return missingPropertyName;
  }

  const body = (error as Error & { body?: HubSpotErrorBody }).body;
  const message = body?.message ?? '';

  if (body?.category === 'VALIDATION_ERROR' && message) {
    return [...ONE_ON_ONE_RETRYABLE_PROPERTIES].find(
      (candidate) => candidate in properties && message.includes(candidate)
    );
  }

  return undefined;
}

function getHubSpotValidationPropertyName(error: unknown) {
  const body = (error as Error & { body?: HubSpotErrorBody }).body;

  if (body?.category !== 'VALIDATION_ERROR') {
    return undefined;
  }

  const contextPropertyName = body.errors
    ?.map((item) => item.context?.propertyName)
    .find((value): value is string | string[] => typeof value === 'string' || Array.isArray(value));

  if (Array.isArray(contextPropertyName)) {
    return contextPropertyName[0];
  }

  if (typeof contextPropertyName === 'string') {
    return contextPropertyName;
  }

  const invalidPropertyMatch = body.message?.match(/property(?:Name)?[^\w]+([a-z0-9_]+)/i);
  return invalidPropertyMatch?.[1];
}

function getRetryAfterMs(value: string | null) {
  const retryAfterSeconds = Number(value);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return 1000;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type HubSpotErrorBody = {
  category?: string;
  message?: string;
  errors?: Array<{
    context?: {
      propertyName?: string | string[];
    };
  }>;
};

function getHubSpotToken() {
  return process.env[HUBSPOT_TOKEN_ENV]?.trim();
}
