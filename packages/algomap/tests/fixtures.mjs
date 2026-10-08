/** The examples used throughout the tests and the README. */
export const BUBBLE = `title "Bubble sort, one pass"
array a 5 2 9 1
step "Start at the left. Compare the first two."
  pointer i a[0]
  compare a[0] a[1]
step "5 > 2, so swap them."
  swap a[0] a[1]
step "Compare 5 and 9."
  pointer i a[1]
  compare a[1] a[2]
step "9 > 1, so swap. 9 is now in place."
  pointer i a[2]
  swap a[2] a[3]
  done a[3]
`;

export const BST = `tree t 5 2 8
step "Insert 6: go right of 5, then left of 8."
  focus t[0]
  focus t[2]
step "Place it."
  set t[5] 6
`;

export const GRAPH = `graph g: a -- b -- c
graph g: a -> d
step "Start at a"
  focus g.a
step "Walk to b"
  visit g.a
  path g.a g.b
  focus g.b
`;

export const DP = `grid dp 3 4 fill="0" rows="a b c" cols="w x y z"
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
`;

export const HASH = `hash h 4 1:apple 1:fig 3:kiwi
step "Insert pear into bucket 1."
  insert h[1] pear
step "Remove fig."
  remove h[1:1]
  focus h[1:1]
`;

export const AVL = `tree t: 10(_ 20(_ 30))
step "Right-heavy: rotate left at 10."
  paint t.10 red
  rotate t.10 left
  paint t.20 black
`;

export const TRIE = `trie t cat car
step "Insert dog."
  insert t dog
  focus t.d
`;

export const DIJKSTRA = `graph g: a -4- b -1- c
graph g: a -2> c
place g.a 0 0
place g.b 2 0
place g.c 1 1
vars v dist=0 best=_
step "Start."
  tag g.a "0"
  focus g.a
step "Relax a to c."
  path g.a g.c
  tag g.c "2"
  set v.best 2
  weight g.a g.c 3
`;

export const FOREST = `tree uf: 1(2 3) 4(5)
step "Union: move root 4 under 1."
  move uf.4 uf.1
step "Detach 5."
  detach uf.5
  add uf 6=six
  add uf.6 7 at=1
`;
