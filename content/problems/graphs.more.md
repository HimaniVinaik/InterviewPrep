## number-of-islands

### Walkthrough
**Goal:** count connected components of `'1'` cells.

1. Scan every cell. A `'1'` we haven't visited is the start of a **new island** → `count++`.
2. Flood-fill from it, turning all connected land into `'0'` so it's never counted again.
3. DFS visits 4 neighbours; out-of-bounds or water stops the recursion.

**Dry run**

```text
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
```

| scan hits | count | sinks |
|---|---|---|
| (0,0) | 1 | the 2×2 block |
| (2,2) | 2 | just (2,2) (diagonals don't connect) |
| (3,3) | 3 | (3,3), (3,4) |

Answer **3**.

## clone-graph

### Walkthrough
**Goal:** deep copy with the same edge structure, handling cycles.

1. `copies` maps original → clone; it also serves as the visited set.
2. `cloneGraph(n)`: if already copied, return the copy (this is what stops infinite recursion on cycles).
3. Otherwise create the copy, **register it before recursing**, then clone each neighbour and add it to the copy's neighbour list.

**Dry run** square 1–2–3–4–1:

| call | action |
|---|---|
| clone(1) | create 1', recurse neighbours 2, 4 |
| clone(2) | create 2', neighbours 1 (already → 1'), 3 |
| clone(3) | create 3', neighbours 2 (→2'), 4 |
| clone(4) | create 4', neighbours 1 (→1'), 3 (→3') |
| back in clone(1) | neighbour 4 → already 4' |

Each edge is traversed once from each side → O(V + E).

## max-area-of-island

### Walkthrough
**Goal:** size of the largest connected component of 1s.

1. Same scan as Number of Islands.
2. The flood fill **returns the number of cells it sinks**: `1 + area(4 neighbours)`.
3. Track the maximum over all islands.

**Dry run** grid `[[1,1,0],[0,1,0],[0,0,1]]`:

| start | cells sunk | area | best |
|---|---|---|---|
| (0,0) | (0,0),(0,1),(1,1) | 3 | 3 |
| (2,2) | (2,2) | 1 | 3 |

## pacific-atlantic-water-flow

### Walkthrough
**Goal:** cells from which water can reach both oceans, flowing to equal-or-lower neighbours.

1. **Reverse the flow:** instead of asking "can water from X reach the ocean?", start at the ocean edges and climb **uphill** (to neighbours with height ≥ current). Anything reached can drain to that ocean.
2. Run the climb from all Pacific edge cells (top row + left column) → `pac` set.
3. Same from the Atlantic edges (bottom row + right column) → `atl` set.
4. Answer = cells in both.

**Dry run (small)** heights:

```text
1 2
4 3
```

- Pacific starts: (0,0)=1, (0,1)=2, (1,0)=4. From 2 climb to 3 → pac = all four cells.
- Atlantic starts: (1,0)=4, (1,1)=3, (0,1)=2. From 2, the neighbour 1 is lower → not added. atl = {(0,1), (1,0), (1,1)}.
- Both: (0,1), (1,0), (1,1).

## surrounded-regions

### Walkthrough
**Goal:** flip every `'O'` that isn't connected to the border.

1. **Invert the question:** find the `'O'`s that are *safe* (connected to the edge) — those are easy to find by flooding from the border.
2. Flood from every border `'O'`, marking cells `'S'`.
3. Final pass: `'S'` → `'O'` (safe), any remaining `'O'` → `'X'` (captured).

**Dry run**

```text
X X X X        X X X X
X O O X   →    X X X X
X X O X        X X X X
X O X X        X O X X
```

The bottom `'O'` at (3,1) is on the border → safe. The inner group (1,1),(1,2),(2,2) never touches the border → captured.

## rotting-oranges

### Walkthrough
**Goal:** minutes until no fresh orange remains — every rotten orange spreads simultaneously.

1. **Multi-source BFS:** enqueue *all* initially rotten oranges at time 0; count fresh ones.
2. Process the queue level by level; each level is one minute.
3. Each rotten orange rots its fresh neighbours (mark immediately so they aren't enqueued twice) and decrements `fresh`.
4. When the queue empties: `fresh > 0` → some are unreachable → −1; else return minutes.

**Dry run**

```text
2 1 1
1 1 0
0 1 1
```

| minute | newly rotten | fresh left |
|---|---|---|
| 0 | (0,0) initially | 6 |
| 1 | (0,1), (1,0) | 4 |
| 2 | (0,2), (1,1) | 2 |
| 3 | (2,1) | 1 |
| 4 | (2,2) | 0 |

Answer **4**.

## walls-and-gates

### Walkthrough
**Goal:** each empty room's distance to the *nearest* gate.

1. Enqueue **all gates** (distance 0) at once — multi-source BFS.
2. BFS expands in rings of increasing distance from the set of gates.
3. When an empty room (`INF`) is reached for the first time, that distance is the shortest from *any* gate → write `parent + 1`, enqueue.
4. Walls (−1) and already-filled rooms are skipped (they're not `INF`).

**Dry run**

```text
INF  -1   0  INF        3  -1   0   1
INF INF INF   -1   →    2   2   1  -1
INF  -1 INF   -1        1  -1   2  -1
  0  -1 INF  INF        0  -1   3   4
```

Ring 1 around the two gates fills the 1s, ring 2 the 2s, and so on.

## course-schedule

### Walkthrough
**Goal:** all courses can be taken ⇔ the prerequisite graph has no cycle.

1. Build edges `b → a` for each pair `[a, b]` ("b unlocks a") and count in-degrees.
2. Queue all courses with in-degree 0 (no prerequisites).
3. Pop a course, "take" it, and decrement the in-degree of each course it unlocks; any that reach 0 join the queue.
4. If the number taken equals `n`, no cycle. Courses on a cycle never reach in-degree 0.

**Dry run** `n = 4`, prereqs `[[1,0],[2,1],[3,2],[1,3]]` (1→2→3→1 cycle):

| queue | take | in-degrees after |
|---|---|---|
| [0] | 0 | 1: 2→1 |
| [] | — | 1, 2, 3 all stuck at 1 |

Taken 1 of 4 → **false**.

## course-schedule-ii

### Walkthrough
**Goal:** output a valid course order, or `[]` if impossible.

1. Kahn's algorithm exactly as in Course Schedule.
2. The order in which courses are popped from the queue is the answer — each course is popped only after all its prerequisites were popped.
3. If fewer than `n` were popped, a cycle exists → `[]`.

**Dry run** `n = 4`, `[[1,0],[2,0],[3,1],[3,2]]`:

| queue | pop | unlock | order |
|---|---|---|---|
| [0] | 0 | 1, 2 → indeg 0 | [0] |
| [1, 2] | 1 | 3 → indeg 1 | [0,1] |
| [2] | 2 | 3 → indeg 0 | [0,1,2] |
| [3] | 3 | — | [0,1,2,3] |

## graph-valid-tree

### Walkthrough
**Goal:** connected and acyclic.

1. A tree on n nodes has exactly `n − 1` edges. Any other count → not a tree.
2. With exactly `n − 1` edges, "no cycle" implies connected (and vice versa).
3. Use union-find: for each edge, if both endpoints already share a root, the edge closes a cycle → false. Otherwise union them.

**Dry run** `n = 5`, edges `[[0,1],[1,2],[2,3],[1,3],[1,4]]` → 5 edges ≠ 4 → false immediately. With `[[0,1],[0,2],[0,3],[1,4]]` (4 edges):

| edge | roots | action |
|---|---|---|
| 0–1 | different | union |
| 0–2 | different | union |
| 0–3 | different | union |
| 1–4 | different | union → **true** |

## number-of-connected-components-in-an-undirected-graph

### Walkthrough
**Goal:** count the groups of connected nodes.

1. Start with `n` singleton components.
2. For each edge, find both roots. If different, merge them → one fewer component.
3. If the same, the edge is redundant (inside one component) → no change.

**Dry run** `n = 5`, edges `[[0,1],[1,2],[3,4]]`:

| edge | merge? | comps |
|---|---|---|
| start | | 5 |
| 0–1 | yes | 4 |
| 1–2 | yes | 3 |
| 3–4 | yes | **2** |

## redundant-connection

### Walkthrough
**Goal:** the edge that, when added, first creates a cycle.

1. Union-find over nodes `1..n`.
2. Process edges in order. If `find(u) == find(v)`, u and v are already connected — adding this edge makes a cycle → return it.
3. Otherwise union.

**Dry run** `[[1,2],[1,3],[2,3]]`:

| edge | find(u), find(v) | action |
|---|---|---|
| 1–2 | 1, 2 | union |
| 1–3 | 2, 3 | union |
| 2–3 | 3, 3 | same root → **[2,3]** |

## word-ladder

### Walkthrough
**Goal:** shortest transformation sequence = shortest path in an implicit graph where words differing by one letter are adjacent.

1. Put the word list in a hash set for O(1) lookups.
2. BFS from `begin`, level by level (`steps` = words in the sequence so far).
3. For each word, generate all neighbours: for every position, try `'a'..'z'`.
4. A neighbour in the dictionary is enqueued and **erased** (marks visited, prevents revisiting).
5. Reaching `end` returns the current `steps`.

**Dry run** `hit → cog`, list `[hot, dot, dog, lot, log, cog]`:

| level | words |
|---|---|
| 1 | hit |
| 2 | hot |
| 3 | dot, lot |
| 4 | dog, log |
| 5 | **cog** → answer 5 |
