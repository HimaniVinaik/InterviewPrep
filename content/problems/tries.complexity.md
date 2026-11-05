## implement-trie-prefix-tree
### Complexity
**Time, step by step** (L = word or prefix length)
- **insert:** one child lookup (array index) and possibly one `make_unique` per character → **O(L)**.
- **search / startsWith:** `walk` does one array index per character and stops early on a missing child → **O(L)**.
- Crucially, none of these depend on how many words are stored.

**Space, step by step** (N = total characters inserted, Σ = 26)
- At most one node per inserted character → N nodes.
- Each node holds 26 child pointers (26 × 8 bytes = 208 bytes on 64-bit) + a bool.
- Total: **O(N · Σ)**. Prefix sharing reduces the node count in practice; a hash-map-per-node trie trades speed for O(N) space.

## design-add-and-search-words-data-structure
### Complexity
**Time, step by step**
- **addWord:** O(L), same as trie insert.
- **search without dots:** follows a single path → O(L).
- **search with d dots:** each `.` branches into up to 26 children. Worst case O(26^d · L), but bounded by the total number of trie nodes N: **O(min(N, 26^d · L))**.

**Space:**
- Trie: **O(N · Σ)** as above.
- DFS recursion depth: O(L).

## word-search-ii
### Complexity
**Time, step by step** (R×C board, W words, L = max word length)
1. Building the trie: O(total characters in words) = O(W · L).
2. DFS from each of the R·C cells.
3. From a cell, the first step can go 4 ways; every later step only 3 (it can't go back to the cell it came from). Depth is limited to L by the trie.
4. Worst case: **O(R·C · 4 · 3^(L−1))** for the search, plus O(W·L) to build.
5. Pruning removes finished branches, so after a word is found its path isn't re-explored — dramatically faster on real inputs, though the worst-case bound is unchanged.

**Space, step by step**
- Trie nodes: O(W · L), stored in a single pre-reserved vector.
- Recursion depth: O(L).
- Marking visited cells in place costs O(1) extra (no separate visited grid).
- Total: **O(W · L)**.
