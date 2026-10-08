---
title: Draw diagrams with Mermaid
summary: Flowcharts and more, from plain text
minutes: 4
objectives:
  - Fence a Mermaid diagram
  - Choose a diagram type
  - Fix a diagram that does not draw
---

[Mermaid](https://mermaid.js.org/intro/) draws diagrams from text. Fence the text with the word `mermaid`.

````markdown
```mermaid
flowchart LR
  A[Learner] --> B{Signed in?}
  B -- yes --> C[Lesson]
  B -- no --> D[Sign in]
```
````

It becomes:

```mermaid
flowchart LR
  A[Learner] --> B{Signed in?}
  B -- yes --> C[Lesson]
  B -- no --> D[Sign in]
```

## Other kinds

A **sequence diagram** shows who talks to whom, in order:

```mermaid
sequenceDiagram
  participant L as Learner
  participant S as Learnatu
  L->>S: Open a lesson
  S-->>L: Lesson and quiz
  L->>S: Mark complete
```

A **state diagram** shows the steps something moves through:

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Published: publish
  Published --> Archived: a newer version goes live
  Archived --> Published: roll back
```

Mermaid also does class diagrams, entity-relationship diagrams, Gantt charts, mind maps and more. The
[Mermaid documentation](https://mermaid.js.org/intro/) shows each one.

## Good to know

- Diagrams follow the site theme, so they work in light and dark.
- The diagram text stays on the page, so it is readable even if drawing fails.
- If a diagram has a mistake, its text is shown with a red outline. Open the lesson and check the syntax.
- For moving traffic, bottlenecks and failure points, use the **flow diagrams** in the next lesson.

```quiz
type: single
question: What goes after the three backticks to make a Mermaid diagram?
options:
  - diagram
  - mermaid
  - chart
answer: 2
```
