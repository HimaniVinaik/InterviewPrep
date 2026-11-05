## number-of-islands

### Approach 1: BFS flood fill (no recursion)
```cpp
class Solution {
public:
    int numIslands(vector<vector<char>>& g) {
        int R = g.size(), C = g[0].size(), count = 0;
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                if (g[r][c] != '1') continue;
                ++count;
                queue<pair<int, int>> q;
                q.push({r, c}); g[r][c] = '0';                 // mark when ENQUEUED
                while (!q.empty()) {
                    auto [x, y] = q.front(); q.pop();
                    for (int k = 0; k < 4; ++k) {
                        int nx = x + dr[k], ny = y + dc[k];
                        if (nx < 0 || ny < 0 || nx >= R || ny >= C || g[nx][ny] != '1') continue;
                        g[nx][ny] = '0';
                        q.push({nx, ny});
                    }
                }
            }
        return count;
    }
};
```

**Time:** O(R·C) · **Space:** O(min(R, C)) queue. Safe for 300×300 all-land grids where recursive DFS may be 90 000 frames deep.

### Approach 2: Union-Find
```cpp
class Solution {
    vector<int> p;
    int find(int x) { while (p[x] != x) x = p[x] = p[p[x]]; return x; }
public:
    int numIslands(vector<vector<char>>& g) {
        int R = g.size(), C = g[0].size(), comps = 0;
        p.resize(R * C);
        iota(p.begin(), p.end(), 0);
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                if (g[r][c] != '1') continue;
                ++comps;                                         // every land cell starts alone
                for (auto [nr, nc] : {pair{r - 1, c}, pair{r, c - 1}})   // only up & left: already seen
                    if (nr >= 0 && nc >= 0 && g[nr][nc] == '1') {
                        int a = find(r * C + c), b = find(nr * C + nc);
                        if (a != b) { p[a] = b; --comps; }       // merging two islands
                    }
            }
        return comps;
    }
};
```

**Time:** O(R·C·α) · **Space:** O(R·C). Doesn't modify the grid; supports "add land" queries online (LC 305).

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

### Approach 1: BFS with a hash map
```cpp
class Solution {
public:
    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;
        unordered_map<Node*, Node*> copy{{node, new Node(node->val)}};
        queue<Node*> q; q.push(node);
        while (!q.empty()) {
            Node* cur = q.front(); q.pop();
            for (Node* nb : cur->neighbors) {
                if (!copy.count(nb)) {                 // first time: create & schedule
                    copy[nb] = new Node(nb->val);
                    q.push(nb);
                }
                copy[cur]->neighbors.push_back(copy[nb]);
            }
        }
        return copy[node];
    }
};
```

**Time:** O(V + E) · **Space:** O(V). Iterative — no stack-depth concerns.

### Approach 2: Index-based copy (values are unique 1..n)
```cpp
class Solution {
public:
    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;
        vector<Node*> copy(101, nullptr);              // problem guarantees val in [1, 100]
        vector<Node*> st{node};
        copy[node->val] = new Node(node->val);
        while (!st.empty()) {
            Node* cur = st.back(); st.pop_back();
            for (Node* nb : cur->neighbors) {
                if (!copy[nb->val]) { copy[nb->val] = new Node(nb->val); st.push_back(nb); }
                copy[cur->val]->neighbors.push_back(copy[nb->val]);
            }
        }
        return copy[node->val];
    }
};
```

**Time:** O(V + E) · **Space:** O(V). Uses the constraint to replace hashing with an array.

### Walkthrough
**Goal:** deep copy with the same edge structure, handling cycles.

1. `copies` maps original → clone; it also serves as the visited set.
2. `clone(n)`: if already copied, return the copy (this is what stops infinite recursion on cycles).
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

### Approach 1: Iterative DFS with an explicit stack
```cpp
class Solution {
public:
    int maxAreaOfIsland(vector<vector<int>>& g) {
        int R = g.size(), C = g[0].size(), best = 0;
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                if (g[r][c] != 1) continue;
                int area = 0;
                vector<pair<int, int>> st{{r, c}};
                g[r][c] = 0;
                while (!st.empty()) {
                    auto [x, y] = st.back(); st.pop_back();
                    ++area;
                    for (auto [nx, ny] : {pair{x + 1, y}, pair{x - 1, y}, pair{x, y + 1}, pair{x, y - 1}})
                        if (nx >= 0 && ny >= 0 && nx < R && ny < C && g[nx][ny] == 1) {
                            g[nx][ny] = 0;
                            st.push_back({nx, ny});
                        }
                }
                best = max(best, area);
            }
        return best;
    }
};
```

**Time:** O(R·C) · **Space:** O(R·C) worst.

### Approach 2: Union-Find with component sizes
```cpp
class Solution {
    vector<int> p, sz;
    int find(int x) { while (p[x] != x) x = p[x] = p[p[x]]; return x; }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a; sz[a] += sz[b];
    }
public:
    int maxAreaOfIsland(vector<vector<int>>& g) {
        int R = g.size(), C = g[0].size(), best = 0;
        p.resize(R * C); sz.assign(R * C, 1);
        iota(p.begin(), p.end(), 0);
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                if (!g[r][c]) continue;
                if (r + 1 < R && g[r + 1][c]) unite(r * C + c, (r + 1) * C + c);
                if (c + 1 < C && g[r][c + 1]) unite(r * C + c, r * C + c + 1);
            }
        for (int i = 0; i < R * C; ++i)
            if (g[i / C][i % C] && find(i) == i) best = max(best, sz[i]);
        return best;
    }
};
```

**Time:** O(R·C·α) · **Space:** O(R·C).

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

### Approach 1: Brute force — search from every cell
```cpp
class Solution {
    int R, C;
    bool reach(vector<vector<int>>& h, int r, int c, vector<vector<char>>& vis, bool pacific) {
        if (pacific ? (r == 0 || c == 0) : (r == R - 1 || c == C - 1)) return true;
        vis[r][c] = 1;
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        for (int k = 0; k < 4; ++k) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || vis[nr][nc] || h[nr][nc] > h[r][c]) continue;
            if (reach(h, nr, nc, vis, pacific)) return true;     // flows downhill
        }
        return false;
    }
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& h) {
        R = h.size(); C = h[0].size();
        vector<vector<int>> res;
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                vector<vector<char>> v1(R, vector<char>(C)), v2(R, vector<char>(C));
                if (reach(h, r, c, v1, true) && reach(h, r, c, v2, false)) res.push_back({r, c});
            }
        return res;
    }
};
```

**Time:** O((R·C)²) · **Space:** O(R·C). Correct but slow — motivates reversing the search.

### Approach 2: Multi-source BFS from each ocean
```cpp
class Solution {
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& h) {
        int R = h.size(), C = h[0].size();
        auto bfs = [&](vector<pair<int, int>> seeds) {
            vector<vector<char>> seen(R, vector<char>(C, 0));
            queue<pair<int, int>> q;
            for (auto [r, c] : seeds) if (!seen[r][c]) { seen[r][c] = 1; q.push({r, c}); }
            constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
            while (!q.empty()) {
                auto [r, c] = q.front(); q.pop();
                for (int k = 0; k < 4; ++k) {
                    int nr = r + dr[k], nc = c + dc[k];
                    if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc] || h[nr][nc] < h[r][c]) continue;
                    seen[nr][nc] = 1;
                    q.push({nr, nc});
                }
            }
            return seen;
        };
        vector<pair<int, int>> pac, atl;
        for (int r = 0; r < R; ++r) { pac.push_back({r, 0}); atl.push_back({r, C - 1}); }
        for (int c = 0; c < C; ++c) { pac.push_back({0, c}); atl.push_back({R - 1, c}); }
        auto P = bfs(pac), A = bfs(atl);
        vector<vector<int>> res;
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c) if (P[r][c] && A[r][c]) res.push_back({r, c});
        return res;
    }
};
```

**Time:** O(R·C) · **Space:** O(R·C).

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

### Approach 1: BFS from border 'O's
```cpp
class Solution {
public:
    void solve(vector<vector<char>>& b) {
        int R = b.size(), C = b[0].size();
        queue<pair<int, int>> q;
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c)
            if ((r == 0 || c == 0 || r == R - 1 || c == C - 1) && b[r][c] == 'O') { b[r][c] = 'S'; q.push({r, c}); }
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        while (!q.empty()) {
            auto [r, c] = q.front(); q.pop();
            for (int k = 0; k < 4; ++k) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && b[nr][nc] == 'O') { b[nr][nc] = 'S'; q.push({nr, nc}); }
            }
        }
        for (auto& row : b) for (char& ch : row) ch = ch == 'S' ? 'O' : 'X';
    }
};
```

**Time:** O(R·C) · **Space:** O(R·C).

### Approach 2: Union-Find with a virtual "border" node
```cpp
class Solution {
    vector<int> p;
    int find(int x) { while (p[x] != x) x = p[x] = p[p[x]]; return x; }
    void unite(int a, int b) { p[find(a)] = find(b); }
public:
    void solve(vector<vector<char>>& b) {
        int R = b.size(), C = b[0].size(), border = R * C;
        p.resize(R * C + 1);
        iota(p.begin(), p.end(), 0);
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                if (b[r][c] != 'O') continue;
                if (r == 0 || c == 0 || r == R - 1 || c == C - 1) unite(r * C + c, border);
                if (r + 1 < R && b[r + 1][c] == 'O') unite(r * C + c, (r + 1) * C + c);
                if (c + 1 < C && b[r][c + 1] == 'O') unite(r * C + c, r * C + c + 1);
            }
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c)
                if (b[r][c] == 'O' && find(r * C + c) != find(border)) b[r][c] = 'X';
    }
};
```

**Time:** O(R·C·α) · **Space:** O(R·C). The "virtual node" trick is reusable (e.g. percolation problems).

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

### Approach 1: Repeated full-grid passes (simulation)
```cpp
class Solution {
public:
    int orangesRotting(vector<vector<int>>& g) {
        int R = g.size(), C = g[0].size(), minutes = 0;
        while (true) {
            vector<pair<int, int>> toRot;
            for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c) {
                if (g[r][c] != 1) continue;
                for (auto [nr, nc] : {pair{r + 1, c}, pair{r - 1, c}, pair{r, c + 1}, pair{r, c - 1}})
                    if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] == 2) { toRot.push_back({r, c}); break; }
            }
            if (toRot.empty()) break;
            for (auto [r, c] : toRot) g[r][c] = 2;      // apply after scanning: simultaneous minute
            ++minutes;
        }
        for (auto& row : g) for (int x : row) if (x == 1) return -1;
        return minutes;
    }
};
```

**Time:** O((R·C)²) worst · **Space:** O(R·C). Collecting changes before applying them is the key detail.

### Approach 2: BFS storing time per cell
```cpp
class Solution {
public:
    int orangesRotting(vector<vector<int>>& g) {
        int R = g.size(), C = g[0].size(), fresh = 0, last = 0;
        queue<tuple<int, int, int>> q;                      // (r, c, minute rotted)
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c) {
            if (g[r][c] == 2) q.push({r, c, 0});
            else if (g[r][c] == 1) ++fresh;
        }
        while (!q.empty()) {
            auto [r, c, t] = q.front(); q.pop();
            last = t;
            for (auto [nr, nc] : {pair{r + 1, c}, pair{r - 1, c}, pair{r, c + 1}, pair{r, c - 1}})
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] == 1) {
                    g[nr][nc] = 2; --fresh; q.push({nr, nc, t + 1});
                }
        }
        return fresh ? -1 : last;
    }
};
```

**Time:** O(R·C) · **Space:** O(R·C). Carries time in the queue instead of processing level by level.

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

### Approach 1: BFS from every empty room
```cpp
class Solution {
public:
    void wallsAndGates(vector<vector<int>>& rooms) {
        const int INF = INT_MAX;
        int R = rooms.size(), C = rooms[0].size();
        auto dist = rooms;
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) {
                if (rooms[r][c] != INF) continue;
                vector<vector<int>> d(R, vector<int>(C, -1));
                queue<pair<int, int>> q; q.push({r, c}); d[r][c] = 0;
                while (!q.empty()) {
                    auto [x, y] = q.front(); q.pop();
                    if (rooms[x][y] == 0) { dist[r][c] = d[x][y]; break; }   // nearest gate
                    for (auto [nx, ny] : {pair{x + 1, y}, pair{x - 1, y}, pair{x, y + 1}, pair{x, y - 1}})
                        if (nx >= 0 && ny >= 0 && nx < R && ny < C && rooms[nx][ny] != -1 && d[nx][ny] < 0) {
                            d[nx][ny] = d[x][y] + 1; q.push({nx, ny});
                        }
                }
            }
        rooms = dist;
    }
};
```

**Time:** O((R·C)²) · **Space:** O(R·C).

### Approach 2: DFS from each gate with pruning
```cpp
class Solution {
    void dfs(vector<vector<int>>& g, int r, int c, int d) {
        if (r < 0 || c < 0 || r >= (int)g.size() || c >= (int)g[0].size() || g[r][c] < d) return;
        g[r][c] = d;                                  // found a shorter route
        dfs(g, r + 1, c, d + 1); dfs(g, r - 1, c, d + 1);
        dfs(g, r, c + 1, d + 1); dfs(g, r, c - 1, d + 1);
    }
public:
    void wallsAndGates(vector<vector<int>>& rooms) {
        for (int r = 0; r < (int)rooms.size(); ++r)
            for (int c = 0; c < (int)rooms[0].size(); ++c)
                if (rooms[r][c] == 0) dfs(rooms, r, c, 0);
    }
};
```

**Time:** can revisit cells many times (worse than BFS) · **Space:** O(R·C) recursion. Walls (−1) are never entered because −1 < d; gates stop other gates' searches since 0 < d.

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

### Approach 1: DFS three-colour cycle detection
```cpp
class Solution {
    vector<vector<int>> adj;
    vector<int> state;                       // 0 = unvisited, 1 = on current path, 2 = done
    bool hasCycle(int u) {
        state[u] = 1;
        for (int v : adj[u]) {
            if (state[v] == 1) return true;  // back edge: v is an ancestor on the path
            if (state[v] == 0 && hasCycle(v)) return true;
        }
        state[u] = 2;
        return false;
    }
public:
    bool canFinish(int n, vector<vector<int>>& pre) {
        adj.assign(n, {}); state.assign(n, 0);
        for (auto& e : pre) adj[e[1]].push_back(e[0]);
        for (int i = 0; i < n; ++i) if (state[i] == 0 && hasCycle(i)) return false;
        return true;
    }
};
```

**Time:** O(V + E) · **Space:** O(V + E). The gray/black distinction matters: reaching a "done" node isn't a cycle (it's just a shared dependency).

### Approach 2: Repeatedly remove courses with no prerequisites (naive Kahn)
```cpp
class Solution {
public:
    bool canFinish(int n, vector<vector<int>>& pre) {
        vector<int> indeg(n, 0);
        for (auto& e : pre) ++indeg[e[0]];
        vector<bool> taken(n, false);
        for (int round = 0; round < n; ++round) {
            int pick = -1;
            for (int i = 0; i < n; ++i) if (!taken[i] && indeg[i] == 0) { pick = i; break; }
            if (pick < 0) return false;                     // everything left is blocked
            taken[pick] = true;
            for (auto& e : pre) if (e[1] == pick) --indeg[e[0]];
        }
        return true;
    }
};
```

**Time:** O(V · (V + E)) · **Space:** O(V). Same idea as Kahn's without the queue and adjacency list.

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

### Approach 1: DFS post-order, reversed
```cpp
class Solution {
    vector<vector<int>> adj;
    vector<int> state, order;
    bool dfs(int u) {
        state[u] = 1;
        for (int v : adj[u]) {
            if (state[v] == 1) return false;                  // cycle
            if (state[v] == 0 && !dfs(v)) return false;
        }
        state[u] = 2;
        order.push_back(u);                                   // all dependents finished first
        return true;
    }
public:
    vector<int> findOrder(int n, vector<vector<int>>& pre) {
        adj.assign(n, {}); state.assign(n, 0);
        for (auto& e : pre) adj[e[1]].push_back(e[0]);
        for (int i = 0; i < n; ++i) if (state[i] == 0 && !dfs(i)) return {};
        ranges::reverse(order);
        return order;
    }
};
```

**Time:** O(V + E) · **Space:** O(V + E). The reversed post-order of a DAG is a topological order.

### Approach 2: Kahn with a min-heap (lexicographically smallest order)
```cpp
class Solution {
public:
    vector<int> findOrder(int n, vector<vector<int>>& pre) {
        vector<vector<int>> adj(n);
        vector<int> indeg(n, 0), order;
        for (auto& e : pre) { adj[e[1]].push_back(e[0]); ++indeg[e[0]]; }
        priority_queue<int, vector<int>, greater<>> pq;
        for (int i = 0; i < n; ++i) if (!indeg[i]) pq.push(i);
        while (!pq.empty()) {
            int u = pq.top(); pq.pop();
            order.push_back(u);
            for (int v : adj[u]) if (--indeg[v] == 0) pq.push(v);
        }
        return (int)order.size() == n ? order : vector<int>{};
    }
};
```

**Time:** O((V + E) log V) · **Space:** O(V + E). Useful when a deterministic/smallest ordering is required.

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

### Approach 1: DFS — check connectivity and no cycle
```cpp
class Solution {
public:
    bool validTree(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
        vector<int> parent(n, -2);                       // -2 = unvisited
        vector<int> st{0}; parent[0] = -1;
        int seen = 0;
        while (!st.empty()) {
            int u = st.back(); st.pop_back(); ++seen;
            for (int v : adj[u]) {
                if (v == parent[u]) continue;            // the edge we came from
                if (parent[v] != -2) return false;       // reached a visited node another way: cycle
                parent[v] = u; st.push_back(v);
            }
        }
        return seen == n;                                // connected?
    }
};
```

**Time:** O(V + E) · **Space:** O(V + E). Note the parent check — in an undirected graph each edge appears twice.

### Approach 2: Edge count + BFS connectivity
```cpp
class Solution {
public:
    bool validTree(int n, vector<vector<int>>& edges) {
        if ((int)edges.size() != n - 1) return false;    // a tree has exactly n-1 edges
        vector<vector<int>> adj(n);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
        vector<bool> vis(n, false);
        queue<int> q; q.push(0); vis[0] = true;
        int cnt = 1;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : adj[u]) if (!vis[v]) { vis[v] = true; ++cnt; q.push(v); }
        }
        return cnt == n;                                 // n-1 edges + connected => acyclic
    }
};
```

**Time:** O(V + E) · **Space:** O(V + E). Uses the theorem: with n−1 edges, connected ⇔ acyclic.

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

### Approach 1: DFS counting starts
```cpp
class Solution {
public:
    int countComponents(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
        vector<bool> vis(n, false);
        int comps = 0;
        for (int s = 0; s < n; ++s) {
            if (vis[s]) continue;
            ++comps;                                    // new component
            vector<int> st{s}; vis[s] = true;
            while (!st.empty()) {
                int u = st.back(); st.pop_back();
                for (int v : adj[u]) if (!vis[v]) { vis[v] = true; st.push_back(v); }
            }
        }
        return comps;
    }
};
```

**Time:** O(V + E) · **Space:** O(V + E).

### Approach 2: Union by size (full DSU class)
```cpp
class Solution {
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
public:
    int countComponents(int n, vector<vector<int>>& edges) {
        DSU d(n);
        int comps = n;
        for (auto& e : edges) comps -= d.unite(e[0], e[1]);
        return comps;
    }
};
```

**Time:** O(E · α(n)) · **Space:** O(n). Union by size keeps trees shallow even without path compression.

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

### Approach 1: DFS before adding each edge
```cpp
class Solution {
    bool connected(vector<vector<int>>& adj, int u, int target, vector<bool>& vis) {
        if (u == target) return true;
        vis[u] = true;
        for (int v : adj[u]) if (!vis[v] && connected(adj, v, target, vis)) return true;
        return false;
    }
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            vector<bool> vis(n + 1, false);
            if (!adj[e[0]].empty() && !adj[e[1]].empty() && connected(adj, e[0], e[1], vis))
                return e;                                  // already connected: this edge closes a cycle
            adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]);
        }
        return {};
    }
};
```

**Time:** O(n²) · **Space:** O(n).

### Approach 2: Find the cycle, then return its last edge in input order
```cpp
class Solution {
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        vector<vector<int>> adj(n + 1);
        vector<int> deg(n + 1, 0);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); ++deg[e[0]]; ++deg[e[1]]; }
        queue<int> q;                                       // peel leaves until only the cycle remains
        for (int i = 1; i <= n; ++i) if (deg[i] == 1) q.push(i);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : adj[u]) if (--deg[v] == 1) q.push(v);
        }
        for (int i = n - 1; i >= 0; --i)                    // last input edge with both ends on the cycle
            if (deg[edges[i][0]] >= 2 && deg[edges[i][1]] >= 2) return edges[i];
        return {};
    }
};
```

**Time:** O(n) · **Space:** O(n). Leaf-peeling (a topological-sort idea for undirected graphs) isolates the unique cycle.

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

### Approach 1: BFS comparing against every word
```cpp
class Solution {
    static bool oneDiff(const string& a, const string& b) {
        int d = 0;
        for (size_t i = 0; i < a.size() && d < 2; ++i) d += a[i] != b[i];
        return d == 1;
    }
public:
    int ladderLength(string begin, string end, vector<string>& words) {
        vector<bool> used(words.size(), false);
        queue<pair<string, int>> q; q.push({begin, 1});
        while (!q.empty()) {
            auto [w, d] = q.front(); q.pop();
            if (w == end) return d;
            for (size_t i = 0; i < words.size(); ++i)
                if (!used[i] && oneDiff(w, words[i])) { used[i] = true; q.push({words[i], d + 1}); }
        }
        return 0;
    }
};
```

**Time:** O(N² · L) · **Space:** O(N). Better than generating neighbours when the dictionary is tiny.

### Approach 2: Bidirectional BFS
```cpp
class Solution {
public:
    int ladderLength(string begin, string end, vector<string>& wordList) {
        unordered_set<string> dict(wordList.begin(), wordList.end());
        if (!dict.count(end)) return 0;
        unordered_set<string> front{begin}, back{end};
        dict.erase(begin); dict.erase(end);
        for (int steps = 1; !front.empty(); ++steps) {
            if (front.size() > back.size()) swap(front, back);      // always expand the smaller side
            unordered_set<string> next;
            for (string w : front)
                for (char& ch : w) {
                    char orig = ch;
                    for (char c = 'a'; c <= 'z'; ++c) {
                        ch = c;
                        if (back.count(w)) return steps + 1;      // the two searches met
                        if (dict.count(w)) { next.insert(w); dict.erase(w); }
                    }
                    ch = orig;
                }
            front = std::move(next);
        }
        return 0;
    }
};
```

**Time:** roughly O(b^(d/2)) instead of O(b^d) · **Space:** frontier sizes. A big practical speed-up — mention it as the follow-up.

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
