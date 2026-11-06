## unique-paths

### Approach 1: Memoised recursion
**The idea:** the number of paths to a cell = paths to the cell above + paths to the cell on the left.

```cpp
class Solution {
public:
    int uniquePaths(int m, int n) {
        memo.assign(m, vector<int>(n, 0));
        return paths(m - 1, n - 1);
    }

private:
    vector<vector<int>> memo;     // 0 = not computed yet

    int paths(int r, int c) {
        if (r == 0 || c == 0) {
            return 1;             // along the top row or left column there's only one way
        }
        if (memo[r][c] != 0) {
            return memo[r][c];
        }
        memo[r][c] = paths(r - 1, c) + paths(r, c - 1);
        return memo[r][c];
    }
};
```

**How it works:** each cell is computed once.

**Think of it like this:** walking a city grid where you can only go right or down — every corner is reached from the corner above or the corner to the left.

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

### Approach 2: Combinatorics
**The idea:** every path is exactly `m − 1` downs and `n − 1` rights in some order. Count the ways to choose which of the `m + n − 2` moves are downs: C(m + n − 2, m − 1).

```cpp
class Solution {
public:
    int uniquePaths(int m, int n) {
        int moves = m + n - 2;
        int downs = min(m - 1, n - 1);       // C(a, b) == C(a, a - b): use the smaller
        long long result = 1;
        for (int i = 1; i <= downs; i++) {
            // Multiply then divide: after each step result is C(moves - downs + i, i), an integer.
            result = result * (moves - downs + i) / i;
        }
        return (int)result;
    }
};
```

**How it works:** building the binomial coefficient one factor at a time keeps every intermediate value an exact integer.

**Think of it like this:** writing a word of D's and R's — how many different words with fixed counts of each letter?

**Cost:** Time **O(min(m, n))**. Space **O(1)**.

### Optimal: 1-D DP row
**The idea:** the 2-D table only needs the row above, so keep one row and update it in place.

```cpp
class Solution {
public:
    int uniquePaths(int m, int n) {
        vector<int> dp(n, 1);              // the first row: one way to reach each cell
        for (int r = 1; r < m; r++) {
            for (int c = 1; c < n; c++) {
                // Before the update, dp[c] is the cell ABOVE (previous row).
                // dp[c - 1] is already the cell to the LEFT (this row).
                dp[c] = dp[c] + dp[c - 1];
            }
        }
        return dp[n - 1];
    }
};
```

**How it works**
1. `dp[r][c] = dp[r−1][c] + dp[r][c−1]`.
2. First row and column are 1.
3. One row is enough: `dp[c]` still holds the value from above when you update it.

**Think of it like this:** a row of counters that you update left to right as you move down the grid.

**Why it's optimal:** O(m·n) time with only O(n) memory and no overflow concerns (combinatorics is faster but needs care).

**Cost:** Time **O(m·n)**. Space **O(n)**.

## longest-common-subsequence

### Approach 1: Plain recursion
**The idea:** compare the first characters. Equal → both are part of the LCS. Different → drop one of them and take the better result.

```cpp
class Solution {
public:
    int longestCommonSubsequence(string a, string b) {
        return lcs(a, b, 0, 0);
    }

private:
    int lcs(const string& a, const string& b, int i, int j) {
        if (i == (int)a.size() || j == (int)b.size()) {
            return 0;                         // one string is used up
        }
        if (a[i] == b[j]) {
            return 1 + lcs(a, b, i + 1, j + 1);
        }
        return max(lcs(a, b, i + 1, j), lcs(a, b, i, j + 1));
    }
};
```

**How it works:** correct but repeats the same (i, j) pairs exponentially often.

**Think of it like this:** two people reading their strings, trying every way to skip letters.

**Cost:** Time **O(2^(m+n))**. Space **O(m + n)**.

### Approach 2: Two rolling rows
**The idea:** the table row i only depends on row i − 1, so keep two rows.

```cpp
class Solution {
public:
    int longestCommonSubsequence(string a, string b) {
        int m = a.size();
        int n = b.size();
        vector<int> prev(n + 1, 0);    // row i - 1
        vector<int> cur(n + 1, 0);     // row i
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a[i - 1] == b[j - 1]) {
                    cur[j] = prev[j - 1] + 1;
                } else {
                    cur[j] = max(prev[j], cur[j - 1]);
                }
            }
            swap(prev, cur);
        }
        return prev[n];
    }
};
```

**How it works:** same recurrence; after `swap`, `prev` holds the row just computed.

**Think of it like this:** keeping only the last two lines of a spreadsheet.

**Cost:** Time **O(m·n)**. Space **O(n)**.

### Optimal: Full 2-D table
**The idea:** `dp[i][j]` = LCS of the first i letters of `a` and the first j letters of `b`.

```cpp
class Solution {
public:
    int longestCommonSubsequence(string a, string b) {
        int m = a.size();
        int n = b.size();
        // Row 0 and column 0 stay 0: an empty prefix has no common subsequence.
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a[i - 1] == b[j - 1]) {
                    // The last letters match: they end the LCS together.
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    // One of the last letters isn't used: drop it and take the better option.
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return dp[m][n];
    }
};
```

**How it works**
1. Match → diagonal + 1.
2. No match → max of up and left.
3. The full table lets you reconstruct the actual subsequence by walking back from `dp[m][n]`.

**Think of it like this:** a grid of "best match so far" for every pair of prefixes.

**Why it's the standard answer:** clear O(m·n), and it supports reconstruction (the two-row version saves memory).

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

## best-time-to-buy-and-sell-stock-with-cooldown

### Approach 1: Memoised recursion over (day, holding)
**The idea:** on each day you either hold a share or not. Without one: buy or wait. With one: sell (then skip a day) or wait.

```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        n = prices.size();
        memo.assign(n, vector<int>(2, INT_MIN));
        return best(prices, 0, 0);
    }

private:
    int n = 0;
    vector<vector<int>> memo;     // memo[day][holding]

    int best(vector<int>& prices, int day, int holding) {
        if (day >= n) {
            return 0;
        }
        if (memo[day][holding] != INT_MIN) {
            return memo[day][holding];
        }
        int wait = best(prices, day + 1, holding);
        int act;
        if (holding == 1) {
            act = prices[day] + best(prices, day + 2, 0);   // sell, then cooldown day
        } else {
            act = -prices[day] + best(prices, day + 1, 1);  // buy
        }
        memo[day][holding] = max(wait, act);
        return memo[day][holding];
    }
};
```

**How it works:** the "day + 2" after selling enforces the cooldown.

**Think of it like this:** a choose-your-own-adventure book with two choices on each page.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Explicit DP arrays
**The idea:** three arrays for the end of each day: `hold[i]`, `sold[i]`, `rest[i]`.

```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int n = prices.size();
        vector<int> hold(n), sold(n), rest(n);
        hold[0] = -prices[0];        // bought on day 0
        sold[0] = 0;                 // impossible on day 0, 0 is a safe value
        rest[0] = 0;
        for (int i = 1; i < n; i++) {
            hold[i] = max(hold[i - 1], rest[i - 1] - prices[i]);  // keep, or buy after resting
            sold[i] = hold[i - 1] + prices[i];                     // sell what we held
            rest[i] = max(rest[i - 1], sold[i - 1]);               // stay idle / finish cooldown
        }
        return max(sold[n - 1], rest[n - 1]);
    }
};
```

**How it works:** a small state machine, one column per day.

**Think of it like this:** a daily diary with three columns: "holding", "just sold", "free".

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: State machine with three variables
**The idea:** the arrays only look back one day, so keep three numbers.

```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int hold = INT_MIN / 2;   // best profit while owning a share (impossible at start)
        int sold = 0;             // best profit having sold today (cooldown tomorrow)
        int rest = 0;             // best profit owning nothing, free to buy

        for (int p : prices) {
            int prevSold = sold;
            sold = hold + p;                 // sell the share we held
            hold = max(hold, rest - p);      // keep holding, or buy (only from rest)
            rest = max(rest, prevSold);      // keep resting, or yesterday's sale cooled down
        }
        return max(sold, rest);              // ending while holding is never best
    }
};
```

**How it works**
1. **hold** = own a share; **sold** = sold today; **rest** = free.
2. `hold = max(hold, rest − p)`, `sold = hold + p`, `rest = max(rest, sold_yesterday)`.
3. Answer `max(sold, rest)`.
4. `INT_MIN / 2` avoids overflow when adding a price.

**Think of it like this:** a traffic light with three colours — you can only move between them in allowed ways.

**Why it's optimal:** O(n) time, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## coin-change-ii

### Approach 1: Memoised recursion (coin index, amount)
**The idea:** with coin i, either use it once more (stay at i) or move on to the next coin. This counts each combination once.

```cpp
class Solution {
public:
    int change(int amount, vector<int>& coins) {
        memo.assign(coins.size(), vector<long long>(amount + 1, -1));
        return (int)ways(coins, 0, amount);
    }

private:
    vector<vector<long long>> memo;

    long long ways(vector<int>& coins, int i, int remaining) {
        if (remaining == 0) {
            return 1;                        // exact amount reached
        }
        if (i == (int)coins.size() || remaining < 0) {
            return 0;
        }
        if (memo[i][remaining] != -1) {
            return memo[i][remaining];
        }
        long long useIt = ways(coins, i, remaining - coins[i]);   // stay on coin i
        long long skipIt = ways(coins, i + 1, remaining);         // done with coin i
        memo[i][remaining] = useIt + skipIt;
        return memo[i][remaining];
    }
};
```

**How it works:** coins are used in a fixed order, so `1+2` and `2+1` are the same path.

**Think of it like this:** deciding how many of each coin type to use, one type at a time.

**Cost:** Time **O(coins · amount)**. Space **O(coins · amount)**.

### Approach 2: Full 2-D table
**The idea:** `dp[i][a]` = ways to make `a` using only the first i coins.

```cpp
class Solution {
public:
    int change(int amount, vector<int>& coins) {
        int k = coins.size();
        vector<vector<unsigned long long>> dp(k + 1, vector<unsigned long long>(amount + 1, 0));
        for (int i = 0; i <= k; i++) {
            dp[i][0] = 1;                       // one way to make 0: no coins
        }
        for (int i = 1; i <= k; i++) {
            int c = coins[i - 1];
            for (int a = 1; a <= amount; a++) {
                dp[i][a] = dp[i - 1][a];        // don't use coin i at all
                if (a >= c) {
                    dp[i][a] += dp[i][a - c];   // use coin i (again)
                }
            }
        }
        return (int)dp[k][amount];
    }
};
```

**How it works:** `dp[i][a − c]` (same row) allows reusing the coin.

**Think of it like this:** a table with one row per coin type you've "unlocked".

**Cost:** Time **O(coins · amount)**. Space **O(coins · amount)**.

### Optimal: 1-D DP, coins in the outer loop
**The idea:** process one coin type at a time; `dp[a] += dp[a − coin]`. Coins outside, amounts inside → combinations, not permutations.

```cpp
class Solution {
public:
    int change(int amount, vector<int>& coins) {
        // dp[a] = number of ways to make a with the coins processed so far.
        vector<unsigned long long> dp(amount + 1, 0);
        dp[0] = 1;

        for (int c : coins) {                       // OUTER loop over coins → combinations
            for (int a = c; a <= amount; a++) {     // upward → coin c can be reused
                dp[a] += dp[a - c];
            }
        }
        return (int)dp[amount];
    }
};
```

**How it works**
1. `dp[0] = 1`.
2. For each coin, for amounts ascending: `dp[a] += dp[a − c]`.
3. Finishing one coin before starting the next builds every combination in one coin order only.

**Think of it like this:** first count all ways using only 1s, then allow 2s too, then 5s…

**Why it's optimal:** O(coins · amount) time with O(amount) memory. (Swapping the loops counts ordered sequences instead — a classic interview trap.)

**Cost:** Time **O(coins · amount)**. Space **O(amount)**.

## target-sum

### Approach 1: Brute force recursion (+ or − each number)
**The idea:** try both signs for every number.

```cpp
class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        return count(nums, 0, 0, target);
    }

private:
    int count(vector<int>& nums, int i, int sum, int target) {
        if (i == (int)nums.size()) {
            return sum == target ? 1 : 0;
        }
        return count(nums, i + 1, sum + nums[i], target)
             + count(nums, i + 1, sum - nums[i], target);
    }
};
```

**How it works:** explores all 2ⁿ sign patterns.

**Think of it like this:** flipping a coin for each number to decide + or −.

**Cost:** Time **O(2ⁿ)**. Space **O(n)**.

### Approach 2: DP over reachable sums (map)
**The idea:** after each number, keep a map "sum → number of ways to get it".

```cpp
class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        unordered_map<int, int> ways;
        ways[0] = 1;                          // before any number: sum 0, one way
        for (int x : nums) {
            unordered_map<int, int> next;
            for (const pair<const int, int>& entry : ways) {
                next[entry.first + x] += entry.second;
                next[entry.first - x] += entry.second;
            }
            ways = next;
        }
        return ways[target];
    }
};
```

**How it works:** different sign patterns that reach the same sum are merged.

**Think of it like this:** counting how many routes lead to each position on a number line.

**Cost:** Time **O(n · S)** where S is the number of distinct sums (≤ 2·total + 1). Space **O(S)**.

### Optimal: Turn it into "count subsets with sum P"
**The idea:** let P = sum of numbers with `+`, N = sum with `−`. Then P − N = target and P + N = total, so P = (total + target) / 2. Count subsets with sum P (0/1 knapsack).

```cpp
class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        // P must be a whole number between 0 and total.
        if (abs(target) > total || (total + target) % 2 != 0) {
            return 0;
        }
        int P = (total + target) / 2;

        vector<int> dp(P + 1, 0);     // dp[s] = subsets with sum s
        dp[0] = 1;                    // the empty subset
        for (int x : nums) {
            // Downwards so each number is used at most once.
            for (int s = P; s >= x; s--) {
                dp[s] += dp[s - x];
            }
        }
        return dp[P];
    }
};
```

**How it works**
1. Algebra turns signs into "pick a subset for +".
2. `|target| > total` or odd `total + target` → 0.
3. 0/1 knapsack counting, iterating sums downwards.

**Think of it like this:** instead of deciding a sign for every number, you decide which numbers go in the "plus" bag; the rest automatically go in the "minus" bag.

**Why it's optimal:** O(n · P) with a small 1-D array.

**Cost:** Time **O(n · total)**. Space **O(total)**.

## interleaving-string

### Approach 1: Memoised recursion
**The idea:** at position (i, j), the next character of s3 must come from s1[i] or s2[j]; try both.

```cpp
class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        if (s1.size() + s2.size() != s3.size()) {
            return false;
        }
        memo.assign(s1.size() + 1, vector<int>(s2.size() + 1, -1));
        return can(s1, s2, s3, 0, 0);
    }

private:
    vector<vector<int>> memo;   // -1 unknown, 0 false, 1 true

    bool can(const string& s1, const string& s2, const string& s3, int i, int j) {
        if (i == (int)s1.size() && j == (int)s2.size()) {
            return true;                              // used everything
        }
        if (memo[i][j] != -1) {
            return memo[i][j] == 1;
        }
        int k = i + j;                                // next position in s3
        bool result = false;
        if (i < (int)s1.size() && s1[i] == s3[k] && can(s1, s2, s3, i + 1, j)) {
            result = true;
        } else if (j < (int)s2.size() && s2[j] == s3[k] && can(s1, s2, s3, i, j + 1)) {
            result = true;
        }
        memo[i][j] = result ? 1 : 0;
        return result;
    }
};
```

**How it works:** the position in s3 is always `i + j`, so (i, j) is the whole state.

**Think of it like this:** shuffling two decks into one; at every card, ask "which deck did this come from?".

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

### Approach 2: BFS over (i, j) states
**The idea:** start at (0, 0); from each state, move to (i+1, j) or (i, j+1) when the next s3 character matches. Can you reach (m, n)?

```cpp
class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        int m = s1.size();
        int n = s2.size();
        if (m + n != (int)s3.size()) {
            return false;
        }
        vector<vector<bool>> seen(m + 1, vector<bool>(n + 1, false));
        queue<pair<int, int>> q;
        q.push({0, 0});
        seen[0][0] = true;

        while (!q.empty()) {
            int i = q.front().first;
            int j = q.front().second;
            q.pop();
            if (i == m && j == n) {
                return true;
            }
            int k = i + j;
            if (i < m && s1[i] == s3[k] && !seen[i + 1][j]) {
                seen[i + 1][j] = true;
                q.push({i + 1, j});
            }
            if (j < n && s2[j] == s3[k] && !seen[i][j + 1]) {
                seen[i][j + 1] = true;
                q.push({i, j + 1});
            }
        }
        return false;
    }
};
```

**How it works:** the same states as the DP, explored as a graph.

**Think of it like this:** a grid where you move right (use s2) or down (use s1) only on matching letters.

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

### Optimal: 1-D DP row
**The idea:** `dp[i][j]` = "the first i + j letters of s3 interleave s1[0..i) and s2[0..j)". Keep one row.

```cpp
class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        int m = s1.size();
        int n = s2.size();
        if (m + n != (int)s3.size()) {
            return false;
        }
        vector<bool> dp(n + 1, false);     // dp[j] for the current i

        for (int i = 0; i <= m; i++) {
            for (int j = 0; j <= n; j++) {
                if (i == 0 && j == 0) {
                    dp[j] = true;          // empty + empty = empty
                    continue;
                }
                char want = s3[i + j - 1];
                // Last char came from s1: needs dp[i-1][j] (still stored in dp[j]).
                bool fromS1 = i > 0 && dp[j] && s1[i - 1] == want;
                // Last char came from s2: needs dp[i][j-1] (already updated in dp[j-1]).
                bool fromS2 = j > 0 && dp[j - 1] && s2[j - 1] == want;
                dp[j] = fromS1 || fromS2;
            }
        }
        return dp[n];
    }
};
```

**How it works**
1. `s3[i+j−1]` came from s1 (match and `dp[i−1][j]`) or from s2 (match and `dp[i][j−1]`).
2. `dp[0][0] = true`.
3. One row suffices: `dp[j]` is "above", `dp[j−1]` is "left".

**Think of it like this:** filling a grid of "can I get here?" row by row with one reusable row.

**Why it's optimal:** O(m·n) time, O(n) memory; greedy doesn't work because both strings can offer the same letter.

**Cost:** Time **O(m·n)**. Space **O(n)**.

## longest-increasing-path-in-a-matrix

### Approach 1: Topological sort (peel layers from the local maxima)
**The idea:** point an edge from each cell to every larger neighbour. Cells with no larger neighbours are the "top" layer. Peel layers like Kahn's algorithm; the number of layers is the answer.

```cpp
class Solution {
public:
    int longestIncreasingPath(vector<vector<int>>& matrix) {
        int R = matrix.size();
        int C = matrix[0].size();
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};

        // outDegree = number of strictly larger neighbours.
        vector<vector<int>> outDegree(R, vector<int>(C, 0));
        queue<pair<int, int>> q;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                for (int k = 0; k < 4; k++) {
                    int nr = r + dr[k];
                    int nc = c + dc[k];
                    if (nr >= 0 && nc >= 0 && nr < R && nc < C && matrix[nr][nc] > matrix[r][c]) {
                        outDegree[r][c]++;
                    }
                }
                if (outDegree[r][c] == 0) {
                    q.push({r, c});            // a local maximum: the end of some path
                }
            }
        }

        int layers = 0;
        while (!q.empty()) {
            layers++;
            int levelSize = q.size();
            for (int i = 0; i < levelSize; i++) {
                int r = q.front().first;
                int c = q.front().second;
                q.pop();
                // Every smaller neighbour loses one larger neighbour.
                for (int k = 0; k < 4; k++) {
                    int nr = r + dr[k];
                    int nc = c + dc[k];
                    if (nr >= 0 && nc >= 0 && nr < R && nc < C && matrix[nr][nc] < matrix[r][c]) {
                        outDegree[nr][nc]--;
                        if (outDegree[nr][nc] == 0) {
                            q.push({nr, nc});
                        }
                    }
                }
            }
        }
        return layers;
    }
};
```

**How it works:** the longest path in a DAG equals the number of layers in a topological peel.

**Think of it like this:** peeling an onion from the outside (the peaks) inwards; the number of layers is the longest climb.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

### Approach 2: Sort cells by value, DP in increasing order
**The idea:** process cells from smallest to largest; a cell's path length is 1 + the best among smaller neighbours (already computed).

```cpp
class Solution {
public:
    int longestIncreasingPath(vector<vector<int>>& matrix) {
        int R = matrix.size();
        int C = matrix[0].size();
        vector<array<int, 3>> cells;              // (value, row, col)
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                cells.push_back({matrix[r][c], r, c});
            }
        }
        sort(cells.begin(), cells.end());

        vector<vector<int>> len(R, vector<int>(C, 1));   // longest path ENDING at each cell
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        int best = 0;
        for (const array<int, 3>& cell : cells) {
            int r = cell[1];
            int c = cell[2];
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && matrix[nr][nc] < matrix[r][c]) {
                    len[r][c] = max(len[r][c], len[nr][nc] + 1);
                }
            }
            best = max(best, len[r][c]);
        }
        return best;
    }
};
```

**How it works:** sorting guarantees smaller neighbours are finished first.

**Think of it like this:** filling a stadium from the lowest seats up, each seat asking the lower seats next to it how long a climb led there.

**Cost:** Time **O(R·C log(R·C))**. Space **O(R·C)**.

### Optimal: DFS with memoisation
**The idea:** moving only to strictly larger values can never loop, so each cell's answer is fixed — compute it once with DFS and cache it.

```cpp
class Solution {
public:
    int longestIncreasingPath(vector<vector<int>>& matrix) {
        R = matrix.size();
        C = matrix[0].size();
        memo.assign(R, vector<int>(C, 0));         // 0 = not computed yet
        int best = 0;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                best = max(best, dfs(matrix, r, c));
            }
        }
        return best;
    }

private:
    int R = 0;
    int C = 0;
    vector<vector<int>> memo;                     // longest path STARTING at each cell

    int dfs(vector<vector<int>>& matrix, int r, int c) {
        if (memo[r][c] != 0) {
            return memo[r][c];                    // already computed
        }
        int dr[4] = {1, -1, 0, 0};
        int dc[4] = {0, 0, 1, -1};
        int len = 1;                              // the cell itself
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
                continue;
            }
            if (matrix[nr][nc] > matrix[r][c]) {
                len = max(len, 1 + dfs(matrix, nr, nc));   // step to a larger neighbour
            }
        }
        memo[r][c] = len;
        return len;
    }
};
```

**How it works**
1. Strictly increasing moves → no cycles → no visited set needed.
2. `dfs(r, c)` = 1 + the best `dfs` among larger neighbours.
3. Memoise; the answer is the max over all cells.

**Think of it like this:** every cell on a hill remembers "the longest climb starting here", so nobody re-walks a path.

**Why it's optimal:** each cell computed once, each edge checked once.

**Cost:** Time **O(R·C)**. Space **O(R·C)**.

## distinct-subsequences

### Approach 1: Memoised recursion
**The idea:** `ways(i, j)` = ways to form `t[j..]` from `s[i..]`. Skip `s[i]`, or use it if it matches `t[j]`.

```cpp
class Solution {
public:
    int numDistinct(string s, string t) {
        memo.assign(s.size() + 1, vector<unsigned long long>(t.size() + 1, 0));
        done.assign(s.size() + 1, vector<bool>(t.size() + 1, false));
        return (int)ways(s, t, 0, 0);
    }

private:
    vector<vector<unsigned long long>> memo;
    vector<vector<bool>> done;

    unsigned long long ways(const string& s, const string& t, int i, int j) {
        if (j == (int)t.size()) {
            return 1;                              // built all of t
        }
        if (i == (int)s.size()) {
            return 0;                              // ran out of s
        }
        if (done[i][j]) {
            return memo[i][j];
        }
        unsigned long long result = ways(s, t, i + 1, j);   // don't use s[i]
        if (s[i] == t[j]) {
            result += ways(s, t, i + 1, j + 1);             // use s[i] for t[j]
        }
        done[i][j] = true;
        memo[i][j] = result;
        return result;
    }
};
```

**How it works:** each (i, j) pair is solved once.

**Think of it like this:** deciding for every letter of s whether it's part of this copy of t.

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

### Approach 2: Full 2-D table
**The idea:** `dp[i][j]` = ways to form `t[0..j)` from `s[0..i)`.

```cpp
class Solution {
public:
    int numDistinct(string s, string t) {
        int m = s.size();
        int n = t.size();
        vector<vector<unsigned long long>> dp(m + 1, vector<unsigned long long>(n + 1, 0));
        for (int i = 0; i <= m; i++) {
            dp[i][0] = 1;                          // one way to form the empty string
        }
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                dp[i][j] = dp[i - 1][j];           // ignore s[i-1]
                if (s[i - 1] == t[j - 1]) {
                    dp[i][j] += dp[i - 1][j - 1];  // use s[i-1] as t[j-1]
                }
            }
        }
        return (int)dp[m][n];
    }
};
```

**How it works:** the same recurrence bottom-up.

**Think of it like this:** a table counting matches for every pair of prefixes.

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

### Optimal: 1-D DP, iterate t backwards
**The idea:** keep only `dp[j]` and update j from high to low, so `dp[j − 1]` still holds the previous row's value.

```cpp
class Solution {
public:
    int numDistinct(string s, string t) {
        int n = t.size();
        // dp[j] = ways to form t[0..j) from the part of s processed so far.
        vector<unsigned long long> dp(n + 1, 0);
        dp[0] = 1;                                   // the empty t: always one way

        for (char c : s) {
            // Downwards: dp[j - 1] must still be the value BEFORE using this c.
            for (int j = n; j >= 1; j--) {
                if (t[j - 1] == c) {
                    dp[j] += dp[j - 1];              // use c as t[j-1]
                }
            }
        }
        return (int)dp[n];
    }
};
```

**How it works**
1. `s[i−1]` either isn't used (`dp[j]` unchanged) or matches `t[j−1]` (add `dp[j−1]`).
2. `dp[0] = 1`.
3. Iterate j downward to avoid using the same letter twice.

**Think of it like this:** like 0/1 knapsack — each letter of s can fill at most one slot of t per copy.

**Why it's optimal:** O(m·n) time with O(n) memory.

**Cost:** Time **O(m·n)**. Space **O(n)**.

## edit-distance

### Approach 1: Plain recursion
**The idea:** compare the first characters: equal → no cost; otherwise try insert, delete, replace.

```cpp
class Solution {
public:
    int minDistance(string a, string b) {
        return edits(a, b, 0, 0);
    }

private:
    int edits(const string& a, const string& b, int i, int j) {
        if (i == (int)a.size()) {
            return b.size() - j;              // insert the rest of b
        }
        if (j == (int)b.size()) {
            return a.size() - i;              // delete the rest of a
        }
        if (a[i] == b[j]) {
            return edits(a, b, i + 1, j + 1);
        }
        int replace = edits(a, b, i + 1, j + 1);
        int remove = edits(a, b, i + 1, j);
        int insert = edits(a, b, i, j + 1);
        return 1 + min(replace, min(remove, insert));
    }
};
```

**How it works:** explores every edit sequence.

**Think of it like this:** trying every possible way to fix a typo letter by letter.

**Cost:** Time **O(3^(m+n))**. Space **O(m + n)**.

### Approach 2: Full 2-D table (lets you reconstruct the edits)
**The idea:** `dp[i][j]` = edits to turn the first i letters of a into the first j letters of b.

```cpp
class Solution {
public:
    int minDistance(string a, string b) {
        int m = a.size();
        int n = b.size();
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (int i = 0; i <= m; i++) {
            dp[i][0] = i;                    // delete i letters
        }
        for (int j = 0; j <= n; j++) {
            dp[0][j] = j;                    // insert j letters
        }
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a[i - 1] == b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + min(dp[i - 1][j - 1],        // replace
                                   min(dp[i - 1][j],            // delete from a
                                       dp[i][j - 1]));          // insert into a
                }
            }
        }
        return dp[m][n];
    }
};
```

**How it works:** walking back from `dp[m][n]` reveals which edit was used at each step.

**Think of it like this:** a spell-checker's grid of "how far is this prefix from that prefix".

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

### Optimal: Two rolling rows
**The idea:** the table only needs the previous row, so keep two rows.

```cpp
class Solution {
public:
    int minDistance(string a, string b) {
        int m = a.size();
        int n = b.size();
        vector<int> prev(n + 1);      // row i - 1
        vector<int> cur(n + 1);       // row i
        for (int j = 0; j <= n; j++) {
            prev[j] = j;              // "" → first j letters of b: j inserts
        }

        for (int i = 1; i <= m; i++) {
            cur[0] = i;               // first i letters of a → "": i deletes
            for (int j = 1; j <= n; j++) {
                if (a[i - 1] == b[j - 1]) {
                    cur[j] = prev[j - 1];                 // letters match: free
                } else {
                    int replace = prev[j - 1];            // change a[i-1] into b[j-1]
                    int remove = prev[j];                 // delete a[i-1]
                    int insert = cur[j - 1];              // insert b[j-1]
                    cur[j] = 1 + min(replace, min(remove, insert));
                }
            }
            swap(prev, cur);
        }
        return prev[n];
    }
};
```

**How it works**
1. Base: `dp[i][0] = i`, `dp[0][j] = j`.
2. Match → diagonal. Otherwise 1 + min(replace, delete, insert).
3. Two rows are enough.

**Think of it like this:** "horse" → "ros": replace h → r, delete r, delete e — 3 edits.

**Why it's optimal:** O(m·n) time with O(n) memory.

**Cost:** Time **O(m·n)**. Space **O(n)**.

## burst-balloons

### Approach 1: Brute force over burst orders
**The idea:** try bursting every balloon first, recursively, on the remaining list.

```cpp
class Solution {
public:
    int maxCoins(vector<int>& nums) {
        return best(nums);
    }

private:
    int best(vector<int> balloons) {
        if (balloons.empty()) {
            return 0;
        }
        int result = 0;
        for (int i = 0; i < (int)balloons.size(); i++) {
            int left = (i > 0) ? balloons[i - 1] : 1;
            int right = (i + 1 < (int)balloons.size()) ? balloons[i + 1] : 1;
            int coins = left * balloons[i] * right;
            vector<int> rest = balloons;
            rest.erase(rest.begin() + i);              // burst balloon i
            result = max(result, coins + best(rest));
        }
        return result;
    }
};
```

**How it works:** tries all n! orders. Only usable for tiny inputs.

**Think of it like this:** trying every possible popping order at a party.

**Cost:** Time **O(n!)**. Space **O(n²)**.

### Approach 2: Memoised recursion on intervals
**The idea:** `best(l, r)` = most coins from bursting everything strictly between l and r. Choose which balloon k is burst *last* in that range.

```cpp
class Solution {
public:
    int maxCoins(vector<int>& nums) {
        a = {1};
        a.insert(a.end(), nums.begin(), nums.end());
        a.push_back(1);                              // pad both ends with 1
        int n = a.size();
        memo.assign(n, vector<int>(n, -1));
        return best(0, n - 1);
    }

private:
    vector<int> a;
    vector<vector<int>> memo;

    int best(int l, int r) {
        if (l + 1 >= r) {
            return 0;                                // nothing strictly between l and r
        }
        if (memo[l][r] != -1) {
            return memo[l][r];
        }
        int result = 0;
        for (int k = l + 1; k < r; k++) {
            // k is burst last, so its neighbours at that moment are a[l] and a[r].
            int coins = best(l, k) + a[l] * a[k] * a[r] + best(k, r);
            result = max(result, coins);
        }
        memo[l][r] = result;
        return result;
    }
};
```

**How it works:** thinking "last" instead of "first" makes the two sides independent.

**Think of it like this:** deciding which balloon is the final one left in a section — then both sides of it can be solved separately.

**Cost:** Time **O(n³)**. Space **O(n²)**.

### Optimal: Interval DP, bottom-up by length
**The idea:** the same recurrence, filled for short intervals first so longer ones can use them.

```cpp
class Solution {
public:
    int maxCoins(vector<int>& nums) {
        // Pad with 1 on both sides so every balloon always has two neighbours.
        vector<int> a = {1};
        a.insert(a.end(), nums.begin(), nums.end());
        a.push_back(1);
        int n = a.size();

        // dp[l][r] = best coins from bursting everything strictly between l and r.
        vector<vector<int>> dp(n, vector<int>(n, 0));

        for (int len = 2; len < n; len++) {             // distance between l and r
            for (int l = 0; l + len < n; l++) {
                int r = l + len;
                for (int k = l + 1; k < r; k++) {       // k = the LAST balloon burst in (l, r)
                    int coins = dp[l][k] + a[l] * a[k] * a[r] + dp[k][r];
                    dp[l][r] = max(dp[l][r], coins);
                }
            }
        }
        return dp[0][n - 1];
    }
};
```

**How it works**
1. Pad with 1s.
2. `dp[l][r]` = best for the open interval (l, r).
3. When k is last, its neighbours are a[l] and a[r]: `dp[l][k] + a[l]·a[k]·a[r] + dp[k][r]`.
4. Fill by increasing length.

**Think of it like this:** solving small sections of the balloon row first and combining them into bigger sections.

**Why it's optimal:** O(n³) is the standard bound; no recursion.

**Cost:** Time **O(n³)**. Space **O(n²)**.

## regular-expression-matching

### Approach 1: Plain recursion
**The idea:** match the first character, then handle `x*` by trying "zero copies" or "one more copy".

```cpp
class Solution {
public:
    bool isMatch(string s, string p) {
        return match(s, p, 0, 0);
    }

private:
    bool match(const string& s, const string& p, int i, int j) {
        if (j == (int)p.size()) {
            return i == (int)s.size();               // pattern used up: s must be too
        }
        bool first = i < (int)s.size() && (p[j] == s[i] || p[j] == '.');
        if (j + 1 < (int)p.size() && p[j + 1] == '*') {
            // Skip "x*" entirely, or use it for one character and stay on it.
            return match(s, p, i, j + 2) || (first && match(s, p, i + 1, j));
        }
        return first && match(s, p, i + 1, j + 1);
    }
};
```

**How it works:** the definition, directly.

**Think of it like this:** reading the pattern and the text together, branching whenever a `*` could mean "more" or "stop".

**Cost:** Time exponential in the worst case. Space **O(m + n)**.

### Approach 2: Memoised top-down
**The idea:** the same recursion, caching (i, j).

```cpp
class Solution {
public:
    bool isMatch(string s, string p) {
        memo.assign(s.size() + 1, vector<int>(p.size() + 1, -1));
        return match(s, p, 0, 0);
    }

private:
    vector<vector<int>> memo;   // -1 unknown, 0 false, 1 true

    bool match(const string& s, const string& p, int i, int j) {
        if (memo[i][j] != -1) {
            return memo[i][j] == 1;
        }
        bool result;
        if (j == (int)p.size()) {
            result = (i == (int)s.size());
        } else {
            bool first = i < (int)s.size() && (p[j] == s[i] || p[j] == '.');
            if (j + 1 < (int)p.size() && p[j + 1] == '*') {
                result = match(s, p, i, j + 2) || (first && match(s, p, i + 1, j));
            } else {
                result = first && match(s, p, i + 1, j + 1);
            }
        }
        memo[i][j] = result ? 1 : 0;
        return result;
    }
};
```

**How it works:** only (m + 1)(n + 1) states.

**Think of it like this:** the same exploration, but with notes on which (text position, pattern position) pairs you've already decided.

**Cost:** Time **O(m·n)**. Space **O(m·n)**.

### Optimal: Bottom-up DP over suffixes
**The idea:** `dp[i][j]` = "does `s[i..]` match `p[j..]`?". Fill from the ends of both strings back to the start.

```cpp
class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size();
        int n = p.size();
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[m][n] = true;                             // empty text matches empty pattern

        for (int i = m; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                // Does the current pattern char match the current text char?
                bool first = i < m && (p[j] == s[i] || p[j] == '.');

                if (j + 1 < n && p[j + 1] == '*') {
                    // "x*": use it zero times (skip both chars),
                    // or use it once more and stay on the same pattern position.
                    dp[i][j] = dp[i][j + 2] || (first && dp[i + 1][j]);
                } else {
                    // Plain char or '.': must match, then both move on.
                    dp[i][j] = first && dp[i + 1][j + 1];
                }
            }
        }
        return dp[0][0];
    }
};
```

**How it works**
1. `dp[m][n] = true`.
2. `first` = current characters match (`.` matches anything).
3. `x*` → `dp[i][j+2]` (zero copies) or `first && dp[i+1][j]` (one more copy).
4. Otherwise `first && dp[i+1][j+1]`.

**Think of it like this:** working backwards from the end of both strings, answering "does the rest match?" for every pair of positions.

**Why it's optimal:** O(m·n) without recursion.

**Cost:** Time **O(m·n)**. Space **O(m·n)**.
