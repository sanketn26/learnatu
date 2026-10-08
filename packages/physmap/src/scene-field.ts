import type { Run, Scene } from './scene.ts';
import { list, suggest, val } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { dim } from './units.ts';
import { WIDTH, arrow, f1, num, siLength, svgWrap } from './draw.ts';

/**
 * `scene field`: the field around point charges (electric) or point masses (gravity), as arrows, field lines and
 * shading for the potential, with a probe that reads the field at a point. Static: the sliders move the sources.
 * Electric and gravity are not mixed in one scene.
 */
const L = dim(1, 0, 0);
const CHARGE = dim(0, 0, 1, 1);
const MASS = dim(0, 1, 0);
const KEYWORDS = ['title', 'assume', 'param', 'predict', 'charge', 'mass', 'probe', 'show', 'window'];
const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
const K = 8.9875517923e9;
const G = 6.6743e-11;
type N = number | { param: string };
interface Source { id: string; line: number; at: [N, N]; strength: N }

const STYLE = `
.pm .pm-line{fill:none;stroke:var(--_ink);stroke-width:1.6;stroke-opacity:.7;stroke-linejoin:round}
.pm .pm-pot{stroke:none}
`;

export function parseField(ctx: Ctx, stmts: Statement[]): Scene | null {
  const { problem, args } = ctx;
  const charges: Source[] = [];
  const masses: Source[] = [];
  const probes: { id: string; line: number; at: [N, N] }[] = [];
  const shows = new Set<string>();
  let windowSize: N | undefined;

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'charge':
      case 'mass': {
        const electric = command === 'charge';
        const key = electric ? 'q' : 'm';
        const a = args(rest, ['at', key], line, command);
        const id = a.words[0];
        const list_ = electric ? charges : masses;
        if (!id || !ID.test(id)) { problem(line, `${command} needs a name: ${electric ? 'charge q1 at=(-1m,0m) q=2nC' : 'mass sun at=(0m,0m) m=2e30kg'}`); break; }
        if ([...charges, ...masses].some((s) => s.id === id)) { problem(line, `there is already a source called "${id}"`); break; }
        for (const need of ['at', key]) if (!a.props.has(need)) problem(line, `${command} "${id}" needs ${need}=…`);
        const at = a.props.has('at') ? ctx.vector(a.props.get('at')?.text as string, L, 'at', line) : null;
        const s = a.props.has(key) ? ctx.value(a.props.get(key)?.text as string, electric ? CHARGE : MASS, key, line) : null;
        if (!at || s === null) break;
        if (!electric && typeof s === 'number' && s <= 0) { problem(line, 'a mass must be above zero'); break; }
        list_.push({ id, line, at: at as [N, N], strength: s });
        break;
      }
      case 'probe': {
        const a = args(rest, ['at'], line, 'probe');
        const id = a.words[0];
        if (!id || !ID.test(id) || !a.props.has('at')) { problem(line, 'probe needs a name and a place: probe p at=(0.5m,1m)'); break; }
        const at = ctx.vector(a.props.get('at')?.text as string, L, 'at', line);
        if (at) probes.push({ id, line, at: at as [N, N] });
        break;
      }
      case 'show': {
        for (const t of rest) {
          if (!['lines', 'arrows', 'potential'].includes(t.text)) problem(line, `I can show "lines", "arrows" or "potential".${suggest(t.text, ['lines', 'arrows', 'potential'])}`);
          else shows.add(t.text);
        }
        if (!rest.length) problem(line, 'show needs lines, arrows or potential');
        break;
      }
      case 'window': {
        const v = rest[0] ? ctx.value(rest[0].text, L, 'window', line) : (problem(line, 'window needs a half-width: window 3m'), null);
        if (v !== null) windowSize = v;
        break;
      }
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  }
  const errors = ctx.problems.length;
  if (charges.length && masses.length) problem(charges[0].line, 'an electric scene (charges) and a gravity scene (masses) cannot be mixed. Use one kind of source.');
  if (!charges.length && !masses.length && !errors) problem(1, 'add a source: charge q1 at=(0m,0m) q=2nC, or mass m1 at=(0m,0m) m=1e24kg');
  if (charges.length + masses.length > 8) problem(1, 'at most 8 sources in one scene');
  if (ctx.problems.length) return null;
  if (!shows.size) { shows.add('lines'); shows.add('arrows'); }

  const electric = charges.length > 0;
  const sources = electric ? charges : masses;
  return {
    kind: 'field', title: ctx.title, assumptions: ctx.assumptions, params: [...ctx.params.values()], predicts: ctx.predicts, images: [], playSeconds: 0,
    run: (values) => fieldRun(ctx.title, electric, sources, probes, shows, windowSize, values)
  };
}

interface Pt { x: number; y: number; s: number }

function fieldRun(title: string | undefined, electric: boolean, sources: Source[], probes: { id: string; at: [N, N] }[], shows: Set<string>, windowSize: N | undefined, values: Record<string, number>): Run {
  const S: Pt[] = sources.map((s) => ({ x: val(s.at[0], values), y: val(s.at[1], values), s: val(s.strength, values) }));
  const ok = S.every((p) => [p.x, p.y, p.s].every(Number.isFinite)) && S.every((a, i) => S.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) > 0));
  const coupling = electric ? K : -G;               // gravity pulls towards the mass, so its "field" is negative of the sign of the source
  const fieldAt = (x: number, y: number): [number, number] => {
    let ex = 0, ey = 0;
    for (const p of S) {
      const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2);
      if (r < 1e-12) continue;
      const k = (coupling * p.s) / (r2 * r);
      ex += k * dx; ey += k * dy;
    }
    return [ex, ey];
  };
  const potentialAt = (x: number, y: number) => S.reduce((sum, p) => sum + (electric ? K : -G) * p.s / Math.max(Math.hypot(x - p.x, y - p.y), 1e-12), 0);

  // the window: a given half-width around the middle of the sources, or enough to hold them all with room
  const cx = S.reduce((a, p) => a + p.x, 0) / S.length, cy = S.reduce((a, p) => a + p.y, 0) / S.length;
  const spread = Math.max(...S.map((p) => Math.hypot(p.x - cx, p.y - cy)), 0);
  const probeReach = Math.max(0, ...probes.map((p) => Math.max(Math.abs(val(p.at[0], values) - cx), (Math.abs(val(p.at[1], values) - cy) * WIDTH) / 360)));
  const half = windowSize !== undefined ? val(windowSize, values) : Math.max(spread * 2.2, probeReach * 1.3, 1e-9) || 1;
  const wx0 = cx - half, wx1 = cx + half;
  const H = 360;
  const wy0 = cy - (half * H) / WIDTH, wy1 = cy + (half * H) / WIDTH;
  const scale = WIDTH / (2 * half);
  const X = (x: number) => (x - wx0) * scale;
  const Y = (y: number) => H - (y - wy0) * scale;
  const unit = electric ? 'N/C' : 'm/s²';

  const probeInfo = probes.map((p) => {
    const x = val(p.at[0], values), y = val(p.at[1], values);
    const [ex, ey] = fieldAt(x, y);
    return { id: p.id, x, y, ex, ey, mag: Math.hypot(ex, ey) };
  });
  const words = ok ? probeInfo.map((p) => `${p.id}: ${electric ? 'electric field' : 'gravitational field'} ${num(p.mag)} ${unit}, pointing ${num((Math.atan2(p.ey, p.ex) * 180) / Math.PI)}° from the x axis`).join('. ') : '';

  return {
    count: 1, ok, problem: ok ? undefined : 'Two sources are in the same place, or a number is not valid.',
    caption: () => [title, words].filter(Boolean).join('. '),
    clock: () => '',
    describe: () => `${electric ? 'Electric' : 'Gravitational'} field of ${S.length} source${S.length > 1 ? 's' : ''}. ${words}`,
    svg(_i, options) {
      let out = '';
      // shading for the potential: compressed so both near and far show
      if (shows.has('potential')) {
        const cell = 12, cols = Math.ceil(WIDTH / cell), rows = Math.ceil(H / cell);
        const LEVELS = 6;
        const pos: string[] = Array.from({ length: LEVELS }, () => ''), neg: string[] = Array.from({ length: LEVELS }, () => '');
        const vals: number[] = [];
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) vals.push(potentialAt(wx0 + ((i + 0.5) * cell) / scale, wy1 - ((j + 0.5) * cell) / scale));
        const ref = vals.map(Math.abs).sort((a, b) => a - b)[Math.floor(vals.length * 0.6)] || 1;
        vals.forEach((v, k) => {
          const level = Math.min(LEVELS, Math.floor(Math.asinh(Math.abs(v) / ref) * 1.6));
          if (level < 1) return;
          (v > 0 ? pos : neg)[level - 1] += `M${(k % cols) * cell} ${Math.floor(k / cols) * cell}h${cell}v${cell}h-${cell}z`;
        });
        const sign = electric ? 1 : -1;
        pos.forEach((d, l) => { if (d) out += `<path d="${d}" class="pm-pot" fill="var(--_${sign > 0 ? 2 : 1})" fill-opacity="${(0.06 + l * 0.07).toFixed(2)}" shape-rendering="crispEdges"/>`; });
        neg.forEach((d, l) => { if (d) out += `<path d="${d}" class="pm-pot" fill="var(--_${sign > 0 ? 1 : 2})" fill-opacity="${(0.06 + l * 0.07).toFixed(2)}" shape-rendering="crispEdges"/>`; });
      }
      // arrows on a grid: direction is exact, length is compressed so the strong field near a source does not hide the rest
      if (shows.has('arrows')) {
        const cols = 22, rows = Math.round((cols * H) / WIDTH);
        const samples: { x: number; y: number; ex: number; ey: number; m: number }[] = [];
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const x = wx0 + ((i + 0.5) / cols) * (wx1 - wx0), y = wy1 - ((j + 0.5) / rows) * (wy1 - wy0);
          if (S.some((p) => Math.hypot(p.x - x, p.y - y) * scale < 14)) continue;
          const [ex, ey] = fieldAt(x, y);
          samples.push({ x, y, ex, ey, m: Math.hypot(ex, ey) });
        }
        const sorted = samples.map((s) => s.m).sort((a, b) => a - b);
        const ref = sorted[Math.floor(sorted.length * 0.5)] || 1;
        for (const s of samples) {
          const len = 12 + 17 * Math.min(1, Math.log1p(s.m / ref) / Math.log1p(20));
          out += arrow(X(s.x) - ((s.ex / s.m) * len) / 2, Y(s.y) + ((s.ey / s.m) * len) / 2, (s.ex / s.m) * len, (-s.ey / s.m) * len, 'var(--_muted)', 5, 3);
        }
      }
      // field lines: start near the sources the field leaves (or arrives at), follow the field
      if (shows.has('lines')) {
        const leaving = electric ? S.filter((p) => p.s > 0) : [];
        const arriving = electric ? S.filter((p) => p.s < 0) : S;
        const strongest = Math.max(...S.map((p) => Math.abs(p.s)));
        const trace = (p: Pt, startAngle: number, dir: 1 | -1) => {
          const r0 = 10 / scale;
          let x = p.x + Math.cos(startAngle) * r0, y = p.y + Math.sin(startAngle) * r0;
          const pts: [number, number][] = [[X(x), Y(y)]];
          const ds = 4 / scale;
          for (let n = 0; n < 900; n++) {
            const step = (px: number, py: number): [number, number] | null => { const [ex, ey] = fieldAt(px, py); const m = Math.hypot(ex, ey); return m ? [(dir * ex) / m, (dir * ey) / m] : null; };
            const k1 = step(x, y); if (!k1) break;
            const k2 = step(x + (k1[0] * ds) / 2, y + (k1[1] * ds) / 2); if (!k2) break;
            x += k2[0] * ds; y += k2[1] * ds;
            pts.push([X(x), Y(y)]);
            if (x < wx0 - half || x > wx1 + half || y < wy0 - half || y > wy1 + half) break;
            if (S.some((q) => q !== p && Math.hypot(q.x - x, q.y - y) * scale < 7)) break;
            if (S.some((q) => q === p && n > 8 && Math.hypot(q.x - x, q.y - y) * scale < 7)) break;
          }
          const d = pts.map(([px, py], k) => `${k ? 'L' : 'M'}${f1(px)} ${f1(py)}`).join('');
          out += `<path d="${d}" class="pm-line"/>`;
          const mid = pts[Math.floor(pts.length / 2)], next = pts[Math.min(pts.length - 1, Math.floor(pts.length / 2) + 2)];
          if (next && mid) out += arrow(mid[0], mid[1], dir * (next[0] - mid[0]) * 3, dir * (next[1] - mid[1]) * 3, 'var(--_ink)', 7, 4);
        };
        const origins = leaving.length ? leaving : arriving;
        const dir: 1 | -1 = leaving.length ? 1 : -1;
        for (const p of origins) {
          const n = Math.max(6, Math.round((14 * Math.abs(p.s)) / strongest));
          for (let k = 0; k < n; k++) trace(p, (2 * Math.PI * (k + 0.5)) / n, dir);
        }
      }
      // sources
      S.forEach((p, i) => {
        const sign = electric ? (p.s > 0 ? 2 : 1) : 3;
        const r = electric ? 8 + 6 * Math.sqrt(Math.abs(p.s) / Math.max(...S.map((q) => Math.abs(q.s)))) : 8 + 7 * Math.sqrt(p.s / Math.max(...S.map((q) => q.s)));
        out += `<circle cx="${f1(X(p.x))}" cy="${f1(Y(p.y))}" r="${f1(r)}" class="pm-body" fill="var(--_${sign})"/>`;
        if (electric) out += `<text x="${f1(X(p.x))}" y="${f1(Y(p.y) + 5)}" class="pm-mid pm-label" fill="white">${p.s > 0 ? '+' : '−'}</text>`;
        out += `<text x="${f1(X(p.x) + r + 4)}" y="${f1(Y(p.y) - r)}" class="pm-name">${sources[i].id}</text>`;
      });
      // probes
      for (const p of probeInfo) {
        const px = X(p.x), py = Y(p.y);
        out += `<rect x="${f1(px - 5)}" y="${f1(py - 5)}" width="10" height="10" fill="var(--_card)" stroke="var(--_ink)" stroke-width="2"/>`;
        if (p.mag > 0) out += arrow(px, py, (p.ex / p.mag) * 46, (-p.ey / p.mag) * 46, 'var(--_4)', 9, 5);
        out += `<text x="${f1(px + 9)}" y="${f1(py - 8)}" class="pm-name">${p.id}: ${num(p.mag)} ${unit}</text>`;
      }
      out += `<g><line x1="20" x2="${f1(20 + nicePx(WIDTH * 0.2, scale))}" y1="${H - 14}" y2="${H - 14}" class="pm-scale"/><text x="20" y="${H - 20}">${siLength(nicePx(WIDTH * 0.2, scale) / scale)}</text></g>`;
      out += `<text x="${WIDTH - 12}" y="22" class="pm-clock">${electric ? 'electric field' : 'gravitational field'}</text>`;
      return svgWrap(out, H, `${electric ? 'Electric' : 'Gravitational'} field. ${words}`, STYLE, options?.idPrefix ?? 'pm');
    }
  };
}

/** A length in pixels that stands for a round number of metres. */
function nicePx(maxPx: number, scale: number): number {
  const m = maxPx / scale;
  const p = 10 ** Math.floor(Math.log10(m));
  const r = m / p;
  return (r >= 5 ? 5 : r >= 2 ? 2 : 1) * p * scale;
}
