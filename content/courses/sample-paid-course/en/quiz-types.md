---
title: Every quiz type
minutes: 5
---

Quizzes are fenced blocks tagged `quiz`, written in YAML.

```quiz
type: single
question: Which UPI detail should you NEVER share with anyone?
options:
  - Your UPI ID
  - Your UPI PIN
  - Your name
answer: 2
explain: The PIN approves payments. No genuine person or app ever asks for it.
```

```quiz
type: multiple
question: Select every sign of a scam message.
options:
  - It creates urgency
  - It comes from a number you saved
  - It asks for an OTP
  - It asks you to install an app
answer: [1, 3, 4]
explain: Urgency, OTP requests and app installs are classic pressure tactics.
```

```quiz
type: fill
question: An OTP is a one-time ______.
answer: [password, pass code, passcode]
explain: It proves it is you, so it must stay secret.
```

```quiz
type: order
question: Put these steps in the right order after a suspicious payment.
options:
  - Stop and do not pay more
  - Call your bank using the number on your card
  - Report on 1930 or cybercrime.gov.in
  - Change affected passwords
explain: Protect the money first, then report, then clean up.
```
