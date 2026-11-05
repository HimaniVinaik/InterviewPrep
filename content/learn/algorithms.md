# Essential Algorithms

The algorithms you should be able to implement from memory, with the templates that make them quick to write correctly.

## 1. Sorting

### Quicksort (Lomuto partition)

```cpp
int partition(std::vector<int>& a, int lo, int hi) {   // pivot = a[hi]
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; ++j)
        if (a[j] < pivot) std::swap(a[i++], a[j]);
    std::swap(a[i], a[hi]);
    return i;
}
void quicksort(std::vector<int>& a, int lo, int hi) {
    while (lo < hi) {
        int p = partition(a, lo, hi);
        if (p - lo < hi - p) { quicksort(a, lo, p - 1); lo = p + 1; }  // recurse on smaller side:
        else                 { quicksort(a, p + 1, hi); hi = p - 1; }  // O(log n) stack worst case
    }
}
```

Average O(n log n), worst O(n²) (sorted input with a bad pivot → use random or median-of-three pivots). In-place, not stable.

### Merge sort

```cpp
void merge_sort(std::vector<int>& a, std::vector<int>& tmp, int lo, int hi) {   // [lo, hi)
    if (hi - lo < 2) return;
    int mid = lo + (hi - lo) / 2;
    merge_sort(a, tmp, lo, mid);
    merge_sort(a, tmp, mid, hi);
    std::merge(a.begin() + lo, a.begin() + mid, a.begin() + mid, a.begin() + hi, tmp.begin() + lo);
    std::copy(tmp.begin() + lo, tmp.begin() + hi, a.begin() + lo);
}
```

O(n log n) always, stable, O(n) extra memory. Ideal for linked lists (O(1) extra) and external sorting (data larger than RAM). Counting inversions is a merge sort variant.

### Others
- **Insertion sort:** O(n²) but fastest for tiny or nearly-sorted arrays (used inside introsort/Timsort).
- **Heapsort:** O(n log n) worst case, in place, not stable.
- **Counting / radix sort:** O(n + k) for bounded integer keys — beats comparison sorts.

## 2. Binary search

See *Problems → Binary Search* for the first-true template. Variants: search on answer, rotated arrays, `lower_bound`/`upper_bound`, floating-point bisection (iterate a fixed number of times).

## 3. Graph traversal

```cpp
// BFS: shortest path in an unweighted graph
std::vector<int> bfs(const std::vector<std::vector<int>>& adj, int src) {
    std::vector<int> dist(adj.size(), -1);
    std::queue<int> q;
    dist[src] = 0; q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
    }
    return dist;
}

// Iterative DFS (no recursion-depth risk)
void dfs(const std::vector<std::vector<int>>& adj, int src, std::vector<bool>& seen) {
    std::vector<int> st{src};
    while (!st.empty()) {
        int u = st.back(); st.pop_back();
        if (seen[u]) continue;
        seen[u] = true;
        for (int v : adj[u]) if (!seen[v]) st.push_back(v);
    }
}
```

Mark nodes visited **when enqueued** in BFS (not when dequeued) to avoid duplicates in the queue.

## 4. Shortest paths

| Algorithm | Weights | Complexity |
|---|---|---|
| BFS | unweighted | O(V + E) |
| 0-1 BFS (deque) | 0/1 | O(V + E) |
| Dijkstra (binary heap) | non-negative | O((V + E) log V) |
| Bellman-Ford | any, detects negative cycles | O(V·E) |
| Floyd-Warshall | all pairs | O(V³) |
| A* | non-negative + admissible heuristic | ≤ Dijkstra in practice |

Dijkstra template: *Problems → Advanced Graphs*.

## 5. Topological sort & cycle detection

Kahn's algorithm (BFS with in-degrees) or DFS post-order reversed. A directed cycle exists iff not all nodes are emitted (Kahn) or a back edge to a "visiting" (gray) node is found (DFS).

## 6. Minimum spanning tree

- **Kruskal:** sort edges by weight; add each edge if it connects two different DSU components. O(E log E).
- **Prim:** grow from a node using a min-heap of crossing edges. O(E log V); array version O(V²) for dense graphs.

## 7. Dynamic programming — methodology

1. Define the **state** precisely in words: "dp[i][j] = min cost to transform the first i chars of A into the first j chars of B".
2. Write the **transition** (choices at the current step).
3. **Base cases.**
4. **Evaluation order** (or memoised recursion).
5. Extract the answer; reconstruct the solution by storing choices if needed.
6. Optimise space (rolling arrays).

Classic families: Fibonacci-style (1-D), knapsack (0/1 & unbounded), LIS, LCS/edit distance, grid paths, interval DP (matrix-chain, burst balloons), bitmask DP (TSP over ≤ 20 nodes), tree DP, digit DP, DP on DAGs.

```cpp
// Memoised recursion template
std::unordered_map<long long, long long> memo;
long long solve(int i, int j) {
    if (/* base */ i == 0) return 0;
    long long key = (long long)i << 32 | j;
    if (auto it = memo.find(key); it != memo.end()) return it->second;
    long long best = /* combine solve(smaller states) */ 0;
    return memo[key] = best;
}
```

## 8. Greedy

Pick the locally best option — but **prove** it (exchange argument). Classics: activity selection (earliest end), Huffman coding, Dijkstra, Kruskal/Prim, fractional knapsack, interval scheduling, jump game, gas station.

## 9. Divide & conquer

Split, solve recursively, combine: merge sort, quicksort, binary search, closest pair of points (O(n log n)), Karatsuba multiplication, FFT, quickselect.

## 10. String algorithms

| Algorithm | Purpose | Complexity |
|---|---|---|
| KMP | pattern search using a failure function | O(n + m) |
| Rabin–Karp | rolling-hash search (many patterns) | O(n + m) average |
| Z-algorithm | longest prefix matches at each position | O(n) |
| Manacher | longest palindromic substring | O(n) |
| Trie / Aho-Corasick | multi-pattern search | O(n + total pattern length + matches) |
| Suffix array + LCP | substring queries | O(n log n) |

```cpp
// KMP prefix function: pi[i] = length of the longest proper prefix of s[0..i] that is also a suffix
std::vector<int> prefix_function(std::string_view s) {
    std::vector<int> pi(s.size());
    for (size_t i = 1; i < s.size(); ++i) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) ++k;
        pi[i] = k;
    }
    return pi;
}
// Find pattern p in text t: run on p + '#' + t; positions where pi == |p| are matches.
```

## 11. Bit algorithms

Popcount, lowest set bit (`x & -x`), subset enumeration, Gray code (`i ^ (i >> 1)`), XOR tricks. See *Problems → Bit Manipulation*.

## 12. Randomised & streaming

Reservoir sampling, Fisher–Yates shuffle, quickselect with random pivot, Bloom filters, HyperLogLog (cardinality), Count-Min sketch (frequencies). See *Math → Probability*.

## 13. Numerical

Newton's method, bisection, fast exponentiation, sieve of Eratosthenes, GCD, matrix exponentiation, numerical integration. See the *Math* section.

## How to practise algorithms

- Implement each from scratch once, test it, and keep it in a personal "template file".
- Re-implement without looking after a week.
- For each LeetCode problem, write down *which* algorithm and *why* — that's the pattern recognition you're building.
