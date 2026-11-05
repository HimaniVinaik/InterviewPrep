## binary-search

### Approach 1: Linear scan
```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        for (int i = 0; i < (int)nums.size(); ++i)
            if (nums[i] == target) return i;
        return -1;
    }
};
```

**Time:** O(n) · **Space:** O(1). Ignores the sorted order — the baseline to beat.

### Approach 2: Recursive binary search (closed interval)
```cpp
class Solution {
    int bs(const vector<int>& a, int lo, int hi, int target) {   // search [lo, hi]
        if (lo > hi) return -1;
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        return a[mid] < target ? bs(a, mid + 1, hi, target) : bs(a, lo, mid - 1, target);
    }
public:
    int search(vector<int>& nums, int target) { return bs(nums, 0, (int)nums.size() - 1, target); }
};
```

**Time:** O(log n) · **Space:** O(log n) recursion. Note the closed-interval conventions: `lo <= hi`, `hi = mid - 1`.

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

### Approach 1: Two binary searches (row, then column)
```cpp
class Solution {
public:
    bool searchMatrix(vector<vector<int>>& M, int target) {
        // first row whose first element > target; the row before it is the candidate
        auto rowIt = upper_bound(M.begin(), M.end(), target,
                                 [](int t, const vector<int>& row) { return t < row[0]; });
        if (rowIt == M.begin()) return false;
        const auto& row = *prev(rowIt);
        return binary_search(row.begin(), row.end(), target);
    }
};
```

**Time:** O(log m + log n) · **Space:** O(1). Same complexity, uses STL with a custom comparator.

### Approach 2: Staircase search from the top-right
```cpp
class Solution {
public:
    bool searchMatrix(vector<vector<int>>& M, int target) {
        int r = 0, c = (int)M[0].size() - 1;
        while (r < (int)M.size() && c >= 0) {
            if (M[r][c] == target) return true;
            if (M[r][c] > target) --c;   // everything below in this column is bigger
            else ++r;                    // everything left in this row is smaller
        }
        return false;
    }
};
```

**Time:** O(m + n) · **Space:** O(1). Works even with the weaker property of LC 240 (rows and columns sorted).

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

### Approach 1: Try every speed from 1 upward
```cpp
class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        for (int k = 1;; ++k) {
            long long t = 0;
            for (int p : piles) t += (p + k - 1) / k;
            if (t <= h) return k;            // first feasible speed is the minimum
        }
    }
};
```

**Time:** O(max(piles) · n) — up to 10⁹ · 10⁴ → far too slow · **Space:** O(1).

### Approach 2: Binary search with a tighter lower bound
```cpp
class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        long long total = accumulate(piles.begin(), piles.end(), 0LL);
        int lo = (int)max(1LL, (total + h - 1) / h);    // can't beat average rate
        int hi = *ranges::max_element(piles);
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            long long t = 0;
            for (int p : piles) t += (p + mid - 1) / mid;
            if (t <= h) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
};
```

**Time:** O(n log max) · **Space:** O(1). Shrinking the initial range saves a few iterations.

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

### Approach 1: Linear scan
```cpp
class Solution {
public:
    int findMin(vector<int>& nums) { return *ranges::min_element(nums); }
};
```

**Time:** O(n) · **Space:** O(1).

### Approach 2: Find the "drop" point
**Idea:** the minimum is the only element smaller than its predecessor; binary search for it comparing against `nums[0]`.

```cpp
class Solution {
public:
    int findMin(vector<int>& nums) {
        int n = nums.size();
        if (nums[0] <= nums[n - 1]) return nums[0];      // not rotated
        int lo = 0, hi = n - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] >= nums[0]) lo = mid + 1;      // mid still in the left (larger) part
            else hi = mid;
        }
        return nums[lo];
    }
};
```

**Time:** O(log n) · **Space:** O(1). Needs the explicit not-rotated check; Optimal avoids it by comparing with `nums[hi]`.

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

### Approach 1: Find the pivot, then normal binary search
```cpp
class Solution {
public:
    int search(vector<int>& a, int target) {
        int n = a.size(), lo = 0, hi = n - 1;
        while (lo < hi) {                                 // index of minimum
            int mid = lo + (hi - lo) / 2;
            if (a[mid] > a[hi]) lo = mid + 1; else hi = mid;
        }
        int pivot = lo;
        // choose which sorted half to search
        if (target >= a[pivot] && target <= a[n - 1]) { lo = pivot; hi = n - 1; }
        else { lo = 0; hi = pivot - 1; }
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] == target) return mid;
            if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
        }
        return -1;
    }
};
```

**Time:** O(log n) · **Space:** O(1). Two simpler searches instead of one clever one — easier to get right under pressure.

### Approach 2: Virtual un-rotated index
```cpp
class Solution {
public:
    int search(vector<int>& a, int target) {
        int n = a.size(), lo = 0, hi = n - 1;
        while (lo < hi) { int m = (lo + hi) / 2; if (a[m] > a[hi]) lo = m + 1; else hi = m; }
        int rot = lo;                                     // rotation offset
        lo = 0; hi = n - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            int real = (mid + rot) % n;                   // map sorted index -> actual index
            if (a[real] == target) return real;
            if (a[real] < target) lo = mid + 1; else hi = mid - 1;
        }
        return -1;
    }
};
```

**Time:** O(log n) · **Space:** O(1). Same trick as circular buffers: index modulo n.

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

### Approach 1: Linear scan backwards
```cpp
class TimeMap {
    unordered_map<string, vector<pair<int, string>>> m;
public:
    void set(const string& k, const string& v, int ts) { m[k].emplace_back(ts, v); }
    string get(const string& k, int ts) {
        auto it = m.find(k);
        if (it == m.end()) return "";
        auto& v = it->second;
        for (int i = (int)v.size() - 1; i >= 0; --i)
            if (v[i].first <= ts) return v[i].second;
        return "";
    }
};
```

**Time:** get O(n) · **Space:** O(n). Fine for recent-timestamp queries, bad in the worst case.

### Approach 2: `std::map` per key (ordered by timestamp)
```cpp
class TimeMap {
    unordered_map<string, map<int, string>> m;
public:
    void set(const string& k, const string& v, int ts) { m[k][ts] = v; }
    string get(const string& k, int ts) {
        auto it = m.find(k);
        if (it == m.end()) return "";
        auto ub = it->second.upper_bound(ts);          // first timestamp > ts
        return ub == it->second.begin() ? "" : prev(ub)->second;
    }
};
```

**Time:** O(log n) both · **Space:** O(n). Also works if timestamps arrive out of order (the vector version requires increasing timestamps).

### Walkthrough
**Goal:** per key, find the latest version at or before a timestamp.

1. `set` appends `(timestamp, value)` — timestamps are strictly increasing, so each key's vector stays sorted for free.
2. `get(key, ts)`: binary search the key's vector for the **first timestamp > ts** (`upper_bound`).
3. The element just before it is the newest version `≤ ts`. If `upper_bound` returned `begin()`, every version is newer → `""`.

**Dry run** key `"foo"`: versions `[(1,"bar"), (4,"bar2")]`:

| get ts | upper_bound points to | answer |
|---|---|---|
| 0 | (1,"bar") = begin | "" |
| 1 | (4,"bar2") | prev → "bar" |
| 3 | (4,"bar2") | "bar" |
| 5 | end | prev → "bar2" |

## median-of-two-sorted-arrays

### Approach 1: Merge, then take the middle
```cpp
class Solution {
public:
    double findMedianSortedArrays(vector<int>& A, vector<int>& B) {
        vector<int> m(A.size() + B.size());
        ranges::merge(A, B, m.begin());
        size_t n = m.size();
        return n % 2 ? m[n / 2] : (m[n / 2 - 1] + (double)m[n / 2]) / 2.0;
    }
};
```

**Time:** O(m + n) · **Space:** O(m + n). Usually accepted, but the problem asks for logarithmic time.

### Approach 2: Merge with two pointers, no extra array
```cpp
class Solution {
public:
    double findMedianSortedArrays(vector<int>& A, vector<int>& B) {
        int total = A.size() + B.size();
        int i = 0, j = 0, prev = 0, cur = 0;
        for (int k = 0; k <= total / 2; ++k) {         // walk to the middle
            prev = cur;
            if (j >= (int)B.size() || (i < (int)A.size() && A[i] <= B[j])) cur = A[i++];
            else cur = B[j++];
        }
        return total % 2 ? cur : (prev + (double)cur) / 2.0;
    }
};
```

**Time:** O(m + n) · **Space:** O(1).

### Approach 3: k-th smallest by discarding k/2 elements
```cpp
class Solution {
    // k-th smallest (1-indexed) of A[i..] and B[j..]
    int kth(const vector<int>& A, int i, const vector<int>& B, int j, int k) {
        if (i >= (int)A.size()) return B[j + k - 1];
        if (j >= (int)B.size()) return A[i + k - 1];
        if (k == 1) return min(A[i], B[j]);
        int a = i + k / 2 - 1 < (int)A.size() ? A[i + k / 2 - 1] : INT_MAX;
        int b = j + k / 2 - 1 < (int)B.size() ? B[j + k / 2 - 1] : INT_MAX;
        return a < b ? kth(A, i + k / 2, B, j, k - k / 2)    // A's first k/2 can't be the k-th
                     : kth(A, i, B, j + k / 2, k - k / 2);
    }
public:
    double findMedianSortedArrays(vector<int>& A, vector<int>& B) {
        int t = A.size() + B.size();
        if (t % 2) return kth(A, 0, B, 0, t / 2 + 1);
        return (kth(A, 0, B, 0, t / 2) + (double)kth(A, 0, B, 0, t / 2 + 1)) / 2.0;
    }
};
```

**Time:** O(log(m + n)) · **Space:** O(log(m + n)) recursion. Generalises to "k-th smallest of two sorted arrays".

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
