# Use synthetic test data

Production data should not be copied into a public AI tool to generate tests, investigate defects, or create screenshots.

## Safer test data

- Invent names, addresses, identifiers, and transactions
- Preserve only the structural property required by the test
- Include boundary and invalid values deliberately
- Avoid combinations that could identify a real person
- Mark synthetic records clearly
- Keep secrets and production tokens out of fixtures and logs

“Anonymized” data can still identify someone when rare attributes are combined. Use purpose-built synthetic data whenever possible and follow organisational policy.

If production information was pasted into an unapproved tool, report it through the relevant security or privacy process rather than quietly deleting the chat.
