---
title: Show code
summary: Colour, captions and tabs
minutes: 3
objectives:
  - Fence code with a language
  - Add a file name caption
  - Group examples in tabs
---

Fence code with three backticks and the language name. Colours are added for you, and every block gets a label and
a **Copy** button.

````markdown
```python
def greet(name):
    return f"Hello, {name}"
```
````

```python
def greet(name):
    return f"Hello, {name}"
```

## A file name caption

````markdown
```js title="app.js"
console.log("Hello");
```
````

```js title="app.js"
console.log("Hello");
```

## Tabs

Consecutive blocks that each have `tab="…"` become one tabbed group:

````markdown
```python tab="Python"
print("Hello")
```
```js tab="JavaScript"
console.log("Hello");
```
````

```python tab="Python"
print("Hello")
```
```js tab="JavaScript"
console.log("Hello");
```

## Which languages are coloured

In courses uploaded as a zip: bash, c, c++, c#, css, diff, dockerfile, go, html, java, javascript, json, jsx,
kotlin, markdown, php, python, ruby, rust, sql, tsx, typescript and yaml. Short names such as `js`, `ts`, `py` and
`sh` work. A language that is not on the list still displays, just without colours. Use `text` for output.

```quiz
type: single
question: How do you give a code block a file name caption?
options:
  - Put the name on the line above the block
  - Add title="app.js" after the language
  - Name the file in course.md
answer: 2
```
