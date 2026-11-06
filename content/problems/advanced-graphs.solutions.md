## network-delay-time

### Approach 1: Bellman-Ford
**The idea:** relax every edge n − 1 times. After round i, every shortest path that uses at most i edges is known.

```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        const int INF = INT_MAX;
        vector<int> dist(n + 1, INF);
        dist[k] = 0;

        for (int round = 1; round < n; round++) {
            bool changed = false;
            for (const vector<int>& t : times) {
                int u = t[0];
                int v = t[1];
                int w = t[2];
                if (dist[u] != INF && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;     // found a quicker route to v
                    changed = true;
                }
            }
            if (!changed) {
                break;                         // nothing improved: we're done early
            }
        }

        int answer = 0;
        for (int node = 1; node <= n; node++) {
            if (dist[node] == INF) {
                return -1;                     // some node never hears the signal
            }
            answer = max(answer, dist[node]);
        }
        return answer;
    }
};
```

**How it works:** a shortest path has at most n − 1 edges, so n − 1 rounds of relaxing all edges are enough.

**Think of it like this:** spreading rumours in rounds — each round, everyone tells their neighbours the fastest time they know.

**Cost:** Time **O(V · E)**. Space **O(V)**. Works with negative weights (not needed here).

### Approach 2: Floyd-Warshall (all pairs)
**The idea:** `d[i][j]` = shortest time from i to j. Allow intermediate nodes one by one: going through node m might be faster.

```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        const int INF = 1e9;
        vector<vector<int>> d(n + 1, vector<int>(n + 1, INF));
        for (int i = 1; i <= n; i++) {
            d[i][i] = 0;
        }
        for (const vector<int>& t : times) {
            d[t[0]][t[1]] = min(d[t[0]][t[1]], t[2]);
        }

        for (int m = 1; m <= n; m++) {            // allow m as a stop-over
            for (int i = 1; i <= n; i++) {
                for (int j = 1; j <= n; j++) {
                    if (d[i][m] + d[m][j] < d[i][j]) {
                        d[i][j] = d[i][m] + d[m][j];
                    }
                }
            }
        }

        int answer = 0;
        for (int node = 1; node <= n; node++) {
            if (d[k][node] >= INF) {
                return -1;
            }
            answer = max(answer, d[k][node]);
        }
        return answer;
    }
};
```

**How it works:** after processing m, `d[i][j]` is the best path using only stop-overs from {1..m}.

**Think of it like this:** a flight-price table you improve by asking "would a layover in city m be cheaper?" for every city m.

**Cost:** Time **O(V³)**. Space **O(V²)**. Overkill for one source, but simple.

### Optimal: Dijkstra with a min-heap
**The idea:** always settle the closest unsettled node next. With non-negative weights, once a node is popped with its best distance, that distance is final.

```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        // adj[u] = list of (v, w): an edge u → v taking w time.
        vector<vector<pair<int, int>>> adj(n + 1);
        for (const vector<int>& t : times) {
            adj[t[0]].push_back({t[1], t[2]});
        }

        vector<int> dist(n + 1, INT_MAX);
        // Min-heap of (distance, node): the closest node is on top.
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        dist[k] = 0;
        pq.push({0, k});

        while (!pq.empty()) {
            int d = pq.top().first;
            int u = pq.top().second;
            pq.pop();
            if (d > dist[u]) {
                continue;                       // stale entry: a shorter path was found already
            }
            for (const pair<int, int>& edge : adj[u]) {
                int v = edge.first;
                int w = edge.second;
                if (d + w < dist[v]) {          // relax: going through u is faster
                    dist[v] = d + w;
                    pq.push({dist[v], v});
                }
            }
        }

        int answer = 0;
        for (int node = 1; node <= n; node++) {
            if (dist[node] == INT_MAX) {
                return -1;                      // unreachable
            }
            answer = max(answer, dist[node]);
        }
        return answer;                          // the last node to receive the signal
    }
};
```

**How it works**
1. Adjacency list of `(neighbour, weight)`.
2. Heap starts with `(0, k)`.
3. Pop the closest; skip stale entries (`d > dist[u]`).
4. Relax each edge; push improved distances.
5. Answer = max distance, or −1 if any node is unreachable.

**Think of it like this:** water spreading through pipes — it always reaches the nearest junction first.

**Why it's optimal:** O((V + E) log V), the standard for single-source shortest paths with non-negative weights.

**Cost:** Time **O((V + E) log V)**. Space **O(V + E)**.

## min-cost-to-connect-all-points

### Approach 1: Kruskal — sort all edges + union-find
**The idea:** list every pair of points with its distance, sort by cost, and add edges from cheapest up, skipping any that would form a cycle.

```cpp
class Solution {
public:
    int minCostConnectPoints(vector<vector<int>>& points) {
        int n = points.size();
        vector<array<int, 3>> edges;               // (cost, i, j)
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int cost = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1]);
                edges.push_back({cost, i, j});
            }
        }
        sort(edges.begin(), edges.end());

        parent.resize(n);
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }
        int total = 0;
        int used = 0;
        for (const array<int, 3>& e : edges) {
            int a = find(e[1]);
            int b = find(e[2]);
            if (a == b) {
                continue;                           // already connected: would make a cycle
            }
            parent[a] = b;
            total += e[0];
            used++;
            if (used == n - 1) {
                break;                              // a tree on n points has n - 1 edges
            }
        }
        return total;
    }

private:
    vector<int> parent;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }
};
```

**How it works:** the cheapest edge that connects two separate groups is always safe to add.

**Think of it like this:** building roads between villages, cheapest first, never building a road between villages that are already connected.

**Cost:** Time **O(n² log n)**. Space **O(n²)** for the edge list.

### Approach 2: Prim with a min-heap
**The idea:** grow one tree from point 0; always add the cheapest edge leaving the tree.

```cpp
class Solution {
public:
    int minCostConnectPoints(vector<vector<int>>& points) {
        int n = points.size();
        vector<bool> inTree(n, false);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;   // (cost, point)
        pq.push({0, 0});
        int total = 0;
        int added = 0;

        while (added < n) {
            int cost = pq.top().first;
            int u = pq.top().second;
            pq.pop();
            if (inTree[u]) {
                continue;                   // already connected more cheaply
            }
            inTree[u] = true;
            total += cost;
            added++;
            for (int v = 0; v < n; v++) {
                if (!inTree[v]) {
                    int d = abs(points[u][0] - points[v][0]) + abs(points[u][1] - points[v][1]);
                    pq.push({d, v});
                }
            }
        }
        return total;
    }
};
```

**How it works:** the heap holds candidate edges; stale ones are skipped when popped.

**Think of it like this:** a growing network that always connects the nearest outside village next.

**Cost:** Time **O(n² log n)**. Space **O(n²)** heap entries.

### Optimal: Prim with an array (dense graph)
**The idea:** every pair of points is connected, so the graph is dense. Instead of a heap, keep `best[v]` = cheapest edge from the tree to v and scan the array for the minimum.

```cpp
class Solution {
public:
    int minCostConnectPoints(vector<vector<int>>& points) {
        int n = points.size();
        vector<int> best(n, INT_MAX);    // cheapest edge from the tree to each point
        vector<bool> inTree(n, false);
        best[0] = 0;                     // start the tree at point 0
        int total = 0;

        for (int step = 0; step < n; step++) {
            // Pick the outside point that is cheapest to connect.
            int u = -1;
            for (int i = 0; i < n; i++) {
                if (!inTree[i] && (u == -1 || best[i] < best[u])) {
                    u = i;
                }
            }
            inTree[u] = true;
            total += best[u];

            // Connecting u may give cheaper edges to the remaining points.
            for (int v = 0; v < n; v++) {
                if (!inTree[v]) {
                    int d = abs(points[u][0] - points[v][0]) + abs(points[u][1] - points[v][1]);
                    best[v] = min(best[v], d);
                }
            }
        }
        return total;
    }
};
```

**How it works**
1. `best[0] = 0`, others ∞.
2. n times: pick the cheapest outside point `u`, add it, add `best[u]` to the total.
3. Update every remaining `best[v]` with `dist(u, v)`.

**Think of it like this:** a "distance to the network" board for every village, updated each time a village joins.

**Why it's optimal:** with n² edges, O(n²) with plain arrays beats the O(n² log n) heap/sort methods and uses O(n) memory.

**Cost:** Time **O(n²)**. Space **O(n)**.

## swim-in-rising-water

### Approach 1: Binary search on time + BFS
**The idea:** "can I reach the end by time t?" is yes/no and gets easier as t grows. Binary search the smallest t, checking each with a BFS through cells ≤ t.

```cpp
class Solution {
public:
    int swimInWater(vector<vector<int>>& grid) {
        int n = grid.size();
        int lo = grid[0][0];
        int hi = n * n - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (canReach(grid, mid)) {
                hi = mid;                 // possible: try an earlier time
            } else {
                lo = mid + 1;
            }
        }
        return lo;
    }

private:
    // Can we go from (0,0) to (n-1,n-1) only through cells with height <= t?
    bool canReach(vector<vector<int>>& grid, int t) {
        int n = grid.size();
        if (grid[0][0] > t) {
            return false;
        }
        vector<vector<bool>> seen(n, vector<bool>(n, false));
        queue<pair<int, int>> q;
        q.push({0, 0});
        seen[0][0] = true;
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            int r = q.front().first;
            int c = q.front().second;
            q.pop();
            if (r == n - 1 && c == n - 1) {
                return true;
            }
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < n && nc < n && !seen[nr][nc] && grid[nr][nc] <= t) {
                    seen[nr][nc] = true;
                    q.push({nr, nc});
                }
            }
        }
        return false;
    }
};
```

**How it works:** "binary search on the answer" + a simple reachability check.

**Think of it like this:** "if I wait until time 10, can I get across?" — try halfway times until you find the earliest.

**Cost:** Time **O(n² log n²)**. Space **O(n²)**.

### Approach 2: Union-Find, flooding cells in height order
**The idea:** raise the water one level at a time; when a cell is flooded, join it with flooded neighbours. Stop when the corners are connected.

```cpp
class Solution {
public:
    int swimInWater(vector<vector<int>>& grid) {
        int n = grid.size();
        // where[h] = cell with height h (heights are a permutation of 0..n*n-1).
        vector<pair<int, int>> where(n * n);
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                where[grid[r][c]] = {r, c};
            }
        }
        parent.resize(n * n);
        for (int i = 0; i < n * n; i++) {
            parent[i] = i;
        }
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};

        for (int t = 0; t < n * n; t++) {
            int r = where[t].first;
            int c = where[t].second;
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < n && nc < n && grid[nr][nc] <= t) {
                    parent[find(r * n + c)] = find(nr * n + nc);   // both are under water
                }
            }
            if (find(0) == find(n * n - 1)) {
                return t;                         // the corners are connected
            }
        }
        return n * n - 1;
    }

private:
    vector<int> parent;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }
};
```

**How it works:** heights are a permutation, so each time step floods exactly one new cell.

**Think of it like this:** watching a flood rise and checking when the two corners become one lake.

**Cost:** Time **O(n² · α)**. Space **O(n²)**.

### Optimal: Dijkstra with "max" instead of "+"
**The idea:** a path's cost is its highest cell. Extending a path never lowers that, so Dijkstra's "take the cheapest first" still works.

```cpp
class Solution {
public:
    int swimInWater(vector<vector<int>>& grid) {
        int n = grid.size();
        vector<vector<int>> best(n, vector<int>(n, INT_MAX));   // best time to reach each cell

        // Min-heap of (time, row, col).
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>,
                       greater<tuple<int, int, int>>> pq;
        best[0][0] = grid[0][0];
        pq.push({grid[0][0], 0, 0});

        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        while (!pq.empty()) {
            auto [t, r, c] = pq.top();
            pq.pop();
            if (r == n - 1 && c == n - 1) {
                return t;                       // first time we pop the target, it's optimal
            }
            if (t > best[r][c]) {
                continue;                       // stale entry
            }
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= n || nc >= n) {
                    continue;
                }
                // You must wait until the water covers the higher of the two cells.
                int nt = max(t, grid[nr][nc]);
                if (nt < best[nr][nc]) {
                    best[nr][nc] = nt;
                    pq.push({nt, nr, nc});
                }
            }
        }
        return -1;
    }
};
```

**How it works**
1. Path cost = max cell on the path (a bottleneck).
2. Heap starts with `(grid[0][0], 0, 0)`.
3. Pop the smallest time; reaching the target ends the search.
4. Neighbour time = `max(t, grid[nr][nc])`.

**Think of it like this:** finding a mountain pass whose highest point is as low as possible.

**Why it's optimal:** O(n² log n) with a single search — no binary search wrapper.

**Cost:** Time **O(n² log n)**. Space **O(n²)**.

## cheapest-flights-within-k-stops

### Approach 1: BFS by number of stops
**The idea:** explore level by level, where each level adds one flight. Keep the cheapest cost found per city and only continue when a route is cheaper.

```cpp
class Solution {
public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        vector<vector<pair<int, int>>> adj(n);
        for (const vector<int>& f : flights) {
            adj[f[0]].push_back({f[1], f[2]});
        }
        vector<int> cost(n, INT_MAX);
        cost[src] = 0;
        queue<pair<int, int>> q;          // (city, cost so far)
        q.push({src, 0});
        int stops = 0;

        while (!q.empty() && stops <= k) {
            int levelSize = q.size();
            for (int i = 0; i < levelSize; i++) {
                int city = q.front().first;
                int soFar = q.front().second;
                q.pop();
                for (const pair<int, int>& f : adj[city]) {
                    int next = f.first;
                    int price = soFar + f.second;
                    if (price < cost[next]) {
                        cost[next] = price;
                        q.push({next, price});
                    }
                }
            }
            stops++;
        }
        if (cost[dst] == INT_MAX) {
            return -1;
        }
        return cost[dst];
    }
};
```

**How it works:** level i of the BFS uses exactly i + 1 flights; stopping after k + 1 levels enforces the limit.

**Think of it like this:** exploring all one-flight trips, then all two-flight trips, … up to k + 1 flights.

**Cost:** Time **O(k · E)**. Space **O(V + E)**.

### Approach 2: Dijkstra on (city, stops used) states
**The idea:** the state isn't just the city — it's the city *and* how many flights you've used. Run Dijkstra over those states.

```cpp
class Solution {
public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        vector<vector<pair<int, int>>> adj(n);
        for (const vector<int>& f : flights) {
            adj[f[0]].push_back({f[1], f[2]});
        }
        // fewestFlights[c] = fewest flights with which we've popped city c so far.
        vector<int> fewestFlights(n, INT_MAX);
        // (cost, city, flights used)
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>,
                       greater<tuple<int, int, int>>> pq;
        pq.push({0, src, 0});

        while (!pq.empty()) {
            auto [cost, city, used] = pq.top();
            pq.pop();
            if (city == dst) {
                return cost;                        // cheapest valid way to arrive
            }
            if (used >= fewestFlights[city] || used > k) {
                continue;                           // a cheaper pop already used fewer flights
            }
            fewestFlights[city] = used;
            for (const pair<int, int>& f : adj[city]) {
                pq.push({cost + f.second, f.first, used + 1});
            }
        }
        return -1;
    }
};
```

**How it works:** a city popped again is only useful if it was reached with fewer flights (cheaper pops come first).

**Think of it like this:** a travel agent who considers both price and number of connections.

**Cost:** Time **O(E · k · log(E · k))**. Space **O(E · k)**.

### Optimal: Bellman-Ford limited to k + 1 rounds
**The idea:** round i finds the cheapest price using at most i flights. Run k + 1 rounds, and in each round only use the previous round's prices.

```cpp
class Solution {
public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        vector<int> dist(n, INT_MAX);
        dist[src] = 0;

        // k stops = k + 1 flights = k + 1 rounds.
        for (int round = 0; round <= k; round++) {
            // Copy, so this round only builds on LAST round's prices.
            vector<int> next = dist;
            for (const vector<int>& f : flights) {
                int u = f[0];
                int v = f[1];
                int w = f[2];
                if (dist[u] != INT_MAX && dist[u] + w < next[v]) {
                    next[v] = dist[u] + w;
                }
            }
            dist = next;
        }

        if (dist[dst] == INT_MAX) {
            return -1;
        }
        return dist[dst];
    }
};
```

**How it works**
1. After round i, `dist` = cheapest costs using at most i flights.
2. Relax every flight using the *old* `dist`, writing into `next`.
3. The copy stops two flights being chained within one round (which would break the stop limit).

**Think of it like this:** each round, every city announces the cheapest price it heard last round; news only travels one flight per round.

**Why it's optimal:** O(k · E) with very simple code and no heap; the stop limit is built into the rounds.

**Cost:** Time **O(k · E)**. Space **O(n)**.

## reconstruct-itinerary

### Approach 1: Backtracking with sorted tickets
**The idea:** sort each airport's destinations, try them in order, and undo a choice if it leads to a dead end before all tickets are used.

```cpp
class Solution {
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        total = tickets.size();
        for (const vector<string>& t : tickets) {
            adj[t[0]].push_back(t[1]);
        }
        for (auto& entry : adj) {
            sort(entry.second.begin(), entry.second.end());   // smallest first
            used[entry.first].assign(entry.second.size(), false);
        }
        route = {"JFK"};
        dfs("JFK");
        return route;
    }

private:
    int total = 0;
    unordered_map<string, vector<string>> adj;
    unordered_map<string, vector<bool>> used;
    vector<string> route;

    bool dfs(const string& airport) {
        if ((int)route.size() == total + 1) {
            return true;                              // used every ticket
        }
        vector<string>& dests = adj[airport];
        for (int i = 0; i < (int)dests.size(); i++) {
            if (used[airport][i]) {
                continue;
            }
            if (i > 0 && dests[i] == dests[i - 1] && !used[airport][i - 1]) {
                continue;                             // same destination already tried
            }
            used[airport][i] = true;
            route.push_back(dests[i]);
            if (dfs(dests[i])) {
                return true;
            }
            route.pop_back();                         // dead end: undo
            used[airport][i] = false;
        }
        return false;
    }
};
```

**How it works:** the first complete route found is the lexicographically smallest because destinations are tried in order.

**Think of it like this:** planning a trip by always trying the alphabetically first flight, and backing up if you get stuck.

**Cost:** Time exponential in the worst case. Space **O(E)**.

### Approach 2: Iterative Hierholzer with an explicit stack
**The idea:** the optimal algorithm without recursion: push airports while tickets remain; when an airport has none left, move it to the route.

```cpp
class Solution {
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        unordered_map<string, vector<string>> adj;
        for (const vector<string>& t : tickets) {
            adj[t[0]].push_back(t[1]);
        }
        // Sort descending so the smallest destination is at the back (cheap pop_back).
        for (auto& entry : adj) {
            sort(entry.second.rbegin(), entry.second.rend());
        }

        vector<string> route;
        vector<string> st = {"JFK"};
        while (!st.empty()) {
            string top = st.back();
            if (!adj[top].empty()) {
                string next = adj[top].back();   // smallest unused ticket from top
                adj[top].pop_back();
                st.push_back(next);
            } else {
                route.push_back(top);            // stuck: this airport goes in the route
                st.pop_back();
            }
        }
        reverse(route.begin(), route.end());
        return route;
    }
};
```

**How it works:** same post-order idea as the recursive version.

**Think of it like this:** a stack of boarding passes you add to as you fly and peel off when you can't go further.

**Cost:** Time **O(E log E)**. Space **O(E)**.

### Optimal: Hierholzer's algorithm (DFS, post-order)
**The idea:** always take the smallest unused ticket. When an airport has no tickets left, add it to the route. Reversing that list gives the itinerary — dead ends automatically land at the end.

```cpp
class Solution {
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        for (const vector<string>& t : tickets) {
            g[t[0]].push(t[1]);
        }
        route.clear();
        dfs("JFK");
        reverse(route.begin(), route.end());
        return route;
    }

private:
    // airport → its destinations, smallest name on top.
    unordered_map<string, priority_queue<string, vector<string>, greater<string>>> g;
    vector<string> route;

    void dfs(const string& airport) {
        auto& destinations = g[airport];
        while (!destinations.empty()) {
            string next = destinations.top();
            destinations.pop();                 // use this ticket
            dfs(next);
        }
        route.push_back(airport);               // all tickets from here used: post-order
    }
};
```

**How it works**
1. Destinations kept in a min-heap (alphabetical).
2. DFS from JFK, consuming tickets.
3. Append each airport when it has no tickets left; reverse at the end.
4. If the greedy choice hits a dead end, that dead end is appended first, so after reversing it sits at the end — exactly where a dead end must be.

**Think of it like this:** walking every road of a town exactly once; if you take a short dead-end street too early, Hierholzer's trick quietly moves it to the end of your trip.

**Why it's optimal:** each ticket is used once: O(E log E) for the heaps.

**Cost:** Time **O(E log E)**. Space **O(E)**.

## alien-dictionary

### Approach 1: DFS topological sort with cycle detection
**The idea:** build "comes before" edges from adjacent words, then DFS: a letter is output after everything that must come after it (post-order), then reverse.

```cpp
class Solution {
public:
    string alienOrder(vector<string>& words) {
        for (const string& w : words) {
            for (char c : w) {
                adj[c];                              // register every letter
            }
        }
        for (int i = 0; i + 1 < (int)words.size(); i++) {
            const string& a = words[i];
            const string& b = words[i + 1];
            int len = min(a.size(), b.size());
            int j = 0;
            while (j < len && a[j] == b[j]) {
                j++;
            }
            if (j == len) {
                if (a.size() > b.size()) {
                    return "";                       // "abc" before "ab" is impossible
                }
                continue;
            }
            adj[a[j]].insert(b[j]);                  // a[j] comes before b[j]
        }

        string out;
        for (auto& entry : adj) {
            if (state[entry.first] == 0 && hasCycle(entry.first, out)) {
                return "";
            }
        }
        reverse(out.begin(), out.end());
        return out;
    }

private:
    map<char, set<char>> adj;
    map<char, int> state;     // 0 = new, 1 = on the current path, 2 = done

    bool hasCycle(char c, string& out) {
        state[c] = 1;
        for (char next : adj[c]) {
            if (state[next] == 1) {
                return true;
            }
            if (state[next] == 0 && hasCycle(next, out)) {
                return true;
            }
        }
        state[c] = 2;
        out += c;                                     // everything after c is already in out
        return false;
    }
};
```

**How it works:** the same three-colour DFS as Course Schedule II.

**Think of it like this:** listing each letter only after listing every letter that must follow it, then reading the list backwards.

**Cost:** Time **O(C + total letters)**. Space **O(C + edges)**.

### Approach 2: Compare every pair of words (not just neighbours)
**The idea:** constraints from non-adjacent pairs are implied by adjacent ones, but checking all pairs is a correct (slower) way to collect them.

```cpp
class Solution {
public:
    string alienOrder(vector<string>& words) {
        map<char, set<char>> adj;
        map<char, int> indeg;
        for (const string& w : words) {
            for (char c : w) {
                indeg[c] += 0;                     // register the letter
            }
        }
        int n = words.size();
        for (int i = 0; i < n; i++) {
            for (int k = i + 1; k < n; k++) {
                const string& a = words[i];
                const string& b = words[k];
                int len = min(a.size(), b.size());
                int j = 0;
                while (j < len && a[j] == b[j]) {
                    j++;
                }
                if (j == len) {
                    if (a.size() > b.size()) {
                        return "";
                    }
                    continue;
                }
                if (adj[a[j]].insert(b[j]).second) {
                    indeg[b[j]]++;
                }
            }
        }

        queue<char> q;
        for (auto& entry : indeg) {
            if (entry.second == 0) {
                q.push(entry.first);
            }
        }
        string out;
        while (!q.empty()) {
            char c = q.front();
            q.pop();
            out += c;
            for (char next : adj[c]) {
                indeg[next]--;
                if (indeg[next] == 0) {
                    q.push(next);
                }
            }
        }
        if (out.size() != indeg.size()) {
            return "";
        }
        return out;
    }
};
```

**How it works:** more edges, same topological sort.

**Think of it like this:** comparing every pair of dictionary entries instead of only neighbours.

**Cost:** Time **O(n² · L)**. Space **O(C²)**.

### Optimal: Adjacent-pair edges + Kahn's algorithm
**The idea:** only the first differing letter of each adjacent pair tells you anything. Turn those into edges and topologically sort.

```cpp
class Solution {
public:
    string alienOrder(vector<string>& words) {
        unordered_map<char, unordered_set<char>> adj;   // c → letters that come after c
        unordered_map<char, int> indeg;                 // letters that must come before

        // Every letter that appears must be in the answer.
        for (const string& w : words) {
            for (char c : w) {
                indeg[c] += 0;
            }
        }

        for (int i = 0; i + 1 < (int)words.size(); i++) {
            const string& a = words[i];
            const string& b = words[i + 1];
            int len = min(a.size(), b.size());
            int j = 0;
            while (j < len && a[j] == b[j]) {
                j++;                                    // skip the shared prefix
            }
            if (j == len) {
                // One is a prefix of the other. "ab" before "abc" is fine; the reverse isn't.
                if (a.size() > b.size()) {
                    return "";
                }
                continue;
            }
            // First difference: a[j] comes before b[j]. Add the edge once.
            if (adj[a[j]].insert(b[j]).second) {
                indeg[b[j]]++;
            }
        }

        // Kahn's algorithm.
        queue<char> q;
        for (auto& entry : indeg) {
            if (entry.second == 0) {
                q.push(entry.first);
            }
        }
        string order;
        while (!q.empty()) {
            char c = q.front();
            q.pop();
            order += c;
            for (char next : adj[c]) {
                indeg[next]--;
                if (indeg[next] == 0) {
                    q.push(next);
                }
            }
        }

        // Letters left over are on a cycle: no valid order.
        if (order.size() != indeg.size()) {
            return "";
        }
        return order;
    }
};
```

**How it works**
1. Register every letter.
2. For each adjacent pair, the first differing position gives an edge `a[j] → b[j]`.
3. A longer word before its own prefix → invalid.
4. Kahn's topological sort; a cycle → `""`.

**Think of it like this:** working out the alphabet of a made-up language from a sorted dictionary — each pair of neighbouring words reveals at most one "this letter comes first" fact.

**Why it's optimal:** reads every character once and sorts at most 26 letters.

**Cost:** Time **O(total characters)**. Space **O(1)** (at most 26 letters and 26² edges).
