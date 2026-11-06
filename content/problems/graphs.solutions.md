## number-of-islands

### Approach 1: BFS flood fill (no recursion)
**The idea:** every unvisited `'1'` starts a new island; a queue spreads to all connected land and marks it as water.

```cpp
class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int R = grid.size();
        int C = grid[0].size();
        int count = 0;
        int dr[4] = {1, -1, 0, 0};    // row change for down, up, right, left
        int dc[4] = {0, 0, 1, -1};    // column change

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != '1') {
                    continue;
                }
                count++;                      // new island found
                queue<pair<int, int>> q;
                q.push({r, c});
                grid[r][c] = '0';             // mark as visited when pushing

                while (!q.empty()) {
                    int cr = q.front().first;
                    int cc = q.front().second;
                    q.pop();
                    for (int k = 0; k < 4; k++) {
                        int nr = cr + dr[k];
                        int nc = cc + dc[k];
                        if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
                            continue;         // off the map
                        }
                        if (grid[nr][nc] != '1') {
                            continue;         // water or already visited
                        }
                        grid[nr][nc] = '0';
                        q.push({nr, nc});
                    }
                }
            }
        }
        return count;
    }
};
```

**How it works:** marking cells when they are *pushed* (not popped) prevents pushing the same cell twice.

**Think of it like this:** pouring paint on one piece of land — it spreads to everything connected.

**Cost:** Time **O(R·C)**. Space **O(min(R, C))** for the queue.

### Approach 2: Union-Find
**The idea:** treat each land cell as a node; join it with land to its right and below. Each successful join merges two islands into one.

```cpp
class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int R = grid.size();
        int C = grid[0].size();
        parent.resize(R * C);
        int islands = 0;

        // Every land cell starts as its own island.
        for (int i = 0; i < R * C; i++) {
            parent[i] = i;
            if (grid[i / C][i % C] == '1') {
                islands++;
            }
        }

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != '1') {
                    continue;
                }
                // Join with the right and lower neighbours (that covers every edge once).
                if (c + 1 < C && grid[r][c + 1] == '1' && unite(r * C + c, r * C + c + 1)) {
                    islands--;
                }
                if (r + 1 < R && grid[r + 1][c] == '1' && unite(r * C + c, (r + 1) * C + c)) {
                    islands--;
                }
            }
        }
        return islands;
    }

private:
    vector<int> parent;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving: shortcut the chain
            x = parent[x];
        }
        return x;
    }

    // Returns true if a and b were in different groups (and are now joined).
    bool unite(int a, int b) {
        int ra = find(a);
        int rb = find(b);
        if (ra == rb) {
            return false;
        }
        parent[ra] = rb;
        return true;
    }
};
```

**How it works:** start with one island per land cell and subtract one for every merge.

**Think of it like this:** every land square is a club; neighbouring clubs merge, and you count how many clubs are left.

**Cost:** Time **O(R·C · α)** ≈ linear. Space **O(R·C)**. Useful for the follow-up where land is added over time (LC 305).

### Optimal: DFS flood fill ("sink" each island)
**The idea:** scan the grid; when you find land, count it and sink the whole island so it's never counted again.

```cpp
class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        R = grid.size();
        C = grid[0].size();
        int count = 0;

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == '1') {
                    count++;              // found an island we haven't seen
                    sink(grid, r, c);     // erase it so we don't count it again
                }
            }
        }
        return count;
    }

private:
    int R = 0;
    int C = 0;

    // Turn this cell and all land connected to it into water.
    void sink(vector<vector<char>>& grid, int r, int c) {
        if (r < 0 || c < 0 || r >= R || c >= C) {
            return;                       // off the map
        }
        if (grid[r][c] != '1') {
            return;                       // water (or already sunk)
        }
        grid[r][c] = '0';                 // mark visited by sinking
        sink(grid, r + 1, c);
        sink(grid, r - 1, c);
        sink(grid, r, c + 1);
        sink(grid, r, c - 1);
    }
};
```

**How it works**
1. Every `'1'` reached by the scan is the first cell of a new island → `count++`.
2. `sink` floods the island, turning it into `'0'`.
3. Out of bounds or water stops the flood.

**Think of it like this:** flying over a map with an eraser — every time you see land, you tally it and erase that whole island.

**Why it's optimal:** every cell is visited a constant number of times; no extra visited array. (For huge grids, use the BFS version to avoid deep recursion.)

**Cost:** Time **O(R·C)**. Space **O(R·C)** worst-case recursion.

## clone-graph

### Approach 1: BFS with a hash map
**The idea:** visit nodes with a queue. The map from original → copy doubles as the "visited" set.

```cpp
class Solution {
public:
    Node* cloneGraph(Node* node) {
        if (node == nullptr) {
            return nullptr;
        }
        unordered_map<Node*, Node*> copies;    // original → its copy
        copies[node] = new Node(node->val);
        queue<Node*> q;
        q.push(node);

        while (!q.empty()) {
            Node* cur = q.front();
            q.pop();
            for (Node* nb : cur->neighbors) {
                if (copies.count(nb) == 0) {
                    copies[nb] = new Node(nb->val);   // first time we see nb
                    q.push(nb);
                }
                // Connect the copies the same way the originals are connected.
                copies[cur]->neighbors.push_back(copies[nb]);
            }
        }
        return copies[node];
    }
};
```

**How it works:** each node is copied once when first seen; each edge is copied when its source is processed.

**Think of it like this:** photocopying a map of friendships, one person at a time.

**Cost:** Time **O(V + E)**. Space **O(V)**.

### Approach 2: Array indexed by value (values are unique 1..n)
**The idea:** LeetCode guarantees `node->val` is unique and in 1..100, so a plain array can replace the hash map.

```cpp
class Solution {
public:
    Node* cloneGraph(Node* node) {
        if (node == nullptr) {
            return nullptr;
        }
        vector<Node*> copyOf(101, nullptr);   // copyOf[val] = copy of the node with that value
        copyOf[node->val] = new Node(node->val);
        stack<Node*> st;
        st.push(node);

        while (!st.empty()) {
            Node* cur = st.top();
            st.pop();
            for (Node* nb : cur->neighbors) {
                if (copyOf[nb->val] == nullptr) {
                    copyOf[nb->val] = new Node(nb->val);
                    st.push(nb);
                }
                copyOf[cur->val]->neighbors.push_back(copyOf[nb->val]);
            }
        }
        return copyOf[node->val];
    }
};
```

**How it works:** identical logic, cheaper lookups — only valid because of the value guarantee.

**Think of it like this:** students with unique seat numbers — a seating chart is faster than a name directory.

**Cost:** Time **O(V + E)**. Space **O(V)**.

### Optimal: DFS with a hash map (register before recursing)
**The idea:** `cloneGraph(n)` returns the copy of `n`, creating it if needed. Register the copy *before* cloning neighbours so cycles find it instead of looping forever.

```cpp
class Solution {
public:
    Node* cloneGraph(Node* node) {
        if (node == nullptr) {
            return nullptr;
        }
        // Already copied? Then return that copy — this is what stops cycles.
        auto it = copies.find(node);
        if (it != copies.end()) {
            return it->second;
        }

        Node* copy = new Node(node->val);
        copies[node] = copy;                      // register BEFORE recursing

        for (Node* nb : node->neighbors) {
            copy->neighbors.push_back(cloneGraph(nb));
        }
        return copy;
    }

private:
    unordered_map<Node*, Node*> copies;           // original → copy (also the visited set)
};
```

**How it works**
1. If `node` was copied before, return the copy.
2. Otherwise create the copy and store it in `copies`.
3. Clone each neighbour (recursively) and attach it.

**Think of it like this:** exploring a house and drawing a floor plan; when a door leads to a room already on your plan, you just draw the connecting line.

**Why it's optimal:** every node and edge handled once; the map is both "visited" and "where is the copy".

**Cost:** Time **O(V + E)**. Space **O(V)**.

## max-area-of-island

### Approach 1: Iterative DFS with an explicit stack
**The idea:** same flood fill as Number of Islands, counting cells as you go, with a stack instead of recursion.

```cpp
class Solution {
public:
    int maxAreaOfIsland(vector<vector<int>>& grid) {
        int R = grid.size();
        int C = grid[0].size();
        int best = 0;
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != 1) {
                    continue;
                }
                int size = 0;
                stack<pair<int, int>> st;
                st.push({r, c});
                grid[r][c] = 0;
                while (!st.empty()) {
                    int cr = st.top().first;
                    int cc = st.top().second;
                    st.pop();
                    size++;
                    for (int k = 0; k < 4; k++) {
                        int nr = cr + dr[k];
                        int nc = cc + dc[k];
                        if (nr >= 0 && nc >= 0 && nr < R && nc < C && grid[nr][nc] == 1) {
                            grid[nr][nc] = 0;
                            st.push({nr, nc});
                        }
                    }
                }
                best = max(best, size);
            }
        }
        return best;
    }
};
```

**How it works:** each popped cell adds 1 to the island's size.

**Think of it like this:** counting squares of land while painting them.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

### Approach 2: Union-Find with component sizes
**The idea:** merge neighbouring land cells; each root tracks its group's size.

```cpp
class Solution {
public:
    int maxAreaOfIsland(vector<vector<int>>& grid) {
        int R = grid.size();
        int C = grid[0].size();
        parent.resize(R * C);
        size.assign(R * C, 1);
        for (int i = 0; i < R * C; i++) {
            parent[i] = i;
        }

        int best = 0;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != 1) {
                    continue;
                }
                best = max(best, 1);
                if (c + 1 < C && grid[r][c + 1] == 1) {
                    best = max(best, unite(r * C + c, r * C + c + 1));
                }
                if (r + 1 < R && grid[r + 1][c] == 1) {
                    best = max(best, unite(r * C + c, (r + 1) * C + c));
                }
            }
        }
        return best;
    }

private:
    vector<int> parent;
    vector<int> size;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    // Join the groups of a and b; return the size of the resulting group.
    int unite(int a, int b) {
        int ra = find(a);
        int rb = find(b);
        if (ra != rb) {
            parent[ra] = rb;
            size[rb] += size[ra];
        }
        return size[rb];
    }
};
```

**How it works:** the root's `size` is always the size of its whole island.

**Think of it like this:** clubs merging and adding up their member counts.

**Cost:** Time **O(R·C · α)**. Space **O(R·C)**.

### Optimal: Recursive flood fill that returns the area
**The idea:** the flood fill returns how many cells it sank: `1 + area of the 4 neighbours`.

```cpp
class Solution {
public:
    int maxAreaOfIsland(vector<vector<int>>& grid) {
        R = grid.size();
        C = grid[0].size();
        int best = 0;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                best = max(best, area(grid, r, c));
            }
        }
        return best;
    }

private:
    int R = 0;
    int C = 0;

    // Sink the island containing (r, c) and return its number of cells.
    int area(vector<vector<int>>& grid, int r, int c) {
        if (r < 0 || c < 0 || r >= R || c >= C) {
            return 0;
        }
        if (grid[r][c] != 1) {
            return 0;                         // water or already counted
        }
        grid[r][c] = 0;                       // mark visited
        return 1
             + area(grid, r + 1, c)
             + area(grid, r - 1, c)
             + area(grid, r, c + 1)
             + area(grid, r, c - 1);
    }
};
```

**How it works**
1. Same scan as Number of Islands.
2. `area` sinks a cell and adds up the areas of its neighbours.
3. Keep the maximum.

**Think of it like this:** each square of land shouts "me, plus whoever my neighbours found".

**Why it's optimal:** one visit per cell, tiny code.

**Cost:** Time **O(R·C)**. Space **O(R·C)** worst-case recursion.

## pacific-atlantic-water-flow

### Approach 1: Brute force — search from every cell
**The idea:** for each cell, run a DFS following downhill-or-flat moves and see whether it reaches both oceans.

```cpp
class Solution {
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        R = heights.size();
        C = heights[0].size();
        vector<vector<int>> res;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                vector<vector<bool>> seen(R, vector<bool>(C, false));
                bool pacific = false;
                bool atlantic = false;
                flow(heights, r, c, seen, pacific, atlantic);
                if (pacific && atlantic) {
                    res.push_back({r, c});
                }
            }
        }
        return res;
    }

private:
    int R = 0;
    int C = 0;

    void flow(vector<vector<int>>& h, int r, int c, vector<vector<bool>>& seen,
              bool& pacific, bool& atlantic) {
        seen[r][c] = true;
        if (r == 0 || c == 0) {
            pacific = true;                         // touching the top or left edge
        }
        if (r == R - 1 || c == C - 1) {
            atlantic = true;                        // touching the bottom or right edge
        }
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc]) {
                continue;
            }
            if (h[nr][nc] > h[r][c]) {
                continue;                           // water can't flow uphill
            }
            flow(h, nr, nc, seen, pacific, atlantic);
        }
    }
};
```

**How it works:** follows the rules literally from each cell.

**Think of it like this:** pouring a bucket of water on every square, one at a time, and watching where it ends up.

**Cost:** Time **O((R·C)²)**. Space **O(R·C)**.

### Approach 2: Multi-source BFS from each ocean
**The idea:** reverse the flow: start from all cells next to an ocean and climb uphill with a queue.

```cpp
class Solution {
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        R = heights.size();
        C = heights[0].size();
        queue<pair<int, int>> pq;
        queue<pair<int, int>> aq;
        vector<vector<bool>> pac(R, vector<bool>(C, false));
        vector<vector<bool>> atl(R, vector<bool>(C, false));

        for (int r = 0; r < R; r++) {
            start(pq, pac, r, 0);          // left edge → Pacific
            start(aq, atl, r, C - 1);      // right edge → Atlantic
        }
        for (int c = 0; c < C; c++) {
            start(pq, pac, 0, c);          // top edge → Pacific
            start(aq, atl, R - 1, c);      // bottom edge → Atlantic
        }
        climb(heights, pq, pac);
        climb(heights, aq, atl);

        vector<vector<int>> res;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (pac[r][c] && atl[r][c]) {
                    res.push_back({r, c});
                }
            }
        }
        return res;
    }

private:
    int R = 0;
    int C = 0;

    void start(queue<pair<int, int>>& q, vector<vector<bool>>& seen, int r, int c) {
        if (!seen[r][c]) {
            seen[r][c] = true;
            q.push({r, c});
        }
    }

    void climb(vector<vector<int>>& h, queue<pair<int, int>>& q, vector<vector<bool>>& seen) {
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            int r = q.front().first;
            int c = q.front().second;
            q.pop();
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc]) {
                    continue;
                }
                if (h[nr][nc] < h[r][c]) {
                    continue;              // only climb to equal or higher cells
                }
                seen[nr][nc] = true;
                q.push({nr, nc});
            }
        }
    }
};
```

**How it works:** any cell you can climb to from an ocean can drain back down to it.

**Think of it like this:** salmon swimming upstream from the sea — everywhere they can reach, water can flow back to the sea.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

### Optimal: Reverse-flow DFS from both oceans
**The idea:** the same reversal as Approach 2, with recursion: climb uphill from each ocean's edge, then answer = cells reached from both.

```cpp
class Solution {
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        R = heights.size();
        C = heights[0].size();
        vector<vector<bool>> pac(R, vector<bool>(C, false));   // can reach the Pacific
        vector<vector<bool>> atl(R, vector<bool>(C, false));   // can reach the Atlantic

        for (int r = 0; r < R; r++) {
            dfs(heights, pac, r, 0);          // left column touches the Pacific
            dfs(heights, atl, r, C - 1);      // right column touches the Atlantic
        }
        for (int c = 0; c < C; c++) {
            dfs(heights, pac, 0, c);          // top row → Pacific
            dfs(heights, atl, R - 1, c);      // bottom row → Atlantic
        }

        vector<vector<int>> res;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (pac[r][c] && atl[r][c]) {
                    res.push_back({r, c});
                }
            }
        }
        return res;
    }

private:
    int R = 0;
    int C = 0;

    // Mark every cell reachable by climbing (equal or higher) from (r, c).
    void dfs(vector<vector<int>>& h, vector<vector<bool>>& seen, int r, int c) {
        if (seen[r][c]) {
            return;
        }
        seen[r][c] = true;
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
                continue;
            }
            if (h[nr][nc] < h[r][c]) {
                continue;                     // can only climb uphill (or stay level)
            }
            dfs(h, seen, nr, nc);
        }
    }
};
```

**How it works**
1. Start from every Pacific edge cell and climb → `pac`.
2. Same from the Atlantic edges → `atl`.
3. Cells in both can drain to both oceans.

**Think of it like this:** instead of following every raindrop down, you walk up from the beach and mark everywhere you can get to.

**Why it's optimal:** each cell is visited at most twice (once per ocean), instead of a full search per cell.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

## surrounded-regions

### Approach 1: BFS from the border `'O'`s
**The idea:** an `'O'` survives only if it connects to the border. Mark every border-connected `'O'` as safe with a queue, then flip the rest.

```cpp
class Solution {
public:
    void solve(vector<vector<char>>& board) {
        int R = board.size();
        int C = board[0].size();
        queue<pair<int, int>> q;

        // Every 'O' on the border is safe.
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                bool onBorder = (r == 0 || c == 0 || r == R - 1 || c == C - 1);
                if (onBorder && board[r][c] == 'O') {
                    board[r][c] = 'S';
                    q.push({r, c});
                }
            }
        }

        // Spread "safe" to connected 'O's.
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            int r = q.front().first;
            int c = q.front().second;
            q.pop();
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && board[nr][nc] == 'O') {
                    board[nr][nc] = 'S';
                    q.push({nr, nc});
                }
            }
        }

        // Safe cells go back to 'O'; everything else becomes 'X'.
        for (vector<char>& row : board) {
            for (char& ch : row) {
                if (ch == 'S') {
                    ch = 'O';
                } else {
                    ch = 'X';
                }
            }
        }
    }
};
```

**How it works:** same as the optimal solution, without recursion.

**Think of it like this:** water flowing in from the edges — anything it touches is "connected to the outside".

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

### Approach 2: Union-Find with a virtual "border" node
**The idea:** connect every border `'O'` to an extra node called BORDER, and connect neighbouring `'O'`s. At the end, any `'O'` not connected to BORDER is captured.

```cpp
class Solution {
public:
    void solve(vector<vector<char>>& board) {
        int R = board.size();
        int C = board[0].size();
        int BORDER = R * C;                    // the extra node
        parent.resize(R * C + 1);
        for (int i = 0; i <= R * C; i++) {
            parent[i] = i;
        }

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (board[r][c] != 'O') {
                    continue;
                }
                int id = r * C + c;
                if (r == 0 || c == 0 || r == R - 1 || c == C - 1) {
                    unite(id, BORDER);
                }
                if (r + 1 < R && board[r + 1][c] == 'O') {
                    unite(id, id + C);
                }
                if (c + 1 < C && board[r][c + 1] == 'O') {
                    unite(id, id + 1);
                }
            }
        }

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (board[r][c] == 'O' && find(r * C + c) != find(BORDER)) {
                    board[r][c] = 'X';         // not connected to the border: captured
                }
            }
        }
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

    void unite(int a, int b) {
        parent[find(a)] = find(b);
    }
};
```

**How it works:** the BORDER node gives all edge-connected regions a common root.

**Think of it like this:** everyone holding hands with someone who can reach the exit is "outside".

**Cost:** Time **O(R·C · α)**. Space **O(R·C)**.

### Optimal: DFS from the border, then flip
**The idea:** don't look for captured regions — look for the safe ones (connected to the edge), which is easy. Everything else is captured.

```cpp
class Solution {
public:
    void solve(vector<vector<char>>& board) {
        R = board.size();
        C = board[0].size();

        // 1. Mark every 'O' connected to the border as safe ('S').
        for (int r = 0; r < R; r++) {
            mark(board, r, 0);
            mark(board, r, C - 1);
        }
        for (int c = 0; c < C; c++) {
            mark(board, 0, c);
            mark(board, R - 1, c);
        }

        // 2. Safe cells become 'O' again; remaining 'O's are captured → 'X'.
        for (vector<char>& row : board) {
            for (char& ch : row) {
                if (ch == 'S') {
                    ch = 'O';
                } else {
                    ch = 'X';
                }
            }
        }
    }

private:
    int R = 0;
    int C = 0;

    void mark(vector<vector<char>>& board, int r, int c) {
        if (r < 0 || c < 0 || r >= R || c >= C) {
            return;
        }
        if (board[r][c] != 'O') {
            return;                       // 'X' or already marked
        }
        board[r][c] = 'S';                // safe: connected to the border
        mark(board, r + 1, c);
        mark(board, r - 1, c);
        mark(board, r, c + 1);
        mark(board, r, c - 1);
    }
};
```

**How it works**
1. Flood from each border `'O'`, marking `'S'`.
2. Final pass: `'S'` → `'O'`, anything else → `'X'`.

**Think of it like this:** in a game of Go, stones that can still "breathe" through the edge survive; surrounded ones are captured.

**Why it's optimal:** two linear passes; the inverted question avoids testing each region separately.

**Cost:** Time **O(R·C)**. Space **O(R·C)** worst-case recursion.

## rotting-oranges

### Approach 1: Repeated full-grid passes (simulation)
**The idea:** simulate minute by minute: in each pass, find fresh oranges next to rotten ones and rot them. Stop when nothing changes.

```cpp
class Solution {
public:
    int orangesRotting(vector<vector<int>>& grid) {
        int R = grid.size();
        int C = grid[0].size();
        int minutes = 0;

        while (true) {
            vector<pair<int, int>> toRot;       // oranges that rot this minute
            for (int r = 0; r < R; r++) {
                for (int c = 0; c < C; c++) {
                    if (grid[r][c] != 1) {
                        continue;
                    }
                    bool nextToRotten = (r > 0 && grid[r - 1][c] == 2) ||
                                        (r + 1 < R && grid[r + 1][c] == 2) ||
                                        (c > 0 && grid[r][c - 1] == 2) ||
                                        (c + 1 < C && grid[r][c + 1] == 2);
                    if (nextToRotten) {
                        toRot.push_back({r, c});
                    }
                }
            }
            if (toRot.empty()) {
                break;                           // nothing changed this minute
            }
            for (const pair<int, int>& p : toRot) {
                grid[p.first][p.second] = 2;     // apply all changes at once
            }
            minutes++;
        }

        for (const vector<int>& row : grid) {
            for (int cell : row) {
                if (cell == 1) {
                    return -1;                   // some orange can never be reached
                }
            }
        }
        return minutes;
    }
};
```

**How it works:** collecting changes first and applying them after the scan makes all rotting in one minute simultaneous.

**Think of it like this:** taking a photo every minute and comparing it to the last one.

**Cost:** Time **O((R·C)²)** worst case. Space **O(R·C)**.

### Approach 2: BFS storing the time per cell
**The idea:** multi-source BFS where each cell records the minute it rotted; the answer is the largest time.

```cpp
class Solution {
public:
    int orangesRotting(vector<vector<int>>& grid) {
        int R = grid.size();
        int C = grid[0].size();
        vector<vector<int>> time(R, vector<int>(C, -1));   // minute each cell rotted
        queue<pair<int, int>> q;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == 2) {
                    time[r][c] = 0;
                    q.push({r, c});
                }
            }
        }

        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        int latest = 0;
        while (!q.empty()) {
            int r = q.front().first;
            int c = q.front().second;
            q.pop();
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
                    continue;
                }
                if (grid[nr][nc] == 1 && time[nr][nc] == -1) {
                    time[nr][nc] = time[r][c] + 1;
                    latest = max(latest, time[nr][nc]);
                    q.push({nr, nc});
                }
            }
        }

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == 1 && time[r][c] == -1) {
                    return -1;
                }
            }
        }
        return latest;
    }
};
```

**How it works:** BFS reaches each orange at its earliest possible minute.

**Think of it like this:** writing on every orange the minute it went bad.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

### Optimal: Multi-source BFS, one level per minute
**The idea:** put *all* rotten oranges in the queue at the start; each BFS level is one minute of spreading.

```cpp
class Solution {
public:
    int orangesRotting(vector<vector<int>>& grid) {
        int R = grid.size();
        int C = grid[0].size();
        int fresh = 0;
        queue<pair<int, int>> q;

        // All initially rotten oranges start spreading at the same time.
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == 2) {
                    q.push({r, c});
                } else if (grid[r][c] == 1) {
                    fresh++;
                }
            }
        }

        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        int minutes = 0;
        while (!q.empty() && fresh > 0) {
            int levelSize = q.size();          // oranges that rotted last minute
            for (int i = 0; i < levelSize; i++) {
                int r = q.front().first;
                int c = q.front().second;
                q.pop();
                for (int k = 0; k < 4; k++) {
                    int nr = r + dr[k];
                    int nc = c + dc[k];
                    if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
                        continue;
                    }
                    if (grid[nr][nc] != 1) {
                        continue;              // empty, or already rotten
                    }
                    grid[nr][nc] = 2;          // rot it now so it isn't added twice
                    fresh--;
                    q.push({nr, nc});
                }
            }
            minutes++;                          // one level = one minute
        }

        if (fresh == 0) {
            return minutes;
        }
        return -1;                              // some fresh oranges were unreachable
    }
};
```

**How it works**
1. Queue all rotten oranges; count fresh ones.
2. Each level of BFS rots the fresh neighbours of the previous level.
3. If fresh oranges remain at the end, return −1.

**Think of it like this:** ripples spreading out from several stones dropped in a pond at the same moment.

**Why it's optimal:** each cell enters the queue at most once.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

## walls-and-gates

### Approach 1: BFS from every empty room
**The idea:** for each empty room, BFS until you find the nearest gate.

```cpp
class Solution {
public:
    void wallsAndGates(vector<vector<int>>& rooms) {
        const int INF = INT_MAX;
        int R = rooms.size();
        int C = rooms[0].size();
        vector<vector<int>> answer = rooms;
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (rooms[r][c] != INF) {
                    continue;
                }
                vector<vector<int>> dist(R, vector<int>(C, -1));
                queue<pair<int, int>> q;
                q.push({r, c});
                dist[r][c] = 0;
                while (!q.empty()) {
                    int cr = q.front().first;
                    int cc = q.front().second;
                    q.pop();
                    if (rooms[cr][cc] == 0) {
                        answer[r][c] = dist[cr][cc];   // nearest gate found
                        break;
                    }
                    for (int k = 0; k < 4; k++) {
                        int nr = cr + dr[k];
                        int nc = cc + dc[k];
                        if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
                            continue;
                        }
                        if (rooms[nr][nc] == -1 || dist[nr][nc] != -1) {
                            continue;
                        }
                        dist[nr][nc] = dist[cr][cc] + 1;
                        q.push({nr, nc});
                    }
                }
            }
        }
        rooms = answer;
    }
};
```

**How it works:** correct, but repeats almost the same search for every room.

**Think of it like this:** every person in a building separately walks around looking for the nearest exit.

**Cost:** Time **O((R·C)²)**. Space **O(R·C)**.

### Approach 2: DFS from each gate, stopping when a room is already closer
**The idea:** from each gate, walk outwards, writing the distance into rooms — but stop when a room already has a smaller distance.

```cpp
class Solution {
public:
    void wallsAndGates(vector<vector<int>>& rooms) {
        R = rooms.size();
        C = rooms[0].size();
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (rooms[r][c] == 0) {
                    spread(rooms, r, c, 0);
                }
            }
        }
    }

private:
    int R = 0;
    int C = 0;

    void spread(vector<vector<int>>& rooms, int r, int c, int d) {
        if (r < 0 || c < 0 || r >= R || c >= C) {
            return;
        }
        // Stop at walls, and at rooms that already know a shorter (or equal) distance.
        if (rooms[r][c] < d) {
            return;
        }
        rooms[r][c] = d;
        spread(rooms, r + 1, c, d + 1);
        spread(rooms, r - 1, c, d + 1);
        spread(rooms, r, c + 1, d + 1);
        spread(rooms, r, c - 1, d + 1);
    }
};
```

**How it works:** walls are −1 (always `< d`), so they stop the walk automatically. A room can be rewritten when a closer gate reaches it later.

**Think of it like this:** each exit sends out runners who stop when they reach a room that already has a closer exit marked.

**Cost:** Time can be **O((R·C)²)** in bad cases. Space **O(R·C)** recursion.

### Optimal: Multi-source BFS from all gates at once
**The idea:** start BFS from every gate together. BFS reaches rooms in order of distance, so the first time a room is reached is its shortest distance to *any* gate.

```cpp
class Solution {
public:
    void wallsAndGates(vector<vector<int>>& rooms) {
        const int INF = INT_MAX;             // marks an empty room not yet reached
        int R = rooms.size();
        int C = rooms[0].size();
        queue<pair<int, int>> q;

        // All gates are sources at distance 0.
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (rooms[r][c] == 0) {
                    q.push({r, c});
                }
            }
        }

        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            int r = q.front().first;
            int c = q.front().second;
            q.pop();
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
                    continue;
                }
                if (rooms[nr][nc] != INF) {
                    continue;                // wall, gate, or already has its distance
                }
                rooms[nr][nc] = rooms[r][c] + 1;   // first visit = shortest distance
                q.push({nr, nc});
            }
        }
    }
};
```

**How it works**
1. Enqueue all gates.
2. BFS spreads in rings: distance 1, then 2, …
3. An `INF` room gets `parent + 1` the first time it's reached; walls and filled rooms are skipped.

**Think of it like this:** all fire alarms go off at once; the sound reaches each room first from the nearest alarm.

**Why it's optimal:** every cell is processed once — O(R·C) total.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

## course-schedule

### Approach 1: DFS cycle detection with three colours
**The idea:** a cycle exists if DFS ever reaches a course that is still "in progress" on the current path.

```cpp
class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        adj.assign(numCourses, {});
        for (const vector<int>& e : prerequisites) {
            adj[e[1]].push_back(e[0]);          // e[1] must come before e[0]
        }
        // 0 = not visited, 1 = on the current DFS path, 2 = finished (no cycle through it)
        state.assign(numCourses, 0);
        for (int i = 0; i < numCourses; i++) {
            if (hasCycle(i)) {
                return false;
            }
        }
        return true;
    }

private:
    vector<vector<int>> adj;
    vector<int> state;

    bool hasCycle(int u) {
        if (state[u] == 1) {
            return true;                        // came back to a course on our path
        }
        if (state[u] == 2) {
            return false;                       // already checked, it's fine
        }
        state[u] = 1;
        for (int v : adj[u]) {
            if (hasCycle(v)) {
                return true;
            }
        }
        state[u] = 2;
        return false;
    }
};
```

**How it works:** "in progress" (1) vs "done" (2) distinguishes a real cycle from simply reaching a node twice by different paths.

**Think of it like this:** following a chain of "you need X first" — if you come back to a course you're still in the middle of, it's impossible.

**Cost:** Time **O(V + E)**. Space **O(V + E)**.

### Approach 2: Repeatedly remove courses with no prerequisites (naive)
**The idea:** keep removing any course whose prerequisites are all taken. If you get stuck before taking everything, there's a cycle.

```cpp
class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<bool> taken(numCourses, false);
        int count = 0;
        bool progress = true;

        while (progress) {
            progress = false;
            for (int course = 0; course < numCourses; course++) {
                if (taken[course]) {
                    continue;
                }
                // Are all prerequisites of this course already taken?
                bool ready = true;
                for (const vector<int>& e : prerequisites) {
                    if (e[0] == course && !taken[e[1]]) {
                        ready = false;
                        break;
                    }
                }
                if (ready) {
                    taken[course] = true;
                    count++;
                    progress = true;
                }
            }
        }
        return count == numCourses;
    }
};
```

**How it works:** the same idea as Kahn's algorithm, but rescans everything instead of tracking counts.

**Think of it like this:** checking the whole course catalogue every semester for courses you can now take.

**Cost:** Time **O(V · V · E)** worst case. Space **O(V)**.

### Optimal: Kahn's algorithm (BFS topological sort)
**The idea:** count each course's unmet prerequisites (in-degree). Courses with 0 can be taken; taking one reduces the count of the courses it unlocks.

```cpp
class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> adj(numCourses);   // adj[b] = courses that b unlocks
        vector<int> indeg(numCourses, 0);      // indeg[a] = unmet prerequisites of a
        for (const vector<int>& e : prerequisites) {
            int a = e[0];
            int b = e[1];                      // pair [a, b]: take b before a
            adj[b].push_back(a);
            indeg[a]++;
        }

        // Start with every course that has no prerequisites.
        queue<int> q;
        for (int i = 0; i < numCourses; i++) {
            if (indeg[i] == 0) {
                q.push(i);
            }
        }

        int taken = 0;
        while (!q.empty()) {
            int u = q.front();
            q.pop();
            taken++;                           // take course u
            for (int v : adj[u]) {
                indeg[v]--;                    // one prerequisite of v is now done
                if (indeg[v] == 0) {
                    q.push(v);                 // v is now available
                }
            }
        }
        // Courses on a cycle never reach in-degree 0, so they are never taken.
        return taken == numCourses;
    }
};
```

**How it works**
1. Build edges `b → a` and count in-degrees.
2. Queue all courses with in-degree 0.
3. Pop, take, decrement neighbours; any that reach 0 are queued.
4. All taken ⇔ no cycle.

**Think of it like this:** a university timetable — each semester you take whatever has no outstanding prerequisites, which unlocks more courses.

**Why it's optimal:** each edge and course is processed once, no recursion.

**Cost:** Time **O(V + E)**. Space **O(V + E)**.

## course-schedule-ii

### Approach 1: DFS post-order, reversed
**The idea:** in DFS, a course finishes only after every course that depends on it has finished. Reversing the finish order gives a valid order.

```cpp
class Solution {
public:
    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
        adj.assign(numCourses, {});
        for (const vector<int>& e : prerequisites) {
            adj[e[1]].push_back(e[0]);
        }
        state.assign(numCourses, 0);
        finished.clear();
        for (int i = 0; i < numCourses; i++) {
            if (state[i] == 0 && hasCycle(i)) {
                return {};
            }
        }
        reverse(finished.begin(), finished.end());
        return finished;
    }

private:
    vector<vector<int>> adj;
    vector<int> state;          // 0 new, 1 on path, 2 done
    vector<int> finished;       // courses in the order their DFS finished

    bool hasCycle(int u) {
        state[u] = 1;
        for (int v : adj[u]) {
            if (state[v] == 1) {
                return true;
            }
            if (state[v] == 0 && hasCycle(v)) {
                return true;
            }
        }
        state[u] = 2;
        finished.push_back(u);   // everything u unlocks has already finished
        return false;
    }
};
```

**How it works:** if `b → a`, then `a` finishes before `b`, so after reversing, `b` comes before `a`.

**Think of it like this:** listing tasks in the order you *complete* them when you always do dependent work first, then reading the list backwards.

**Cost:** Time **O(V + E)**. Space **O(V + E)**.

### Approach 2: Kahn with a min-heap (smallest valid order)
**The idea:** same as Kahn's algorithm, but always take the lowest-numbered available course — useful when an interviewer wants a deterministic order.

```cpp
class Solution {
public:
    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> adj(numCourses);
        vector<int> indeg(numCourses, 0);
        for (const vector<int>& e : prerequisites) {
            adj[e[1]].push_back(e[0]);
            indeg[e[0]]++;
        }

        priority_queue<int, vector<int>, greater<int>> available;   // smallest first
        for (int i = 0; i < numCourses; i++) {
            if (indeg[i] == 0) {
                available.push(i);
            }
        }

        vector<int> order;
        while (!available.empty()) {
            int u = available.top();
            available.pop();
            order.push_back(u);
            for (int v : adj[u]) {
                indeg[v]--;
                if (indeg[v] == 0) {
                    available.push(v);
                }
            }
        }
        if ((int)order.size() != numCourses) {
            return {};
        }
        return order;
    }
};
```

**How it works:** any rule for choosing among available courses gives a valid order; a min-heap gives the lexicographically smallest.

**Think of it like this:** among all courses you can take now, always pick the lowest course number.

**Cost:** Time **O((V + E) log V)**. Space **O(V + E)**.

### Optimal: Kahn's algorithm, recording the order
**The idea:** exactly Course Schedule's BFS; the order in which courses leave the queue is a valid schedule.

```cpp
class Solution {
public:
    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> adj(numCourses);
        vector<int> indeg(numCourses, 0);
        for (const vector<int>& e : prerequisites) {
            adj[e[1]].push_back(e[0]);         // e[1] unlocks e[0]
            indeg[e[0]]++;
        }

        queue<int> q;
        for (int i = 0; i < numCourses; i++) {
            if (indeg[i] == 0) {
                q.push(i);
            }
        }

        vector<int> order;
        while (!q.empty()) {
            int u = q.front();
            q.pop();
            order.push_back(u);                // all of u's prerequisites are already in order
            for (int v : adj[u]) {
                indeg[v]--;
                if (indeg[v] == 0) {
                    q.push(v);
                }
            }
        }

        // Fewer than numCourses → a cycle blocked some courses.
        if ((int)order.size() != numCourses) {
            order.clear();
        }
        return order;
    }
};
```

**How it works**
1. Kahn's algorithm as in Course Schedule.
2. Append each popped course to `order`.
3. If not every course was popped, return `[]`.

**Think of it like this:** printing your semester plan as you go.

**Why it's optimal:** linear time, iterative, and cycle detection comes for free.

**Cost:** Time **O(V + E)**. Space **O(V + E)**.

## graph-valid-tree

### Approach 1: DFS — no cycle and everything connected
**The idea:** DFS from node 0, remembering the parent. Meeting a visited node that isn't your parent means a cycle. Afterwards, every node must have been visited.

```cpp
class Solution {
public:
    bool validTree(int n, vector<vector<int>>& edges) {
        adj.assign(n, {});
        for (const vector<int>& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        visited.assign(n, false);
        if (hasCycle(0, -1)) {
            return false;
        }
        for (bool v : visited) {
            if (!v) {
                return false;                     // not connected
            }
        }
        return true;
    }

private:
    vector<vector<int>> adj;
    vector<bool> visited;

    bool hasCycle(int u, int parent) {
        visited[u] = true;
        for (int v : adj[u]) {
            if (v == parent) {
                continue;                         // the edge we came in on
            }
            if (visited[v]) {
                return true;                      // reached an old node another way
            }
            if (hasCycle(v, u)) {
                return true;
            }
        }
        return false;
    }
};
```

**How it works:** checks both tree properties directly.

**Think of it like this:** walking a network of paths; if you ever reach a place you've already been (other than by turning back), there's a loop.

**Cost:** Time **O(V + E)**. Space **O(V + E)**.

### Approach 2: Edge count + BFS connectivity
**The idea:** a graph with n nodes is a tree ⇔ it has exactly n − 1 edges **and** is connected.

```cpp
class Solution {
public:
    bool validTree(int n, vector<vector<int>>& edges) {
        if ((int)edges.size() != n - 1) {
            return false;
        }
        vector<vector<int>> adj(n);
        for (const vector<int>& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<bool> seen(n, false);
        queue<int> q;
        q.push(0);
        seen[0] = true;
        int reached = 1;
        while (!q.empty()) {
            int u = q.front();
            q.pop();
            for (int v : adj[u]) {
                if (!seen[v]) {
                    seen[v] = true;
                    reached++;
                    q.push(v);
                }
            }
        }
        return reached == n;
    }
};
```

**How it works:** with exactly n − 1 edges, "connected" implies "no cycle".

**Think of it like this:** n towns need at least n − 1 roads to be connected; with exactly that many, there's no spare road to form a loop.

**Cost:** Time **O(V + E)**. Space **O(V + E)**.

### Optimal: Edge count + Union-Find
**The idea:** check the edge count, then add edges one by one; if an edge joins two nodes already in the same group, it creates a cycle.

```cpp
class Solution {
public:
    bool validTree(int n, vector<vector<int>>& edges) {
        // A tree on n nodes has exactly n - 1 edges.
        if ((int)edges.size() != n - 1) {
            return false;
        }

        parent.resize(n);
        for (int i = 0; i < n; i++) {
            parent[i] = i;                    // every node starts in its own group
        }

        for (const vector<int>& e : edges) {
            int a = find(e[0]);
            int b = find(e[1]);
            if (a == b) {
                return false;                 // already connected → this edge closes a cycle
            }
            parent[a] = b;                    // merge the two groups
        }
        // n - 1 edges and no cycle → connected.
        return true;
    }

private:
    vector<int> parent;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];    // path halving
            x = parent[x];
        }
        return x;
    }
};
```

**How it works**
1. Wrong edge count → not a tree.
2. Union-find: an edge inside one group → cycle → false.
3. Otherwise it's a tree.

**Think of it like this:** building roads between towns; if a new road connects two towns that could already reach each other, it's a redundant loop.

**Why it's optimal:** near-linear time, no adjacency list needed.

**Cost:** Time **O(E · α(n))**. Space **O(n)**.

## number-of-connected-components-in-an-undirected-graph

### Approach 1: DFS — count how many times you start a new search
**The idea:** every DFS started from an unvisited node discovers one whole component.

```cpp
class Solution {
public:
    int countComponents(int n, vector<vector<int>>& edges) {
        adj.assign(n, {});
        for (const vector<int>& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        visited.assign(n, false);
        int comps = 0;
        for (int i = 0; i < n; i++) {
            if (!visited[i]) {
                comps++;                 // a node no previous search reached
                dfs(i);
            }
        }
        return comps;
    }

private:
    vector<vector<int>> adj;
    vector<bool> visited;

    void dfs(int u) {
        visited[u] = true;
        for (int v : adj[u]) {
            if (!visited[v]) {
                dfs(v);
            }
        }
    }
};
```

**How it works:** same as counting islands, on a general graph.

**Think of it like this:** counting friend groups by asking one person to gather everyone they're connected to.

**Cost:** Time **O(V + E)**. Space **O(V + E)**.

### Approach 2: Union by size (full DSU class)
**The idea:** a reusable Disjoint Set Union with union by size and path compression.

```cpp
class DSU {
public:
    explicit DSU(int n) {
        parent.resize(n);
        size.assign(n, 1);
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }
    }

    int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);       // path compression
        }
        return parent[x];
    }

    // Returns true if a and b were in different sets.
    bool unite(int a, int b) {
        int ra = find(a);
        int rb = find(b);
        if (ra == rb) {
            return false;
        }
        if (size[ra] < size[rb]) {
            swap(ra, rb);                      // attach the smaller tree under the bigger
        }
        parent[rb] = ra;
        size[ra] += size[rb];
        return true;
    }

private:
    vector<int> parent;
    vector<int> size;
};

class Solution {
public:
    int countComponents(int n, vector<vector<int>>& edges) {
        DSU dsu(n);
        int comps = n;
        for (const vector<int>& e : edges) {
            if (dsu.unite(e[0], e[1])) {
                comps--;
            }
        }
        return comps;
    }
};
```

**How it works:** union by size keeps trees shallow; together with path compression, operations are almost O(1).

**Think of it like this:** when two clubs merge, the smaller club joins the bigger one, so the chain of command stays short.

**Cost:** Time **O(E · α(n))**. Space **O(n)**.

### Optimal: Union-Find counting merges
**The idea:** start with n components; every edge that connects two different groups merges them → one fewer component.

```cpp
class Solution {
public:
    int countComponents(int n, vector<vector<int>>& edges) {
        parent.resize(n);
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }

        int comps = n;                         // every node alone at first
        for (const vector<int>& e : edges) {
            int a = find(e[0]);
            int b = find(e[1]);
            if (a != b) {
                parent[a] = b;                 // merge two components
                comps--;
            }
            // a == b: the edge is inside one component, nothing changes.
        }
        return comps;
    }

private:
    vector<int> parent;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];     // path halving
            x = parent[x];
        }
        return x;
    }
};
```

**How it works**
1. `comps = n`.
2. For each edge, find both roots; if different, merge and decrement.

**Think of it like this:** n islands; every bridge between two separate islands reduces the number of separate land masses by one.

**Why it's optimal:** no adjacency list, near-linear, and very little code.

**Cost:** Time **O(E · α(n))**. Space **O(n)**.

## redundant-connection

### Approach 1: Before adding each edge, check with DFS
**The idea:** for each edge (u, v), if v is already reachable from u, this edge creates a cycle.

```cpp
class Solution {
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        adj.assign(n + 1, {});
        for (const vector<int>& e : edges) {
            seen.assign(n + 1, false);
            if (reachable(e[0], e[1])) {
                return e;                      // already connected → redundant
            }
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        return {};
    }

private:
    vector<vector<int>> adj;
    vector<bool> seen;

    bool reachable(int from, int to) {
        if (from == to) {
            return true;
        }
        seen[from] = true;
        for (int next : adj[from]) {
            if (!seen[next] && reachable(next, to)) {
                return true;
            }
        }
        return false;
    }
};
```

**How it works:** the first edge whose endpoints are already connected is the answer.

**Think of it like this:** before building each new road, check whether you can already drive between the two towns.

**Cost:** Time **O(n²)**. Space **O(n)**.

### Approach 2: Find the cycle, return its last edge in input order
**The idea:** a tree plus one edge has exactly one cycle. Peel off leaves (degree 1) repeatedly; the nodes left over form the cycle. Return the last input edge with both ends on the cycle.

```cpp
class Solution {
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        vector<vector<int>> adj(n + 1);
        vector<int> degree(n + 1, 0);
        for (const vector<int>& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
            degree[e[0]]++;
            degree[e[1]]++;
        }

        // Repeatedly remove leaves; whatever remains is the cycle.
        queue<int> leaves;
        for (int i = 1; i <= n; i++) {
            if (degree[i] == 1) {
                leaves.push(i);
            }
        }
        while (!leaves.empty()) {
            int u = leaves.front();
            leaves.pop();
            degree[u] = 0;                      // removed
            for (int v : adj[u]) {
                if (degree[v] > 0) {
                    degree[v]--;
                    if (degree[v] == 1) {
                        leaves.push(v);
                    }
                }
            }
        }

        // The answer is the last edge (in input order) whose ends are both on the cycle.
        for (int i = n - 1; i >= 0; i--) {
            if (degree[edges[i][0]] > 0 && degree[edges[i][1]] > 0) {
                return edges[i];
            }
        }
        return {};
    }
};
```

**How it works:** removing any one cycle edge leaves a tree; the problem asks for the one appearing last.

**Think of it like this:** trimming dangling branches off a plant until only the loop of vine remains.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Union-Find — first edge inside an existing group
**The idea:** add edges in order; the first edge whose endpoints already share a root closes the cycle.

```cpp
class Solution {
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        parent.resize(n + 1);
        for (int i = 0; i <= n; i++) {
            parent[i] = i;                  // nodes are numbered 1..n
        }

        for (const vector<int>& e : edges) {
            int a = find(e[0]);
            int b = find(e[1]);
            if (a == b) {
                return e;                   // u and v already connected → this edge makes a cycle
            }
            parent[a] = b;                  // join the two groups
        }
        return {};
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

**How it works**
1. Union-find over nodes `1..n`.
2. If `find(u) == find(v)`, return this edge.
3. Otherwise merge.

**Think of it like this:** connecting towns with roads in the order given; the first road between towns that are already connected is the extra one.

**Why it's optimal:** one pass over the edges with near-O(1) work each.

**Cost:** Time **O(n · α(n))**. Space **O(n)**.

## word-ladder

### Approach 1: BFS comparing against every word
**The idea:** BFS over words; to find neighbours, compare the current word with every dictionary word and keep those differing by exactly one letter.

```cpp
class Solution {
public:
    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
        int n = wordList.size();
        vector<bool> used(n, false);
        queue<string> q;
        q.push(beginWord);
        int steps = 1;

        while (!q.empty()) {
            int levelSize = q.size();
            for (int i = 0; i < levelSize; i++) {
                string word = q.front();
                q.pop();
                if (word == endWord) {
                    return steps;
                }
                for (int j = 0; j < n; j++) {
                    if (!used[j] && oneLetterApart(word, wordList[j])) {
                        used[j] = true;
                        q.push(wordList[j]);
                    }
                }
            }
            steps++;
        }
        return 0;
    }

private:
    bool oneLetterApart(const string& a, const string& b) {
        int diff = 0;
        for (size_t i = 0; i < a.size(); i++) {
            if (a[i] != b[i]) {
                diff++;
                if (diff > 1) {
                    return false;
                }
            }
        }
        return diff == 1;
    }
};
```

**How it works:** fine for short word lists; slow for long ones.

**Think of it like this:** for each word, reading through the whole dictionary to find its one-letter cousins.

**Cost:** Time **O(N² · L)**. Space **O(N)**.

### Approach 2: Bidirectional BFS
**The idea:** search from both ends at once, always expanding the smaller frontier; stop when they meet.

```cpp
class Solution {
public:
    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
        unordered_set<string> dict(wordList.begin(), wordList.end());
        if (dict.count(endWord) == 0) {
            return 0;
        }
        unordered_set<string> front = {beginWord};
        unordered_set<string> back = {endWord};
        dict.erase(beginWord);
        dict.erase(endWord);
        int steps = 1;

        while (!front.empty() && !back.empty()) {
            if (front.size() > back.size()) {
                swap(front, back);                  // always grow the smaller side
            }
            unordered_set<string> next;
            for (string word : front) {
                for (size_t i = 0; i < word.size(); i++) {
                    char original = word[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == original) {
                            continue;
                        }
                        word[i] = c;
                        if (back.count(word) > 0) {
                            return steps + 1;       // the two searches met
                        }
                        if (dict.count(word) > 0) {
                            dict.erase(word);
                            next.insert(word);
                        }
                    }
                    word[i] = original;
                }
            }
            front = next;
            steps++;
        }
        return 0;
    }
};
```

**How it works:** two searches of depth d/2 explore far fewer words than one of depth d.

**Think of it like this:** two people digging a tunnel from opposite sides of a mountain.

**Cost:** Time much faster in practice; same worst case **O(N · L · 26)**. Space **O(N)**.

### Optimal: BFS generating neighbours by changing one letter
**The idea:** words are nodes; words one letter apart are connected. The shortest ladder is a BFS shortest path. Find neighbours by trying all 26 letters at each position.

```cpp
class Solution {
public:
    int ladderLength(string begin, string end, vector<string>& wordList) {
        unordered_set<string> dict(wordList.begin(), wordList.end());
        if (dict.count(end) == 0) {
            return 0;                            // end isn't reachable at all
        }

        queue<string> q;
        q.push(begin);
        dict.erase(begin);
        int steps = 1;                           // words in the ladder so far

        while (!q.empty()) {
            int levelSize = q.size();
            for (int i = 0; i < levelSize; i++) {
                string w = q.front();
                q.pop();
                if (w == end) {
                    return steps;
                }
                // Try every one-letter change of w.
                for (size_t pos = 0; pos < w.size(); pos++) {
                    char orig = w[pos];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == orig) {
                            continue;
                        }
                        w[pos] = c;
                        if (dict.count(w) > 0) {
                            q.push(w);
                            dict.erase(w);       // mark visited: never enqueue it again
                        }
                    }
                    w[pos] = orig;               // restore before changing the next position
                }
            }
            steps++;
        }
        return 0;
    }
};
```

**How it works**
1. Put the words in a hash set.
2. BFS level by level from `begin`; `steps` counts words in the sequence.
3. For each word, try all 26 letters at each position.
4. A neighbour in the set is enqueued and erased (visited).
5. Reaching `end` returns `steps`.

**Think of it like this:** the game where you change CAT → COT → DOT → DOG, exploring all one-letter changes before trying two-letter paths.

**Why it's optimal:** neighbour generation costs O(26 · L) instead of comparing with all N words.

**Cost:** Time **O(N · L² · 26)** (L for building/hashing each candidate string). Space **O(N · L)**.
