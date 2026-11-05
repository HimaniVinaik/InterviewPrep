# Backtracking

**Recognise it when:** you must **enumerate** all subsets / permutations / combinations / placements, or search a decision tree with constraints (N-Queens, Sudoku, word search).

**The template — choose, explore, un-choose**

```cpp
void backtrack(State& s) {
    if (isComplete(s)) { record(s); return; }
    for (auto choice : candidates(s)) {
        if (!valid(s, choice)) continue;   // prune early!
        apply(s, choice);                  // choose
        backtrack(s);                      // explore
        undo(s, choice);                   // un-choose
    }
}
```

**Duplicates:** sort first, then `if (i > start && a[i] == a[i-1]) continue;` skips equal siblings at the same tree level.

**Subsets vs permutations:** subsets/combinations pass a `start` index (order doesn't matter); permutations use a `used[]` array (order matters).

## Subsets
- difficulty: Medium
- leetcode: 78
- slug: subsets

Return all subsets (the power set) of distinct integers.

### Hint
At each index, include or exclude. Or: every prefix of the recursion is a subset.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> res;
        vector<int> cur;
        auto bt = [&](auto&& self, int start) -> void {
            res.push_back(cur);                  // every node is a subset
            for (int i = start; i < (int)nums.size(); ++i) {
                cur.push_back(nums[i]);
                self(self, i + 1);
                cur.pop_back();
            }
        };
        bt(bt, 0);
        return res;
    }
};
```

### Explanation
Bitmask alternative (great for embedded/bit interviews): for `mask` in `[0, 2ⁿ)`, include `nums[i]` when bit `i` is set.

**Time:** O(n·2ⁿ) · **Space:** O(n) recursion

## Combination Sum
- difficulty: Medium
- leetcode: 39
- slug: combination-sum

Distinct candidates; each may be used unlimited times. Return all combinations summing to `target`.

### Hint
Recurse with the same index `i` (reuse allowed). Sort to prune once the candidate exceeds the remainder.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& c, int target) {
        ranges::sort(c);
        vector<vector<int>> res;
        vector<int> cur;
        auto bt = [&](auto&& self, int start, int rem) -> void {
            if (rem == 0) { res.push_back(cur); return; }
            for (int i = start; i < (int)c.size() && c[i] <= rem; ++i) {
                cur.push_back(c[i]);
                self(self, i, rem - c[i]);       // i, not i+1: reuse allowed
                cur.pop_back();
            }
        };
        bt(bt, 0, target);
        return res;
    }
};
```

### Explanation
Passing `start` prevents permutations of the same combination (`[2,3]` vs `[3,2]`). The sorted early-`break` is a big prune.

**Time:** O(n^(T/min)) worst · **Space:** O(T/min)

## Permutations
- difficulty: Medium
- leetcode: 46
- slug: permutations

Return all permutations of distinct integers.

### Hint
Track which elements are used; or swap elements into position.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        vector<vector<int>> res;
        auto bt = [&](auto&& self, int i) -> void {
            if (i == (int)nums.size()) { res.push_back(nums); return; }
            for (int j = i; j < (int)nums.size(); ++j) {
                swap(nums[i], nums[j]);          // place nums[j] at position i
                self(self, i + 1);
                swap(nums[i], nums[j]);          // restore
            }
        };
        bt(bt, 0);
        return res;
    }
};
```

### Explanation
The swap approach uses no extra `used[]` array. Also know `std::next_permutation` — iterate `do { ... } while (next_permutation(v.begin(), v.end()));` on a sorted vector.

**Time:** O(n·n!) · **Space:** O(n)

## Subsets II
- difficulty: Medium
- leetcode: 90
- slug: subsets-ii

Return all subsets of an array that **may contain duplicates**, without duplicate subsets.

### Hint
Sort; skip equal siblings at the same depth.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        ranges::sort(nums);
        vector<vector<int>> res;
        vector<int> cur;
        auto bt = [&](auto&& self, int start) -> void {
            res.push_back(cur);
            for (int i = start; i < (int)nums.size(); ++i) {
                if (i > start && nums[i] == nums[i - 1]) continue;  // dedupe level
                cur.push_back(nums[i]);
                self(self, i + 1);
                cur.pop_back();
            }
        };
        bt(bt, 0);
        return res;
    }
};
```

### Explanation
`i > start` (not `i > 0`) is the key: we may take a duplicate *deeper* in the tree (e.g. `[1,2,2]`), but not as an alternative sibling choice at the same level.

**Time:** O(n·2ⁿ) · **Space:** O(n)

## Combination Sum II
- difficulty: Medium
- leetcode: 40
- slug: combination-sum-ii

Candidates may contain duplicates; each used **at most once**. Return unique combinations summing to `target`.

### Hint
Combination Sum + Subsets II dedupe rule + `i + 1` recursion.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> combinationSum2(vector<int>& c, int target) {
        ranges::sort(c);
        vector<vector<int>> res;
        vector<int> cur;
        auto bt = [&](auto&& self, int start, int rem) -> void {
            if (rem == 0) { res.push_back(cur); return; }
            for (int i = start; i < (int)c.size() && c[i] <= rem; ++i) {
                if (i > start && c[i] == c[i - 1]) continue;
                cur.push_back(c[i]);
                self(self, i + 1, rem - c[i]);
                cur.pop_back();
            }
        };
        bt(bt, 0, target);
        return res;
    }
};
```

### Explanation
Composition of two patterns you've already seen — that's the point of learning patterns rather than problems.

**Time:** O(2ⁿ) · **Space:** O(n)

## Word Search
- difficulty: Medium
- leetcode: 79
- slug: word-search

Does `word` exist in the grid via adjacent cells, each used at most once?

### Hint
DFS from every cell; mark visited by temporarily overwriting the cell.

### Solution
```cpp
class Solution {
public:
    bool exist(vector<vector<char>>& b, string word) {
        int R = b.size(), C = b[0].size();
        auto dfs = [&](auto&& self, int r, int c, int i) -> bool {
            if (i == (int)word.size()) return true;
            if (r < 0 || c < 0 || r >= R || c >= C || b[r][c] != word[i]) return false;
            char saved = b[r][c];
            b[r][c] = '#';
            bool found = self(self, r + 1, c, i + 1) || self(self, r - 1, c, i + 1) ||
                         self(self, r, c + 1, i + 1) || self(self, r, c - 1, i + 1);
            b[r][c] = saved;
            return found;
        };
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c)
                if (dfs(dfs, r, c, 0)) return true;
        return false;
    }
};
```

### Explanation
Short-circuit `||` stops exploring once found. Prune ideas: check letter counts of the board vs word first; search from the rarer end of the word.

**Time:** O(R·C·3^L) · **Space:** O(L)

## Palindrome Partitioning
- difficulty: Medium
- leetcode: 131
- slug: palindrome-partitioning

Partition `s` so every substring is a palindrome; return all partitions.

### Hint
At each start index, try every end index that forms a palindrome.

### Solution
```cpp
class Solution {
public:
    vector<vector<string>> partition(string s) {
        int n = s.size();
        // pal[i][j] = s[i..j] is a palindrome (DP precompute)
        vector<vector<bool>> pal(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; --i)
            for (int j = i; j < n; ++j)
                pal[i][j] = s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1]);
        vector<vector<string>> res;
        vector<string> cur;
        auto bt = [&](auto&& self, int start) -> void {
            if (start == n) { res.push_back(cur); return; }
            for (int end = start; end < n; ++end)
                if (pal[start][end]) {
                    cur.push_back(s.substr(start, end - start + 1));
                    self(self, end + 1);
                    cur.pop_back();
                }
        };
        bt(bt, 0);
        return res;
    }
};
```

### Explanation
Precomputing the palindrome table makes each check O(1). Note `vector<bool>` is a bit-packed specialisation (not a real container of `bool`) — fine here, but a known C++ wart.

**Time:** O(n·2ⁿ) · **Space:** O(n²)

## Letter Combinations of a Phone Number
- difficulty: Medium
- leetcode: 17
- slug: letter-combinations-of-a-phone-number

Given digits 2–9, return all letter combinations from a phone keypad.

### Hint
One recursion level per digit.

### Solution
```cpp
class Solution {
public:
    vector<string> letterCombinations(string digits) {
        if (digits.empty()) return {};
        static constexpr array<string_view, 10> keys = {
            "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
        vector<string> res;
        string cur;
        auto bt = [&](auto&& self, int i) -> void {
            if (i == (int)digits.size()) { res.push_back(cur); return; }
            for (char c : keys[digits[i] - '0']) {
                cur.push_back(c);
                self(self, i + 1);
                cur.pop_back();
            }
        };
        bt(bt, 0);
        return res;
    }
};
```

### Explanation
`static constexpr array<string_view>` — a compile-time lookup table with zero runtime construction. Mention it: interviewers notice modern idioms.

**Time:** O(4ⁿ·n) · **Space:** O(n)

## N-Queens
- difficulty: Hard
- leetcode: 51
- slug: n-queens

Place `n` queens on an `n×n` board so none attack each other. Return all boards.

### Hint
One queen per row. Track used columns and both diagonals (`r+c` and `r-c+n`).

### Solution
```cpp
class Solution {
public:
    vector<vector<string>> solveNQueens(int n) {
        vector<vector<string>> res;
        vector<string> board(n, string(n, '.'));
        vector<bool> col(n), diag(2 * n), anti(2 * n);
        auto bt = [&](auto&& self, int r) -> void {
            if (r == n) { res.push_back(board); return; }
            for (int c = 0; c < n; ++c) {
                if (col[c] || diag[r + c] || anti[r - c + n]) continue;
                col[c] = diag[r + c] = anti[r - c + n] = true;
                board[r][c] = 'Q';
                self(self, r + 1);
                board[r][c] = '.';
                col[c] = diag[r + c] = anti[r - c + n] = false;
            }
        };
        bt(bt, 0);
        return res;
    }
};
```

### Explanation
Cells on the same diagonal share `r + c`; on the same anti-diagonal share `r - c` (offset by `n` to stay non-negative). O(1) conflict checks. For max speed, replace the three arrays with bitmasks.

**Time:** O(n!) · **Space:** O(n²)
