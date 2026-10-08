import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeTokenPayload } from '../src/lib/auth/token.ts';

test('JWT decoding preserves UTF-8 profile names', () => {
  const profile = { sub: '123', name: 'संकैत 李 👋', email: 'person@example.com' };
  const payload = Buffer.from(JSON.stringify(profile)).toString('base64url');
  assert.deepEqual(decodeTokenPayload(`header.${payload}.signature`), profile);
});

test('malformed token payloads are rejected', () => {
  assert.throws(() => decodeTokenPayload('no-payload'));
  assert.throws(() => decodeTokenPayload('header.%%%.signature'));
  assert.throws(() => decodeTokenPayload('header._w.signature'));
});
