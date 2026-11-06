## valid-parentheses

### Walkthrough
**Goal:** every closer must match the most recent unmatched opener (LIFO → stack).

1. Scan characters left to right.
2. Opener → push the closer we will *expect* (`(` pushes `)`).
3. Closer → the stack top must equal it. Empty stack or mismatch → invalid. Otherwise pop.
4. At the end, leftovers mean unclosed openers → invalid.

**Dry run** `"([)]"`:

| c | stack before | action | stack after |
|---|---|---|---|
| ( | [] | push ) | [)] |
| [ | [)] | push ] | [), ]] |
| ) | [), ]] | top is ] ≠ ) | **false** |

And `"{[]}"`: push }, push ], pop ], pop } → empty → true.

**Quick reject:** odd length → false immediately.

## min-stack

### Walkthrough
**Goal:** know the minimum of the stack in O(1) after any push/pop.

1. Each entry stores `{value, minSoFar}` where `minSoFar` = minimum of this element and everything below it.
2. **push(v):** new min = `v` if empty else `min(v, top.minSoFar)`.
3. **pop():** just remove the top — the entry below already knows its own minimum, so nothing needs recomputing.
4. **getMin():** read `top.minSoFar`.

**Dry run**: push 5, push 3, push 7, push 3, pop, pop, pop:

| op | stack (value, min) top at right | getMin |
|---|---|---|
| push 5 | (5,5) | 5 |
| push 3 | (5,5) (3,3) | 3 |
| push 7 | … (7,3) | 3 |
| push 3 | … (3,3) | 3 |
| pop | (5,5) (3,3) (7,3) | 3 |
| pop | (5,5) (3,3) | 3 |
| pop | (5,5) | **5** — restored automatically |

## evaluate-reverse-polish-notation

### Walkthrough
**Goal:** evaluate postfix — operands come before their operator.

1. Scan tokens left to right.
2. Number → push.
3. Operator → pop `b` (right operand, pushed last), pop `a`, push `a op b`.
4. At the end exactly one value remains: the result.

**Dry run** `["4","13","5","/","+"]`:

| token | stack before | action | stack after |
|---|---|---|---|
| 4 | [] | push | [4] |
| 13 | [4] | push | [4,13] |
| 5 | [4,13] | push | [4,13,5] |
| / | [4,13,5] | 13 / 5 = 2 | [4,2] |
| + | [4,2] | 4 + 2 = 6 | [6] |

**Pitfalls:** operand order for `-` and `/`; `"-11"` is a number (length > 1), not an operator; C++ division truncates toward zero as required.

## generate-parentheses

### Walkthrough
**Goal:** build only valid strings by never making an invalid prefix.

1. State: current string, `open` used, `close` used.
2. **Rule 1:** may add `(` if `open < n`.
3. **Rule 2:** may add `)` only if `close < open` (otherwise a `)` would have no partner).
4. When length reaches `2n`, record the string.
5. Backtrack: `push_back`, recurse, `pop_back`.

**Recursion tree for n = 2** (each node: string):

```text
""
└── "("
    ├── "(("
    │   └── "(()"
    │       └── "(())"   ✔
    └── "()"
        └── "()("
            └── "()()"   ✔
```

Notice `")"` is never tried at the root (close < open fails) — pruning is built in.

## daily-temperatures

### Walkthrough
**Goal:** for each day, the distance to the next strictly warmer day.

1. Maintain a stack of indices whose answer is unknown; their temperatures are **decreasing** from bottom to top.
2. For each day `i`: while the stack top is colder than `t[i]`, day `i` is that day's answer → `ans[top] = i − top`, pop.
3. Push `i` (it now waits for its own warmer day).
4. Indices left at the end never found a warmer day → stay 0.

**Dry run** `[73, 74, 75, 71, 69, 72, 76, 73]`:

| i | t[i] | pops (ans set) | stack after (temps) |
|---|---|---|---|
| 0 | 73 | — | [73] |
| 1 | 74 | 0→1 | [74] |
| 2 | 75 | 1→1 | [75] |
| 3 | 71 | — | [75,71] |
| 4 | 69 | — | [75,71,69] |
| 5 | 72 | 4→1, 3→2 | [75,72] |
| 6 | 76 | 5→1, 2→4 | [76] |
| 7 | 73 | — | [76,73] |

Answer `[1,1,4,2,1,1,0,0]`.

## car-fleet

### Walkthrough
**Goal:** count groups that arrive together.

1. Compute each car's solo arrival time: `(target − position) / speed`.
2. Sort cars by position, **closest to target first**.
3. Process in that order, tracking the arrival time of the fleet directly ahead (`slowest`).
4. A car with time ≤ `slowest` catches up before the target → joins that fleet (it can't pass, so the fleet's time stays `slowest`).
5. A car with time > `slowest` can never catch it → starts a new fleet; update `slowest`.

**Dry run** `target = 12`, positions `[10,8,0,5,3]`, speeds `[2,4,1,1,3]`:

| pos | speed | time | slowest before | result |
|---|---|---|---|---|
| 10 | 2 | 1 | 0 | new fleet (1) |
| 8 | 4 | 1 | 1 | joins |
| 5 | 1 | 7 | 1 | new fleet (2) |
| 3 | 3 | 3 | 7 | joins |
| 0 | 1 | 12 | 7 | new fleet (3) |

Answer **3**.

## largest-rectangle-in-histogram

### Walkthrough
**Goal:** for each bar, the widest rectangle using its full height — bounded by the nearest shorter bars on both sides.

1. Keep a stack of indices with **increasing** heights.
2. When `h[i]` is lower than the top's height, the top bar can't extend to `i`:
   1. Pop it — its height is `height`.
   2. Its right boundary is `i` (first shorter on the right).
   3. Its left boundary is the new stack top (first shorter on the left), or −1 if empty.
   4. Width = `i − left − 1`; update the best area.
3. Push `i`.
4. A sentinel `0` at the end forces all remaining bars to be popped and measured.

**Dry run** `[2, 1, 5, 6, 2, 3]` + sentinel 0:

| i | h[i] | popped (height, width, area) | stack after (indices) |
|---|---|---|---|
| 0 | 2 | — | [0] |
| 1 | 1 | (2, 1, 2) | [1] |
| 2 | 5 | — | [1,2] |
| 3 | 6 | — | [1,2,3] |
| 4 | 2 | (6, 1, 6), (5, 2, **10**) | [1,4] |
| 5 | 3 | — | [1,4,5] |
| 6 | 0 | (3,1,3), (2,4,8), (1,6,6) | [6] |

Answer **10** (bars 5 and 6, height 5).
