import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { registerHooks } from 'node:module';

/** A small stand-in for Cloudflare D1 on top of node:sqlite, with the project's real migrations applied. */
export function fakeD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(new URL('../../migrations/', import.meta.url)).sort()) {
    sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'));
  }
  const arg = (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : v === undefined ? null : v);
  const statement = (sql, params = []) => ({
    sql,
    bind: (...values) => statement(sql, values.map(arg)),
    first: async () => { const row = sqlite.prepare(sql).get(...params); return row ? { ...row } : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...params).map((row) => ({ ...row })) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...params).changes) } }),
    _run: () => sqlite.prepare(sql).run(...params)
  });
  return {
    sqlite,
    prepare: (sql) => statement(sql),
    // D1 batches are atomic: all statements succeed or none do.
    batch: async (statements) => {
      sqlite.exec('BEGIN');
      try { for (const s of statements) s._run(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      return statements.map(() => ({}));
    }
  };
}

/** Lets tests import the project's .ts files: `cloudflare:workers` becomes a fake env, extensionless imports find .ts. */
export async function importWithFakes(paths, env = {}) {
  globalThis.__testEnv = env;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'cloudflare:workers') {
        return { url: 'data:text/javascript,export const env = globalThis.__testEnv;', shortCircuit: true };
      }
      try { return nextResolve(specifier, context); } catch (error) {
        if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
        throw error;
      }
    }
  });
  try { return await Promise.all(paths.map((path) => import(new URL(`../../${path}`, import.meta.url).href))); } finally { hooks.deregister(); }
}
