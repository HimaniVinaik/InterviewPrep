## invert-binary-tree

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

### Walkthrough
**Goal:** structure and values identical.

1. Both null → identical (true).
2. Exactly one null → structure differs (false).
3. Values differ → false.
4. Otherwise both left subtrees and both right subtrees must be the same (`&&` short-circuits on the first difference).

**Dry run** `p = 1(2, ·)`, `q = 1(·, 2)`:

| compare | result |
|---|---|
| (1, 1) | values equal → check children |
| (2, null) | one null → **false** |

## subtree-of-another-tree

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
