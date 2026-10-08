---
title: Diagrams with Mermaid
minutes: 2
objectives:
  - Draw a flowchart, a sequence and a class diagram from plain text
---

Fence a diagram with the word `mermaid`. It is drawn in the browser, follows the site theme, and stays
readable as text if drawing fails.

```mermaid
flowchart LR
  A[Learner] --> B{Signed in?}
  B -- yes --> C[Lesson]
  B -- no --> D[Sign in]
  D --> C
```

```mermaid
sequenceDiagram
  participant L as Learner
  participant S as Learnatu
  L->>S: Open lesson
  S-->>L: Lesson and quiz
  L->>S: Mark complete
```

Any [Mermaid diagram type](https://mermaid.js.org/intro/) works: flowchart, sequence, class, state, ER, Gantt, mind map and more.
