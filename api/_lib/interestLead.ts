import crypto from 'node:crypto';

export const INTEREST_LEAD_BODY_LIMIT_BYTES = 25 * 1024;
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const RATE_LIMIT_WINDOW_SECONDS = 600;

const ALLOWED_GENDERS = new Set(['Female', 'Male', 'Prefer not to say']);

type RawLeadBody = Record<string, unknown>;

export type ValidInterestLead = {
  name: string;
  email: string;
  phone?: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  primaryGoal: string;
  notes?: string;
  consentToContact: true;
  utmSource?: string;
  utmMedium?: string;
};

export type InterestLeadValidationResult =
  | { ok: true; value: ValidInterestLead }
  | { ok: false; missing: string[]; invalid: string[]; spam?: boolean };

export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large');
    this.name = 'BodyTooLargeError';
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super('Request body is not valid JSON');
    this.name = 'InvalidJsonError';
  }
}

export function validateInterestLead(body: RawLeadBody): InterestLeadValidationResult {
  const companyWebsite = cleanString(body.companyWebsite);

  if (companyWebsite) {
    return { ok: false, missing: [], invalid: [], spam: true };
  }

  const normalized = {
    name: cleanString(body.name),
    email: cleanString(body.email).toLowerCase(),
    phone: cleanString(body.phone),
    age: cleanString(body.age),
    gender: cleanString(body.gender),
    weight: cleanString(body.weight),
    height: cleanString(body.height),
    primaryGoal: cleanString(body.primaryGoal),
    notes: cleanString(body.notes),
    consentToContact: body.consentToContact,
    utmSource: cleanString(body.utmSource),
    utmMedium: cleanString(body.utmMedium),
  };

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const field of ['name', 'email', 'age', 'gender', 'weight', 'height', 'primaryGoal'] as const) {
    if (!normalized[field]) {
      missing.push(field);
    }
  }

  if (body.consentToContact === undefined) {
    missing.push('consentToContact');
  } else if (body.consentToContact !== true) {
    invalid.push('consentToContact');
  }

  validateMaxLength(normalized.name, 'name', 120, invalid);
  validateMaxLength(normalized.email, 'email', 254, invalid);
  validateMaxLength(normalized.phone, 'phone', 40, invalid);
  validateMaxLength(normalized.age, 'age', 3, invalid);
  validateMaxLength(normalized.weight, 'weight', 40, invalid);
  validateMaxLength(normalized.height, 'height', 40, invalid);
  validateMaxLength(normalized.primaryGoal, 'primaryGoal', 1000, invalid);
  validateMaxLength(normalized.notes, 'notes', 3000, invalid);
  validateMaxLength(normalized.utmSource, 'utmSource', 120, invalid);
  validateMaxLength(normalized.utmMedium, 'utmMedium', 120, invalid);

  if (normalized.email && !isEmail(normalized.email)) {
    invalid.push('email');
  }

  if (normalized.age && !isValidAge(normalized.age)) {
    invalid.push('age');
  }

  if (normalized.gender && !ALLOWED_GENDERS.has(normalized.gender)) {
    invalid.push('gender');
  }

  if (missing.length || invalid.length) {
    return { ok: false, missing: unique(missing), invalid: unique(invalid) };
  }

  return {
    ok: true,
    value: compact({
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      age: normalized.age,
      gender: normalized.gender,
      weight: normalized.weight,
      height: normalized.height,
      primaryGoal: normalized.primaryGoal,
      notes: normalized.notes,
      consentToContact: true,
      utmSource: normalized.utmSource,
      utmMedium: normalized.utmMedium,
    }) as ValidInterestLead,
  };
}

export async function parseJsonBodyWithLimit(req: any, maxBytes: number): Promise<RawLeadBody> {
  const rawBody = await readRawBodyWithLimit(req, maxBytes);

  if (!rawBody) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new InvalidJsonError();
  }
}

export async function readRawBodyWithLimit(req: any, maxBytes: number) {
  const contentLength = getHeader(req, 'content-length');
  const parsedContentLength = contentLength ? Number(contentLength) : 0;

  if (Number.isFinite(parsedContentLength) && parsedContentLength > maxBytes) {
    throw new BodyTooLargeError();
  }

  if (typeof req.body === 'string') {
    return ensureWithinLimit(req.body, maxBytes);
  }

  if (req.body && typeof req.body === 'object') {
    return ensureWithinLimit(JSON.stringify(req.body), maxBytes);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > maxBytes) {
      throw new BodyTooLargeError();
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export function getClientIp(req: any) {
  const forwardedFor = getHeader(req, 'x-forwarded-for');
  const firstForwardedIp = forwardedFor?.split(',')[0]?.trim();

  return (
    firstForwardedIp ||
    getHeader(req, 'x-real-ip')?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function hashRateLimitIdentifier(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function buildRateLimitKey(ipHash: string) {
  return `rate:interest-lead:${ipHash}`;
}

export async function checkRateLimit(
  redis: {
    incr: (key: string) => Promise<number>;
    expire: (key: string, seconds: number) => Promise<unknown>;
    ttl: (key: string) => Promise<number>;
  },
  key: string,
  options: { maxRequests: number; windowSeconds: number }
) {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, options.windowSeconds);
  }

  if (count <= options.maxRequests) {
    return { limited: false as const };
  }

  const ttl = await redis.ttl(key);
  return {
    limited: true as const,
    retryAfter: ttl > 0 ? ttl : options.windowSeconds,
  };
}

function ensureWithinLimit(rawBody: string, maxBytes: number) {
  if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
    throw new BodyTooLargeError();
  }

  return rawBody;
}

function getHeader(req: any, name: string) {
  const headers = req.headers || {};
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : typeof value === 'string' ? value : undefined;
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateMaxLength(value: string, field: string, maxLength: number, invalid: string[]) {
  if (value.length > maxLength) {
    invalid.push(field);
  }
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidAge(value: string) {
  if (!/^\d{1,3}$/.test(value)) {
    return false;
  }

  const age = Number(value);
  return age >= 13 && age <= 100;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
