## binary-search

### Walkthrough
**Goal:** halve the candidate range every step using sortedness.

1. Half-open range `[lo, hi)` = indices that might still hold `target`. Start `[0, n)`.
2. `mid = lo + (hi − lo)/2` (no overflow, unlike `(lo + hi)/2`).
3. `nums[mid] == target` → found.
4. `nums[mid] < target` → target is strictly right → `lo = mid + 1`.
5. `nums[mid] > target` → target is left of mid → `hi = mid` (mid excluded because `hi` is exclusive).
6. Empty range (`lo == hi`) → not present.

**Dry run** `[-1, 0, 3, 5, 9, 12]`, target 9:

| lo | hi | mid | nums[mid] | action |
|---|---|---|---|---|
| 0 | 6 | 3 | 5 | < 9 → lo = 4 |
| 4 | 6 | 5 | 12 | > 9 → hi = 5 |
| 4 | 5 | 4 | 9 | **found → 4** |

**Two conventions — pick one and never mix:**

| | half-open `[lo, hi)` | closed `[lo, hi]` |
|---|---|---|
| init | `hi = n` | `hi = n − 1` |
| loop | `lo < hi` | `lo <= hi` |
| go left | `hi = mid` | `hi = mid − 1` |

## search-a-2d-matrix

### Walkthrough
**Goal:** treat the m×n matrix as one sorted array of length m·n.

1. Search indices `[0, m·n)`.
2. Map a flat index `k` to `(k / n, k % n)` — row-major order, exactly how C lays out `int a[m][n]`.
3. Standard binary search on that virtual array.

**Dry run** `M = [[1,3,5,7],[10,11,16,20],[23,30,34,60]]`, target 3 (n = 4):

| lo | hi | mid | (r, c) | value | action |
|---|---|---|---|---|---|
| 0 | 12 | 6 | (1, 2) | 16 | > 3 → hi = 6 |
| 0 | 6 | 3 | (0, 3) | 7 | > 3 → hi = 3 |
| 0 | 3 | 1 | (0, 1) | 3 | **found** |

## koko-eating-bananas

### Walkthrough
**Goal:** smallest `k` such that `hours(k) ≤ h`. `hours(k)` only decreases as `k` grows → **monotonic** → binary search on the answer.

1. Answer range: `k ∈ [1, max(piles)]` (eating faster than the biggest pile never helps).
2. `hours(k) = Σ ceil(p / k)`, with integer ceiling `(p + k − 1) / k`.
3. If `hours(mid) ≤ h`, `mid` works — the answer is `mid` or smaller → `hi = mid`.
4. Otherwise too slow → `lo = mid + 1`.
5. Loop ends when `lo == hi` = the first feasible speed.

**Dry run** `piles = [3, 6, 7, 11]`, `h = 8`:

| lo | hi | mid | hours(mid) | feasible? |
|---|---|---|---|---|
| 1 | 11 | 6 | 1+1+2+2 = 6 | yes → hi = 6 |
| 1 | 6 | 3 | 1+2+3+4 = 10 | no → lo = 4 |
| 4 | 6 | 5 | 1+2+2+3 = 8 | yes → hi = 5 |
| 4 | 5 | 4 | 1+2+2+3 = 8 | yes → hi = 4 |

Answer **4**.

## find-minimum-in-rotated-sorted-array

### Walkthrough
**Goal:** find the rotation point — where the array "drops".

1. A rotated array is two sorted runs: a left run of larger values, then a right run of smaller values. The min is the first element of the right run.
2. Compare `nums[mid]` with `nums[hi]`:
   1. `nums[mid] > nums[hi]` → mid is in the left run; the drop is strictly right → `lo = mid + 1`.
   2. otherwise mid is in the right run (or the array is sorted); the min is at mid or left → `hi = mid`.
3. When `lo == hi`, it points at the minimum.

**Dry run** `[4, 5, 6, 7, 0, 1, 2]`:

| lo | hi | mid | nums[mid] vs nums[hi] | action |
|---|---|---|---|---|
| 0 | 6 | 3 | 7 > 2 | lo = 4 |
| 4 | 6 | 5 | 1 ≤ 2 | hi = 5 |
| 4 | 5 | 4 | 0 ≤ 1 | hi = 4 |

Answer `nums[4] = 0`. **With duplicates** (LC 154) add `else if equal: --hi` — worst case becomes O(n).

## search-in-rotated-sorted-array

### Walkthrough
**Goal:** one binary search, deciding at each step which half is sorted.

1. Compute `mid`. If `a[mid] == target`, done.
2. If `a[lo] <= a[mid]`, the **left half `[lo, mid]` is sorted**:
   1. If `a[lo] <= target < a[mid]`, the target must be there → `hi = mid − 1`.
   2. Else → `lo = mid + 1`.
3. Otherwise the **right half `[mid, hi]` is sorted**:
   1. If `a[mid] < target <= a[hi]` → `lo = mid + 1`.
   2. Else → `hi = mid − 1`.

**Dry run** `[4,5,6,7,0,1,2]`, target 0:

| lo | hi | mid | a[mid] | sorted half | target inside? | action |
|---|---|---|---|---|---|---|
| 0 | 6 | 3 | 7 | left [4..7] | no | lo = 4 |
| 4 | 6 | 5 | 1 | left [0..1] | 0 ≤ 0 < 1 yes | hi = 4 |
| 4 | 4 | 4 | 0 | — | — | **found 4** |

## time-based-key-value-store

### Walkthrough
**Goal:** per key, find the latest version at or before a timestamp.

1. `set` appends `(timestamp, value)` — timestamps are strictly increasing, so each key's vector stays sorted for free.
2. `get(key, timestamp)`: binary search the key's vector for the **last version whose time ≤ timestamp**.
3. Each time `v[mid]` is valid, remember it as `answer` and search to the right for a newer valid one; if nothing is valid, `answer` stays `""`.

**Dry run** key `"foo"`: versions `[(1,"bar"), (4,"bar2")]`:

| get timestamp | last version with time ≤ timestamp | answer |
|---|---|---|
| 0 | none (both versions are newer) | "" |
| 1 | (1,"bar") | "bar" |
| 3 | (1,"bar") | "bar" |
| 5 | (4,"bar2") | "bar2" |

## median-of-two-sorted-arrays

### Walkthrough
**Goal:** split both arrays so the left halves together hold exactly half the elements, and everything left ≤ everything right.

1. Ensure `A` is the shorter array (binary search over fewer positions, and `j` stays in range).
2. `half = (m + n + 1) / 2` — size of the combined left part (+1 so the odd middle goes left).
3. Binary search `i ∈ [0, m]` = how many elements of A go left; then `j = half − i` from B.
4. Boundary values (with ±∞ sentinels for empty sides): `Aleft = A[i−1]`, `Aright = A[i]`, `Bleft = B[j−1]`, `Bright = B[j]`.
5. **Valid partition:** `Aleft ≤ Bright` and `Bleft ≤ Aright`.
   1. Odd total → median = `max(Aleft, Bleft)`.
   2. Even → `(max(Aleft, Bleft) + min(Aright, Bright)) / 2`.
6. If `Aleft > Bright`, too many from A → `hi = i − 1`; else too few → `lo = i + 1`.

**Dry run** `A = [1, 3]`, `B = [2, 4, 5]` → half = 3:

| lo | hi | i | j | Aleft | Aright | Bleft | Bright | valid? |
|---|---|---|---|---|---|---|---|---|
| 0 | 2 | 1 | 2 | 1 | 3 | 4 | 5 | 4 > 3 ✗ → lo = 2 |
| 2 | 2 | 2 | 1 | 3 | +∞ | 2 | 4 | ✔ |

Total 5 (odd) → median = max(3, 2) = **3**. Merged `[1,2,3,4,5]` confirms it.
