# Use AI safely while you code

You are stuck on a config error. The `.env` file is open. ChatGPT is open. Pasting the whole file feels faster than redacting it: “here is my environment — why will the client not connect?”

That paste is the incident. A **secret** is anything that unlocks a system — an API key, a database password, a session **token**. It does not become safe because you wrapped a coding question around it. A public AI tool is someone else’s computer. Treat the box like a ticket the internet can read.

A **prompt** is the message you send: the question, the snippet, the stack trace. AI can explain unfamiliar code, suggest alternatives, and draft the repetitive pieces. It does not understand your complete system. It does not guarantee secure, correct, or maintainable code. Think of a fast junior who has never seen your architecture, your threat model, or last week’s incident.

## Before you prompt

Follow your organisation’s approved-tool and data-handling rules. A company Copilot tenant is not the same as a personal chat tab.

Then strip the paste.

- Credentials, tokens, internal URLs, and customer data
- **Proprietary** business logic — the pricing rules, fraud checks, and workflows that are yours, not public examples

Prefer a small fictional example that still reproduces the problem. The shape of the bug usually survives. The real user id, PAN, and hostname do not need to travel with it.

State language, version, constraints, error handling, and security expectations. If you do not say “reject unknown fields” or “do not log the token,” the model will often emit the happy-path snippet it has seen most often.

## Try this prompt

> I have a TypeScript 5 service that reads a webhook body and writes a row. Using this fictional payload and this redacted error, suggest a parse-and-validate function. Constraints: no new dependencies, reject unknown fields, never log secrets, fail closed on invalid JSON. Ask me if a requirement is missing. Do not invent an API that is not in the error.

## After you receive code

Read every line. Run the tests and static checks you already trust. Confirm every dependency and API from official documentation — [packages, APIs, and licenses](packages-apis-and-licenses.md) are a separate review, not a side effect of “it compiled.” Check authentication, authorization, input validation, error handling, logging, privacy, performance, and what happens when the other side is slow or down.

Then [review it as untrusted code](review-ai-code.md). The person who merges it is still you.

!!! danger "Never"
    - Never paste production secrets into a prompt.
    - If a secret was exposed, rotate it. Deleting the conversation is not enough.

Priya pasted a staging `.env` “just to debug CORS.” The key was a copy of production. Rotating it that afternoon was tedious. Hoping the chat would disappear was not a control.
