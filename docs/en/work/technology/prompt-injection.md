# Understand prompt injection

An AI-enabled application may process instructions hidden inside webpages, documents, emails, retrieved records, images, or tool output. Those instructions can conflict with the application's intended rules.

## Design defensively

- Treat retrieved and user-controlled content as untrusted data
- Keep permissions narrow and actions reversible
- Separate instructions from content clearly
- Require confirmation for consequential actions
- Validate tool inputs and outputs outside the model
- Prevent secrets from entering model context unnecessarily
- Test attempts to override rules, extract data, or misuse connected tools

A prompt saying “ignore previous instructions” is only one obvious example. The deeper problem is allowing untrusted content to influence privileged actions.

Do not rely on a single system prompt as the security boundary.
