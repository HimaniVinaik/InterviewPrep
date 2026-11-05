## invert-binary-tree
### Complexity
**Time, step by step**
1. Each node is visited exactly once (one call per node, plus one call per null child).
2. Per call: one null check and one `swap` of two pointers → O(1).
3. There are n nodes and n + 1 null children → 2n + 1 calls → **O(n)**.

**Space, step by step**
- Recursion depth = tree height h.
- Balanced tree: h = O(log n). Skewed tree (a linked list): h = n.
- Total: **O(h)**, worst case O(n).

## maximum-depth-of-binary-tree
### Complexity
**Time:** one call per node and per null child → **O(n)**.

**Space:** recursion stack of depth h → **O(h)**: O(log n) balanced, O(n) skewed. The BFS version uses O(w), where w is the maximum width (up to n/2 for a complete tree's last level).

## diameter-of-binary-tree
### Complexity
**Time, step by step**
1. `height` is called once per node (post-order) — every node computes its height from its children's already-returned values.
2. Per call: two recursive calls, one addition, two `max` → O(1) besides the recursion.
3. Total: **O(n)**.

**Space:** recursion depth → **O(h)**.

**Why the brute force is O(n²):** calling `height()` separately at each node recomputes the same subtree heights; on a skewed tree that's n + (n−1) + … = O(n²).

## balanced-binary-tree
### Complexity
**Time, step by step**
1. Single post-order pass: each node's height is computed once from its children.
2. The −1 sentinel short-circuits: once an unbalanced subtree is found, siblings aren't explored.
3. Total: **O(n)** worst case (balanced trees are fully visited).

**Space:** **O(h)** recursion.

## same-tree
### Complexity
**Time:** visits each pair of corresponding nodes once and stops at the first difference → **O(min(n₁, n₂))**, i.e. O(n).

**Space:** recursion depth bounded by the smaller tree's height → **O(h)**.

## subtree-of-another-tree
### Complexity
**Time, step by step** (m = nodes in root, n = nodes in sub)
1. `isSubtree` visits every node of `root`: m calls.
2. At each, `same(root, sub)` can examine up to n nodes before finding a mismatch.
3. Total worst case: **O(m · n)** (e.g. both trees full of the same value). Typical case is much faster because `same` fails quickly.

**Space:** recursion of `isSubtree` (O(h₁)) plus nested `same` (O(h₂)) → **O(h₁ + h₂)**.

**Optimal alternative:** serialise both trees and use KMP → O(m + n) time, O(m + n) space.

## lowest-common-ancestor-of-a-binary-search-tree
### Complexity
**Time, step by step**
1. Each iteration moves one level down the tree.
2. It stops at the split point, which is at most the tree height.
3. Total: **O(h)**: O(log n) for a balanced BST, O(n) for a degenerate one.

**Space:** the iterative loop uses **O(1)** (the recursive version O(h)).

## binary-tree-level-order-traversal
### Complexity
**Time, step by step**
1. Every node is pushed into the queue once and popped once.
2. Per node: push its value into the level vector, push up to two children → O(1).
3. Total: **O(n)**.

**Space, step by step**
- Queue: at most one full level plus part of the next → O(w), where w = max width ≤ ⌈n/2⌉.
- Output: n values (not counted).
- Total extra: **O(w)** = O(n) worst case.

## binary-tree-right-side-view
### Complexity
**Time:** every node is visited once (right subtree first) → **O(n)**.

**Space:**
- Recursion depth → O(h).
- Output: one value per level → O(h).
- Total: **O(h)**.

## count-good-nodes-in-binary-tree
### Complexity
**Time:** one visit per node with O(1) work (a comparison and a `max`) → **O(n)**.

**Space:** recursion depth → **O(h)**. Carrying only the path *maximum* (instead of the whole path) is what keeps each visit O(1) instead of O(h).

## validate-binary-search-tree
### Complexity
**Time, step by step**
1. Each node is checked once against its inherited `(lo, hi)` bounds.
2. Short-circuit `&&` stops at the first violation.
3. Total: **O(n)** worst case (valid trees are fully checked).

**Space:** recursion depth → **O(h)**.

## kth-smallest-element-in-a-bst
### Complexity
**Time, step by step**
1. The first descent pushes the leftmost path: O(h).
2. Each of the k pops is followed by at most one descent into a right subtree; across the whole run, each node is pushed at most once.
3. We stop after k pops, so total work ≈ the height plus the k nodes visited → **O(h + k)**.

**Space:** the explicit stack holds at most one root-to-leaf path → **O(h)**.

**Follow-up:** with subtree sizes stored in nodes, each query becomes O(h) regardless of k.

## construct-binary-tree-from-preorder-and-inorder-traversal
### Complexity
**Time, step by step**
1. Building the value → inorder-index hash map: O(n).
2. `build` is called once per node and once per empty range: 2n + 1 calls.
3. Each call does an O(1) map lookup (average) and one `new`.
4. Total: **O(n)** average.

**Space, step by step**
- Hash map: O(n).
- Recursion depth: O(h) (O(n) for a skewed tree).
- The tree itself is the output.
- Total extra: **O(n)**.

**Without the map:** finding the root's inorder index by linear search makes it O(n²) for skewed trees.

## binary-tree-maximum-path-sum
### Complexity
**Time:** one post-order visit per node; each does two `max(0, …)`, one sum, one `max` → **O(n)**.

**Space:** recursion depth → **O(h)**.

## serialize-and-deserialize-binary-tree
### Complexity
**Time, step by step**
1. **Serialize:** each of the n nodes appends its value (O(digits) = O(1) for bounded ints), and each of the n + 1 nulls appends `"#,"` → **O(n)**.
2. **Deserialize:** `getline` reads each of the 2n + 1 tokens once; each token creates at most one node → **O(n)**.

**Space, step by step**
- Serialized string: O(n) characters.
- Recursion depth in both directions: O(h).
- `istringstream` buffer: O(n).
- Total: **O(n)**.
