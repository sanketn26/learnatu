# AI से बेहतर test ideas generate करें

जब AI को behaviour और constraints का safe, general description मिलता है, तो वह tester की सोच को और आगे बढ़ा सकता है।

## Volume नहीं, categories माँगें

ये माँगें:

- Happy paths और realistic user journeys
- Boundary values और invalid inputs
- State transitions और बीच में रुकने वाले flows
- Permissions और role की भिन्नताएँ
- Retry, timeout, concurrency, और partial failure के cases
- Accessibility, localization, और mobile conditions
- Abuse और security के cases

## Safe प्रॉम्प्ट

> Create test ideas for this fictional feature description. Group them by behaviour, boundary, failure, accessibility, security, and mobile conditions. State assumptions and missing requirements. Do not invent expected results when the requirement is unclear.

हर case को असली product के हिसाब से जाँचें। लंबी list होना उपयोगी coverage होने के बराबर नहीं है।
