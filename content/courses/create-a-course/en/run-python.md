---
title: Run Python in a lesson
summary: Let learners edit and run Python right on the page, safely, with no setup
minutes: 10
objectives:
  - Add a block learners can edit and run
  - Give it input, packages and a time limit
  - Know what the sandbox allows and what it does not
---

Some things are learnt by trying. A `pyrun` block turns Python code into a small editor with a **Run** button. The code runs **on the learner's own device**, so nothing is installed and nothing is sent to our servers.

## 1. The simplest block

Fence the code with `pyrun` instead of `python`:

````markdown
```pyrun
for n in range(5):
    print(n, "squared is", n * n)
```
````

Here it is, ready to run. Change the `5` and run it again; **Reset** puts your original code back.

```pyrun
for n in range(5):
    print(n, "squared is", n * n)
```

The first time a learner presses Run, their browser downloads Python (about 10 MB, then it is remembered). Until then the page is plain text, so a lesson never waits for Python to load.

## 2. Options on the first lines

Lines at the very top that start with `#@` are options. They are not shown as code.

| Line | Meaning |
| --- | --- |
| `#@ title "Squares"` | A heading above the editor |
| `#@ timeout 5` | Seconds the code may run, 1 to 60. Default 10. A run that goes on longer is stopped |
| `#@ packages numpy pandas` | Load packages first. Available: `numpy pandas scipy sympy networkx` |
| `#@ stdin "Asha" "42"` | The answers `input()` will receive, in order |
| `#@ readonly` | Learners can run the code but not change it |
| `#@ shared` | Share variables with the other `shared` blocks on the page, like cells in a notebook |

````markdown
```pyrun
#@ title "Greeting"
#@ stdin "Asha"
name = input("Your name? ")
print("Hello,", name)
```
````

```pyrun
#@ title "Greeting"
#@ stdin "Asha"
name = input("Your name? ")
print("Hello,", name)
```

Without `#@ stdin`, a program that asks for input stops with an `EOFError`, because there is nobody to type. Put the answers a learner should see in the options.

## 3. Build on an earlier block

Normally every run starts clean, so a block always behaves the same. Mark blocks `#@ shared` when a lesson builds up step by step:

````markdown
```pyrun
#@ shared
prices = [120, 80, 45]
```

```pyrun
#@ shared
print("Total:", sum(prices))
```
````

```pyrun
#@ shared
prices = [120, 80, 45]
```

```pyrun
#@ shared
print("Total:", sum(prices))
```

Run them in order. If a learner runs the second one first they see a clear `NameError`, which is a lesson in itself. Stopping a run that is stuck also clears the shared variables.

## 4. What is safe

Learners run code that **you** wrote, and often edit it, so the sandbox is strict:

- The code runs in a locked-down frame with no access to the learner's account, cookies or this site.
- It can only reach the place Python itself is downloaded from. It cannot send anything anywhere else.
- It has a time limit, a limit on how much it can print, and a **Stop** button.

It is a place to experiment, not a server: there are no files to keep, no graphics windows, and no packages beyond the list above.

```quiz
type: single
question: "A learner's program calls input() but the block has no #@ stdin line. What happens?"
options:
  - The browser shows a box to type into
  - It stops with an EOFError, because no answers were provided
  - It waits forever
answer: 1
explain: Nobody is there to type, so input() runs out of answers straight away. List the answers you want in an #@ stdin line.
```
