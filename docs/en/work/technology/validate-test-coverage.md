# Validate AI-generated test coverage

AI-generated tests often mirror the implementation, overuse simple happy paths, or assert that code runs rather than that behaviour is correct.

## Challenge the tests

1. Trace each important requirement to an assertion.
2. Check boundaries, failures, permissions, and state changes.
3. Introduce a deliberate defect and confirm a test fails.
4. Look for assertions that merely repeat mocked values.
5. Review brittle selectors, timing assumptions, and excessive mocking.
6. Keep exploratory testing and human observation in the plan.

Ask what is missing, not only for more tests. Coverage numbers and passing status cannot prove that the important risks were exercised.
