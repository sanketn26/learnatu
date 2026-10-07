import { env } from 'cloudflare:workers';

/**
 * Scoped, structured logging: `const log = logger('payments'); log.info('order created', { id })`.
 * Prints one JSON line per event. Set DEBUG=1 (in .dev.vars or as a secret) to include debug lines.
 */
type Fields = Record<string, unknown>;

function emit(level: 'debug' | 'info' | 'warn' | 'error', scope: string, message: string, fields?: Fields) {
  if (level === 'debug' && !env.DEBUG) return;
  const line = JSON.stringify({ level, scope, message, ...fields });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

export function errorFields(error: unknown): Fields {
  return error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) };
}

export function logger(scope: string) {
  return {
    debug: (message: string, fields?: Fields) => emit('debug', scope, message, fields),
    info: (message: string, fields?: Fields) => emit('info', scope, message, fields),
    warn: (message: string, fields?: Fields) => emit('warn', scope, message, fields),
    error: (message: string, error?: unknown, fields?: Fields) => emit('error', scope, message, { ...fields, ...(error ? errorFields(error) : {}) })
  };
}
