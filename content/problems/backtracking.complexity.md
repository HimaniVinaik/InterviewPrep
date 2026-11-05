## subsets
### Complexity
**Time, step by step**
1. The recursion tree has exactly one node per subset: 2ⁿ nodes.
2. At each node we copy `cur` (size up to n) into the result → O(n) per node.
3. Total: **O(n · 2ⁿ)**. This is optimal because the output itself has n · 2ⁿ⁻¹ elements in total.

**Space:**
- Recursion depth n, plus `cur` of size ≤ n → **O(n)** extra.
- Output: O(n · 2ⁿ) (not counted).

## combination-sum
### Complexity
**Time, step by step** (n candidates, target T, smallest candidate m)
1. The maximum recursion depth is T/m (using the smallest candidate repeatedly).
2. Each level branches at most n ways, so the tree has at most n^(T/m) leaves.
3. Each found combination costs O(T/m) to copy.
4. Total: **O(n^(T/m) · T/m)** worst case — exponential. Sorting plus the `c[i] <= rem` break prunes heavily in practice.

**Space:** recursion depth and `cur` → **O(T/m)**.

## permutations
### Complexity
**Time, step by step**
1. The number of recursion nodes is n!/n! + n!/(n−1)! + … + n!/0! = n! · Σ 1/k! ≈ e · n! → O(n!).
2. Each of the n! leaves copies an n-element array → O(n · n!).
3. Total: **O(n · n!)** — optimal, since the output has n · n! numbers.

**Space:** recursion depth n → **O(n)** (the swap version needs no extra array).

## subsets-ii
### Complexity
**Time, step by step**
1. Sorting: O(n log n).
2. In the worst case (all distinct) the tree has 2ⁿ nodes, each copying up to n elements.
3. With duplicates, the skip rule ensures each **unique** subset is generated exactly once — no wasted generate-then-dedupe work.
4. Total: **O(n · 2ⁿ)**.

**Space:** **O(n)** recursion + `cur` (output excluded).

## combination-sum-ii
### Complexity
**Time, step by step**
1. Sorting: O(n log n).
2. Each candidate is used at most once, so the tree is at most the subset tree: 2ⁿ nodes.
3. Copying each valid combination: O(n).
4. Total: **O(n · 2ⁿ)** worst case; the `c[i] > rem` break and the duplicate skip prune most branches.

**Space:** **O(n)** recursion depth + `cur`.

## word-search
### Complexity
**Time, step by step** (R×C board, word length L)
1. DFS can start from each of the R·C cells.
2. The first step has up to 4 directions; every later step has at most 3 (the cell we came from is marked).
3. Each path is at most L long → at most 4 · 3^(L−1) paths per start.
4. Total: **O(R·C · 3^L)**.

**Space:**
- Recursion depth L → **O(L)**.
- Marking cells in place with `'#'` avoids an O(R·C) visited array.

## palindrome-partitioning
### Complexity
**Time, step by step**
1. Palindrome table: n² entries, each O(1) using `pal[i+1][j−1]` → O(n²).
2. Backtracking: a string of length n has n − 1 gaps, each cut or not → at most 2ⁿ⁻¹ partitions (worst case "aaaa…", where every substring is a palindrome).
3. Each partition costs O(n) to copy its substrings into the output.
4. Total: **O(n · 2ⁿ)**.

**Space:**
- Palindrome table: **O(n²)**.
- Recursion depth: O(n).

## letter-combinations-of-a-phone-number
### Complexity
**Time, step by step** (n digits)
1. Each digit maps to 3 or 4 letters → at most 4ⁿ combinations (digits 7 and 9 have 4).
2. Each completed combination costs O(n) to copy.
3. Total: **O(n · 4ⁿ)**.

**Space:** recursion depth n plus `cur` → **O(n)**. The keypad table is static, O(1).

## n-queens
### Complexity
**Time, step by step**
1. Row 0 has n choices, row 1 at most n − 1 (one column taken, more blocked by diagonals), and so on → at most n! placements explored.
2. Each placement check is O(1) thanks to the `col`, `diag`, `anti` arrays.
3. Each solution costs O(n²) to copy the board.
4. Total: **O(n!)** search (the actual count is far smaller thanks to diagonal pruning; n = 8 explores about 2 000 nodes).

**Space:**
- Three boolean arrays: O(n).
- Board being built: O(n²).
- Recursion depth: O(n).
- Total extra: **O(n²)**.
