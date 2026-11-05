# Binary Search

**Recognise it when:** the data is sorted / rotated-sorted, or the **answer space is monotonic** ("smallest speed such that…", "minimum capacity that…"). If `ok(x)` being true implies `ok(x+1)` is true, you can binary search on `x`.

**One template to rule them all** — find the first index where `pred` is true:

```cpp
// Returns first x in [lo, hi) with pred(x) == true, or hi if none.
template <class Pred>
long long firstTrue(long long lo, long long hi, Pred pred) {
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;   // avoids (lo+hi) overflow
        if (pred(mid)) hi = mid;               // answer is mid or to the left
        else           lo = mid + 1;           // answer is strictly right
    }
    return lo;
}
```

**Pitfalls:** `(lo + hi) / 2` overflow, infinite loops when `lo = mid` with `mid` rounding down, off-by-one in closed vs half-open ranges. Pick **half-open `[lo, hi)`** and stick with it. In the STL: `std::lower_bound`, `std::upper_bound`, `std::ranges::partition_point`.

## Binary Search
- difficulty: Easy
- leetcode: 704
- slug: binary-search

Given a sorted array and a `target`, return its index or `-1`. O(log n).

### Hint
Halve the search range each step.

### Solution
```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = (int)nums.size();      // half-open [lo, hi)
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return -1;
    }
};
```

### Explanation
Invariant: if `target` exists, it is in `[lo, hi)`. Each iteration shrinks the interval by at least one, so the loop terminates. STL equivalent:

```cpp
auto it = ranges::lower_bound(nums, target);
return (it != nums.end() && *it == target) ? int(it - nums.begin()) : -1;
```

**Time:** O(log n) · **Space:** O(1)

## Search a 2D Matrix
- difficulty: Medium
- leetcode: 74
- slug: search-a-2d-matrix

An `m×n` matrix has rows sorted, and each row's first element is greater than the previous row's last. Search for `target`.

### Hint
The matrix is just a sorted array of length `m*n` laid out row by row.

### Solution
```cpp
class Solution {
public:
    bool searchMatrix(vector<vector<int>>& M, int target) {
        int m = M.size(), n = M[0].size();
        int lo = 0, hi = m * n;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            int v = M[mid / n][mid % n];         // flatten index -> (row, col)
            if (v == target) return true;
            if (v < target) lo = mid + 1; else hi = mid;
        }
        return false;
    }
};
```

### Explanation
Index `k` maps to row `k / n`, column `k % n` — the same row-major mapping C uses for `int a[m][n]`.

**Time:** O(log(m·n)) · **Space:** O(1)

## Koko Eating Bananas
- difficulty: Medium
- leetcode: 875
- slug: koko-eating-bananas

`piles[i]` bananas; Koko eats at speed `k` per hour (one pile per hour max). Find the minimum `k` to finish within `h` hours.

### Hint
Binary search on the **answer** `k`. Hours needed is monotonic decreasing in `k`.

### Solution
```cpp
class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int lo = 1, hi = *ranges::max_element(piles);
        auto hours = [&](int k) {
            long long t = 0;
            for (int p : piles) t += (p + k - 1) / k;   // ceil(p / k) without floats
            return t;
        };
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (hours(mid) <= h) hi = mid;   // fast enough: try slower
            else lo = mid + 1;
        }
        return lo;
    }
};
```

### Explanation
"Minimum value satisfying a monotonic condition" → first-true binary search over `[1, max(piles)]`. Integer ceiling `(p + k - 1) / k` is a must-know trick (avoid `ceil` on doubles). Use `long long` for the sum.

**Time:** O(n log max) · **Space:** O(1)

## Find Minimum in Rotated Sorted Array
- difficulty: Medium
- leetcode: 153
- slug: find-minimum-in-rotated-sorted-array

A sorted array of unique values was rotated. Find the minimum in O(log n).

```text
[3,4,5,1,2] -> 1
```

### Hint
Compare `nums[mid]` with `nums[hi]`. Which half contains the "drop"?

### Solution
```cpp
class Solution {
public:
    int findMin(vector<int>& nums) {
        int lo = 0, hi = (int)nums.size() - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) lo = mid + 1;  // min is right of mid
            else hi = mid;                            // mid could be the min
        }
        return nums[lo];
    }
};
```

### Explanation
If `nums[mid] > nums[hi]`, the rotation point (minimum) lies strictly right of `mid`. Otherwise `mid..hi` is sorted and the min is at `mid` or left. Comparing with `hi` (not `lo`) avoids the un-rotated edge case.

**Time:** O(log n) · **Space:** O(1)

## Search in Rotated Sorted Array
- difficulty: Medium
- leetcode: 33
- slug: search-in-rotated-sorted-array

Search `target` in a rotated sorted array of unique values. O(log n).

### Hint
At any `mid`, at least one half is sorted. Check if `target` lies within that sorted half.

### Solution
```cpp
class Solution {
public:
    int search(vector<int>& a, int target) {
        int lo = 0, hi = (int)a.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] == target) return mid;
            if (a[lo] <= a[mid]) {                     // left half sorted
                if (a[lo] <= target && target < a[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {                                   // right half sorted
                if (a[mid] < target && target <= a[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }
};
```

### Explanation
Decide which half is sorted by comparing endpoints; if the target fits in that half's range, go there, else go to the other half. Note this uses the closed-interval `[lo, hi]` style — be consistent within one solution.

**Time:** O(log n) · **Space:** O(1)

## Time Based Key-Value Store
- difficulty: Medium
- leetcode: 981
- slug: time-based-key-value-store

Implement `set(key, value, timestamp)` and `get(key, timestamp)` returning the value with the largest timestamp `<= timestamp` (or `""`). Timestamps for `set` are strictly increasing.

### Hint
Per key, timestamps arrive sorted → append to a vector and binary search with `upper_bound`.

### Solution
```cpp
class TimeMap {
    unordered_map<string, vector<pair<int, string>>> m;
public:
    void set(const string& key, const string& value, int ts) {
        m[key].emplace_back(ts, value);
    }
    string get(const string& key, int ts) {
        auto it = m.find(key);
        if (it == m.end()) return "";
        auto& v = it->second;
        // first element with timestamp > ts
        auto ub = upper_bound(v.begin(), v.end(), ts,
                              [](int t, const auto& p) { return t < p.first; });
        return ub == v.begin() ? "" : prev(ub)->second;
    }
};
```

### Explanation
`upper_bound` finds the first entry strictly after `ts`; the one before it is the latest valid version. This is the core idea behind MVCC (multi-version concurrency control) in databases.

**Time:** set O(1), get O(log n) · **Space:** O(n)

## Median of Two Sorted Arrays
- difficulty: Hard
- leetcode: 4
- slug: median-of-two-sorted-arrays

Find the median of two sorted arrays in O(log(min(m, n))).

### Hint
Binary search a partition `i` in the smaller array; `j = half - i` in the other. A valid partition has `A[i-1] <= B[j]` and `B[j-1] <= A[i]`.

### Solution
```cpp
class Solution {
public:
    double findMedianSortedArrays(vector<int>& A, vector<int>& B) {
        if (A.size() > B.size()) swap(A, B);          // binary search the smaller
        int m = A.size(), n = B.size(), half = (m + n + 1) / 2;
        int lo = 0, hi = m;
        while (lo <= hi) {
            int i = (lo + hi) / 2, j = half - i;      // i from A, j from B on the left
            int Aleft  = i == 0 ? INT_MIN : A[i - 1];
            int Aright = i == m ? INT_MAX : A[i];
            int Bleft  = j == 0 ? INT_MIN : B[j - 1];
            int Bright = j == n ? INT_MAX : B[j];
            if (Aleft <= Bright && Bleft <= Aright) {
                if ((m + n) % 2) return max(Aleft, Bleft);
                return (max(Aleft, Bleft) + (double)min(Aright, Bright)) / 2.0;
            }
            if (Aleft > Bright) hi = i - 1;           // took too many from A
            else lo = i + 1;
        }
        return 0.0;
    }
};
```

### Explanation
The median splits the merged array into equal halves. Choosing `i` elements from A forces `j = half - i` from B. The partition is correct when everything on the left ≤ everything on the right; otherwise move `i` in the direction that fixes the violated inequality. Sentinels `INT_MIN/INT_MAX` handle empty sides.

**Time:** O(log min(m,n)) · **Space:** O(1)
