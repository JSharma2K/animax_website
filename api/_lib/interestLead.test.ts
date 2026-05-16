import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  BodyTooLargeError,
  InvalidJsonError,
  checkRateLimit,
  parseJsonBodyWithLimit,
  validateInterestLead,
  validateOneOnOneLead,
} from './interestLead.js';

test('validateInterestLead returns normalized input for a complete quiz lead', () => {
  const result = validateInterestLead({
    name: '  Jane Doe  ',
    email: '  JANE@EXAMPLE.COM  ',
    phone: ' +1 555 123 ',
    age: '32',
    gender: 'Female',
    weight: '78 kg',
    height: '178 cm',
    primaryGoal: 'Build muscle',
    notes: 'Ready to start',
    consentToContact: true,
    utmSource: 'instagram',
    utmMedium: 'paid',
    utmCampaign: 'ignored',
    companyWebsite: '',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123',
    age: '32',
    gender: 'Female',
    weight: '78 kg',
    height: '178 cm',
    primaryGoal: 'Build muscle',
    notes: 'Ready to start',
    consentToContact: true,
    utmSource: 'instagram',
    utmMedium: 'paid',
  });
});

test('validateInterestLead separates missing consent from invalid false consent', () => {
  const missing = validateInterestLead({
    name: 'Jane',
    email: 'jane@example.com',
    age: '32',
    gender: 'Female',
    weight: '78 kg',
    height: '178 cm',
    primaryGoal: 'Build muscle',
  });

  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, ['consentToContact']);
  assert.deepEqual(missing.invalid, []);

  const invalid = validateInterestLead({
    name: 'Jane',
    email: 'jane@example.com',
    age: '32',
    gender: 'Female',
    weight: '78 kg',
    height: '178 cm',
    primaryGoal: 'Build muscle',
    consentToContact: false,
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.missing, []);
  assert.deepEqual(invalid.invalid, ['consentToContact']);
});

test('validateInterestLead reports spam without exposing the honeypot as invalid', () => {
  const result = validateInterestLead({
    name: 'Jane',
    email: 'jane@example.com',
    age: '32',
    gender: 'Female',
    weight: '78 kg',
    height: '178 cm',
    primaryGoal: 'Build muscle',
    consentToContact: true,
    companyWebsite: 'https://spam.example',
  });

  assert.equal(result.ok, false);
  assert.equal(result.spam, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
});

test('validateInterestLead rejects malformed and oversized fields', () => {
  const result = validateInterestLead({
    name: 'x'.repeat(121),
    email: 'not-an-email',
    age: '101',
    gender: 'Other',
    weight: 'x'.repeat(41),
    height: 'x'.repeat(41),
    primaryGoal: 'x'.repeat(1001),
    notes: 'x'.repeat(3001),
    consentToContact: true,
    utmSource: 'x'.repeat(121),
    utmMedium: 'x'.repeat(121),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid.sort(), [
    'age',
    'email',
    'gender',
    'height',
    'name',
    'notes',
    'primaryGoal',
    'utmMedium',
    'utmSource',
    'weight',
  ]);
});

test('validateOneOnOneLead returns normalized input for a complete one-on-one lead', () => {
  const result = validateOneOnOneLead({
    name: '  Jane Doe  ',
    email: '  JANE@EXAMPLE.COM  ',
    phone: ' +1 555 123 ',
    age: '32',
    consentToContact: true,
    utmSource: 'instagram',
    utmMedium: 'paid',
    companyWebsite: '',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123',
    age: '32',
    consentToContact: true,
    utmSource: 'instagram',
    utmMedium: 'paid',
  });
});

test('validateOneOnOneLead rejects missing and malformed fields', () => {
  const result = validateOneOnOneLead({
    name: '',
    email: 'not-an-email',
    phone: '',
    age: '12',
    consentToContact: false,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing.sort(), ['name', 'phone']);
  assert.deepEqual(result.invalid.sort(), ['age', 'consentToContact', 'email']);
});

test('validateOneOnOneLead reports spam without exposing the honeypot as invalid', () => {
  const result = validateOneOnOneLead({
    name: 'Jane',
    email: 'jane@example.com',
    phone: '+1 555 123',
    age: '32',
    consentToContact: true,
    companyWebsite: 'https://spam.example',
  });

  assert.equal(result.ok, false);
  assert.equal(result.spam, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
});

test('parseJsonBodyWithLimit rejects pre-parsed oversized bodies', async () => {
  await assert.rejects(
    () =>
      parseJsonBodyWithLimit(
        { headers: {}, body: { notes: 'x'.repeat(30) } },
        20
      ),
    BodyTooLargeError
  );
});

test('parseJsonBodyWithLimit rejects streaming bodies once the byte limit is exceeded', async () => {
  const req = Readable.from(['{"notes":"', 'x'.repeat(30), '"}']) as Readable & {
    headers: Record<string, string>;
  };
  req.headers = {};

  await assert.rejects(() => parseJsonBodyWithLimit(req, 20), BodyTooLargeError);
});

test('parseJsonBodyWithLimit rejects invalid JSON with a typed error', async () => {
  const req = Readable.from(['{bad-json']) as Readable & {
    headers: Record<string, string>;
  };
  req.headers = {};

  await assert.rejects(() => parseJsonBodyWithLimit(req, 100), InvalidJsonError);
});

test('checkRateLimit increments atomically, sets ttl once, and returns retry-after when limited', async () => {
  const calls: string[] = [];
  let count = 0;
  const redis = {
    async incr(key: string) {
      calls.push(`incr:${key}`);
      count += 1;
      return count;
    },
    async expire(key: string, seconds: number) {
      calls.push(`expire:${key}:${seconds}`);
      return 1;
    },
    async ttl(key: string) {
      calls.push(`ttl:${key}`);
      return 599;
    },
  };

  const key = 'rate:interest-lead:test';
  const first = await checkRateLimit(redis, key, { maxRequests: 1, windowSeconds: 600 });
  const second = await checkRateLimit(redis, key, { maxRequests: 1, windowSeconds: 600 });

  assert.deepEqual(first, { limited: false });
  assert.deepEqual(second, { limited: true, retryAfter: 599 });
  assert.deepEqual(calls, [
    `incr:${key}`,
    `expire:${key}:600`,
    `incr:${key}`,
    `ttl:${key}`,
  ]);
});
