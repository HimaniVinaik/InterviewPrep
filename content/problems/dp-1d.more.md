## climbing-stairs

### Walkthrough
**Goal:** count step sequences of 1s and 2s that sum to n.

1. **State:** `ways(i)` = number of ways to reach step i.
2. **Recurrence:** the final move into step i came from i−1 (a 1-step) or i−2 (a 2-step), so `ways(i) = ways(i−1) + ways(i−2)`.
3. **Base:** `ways(0) = 1` (one way: do nothing), `ways(1) = 1`.
4. Only the two previous values are needed → two variables.

**Dry run** n = 5:

| i | a (i−2) | b (i−1) | ways(i) |
|---|---|---|---|
| 2 | 1 | 1 | 2 |
| 3 | 1 | 2 | 3 |
| 4 | 2 | 3 | 5 |
| 5 | 3 | 5 | **8** |

The DP progression shown here (recursion → memo → table → O(1) space) is the template for every DP problem in this section.

## min-cost-climbing-stairs

### Walkthrough
**Goal:** cheapest way to get past the last stair.

1. **State:** `dp[i]` = minimum cost to *arrive* at step i (before paying for it). The top is index n.
2. You start on step 0 or 1 for free: `dp[0] = dp[1] = 0`.
3. **Recurrence:** arrive at i from i−1 (paying `cost[i−1]`) or from i−2 (paying `cost[i−2]`).
4. Answer `dp[n]`; only the last two values are needed.

**Dry run** `cost = [10, 15, 20]`:

| i | from i−1 | from i−2 | dp[i] |
|---|---|---|---|
| 0 | | | 0 |
| 1 | | | 0 |
| 2 | 0 + 15 | 0 + 10 | 10 |
| 3 (top) | 10 + 20 | 0 + 15 | **15** |

Start on step 1, pay 15, jump two to the top.

## house-robber

### Walkthrough
**Goal:** max sum of non-adjacent elements.

1. **State:** `dp[i]` = best loot considering houses 0..i.
2. **Choice at house i:** skip it → `dp[i−1]`; rob it → `dp[i−2] + nums[i]` (house i−1 must be skipped).
3. `dp[i] = max(dp[i−1], dp[i−2] + nums[i])`; keep two rolling variables.

**Dry run** `[2, 7, 9, 3, 1]`:

| house | value | prev2 | prev1 | cur = max(prev1, prev2 + value) |
|---|---|---|---|---|
| 0 | 2 | 0 | 0 | 2 |
| 1 | 7 | 0 | 2 | 7 |
| 2 | 9 | 2 | 7 | 11 |
| 3 | 3 | 7 | 11 | 11 |
| 4 | 1 | 11 | 11 | **12** |

Rob houses 0, 2, 4: 2 + 9 + 1 = 12.

## house-robber-ii

### Walkthrough
**Goal:** House Robber on a circle — houses 0 and n−1 are neighbours.

1. Any valid plan skips house 0 **or** skips house n−1 (it can't rob both).
2. So the answer is `max(rob(0..n−2), rob(1..n−1))`, each a linear House Robber.
3. Special case n = 1: just that house.

**Dry run** `[2, 3, 2]`:

| range | linear best |
|---|---|
| [2, 3] (exclude last) | 3 |
| [3, 2] (exclude first) | 3 |

Answer **3** (robbing houses 0 and 2 = 4 is illegal: they're adjacent on the circle).

## longest-palindromic-substring

### Walkthrough
**Goal:** longest palindrome by expanding around every possible centre.

1. A palindrome mirrors around its centre: a character (odd length) or a gap between two characters (even length) → `2n − 1` centres.
2. For each centre, expand `l--, r++` while the ends match.
3. When the expansion stops, the palindrome is `s[l+1 .. r−1]`, length `r − l − 1`.
4. Keep the longest.

**Dry run** `"babad"` (odd centres):

| centre | expands to | length |
|---|---|---|
| b (0) | "b" | 1 |
| a (1) | "bab" | 3 |
| b (2) | "aba" | 3 |
| a (3) | "a" (b≠d) | 1 |

Even centres all have length 0 here. Answer **"bab"** (or "aba").

## palindromic-substrings

### Walkthrough
**Goal:** count all palindromic substrings (by position).

1. Every palindrome has a unique centre. Expand from each of the `2n − 1` centres.
2. **Each successful expansion step is one more palindrome**, so increment the count inside the loop.

**Dry run** `"aaa"`:

| centre | palindromes found | count |
|---|---|---|
| a (0) | "a" | 1 |
| gap 0-1 | "aa" | 2 |
| a (1) | "a", "aaa" | 4 |
| gap 1-2 | "aa" | 5 |
| a (2) | "a" | **6** |

## decode-ways

### Walkthrough
**Goal:** count decodings where `1..26` map to letters.

1. **State:** `dp[i]` = ways to decode the first `i` characters. `dp[0] = 1` (empty string).
2. **Single digit:** if `s[i−1] != '0'`, it decodes alone → add `dp[i−1]`.
3. **Two digits:** if `s[i−2..i−1]` is between 10 and 26 → add `dp[i−2]`.
4. Keep only the last two values.

**Dry run** `"226"`:

| i | one digit | two digits | dp[i] |
|---|---|---|---|
| 0 | | | 1 |
| 1 | "2" ✔ +1 | — | 1 |
| 2 | "2" ✔ +1 | "22" ✔ +1 | 2 |
| 3 | "6" ✔ +2 | "26" ✔ +1 | **3** |

Decodings: "BZ" (2,26), "VF" (22,6), "BBF" (2,2,6). With `"06"`: dp[1] = 0 (leading zero) → answer 0.

## coin-change

### Walkthrough
**Goal:** minimum coins to make `amount` (unlimited coins).

1. **State:** `dp[a]` = fewest coins for amount `a`. `dp[0] = 0`; all others start at "infinity" (`amount + 1`, larger than any real answer and overflow-safe).
2. **Transition:** for each coin `c ≤ a`: `dp[a] = min(dp[a], dp[a − c] + 1)` — the last coin used was `c`.
3. Answer `dp[amount]`, or −1 if still infinity.

**Dry run** `coins = [1, 2, 5]`, amount 11 (selected entries):

| a | candidates (coin → dp[a−c]+1) | dp[a] |
|---|---|---|
| 1 | 1 → 1 | 1 |
| 2 | 1 → 2, 2 → 1 | 1 |
| 3 | 1 → 2, 2 → 2 | 2 |
| 5 | 5 → 1 | 1 |
| 6 | 1 → 2, 5 → 2 | 2 |
| 10 | 5 → 2 | 2 |
| 11 | 1 → 3, 2 → 4, 5 → 3 | **3** |

## maximum-product-subarray

### Walkthrough
**Goal:** max product of a contiguous subarray; negatives can flip a small product into a large one.

1. Track **both** the max and min product of subarrays ending at the current index.
2. When `x < 0`, multiplying swaps roles: the old min becomes the new max candidate → `swap(mx, mn)` first.
3. `mx = max(x, mx·x)`, `mn = min(x, mn·x)` — "start fresh at x" handles zeros naturally.
4. `best = max(best, mx)`.

**Dry run** `[2, 3, −2, 4, −1]`:

| x | swap? | mx | mn | best |
|---|---|---|---|---|
| 2 | | 2 | 2 | 2 |
| 3 | | 6 | 3 | 6 |
| −2 | yes | −2 | −12 | 6 |
| 4 | | 4 | −48 | 6 |
| −1 | yes | 48 | −4 | **48** |

The whole array: 2·3·(−2)·4·(−1) = 48.

## word-break

### Walkthrough
**Goal:** can `s` be split into dictionary words?

1. **State:** `dp[i]` = the prefix `s[0..i)` can be segmented. `dp[0] = true`.
2. **Transition:** `dp[i]` is true if some word `w` ends at `i` (i.e. `s` has `w` at position `i − |w|`) and `dp[i − |w|]` is true.
3. Answer `dp[n]`.

**Dry run** `s = "leetcode"`, dict {leet, code}:

| i | prefix | matching word ending here | dp[i] |
|---|---|---|---|
| 0 | "" | | T |
| 4 | "leet" | leet, dp[0] = T | **T** |
| 8 | "leetcode" | code, dp[4] = T | **T** |

All other `dp[i]` are false. Answer **true**.

## longest-increasing-subsequence

### Walkthrough
**Goal:** length of the longest strictly increasing subsequence in O(n log n).

1. Maintain `tails`, where `tails[k]` = the **smallest possible tail value** of an increasing subsequence of length `k + 1` seen so far. `tails` is always sorted.
2. For each `x`, binary search the first tail `≥ x` (`lower_bound`):
   1. None → `x` extends the longest subsequence → append.
   2. Found → replace it with `x` (same length, smaller tail = more room to extend later).
3. The answer is `tails.size()` (note: `tails` itself is not necessarily a valid subsequence).

**Dry run** `[10, 9, 2, 5, 3, 7, 101, 18]`:

| x | lower_bound | tails after |
|---|---|---|
| 10 | end | [10] |
| 9 | 10 → replace | [9] |
| 2 | 9 → replace | [2] |
| 5 | end | [2, 5] |
| 3 | 5 → replace | [2, 3] |
| 7 | end | [2, 3, 7] |
| 101 | end | [2, 3, 7, 101] |
| 18 | 101 → replace | [2, 3, 7, 18] |

Answer **4** (e.g. 2, 3, 7, 18).

## partition-equal-subset-sum

### Walkthrough
**Goal:** a subset summing to exactly half the total (0/1 knapsack).

1. Odd total → impossible.
2. **State:** `dp[s]` = some subset of the items processed so far sums to `s`. `dp[0] = true`.
3. For each number `x`, for `s` from `target` **down to** `x`: `dp[s] |= dp[s − x]`.
4. **Why downward?** Going down guarantees `dp[s − x]` still describes subsets *without* `x`, so each item is used at most once. Going upward would let `x` be reused (unbounded knapsack).

**Dry run** `[1, 5, 11, 5]`, target 11 (true sums listed):

| after x | reachable sums |
|---|---|
| — | {0} |
| 1 | {0, 1} |
| 5 | {0, 1, 5, 6} |
| 11 | {0, 1, 5, 6, 11} ← target reached |
| 5 | {…, 10, 11} |

Answer **true** ({11} vs {1, 5, 5}).
