import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MissingHubSpotPropertyError,
  upsertOneOnOneHubSpotContact,
  upsertHubSpotContact,
} from './hubspot.js';

test('upsertHubSpotContact sets lead source and status only when creating a contact', async () => {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-token';
  const requests: Array<{ url: string; init: RequestInit; body: any }> = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({
      url: String(url),
      init,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (String(url).endsWith('/crm/v3/objects/contacts/search')) {
      return jsonResponse({ results: [] });
    }

    return jsonResponse({ id: 'created-contact' });
  };

  await upsertHubSpotContact({
    name: 'Jane Doe',
    email: 'jane@example.com',
    age: '32',
    gender: 'Female',
    weight: '78 kg',
    height: '178 cm',
    primaryGoal: 'Build muscle',
    consentToContact: true,
    utmSource: 'instagram',
    utmMedium: 'paid',
  });

  const createProperties = requests[1].body.properties;
  assert.equal(createProperties.animax_lead_source, 'interest_questionnaire');
  assert.equal(createProperties.lifecyclestage, 'lead');
  assert.equal(createProperties.hs_lead_status, 'NEW');
  assert.equal(createProperties.animax_utm_source, 'instagram');
  assert.equal(createProperties.animax_utm_medium, 'paid');
  assert.equal(createProperties.animax_utm_campaign, undefined);
});

test('upsertHubSpotContact omits lead source and status when updating a contact', async () => {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-token';
  const requests: Array<{ url: string; init: RequestInit; body: any }> = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({
      url: String(url),
      init,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (String(url).endsWith('/crm/v3/objects/contacts/search')) {
      return jsonResponse({ results: [{ id: 'existing-contact' }] });
    }

    return jsonResponse({ id: 'existing-contact' });
  };

  await upsertHubSpotContact({
    name: 'Jane Doe',
    email: 'jane@example.com',
    age: '33',
    gender: 'Female',
    weight: '',
    height: '178 cm',
    primaryGoal: 'Build muscle',
    consentToContact: true,
  });

  const updateProperties = requests[1].body.properties;
  assert.equal(requests[1].init.method, 'PATCH');
  assert.equal(updateProperties.animax_lead_source, undefined);
  assert.equal(updateProperties.lifecyclestage, undefined);
  assert.equal(updateProperties.hs_lead_status, undefined);
  assert.equal(updateProperties.animax_weight, undefined);
  assert.equal(updateProperties.animax_age, '33');
});

test('upsertHubSpotContact throws missing property errors instead of dropping custom properties', async () => {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-token';

  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/crm/v3/objects/contacts/search')) {
      return jsonResponse({ results: [] });
    }

    return jsonResponse(
      {
        category: 'VALIDATION_ERROR',
        message: 'Property "animax_age" does not exist',
        errors: [
          {
            context: {
              propertyName: ['animax_age'],
            },
          },
        ],
      },
      400
    );
  };

  await assert.rejects(
    () =>
      upsertHubSpotContact({
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: '32',
        gender: 'Female',
        weight: '78 kg',
        height: '178 cm',
        primaryGoal: 'Build muscle',
        consentToContact: true,
      }),
    (error: unknown) => {
      assert.equal(error instanceof MissingHubSpotPropertyError, true);
      assert.equal((error as MissingHubSpotPropertyError).propertyName, 'animax_age');
      return true;
    }
  );
});

test('upsertOneOnOneHubSpotContact overwrites source on create', async () => {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-token';
  const requests: Array<{ url: string; init: RequestInit; body: any }> = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({
      url: String(url),
      init,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (String(url).endsWith('/crm/v3/objects/contacts/search')) {
      return jsonResponse({ results: [] });
    }

    return jsonResponse({ id: 'created-contact' });
  };

  await upsertOneOnOneHubSpotContact({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123',
    age: '32',
    consentToContact: true,
    utmSource: 'instagram',
    utmMedium: 'paid',
  });

  const createProperties = requests[1].body.properties;
  assert.equal(createProperties.animax_lead_source, 'one_on_one_guarantee');
  assert.equal(createProperties.lifecyclestage, 'lead');
  assert.equal(createProperties.hs_lead_status, 'NEW');
  assert.equal(createProperties.animax_age, '32');
  assert.equal(createProperties.phone, '+1 555 123');
  assert.equal(createProperties.animax_notes, 'Requested 1:1 Guarantee Call from coaching card.');
});

test('upsertOneOnOneHubSpotContact overwrites source and preserves existing notes on update', async () => {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-token';
  const requests: Array<{ url: string; init: RequestInit; body: any }> = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({
      url: String(url),
      init,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (String(url).endsWith('/crm/v3/objects/contacts/search')) {
      return jsonResponse({
        results: [
          {
            id: 'existing-contact',
            properties: {
              email: 'jane@example.com',
              animax_notes: 'Existing quiz notes',
            },
          },
        ],
      });
    }

    return jsonResponse({ id: 'existing-contact' });
  };

  await upsertOneOnOneHubSpotContact({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123',
    age: '33',
    consentToContact: true,
  });

  const updateProperties = requests[1].body.properties;
  assert.equal(requests[1].init.method, 'PATCH');
  assert.equal(updateProperties.animax_lead_source, 'one_on_one_guarantee');
  assert.equal(updateProperties.lifecyclestage, undefined);
  assert.equal(updateProperties.hs_lead_status, undefined);
  assert.equal(updateProperties.animax_age, '33');
  assert.equal(
    updateProperties.animax_notes,
    'Requested 1:1 Guarantee Call from coaching card.\n\nExisting quiz notes'
  );
});

test('upsertOneOnOneHubSpotContact handles null existing notes on update', async () => {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-token';
  const requests: Array<{ url: string; init: RequestInit; body: any }> = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({
      url: String(url),
      init,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (String(url).endsWith('/crm/v3/objects/contacts/search')) {
      return jsonResponse({
        results: [
          {
            id: 'existing-contact',
            properties: {
              email: null,
              phone: null,
              animax_age: null,
              animax_notes: null,
              animax_lead_source: null,
            },
          },
        ],
      });
    }

    return jsonResponse({ id: 'existing-contact' });
  };

  await upsertOneOnOneHubSpotContact({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123',
    age: '33',
    consentToContact: true,
  });

  const updateProperties = requests[1].body.properties;
  assert.equal(updateProperties.animax_notes, 'Requested 1:1 Guarantee Call from coaching card.');
});

test('upsertOneOnOneHubSpotContact retries when HubSpot rejects the source option', async () => {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-token';
  const requests: Array<{ url: string; init: RequestInit; body: any }> = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({
      url: String(url),
      init,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (String(url).endsWith('/crm/v3/objects/contacts/search')) {
      return jsonResponse({ results: [] });
    }

    if (requests.filter((request) => String(request.url).endsWith('/crm/v3/objects/contacts')).length === 1) {
      return jsonResponse(
        {
          category: 'VALIDATION_ERROR',
          message:
            'Property values were not valid: [{"name":"animax_lead_source","message":"one_on_one_guarantee was not one of the allowed options"}]',
        },
        400
      );
    }

    return jsonResponse({ id: 'created-contact' });
  };

  await upsertOneOnOneHubSpotContact({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123',
    age: '32',
    consentToContact: true,
  });

  const retryProperties = requests[2].body.properties;
  assert.equal(requests.length, 3);
  assert.equal(retryProperties.email, 'jane@example.com');
  assert.equal(retryProperties.phone, '+1 555 123');
  assert.equal(retryProperties.animax_notes, 'Requested 1:1 Guarantee Call from coaching card.');
  assert.equal(retryProperties.animax_lead_source, undefined);
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
