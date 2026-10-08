---
title: Class diagrams
summary: Show the parts of a thing and how they connect
minutes: 8
objectives:
  - Draw a class with its fields and methods
  - Show inheritance, composition and other relationships
  - Add multiplicity, interfaces and notes
---

A **class diagram** shows the parts of a system and how they relate. It is not only for programmers: it works for
anything that has types of things with properties, such as courses, lessons and quizzes.

````markdown
```mermaid
classDiagram
  class Lesson {
    -String title
    +int minutes
    +render() String
  }
```
````

```mermaid
classDiagram
  class Lesson {
    -String title
    +int minutes
    +render() String
    #validate() bool
  }
```

Inside the braces, one line per member. A line with brackets is a method; a line without is a field. The sign in
front says who can see it:

| Sign | Means |
| --- | --- |
| `+` | Public |
| `-` | Private |
| `#` | Protected |
| `~` | Package or internal |

## Relationships

The arrow shape carries the meaning:

```mermaid
classDiagram
  Animal <|-- Dog : inherits
  Car *-- Engine : composition
  Library o-- Book : aggregation
  Teacher --> Course : association
  Student ..> Quiz : dependency
  Shape <|.. Circle : realises
```

| Arrow | Reads as |
| --- | --- |
| `<\|--` | "is a kind of" (inheritance) |
| `*--` | "is made of, and cannot exist without" (composition) |
| `o--` | "has, but the parts can exist alone" (aggregation) |
| `-->` | "uses or knows about" (association) |
| `..>` | "depends on" |
| `<\|..` | "implements" (realisation) |

## Interfaces and labels

Mark a class with an annotation such as `<<interface>>`. Text after a colon labels the arrow.

```mermaid
classDiagram
  class Payment {
    <<interface>>
    +pay(amount) bool
  }
  class UpiPayment {
    +pay(amount) bool
  }
  class CardPayment {
    +pay(amount) bool
  }
  Payment <|.. UpiPayment
  Payment <|.. CardPayment
```

## How many?

Put numbers in quotes at either end of a relationship: `"1"`, `"0..1"`, `"1..*"`, `"*"`.

```mermaid
classDiagram
  direction LR
  Course "1" --> "1..*" Lesson : has
  Lesson "1" --> "0..*" Quiz : checks with
  note for Course "A published version never changes"
```

`direction LR` lays the diagram out left to right, which suits wide diagrams. Use `note for ClassName "text"` for a
note attached to a class.

## A complete small example

```mermaid
classDiagram
  direction LR
  class Course {
    +String title
    +String category
    +publish() void
  }
  class Version {
    +int number
    +String status
  }
  class Lesson {
    +String title
    +int minutes
  }
  class Learner {
    +String email
    +enrol(course) void
  }
  Course "1" *-- "1..*" Version : has
  Version "1" *-- "1..*" Lesson : contains
  Learner "*" --> "*" Course : enrols in
```

## Habits that make them clear

- Show what matters, not every field. Four or five members per class is plenty.
- Name relationships with a short label.
- Draw at most about eight classes in one diagram.
- To show how a *process* flows, use a sequence diagram or a flow diagram instead.

```quiz
type: single
question: Which arrow means one class is a kind of another (inheritance)?
options:
  - o--
  - <|--
  - ..>
answer: 2
explain: The hollow triangle points at the parent class.
```

```quiz
type: multiple
question: Which of these can you write inside a class box?
options:
  - A field such as +int minutes
  - A method such as +render() String
  - An annotation such as <<interface>>
  - A flow of traffic with replicas
answer: [1, 2, 3]
explain: Traffic and replicas belong in a flow diagram, not a class diagram.
```
