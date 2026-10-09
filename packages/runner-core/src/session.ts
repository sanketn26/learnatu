import { LOADING_MS, OUTPUT_LIMIT, RENDER_LIMITS, STATUS_MAX } from './types.ts';
import type { FromSandbox, RenderedImage, RunError, RunResult, ToSandbox } from './types.ts';

/**
 * Everything about running a block that does not need a browser: counting output, the time limit, ignoring messages
 * from an older run, and deciding how a run ended. It talks to the sandbox through a Channel, so tests can
 * stand in for the iframe.
 */
export interface Channel {
  post(message: ToSandbox): void;
  /** Called with every message the sandbox sends. The channel must pass on only messages from its own iframe. */
  onMessage(listener: (message: unknown) => void): void;
}
export interface Timers { set(fn: () => void, ms: number): unknown; clear(handle: unknown): void }

export interface RunHandlers {
  status?(text: string): void;
  output?(stream: 'stdout' | 'stderr', text: string): void;
  /** The code drew something: HTML to show in a locked-down frame, or pixels. */
  render?(drawing: { html?: string; image?: RenderedImage }): void;
}


/** Anything that comes out of the sandbox is untrusted: keep only messages of the exact shape we expect. */
export function readMessage(raw: unknown): FromSandbox | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const id = typeof m.id === 'number' ? m.id : undefined;
  switch (m.type) {
    case 'status': return id !== undefined && typeof m.text === 'string' && m.text.length <= STATUS_MAX ? { type: 'status', id, text: m.text } : null;
    case 'out': return id !== undefined && (m.stream === 'stdout' || m.stream === 'stderr') && typeof m.text === 'string' ? { type: 'out', id, stream: m.stream, text: m.text } : null;
    case 'done': {
      if (id === undefined) return null;
      if (m.error === undefined) return { type: 'done', id };
      const e = m.error as Record<string, unknown> | null;
      if (!e || typeof e.kind !== 'string' || typeof e.message !== 'string' || typeof e.traceback !== 'string') return null;
      const error: RunError = { kind: e.kind, message: e.message, traceback: e.traceback, ...(typeof e.line === 'number' ? { line: e.line } : {}) };
      return { type: 'done', id, error };
    }
    case 'render': {
      if (id === undefined) return null;
      if (typeof m.html === 'string') return m.html.length <= RENDER_LIMITS.html ? { type: 'render', id, html: m.html } : null;
      const i = m.image as Record<string, unknown> | undefined;
      if (!i || !Number.isInteger(i.width) || !Number.isInteger(i.height)) return null;
      const w = i.width as number, h = i.height as number;
      if (w < 1 || h < 1 || w * h > RENDER_LIMITS.pixels) return null;
      // a typed array or an ArrayBuffer from the sandbox: only the bytes are kept, and only if the size is exactly right
      const data = i.data as ArrayBuffer | undefined;
      if (Object.prototype.toString.call(data) !== '[object ArrayBuffer]' || (data as ArrayBuffer).byteLength !== w * h * 4) return null;
      return { type: 'render', id, image: { width: w, height: h, data: data as ArrayBuffer } };
    }
    case 'crash': return typeof m.message === 'string' ? { type: 'crash', message: m.message, ...(id !== undefined ? { id } : {}) } : null;
    default: return null;
  }
}

export class Session {
  private nextId = 0;
  private current: { id: number; finish(result: RunResult): void } | null = null;

  private channel: Channel;
  private timers: Timers;

  constructor(channel: Channel, timers: Timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) }) {
    this.channel = channel;
    this.timers = timers;
    channel.onMessage((raw) => this.receive(raw));
  }

  get busy(): boolean { return this.current !== null; }

  /** Runs code with the options the language needs (`timeout` stays on the page; the rest goes to the worker). Only one run at a time: starting another stops the first (reported as "stopped"). */
  run(request: { code: string; timeout: number; [option: string]: unknown }, handlers: RunHandlers = {}): Promise<RunResult> {
    const { timeout, ...sent } = request;
    this.stop();
    const id = ++this.nextId;
    return new Promise<RunResult>((resolve) => {
      let timer: unknown = null;
      let size = 0;
      const finish = (result: RunResult, kill: boolean) => {
        if (this.current?.id !== id) return;
        if (timer !== null) this.timers.clear(timer);
        this.current = null;
        if (kill) this.channel.post({ type: 'kill' });
        resolve(result);
      };
      this.current = { id, finish: (result) => finish(result, true) };
      // loading Python and packages is not counted against the block's time, but it may not hang forever either
      timer = this.timers.set(() => finish({ outcome: 'timeout', message: 'The code runner did not finish loading. Check the connection and try again.' }, true), LOADING_MS);
      this.handle = (message) => {
        if (message.type === 'crash') { finish({ outcome: 'crashed', message: message.message }, true); return; }
        if (message.id !== id) return;
        if (message.type === 'status') {
          // the time limit counts running, not loading Python or packages
          if (message.text === 'running') { if (timer !== null) this.timers.clear(timer); timer = this.timers.set(() => finish({ outcome: 'timeout', message: `Stopped after ${timeout} seconds.` }, true), timeout * 1000); }
          handlers.status?.(message.text);
        } else if (message.type === 'out') {
          size += message.text.length;
          if (size > OUTPUT_LIMIT) { finish({ outcome: 'too-much-output', message: 'Stopped: the program printed too much.' }, true); return; }
          handlers.output?.(message.stream, message.text);
        } else if (message.type === 'render') {
          handlers.render?.({ html: message.html, image: message.image });
        } else if (message.type === 'done') {
          finish(message.error ? { outcome: 'error', error: message.error } : { outcome: 'ok' }, false);
        }
      };
      this.channel.post({ ...sent, type: 'run', id });
    });
  }

  /** Stops the current run, if any. The Python worker is thrown away and a fresh one starts on the next run. */
  stop(): void { this.current?.finish({ outcome: 'stopped', message: 'Stopped.' }); }

  /** Asks the worker to forget what earlier runs left behind (languages that keep state between runs). */
  reset(): void { this.channel.post({ type: 'reset' }); }

  private handle: (message: FromSandbox) => void = () => {};
  private receive(raw: unknown) {
    const message = readMessage(raw);
    if (message) this.handle(message);
  }
}
