## number-of-islands
### Complexity
**Time, step by step** (R×C grid)
1. The outer double loop visits all R·C cells once.
2. Each land cell is sunk exactly once (it becomes `'0'`, so it's never entered again).
3. Each sink call checks 4 neighbours → O(1) per call besides recursion.
4. Total: **O(R·C)**.

**Space:**
- Recursion depth can reach R·C for a snake-shaped island → **O(R·C)** worst case.
- BFS instead keeps the queue at O(min(R, C)) in typical cases.

## clone-graph
### Complexity
**Time, step by step** (V nodes, E edges)
1. Each node is cloned once (the map lookup prevents repeats): V `new`s.
2. Each adjacency entry is processed once per direction: 2E map lookups + pushes.
3. Total: **O(V + E)**.

**Space:**
- Map of V entries: O(V).
- Recursion depth: up to O(V) (a long path graph).
- Total: **O(V)** (the cloned graph itself is the output).

## max-area-of-island
### Complexity
**Time:** each cell is visited by the scan once and sunk at most once → **O(R·C)**.

**Space:** recursion depth up to R·C → **O(R·C)** worst case.

## pacific-atlantic-water-flow
### Complexity
**Time, step by step**
1. Pacific DFS: each cell is visited at most once (the `seen` grid prevents repeats) → O(R·C).
2. Atlantic DFS: same → O(R·C).
3. Final intersection scan: O(R·C).
4. Total: **O(R·C)**. The brute force (search from every cell) is O((R·C)²).

**Space:** two `seen` grids + recursion depth → **O(R·C)**.

## surrounded-regions
### Complexity
**Time, step by step**
1. Border scan: 2R + 2C cells.
2. Each `'O'` connected to the border is marked once.
3. Final pass over all cells.
4. Total: **O(R·C)**.

**Space:** recursion depth up to R·C → **O(R·C)** worst case.

## rotting-oranges
### Complexity
**Time, step by step**
1. Initial scan to enqueue rotten oranges and count fresh ones: O(R·C).
2. Each orange becomes rotten at most once, so it's enqueued and dequeued at most once.
3. Each dequeue checks 4 neighbours → O(1).
4. Total: **O(R·C)**.

**Space:** queue up to R·C cells → **O(R·C)**.

## walls-and-gates
### Complexity
**Time, step by step**
1. Scan to enqueue every gate: O(R·C).
2. Each empty room is assigned a distance the **first** time it's reached and is enqueued exactly once.
3. Each dequeue does 4 O(1) neighbour checks.
4. Total: **O(R·C)**. One BFS from each gate separately would be O(gates · R·C).

**Space:** queue → **O(R·C)**.

## course-schedule
### Complexity
**Time, step by step** (V = courses, E = prerequisites)
1. Building the adjacency list and in-degrees: O(V + E).
2. Each course is enqueued and dequeued at most once: O(V).
3. Each edge is examined once when its source is dequeued: O(E).
4. Total: **O(V + E)**.

**Space:** adjacency lists O(V + E), in-degrees O(V), queue O(V) → **O(V + E)**.

## course-schedule-ii
### Complexity
Identical to Course Schedule: **O(V + E)** time and **O(V + E)** space; recording the pop order adds an O(V) output vector.

## graph-valid-tree
### Complexity
**Time, step by step**
1. Edge-count check: O(1).
2. Initialising the parent array with `iota`: O(n).
3. For each of the n − 1 edges: two `find`s with path halving → amortised nearly O(1), formally O(α(n)).
4. Total: **O(n · α(n))** ≈ O(n).

**Space:** parent array → **O(n)**.

## number-of-connected-components-in-an-undirected-graph
### Complexity
**Time:** `iota` O(n) + E unions, each two near-constant `find`s → **O(n + E · α(n))**.

**Space:** parent array → **O(n)**. DFS alternative: O(n + E) time and O(n + E) space for the adjacency list.

## redundant-connection
### Complexity
**Time:** n edges, each with two `find`s → **O(n · α(n))**.

**Space:** parent array of n + 1 → **O(n)**.

**Comparison:** DFS-before-adding is O(n²); leaf-peeling to isolate the cycle is O(n).

## word-ladder
### Complexity
**Time, step by step** (N = dictionary size, L = word length)
1. Building the set: O(N · L) (hashing each word).
2. Each word is dequeued at most once (it's erased from the set when enqueued).
3. For each dequeued word: L positions × 26 letters = 26L candidates, and each candidate costs O(L) to hash and look up.
4. Total: **O(N · 26 · L²)** = O(N · L²).

**Space:** the set O(N · L) and the queue O(N · L) → **O(N · L)**.

**Speed-up:** bidirectional BFS explores roughly two "half-depth" frontiers, often reducing work by orders of magnitude.
