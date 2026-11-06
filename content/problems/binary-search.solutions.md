## binary-search

### Approach 1: Linear scan
**The idea:** check every element from left to right.

```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        for (int i = 0; i < (int)nums.size(); i++) {
            if (nums[i] == target) {
                return i;
            }
        }
        return -1;   // not found
    }
};
```

**How it works:** correct for any array, sorted or not — but it ignores the fact that the array is sorted.

**Think of it like this:** looking for a word in a dictionary by reading every page from the start.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 2: Recursive binary search
**The idea:** look at the middle element; the target can only be in one half, so search that half the same way.

```cpp
class Solution {
    // Search nums[lo..hi] (both ends included).
    int find(vector<int>& nums, int lo, int hi, int target) {
        if (lo > hi) {
            return -1;   // empty range: not found
        }
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) {
            return mid;
        }
        if (nums[mid] < target) {
            return find(nums, mid + 1, hi, target);   // target must be on the right
        }
        return find(nums, lo, mid - 1, target);       // target must be on the left
    }

public:
    int search(vector<int>& nums, int target) {
        return find(nums, 0, (int)nums.size() - 1, target);
    }
};
```

**How it works:** each call halves the range, so after about log₂ n calls the range is empty or the target is found.

**Think of it like this:** the "guess my number between 1 and 100" game — always guess the middle and you need at most 7 guesses.

**Cost:** Time **O(log n)**. Space **O(log n)** for the recursion.

### Optimal: Iterative binary search
**The idea:** the same halving, written as a loop over a range `[lo, hi)` (lo included, hi excluded).

```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0;
        int hi = (int)nums.size();   // one past the last index

        // While the range [lo, hi) is not empty...
        while (lo < hi) {
            // Middle index. (lo + hi) / 2 could overflow for huge arrays; this can't.
            int mid = lo + (hi - lo) / 2;

            if (nums[mid] == target) {
                return mid;
            }
            if (nums[mid] < target) {
                lo = mid + 1;   // target is to the right of mid
            } else {
                hi = mid;       // target is to the left of mid (hi is exclusive)
            }
        }
        return -1;
    }
};
```

**How it works**
1. `[lo, hi)` always contains the target if it exists.
2. Compare with the middle; throw away the half that can't contain it.
3. Stop when the range is empty.

**Think of it like this:** opening a phone book in the middle, deciding whether the name is before or after, and tearing the wrong half away.

**Why it's optimal:** each comparison gives one bit of information ("left or right"), and log₂ n bits are needed to pick one of n positions.

**Cost:** Time **O(log n)**. Space **O(1)**.

## search-a-2d-matrix

### Approach 1: Scan every cell
**The idea:** check every element.

```cpp
class Solution {
public:
    bool searchMatrix(vector<vector<int>>& matrix, int target) {
        for (auto& row : matrix) {
            for (int value : row) {
                if (value == target) {
                    return true;
                }
            }
        }
        return false;
    }
};
```

**How it works:** brute force, ignoring the sorted structure.

**Think of it like this:** reading every word in a book to find one.

**Cost:** Time **O(m·n)**. Space **O(1)**.

### Approach 2: Find the row, then search inside it
**The idea:** first binary-search the first column to find the only row that could contain the target, then binary-search that row.

```cpp
class Solution {
public:
    bool searchMatrix(vector<vector<int>>& matrix, int target) {
        int rows = matrix.size();
        int cols = matrix[0].size();

        // Find the last row whose first element is <= target.
        int lo = 0;
        int hi = rows - 1;
        int row = -1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (matrix[mid][0] <= target) {
                row = mid;       // candidate; maybe a later row also works
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        if (row == -1) {
            return false;   // target is smaller than everything
        }

        // Binary search inside that row.
        lo = 0;
        hi = cols - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (matrix[row][mid] == target) {
                return true;
            }
            if (matrix[row][mid] < target) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return false;
    }
};
```

**How it works:** rows are ordered by their first element, so one row is the only candidate.

**Think of it like this:** find the right chapter using the table of contents, then the right page within the chapter.

**Cost:** Time **O(log m + log n)**. Space **O(1)**.

### Optimal: Treat the matrix as one sorted array
**The idea:** reading the rows one after another gives a single sorted list of m·n numbers. Binary-search that "virtual" list and convert each index to (row, column).

```cpp
class Solution {
public:
    bool searchMatrix(vector<vector<int>>& M, int target) {
        int m = M.size();       // rows
        int n = M[0].size();    // columns

        int lo = 0;
        int hi = m * n;         // virtual indices 0 .. m*n-1

        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;

            // Convert the virtual index to a real cell.
            int row = mid / n;
            int col = mid % n;
            int v = M[row][col];

            if (v == target) {
                return true;
            }
            if (v < target) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return false;
    }
};
```

**How it works**
1. Index k in the virtual list is row `k / n`, column `k % n` (row-major order — exactly how C stores a 2-D array).
2. Standard binary search over `[0, m·n)`.

**Think of it like this:** a book's pages numbered continuously across chapters — you search by page number and then work out which chapter it's in.

**Why it's optimal:** one binary search over all m·n elements: log₂(m·n) steps.

**Cost:** Time **O(log(m·n))**. Space **O(1)**.

## koko-eating-bananas

### Approach 1: Try every speed from 1 upward
**The idea:** the first speed that lets Koko finish in time is the answer.

```cpp
class Solution {
    // Hours needed to eat all piles at speed k.
    long long hoursAt(vector<int>& piles, int k) {
        long long hours = 0;
        for (int p : piles) {
            // ceil(p / k) without floating point.
            hours += (p + k - 1) / k;
        }
        return hours;
    }

public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int k = 1;
        while (hoursAt(piles, k) > h) {
            k++;
        }
        return k;
    }
};
```

**How it works:** tries speeds in increasing order; correct but may test up to a billion speeds.

**Think of it like this:** turning a dial one notch at a time until the job finishes on time.

**Cost:** Time **O(n · maxPile)**. Space **O(1)**. Far too slow at the limits.

### Approach 2: Binary search with a tighter starting range
**The idea:** Koko can never succeed below the average rate `ceil(total / h)`, so start the search there.

```cpp
class Solution {
    long long hoursAt(vector<int>& piles, int k) {
        long long hours = 0;
        for (int p : piles) {
            hours += (p + k - 1) / k;
        }
        return hours;
    }

public:
    int minEatingSpeed(vector<int>& piles, int h) {
        long long total = 0;
        int biggest = 0;
        for (int p : piles) {
            total += p;
            biggest = max(biggest, p);
        }

        // Lowest possible useful speed: the average rate (at least 1).
        int lo = (int)max(1LL, (total + h - 1) / h);
        int hi = biggest;   // eating faster than the biggest pile never helps

        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (hoursAt(piles, mid) <= h) {
                hi = mid;       // fast enough: try slower
            } else {
                lo = mid + 1;   // too slow: must be faster
            }
        }
        return lo;
    }
};
```

**How it works:** identical to the optimal search, just starting from a smaller range.

**Think of it like this:** before guessing, rule out obviously impossible answers.

**Cost:** Time **O(n log maxPile)**. Space **O(1)**.

### Optimal: Binary search on the answer
**The idea:** "can Koko finish at speed k?" is false for small k and true for large k. Binary-search for the first k where it becomes true.

```cpp
class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int lo = 1;
        int hi = *max_element(piles.begin(), piles.end());

        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;

            // Hours needed at speed `mid`.
            long long hours = 0;
            for (int p : piles) {
                // ceil(p / mid): a pile of 7 at speed 3 takes 3 hours.
                hours += (p + mid - 1) / mid;
            }

            if (hours <= h) {
                hi = mid;        // mid works; the answer is mid or slower
            } else {
                lo = mid + 1;    // mid is too slow
            }
        }
        return lo;   // lo == hi: the smallest speed that works
    }
};
```

**How it works**
1. Possible answers are 1 … max(pile).
2. Faster speeds never take more hours — the "works" answers form a block on the right.
3. Binary search finds where that block starts.

**Think of it like this:** finding the lowest oven temperature that bakes a cake in time — test the middle temperature, and halve the range based on the result.

**Why it's optimal:** about log₂(10⁹) ≈ 30 checks, each reading every pile once.

**Cost:** Time **O(n log maxPile)**. Space **O(1)**.

## find-minimum-in-rotated-sorted-array

### Approach 1: Linear scan
**The idea:** look at every element and keep the smallest.

```cpp
class Solution {
public:
    int findMin(vector<int>& nums) {
        int smallest = nums[0];
        for (int x : nums) {
            smallest = min(smallest, x);
        }
        return smallest;
    }
};
```

**How it works:** ignores the rotated-sorted structure.

**Think of it like this:** checking every person's height to find the shortest.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 2: Find the "drop" by comparing with the first element
**The idea:** elements before the rotation point are ≥ `nums[0]`; elements after it are < `nums[0]`. Binary-search for the first element smaller than `nums[0]`.

```cpp
class Solution {
public:
    int findMin(vector<int>& nums) {
        int n = nums.size();

        // Not rotated at all: the first element is the minimum.
        if (nums[0] <= nums[n - 1]) {
            return nums[0];
        }

        int lo = 0;
        int hi = n - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] >= nums[0]) {
                lo = mid + 1;    // mid is still in the left (big) part
            } else {
                hi = mid;        // mid is in the right (small) part
            }
        }
        return nums[lo];
    }
};
```

**How it works:** the array is "big values, then small values"; we look for where the small values start.

**Think of it like this:** a clock face starting at 4: 4, 5, 6, …, 12, 1, 2, 3 — you're looking for where the numbers wrap back to small.

**Cost:** Time **O(log n)**. Space **O(1)**.

### Optimal: Compare the middle with the right end
**The idea:** if the middle is bigger than the last element, the drop (and the minimum) is to the right; otherwise it's at the middle or to the left.

```cpp
class Solution {
public:
    int findMin(vector<int>& nums) {
        int lo = 0;
        int hi = (int)nums.size() - 1;

        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;

            if (nums[mid] > nums[hi]) {
                // mid is in the left, larger part: the minimum is strictly to the right.
                lo = mid + 1;
            } else {
                // mid..hi is sorted: the minimum is mid or something to its left.
                hi = mid;
            }
        }
        return nums[lo];
    }
};
```

**How it works**
1. `[4,5,6,7,0,1,2]`: mid = 7 > 2 → minimum is right of mid.
2. Now `[0,1,2]`: mid = 1 ≤ 2 → keep mid, look left.
3. Comparing with `nums[hi]` (not `nums[0]`) also works when the array isn't rotated, so no special case is needed.

**Think of it like this:** standing in the middle of a rotated clock face and asking "is the end of the dial lower than me?" — if yes, the wrap-around point is ahead of you.

**Why it's optimal:** O(log n) — each comparison halves the range.

**Cost:** Time **O(log n)**. Space **O(1)**.

## search-in-rotated-sorted-array

### Approach 1: Linear scan
**The idea:** check every element.

```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        for (int i = 0; i < (int)nums.size(); i++) {
            if (nums[i] == target) {
                return i;
            }
        }
        return -1;
    }
};
```

**How it works:** always correct, but O(n) — the problem requires O(log n).

**Think of it like this:** reading every page of a dictionary that's been cut and its halves swapped.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 2: Find the rotation point, then a normal binary search
**The idea:** two simple binary searches: first find the minimum (the rotation point), then search the half that could contain the target.

```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int n = nums.size();

        // Step 1: index of the smallest element (see "Find Minimum in Rotated Sorted Array").
        int lo = 0;
        int hi = n - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        int pivot = lo;

        // Step 2: decide which sorted half could contain the target.
        if (target >= nums[pivot] && target <= nums[n - 1]) {
            lo = pivot;
            hi = n - 1;
        } else {
            lo = 0;
            hi = pivot - 1;
        }

        // Step 3: ordinary binary search in that half.
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) {
                return mid;
            }
            if (nums[mid] < target) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return -1;
    }
};
```

**How it works:** the rotation point splits the array into two sorted runs; once you know it, each run is a normal sorted array.

**Think of it like this:** find where the two halves of the dictionary were glued together, then search the correct half normally.

**Cost:** Time **O(log n)**. Space **O(1)**.

### Optimal: One binary search, checking which half is sorted
**The idea:** at any middle point, at least one side (left or right) is sorted. If the target lies within that sorted side's range, go there; otherwise go to the other side.

```cpp
class Solution {
public:
    int search(vector<int>& a, int target) {
        int lo = 0;
        int hi = (int)a.size() - 1;

        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] == target) {
                return mid;
            }

            if (a[lo] <= a[mid]) {
                // Left half a[lo..mid] is sorted.
                if (a[lo] <= target && target < a[mid]) {
                    hi = mid - 1;   // target is inside the sorted left half
                } else {
                    lo = mid + 1;   // target must be on the right
                }
            } else {
                // Right half a[mid..hi] is sorted.
                if (a[mid] < target && target <= a[hi]) {
                    lo = mid + 1;   // target is inside the sorted right half
                } else {
                    hi = mid - 1;   // target must be on the left
                }
            }
        }
        return -1;
    }
};
```

**How it works**
1. Compare `a[lo]` with `a[mid]` to see whether the left half is sorted.
2. In a sorted half, a simple range check tells you if the target can be there.
3. Discard the other half and repeat.

**Think of it like this:** you can't trust the whole dictionary's order, but you can always trust at least one half of it — check whether the word fits in the trustworthy half.

**Why it's optimal:** one pass of halving: O(log n).

**Cost:** Time **O(log n)**. Space **O(1)**.

## time-based-key-value-store

### Approach 1: Scan versions backwards
**The idea:** store all versions per key in time order; to answer a query, walk backwards until a version with timestamp ≤ the query.

```cpp
class TimeMap {
    unordered_map<string, vector<pair<int, string>>> versions;   // key -> (timestamp, value)

public:
    void set(string key, string value, int timestamp) {
        versions[key].push_back({timestamp, value});
    }

    string get(string key, int timestamp) {
        if (versions.count(key) == 0) {
            return "";
        }
        vector<pair<int, string>>& list = versions[key];
        // Newest first: the first one not after `timestamp` is the answer.
        for (int i = (int)list.size() - 1; i >= 0; i--) {
            if (list[i].first <= timestamp) {
                return list[i].second;
            }
        }
        return "";
    }
};
```

**How it works:** correct, but a query for an old timestamp scans many versions.

**Think of it like this:** flipping back through a diary page by page to find what happened on a date.

**Cost:** set **O(1)**, get **O(n)**. Space **O(n)**.

### Approach 2: An ordered map per key
**The idea:** `std::map` keeps timestamps sorted and can find "the last timestamp ≤ t" with `upper_bound`.

```cpp
class TimeMap {
    unordered_map<string, map<int, string>> versions;   // key -> (timestamp -> value), sorted

public:
    void set(string key, string value, int timestamp) {
        versions[key][timestamp] = value;
    }

    string get(string key, int timestamp) {
        if (versions.count(key) == 0) {
            return "";
        }
        map<int, string>& history = versions[key];

        // First entry with a timestamp strictly greater than `timestamp`.
        auto it = history.upper_bound(timestamp);
        if (it == history.begin()) {
            return "";   // every version is newer than the query
        }
        it--;            // step back: the latest version at or before `timestamp`
        return it->second;
    }
};
```

**How it works:** the map is a balanced tree, so the lookup is O(log n). It also works if timestamps arrive out of order.

**Think of it like this:** a diary with an index — jump straight to the date instead of flipping pages.

**Cost:** set and get **O(log n)**. Space **O(n)**.

### Optimal: Sorted vector + binary search
**The idea:** timestamps for `set` always increase, so each key's vector is already sorted. Binary-search it.

```cpp
class TimeMap {
    unordered_map<string, vector<pair<int, string>>> m;   // key -> (timestamp, value), increasing timestamps

public:
    void set(string key, string value, int timestamp) {
        // Timestamps only increase, so appending keeps the vector sorted.
        m[key].push_back({timestamp, value});
    }

    string get(string key, int timestamp) {
        if (m.count(key) == 0) {
            return "";
        }
        vector<pair<int, string>>& v = m[key];

        // Binary search for the last version with time <= timestamp.
        int lo = 0;
        int hi = (int)v.size() - 1;
        string answer = "";
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (v[mid].first <= timestamp) {
                answer = v[mid].second;   // valid candidate; a later one might also be valid
                lo = mid + 1;
            } else {
                hi = mid - 1;             // too new
            }
        }
        return answer;
    }
};
```

**How it works**
1. `set` appends — O(1).
2. `get` binary-searches for the **last** version whose timestamp is not after the query.
3. Every time we find a valid version we remember it and keep looking to the right for a newer valid one.

**Think of it like this:** a stack of dated photos in order; to find the photo for a date, open the stack in the middle and keep halving.

**Why it's optimal:** O(1) writes and O(log n) reads, with a compact array (cache friendly).

**Cost:** set **O(1)** amortised, get **O(log n)**. Space **O(n)**.

## median-of-two-sorted-arrays

### Approach 1: Merge both arrays, take the middle
**The idea:** merge the two sorted arrays into one (like merge sort), then read the middle element(s).

```cpp
class Solution {
public:
    double findMedianSortedArrays(vector<int>& A, vector<int>& B) {
        vector<int> merged;
        int i = 0;
        int j = 0;

        // Standard merge of two sorted lists.
        while (i < (int)A.size() && j < (int)B.size()) {
            if (A[i] <= B[j]) {
                merged.push_back(A[i]);
                i++;
            } else {
                merged.push_back(B[j]);
                j++;
            }
        }
        while (i < (int)A.size()) {
            merged.push_back(A[i]);
            i++;
        }
        while (j < (int)B.size()) {
            merged.push_back(B[j]);
            j++;
        }

        int n = merged.size();
        if (n % 2 == 1) {
            return merged[n / 2];
        }
        return (merged[n / 2 - 1] + (double)merged[n / 2]) / 2.0;
    }
};
```

**How it works:** after merging, the median is simply the middle.

**Think of it like this:** shuffling two sorted decks of cards together and picking the middle card.

**Cost:** Time **O(m + n)**. Space **O(m + n)**.

### Approach 2: Walk to the middle without storing
**The idea:** the same merge, but stop at the middle and remember only the last two values.

```cpp
class Solution {
public:
    double findMedianSortedArrays(vector<int>& A, vector<int>& B) {
        int total = A.size() + B.size();
        int i = 0;
        int j = 0;
        int previous = 0;
        int current = 0;

        // Take total/2 + 1 elements in sorted order.
        for (int count = 0; count <= total / 2; count++) {
            previous = current;
            bool takeFromA;
            if (j >= (int)B.size()) {
                takeFromA = true;                 // B is used up
            } else if (i >= (int)A.size()) {
                takeFromA = false;                // A is used up
            } else {
                takeFromA = A[i] <= B[j];         // take the smaller
            }
            if (takeFromA) {
                current = A[i];
                i++;
            } else {
                current = B[j];
                j++;
            }
        }

        if (total % 2 == 1) {
            return current;
        }
        return (previous + (double)current) / 2.0;
    }
};
```

**How it works:** we only need the element(s) at the middle, so we stop halfway.

**Think of it like this:** dealing from the two sorted decks only until you reach the middle card.

**Cost:** Time **O(m + n)**. Space **O(1)**.

### Optimal: Binary search the partition
**The idea:** split both arrays so that the left halves together contain half the elements and every left element ≤ every right element. Then the median sits at the boundary. Binary-search where to split the smaller array.

```cpp
class Solution {
public:
    double findMedianSortedArrays(vector<int>& A, vector<int>& B) {
        // Always binary-search the smaller array.
        if (A.size() > B.size()) {
            swap(A, B);
        }
        int m = A.size();
        int n = B.size();
        int half = (m + n + 1) / 2;   // size of the combined left half

        int lo = 0;
        int hi = m;
        while (lo <= hi) {
            int i = (lo + hi) / 2;    // take i elements from A for the left half
            int j = half - i;         // and the rest from B

            // Values on each side of the cut (use +/- infinity when a side is empty).
            int Aleft = (i == 0) ? INT_MIN : A[i - 1];
            int Aright = (i == m) ? INT_MAX : A[i];
            int Bleft = (j == 0) ? INT_MIN : B[j - 1];
            int Bright = (j == n) ? INT_MAX : B[j];

            if (Aleft <= Bright && Bleft <= Aright) {
                // Perfect cut: every left value <= every right value.
                if ((m + n) % 2 == 1) {
                    return max(Aleft, Bleft);
                }
                return (max(Aleft, Bleft) + (double)min(Aright, Bright)) / 2.0;
            }

            if (Aleft > Bright) {
                hi = i - 1;   // took too many from A
            } else {
                lo = i + 1;   // took too few from A
            }
        }
        return 0.0;
    }
};
```

**How it works**
1. Choosing `i` elements from A forces `j = half − i` from B.
2. The cut is correct when `Aleft ≤ Bright` and `Bleft ≤ Aright`.
3. If `Aleft` is too big, take fewer from A; if `Bleft` is too big, take more from A.
4. Odd total → the median is the largest left value. Even → average of largest left and smallest right.

**Think of it like this:** two sorted lines of people of different heights. You want to draw one line through both queues so that exactly half the people are "short side" and everyone on the short side is shorter than everyone on the tall side. You slide the cut on the smaller queue until it's right.

**Why it's optimal:** O(log(min(m, n))) — we binary-search only the smaller array.

**Cost:** Time **O(log min(m, n))**. Space **O(1)**.
