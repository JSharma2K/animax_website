import { Redis } from '@upstash/redis';
import { sendJson } from '../_lib/http.js';
import { MissingHubSpotPropertyError, upsertOneOnOneHubSpotContact } from '../_lib/hubspot.js';
import {
  BodyTooLargeError,
  INTEREST_LEAD_BODY_LIMIT_BYTES,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
  InvalidJsonError,
  buildRateLimitKey,
  checkRateLimit,
  getClientIp,
  hashRateLimitIdentifier,
  parseJsonBodyWithLimit,
  validateOneOnOneLead,
} from '../_lib/interestLead.js';

let redis: Redis | null = null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const rateLimit = await checkRequestRateLimit(req);

    if (rateLimit.limited) {
      res.setHeader('Retry-After', String(rateLimit.retryAfter));
      return sendJson(res, 429, { error: 'rate_limited' });
    }

    const body = await parseJsonBodyWithLimit(req, INTEREST_LEAD_BODY_LIMIT_BYTES);
    const validation = validateOneOnOneLead(body);

    if (!validation.ok) {
      if (validation.spam) {
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 400, {
        error: 'validation_failed',
        missing: validation.missing,
        invalid: validation.invalid,
      });
    }

    await upsertOneOnOneHubSpotContact(validation.value);

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return sendJson(res, 413, { error: 'body_too_large' });
    }

    if (error instanceof InvalidJsonError) {
      return sendJson(res, 400, { error: 'invalid_json' });
    }

    if (error instanceof MissingHubSpotPropertyError) {
      console.error('One-on-one lead sync failed', {
        error: 'missing_hubspot_property',
        propertyName: error.propertyName,
      });
      return sendJson(res, 500, { error: 'Could not save lead' });
    }

    console.error('One-on-one lead sync failed', {
      error: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : undefined,
      cause: getErrorCauseMessage(error),
      hubspotStatus: (error as { status?: number })?.status,
      hubspotCategory: (error as { body?: { category?: string } })?.body?.category,
    });
    return sendJson(res, 500, { error: 'Could not save lead' });
  }
}

async function checkRequestRateLimit(req: any) {
  const client = getRedisClient();

  if (!client) {
    console.warn('One-on-one lead rate limit skipped: KV_REST_API_URL or KV_REST_API_TOKEN is not configured');
    return { limited: false as const };
  }

  try {
    return await checkRateLimit(
      client,
      buildRateLimitKey(hashRateLimitIdentifier(getClientIp(req)), 'one-on-one-lead'),
      {
        maxRequests: RATE_LIMIT_MAX_REQUESTS,
        windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
      }
    );
  } catch (error) {
    console.warn('One-on-one lead rate limit skipped: Redis request failed', {
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    return { limited: false as const };
  }
}

function getRedisClient() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }

  redis ??= new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  return redis;
}

function getErrorCauseMessage(error: unknown) {
  const cause = (error as { cause?: unknown })?.cause;

  if (cause instanceof Error) {
    return cause.message;
  }

  return typeof cause === 'string' ? cause : undefined;
}
