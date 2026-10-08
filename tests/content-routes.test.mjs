import test from 'node:test';
import assert from 'node:assert/strict';
import { contentRoute, routeForSourcePath } from '../src/lib/content-routes.mjs';

test('the language folder is removed from a content id', () => {
  assert.equal(contentRoute('en/about'), 'about');
  assert.equal(contentRoute('hi/about'), 'about');
});

test('moved pages use their new address', () => {
  assert.equal(contentRoute('en/basics/whatsapp'), 'safety/communication/whatsapp');
  assert.equal(contentRoute('hi/basics/whatsapp'), 'safety/communication/whatsapp');
});

test('a source file path maps to the same address', () => {
  assert.equal(routeForSourcePath('/x/docs/en/basics/whatsapp.md'), 'safety/communication/whatsapp');
  assert.equal(routeForSourcePath('/x/docs/hi/help/hacked-account.md'), 'help/hacked-account');
});
