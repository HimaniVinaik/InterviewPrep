## climbing-stairs
### Complexity
**Time:** the loop runs n − 1 times with one addition each → **O(n)**.

**Space:** two variables → **O(1)**.

**DP progression:**

| version | time | space |
|---|---|---|
| plain recursion | O(φⁿ) ≈ O(1.618ⁿ) | O(n) stack |
| memoisation | O(n) | O(n) memo + O(n) stack |
| tabulation | O(n) | O(n) |
| two variables | O(n) | **O(1)** |
| matrix power | O(log n) | O(1) |

## min-cost-climbing-stairs
### Complexity
**Time:** n − 1 iterations with one `min` each → **O(n)**.

**Space:** two rolling values → **O(1)**.

## house-robber
### Complexity
**Time:** one pass with one `max` per house → **O(n)**.

**Space:** `prev1`, `prev2` → **O(1)**. The recurrence only looks back two steps, so only two values need to be kept.

## house-robber-ii
### Complexity
**Time:** two linear House Robber passes over n − 1 houses each → 2(n − 1) → **O(n)**.

**Space:** **O(1)** per pass.

## longest-palindromic-substring
### Complexity
**Time, step by step**
1. There are 2n − 1 centres (n characters plus n − 1 gaps).
2. Expansion from a centre takes at most O(n) steps (bounded by the distance to the nearer end).
3. Worst case "aaaa…a": the expansions sum to about n²/2 → **O(n²)**.
4. `substr` at the end: O(answer length).

**Space:** a few indices → **O(1)** (output excluded).

**Comparison:** DP table O(n²) time and **O(n²)** space; Manacher's algorithm O(n) time.

## palindromic-substrings
### Complexity
**Time:** 2n − 1 centres × up to O(n) expansion each → **O(n²)** (tight for all-equal strings, where the answer itself is n(n+1)/2).

**Space:** **O(1)**.

## decode-ways
### Complexity
**Time:** one pass; each step does a constant number of comparisons and additions → **O(n)**.

**Space:** two rolling values → **O(1)**.

## coin-change
### Complexity
**Time, step by step** (A = amount, c = number of coins)
1. Initialising `dp` of size A + 1: O(A).
2. Double loop: A amounts × c coins, each O(1) → O(A · c).
3. Total: **O(A · c)**. This is *pseudo-polynomial*: polynomial in the value of A, not in its number of digits.

**Space:** the `dp` array → **O(A)**.

## maximum-product-subarray
### Complexity
**Time:** one pass; per element a conditional swap and three `min`/`max` operations → **O(n)**.

**Space:** `mx`, `mn`, `best` → **O(1)**.

## word-break
### Complexity
**Time, step by step** (n = |s|, W = dictionary size, L = max word length)
1. Outer loop over i = 1..n.
2. Inner loop over W words.
3. `s.compare(i − L, L, w)` costs O(L) (no substring allocation).
4. Total: **O(n · W · L)**.

**Space:** `dp` of n + 1 booleans → **O(n)**.

**Alternative:** put the words in a hash set and try every split length up to L: O(n · L²) (L lengths × O(L) hashing) — better when W is large.

## longest-increasing-subsequence
### Complexity
**Time, step by step**
1. n iterations.
2. Each does one `lower_bound` on `tails` (size ≤ current LIS length ≤ n): O(log n).
3. Then a push or an overwrite: amortised O(1).
4. Total: **O(n log n)**.

**Space:** `tails` holds at most n values → **O(n)**.

**Comparison:** the classic DP is O(n²) time and O(n) space.

## partition-equal-subset-sum
### Complexity
**Time, step by step** (n numbers, S = total sum, target = S/2)
1. Summing: O(n).
2. For each of the n numbers, the inner loop runs over at most S/2 sums → O(n · S/2).
3. Total: **O(n · S)** — pseudo-polynomial (the problem caps S at 2·10⁴).

**Space:** one `dp` array of S/2 + 1 entries → **O(S)**. Iterating downward is what lets one array replace the full n × S table.

**Speed-up:** the `bitset` version processes 64 sums per machine word → O(n · S / 64).
