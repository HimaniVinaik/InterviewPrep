## valid-palindrome

### Approach 1: Build a cleaned string, compare with its reverse
```cpp
class Solution {
public:
    bool isPalindrome(string s) {
        string t;
        for (unsigned char c : s)
            if (isalnum(c)) t += (char)tolower(c);
        return t == string(t.rbegin(), t.rend());
    }
};
```

**Time:** O(n) · **Space:** O(n) for the cleaned copy and its reverse. Easiest to get right; mention the O(1)-space follow-up.

### Approach 2: Cleaned string + two pointers
```cpp
class Solution {
public:
    bool isPalindrome(string s) {
        string t;
        for (unsigned char c : s) if (isalnum(c)) t += (char)tolower(c);
        for (int l = 0, r = (int)t.size() - 1; l < r; ++l, --r)
            if (t[l] != t[r]) return false;
        return true;
    }
};
```

**Time:** O(n) · **Space:** O(n). Halves the comparisons, still copies.

### Walkthrough
**Goal:** compare characters from both ends, ignoring punctuation/case, without copying.

1. `l = 0`, `r = n − 1`.
2. Advance `l` rightwards while `s[l]` is not alphanumeric (and `l < r`).
3. Move `r` leftwards while `s[r]` is not alphanumeric.
4. Compare `tolower(s[l])` and `tolower(s[r])`. Mismatch → not a palindrome.
5. Move both inward and repeat until they meet.

**Dry run** `"A man, a plan"` (first steps):

| l | s[l] | r | s[r] | compare |
|---|---|---|---|---|
| 0 | A | 12 | n | a vs n → **false** |

And for `"race a car"`: r→a, a=a, c=c, e vs a… mismatch at `e`/`a` → false. For `"A man, a plan, a canal: Panama"` every pair matches → true.

**Edge cases:** empty string or only punctuation → loop never compares → true. The `unsigned char` casts avoid UB for bytes ≥ 0x80.

## two-sum-ii-input-array-is-sorted

### Approach 1: Binary search for each complement
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& a, int target) {
        int n = a.size();
        for (int i = 0; i < n; ++i) {
            int need = target - a[i];
            // search only to the right of i so we don't reuse a[i]
            auto it = lower_bound(a.begin() + i + 1, a.end(), need);
            if (it != a.end() && *it == need) return {i + 1, int(it - a.begin()) + 1};
        }
        return {};
    }
};
```

**Time:** O(n log n) · **Space:** O(1). Uses sortedness, but not fully.

### Approach 2: Hash map (ignores sortedness)
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& a, int target) {
        unordered_map<int, int> idx;
        for (int i = 0; i < (int)a.size(); ++i) {
            if (auto it = idx.find(target - a[i]); it != idx.end()) return {it->second + 1, i + 1};
            idx[a[i]] = i;
        }
        return {};
    }
};
```

**Time:** O(n) · **Space:** O(n) — violates the O(1) space requirement, but worth contrasting.

### Walkthrough
**Goal:** exploit sorted order to discard one candidate per step.

1. `l` at the smallest value, `r` at the largest.
2. `sum = a[l] + a[r]`.
3. `sum == target` → done (convert to 1-indexed).
4. `sum < target` → we need a bigger sum. `a[l]` paired with the *largest* remaining value is still too small, so `a[l]` can't be in any answer → `++l`.
5. `sum > target` → symmetric: `a[r]` is too big even with the smallest value → `--r`.

**Dry run** `a = [2, 7, 11, 15]`, `target = 9`:

| l | r | a[l]+a[r] | action |
|---|---|---|---|
| 0 | 3 | 17 | > 9 → r-- |
| 0 | 2 | 13 | > 9 → r-- |
| 0 | 1 | 9 | found → [1, 2] |

**Why it never misses the answer:** each pointer move eliminates a value that provably cannot be part of a solution, so the true pair is never skipped.

## 3sum

### Approach 1: Brute force with a set to dedupe
```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        ranges::sort(nums);
        set<vector<int>> uniq;
        int n = nums.size();
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j)
                for (int k = j + 1; k < n; ++k)
                    if (nums[i] + nums[j] + nums[k] == 0) uniq.insert({nums[i], nums[j], nums[k]});
        return {uniq.begin(), uniq.end()};
    }
};
```

**Time:** O(n³) · **Space:** O(answers). Too slow (n up to 3000).

### Approach 2: Fix one, hash-set Two Sum on the rest
```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        ranges::sort(nums);
        vector<vector<int>> res;
        int n = nums.size();
        for (int i = 0; i < n; ++i) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;       // skip duplicate anchors
            unordered_set<int> seen;
            for (int j = i + 1; j < n; ++j) {
                int need = -nums[i] - nums[j];
                if (seen.count(need)) {
                    res.push_back({nums[i], need, nums[j]});
                    while (j + 1 < n && nums[j] == nums[j + 1]) ++j;   // skip duplicate thirds
                }
                seen.insert(nums[j]);
            }
        }
        return res;
    }
};
```

**Time:** O(n²) · **Space:** O(n). Same complexity as Optimal but more memory and trickier dedupe.

### Walkthrough
**Goal:** reduce 3Sum to n runs of the two-pointer Two Sum II.

1. **Sort** so duplicates are adjacent and two pointers work.
2. For each anchor `i`:
   1. If `nums[i] > 0`, all later numbers are positive too — no triplet can sum to 0 → break.
   2. If `nums[i] == nums[i-1]`, we already found every triplet starting with this value → skip.
   3. Run two pointers `l = i+1`, `r = n−1` looking for `nums[l] + nums[r] == −nums[i]`.
3. On a match, record it, move both pointers, and skip duplicate values of `nums[l]` so the same triplet isn't added twice.

**Dry run** `[-1, 0, 1, 2, -1, -4]` → sorted `[-4, -1, -1, 0, 1, 2]`:

| i (val) | l, r | sum | action |
|---|---|---|---|
| 0 (−4) | 1,5 | −4−1+2=−3 | < 0 → l++ … all sums < 0, no match |
| 1 (−1) | 2,5 | −1−1+2=0 | **[−1,−1,2]**, l→3, r→4 |
| 1 (−1) | 3,4 | −1+0+1=0 | **[−1,0,1]**, l→4, r→3 stop |
| 2 (−1) | — | — | duplicate anchor → skip |
| 3 (0) | 4,5 | 0+1+2=3 | > 0 → r--, stop |
| 4 (1) | — | — | 1 > 0 → break |

Result `[[-1,-1,2], [-1,0,1]]`.

## container-with-most-water

### Approach 1: Brute force over all pairs
```cpp
class Solution {
public:
    int maxArea(vector<int>& h) {
        int best = 0, n = h.size();
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j)
                best = max(best, min(h[i], h[j]) * (j - i));
        return best;
    }
};
```

**Time:** O(n²) · **Space:** O(1). TLE for n = 10⁵.

### Approach 2: Two pointers that skip non-improving heights
```cpp
class Solution {
public:
    int maxArea(vector<int>& h) {
        int l = 0, r = (int)h.size() - 1, best = 0;
        while (l < r) {
            int H = min(h[l], h[r]);
            best = max(best, H * (r - l));
            while (l < r && h[l] <= H) ++l;     // skip lines that can't beat height H
            while (l < r && h[r] <= H) --r;
        }
        return best;
    }
};
```

**Time:** O(n) · **Space:** O(1). Same idea as Optimal with a constant-factor speed-up.

### Walkthrough
**Goal:** maximise `min(h[l], h[r]) × (r − l)`.

1. Start with the widest container: `l = 0`, `r = n − 1`.
2. Record its area.
3. **Key argument:** suppose `h[l] < h[r]`. Any container using `l` with a *closer* right wall has smaller width and height ≤ `h[l]`. So `l` has already achieved its best possible area → discard it (`++l`). Symmetric if `h[r]` is shorter.
4. Repeat until the pointers meet; each step discards one line → O(n).

**Dry run** `[1, 8, 6, 2, 5, 4, 8, 3, 7]`:

| l (h) | r (h) | area | best | move |
|---|---|---|---|---|
| 0 (1) | 8 (7) | 1·8 = 8 | 8 | l (shorter) |
| 1 (8) | 8 (7) | 7·7 = 49 | 49 | r |
| 1 (8) | 7 (3) | 3·6 = 18 | 49 | r |
| 1 (8) | 6 (8) | 8·5 = 40 | 49 | r (tie) |
| 1 (8) | 5 (4) | 4·4 = 16 | 49 | r |
| … | … | smaller | 49 | … |

Answer **49**.

## trapping-rain-water

### Approach 1: Brute force per bar
```cpp
class Solution {
public:
    int trap(vector<int>& h) {
        int n = h.size(), water = 0;
        for (int i = 0; i < n; ++i) {
            int lmax = 0, rmax = 0;
            for (int j = 0; j <= i; ++j) lmax = max(lmax, h[j]);
            for (int j = i; j < n; ++j) rmax = max(rmax, h[j]);
            water += min(lmax, rmax) - h[i];
        }
        return water;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Prefix-max and suffix-max arrays
```cpp
class Solution {
public:
    int trap(vector<int>& h) {
        int n = h.size();
        if (n == 0) return 0;
        vector<int> L(n), R(n);
        L[0] = h[0];
        for (int i = 1; i < n; ++i) L[i] = max(L[i - 1], h[i]);
        R[n - 1] = h[n - 1];
        for (int i = n - 2; i >= 0; --i) R[i] = max(R[i + 1], h[i]);
        int water = 0;
        for (int i = 0; i < n; ++i) water += min(L[i], R[i]) - h[i];
        return water;
    }
};
```

**Time:** O(n) · **Space:** O(n). The cleanest way to *explain* the formula.

### Approach 3: Monotonic stack (fills water layer by layer)
```cpp
class Solution {
public:
    int trap(vector<int>& h) {
        vector<int> st;            // indices with decreasing heights
        int water = 0;
        for (int i = 0; i < (int)h.size(); ++i) {
            while (!st.empty() && h[i] > h[st.back()]) {
                int bottom = st.back(); st.pop_back();
                if (st.empty()) break;                       // no left wall
                int left = st.back();
                int width = i - left - 1;
                int height = min(h[left], h[i]) - h[bottom];
                water += width * height;                     // horizontal slab
            }
            st.push_back(i);
        }
        return water;
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Walkthrough
**Goal:** water above bar i = `min(maxLeft(i), maxRight(i)) − h[i]`; compute without arrays.

1. Pointers `l = 0`, `r = n−1`; running maxima `leftMax`, `rightMax`.
2. If `h[l] < h[r]`: the right side has a wall at least `h[r] > h[l]`. Therefore the binding constraint for position `l` is `leftMax` alone (the true right max is ≥ `h[r]`, which is bigger than anything that matters). Update `leftMax`, add `leftMax − h[l]`, `++l`.
3. Else the mirror image on the right.
4. Stop when they meet.

**Dry run** `[0,1,0,2,1,0,1,3,2,1,2,1]` (first part):

| l | r | h[l] | h[r] | side | max | water added | total |
|---|---|---|---|---|---|---|---|
| 0 | 11 | 0 | 1 | left | 0 | 0 | 0 |
| 1 | 11 | 1 | 1 | right | 1 | 0 | 0 |
| 1 | 10 | 1 | 2 | left | 1 | 0 | 0 |
| 2 | 10 | 0 | 2 | left | 1 | 1 | 1 |
| 3 | 10 | 2 | 2 | right | 2 | 0 | 1 |
| 3 | 9 | 2 | 1 | right | 2 | 1 | 2 |
| 3 | 8 | 2 | 2 | right | 2 | 0 | 2 |
| 3 | 7 | 2 | 3 | left | 2 | 0 | 2 |
| 4 | 7 | 1 | 3 | left | 2 | 1 | 3 |
| 5 | 7 | 0 | 3 | left | 2 | 2 | 5 |
| 6 | 7 | 1 | 3 | left | 2 | 1 | **6** |

## move-zeroes

### Approach 1: Extra array
```cpp
class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        vector<int> out;
        out.reserve(nums.size());
        for (int x : nums) if (x != 0) out.push_back(x);
        out.resize(nums.size(), 0);               // pad with zeros
        nums = std::move(out);
    }
};
```

**Time:** O(n) · **Space:** O(n) — violates "in place".

### Approach 2: Compact then fill
```cpp
class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int w = 0;
        for (int x : nums) if (x != 0) nums[w++] = x;         // overwrite with non-zeros
        fill(nums.begin() + w, nums.end(), 0);                // zero the tail
        // STL: auto it = remove(nums.begin(), nums.end(), 0); fill(it, nums.end(), 0);
    }
};
```

**Time:** O(n) · **Space:** O(1). Does more writes than the swap version when there are few zeros.

### Walkthrough
**Goal:** stable compaction of non-zeros to the front, in place.

1. `write = 0` marks the next slot for a non-zero.
2. Scan with `read`. When `nums[read] != 0`, swap it into `nums[write]` and increment `write`.
3. Invariant: `nums[0..write)` are the non-zeros seen so far in original order; `nums[write..read)` are all zeros.

**Dry run** `[0, 1, 0, 3, 12]`:

| read | nums[read] | swap? | array after | write |
|---|---|---|---|---|
| 0 | 0 | no | [0,1,0,3,12] | 0 |
| 1 | 1 | swap(0,1) | [1,0,0,3,12] | 1 |
| 2 | 0 | no | same | 1 |
| 3 | 3 | swap(1,3) | [1,3,0,0,12] | 2 |
| 4 | 12 | swap(2,4) | [1,3,12,0,0] | 3 |
