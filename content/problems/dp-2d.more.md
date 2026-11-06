## unique-paths

### Walkthrough
**Goal:** count right/down paths from the top-left to the bottom-right of an m×n grid.

1. **State:** `dp[r][c]` = number of paths reaching cell (r, c).
2. **Recurrence:** the last move came from above or from the left → `dp[r][c] = dp[r−1][c] + dp[r][c−1]`.
3. **Base:** first row and first column are all 1.
4. **1-D optimisation:** keep one row; before updating `dp[c]` it still holds the value from the row above, and `dp[c−1]` already holds the current row's left neighbour.

**Dry run** m = 3, n = 3:

| row | dp after the row |
|---|---|
| 0 | [1, 1, 1] |
| 1 | [1, 2, 3] |
| 2 | [1, 3, 6] |

Answer **6** = C(4, 2).

## longest-common-subsequence

### Walkthrough
**Goal:** longest sequence of characters appearing in both strings in order (not necessarily contiguous).

1. **State:** `dp[i][j]` = LCS of `a[0..i)` and `b[0..j)`.
2. If the last characters match (`a[i−1] == b[j−1]`), they can both be the last LCS character → `dp[i−1][j−1] + 1`.
3. Otherwise one of them isn't in the LCS → `max(dp[i−1][j], dp[i][j−1])`.
4. Row 0 / column 0 = 0 (empty prefix).

**Dry run** `a = "abcde"`, `b = "ace"`:

|   | "" | a | c | e |
|---|---|---|---|---|
| "" | 0 | 0 | 0 | 0 |
| a | 0 | 1 | 1 | 1 |
| b | 0 | 1 | 1 | 1 |
| c | 0 | 1 | 2 | 2 |
| d | 0 | 1 | 2 | 2 |
| e | 0 | 1 | 2 | **3** |

LCS = "ace" (length 3). Reconstruct it by walking back from the bottom-right: diagonal on matches, otherwise towards the larger neighbour.

## best-time-to-buy-and-sell-stock-with-cooldown

### Walkthrough
**Goal:** max profit with unlimited trades, one-day cooldown after each sale.

1. Three states at the end of each day: **hold** (own a share), **sold** (sold today → cooldown tomorrow), **rest** (no share, free to buy).
2. Transitions:
   1. `hold = max(hold, rest − price)` — keep holding, or buy today (only allowed from `rest`).
   2. `sold = hold + price` — sell the share held yesterday.
   3. `rest = max(rest, sold_yesterday)` — stay idle, or finish the cooldown.
3. Answer `max(sold, rest)`.

**Dry run** `[1, 2, 3, 0, 2]`:

| day | price | hold | sold | rest |
|---|---|---|---|---|
| start | | −∞ | 0 | 0 |
| 0 | 1 | −1 | −∞ | 0 |
| 1 | 2 | −1 | 1 | 0 |
| 2 | 3 | −1 | 2 | 1 |
| 3 | 0 | 1 | −1 | 2 |
| 4 | 2 | 1 | 3 | 2 |

Answer **3** (buy 1, sell 2, cooldown, buy 0, sell 2).

## coin-change-ii

### Walkthrough
**Goal:** number of **combinations** (order doesn't matter) of coins summing to `amount`.

1. `dp[a]` = number of ways to make `a` using the coins processed so far. `dp[0] = 1`.
2. **Outer loop over coins**, inner over amounts ascending: `dp[a] += dp[a − coin]`.
3. Because each coin is fully processed before the next, every combination is built in one canonical coin order → no duplicates like (1,2) vs (2,1).
4. Ascending `a` allows reusing the same coin (unbounded).

**Dry run** `amount = 5`, `coins = [1, 2, 5]`:

| after coin | dp[0..5] |
|---|---|
| — | 1 0 0 0 0 0 |
| 1 | 1 1 1 1 1 1 |
| 2 | 1 1 2 2 3 3 |
| 5 | 1 1 2 2 3 **4** |

The 4 ways: 5, 2+2+1, 2+1+1+1, 1×5.

## target-sum

### Walkthrough
**Goal:** count sign assignments `±a₁ ± a₂ … = target`.

1. Let P = sum of numbers given `+`, N = sum given `−`. Then `P − N = target` and `P + N = total`.
2. Adding: `P = (total + target) / 2`. So count subsets with sum P (0/1 knapsack count).
3. If `|target| > total` or `total + target` is odd → 0.
4. `dp[s]` = number of subsets summing to s; for each x, iterate s **downward**: `dp[s] += dp[s − x]`.

**Dry run** `nums = [1, 1, 1, 1, 1]`, target 3 → total 5, P = 4:

| after x | dp[0..4] |
|---|---|
| — | 1 0 0 0 0 |
| 1 | 1 1 0 0 0 |
| 1 | 1 2 1 0 0 |
| 1 | 1 3 3 1 0 |
| 1 | 1 4 6 4 1 |
| 1 | 1 5 10 10 **5** |

Answer **5** (choose which one of the five 1s gets the minus sign).

## interleaving-string

### Walkthrough
**Goal:** can s3 be formed by merging s1 and s2 while keeping each one's order?

1. **State:** `dp[i][j]` = `s3[0..i+j)` is an interleaving of `s1[0..i)` and `s2[0..j)`.
2. The last character `s3[i+j−1]` came from s1 (needs `s1[i−1]` to match and `dp[i−1][j]`) or from s2 (`s2[j−1]` matches and `dp[i][j−1]`).
3. `dp[0][0] = true`. Answer `dp[m][n]`.

**Dry run** `s1 = "aab"`, `s2 = "axy"`, `s3 = "aaxaby"` — one successful path through the (i, j) grid:

| (i, j) | next char of s3 | taken from | reaches |
|---|---|---|---|
| (0,0) | a | s1[0] | (1,0) |
| (1,0) | a | s2[0] | (1,1) |
| (1,1) | x | s2[1] | (1,2) |
| (1,2) | a | s1[1] | (2,2) |
| (2,2) | b | s1[2] | (3,2) |
| (3,2) | y | s2[2] | (3,3) ✔ |

Note the dead end: from (1,0) taking `s1[1] = 'a'` leads to (2,0), where s3 needs `x` but s1 offers `b` and s2 offers `a`. The DP explores both options at once.

Greedy (always take from s1 when it matches) fails on inputs like this because both strings can offer the same character.

## longest-increasing-path-in-a-matrix

### Walkthrough
**Goal:** longest strictly increasing path moving up/down/left/right.

1. Moving only to strictly larger values means **no cycles** → the grid is a DAG → each cell's answer is fixed and can be memoised.
2. `dfs(r, c)` = 1 + max `dfs` over neighbours with a larger value (or 1 if none).
3. Memoise in `memo[r][c]`; no visited set needed (you can't loop back to a smaller value).
4. Answer = max over all cells.

**Dry run**

```text
9 9 4
6 6 8
2 1 1
```

| cell | value | larger neighbours | dfs |
|---|---|---|---|
| (0,0) | 9 | — | 1 |
| (1,0) | 6 | 9 | 2 |
| (2,0) | 2 | 6 | 3 |
| (2,1) | 1 | 2, 6 | **4** (1 → 2 → 6 → 9) |

## distinct-subsequences

### Walkthrough
**Goal:** number of ways to delete characters of `s` to obtain `t`.

1. **State:** `dp[i][j]` = ways to form `t[0..j)` from `s[0..i)`.
2. Character `s[i−1]` is either **not used** → `dp[i−1][j]`, or **used to match** `t[j−1]` (only if equal) → `dp[i−1][j−1]`.
3. `dp[i][0] = 1`: one way to form the empty string.
4. 1-D version: iterate `j` **downward** so `dp[j−1]` is still the previous row's value.

**Dry run** `s = "rabbbit"`, `t = "rabbit"` — the answer is **3**: the three ways choose which one of the three `b`s in "rab**bb**b" is dropped. In the table, the column for `t = "rab"` reaches 3 after the third `b` (C(3, 2) ways to pick 2 of 3 `b`s for "bb"), and that count flows through `i`, `t` unchanged.

## edit-distance

### Walkthrough
**Goal:** minimum insert/delete/replace operations to turn `a` into `b`.

1. **State:** `dp[i][j]` = edits to turn `a[0..i)` into `b[0..j)`.
2. **Base:** `dp[i][0] = i` (delete all), `dp[0][j] = j` (insert all).
3. If `a[i−1] == b[j−1]`: no cost → `dp[i−1][j−1]`.
4. Else 1 + min of: replace `dp[i−1][j−1]`, delete `dp[i−1][j]`, insert `dp[i][j−1]`.

**Dry run** `a = "horse"`, `b = "ros"`:

|   | "" | r | o | s |
|---|---|---|---|---|
| "" | 0 | 1 | 2 | 3 |
| h | 1 | 1 | 2 | 3 |
| o | 2 | 2 | 1 | 2 |
| r | 3 | 2 | 2 | 2 |
| s | 4 | 3 | 3 | 2 |
| e | 5 | 4 | 4 | **3** |

horse → rorse (replace h) → rose (delete r) → ros (delete e).

## burst-balloons

### Walkthrough
**Goal:** maximise coins where bursting `i` earns `left × i × right` using its *current* neighbours.

1. Pad with 1s at both ends: `a = [1, nums…, 1]`.
2. **State:** `dp[l][r]` = max coins from bursting every balloon strictly between `l` and `r` (both kept).
3. **Key idea:** choose `k` = the **last** balloon to burst in `(l, r)`. When it bursts, everything else between is gone, so its neighbours are exactly `a[l]` and `a[r]`:
   `dp[l][r] = max over k of dp[l][k] + a[l]·a[k]·a[r] + dp[k][r]`.
4. Fill by increasing interval length so sub-intervals are ready.

**Dry run** `nums = [3, 1, 5, 8]` → `a = [1,3,1,5,8,1]`. The optimal order bursts 1, 5, 3, 8:

| burst | neighbours | coins |
|---|---|---|
| 1 | 3, 5 | 15 |
| 5 | 3, 8 | 120 |
| 3 | 1, 8 | 24 |
| 8 | 1, 1 | 8 |

Total **167** = `dp[0][5]`, with 8 chosen as the last balloon.

## regular-expression-matching

### Walkthrough
**Goal:** does pattern `p` (with `.` and `*`) match **all** of `s`?

1. **State:** `dp[i][j]` = `s[i..]` matches `p[j..]`. `dp[m][n] = true` (both empty).
2. `first` = `s[i]` exists and equals `p[j]` or `p[j]` is `.`.
3. If `p[j+1] == '*'` (the pair `x*`):
   1. Use it **zero** times → `dp[i][j+2]`.
   2. Or use it **once more** (only if `first`) and stay on the same pattern position → `dp[i+1][j]`.
4. Otherwise: `first && dp[i+1][j+1]`.
5. Fill from the bottom-right (suffixes) towards (0, 0).

**Dry run** `s = "aab"`, `p = "c*a*b"`:

| (i, j) | pattern at j | decision |
|---|---|---|
| (0, 0) | c* | 'a' ≠ 'c' → zero copies → (0, 2) |
| (0, 2) | a* | 'a' matches → (1, 2) |
| (1, 2) | a* | 'a' matches → (2, 2) |
| (2, 2) | a* | 'b' ≠ 'a' → zero copies → (2, 4) |
| (2, 4) | b | match → (3, 5) = both empty → **true** |
