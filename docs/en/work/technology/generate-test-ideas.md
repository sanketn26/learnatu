# Generate better test ideas with AI

The suite is green. Every test name reads like a product tour: user can sign in, user can add to cart, user can pay. Nobody asked what happens when the cart is empty, the session expires mid-pay, or a support role opens someone else’s order. That is a happy-path suite. It is not coverage — not in the useful sense of “the important risks were actually exercised.”

AI can expand a tester’s thinking when it receives a safe, general description of behaviour and constraints — not production dumps, not real customer ids. Ask it for *kinds* of risk, not a longer list of the same journey with the button renamed.

A long list is not the same as useful coverage. [Validate the tests](validate-test-coverage.md) after you generate them. Invent [synthetic data](synthetic-test-data.md) for anything you need to run.

## Ask for categories, not volume

Give the model a fictional feature description: who the user is, what success looks like, which roles exist, what must never happen. Then request ideas grouped by risk, not by “more cases.”

- Happy paths and realistic user journeys
- Boundary values and invalid inputs
- State transitions and interrupted flows
- Permissions and role differences
- Retry, timeout, concurrency, and partial failure cases
- Accessibility, localization, and mobile conditions
- Abuse and security cases

If the requirement is silent — “what should happen when the webhook arrives twice?” — the useful output is a question, not a guessed expected result. Invented oracles become tests that lock in the wrong behaviour.

## Safe prompt

> Create test ideas for this fictional feature description. Group them by behaviour, boundary, failure, accessibility, security, and mobile conditions. State assumptions and missing requirements. Do not invent expected results when the requirement is unclear.

Review every case against the actual product. Delete the ones that duplicate each other. Keep the ones that would hurt if they failed in production. Add the ones the model missed because it never sat with a user, a device, or last month’s incident.

## A list that looked thorough

Sana asked for “50 test cases for checkout.” She got fifty ways to complete a purchase. None mentioned a partial refund, a double-submit, or a screen reader on the error state. When she asked for categories instead, the list shrank and got sharper: ten journeys, eight boundaries, a handful of permission and failure cases she actually ran. The ticket was smaller. The risk surface was not.
