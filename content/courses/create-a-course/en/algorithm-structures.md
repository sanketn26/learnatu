---
title: More structures for algorithm diagrams
summary: Grids, stacks, queues, hash tables, tries, rotating trees, weighted graphs and variables
minutes: 14
objectives:
  - Pick the structure that matches your algorithm
  - Show a rotation, a union, a recursion or a shortest path step by step
  - Add notes and colours with tag and paint
---

The previous lesson used arrays, lists, trees and graphs. These other structures use the same `step` lines, and the same rule: **you write every picture**.

## 1. Grids, stacks and queues

A `grid` is rows and columns, for dynamic programming tables, boards and mazes. Cells are `g[row,col]`. A `stack` and a `queue` have their own `push` / `pop` and `enqueue` / `dequeue`, and `s.top`, `q.front`, `q.back` name their ends.

````markdown
```algo
grid dp 3 4 fill="0" rows="a b c" cols="w x y z"
stack s 1 2
queue q 7 8
step "Fill a cell, push, enqueue."
  set dp[1,2] 5
  compare dp[0..1,1]
  push s 3
  enqueue q 9
step "Pop and dequeue."
  pop s
  dequeue q
  focus q.front
  focus s.top
```
````

```algo
grid dp 3 4 fill="0" rows="a b c" cols="w x y z"
stack s 1 2
queue q 7 8
step "Fill a cell, push, enqueue."
  set dp[1,2] 5
  compare dp[0..1,1]
  push s 3
  enqueue q 9
step "Pop and dequeue."
  pop s
  dequeue q
  focus q.front
  focus s.top
```

## 2. Hash tables

`hash h 4` makes four buckets. Start with items as `bucket:value`. `h[1]` is a bucket and `h[1:0]` is the first item in its chain.

````markdown
```algo
hash h 4 1:apple 1:fig 3:kiwi
step "pear hashes to bucket 1, so it joins the chain."
  insert h[1] pear
step "Delete fig."
  focus h[1:1]
  remove h[1:1]
```
````

```algo
hash h 4 1:apple 1:fig 3:kiwi
step "pear hashes to bucket 1, so it joins the chain."
  insert h[1] pear
step "Delete fig."
  focus h[1:1]
  remove h[1:1]
```

## 3. Trees whose nodes move

Write the nodes out with brackets: `tree t: 10(_ 20(_ 30))`. An underscore is an empty child slot, so `10` has only a right child. `rotate t.10 left` lifts 10's right child into its place. `paint` colours a node, which is all a red-black tree needs. A node with several keys is written `n1="10 20"`: a short name, then the label.

````markdown
```algo
tree t: 10(_ 20(_ 30))
step "Right-heavy: rotate left at 10."
  paint t.10 red
  rotate t.10 left
  paint t.20 black
```
````

```algo
tree t: 10(_ 20(_ 30))
step "Right-heavy: rotate left at 10."
  paint t.10 red
  rotate t.10 left
  paint t.20 black
```

Several trees side by side make a forest, and `move` re-hangs a node under another. That is a union in union-find:

```algo
tree uf: 1(2 3) 4(5)
step "Union: hang root 4 under root 1."
  move uf.4 uf.1
```

## 4. Tries

`trie t cat car` builds the tree for you. Nodes are named by their prefix (`t.ca`) and a ring marks the end of a word. `insert t dog` adds the missing nodes.

```algo
trie t cat car
step "Insert dog."
  insert t dog
  focus t.dog
```

## 5. Weighted graphs, notes and variables

Put a weight in the link: `a -4- b`, or `a -2> c` for a one-way link. `place` fixes where a node goes. `tag` writes a small note next to any cell or node, such as a distance, and `vars` keeps scalar values.

````markdown
```algo
graph g: a -4- b -1- c
graph g: a -2> c
place g.a 0 0
place g.b 2 0
place g.c 1 1
vars v dist_c=_
step "Start at a."
  tag g.a "0"
  focus g.a
step "Relax a to c: 0 + 2 = 2."
  path g.a g.c
  tag g.c "2"
  set v.dist_c 2
```
````

```algo
graph g: a -4- b -1- c
graph g: a -2> c
place g.a 0 0
place g.b 2 0
place g.c 1 1
vars v dist_c=_
step "Start at a."
  tag g.a "0"
  focus g.a
step "Relax a to c: 0 + 2 = 2."
  path g.a g.c
  tag g.c "2"
  set v.dist_c 2
```

## Recursion

Draw the calls as a tree and the call stack as a `stack`. `add calls.fib4 fib3` grows the tree, `tag calls.fib2 "1"` writes a return value, `push` and `pop` show the stack.

```algo
tree calls: fib4(fib3(fib2 fib1) fib2b=fib2)
stack st fib4 fib3
step "fib(2) returns 1."
  focus calls.fib2
  tag calls.fib2 "1"
  push st fib2
  focus st.top
```

```quiz
type: single
question: "In a tree written as tree t: 10(_ 20), what does the underscore mean?"
options:
  - A node called underscore
  - An empty child slot, so 10 has only a right child
  - The tree is empty
answer: 1
explain: An underscore keeps the place of a missing child, which is what lets you tell a left child from a right one.
```
