/**
 * What the reader's code may use in render mode, written as TypeScript declarations so it is type-checked like
 * the rest. `canvas` is a small 2D drawing surface (its pixels are sent back to the page when the code finishes), and
 * `render` shows a piece of HTML. Neither can reach the page: only pixels and sanitised text cross back.
 */
export const RENDER_SHIM = [
  'interface Gradient { addColorStop(offset: number, color: string): void }',
  'interface Canvas2D {',
  '  fillStyle: string | Gradient; strokeStyle: string | Gradient; lineWidth: number; lineCap: string; lineJoin: string;',
  '  font: string; textAlign: string; textBaseline: string; globalAlpha: number; shadowBlur: number; shadowColor: string;',
  '  fillRect(x: number, y: number, w: number, h: number): void; strokeRect(x: number, y: number, w: number, h: number): void;',
  '  clearRect(x: number, y: number, w: number, h: number): void; rect(x: number, y: number, w: number, h: number): void;',
  '  beginPath(): void; closePath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;',
  '  arc(x: number, y: number, radius: number, start: number, end: number, counterClockwise?: boolean): void;',
  '  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number, counterClockwise?: boolean): void;',
  '  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;',
  '  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;',
  '  fill(): void; stroke(): void; clip(): void;',
  '  fillText(text: string, x: number, y: number, maxWidth?: number): void; strokeText(text: string, x: number, y: number, maxWidth?: number): void;',
  '  measureText(text: string): { width: number };',
  '  save(): void; restore(): void; translate(x: number, y: number): void; rotate(angle: number): void; scale(x: number, y: number): void;',
  '  setLineDash(segments: number[]): void;',
  '  createLinearGradient(x0: number, y0: number, x1: number, y1: number): Gradient;',
  '  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): Gradient;',
  '}',
  "declare var canvas: { readonly width: number; readonly height: number; getContext(type: '2d'): Canvas2D };",
  'declare function render(html: string): void;'
].join('\n');
