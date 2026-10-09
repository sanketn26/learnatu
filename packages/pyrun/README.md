# @learnatu/pyrun

Runnable Python in a lesson. A ```` ```pyrun ```` block becomes an editor with **Run**, **Stop** and **Reset**. The code
runs on the reader's own device with [Pyodide](https://pyodide.org) (Python compiled to WebAssembly), so there is no
server to run, no cost per run, and nothing the reader types leaves their browser.

```pyrun
#@ title "Squares"
#@ timeout 5
for n in range(5):
    print(n, n * n)
```

## The language

Lines at the very top starting with `#@` are options and are not shown as code. A `#@` line anywhere else is an
ordinary Python comment.

| Line | Meaning |
| --- | --- |
| `#@ title "Text"` | A heading above the editor |
| `#@ timeout N` | Seconds the code may run, 1 to 60 (default 10). Loading Python and packages is not counted |
| `#@ packages a b` | Load packages first. Only `numpy pandas scipy sympy networkx`, always from the Pyodide CDN, never PyPI |
| `#@ stdin "a" "b"` | The lines `input()` receives, in order (up to 50). With none, `input()` raises `EOFError` |
| `#@ readonly` | Run, but not edit |
| `#@ shared` | Run in one namespace shared by every `shared` block on the page, like notebook cells. Otherwise each run starts clean |

Limits: 20 000 characters of code, 200 000 characters of output (then the run is stopped).

## How it is kept safe

A lesson's code is written by an author and edited by a reader, and authors are not all trusted. Three layers:

1. **Opaque origin.** Each page gets one hidden `<iframe sandbox="allow-scripts">` (never `allow-same-origin`). Code in it
   has no cookies, no storage, no access to the lesson page, and cannot call the site's API as the reader.
2. **Its own Content-Security-Policy.** The frame's page allows scripts and data only from the Pyodide address and its
   own blob worker (`default-src 'none'`). Python's `fetch`/`XMLHttpRequest` to any other address is refused.
3. **A worker.** Python runs in a Web Worker, so the page never freezes. On timeout, Stop, too much output or a crash,
   the worker is terminated and a fresh one starts on the next run (this also clears `shared` variables).

Everything coming back from the frame is checked for its exact shape before use and shown with `textContent` only.
Verified in headless Chrome: origin is `null`, no `document`, requests to other sites and to the page's own origin
are blocked, `while True: pass` stops at the time limit, and Python comes back after a kill.

Not covered: memory. A program that allocates without end can crash its own worker (reported as "crashed"); it
cannot reach anything else.

## Use it

```ts
import { parse, check } from '@learnatu/pyrun';
check(text);                       // [] or [{ line, message }]  (used by the build and the upload check)
import { mountPyrun } from '@learnatu/pyrun/dom';
mountPyrun(element, text);         // the editor; Python downloads on the first Run
```

`mountPyrun` takes `{ pyodideBase }` to load Pyodide from your own address (it must end in `/`). The version is
`PYODIDE_VERSION` in `src/types.ts`.

## How it is organised

| File | What it does | Needs a browser |
| --- | --- | --- |
| `parse.ts` | Reads the `#@` options; `check` | no |
| `session.ts` | One run at a time, time limit, output cap, ignoring old or malformed messages | no |
| `worker-source.ts` | The worker program (text): loads Pyodide, runs code, reports output and errors with the line | no |
| `sandbox.ts` | The page inside the iframe, with its Content-Security-Policy | no |
| `dom.ts` | The editor, buttons and the one shared iframe | yes |

Tests cover all but `dom.ts`. To also run the worker against real Python:
`PYRUN_PYODIDE=/path/to/node_modules/pyodide npm test`.
