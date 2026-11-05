# 2-D Dynamic Programming

**Recognise it when:** the state needs **two indices** — positions in two strings, a grid cell, (item, capacity), (left, right) interval, or (day, holding-state).

**Common shapes**
| Shape | State | Example |
|---|---|---|
| Grid paths | `dp[r][c]` | Unique Paths |
| Two sequences | `dp[i][j]` over prefixes | LCS, Edit Distance |
| Knapsack | `dp[i][cap]` | Coin Change II, Target Sum |
| Interval | `dp[l][r]` | Burst Balloons |
| State machine | `dp[i][state]` | Stock with cooldown |

**Space trick:** if row `i` only depends on row `i-1`, keep a single 1-D array (watch iteration direction!).

## Unique Paths
- difficulty: Medium
- leetcode: 62
- slug: unique-paths

Robot moves only right/down on an `m×n` grid. Count paths from top-left to bottom-right.

### Hint
`dp[r][c] = dp[r-1][c] + dp[r][c-1]`.

### Solution
```cpp
class Solution {
public:
    int uniquePaths(int m, int n) {
        vector<int> dp(n, 1);                  // first row: 1 way each
        for (int r = 1; r < m; ++r)
            for (int c = 1; c < n; ++c)
                dp[c] += dp[c - 1];            // dp[c] (above) + dp[c-1] (left)
        return dp[n - 1];
    }
};
```

### Explanation
Rolling 1-D array: before the update `dp[c]` holds the value from the row above. Combinatorial answer: C(m+n−2, m−1).

**Time:** O(m·n) · **Space:** O(n)

## Longest Common Subsequence
- difficulty: Medium
- leetcode: 1143
- slug: longest-common-subsequence

Return the length of the longest common subsequence of two strings.

### Hint
If `a[i-1] == b[j-1]`: `1 + dp[i-1][j-1]`; else `max(dp[i-1][j], dp[i][j-1])`.

### Solution
```cpp
class Solution {
public:
    int longestCommonSubsequence(string a, string b) {
        int m = a.size(), n = b.size();
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (int i = 1; i <= m; ++i)
            for (int j = 1; j <= n; ++j)
                dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1
                                                : max(dp[i - 1][j], dp[i][j - 1]);
        return dp[m][n];
    }
};
```

### Explanation
`dp[i][j]` = LCS of prefixes `a[0..i)` and `b[0..j)`. The extra row/column of zeros handles empty prefixes. This underlies `diff` and git's line diffing.

**Time:** O(m·n) · **Space:** O(m·n) (O(min) with two rows)

## Best Time to Buy and Sell Stock with Cooldown
- difficulty: Medium
- leetcode: 309
- slug: best-time-to-buy-and-sell-stock-with-cooldown

Unlimited transactions, but after selling you must wait one day. Max profit?

### Hint
State machine: `hold`, `sold` (just sold today), `rest` (free, not holding).

### Solution
```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int hold = INT_MIN / 2, sold = 0, rest = 0;
        for (int p : prices) {
            int prevSold = sold;
            sold = hold + p;                 // sell today
            hold = max(hold, rest - p);      // keep holding, or buy (only from rest)
            rest = max(rest, prevSold);      // cooldown finished / keep resting
        }
        return max(sold, rest);
    }
};
```

### Explanation
Drawing the state machine (rest → hold → sold → rest) makes the transitions obvious. `INT_MIN / 2` as "impossible" avoids overflow when adding `p`. This framework solves the whole stock family.

**Time:** O(n) · **Space:** O(1)

## Coin Change II
- difficulty: Medium
- leetcode: 518
- slug: coin-change-ii

Count the combinations of coins that make `amount` (unlimited each).

### Hint
Loop coins in the **outer** loop to count combinations (not permutations).

### Solution
```cpp
class Solution {
public:
    int change(int amount, vector<int>& coins) {
        vector<unsigned long long> dp(amount + 1, 0);
        dp[0] = 1;
        for (int c : coins)                       // outer: coins => combinations
            for (int a = c; a <= amount; ++a)     // upward: unlimited use
                dp[a] += dp[a - c];
        return (int)dp[amount];
    }
};
```

### Explanation
With coins outside, each combination is built in a fixed coin order, so `{1,2}` and `{2,1}` count once. Swapping the loops counts permutations (that's LC 377 Combination Sum IV). Unsigned type avoids UB on intermediate overflow in LeetCode's adversarial tests.

**Time:** O(amount × coins) · **Space:** O(amount)

## Target Sum
- difficulty: Medium
- leetcode: 494
- slug: target-sum

Assign `+` or `-` to each number; count assignments that sum to `target`.

### Hint
Let P = sum of positives. Then `P = (total + target) / 2` — count subsets with that sum.

### Solution
```cpp
class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (abs(target) > total || (total + target) % 2) return 0;
        int P = (total + target) / 2;
        vector<int> dp(P + 1, 0);
        dp[0] = 1;
        for (int x : nums)
            for (int s = P; s >= x; --s) dp[s] += dp[s - x];   // 0/1 knapsack
        return dp[P];
    }
};
```

### Explanation
`P - N = target` and `P + N = total` ⇒ `P = (total + target)/2`. A brute-force 2ⁿ search turns into a subset-count knapsack. Zeros are handled correctly (each doubles the count).

**Time:** O(n · P) · **Space:** O(P)

## Interleaving String
- difficulty: Medium
- leetcode: 97
- slug: interleaving-string

Is `s3` formed by interleaving `s1` and `s2`?

### Hint
`dp[i][j]` = `s3[0..i+j)` is an interleaving of `s1[0..i)` and `s2[0..j)`.

### Solution
```cpp
class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        int m = s1.size(), n = s2.size();
        if (m + n != (int)s3.size()) return false;
        vector<bool> dp(n + 1, false);
        for (int i = 0; i <= m; ++i)
            for (int j = 0; j <= n; ++j) {
                if (i == 0 && j == 0) { dp[j] = true; continue; }
                bool fromS1 = i > 0 && dp[j] && s1[i - 1] == s3[i + j - 1];
                bool fromS2 = j > 0 && dp[j - 1] && s2[j - 1] == s3[i + j - 1];
                dp[j] = fromS1 || fromS2;
            }
        return dp[n];
    }
};
```

### Explanation
The last character of `s3`'s prefix came from either `s1` or `s2`. Greedy matching fails when both strings offer the same character.

**Time:** O(m·n) · **Space:** O(n)

## Longest Increasing Path in a Matrix
- difficulty: Hard
- leetcode: 329
- slug: longest-increasing-path-in-a-matrix

Longest strictly increasing path moving in 4 directions.

### Hint
DFS + memo. Strictly increasing → no cycles → the graph is a DAG, so memoisation is valid.

### Solution
```cpp
class Solution {
public:
    int longestIncreasingPath(vector<vector<int>>& M) {
        int R = M.size(), C = M[0].size(), best = 0;
        vector<vector<int>> memo(R, vector<int>(C, 0));
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        auto dfs = [&](auto&& self, int r, int c) -> int {
            if (memo[r][c]) return memo[r][c];
            int len = 1;
            for (int k = 0; k < 4; ++k) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && M[nr][nc] > M[r][c])
                    len = max(len, 1 + self(self, nr, nc));
            }
            return memo[r][c] = len;
        };
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) best = max(best, dfs(dfs, r, c));
        return best;
    }
};
```

### Explanation
The strictness guarantees acyclicity, so the answer for each cell is fixed and reusable — DP on a DAG. No visited set is needed.

**Time:** O(R·C) · **Space:** O(R·C)

## Distinct Subsequences
- difficulty: Hard
- leetcode: 115
- slug: distinct-subsequences

Count the distinct subsequences of `s` that equal `t`.

### Hint
`dp[j]` = ways to form `t[0..j)`. For each char of `s`, update `j` from high to low.

### Solution
```cpp
class Solution {
public:
    int numDistinct(string s, string t) {
        int n = t.size();
        vector<unsigned long long> dp(n + 1, 0);
        dp[0] = 1;                                   // empty t: one way
        for (char c : s)
            for (int j = n; j >= 1; --j)             // descending: use old values
                if (t[j - 1] == c) dp[j] += dp[j - 1];
        return (int)dp[n];
    }
};
```

### Explanation
Each char of `s` either matches `t[j-1]` (extending ways for `t[0..j-1)`) or is skipped. Descending `j` = 0/1 usage of the current char.

**Time:** O(|s|·|t|) · **Space:** O(|t|)

## Edit Distance
- difficulty: Medium
- leetcode: 72
- slug: edit-distance

Minimum insertions, deletions, replacements to turn `a` into `b`.

### Hint
Equal chars: `dp[i-1][j-1]`; else `1 + min(insert, delete, replace)`.

### Solution
```cpp
class Solution {
public:
    int minDistance(string a, string b) {
        int m = a.size(), n = b.size();
        vector<int> prev(n + 1), cur(n + 1);
        iota(prev.begin(), prev.end(), 0);           // "" -> b[0..j): j inserts
        for (int i = 1; i <= m; ++i) {
            cur[0] = i;                               // a[0..i) -> "": i deletes
            for (int j = 1; j <= n; ++j)
                cur[j] = a[i - 1] == b[j - 1]
                       ? prev[j - 1]
                       : 1 + min({prev[j - 1],        // replace
                                  prev[j],            // delete a[i-1]
                                  cur[j - 1]});       // insert b[j-1]
            swap(prev, cur);
        }
        return prev[n];
    }
};
```

### Explanation
Levenshtein distance. `min({a, b, c})` uses the initializer-list overload. Two rolling rows reduce space to O(n). Used in spell checkers and DNA alignment.

**Time:** O(m·n) · **Space:** O(n)

## Burst Balloons
- difficulty: Hard
- leetcode: 312
- slug: burst-balloons

Bursting balloon `i` earns `nums[i-1]·nums[i]·nums[i+1]` (neighbours at that moment). Maximise coins.

### Hint
Think about which balloon in `(l, r)` is burst **last** — its neighbours are then exactly `l` and `r`.

### Solution
```cpp
class Solution {
public:
    int maxCoins(vector<int>& nums) {
        vector<int> a{1};
        a.insert(a.end(), nums.begin(), nums.end());
        a.push_back(1);
        int n = a.size();
        vector<vector<int>> dp(n, vector<int>(n, 0));   // dp[l][r]: best inside (l, r)
        for (int len = 2; len < n; ++len)
            for (int l = 0; l + len < n; ++l) {
                int r = l + len;
                for (int k = l + 1; k < r; ++k)          // k burst last
                    dp[l][r] = max(dp[l][r], dp[l][k] + a[l] * a[k] * a[r] + dp[k][r]);
            }
        return dp[0][n - 1];
    }
};
```

### Explanation
Choosing the *first* balloon makes subproblems interact; choosing the *last* splits cleanly into independent intervals. Interval DP iterates by increasing length.

**Time:** O(n³) · **Space:** O(n²)

## Regular Expression Matching
- difficulty: Hard
- leetcode: 10
- slug: regular-expression-matching

Implement matching with `.` (any char) and `*` (zero or more of the preceding element) over the entire string.

### Hint
`dp[i][j]` = `s[i..]` matches `p[j..]`. If `p[j+1] == '*'`: skip `x*` or consume one char if it matches.

### Solution
```cpp
class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[m][n] = true;
        for (int i = m; i >= 0; --i)
            for (int j = n - 1; j >= 0; --j) {
                bool first = i < m && (p[j] == s[i] || p[j] == '.');
                if (j + 1 < n && p[j + 1] == '*')
                    dp[i][j] = dp[i][j + 2] || (first && dp[i + 1][j]);   // skip | use
                else
                    dp[i][j] = first && dp[i + 1][j + 1];
            }
        return dp[0][0];
    }
};
```

### Explanation
Suffix-based DP filled from the bottom-right. For `x*`: either zero occurrences (`j + 2`) or match one char and stay on the same pattern position (`i + 1, j`).

**Time:** O(m·n) · **Space:** O(m·n)
