# Writing courses

Everything a course author controls lives under `content/courses/`. No code changes are needed.

```text
content/courses/<course>/
  course.md          settings (front matter) + "About this course" (body)
  en/<lesson>.md     one file per lesson, English (required)
  hi/<lesson>.md     translation (optional — missing lessons fall back to English)
```

## `course.md`

```markdown
---
title: Money Confidence
icon: ₹
category: money     # the subject this course is filed under (see src/data/categories.ts)
summary: One or two sentences shown on cards and the landing page.
outcome: "I can make a basic money plan…"     # optional "what you will be able to say"
level: Beginner
status: published        # draft = hidden from catalog and 404 in production
featured: true           # shown first on the home page
order: 10                # lower first
accent: "#087f6b"        # optional cover colour
tags: [money, beginner]
prerequisites: [A bank account]
price: { inr: 499, usd: 9 }   # major units. Omit entirely for a FREE course.
i18n:
  hi: { title: …, summary: …, outcome: … }    # optional overrides per language
modules:
  - title: Basics
    lessons: [understand-your-money, simple-budget]   # lesson file names, no .md
---

Markdown body: the **About this course** section. Headings, lists, links, images.
```

**Pricing and access.** `price.inr` is sold through Razorpay, `price.usd` through Stripe; set one or both.
Free courses can be read by anyone; signing in and enrolling (one click) saves progress. Paid courses
require a signed-in Google account and unlock after a verified payment.

## Lesson files

```markdown
---
title: Make a simple budget
summary: One line shown in the outline.      # optional
minutes: 6                                   # optional reading time
objectives:                                  # optional "In this lesson" box
  - Give every rupee a job
preview: false           # true = readable without buying (still needs sign-in)
draft: false             # true = hidden from the outline in production
---

Body is Markdown. Do not repeat the title as a `#` heading — it is added for you.
```

Supported Markdown: everything standard (GFM tables, task lists), the `!!! warning "Title"` callouts used
by existing lessons, and relative links to other lessons (`[next](./other.md)` resolves within the course).

## Quizzes

Put a fenced block tagged `quiz` anywhere in a lesson. The content is YAML. Quizzes are graded in the
browser, show the `explain` text, and record the attempt for signed-in learners.

| `type` | Fields | `answer` |
| --- | --- | --- |
| `single` | `question`, `options` | option number, **starting at 1** |
| `multiple` | `question`, `options` | list of option numbers, e.g. `[1, 3]` |
| `truefalse` | `question` | `true` or `false` |
| `fill` | `question` | accepted text, or a list of accepted texts (case/space-insensitive) |
| `order` | `question`, `options` | *(none)* — list `options` in the **correct** order; learners see them shuffled |

All types accept `explain:` (shown after answering). Mistakes in a quiz fail the build with the file name
and quiz number. See `sample-paid-course/en/quiz-types.md` for one of each.

## Code blocks

Fence code with a language name and it is syntax-highlighted ([Shiki](https://shiki.style/languages) — nearly
every language is supported: `python`, `js`, `ts`, `bash`, `sql`, `go`, `java`, `rust`, `html`, `yaml`, …).
Every block gets a language label and a **Copy** button.

````markdown
```python
print("Hello")
```

```js title="app.js"          ← adds a file-name caption
console.log("Hello");
```

```python tab="Python"        ← consecutive blocks with tab="…" become one tabbed group
print("Hello")
```
```js tab="JavaScript"
console.log("Hello");
```
````

Use `text` for output or anything that should not be highlighted. See `sample-paid-course/en/code-blocks.md`.
