## network-delay-time
### Complexity
**Time, step by step** (V nodes, E edges)
1. Building the adjacency list: O(V + E).
2. Each successful relaxation pushes one heap entry → at most E pushes (lazy deletion keeps stale entries rather than decreasing keys).
3. Each push and pop costs O(log E) = O(log V²) = O(log V).
4. Each edge is relaxed when its source is popped (once per node, thanks to the stale-entry skip).
5. Total: **O((V + E) log V)**.

**Space:** adjacency O(V + E), distances O(V), heap up to O(E) → **O(V + E)**.

**Comparison:** Bellman-Ford is O(V · E); Floyd-Warshall is O(V³) but answers every source.

## min-cost-to-connect-all-points
### Complexity
**Time, step by step** (n points, complete graph with n(n−1)/2 edges)
1. n iterations of the outer loop (one vertex added per iteration).
2. Each iteration scans all n vertices for the minimum `best`: O(n).
3. Each iteration then updates `best` for all n vertices, computing a Manhattan distance in O(1) each: O(n).
4. Total: **O(n²)** — optimal here, since a complete graph has Θ(n²) edges and every edge weight could matter.

**Space:** `best` and `inTree` → **O(n)**. No edge list is ever built (Kruskal would need O(n²) for the edges).

## swim-in-rising-water
### Complexity
**Time, step by step** (n×n grid, N = n² cells)
1. Each cell can be pushed into the heap several times (once per improvement), at most 4 times (once per neighbour).
2. Each push and pop costs O(log N).
3. Total: **O(N log N)** = O(n² log n).

**Space:** `best` grid O(N) + heap O(N) → **O(n²)**.

**Comparison:** binary search + BFS is O(n² log n) too; union-find in elevation order is O(n² α(n²)).

## cheapest-flights-within-k-stops
### Complexity
**Time, step by step** (n cities, E flights)
1. k + 1 rounds.
2. Each round copies `dist` (O(n)) and relaxes every flight once (O(E)).
3. Total: **O(k · (n + E))**.

**Space:** `dist` and `next` → **O(n)**.

**Why not plain Dijkstra?** It returns the cheapest path regardless of stops; constraining stops requires (city, stops) states → O(E·k log(E·k)).

## reconstruct-itinerary
### Complexity
**Time, step by step** (E tickets)
1. Inserting E destinations into per-airport min-heaps: O(E log E).
2. Hierholzer's DFS consumes every ticket exactly once; each consumption pops from a heap: O(log E).
3. Each airport is appended to the route once per incoming ticket, plus the start: O(E).
4. Reversing the route: O(E).
5. Total: **O(E log E)**.

**Space:** heaps O(E), route O(E), recursion depth up to E → **O(E)**.

**Comparison:** greedy DFS with backtracking can be exponential on adversarial inputs.

## alien-dictionary
### Complexity
**Time, step by step** (C = total characters across all words, U = unique letters ≤ 26)
1. Registering letters: O(C).
2. Comparing adjacent words: each comparison stops at the first difference, so the total work is bounded by C.
3. Edges: at most one per adjacent pair → ≤ n − 1 (and ≤ U² distinct).
4. Kahn's algorithm: O(U + edges).
5. Total: **O(C)** (U and the edge count are bounded by constants for a 26-letter alphabet).

**Space:** adjacency sets O(U²) = O(1) for a fixed alphabet, plus in-degrees O(U) → **O(1)** w.r.t. input size (O(U + edges) in general).
