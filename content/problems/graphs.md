# Graphs

**Recognise it when:** grids of cells, "connected", "islands", "dependencies/prerequisites", "shortest number of steps", networks of nodes and edges.

**Representations**
- Adjacency list: `vector<vector<int>> adj(n);` — default choice.
- Grid: implicit graph; neighbours via `constexpr int dr[] = {1,-1,0,0}, dc[] = {0,0,1,-1};`

**Which traversal?**
| Need | Use |
|---|---|
| Any traversal / connected components | DFS or BFS |
| Shortest path, unweighted | **BFS** |
| Ordering with dependencies, cycle detection in DAG | **Topological sort** (Kahn's BFS) |
| Dynamic connectivity, "redundant edge" | **Union-Find (DSU)** |
| Weighted shortest path | Dijkstra → see *Advanced Graphs* |

**Union-Find template** (path compression + union by size → near O(1)):

```cpp
struct DSU {
    vector<int> p, sz;
    explicit DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a; sz[a] += sz[b];
        return true;
    }
};
```

## Number of Islands
- difficulty: Medium
- leetcode: 200
- slug: number-of-islands

Count islands of `'1'` (land) connected 4-directionally in a grid of `'0'`/`'1'`.

### Hint
Each unvisited land cell starts a new island; flood-fill it.

### Solution
```cpp
class Solution {
public:
    int numIslands(vector<vector<char>>& g) {
        int R = g.size(), C = g[0].size(), count = 0;
        auto sink = [&](auto&& self, int r, int c) -> void {
            if (r < 0 || c < 0 || r >= R || c >= C || g[r][c] != '1') return;
            g[r][c] = '0';                       // mark visited by sinking
            self(self, r + 1, c); self(self, r - 1, c);
            self(self, r, c + 1); self(self, r, c - 1);
        };
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c)
                if (g[r][c] == '1') { ++count; sink(sink, r, c); }
        return count;
    }
};
```

### Explanation
Flood fill counts connected components. For huge grids prefer BFS with an explicit queue (no recursion-depth risk). DSU also works and supports online "add land" queries (LC 305).

**Time:** O(R·C) · **Space:** O(R·C) worst recursion

## Clone Graph
- difficulty: Medium
- leetcode: 133
- slug: clone-graph

Deep-copy a connected undirected graph given a node reference.

### Hint
Hash map original → clone doubles as the visited set.

### Solution
```cpp
class Solution {
    unordered_map<Node*, Node*> copies;
public:
    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;
        if (auto it = copies.find(node); it != copies.end()) return it->second;
        Node* c = new Node(node->val);
        copies[node] = c;                         // register BEFORE recursing (cycles!)
        for (Node* nb : node->neighbors) c->neighbors.push_back(cloneGraph(nb));
        return c;
    }
};
```

### Explanation
Registering the clone before visiting neighbours breaks cycles. Same idea as copying a list with random pointers.

**Time:** O(V + E) · **Space:** O(V)

## Max Area of Island
- difficulty: Medium
- leetcode: 695
- slug: max-area-of-island

Return the area of the largest island in a 0/1 grid.

### Hint
Flood fill returning the number of cells visited.

### Solution
```cpp
class Solution {
public:
    int maxAreaOfIsland(vector<vector<int>>& g) {
        int R = g.size(), C = g[0].size(), best = 0;
        auto area = [&](auto&& self, int r, int c) -> int {
            if (r < 0 || c < 0 || r >= R || c >= C || g[r][c] != 1) return 0;
            g[r][c] = 0;
            return 1 + self(self, r + 1, c) + self(self, r - 1, c)
                     + self(self, r, c + 1) + self(self, r, c - 1);
        };
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) best = max(best, area(area, r, c));
        return best;
    }
};
```

### Explanation
Identical skeleton to Number of Islands, but the DFS returns a size. Recognising "same skeleton, different aggregation" is the point.

**Time:** O(R·C) · **Space:** O(R·C)

## Pacific Atlantic Water Flow
- difficulty: Medium
- leetcode: 417
- slug: pacific-atlantic-water-flow

Water flows to neighbours of equal or lower height. Return cells that can reach both the Pacific (top/left edges) and the Atlantic (bottom/right).

### Hint
Reverse the flow: BFS/DFS *uphill* from each ocean's border; intersect.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& h) {
        int R = h.size(), C = h[0].size();
        vector<vector<char>> pac(R, vector<char>(C)), atl(R, vector<char>(C));
        auto dfs = [&](auto&& self, vector<vector<char>>& seen, int r, int c) -> void {
            seen[r][c] = 1;
            constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
            for (int k = 0; k < 4; ++k) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc]) continue;
                if (h[nr][nc] < h[r][c]) continue;      // can only climb uphill
                self(self, seen, nr, nc);
            }
        };
        for (int r = 0; r < R; ++r) { dfs(dfs, pac, r, 0); dfs(dfs, atl, r, C - 1); }
        for (int c = 0; c < C; ++c) { dfs(dfs, pac, 0, c); dfs(dfs, atl, R - 1, c); }
        vector<vector<int>> res;
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c)
                if (pac[r][c] && atl[r][c]) res.push_back({r, c});
        return res;
    }
};
```

### Explanation
Checking every cell's downhill reachability is O((RC)²). **Reversing edges** and starting from the targets is a recurring graph trick (multi-source search from the goal).

**Time:** O(R·C) · **Space:** O(R·C)

## Surrounded Regions
- difficulty: Medium
- leetcode: 130
- slug: surrounded-regions

Capture all `'O'` regions fully surrounded by `'X'` (flip to `'X'`). Regions touching the border survive.

### Hint
Mark border-connected `'O'`s as safe first; flip everything else.

### Solution
```cpp
class Solution {
public:
    void solve(vector<vector<char>>& b) {
        int R = b.size(), C = b[0].size();
        auto mark = [&](auto&& self, int r, int c) -> void {
            if (r < 0 || c < 0 || r >= R || c >= C || b[r][c] != 'O') return;
            b[r][c] = 'S';                               // safe
            self(self, r + 1, c); self(self, r - 1, c);
            self(self, r, c + 1); self(self, r, c - 1);
        };
        for (int r = 0; r < R; ++r) { mark(mark, r, 0); mark(mark, r, C - 1); }
        for (int c = 0; c < C; ++c) { mark(mark, 0, c); mark(mark, R - 1, c); }
        for (auto& row : b)
            for (char& ch : row) ch = (ch == 'S') ? 'O' : 'X';
    }
};
```

### Explanation
"Find what is NOT surrounded" is easier than finding what is. Three-state marking avoids an extra visited array.

**Time:** O(R·C) · **Space:** O(R·C)

## Rotting Oranges
- difficulty: Medium
- leetcode: 994
- slug: rotting-oranges

Each minute, rotten oranges (2) rot adjacent fresh ones (1). Return minutes until none are fresh, or -1.

### Hint
**Multi-source BFS** starting from every rotten orange simultaneously.

### Solution
```cpp
class Solution {
public:
    int orangesRotting(vector<vector<int>>& g) {
        int R = g.size(), C = g[0].size(), fresh = 0;
        queue<pair<int, int>> q;
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                if (g[r][c] == 2) q.emplace(r, c);
                else if (g[r][c] == 1) ++fresh;
            }
        int minutes = 0;
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        while (!q.empty() && fresh > 0) {
            for (int sz = q.size(); sz > 0; --sz) {
                auto [r, c] = q.front(); q.pop();
                for (int k = 0; k < 4; ++k) {
                    int nr = r + dr[k], nc = c + dc[k];
                    if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] != 1) continue;
                    g[nr][nc] = 2; --fresh;
                    q.emplace(nr, nc);
                }
            }
            ++minutes;
        }
        return fresh == 0 ? minutes : -1;
    }
};
```

### Explanation
Seeding the queue with all sources computes, for every cell, the distance to the *nearest* source. Level-by-level processing counts minutes.

**Time:** O(R·C) · **Space:** O(R·C)

## Walls and Gates
- difficulty: Medium
- leetcode: 286
- slug: walls-and-gates

Fill each empty room (`INF`) with the distance to its nearest gate (`0`); walls are `-1`.

### Hint
Multi-source BFS from all gates.

### Solution
```cpp
class Solution {
public:
    void wallsAndGates(vector<vector<int>>& rooms) {
        const int INF = INT_MAX;
        int R = rooms.size(), C = rooms[0].size();
        queue<pair<int, int>> q;
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c)
                if (rooms[r][c] == 0) q.emplace(r, c);
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        while (!q.empty()) {
            auto [r, c] = q.front(); q.pop();
            for (int k = 0; k < 4; ++k) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || rooms[nr][nc] != INF) continue;
                rooms[nr][nc] = rooms[r][c] + 1;   // first visit = shortest
                q.emplace(nr, nc);
            }
        }
    }
};
```

### Explanation
BFS visits cells in increasing distance order, so the first time a room is reached is its shortest distance — no need to compare.

**Time:** O(R·C) · **Space:** O(R·C)

## Course Schedule
- difficulty: Medium
- leetcode: 207
- slug: course-schedule

`numCourses` with prerequisite pairs `[a, b]` (take b before a). Can you finish all courses?

### Hint
It's possible iff the dependency graph has no cycle. Kahn's algorithm: repeatedly take nodes with in-degree 0.

### Solution
```cpp
class Solution {
public:
    bool canFinish(int n, vector<vector<int>>& pre) {
        vector<vector<int>> adj(n);
        vector<int> indeg(n, 0);
        for (auto& e : pre) { adj[e[1]].push_back(e[0]); ++indeg[e[0]]; }
        queue<int> q;
        for (int i = 0; i < n; ++i) if (indeg[i] == 0) q.push(i);
        int taken = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop(); ++taken;
            for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
        }
        return taken == n;      // leftovers are stuck in a cycle
    }
};
```

### Explanation
Kahn's algorithm peels off courses with no remaining prerequisites. If some are never peeled, they're on a cycle. DFS alternative: three colours (white/gray/black) — a gray→gray edge is a back edge, i.e. a cycle. This is exactly how build systems (Make, CMake/Ninja) order targets.

**Time:** O(V + E) · **Space:** O(V + E)

## Course Schedule II
- difficulty: Medium
- leetcode: 210
- slug: course-schedule-ii

Return a valid order to take all courses, or `[]` if impossible.

### Hint
Same as above — record the pop order.

### Solution
```cpp
class Solution {
public:
    vector<int> findOrder(int n, vector<vector<int>>& pre) {
        vector<vector<int>> adj(n);
        vector<int> indeg(n, 0), order;
        for (auto& e : pre) { adj[e[1]].push_back(e[0]); ++indeg[e[0]]; }
        queue<int> q;
        for (int i = 0; i < n; ++i) if (!indeg[i]) q.push(i);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            order.push_back(u);
            for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
        }
        if ((int)order.size() != n) order.clear();
        return order;
    }
};
```

### Explanation
The pop order of Kahn's algorithm is a topological order.

**Time:** O(V + E) · **Space:** O(V + E)

## Graph Valid Tree
- difficulty: Medium
- leetcode: 261
- slug: graph-valid-tree

Given `n` nodes and undirected edges, is it a valid tree?

### Hint
A tree has exactly `n-1` edges and no cycles (equivalently: connected).

### Solution
```cpp
class Solution {
public:
    bool validTree(int n, vector<vector<int>>& edges) {
        if ((int)edges.size() != n - 1) return false;
        vector<int> p(n);
        iota(p.begin(), p.end(), 0);
        auto find = [&](int x) {
            while (p[x] != x) x = p[x] = p[p[x]];   // path halving
            return x;
        };
        for (auto& e : edges) {
            int a = find(e[0]), b = find(e[1]);
            if (a == b) return false;                // edge closes a cycle
            p[a] = b;
        }
        return true;
    }
};
```

### Explanation
With exactly `n−1` edges, "no cycle" ⇔ "connected" ⇔ tree. DSU detects a cycle when an edge joins two nodes already in the same set.

**Time:** O(E·α(n)) · **Space:** O(n)

## Number of Connected Components in an Undirected Graph
- difficulty: Medium
- leetcode: 323
- slug: number-of-connected-components-in-an-undirected-graph

Count connected components among `n` nodes.

### Hint
Start with `n` components; each successful union reduces the count by one.

### Solution
```cpp
class Solution {
public:
    int countComponents(int n, vector<vector<int>>& edges) {
        vector<int> p(n);
        iota(p.begin(), p.end(), 0);
        auto find = [&](int x) { while (p[x] != x) x = p[x] = p[p[x]]; return x; };
        int comps = n;
        for (auto& e : edges) {
            int a = find(e[0]), b = find(e[1]);
            if (a != b) { p[a] = b; --comps; }
        }
        return comps;
    }
};
```

### Explanation
Every union merges two components. DFS/BFS counting works equally well; DSU shines when edges arrive online.

**Time:** O(E·α(n)) · **Space:** O(n)

## Redundant Connection
- difficulty: Medium
- leetcode: 684
- slug: redundant-connection

A tree with one extra edge added. Return the edge that can be removed (the last such in input order).

### Hint
The first edge whose endpoints are already connected creates the cycle.

### Solution
```cpp
class Solution {
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        vector<int> p(n + 1);
        iota(p.begin(), p.end(), 0);
        auto find = [&](int x) { while (p[x] != x) x = p[x] = p[p[x]]; return x; };
        for (auto& e : edges) {
            int a = find(e[0]), b = find(e[1]);
            if (a == b) return e;
            p[a] = b;
        }
        return {};
    }
};
```

### Explanation
Process edges in order with DSU; the first edge that fails to unite is redundant. Since there's exactly one cycle, it's also the last edge of the cycle in input order.

**Time:** O(n·α(n)) · **Space:** O(n)

## Word Ladder
- difficulty: Hard
- leetcode: 127
- slug: word-ladder

Shortest transformation sequence length from `begin` to `end`, changing one letter at a time, each intermediate word in `wordList`.

### Hint
BFS over words; neighbours = change each position to a–z and check the dictionary.

### Solution
```cpp
class Solution {
public:
    int ladderLength(string begin, string end, vector<string>& wordList) {
        unordered_set<string> dict(wordList.begin(), wordList.end());
        if (!dict.contains(end)) return 0;
        queue<string> q;
        q.push(begin);
        dict.erase(begin);
        for (int steps = 1; !q.empty(); ++steps) {
            for (int sz = q.size(); sz > 0; --sz) {
                string w = std::move(q.front()); q.pop();
                if (w == end) return steps;
                for (char& ch : w) {
                    char orig = ch;
                    for (char c = 'a'; c <= 'z'; ++c) {
                        if (c == orig) continue;
                        ch = c;
                        if (auto it = dict.find(w); it != dict.end()) {
                            q.push(w);
                            dict.erase(it);   // mark visited
                        }
                    }
                    ch = orig;
                }
            }
        }
        return 0;
    }
};
```

### Explanation
Unweighted shortest path → BFS. Erasing from the dictionary marks words visited. Generating 26·L neighbours beats comparing against every word (O(N·L)) when the dictionary is large. Bidirectional BFS roughly square-roots the search space.

**Time:** O(N·L·26) · **Space:** O(N·L)
