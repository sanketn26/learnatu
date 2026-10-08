# Learnatu

**Use AI confidently. Stay safe online. Free. No jargon.**

A multilingual, mobile-first learning site built with Astro. Content is organized publicly by topic, with profession and life-stage pages acting as curated learning paths.

## What this is

A learning platform: free and paid courses written in Markdown, with in-lesson quizzes, Google sign-in, per-learner progress and Razorpay / Stripe checkout. Astro (SSR) on Cloudflare Workers with a D1 database.

- **Every course page requires sign-in** (free or paid). Paid courses also require a verified purchase.
- **Authors write courses as Markdown** in `content/courses/`. See [content/README.md](content/README.md) for the format, including the quiz syntax.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in Google (and optionally payment) credentials
npm run db:migrate               # creates the local D1 database
npm run dev                      # http://localhost:4321
```

Google OAuth: create a *Web application* client at <https://console.cloud.google.com/apis/credentials> with the redirect URI `http://localhost:4321/api/auth/callback` (and `https://learnatu.com/api/auth/callback` for production).

Set `ADMIN_EMAILS` to your Google email to unlock **preview mode**: `/author/` lists every course (including drafts) and you can open any lesson without enrolling or paying.

## Creating a course

```bash
npm run course:new -- my-course        # scaffold (draft) from the sample course; add --free for a free one
npm run course:validate                # checks course.md, lesson files and every quiz
```

Preview it at `/author/`, then set `status: published` in `course.md` and push. Publishing = commit and deploy.

## Tests, build, deploy

```bash
npm test             # all tests in tests/ (plain JavaScript, no setup)
npm run build        # type-check + build
npm run deploy       # build, then wrangler deploy
```

First deploy: `npx wrangler d1 create learnatu`, put the id in `wrangler.jsonc`, `npm run db:migrate:remote`, then `npx wrangler secret put <NAME>` for each variable in `.dev.vars.example`. Webhooks: Razorpay → `/api/webhooks/razorpay` (`payment.captured`), Stripe → `/api/webhooks/stripe` (`checkout.session.completed`).

## Code map

```text
src/lib/auth/      Google OAuth, sessions, author role
src/lib/db/        one small module per table (users, sessions, enrollments, progress, orders)
src/lib/courses/   catalog (reads content/), access-rules (who may read), format, pricing, page loaders
src/lib/lang*.ts   language: lang-rules (pure), lang (cookie + request wiring)
src/lib/paths.ts   safeLocalPath: the one check for "stay on this site" redirects
src/lib/payments/  razorpay.ts, stripe.ts, fulfil.ts (idempotent enrol-after-payment)
src/lib/http.ts    api()/authedApi() wrappers: auth, JSON errors, request-id logging
src/lib/log.ts     structured logs; set DEBUG=1 for debug lines
src/pages/api/     thin route handlers
```

## How the code is kept testable

Decisions live in small **pure** files that import nothing from Astro or the database, so a test can load
them directly: `courses/access-rules.ts`, `courses/format.ts`, `courses/pricing.ts`, `lang-rules.ts`,
`paths.ts`, `quiz-grade.ts`, `crypto.ts`, `content-routes.mjs`. The wrappers around them (`access.ts`,
`lang.ts`, pages, API routes) only gather facts (cookies, database rows) and call the pure function.
When you add a rule, put it in a pure file and add a test beside the others.

A test is a plain `.mjs` file in `tests/`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLocalPath } from '../src/lib/paths.ts';

test('blocks other sites', () => {
  assert.equal(safeLocalPath('//evil.com', '/'), '/');
});
```

Keep imports inside pure files to other pure files with the `.ts`/`.mjs` extension, or to nothing at all.

## Languages

Pages have one URL for every language. There is no language menu: `src/middleware.ts` picks the language from the browser's `Accept-Language` header into `Astro.locals.lang`. A `lang` cookie overrides it (`/api/lang?set=hi&next=/path/` sets it). Old prefixed URLs such as `/hi/courses/` redirect to the unprefixed page and set the cookie. Pages that depend on the language are rendered on demand (`prerender = false`).

Languages: English (default), Hindi, Odia, Tamil, Telugu, Kannada, Bengali. English and Hindi have reviewed lesson content. The other languages currently provide localized navigation and clearly labelled English lesson fallbacks until each translation is reviewed.

## Content

```text
content/courses/  courses and lessons (the platform)
docs/             library pages: safety guides, help, pathways
```

Lessons that moved into courses keep working at their old URLs through redirects (`src/data/legacy-redirects.json`). Hindi lessons live beside English ones; other languages fall back to English until translated.
