import test from 'node:test';
import assert from 'node:assert/strict';

/** A very small stand-in for the browser, enough for the player: elements, events and animation frames. */
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.attrs = {}; this.style = {}; this.className = ''; this.textContent = ''; this.hidden = false; this.value = ''; this.dataset = {}; this._html = ''; }
  append(...nodes) { this.children.push(...nodes.filter((n) => typeof n !== 'string')); }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  setAttribute(k, v) { this.attrs[k] = v; }
  fire(type, event = {}) { for (const fn of this.listeners[type] ?? []) fn({ target: this, preventDefault() {}, ...event }); }
  set innerHTML(v) { this._html = v; this.firstElementChild = { setAttribute: (k, val) => { this.attrs.firstChild = { ...this.attrs.firstChild, [k]: val }; } }; }
  get innerHTML() { return this._html; }
  find(pred, out = []) { if (pred(this)) out.push(this); this.children.forEach((c) => c.find?.(pred, out)); return out; }
}
const frames = [];
globalThis.document = { createElement: (tag) => new El(tag), getElementById: () => null, head: new El('head') };
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
globalThis.cancelAnimationFrame = (id) => { frames[id - 1] = null; };
const flush = (limit = 400) => { const t0 = performance.now(); for (let k = 0; k < limit; k++) { const next = frames.shift(); if (next) next(t0 + (k + 1) * 250); if (!frames.length) break; } };

const { mountPhysmap } = await import('../src/dom.ts');
const { EXAMPLES } = await import('../src/index.ts');

const stageOf = (root) => root.find((n) => n.className === 'pm-stage')[0];

for (const e of EXAMPLES) {
  test(`player: ${e.id} mounts, moves its sliders, plays to the end`, () => {
    const root = new El('div');
    const mounted = mountPhysmap(root, e.text);
    const stage = stageOf(root);
    assert.ok(stage._html.startsWith('<svg'), 'draws a picture');
    // every slider the author declared
    const inputs = root.find((n) => n.tag === 'input' && n.type === 'range');
    const time = inputs.find((n) => n.attrs['aria-label'] === 'Time');
    const sliders = inputs.filter((n) => n !== time);
    for (const s of sliders) {
      for (const f of [0, 0.5, 1]) { s.value = String(Number(s.min) + f * (Number(s.max) - Number(s.min))); s.fire('input'); flush(); assert.ok(!stage._html.includes('NaN'), `${e.id} slider at ${f}`); }
    }
    // the time slider and Play, when the scene changes with time
    const play = root.find((n) => n.className === 'pm-main')[0];
    if (play) {
      time.value = '0'; time.fire('input');
      play.fire('click');
      flush();
      assert.equal(play.textContent, 'Replay', 'plays to the end');
      assert.ok(!stage._html.includes('NaN'));
      play.fire('click');                        // replay starts again, and pausing stops it
      play.fire('click');
      assert.equal(play.textContent === 'Play' || play.textContent === 'Replay', true);
    }
    mounted.destroy();
  });
}

test('player: a mistake shows the list of problems and the text, and does not throw', () => {
  const root = new El('div');
  mountPhysmap(root, 'scene mechanics\nbody b mas=1kg at=(0m,0m)\nrun 1s');
  const box = root.children[0];
  assert.equal(box.className, 'pm-error');
  assert.equal(box.attrs.role, 'alert');
});

test('player: the predict answer and the assumptions are on the page', () => {
  const root = new El('div');
  mountPhysmap(root, EXAMPLES.find((e) => e.id === 'otto').text);
  assert.ok(root.find((n) => n.className === 'pm-predict').length === 1);
  assert.ok(root.find((n) => n.className === 'pm-assume').length === 1);
});
