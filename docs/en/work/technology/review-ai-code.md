# Review AI-generated code as untrusted

The pull request looks tidy. Names match the codebase. Tests are green. The model even wrote a commit message. It is 5:40 p.m., and merging would close the ticket.

Treat that diff like an untrusted contribution from someone who has never seen your system. They are fluent. They are not accountable. They will not be on the incident call.

AI drafts. It does not understand your complete system, your failure modes, or which shortcut last quarter’s outage taught you not to take. The developer who accepts the change remains responsible for it.

## Review in layers

Do not start at style. Start at whether the change deserves to exist.

1. **Intent.** Does it solve the requested problem, or a nearby problem the model found more examples of?
2. **Correctness.** What happens at boundaries, failures, retries, and concurrent use? A function that works on one happy payload is not finished work.
3. **Security.** Can input cross a trust boundary or reveal data? Look at auth checks, query construction, file paths, redirects, and anything the model copied from a tutorial that trusted the client.
4. **Operations.** Are logs safe, or do they print tokens and personal data? Are timeouts, cleanup, and observability adequate when the dependency hangs?
5. **Maintainability.** Is this the simplest design another engineer will understand in six months, or a clever pile of helpers the model invented because it sounded complete?
6. **Verification.** Do the tests fail when you deliberately break the implementation? If they still pass, they are not tests — they are applause.

You can ask the same model to identify risks. Use that as a checklist seed, not as a sign-off. The model may repeat assumptions from its original answer and congratulate itself for noticing them.

[Confirm packages, APIs, and licenses](packages-apis-and-licenses.md) on the same pass. A clean-looking import is still an install decision.

## A review that looked finished

Arjun generated a retry wrapper around a payment client. The code handled HTTP 500. It did not handle a timeout after the charge had already succeeded, so a second attempt created a duplicate debit. The unit tests stubbed the client to throw once and then return success, which is the story the implementation told about itself. A reviewer who asked “what if the first call succeeded on the server and failed on the way back?” would have caught it. The model did not, and asking it “any issues?” did not either.

Read the diff as if a stranger sent it. Because, for the purposes of review, that is what happened.
