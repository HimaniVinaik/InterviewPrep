# Sliding Window

**Recognise it when:** the question asks about a **contiguous** subarray/substring — longest, shortest, count, or "contains all of…" — and extending/shrinking the window changes the condition monotonically.

**Variable-size template**

```cpp
int l = 0;
for (int r = 0; r < n; ++r) {
    add(a[r]);                     // expand
    while (windowInvalid()) {      // shrink until valid again
        remove(a[l]);
        ++l;
    }
    best = max(best, r - l + 1);   // window [l, r] is valid
}
```

**Fixed-size:** add `a[r]`, remove `a[r - k]` once `r >= k`.

Each element enters and leaves the window at most once → **O(n)**. If negative numbers break monotonicity (e.g. subarray sum = k with negatives), switch to **prefix sums + hash map**.

## Best Time to Buy and Sell Stock
- difficulty: Easy
- leetcode: 121
- slug: best-time-to-buy-and-sell-stock

`prices[i]` is the price on day `i`. Choose one day to buy and a later day to sell. Return the max profit (or 0).

### Hint
Track the minimum price seen so far.

### Solution
```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = INT_MAX, best = 0;
        for (int p : prices) {
            minPrice = min(minPrice, p);
            best = max(best, p - minPrice);
        }
        return best;
    }
};
```

### Explanation
For each sell day, the best buy day is the cheapest day before it. The "window" is `[argmin, today]`. This is also Kadane's algorithm on the daily differences.

**Time:** O(n) · **Space:** O(1)

## Longest Substring Without Repeating Characters
- difficulty: Medium
- leetcode: 3
- slug: longest-substring-without-repeating-characters

Find the length of the longest substring without repeating characters.

```text
"abcabcbb" -> 3 ("abc")      "pwwkew" -> 3 ("wke")
```

### Hint
Remember the last index of each character; on a repeat, jump `l` past it.

### Solution
```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        array<int, 256> last;
        last.fill(-1);
        int best = 0, l = 0;
        for (int r = 0; r < (int)s.size(); ++r) {
            unsigned char c = s[r];
            if (last[c] >= l) l = last[c] + 1;   // repeat inside window: jump
            last[c] = r;
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

### Explanation
Instead of shrinking one step at a time, jump `l` directly past the previous occurrence. The `last[c] >= l` check ignores stale occurrences that are already outside the window.

**Time:** O(n) · **Space:** O(Σ) = O(256)

## Longest Repeating Character Replacement
- difficulty: Medium
- leetcode: 424
- slug: longest-repeating-character-replacement

Uppercase string `s`; you may replace at most `k` characters. Return the length of the longest substring of one repeated letter you can get.

### Hint
A window is valid if `windowLen - maxFreq <= k`.

### Solution
```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        array<int, 26> cnt{};
        int l = 0, maxf = 0, best = 0;
        for (int r = 0; r < (int)s.size(); ++r) {
            maxf = max(maxf, ++cnt[s[r] - 'A']);
            while (r - l + 1 - maxf > k) {     // too many replacements needed
                --cnt[s[l] - 'A'];
                ++l;
            }
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

### Explanation
Replace everything except the most frequent letter. Subtle point: `maxf` is never decreased when shrinking. That's fine — the answer only improves when a *larger* `maxf` appears, so a stale `maxf` can never produce a wrong (too large) answer.

**Time:** O(n) · **Space:** O(1)

## Permutation in String
- difficulty: Medium
- leetcode: 567
- slug: permutation-in-string

Return `true` if `s2` contains a permutation of `s1` as a substring.

### Hint
Fixed-size window of length `|s1|`; compare letter counts.

### Solution
```cpp
class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int n = s1.size(), m = s2.size();
        if (n > m) return false;
        array<int, 26> need{}, win{};
        for (char c : s1) ++need[c - 'a'];
        for (int r = 0; r < m; ++r) {
            ++win[s2[r] - 'a'];
            if (r >= n) --win[s2[r - n] - 'a'];   // drop char leaving window
            if (win == need) return true;          // std::array has operator==
        }
        return false;
    }
};
```

### Explanation
Slide a window of exactly `|s1|` characters and compare the two 26-element count arrays (constant time). An O(1)-per-step refinement tracks a `matches` counter of equal buckets.

**Time:** O(26·m) = O(m) · **Space:** O(1)

## Minimum Window Substring
- difficulty: Hard
- leetcode: 76
- slug: minimum-window-substring

Return the smallest substring of `s` containing every character of `t` (with multiplicity), or `""`.

```text
s = "ADOBECODEBANC", t = "ABC" -> "BANC"
```

### Hint
Expand until the window covers `t`, then shrink from the left while it still covers. Track how many required characters are still missing.

### Solution
```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        array<int, 128> need{};
        for (char c : t) ++need[c];
        int missing = t.size(), l = 0, bestL = 0, bestLen = INT_MAX;
        for (int r = 0; r < (int)s.size(); ++r) {
            if (need[s[r]]-- > 0) --missing;      // this char was still required
            while (missing == 0) {                 // window covers t
                if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
                if (++need[s[l]] > 0) ++missing;   // removing a required char
                ++l;
            }
        }
        return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
    }
};
```

### Explanation
`need[c]` = how many more `c` the window requires (negative means surplus). `missing` counts total required characters still absent. When `missing == 0`, shrink greedily to find the minimal window ending at `r`.

**Time:** O(|s| + |t|) · **Space:** O(1)

## Sliding Window Maximum
- difficulty: Hard
- leetcode: 239
- slug: sliding-window-maximum

Return the max of every window of size `k`.

```text
nums = [1,3,-1,-3,5,3,6,7], k = 3 -> [3,3,5,5,6,7]
```

### Hint
Monotonic **deque** of indices with decreasing values: front is the max.

### Solution
```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        deque<int> dq;                 // indices; nums[dq] decreasing
        vector<int> out;
        for (int i = 0; i < (int)nums.size(); ++i) {
            if (!dq.empty() && dq.front() <= i - k) dq.pop_front();   // left window
            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back(); // dominated
            dq.push_back(i);
            if (i >= k - 1) out.push_back(nums[dq.front()]);
        }
        return out;
    }
};
```

### Explanation
A smaller element to the left of a bigger one can never be a future max — discard it from the back. Expired indices are removed from the front. Each index is pushed/popped once.

**Time:** O(n) · **Space:** O(k)
