# Learnatu

**Use AI confidently. Stay safe online. Free. No jargon.**

A multilingual, mobile-first learning site built with Astro. Content is organized publicly by topic, with profession and life-stage pages acting as curated learning paths.

## Run locally

Install dependencies once:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open <http://localhost:4321>.

## Build and preview

```bash
npm run build
npm run preview
```

The static production site is written to `dist/`.

## Deployment

GitHub Actions builds and deploys the site to GitHub Pages on every push to `main`. The custom domain is **learnatu.com**.

In the repository's Pages settings, use **GitHub Actions** as the source and enable **Enforce HTTPS**.

## Languages

- English: `/`
- Hindi: `/hi/`
- Odia: `/or/`
- Tamil: `/ta/`
- Telugu: `/te/`
- Kannada: `/kn/`
- Bengali: `/bn/`

English and Hindi have reviewed lesson content. The other language routes currently provide localized navigation and clearly labelled English lesson fallbacks until each translation is reviewed.

## Content and routes

```text
docs/en/  English lessons
docs/hi/  Hindi lessons with the same relative paths
```

The published hierarchy is topic-first:

```text
/learn/    AI skills and responsible use
/safety/   Accounts, money, privacy, scams, and devices
/guides/   Curated paths for professions and everyday life
/help/     Immediate steps after a mistake
```

The homepage leads with four progress-tracked foundation courses: AI Confidence, Online Safety Essentials, Money Confidence, and Financial Fraud Defence. “Apply it” then offers grouped pathways for home, work, learning and career, and software and technology roles.

Published routes are defined centrally in `src/lib/content-routes.mjs`. Old MkDocs URLs are not generated or redirected.
