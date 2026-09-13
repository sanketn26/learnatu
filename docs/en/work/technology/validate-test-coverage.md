# Passing tests are not the same as coverage

The dashboard says 94%. CI is green. The model wrote eighty tests in an afternoon. Two weeks later a refund races a capture and double-credits a customer. Every test still passes, because every test followed the implementation down the happy path and never asked the product what it owed the user.

AI-generated tests often mirror the implementation, overuse simple happy paths, or assert that code runs rather than that behaviour is correct.

An **assertion** is the line that would fail if the product were wrong — “the order is `cancelled`,” “the refund equals the capture,” “the other role cannot see this row.” A test with no real assertion is a smoke check with a story.

A **coverage number** (the percentage of lines or branches the suite executed) only tells you that code ran. It cannot prove that the important risks were exercised. Ask what is missing, not only for more tests.

## Challenge the tests

1. Trace each important requirement to an assertion. If a rule lives only in a comment or a ticket, it is not tested.
2. Check boundaries, failures, permissions, and state changes — the same categories you [asked the model to generate](generate-test-ideas.md).
3. Introduce a deliberate defect and confirm a test fails. Flip a comparison, skip an auth check, return the wrong status. If the suite stays green, it cannot protect you.
4. Look for assertions that merely repeat mocked values. `expect(result).toEqual(mockUser)` after you set `mockUser` is a circle, not a check.
5. Review brittle selectors, timing assumptions, and excessive mocking. A test that sleeps for three seconds, or that replaces every dependency, will pass on the author’s machine and lie in CI.
6. Keep exploratory testing and human observation in the plan. Automation does not watch a screen reader miss the error, or a phone drop the upload on a flaky network.

Then [run the conditions users actually live in](accessibility-mobile-testing.md). Line coverage will not mention a virtual keyboard covering Submit.

## A suite that could not fail

Deepak generated tests for a discount engine from the function itself. Every case used the same three coupons the code already branched on. He changed the “max 10% for new users” rule to 100% in the source. The suite stayed green: the tests imported the same helper the implementation used, and compared the helper to itself. A single handwritten case — new user, stacked coupon, expected cap — would have failed. The coverage number did not care.

Green means the tests you have did not fail. It does not mean you have the tests you need.
