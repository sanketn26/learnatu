import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const state = { order: null, enrolled: false, failEnroll: false, author: true, options: null };
globalThis.__apiRegression = state;
const mocks = {
  '../db/enrollments': `export async function enroll() { const s = globalThis.__apiRegression; if(s.failEnroll) throw new Error('enrollment unavailable'); s.enrolled = true; } export async function revokePaidEnrollment() {}`,
  '../db/orders': `export async function findOrderByRef() { return globalThis.__apiRegression.order; } export async function markOrderPaid() { globalThis.__apiRegression.order.status = 'paid'; } export async function markOrderFailed() {} export async function markOrderRefunded() {}`,
  '../log': `export const logger = () => ({info(){}, warn(){}});`,
  '../../lib/http': `export const authedApi = fn => fn; export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} } export const json = data => new Response(JSON.stringify(data)); export const readJson = request => request.json();`,
  '../../lib/auth/roles': `export const isAuthor = () => globalThis.__apiRegression.author;`,
  '../../lib/courses/catalog': `export async function getCourse(slug,lang,options) { globalThis.__apiRegression.options = options; return options.previewVersion === 'draft-id' ? {slug,lessons:[{slug:'new-lesson'}]} : null; }`,
  '../../lib/courses/access': `export const lessonAccess = async () => ({ok:true});`,
  '../../lib/db/progress': `export const setLessonComplete = async () => {}; export const recordQuizAttempt = async () => {};`
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocks[specifier]) return {url:`data:text/javascript,${encodeURIComponent(mocks[specifier])}`,shortCircuit:true};
    try { return nextResolve(specifier, context); } catch(error) {
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  }
});
const { fulfilOrder } = await import('../src/lib/payments/fulfil.ts');
const progress = await import('../src/pages/api/progress.ts');
const quiz = await import('../src/pages/api/quiz.ts');
hooks.deregister();

test('failed enrollment leaves an order retryable; paid orders repair missing access', async () => {
  state.order = {id:'order',user_id:'user',course:'demo',status:'created'};
  state.failEnroll = true;
  await assert.rejects(fulfilOrder('stripe','ref'), /enrollment unavailable/);
  assert.equal(state.order.status, 'created');
  state.failEnroll = false;
  await fulfilOrder('stripe','ref');
  assert.equal(state.enrolled, true);
  assert.equal(state.order.status, 'paid');
  state.enrolled = false;
  await fulfilOrder('stripe','ref');
  assert.equal(state.enrolled, true);
});

for (const [name, route] of [['progress',progress],['quiz',quiz]]) {
  test(`${name} saves resolve author previews and reject learner preview cookies`, async () => {
    const context = {
      request: new Request('https://example.com/api', {method:'POST',body:JSON.stringify({course:'demo',lesson:'new-lesson',complete:true,quiz:'q1',correct:true})}),
      cookies: {get: () => ({value:'demo:draft-id'})}
    };
    state.author = true;
    assert.equal((await route.POST(context,{id:'author'})).status,200);
    assert.equal(state.options.previewVersion,'draft-id');
    state.author = false;
    // Supply a fresh body because the first request was consumed.
    context.request = new Request('https://example.com/api',{method:'POST',body:JSON.stringify({course:'demo',lesson:'new-lesson',quiz:'q1'})});
    await assert.rejects(route.POST(context,{id:'learner'}));
    assert.equal(state.options.previewVersion,null);
  });
}
