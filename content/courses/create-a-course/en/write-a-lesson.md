---
title: Write a lesson
summary: One Markdown file per lesson
minutes: 5
objectives:
  - Set up a lesson file with its settings
  - Use headings, lists, tables, callouts and images
  - Know what not to put in a lesson
---

A lesson is a Markdown file with a few settings at the top.

````markdown
---
title: Make a simple budget
summary: One line shown in the lesson list.
minutes: 6
objectives:
  - Give every rupee a job
  - Keep a one-page budget
preview: false
---

Start with the idea in plain words. Then show an example.

## A heading for each step

- A list
- Of short points
````

## The lesson settings

- **`title`** is required. It is shown as the page heading, so do **not** start the lesson with a `# Heading`. The
  upload check tells you if you do.
- **`minutes`** is an optional reading time.
- **`objectives`** is an optional list. It appears in a box at the top as "In this lesson".
- **`preview: true`** lets signed-in readers open this lesson of a paid course without buying it.
- **`draft: true`** hides the lesson from the course.

## What you can write

Everything standard works: headings, lists, links, bold, tables, images and task lists.

| Looks like | Written as |
| --- | --- |
| **Bold** | `**Bold**` |
| A link | `[text](https://example.com)` |
| An image | `![A budget sheet](../images/budget-sheet.png)` |

Warnings use a special line. Write `!!!`, the type (`warning` or `danger`) and a title in quotes. Then indent
the lines of the box by four spaces:

````markdown
!!! warning "Never share this"
    Your OTP is a key to your money.
    The bank never asks for it.
````

!!! warning "Never share this"
    Your OTP is a key to your money.
    The bank never asks for it.

## Good lesson habits

- One idea per lesson. Three to six minutes is plenty.
- Say what the reader will be able to do, then show it.
- End with a quick check, which is the next lesson's topic.

```quiz
type: truefalse
question: A lesson should start with a "# Title" heading line.
answer: false
explain: The title from the settings is shown for you. A heading of your own would repeat it, so the upload check rejects it.
```
