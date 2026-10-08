---
title: The course settings
summary: What goes at the top of course.md
minutes: 5
objectives:
  - Fill in course.md
  - Pick a category, level and price
  - List lessons in modules
---

`course.md` starts with a block of settings between two lines of three dashes. Below it you write the
"About this course" text in ordinary Markdown.

````markdown
---
title: Money Basics
category: money
summary: One or two sentences shown on cards and on the course page.
outcome: I can make a simple budget and stick to it.
level: Beginner
status: published
price: { inr: 499, usd: 9 }
tags: [money, budgeting]
prerequisites: [A bank account]
modules:
  - title: Getting started
    lessons: [understand-money, make-a-budget]
---

This text is the **About this course** section.
````

## Settings you will use

| Setting | What it does |
| --- | --- |
| `title` | The course name. Required. |
| `category` | The subject it is filed under. Required. One of: `ai`, `digital-life`, `money`, `security`, `careers`, `physics`, `authoring`. |
| `summary` | A short description for cards and search. Required. |
| `outcome` | The sentence "By the end you will be able to say…". Shown on the course page. |
| `level` | `Beginner`, `Intermediate` or `Advanced`. Defaults to Beginner. |
| `status` | `published` or `draft`. A draft is hidden from learners. |
| `price` | `{ inr: 499, usd: 9 }`. Leave it out entirely to make the course free. |
| `modules` | Groups of lessons, in order. Required. |
| `featured`, `order` | Show it first on the home page, and sort order (lower first). |
| `accent` | An optional cover colour such as `"#4152e0"`. |
| `tags`, `prerequisites` | Search words, and a "before you start" list. |

## Modules and lesson names

Each entry in `modules` has a `title` and a list of `lessons`. A lesson name is the file name without `.md`:
`understand-money` means the file `en/understand-money.md`. Use lowercase words joined by hyphens.

!!! warning "Mistakes are caught for you"
    A category that is not on the list is rejected, and the message shows the allowed values.
    A lesson listed in course.md with no file in en/ is reported by name.

```quiz
type: multiple
question: Which settings are required in course.md?
options:
  - title
  - summary
  - category
  - price
  - modules
answer: [1, 2, 3, 5]
explain: Price is optional. Without it the course is free.
```
