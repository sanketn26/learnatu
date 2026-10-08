---
title: Write mathematical formulas
summary: LaTeX-style maths that reads well everywhere
minutes: 8
objectives:
  - Write inline and display formulas
  - Use the common symbols and structures
  - Write dollar amounts without turning them into maths
  - Understand how a wrong formula is reported
---

Formulas are written in the notation used by LaTeX, and drawn by [KaTeX](https://katex.org/). Put an **inline**
formula between single dollar signs, like `$E = mc^2$`, which gives $E = mc^2$ in the middle of a sentence.

For a **display** formula, put `$$` on its own line above and below:

````markdown
$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
````

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Display formulas are centred on a line of their own and drawn larger, with limits above and below sums and integrals.

## Worked examples

Newton's second law, inline: $F = ma$. The kinetic energy of a moving body is $T = \tfrac{1}{2}mv^2$.

The Lagrangian and the equation of motion that follows from it:

$$
L = T - V, \qquad \frac{d}{dt}\frac{\partial L}{\partial \dot{q}} - \frac{\partial L}{\partial q} = 0
$$

A sum and an integral:

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2} \qquad \int_0^{\infty} e^{-x}\,dx = 1
$$

Several lines, lined up on the equals sign:

$$
\begin{aligned}
(a + b)^2 &= a^2 + 2ab + b^2 \\
(a - b)^2 &= a^2 - 2ab + b^2
\end{aligned}
$$

A matrix:

$$
\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}
$$

## Symbols you will use often

| Written as | Gives |
| --- | --- |
| `x^2`, `x_i`, `x_i^2` | $x^2$, $x_i$, $x_i^2$ |
| `\frac{a}{b}` | $\frac{a}{b}$ |
| `\sqrt{x}`, `\sqrt[3]{x}` | $\sqrt{x}$, $\sqrt[3]{x}$ |
| `\sum_{i=1}^{n}` | $\sum_{i=1}^{n}$ |
| `\int_a^b f(x)\,dx` | $\int_a^b f(x)\,dx$ |
| `\alpha \beta \gamma \theta \omega` | $\alpha \beta \gamma \theta \omega$ |
| `\leq \geq \neq \approx` | $\leq \geq \neq \approx$ |
| `\vec{v}`, `\hat{x}`, `\dot{q}` | $\vec{v}$, $\hat{x}$, $\dot{q}$ |
| `\hbar \nabla \partial` | $\hbar \nabla \partial$ |
| `\text{speed}` | $\text{speed}$ |

KaTeX supports most of LaTeX's maths commands. The [supported functions list](https://katex.org/docs/supported.html)
shows them all.

## Dollar signs in ordinary text

Because `$` starts a formula, write a dollar amount with a backslash: `\$5` shows as \$5. Rupees (₹) need nothing
special.

## Formulas must be readable too

- Formulas are drawn as real text with a hidden spoken version, so screen readers can read them. They also copy as text.
- Say the idea in words as well. "The force equals the mass times the acceleration" next to $F = ma$ helps everyone.
- Explain what each symbol means the first time it appears.

## When a formula is wrong

Mistakes are caught before learners see them. The upload check names the lesson, the line and what is wrong, for
example:

````text
en/newton.md: formula on line 14: Undefined control sequence: \fraction
````

For a course kept in the website's own files, `make validate` and the build report it the same way. A formula
inside a code block, or inside `backticks`, is just text and is never drawn.

```quiz
type: single
question: How do you write a price of five dollars without starting a formula?
options:
  - $5
  - \$5
  - $$5$$
answer: 2
explain: A backslash turns the dollar sign into an ordinary character.
```

```quiz
type: truefalse
question: A formula KaTeX cannot read is shown as red text and the upload still succeeds.
answer: false
explain: Formulas are checked. A mistake is reported with the lesson and line, and the upload is refused until it is fixed.
```
