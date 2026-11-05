## unique-paths
### Complexity
**Time:** (m − 1)(n − 1) cell updates, each one addition → **O(m · n)**.

**Space:** a single row of n → **O(n)** (could be O(min(m, n)) by swapping dimensions).

**Comparison:** the combinatorial formula C(m+n−2, m−1) is O(min(m, n)) time and O(1) space.

## longest-common-subsequence
### Complexity
**Time, step by step** (m = |a|, n = |b|)
1. Allocating the (m+1)×(n+1) table: O(m · n).
2. Filling it: m · n cells, each O(1) (one comparison and a `max` or `+1`).
3. Total: **O(m · n)**.

**Space:** full table → **O(m · n)**. Two rolling rows reduce this to **O(min(m, n))**, at the cost of no longer being able to reconstruct the subsequence itself (Hirschberg's algorithm recovers it in linear space).

## best-time-to-buy-and-sell-stock-with-cooldown
### Complexity
**Time:** one pass over n prices; three state updates per day → **O(n)**.

**Space:** `hold`, `sold`, `rest` → **O(1)**. The full DP would be n × 3 states; only the previous day's states are ever read.

## coin-change-ii
### Complexity
**Time, step by step** (A = amount, c = number of coins)
1. For each of the c coins, loop over amounts coin..A: ≤ A iterations.
2. Each iteration: one addition → O(1).
3. Total: **O(c · A)**.

**Space:** one `dp` array of A + 1 → **O(A)** (the 2-D table would be O(c · A)).

## target-sum
### Complexity
**Time, step by step** (n numbers, S = total, P = (S + target)/2)
1. Sum and feasibility checks: O(n).
2. 0/1 knapsack count: n numbers × P sums → O(n · P).
3. Total: **O(n · S)** (pseudo-polynomial).

**Space:** `dp` of P + 1 → **O(S)**.

**Comparison:** brute force O(2ⁿ); a sum→count hash map is O(n · S) but with larger constants.

## interleaving-string
### Complexity
**Time:** (m + 1)(n + 1) states, each O(1) (two character comparisons) → **O(m · n)**.

**Space:** one row of n + 1 booleans → **O(n)** (O(min(m, n)) by choosing the shorter string for the row).

## longest-increasing-path-in-a-matrix
### Complexity
**Time, step by step** (R×C matrix, N = R·C)
1. Each cell's `dfs` result is computed once and memoised.
2. Computing it checks 4 neighbours → O(1) besides the (memoised) recursive calls.
3. The outer loop calls `dfs` on every cell, but repeated calls return in O(1).
4. Total: **O(R · C)**.

**Space:** memo table O(R·C) + recursion depth up to O(R·C) (a strictly increasing snake) → **O(R · C)**.

**Why memoisation is valid:** edges only go to strictly larger values, so the graph is a DAG and each cell's answer never depends on itself.

## distinct-subsequences
### Complexity
**Time:** |s| characters × |t| positions, each one comparison and maybe one addition → **O(|s| · |t|)**.

**Space:** one array of |t| + 1 → **O(|t|)**. Iterating j downward lets one array replace the full table.

## edit-distance
### Complexity
**Time, step by step** (m = |a|, n = |b|)
1. Base row with `iota`: O(n).
2. m rows × n columns, each a comparison plus a 3-way `min` → O(m · n).
3. Total: **O(m · n)**.

**Space:** two rows of n + 1 → **O(n)**. Keep the full table (O(m · n)) if you need to output the actual sequence of edits.

## burst-balloons
### Complexity
**Time, step by step** (n balloons → n + 2 with padding)
1. O(n²) intervals (l, r).
2. Each interval tries every k strictly between l and r: O(n).
3. Each try is O(1) (two table reads, one product).
4. Total: **O(n³)** — about 4·10⁷ operations for n = 300.

**Space:** the `dp` table → **O(n²)**.

## regular-expression-matching
### Complexity
**Time, step by step** (m = |s|, n = |p|)
1. (m + 1)(n + 1) states `dp[i][j]`.
2. Each state is O(1): at most two lookups (the zero-copies case and the one-more-copy case for `x*`).
3. Total: **O(m · n)**.

**Space:** the full table → **O(m · n)**. Only row i + 1 is needed to fill row i, so two rows → O(n).

**Comparison:** plain recursion is exponential on patterns like `a*a*a*a*…b`.
