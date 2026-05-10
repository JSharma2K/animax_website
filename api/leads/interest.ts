import { readJsonBody, sendJson } from '../_lib/http';
import { upsertHubSpotContact } from '../_lib/hubspot';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const name = cleanString(body.name);
    const email = cleanString(body.email).toLowerCase();
    const primaryGoal = cleanString(body.primaryGoal);
    const consentToContact = body.consentToContact === true;

    if (!name || !email || !primaryGoal) {
      return sendJson(res, 400, { error: 'name, email, and primaryGoal are required' });
    }

    if (!isEmail(email)) {
      return sendJson(res, 400, { error: 'A valid email is required' });
    }

    if (!consentToContact) {
      return sendJson(res, 400, { error: 'Consent to contact is required' });
    }

    await upsertHubSpotContact({
      source: 'interest_questionnaire',
      name,
      email,
      phone: cleanString(body.phone),
      primaryGoal,
      notes: cleanString(body.notes),
      consentToContact,
      utmSource: cleanString(body.utmSource),
      utmMedium: cleanString(body.utmMedium),
      utmCampaign: cleanString(body.utmCampaign),
    });

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('Interest lead sync failed', error);
    return sendJson(res, 500, { error: 'Could not save lead' });
  }
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

