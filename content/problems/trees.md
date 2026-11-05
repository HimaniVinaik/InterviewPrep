# Trees

**Recognise it when:** input is a `TreeNode*`. Nearly every tree problem is "what does each node need from its children (post-order) or from its parent (pre-order)?"

```cpp
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};
```

**Three templates**
- **DFS returning a value** (height, sum, is-balanced): combine children results.
- **DFS with a global/answer reference**: compute something at every node (diameter, max path sum) while returning something else upward.
- **BFS by level** with a queue, processing `q.size()` nodes per level.

**BST facts:** in-order traversal is sorted; every node bounds its subtree (`lo < val < hi`).

**Recursion depth:** a skewed tree of 10⁵ nodes can overflow the call stack — mention iterative alternatives in interviews (especially embedded, with tiny stacks).

## Invert Binary Tree
- difficulty: Easy
- leetcode: 226
- slug: invert-binary-tree

Mirror a binary tree.

### Hint
Swap children, recurse.

### Solution
```cpp
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        swap(root->left, root->right);
        invertTree(root->left);
        invertTree(root->right);
        return root;
    }
};
```

### Explanation
Every node's children are swapped exactly once. Order (pre/post) doesn't matter here.

**Time:** O(n) · **Space:** O(h)

## Maximum Depth of Binary Tree
- difficulty: Easy
- leetcode: 104
- slug: maximum-depth-of-binary-tree

Return the number of nodes along the longest root-to-leaf path.

### Hint
depth(node) = 1 + max(depth(left), depth(right)).

### Solution
```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (!root) return 0;
        return 1 + max(maxDepth(root->left), maxDepth(root->right));
    }
};
```

### Explanation
Classic post-order: compute children, combine. Iterative alternative: BFS counting levels.

**Time:** O(n) · **Space:** O(h)

## Diameter of Binary Tree
- difficulty: Easy
- leetcode: 543
- slug: diameter-of-binary-tree

Return the length (in edges) of the longest path between any two nodes.

### Hint
The longest path through a node = leftHeight + rightHeight. Return height, update a global best.

### Solution
```cpp
class Solution {
    int best = 0;
    int height(TreeNode* n) {
        if (!n) return 0;
        int l = height(n->left), r = height(n->right);
        best = max(best, l + r);        // path bending at n
        return 1 + max(l, r);           // what the parent needs
    }
public:
    int diameterOfBinaryTree(TreeNode* root) { height(root); return best; }
};
```

### Explanation
The "return one thing, record another" template. The path doesn't have to pass through the root, so check every node.

**Time:** O(n) · **Space:** O(h)

## Balanced Binary Tree
- difficulty: Easy
- leetcode: 110
- slug: balanced-binary-tree

A tree is height-balanced if every node's subtrees differ in height by at most 1.

### Hint
Return height, or -1 as a sentinel for "unbalanced" to short-circuit.

### Solution
```cpp
class Solution {
    int h(TreeNode* n) {
        if (!n) return 0;
        int l = h(n->left);  if (l < 0) return -1;
        int r = h(n->right); if (r < 0) return -1;
        return abs(l - r) > 1 ? -1 : 1 + max(l, r);
    }
public:
    bool isBalanced(TreeNode* root) { return h(root) >= 0; }
};
```

### Explanation
Naively calling `height()` at every node is O(n²). Folding the check into one post-order pass is O(n).

**Time:** O(n) · **Space:** O(h)

## Same Tree
- difficulty: Easy
- leetcode: 100
- slug: same-tree

Check if two trees are structurally identical with equal values.

### Hint
Both null → true; one null → false; else compare values and recurse.

### Solution
```cpp
class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        if (!p || !q) return p == q;
        return p->val == q->val && isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
    }
};
```

### Explanation
`p == q` when either is null is true only if both are null — a compact idiom.

**Time:** O(n) · **Space:** O(h)

## Subtree of Another Tree
- difficulty: Easy
- leetcode: 572
- slug: subtree-of-another-tree

Return `true` if `sub` appears as a subtree of `root`.

### Hint
At every node of `root`, check `isSameTree`.

### Solution
```cpp
class Solution {
    bool same(TreeNode* a, TreeNode* b) {
        if (!a || !b) return a == b;
        return a->val == b->val && same(a->left, b->left) && same(a->right, b->right);
    }
public:
    bool isSubtree(TreeNode* root, TreeNode* sub) {
        if (!root) return false;
        return same(root, sub) || isSubtree(root->left, sub) || isSubtree(root->right, sub);
    }
};
```

### Explanation
O(m·n) worst case. Optimal O(m+n): serialize both trees with null markers and use KMP / string find, or compare Merkle-style hashes of subtrees.

**Time:** O(m·n) · **Space:** O(h)

## Lowest Common Ancestor of a Binary Search Tree
- difficulty: Medium
- leetcode: 235
- slug: lowest-common-ancestor-of-a-binary-search-tree

Find the LCA of nodes `p` and `q` in a BST.

### Hint
If both are smaller, go left; both larger, go right; otherwise you're at the split point.

### Solution
```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        while (root) {
            if (p->val < root->val && q->val < root->val) root = root->left;
            else if (p->val > root->val && q->val > root->val) root = root->right;
            else return root;
        }
        return nullptr;
    }
};
```

### Explanation
The BST ordering tells us exactly where `p` and `q` diverge. For a general binary tree (LC 236): `if (!root || root==p || root==q) return root; auto l = f(left), r = f(right); return l && r ? root : (l ? l : r);`

**Time:** O(h) · **Space:** O(1)

## Binary Tree Level Order Traversal
- difficulty: Medium
- leetcode: 102
- slug: binary-tree-level-order-traversal

Return values level by level.

### Hint
BFS; the queue's size at the start of each iteration is the level size.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> res;
        if (!root) return res;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            auto& level = res.emplace_back();       // C++17: emplace_back returns ref
            for (int sz = q.size(); sz > 0; --sz) {
                TreeNode* n = q.front(); q.pop();
                level.push_back(n->val);
                if (n->left) q.push(n->left);
                if (n->right) q.push(n->right);
            }
        }
        return res;
    }
};
```

### Explanation
Snapshotting `q.size()` separates levels without storing depth per node. This template solves zigzag order, averages per level, right side view, min depth, etc.

**Time:** O(n) · **Space:** O(width)

## Binary Tree Right Side View
- difficulty: Medium
- leetcode: 199
- slug: binary-tree-right-side-view

Return the values visible from the right side, top to bottom.

### Hint
Last node of each BFS level — or DFS visiting right first, recording the first node at each new depth.

### Solution
```cpp
class Solution {
    vector<int> res;
    void dfs(TreeNode* n, int depth) {
        if (!n) return;
        if (depth == (int)res.size()) res.push_back(n->val);  // first at this depth
        dfs(n->right, depth + 1);
        dfs(n->left, depth + 1);
    }
public:
    vector<int> rightSideView(TreeNode* root) { dfs(root, 0); return res; }
};
```

### Explanation
Visiting right before left guarantees the first node seen at each depth is the rightmost.

**Time:** O(n) · **Space:** O(h)

## Count Good Nodes in Binary Tree
- difficulty: Medium
- leetcode: 1448
- slug: count-good-nodes-in-binary-tree

A node is *good* if no node on the path from the root to it has a greater value. Count good nodes.

### Hint
Pass the max-so-far down (pre-order information flow).

### Solution
```cpp
class Solution {
    int dfs(TreeNode* n, int mx) {
        if (!n) return 0;
        int good = n->val >= mx;
        mx = max(mx, n->val);
        return good + dfs(n->left, mx) + dfs(n->right, mx);
    }
public:
    int goodNodes(TreeNode* root) { return dfs(root, INT_MIN); }
};
```

### Explanation
Information flowing **down** (path max) is passed as a parameter; information flowing **up** (count) is returned.

**Time:** O(n) · **Space:** O(h)

## Validate Binary Search Tree
- difficulty: Medium
- leetcode: 98
- slug: validate-binary-search-tree

Determine whether a tree is a valid BST (strict ordering).

### Hint
Checking only parent-child is wrong. Each node must lie in an open interval `(lo, hi)` inherited from ancestors.

### Solution
```cpp
class Solution {
    bool ok(TreeNode* n, long long lo, long long hi) {
        if (!n) return true;
        if (n->val <= lo || n->val >= hi) return false;
        return ok(n->left, lo, n->val) && ok(n->right, n->val, hi);
    }
public:
    bool isValidBST(TreeNode* root) { return ok(root, LLONG_MIN, LLONG_MAX); }
};
```

### Explanation
Using `long long` bounds avoids failing when a node equals `INT_MIN`/`INT_MAX`. Alternative: in-order traversal must be strictly increasing.

**Time:** O(n) · **Space:** O(h)

## Kth Smallest Element in a BST
- difficulty: Medium
- leetcode: 230
- slug: kth-smallest-element-in-a-bst

Return the k-th smallest value (1-indexed) in a BST.

### Hint
In-order traversal yields sorted order; stop at the k-th. Do it iteratively with an explicit stack.

### Solution
```cpp
class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        vector<TreeNode*> st;
        TreeNode* cur = root;
        while (cur || !st.empty()) {
            while (cur) { st.push_back(cur); cur = cur->left; }   // go far left
            cur = st.back(); st.pop_back();
            if (--k == 0) return cur->val;
            cur = cur->right;
        }
        return -1;
    }
};
```

### Explanation
The iterative in-order traversal is worth memorising — it's how BST iterators (`std::map` iterators conceptually) work. Follow-up for frequent queries: augment nodes with subtree sizes → O(h) per query.

**Time:** O(h + k) · **Space:** O(h)

## Construct Binary Tree from Preorder and Inorder Traversal
- difficulty: Medium
- leetcode: 105
- slug: construct-binary-tree-from-preorder-and-inorder-traversal

Rebuild a tree (unique values) from its preorder and inorder traversals.

### Hint
`preorder[0]` is the root. Its index in inorder splits left/right subtrees. Use a hash map for O(1) index lookup.

### Solution
```cpp
class Solution {
    unordered_map<int, int> inIdx;
    int pre = 0;
    TreeNode* build(vector<int>& preorder, int lo, int hi) {  // inorder range [lo, hi]
        if (lo > hi) return nullptr;
        int v = preorder[pre++];
        auto* root = new TreeNode(v);
        int mid = inIdx[v];
        root->left = build(preorder, lo, mid - 1);    // left first: matches preorder
        root->right = build(preorder, mid + 1, hi);
        return root;
    }
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        for (int i = 0; i < (int)inorder.size(); ++i) inIdx[inorder[i]] = i;
        return build(preorder, 0, (int)inorder.size() - 1);
    }
};
```

### Explanation
A shared cursor `pre` walks preorder in order (root, left subtree, right subtree). The inorder range tells us when a subtree is empty.

**Time:** O(n) · **Space:** O(n)

## Binary Tree Maximum Path Sum
- difficulty: Hard
- leetcode: 124
- slug: binary-tree-maximum-path-sum

Find the maximum sum of any non-empty path (node values may be negative).

### Hint
Like diameter: return the best *downward* path; record the best path that *bends* at this node. Drop negative branches.

### Solution
```cpp
class Solution {
    int best = INT_MIN;
    int gain(TreeNode* n) {
        if (!n) return 0;
        int l = max(0, gain(n->left));      // ignore negative contributions
        int r = max(0, gain(n->right));
        best = max(best, n->val + l + r);   // path through n
        return n->val + max(l, r);          // parent can extend only one side
    }
public:
    int maxPathSum(TreeNode* root) { gain(root); return best; }
};
```

### Explanation
Same "return one, record another" pattern as diameter. Initialise `best` to `INT_MIN` so all-negative trees work.

**Time:** O(n) · **Space:** O(h)

## Serialize and Deserialize Binary Tree
- difficulty: Hard
- leetcode: 297
- slug: serialize-and-deserialize-binary-tree

Design an algorithm to serialize a binary tree to a string and back.

### Hint
Pre-order with explicit null markers is unambiguous.

### Solution
```cpp
class Codec {
    void ser(TreeNode* n, string& out) {
        if (!n) { out += "#,"; return; }
        out += to_string(n->val) + ',';
        ser(n->left, out);
        ser(n->right, out);
    }
    TreeNode* des(istringstream& in) {
        string tok;
        getline(in, tok, ',');
        if (tok == "#") return nullptr;
        auto* n = new TreeNode(stoi(tok));
        n->left = des(in);
        n->right = des(in);
        return n;
    }
public:
    string serialize(TreeNode* root) { string s; ser(root, s); return s; }
    TreeNode* deserialize(string data) { istringstream in(data); return des(in); }
};
```

### Explanation
Null markers make pre-order alone sufficient (no inorder needed). Deserialisation consumes tokens in the same order they were produced. Discuss: binary formats, endianness and versioning for a real wire format.

**Time:** O(n) · **Space:** O(n)
