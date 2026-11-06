## climbing-stairs

### Approach 1: Plain recursion
**The idea:** the last move into step n was either a 1-step (from n−1) or a 2-step (from n−2). So `ways(n) = ways(n−1) + ways(n−2)`.

```cpp
class Solution {
public:
    int climbStairs(int n) {
        if (n <= 1) {
            return 1;            // 0 or 1 steps: exactly one way
        }
        return climbStairs(n - 1) + climbStairs(n - 2);
    }
};
```

**How it works:** a direct translation of the recurrence.

**Think of it like this:** asking two friends "how many ways to get to the step below me?" — and each of them asks two more friends, and so on.

**Cost:** Time **O(2ⁿ)** — the same values are recomputed again and again. Space **O(n)** stack.

### Approach 2: Memoisation (top-down DP)
**The idea:** same recursion, but remember each answer the first time you compute it.

```cpp
class Solution {
public:
    int climbStairs(int n) {
        memo.assign(n + 1, -1);       // -1 means "not computed yet"
        return ways(n);
    }

private:
    vector<int> memo;

    int ways(int i) {
        if (i <= 1) {
            return 1;
        }
        if (memo[i] != -1) {
            return memo[i];           // already known
        }
        memo[i] = ways(i - 1) + ways(i - 2);
        return memo[i];
    }
};
```

**How it works:** each `ways(i)` is computed once, then reused.

**Think of it like this:** the friends write their answers on a whiteboard so nobody repeats the work.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 3: Tabulation (bottom-up array)
**The idea:** fill a table from the bottom step upwards.

```cpp
class Solution {
public:
    int climbStairs(int n) {
        vector<int> ways(n + 1);
        ways[0] = 1;
        ways[1] = 1;
        for (int i = 2; i <= n; i++) {
            ways[i] = ways[i - 1] + ways[i - 2];
        }
        return ways[n];
    }
};
```

**How it works:** by the time you compute `ways[i]`, both smaller values are ready.

**Think of it like this:** climbing the stairs yourself and writing the count on each step as you go.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 4: Matrix exponentiation (O(log n))
**The idea:** the pair `(ways(i), ways(i−1))` is multiplied by the matrix `[[1,1],[1,0]]` at each step. Raising that matrix to the n-th power by repeated squaring jumps straight to the answer.

```cpp
class Solution {
public:
    int climbStairs(int n) {
        // result starts as the identity matrix.
        long long r00 = 1, r01 = 0, r10 = 0, r11 = 1;
        // base = [[1, 1], [1, 0]]
        long long b00 = 1, b01 = 1, b10 = 1, b11 = 0;
        int power = n;
        while (power > 0) {
            if (power % 2 == 1) {
                // result = result * base
                long long t00 = r00 * b00 + r01 * b10;
                long long t01 = r00 * b01 + r01 * b11;
                long long t10 = r10 * b00 + r11 * b10;
                long long t11 = r10 * b01 + r11 * b11;
                r00 = t00; r01 = t01; r10 = t10; r11 = t11;
            }
            // base = base * base
            long long t00 = b00 * b00 + b01 * b10;
            long long t01 = b00 * b01 + b01 * b11;
            long long t10 = b10 * b00 + b11 * b10;
            long long t11 = b10 * b01 + b11 * b11;
            b00 = t00; b01 = t01; b10 = t10; b11 = t11;
            power /= 2;
        }
        // M^n = [[F(n+1), F(n)], [F(n), F(n-1)]] and ways(n) = F(n+1).
        return (int)r00;
    }
};
```

**How it works:** squaring the matrix doubles the number of steps covered, so only log n multiplications are needed.

**Think of it like this:** instead of climbing one step at a time, you learn to jump 1, 2, 4, 8 … steps at once.

**Cost:** Time **O(log n)**. Space **O(1)**. Overkill here, but a known follow-up.

### Optimal: Two rolling variables
**The idea:** the table only ever looks back two steps, so keep just two numbers.

```cpp
class Solution {
public:
    int climbStairs(int n) {
        int twoBelow = 1;   // ways(i - 2), starting with ways(0)
        int oneBelow = 1;   // ways(i - 1), starting with ways(1)

        for (int i = 2; i <= n; i++) {
            int current = oneBelow + twoBelow;   // ways(i)
            twoBelow = oneBelow;                 // slide the window up one step
            oneBelow = current;
        }
        return oneBelow;                         // ways(n)
    }
};
```

**How it works**
1. **State:** `ways(i)` = ways to reach step i.
2. **Recurrence:** `ways(i) = ways(i−1) + ways(i−2)`.
3. **Base:** `ways(0) = ways(1) = 1`.
4. Keep only the last two values.

**Think of it like this:** the Fibonacci sequence — each number is the sum of the two before it.

**Why it's optimal:** O(n) time with O(1) memory; this recursion → memo → table → two variables progression is the template for every DP in this section.

**Cost:** Time **O(n)**. Space **O(1)**.

## min-cost-climbing-stairs

### Approach 1: Memoised recursion
**The idea:** `best(i)` = cheapest cost to arrive at step i. You arrive from i−1 (paying `cost[i−1]`) or from i−2 (paying `cost[i−2]`).

```cpp
class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        memo.assign(cost.size() + 1, -1);
        return best(cost, cost.size());      // the top is one past the last step
    }

private:
    vector<int> memo;

    int best(vector<int>& cost, int i) {
        if (i <= 1) {
            return 0;                        // you may start on step 0 or 1 for free
        }
        if (memo[i] != -1) {
            return memo[i];
        }
        int fromOne = best(cost, i - 1) + cost[i - 1];
        int fromTwo = best(cost, i - 2) + cost[i - 2];
        memo[i] = min(fromOne, fromTwo);
        return memo[i];
    }
};
```

**How it works:** each step's cheapest arrival cost is computed once.

**Think of it like this:** "what's the cheapest way to stand here?" asked from the top downwards.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Table
**The idea:** fill `dp[i]` = cheapest arrival at step i from the bottom up.

```cpp
class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        int n = cost.size();
        vector<int> dp(n + 1, 0);           // dp[0] = dp[1] = 0: free start
        for (int i = 2; i <= n; i++) {
            dp[i] = min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
        }
        return dp[n];
    }
};
```

**How it works:** same recurrence, iterative.

**Think of it like this:** writing the cheapest price to reach each step on the step itself.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Two rolling variables
**The idea:** only the last two arrival costs are needed.

```cpp
class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        int twoBelow = 0;     // cheapest arrival at step i - 2
        int oneBelow = 0;     // cheapest arrival at step i - 1

        for (int i = 2; i <= (int)cost.size(); i++) {
            int fromOne = oneBelow + cost[i - 1];   // step up 1 from i - 1
            int fromTwo = twoBelow + cost[i - 2];   // step up 2 from i - 2
            int current = min(fromOne, fromTwo);
            twoBelow = oneBelow;
            oneBelow = current;
        }
        return oneBelow;      // cheapest arrival at the top (index n)
    }
};
```

**How it works**
1. `dp[i]` = cheapest cost to arrive at step i (before paying for it). The top is index n.
2. `dp[0] = dp[1] = 0`.
3. `dp[i] = min(dp[i−1] + cost[i−1], dp[i−2] + cost[i−2])`.

**Think of it like this:** a toll road where each stair is a toll booth; you want the cheapest route to the exit.

**Why it's optimal:** O(n) time, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## house-robber

### Approach 1: Memoised recursion
**The idea:** `best(i)` = most money from houses 0..i. At house i, either skip it (`best(i−1)`) or rob it (`best(i−2) + nums[i]`).

```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        memo.assign(nums.size(), -1);
        return best(nums, nums.size() - 1);
    }

private:
    vector<int> memo;

    int best(vector<int>& nums, int i) {
        if (i < 0) {
            return 0;                        // no houses
        }
        if (memo[i] != -1) {
            return memo[i];
        }
        int skip = best(nums, i - 1);
        int take = best(nums, i - 2) + nums[i];
        memo[i] = max(skip, take);
        return memo[i];
    }
};
```

**How it works:** each house is decided once.

**Think of it like this:** walking backwards down the street asking "is this house worth giving up the neighbour?".

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Two states — "robbed this house" / "didn't"
**The idea:** track two numbers per house: the best total if you rob it, and the best total if you don't.

```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        int robbed = 0;      // best total if the previous house WAS robbed
        int skipped = 0;     // best total if the previous house was NOT robbed
        for (int x : nums) {
            int robNow = skipped + x;              // can only rob if the previous was skipped
            int skipNow = max(robbed, skipped);    // skipping keeps the best so far
            robbed = robNow;
            skipped = skipNow;
        }
        return max(robbed, skipped);
    }
};
```

**How it works:** the "can't rob neighbours" rule becomes "rob only after a skip".

**Think of it like this:** a light switch for each house; "on" is only allowed if the previous one was "off".

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: One rolling DP
**The idea:** `dp[i] = max(dp[i−1], dp[i−2] + nums[i])`, keeping only the last two values.

```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        int twoBack = 0;   // best loot up to house i - 2
        int oneBack = 0;   // best loot up to house i - 1

        for (int x : nums) {
            // Skip this house (keep oneBack) or rob it (twoBack + x).
            int current = max(oneBack, twoBack + x);
            twoBack = oneBack;
            oneBack = current;
        }
        return oneBack;
    }
};
```

**How it works**
1. **State:** best loot considering houses up to i.
2. **Choice:** skip → `dp[i−1]`; rob → `dp[i−2] + nums[i]`.
3. Two variables are enough.

**Think of it like this:** at each house, compare "what I had before this house" with "what I had two houses ago plus this house".

**Why it's optimal:** O(n) time, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## house-robber-ii

### Approach 1: Memoised recursion with a "took the first house" flag
**The idea:** same as House Robber, but remember whether house 0 was robbed; if so, the last house is off limits.

```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        n = nums.size();
        if (n == 1) {
            return nums[0];
        }
        memo.assign(2, vector<int>(n, -1));
        // Option 1: rob house 0 (then the last house can't be robbed).
        int takeFirst = nums[0] + best(nums, 2, 1);
        // Option 2: skip house 0.
        int skipFirst = best(nums, 1, 0);
        return max(takeFirst, skipFirst);
    }

private:
    int n = 0;
    vector<vector<int>> memo;     // memo[tookFirst][i]

    int best(vector<int>& nums, int i, int tookFirst) {
        int lastAllowed = tookFirst ? n - 2 : n - 1;
        if (i > lastAllowed) {
            return 0;
        }
        if (memo[tookFirst][i] != -1) {
            return memo[tookFirst][i];
        }
        int skip = best(nums, i + 1, tookFirst);
        int take = nums[i] + best(nums, i + 2, tookFirst);
        memo[tookFirst][i] = max(skip, take);
        return memo[tookFirst][i];
    }
};
```

**How it works:** the flag remembers the only constraint the circle adds.

**Think of it like this:** robbing a ring of houses; if you hit the first one, you must leave its other neighbour (the last house) alone.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Two linear House Robber passes
**The idea:** houses 0 and n−1 are neighbours, so a valid plan skips one of them. Solve the line without the last house and the line without the first house; take the better.

```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) {
            return nums[0];                     // only one house
        }
        int withoutLast = robRange(nums, 0, n - 2);
        int withoutFirst = robRange(nums, 1, n - 1);
        return max(withoutLast, withoutFirst);
    }

private:
    // Classic House Robber on nums[lo..hi] (inclusive).
    int robRange(const vector<int>& nums, int lo, int hi) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = lo; i <= hi; i++) {
            int current = max(oneBack, twoBack + nums[i]);
            twoBack = oneBack;
            oneBack = current;
        }
        return oneBack;
    }
};
```

**How it works**
1. Any plan avoids house 0 or avoids house n−1.
2. `max(rob(0..n−2), rob(1..n−1))`.
3. One house → just rob it.

**Think of it like this:** cutting the circle open in two different places and solving the straight street each time.

**Why it's optimal:** two O(n) passes, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## longest-palindromic-substring

### Approach 1: Brute force — check every substring
**The idea:** try every start and end; check if it's a palindrome; keep the longest.

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size();
        int bestStart = 0;
        int bestLen = 1;
        for (int i = 0; i < n; i++) {
            for (int j = i + bestLen; j < n; j++) {     // only longer than the best so far
                if (isPalindrome(s, i, j)) {
                    bestStart = i;
                    bestLen = j - i + 1;
                }
            }
        }
        return s.substr(bestStart, bestLen);
    }

private:
    bool isPalindrome(const string& s, int l, int r) {
        while (l < r) {
            if (s[l] != s[r]) {
                return false;
            }
            l++;
            r--;
        }
        return true;
    }
};
```

**How it works:** O(n²) substrings × O(n) check each.

**Think of it like this:** cutting out every possible piece of a ribbon and reading it forwards and backwards.

**Cost:** Time **O(n³)**. Space **O(1)**.

### Approach 2: DP table
**The idea:** `pal[i][j]` is true when `s[i] == s[j]` and the inside `s[i+1..j−1]` is a palindrome.

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size();
        vector<vector<bool>> pal(n, vector<bool>(n, false));
        int bestStart = 0;
        int bestLen = 1;

        // i goes right to left so pal[i + 1][...] is already filled.
        for (int i = n - 1; i >= 0; i--) {
            for (int j = i; j < n; j++) {
                if (s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1])) {
                    pal[i][j] = true;
                    if (j - i + 1 > bestLen) {
                        bestStart = i;
                        bestLen = j - i + 1;
                    }
                }
            }
        }
        return s.substr(bestStart, bestLen);
    }
};
```

**How it works:** short palindromes are used to recognise longer ones.

**Think of it like this:** a palindrome is a smaller palindrome with matching letters added on both ends.

**Cost:** Time **O(n²)**. Space **O(n²)**.

### Approach 3: Manacher's algorithm (O(n))
**The idea:** insert `#` between characters so every palindrome has odd length, then reuse mirror information to avoid re-expanding.

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        // "abc" → "^#a#b#c#$" (^ and $ are sentinels that never match).
        string t = "^";
        for (char c : s) {
            t += '#';
            t += c;
        }
        t += "#$";

        int m = t.size();
        vector<int> radius(m, 0);   // palindrome radius around each position of t
        int center = 0;
        int right = 0;              // right edge of the rightmost palindrome found
        for (int i = 1; i < m - 1; i++) {
            int mirror = 2 * center - i;
            if (i < right) {
                radius[i] = min(right - i, radius[mirror]);   // reuse the mirror's answer
            }
            while (t[i + radius[i] + 1] == t[i - radius[i] - 1]) {
                radius[i]++;                                   // expand further
            }
            if (i + radius[i] > right) {
                center = i;
                right = i + radius[i];
            }
        }

        int bestCenter = 0;
        int bestRadius = 0;
        for (int i = 1; i < m - 1; i++) {
            if (radius[i] > bestRadius) {
                bestRadius = radius[i];
                bestCenter = i;
            }
        }
        int start = (bestCenter - bestRadius) / 2;   // map back to s
        return s.substr(start, bestRadius);
    }
};
```

**How it works:** inside a big palindrome, the right half mirrors the left half, so radii can be copied instead of recomputed.

**Think of it like this:** if you already know a word reflects in a mirror, you know what's on the other side without looking.

**Cost:** Time **O(n)**. Space **O(n)**. Good to know exists; rarely expected.

### Optimal: Expand around every centre
**The idea:** every palindrome mirrors around a centre — a character (odd length) or the gap between two characters (even length). Expand outwards from each of the 2n − 1 centres.

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        n = s.size();
        bestL = 0;
        bestLen = 0;
        for (int i = 0; i < n; i++) {
            expand(s, i, i);        // odd length: centre is s[i]
            expand(s, i, i + 1);    // even length: centre is between s[i] and s[i + 1]
        }
        return s.substr(bestL, bestLen);
    }

private:
    int n = 0;
    int bestL = 0;      // start of the best palindrome
    int bestLen = 0;    // its length

    void expand(const string& s, int l, int r) {
        // Grow while both ends exist and match.
        while (l >= 0 && r < n && s[l] == s[r]) {
            l--;
            r++;
        }
        // The loop overshot by one on each side: the palindrome is s[l+1 .. r-1].
        int length = r - l - 1;
        if (length > bestLen) {
            bestLen = length;
            bestL = l + 1;
        }
    }
};
```

**How it works**
1. Expand `l--, r++` while the ends match.
2. When it stops, the palindrome is `s[l+1 .. r−1]` with length `r − l − 1`.
3. Keep the longest.

**Think of it like this:** dropping a pebble at every spot and watching how far the "ripple" of matching letters spreads.

**Why it's the interview answer:** O(n²) time with O(1) memory, short and easy to get right. Mention Manacher's for O(n).

**Cost:** Time **O(n²)**. Space **O(1)**.

## palindromic-substrings

### Approach 1: Brute force — check every substring
**The idea:** test all O(n²) substrings with a two-pointer palindrome check.

```cpp
class Solution {
public:
    int countSubstrings(string s) {
        int n = s.size();
        int count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                int l = i;
                int r = j;
                bool palindrome = true;
                while (l < r) {
                    if (s[l] != s[r]) {
                        palindrome = false;
                        break;
                    }
                    l++;
                    r--;
                }
                if (palindrome) {
                    count++;
                }
            }
        }
        return count;
    }
};
```

**How it works:** literal definition.

**Think of it like this:** reading every snippet of a sentence forwards and backwards.

**Cost:** Time **O(n³)**. Space **O(1)**.

### Approach 2: DP table
**The idea:** same table as Longest Palindromic Substring; count every true cell.

```cpp
class Solution {
public:
    int countSubstrings(string s) {
        int n = s.size();
        vector<vector<bool>> pal(n, vector<bool>(n, false));
        int count = 0;
        for (int i = n - 1; i >= 0; i--) {
            for (int j = i; j < n; j++) {
                if (s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1])) {
                    pal[i][j] = true;
                    count++;
                }
            }
        }
        return count;
    }
};
```

**How it works:** each palindrome is detected once using the smaller palindrome inside it.

**Think of it like this:** a grid where you tick every (start, end) pair that's a palindrome.

**Cost:** Time **O(n²)**. Space **O(n²)**.

### Optimal: Expand around every centre, counting as you go
**The idea:** each successful expansion step from a centre is one more palindrome.

```cpp
class Solution {
public:
    int countSubstrings(string s) {
        int n = s.size();
        int count = 0;

        // There are 2n - 1 centres: n letters and n - 1 gaps between letters.
        for (int centre = 0; centre < 2 * n - 1; centre++) {
            int l = centre / 2;          // left start
            int r = l + centre % 2;      // same as l for odd centres, l + 1 for even ones
            while (l >= 0 && r < n && s[l] == s[r]) {
                count++;                 // s[l..r] is a palindrome
                l--;
                r++;
            }
        }
        return count;
    }
};
```

**How it works**
1. Even `centre` → a letter; odd `centre` → the gap after letter `centre / 2`.
2. Expand while the ends match; each match is a new palindrome.

**Think of it like this:** standing at each possible mirror line and counting how many mirror images you can extend.

**Why it's optimal:** O(n²) time, O(1) memory (a linear-time version exists with Manacher's).

**Cost:** Time **O(n²)**. Space **O(1)**.

## decode-ways

### Approach 1: Memoised recursion
**The idea:** `ways(i)` = number of ways to decode `s[i..]`. Take one digit (if not `0`) or two digits (if 10..26).

```cpp
class Solution {
public:
    int numDecodings(string s) {
        memo.assign(s.size() + 1, -1);
        return ways(s, 0);
    }

private:
    vector<int> memo;

    int ways(const string& s, int i) {
        if (i == (int)s.size()) {
            return 1;                        // decoded everything: one complete way
        }
        if (s[i] == '0') {
            return 0;                        // no letter starts with 0
        }
        if (memo[i] != -1) {
            return memo[i];
        }
        int total = ways(s, i + 1);          // use one digit
        if (i + 1 < (int)s.size()) {
            int two = (s[i] - '0') * 10 + (s[i + 1] - '0');
            if (two <= 26) {
                total += ways(s, i + 2);     // use two digits
            }
        }
        memo[i] = total;
        return total;
    }
};
```

**How it works:** branching on "1 or 2 digits" with caching.

**Think of it like this:** reading a secret code where each chunk can be one or two digits long.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Table from the left
**The idea:** `dp[i]` = ways to decode the first i characters.

```cpp
class Solution {
public:
    int numDecodings(string s) {
        int n = s.size();
        vector<int> dp(n + 1, 0);
        dp[0] = 1;                                    // empty prefix: one way
        for (int i = 1; i <= n; i++) {
            if (s[i - 1] != '0') {
                dp[i] += dp[i - 1];                   // last digit decoded alone
            }
            if (i >= 2) {
                int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
                if (two >= 10 && two <= 26) {
                    dp[i] += dp[i - 2];               // last two digits together
                }
            }
        }
        return dp[n];
    }
};
```

**How it works:** same recurrence, iterative.

**Think of it like this:** counting decodings of longer and longer prefixes.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: Two rolling variables
**The idea:** the table only needs `dp[i−1]` and `dp[i−2]`.

```cpp
class Solution {
public:
    int numDecodings(string s) {
        int n = s.size();
        int twoBack = 1;                       // dp[0]: empty prefix
        int oneBack = (s[0] != '0') ? 1 : 0;   // dp[1]: first character alone

        for (int i = 2; i <= n; i++) {
            int current = 0;
            // One digit: s[i-1] must not be '0'.
            if (s[i - 1] != '0') {
                current += oneBack;
            }
            // Two digits: s[i-2..i-1] must be between 10 and 26.
            int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (two >= 10 && two <= 26) {
                current += twoBack;
            }
            twoBack = oneBack;
            oneBack = current;
        }
        return oneBack;
    }
};
```

**How it works**
1. `dp[i]` = ways to decode the first i characters, `dp[0] = 1`.
2. Single digit (not `0`) adds `dp[i−1]`.
3. Two digits 10..26 add `dp[i−2]`.

**Think of it like this:** Climbing Stairs, but some steps are "broken" (zeros or numbers above 26).

**Why it's optimal:** O(n) time, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## coin-change

### Approach 1: Greedy — largest coin first (wrong in general, know why)
**The idea (don't use it):** always take the biggest coin that still fits. It works for real currency, but not for every coin set.

```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> sorted = coins;
        sort(sorted.rbegin(), sorted.rend());   // biggest coin first
        int count = 0;
        for (int c : sorted) {
            while (amount >= c) {
                amount -= c;                    // take as many of this coin as fit
                count++;
            }
        }
        if (amount != 0) {
            return -1;                          // may say "impossible" when it isn't!
        }
        return count;
    }
};
```

**How it works:** with coins `[1, 3, 4]` and amount 6 it picks 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 coins is better. With `[2, 5]` and amount 6 it takes 5, gets stuck at 1 and returns −1, although 2 + 2 + 2 works.

**Think of it like this:** grabbing the biggest bill from your wallet first — fine with euros, wrong with oddly sized coins.

**Cost:** Time **O(k log k + amount)**. Space **O(k)**. Shown so you can explain why DP is needed.

### Approach 2: Memoised recursion (top-down)
**The idea:** `fewest(a)` = fewest coins for amount `a` = 1 + the best `fewest(a − c)` over all coins c.

```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        memo.assign(amount + 1, -2);          // -2 = not computed, -1 = impossible
        return fewest(coins, amount);
    }

private:
    vector<int> memo;

    int fewest(vector<int>& coins, int a) {
        if (a == 0) {
            return 0;
        }
        if (memo[a] != -2) {
            return memo[a];
        }
        int best = -1;
        for (int c : coins) {
            if (c > a) {
                continue;
            }
            int sub = fewest(coins, a - c);
            if (sub != -1 && (best == -1 || sub + 1 < best)) {
                best = sub + 1;              // use coin c last
            }
        }
        memo[a] = best;
        return best;
    }
};
```

**How it works:** tries each coin as "the last coin", caching each amount.

**Think of it like this:** "to pay 11, I'll pay one coin now and then the best way to pay what's left".

**Cost:** Time **O(amount · coins)**. Space **O(amount)** (recursion can be deep).

### Approach 3: BFS over amounts
**The idea:** each coin is an edge from amount `a` to `a + c`. The fewest coins is the shortest path from 0 to `amount`.

```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        if (amount == 0) {
            return 0;
        }
        vector<bool> seen(amount + 1, false);
        queue<int> q;
        q.push(0);
        seen[0] = true;
        int steps = 0;

        while (!q.empty()) {
            steps++;                              // one more coin
            int levelSize = q.size();
            for (int i = 0; i < levelSize; i++) {
                int a = q.front();
                q.pop();
                for (int c : coins) {
                    long long next = (long long)a + c;
                    if (next == amount) {
                        return steps;
                    }
                    if (next < amount && !seen[next]) {
                        seen[next] = true;
                        q.push(next);
                    }
                }
            }
        }
        return -1;
    }
};
```

**How it works:** BFS level k contains every amount payable with exactly k coins.

**Think of it like this:** "with 1 coin I can make these amounts, with 2 coins these…".

**Cost:** Time **O(amount · coins)**. Space **O(amount)**.

### Optimal: Bottom-up DP over amounts
**The idea:** `dp[a]` = fewest coins for amount `a`. Build from 0 upwards: the last coin used was some `c`, so `dp[a] = dp[a − c] + 1`.

```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        const int INF = amount + 1;          // more coins than could ever be needed
        vector<int> dp(amount + 1, INF);
        dp[0] = 0;                           // zero coins make amount 0

        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (c <= a) {
                    // Use coin c last: the rest (a - c) is already solved.
                    dp[a] = min(dp[a], dp[a - c] + 1);
                }
            }
        }

        if (dp[amount] == INF) {
            return -1;                       // amount can't be made
        }
        return dp[amount];
    }
};
```

**How it works**
1. `dp[0] = 0`; everything else starts at "infinity" (`amount + 1`, overflow-safe).
2. For each amount, try every coin as the last coin.
3. Answer `dp[amount]`, or −1 if still infinity.

**Think of it like this:** a price list for every amount from 1 cent upward, each built from cheaper amounts.

**Why it's optimal:** O(amount · coins) with a simple array, no recursion.

**Cost:** Time **O(amount · coins)**. Space **O(amount)**.

## maximum-product-subarray

### Approach 1: Brute force
**The idea:** try every start; multiply as you extend the end.

```cpp
class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int n = nums.size();
        int best = nums[0];
        for (int i = 0; i < n; i++) {
            int product = 1;
            for (int j = i; j < n; j++) {
                product *= nums[j];
                best = max(best, product);
            }
        }
        return best;
    }
};
```

**How it works:** checks every subarray.

**Think of it like this:** trying every stretch of a multiplier track.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Prefix and suffix products
**The idea:** without zeros, the best product is always a prefix or a suffix (an even number of negatives, or drop everything before/after the first/last negative). Zeros just reset the running product.

```cpp
class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int n = nums.size();
        int best = nums[0];
        int prefix = 0;
        int suffix = 0;
        for (int i = 0; i < n; i++) {
            // A zero product means "start again" (the multiply by 1 restarts).
            prefix = (prefix == 0 ? 1 : prefix) * nums[i];
            suffix = (suffix == 0 ? 1 : suffix) * nums[n - 1 - i];
            best = max(best, max(prefix, suffix));
        }
        return best;
    }
};
```

**How it works:** scanning from both sides covers "drop the part before the first negative" and "drop the part after the last negative".

**Think of it like this:** reading a sentence forwards and backwards and keeping the best running score.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Track both the max and min product ending here
**The idea:** a negative number turns the smallest (most negative) product into the largest. So track both.

```cpp
class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int best = nums[0];
        int mx = 1;   // largest product of a subarray ending at the current element
        int mn = 1;   // smallest (most negative) product ending here

        for (int x : nums) {
            if (x < 0) {
                swap(mx, mn);         // multiplying by a negative flips big and small
            }
            mx = max(x, mx * x);      // extend, or start fresh at x
            mn = min(x, mn * x);
            best = max(best, mx);
        }
        return best;
    }
};
```

**How it works**
1. Keep the max and min product of subarrays ending at the current index.
2. On a negative `x`, swap them first.
3. `max(x, mx·x)` — starting fresh at `x` handles zeros.

**Think of it like this:** Kadane's algorithm, but with two backpacks: your best score and your worst — because one negative multiplier can turn the worst into the best.

**Why it's optimal:** one pass, constant memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## word-break

### Approach 1: Plain recursion
**The idea:** try every dictionary word as the first word; recurse on the rest.

```cpp
class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        return canBreak(s, 0, wordDict);
    }

private:
    bool canBreak(const string& s, int start, vector<string>& dict) {
        if (start == (int)s.size()) {
            return true;
        }
        for (const string& w : dict) {
            if (s.compare(start, w.size(), w) == 0 && canBreak(s, start + w.size(), dict)) {
                return true;
            }
        }
        return false;
    }
};
```

**How it works:** correct but re-solves the same suffix many times.

**Think of it like this:** trying every way to split a sentence without spaces, starting over each time.

**Cost:** Time exponential (e.g. `"aaaa…ab"` with words `a, aa, aaa`). Space **O(n)**.

### Approach 2: BFS over start positions
**The idea:** positions in the string are nodes; a word starting at position i is an edge to `i + |word|`. Can you reach position n?

```cpp
class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        int n = s.size();
        vector<bool> visited(n + 1, false);
        queue<int> q;
        q.push(0);
        visited[0] = true;

        while (!q.empty()) {
            int start = q.front();
            q.pop();
            if (start == n) {
                return true;
            }
            for (const string& w : wordDict) {
                int end = start + w.size();
                if (end <= n && !visited[end] && s.compare(start, w.size(), w) == 0) {
                    visited[end] = true;
                    q.push(end);
                }
            }
        }
        return false;
    }
};
```

**How it works:** each start position is explored once.

**Think of it like this:** hopping along the string, word by word, marking positions you can land on.

**Cost:** Time **O(n · words · L)**. Space **O(n)**.

### Optimal: DP over prefixes
**The idea:** `dp[i]` = "the first i characters can be split into words". `dp[i]` is true if some word ends at i and the part before it is splittable.

```cpp
class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        int n = s.size();
        vector<bool> dp(n + 1, false);
        dp[0] = true;                                // the empty prefix is always fine

        for (int i = 1; i <= n; i++) {
            for (const string& w : wordDict) {
                int L = w.size();
                // Does word w end exactly at position i, after a splittable prefix?
                if (L <= i && dp[i - L] && s.compare(i - L, L, w) == 0) {
                    dp[i] = true;
                    break;                           // one way is enough
                }
            }
        }
        return dp[n];
    }
};
```

**How it works**
1. `dp[0] = true`.
2. For each end position i, try every word `w` that would end at i.
3. Answer `dp[n]`.

**Think of it like this:** marking each position "you can stop here" if a word lands exactly on it from an earlier marked position.

**Why it's optimal:** each (position, word) pair is checked once.

**Cost:** Time **O(n · words · L)**. Space **O(n)**.

## longest-increasing-subsequence

### Approach 1: Plain recursion (take / skip)
**The idea:** for each element, either take it (if bigger than the last taken) or skip it.

```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        return best(nums, 0, -1);
    }

private:
    // Longest increasing subsequence of nums[i..] whose elements are > nums[prev].
    int best(vector<int>& nums, int i, int prev) {
        if (i == (int)nums.size()) {
            return 0;
        }
        int skip = best(nums, i + 1, prev);
        int take = 0;
        if (prev == -1 || nums[i] > nums[prev]) {
            take = 1 + best(nums, i + 1, i);
        }
        return max(skip, take);
    }
};
```

**How it works:** explores every subsequence.

**Think of it like this:** deciding for every card whether to add it to your rising hand.

**Cost:** Time **O(2ⁿ)**. Space **O(n)**.

### Approach 2: O(n²) DP
**The idea:** `len[i]` = length of the longest increasing subsequence ending at i = 1 + the best `len[j]` with `j < i` and `nums[j] < nums[i]`.

```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        int n = nums.size();
        vector<int> len(n, 1);      // every element alone is length 1
        int best = 1;
        for (int i = 1; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    len[i] = max(len[i], len[j] + 1);   // extend j's sequence with i
                }
            }
            best = max(best, len[i]);
        }
        return best;
    }
};
```

**How it works:** every element looks back at all smaller earlier elements.

**Think of it like this:** each person in a queue asks everyone shorter in front "how long is your rising line?" and joins the longest.

**Cost:** Time **O(n²)**. Space **O(n)**.

### Optimal: Patience sorting with binary search
**The idea:** keep `tails[k]` = the smallest possible last value of an increasing subsequence of length k + 1. Each new number either extends the longest one or makes some tail smaller.

```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;   // sorted; tails[k] = smallest tail of a length-(k+1) subsequence

        for (int x : nums) {
            // First tail that is >= x.
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end()) {
                tails.push_back(x);   // x is bigger than every tail: the longest one grows
            } else {
                *it = x;              // same length, smaller tail = easier to extend later
            }
        }
        return tails.size();
    }
};
```

**How it works**
1. `tails` stays sorted.
2. `lower_bound` finds where `x` belongs.
3. Append if it's the largest, otherwise replace.
4. The answer is `tails.size()` (`tails` itself isn't necessarily a real subsequence).

**Think of it like this:** the card game patience — place each card on the leftmost pile whose top is ≥ it, or start a new pile. The number of piles is the answer.

**Why it's optimal:** O(n log n), the best possible for comparison-based methods.

**Cost:** Time **O(n log n)**. Space **O(n)**.

## partition-equal-subset-sum

### Approach 1: Memoised recursion (take / skip)
**The idea:** can some subset of `nums[i..]` add up to `remaining`? Take `nums[i]` or skip it.

```cpp
class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        if (total % 2 != 0) {
            return false;                       // odd total can't split evenly
        }
        int target = total / 2;
        memo.assign(nums.size(), vector<int>(target + 1, -1));
        return can(nums, 0, target);
    }

private:
    vector<vector<int>> memo;

    bool can(vector<int>& nums, int i, int remaining) {
        if (remaining == 0) {
            return true;
        }
        if (i == (int)nums.size() || remaining < 0) {
            return false;
        }
        if (memo[i][remaining] != -1) {
            return memo[i][remaining] == 1;
        }
        bool result = can(nums, i + 1, remaining - nums[i]) || can(nums, i + 1, remaining);
        memo[i][remaining] = result ? 1 : 0;
        return result;
    }
};
```

**How it works:** only n × target different states exist.

**Think of it like this:** packing a bag that must weigh exactly half of everything.

**Cost:** Time **O(n · target)**. Space **O(n · target)**.

### Approach 2: Set of reachable sums
**The idea:** start with {0}. For each number, every reachable sum s also makes `s + x` reachable.

```cpp
class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        if (total % 2 != 0) {
            return false;
        }
        int target = total / 2;

        unordered_set<int> reachable = {0};
        for (int x : nums) {
            vector<int> newSums;
            for (int s : reachable) {
                if (s + x == target) {
                    return true;
                }
                if (s + x < target) {
                    newSums.push_back(s + x);
                }
            }
            for (int s : newSums) {
                reachable.insert(s);
            }
        }
        return reachable.count(target) > 0;
    }
};
```

**How it works:** new sums are collected first so `x` isn't used twice in one round.

**Think of it like this:** a list of all weights you can make so far; each new item adds its weight to every entry.

**Cost:** Time **O(n · target)**. Space **O(target)**.

### Approach 3: Bitset of reachable sums
**The idea:** bit `s` = "sum s is reachable". Adding `x` to every sum at once is one shift-and-OR.

```cpp
class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        if (total % 2 != 0) {
            return false;
        }
        bitset<10001> reachable;     // max total is 200 * 100 = 20000, half is 10000
        reachable[0] = 1;
        for (int x : nums) {
            reachable |= (reachable << x);   // every old sum s also gives s + x
        }
        return reachable[total / 2];
    }
};
```

**How it works:** the shift moves every reachable sum up by x in one machine-level operation on 64 bits at a time.

**Think of it like this:** a row of lights; adding an item copies the whole pattern x places to the right.

**Cost:** Time **O(n · target / 64)**. Space **O(target)** bits.

### Optimal: 1-D 0/1 knapsack (iterate sums downwards)
**The idea:** `dp[s]` = "some subset of the numbers seen so far sums to s". For each number, update sums from high to low so it's used at most once.

```cpp
class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        if (total % 2 != 0) {
            return false;                    // can't split an odd total in half
        }
        int target = total / 2;

        vector<bool> dp(target + 1, false);
        dp[0] = true;                        // the empty subset sums to 0
        for (int x : nums) {
            // Go DOWN so dp[s - x] still means "without x" (each number used once).
            for (int s = target; s >= x; s--) {
                if (dp[s - x]) {
                    dp[s] = true;
                }
            }
        }
        return dp[target];
    }
};
```

**How it works**
1. Odd total → impossible.
2. `dp[0] = true`.
3. For each `x`, for `s` from `target` down to `x`: `dp[s] |= dp[s − x]`.
4. Going downward guarantees `dp[s − x]` is from before `x` was added (going up would reuse `x`).

**Think of it like this:** filling in "can I make this weight?" from the heaviest weight down, so a new item is only counted once.

**Why it's optimal:** O(n · target) time with a single 1-D array (the bitset version is the same idea, 64× faster).

**Cost:** Time **O(n · target)**. Space **O(target)**.
