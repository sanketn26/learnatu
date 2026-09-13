# Review AI-generated code

Treat generated code like an untrusted contribution from someone unfamiliar with your system.

## Review in layers

1. **Intent:** Does it solve the requested problem?
2. **Correctness:** What happens at boundaries, failures, retries, and concurrent use?
3. **Security:** Can input cross a trust boundary or reveal data?
4. **Operations:** Are logs safe? Are timeouts, cleanup, and observability adequate?
5. **Maintainability:** Is the simplest understandable design being used?
6. **Verification:** Do tests fail when the implementation is deliberately broken?

Ask AI to identify risks, but do not let its self-review replace independent review. The same model may repeat assumptions from its original answer.

The developer who accepts the change remains responsible for it.
