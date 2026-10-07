import test from 'node:test';
import assert from 'node:assert/strict';
import { hmacSha256Hex, safeEqual, sha256Hex, randomToken } from '../src/lib/crypto.ts';

test('known vectors', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(await hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog'), 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
});

test('safeEqual and tokens', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.notEqual(randomToken(), randomToken());
});
