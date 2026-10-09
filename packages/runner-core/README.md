# @learnatu/runner-core

What the runnable-code packages ([pyrun](../pyrun/README.md), [tsrun](../tsrun/README.md)) share, so a new language is a
parser, a worker program and a few status words.

- **`Session`** (`session.ts`): one run at a time; a time limit that starts when the code starts *running* (loading the
  runtime has its own 90 s guard); a 200 000-character output cap; Stop; and `readMessage`, which checks every message from
  the sandbox for its exact shape (drawings: HTML at most 100 000 characters, an image exactly width x height x 4 bytes and at
  most 1 000 000 pixels). It talks through a `Channel`, so tests stand in for the iframe.
- **`sandboxDocument(spec)`** (`sandbox.ts`): the page inside the `sandbox="allow-scripts"` iframe, with its own
  Content-Security-Policy built from the origins the language names. See the file header for the three layers.
- **`mountRunner`** (`dom.ts`, import from `@learnatu/runner-core/dom`): the editor, Run/Stop/Reset, output, the error
  note, one hidden sandbox iframe per language per page, and (when a language asks for it) a picture area. Pixels go to a
  `<canvas>`; HTML goes through `sanitizeHtml` into a `sandbox=""` iframe that allows only inline styles and data images.

A language supplies: its option parser (`check` for the build), a worker program that answers `{type:'run', id, code, ...}`
with `status`, `out`, `render` and `done` messages, and a `SandboxSpec` (where its runtime comes from).
