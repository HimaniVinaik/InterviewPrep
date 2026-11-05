## climbing-stairs

### Approach 1: Plain recursion
```cpp
class Solution {
public:
    int climbStairs(int n) {
        if (n <= 1) return 1;
        return climbStairs(n - 1) + climbStairs(n - 2);     // last step was 1 or 2
    }
};
```

**Time:** O(φⁿ) ≈ O(1.618ⁿ) · **Space:** O(n). The recursion tree recomputes the same subproblems over and over — TLE for n = 45.

### Approach 2: Memoisation (top-down DP)
```cpp
class Solution {
    vector<int> memo;
    int ways(int n) {
        if (n <= 1) return 1;
        if (memo[n]) return memo[n];
        return memo[n] = ways(n - 1) + ways(n - 2);
    }
public:
    int climbStairs(int n) { memo.assign(n + 1, 0); return ways(n); }
};
```

**Time:** O(n) · **Space:** O(n). Each subproblem solved once.

### Approach 3: Tabulation (bottom-up array)
```cpp
class Solution {
public:
    int climbStairs(int n) {
        vector<int> dp(n + 1);
        dp[0] = dp[1] = 1;
        for (int i = 2; i <= n; ++i) dp[i] = dp[i - 1] + dp[i - 2];
        return dp[n];
    }
};
```

**Time:** O(n) · **Space:** O(n). No recursion; the Optimal version keeps only the last two values.

### Approach 4: Matrix exponentiation
```cpp
class Solution {
    using M = array<array<long long, 2>, 2>;
    static M mul(const M& a, const M& b) {
        M c{};
        for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) for (int k = 0; k < 2; ++k) c[i][j] += a[i][k] * b[k][j];
        return c;
    }
public:
    int climbStairs(int n) {
        M r{{{1, 0}, {0, 1}}}, b{{{1, 1}, {1, 0}}};       // [[1,1],[1,0]]^n gives Fibonacci
        for (int e = n; e; e >>= 1) { if (e & 1) r = mul(r, b); b = mul(b, b); }
        return (int)r[0][0];
    }
};
```

**Time:** O(log n) · **Space:** O(1). Same square-and-multiply as Pow(x, n), applied to matrices.

### Walkthrough
**Goal:** count step sequences of 1s and 2s that sum to n.

1. **State:** `ways(i)` = number of ways to reach step i.
2. **Recurrence:** the final move into step i came from i−1 (a 1-step) or i−2 (a 2-step), so `ways(i) = ways(i−1) + ways(i−2)`.
3. **Base:** `ways(0) = 1` (one way: do nothing), `ways(1) = 1`.
4. Only the two previous values are needed → two variables.

**Dry run** n = 5:

| i | a (i−2) | b (i−1) | ways(i) |
|---|---|---|---|
| 2 | 1 | 1 | 2 |
| 3 | 1 | 2 | 3 |
| 4 | 2 | 3 | 5 |
| 5 | 3 | 5 | **8** |

The DP progression shown here (recursion → memo → table → O(1) space) is the template for every DP problem in this section.

## min-cost-climbing-stairs

### Approach 1: Memoised recursion
```cpp
class Solution {
    vector<int> memo;
    int f(const vector<int>& c, int i) {                // min cost to stand on i (paying c[i])
        if (i < 0) return 0;
        if (i < 2) return c[i];
        if (memo[i] >= 0) return memo[i];
        return memo[i] = c[i] + min(f(c, i - 1), f(c, i - 2));
    }
public:
    int minCostClimbingStairs(vector<int>& cost) {
        int n = cost.size();
        memo.assign(n, -1);
        return min(f(cost, n - 1), f(cost, n - 2));     // top is reached from n-1 or n-2
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Approach 2: In-place tabulation
```cpp
class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        int n = cost.size();
        for (int i = 2; i < n; ++i) cost[i] += min(cost[i - 1], cost[i - 2]);   // cost[i] = cheapest to stand on i
        return min(cost[n - 1], cost[n - 2]);
    }
};
```

**Time:** O(n) · **Space:** O(1) extra (reuses the input). A different but equivalent state definition.

### Walkthrough
**Goal:** cheapest way to get past the last stair.

1. **State:** `dp[i]` = minimum cost to *arrive* at step i (before paying for it). The top is index n.
2. You start on step 0 or 1 for free: `dp[0] = dp[1] = 0`.
3. **Recurrence:** arrive at i from i−1 (paying `cost[i−1]`) or from i−2 (paying `cost[i−2]`).
4. Answer `dp[n]`; only the last two values are needed.

**Dry run** `cost = [10, 15, 20]`:

| i | from i−1 | from i−2 | dp[i] |
|---|---|---|---|
| 0 | | | 0 |
| 1 | | | 0 |
| 2 | 0 + 15 | 0 + 10 | 10 |
| 3 (top) | 10 + 20 | 0 + 15 | **15** |

Start on step 1, pay 15, jump two to the top.

## house-robber

### Approach 1: Memoised recursion
```cpp
class Solution {
    vector<int> memo;
    int best(const vector<int>& a, int i) {            // best loot from houses 0..i
        if (i < 0) return 0;
        if (memo[i] >= 0) return memo[i];
        return memo[i] = max(best(a, i - 1), best(a, i - 2) + a[i]);   // skip i, or rob i
    }
public:
    int rob(vector<int>& nums) { memo.assign(nums.size(), -1); return best(nums, nums.size() - 1); }
};
```

**Time:** O(n) · **Space:** O(n).

### Approach 2: Two-state DP (robbed / not robbed)
```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        int robbed = 0, skipped = 0;          // best so far if the previous house was robbed / not
        for (int x : nums) {
            int r = skipped + x;              // can only rob x if the previous was skipped
            int s = max(robbed, skipped);
            robbed = r; skipped = s;
        }
        return max(robbed, skipped);
    }
};
```

**Time:** O(n) · **Space:** O(1). Explicit states generalise well (state-machine DP, like the stock problems).

### Walkthrough
**Goal:** max sum of non-adjacent elements.

1. **State:** `dp[i]` = best loot considering houses 0..i.
2. **Choice at house i:** skip it → `dp[i−1]`; rob it → `dp[i−2] + nums[i]` (house i−1 must be skipped).
3. `dp[i] = max(dp[i−1], dp[i−2] + nums[i])`; keep two rolling variables.

**Dry run** `[2, 7, 9, 3, 1]`:

| house | value | prev2 | prev1 | cur = max(prev1, prev2 + value) |
|---|---|---|---|---|
| 0 | 2 | 0 | 0 | 2 |
| 1 | 7 | 0 | 2 | 7 |
| 2 | 9 | 2 | 7 | 11 |
| 3 | 3 | 7 | 11 | 11 |
| 4 | 1 | 11 | 11 | **12** |

Rob houses 0, 2, 4: 2 + 9 + 1 = 12.

## house-robber-ii

### Approach 1: Memoised recursion with a "took first" flag
```cpp
class Solution {
    int n;
    map<pair<int, bool>, int> memo;
    int best(const vector<int>& a, int i, bool tookFirst) {
        if (i >= n) return 0;
        if (i == n - 1 && tookFirst) return 0;               // last house is adjacent to the first
        auto key = make_pair(i, tookFirst);
        if (auto it = memo.find(key); it != memo.end()) return it->second;
        int skip = best(a, i + 1, tookFirst);
        int take = a[i] + best(a, i + 2, tookFirst || i == 0);
        return memo[key] = max(skip, take);
    }
public:
    int rob(vector<int>& nums) { n = nums.size(); if (n == 1) return nums[0]; return best(nums, 0, false); }
};
```

**Time:** O(n log n) (map) · **Space:** O(n). Encodes the circular constraint as extra state.

### Approach 2: Two linear passes via iterators
```cpp
class Solution {
    template <class It>
    static int line(It b, It e) {
        int p2 = 0, p1 = 0;
        for (; b != e; ++b) { int c = max(p1, p2 + *b); p2 = p1; p1 = c; }
        return p1;
    }
public:
    int rob(vector<int>& nums) {
        if (nums.size() == 1) return nums[0];
        return max(line(nums.begin(), nums.end() - 1),   // exclude last
                   line(nums.begin() + 1, nums.end()));  // exclude first
    }
};
```

**Time:** O(n) · **Space:** O(1). Same as Optimal, written generically with iterators.

### Walkthrough
**Goal:** House Robber on a circle — houses 0 and n−1 are neighbours.

1. Any valid plan skips house 0 **or** skips house n−1 (it can't rob both).
2. So the answer is `max(rob(0..n−2), rob(1..n−1))`, each a linear House Robber.
3. Special case n = 1: just that house.

**Dry run** `[2, 3, 2]`:

| range | linear best |
|---|---|
| [2, 3] (exclude last) | 3 |
| [3, 2] (exclude first) | 3 |

Answer **3** (robbing houses 0 and 2 = 4 is illegal: they're adjacent on the circle).

## longest-palindromic-substring

### Approach 1: Brute force — check every substring
```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size(), bestL = 0, bestLen = 1;
        for (int i = 0; i < n; ++i)
            for (int j = i + bestLen; j < n; ++j) {          // only longer candidates
                int l = i, r = j;
                while (l < r && s[l] == s[r]) { ++l; --r; }
                if (l >= r) { bestL = i; bestLen = j - i + 1; }
            }
        return s.substr(bestL, bestLen);
    }
};
```

**Time:** O(n³) · **Space:** O(1).

### Approach 2: DP table
```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size(), bestL = 0, bestLen = 1;
        vector<vector<bool>> dp(n, vector<bool>(n, false));   // dp[i][j]: s[i..j] is a palindrome
        for (int i = n - 1; i >= 0; --i)
            for (int j = i; j < n; ++j) {
                dp[i][j] = s[i] == s[j] && (j - i < 3 || dp[i + 1][j - 1]);
                if (dp[i][j] && j - i + 1 > bestLen) { bestL = i; bestLen = j - i + 1; }
            }
        return s.substr(bestL, bestLen);
    }
};
```

**Time:** O(n²) · **Space:** O(n²). `i` runs backwards so `dp[i+1][j−1]` is already computed.

### Approach 3: Manacher's algorithm
```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        string t = "^#";                                 // transform: a b -> ^#a#b#$
        for (char c : s) { t += c; t += '#'; }
        t += '$';
        int n = t.size(), center = 0, right = 0;
        vector<int> p(n, 0);                             // p[i] = palindrome radius at i in t
        for (int i = 1; i < n - 1; ++i) {
            if (i < right) p[i] = min(right - i, p[2 * center - i]);   // reuse the mirror
            while (t[i + p[i] + 1] == t[i - p[i] - 1]) ++p[i];          // expand
            if (i + p[i] > right) { center = i; right = i + p[i]; }
        }
        int best = max_element(p.begin(), p.end()) - p.begin();
        return s.substr((best - p[best]) / 2, p[best]);
    }
};
```

**Time:** O(n) · **Space:** O(n). Rarely required to code, but naming it and explaining the mirror trick earns points.

### Walkthrough
**Goal:** longest palindrome by expanding around every possible centre.

1. A palindrome mirrors around its centre: a character (odd length) or a gap between two characters (even length) → `2n − 1` centres.
2. For each centre, expand `l--, r++` while the ends match.
3. When the expansion stops, the palindrome is `s[l+1 .. r−1]`, length `r − l − 1`.
4. Keep the longest.

**Dry run** `"babad"` (odd centres):

| centre | expands to | length |
|---|---|---|
| b (0) | "b" | 1 |
| a (1) | "bab" | 3 |
| b (2) | "aba" | 3 |
| a (3) | "a" (b≠d) | 1 |

Even centres all have length 0 here. Answer **"bab"** (or "aba").

## palindromic-substrings

### Approach 1: Brute force check of all substrings
```cpp
class Solution {
public:
    int countSubstrings(string s) {
        int n = s.size(), count = 0;
        for (int i = 0; i < n; ++i)
            for (int j = i; j < n; ++j) {
                int l = i, r = j;
                while (l < r && s[l] == s[r]) { ++l; --r; }
                count += l >= r;
            }
        return count;
    }
};
```

**Time:** O(n³) · **Space:** O(1).

### Approach 2: DP table
```cpp
class Solution {
public:
    int countSubstrings(string s) {
        int n = s.size(), count = 0;
        vector<vector<bool>> dp(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; --i)
            for (int j = i; j < n; ++j) {
                dp[i][j] = s[i] == s[j] && (j - i < 3 || dp[i + 1][j - 1]);
                count += dp[i][j];
            }
        return count;
    }
};
```

**Time:** O(n²) · **Space:** O(n²). The same table answers many palindrome queries (e.g. Palindrome Partitioning).

### Walkthrough
**Goal:** count all palindromic substrings (by position).

1. Every palindrome has a unique centre. Expand from each of the `2n − 1` centres.
2. **Each successful expansion step is one more palindrome**, so increment the count inside the loop.

**Dry run** `"aaa"`:

| centre | palindromes found | count |
|---|---|---|
| a (0) | "a" | 1 |
| gap 0-1 | "aa" | 2 |
| a (1) | "a", "aaa" | 4 |
| gap 1-2 | "aa" | 5 |
| a (2) | "a" | **6** |

## decode-ways

### Approach 1: Memoised recursion
```cpp
class Solution {
    vector<int> memo;
    int ways(const string& s, int i) {               // ways to decode s[i..]
        if (i == (int)s.size()) return 1;
        if (s[i] == '0') return 0;                   // nothing starts with 0
        if (memo[i] >= 0) return memo[i];
        int r = ways(s, i + 1);                      // take one digit
        if (i + 1 < (int)s.size() && (s[i] == '1' || (s[i] == '2' && s[i + 1] <= '6')))
            r += ways(s, i + 2);                     // take two digits (10..26)
        return memo[i] = r;
    }
public:
    int numDecodings(string s) { memo.assign(s.size(), -1); return ways(s, 0); }
};
```

**Time:** O(n) · **Space:** O(n). The suffix formulation is often easier to derive.

### Approach 2: Tabulation array
```cpp
class Solution {
public:
    int numDecodings(string s) {
        int n = s.size();
        vector<int> dp(n + 1, 0);                    // dp[i]: ways to decode the first i chars
        dp[0] = 1;
        for (int i = 1; i <= n; ++i) {
            if (s[i - 1] != '0') dp[i] += dp[i - 1];
            if (i >= 2) {
                int two = stoi(s.substr(i - 2, 2));
                if (two >= 10 && two <= 26) dp[i] += dp[i - 2];
            }
        }
        return dp[n];
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Walkthrough
**Goal:** count decodings where `1..26` map to letters.

1. **State:** `dp[i]` = ways to decode the first `i` characters. `dp[0] = 1` (empty string).
2. **Single digit:** if `s[i−1] != '0'`, it decodes alone → add `dp[i−1]`.
3. **Two digits:** if `s[i−2..i−1]` is between 10 and 26 → add `dp[i−2]`.
4. Keep only the last two values.

**Dry run** `"226"`:

| i | one digit | two digits | dp[i] |
|---|---|---|---|
| 0 | | | 1 |
| 1 | "2" ✔ +1 | — | 1 |
| 2 | "2" ✔ +1 | "22" ✔ +1 | 2 |
| 3 | "6" ✔ +2 | "26" ✔ +1 | **3** |

Decodings: "BZ" (2,26), "VF" (22,6), "BBF" (2,2,6). With `"06"`: dp[1] = 0 (leading zero) → answer 0.

## coin-change

### Approach 1: Memoised recursion (top-down)
```cpp
class Solution {
    vector<int> memo;                                 // -2 = unknown, -1 = impossible
    int f(const vector<int>& coins, int amt) {
        if (amt == 0) return 0;
        if (amt < 0) return -1;
        if (memo[amt] != -2) return memo[amt];
        int best = INT_MAX;
        for (int c : coins) {
            int sub = f(coins, amt - c);
            if (sub >= 0) best = min(best, sub + 1);
        }
        return memo[amt] = best == INT_MAX ? -1 : best;
    }
public:
    int coinChange(vector<int>& coins, int amount) { memo.assign(amount + 1, -2); return f(coins, amount); }
};
```

**Time:** O(amount × coins) · **Space:** O(amount) + recursion depth up to `amount` (10⁴ frames).

### Approach 2: BFS over amounts
```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        if (amount == 0) return 0;
        vector<bool> seen(amount + 1, false);
        queue<int> q; q.push(0); seen[0] = true;
        for (int steps = 1; !q.empty(); ++steps) {
            for (int sz = q.size(); sz > 0; --sz) {
                int cur = q.front(); q.pop();
                for (int c : coins) {
                    long long nxt = (long long)cur + c;
                    if (nxt == amount) return steps;           // fewest coins = BFS depth
                    if (nxt < amount && !seen[nxt]) { seen[nxt] = true; q.push((int)nxt); }
                }
            }
        }
        return -1;
    }
};
```

**Time:** O(amount × coins) · **Space:** O(amount). "Fewest coins" is a shortest path in a graph whose nodes are amounts.

### Approach 3: Greedy (wrong in general — know why)
Taking the largest coin first works for "canonical" coin systems like `{1, 5, 10, 25}` but fails for `{1, 3, 4}` with amount 6: greedy gives 4+1+1 (3 coins), optimal is 3+3 (2 coins). Always justify greedy or use DP.

### Walkthrough
**Goal:** minimum coins to make `amount` (unlimited coins).

1. **State:** `dp[a]` = fewest coins for amount `a`. `dp[0] = 0`; all others start at "infinity" (`amount + 1`, larger than any real answer and overflow-safe).
2. **Transition:** for each coin `c ≤ a`: `dp[a] = min(dp[a], dp[a − c] + 1)` — the last coin used was `c`.
3. Answer `dp[amount]`, or −1 if still infinity.

**Dry run** `coins = [1, 2, 5]`, amount 11 (selected entries):

| a | candidates (coin → dp[a−c]+1) | dp[a] |
|---|---|---|
| 1 | 1 → 1 | 1 |
| 2 | 1 → 2, 2 → 1 | 1 |
| 3 | 1 → 2, 2 → 2 | 2 |
| 5 | 5 → 1 | 1 |
| 6 | 1 → 2, 5 → 2 | 2 |
| 10 | 5 → 2 | 2 |
| 11 | 1 → 3, 2 → 4, 5 → 3 | **3** |

## maximum-product-subarray

### Approach 1: Brute force
```cpp
class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int best = INT_MIN, n = nums.size();
        for (int i = 0; i < n; ++i) {
            long long p = 1;
            for (int j = i; j < n; ++j) { p *= nums[j]; best = max<long long>(best, p); }
        }
        return best;
    }
};
```

**Time:** O(n²) · **Space:** O(1). The `long long` accumulator gives headroom; the problem guarantees every subarray product fits in 32 bits.

### Approach 2: Prefix and suffix products
```cpp
class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int n = nums.size();
        double pre = 1, suf = 1, best = nums[0];
        for (int i = 0; i < n; ++i) {
            pre = (pre == 0 ? 1 : pre) * nums[i];            // restart after a zero
            suf = (suf == 0 ? 1 : suf) * nums[n - 1 - i];
            best = max({best, pre, suf});
        }
        return (int)best;
    }
};
```

**Time:** O(n) · **Space:** O(1). Insight: with an odd number of negatives, the best product drops either the prefix up to the first negative or the suffix after the last one — so scanning from both ends covers it.

### Walkthrough
**Goal:** max product of a contiguous subarray; negatives can flip a small product into a large one.

1. Track **both** the max and min product of subarrays ending at the current index.
2. When `x < 0`, multiplying swaps roles: the old min becomes the new max candidate → `swap(mx, mn)` first.
3. `mx = max(x, mx·x)`, `mn = min(x, mn·x)` — "start fresh at x" handles zeros naturally.
4. `best = max(best, mx)`.

**Dry run** `[2, 3, −2, 4, −1]`:

| x | swap? | mx | mn | best |
|---|---|---|---|---|
| 2 | | 2 | 2 | 2 |
| 3 | | 6 | 3 | 6 |
| −2 | yes | −2 | −12 | 6 |
| 4 | | 4 | −48 | 6 |
| −1 | yes | 48 | −4 | **48** |

The whole array: 2·3·(−2)·4·(−1) = 48.

## word-break

### Approach 1: Plain recursion (exponential)
```cpp
class Solution {
    bool go(const string& s, int i, const unordered_set<string>& dict) {
        if (i == (int)s.size()) return true;
        for (int j = i + 1; j <= (int)s.size(); ++j)
            if (dict.count(s.substr(i, j - i)) && go(s, j, dict)) return true;
        return false;
    }
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        return go(s, 0, dict);
    }
};
```

**Time:** O(2ⁿ) worst (e.g. `"aaaa…ab"` with dict `{a, aa, aaa}`) · **Space:** O(n).

### Approach 2: BFS over start indices
```cpp
class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        int n = s.size();
        vector<bool> seen(n + 1, false);
        queue<int> q; q.push(0); seen[0] = true;
        while (!q.empty()) {
            int i = q.front(); q.pop();
            if (i == n) return true;
            for (int j = i + 1; j <= n; ++j)
                if (!seen[j] && dict.count(s.substr(i, j - i))) { seen[j] = true; q.push(j); }
        }
        return false;
    }
};
```

**Time:** O(n³) with substring hashing · **Space:** O(n). Memoising visited start positions is what fixes the exponential blow-up.

### Walkthrough
**Goal:** can `s` be split into dictionary words?

1. **State:** `dp[i]` = the prefix `s[0..i)` can be segmented. `dp[0] = true`.
2. **Transition:** `dp[i]` is true if some word `w` ends at `i` (i.e. `s` has `w` at position `i − |w|`) and `dp[i − |w|]` is true.
3. Answer `dp[n]`.

**Dry run** `s = "leetcode"`, dict {leet, code}:

| i | prefix | matching word ending here | dp[i] |
|---|---|---|---|
| 0 | "" | | T |
| 4 | "leet" | leet, dp[0] = T | **T** |
| 8 | "leetcode" | code, dp[4] = T | **T** |

All other `dp[i]` are false. Answer **true**.

## longest-increasing-subsequence

### Approach 1: Plain recursion (take / skip)
```cpp
class Solution {
    int go(const vector<int>& a, int i, int prev) {           // prev = index of last taken, -1 none
        if (i == (int)a.size()) return 0;
        int skip = go(a, i + 1, prev);
        int take = (prev < 0 || a[i] > a[prev]) ? 1 + go(a, i + 1, i) : 0;
        return max(skip, take);
    }
public:
    int lengthOfLIS(vector<int>& nums) { return go(nums, 0, -1); }
};
```

**Time:** O(2ⁿ) · **Space:** O(n). Memoising on `(i, prev)` gives O(n²).

### Approach 2: O(n²) DP
```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        int n = nums.size();
        vector<int> dp(n, 1);                        // dp[i]: LIS ending exactly at i
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < i; ++j)
                if (nums[j] < nums[i]) dp[i] = max(dp[i], dp[j] + 1);
        return *ranges::max_element(dp);
    }
};
```

**Time:** O(n²) · **Space:** O(n). Easy to extend to *reconstruct* the subsequence (store the predecessor `j`).

### Walkthrough
**Goal:** length of the longest strictly increasing subsequence in O(n log n).

1. Maintain `tails`, where `tails[k]` = the **smallest possible tail value** of an increasing subsequence of length `k + 1` seen so far. `tails` is always sorted.
2. For each `x`, binary search the first tail `≥ x` (`lower_bound`):
   1. None → `x` extends the longest subsequence → append.
   2. Found → replace it with `x` (same length, smaller tail = more room to extend later).
3. The answer is `tails.size()` (note: `tails` itself is not necessarily a valid subsequence).

**Dry run** `[10, 9, 2, 5, 3, 7, 101, 18]`:

| x | lower_bound | tails after |
|---|---|---|
| 10 | end | [10] |
| 9 | 10 → replace | [9] |
| 2 | 9 → replace | [2] |
| 5 | end | [2, 5] |
| 3 | 5 → replace | [2, 3] |
| 7 | end | [2, 3, 7] |
| 101 | end | [2, 3, 7, 101] |
| 18 | 101 → replace | [2, 3, 7, 18] |

Answer **4** (e.g. 2, 3, 7, 18).

## partition-equal-subset-sum

### Approach 1: Memoised recursion (take / skip)
```cpp
class Solution {
    vector<vector<int>> memo;                          // -1 unknown
    bool can(const vector<int>& a, int i, int rem) {
        if (rem == 0) return true;
        if (i == (int)a.size() || rem < 0) return false;
        int& m = memo[i][rem];
        if (m != -1) return m;
        return m = can(a, i + 1, rem - a[i]) || can(a, i + 1, rem);
    }
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2) return false;
        memo.assign(nums.size(), vector<int>(total / 2 + 1, -1));
        return can(nums, 0, total / 2);
    }
};
```

**Time:** O(n · sum) · **Space:** O(n · sum).

### Approach 2: Bitset of reachable sums
```cpp
class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2) return false;
        bitset<10001> reach;                   // bit s = some subset sums to s (max total/2 = 10000)
        reach[0] = 1;
        for (int x : nums) reach |= reach << x;     // each existing sum s also gives s + x
        return reach[total / 2];
    }
};
```

**Time:** O(n · sum / 64) · **Space:** O(sum) bits. Shifting a bitset processes 64 sums per machine instruction — a beautiful trick.

### Approach 3: Set of reachable sums
```cpp
class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2) return false;
        unordered_set<int> sums{0};
        for (int x : nums) {
            vector<int> add;
            for (int s : sums) if (s + x <= total / 2) add.push_back(s + x);
            sums.insert(add.begin(), add.end());
            if (sums.count(total / 2)) return true;
        }
        return false;
    }
};
```

**Time:** O(n · sum) · **Space:** O(sum). The most intuitive formulation.

### Walkthrough
**Goal:** a subset summing to exactly half the total (0/1 knapsack).

1. Odd total → impossible.
2. **State:** `dp[s]` = some subset of the items processed so far sums to `s`. `dp[0] = true`.
3. For each number `x`, for `s` from `target` **down to** `x`: `dp[s] |= dp[s − x]`.
4. **Why downward?** Going down guarantees `dp[s − x]` still describes subsets *without* `x`, so each item is used at most once. Going upward would let `x` be reused (unbounded knapsack).

**Dry run** `[1, 5, 11, 5]`, target 11 (true sums listed):

| after x | reachable sums |
|---|---|
| — | {0} |
| 1 | {0, 1} |
| 5 | {0, 1, 5, 6} |
| 11 | {0, 1, 5, 6, 11} ← target reached |
| 5 | {…, 10, 11} |

Answer **true** ({11} vs {1, 5, 5}).
