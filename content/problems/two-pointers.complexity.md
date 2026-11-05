## valid-palindrome
### Complexity
**Time, step by step** (n = length of s)
1. `l` only moves right, `r` only moves left, and they stop when they meet.
2. Every index is visited by exactly one pointer at most once — skipping non-alphanumerics included.
3. Each step: `isalnum`/`tolower` O(1).
4. Total: **O(n)**.

**Space:** two indices and a lambda → **O(1)**. (The string parameter is a by-value copy on LeetCode — O(n) — avoidable with `const string&`.)

## two-sum-ii-input-array-is-sorted
### Complexity
**Time, step by step**
1. Initially `r − l = n − 1`.
2. Each iteration either returns or decreases `r − l` by exactly 1 (`++l` or `--r`).
3. So at most n − 1 iterations, each O(1).
4. Total: **O(n)**.

**Space:** `l`, `r`, `sum` → **O(1)**.

**Comparison:** binary search per element is O(n log n); hashing is O(n) time but O(n) space — the two-pointer version is optimal in both.

## 3sum
### Complexity
**Time, step by step**
1. Sorting: O(n log n).
2. Outer loop: at most n − 2 anchors.
3. For each anchor, the two-pointer scan moves `l` and `r` toward each other: O(n) per anchor (duplicate-skipping moves pointers too, so it stays within the same bound).
4. Total: O(n log n) + O(n · n) = **O(n²)**.

**Space, step by step**
- Sorting in place: O(log n) recursion stack for introsort.
- Output: up to O(n²) triplets in theory (not counted as extra).
- Extra: **O(log n)** (or O(1) ignoring the sort).

**Lower bound note:** 3Sum is conjectured to require roughly n² time (the "3SUM-hard" class), so O(n²) is essentially optimal.

## container-with-most-water
### Complexity
**Time, step by step**
1. `r − l` starts at n − 1 and shrinks by 1 each iteration.
2. Each iteration: one `min`, one multiplication, one comparison → O(1).
3. Total: **O(n)**.

**Space:** **O(1)**.

**Why correct in O(n)?** Each move permanently discards the shorter line, which provably can't form a larger container with any remaining partner — so skipping it never loses the optimum.

## trapping-rain-water
### Complexity
**Time, step by step**
1. Each iteration moves exactly one pointer inward by one: at most n − 1 iterations.
2. Each iteration: a comparison, a `max`, an addition → O(1).
3. Total: **O(n)**.

**Space, step by step**
- `l`, `r`, `leftMax`, `rightMax`, `water` → **O(1)**.

**Comparison:** prefix/suffix arrays use the same O(n) time but O(n) space; the monotonic stack is O(n) time and O(n) space; brute force is O(n²).

## move-zeroes
### Complexity
**Time, step by step**
1. `read` visits every index once: n iterations.
2. Each non-zero causes one swap (3 moves); zeros cost a comparison only.
3. Total: **O(n)**; number of writes ≤ 3 × (number of non-zeros).

**Space:** `read`, `write` → **O(1)**.

**Write-count optimisation:** if writes are expensive (e.g. flash memory), the "compact then fill" version writes each non-zero once plus each trailing zero once — n writes total — versus up to 3·(non-zeros) for swaps.
