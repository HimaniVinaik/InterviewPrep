## rotate-image
### Complexity
**Time, step by step** (n×n matrix)
1. Transpose: swaps every pair (i, j) with j > i → n(n−1)/2 swaps → O(n²).
2. Reverse each of the n rows: n/2 swaps per row → n²/2 swaps → O(n²).
3. Total: **O(n²)** — optimal, since every cell has to move.

**Space:** in-place swaps → **O(1)**.

## spiral-matrix
### Complexity
**Time:** every element is appended exactly once; the boundary bookkeeping is O(1) per side → **O(R · C)**.

**Space:** four boundary integers → **O(1)** extra (the output holds R·C values).

**Comparison:** the direction + `visited` simulation is also O(R·C) time but needs O(R·C) extra space.

## set-matrix-zeroes
### Complexity
**Time, step by step**
1. Marking pass: visits every cell once → O(R·C).
2. Zeroing pass: visits every cell once → O(R·C).
3. Total: **O(R · C)**.

**Space:** the first row and first column are reused as marker storage, plus one boolean → **O(1)**.

**Comparison:** separate row/column marker arrays cost O(R + C); copying the matrix costs O(R·C).

## happy-number
### Complexity
**Time, step by step**
1. `next(n)` costs O(log n) (one step per digit).
2. For any 32-bit n, `next(n)` ≤ 10 · 9² = 810, so after one step every value is below 1000 (three digits).
3. From there the sequence stays small and enters a cycle (or reaches 1) within a bounded number of steps; Floyd's algorithm detects this within a constant multiple of the tail + cycle length.
4. Total: **O(log n)** — dominated by the first step.

**Space:** `slow`, `fast` → **O(1)** (the hash-set version stores every value seen, which is a bounded number in practice).

## plus-one
### Complexity
**Time:**
- Best case (last digit < 9): **O(1)**.
- Worst case (all 9s): n digits zeroed, then an insert at the front (shifting n elements) → **O(n)**.

**Space:** in place → **O(1)** extra, except the one-time growth by a single digit for all-9s input.

## powx-n
### Complexity
**Time, step by step**
1. Converting n to `long long` and handling the sign: O(1).
2. The loop runs once per bit of |n|: ⌊log₂ |n|⌋ + 1 ≤ 32 iterations.
3. Each iteration: at most two multiplications.
4. Total: **O(log |n|)** — at most 64 multiplications instead of up to 2³¹.

**Space:** **O(1)** (the recursive version uses O(log n) stack).

## multiply-strings
### Complexity
**Time, step by step** (m, n = digit counts)
1. The double loop processes every digit pair: m · n multiplications and additions, each O(1).
2. Building the result string: O(m + n).
3. Total: **O(m · n)**.

**Space:** the `pos` array of m + n digits → **O(m + n)**.

**Faster in theory:** Karatsuba O(n^1.585), FFT-based O(n log n) — used by big-integer libraries for very long numbers.

## detect-squares
### Complexity
**Time, step by step** (p = distinct points stored)
- **add:** one `map` increment → **O(log p)**.
- **count:**
  1. Iterates all p distinct points as diagonal candidates: O(p).
  2. Each valid candidate does two `map` lookups: O(log p).
  3. Total: **O(p log p)**.

**Space:** the count map → **O(p)**.

**Improvement:** grouping points by x-coordinate and only iterating points on the query's vertical line shrinks each query to O(points sharing that x).
