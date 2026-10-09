---
title: Run TypeScript in a lesson
summary: Let learners write, type-check and run TypeScript on the page, and draw with it, safely
minutes: 10
objectives:
  - Add a TypeScript block learners can edit and run
  - Show type errors as part of the lesson
  - Use render mode to draw on a canvas or show HTML
---

A `tsrun` block works like the Python one, but with the **real TypeScript compiler**: learners see type mistakes the way they would in their editor, then run the code. Everything happens in their browser.

## 1. The simplest block

````markdown
```tsrun
const prices: number[] = [120, 80, 45];
const total = prices.reduce((sum, p) => sum + p, 0);
console.log("Total:", total);
```
````

```tsrun
const prices: number[] = [120, 80, 45];
const total = prices.reduce((sum, p) => sum + p, 0);
console.log("Total:", total);
```

The first time someone presses Run, their browser downloads the compiler (about 1.5 MB, then it is remembered). Until then the page is plain text.

## 2. Type errors are the lesson

By default a type mistake **stops the run** and is shown with its line. Change `"six"` to `6` and run it again:

```tsrun
//@ title "Fix the type"
const quantity: number = "six";
console.log(quantity * 2);
```

Options go on the first lines, starting with `//@`:

| Line | Meaning |
| --- | --- |
| `//@ title "Text"` | A heading above the editor |
| `//@ timeout 5` | Seconds the code may run, 1 to 60. Default 10 |
| `//@ typecheck off` | Skip the type check and just run |
| `//@ strict off` | Looser checking |
| `//@ readonly` | Run, but not edit |
| `//@ mode render` | Draw or show HTML (next section) |
| `//@ size 600 300` | The size of the picture in render mode |

`console.log`, timers and top-level `await` work. There is no `import`, file access or network: each block is self-contained.

## 3. Draw and show things: render mode

With `//@ mode render` the code also gets a `canvas` to draw on and a `render(html)` function:

````markdown
```tsrun
//@ mode render
//@ size 320 120
const g = canvas.getContext("2d");
g.fillStyle = "#0b8f7a";
g.fillRect(20, 20, 120, 80);
g.fillStyle = "#17332e";
g.font = "600 18px system-ui";
g.fillText("Drawn with TypeScript", 150, 66);
```
````

```tsrun
//@ mode render
//@ size 320 120
const g = canvas.getContext("2d");
g.fillStyle = "#0b8f7a";
g.fillRect(20, 20, 120, 80);
g.fillStyle = "#17332e";
g.font = "600 18px system-ui";
g.fillText("Drawn with TypeScript", 150, 66);
```

HTML works too, including inline SVG:

```tsrun
//@ mode render
//@ size 320 90
const names = ["Asha", "Ravi", "Meera"];
render(`<ul style="margin:0;padding-left:1.2rem">${names.map((n) => `<li>${n.toUpperCase()}</li>`).join("")}</ul>`);
```

The picture is shown in a locked-down frame: no scripts, no links that go anywhere, no outside images. Styles and inline SVG are fine.

## 4. What is safe

The code runs in a sandbox with no access to the learner's account or this site, and it can only fetch the compiler itself. It has a time limit and a **Stop** button. What it draws is checked and shown in a frame that cannot run anything.

```quiz
type: single
question: "A learner's TypeScript block has a type mistake. What happens when they press Run?"
options:
  - It runs anyway and prints a warning
  - The run stops and the mistake is shown with its line
  - Nothing, the Run button is disabled
answer: 1
explain: By default the types are checked first and a mistake stops the run. Add //@ typecheck off if you want the code to run without the check.
```
