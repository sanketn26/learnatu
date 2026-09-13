# Generate better test ideas with AI

AI can expand a tester's thinking when it receives a safe, general description of behaviour and constraints.

## Ask for categories, not volume

Request:

- Happy paths and realistic user journeys
- Boundary values and invalid inputs
- State transitions and interrupted flows
- Permissions and role differences
- Retry, timeout, concurrency, and partial failure cases
- Accessibility, localization, and mobile conditions
- Abuse and security cases

## Safe prompt

> Create test ideas for this fictional feature description. Group them by behaviour, boundary, failure, accessibility, security, and mobile conditions. State assumptions and missing requirements. Do not invent expected results when the requirement is unclear.

Review every case against the actual product. A long list is not the same as useful coverage.
