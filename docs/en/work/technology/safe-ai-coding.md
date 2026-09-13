# Use AI safely while coding

AI can explain unfamiliar code, suggest alternatives, and draft repetitive pieces. It does not understand your complete system or guarantee secure, correct, maintainable code.

## Before prompting

- Follow your organisation's approved-tool and data-handling rules
- Remove credentials, tokens, internal URLs, customer data, and proprietary business logic
- Prefer a small fictional example that reproduces the problem
- State language, version, constraints, error handling, and security expectations

## After receiving code

Read every line. Run tests and static checks. Confirm dependencies and APIs from official documentation. Review authentication, authorization, input validation, error handling, logging, privacy, performance, and failure behaviour.

Never paste production secrets into a prompt. If a secret was exposed, rotate it; deleting the conversation is not enough.
