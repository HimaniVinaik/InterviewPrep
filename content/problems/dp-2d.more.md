## unique-paths

### Approach 1: Memoised recursion
```cpp
class Solution {
    vector<vector<int>> memo;
    int paths(int r, int c) {
        if (r == 0 || c == 0) return 1;                // first row/column: one straight path
        int& m = memo[r][c];
        if (m) return m;
        return m = paths(r - 1, c) + paths(r, c - 1);
    }
public:
    int uniquePaths(int m, int n) { memo.assign(m, vector<int>(n, 0)); return paths(m - 1, n - 1); }
};
```

**Time:** O(m·n) · **Space:** O(m·n).

### Approach 2: Combinatorics
```cpp
class Solution {
public:
    int uniquePaths(int m, int n) {
        // choose which (m-1) of the (m+n-2) moves are "down"
        long long res = 1;
        int total = m + n - 2, k = min(m, n) - 1;
        for (int i = 1; i <= k; ++i) res = res * (total - k + i) / i;   // stays an exact integer each step
        return (int)res;
    }
};
```

**Time:** O(min(m, n)) · **Space:** O(1). Every path is a sequence of m−1 downs and n−1 rights → C(m+n−2, m−1).

### Walkthrough
**Goal:** count right/down paths from the top-left to the bottom-right of an m×n grid.

1. **State:** `dp[r][c]` = number of paths reaching cell (r, c).
2. **Recurrence:** the last move came from above or from the left → `dp[r][c] = dp[r−1][c] + dp[r][c−1]`.
3. **Base:** first row and first column are all 1.
4. **1-D optimisation:** keep one row; before updating `dp[c]` it still holds the value from the row above, and `dp[c−1]` already holds the current row's left neighbour.

**Dry run** m = 3, n = 3:

| row | dp after the row |
|---|---|
| 0 | [1, 1, 1] |
| 1 | [1, 2, 3] |
| 2 | [1, 3, 6] |

Answer **6** = C(4, 2).

## longest-common-subsequence

### Approach 1: Plain recursion
```cpp
class Solution {
    int go(const string& a, const string& b, int i, int j) {
        if (i == (int)a.size() || j == (int)b.size()) return 0;
        if (a[i] == b[j]) return 1 + go(a, b, i + 1, j + 1);
        return max(go(a, b, i + 1, j), go(a, b, i, j + 1));
    }
public:
    int longestCommonSubsequence(string a, string b) { return go(a, b, 0, 0); }
};
```

**Time:** O(2^(m+n)) · **Space:** O(m + n). Memoising on (i, j) turns it into the table solution.

### Approach 2: Two rolling rows
```cpp
class Solution {
public:
    int longestCommonSubsequence(string a, string b) {
        if (a.size() < b.size()) swap(a, b);                  // keep rows short
        vector<int> prev(b.size() + 1, 0), cur(b.size() + 1, 0);
        for (size_t i = 1; i <= a.size(); ++i) {
            for (size_t j = 1; j <= b.size(); ++j)
                cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] + 1 : max(prev[j], cur[j - 1]);
            swap(prev, cur);
        }
        return prev[b.size()];
    }
};
```

**Time:** O(m·n) · **Space:** O(min(m, n)).

### Walkthrough
**Goal:** longest sequence of characters appearing in both strings in order (not necessarily contiguous).

1. **State:** `dp[i][j]` = LCS of `a[0..i)` and `b[0..j)`.
2. If the last characters match (`a[i−1] == b[j−1]`), they can both be the last LCS character → `dp[i−1][j−1] + 1`.
3. Otherwise one of them isn't in the LCS → `max(dp[i−1][j], dp[i][j−1])`.
4. Row 0 / column 0 = 0 (empty prefix).

**Dry run** `a = "abcde"`, `b = "ace"`:

|   | "" | a | c | e |
|---|---|---|---|---|
| "" | 0 | 0 | 0 | 0 |
| a | 0 | 1 | 1 | 1 |
| b | 0 | 1 | 1 | 1 |
| c | 0 | 1 | 2 | 2 |
| d | 0 | 1 | 2 | 2 |
| e | 0 | 1 | 2 | **3** |

LCS = "ace" (length 3). Reconstruct it by walking back from the bottom-right: diagonal on matches, otherwise towards the larger neighbour.

## best-time-to-buy-and-sell-stock-with-cooldown

### Approach 1: Memoised recursion over (day, holding)
```cpp
class Solution {
    vector<array<int, 2>> memo;
    vector<array<bool, 2>> done;
    int best(const vector<int>& p, int i, int holding) {
        if (i >= (int)p.size()) return 0;
        if (done[i][holding]) return memo[i][holding];
        int rest = best(p, i + 1, holding);                       // do nothing today
        int act = holding ? p[i] + best(p, i + 2, 0)               // sell, then skip a day (cooldown)
                          : -p[i] + best(p, i + 1, 1);             // buy
        done[i][holding] = true;
        return memo[i][holding] = max(rest, act);
    }
public:
    int maxProfit(vector<int>& prices) {
        memo.assign(prices.size(), {0, 0}); done.assign(prices.size(), {false, false});
        return best(prices, 0, 0);
    }
};
```

**Time:** O(n) · **Space:** O(n). The cooldown is just "jump to i + 2 after selling".

### Approach 2: Explicit DP arrays
```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int n = prices.size();
        if (n < 2) return 0;
        vector<int> hold(n), cash(n);          // best profit at end of day i holding / not holding
        hold[0] = -prices[0]; cash[0] = 0;
        for (int i = 1; i < n; ++i) {
            int cashTwoAgo = i >= 2 ? cash[i - 2] : 0;
            hold[i] = max(hold[i - 1], cashTwoAgo - prices[i]);   // buy only if we didn't sell yesterday
            cash[i] = max(cash[i - 1], hold[i - 1] + prices[i]);
        }
        return cash[n - 1];
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Walkthrough
**Goal:** max profit with unlimited trades, one-day cooldown after each sale.

1. Three states at the end of each day: **hold** (own a share), **sold** (sold today → cooldown tomorrow), **rest** (no share, free to buy).
2. Transitions:
   1. `hold = max(hold, rest − price)` — keep holding, or buy today (only allowed from `rest`).
   2. `sold = hold + price` — sell the share held yesterday.
   3. `rest = max(rest, sold_yesterday)` — stay idle, or finish the cooldown.
3. Answer `max(sold, rest)`.

**Dry run** `[1, 2, 3, 0, 2]`:

| day | price | hold | sold | rest |
|---|---|---|---|---|
| start | | −∞ | 0 | 0 |
| 0 | 1 | −1 | −∞ | 0 |
| 1 | 2 | −1 | 1 | 0 |
| 2 | 3 | −1 | 2 | 1 |
| 3 | 0 | 1 | −1 | 2 |
| 4 | 2 | 1 | 3 | 2 |

Answer **3** (buy 1, sell 2, cooldown, buy 0, sell 2).

## coin-change-ii

### Approach 1: Memoised recursion (coin index, amount)
```cpp
class Solution {
    vector<vector<int>> memo;
    int ways(const vector<int>& c, int i, int amt) {
        if (amt == 0) return 1;
        if (i == (int)c.size() || amt < 0) return 0;
        int& m = memo[i][amt];
        if (m != -1) return m;
        return m = ways(c, i, amt - c[i])          // use coin i again
                 + ways(c, i + 1, amt);            // never use coin i again
    }
public:
    int change(int amount, vector<int>& coins) {
        memo.assign(coins.size(), vector<int>(amount + 1, -1));
        return ways(coins, 0, amount);
    }
};
```

**Time:** O(coins × amount) · **Space:** O(coins × amount). The "stay on i / move to i + 1" split is what prevents counting permutations.

### Approach 2: Full 2-D table
```cpp
class Solution {
public:
    int change(int amount, vector<int>& coins) {
        int n = coins.size();
        vector<vector<unsigned long long>> dp(n + 1, vector<unsigned long long>(amount + 1, 0));
        for (int i = 0; i <= n; ++i) dp[i][0] = 1;          // one way to make 0
        for (int i = 1; i <= n; ++i)
            for (int a = 1; a <= amount; ++a) {
                dp[i][a] = dp[i - 1][a];                    // without coin i
                if (a >= coins[i - 1]) dp[i][a] += dp[i][a - coins[i - 1]];   // with coin i (row i: reuse)
            }
        return (int)dp[n][amount];
    }
};
```

**Time:** O(n × amount) · **Space:** O(n × amount). Collapsing the rows gives the Optimal 1-D version.

### Walkthrough
**Goal:** number of **combinations** (order doesn't matter) of coins summing to `amount`.

1. `dp[a]` = number of ways to make `a` using the coins processed so far. `dp[0] = 1`.
2. **Outer loop over coins**, inner over amounts ascending: `dp[a] += dp[a − coin]`.
3. Because each coin is fully processed before the next, every combination is built in one canonical coin order → no duplicates like (1,2) vs (2,1).
4. Ascending `a` allows reusing the same coin (unbounded).

**Dry run** `amount = 5`, `coins = [1, 2, 5]`:

| after coin | dp[0..5] |
|---|---|
| — | 1 0 0 0 0 0 |
| 1 | 1 1 1 1 1 1 |
| 2 | 1 1 2 2 3 3 |
| 5 | 1 1 2 2 3 **4** |

The 4 ways: 5, 2+2+1, 2+1+1+1, 1×5.

## target-sum

### Approach 1: Brute force recursion (+/− each number)
```cpp
class Solution {
    int go(const vector<int>& a, int i, int sum, int target) {
        if (i == (int)a.size()) return sum == target;
        return go(a, i + 1, sum + a[i], target) + go(a, i + 1, sum - a[i], target);
    }
public:
    int findTargetSumWays(vector<int>& nums, int target) { return go(nums, 0, 0, target); }
};
```

**Time:** O(2ⁿ) · **Space:** O(n). n ≤ 20 → about a million calls, actually accepted — but don't stop here.

### Approach 2: DP over reachable sums (map)
```cpp
class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        unordered_map<int, int> ways{{0, 1}};           // sum -> number of sign assignments
        for (int x : nums) {
            unordered_map<int, int> next;
            for (auto [s, c] : ways) { next[s + x] += c; next[s - x] += c; }
            ways = std::move(next);
        }
        return ways.count(target) ? ways[target] : 0;
    }
};
```

**Time:** O(n · S) where S = range of sums · **Space:** O(S). Direct DP without the algebra trick.

### Walkthrough
**Goal:** count sign assignments `±a₁ ± a₂ … = target`.

1. Let P = sum of numbers given `+`, N = sum given `−`. Then `P − N = target` and `P + N = total`.
2. Adding: `P = (total + target) / 2`. So count subsets with sum P (0/1 knapsack count).
3. If `|target| > total` or `total + target` is odd → 0.
4. `dp[s]` = number of subsets summing to s; for each x, iterate s **downward**: `dp[s] += dp[s − x]`.

**Dry run** `nums = [1, 1, 1, 1, 1]`, target 3 → total 5, P = 4:

| after x | dp[0..4] |
|---|---|
| — | 1 0 0 0 0 |
| 1 | 1 1 0 0 0 |
| 1 | 1 2 1 0 0 |
| 1 | 1 3 3 1 0 |
| 1 | 1 4 6 4 1 |
| 1 | 1 5 10 10 **5** |

Answer **5** (choose which one of the five 1s gets the minus sign).

## interleaving-string

### Approach 1: Memoised recursion
```cpp
class Solution {
    vector<vector<int>> memo;
    bool go(const string& a, const string& b, const string& c, int i, int j) {
        if (i == (int)a.size() && j == (int)b.size()) return true;
        int& m = memo[i][j];
        if (m != -1) return m;
        bool r = (i < (int)a.size() && a[i] == c[i + j] && go(a, b, c, i + 1, j)) ||
                 (j < (int)b.size() && b[j] == c[i + j] && go(a, b, c, i, j + 1));
        return m = r;
    }
public:
    bool isInterleave(string s1, string s2, string s3) {
        if (s1.size() + s2.size() != s3.size()) return false;
        memo.assign(s1.size() + 1, vector<int>(s2.size() + 1, -1));
        return go(s1, s2, s3, 0, 0);
    }
};
```

**Time:** O(m·n) · **Space:** O(m·n). Note `k = i + j` — the position in s3 is determined by i and j.

### Approach 2: BFS over (i, j) states
```cpp
class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        int m = s1.size(), n = s2.size();
        if (m + n != (int)s3.size()) return false;
        vector<vector<bool>> seen(m + 1, vector<bool>(n + 1, false));
        queue<pair<int, int>> q; q.push({0, 0}); seen[0][0] = true;
        while (!q.empty()) {
            auto [i, j] = q.front(); q.pop();
            if (i == m && j == n) return true;
            if (i < m && s1[i] == s3[i + j] && !seen[i + 1][j]) { seen[i + 1][j] = true; q.push({i + 1, j}); }
            if (j < n && s2[j] == s3[i + j] && !seen[i][j + 1]) { seen[i][j + 1] = true; q.push({i, j + 1}); }
        }
        return false;
    }
};
```

**Time:** O(m·n) · **Space:** O(m·n). Shows the DP as a path search in an (m+1)×(n+1) grid.

### Walkthrough
**Goal:** can s3 be formed by merging s1 and s2 while keeping each one's order?

1. **State:** `dp[i][j]` = `s3[0..i+j)` is an interleaving of `s1[0..i)` and `s2[0..j)`.
2. The last character `s3[i+j−1]` came from s1 (needs `s1[i−1]` to match and `dp[i−1][j]`) or from s2 (`s2[j−1]` matches and `dp[i][j−1]`).
3. `dp[0][0] = true`. Answer `dp[m][n]`.

**Dry run** `s1 = "aab"`, `s2 = "axy"`, `s3 = "aaxaby"` — one successful path through the (i, j) grid:

| (i, j) | next char of s3 | taken from | reaches |
|---|---|---|---|
| (0,0) | a | s1[0] | (1,0) |
| (1,0) | a | s2[0] | (1,1) |
| (1,1) | x | s2[1] | (1,2) |
| (1,2) | a | s1[1] | (2,2) |
| (2,2) | b | s1[2] | (3,2) |
| (3,2) | y | s2[2] | (3,3) ✔ |

Note the dead end: from (1,0) taking `s1[1] = 'a'` leads to (2,0), where s3 needs `x` but s1 offers `b` and s2 offers `a`. The DP explores both options at once.

Greedy (always take from s1 when it matches) fails on inputs like this because both strings can offer the same character.

## longest-increasing-path-in-a-matrix

### Approach 1: Topological sort (peel layers starting from local maxima)
```cpp
class Solution {
public:
    int longestIncreasingPath(vector<vector<int>>& M) {
        int R = M.size(), C = M[0].size();
        vector<vector<int>> outdeg(R, vector<int>(C, 0));
        constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c)
            for (int k = 0; k < 4; ++k) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && M[nr][nc] > M[r][c]) ++outdeg[r][c];
            }
        queue<pair<int, int>> q;                         // start from local maxima (no larger neighbour)
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c) if (!outdeg[r][c]) q.push({r, c});
        int layers = 0;
        while (!q.empty()) {
            ++layers;
            for (int sz = q.size(); sz > 0; --sz) {
                auto [r, c] = q.front(); q.pop();
                for (int k = 0; k < 4; ++k) {
                    int nr = r + dr[k], nc = c + dc[k];
                    if (nr >= 0 && nc >= 0 && nr < R && nc < C && M[nr][nc] < M[r][c] && --outdeg[nr][nc] == 0)
                        q.push({nr, nc});
                }
            }
        }
        return layers;                                   // number of BFS layers = longest path length
    }
};
```

**Time:** O(R·C) · **Space:** O(R·C). Kahn's algorithm on the DAG; the number of layers is the longest path.

### Approach 2: Sort cells by value, DP in increasing order
```cpp
class Solution {
public:
    int longestIncreasingPath(vector<vector<int>>& M) {
        int R = M.size(), C = M[0].size(), best = 0;
        vector<tuple<int, int, int>> cells;
        for (int r = 0; r < R; ++r) for (int c = 0; c < C; ++c) cells.push_back({M[r][c], r, c});
        ranges::sort(cells);
        vector<vector<int>> dp(R, vector<int>(C, 1));    // longest increasing path ENDING at (r, c)
        for (auto [v, r, c] : cells)
            for (auto [nr, nc] : {pair{r + 1, c}, pair{r - 1, c}, pair{r, c + 1}, pair{r, c - 1}})
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && M[nr][nc] < v)
                    dp[r][c] = max(dp[r][c], dp[nr][nc] + 1);
        for (auto& row : dp) best = max(best, *ranges::max_element(row));
        return best;
    }
};
```

**Time:** O(R·C log(R·C)) · **Space:** O(R·C). Sorting gives a valid topological order directly.

### Walkthrough
**Goal:** longest strictly increasing path moving up/down/left/right.

1. Moving only to strictly larger values means **no cycles** → the grid is a DAG → each cell's answer is fixed and can be memoised.
2. `dfs(r, c)` = 1 + max `dfs` over neighbours with a larger value (or 1 if none).
3. Memoise in `memo[r][c]`; no visited set needed (you can't loop back to a smaller value).
4. Answer = max over all cells.

**Dry run**

```text
9 9 4
6 6 8
2 1 1
```

| cell | value | larger neighbours | dfs |
|---|---|---|---|
| (0,0) | 9 | — | 1 |
| (1,0) | 6 | 9 | 2 |
| (2,0) | 2 | 6 | 3 |
| (2,1) | 1 | 2, 6 | **4** (1 → 2 → 6 → 9) |

## distinct-subsequences

### Approach 1: Memoised recursion
```cpp
class Solution {
    vector<vector<long long>> memo;
    long long go(const string& s, const string& t, int i, int j) {
        if (j == (int)t.size()) return 1;                    // matched all of t
        if (s.size() - i < t.size() - j) return 0;           // not enough characters left
        long long& m = memo[i][j];
        if (m != -1) return m;
        long long r = go(s, t, i + 1, j);                    // skip s[i]
        if (s[i] == t[j]) r += go(s, t, i + 1, j + 1);        // use s[i] for t[j]
        return m = r;
    }
public:
    int numDistinct(string s, string t) {
        memo.assign(s.size() + 1, vector<long long>(t.size() + 1, -1));
        return (int)go(s, t, 0, 0);
    }
};
```

**Time:** O(|s|·|t|) · **Space:** O(|s|·|t|).

### Approach 2: Full 2-D table
```cpp
class Solution {
public:
    int numDistinct(string s, string t) {
        int m = s.size(), n = t.size();
        vector<vector<unsigned long long>> dp(m + 1, vector<unsigned long long>(n + 1, 0));
        for (int i = 0; i <= m; ++i) dp[i][0] = 1;           // empty t: one way
        for (int i = 1; i <= m; ++i)
            for (int j = 1; j <= n; ++j)
                dp[i][j] = dp[i - 1][j] + (s[i - 1] == t[j - 1] ? dp[i - 1][j - 1] : 0);
        return (int)dp[m][n];
    }
};
```

**Time:** O(m·n) · **Space:** O(m·n).

### Walkthrough
**Goal:** number of ways to delete characters of `s` to obtain `t`.

1. **State:** `dp[i][j]` = ways to form `t[0..j)` from `s[0..i)`.
2. Character `s[i−1]` is either **not used** → `dp[i−1][j]`, or **used to match** `t[j−1]` (only if equal) → `dp[i−1][j−1]`.
3. `dp[i][0] = 1`: one way to form the empty string.
4. 1-D version: iterate `j` **downward** so `dp[j−1]` is still the previous row's value.

**Dry run** `s = "rabbbit"`, `t = "rabbit"` — the answer is **3**: the three ways choose which one of the three `b`s in "rab**bb**b" is dropped. In the table, the column for `t = "rab"` reaches 3 after the third `b` (C(3, 2) ways to pick 2 of 3 `b`s for "bb"), and that count flows through `i`, `t` unchanged.

## edit-distance

### Approach 1: Plain recursion
```cpp
class Solution {
    int go(const string& a, const string& b, int i, int j) {
        if (i == (int)a.size()) return b.size() - j;          // insert the rest of b
        if (j == (int)b.size()) return a.size() - i;          // delete the rest of a
        if (a[i] == b[j]) return go(a, b, i + 1, j + 1);
        return 1 + min({go(a, b, i + 1, j + 1),               // replace
                        go(a, b, i + 1, j),                   // delete a[i]
                        go(a, b, i, j + 1)});                 // insert b[j]
    }
public:
    int minDistance(string a, string b) { return go(a, b, 0, 0); }
};
```

**Time:** O(3^(m+n)) · **Space:** O(m + n).

### Approach 2: Full 2-D table (enables reconstructing the edits)
```cpp
class Solution {
public:
    int minDistance(string a, string b) {
        int m = a.size(), n = b.size();
        vector<vector<int>> dp(m + 1, vector<int>(n + 1));
        for (int i = 0; i <= m; ++i) dp[i][0] = i;
        for (int j = 0; j <= n; ++j) dp[0][j] = j;
        for (int i = 1; i <= m; ++i)
            for (int j = 1; j <= n; ++j)
                dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1]
                         : 1 + min({dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]});
        return dp[m][n];
    }
};
```

**Time:** O(m·n) · **Space:** O(m·n). Walking back from `dp[m][n]` recovers the actual edit script (what `diff` does).

### Walkthrough
**Goal:** minimum insert/delete/replace operations to turn `a` into `b`.

1. **State:** `dp[i][j]` = edits to turn `a[0..i)` into `b[0..j)`.
2. **Base:** `dp[i][0] = i` (delete all), `dp[0][j] = j` (insert all).
3. If `a[i−1] == b[j−1]`: no cost → `dp[i−1][j−1]`.
4. Else 1 + min of: replace `dp[i−1][j−1]`, delete `dp[i−1][j]`, insert `dp[i][j−1]`.

**Dry run** `a = "horse"`, `b = "ros"`:

|   | "" | r | o | s |
|---|---|---|---|---|
| "" | 0 | 1 | 2 | 3 |
| h | 1 | 1 | 2 | 3 |
| o | 2 | 2 | 1 | 2 |
| r | 3 | 2 | 2 | 2 |
| s | 4 | 3 | 3 | 2 |
| e | 5 | 4 | 4 | **3** |

horse → rorse (replace h) → rose (delete r) → ros (delete e).

## burst-balloons

### Approach 1: Memoised recursion on intervals
```cpp
class Solution {
    vector<int> a;
    vector<vector<int>> memo;
    int best(int l, int r) {                         // max coins from bursting balloons strictly between l and r
        if (l + 1 >= r) return 0;
        int& m = memo[l][r];
        if (m >= 0) return m;
        int res = 0;
        for (int k = l + 1; k < r; ++k)              // k is the LAST balloon burst in (l, r)
            res = max(res, best(l, k) + a[l] * a[k] * a[r] + best(k, r));
        return m = res;
    }
public:
    int maxCoins(vector<int>& nums) {
        a = {1};
        a.insert(a.end(), nums.begin(), nums.end());
        a.push_back(1);
        memo.assign(a.size(), vector<int>(a.size(), -1));
        return best(0, a.size() - 1);
    }
};
```

**Time:** O(n³) · **Space:** O(n²). Usually the easiest way to derive interval DP.

### Approach 2: Brute force over burst orders
Trying all n! orders (permutations) is the naive approach: hopeless beyond n ≈ 10. It's useful only to explain why choosing the **first** balloon creates dependent subproblems (its neighbours change), while choosing the **last** one splits the interval cleanly.

### Walkthrough
**Goal:** maximise coins where bursting `i` earns `left × i × right` using its *current* neighbours.

1. Pad with 1s at both ends: `a = [1, nums…, 1]`.
2. **State:** `dp[l][r]` = max coins from bursting every balloon strictly between `l` and `r` (both kept).
3. **Key idea:** choose `k` = the **last** balloon to burst in `(l, r)`. When it bursts, everything else between is gone, so its neighbours are exactly `a[l]` and `a[r]`:
   `dp[l][r] = max over k of dp[l][k] + a[l]·a[k]·a[r] + dp[k][r]`.
4. Fill by increasing interval length so sub-intervals are ready.

**Dry run** `nums = [3, 1, 5, 8]` → `a = [1,3,1,5,8,1]`. The optimal order bursts 1, 5, 3, 8:

| burst | neighbours | coins |
|---|---|---|
| 1 | 3, 5 | 15 |
| 5 | 3, 8 | 120 |
| 3 | 1, 8 | 24 |
| 8 | 1, 1 | 8 |

Total **167** = `dp[0][5]`, with 8 chosen as the last balloon.

## regular-expression-matching

### Approach 1: Plain recursion
```cpp
class Solution {
    bool match(const string& s, const string& p, int i, int j) {
        if (j == (int)p.size()) return i == (int)s.size();
        bool first = i < (int)s.size() && (p[j] == s[i] || p[j] == '.');
        if (j + 1 < (int)p.size() && p[j + 1] == '*')
            return match(s, p, i, j + 2) || (first && match(s, p, i + 1, j));   // zero, or one more
        return first && match(s, p, i + 1, j + 1);
    }
public:
    bool isMatch(string s, string p) { return match(s, p, 0, 0); }
};
```

**Time:** exponential in the worst case (e.g. `a*a*a*a*…b`) · **Space:** O(m + n). Memoising on (i, j) gives the table solution.

### Approach 2: Memoised top-down
```cpp
class Solution {
    vector<vector<int>> memo;
    string s, p;
    bool dp(int i, int j) {
        int& m = memo[i][j];
        if (m != -1) return m;
        bool ans;
        if (j == (int)p.size()) ans = i == (int)s.size();
        else {
            bool first = i < (int)s.size() && (p[j] == s[i] || p[j] == '.');
            if (j + 1 < (int)p.size() && p[j + 1] == '*') ans = dp(i, j + 2) || (first && dp(i + 1, j));
            else ans = first && dp(i + 1, j + 1);
        }
        return m = ans;
    }
public:
    bool isMatch(string S, string P) {
        s = S; p = P;
        memo.assign(s.size() + 1, vector<int>(p.size() + 1, -1));
        return dp(0, 0);
    }
};
```

**Time:** O(m·n) · **Space:** O(m·n). Same complexity as the bottom-up table; easier to derive from the recursion.

### Walkthrough
**Goal:** does pattern `p` (with `.` and `*`) match **all** of `s`?

1. **State:** `dp[i][j]` = `s[i..]` matches `p[j..]`. `dp[m][n] = true` (both empty).
2. `first` = `s[i]` exists and equals `p[j]` or `p[j]` is `.`.
3. If `p[j+1] == '*'` (the pair `x*`):
   1. Use it **zero** times → `dp[i][j+2]`.
   2. Or use it **once more** (only if `first`) and stay on the same pattern position → `dp[i+1][j]`.
4. Otherwise: `first && dp[i+1][j+1]`.
5. Fill from the bottom-right (suffixes) towards (0, 0).

**Dry run** `s = "aab"`, `p = "c*a*b"`:

| (i, j) | pattern at j | decision |
|---|---|---|
| (0, 0) | c* | 'a' ≠ 'c' → zero copies → (0, 2) |
| (0, 2) | a* | 'a' matches → (1, 2) |
| (1, 2) | a* | 'a' matches → (2, 2) |
| (2, 2) | a* | 'b' ≠ 'a' → zero copies → (2, 4) |
| (2, 4) | b | match → (3, 5) = both empty → **true** |
