# @learnatu/tsrun

Runnable TypeScript in a lesson. A ```` ```tsrun ```` block becomes an editor with **Run**, **Stop** and **Reset**. The
real TypeScript compiler runs in the reader's browser: it checks the types, shows mistakes with their line, turns the
code into JavaScript and runs it. Nothing is installed and nothing leaves the reader's device.

```tsrun
//@ title "Types catch mistakes"
const price: number = 120;
console.log(price * 2);
```

## The language

Lines at the very top starting with `//@` are options and are not shown as code. A `//@` line anywhere else is an
ordinary comment.

| Line | Meaning |
| --- | --- |
| `//@ title "Text"` | A heading above the editor |
| `//@ timeout N` | Seconds the code may run, 1 to 60 (default 10). Loading the compiler is not counted |
| `//@ typecheck off` | Skip type checking and just run (default `on`: a type mistake stops the run and is shown) |
| `//@ strict off` | Looser checking (no `noImplicitAny`, `strictNullChecks`...). Default `on` |
| `//@ readonly` | Run, but not edit |
| `//@ mode render` | Also get `render(html)` and a `canvas` (see below). Default `run` |
| `//@ size W H` | Render mode: the picture area and the canvas, each side 40 to 1000 px (default 600 300) |

In both modes: `console.log/info/warn/error/table` (shown like a terminal), `setTimeout`, `setInterval`, `queueMicrotask`,
`structuredClone`, `performance.now()` and top-level `await`. The run ends when the code has finished and no timer is
left. There is no `import`/`export`, DOM, `fetch` or files: it is one self-contained block.

### Render mode

```tsrun
//@ mode render
//@ size 300 120
const g = canvas.getContext("2d");
g.fillStyle = "#0b8f7a";
g.fillRect(20, 20, 120, 80);
render("<p style='font:600 18px system-ui'>Drawn and rendered</p>");
```

- `canvas.getContext("2d")` is a drawing surface (the common fill/stroke/path/text/transform methods are typed). When the
  code finishes, its pixels are sent back and shown below the editor.
- `render(html)` shows HTML or inline SVG. Calling it again replaces what was shown.

## How it is kept safe

Authors are not all trusted, and readers edit the code. The code never runs on the lesson page:

1. **Opaque origin.** One hidden `<iframe sandbox="allow-scripts">` per page (never `allow-same-origin`): no cookies, no
   storage, no access to the lesson page or the site's API.
2. **Its own Content-Security-Policy:** scripts and requests only to the address the compiler comes from. Any other
   address is refused (checked: `XMLHttpRequest` to other sites and to the page's own origin is blocked).
3. **Workers.** The compiler runs in a worker; each run executes in a *fresh nested worker*, so nothing carries over
   between runs, the page never freezes, and Stop/timeout/too much output throws the workers away.
4. **Drawings are inert.** Only text and raw RGBA pixels cross back to the page, and both are validated (HTML at most
   100 000 characters; an image must be exactly width x height x 4 bytes, at most 1 000 000 pixels). Pixels go to a
   `<canvas>`. HTML is sanitised (no `script`, `meta`, `form`, frames, event handlers or addresses other than `#id` and
   inline images), then shown in a **second iframe with `sandbox=""`** (no scripts, no forms, no navigation, no
   same-origin) whose policy allows only inline styles and `data:` images.

Verified in headless Chrome: a render block containing `<script>`, `onerror`, `onclick`, `<meta http-equiv=refresh>`,
a form, a link and an external background image produced no script run, no dialog, no change to the page, and none of
those elements survived.

Not covered: memory (a program that allocates without end can crash its worker; it is reported as "crashed").

## Use it

```ts
import { parse, check } from '@learnatu/tsrun';
check(text);                       // [] or [{ line, message }]  (used by the build and the upload check)
import { mountTsrun } from '@learnatu/tsrun/dom';
mountTsrun(element, text);         // the editor; the compiler downloads on the first Run (about 1.5 MB)
```

`mountTsrun` takes `{ typescriptBase }` to load the compiler from your own address (it must end in `/` and contain
`typescript.js` and the `lib.*.d.ts` files). The version is `TYPESCRIPT_VERSION` in `src/types.ts` (5.x: the 7.x line
is the native port and has a different JavaScript API).

## How it is organised

The run/sandbox/editor machinery is shared with `@learnatu/pyrun` in `@learnatu/runner-core`.

| File | What it does |
| --- | --- |
| `parse.ts` | Reads the `//@` options; `check` |
| `worker-source.ts` | The worker (text): loads the compiler, type-checks, compiles, runs in a nested worker, maps errors back to the reader's lines with the source map |
| `runtime-source.ts` | What runs first in the nested worker: `console`, timers, `render`, `canvas`, finish detection |
| `render-shim.ts` | The TypeScript declarations for `render` and `canvas` (render mode only) |
| `sandbox.ts`, `dom.ts` | The sandbox spec, and the editor setup |

Tests use the real compiler from `node_modules` (libs read locally) with a stand-in for the nested worker. Why a
*classic* nested worker: a module worker made from a blob does not start inside the sandbox's opaque origin (found in
Chrome); the code is wrapped in an async function instead, which keeps top-level `await`.
