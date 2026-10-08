---
title: Add quizzes
summary: Five kinds of quick checks
minutes: 5
objectives:
  - Write a quiz block
  - Choose the right quiz type
---

A quiz is a fenced block tagged `quiz`, written in YAML. It is graded in the learner's browser, shows your
explanation, and records the attempt for signed-in learners.

## Single choice

````markdown
```quiz
type: single
question: Which of these is a safe place to type your UPI PIN?
options:
  - On a call with your bank
  - Only inside your own UPI app
  - On a link sent by SMS
answer: 2
explain: You enter a PIN only inside the app. Nobody needs it to send you money.
```
````

Try it:

```quiz
type: single
question: Which of these is a safe place to type your UPI PIN?
options:
  - On a call with your bank
  - Only inside your own UPI app
  - On a link sent by SMS
answer: 2
explain: You enter a PIN only inside the app. Nobody needs it to send you money.
```

## All the types

| `type` | Fields | `answer` |
| --- | --- | --- |
| `single` | `question`, `options` | The option number, starting at **1** |
| `multiple` | `question`, `options` | A list of option numbers, like `[1, 3]` |
| `truefalse` | `question` | `true` or `false` |
| `fill` | `question` | The accepted text, or a list of accepted texts |
| `order` | `question`, `options` | None. List the options in the **correct** order. Learners see them shuffled. |

Every type accepts `explain:`, shown after the learner answers.

```quiz
type: order
question: Put the steps in order.
options:
  - Write the lesson
  - Zip the course
  - Upload it
  - Publish it
explain: Write, zip, upload, then publish once the preview looks right.
```

!!! warning "A broken quiz is caught early"
    An answer number that does not match an option is reported with the file and quiz number.
    A missing question or too few options is reported too.

```quiz
type: fill
question: In a single-choice quiz, option numbers start at which number?
answer: ["1", "one"]
explain: Counting starts at 1, so the first option is 1.
```
