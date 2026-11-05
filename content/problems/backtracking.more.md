## subsets

### Approach 1: Bitmask enumeration
```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        int n = nums.size();
        vector<vector<int>> res;
        for (int mask = 0; mask < (1 << n); ++mask) {      // each mask = one subset
            vector<int> cur;
            for (int i = 0; i < n; ++i)
                if (mask >> i & 1) cur.push_back(nums[i]);
            res.push_back(std::move(cur));
        }
        return res;
    }
};
```

**Time:** O(n · 2ⁿ) · **Space:** O(n) per subset. Bit i of `mask` = "include nums[i]". Great for embedded/bit-oriented interviews.

### Approach 2: Iterative cascading
```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> res{{}};
        for (int x : nums) {
            int sz = res.size();
            for (int i = 0; i < sz; ++i) {          // copy every existing subset and add x
                res.push_back(res[i]);
                res.back().push_back(x);
            }
        }
        return res;
    }
};
```

**Time:** O(n · 2ⁿ) · **Space:** output. Each new element doubles the collection.

### Approach 3: Include / exclude recursion
```cpp
class Solution {
    vector<vector<int>> res;
    vector<int> cur;
    void go(const vector<int>& a, int i) {
        if (i == (int)a.size()) { res.push_back(cur); return; }
        go(a, i + 1);                   // exclude a[i]
        cur.push_back(a[i]);
        go(a, i + 1);                   // include a[i]
        cur.pop_back();
    }
public:
    vector<vector<int>> subsets(vector<int>& nums) { go(nums, 0); return res; }
};
```

**Time:** O(n · 2ⁿ) · **Space:** O(n) recursion. The binary decision tree made explicit.

### Walkthrough
**Goal:** every combination of include/exclude.

1. `bt(start)`: the current `cur` is itself a valid subset → record it first.
2. Then try extending with each element at index `i ≥ start` (only later elements, so each subset is generated once in increasing-index order).
3. Choose `nums[i]`, recurse with `start = i + 1`, then un-choose.

**Recursion tree for `[1, 2, 3]`** (each node records `cur`):

```text
[]
├── [1]
│   ├── [1,2]
│   │   └── [1,2,3]
│   └── [1,3]
├── [2]
│   └── [2,3]
└── [3]
```

8 subsets = 2³. Recording at **every** node (not just leaves) is what distinguishes subsets from combinations of fixed size.

## combination-sum

### Approach 1: Include / skip recursion (unbounded)
```cpp
class Solution {
    vector<vector<int>> res;
    vector<int> cur;
    void go(const vector<int>& c, int i, int rem) {
        if (rem == 0) { res.push_back(cur); return; }
        if (i == (int)c.size() || rem < 0) return;
        cur.push_back(c[i]);
        go(c, i, rem - c[i]);            // take c[i] again (stay on i)
        cur.pop_back();
        go(c, i + 1, rem);               // move on to the next candidate
    }
public:
    vector<vector<int>> combinationSum(vector<int>& c, int target) { go(c, 0, target); return res; }
};
```

**Time:** exponential · **Space:** O(target / min). A different tree shape, same results.

### Approach 2: DP building combinations bottom-up
```cpp
class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& c, int target) {
        vector<vector<vector<int>>> dp(target + 1);
        dp[0] = {{}};
        for (int coin : c)                                // outer loop over candidates: no permutations
            for (int s = coin; s <= target; ++s)
                for (auto comb : dp[s - coin]) {          // copy, then extend
                    comb.push_back(coin);
                    dp[s].push_back(std::move(comb));
                }
        return dp[target];
    }
};
```

**Time/Space:** proportional to the number of combinations stored for all sums ≤ target. The "Coin Change II" structure, but materialising combinations instead of counting them.

### Walkthrough
**Goal:** all multisets of candidates summing to target, each multiset once.

1. Sort candidates so we can stop early once a candidate exceeds the remainder.
2. `bt(start, rem)`: try each candidate `c[i]` with `i ≥ start`.
3. Recurse with **`i` (not `i + 1`)** — the same number may be used again.
4. Passing `start` forbids going back to smaller indices, so `[2,3]` and `[3,2]` can't both appear.
5. `rem == 0` → record.

**Dry run** `[2, 3, 6, 7]`, target 7:

```text
rem 7: try 2 → rem 5: try 2 → rem 3: try 2 → rem 1: 2 > 1 stop
                                    try 3 → rem 0 ✔ [2,2,3]
                       try 3 → rem 2: 3 > 2 stop
       try 3 → rem 4: try 3 → rem 1: stop
       try 6 → rem 1: stop
       try 7 → rem 0 ✔ [7]
```

## permutations

### Approach 1: `used[]` array
```cpp
class Solution {
    vector<vector<int>> res;
    vector<int> cur;
    vector<bool> used;
    void bt(const vector<int>& a) {
        if (cur.size() == a.size()) { res.push_back(cur); return; }
        for (size_t i = 0; i < a.size(); ++i) {
            if (used[i]) continue;
            used[i] = true; cur.push_back(a[i]);
            bt(a);
            cur.pop_back(); used[i] = false;
        }
    }
public:
    vector<vector<int>> permute(vector<int>& nums) { used.assign(nums.size(), false); bt(nums); return res; }
};
```

**Time:** O(n · n!) · **Space:** O(n). The most common interview version; extends easily to Permutations II (sort + skip used duplicates).

### Approach 2: `std::next_permutation`
```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        ranges::sort(nums);
        vector<vector<int>> res;
        do res.push_back(nums); while (next_permutation(nums.begin(), nums.end()));
        return res;
    }
};
```

**Time:** O(n · n!) · **Space:** output. Know how `next_permutation` works: find the rightmost ascent `a[i] < a[i+1]`, swap `a[i]` with the rightmost element greater than it, reverse the suffix.

### Walkthrough
**Goal:** every ordering.

1. `bt(i)`: positions `0..i−1` are fixed; choose what goes at position `i`.
2. For each `j ≥ i`, swap `nums[j]` into position `i`, recurse on `i + 1`, swap back.
3. At `i == n`, `nums` is a complete permutation → record.

**Dry run** `[1, 2, 3]`:

| fix pos 0 | fix pos 1 | result |
|---|---|---|
| 1 (j=0) | 2 / 3 | [1,2,3], [1,3,2] |
| 2 (swap 0,1) | 1 / 3 | [2,1,3], [2,3,1] |
| 3 (swap 0,2) | 2 / 1 | [3,2,1], [3,1,2] |

3! = 6 permutations. The swap-back is essential: it restores the array before the next choice.

## subsets-ii

### Approach 1: Generate all, dedupe with a set
```cpp
class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        ranges::sort(nums);                           // so equal subsets look identical
        set<vector<int>> s;
        int n = nums.size();
        for (int mask = 0; mask < (1 << n); ++mask) {
            vector<int> cur;
            for (int i = 0; i < n; ++i) if (mask >> i & 1) cur.push_back(nums[i]);
            s.insert(cur);
        }
        return {s.begin(), s.end()};
    }
};
```

**Time:** O(n · 2ⁿ · log) · **Space:** O(output). Correct but generates duplicates first.

### Approach 2: Iterative, extend only the newest subsets on duplicates
```cpp
class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        ranges::sort(nums);
        vector<vector<int>> res{{}};
        size_t prevStart = 0;
        for (size_t i = 0; i < nums.size(); ++i) {
            size_t start = (i > 0 && nums[i] == nums[i - 1]) ? prevStart : 0;  // dup: only last batch
            size_t end = res.size();
            for (size_t j = start; j < end; ++j) {
                res.push_back(res[j]);
                res.back().push_back(nums[i]);
            }
            prevStart = end;
        }
        return res;
    }
};
```

**Time:** O(n · 2ⁿ) · **Space:** output. Adding a duplicate value to *older* subsets would recreate subsets made in the previous step.

### Walkthrough
**Goal:** subsets of a multiset with no repeats.

1. **Sort** so equal values are adjacent.
2. Same backtracking as Subsets, plus: at a given recursion level, skip `nums[i]` if `i > start` and `nums[i] == nums[i − 1]`.
3. Meaning: among equal siblings, only the **first** may start a branch. Deeper levels may still take the second copy (because there `i == start`).

**Dry run** `[1, 2, 2]`:

```text
[]
├── [1]
│   ├── [1,2]
│   │   └── [1,2,2]
│   └── (skip second 2 at this level)
├── [2]
│   └── [2,2]
└── (skip second 2 at root level)
```

Result: `[], [1], [1,2], [1,2,2], [2], [2,2]` — 6 unique subsets.

## combination-sum-ii

### Approach 1: Group by value (counts)
```cpp
class Solution {
    vector<pair<int, int>> freq;                  // (value, count)
    vector<vector<int>> res;
    vector<int> cur;
    void go(int i, int rem) {
        if (rem == 0) { res.push_back(cur); return; }
        if (i == (int)freq.size() || freq[i].first > rem) return;
        auto [v, c] = freq[i];
        int take = 0;
        for (; take <= c && take * v <= rem; ++take) {       // use v 0..c times
            go(i + 1, rem - take * v);
            cur.push_back(v);
        }
        cur.resize(cur.size() - take);                       // undo all pushes of v
    }
public:
    vector<vector<int>> combinationSum2(vector<int>& c, int target) {
        ranges::sort(c);
        for (int x : c) {
            if (freq.empty() || freq.back().first != x) freq.push_back({x, 0});
            ++freq.back().second;
        }
        go(0, target);
        return res;
    }
};
```

**Time:** exponential in distinct values · **Space:** O(n). Duplicates can't arise because each distinct value is decided once (how many copies).

### Approach 2: Include / exclude with duplicate skipping
```cpp
class Solution {
    vector<vector<int>> res;
    vector<int> cur;
    void go(const vector<int>& c, int i, int rem) {
        if (rem == 0) { res.push_back(cur); return; }
        if (i == (int)c.size() || c[i] > rem) return;
        cur.push_back(c[i]);
        go(c, i + 1, rem - c[i]);                  // include c[i]
        cur.pop_back();
        int j = i;
        while (j < (int)c.size() && c[j] == c[i]) ++j;   // exclude: skip ALL copies of c[i]
        go(c, j, rem);
    }
public:
    vector<vector<int>> combinationSum2(vector<int>& c, int target) {
        ranges::sort(c); go(c, 0, target); return res;
    }
};
```

**Time:** exponential · **Space:** O(n).

### Walkthrough
**Goal:** each candidate used at most once, no duplicate combinations.

1. Sort.
2. `bt(start, rem)`: loop `i` from `start`.
   1. Break when `c[i] > rem` (sorted → all later are bigger).
   2. Skip if `i > start && c[i] == c[i−1]` (same value already tried at this level).
   3. Choose `c[i]`, recurse with `i + 1` (use once), un-choose.

**Dry run** `[10,1,2,7,6,1,5]` → sorted `[1,1,2,5,6,7,10]`, target 8:

| path | result |
|---|---|
| 1 → 1 → 6 | ✔ [1,1,6] |
| 1 → 2 → 5 | ✔ [1,2,5] |
| 1 → 7 | ✔ [1,7] |
| second 1 at root | skipped (duplicate level) |
| 2 → 6 | ✔ [2,6] |

## word-search

### Approach 1: DFS with a separate visited matrix
```cpp
class Solution {
    vector<vector<bool>> vis;
    bool dfs(const vector<vector<char>>& b, const string& w, int i, int r, int c) {
        if (i == (int)w.size()) return true;
        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size()) return false;
        if (vis[r][c] || b[r][c] != w[i]) return false;
        vis[r][c] = true;
        static constexpr int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        for (int k = 0; k < 4; ++k)
            if (dfs(b, w, i + 1, r + dr[k], c + dc[k])) return true;
        vis[r][c] = false;
        return false;
    }
public:
    bool exist(vector<vector<char>>& board, string word) {
        vis.assign(board.size(), vector<bool>(board[0].size(), false));
        for (int r = 0; r < (int)board.size(); ++r)
            for (int c = 0; c < (int)board[0].size(); ++c)
                if (dfs(board, word, 0, r, c)) return true;
        return false;
    }
};
```

**Time:** O(R·C·3^L) · **Space:** O(R·C). Doesn't modify the input (sometimes required).

### Approach 2: Add frequency pruning + search from the rarer end
```cpp
class Solution {
    bool dfs(vector<vector<char>>& b, const string& w, int i, int r, int c) {
        if (i == (int)w.size()) return true;
        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || b[r][c] != w[i]) return false;
        char t = b[r][c]; b[r][c] = '#';
        bool f = dfs(b, w, i + 1, r + 1, c) || dfs(b, w, i + 1, r - 1, c) ||
                 dfs(b, w, i + 1, r, c + 1) || dfs(b, w, i + 1, r, c - 1);
        b[r][c] = t;
        return f;
    }
public:
    bool exist(vector<vector<char>>& board, string word) {
        array<int, 128> have{}, need{};
        for (auto& row : board) for (char ch : row) ++have[ch];
        for (char ch : word) if (++need[ch] > have[ch]) return false;   // impossible: not enough letters
        if (have[word.front()] > have[word.back()]) ranges::reverse(word);   // start where fewer starts exist
        for (int r = 0; r < (int)board.size(); ++r)
            for (int c = 0; c < (int)board[0].size(); ++c)
                if (dfs(board, word, 0, r, c)) return true;
        return false;
    }
};
```

**Time:** same worst case, much faster on adversarial tests · **Space:** O(L). These two prunings turn TLE into fast accepts on LeetCode.

### Walkthrough
**Goal:** a path of adjacent cells spelling `word`, no cell reused.

1. Try every cell as the starting point.
2. `dfs(r, c, i)`: does the path starting here match `word[i..]`?
   1. `i == word.size()` → whole word matched.
   2. Out of bounds or `board[r][c] != word[i]` → fail.
   3. Mark the cell (`'#'`), recurse into 4 neighbours with `i + 1`, restore the cell.
3. Short-circuit `||` stops as soon as one direction succeeds.

**Dry run** board `ABCE / SFCS / ADEE`, word `"ABCCED"`:

| i | cell | letter | next tried |
|---|---|---|---|
| 0 | (0,0) | A | right |
| 1 | (0,1) | B | right |
| 2 | (0,2) | C | down |
| 3 | (1,2) | C | down |
| 4 | (2,2) | E | left |
| 5 | (2,1) | D | i = 6 → **true** |

## palindrome-partitioning

### Approach 1: Backtracking with on-the-fly palindrome checks
```cpp
class Solution {
    static bool pal(const string& s, int l, int r) {
        while (l < r) if (s[l++] != s[r--]) return false;
        return true;
    }
    vector<vector<string>> res;
    vector<string> cur;
    void bt(const string& s, int start) {
        if (start == (int)s.size()) { res.push_back(cur); return; }
        for (int end = start; end < (int)s.size(); ++end)
            if (pal(s, start, end)) {
                cur.push_back(s.substr(start, end - start + 1));
                bt(s, end + 1);
                cur.pop_back();
            }
    }
public:
    vector<vector<string>> partition(string s) { bt(s, 0); return res; }
};
```

**Time:** O(n · 2ⁿ) · **Space:** O(n). Simpler; repeats some palindrome checks.

### Approach 2: DP over suffixes (memoised partitions)
```cpp
class Solution {
public:
    vector<vector<string>> partition(string s) {
        int n = s.size();
        vector<vector<vector<string>>> memo(n + 1);
        memo[n] = {{}};                                   // empty suffix: one empty partition
        for (int i = n - 1; i >= 0; --i)
            for (int j = i; j < n; ++j) {
                int l = i, r = j; bool ok = true;
                while (l < r) if (s[l++] != s[r--]) { ok = false; break; }
                if (!ok) continue;
                string head = s.substr(i, j - i + 1);
                for (auto rest : memo[j + 1]) {           // copy and prepend head
                    rest.insert(rest.begin(), head);
                    memo[i].push_back(std::move(rest));
                }
            }
        return memo[0];
    }
};
```

**Time/Space:** proportional to output size. Bottom-up formulation of the same recursion.

### Walkthrough
**Goal:** split `s` into pieces that are all palindromes; list every way.

1. Precompute `pal[i][j]` (is `s[i..j]` a palindrome?) with DP: `s[i] == s[j]` and the inside `[i+1, j−1]` is a palindrome (or length ≤ 2). Fill `i` from right to left so `pal[i+1][j−1]` is ready.
2. `bt(start)`: choose the end of the next piece; only recurse if `pal[start][end]`.
3. `start == n` → a full partition.

**Dry run** `"aab"`:

```text
start 0: "a"  → start 1: "a" → start 2: "b" ✔ [a, a, b]
                       "ab" ✗
         "aa" → start 2: "b" ✔ [aa, b]
         "aab" ✗
```

## letter-combinations-of-a-phone-number

### Approach 1: Iterative BFS-style expansion
```cpp
class Solution {
public:
    vector<string> letterCombinations(string digits) {
        if (digits.empty()) return {};
        static const string keys[10] = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
        vector<string> res{""};
        for (char d : digits) {
            vector<string> next;
            for (const string& prefix : res)
                for (char c : keys[d - '0']) next.push_back(prefix + c);
            res = std::move(next);
        }
        return res;
    }
};
```

**Time:** O(4ⁿ · n) · **Space:** O(4ⁿ · n). No recursion.

### Approach 2: Mixed-radix counter
```cpp
class Solution {
public:
    vector<string> letterCombinations(string digits) {
        if (digits.empty()) return {};
        static const string keys[10] = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
        int n = digits.size();
        vector<int> idx(n, 0);                      // like an odometer
        vector<string> res;
        while (true) {
            string s;
            for (int i = 0; i < n; ++i) s += keys[digits[i] - '0'][idx[i]];
            res.push_back(s);
            int i = n - 1;                          // increment the odometer
            while (i >= 0 && ++idx[i] == (int)keys[digits[i] - '0'].size()) idx[i--] = 0;
            if (i < 0) break;
        }
        return res;
    }
};
```

**Time:** O(4ⁿ · n) · **Space:** O(n) besides output. Treats combinations as numbers in a mixed base.

### Walkthrough
**Goal:** cartesian product of each digit's letters.

1. One recursion level per digit.
2. At level `i`, loop over the letters of `digits[i]`, append, recurse to `i + 1`, pop.
3. `i == digits.size()` → record.

**Dry run** `"23"`:

| level 0 (2) | level 1 (3) | outputs |
|---|---|---|
| a | d, e, f | ad, ae, af |
| b | d, e, f | bd, be, bf |
| c | d, e, f | cd, ce, cf |

9 = 3 × 3 combinations.

## n-queens

### Approach 1: Check conflicts by scanning the board
```cpp
class Solution {
    vector<vector<string>> res;
    vector<string> b;
    int n;
    bool safe(int r, int c) {
        for (int i = 0; i < r; ++i) {
            if (b[i][c] == 'Q') return false;                          // column
            int d = r - i;
            if (c - d >= 0 && b[i][c - d] == 'Q') return false;        // "\" diagonal
            if (c + d < n && b[i][c + d] == 'Q') return false;         // "/" diagonal
        }
        return true;
    }
    void bt(int r) {
        if (r == n) { res.push_back(b); return; }
        for (int c = 0; c < n; ++c)
            if (safe(r, c)) { b[r][c] = 'Q'; bt(r + 1); b[r][c] = '.'; }
    }
public:
    vector<vector<string>> solveNQueens(int N) { n = N; b.assign(n, string(n, '.')); bt(0); return res; }
};
```

**Time:** O(n! · n) · **Space:** O(n²). O(n) safety check instead of O(1).

### Approach 2: Bitmasks (fastest)
```cpp
class Solution {
    vector<vector<string>> res;
    vector<int> pos;                       // pos[r] = column of queen in row r
    int n, full;
    void bt(int r, int cols, int d1, int d2) {
        if (r == n) {
            vector<string> b(n, string(n, '.'));
            for (int i = 0; i < n; ++i) b[i][pos[i]] = 'Q';
            res.push_back(std::move(b));
            return;
        }
        int avail = full & ~(cols | d1 | d2);           // free columns in this row
        while (avail) {
            int bit = avail & -avail;                   // lowest free column
            avail ^= bit;
            pos[r] = __builtin_ctz(bit);
            bt(r + 1, cols | bit, (d1 | bit) << 1, (d2 | bit) >> 1);   // diagonals shift per row
        }
    }
public:
    vector<vector<string>> solveNQueens(int N) {
        n = N; full = (1 << n) - 1; pos.assign(n, 0);
        bt(0, 0, 0, 0);
        return res;
    }
};
```

**Time:** O(n!) with tiny constants · **Space:** O(n). The diagonal masks shift one column per row — beautiful bit manipulation.

### Walkthrough
**Goal:** one queen per row; no two share a column or diagonal.

1. Place queens row by row (`bt(r)`), so rows never conflict.
2. For row `r`, try each column `c` that is free in three sets:
   1. `col[c]` — column used.
   2. `diag[r + c]` — "/" anti-diagonal: all cells on it share `r + c`.
   3. `anti[r − c + n]` — "\" diagonal: share `r − c` (offset by n to keep the index ≥ 0).
3. Place, recurse to `r + 1`, then remove (backtrack).
4. `r == n` → all queens placed → record the board.

**Dry run n = 4** (first solution found):

| row | column tried | outcome |
|---|---|---|
| 0 | 0 | place |
| 1 | 2 | place |
| 2 | — | every column attacked → backtrack |
| 1 | 3 | place |
| 2 | 1 | place |
| 3 | — | dead end → backtrack… |
| 0 | 1 | place |
| 1 | 3 | place |
| 2 | 0 | place |
| 3 | 2 | place → **solution `.Q.. / ...Q / Q... / ..Q.`** |

n = 4 has 2 solutions; n = 8 has 92.
