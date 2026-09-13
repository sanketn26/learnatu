# Check packages, APIs, and licenses before you install

The generated snippet fails on a missing module. Underneath it, a one-liner: `npm install fancy-retry-kit`. The name sounds like every other helper on the registry. You are one paste from “fixed.”

Stop. AI frequently suggests plausible package names, methods, configuration options, and citations that do not exist, or that do not match your version. A **hallucinated package** is a name the model invented because it looked like a real one. That invented name may already belong to a malicious package. Installing from the snippet is how it gets onto your machine.

Do not run an installation command merely because it appears in generated code.

## Verify before installing

Find the package through its official registry and project repository. Type the name yourself. Do not trust a link the model offered next to the command.

- Check spelling, ownership, maintenance activity, release history, and supported versions
- Read the primary documentation for the exact API you are about to call — including the version you actually run
- Review **transitive dependencies** (the packages your package installs for you) and any install scripts that run on `npm install` or `pip install`
- Confirm **license compatibility**: whether that license lets you use, modify, and distribute the code in *your* product the way your organisation requires
- Prefer an existing trusted dependency or a platform feature when it already does the job

A new helper that “just does retries” is not free. It is a supply-chain decision, a security review, and a future upgrade. Generated code will not do that review for you.

## After it is in the lockfile

Generated code can also reproduce patterns or text with unclear origin — a function that is a little too close to a tutorial, a comment block that still reads like a license header from somewhere else. Follow your organisation’s review and licensing policy before you distribute it.

If the model cited a method that your version does not have, that is not a “docs are stale” mystery until you have opened the official docs. The API may never have existed.

Neha’s generated client called `createWidgetV2` on an SDK that had no such method. The package name next to it was one character off a popular library. The registry entry was two days old, had no repository, and requested network on install. She deleted the command, opened the real docs, and used the function that had been there for three years.

The extra minute is the work. The install is optional.
