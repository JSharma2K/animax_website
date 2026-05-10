import crypto from 'node:crypto';
import { readRawBody, sendJson } from '../_lib/http';
import { upsertHubSpotContact } from '../_lib/hubspot';

const HANDLED_EVENTS = new Set([
  'BOOKING_CREATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
  'BOOKING_REJECTED',
]);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const secret = process.env.CAL_WEBHOOK_SECRET;

    if (!secret) {
      console.error('Missing CAL_WEBHOOK_SECRET');
      return sendJson(res, 500, { error: 'Webhook secret is not configured' });
    }

    if (!isValidCalSignature(req.headers['x-cal-signature-256'], rawBody, secret)) {
      return sendJson(res, 401, { error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody);
    const eventType = String(event.triggerEvent || event.event || event.type || '').toUpperCase();

    if (!HANDLED_EVENTS.has(eventType)) {
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    const lead = extractLeadFromCalWebhook(event, eventType);

    if (!lead.email) {
      console.warn('Cal.com webhook did not include an attendee email', eventType);
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
    console.error('Cal.com webhook sync failed', error);
    return sendJson(res, 500, { error: 'Webhook sync failed' });
  }
}

function isValidCalSignature(headerValue: string | string[] | undefined, rawBody: string, secret: string) {
  const receivedValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!receivedValue) {
    return false;
  }

  const received = receivedValue.replace(/^sha256=/, '');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function extractLeadFromCalWebhook(event: any, eventType: string) {
  const booking = event.payload || event.data || event;
  const attendee = firstArrayItem(booking.attendees) || booking.attendee || {};
  const responses = booking.responses || booking.formResponses || booking.customInputs || {};

  return {
    name: cleanString(attendee.name) || responseValue(responses, ['name', 'Name']),
    email: (cleanString(attendee.email) || responseValue(responses, ['email', 'Email'])).toLowerCase(),
    phone:
      cleanString(attendee.phoneNumber) ||
      cleanString(attendee.phone) ||
      responseValue(responses, ['phone', 'Phone', 'Phone or WhatsApp', 'Whatsapp', 'WhatsApp']),
    primaryGoal: responseValue(responses, [
      'primaryGoal',
      'Primary fitness goal',
      'Fitness goal',
      'Goal',
      'What is your primary fitness goal?',
    ]),
    notes: responseValue(responses, ['notes', 'Notes', 'Additional notes', 'Message']),
    bookingUid: cleanString(booking.uid) || cleanString(booking.id),
    bookingStatus: statusFromEvent(eventType),
    bookingStart: cleanString(booking.startTime) || cleanString(booking.start) || cleanString(booking.start_time),
  };
}

function responseValue(responses: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const directValue = parseResponseValue(responses[key]);

    if (directValue) {
      return directValue;
    }

    const matchingKey = Object.keys(responses).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    const matchingValue = matchingKey ? parseResponseValue(responses[matchingKey]) : '';

    if (matchingValue) {
      return matchingValue;
    }
  }

  return '';
}

function parseResponseValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    return cleanString(candidate.value) || cleanString(candidate.label);
  }

  return '';
}

function statusFromEvent(eventType: string) {
  if (eventType.includes('CANCEL')) {
    return 'cancelled';
  }

  if (eventType.includes('RESCHEDULE')) {
    return 'rescheduled';
  }

  if (eventType.includes('REJECT')) {
    return 'rejected';
  }

  return 'booked';
}

function firstArrayItem(value: unknown) {
  return Array.isArray(value) ? value[0] : undefined;
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

