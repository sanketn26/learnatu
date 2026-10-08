// Run all tests with:  npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickLang, splitLangPrefix } from '../src/lib/lang-rules.ts';

const supported = ['en', 'hi', 'ta'];

test('a saved language wins over the browser setting', () => {
  assert.equal(pickLang('ta', 'hi-IN,hi;q=0.9', supported), 'ta');
});

test('an unsupported saved language is ignored', () => {
  assert.equal(pickLang('fr', 'hi', supported), 'hi');
});

test('the first supported browser language is used', () => {
  assert.equal(pickLang(undefined, 'fr-FR,hi-IN;q=0.8,en;q=0.5', supported), 'hi');
});

test('English is the default', () => {
  assert.equal(pickLang(undefined, null, supported), 'en');
  assert.equal(pickLang(undefined, 'fr,de', supported), 'en');
});

test('old language-prefixed URLs are recognised', () => {
  assert.deepEqual(splitLangPrefix('/hi/courses/', supported), { lang: 'hi', rest: '/courses/' });
  assert.deepEqual(splitLangPrefix('/ta', supported), { lang: 'ta', rest: '/' });
});

test('normal paths are not treated as prefixed', () => {
  assert.equal(splitLangPrefix('/courses/', supported), null);
  assert.equal(splitLangPrefix('/fr/courses/', supported), null);
  assert.equal(splitLangPrefix('/hindi/', supported), null);
});
