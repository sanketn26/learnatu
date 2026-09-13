# Use synthetic test data, not production

A defect only reproduces with “real-looking” addresses. The warehouse CSV is right there. Pasting a few rows into a public AI tool to “turn these into test fixtures” feels like anonymizing. It is not. You just copied production people into a system that is not your test environment.

Production data should not be copied into a public AI tool to generate tests, investigate defects, or create screenshots.

**Synthetic data** is invented data with the *shape* your test needs — lengths, formats, edge values — and none of the people. It exists so you can break the product without exposing anyone.

## Safer test data

- Invent names, addresses, identifiers, and transactions
- Preserve only the structural property required by the test (a 12-digit id, a date in the past, a Unicode name)
- Include boundary and invalid values deliberately: empty, too long, wrong type, yesterday, 29 February
- Avoid combinations that could identify a real person even by accident
- Mark synthetic records clearly in fixtures and screenshots
- Keep secrets and production tokens out of fixtures and logs

“Anonymized” data can still identify someone when rare attributes are combined. A postcode plus a rare diagnosis plus a job title is often enough. Masking a name and leaving the rest is not a strategy. Use purpose-built synthetic data whenever possible and follow organisational policy.

If you need volume, ask the model to generate *fictional* rows from a schema you wrote, not from a production export you pasted.

## Try this prompt

> Generate 20 fictional customer records for a checkout test. Use obviously fake names and Indian-looking addresses that are not real. Include: one empty email, one email with a plus tag, one 40-character name, one address in a non-Latin script, one expired card format. Label every row SYNTHETIC. Do not use real people, real phone numbers, or any data I did not describe.

!!! danger "Never"
    - Do not copy production data into a public AI tool to generate tests, investigate defects, or create screenshots.

If production information was pasted into an unapproved tool, report it through the relevant security or privacy process rather than quietly deleting the chat. Deleting the thread does not unsay the paste, and a quiet delete is how the next person repeats it.

Ravi exported “just twenty” orders to get realistic GST invoices into a chatbot. Two of the twenty were unique enough to Google. The report was awkward. Inventing twenty invoices from the field list would have been shorter.
