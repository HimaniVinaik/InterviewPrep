## network-delay-time

### Walkthrough
**Goal:** time for a signal from `k` to reach every node = max over shortest-path distances.

1. Build an adjacency list of `(neighbour, weight)`.
2. Dijkstra: min-heap of `(distance, node)`, starting with `(0, k)`.
3. Pop the closest node. If its popped distance is larger than the best known (`d > dist[u]`), it's a stale entry → skip.
4. Relax each edge `u → v`: if `d + w < dist[v]`, update and push.
5. Answer = max distance; if any node is unreachable (still ∞) → −1.

**Dry run** `times = [[2,1,1],[2,3,1],[3,4,1]]`, `n = 4`, `k = 2`:

| pop (d, u) | relax | dist[1..4] |
|---|---|---|
| (0, 2) | 1 → 1, 3 → 1 | 1, 0, 1, ∞ |
| (1, 1) | — | |
| (1, 3) | 4 → 2 | 1, 0, 1, 2 |
| (2, 4) | — | |

Max = **2**.

## min-cost-to-connect-all-points

### Walkthrough
**Goal:** minimum spanning tree of a complete graph with Manhattan-distance weights.

1. Start with point 0 in the tree; `best[v]` = cheapest edge from the tree to `v` (initially ∞, `best[0] = 0`).
2. Repeat n times: pick the non-tree vertex `u` with the smallest `best[u]`, add it, add `best[u]` to the total.
3. Update every remaining `v`: `best[v] = min(best[v], dist(u, v))`.
4. With n² edges, scanning an array for the minimum (O(n) per step) beats a heap.

**Dry run** points `[[0,0],[2,2],[3,10],[5,2],[7,0]]`:

| step | add | cost | notes |
|---|---|---|---|
| 1 | P0 | 0 | best = [–, 4, 13, 7, 7] |
| 2 | P1 | 4 | P3 via P1: 3 |
| 3 | P3 | 3 | P4 via P3: 4 |
| 4 | P4 | 4 | |
| 5 | P2 | 9 | via P1 (1 + 8) |

Total **20**.

## swim-in-rising-water

### Walkthrough
**Goal:** minimise the **maximum elevation** on a path from top-left to bottom-right.

1. Path cost = max cell on the path (a "bottleneck"). Extending a path never decreases its cost, so Dijkstra's greedy choice is still valid with `max` instead of `+`.
2. Min-heap of `(time, r, c)`, starting with `(grid[0][0], 0, 0)`.
3. Pop the smallest time; if it's the target, done.
4. For each neighbour: `nt = max(t, grid[nr][nc])`; if it improves `best[nr][nc]`, push.

**Dry run** `[[0,2],[1,3]]`:

| pop (t, cell) | pushes |
|---|---|
| (0, (0,0)) | (2, (0,1)), (1, (1,0)) |
| (1, (1,0)) | (3, (1,1)) |
| (2, (0,1)) | (3, (1,1)) not better |
| (3, (1,1)) | target → **3** |

## cheapest-flights-within-k-stops

### Walkthrough
**Goal:** cheapest path using at most `k + 1` edges.

1. `dist` = cheapest known cost using at most `i` edges after round `i`.
2. Run `k + 1` rounds. In each round, copy `dist` to `next` and relax every edge **using only the previous round's values** (`dist[u] + w < next[v]`).
3. The copy prevents chaining two edges within one round (which would silently exceed the stop limit).

**Dry run** `n = 4`, flights `0→1 (100), 1→2 (100), 2→0 (100), 1→3 (600), 2→3 (200)`, `src 0`, `dst 3`, `k = 1`:

| round (edges allowed) | dist[0..3] |
|---|---|
| start | 0, ∞, ∞, ∞ |
| 1 | 0, 100, ∞, ∞ |
| 2 | 0, 100, 200, 700 |

Answer **700** (0→1→3). The cheaper 0→1→2→3 (400) needs 2 stops — not allowed.

## reconstruct-itinerary

### Walkthrough
**Goal:** an Euler path from JFK using every ticket once, lexicographically smallest.

1. Adjacency lists in lexical order (min-heap or sorted vector).
2. DFS from JFK: always take the smallest unused ticket and **consume** it.
3. When an airport has no outgoing tickets left, append it to `route` (post-order).
4. Reverse `route` at the end.
5. **Why post-order works:** if a greedy choice leads into a dead end, that dead end is appended first and therefore ends up at the *end* of the final itinerary — exactly where a dead end must be.

**Dry run** tickets `[JFK→KUL, JFK→NRT, NRT→JFK]`:

| stack | action | route |
|---|---|---|
| JFK | take KUL (smallest) | |
| JFK, KUL | KUL stuck → emit | [KUL] |
| JFK | take NRT | |
| JFK, NRT | take JFK | |
| JFK, NRT, JFK | stuck → emit ×3 | [KUL, JFK, NRT, JFK] |

Reversed: **JFK → NRT → JFK → KUL** — the greedy "KUL first" dead end moved to the end automatically.

## alien-dictionary

### Walkthrough
**Goal:** recover letter order from a sorted alien word list.

1. Register every letter that appears (even ones with no constraints must be in the output).
2. For each **adjacent** pair, find the first differing position `j`: `a[j]` comes before `b[j]` → edge `a[j] → b[j]`. Later characters tell us nothing.
3. **Invalid input:** `b` is a proper prefix of `a` (e.g. `"abc"` before `"ab"`) → return `""`.
4. Topological sort (Kahn's). If not all letters are output, there's a cycle → `""`.

**Dry run** `["wrt","wrf","er","ett","rftt"]`:

| pair | first difference | edge |
|---|---|---|
| wrt / wrf | t vs f | t → f |
| wrf / er | w vs e | w → e |
| er / ett | r vs t | r → t |
| ett / rftt | e vs r | e → r |

Chain: w → e → r → t → f. Answer **"wertf"**.
