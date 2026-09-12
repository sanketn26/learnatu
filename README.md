# Learnatu

**Learn to use apps and the internet safely. Free. No jargon.**

A bilingual (English + Hindi) static handbook built with MkDocs + Material + i18n.

## Local development

```bash
pip install -r requirements.txt
mkdocs serve
```

The language switcher (English / हिन्दी) works in local mode. Open http://127.0.0.1:8000.

## Build

```bash
mkdocs build --strict
```

Output goes to `site/` (git-ignored).

## Deployment

GitHub Actions builds and deploys to GitHub Pages on every push to `main`.

Custom domain: **learnatu.com**

After enabling Pages (Actions source) in repository Settings:
1. Set custom domain to `learnatu.com`
2. Check "Enforce HTTPS"

## Content maintenance

Monthly habit: update **one** situation page in both `docs/en/` and `docs/hi/`.
If the Hindi translation is not ready for a new page, leave a note at the top:

```
> English only for now. Hindi translation coming soon.
```

Never let the Hindi nav point at an empty file.

## Structure

```
docs/en/   — English pages
docs/hi/   — Hindi pages (mirror structure)
docs/CNAME — learnatu.com
```

## Separate from sanketn26.github.io

This site is a standalone project. It is not connected to sanketn26.github.io.
