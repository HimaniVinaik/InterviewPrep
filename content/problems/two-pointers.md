# Two Pointers

**Recognise it when:** the input is **sorted** (or can be sorted), you compare elements from both ends, you need pairs/triplets with a target sum, or you must do something **in place**.

**Two flavours**
- **Converging:** `l = 0, r = n-1`, move the pointer that makes the condition "better". Works because sortedness tells you which direction helps.
- **Same direction (fast/slow, read/write):** one pointer scans, another marks where to write (remove duplicates, move zeros, partition).

**Why it works:** each step permanently discards one candidate, so you do O(n) work instead of O(n²) pair checks.

## Valid Palindrome
- difficulty: Easy
- leetcode: 125
- slug: valid-palindrome

A phrase is a palindrome if, after lower-casing and removing all non-alphanumeric characters, it reads the same forward and backward. Return `true` if `s` is a palindrome.

```text
Input: "A man, a plan, a canal: Panama"   Output: true
```

### Hint
Don't build a cleaned copy — skip invalid characters with pointers from both ends.

### Solution
```cpp
class Solution {
public:
    bool isPalindrome(string s) {
        int l = 0, r = (int)s.size() - 1;
        auto ok = [](unsigned char c) { return std::isalnum(c); };
        while (l < r) {
            while (l < r && !ok(s[l])) ++l;
            while (l < r && !ok(s[r])) --r;
            if (std::tolower((unsigned char)s[l]) != std::tolower((unsigned char)s[r]))
                return false;
            ++l; --r;
        }
        return true;
    }
};
```

### Explanation
Converging pointers skip non-alphanumerics and compare case-insensitively.

**C/C++ gotcha:** `isalnum`/`tolower` take an `int` that must be representable as `unsigned char` (or EOF). Passing a negative `char` is undefined behaviour — hence the casts.

**Time:** O(n) · **Space:** O(1)

## Two Sum II - Input Array Is Sorted
- difficulty: Medium
- leetcode: 167
- slug: two-sum-ii-input-array-is-sorted

Given a **1-indexed sorted** array, find two numbers that add to `target`. Return their indices `[i, j]` (1-indexed). Use O(1) extra space.

### Hint
If the sum is too small, which pointer should move?

### Solution
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& a, int target) {
        int l = 0, r = (int)a.size() - 1;
        while (l < r) {
            int sum = a[l] + a[r];
            if (sum == target) return {l + 1, r + 1};
            if (sum < target) ++l;   // need bigger: move left up
            else --r;                // need smaller: move right down
        }
        return {};
    }
};
```

### Explanation
Because the array is sorted, `a[l] + a[r] < target` means `a[l]` can't pair with anything (everything else is ≤ `a[r]`), so discard it. Symmetric argument for the right side.

**Time:** O(n) · **Space:** O(1)

## 3Sum
- difficulty: Medium
- leetcode: 15
- slug: 3sum

Return all unique triplets `[a, b, c]` in `nums` such that `a + b + c == 0`.

```text
Input: [-1,0,1,2,-1,-4]   Output: [[-1,-1,2],[-1,0,1]]
```

### Hint
Sort. Fix the first element, then it's Two Sum II on the rest. Skip duplicates carefully.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        ranges::sort(nums);
        vector<vector<int>> res;
        int n = nums.size();
        for (int i = 0; i < n - 2; ++i) {
            if (nums[i] > 0) break;                          // can't sum to 0 anymore
            if (i > 0 && nums[i] == nums[i - 1]) continue;  // skip duplicate anchors
            int l = i + 1, r = n - 1;
            while (l < r) {
                int s = nums[i] + nums[l] + nums[r];
                if (s < 0) ++l;
                else if (s > 0) --r;
                else {
                    res.push_back({nums[i], nums[l], nums[r]});
                    ++l; --r;
                    while (l < r && nums[l] == nums[l - 1]) ++l; // skip dup seconds
                }
            }
        }
        return res;
    }
};
```

### Explanation
Sorting costs O(n log n) but enables the two-pointer inner loop and makes duplicate-skipping trivial (duplicates are adjacent). The total is O(n²), which is optimal for this problem in practice.

**Time:** O(n²) · **Space:** O(1) extra (ignoring output / sort)

## Container With Most Water
- difficulty: Medium
- leetcode: 11
- slug: container-with-most-water

Given heights `h`, choose two lines that, with the x-axis, form a container holding the most water. Return the max area.

```text
Input: [1,8,6,2,5,4,8,3,7]   Output: 49
```

### Hint
Area = `min(h[l], h[r]) * (r - l)`. Moving the taller line inward can never help — why?

### Solution
```cpp
class Solution {
public:
    int maxArea(vector<int>& h) {
        int l = 0, r = (int)h.size() - 1, best = 0;
        while (l < r) {
            best = max(best, min(h[l], h[r]) * (r - l));
            if (h[l] < h[r]) ++l; else --r;
        }
        return best;
    }
};
```

### Explanation
The width only shrinks as pointers converge, so the only hope of a bigger area is a taller *limiting* line. The shorter side is the limit; moving the taller side keeps the same (or smaller) limit with less width — so always move the shorter side.

**Time:** O(n) · **Space:** O(1)

## Trapping Rain Water
- difficulty: Hard
- leetcode: 42
- slug: trapping-rain-water

Given an elevation map `height`, compute how much water it traps after raining.

```text
Input: [0,1,0,2,1,0,1,3,2,1,2,1]   Output: 6
```

### Hint
Water above bar `i` = `min(maxLeft, maxRight) - height[i]`. With two pointers, the smaller side's max is the binding constraint.

### Solution
```cpp
class Solution {
public:
    int trap(vector<int>& h) {
        int l = 0, r = (int)h.size() - 1;
        int leftMax = 0, rightMax = 0, water = 0;
        while (l < r) {
            if (h[l] < h[r]) {
                leftMax = max(leftMax, h[l]);
                water += leftMax - h[l];     // right side guaranteed >= h[r] > h[l]
                ++l;
            } else {
                rightMax = max(rightMax, h[r]);
                water += rightMax - h[r];
                --r;
            }
        }
        return water;
    }
};
```

### Explanation
Whenever `h[l] < h[r]`, there is a wall at least `h[r]` on the right, so the water at `l` is determined solely by `leftMax`. Process that side and move inward.

Other approaches worth knowing: prefix-max + suffix-max arrays (O(n) space), and a monotonic stack (computes water layer by layer).

**Time:** O(n) · **Space:** O(1)

## Move Zeroes
- difficulty: Easy
- leetcode: 283
- slug: move-zeroes

Move all `0`s to the end of the array **in place** while keeping the relative order of non-zero elements.

### Hint
Read/write pointer pattern: `write` marks where the next non-zero goes.

### Solution
```cpp
class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int write = 0;
        for (int read = 0; read < (int)nums.size(); ++read)
            if (nums[read] != 0) swap(nums[write++], nums[read]);
    }
};
```

### Explanation
`write` always points at the first zero in the processed prefix. Swapping keeps order stable for non-zeros. This is the same skeleton as `std::stable_partition` / `std::remove` (the erase–remove idiom).

**Time:** O(n) · **Space:** O(1)
