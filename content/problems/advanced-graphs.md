# Advanced Graphs

**Recognise it when:** edges have **weights** (cost, time, distance) or you need a spanning tree, an Euler path, or ordering from partial information.

| Problem | Algorithm | Complexity |
|---|---|---|
| Single-source shortest path, non-negative weights | **Dijkstra** (min-heap) | O(E log V) |
| Negative weights / at most K edges | **Bellman-Ford** (K+1 rounds) | O(K·E) |
| All-pairs, small V | Floyd-Warshall | O(V³) |
| Minimum spanning tree | **Prim** (heap) or **Kruskal** (sort + DSU) | O(E log V) |
| Use every edge once | **Hierholzer** (Euler path) | O(E) |
| 0/1 weights | 0-1 BFS with deque | O(V + E) |

**Dijkstra template**

```cpp
vector<long long> dijkstra(int src, const vector<vector<pair<int,int>>>& adj) {
    vector<long long> dist(adj.size(), LLONG_MAX);
    priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
    dist[src] = 0; pq.emplace(0, src);
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;               // stale entry (lazy deletion)
        for (auto [v, w] : adj[u])
            if (d + w < dist[v]) { dist[v] = d + w; pq.emplace(dist[v], v); }
    }
    return dist;
}
```

## Network Delay Time
- difficulty: Medium
- leetcode: 743
- slug: network-delay-time

Directed weighted edges `times[i] = (u, v, w)`. A signal starts at `k`. How long until all `n` nodes receive it? -1 if some can't.

### Hint
Dijkstra from `k`; the answer is the max distance.

### Solution
```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<pair<int, int>>> adj(n + 1);
        for (auto& t : times) adj[t[0]].emplace_back(t[1], t[2]);
        vector<int> dist(n + 1, INT_MAX);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
        dist[k] = 0; pq.emplace(0, k);
        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (d > dist[u]) continue;
            for (auto [v, w] : adj[u])
                if (d + w < dist[v]) { dist[v] = d + w; pq.emplace(dist[v], v); }
        }
        int ans = *max_element(dist.begin() + 1, dist.end());
        return ans == INT_MAX ? -1 : ans;
    }
};
```

### Explanation
Textbook Dijkstra. The `d > dist[u]` check skips outdated heap entries (C++'s `priority_queue` has no decrease-key).

**Time:** O(E log V) · **Space:** O(V + E)

## Min Cost to Connect All Points
- difficulty: Medium
- leetcode: 1584
- slug: min-cost-to-connect-all-points

Connect all 2-D points with minimum total Manhattan distance.

### Hint
MST on a complete graph. Dense graph → O(V²) Prim without a heap is optimal.

### Solution
```cpp
class Solution {
public:
    int minCostConnectPoints(vector<vector<int>>& p) {
        int n = p.size(), total = 0;
        vector<int> best(n, INT_MAX);     // cheapest edge from tree to each point
        vector<bool> inTree(n, false);
        best[0] = 0;
        for (int it = 0; it < n; ++it) {
            int u = -1;
            for (int i = 0; i < n; ++i)
                if (!inTree[i] && (u == -1 || best[i] < best[u])) u = i;
            inTree[u] = true;
            total += best[u];
            for (int v = 0; v < n; ++v)
                if (!inTree[v])
                    best[v] = min(best[v], abs(p[u][0] - p[v][0]) + abs(p[u][1] - p[v][1]));
        }
        return total;
    }
};
```

### Explanation
With E = V², the array-based Prim (O(V²)) beats heap-based Prim or Kruskal (O(V² log V)). Knowing *when* to drop the heap shows real understanding.

**Time:** O(n²) · **Space:** O(n)

## Swim in Rising Water
- difficulty: Hard
- leetcode: 778
- slug: swim-in-rising-water

Grid of elevations; at time `t` you can swim through cells with elevation ≤ `t`. Minimum time to go from top-left to bottom-right.

### Hint
Minimise the **maximum** elevation along a path — Dijkstra with `max` instead of `+`.

### Solution
```cpp
class Solution {
public:
    int swimInWater(vector<vector<int>>& g) {
        int n = g.size();
        vector<vector<int>> best(n, vector<int>(n, INT_MAX));
        using T = tuple<int, int, int>;          // (time, r, c)
        priority_queue<T, vector<T>, greater<>> pq;
        best[0][0] = g[0][0]; pq.emplace(g[0][0], 0, 0);
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        while (!pq.empty()) {
            auto [t, r, c] = pq.top(); pq.pop();
            if (r == n - 1 && c == n - 1) return t;
            if (t > best[r][c]) continue;
            for (int k = 0; k < 4; ++k) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
                int nt = max(t, g[nr][nc]);
                if (nt < best[nr][nc]) { best[nr][nc] = nt; pq.emplace(nt, nr, nc); }
            }
        }
        return -1;
    }
};
```

### Explanation
Dijkstra works for any path cost that is monotone non-decreasing along the path (here: bottleneck = max). Alternatives: binary search on `t` + BFS, or DSU adding cells in elevation order.

**Time:** O(n² log n) · **Space:** O(n²)

## Cheapest Flights Within K Stops
- difficulty: Medium
- leetcode: 787
- slug: cheapest-flights-within-k-stops

Cheapest price from `src` to `dst` with at most `k` stops, or -1.

### Hint
Bellman-Ford limited to `k+1` relaxation rounds. Copy the distance array each round.

### Solution
```cpp
class Solution {
public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        vector<int> dist(n, INT_MAX);
        dist[src] = 0;
        for (int round = 0; round <= k; ++round) {      // k stops = k+1 edges
            vector<int> next = dist;                      // use only last round's values
            for (auto& f : flights) {
                int u = f[0], v = f[1], w = f[2];
                if (dist[u] != INT_MAX && dist[u] + w < next[v]) next[v] = dist[u] + w;
            }
            dist = std::move(next);
        }
        return dist[dst] == INT_MAX ? -1 : dist[dst];
    }
};
```

### Explanation
After round `i`, `dist` holds the cheapest cost using at most `i+1` edges. Copying prevents chaining several edges in one round. Plain Dijkstra fails here because a cheaper path with more stops can block a valid path.

**Time:** O(k · E) · **Space:** O(n)

## Reconstruct Itinerary
- difficulty: Hard
- leetcode: 332
- slug: reconstruct-itinerary

Use all tickets `[from, to]` exactly once starting at `"JFK"`; return the lexicographically smallest itinerary.

### Hint
Eulerian path — Hierholzer's algorithm: DFS, consuming edges in lexical order, appending airports post-order; reverse at the end.

### Solution
```cpp
class Solution {
    unordered_map<string, priority_queue<string, vector<string>, greater<>>> g;
    vector<string> route;
    void dfs(const string& a) {
        auto& pq = g[a];
        while (!pq.empty()) {
            string next = pq.top(); pq.pop();     // consume edge
            dfs(next);
        }
        route.push_back(a);                       // post-order
    }
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        for (auto& t : tickets) g[t[0]].push(t[1]);
        dfs("JFK");
        ranges::reverse(route);
        return route;
    }
};
```

### Explanation
Greedy lexical DFS alone can get stuck in a dead end. Hierholzer's post-order insertion automatically splices dead-end detours into the right place. Note: `g[a]` reference stays valid even while recursion inserts new keys? **Careful** — `unordered_map` rehashing invalidates *iterators* but **not references** to elements, so `auto& pq` is safe.

**Time:** O(E log E) · **Space:** O(E)

## Alien Dictionary
- difficulty: Hard
- leetcode: 269
- slug: alien-dictionary

Given words sorted in an alien language, return a valid letter order, or `""` if invalid.

### Hint
Compare adjacent words: the first differing letter gives an edge. Then topological sort. Watch for a prefix appearing after its extension (`"abc"` before `"ab"` is invalid).

### Solution
```cpp
class Solution {
public:
    string alienOrder(vector<string>& words) {
        unordered_map<char, unordered_set<char>> adj;
        unordered_map<char, int> indeg;
        for (auto& w : words) for (char c : w) indeg.try_emplace(c, 0);
        for (size_t i = 0; i + 1 < words.size(); ++i) {
            const string &a = words[i], &b = words[i + 1];
            size_t len = min(a.size(), b.size()), j = 0;
            while (j < len && a[j] == b[j]) ++j;
            if (j == len) {
                if (a.size() > b.size()) return "";     // "abc" before "ab"
                continue;
            }
            if (adj[a[j]].insert(b[j]).second) ++indeg[b[j]];
        }
        queue<char> q;
        for (auto [c, d] : indeg) if (d == 0) q.push(c);
        string order;
        while (!q.empty()) {
            char c = q.front(); q.pop();
            order += c;
            for (char nx : adj[c]) if (--indeg[nx] == 0) q.push(nx);
        }
        return order.size() == indeg.size() ? order : "";
    }
};
```

### Explanation
Only the **first** differing character between adjacent words tells us anything. Deduplicate edges (the `insert(...).second` check) so in-degrees stay correct. A cycle → invalid.

**Time:** O(total chars) · **Space:** O(alphabet²)
