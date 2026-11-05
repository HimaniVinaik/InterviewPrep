## binary-search
### Complexity
**Time, step by step**
1. The search range `[lo, hi)` starts with n elements.
2. Each iteration computes `mid` and either returns or replaces the range with one half: the new size is at most ⌈size/2⌉.
3. After k iterations the size is ≤ n / 2ᵏ; it reaches 0 when 2ᵏ > n, i.e. k > log₂ n.
4. Total: ⌊log₂ n⌋ + 1 iterations → **O(log n)**. For n = 10⁶ that's at most 20 comparisons.

**Space:** `lo`, `hi`, `mid` → **O(1)** (the recursive version uses O(log n) stack).

## search-a-2d-matrix
### Complexity
**Time, step by step** (m rows, n columns)
1. One binary search over m·n virtual indices.
2. Each iteration: one division and one modulo to map index → (row, col), O(1).
3. Iterations: ⌈log₂(m·n)⌉ = log m + log n.
4. Total: **O(log(m·n))**.

**Space:** **O(1)**.

**Comparison:** the staircase search is O(m + n) — worse here, but it works when only rows and columns are sorted individually (LC 240).

## koko-eating-bananas
### Complexity
**Time, step by step** (n piles, M = max pile)
1. `max_element`: O(n).
2. Binary search over speeds 1..M: ⌈log₂ M⌉ iterations (≈ 30 for M = 10⁹).
3. Each iteration computes `hours(mid)`: one O(1) division per pile → O(n).
4. Total: O(n) + O(n · log M) = **O(n log M)**.

**Space:** **O(1)**.

**Why binary search is valid:** `hours(k)` is non-increasing in k, so the feasible speeds form a suffix `[answer, M]` — a monotonic predicate.

## find-minimum-in-rotated-sorted-array
### Complexity
**Time, step by step**
1. Range `[lo, hi]` starts with n elements.
2. Each iteration sets `lo = mid + 1` or `hi = mid`, at least halving the range (rounding).
3. Total: **O(log n)** iterations of O(1) work.

**Space:** **O(1)**.

**Duplicates caveat:** with repeated values (LC 154) the `nums[mid] == nums[hi]` case can only shrink by one (`--hi`), degrading to O(n) worst case (e.g. `[1,1,1,…,0,1]`).

## search-in-rotated-sorted-array
### Complexity
**Time, step by step**
1. Each iteration identifies one sorted half in O(1) (compare `a[lo]` and `a[mid]`).
2. It checks whether the target lies in that half's range in O(1), then discards the other half.
3. The range halves every iteration → **O(log n)**.

**Space:** **O(1)**.

## time-based-key-value-store
### Complexity
**Time, step by step** (n = versions stored for a key, L = key length)
- **set:** hash the key O(L) + `emplace_back` amortised O(1) → **O(L)**, i.e. O(1) for bounded keys.
- **get:** hash the key O(L) + `upper_bound` over that key's versions O(log n) + string copy of the value O(|value|) → **O(L + log n)**.

**Space, step by step**
- Every `set` stores one (timestamp, value) pair → O(total sets × value size).
- Keys stored once each.
- Total: **O(N)** for N stored versions (values' lengths included).

## median-of-two-sorted-arrays
### Complexity
**Time, step by step** (m = smaller size, n = larger size)
1. Swapping so A is the smaller array: O(1) (vectors swap their internal pointers).
2. Binary search over `i ∈ [0, m]`: ⌈log₂(m + 1)⌉ iterations.
3. Each iteration: compute `j`, read four boundary values (with sentinels), two comparisons → O(1).
4. Total: **O(log min(m, n))**.

**Space:** **O(1)**.

**Why search the smaller array?** It minimises iterations **and** guarantees `j = half − i` stays within `[0, n]` for every `i ∈ [0, m]`.

**Comparison:** merging is O(m + n); the k-th-element recursion is O(log(m + n)).
