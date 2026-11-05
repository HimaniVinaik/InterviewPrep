## network-delay-time

### Approach 1: Bellman-Ford
```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<long long> dist(n + 1, LLONG_MAX);
        dist[k] = 0;
        for (int round = 1; round < n; ++round) {            // n-1 rounds of relaxing every edge
            bool changed = false;
            for (auto& t : times)
                if (dist[t[0]] != LLONG_MAX && dist[t[0]] + t[2] < dist[t[1]]) {
                    dist[t[1]] = dist[t[0]] + t[2];
                    changed = true;
                }
            if (!changed) break;                              // early exit
        }
        long long ans = *max_element(dist.begin() + 1, dist.end());
        return ans == LLONG_MAX ? -1 : (int)ans;
    }
};
```

**Time:** O(V·E) · **Space:** O(V). Works with negative edges too (not needed here).

### Approach 2: Floyd-Warshall (all pairs)
```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        const int INF = 1e9;
        vector<vector<int>> d(n + 1, vector<int>(n + 1, INF));
        for (int i = 1; i <= n; ++i) d[i][i] = 0;
        for (auto& t : times) d[t[0]][t[1]] = min(d[t[0]][t[1]], t[2]);
        for (int m = 1; m <= n; ++m)                          // allow m as an intermediate node
            for (int i = 1; i <= n; ++i)
                for (int j = 1; j <= n; ++j)
                    d[i][j] = min(d[i][j], d[i][m] + d[m][j]);
        int ans = 0;
        for (int j = 1; j <= n; ++j) ans = max(ans, d[k][j]);
        return ans >= INF ? -1 : ans;
    }
};
```

**Time:** O(V³) · **Space:** O(V²). Overkill for one source, but n ≤ 100 makes it fine — and it answers every source at once.

### Approach 3: SPFA (queue-based Bellman-Ford)
```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<pair<int, int>>> adj(n + 1);
        for (auto& t : times) adj[t[0]].push_back({t[1], t[2]});
        vector<int> dist(n + 1, INT_MAX);
        vector<bool> inQ(n + 1, false);
        queue<int> q; q.push(k); dist[k] = 0; inQ[k] = true;
        while (!q.empty()) {
            int u = q.front(); q.pop(); inQ[u] = false;
            for (auto [v, w] : adj[u])
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    if (!inQ[v]) { q.push(v); inQ[v] = true; }   // only re-process improved nodes
                }
        }
        int ans = *max_element(dist.begin() + 1, dist.end());
        return ans == INT_MAX ? -1 : ans;
    }
};
```

**Time:** O(V·E) worst, often fast in practice · **Space:** O(V + E).

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

### Approach 1: Kruskal (sort all edges + union-find)
```cpp
class Solution {
    vector<int> p;
    int find(int x) { while (p[x] != x) x = p[x] = p[p[x]]; return x; }
public:
    int minCostConnectPoints(vector<vector<int>>& pts) {
        int n = pts.size();
        vector<tuple<int, int, int>> edges;                       // (cost, i, j)
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j)
                edges.push_back({abs(pts[i][0] - pts[j][0]) + abs(pts[i][1] - pts[j][1]), i, j});
        ranges::sort(edges);
        p.resize(n); iota(p.begin(), p.end(), 0);
        int total = 0, used = 0;
        for (auto [w, a, b] : edges) {
            int ra = find(a), rb = find(b);
            if (ra == rb) continue;                                // would form a cycle
            p[ra] = rb; total += w;
            if (++used == n - 1) break;                            // MST complete
        }
        return total;
    }
};
```

**Time:** O(n² log n) · **Space:** O(n²). The classic MST algorithm; good for sparse graphs.

### Approach 2: Prim with a min-heap (lazy)
```cpp
class Solution {
public:
    int minCostConnectPoints(vector<vector<int>>& pts) {
        int n = pts.size(), total = 0, added = 0;
        vector<bool> in(n, false);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;   // (cost, node)
        pq.push({0, 0});
        while (added < n) {
            auto [w, u] = pq.top(); pq.pop();
            if (in[u]) continue;                                    // stale entry
            in[u] = true; total += w; ++added;
            for (int v = 0; v < n; ++v)
                if (!in[v]) pq.push({abs(pts[u][0] - pts[v][0]) + abs(pts[u][1] - pts[v][1]), v});
        }
        return total;
    }
};
```

**Time:** O(n² log n) · **Space:** O(n²) heap entries. The array-based Prim (Optimal) avoids the log factor.

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

### Approach 1: Binary search on time + BFS
```cpp
class Solution {
public:
    int swimInWater(vector<vector<int>>& g) {
        int n = g.size();
        auto canReach = [&](int t) {
            if (g[0][0] > t) return false;
            vector<vector<bool>> seen(n, vector<bool>(n, false));
            queue<pair<int, int>> q; q.push({0, 0}); seen[0][0] = true;
            while (!q.empty()) {
                auto [r, c] = q.front(); q.pop();
                if (r == n - 1 && c == n - 1) return true;
                for (auto [nr, nc] : {pair{r + 1, c}, pair{r - 1, c}, pair{r, c + 1}, pair{r, c - 1}})
                    if (nr >= 0 && nc >= 0 && nr < n && nc < n && !seen[nr][nc] && g[nr][nc] <= t) {
                        seen[nr][nc] = true; q.push({nr, nc});
                    }
            }
            return false;
        };
        int lo = 0, hi = n * n - 1;                       // elevations are 0..n²-1
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (canReach(mid)) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
};
```

**Time:** O(n² log n²) · **Space:** O(n²). "Minimise the max" + monotonic feasibility → binary search on the answer.

### Approach 2: Union-find, flooding cells in elevation order
```cpp
class Solution {
    vector<int> p;
    int find(int x) { while (p[x] != x) x = p[x] = p[p[x]]; return x; }
public:
    int swimInWater(vector<vector<int>>& g) {
        int n = g.size();
        vector<int> where(n * n);                        // where[h] = cell with elevation h
        for (int r = 0; r < n; ++r) for (int c = 0; c < n; ++c) where[g[r][c]] = r * n + c;
        p.resize(n * n); iota(p.begin(), p.end(), 0);
        for (int t = 0; t < n * n; ++t) {                // at time t, cell `where[t]` becomes swimmable
            int r = where[t] / n, c = where[t] % n;
            for (auto [nr, nc] : {pair{r + 1, c}, pair{r - 1, c}, pair{r, c + 1}, pair{r, c - 1}})
                if (nr >= 0 && nc >= 0 && nr < n && nc < n && g[nr][nc] <= t) p[find(r * n + c)] = find(nr * n + nc);
            if (find(0) == find(n * n - 1)) return t;
        }
        return -1;
    }
};
```

**Time:** O(n² α) · **Space:** O(n²). Uses the fact that elevations are a permutation of 0..n²−1.

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

### Approach 1: BFS by number of stops
```cpp
class Solution {
public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        vector<vector<pair<int, int>>> adj(n);
        for (auto& f : flights) adj[f[0]].push_back({f[1], f[2]});
        vector<int> best(n, INT_MAX);
        best[src] = 0;
        queue<pair<int, int>> q;                          // (city, cost so far)
        q.push({src, 0});
        for (int stops = 0; stops <= k && !q.empty(); ++stops) {
            for (int sz = q.size(); sz > 0; --sz) {       // one more flight per level
                auto [u, cost] = q.front(); q.pop();
                for (auto [v, w] : adj[u])
                    if (cost + w < best[v]) { best[v] = cost + w; q.push({v, cost + w}); }
            }
        }
        return best[dst] == INT_MAX ? -1 : best[dst];
    }
};
```

**Time:** O(k · E) · **Space:** O(V + E). Level = number of flights taken, so we stop after k+1 levels.

### Approach 2: Dijkstra on (city, stops) states
```cpp
class Solution {
public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        vector<vector<pair<int, int>>> adj(n);
        for (auto& f : flights) adj[f[0]].push_back({f[1], f[2]});
        vector<int> fewestStops(n, INT_MAX);                    // fewest stops seen when popping a city
        using T = tuple<int, int, int>;                         // (cost, city, stops used)
        priority_queue<T, vector<T>, greater<>> pq;
        pq.push({0, src, 0});
        while (!pq.empty()) {
            auto [cost, u, s] = pq.top(); pq.pop();
            if (u == dst) return cost;                          // cheapest valid arrival
            if (s > k || s >= fewestStops[u]) continue;         // a cheaper pop already used fewer stops
            fewestStops[u] = s;
            for (auto [v, w] : adj[u]) pq.push({cost + w, v, s + 1});
        }
        return -1;
    }
};
```

**Time:** O(E·k log(E·k)) · **Space:** O(E·k). A later pop with **more** stops is useless because an earlier (cheaper) pop already reached this city with fewer stops.

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

### Approach 1: Backtracking DFS with sorted tickets
```cpp
class Solution {
    unordered_map<string, vector<pair<string, bool>>> adj;   // (destination, used)
    vector<string> route;
    int total;
    bool dfs(const string& a) {
        if ((int)route.size() == total + 1) return true;     // used every ticket
        for (auto& [to, used] : adj[a]) {
            if (used) continue;
            used = true; route.push_back(to);
            if (dfs(to)) return true;
            used = false; route.pop_back();                  // dead end: undo
        }
        return false;
    }
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        for (auto& t : tickets) adj[t[0]].push_back({t[1], false});
        for (auto& [k, v] : adj) ranges::sort(v);            // lexical order => first full route is smallest
        total = tickets.size();
        route = {"JFK"};
        dfs("JFK");
        return route;
    }
};
```

**Time:** exponential worst case · **Space:** O(E). Intuitive; Hierholzer avoids backtracking.

### Approach 2: Iterative Hierholzer with an explicit stack
```cpp
class Solution {
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        unordered_map<string, vector<string>> adj;
        for (auto& t : tickets) adj[t[0]].push_back(t[1]);
        for (auto& [k, v] : adj) ranges::sort(v, greater<>{});   // reverse: pop_back gives smallest
        vector<string> st{"JFK"}, route;
        while (!st.empty()) {
            auto& out = adj[st.back()];
            if (!out.empty()) { st.push_back(out.back()); out.pop_back(); }   // follow an unused edge
            else { route.push_back(st.back()); st.pop_back(); }              // stuck: emit (post-order)
        }
        ranges::reverse(route);
        return route;
    }
};
```

**Time:** O(E log E) · **Space:** O(E). No recursion — handles very long itineraries.

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

### Approach 1: DFS topological sort with cycle detection
```cpp
class Solution {
    unordered_map<char, unordered_set<char>> adj;
    unordered_map<char, int> state;                          // 0 new, 1 visiting, 2 done
    string out;
    bool dfs(char c) {
        state[c] = 1;
        for (char n : adj[c]) {
            if (state[n] == 1) return false;                 // cycle
            if (state[n] == 0 && !dfs(n)) return false;
        }
        state[c] = 2;
        out += c;                                            // post-order
        return true;
    }
public:
    string alienOrder(vector<string>& words) {
        for (auto& w : words) for (char c : w) state[c] = 0;
        for (size_t i = 0; i + 1 < words.size(); ++i) {
            const string &a = words[i], &b = words[i + 1];
            size_t j = 0;
            while (j < a.size() && j < b.size() && a[j] == b[j]) ++j;
            if (j == min(a.size(), b.size())) { if (a.size() > b.size()) return ""; continue; }
            adj[a[j]].insert(b[j]);
        }
        for (auto& [c, s] : state) if (s == 0 && !dfs(c)) return "";
        ranges::reverse(out);
        return out;
    }
};
```

**Time:** O(total chars) · **Space:** O(alphabet²).

### Approach 2: Pairwise comparison of all word pairs (not just adjacent)
Comparing every pair `(i, j)` with `i < j` adds redundant (but consistent) edges — O(n² · L) work for no benefit. Adjacent pairs are sufficient because sorted order is transitive. Worth stating to show you know *why* only neighbours matter.

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
