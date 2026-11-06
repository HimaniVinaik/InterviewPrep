## invert-binary-tree

### Approach 1: BFS with a queue
**The idea:** visit nodes level by level and swap the two children of each one.

```cpp
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (root == nullptr) {
            return nullptr;
        }

        queue<TreeNode*> toVisit;
        toVisit.push(root);

        while (!toVisit.empty()) {
            TreeNode* node = toVisit.front();
            toVisit.pop();

            // Mirror this node: its left child becomes its right child and vice versa.
            swap(node->left, node->right);

            // Children still need to be mirrored too.
            if (node->left != nullptr) {
                toVisit.push(node->left);
            }
            if (node->right != nullptr) {
                toVisit.push(node->right);
            }
        }
        return root;
    }
};
```

**How it works:** every node gets its children swapped exactly once; the order of visiting doesn't matter.

**Think of it like this:** going floor by floor through a building and swapping the left and right doors on every floor.

**Cost:** Time **O(n)**. Space **O(w)** — the widest level (up to n/2 nodes).

### Approach 2: DFS with an explicit stack
**The idea:** the same swap, but using a stack instead of a queue (depth-first instead of level by level). No recursion, so no risk of stack overflow on a very deep tree.

```cpp
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        stack<TreeNode*> toVisit;
        if (root != nullptr) {
            toVisit.push(root);
        }

        while (!toVisit.empty()) {
            TreeNode* node = toVisit.top();
            toVisit.pop();

            swap(node->left, node->right);

            if (node->left != nullptr) {
                toVisit.push(node->left);
            }
            if (node->right != nullptr) {
                toVisit.push(node->right);
            }
        }
        return root;
    }
};
```

**How it works:** identical to BFS except a stack makes it dive down one branch first.

**Think of it like this:** same building, but you take the stairs all the way down one wing before coming back.

**Cost:** Time **O(n)**. Space **O(h)** for tree height h.

### Optimal: Recursion
**The idea:** to mirror a tree, swap the root's two children, then mirror each child's subtree.

```cpp
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        // An empty tree is its own mirror image.
        if (root == nullptr) {
            return nullptr;
        }

        // Swap the two child pointers of this node.
        swap(root->left, root->right);

        // Mirror everything below.
        invertTree(root->left);
        invertTree(root->right);

        return root;
    }
};
```

**How it works**
1. Empty tree → nothing to do.
2. Swap `root->left` and `root->right` (just two pointers change).
3. Recurse into both children.

**Think of it like this:** holding a family tree up to a mirror — every parent's left child appears on the right.

**Why it's optimal:** every node must be touched once; the code is three lines. (On extremely deep trees, prefer the stack version.)

**Cost:** Time **O(n)**. Space **O(h)** call stack (O(log n) balanced, O(n) for a chain).

## maximum-depth-of-binary-tree

### Approach 1: BFS — count the levels
**The idea:** process the tree one level at a time; the number of levels is the depth.

```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (root == nullptr) {
            return 0;
        }

        queue<TreeNode*> q;
        q.push(root);
        int depth = 0;

        while (!q.empty()) {
            depth++;                       // we are entering a new level
            int levelSize = q.size();      // nodes on this level
            for (int i = 0; i < levelSize; i++) {
                TreeNode* node = q.front();
                q.pop();
                if (node->left != nullptr) {
                    q.push(node->left);
                }
                if (node->right != nullptr) {
                    q.push(node->right);
                }
            }
        }
        return depth;
    }
};
```

**How it works:** each outer loop iteration empties one full level and loads the next one.

**Think of it like this:** counting the floors of a building by walking up one floor at a time.

**Cost:** Time **O(n)**. Space **O(w)** for the widest level.

### Approach 2: Iterative DFS with (node, depth) pairs
**The idea:** carry each node's depth on the stack and remember the largest one seen.

```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        int best = 0;
        stack<pair<TreeNode*, int>> st;    // (node, its depth)
        if (root != nullptr) {
            st.push({root, 1});
        }

        while (!st.empty()) {
            TreeNode* node = st.top().first;
            int depth = st.top().second;
            st.pop();

            best = max(best, depth);

            if (node->left != nullptr) {
                st.push({node->left, depth + 1});
            }
            if (node->right != nullptr) {
                st.push({node->right, depth + 1});
            }
        }
        return best;
    }
};
```

**How it works:** a child is always one level deeper than its parent.

**Think of it like this:** exploring a cave system, writing the depth on every chamber you reach and remembering the deepest.

**Cost:** Time **O(n)**. Space **O(h)**.

### Optimal: Recursion (post-order)
**The idea:** the depth of a tree is 1 (the root) plus the depth of its deeper subtree.

```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (root == nullptr) {
            return 0;                       // empty tree has depth 0
        }

        int leftDepth = maxDepth(root->left);
        int rightDepth = maxDepth(root->right);

        // Count this node, plus the deeper side.
        return 1 + max(leftDepth, rightDepth);
    }
};
```

**How it works**
1. Ask both children for their depths.
2. Take the larger and add 1 for the current node.

**Think of it like this:** each manager asks their two reports "how deep is your team?", takes the deeper answer, and adds themselves.

**Why it's optimal:** every node must be seen once to know the depth; the recursion is the clearest expression of the definition.

**Cost:** Time **O(n)**. Space **O(h)** call stack.

## diameter-of-binary-tree

### Approach 1: Brute force — compute heights at every node
**The idea:** the longest path that bends at a node has `height(left) + height(right)` edges. Try every node, recomputing heights from scratch each time.

```cpp
class Solution {
public:
    int diameterOfBinaryTree(TreeNode* root) {
        if (root == nullptr) {
            return 0;
        }
        // Path bending at root.
        int throughRoot = height(root->left) + height(root->right);
        // Best path that bends somewhere inside a subtree.
        int inLeft = diameterOfBinaryTree(root->left);
        int inRight = diameterOfBinaryTree(root->right);
        return max(throughRoot, max(inLeft, inRight));
    }

private:
    // Number of nodes on the longest downward path from node.
    int height(TreeNode* node) {
        if (node == nullptr) {
            return 0;
        }
        return 1 + max(height(node->left), height(node->right));
    }
};
```

**How it works:** correct, but `height` re-walks each subtree many times.

**Think of it like this:** measuring every hallway from scratch each time you consider a different meeting point.

**Cost:** Time **O(n²)** worst case (a chain). Space **O(h)**.

### Approach 2: Remember heights in a map (iterative post-order)
**The idea:** visit children before parents using a stack, and store each node's height so the parent can read it instantly.

```cpp
class Solution {
public:
    int diameterOfBinaryTree(TreeNode* root) {
        if (root == nullptr) {
            return 0;
        }
        unordered_map<TreeNode*, int> heightOf;
        heightOf[nullptr] = 0;
        int best = 0;

        // Stack of (node, have we already pushed its children?)
        stack<pair<TreeNode*, bool>> st;
        st.push({root, false});

        while (!st.empty()) {
            TreeNode* node = st.top().first;
            bool childrenDone = st.top().second;
            st.pop();

            if (!childrenDone) {
                // Visit again after the children are finished.
                st.push({node, true});
                if (node->left != nullptr) {
                    st.push({node->left, false});
                }
                if (node->right != nullptr) {
                    st.push({node->right, false});
                }
            } else {
                int l = heightOf[node->left];
                int r = heightOf[node->right];
                best = max(best, l + r);
                heightOf[node] = 1 + max(l, r);
            }
        }
        return best;
    }
};
```

**How it works:** a node is processed the second time it is popped, when both children's heights are known.

**Think of it like this:** filling in a family tree from the youngest generation upwards, writing each person's "longest line of descendants" next to their name.

**Cost:** Time **O(n)**. Space **O(n)** for the map.

### Optimal: One DFS that returns height and updates the best diameter
**The idea:** a single post-order pass: each call returns its height to the parent and, on the side, checks the longest path bending at that node.

```cpp
class Solution {
public:
    int diameterOfBinaryTree(TreeNode* root) {
        best = 0;
        height(root);
        return best;
    }

private:
    int best = 0;   // longest path (in edges) found so far

    // Returns the number of nodes on the longest downward path from node.
    int height(TreeNode* node) {
        if (node == nullptr) {
            return 0;
        }

        int l = height(node->left);    // longest path down the left side
        int r = height(node->right);   // longest path down the right side

        // A path bending at this node uses l edges on the left and r on the right.
        best = max(best, l + r);

        // The parent can only continue one side of this node.
        return 1 + max(l, r);
    }
};
```

**How it works**
1. `height(n)` = nodes on the longest downward path starting at `n`.
2. The best path bending at `n` has `l + r` edges.
3. Return `1 + max(l, r)` so the parent can use it.

**Think of it like this:** every junction in a road network reports "my longest road going down" to the junction above, and also checks "the longest route that turns here".

**Why it's optimal:** each node is visited once; heights are never recomputed.

**Cost:** Time **O(n)**. Space **O(h)**.

## balanced-binary-tree

### Approach 1: Top-down — check every node, recomputing heights
**The idea:** a tree is balanced if the root's two heights differ by at most 1 **and** both subtrees are balanced.

```cpp
class Solution {
public:
    bool isBalanced(TreeNode* root) {
        if (root == nullptr) {
            return true;
        }
        int diff = abs(height(root->left) - height(root->right));
        if (diff > 1) {
            return false;
        }
        return isBalanced(root->left) && isBalanced(root->right);
    }

private:
    int height(TreeNode* node) {
        if (node == nullptr) {
            return 0;
        }
        return 1 + max(height(node->left), height(node->right));
    }
};
```

**How it works:** direct translation of the definition.

**Think of it like this:** inspecting each shelf of a bookcase by re-measuring every shelf below it each time.

**Cost:** Time **O(n log n)** balanced, **O(n²)** for a chain. Space **O(h)**.

### Approach 2: Return a pair (balanced?, height)
**The idea:** compute both facts in one bottom-up pass.

```cpp
class Solution {
public:
    bool isBalanced(TreeNode* root) {
        return check(root).first;
    }

private:
    // Returns {is this subtree balanced?, its height}.
    pair<bool, int> check(TreeNode* node) {
        if (node == nullptr) {
            return {true, 0};
        }
        pair<bool, int> left = check(node->left);
        pair<bool, int> right = check(node->right);

        bool balanced = left.first && right.first
                        && abs(left.second - right.second) <= 1;
        int height = 1 + max(left.second, right.second);
        return {balanced, height};
    }
};
```

**How it works:** each node combines its children's answers in O(1).

**Think of it like this:** each employee reports two things up the chain: "is my team OK?" and "how many levels deep is it?".

**Cost:** Time **O(n)**. Space **O(h)**.

### Optimal: Height with −1 meaning "unbalanced" (early exit)
**The idea:** like Approach 2, but encode "unbalanced" as height −1 so we can stop as soon as a problem is found.

```cpp
class Solution {
public:
    bool isBalanced(TreeNode* root) {
        return h(root) >= 0;
    }

private:
    // Height of the subtree, or -1 if some part of it is unbalanced.
    int h(TreeNode* node) {
        if (node == nullptr) {
            return 0;
        }

        int l = h(node->left);
        if (l < 0) {
            return -1;      // left side already unbalanced: stop, skip the right side
        }

        int r = h(node->right);
        if (r < 0) {
            return -1;
        }

        if (abs(l - r) > 1) {
            return -1;      // this node itself is unbalanced
        }
        return 1 + max(l, r);
    }
};
```

**How it works**
1. Return the real height when everything below is balanced.
2. Return −1 as soon as any node is unbalanced; it bubbles straight to the top.
3. Balanced ⇔ the root's result is ≥ 0.

**Think of it like this:** a fire alarm — as soon as one floor reports a problem, everyone above just passes "alarm!" upwards without checking anything else.

**Why it's optimal:** one pass, O(1) work per node, and it stops early on the first imbalance.

**Cost:** Time **O(n)**. Space **O(h)**.

## same-tree

### Approach 1: BFS comparing pairs of nodes
**The idea:** walk both trees in lock-step with a queue of node pairs.

```cpp
class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        queue<pair<TreeNode*, TreeNode*>> pairs;
        pairs.push({p, q});

        while (!pairs.empty()) {
            TreeNode* a = pairs.front().first;
            TreeNode* b = pairs.front().second;
            pairs.pop();

            if (a == nullptr && b == nullptr) {
                continue;               // both empty here: fine
            }
            if (a == nullptr || b == nullptr) {
                return false;           // only one is empty: shapes differ
            }
            if (a->val != b->val) {
                return false;
            }
            pairs.push({a->left, b->left});
            pairs.push({a->right, b->right});
        }
        return true;
    }
};
```

**How it works:** every matching position is compared once.

**Think of it like this:** two people walking through two identical-looking houses room by room, comparing what they see.

**Cost:** Time **O(n)**. Space **O(w)**.

### Approach 2: Compare serialisations
**The idea:** write each tree as a string that includes null markers; equal strings mean equal trees.

```cpp
class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        string a;
        string b;
        serialize(p, a);
        serialize(q, b);
        return a == b;
    }

private:
    void serialize(TreeNode* node, string& out) {
        if (node == nullptr) {
            out += "#,";                    // null marker keeps the shape exact
            return;
        }
        out += to_string(node->val) + ",";
        serialize(node->left, out);
        serialize(node->right, out);
    }
};
```

**How it works:** preorder plus null markers describes a tree uniquely.

**Think of it like this:** describing both houses in writing and checking whether the descriptions match.

**Cost:** Time **O(n)**. Space **O(n)** for the strings.

### Optimal: Recursive comparison
**The idea:** two trees are the same if their roots match and their left subtrees and right subtrees are the same.

```cpp
class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        // Both empty → same.
        if (p == nullptr && q == nullptr) {
            return true;
        }
        // Exactly one empty → different shapes.
        if (p == nullptr || q == nullptr) {
            return false;
        }
        // Values must match...
        if (p->val != q->val) {
            return false;
        }
        // ...and so must both pairs of subtrees.
        return isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
    }
};
```

**How it works**
1. Handle the null cases first.
2. Compare values.
3. `&&` stops at the first mismatch.

**Think of it like this:** "my two kids match yours, and their kids match yours" all the way down.

**Why it's optimal:** stops at the first difference, needs no extra strings or queues.

**Cost:** Time **O(n)**. Space **O(h)**.

## subtree-of-another-tree

### Approach 1: Serialise both, then substring search
**The idea:** turn both trees into strings with null markers and a separator before every value; `sub` is a subtree exactly when its string appears inside `root`'s string.

```cpp
class Solution {
public:
    bool isSubtree(TreeNode* root, TreeNode* sub) {
        string big;
        string small;
        serialize(root, big);
        serialize(sub, small);
        return big.find(small) != string::npos;
    }

private:
    void serialize(TreeNode* node, string& out) {
        if (node == nullptr) {
            out += ",#";
            return;
        }
        // The leading comma stops "2" from matching the end of "12".
        out += "," + to_string(node->val);
        serialize(node->left, out);
        serialize(node->right, out);
    }
};
```

**How it works:** a subtree's preorder string is a contiguous piece of the whole tree's preorder string.

**Think of it like this:** searching for a sentence inside a book.

**Cost:** Time **O(m·n)** with `find` in the worst case (O(m + n) with KMP). Space **O(m + n)**.

### Approach 2: Hash every subtree
**The idea:** compute a fingerprint for every subtree from its children's fingerprints; compare fingerprints instead of whole trees, and confirm a match with a real comparison.

```cpp
class Solution {
public:
    bool isSubtree(TreeNode* root, TreeNode* sub) {
        target = fingerprint(sub);
        targetRoot = sub;
        found = false;
        fingerprint(root);
        return found;
    }

private:
    unsigned long long target = 0;
    TreeNode* targetRoot = nullptr;
    bool found = false;

    // Bottom-up hash of the subtree. Equal trees always get equal hashes.
    unsigned long long fingerprint(TreeNode* node) {
        if (node == nullptr) {
            return 3;
        }
        unsigned long long l = fingerprint(node->left);
        unsigned long long r = fingerprint(node->right);
        unsigned long long h = (unsigned long long)(node->val + 20000) * 1000003ULL;
        h = h ^ (l * 2654435761ULL) ^ (r * 40503ULL + 17);
        // Different trees *could* share a hash, so double-check a candidate.
        if (h == target && !found && sameTree(node, targetRoot)) {
            found = true;
        }
        return h;
    }

    bool sameTree(TreeNode* a, TreeNode* b) {
        if (a == nullptr && b == nullptr) {
            return true;
        }
        if (a == nullptr || b == nullptr || a->val != b->val) {
            return false;
        }
        return sameTree(a->left, b->left) && sameTree(a->right, b->right);
    }
};
```

**How it works:** comparing two numbers is O(1), so we only do a full comparison when the fingerprints agree.

**Think of it like this:** checking ID numbers first and only checking faces when the numbers match.

**Cost:** Time **O(m + n)** expected. Space **O(h)**.

### Optimal: Try every node as a starting point
**The idea:** for every node in `root`, ask "is the tree starting here the same as `sub`?".

```cpp
class Solution {
public:
    bool isSubtree(TreeNode* root, TreeNode* sub) {
        if (root == nullptr) {
            return false;                    // ran out of places to look
        }
        if (sameTree(root, sub)) {
            return true;                     // found it starting here
        }
        // Otherwise look inside the left and right subtrees.
        return isSubtree(root->left, sub) || isSubtree(root->right, sub);
    }

private:
    bool sameTree(TreeNode* a, TreeNode* b) {
        if (a == nullptr && b == nullptr) {
            return true;
        }
        if (a == nullptr || b == nullptr) {
            return false;
        }
        if (a->val != b->val) {
            return false;
        }
        return sameTree(a->left, b->left) && sameTree(a->right, b->right);
    }
};
```

**How it works**
1. At each node of `root`, run Same Tree against `sub`.
2. If not, search the left and right subtrees.

**Think of it like this:** sliding a stencil over every spot of a picture and checking whether it lines up.

**Why it's the expected answer:** with LeetCode's limits (≤ 2000 and ≤ 1000 nodes), O(m·n) is fast, and the code is short and obviously correct. Mention the hashing/serialisation ideas as the linear-time follow-up.

**Cost:** Time **O(m·n)** worst case. Space **O(h)**.

## lowest-common-ancestor-of-a-binary-search-tree

### Approach 1: General binary-tree LCA (ignores the BST ordering)
**The idea:** search both subtrees; the node where `p` is found on one side and `q` on the other is the answer.

```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        if (root == nullptr || root == p || root == q) {
            return root;                    // found one of them (or nothing)
        }
        TreeNode* left = lowestCommonAncestor(root->left, p, q);
        TreeNode* right = lowestCommonAncestor(root->right, p, q);

        if (left != nullptr && right != nullptr) {
            return root;                    // p and q are on different sides
        }
        if (left != nullptr) {
            return left;
        }
        return right;
    }
};
```

**How it works:** works on any binary tree, but explores the whole tree.

**Think of it like this:** searching every branch of a family tree for two people, then seeing where their lines join.

**Cost:** Time **O(n)**. Space **O(h)**.

### Approach 2: Recursive BST walk
**The idea:** use the ordering: if both values are smaller, the answer is to the left; if both larger, to the right; otherwise it's here.

```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        if (p->val < root->val && q->val < root->val) {
            return lowestCommonAncestor(root->left, p, q);
        }
        if (p->val > root->val && q->val > root->val) {
            return lowestCommonAncestor(root->right, p, q);
        }
        return root;                        // they split here (or one IS root)
    }
};
```

**How it works:** one path from the root down.

**Think of it like this:** two addresses on the same street directory — follow the shared directions until they diverge.

**Cost:** Time **O(h)**. Space **O(h)** call stack.

### Optimal: Iterative BST walk
**The idea:** the same decision as Approach 2, in a loop, so no call stack is needed.

```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        while (root != nullptr) {
            if (p->val < root->val && q->val < root->val) {
                root = root->left;          // both are in the left subtree
            } else if (p->val > root->val && q->val > root->val) {
                root = root->right;         // both are in the right subtree
            } else {
                return root;                // they split here: this is the LCA
            }
        }
        return nullptr;
    }
};
```

**How it works**
1. Both smaller → go left. Both larger → go right.
2. Otherwise `p` and `q` are on different sides (or one of them is `root`) → `root` is the LCA.

**Think of it like this:** two friends walking down the same hiking trail from the top; the LCA is the fork where they take different paths.

**Why it's optimal:** visits only one root-to-node path and uses O(1) memory.

**Cost:** Time **O(h)**. Space **O(1)**.

## binary-tree-level-order-traversal

### Approach 1: DFS with a depth parameter
**The idea:** visit nodes depth-first, but drop each value into the list for its depth.

```cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> res;
        dfs(root, 0, res);
        return res;
    }

private:
    void dfs(TreeNode* node, int depth, vector<vector<int>>& res) {
        if (node == nullptr) {
            return;
        }
        if (depth == (int)res.size()) {
            res.push_back({});              // first node seen at this depth
        }
        res[depth].push_back(node->val);
        dfs(node->left, depth + 1, res);    // left first keeps each level left-to-right
        dfs(node->right, depth + 1, res);
    }
};
```

**How it works:** left-before-right DFS meets each level's nodes in left-to-right order.

**Think of it like this:** walking a family tree and writing each person into the "generation" column they belong to.

**Cost:** Time **O(n)**. Space **O(h)** stack (plus the output).

### Approach 2: Two lists — current level and next level
**The idea:** keep the current level in one vector, build the next level in another, then swap.

```cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> res;
        vector<TreeNode*> current;
        if (root != nullptr) {
            current.push_back(root);
        }

        while (!current.empty()) {
            vector<int> values;
            vector<TreeNode*> next;
            for (TreeNode* node : current) {
                values.push_back(node->val);
                if (node->left != nullptr) {
                    next.push_back(node->left);
                }
                if (node->right != nullptr) {
                    next.push_back(node->right);
                }
            }
            res.push_back(values);
            current = next;                 // move down one level
        }
        return res;
    }
};
```

**How it works:** the level boundary is explicit — no need to count the queue size.

**Think of it like this:** a row of students hands their own children to the next row.

**Cost:** Time **O(n)**. Space **O(w)**.

### Optimal: BFS with a queue, one level per loop
**The idea:** a queue visits nodes in level order; the queue's size at the start of each round tells you exactly how many nodes belong to the current level.

```cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> res;
        if (root == nullptr) {
            return res;
        }

        queue<TreeNode*> q;
        q.push(root);

        while (!q.empty()) {
            int levelSize = q.size();         // all nodes on this level, none from the next
            vector<int> level;

            for (int i = 0; i < levelSize; i++) {
                TreeNode* node = q.front();
                q.pop();
                level.push_back(node->val);

                // Children belong to the next level; they wait behind this level.
                if (node->left != nullptr) {
                    q.push(node->left);
                }
                if (node->right != nullptr) {
                    q.push(node->right);
                }
            }
            res.push_back(level);
        }
        return res;
    }
};
```

**How it works**
1. Start with the root in the queue.
2. At the start of each round, `q.size()` = nodes on the current level.
3. Pop exactly that many, record them, push their children.

**Think of it like this:** a queue at a ride where each group gets on together, and their kids line up behind for the next ride.

**Why it's optimal:** every node is pushed and popped once; this is the textbook BFS.

**Cost:** Time **O(n)**. Space **O(w)** — the widest level.

## binary-tree-right-side-view

### Approach 1: Level order, then take the last value of each level
**The idea:** reuse level order traversal; the rightmost node of a level is the last one in that level's list.

```cpp
class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> res;
        if (root == nullptr) {
            return res;
        }
        queue<TreeNode*> q;
        q.push(root);

        while (!q.empty()) {
            int levelSize = q.size();
            for (int i = 0; i < levelSize; i++) {
                TreeNode* node = q.front();
                q.pop();
                if (i == levelSize - 1) {
                    res.push_back(node->val);   // last node on this level
                }
                if (node->left != nullptr) {
                    q.push(node->left);
                }
                if (node->right != nullptr) {
                    q.push(node->right);
                }
            }
        }
        return res;
    }
};
```

**How it works:** BFS goes left to right, so the last popped node of each level is the one visible from the right.

**Think of it like this:** looking at each row of a stadium and noting the person in the rightmost seat.

**Cost:** Time **O(n)**. Space **O(w)**.

### Approach 2: Build all levels, then take the back of each
**The idea:** a two-step version that's easy to reason about.

```cpp
class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<vector<int>> levels;
        collect(root, 0, levels);

        vector<int> res;
        for (const vector<int>& level : levels) {
            res.push_back(level.back());       // rightmost value of the level
        }
        return res;
    }

private:
    void collect(TreeNode* node, int depth, vector<vector<int>>& levels) {
        if (node == nullptr) {
            return;
        }
        if (depth == (int)levels.size()) {
            levels.push_back({});
        }
        levels[depth].push_back(node->val);
        collect(node->left, depth + 1, levels);
        collect(node->right, depth + 1, levels);
    }
};
```

**How it works:** same answer, more memory (stores every value).

**Think of it like this:** photograph every row, then crop each photo to the right edge.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: DFS visiting the right child first
**The idea:** go right before left; the first node you reach at each new depth is the one you'd see from the right side.

```cpp
class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        res.clear();
        dfs(root, 0);
        return res;
    }

private:
    vector<int> res;   // res[d] = value seen from the right at depth d

    void dfs(TreeNode* node, int depth) {
        if (node == nullptr) {
            return;
        }
        // First time we reach this depth? Because we go right first,
        // this node is the rightmost one at this depth.
        if (depth == (int)res.size()) {
            res.push_back(node->val);
        }
        dfs(node->right, depth + 1);   // right side first
        dfs(node->left, depth + 1);
    }
};
```

**How it works**
1. `res.size()` = how many depths we've already seen.
2. Visiting right first means the first node at each depth is the rightmost.

**Think of it like this:** standing on the right of the tree and shining a torch; the first thing the light hits on each level is what you see.

**Why it's optimal:** O(n) time like BFS, but memory is only the tree height.

**Cost:** Time **O(n)**. Space **O(h)**.

## count-good-nodes-in-binary-tree

### Approach 1: Brute force — check the whole path for every node
**The idea:** keep the current root-to-node path in a vector; a node is good if no value on the path is bigger than it.

```cpp
class Solution {
public:
    int goodNodes(TreeNode* root) {
        vector<int> path;
        return count(root, path);
    }

private:
    int count(TreeNode* node, vector<int>& path) {
        if (node == nullptr) {
            return 0;
        }
        // Is any ancestor bigger than this node?
        bool good = true;
        for (int ancestor : path) {
            if (ancestor > node->val) {
                good = false;
                break;
            }
        }

        path.push_back(node->val);           // add self to the path
        int total = (good ? 1 : 0)
                    + count(node->left, path)
                    + count(node->right, path);
        path.pop_back();                     // remove self before going back up
        return total;
    }
};
```

**How it works:** literally checks the definition for each node.

**Think of it like this:** each hiker looks back at every point on the trail to check none was higher.

**Cost:** Time **O(n·h)**. Space **O(h)**.

### Approach 2: BFS carrying the path maximum
**The idea:** store each node together with the largest value on its path from the root.

```cpp
class Solution {
public:
    int goodNodes(TreeNode* root) {
        int good = 0;
        queue<pair<TreeNode*, int>> q;      // (node, max value above it)
        q.push({root, INT_MIN});

        while (!q.empty()) {
            TreeNode* node = q.front().first;
            int maxAbove = q.front().second;
            q.pop();

            if (node->val >= maxAbove) {
                good++;
            }
            int newMax = max(maxAbove, node->val);
            if (node->left != nullptr) {
                q.push({node->left, newMax});
            }
            if (node->right != nullptr) {
                q.push({node->right, newMax});
            }
        }
        return good;
    }
};
```

**How it works:** the max of a path only needs one number, not the whole path.

**Think of it like this:** each hiker carries a note saying "the highest point so far", and passes an updated note on.

**Cost:** Time **O(n)**. Space **O(w)**.

### Optimal: DFS passing the path maximum
**The idea:** same as Approach 2, but with recursion: pass `mx`, the largest value from the root down to the parent.

```cpp
class Solution {
public:
    int goodNodes(TreeNode* root) {
        return dfs(root, INT_MIN);
    }

private:
    // mx = biggest value on the path from the root to this node's parent.
    int dfs(TreeNode* node, int mx) {
        if (node == nullptr) {
            return 0;
        }

        int good = 0;
        if (node->val >= mx) {
            good = 1;                       // nothing above is bigger
        }
        mx = max(mx, node->val);            // children see this node too

        return good + dfs(node->left, mx) + dfs(node->right, mx);
    }
};
```

**How it works**
1. Start with `mx = INT_MIN` (the root is always good).
2. A node is good if `val ≥ mx`.
3. Children receive `max(mx, val)`.

**Think of it like this:** passing a "tallest so far" baton down each family line.

**Why it's optimal:** one visit per node, O(1) work each.

**Cost:** Time **O(n)**. Space **O(h)**.

## validate-binary-search-tree

### Approach 1: In-order into a vector, check it's strictly increasing
**The idea:** an in-order walk of a BST visits values in sorted order.

```cpp
class Solution {
public:
    bool isValidBST(TreeNode* root) {
        vector<int> values;
        inorder(root, values);
        for (int i = 1; i < (int)values.size(); i++) {
            if (values[i] <= values[i - 1]) {
                return false;              // not strictly increasing
            }
        }
        return true;
    }

private:
    void inorder(TreeNode* node, vector<int>& values) {
        if (node == nullptr) {
            return;
        }
        inorder(node->left, values);
        values.push_back(node->val);
        inorder(node->right, values);
    }
};
```

**How it works:** sorted in-order ⇔ valid BST.

**Think of it like this:** reading a dictionary page by page and checking the words are in alphabetical order.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Iterative in-order, comparing with the previous value
**The idea:** same check without storing every value — only remember the last one.

```cpp
class Solution {
public:
    bool isValidBST(TreeNode* root) {
        stack<TreeNode*> st;
        TreeNode* cur = root;
        TreeNode* prev = nullptr;          // previous node in sorted order

        while (cur != nullptr || !st.empty()) {
            // Go as far left as possible.
            while (cur != nullptr) {
                st.push(cur);
                cur = cur->left;
            }
            cur = st.top();
            st.pop();

            if (prev != nullptr && cur->val <= prev->val) {
                return false;
            }
            prev = cur;
            cur = cur->right;
        }
        return true;
    }
};
```

**How it works:** only consecutive values need comparing.

**Think of it like this:** checking a queue is sorted by height by comparing each person only with the one in front.

**Cost:** Time **O(n)**. Space **O(h)**.

### Optimal: Pass down the allowed range (lo, hi)
**The idea:** every node must lie strictly between bounds set by **all** its ancestors. Going left lowers the upper bound; going right raises the lower bound.

```cpp
class Solution {
public:
    bool isValidBST(TreeNode* root) {
        // long long limits so a node equal to INT_MIN / INT_MAX is still allowed.
        return ok(root, LLONG_MIN, LLONG_MAX);
    }

private:
    // Is every value in this subtree strictly between lo and hi?
    bool ok(TreeNode* node, long long lo, long long hi) {
        if (node == nullptr) {
            return true;
        }
        if (node->val <= lo || node->val >= hi) {
            return false;                   // outside the allowed window
        }
        // Left subtree: must be smaller than this node.
        // Right subtree: must be bigger than this node.
        return ok(node->left, lo, node->val) && ok(node->right, node->val, hi);
    }
};
```

**How it works**
1. Start with (−∞, +∞).
2. Left child gets `(lo, node->val)`, right child gets `(node->val, hi)`.
3. Any value outside its window → false.

**Think of it like this:** every room in a hotel has a price range set by all the managers above it, not just the floor manager.

**Why it's optimal:** one visit per node and it catches the classic trap where a node is fine compared with its parent but not with its grandparent.

**Cost:** Time **O(n)**. Space **O(h)**.

## kth-smallest-element-in-a-bst

### Approach 1: Full in-order into a vector
**The idea:** in-order visits values in sorted order; the answer is the (k−1)-th element.

```cpp
class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        vector<int> sorted;
        inorder(root, sorted);
        return sorted[k - 1];
    }

private:
    void inorder(TreeNode* node, vector<int>& out) {
        if (node == nullptr) {
            return;
        }
        inorder(node->left, out);
        out.push_back(node->val);
        inorder(node->right, out);
    }
};
```

**How it works:** simple, but visits every node even if k is 1.

**Think of it like this:** sorting the whole deck to find the 3rd lowest card.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Recursive in-order with early stop
**The idea:** count nodes as you visit them in order; stop when the count hits k.

```cpp
class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        remaining = k;
        answer = -1;
        inorder(root);
        return answer;
    }

private:
    int remaining = 0;
    int answer = -1;

    void inorder(TreeNode* node) {
        if (node == nullptr || remaining == 0) {
            return;                        // nothing here, or already found
        }
        inorder(node->left);
        if (remaining == 0) {
            return;
        }
        remaining--;
        if (remaining == 0) {
            answer = node->val;            // this is the k-th node visited
            return;
        }
        inorder(node->right);
    }
};
```

**How it works:** visits only the first k nodes in sorted order (plus the path to them).

**Think of it like this:** counting people as they walk past in height order and stopping at the k-th.

**Cost:** Time **O(h + k)**. Space **O(h)**.

### Optimal: Iterative in-order with a stack
**The idea:** the same early stop, but with an explicit stack — no recursion and easy to pause.

```cpp
class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        stack<TreeNode*> st;
        TreeNode* cur = root;

        while (cur != nullptr || !st.empty()) {
            // Push the path down to the smallest unvisited node.
            while (cur != nullptr) {
                st.push(cur);
                cur = cur->left;
            }

            // The top of the stack is the next smallest value.
            cur = st.top();
            st.pop();
            k--;
            if (k == 0) {
                return cur->val;
            }

            // Next smallest values are in this node's right subtree.
            cur = cur->right;
        }
        return -1;   // k is larger than the tree (not possible for valid input)
    }
};
```

**How it works**
1. Push the path to the leftmost node (the smallest).
2. Pop → that's the next smallest; decrement k.
3. Move to the right child and push its leftmost path.

**Think of it like this:** walking a sorted bookshelf from the left, counting books until you reach the k-th.

**Why it's optimal:** O(h + k) time, stops as soon as the answer is found, no recursion.

**Cost:** Time **O(h + k)**. Space **O(h)**.

## construct-binary-tree-from-preorder-and-inorder-traversal

### Approach 1: Recursion with a linear search for the root
**The idea:** the first preorder value is the root; find it in inorder — everything to its left is the left subtree, everything to its right is the right subtree.

```cpp
class Solution {
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        pre = 0;
        return build(preorder, inorder, 0, (int)inorder.size() - 1);
    }

private:
    int pre = 0;    // next preorder value to use as a root

    TreeNode* build(vector<int>& preorder, vector<int>& inorder, int lo, int hi) {
        if (lo > hi) {
            return nullptr;
        }
        int rootVal = preorder[pre];
        pre++;
        TreeNode* root = new TreeNode(rootVal);

        // Search the inorder range for the root.
        int mid = lo;
        while (inorder[mid] != rootVal) {
            mid++;
        }

        root->left = build(preorder, inorder, lo, mid - 1);
        root->right = build(preorder, inorder, mid + 1, hi);
        return root;
    }
};
```

**How it works:** correct, but the search is O(n) at each node.

**Think of it like this:** finding a name in an unsorted guest list by reading it from the top every time.

**Cost:** Time **O(n²)** worst case. Space **O(h)**.

### Approach 2: Iterative with a stack
**The idea:** walk preorder; keep a stack of nodes whose right child isn't decided yet. Inorder tells you when to stop going left and attach a right child instead.

```cpp
class Solution {
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        if (preorder.empty()) {
            return nullptr;
        }
        TreeNode* root = new TreeNode(preorder[0]);
        stack<TreeNode*> st;
        st.push(root);
        int in = 0;                          // position in inorder

        for (int i = 1; i < (int)preorder.size(); i++) {
            TreeNode* node = new TreeNode(preorder[i]);
            TreeNode* parent = st.top();

            if (parent->val != inorder[in]) {
                // We haven't reached the leftmost node yet: keep going left.
                parent->left = node;
            } else {
                // Pop every node whose left side is complete (matches inorder).
                while (!st.empty() && st.top()->val == inorder[in]) {
                    parent = st.top();
                    st.pop();
                    in++;
                }
                // The new node is the right child of the last node popped.
                parent->right = node;
            }
            st.push(node);
        }
        return root;
    }
};
```

**How it works:** preorder keeps going left until it matches the next inorder value; then we climb up and branch right.

**Think of it like this:** going down a staircase until you hit the ground floor marker, then stepping sideways.

**Cost:** Time **O(n)**. Space **O(h)**.

### Optimal: Recursion + hash map of inorder positions
**The idea:** same as Approach 1, but a hash map tells us the root's inorder position in O(1).

```cpp
class Solution {
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        inIdx.clear();
        pre = 0;
        for (int i = 0; i < (int)inorder.size(); i++) {
            inIdx[inorder[i]] = i;          // value → position in inorder
        }
        return build(preorder, 0, (int)inorder.size() - 1);
    }

private:
    unordered_map<int, int> inIdx;
    int pre = 0;                            // next preorder value to use

    // Build the subtree whose values are inorder[lo..hi].
    TreeNode* build(vector<int>& preorder, int lo, int hi) {
        if (lo > hi) {
            return nullptr;                 // empty range → no node
        }

        int v = preorder[pre];              // preorder: root comes first
        pre++;
        TreeNode* root = new TreeNode(v);

        int mid = inIdx[v];                 // root's position in inorder
        // Build the left subtree first: preorder lists the whole left side before the right.
        root->left = build(preorder, lo, mid - 1);
        root->right = build(preorder, mid + 1, hi);
        return root;
    }
};
```

**How it works**
1. `inIdx` maps value → inorder index (values are unique).
2. `pre` walks through preorder; each call takes the next value as its root.
3. Inorder `[lo, mid−1]` is the left subtree, `[mid+1, hi]` the right.

**Think of it like this:** preorder tells you *who is the boss*, inorder tells you *who stands on the boss's left and right*.

**Why it's optimal:** every node is created once with O(1) work.

**Cost:** Time **O(n)**. Space **O(n)** for the map.

## binary-tree-maximum-path-sum

### Approach 1: Brute force — best path through each node
**The idea:** for each node, compute the best downward path on each side from scratch, and combine.

```cpp
class Solution {
public:
    int maxPathSum(TreeNode* root) {
        if (root == nullptr) {
            return INT_MIN;
        }
        int l = max(0, bestDown(root->left));
        int r = max(0, bestDown(root->right));
        int throughRoot = root->val + l + r;

        int best = throughRoot;
        if (root->left != nullptr) {
            best = max(best, maxPathSum(root->left));
        }
        if (root->right != nullptr) {
            best = max(best, maxPathSum(root->right));
        }
        return best;
    }

private:
    // Best sum of a path that starts at node and only goes down.
    int bestDown(TreeNode* node) {
        if (node == nullptr) {
            return 0;
        }
        int l = max(0, bestDown(node->left));
        int r = max(0, bestDown(node->right));
        return node->val + max(l, r);
    }
};
```

**How it works:** correct, but `bestDown` is recomputed for many nodes.

**Think of it like this:** re-hiking every trail for each possible summit.

**Cost:** Time **O(n²)** worst case. Space **O(h)**.

### Approach 2: Iterative post-order with a gain map
**The idea:** process children before parents with a stack and store each node's best downward sum.

```cpp
class Solution {
public:
    int maxPathSum(TreeNode* root) {
        unordered_map<TreeNode*, int> gainOf;
        gainOf[nullptr] = 0;
        int best = INT_MIN;

        stack<pair<TreeNode*, bool>> st;    // (node, children already pushed?)
        st.push({root, false});

        while (!st.empty()) {
            TreeNode* node = st.top().first;
            bool childrenDone = st.top().second;
            st.pop();

            if (!childrenDone) {
                st.push({node, true});
                if (node->left != nullptr) {
                    st.push({node->left, false});
                }
                if (node->right != nullptr) {
                    st.push({node->right, false});
                }
            } else {
                int l = max(0, gainOf[node->left]);
                int r = max(0, gainOf[node->right]);
                best = max(best, node->val + l + r);
                gainOf[node] = node->val + max(l, r);
            }
        }
        return best;
    }
};
```

**How it works:** the same formula as the optimal solution, without recursion.

**Think of it like this:** tallying scores from the leaves up, writing each subtotal on a sticky note.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: One DFS returning the best one-sided "gain"
**The idea:** each node returns the best sum of a path that starts there and goes down one side (what its parent can extend). While doing that, it checks the best path that bends at itself.

```cpp
class Solution {
public:
    int maxPathSum(TreeNode* root) {
        best = INT_MIN;     // so an all-negative tree returns its largest node
        gain(root);
        return best;
    }

private:
    int best = INT_MIN;

    // Best sum of a path that starts at node and goes down one side.
    int gain(TreeNode* node) {
        if (node == nullptr) {
            return 0;
        }

        // A negative side only hurts, so treat it as 0 (don't take that side).
        int l = max(0, gain(node->left));
        int r = max(0, gain(node->right));

        // A path that bends at this node can use both sides.
        best = max(best, node->val + l + r);

        // The parent can only continue through ONE side of this node.
        return node->val + max(l, r);
    }
};
```

**How it works**
1. `l` and `r` are the best downward sums from each child, floored at 0.
2. `node->val + l + r` is the best path bending here → update `best`.
3. Return `node->val + max(l, r)` for the parent.

**Think of it like this:** each mountain peak asks its two valleys "how much can I gain going down your side?", ignores any side that loses height, and reports its best single side to the peak above.

**Why it's optimal:** one visit per node with O(1) work.

**Cost:** Time **O(n)**. Space **O(h)**.

## serialize-and-deserialize-binary-tree

### Approach 1: Level order (BFS) with null markers
**The idea:** write the tree level by level, including `#` for missing children — the same format LeetCode uses to display trees.

```cpp
class Codec {
public:
    string serialize(TreeNode* root) {
        string out;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            TreeNode* node = q.front();
            q.pop();
            if (node == nullptr) {
                out += "#,";
                continue;
            }
            out += to_string(node->val) + ",";
            q.push(node->left);              // push even if null, to record it
            q.push(node->right);
        }
        return out;
    }

    TreeNode* deserialize(string data) {
        vector<string> tokens;
        string token;
        istringstream in(data);
        while (getline(in, token, ',')) {
            tokens.push_back(token);
        }
        if (tokens.empty() || tokens[0] == "#") {
            return nullptr;
        }

        TreeNode* root = new TreeNode(stoi(tokens[0]));
        queue<TreeNode*> parents;           // nodes still waiting for children
        parents.push(root);
        int i = 1;
        while (!parents.empty()) {
            TreeNode* parent = parents.front();
            parents.pop();
            // Next token is the left child, the one after it the right child.
            if (tokens[i] != "#") {
                parent->left = new TreeNode(stoi(tokens[i]));
                parents.push(parent->left);
            }
            i++;
            if (tokens[i] != "#") {
                parent->right = new TreeNode(stoi(tokens[i]));
                parents.push(parent->right);
            }
            i++;
        }
        return root;
    }
};
```

**How it works:** parents are read in the same order they were written, and each consumes exactly two tokens for its children.

**Think of it like this:** writing a seating chart row by row, with "empty" for empty seats.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Compact binary encoding
**The idea:** instead of text, write a 1-byte flag for "node / null" and the 4 raw bytes of each value — smaller and faster to parse (the kind of thing you'd do in embedded or networking code).

```cpp
class Codec {
public:
    string serialize(TreeNode* root) {
        string out;
        write(root, out);
        return out;
    }

    TreeNode* deserialize(string data) {
        size_t pos = 0;
        return read(data, pos);
    }

private:
    void write(TreeNode* node, string& out) {
        if (node == nullptr) {
            out.push_back(0);                // flag 0 = null
            return;
        }
        out.push_back(1);                    // flag 1 = a node follows
        int32_t v = node->val;
        out.append(reinterpret_cast<const char*>(&v), sizeof(v));   // 4 raw bytes
        write(node->left, out);
        write(node->right, out);
    }

    TreeNode* read(const string& data, size_t& pos) {
        char flag = data[pos];
        pos++;
        if (flag == 0) {
            return nullptr;
        }
        int32_t v = 0;
        memcpy(&v, data.data() + pos, sizeof(v));   // safe unaligned read
        pos += sizeof(v);

        TreeNode* node = new TreeNode(v);
        node->left = read(data, pos);
        node->right = read(data, pos);
        return node;
    }
};
```

**How it works:** fixed-size fields mean no number parsing; `memcpy` avoids unaligned-access bugs.

**Think of it like this:** shipping the tree in a fixed-size packing format instead of a handwritten letter.

**Cost:** Time **O(n)**. Space **O(n)** (≤ 5 bytes per node).

### Optimal: Preorder with null markers
**The idea:** write node, then left subtree, then right subtree, with `#` for every null. Reading back in the same order rebuilds the exact shape.

```cpp
class Codec {
public:
    string serialize(TreeNode* root) {
        string out;
        ser(root, out);
        return out;
    }

    TreeNode* deserialize(string data) {
        istringstream in(data);
        return des(in);
    }

private:
    // Preorder: value, then left subtree, then right subtree.
    void ser(TreeNode* node, string& out) {
        if (node == nullptr) {
            out += "#,";                     // the null markers fix the shape
            return;
        }
        out += to_string(node->val) + ",";
        ser(node->left, out);
        ser(node->right, out);
    }

    // Reads tokens in exactly the order ser() wrote them.
    TreeNode* des(istringstream& in) {
        string token;
        getline(in, token, ',');
        if (token == "#") {
            return nullptr;
        }
        TreeNode* node = new TreeNode(stoi(token));
        node->left = des(in);                // the left subtree comes next
        node->right = des(in);               // then the right subtree
        return node;
    }
};
```

**How it works**
1. `1(2, 3(4, 5))` → `1,2,#,#,3,4,#,#,5,#,#,`.
2. The reader consumes tokens in the same order, so no indices are needed.

**Think of it like this:** recording directions as you explore a maze ("go left… dead end… back… go right…") so someone can retrace them exactly.

**Why it's optimal:** O(n) both ways, short code, and the format is unambiguous.

**Cost:** Time **O(n)**. Space **O(n)**.
