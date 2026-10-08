import type { Run, Scene } from './scene.ts';
import { NONE, list, suggest, val } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { dim } from './units.ts';
import { WIDTH, arrow, f1, makePlot, num, siLength, svgWrap } from './draw.ts';

/**
 * `scene ray`: geometric optics.
 *   Imaging: an object in front of one thin lens or one mirror. The three principal rays are traced, and the image
 *     they form is drawn and described (real or virtual, upright or inverted, bigger or smaller).
 *   Refraction: one beam crossing a boundary between two materials (Snell's law, total internal reflection).
 * Rays are straight lines. Waves, diffraction and colour spreading are not part of this scene (see `scene wave`).
 */
const L = dim(1, 0, 0);
const KEYWORDS = ['title', 'assume', 'param', 'predict', 'object', 'lens', 'mirror', 'screen', 'beam'];
type N = number | { param: string };

interface Element { kind: 'lens' | 'mirror'; line: number; at: N; f: N; aperture?: N }
interface Obj { line: number; at: N; height: N }
interface Beam { line: number; angle: N; n1: N; n2: N }

const STYLE = `
.pm .pm-ray{fill:none;stroke-width:2.2;stroke-linecap:round}
.pm .pm-virtual{stroke-dasharray:6 5;stroke-opacity:.8}
.pm .pm-lens{fill:color-mix(in srgb,var(--_1) 12%,transparent);stroke:var(--_1);stroke-width:2.4}
.pm .pm-mirror{fill:none;stroke:var(--_ink);stroke-width:4;stroke-linecap:round}
.pm .pm-medium{fill:color-mix(in srgb,var(--_1) 14%,transparent)}
.pm .pm-angle{fill:none;stroke:var(--_muted);stroke-width:1.5}
`;

export function parseRay(ctx: Ctx, stmts: Statement[]): Scene | null {
  const { problem, args } = ctx;
  let object: Obj | undefined;
  let element: Element | undefined;
  let screenAt: N | undefined;
  let beam: Beam | undefined;

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'object': {
        const a = args(rest, ['at', 'height'], line, 'object');
        if (object) { problem(line, 'only one object'); break; }
        for (const need of ['at', 'height']) if (!a.props.has(need)) problem(line, `object needs ${need}=… (for example object at=-20cm height=3cm)`);
        const at = a.props.has('at') ? ctx.value(a.props.get('at')?.text as string, L, 'at', line) : null;
        const height = a.props.has('height') ? ctx.value(a.props.get('height')?.text as string, L, 'height', line) : null;
        if (at !== null && height !== null) object = { line, at, height };
        break;
      }
      case 'lens':
      case 'mirror': {
        const a = args(rest, ['at', 'f', 'height'], line, command);
        if (element) { problem(line, 'one lens or one mirror per scene'); break; }
        for (const need of ['at', 'f']) if (!a.props.has(need)) problem(line, `${command} needs ${need}=… (for example ${command} at=0cm f=8cm)`);
        const at = a.props.has('at') ? ctx.value(a.props.get('at')?.text as string, L, 'at', line) : null;
        const f = a.props.has('f') ? ctx.value(a.props.get('f')?.text as string, L, 'f', line) : null;
        const ap = a.props.has('height') ? ctx.value(a.props.get('height')?.text as string, L, 'height', line) : undefined;
        if (at !== null && f !== null && ap !== null) element = { kind: command, line, at, f, aperture: ap };
        break;
      }
      case 'screen': {
        const a = args(rest, ['at'], line, 'screen');
        const at = a.props.has('at') ? ctx.value(a.props.get('at')?.text as string, L, 'at', line) : (problem(line, 'screen needs a position: screen at=24cm'), null);
        if (at !== null) screenAt = at;
        break;
      }
      case 'beam': {
        const a = args(rest, ['angle', 'n1', 'n2'], line, 'beam');
        if (beam) { problem(line, 'only one beam'); break; }
        for (const need of ['angle', 'n1', 'n2']) if (!a.props.has(need)) problem(line, `beam needs ${need}=… (for example beam angle=40deg n1=1 n2=1.5)`);
        const angle = a.props.has('angle') ? ctx.value(a.props.get('angle')?.text as string, NONE, 'angle', line, true) : null;
        const n1 = a.props.has('n1') ? ctx.value(a.props.get('n1')?.text as string, NONE, 'n1', line) : null;
        const n2 = a.props.has('n2') ? ctx.value(a.props.get('n2')?.text as string, NONE, 'n2', line) : null;
        for (const [name, v] of [['n1', n1], ['n2', n2]] as const) if (typeof v === 'number' && v < 1) problem(line, `${name} is a refractive index, which is 1 or more (1 for vacuum, 1.33 for water, 1.5 for glass)`);
        if (angle !== null && n1 !== null && n2 !== null) beam = { line, angle, n1, n2 };
        break;
      }
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  }

  const errors = ctx.problems.length;
  if (beam && (object || element || screenAt !== undefined)) problem(beam.line, 'a ray scene is either an object with a lens or mirror, or a beam crossing a boundary, not both');
  if (!beam && !errors) {
    if (!object) problem(1, 'add an object: object at=-20cm height=3cm');
    if (!element) problem(1, 'add a lens or a mirror: lens at=0cm f=8cm');
    if (object && element && typeof object.at === 'number' && typeof element.at === 'number' && object.at >= element.at) problem(object.line, 'the object must be in front of the lens or mirror: give it a smaller (more negative) position than the lens');
    if (element && typeof element.f === 'number' && element.f === 0) problem(element.line, 'f cannot be zero');
    if (object && typeof object.height === 'number' && object.height <= 0) problem(object.line, 'the object height must be above zero');
  }
  if (ctx.problems.length) return null;

  const base = { kind: 'ray' as const, title: ctx.title, assumptions: ctx.assumptions, params: [...ctx.params.values()], predicts: ctx.predicts, images: [], playSeconds: 0 };
  if (beam) return { ...base, run: (values) => beamRun(ctx.title, beam as Beam, values) };
  return { ...base, run: (values) => imagingRun(ctx.title, object as Obj, element as Element, screenAt, values) };
}

// ---------- imaging ----------

function imagingRun(title: string | undefined, obj: Obj, el: Element, screenAt: N | undefined, values: Record<string, number>): Run {
  const xo = val(obj.at, values), h = val(obj.height, values), e = val(el.at, values), f = val(el.f, values);
  const mirror = el.kind === 'mirror';
  const u = e - xo;
  const ok = [xo, h, e, f].every(Number.isFinite) && u > 0 && h > 0 && f !== 0;
  const inv = 1 / f - 1 / u;
  const atInfinity = Math.abs(inv) < 1e-9 / Math.max(Math.abs(f), 1e-9);
  const v = atInfinity ? Infinity : 1 / inv;                 // positive: real image
  const m = atInfinity ? 0 : -v / u;
  const xi = mirror ? e - v : e + v;
  const hi = m * h;
  const nature = atInfinity ? 'The image is at infinity: the rays leave parallel.' :
    `The image is ${v > 0 ? 'real' : 'virtual'}, ${m < 0 ? 'inverted' : 'upright'}, ${Math.abs(m) > 1.02 ? `magnified ×${num(Math.abs(m))}` : Math.abs(m) < 0.98 ? `reduced ×${num(Math.abs(m))}` : 'the same size'}, ${siLength(Math.abs(v))} ${mirror ? (v > 0 ? 'in front of the mirror' : 'behind the mirror') : (v > 0 ? 'beyond the lens' : 'on the object side')}.`;
  const kind = mirror ? (f > 0 ? 'concave mirror' : 'convex mirror') : (f > 0 ? 'converging lens' : 'diverging lens');
  const far = !atInfinity && Math.abs(xi - e) > 6 * Math.max(Math.abs(f), u);

  return {
    count: 1, ok, problem: ok ? undefined : 'The object must be in front of the lens or mirror, with a height above zero.',
    caption: () => `${title ? `${title}. ` : ''}${kind}, f = ${siLength(f)}, object ${siLength(u)} away. ${far ? 'The image is very far away.' : nature}`,
    clock: () => '',
    describe: () => `${kind}, focal length ${siLength(f)}, object ${siLength(u)} from it. ${nature}`,
    svg(_i, options) {
      const sx = screenAt === undefined ? undefined : val(screenAt, values);
      const xs = [xo, e, e + f, e - f, e + 2 * f, e - 2 * f, ...(far || atInfinity ? [] : [xi]), ...(sx === undefined ? [] : [sx])];
      let x0 = Math.min(...xs), x1 = Math.max(...xs);
      const span0 = x1 - x0;
      x0 -= span0 * 0.08; x1 += span0 * 0.08;
      const yMax = Math.max(Math.abs(h) * 1.5, far || atInfinity ? 0 : Math.abs(hi) * 1.3, Math.abs(f) * 0.35, el.aperture !== undefined ? val(el.aperture, values) / 2 : 0) || 1;
      const H = 300, M = 24;
      const scale = Math.min((WIDTH - 2 * M) / (x1 - x0), (H - 2 * M) / (2 * yMax));
      const ox = (WIDTH - (x1 - x0) * scale) / 2;
      const X = (x: number) => ox + (x - x0) * scale;
      const Y = (y: number) => H / 2 - y * scale;
      const ap = el.aperture !== undefined ? val(el.aperture, values) / 2 : yMax * 0.92;
      let out = `<line x1="${M / 2}" x2="${WIDTH - M / 2}" y1="${Y(0)}" y2="${Y(0)}" class="pm-thin" stroke-dasharray="2 5"/>`;

      // the lens or mirror
      if (mirror) {
        const bulge = Math.min(26, ap * scale * 0.18) * (f > 0 ? -1 : 1);
        out += `<path d="M${f1(X(e))} ${f1(Y(ap))}Q${f1(X(e) + bulge * 1.9)} ${f1(Y(0))} ${f1(X(e))} ${f1(Y(-ap))}" class="pm-mirror"/>`;
      } else {
        const bulge = f > 0 ? 9 : -9;
        out += `<path d="M${f1(X(e))} ${f1(Y(ap))}Q${f1(X(e) + bulge * 2)} ${f1(Y(0))} ${f1(X(e))} ${f1(Y(-ap))}Q${f1(X(e) - bulge * 2)} ${f1(Y(0))} ${f1(X(e))} ${f1(Y(ap))}Z" class="pm-lens"/>`;
        out += `<path d="M${f1(X(e))} ${f1(Y(ap))}l${f > 0 ? -6 : 6} 8M${f1(X(e))} ${f1(Y(ap))}l${f > 0 ? 6 : -6} 8M${f1(X(e))} ${f1(Y(-ap))}l${f > 0 ? -6 : 6} -8M${f1(X(e))} ${f1(Y(-ap))}l${f > 0 ? 6 : -6} -8" class="pm-ink"/>`;
      }
      // focal points
      const marks: [number, string][] = mirror ? [[e - f, 'F'], [e - 2 * f, '2F']] : [[e + f, 'F'], [e - f, 'F'], [e + 2 * f, '2F'], [e - 2 * f, '2F']];
      for (const [x, name] of marks) out += `<circle cx="${f1(X(x))}" cy="${Y(0)}" r="3" fill="var(--_ink)"/><text x="${f1(X(x))}" y="${Y(0) + 17}" class="pm-mid">${name}</text>`;

      // the three principal rays, drawn as lines over [from, to] in x; solid when the light is really there
      const seg = (xa: number, ya: number, xb: number, yb: number, colourVar: string, virtual = false) =>
        `<line x1="${f1(X(xa))}" y1="${f1(Y(ya))}" x2="${f1(X(xb))}" y2="${f1(Y(yb))}" class="pm-ray${virtual ? ' pm-virtual' : ''}" stroke="${colourVar}"/>`;
      const y3 = (h * f) / (xo - e + f);                       // where the ray aimed at the focus meets the element
      const after: { y: (x: number) => number; colour: string }[] = [];
      if (mirror) {
        after.push({ y: (x) => h - (h / f) * (e - x), colour: 'var(--_2)' });                // parallel in → through F out
        after.push({ y: (x) => (-h * (e - x)) / (e - xo), colour: 'var(--_3)' });             // to the vertex, mirrored
        after.push({ y: () => y3, colour: 'var(--_4)' });                                     // through F in → parallel out
      } else {
        after.push({ y: (x) => h - (h / f) * (x - e), colour: 'var(--_2)' });
        after.push({ y: (x) => (-h * (x - e)) / (e - xo), colour: 'var(--_3)' });
        after.push({ y: () => y3, colour: 'var(--_4)' });
      }
      const heights = [h, 0, y3];
      const reach = mirror ? x0 : x1;
      after.forEach((r, k) => {
        out += seg(xo, h, e, heights[k] === 0 && k === 1 ? 0 : heights[k], r.colour);        // incoming ray, object tip to the element
        if (k === 1) { /* the ray through the centre goes straight on for a lens; a mirror reflects it */ }
        out += seg(e, r.y(e), reach, r.y(reach), r.colour);                                  // outgoing ray
        if (!atInfinity && v < 0) {                                                          // virtual: the lines meet behind
          const back = mirror ? x1 : x0;
          out += seg(e, r.y(e), Math.min(Math.max(xi, Math.min(x0, back)), Math.max(x1, back)), r.y(xi), r.colour, true);
        }
      });

      // object and image
      out += arrow(X(xo), Y(0), 0, -h * scale, 'var(--_ink)', 9, 5);
      out += `<text x="${f1(X(xo))}" y="${f1(Y(-0.02))}" class="pm-mid" dy="16">object</text>`;
      if (!far && !atInfinity) {
        const live = v > 0;
        out += `<g opacity="${live ? 1 : 0.75}" ${live ? '' : 'stroke-dasharray="5 4"'}>${arrow(X(xi), Y(0), 0, -hi * scale, 'var(--_1)', 9, 5)}</g>`;
        out += `<text x="${f1(X(xi))}" y="${f1(Y(0)) + (hi > 0 ? -hi * scale + 16 : 18)}" class="pm-mid pm-label" fill="var(--_1)">${live ? 'real' : 'virtual'} image</text>`;
      }
      if (sx !== undefined) out += `<line x1="${f1(X(sx))}" x2="${f1(X(sx))}" y1="${Y(yMax * 0.85)}" y2="${Y(-yMax * 0.85)}" stroke="var(--_ink)" stroke-width="3"/><text x="${f1(X(sx))}" y="${Y(yMax * 0.85) - 6}" class="pm-mid">screen</text>`;
      out += `<text x="${WIDTH - 12}" y="20" class="pm-clock">${kind}, f = ${siLength(f)}</text>`;
      return svgWrap(out, H, `${kind}. ${nature}`, STYLE, options?.idPrefix ?? 'pm');
    }
  };
}

// ---------- refraction ----------

function beamRun(title: string | undefined, beam: Beam, values: Record<string, number>): Run {
  const a1 = val(beam.angle, values), n1 = val(beam.n1, values), n2 = val(beam.n2, values);
  const ok = [a1, n1, n2].every(Number.isFinite) && a1 >= 0 && a1 < Math.PI / 2 && n1 >= 1 && n2 >= 1;
  const s2 = (n1 * Math.sin(a1)) / n2;
  const total = s2 > 1;
  const a2 = total ? NaN : Math.asin(s2);
  const critical = n1 > n2 ? Math.asin(n2 / n1) : undefined;
  const deg = (r: number) => `${num((r * 180) / Math.PI)}°`;
  const text = total
    ? `Total internal reflection: ${deg(a1)} is past the critical angle (${deg(critical as number)}), so all the light stays in the first material.`
    : `Snell's law: ${num(n1)} × sin ${deg(a1)} = ${num(n2)} × sin ${deg(a2)}. The beam ${n2 > n1 ? 'bends towards' : n2 < n1 ? 'bends away from' : 'does not bend at'} the normal.${critical !== undefined ? ` Critical angle ${deg(critical)}.` : ''}`;
  // angle of refraction against angle of incidence, with the present beam marked
  const xs: number[] = [], ys: number[] = [];
  for (let d = 0; d <= 89.5; d += 0.5) {
    const s = (n1 * Math.sin((d * Math.PI) / 180)) / n2;
    if (s <= 1) { xs.push(d); ys.push((Math.asin(s) * 180) / Math.PI); }
  }
  const plot = ok ? makePlot({ top: 270, height: 150, unit: 'degrees', yFrom: 0, yTo: 90, xFrom: 0, xTo: 90, xFromLabel: '0° incidence', xToLabel: '90°', series: [{ name: 'angle of refraction', xs, ys }] }) : undefined;
  return {
    count: 1, ok, problem: ok ? undefined : 'The angle must be from 0° to just under 90°, and each refractive index must be 1 or more.',
    caption: () => `${title ? `${title}. ` : ''}${text}`,
    clock: () => '',
    describe: () => text,
    svg(_i, options) {
      const cx = 360, cy = 130, R = 110;
      let out = `<rect x="0" y="${cy}" width="${WIDTH}" height="140" class="pm-medium" fill-opacity="${Math.min(0.5, 0.1 + (n2 - 1) * 0.15).toFixed(2)}"/>`;
      out += `<line x1="0" x2="${WIDTH}" y1="${cy}" y2="${cy}" class="pm-ink"/><line x1="${cx}" x2="${cx}" y1="${cy - 118}" y2="${cy + 130}" class="pm-thin" stroke-dasharray="5 5"/>`;
      out += `<text x="14" y="${cy - 10}" class="pm-label">n = ${num(n1)}</text><text x="14" y="${cy + 22}" class="pm-label">n = ${num(n2)}</text>`;
      const px = (r: number, ang: number, dir: number) => [cx + dir * r * Math.sin(ang), cy - r * Math.cos(ang)] as const;
      const [ix, iy] = px(R + 20, a1, -1);
      out += `<line x1="${f1(ix)}" y1="${f1(iy)}" x2="${cx}" y2="${cy}" class="pm-ray" stroke="var(--_2)"/>`;
      out += arrow((ix + cx) / 2, (iy + cy) / 2, (cx - ix) * 0.1, (cy - iy) * 0.1, 'var(--_2)', 9, 5);
      const [rx, ry] = px(R, a1, 1);
      out += `<line x1="${cx}" y1="${cy}" x2="${f1(rx)}" y2="${f1(ry)}" class="pm-ray" stroke="var(--_2)" stroke-opacity="${total ? 1 : 0.3}"/>`;
      if (!total) { const tx = cx + (R + 10) * Math.sin(a2), ty = cy + (R + 10) * Math.cos(a2); out += `<line x1="${cx}" y1="${cy}" x2="${f1(tx)}" y2="${f1(ty)}" class="pm-ray" stroke="var(--_1)"/>${arrow((cx + tx) / 2, (cy + ty) / 2, (tx - cx) * 0.1, (ty - cy) * 0.1, 'var(--_1)', 9, 5)}`; }
      const arc = (r: number, from: number, to: number, down: boolean, dir: number) => {
        const [sx, sy] = down ? [cx + dir * r * Math.sin(from), cy + r * Math.cos(from)] : [cx + dir * r * Math.sin(from), cy - r * Math.cos(from)];
        const [ex, ey] = down ? [cx + dir * r * Math.sin(to), cy + r * Math.cos(to)] : [cx + dir * r * Math.sin(to), cy - r * Math.cos(to)];
        return `<path d="M${f1(sx)} ${f1(sy)}A${r} ${r} 0 0 ${(down ? dir > 0 : dir < 0) ? 0 : 1} ${f1(ex)} ${f1(ey)}" class="pm-angle"/>`;
      };
      out += arc(34, 0, a1, false, -1) + `<text x="${cx - 62}" y="${cy - 52}" class="pm-label">${deg(a1)}</text>`;
      if (!total) out += arc(40, 0, a2, true, 1) + `<text x="${cx + 48}" y="${cy + 66}" class="pm-label" fill="var(--_1)">${deg(a2)}</text>`;
      if (total) out += `<text x="${cx + 70}" y="${cy + 70}" class="pm-label" fill="var(--_2)">total internal reflection</text>`;
      if (plot) {
        out += plot.svg + (total ? '' : plot.cursor((a1 * 180) / Math.PI, [(a2 * 180) / Math.PI]));
        if (total) out += `<text x="${WIDTH - 20}" y="296" class="pm-end pm-soft">this angle is past the critical angle: no refracted beam</text>`;
      }
      return svgWrap(out, 270 + 150, text, STYLE, options?.idPrefix ?? 'pm');
    }
  };
}
