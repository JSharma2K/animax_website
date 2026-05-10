import crypto from 'node:crypto';
import { readRawBody, sendJson } from '../_lib/http';
import { upsertHubSpotContact } from '../_lib/hubspot';

const HANDLED_EVENTS = new Set([
  'invitee.created',
  'invitee.canceled',
]);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const secret = process.env.CAL_WEBHOOK_SECRET || process.env.CALENDLY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('Missing CAL_WEBHOOK_SECRET');
      return sendJson(res, 500, { error: 'Webhook secret is not configured' });
    }

    if (!isValidCalendlySignature(req.headers['calendly-webhook-signature'], rawBody, secret)) {
      return sendJson(res, 401, { error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody);
    const eventType = String(event.event || '').toLowerCase();

    if (!HANDLED_EVENTS.has(eventType)) {
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    const lead = extractLeadFromCalendlyWebhook(event, eventType);

    if (!lead.email) {
      console.warn('Calendly webhook did not include an invitee email', eventType);
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    await upsertHubSpotContact({
      source: 'booked_call',
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      primaryGoal: lead.primaryGoal,
      notes: lead.notes,
      consentToContact: true,
      bookingUid: lead.bookingUid,
      bookingStatus: lead.bookingStatus,
      bookingStart: lead.bookingStart,
    });

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('Calendly webhook sync failed', error);
    return sendJson(res, 500, { error: 'Webhook sync failed' });
  }
}

function isValidCalendlySignature(headerValue: string | string[] | undefined, rawBody: string, secret: string) {
  const receivedValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!receivedValue) {
    return false;
  }

  const parts = Object.fromEntries(
    receivedValue.split(',').map((part) => {
      const [key, ...value] = part.split('=');
      return [key.trim(), value.join('=').trim()];
    })
  );
  const timestamp = parts.t;
  const received = parts.v1;

  if (!timestamp || !received) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function extractLeadFromCalendlyWebhook(event: any, eventType: string) {
  const payload = event.payload || {};
  const questionsAndAnswers = Array.isArray(payload.questions_and_answers)
    ? payload.questions_and_answers
    : [];

  return {
    name: cleanString(payload.name),
    email: cleanString(payload.email).toLowerCase(),
    phone:
      cleanString(payload.text_reminder_number) ||
      answerValue(questionsAndAnswers, ['phone', 'phone / whatsapp', 'whatsapp', 'phone or whatsapp']),
    primaryGoal: answerValue(questionsAndAnswers, [
      'primary fitness goal',
      'fitness goal',
      'goal',
      'what is your primary fitness goal?',
    ]),
    notes: answerValue(questionsAndAnswers, ['notes', 'message', 'additional notes']),
    bookingUid: cleanString(payload.uri),
    bookingStatus: eventType === 'invitee.canceled' ? 'cancelled' : 'booked',
    bookingStart:
      cleanString(payload.scheduled_event?.start_time) ||
      cleanString(payload.event?.start_time),
  };
}

function answerValue(questionsAndAnswers: Array<Record<string, unknown>>, labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  const answer = questionsAndAnswers.find((item) => {
    const question = cleanString(item.question).toLowerCase();
    return normalizedLabels.some((label) => question.includes(label));
  });

  return cleanString(answer?.answer);
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

