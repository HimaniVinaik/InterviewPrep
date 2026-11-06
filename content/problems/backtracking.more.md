## subsets

### Walkthrough
**Goal:** every combination of include/exclude.

1. `bt(start)`: the current `cur` is itself a valid subset → record it first.
2. Then try extending with each element at index `i ≥ start` (only later elements, so each subset is generated once in increasing-index order).
3. Choose `nums[i]`, recurse with `start = i + 1`, then un-choose.

**Recursion tree for `[1, 2, 3]`** (each node records `cur`):

```text
[]
├── [1]
│   ├── [1,2]
│   │   └── [1,2,3]
│   └── [1,3]
├── [2]
│   └── [2,3]
└── [3]
```

8 subsets = 2³. Recording at **every** node (not just leaves) is what distinguishes subsets from combinations of fixed size.

## combination-sum

### Walkthrough
**Goal:** all multisets of candidates summing to target, each multiset once.

1. Sort candidates so we can stop early once a candidate exceeds the remainder.
2. `bt(start, rem)`: try each candidate `candidates[i]` with `i ≥ start`.
3. Recurse with **`i` (not `i + 1`)** — the same number may be used again.
4. Passing `start` forbids going back to smaller indices, so `[2,3]` and `[3,2]` can't both appear.
5. `rem == 0` → record.

**Dry run** `[2, 3, 6, 7]`, target 7:

```text
rem 7: try 2 → rem 5: try 2 → rem 3: try 2 → rem 1: 2 > 1 stop
                                    try 3 → rem 0 ✔ [2,2,3]
                       try 3 → rem 2: 3 > 2 stop
       try 3 → rem 4: try 3 → rem 1: stop
       try 6 → rem 1: stop
       try 7 → rem 0 ✔ [7]
```

## permutations

### Walkthrough
**Goal:** every ordering.

1. `bt(i)`: positions `0..i−1` are fixed; choose what goes at position `i`.
2. For each `j ≥ i`, swap `nums[j]` into position `i`, recurse on `i + 1`, swap back.
3. At `i == n`, `nums` is a complete permutation → record.

**Dry run** `[1, 2, 3]`:

| fix pos 0 | fix pos 1 | result |
|---|---|---|
| 1 (j=0) | 2 / 3 | [1,2,3], [1,3,2] |
| 2 (swap 0,1) | 1 / 3 | [2,1,3], [2,3,1] |
| 3 (swap 0,2) | 2 / 1 | [3,2,1], [3,1,2] |

3! = 6 permutations. The swap-back is essential: it restores the array before the next choice.

## subsets-ii

### Walkthrough
**Goal:** subsets of a multiset with no repeats.

1. **Sort** so equal values are adjacent.
2. Same backtracking as Subsets, plus: at a given recursion level, skip `nums[i]` if `i > start` and `nums[i] == nums[i − 1]`.
3. Meaning: among equal siblings, only the **first** may start a branch. Deeper levels may still take the second copy (because there `i == start`).

**Dry run** `[1, 2, 2]`:

```text
[]
├── [1]
│   ├── [1,2]
│   │   └── [1,2,2]
│   └── (skip second 2 at this level)
├── [2]
│   └── [2,2]
└── (skip second 2 at root level)
```

Result: `[], [1], [1,2], [1,2,2], [2], [2,2]` — 6 unique subsets.

## combination-sum-ii

### Walkthrough
**Goal:** each candidate used at most once, no duplicate combinations.

1. Sort.
2. `bt(start, rem)`: loop `i` from `start`.
   1. Break when `candidates[i] > rem` (sorted → all later are bigger).
   2. Skip if `i > start && candidates[i] == candidates[i−1]` (same value already tried at this level).
   3. Choose `candidates[i]`, recurse with `i + 1` (use once), un-choose.

**Dry run** `[10,1,2,7,6,1,5]` → sorted `[1,1,2,5,6,7,10]`, target 8:

| path | result |
|---|---|
| 1 → 1 → 6 | ✔ [1,1,6] |
| 1 → 2 → 5 | ✔ [1,2,5] |
| 1 → 7 | ✔ [1,7] |
| second 1 at root | skipped (duplicate level) |
| 2 → 6 | ✔ [2,6] |

## word-search

### Walkthrough
**Goal:** a path of adjacent cells spelling `word`, no cell reused.

1. Try every cell as the starting point.
2. `dfs(r, c, i)`: does the path starting here match `word[i..]`?
   1. `i == word.size()` → whole word matched.
   2. Out of bounds or `board[r][c] != word[i]` → fail.
   3. Mark the cell (`'#'`), recurse into 4 neighbours with `i + 1`, restore the cell.
3. Short-circuit `||` stops as soon as one direction succeeds.

**Dry run** board `ABCE / SFCS / ADEE`, word `"ABCCED"`:

| i | cell | letter | next tried |
|---|---|---|---|
| 0 | (0,0) | A | right |
| 1 | (0,1) | B | right |
| 2 | (0,2) | C | down |
| 3 | (1,2) | C | down |
| 4 | (2,2) | E | left |
| 5 | (2,1) | D | i = 6 → **true** |

## palindrome-partitioning

### Walkthrough
**Goal:** split `s` into pieces that are all palindromes; list every way.

1. Precompute `pal[i][j]` (is `s[i..j]` a palindrome?) with DP: `s[i] == s[j]` and the inside `[i+1, j−1]` is a palindrome (or length ≤ 2). Fill `i` from right to left so `pal[i+1][j−1]` is ready.
2. `bt(start)`: choose the end of the next piece; only recurse if `pal[start][end]`.
3. `start == n` → a full partition.

**Dry run** `"aab"`:

```text
start 0: "a"  → start 1: "a" → start 2: "b" ✔ [a, a, b]
                       "ab" ✗
         "aa" → start 2: "b" ✔ [aa, b]
         "aab" ✗
```

## letter-combinations-of-a-phone-number

### Walkthrough
**Goal:** cartesian product of each digit's letters.

1. One recursion level per digit.
2. At level `i`, loop over the letters of `digits[i]`, append, recurse to `i + 1`, pop.
3. `i == digits.size()` → record.

**Dry run** `"23"`:

| level 0 (2) | level 1 (3) | outputs |
|---|---|---|
| a | d, e, f | ad, ae, af |
| b | d, e, f | bd, be, bf |
| c | d, e, f | cd, ce, cf |

9 = 3 × 3 combinations.

## n-queens

### Walkthrough
**Goal:** one queen per row; no two share a column or diagonal.

1. Place queens row by row (`bt(r)`), so rows never conflict.
2. For row `r`, try each column `c` that is free in three sets:
   1. `col[c]` — column used.
   2. `diag[r + c]` — "/" anti-diagonal: all cells on it share `r + c`.
   3. `anti[r − c + n]` — "\" diagonal: share `r − c` (offset by n to keep the index ≥ 0).
3. Place, recurse to `r + 1`, then remove (backtrack).
4. `r == n` → all queens placed → record the board.

**Dry run n = 4** (first solution found):

| row | column tried | outcome |
|---|---|---|
| 0 | 0 | place |
| 1 | 2 | place |
| 2 | — | every column attacked → backtrack |
| 1 | 3 | place |
| 2 | 1 | place |
| 3 | — | dead end → backtrack… |
| 0 | 1 | place |
| 1 | 3 | place |
| 2 | 0 | place |
| 3 | 2 | place → **solution `.Q.. / ...Q / Q... / ..Q.`** |

n = 4 has 2 solutions; n = 8 has 92.
