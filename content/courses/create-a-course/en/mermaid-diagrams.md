---
title: Draw diagrams with Mermaid
summary: Flowcharts, sequences, state machines and more, from plain text
minutes: 10
objectives:
  - Fence a Mermaid diagram and know how it is drawn
  - Pick the right diagram type for what you want to show
  - Style a flowchart with shapes, links, groups and colours
  - Fix a diagram that does not draw
---

[Mermaid](https://mermaid.js.org/intro/) draws diagrams from text. Fence the text with the word `mermaid`. The first
line of the block says which kind of diagram it is.

````markdown
```mermaid
flowchart LR
  A[Learner] --> B{Signed in?}
  B -- yes --> C[Lesson]
  B -- no --> D[Sign in]
```
````

```mermaid
flowchart LR
  A[Learner] --> B{Signed in?}
  B -- yes --> C[Lesson]
  B -- no --> D[Sign in]
```

## How it works on Learnatu

- The text stays on the page. Your browser draws the picture from it, so it is readable even if drawing fails.
- The colours come from the site's theme. The same diagram looks right in the original, white and dark themes, and
  is redrawn when a reader switches.
- The Mermaid library is only downloaded on pages that have a diagram.
- A diagram that is too wide for the page scrolls sideways instead of shrinking.

## Which diagram do I need?

| You want to show | Use | First line |
| --- | --- | --- |
| Steps and decisions | Flowchart | `flowchart TD` or `flowchart LR` |
| Who talks to whom, in order | Sequence diagram | `sequenceDiagram` |
| The states something moves through | State diagram | `stateDiagram-v2` |
| How things are structured | Class diagram | `classDiagram` |
| How data tables relate | Entity-relationship diagram | `erDiagram` |
| A schedule | Gantt chart | `gantt` |
| Parts of a whole | Pie chart | `pie` |
| Ideas branching from one topic | Mind map | `mindmap` |
| Events over time | Timeline | `timeline` |

For moving traffic, bottlenecks and failure points in a system, use the **flow diagrams** in the next lesson instead.

## Flowcharts in detail

`TD` means top to down and `LR` means left to right (`RL` and `BT` also work). Each block has an id (`A`) and
optional text. The brackets around the text choose the shape:

```mermaid
flowchart LR
  a[Rectangle] --> b(Rounded)
  b --> c([Stadium])
  c --> d[(Database)]
  d --> e((Circle))
  e --> f{Decision}
  f --> g{{Hexagon}}
  g --> h[/Input or output/]
```

Links come in several styles, and text on a link goes between dashes:

```mermaid
flowchart LR
  A --> B
  A --- C
  A -.-> D
  A ==> E
  A -- with text --> F
  A -->|short form| G
```

Use a **subgraph** to group blocks in a titled box:

```mermaid
flowchart LR
  subgraph Browser
    A[Learner] --> B[Quiz]
  end
  subgraph Server
    C[(Progress)]
  end
  B --> C
```

Give a block a class to colour it. Use colour sparingly, and never as the only way to tell things apart, because
some readers cannot see it:

```mermaid
flowchart LR
  A[Write] --> B[Check] --> C[Publish]:::goal
  classDef goal fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
```

## Sequence diagrams

The [next lesson](/courses/create-a-course/sequence-diagrams/) covers these in full. In short, arrows show messages between participants, in time order. `->>` is a request, `-->>` a reply. Add `loop`, `alt`
(with `else`), notes and `autonumber`:

```mermaid
sequenceDiagram
  autonumber
  participant L as Learner
  participant S as Server
  L->>S: Submit an answer
  activate S
  alt Correct
    S-->>L: Show the explanation
  else Wrong
    S-->>L: Offer another try
  end
  deactivate S
  Note over L,S: The attempt is saved when signed in
```

## State diagrams

Good for anything with a lifecycle, such as a course version:

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Published: publish
  Published --> Archived: newer version goes live
  Archived --> Published: roll back
```

## Class and entity-relationship diagrams

Class diagrams have [their own lesson](/courses/create-a-course/class-diagrams/). In short, a **class diagram** lists the parts of a thing and how they connect:

```mermaid
classDiagram
  class Course {
    +String title
    +publish()
  }
  class Lesson {
    +String title
    +int minutes
  }
  Course "1" --> "many" Lesson : contains
```

An **entity-relationship diagram** is the usual way to draw database tables. The symbols at each end mean "one" or
"many":

```mermaid
erDiagram
  COURSE ||--o{ LESSON : has
  USER ||--o{ ENROLMENT : makes
  COURSE ||--o{ ENROLMENT : receives
```

## Charts, mind maps and timelines

```mermaid
gantt
  title Course production
  dateFormat YYYY-MM-DD
  section Write
  Draft lessons :a1, 2026-03-01, 10d
  Review :after a1, 4d
  section Publish
  Upload and preview :2026-03-16, 2d
```

```mermaid
pie title Where learners spend their time
  "Reading" : 45
  "Quizzes" : 25
  "Practice" : 30
```

```mermaid
mindmap
  root((Course))
    Lessons
      Text
      Quizzes
    Diagrams
      Mermaid
      Flow diagrams
    Publishing
```

```mermaid
timeline
  title A learning path
  Week 1 : Basics
  Week 2 : Practice : Quiz
  Week 3 : Project
```

## When a diagram does not draw

The text is shown with a red outline. The usual causes:

| Problem | Fix |
| --- | --- |
| Brackets or quotes inside a label, such as `A[Pay (UPI)]` | Put the label in quotes: `A["Pay (UPI)"]` |
| The word `end` in lowercase inside a label | Write `End`, or put the label in quotes |
| A typo in the first line | The first line must be a diagram type from the table above |
| Wrong indentation in a `mindmap` or `timeline` | Indent children by two spaces under their parent |
| A link to a block that is not defined (in a class or ER diagram) | Define the block first, or check the spelling |

!!! warning "Uploads do not check Mermaid"
    The upload check reads quizzes, flow diagrams and formulas, but it cannot draw a Mermaid diagram. Always open the
    preview and look at every diagram before you publish.

## Good habits

- Put one sentence before a diagram saying what to notice, for example "The dashed box is the Kubernetes cluster". It
  helps everyone, and it is what a screen reader will rely on.
- Keep diagrams small enough to read. Split a big one into two.
- Prefer labels in plain words over codes.

```quiz
type: single
question: Which first line draws a database table diagram?
options:
  - classDiagram
  - erDiagram
  - flowchart TD
answer: 2
explain: erDiagram is for entity-relationship diagrams, the usual way to show database tables.
```

```quiz
type: multiple
question: Which of these will Learnatu's upload check catch for you?
options:
  - A quiz answer that points past the last option
  - A typo in a Mermaid diagram
  - A flow diagram that uses a block you never declared
  - A formula KaTeX cannot read
answer: [1, 3, 4]
explain: Mermaid diagrams are drawn in the browser, so they cannot be checked at upload. Preview them.
```
