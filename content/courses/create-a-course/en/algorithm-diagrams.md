---
title: Step-by-step algorithm diagrams
summary: Walk through an algorithm one step at a time, on arrays, lists, trees and graphs
minutes: 12
objectives:
  - Declare an array, a linked list, a tree or a graph
  - Write steps that highlight, swap, set and move pointers
  - Know which highlights stay and which clear on the next step
---

An **algorithm diagram** shows a data structure changing one step at a time. Readers press Next (or Play) and read your caption under each picture. You write it as text in a fenced block tagged `algo`.

!!! warning "You write every step"
    The diagram never runs the algorithm. Each picture is exactly what you put under that `step`, so you can show a correct run, a wrong one, or a made-up example.

## 1. An array and one step

Declare the array first, then add steps. Each `step` has a caption in quotes. Lines under it say what the picture looks like.

````markdown
```algo
array a 5 2 9 1
step "Compare the first two."
  compare a[0] a[1]
step "5 is bigger, so swap."
  swap a[0] a[1]
```
````

```algo
array a 5 2 9 1
step "Compare the first two."
  compare a[0] a[1]
step "5 is bigger, so swap."
  swap a[0] a[1]
```

## 2. Pointers and finished cells

`pointer i a[0]` puts a named marker under a cell. Naming it again moves it. `done a[3]` turns a cell green and **keeps it green** for the rest of the steps, while `compare`, `focus` and `swap` clear at the next step.

````markdown
```algo
title "Bubble sort, one pass"
array a 5 2 9 1
step "Start at the left."
  pointer i a[0]
  compare a[0] a[1]
step "5 > 2, so swap."
  swap a[0] a[1]
step "Move on. Compare 5 and 9."
  pointer i a[1]
  compare a[1] a[2]
step "Compare 9 and 1."
  pointer i a[2]
  compare a[2] a[3]
step "9 > 1, so swap. 9 is now in its place."
  swap a[2] a[3]
  done a[3]
```
````

```algo
title "Bubble sort, one pass"
array a 5 2 9 1
step "Start at the left."
  pointer i a[0]
  compare a[0] a[1]
step "5 > 2, so swap."
  swap a[0] a[1]
step "Move on. Compare 5 and 9."
  pointer i a[1]
  compare a[1] a[2]
step "Compare 9 and 1."
  pointer i a[2]
  compare a[2] a[3]
step "9 > 1, so swap. 9 is now in its place."
  swap a[2] a[3]
  done a[3]
```

## 3. Trees are written level by level

Write the values row by row, from the top. Slot 0 is the root, its children are slots 1 and 2, theirs are 3 to 6, and so on. `_` is an empty slot, and every value needs a parent above it. `set` can fill a slot past the end.

````markdown
```algo
title "Insert 6 into a search tree"
tree t 5 2 8
step "6 > 5, so go right."
  focus t[0]
step "6 < 8, so go left of 8."
  focus t[2]
step "Slot 5 is the left child of 8. Put 6 there."
  set t[5] 6
```
````

```algo
title "Insert 6 into a search tree"
tree t 5 2 8
step "6 > 5, so go right."
  focus t[0]
step "6 < 8, so go left of 8."
  focus t[2]
step "Slot 5 is the left child of 8. Put 6 there."
  set t[5] 6
```

## 4. Linked lists and graphs

A `list` draws boxes with arrows and a `null` at the end; `append` and `remove` change its length. A `graph` is written as links: `--` is plain, `->` is one way. Name a node as `g.a`. `visit` stays, `path` lights a link for one step.

````markdown
```algo
title "Walking a graph from a"
graph g: a -- b -- d
graph g: a -- c -- d
step "Start at a."
  focus g.a
step "Go to b."
  visit g.a
  path g.a g.b
  focus g.b
step "Then d."
  visit g.b
  path g.b g.d
  focus g.d
```
````

```algo
title "Walking a graph from a"
graph g: a -- b -- d
graph g: a -- c -- d
step "Start at a."
  focus g.a
step "Go to b."
  visit g.a
  path g.a g.b
  focus g.b
step "Then d."
  visit g.b
  path g.b g.d
  focus g.d
```

```algo
title "Insert at the front of a list"
list l 7 3
step "Add 9 at the end."
  append l 9
step "Remove the 3."
  remove l[1]
```

## What to remember

- Declare structures first, then write `step` lines.
- `compare`, `focus`, `swap`, `set` and `path` last one step. `done`, `visit` and `pointer` stay until you remove them.
- A mistake shows its line number and, often, a suggestion.

```quiz
type: single
question: Which line keeps a cell green in every later step?
options:
  - compare a[2]
  - done a[2]
  - focus a[2]
  - swap a[2] a[3]
answer: 2
explain: done stays until you write unmark or reset. compare, focus and swap clear at the next step.
```
