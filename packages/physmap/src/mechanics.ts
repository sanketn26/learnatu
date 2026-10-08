import type { Model, Problem } from './types.ts';
import type { Scene } from './scene.ts';
import { captionAt, describe, renderSvg } from './mechanics-render.ts';
import { shortestSpring, simulate } from './mechanics-sim.ts';
import { num } from './draw.ts';

/** Turns a parsed mechanics model into the generic Scene the player and the checker use. */
export function mechanicsScene(m: Model): Scene {
  return {
    kind: 'mechanics', title: m.title, assumptions: m.assumptions, params: m.params, predicts: m.predicts, images: m.images,
    playSeconds: Math.min(Math.max(m.run, 2), 60),
    run(values) {
      const sim = simulate(m, values);
      return {
        count: sim.samples.length, ok: sim.ok,
        problem: sim.ok ? undefined : 'This scene runs away (the numbers blow up). Try a heavier mass, a softer spring, or add drag.',
        caption: (i) => captionAt(m, sim.samples[Math.min(Math.max(i, 0), sim.samples.length - 1)].t),
        clock: (i) => `${num(sim.samples[Math.min(Math.max(i, 0), sim.samples.length - 1)].t)} / ${num(m.run)} s`,
        svg: (i, o) => renderSvg(m, sim, i, o),
        describe: (i) => describe(m, sim, i)
      };
    },
    verify(values) {
      const sim = simulate(m, values);
      if (!sim.ok) return [];
      const out: Problem[] = [];
      const squashed = m.links.find((l) => {
        const rest = l.rest === undefined ? 0 : typeof l.rest === 'number' ? l.rest : sim.params[l.rest.param];
        return l.kind === 'spring' && shortestSpring(m, sim, l) < 0.1 * rest;
      });
      if (squashed) out.push({ line: squashed.line, message: 'this spring gets squashed to almost nothing (or passes through its own anchor), which a real spring cannot do. Start the mass nearer the rest length, use a longer rest, or a smaller swing.' });
      return out;
    }
  };
}
