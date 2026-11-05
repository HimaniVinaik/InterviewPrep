## invert-binary-tree

### Approach 1: Iterative BFS with a queue
```cpp
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            TreeNode* n = q.front(); q.pop();
            swap(n->left, n->right);
            if (n->left) q.push(n->left);
            if (n->right) q.push(n->right);
        }
        return root;
    }
};
```

**Time:** O(n) · **Space:** O(width). No recursion — safe for very deep (skewed) trees.

### Approach 2: Iterative DFS with an explicit stack
```cpp
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        vector<TreeNode*> st;
        if (root) st.push_back(root);
        while (!st.empty()) {
            TreeNode* n = st.back(); st.pop_back();
            swap(n->left, n->right);
            if (n->left) st.push_back(n->left);
            if (n->right) st.push_back(n->right);
        }
        return root;
    }
};
```

**Time:** O(n) · **Space:** O(h).

### Walkthrough
**Goal:** mirror the tree — every node's left and right children swap.

1. Base case: null → nothing to do.
2. Swap `root->left` and `root->right` (just two pointers).
3. Recursively invert both subtrees (now in their new positions — order doesn't matter).
4. Return `root` (unchanged identity, new structure).

**Dry run** on `4(2(1,3), 7(6,9))`:

| visit | before swap | after swap |
|---|---|---|
| 4 | L=2, R=7 | L=7, R=2 |
| 7 | L=6, R=9 | L=9, R=6 |
| 2 | L=1, R=3 | L=3, R=1 |
| leaves | — | — |

Result `4(7(9,6), 2(3,1))`. Each node is visited once → O(n).

## maximum-depth-of-binary-tree

### Approach 1: BFS counting levels
```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (!root) return 0;
        queue<TreeNode*> q; q.push(root);
        int depth = 0;
        while (!q.empty()) {
            ++depth;
            for (int sz = q.size(); sz > 0; --sz) {
                TreeNode* n = q.front(); q.pop();
                if (n->left) q.push(n->left);
                if (n->right) q.push(n->right);
            }
        }
        return depth;
    }
};
```

**Time:** O(n) · **Space:** O(width).

### Approach 2: Iterative DFS with (node, depth) pairs
```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        int best = 0;
        vector<pair<TreeNode*, int>> st;
        if (root) st.push_back({root, 1});
        while (!st.empty()) {
            auto [n, d] = st.back(); st.pop_back();
            best = max(best, d);
            if (n->left) st.push_back({n->left, d + 1});
            if (n->right) st.push_back({n->right, d + 1});
        }
        return best;
    }
};
```

**Time:** O(n) · **Space:** O(h).

### Walkthrough
**Goal:** number of nodes on the longest root-to-leaf path.

1. Empty tree has depth 0.
2. A node's depth = 1 (itself) + the deeper of its two subtrees.
3. Post-order: compute children first, then combine.

**Dry run** `3(9, 20(15, 7))`:

| node | left depth | right depth | returns |
|---|---|---|---|
| 9 | 0 | 0 | 1 |
| 15 | 0 | 0 | 1 |
| 7 | 0 | 0 | 1 |
| 20 | 1 | 1 | 2 |
| 3 | 1 | 2 | **3** |

## diameter-of-binary-tree

### Approach 1: Brute force — height at every node
```cpp
class Solution {
    int height(TreeNode* n) { return n ? 1 + max(height(n->left), height(n->right)) : 0; }
public:
    int diameterOfBinaryTree(TreeNode* root) {
        if (!root) return 0;
        int through = height(root->left) + height(root->right);
        return max({through, diameterOfBinaryTree(root->left), diameterOfBinaryTree(root->right)});
    }
};
```

**Time:** O(n²) on skewed trees (height recomputed repeatedly) · **Space:** O(h).

### Approach 2: Iterative post-order with a height map
```cpp
class Solution {
public:
    int diameterOfBinaryTree(TreeNode* root) {
        unordered_map<TreeNode*, int> h{{nullptr, 0}};
        vector<pair<TreeNode*, bool>> st;          // (node, children done?)
        if (root) st.push_back({root, false});
        int best = 0;
        while (!st.empty()) {
            auto [n, done] = st.back(); st.pop_back();
            if (done) {
                int l = h[n->left], r = h[n->right];
                best = max(best, l + r);
                h[n] = 1 + max(l, r);
            } else {
                st.push_back({n, true});
                if (n->left) st.push_back({n->left, false});
                if (n->right) st.push_back({n->right, false});
            }
        }
        return best;
    }
};
```

**Time:** O(n) · **Space:** O(n). No recursion depth risk.

### Walkthrough
**Goal:** longest path (in edges) between any two nodes. Every path has a single highest node where it "bends".

1. Define `height(n)` = nodes on the longest downward path from `n`.
2. The longest path bending at `n` has `height(left) + height(right)` **edges**.
3. One post-order pass: compute both heights, update the global `best` with their sum, return `1 + max` to the parent.

**Dry run** `1(2(4, 5), 3)`:

| node | l | r | l + r (path through node) | returns height |
|---|---|---|---|---|
| 4 | 0 | 0 | 0 | 1 |
| 5 | 0 | 0 | 0 | 1 |
| 2 | 1 | 1 | 2 | 2 |
| 3 | 0 | 0 | 0 | 1 |
| 1 | 2 | 1 | **3** | 3 |

Diameter 3: path 4 → 2 → 1 → 3.

## balanced-binary-tree

### Approach 1: Top-down (recompute heights)
```cpp
class Solution {
    int height(TreeNode* n) { return n ? 1 + max(height(n->left), height(n->right)) : 0; }
public:
    bool isBalanced(TreeNode* root) {
        if (!root) return true;
        return abs(height(root->left) - height(root->right)) <= 1
            && isBalanced(root->left) && isBalanced(root->right);
    }
};
```

**Time:** O(n log n) balanced, O(n²) skewed · **Space:** O(h).

### Approach 2: Return a pair (balanced?, height)
```cpp
class Solution {
    pair<bool, int> check(TreeNode* n) {
        if (!n) return {true, 0};
        auto [lb, lh] = check(n->left);
        auto [rb, rh] = check(n->right);
        return {lb && rb && abs(lh - rh) <= 1, 1 + max(lh, rh)};
    }
public:
    bool isBalanced(TreeNode* root) { return check(root).first; }
};
```

**Time:** O(n) · **Space:** O(h). More explicit than the −1 sentinel trick (but doesn't short-circuit).

### Walkthrough
**Goal:** check `|height(left) − height(right)| ≤ 1` at **every** node in one pass.

1. `h(n)` returns the height, or **−1** meaning "some subtree below is unbalanced".
2. Compute the left height; if −1, propagate immediately (short-circuit — skips the right subtree).
3. Same for the right.
4. If the difference > 1 → −1; otherwise `1 + max(l, r)`.
5. Balanced ⇔ `h(root) ≥ 0`.

**Dry run** `1(2(3(4), ·), 2)` (left-heavy chain):

| node | l | r | diff | returns |
|---|---|---|---|---|
| 4 | 0 | 0 | 0 | 1 |
| 3 | 1 | 0 | 1 | 2 |
| left 2 | 2 | 0 | **2** | −1 |
| 1 | −1 | (skipped) | — | −1 → **not balanced** |

## same-tree

### Approach 1: Iterative BFS comparing pairs
```cpp
class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        queue<pair<TreeNode*, TreeNode*>> qu;
        qu.push({p, q});
        while (!qu.empty()) {
            auto [a, b] = qu.front(); qu.pop();
            if (!a && !b) continue;
            if (!a || !b || a->val != b->val) return false;
            qu.push({a->left, b->left});
            qu.push({a->right, b->right});
        }
        return true;
    }
};
```

**Time:** O(n) · **Space:** O(width).

### Approach 2: Compare serialisations
```cpp
class Solution {
    void ser(TreeNode* n, string& s) {
        if (!n) { s += "#,"; return; }
        s += to_string(n->val) + ',';
        ser(n->left, s); ser(n->right, s);
    }
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        string a, b; ser(p, a); ser(q, b);
        return a == b;                 // null markers make preorder unambiguous
    }
};
```

**Time:** O(n) · **Space:** O(n). Useful idea for Subtree of Another Tree.

### Walkthrough
**Goal:** structure and values identical.

1. Both null → identical (true).
2. Exactly one null → structure differs (false). `if (!p || !q) return p == q;` covers both cases in one line.
3. Values differ → false.
4. Otherwise both left subtrees and both right subtrees must be the same (`&&` short-circuits on the first difference).

**Dry run** `p = 1(2, ·)`, `q = 1(·, 2)`:

| compare | result |
|---|---|
| (1, 1) | values equal → check children |
| (2, null) | one null → **false** |

## subtree-of-another-tree

### Approach 1: Serialise both, substring search
```cpp
class Solution {
    void ser(TreeNode* n, string& s) {
        if (!n) { s += ",#"; return; }
        s += ',' + to_string(n->val);              // leading comma: "2" must not match "12"
        ser(n->left, s); ser(n->right, s);
    }
public:
    bool isSubtree(TreeNode* root, TreeNode* sub) {
        string a, b; ser(root, a); ser(sub, b);
        return a.find(b) != string::npos;          // use KMP for guaranteed O(m + n)
    }
};
```

**Time:** O(m + n) with KMP (`std::string::find` is typically fine) · **Space:** O(m + n).

### Approach 2: Merkle hashing
```cpp
class Solution {
    unordered_set<size_t> rootHashes;
    size_t h(TreeNode* n, bool collect) {
        if (!n) return 0x9e3779b97f4a7c15ull;
        size_t l = h(n->left, collect), r = h(n->right, collect);
        size_t v = std::hash<long long>{}(n->val) ^ (l * 31 + 0x632be5ab) ^ (r * 1000003 + 0x5bd1e995);
        if (collect) rootHashes.insert(v);
        return v;
    }
public:
    bool isSubtree(TreeNode* root, TreeNode* sub) {
        h(root, true);
        return rootHashes.count(h(sub, false)) > 0;   // verify with sameTree to rule out collisions
    }
};
```

**Time:** O(m + n) · **Space:** O(m). How git and blockchains detect identical subtrees; collisions are possible, so a real implementation confirms with a structural comparison.

### Walkthrough
**Goal:** does some node of `root` start a subtree identical to `sub`?

1. If `root` is null, `sub` (non-empty) can't be inside → false.
2. Check `sameTree(root, sub)` at the current node.
3. Otherwise recurse into `root->left` and `root->right`.

**Dry run** `root = 3(4(1,2), 5)`, `sub = 4(1,2)`:

| root node | sameTree? |
|---|---|
| 3 | 3 ≠ 4 → no |
| 4 | 4=4, 1=1, 2=2 → **yes** |

Worst case (e.g. all nodes equal value) compares O(n) nodes at each of m positions → O(m·n).

## lowest-common-ancestor-of-a-binary-search-tree

### Approach 1: Recursive BST walk
```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        if (p->val < root->val && q->val < root->val) return lowestCommonAncestor(root->left, p, q);
        if (p->val > root->val && q->val > root->val) return lowestCommonAncestor(root->right, p, q);
        return root;
    }
};
```

**Time:** O(h) · **Space:** O(h).

### Approach 2: General binary-tree LCA (ignores BST ordering)
```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        if (!root || root == p || root == q) return root;
        TreeNode* l = lowestCommonAncestor(root->left, p, q);
        TreeNode* r = lowestCommonAncestor(root->right, p, q);
        if (l && r) return root;         // p and q found on different sides
        return l ? l : r;
    }
};
```

**Time:** O(n) · **Space:** O(h). This is LC 236 — know both.

### Walkthrough
**Goal:** first node (from the root down) where `p` and `q` split to different sides.

1. If both values are smaller than `root`, both are in the left subtree → go left.
2. If both are larger → go right.
3. Otherwise they are on different sides (or one equals `root`) → `root` is the LCA.

**Dry run** BST `6(2(0, 4(3,5)), 8(7,9))`, `p = 3`, `q = 5`:

| node | p, q vs node | move |
|---|---|---|
| 6 | both < 6 | left |
| 2 | both > 2 | right |
| 4 | 3 < 4 < 5 | **LCA = 4** |

## binary-tree-level-order-traversal

### Approach 1: DFS with a depth parameter
```cpp
class Solution {
    vector<vector<int>> res;
    void dfs(TreeNode* n, int d) {
        if (!n) return;
        if (d == (int)res.size()) res.emplace_back();     // first node at this depth
        res[d].push_back(n->val);
        dfs(n->left, d + 1);                              // left before right keeps order
        dfs(n->right, d + 1);
    }
public:
    vector<vector<int>> levelOrder(TreeNode* root) { dfs(root, 0); return res; }
};
```

**Time:** O(n) · **Space:** O(h). Pre-order DFS still yields correct left-to-right order within each level.

### Approach 2: Two vectors (current / next level)
```cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> res;
        vector<TreeNode*> cur;
        if (root) cur.push_back(root);
        while (!cur.empty()) {
            vector<TreeNode*> next;
            auto& level = res.emplace_back();
            for (auto* n : cur) {
                level.push_back(n->val);
                if (n->left) next.push_back(n->left);
                if (n->right) next.push_back(n->right);
            }
            cur = std::move(next);
        }
        return res;
    }
};
```

**Time:** O(n) · **Space:** O(width). No queue bookkeeping.

### Walkthrough
**Goal:** group values by depth, left to right.

1. Queue starts with the root.
2. At the start of each loop iteration, `q.size()` = number of nodes on the current level (we haven't pushed any children yet).
3. Pop exactly that many nodes, record their values, push their children (which belong to the next level).
4. Repeat until the queue is empty.

**Dry run** `3(9, 20(15, 7))`:

| level | queue at start | popped | pushed | level values |
|---|---|---|---|---|
| 0 | [3] | 3 | 9, 20 | [3] |
| 1 | [9, 20] | 9, 20 | 15, 7 | [9, 20] |
| 2 | [15, 7] | 15, 7 | — | [15, 7] |

## binary-tree-right-side-view

### Approach 1: BFS — last node of each level
```cpp
class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> res;
        if (!root) return res;
        queue<TreeNode*> q; q.push(root);
        while (!q.empty()) {
            int sz = q.size();
            for (int i = 0; i < sz; ++i) {
                TreeNode* n = q.front(); q.pop();
                if (i == sz - 1) res.push_back(n->val);   // rightmost of this level
                if (n->left) q.push(n->left);
                if (n->right) q.push(n->right);
            }
        }
        return res;
    }
};
```

**Time:** O(n) · **Space:** O(width).

### Approach 2: Level-order, then take back of each level
```cpp
class Solution {
    void dfs(TreeNode* n, int d, vector<vector<int>>& lv) {
        if (!n) return;
        if (d == (int)lv.size()) lv.emplace_back();
        lv[d].push_back(n->val);
        dfs(n->left, d + 1, lv); dfs(n->right, d + 1, lv);
    }
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<vector<int>> lv; dfs(root, 0, lv);
        vector<int> res;
        for (auto& l : lv) res.push_back(l.back());
        return res;
    }
};
```

**Time:** O(n) · **Space:** O(n). Reuses level order directly — shows problem reduction.

### Walkthrough
**Goal:** the rightmost node at each depth.

1. DFS visiting **right child before left**.
2. Track `depth`. The first node we ever reach at a new depth (`depth == res.size()`) is the rightmost one at that depth, because we always explore right first.
3. Record it; continue.

**Dry run** `1(2(·, 5), 3(·, 4))`:

| visit | depth | res.size() | record? | res |
|---|---|---|---|---|
| 1 | 0 | 0 | yes | [1] |
| 3 | 1 | 1 | yes | [1,3] |
| 4 | 2 | 2 | yes | [1,3,4] |
| 2 | 1 | 3 | no | |
| 5 | 2 | 3 | no | |

**Trap:** "just walk right pointers" fails — in `1(2(4), 3)`, node 4 is visible from the right at depth 2 even though it's on the left side.

## count-good-nodes-in-binary-tree

### Approach 1: BFS carrying the path max
```cpp
class Solution {
public:
    int goodNodes(TreeNode* root) {
        int good = 0;
        queue<pair<TreeNode*, int>> q;
        q.push({root, INT_MIN});
        while (!q.empty()) {
            auto [n, mx] = q.front(); q.pop();
            if (n->val >= mx) ++good;
            int nm = max(mx, n->val);
            if (n->left) q.push({n->left, nm});
            if (n->right) q.push({n->right, nm});
        }
        return good;
    }
};
```

**Time:** O(n) · **Space:** O(width).

### Approach 2: DFS with an explicit path stack (brute-force check)
```cpp
class Solution {
    vector<int> path;
    int dfs(TreeNode* n) {
        if (!n) return 0;
        bool good = ranges::all_of(path, [&](int v) { return v <= n->val; });   // check whole path
        path.push_back(n->val);
        int c = good + dfs(n->left) + dfs(n->right);
        path.pop_back();
        return c;
    }
public:
    int goodNodes(TreeNode* root) { return dfs(root); }
};
```

**Time:** O(n·h) · **Space:** O(h). Shows why carrying just the max is the key insight.

### Walkthrough
**Goal:** count nodes that are ≥ every ancestor on their root path.

1. Pass `mx` = maximum value on the path from the root to the parent (start with `INT_MIN`).
2. Node is good if `val ≥ mx`.
3. Children receive `max(mx, val)`.
4. Sum the counts from both subtrees.

**Dry run** `3(1(3), 4(1, 5))`:

| node | mx passed in | good? | mx for children |
|---|---|---|---|
| 3 | −∞ | yes | 3 |
| 1 | 3 | no | 3 |
| 3 (leaf) | 3 | yes | 3 |
| 4 | 3 | yes | 4 |
| 1 | 4 | no | 4 |
| 5 | 4 | yes | 5 |

Answer **4**.

## validate-binary-search-tree

### Approach 1: In-order traversal must be strictly increasing
```cpp
class Solution {
    TreeNode* prev = nullptr;
public:
    bool isValidBST(TreeNode* root) {
        if (!root) return true;
        if (!isValidBST(root->left)) return false;
        if (prev && prev->val >= root->val) return false;   // must strictly increase
        prev = root;
        return isValidBST(root->right);
    }
};
```

**Time:** O(n) · **Space:** O(h). Elegant and handles `INT_MIN/INT_MAX` without wider types.

### Approach 2: Iterative in-order
```cpp
class Solution {
public:
    bool isValidBST(TreeNode* root) {
        vector<TreeNode*> st;
        TreeNode *cur = root, *prev = nullptr;
        while (cur || !st.empty()) {
            while (cur) { st.push_back(cur); cur = cur->left; }
            cur = st.back(); st.pop_back();
            if (prev && prev->val >= cur->val) return false;
            prev = cur;
            cur = cur->right;
        }
        return true;
    }
};
```

**Time:** O(n) · **Space:** O(h).

### Walkthrough
**Goal:** every node must lie strictly between bounds inherited from **all** ancestors — not just its parent.

1. Call `ok(node, lo, hi)` meaning `lo < node->val < hi`. Start with (−∞, +∞) using `long long` limits.
2. Going **left** tightens the upper bound to the current value; going **right** tightens the lower bound.
3. Any violation → false.

**Classic trap** `5(4, 6(3, 7))`: each parent–child pair looks fine (3 < 6), but 3 is in 5's **right** subtree.

| node | lo | hi | valid? |
|---|---|---|---|
| 5 | −∞ | +∞ | yes |
| 4 | −∞ | 5 | yes |
| 6 | 5 | +∞ | yes |
| 3 | 5 | 6 | **3 ≤ 5 → false** |

## kth-smallest-element-in-a-bst

### Approach 1: Full in-order into a vector
```cpp
class Solution {
    void inorder(TreeNode* n, vector<int>& v) {
        if (!n) return;
        inorder(n->left, v); v.push_back(n->val); inorder(n->right, v);
    }
public:
    int kthSmallest(TreeNode* root, int k) {
        vector<int> v; inorder(root, v);
        return v[k - 1];
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Approach 2: Recursive in-order with early stop
```cpp
class Solution {
    int k, ans = -1;
    void dfs(TreeNode* n) {
        if (!n || ans != -1) return;          // stop once found
        dfs(n->left);
        if (--k == 0) { ans = n->val; return; }
        dfs(n->right);
    }
public:
    int kthSmallest(TreeNode* root, int K) { k = K; dfs(root); return ans; }
};
```

**Time:** O(h + k) · **Space:** O(h). (Assumes values aren't −1 as a sentinel; use `optional` otherwise.)

### Walkthrough
**Goal:** visit BST nodes in sorted order and stop at the k-th.

1. Iterative in-order: push the path to the leftmost node (the smallest).
2. Pop a node → it's the next smallest. Decrement k; if 0, return it.
3. Move to its right child, and again push its leftmost path.

**Dry run** BST `5(3(2(1), 4), 6)`, `k = 3`:

| action | stack (bottom→top) | popped | k after |
|---|---|---|---|
| push left path | 5,3,2,1 | | 3 |
| pop | 5,3,2 | 1 | 2 |
| pop | 5,3 | 2 | 1 |
| pop | 5 | 3 | **0 → return 3** |

**Follow-up (frequent queries with inserts):** store subtree sizes in each node → O(h) per query by choosing left/right by size.

## construct-binary-tree-from-preorder-and-inorder-traversal

### Approach 1: Recursive with linear search (no hash map)
```cpp
class Solution {
    TreeNode* build(vector<int>& pre, int ps, vector<int>& in, int is, int len) {
        if (len == 0) return nullptr;
        int rootVal = pre[ps];
        int k = find(in.begin() + is, in.begin() + is + len, rootVal) - (in.begin() + is);  // left size
        auto* root = new TreeNode(rootVal);
        root->left = build(pre, ps + 1, in, is, k);
        root->right = build(pre, ps + 1 + k, in, is + k + 1, len - k - 1);
        return root;
    }
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        return build(preorder, 0, inorder, 0, preorder.size());
    }
};
```

**Time:** O(n²) worst (skewed) · **Space:** O(h). Makes the sub-range arithmetic explicit.

### Approach 2: Iterative with a stack
```cpp
class Solution {
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        if (preorder.empty()) return nullptr;
        auto* root = new TreeNode(preorder[0]);
        vector<TreeNode*> st{root};
        size_t in = 0;
        for (size_t i = 1; i < preorder.size(); ++i) {
            TreeNode* node = st.back();
            if (node->val != inorder[in]) {                 // still going left
                node->left = new TreeNode(preorder[i]);
                st.push_back(node->left);
            } else {                                         // climb up until in-order diverges
                while (!st.empty() && st.back()->val == inorder[in]) { node = st.back(); st.pop_back(); ++in; }
                node->right = new TreeNode(preorder[i]);
                st.push_back(node->right);
            }
        }
        return root;
    }
};
```

**Time:** O(n) · **Space:** O(h).

### Walkthrough
**Goal:** preorder says *who* the root is; inorder says *what's on each side*.

1. Build `inIdx`: value → index in inorder (O(1) lookups).
2. `pre` cursor walks preorder; each call consumes the next value as its subtree's root.
3. Find the root's index `mid` in inorder. Elements `[lo, mid−1]` form the left subtree, `[mid+1, hi]` the right.
4. Build left first (preorder lists the whole left subtree before the right), then right.
5. Empty inorder range → `nullptr`.

**Dry run** preorder `[3,9,20,15,7]`, inorder `[9,3,15,20,7]`:

| pre value | inorder range | mid | left range | right range |
|---|---|---|---|---|
| 3 | [0,4] | 1 | [0,0] | [2,4] |
| 9 | [0,0] | 0 | empty | empty |
| 20 | [2,4] | 3 | [2,2] | [4,4] |
| 15 | [2,2] | 2 | empty | empty |
| 7 | [4,4] | 4 | empty | empty |

Tree: `3(9, 20(15, 7))`.

## binary-tree-maximum-path-sum

### Approach 1: Brute force — best path through each node
```cpp
class Solution {
    int down(TreeNode* n) {                                   // best downward path from n (≥ n alone)
        if (!n) return 0;
        return n->val + max({0, down(n->left), down(n->right)});
    }
public:
    int maxPathSum(TreeNode* root) {
        if (!root) return INT_MIN;
        int through = root->val + max(0, down(root->left)) + max(0, down(root->right));
        int best = through;
        if (root->left) best = max(best, maxPathSum(root->left));
        if (root->right) best = max(best, maxPathSum(root->right));
        return best;
    }
};
```

**Time:** O(n²) skewed · **Space:** O(h).

### Approach 2: Iterative post-order
```cpp
class Solution {
public:
    int maxPathSum(TreeNode* root) {
        unordered_map<TreeNode*, int> gain{{nullptr, 0}};
        vector<pair<TreeNode*, bool>> st{{root, false}};
        int best = INT_MIN;
        while (!st.empty()) {
            auto [n, done] = st.back(); st.pop_back();
            if (!done) {
                st.push_back({n, true});
                if (n->left) st.push_back({n->left, false});
                if (n->right) st.push_back({n->right, false});
            } else {
                int l = max(0, gain[n->left]), r = max(0, gain[n->right]);
                best = max(best, n->val + l + r);
                gain[n] = n->val + max(l, r);
            }
        }
        return best;
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Walkthrough
**Goal:** maximum sum over any path (any start/end, can bend once).

1. `gain(n)` = best sum of a path that **starts at `n` and goes down** (one side only), which is what the parent can extend.
2. Ignore negative contributions: `l = max(0, gain(left))`, `r = max(0, gain(right))`.
3. The best path **bending at `n`** = `n->val + l + r` → update the global `best`.
4. Return `n->val + max(l, r)` (a parent can only continue through one side).
5. `best` starts at `INT_MIN` so an all-negative tree returns its largest single node.

**Dry run** `−10(9, 20(15, 7))`:

| node | l | r | bend sum | best | returns |
|---|---|---|---|---|---|
| 9 | 0 | 0 | 9 | 9 | 9 |
| 15 | 0 | 0 | 15 | 15 | 15 |
| 7 | 0 | 0 | 7 | 15 | 7 |
| 20 | 15 | 7 | **42** | 42 | 35 |
| −10 | 9 | 35 | 34 | 42 | 25 |

Answer **42** (15 → 20 → 7).

## serialize-and-deserialize-binary-tree

### Approach 1: Level-order (BFS) with null markers
```cpp
class Codec {
public:
    string serialize(TreeNode* root) {
        string out;
        queue<TreeNode*> q; q.push(root);
        while (!q.empty()) {
            TreeNode* n = q.front(); q.pop();
            if (!n) { out += "#,"; continue; }
            out += to_string(n->val) + ',';
            q.push(n->left); q.push(n->right);
        }
        return out;
    }
    TreeNode* deserialize(string data) {
        istringstream in(data);
        string tok;
        getline(in, tok, ',');
        if (tok == "#" || tok.empty()) return nullptr;
        auto* root = new TreeNode(stoi(tok));
        queue<TreeNode*> q; q.push(root);
        while (!q.empty()) {
            TreeNode* n = q.front(); q.pop();
            for (TreeNode** child : {&n->left, &n->right}) {
                if (!getline(in, tok, ',')) break;
                if (tok != "#") { *child = new TreeNode(stoi(tok)); q.push(*child); }
            }
        }
        return root;
    }
};
```

**Time:** O(n) · **Space:** O(n). Same format LeetCode uses to display trees.

### Approach 2: Compact binary encoding
```cpp
class Codec {
    void ser(TreeNode* n, string& out) {
        if (!n) { out += '\x00'; return; }
        out += '\x01';
        int32_t v = n->val;
        out.append(reinterpret_cast<const char*>(&v), sizeof v);   // 4 raw bytes (host endian)
        ser(n->left, out); ser(n->right, out);
    }
    TreeNode* des(const string& s, size_t& i) {
        if (s[i++] == '\x00') return nullptr;
        int32_t v; memcpy(&v, s.data() + i, sizeof v); i += sizeof v;
        auto* n = new TreeNode(v);
        n->left = des(s, i); n->right = des(s, i);
        return n;
    }
public:
    string serialize(TreeNode* root) { string s; ser(root, s); return s; }
    TreeNode* deserialize(string data) { size_t i = 0; return data.empty() ? nullptr : des(data, i); }
};
```

**Time:** O(n) · **Space:** 5 bytes per node. Discuss endianness and versioning for real wire formats.

### Walkthrough
**Goal:** a string that uniquely describes the tree, and a parser that rebuilds it.

1. **Serialize (preorder):** write the node value, then left subtree, then right subtree. Write `#` for every null pointer — the nulls are what make the shape unambiguous.
2. **Deserialize:** read tokens in the same order. `#` → return null. Number → create the node, then recursively build its left, then its right.
3. Because the reader consumes tokens exactly as the writer produced them, no indices are needed.

**Dry run** `1(2, 3(4, 5))`:

Serialized: `1,2,#,#,3,4,#,#,5,#,#,`

| token | action |
|---|---|
| 1 | node 1; build left |
| 2 | node 2; build left |
| # | 2.left = null |
| # | 2.right = null → back to 1, build right |
| 3 | node 3 |
| 4, #, # | 3.left = 4 (leaf) |
| 5, #, # | 3.right = 5 (leaf) |
