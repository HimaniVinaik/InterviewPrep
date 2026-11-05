# 1-D Dynamic Programming

**Recognise it when:** "number of ways", "min/max cost", "can you reach/form", and the brute-force recursion **recomputes the same subproblems**.

**The 5-step recipe**
1. **State:** `dp[i]` = answer for the prefix/suffix ending/starting at `i`. Say it out loud in words.
2. **Recurrence:** how does `dp[i]` depend on smaller states?
3. **Base cases.**
4. **Order:** iterate so dependencies are computed first.
5. **Space optimise:** if `dp[i]` only needs `dp[i-1], dp[i-2]`, keep two variables.

**Top-down vs bottom-up:** memoised recursion is easier to derive; tabulation avoids recursion depth limits and is usually faster. In interviews: derive top-down, then convert.

## Climbing Stairs
- difficulty: Easy
- leetcode: 70
- slug: climbing-stairs

You can climb 1 or 2 steps. How many distinct ways to reach step `n`?

### Hint
`ways(n) = ways(n-1) + ways(n-2)` — Fibonacci.

### Solution
```cpp
class Solution {
public:
    int climbStairs(int n) {
        int a = 1, b = 1;           // ways(0), ways(1)
        for (int i = 2; i <= n; ++i) {
            int c = a + b;
            a = b; b = c;
        }
        return b;
    }
};
```

### Explanation
The last move was either 1 step (from `n-1`) or 2 steps (from `n-2`). Only two previous states are needed → O(1) space. (O(log n) is possible with matrix exponentiation.)

**Time:** O(n) · **Space:** O(1)

## Min Cost Climbing Stairs
- difficulty: Easy
- leetcode: 746
- slug: min-cost-climbing-stairs

`cost[i]` to step on stair `i`; start at 0 or 1; climb 1 or 2. Minimum cost to reach the top (past the last stair).

### Hint
`dp[i] = cost[i] + min(dp[i-1], dp[i-2])`.

### Solution
```cpp
class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        int a = 0, b = 0;                    // min cost to stand at i-2, i-1 (before paying)
        for (int i = 2; i <= (int)cost.size(); ++i) {
            int c = min(b + cost[i - 1], a + cost[i - 2]);
            a = b; b = c;
        }
        return b;
    }
};
```

### Explanation
Define `dp[i]` = min cost to *arrive* at step `i`. Arriving at `i` came from `i-1` (paying `cost[i-1]`) or `i-2` (paying `cost[i-2]`). The top is index `n`.

**Time:** O(n) · **Space:** O(1)

## House Robber
- difficulty: Medium
- leetcode: 198
- slug: house-robber

Maximise money robbed from houses in a row without robbing two adjacent houses.

### Hint
At each house: rob it (+ best up to i-2) or skip it (best up to i-1).

### Solution
```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        int prev2 = 0, prev1 = 0;            // best up to i-2, i-1
        for (int x : nums) {
            int cur = max(prev1, prev2 + x);
            prev2 = prev1; prev1 = cur;
        }
        return prev1;
    }
};
```

### Explanation
The "take or skip" recurrence `dp[i] = max(dp[i-1], dp[i-2] + a[i])` is one of the most reused DP shapes.

**Time:** O(n) · **Space:** O(1)

## House Robber II
- difficulty: Medium
- leetcode: 213
- slug: house-robber-ii

Same as House Robber but houses are in a **circle** (first and last are adjacent).

### Hint
Either the first house is excluded or the last is. Run the linear version twice.

### Solution
```cpp
class Solution {
    int robRange(const vector<int>& a, int lo, int hi) {   // inclusive
        int p2 = 0, p1 = 0;
        for (int i = lo; i <= hi; ++i) { int c = max(p1, p2 + a[i]); p2 = p1; p1 = c; }
        return p1;
    }
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) return nums[0];
        return max(robRange(nums, 0, n - 2), robRange(nums, 1, n - 1));
    }
};
```

### Explanation
Breaking the cycle by case analysis reduces a circular problem to two linear ones — a reusable trick.

**Time:** O(n) · **Space:** O(1)

## Longest Palindromic Substring
- difficulty: Medium
- leetcode: 5
- slug: longest-palindromic-substring

Return the longest palindromic substring.

### Hint
Expand around each of the `2n-1` centres (characters and gaps).

### Solution
```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size(), bestL = 0, bestLen = 0;
        auto expand = [&](int l, int r) {
            while (l >= 0 && r < n && s[l] == s[r]) { --l; ++r; }
            if (r - l - 1 > bestLen) { bestLen = r - l - 1; bestL = l + 1; }
        };
        for (int i = 0; i < n; ++i) {
            expand(i, i);        // odd length
            expand(i, i + 1);    // even length
        }
        return s.substr(bestL, bestLen);
    }
};
```

### Explanation
DP table `pal[i][j]` works too (O(n²) space). Expand-around-centre is O(n²) time with O(1) space. Manacher's algorithm achieves O(n) — know it exists.

**Time:** O(n²) · **Space:** O(1)

## Palindromic Substrings
- difficulty: Medium
- leetcode: 647
- slug: palindromic-substrings

Count palindromic substrings.

### Hint
Same centre expansion; count each successful expansion.

### Solution
```cpp
class Solution {
public:
    int countSubstrings(string s) {
        int n = s.size(), count = 0;
        for (int c = 0; c < 2 * n - 1; ++c) {     // 2n-1 centres
            int l = c / 2, r = l + c % 2;
            while (l >= 0 && r < n && s[l] == s[r]) { ++count; --l; ++r; }
        }
        return count;
    }
};
```

### Explanation
Encoding both centre types with one loop variable (`l = c/2`, `r = l + c%2`) is a neat trick.

**Time:** O(n²) · **Space:** O(1)

## Decode Ways
- difficulty: Medium
- leetcode: 91
- slug: decode-ways

`'A'→1 … 'Z'→26`. Count the ways to decode a digit string.

### Hint
`dp[i]` = ways to decode the first `i` chars. Single digit (non-zero) and two-digit (10–26) transitions.

### Solution
```cpp
class Solution {
public:
    int numDecodings(string s) {
        int n = s.size();
        int prev2 = 1, prev1 = s[0] != '0';      // dp[0], dp[1]
        for (int i = 2; i <= n; ++i) {
            int cur = 0;
            if (s[i - 1] != '0') cur += prev1;                       // one digit
            int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (two >= 10 && two <= 26) cur += prev2;               // two digits
            prev2 = prev1; prev1 = cur;
        }
        return prev1;
    }
};
```

### Explanation
Zeros are the trap: `'0'` alone is invalid, `"06"` is invalid as a pair. The `two >= 10` check rejects leading zeros.

**Time:** O(n) · **Space:** O(1)

## Coin Change
- difficulty: Medium
- leetcode: 322
- slug: coin-change

Fewest coins to make `amount` (unlimited coins of each type), or -1.

### Hint
`dp[a] = 1 + min(dp[a - coin])` over coins.

### Solution
```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        const int INF = amount + 1;                 // larger than any valid answer
        vector<int> dp(amount + 1, INF);
        dp[0] = 0;
        for (int a = 1; a <= amount; ++a)
            for (int c : coins)
                if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);
        return dp[amount] == INF ? -1 : dp[amount];
    }
};
```

### Explanation
Greedy (largest coin first) fails for coins like `{1,3,4}` and amount 6. Using `amount + 1` as infinity avoids `INT_MAX + 1` overflow. This is the **unbounded knapsack**.

**Time:** O(amount × coins) · **Space:** O(amount)

## Maximum Product Subarray
- difficulty: Medium
- leetcode: 152
- slug: maximum-product-subarray

Find the contiguous subarray with the largest product.

### Hint
A negative number flips max and min. Track both.

### Solution
```cpp
class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int best = nums[0], mx = 1, mn = 1;
        for (int x : nums) {
            if (x < 0) swap(mx, mn);              // negative flips extremes
            mx = max(x, mx * x);
            mn = min(x, mn * x);
            best = max(best, mx);
        }
        return best;
    }
};
```

### Explanation
Kadane's variant: the smallest (most negative) product can become the largest after multiplying by a negative. Zeros reset naturally because `max(x, …)` restarts.

**Time:** O(n) · **Space:** O(1)

## Word Break
- difficulty: Medium
- leetcode: 139
- slug: word-break

Can `s` be segmented into dictionary words?

### Hint
`dp[i]` = prefix of length `i` can be segmented. Try each word ending at `i`.

### Solution
```cpp
class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        int n = s.size();
        vector<bool> dp(n + 1, false);
        dp[0] = true;
        for (int i = 1; i <= n; ++i)
            for (const auto& w : wordDict) {
                int L = w.size();
                if (L <= i && dp[i - L] && s.compare(i - L, L, w) == 0) { dp[i] = true; break; }
            }
        return dp[n];
    }
};
```

### Explanation
Iterating over dictionary words (rather than all split points with a hash set) is efficient when words are few. `s.compare(pos, len, w)` avoids allocating substrings.

**Time:** O(n · W · L) · **Space:** O(n)

## Longest Increasing Subsequence
- difficulty: Medium
- leetcode: 300
- slug: longest-increasing-subsequence

Length of the longest strictly increasing subsequence.

### Hint
O(n²) DP is fine; O(n log n): maintain `tails[k]` = smallest tail of an increasing subsequence of length `k+1`.

### Solution
```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;
        for (int x : nums) {
            auto it = ranges::lower_bound(tails, x);   // first tail >= x
            if (it == tails.end()) tails.push_back(x); // extends longest
            else *it = x;                               // better (smaller) tail
        }
        return tails.size();
    }
};
```

### Explanation
`tails` stays sorted, so binary search finds where `x` fits. Replacing a tail with a smaller value never hurts future extensions ("patience sorting"). O(n²) version: `dp[i] = 1 + max(dp[j])` for `j < i, a[j] < a[i]`.

**Time:** O(n log n) · **Space:** O(n)

## Partition Equal Subset Sum
- difficulty: Medium
- leetcode: 416
- slug: partition-equal-subset-sum

Can the array be split into two subsets of equal sum?

### Hint
Subset-sum to `total/2` — 0/1 knapsack. Iterate sums **downward** so each item is used once.

### Solution
```cpp
class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2) return false;
        int target = total / 2;
        vector<char> dp(target + 1, 0);
        dp[0] = 1;
        for (int x : nums)
            for (int s = target; s >= x; --s)     // downward: 0/1 knapsack
                dp[s] |= dp[s - x];
        return dp[target];
    }
};
```

### Explanation
Iterating `s` downward ensures `dp[s - x]` still refers to the previous item's row. (Upward iteration would allow reusing `x` — that's unbounded knapsack.) A `bitset<10001>` version: `bits |= bits << x;` — elegant and fast.

**Time:** O(n · sum) · **Space:** O(sum)
