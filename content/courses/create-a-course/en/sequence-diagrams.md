---
title: Sequence diagrams
summary: Show who says what to whom, in order
minutes: 8
objectives:
  - Draw participants and messages
  - Use the arrow styles and activations
  - Show choices, loops and parallel steps
  - Add notes and highlights
---

A **sequence diagram** shows a conversation: who sends a message to whom, in time order, top to bottom. It is the best
way to explain a process where several parties take turns, such as a payment, a sign-in or a scam call.

````markdown
```mermaid
sequenceDiagram
  participant L as Learner
  participant S as Server
  L->>S: Open a lesson
  S-->>L: Lesson and quiz
  L->>S: Mark complete
```
````

```mermaid
sequenceDiagram
  participant L as Learner
  participant S as Server
  L->>S: Open a lesson
  S-->>L: Lesson and quiz
  L->>S: Mark complete
```

## Participants

`participant L as Learner` creates a column named "Learner" that you can call `L` in the messages. Use `actor` instead of
`participant` to draw a person. Participants appear in the order you first mention or declare them.

## Arrows

The arrow tells the reader what kind of message it is:

```mermaid
sequenceDiagram
  A->>B: Request (solid line, arrowhead)
  B-->>A: Reply (dotted line, arrowhead)
  A-)B: Asynchronous, no waiting for an answer
  A-xB: Message that is lost
  A->B: Plain line with no arrowhead
```

## Activations

Show that someone is busy handling a request with `+` on the request and `-` on the reply:

```mermaid
sequenceDiagram
  participant L as Learner
  participant S as Server
  L->>+S: Submit an answer
  S->>+S: Grade it
  S-->>-S: Score
  S-->>-L: Show the explanation
```

## Choices, loops and parallel steps

| Block | Use it for |
| --- | --- |
| `alt` ... `else` ... `end` | Either/or: two or more branches |
| `opt` ... `end` | A step that only sometimes happens |
| `loop Text` ... `end` | Something repeated |
| `par` ... `and` ... `end` | Things that happen at the same time |
| `break Text` ... `end` | A step that stops the flow |

```mermaid
sequenceDiagram
  participant L as Learner
  participant A as App
  participant D as Database
  L->>A: Open a lesson
  opt Signed in
    A->>D: Load progress
    D-->>A: Progress
  end
  par Load the text
    A->>D: Fetch the lesson
  and Load the quiz
    A->>D: Fetch the quiz
  end
  loop Every 30 seconds
    A->>D: Save the reading position
  end
  A-->>L: Show the lesson
```

## Notes, numbering and highlights

`Note right of B: text`, `Note left of B: text` and `Note over A,B: text` add a note. `autonumber` numbers every
message. `rect` shades a group of steps; use a transparent colour so it works in light and dark themes.

A worked example that teaches something real, an OTP scam:

```mermaid
sequenceDiagram
  autonumber
  actor V as Victim
  participant S as Scammer
  participant B as Bank
  S->>V: Calls, pretending to be the bank
  S->>B: Starts a transfer from the victim's account
  B-->>V: Sends a one-time code by SMS
  S->>V: "Read me the code to stop the fraud"
  rect rgba(255, 190, 61, 0.2)
    V->>S: Reads the code out
    S->>B: Enters the code
  end
  B-->>S: Money moves
  Note over V,S: The code was the key. Never read it out.
```

## Habits that make them clear

- Keep to about six participants. More than that, split the story.
- Write messages as actions ("Submit an answer"), not as technical names.
- Use `alt` for a real choice and leave the rest straight.
- Before the diagram, say in one sentence what to notice.

!!! warning "Check it in the preview"
    Mermaid diagrams are drawn in the browser, so the upload check cannot read them. If a diagram has a mistake, its
    text shows with a red outline. Preview every diagram before you publish.

```quiz
type: single
question: Which arrow draws a reply, with a dotted line and an arrowhead?
options:
  - ->>
  - -->>
  - -x
answer: 2
explain: A single dash is solid and a double dash is dotted. The second ">" gives the arrowhead.
```

```quiz
type: order
question: Put these parts of a sequence diagram in the order you would usually write them.
options:
  - sequenceDiagram
  - participant or actor lines
  - Messages
  - Notes and alt or loop blocks
explain: Start with the diagram type, name the participants, then write the conversation and add structure.
```
