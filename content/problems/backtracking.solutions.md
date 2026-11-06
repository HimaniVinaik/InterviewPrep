## subsets

### Approach 1: Bitmask enumeration
**The idea:** with n elements there are 2ⁿ subsets. Number them 0 … 2ⁿ − 1; bit `i` of the number says whether `nums[i]` is in the subset.

```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        int n = nums.size();
        vector<vector<int>> res;

        for (int mask = 0; mask < (1 << n); mask++) {
            vector<int> subset;
            for (int i = 0; i < n; i++) {
                // Is bit i switched on in mask?
                if (mask & (1 << i)) {
                    subset.push_back(nums[i]);
                }
            }
            res.push_back(subset);
        }
        return res;
    }
};
```

**How it works:** for `[1, 2, 3]`, mask `101` (5) means "take 1 and 3".

**Think of it like this:** a row of n light switches; every on/off pattern is one subset.

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n)** besides the output.

### Approach 2: Iterative — each element doubles the list
**The idea:** start with `[[]]`. For each number, copy every existing subset and add the number to the copy.

```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> res = {{}};          // start with the empty subset

        for (int x : nums) {
            int existing = res.size();           // only extend subsets that existed before x
            for (int i = 0; i < existing; i++) {
                vector<int> withX = res[i];
                withX.push_back(x);
                res.push_back(withX);
            }
        }
        return res;
    }
};
```

**How it works:** `[[]]` → `[[], [1]]` → `[[], [1], [2], [1,2]]` → … each step doubles the count.

**Think of it like this:** every new topping can be added to every pizza you could already make.

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n)** besides the output.

### Approach 3: Include / exclude recursion
**The idea:** for each element make a binary choice — take it or skip it.

```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        res.clear();
        cur.clear();
        choose(nums, 0);
        return res;
    }

private:
    vector<vector<int>> res;
    vector<int> cur;

    void choose(vector<int>& nums, int i) {
        if (i == (int)nums.size()) {
            res.push_back(cur);           // decided for every element
            return;
        }
        // Choice 1: take nums[i].
        cur.push_back(nums[i]);
        choose(nums, i + 1);
        cur.pop_back();
        // Choice 2: skip nums[i].
        choose(nums, i + 1);
    }
};
```

**How it works:** a binary decision tree of depth n has 2ⁿ leaves = 2ⁿ subsets.

**Think of it like this:** walking down a corridor of n doors, each time deciding "pack this item or not".

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n)** recursion.

### Optimal: Backtracking with a start index
**The idea:** every node of the recursion tree is a subset. From the current subset, try adding each element *after* the last one added.

```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        res.clear();
        cur.clear();
        bt(nums, 0);
        return res;
    }

private:
    vector<vector<int>> res;   // all subsets found
    vector<int> cur;           // the subset being built

    void bt(vector<int>& nums, int start) {
        // The current subset is valid as it is: record it.
        res.push_back(cur);

        // Try extending it with each later element.
        for (int i = start; i < (int)nums.size(); i++) {
            cur.push_back(nums[i]);   // choose
            bt(nums, i + 1);          // explore (only elements after i)
            cur.pop_back();           // un-choose (backtrack)
        }
    }
};
```

**How it works**
1. Record `cur` at every call (not only at the leaves).
2. Only add elements with index ≥ `start`, so each subset is built in one order only.
3. Choose → recurse → un-choose is the backtracking pattern.

**Think of it like this:** building a playlist from an album, always adding songs that come later on the album, and saving the playlist at every step.

**Why it's the standard answer:** same O(n · 2ⁿ) as all the others (the output itself is that big), and it's the template for every other backtracking problem in this section.

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n)** recursion (besides the output).

## combination-sum

### Approach 1: Include / skip recursion
**The idea:** at candidate `i`, either use it once more (stay at `i`) or move on to the next candidate.

```cpp
class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        res.clear();
        cur.clear();
        go(candidates, 0, target);
        return res;
    }

private:
    vector<vector<int>> res;
    vector<int> cur;

    void go(vector<int>& candidates, int i, int rem) {
        if (rem == 0) {
            res.push_back(cur);                 // exact sum reached
            return;
        }
        if (i == (int)candidates.size() || rem < 0) {
            return;                             // dead end
        }
        // Use candidates[i] (again) — stay at i, because reuse is allowed.
        cur.push_back(candidates[i]);
        go(candidates, i, rem - candidates[i]);
        cur.pop_back();
        // Skip candidates[i] for good.
        go(candidates, i + 1, rem);
    }
};
```

**How it works:** "stay at i" allows unlimited reuse; "move to i + 1" stops reuse and prevents duplicates.

**Think of it like this:** paying an amount with coins: keep adding the same coin, or decide you're done with that coin type.

**Cost:** Time exponential, roughly **O(2^(T/min))**. Space **O(T/min)** depth.

### Approach 2: DP — build combinations for every amount
**The idea:** like the coin change "number of ways" DP, but store the actual combinations. Looping over candidates in the outer loop keeps each combination in one order.

```cpp
class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        // ways[s] = every combination that sums to s.
        vector<vector<vector<int>>> ways(target + 1);
        ways[0] = {{}};                           // one way to make 0: take nothing

        for (int c : candidates) {
            for (int s = c; s <= target; s++) {
                // Each combination for (s - c), plus one more c.
                for (const vector<int>& combo : ways[s - c]) {
                    vector<int> extended = combo;
                    extended.push_back(c);
                    ways[s].push_back(extended);
                }
            }
        }
        return ways[target];
    }
};
```

**How it works:** processing candidate by candidate means a combination's numbers are always added in candidate order — no `[2,3]` and `[3,2]` duplicates.

**Think of it like this:** filling a table "all ways to make 1, 2, 3 … cents" one coin type at a time.

**Cost:** Time and space proportional to the number of combinations stored for all amounts — usually more memory than backtracking.

### Optimal: Backtracking with sorting and early stopping
**The idea:** try candidates from index `start` onwards; recurse with the *same* index to allow reuse. Sorting lets you stop as soon as a candidate is bigger than what's left.

```cpp
class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());   // enables early stopping
        res.clear();
        cur.clear();
        bt(candidates, 0, target);
        return res;
    }

private:
    vector<vector<int>> res;
    vector<int> cur;

    // rem = how much of the target is still missing.
    void bt(vector<int>& candidates, int start, int rem) {
        if (rem == 0) {
            res.push_back(cur);                       // found a combination
            return;
        }
        for (int i = start; i < (int)candidates.size(); i++) {
            if (candidates[i] > rem) {
                break;                                // sorted: every later one is too big too
            }
            cur.push_back(candidates[i]);
            bt(candidates, i, rem - candidates[i]);   // i, not i + 1: reuse allowed
            cur.pop_back();
        }
    }
};
```

**How it works**
1. Sort the candidates.
2. `bt(start, rem)`: try each `candidates[i]` with `i ≥ start`.
3. Recurse with `i` (reuse) — never going back to smaller indices, so `[2,3]` and `[3,2]` can't both appear.
4. `rem == 0` → record; a candidate bigger than `rem` → stop the loop.

**Think of it like this:** making change with coins sorted from small to large, never picking a coin smaller than the last one you picked.

**Why it's optimal:** generates each answer once and prunes impossible branches immediately.

**Cost:** Time exponential in the worst case (output can be exponential). Space **O(target / min candidate)** recursion.

## permutations

### Approach 1: `used[]` array
**The idea:** build the permutation one position at a time, picking any number not used yet.

```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        res.clear();
        cur.clear();
        used.assign(nums.size(), false);
        build(nums);
        return res;
    }

private:
    vector<vector<int>> res;
    vector<int> cur;
    vector<bool> used;       // used[j] = nums[j] is already in cur

    void build(vector<int>& nums) {
        if (cur.size() == nums.size()) {
            res.push_back(cur);
            return;
        }
        for (int j = 0; j < (int)nums.size(); j++) {
            if (used[j]) {
                continue;
            }
            used[j] = true;
            cur.push_back(nums[j]);
            build(nums);
            cur.pop_back();
            used[j] = false;
        }
    }
};
```

**How it works:** at each position, every unused number is a choice.

**Think of it like this:** seating guests one chair at a time, crossing names off the list as they sit.

**Cost:** Time **O(n · n!)**. Space **O(n)**.

### Approach 2: `std::next_permutation`
**The idea:** the standard library can step through all orderings in lexicographic order.

```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        vector<vector<int>> res;
        sort(nums.begin(), nums.end());            // start from the smallest ordering
        do {
            res.push_back(nums);
        } while (next_permutation(nums.begin(), nums.end()));
        return res;
    }
};
```

**How it works:** `next_permutation` rearranges into the next ordering and returns false after the last one.

**Think of it like this:** counting through all arrangements like a dictionary lists words.

**Cost:** Time **O(n · n!)**. Space **O(1)** extra. Know how to implement it yourself (LC 31).

### Optimal: Swap-based backtracking
**The idea:** positions `0 … i−1` are fixed. Choose what goes at position `i` by swapping each remaining element into it, recurse, then swap back.

```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        res.clear();
        bt(nums, 0);
        return res;
    }

private:
    vector<vector<int>> res;

    // Positions 0..i-1 are already decided.
    void bt(vector<int>& nums, int i) {
        if (i == (int)nums.size()) {
            res.push_back(nums);              // every position decided
            return;
        }
        for (int j = i; j < (int)nums.size(); j++) {
            swap(nums[i], nums[j]);           // put nums[j] at position i
            bt(nums, i + 1);                  // decide the remaining positions
            swap(nums[i], nums[j]);           // undo, so the next choice starts clean
        }
    }
};
```

**How it works**
1. The elements at positions `i..n−1` are the ones not used yet.
2. Swapping `nums[j]` into position `i` "chooses" it.
3. Swapping back restores the array for the next choice.

**Think of it like this:** rearranging books on a shelf — swap a book into the next slot, try all arrangements of the rest, then swap it back.

**Why it's optimal:** no `used` array and no extra `cur` vector; output size n! · n is unavoidable.

**Cost:** Time **O(n · n!)**. Space **O(n)** recursion.

## subsets-ii

### Approach 1: Generate everything, remove duplicates with a set
**The idea:** sort, generate all 2ⁿ subsets, and let a `set` drop the repeats.

```cpp
class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end());     // so equal subsets look identical
        int n = nums.size();
        set<vector<int>> unique;

        for (int mask = 0; mask < (1 << n); mask++) {
            vector<int> subset;
            for (int i = 0; i < n; i++) {
                if (mask & (1 << i)) {
                    subset.push_back(nums[i]);
                }
            }
            unique.insert(subset);
        }
        return vector<vector<int>>(unique.begin(), unique.end());
    }
};
```

**How it works:** sorting first makes `[2,1]` and `[1,2]` impossible — subsets are always in sorted order, so duplicates are exactly equal vectors.

**Think of it like this:** printing every combination and throwing away photocopies.

**Cost:** Time **O(n · 2ⁿ · log)**. Space **O(n · 2ⁿ)**.

### Approach 2: Iterative — on a duplicate, only extend the newest subsets
**The idea:** like the doubling method for Subsets, but when `x` equals the previous number, only extend subsets created in the previous step (the others would make duplicates).

```cpp
class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> res = {{}};
        int prevStart = 0;          // where the subsets added in the last step begin

        for (int i = 0; i < (int)nums.size(); i++) {
            int from = 0;
            if (i > 0 && nums[i] == nums[i - 1]) {
                from = prevStart;   // duplicate: extend only the newest subsets
            }
            int existing = res.size();
            for (int j = from; j < existing; j++) {
                vector<int> extended = res[j];
                extended.push_back(nums[i]);
                res.push_back(extended);
            }
            prevStart = existing;
        }
        return res;
    }
};
```

**How it works:** for `[1, 2, 2]`: the second 2 is only added to subsets that already contain the first 2.

**Think of it like this:** a second identical topping only goes on pizzas that already have the first one.

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n)** besides the output.

### Optimal: Backtracking that skips equal siblings
**The idea:** the Subsets template, plus one rule: at the same level of recursion, never start two branches with the same value.

```cpp
class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end());     // equal values become neighbours
        res.clear();
        cur.clear();
        bt(nums, 0);
        return res;
    }

private:
    vector<vector<int>> res;
    vector<int> cur;

    void bt(vector<int>& nums, int start) {
        res.push_back(cur);
        for (int i = start; i < (int)nums.size(); i++) {
            // Same value as the previous sibling? That branch was already explored.
            if (i > start && nums[i] == nums[i - 1]) {
                continue;
            }
            cur.push_back(nums[i]);
            bt(nums, i + 1);
            cur.pop_back();
        }
    }
};
```

**How it works**
1. Sort so duplicates are adjacent.
2. At one level (one loop), only the first of several equal values may start a branch.
3. Deeper levels can still take the next copy, because there `i == start`.

**Think of it like this:** two identical twins in a line-up — picking "the first twin" or "the second twin" to start a team gives the same teams, so only one of them is allowed to go first.

**Why it's optimal:** never generates a duplicate in the first place, so no set is needed.

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n)** recursion.

## combination-sum-ii

### Approach 1: Group equal values and choose a count for each
**The idea:** count each distinct value. For each value, decide how many copies (0 … count) to use.

```cpp
class Solution {
public:
    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
        map<int, int> counts;                  // value → how many copies, sorted by value
        for (int x : candidates) {
            counts[x]++;
        }
        groups.assign(counts.begin(), counts.end());
        res.clear();
        cur.clear();
        go(0, target);
        return res;
    }

private:
    vector<pair<int, int>> groups;             // (value, count)
    vector<vector<int>> res;
    vector<int> cur;

    void go(int g, int rem) {
        if (rem == 0) {
            res.push_back(cur);
            return;
        }
        if (g == (int)groups.size() || groups[g].first > rem) {
            return;                            // no groups left, or all too big
        }
        int value = groups[g].first;
        int count = groups[g].second;

        // Option: use 0 copies of this value.
        go(g + 1, rem);

        // Options: use 1, 2, ... copies (as long as they fit).
        int used = 0;
        for (int k = 1; k <= count && value * k <= rem; k++) {
            cur.push_back(value);
            used++;
            go(g + 1, rem - value * k);
        }
        // Remove the copies we added.
        for (int k = 0; k < used; k++) {
            cur.pop_back();
        }
    }
};
```

**How it works:** values are handled once each, so duplicate combinations can't happen.

**Think of it like this:** deciding "how many 1-cent coins, how many 2-cent coins…" one coin type at a time.

**Cost:** Time exponential in the number of distinct values. Space **O(n)**.

### Approach 2: Include / exclude, skipping all copies when excluding
**The idea:** take `candidates[i]` (move to `i + 1`), or skip it — and when skipping, skip every equal copy too.

```cpp
class Solution {
public:
    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());
        res.clear();
        cur.clear();
        go(candidates, 0, target);
        return res;
    }

private:
    vector<vector<int>> res;
    vector<int> cur;

    void go(vector<int>& candidates, int i, int rem) {
        if (rem == 0) {
            res.push_back(cur);
            return;
        }
        if (i == (int)candidates.size() || candidates[i] > rem) {
            return;
        }
        // Take candidates[i].
        cur.push_back(candidates[i]);
        go(candidates, i + 1, rem - candidates[i]);
        cur.pop_back();

        // Skip candidates[i] and every copy of it.
        int next = i + 1;
        while (next < (int)candidates.size() && candidates[next] == candidates[i]) {
            next++;
        }
        go(candidates, next, rem);
    }
};
```

**How it works:** "skip value v" means "skip all copies of v", otherwise you'd later take a different copy and build the same combination again.

**Think of it like this:** if you decide not to order pizza, you don't then order "the other pizza".

**Cost:** Time exponential. Space **O(n)**.

### Optimal: Backtracking with sorting + skip equal siblings
**The idea:** Combination Sum's template, but each number is used at most once (`i + 1`) and equal values never start two branches at the same level.

```cpp
class Solution {
public:
    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());
        res.clear();
        cur.clear();
        bt(candidates, 0, target);
        return res;
    }

private:
    vector<vector<int>> res;
    vector<int> cur;

    void bt(vector<int>& candidates, int start, int rem) {
        if (rem == 0) {
            res.push_back(cur);
            return;
        }
        for (int i = start; i < (int)candidates.size(); i++) {
            if (candidates[i] > rem) {
                break;                                  // sorted → the rest are too big
            }
            if (i > start && candidates[i] == candidates[i - 1]) {
                continue;                               // same value already tried at this level
            }
            cur.push_back(candidates[i]);
            bt(candidates, i + 1, rem - candidates[i]); // i + 1: each number used once
            cur.pop_back();
        }
    }
};
```

**How it works**
1. Sort.
2. Loop `i` from `start`: stop when `candidates[i] > rem`.
3. Skip `candidates[i]` if it equals the previous sibling.
4. Choose, recurse with `i + 1`, un-choose.

**Think of it like this:** picking a team from a list where some people have identical skills — swapping one twin for the other doesn't create a new team.

**Why it's optimal:** prunes by sum and by duplicates; every answer is produced exactly once.

**Cost:** Time **O(2ⁿ)** worst case. Space **O(n)**.

## word-search

### Approach 1: DFS with a separate `visited` grid
**The idea:** try every start cell; DFS to neighbours, tracking used cells in a boolean grid.

```cpp
class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        R = board.size();
        C = board[0].size();
        visited.assign(R, vector<bool>(C, false));
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (dfs(board, word, r, c, 0)) {
                    return true;
                }
            }
        }
        return false;
    }

private:
    int R = 0;
    int C = 0;
    vector<vector<bool>> visited;

    bool dfs(vector<vector<char>>& board, const string& word, int r, int c, int i) {
        if (i == (int)word.size()) {
            return true;
        }
        if (r < 0 || c < 0 || r >= R || c >= C) {
            return false;
        }
        if (visited[r][c] || board[r][c] != word[i]) {
            return false;
        }
        visited[r][c] = true;
        bool found = dfs(board, word, r + 1, c, i + 1) ||
                     dfs(board, word, r - 1, c, i + 1) ||
                     dfs(board, word, r, c + 1, i + 1) ||
                     dfs(board, word, r, c - 1, i + 1);
        visited[r][c] = false;
        return found;
    }
};
```

**How it works:** same as the optimal solution, but leaves the board untouched (useful if it's `const`).

**Think of it like this:** tracing a path with a pencil on tracing paper instead of on the puzzle itself.

**Cost:** Time **O(R·C · 4 · 3^(L−1))**. Space **O(R·C)** for `visited`.

### Approach 2: Letter-count pruning + search from the rarer end
**The idea:** before searching, check the board has enough of each letter. Also, if the last letter is rarer than the first, search for the reversed word — fewer starting points.

```cpp
class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        R = board.size();
        C = board[0].size();

        // 1. Quick rejection: does the board contain enough of each letter?
        unordered_map<char, int> boardCount;
        for (const vector<char>& row : board) {
            for (char ch : row) {
                boardCount[ch]++;
            }
        }
        unordered_map<char, int> wordCount;
        for (char ch : word) {
            wordCount[ch]++;
            if (wordCount[ch] > boardCount[ch]) {
                return false;
            }
        }

        // 2. Start from whichever end of the word is rarer on the board.
        if (boardCount[word.back()] < boardCount[word.front()]) {
            reverse(word.begin(), word.end());
        }

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (dfs(board, word, r, c, 0)) {
                    return true;
                }
            }
        }
        return false;
    }

private:
    int R = 0;
    int C = 0;

    bool dfs(vector<vector<char>>& board, const string& word, int r, int c, int i) {
        if (i == (int)word.size()) {
            return true;
        }
        if (r < 0 || c < 0 || r >= R || c >= C || board[r][c] != word[i]) {
            return false;
        }
        char saved = board[r][c];
        board[r][c] = '#';
        bool found = dfs(board, word, r + 1, c, i + 1) ||
                     dfs(board, word, r - 1, c, i + 1) ||
                     dfs(board, word, r, c + 1, i + 1) ||
                     dfs(board, word, r, c - 1, i + 1);
        board[r][c] = saved;
        return found;
    }
};
```

**How it works:** a path spelling the word backwards exists exactly when the forward path does.

**Think of it like this:** looking for "QUEEN" — start from Q (rare) rather than E (everywhere).

**Cost:** Same worst case, much faster on adversarial inputs like `"AAAAAAB"`.

### Optimal: DFS that marks cells in place
**The idea:** from each cell, try to match the word letter by letter through neighbours, temporarily writing `#` on cells in use so they aren't reused.

```cpp
class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        R = board.size();
        C = board[0].size();
        // Try every cell as the first letter.
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (dfs(board, word, r, c, 0)) {
                    return true;
                }
            }
        }
        return false;
    }

private:
    int R = 0;
    int C = 0;

    // Does a path starting at (r, c) spell word[i..]?
    bool dfs(vector<vector<char>>& board, const string& word, int r, int c, int i) {
        if (i == (int)word.size()) {
            return true;                        // every letter matched
        }
        if (r < 0 || c < 0 || r >= R || c >= C) {
            return false;                       // off the board
        }
        if (board[r][c] != word[i]) {
            return false;                       // wrong letter (or '#' = in use)
        }

        char saved = board[r][c];
        board[r][c] = '#';                      // mark: in use on this path

        // Try all 4 neighbours; || stops at the first success.
        bool found = dfs(board, word, r + 1, c, i + 1) ||
                     dfs(board, word, r - 1, c, i + 1) ||
                     dfs(board, word, r, c + 1, i + 1) ||
                     dfs(board, word, r, c - 1, i + 1);

        board[r][c] = saved;                    // unmark (backtrack)
        return found;
    }
};
```

**How it works**
1. `dfs(r, c, i)`: does a path from here match `word[i..]`?
2. Out of bounds or wrong letter → false.
3. Mark, try 4 neighbours with `i + 1`, restore.

**Think of it like this:** walking through a maze leaving chalk marks, and wiping them off as you back out of dead ends.

**Why it's optimal:** no extra grid; worst-case time is inherent to the problem.

**Cost:** Time **O(R·C · 4 · 3^(L−1))**. Space **O(L)** recursion.

## palindrome-partitioning

### Approach 1: Backtracking, checking palindromes on the fly
**The idea:** choose the next piece `s[start..end]`; only recurse if it's a palindrome (checked with two pointers).

```cpp
class Solution {
public:
    vector<vector<string>> partition(string s) {
        res.clear();
        cur.clear();
        bt(s, 0);
        return res;
    }

private:
    vector<vector<string>> res;
    vector<string> cur;

    bool isPalindrome(const string& s, int left, int right) {
        while (left < right) {
            if (s[left] != s[right]) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }

    void bt(const string& s, int start) {
        if (start == (int)s.size()) {
            res.push_back(cur);
            return;
        }
        for (int end = start; end < (int)s.size(); end++) {
            if (isPalindrome(s, start, end)) {
                cur.push_back(s.substr(start, end - start + 1));
                bt(s, end + 1);
                cur.pop_back();
            }
        }
    }
};
```

**How it works:** each palindrome check costs O(length), repeated many times.

**Think of it like this:** cutting a ribbon, checking each piece by reading it forwards and backwards.

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n)**.

### Approach 2: Memoised partitions of each suffix
**The idea:** `parts(i)` = all partitions of `s[i..]`. It's the same answer every time it's asked, so cache it.

```cpp
class Solution {
public:
    vector<vector<string>> partition(string s) {
        memo.assign(s.size() + 1, {});
        done.assign(s.size() + 1, false);
        return parts(s, 0);
    }

private:
    vector<vector<vector<string>>> memo;   // memo[i] = partitions of s[i..]
    vector<bool> done;

    bool isPalindrome(const string& s, int left, int right) {
        while (left < right) {
            if (s[left] != s[right]) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }

    const vector<vector<string>>& parts(const string& s, int i) {
        if (done[i]) {
            return memo[i];
        }
        done[i] = true;
        if (i == (int)s.size()) {
            memo[i] = {{}};                    // one way to split "": no pieces
            return memo[i];
        }
        for (int end = i; end < (int)s.size(); end++) {
            if (!isPalindrome(s, i, end)) {
                continue;
            }
            string piece = s.substr(i, end - i + 1);
            // All partitions of what comes after this piece.
            vector<vector<string>> rest = parts(s, end + 1);
            for (vector<string>& tail : rest) {
                vector<string> full = {piece};
                full.insert(full.end(), tail.begin(), tail.end());
                memo[i].push_back(full);
            }
        }
        return memo[i];
    }
};
```

**How it works:** each suffix's partitions are computed once and reused.

**Think of it like this:** writing down "all ways to cut the rest of the ribbon" so you don't redo it.

**Cost:** Same worst-case output size; less repeated checking. Space is larger (stores every partial result).

### Optimal: Backtracking with a precomputed palindrome table
**The idea:** first compute `pal[i][j]` = "is `s[i..j]` a palindrome?" for every pair with DP, so each check during backtracking is O(1).

```cpp
class Solution {
public:
    vector<vector<string>> partition(string s) {
        n = s.size();

        // pal[i][j] is true when s[i..j] reads the same both ways.
        pal.assign(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; i--) {          // right to left, so pal[i+1][...] is ready
            for (int j = i; j < n; j++) {
                if (s[i] == s[j]) {
                    // Length 1 or 2, or the inside is a palindrome too.
                    if (j - i < 2 || pal[i + 1][j - 1]) {
                        pal[i][j] = true;
                    }
                }
            }
        }

        res.clear();
        cur.clear();
        bt(s, 0);
        return res;
    }

private:
    int n = 0;
    vector<vector<bool>> pal;
    vector<vector<string>> res;
    vector<string> cur;

    void bt(const string& s, int start) {
        if (start == n) {
            res.push_back(cur);                     // the whole string has been cut
            return;
        }
        // Try every end position for the next piece.
        for (int end = start; end < n; end++) {
            if (pal[start][end]) {
                cur.push_back(s.substr(start, end - start + 1));
                bt(s, end + 1);
                cur.pop_back();
            }
        }
    }
};
```

**How it works**
1. Fill `pal` from the right so `pal[i+1][j−1]` is already known.
2. `bt(start)`: pick the end of the next piece, only if `pal[start][end]`.
3. `start == n` → a complete partition.

**Think of it like this:** before cutting the ribbon, mark every stretch that's a palindrome; then cutting is just following the marks.

**Why it's optimal:** palindrome checks become O(1); the remaining cost is producing the output itself.

**Cost:** Time **O(n · 2ⁿ)**. Space **O(n²)** for the table.

## letter-combinations-of-a-phone-number

### Approach 1: Iterative expansion (BFS style)
**The idea:** start with `[""]`; for each digit, append each of its letters to every string so far.

```cpp
class Solution {
public:
    vector<string> letterCombinations(string digits) {
        if (digits.empty()) {
            return {};
        }
        const vector<string> keys = {"", "", "abc", "def", "ghi",
                                     "jkl", "mno", "pqrs", "tuv", "wxyz"};
        vector<string> res = {""};

        for (char d : digits) {
            vector<string> next;
            for (const string& prefix : res) {
                for (char letter : keys[d - '0']) {
                    next.push_back(prefix + letter);
                }
            }
            res = next;
        }
        return res;
    }
};
```

**How it works:** `"23"`: `[""]` → `[a, b, c]` → `[ad, ae, af, bd, …]`.

**Think of it like this:** each new digit multiplies the list by the number of letters on that key.

**Cost:** Time **O(4ⁿ · n)**. Space **O(4ⁿ · n)**.

### Approach 2: Mixed-radix counter
**The idea:** think of the combination as a number where digit `i` counts through the letters of key `i`. Increment like an odometer.

```cpp
class Solution {
public:
    vector<string> letterCombinations(string digits) {
        if (digits.empty()) {
            return {};
        }
        const vector<string> keys = {"", "", "abc", "def", "ghi",
                                     "jkl", "mno", "pqrs", "tuv", "wxyz"};
        int n = digits.size();
        vector<int> idx(n, 0);                 // which letter each position shows
        vector<string> res;

        while (true) {
            string s;
            for (int i = 0; i < n; i++) {
                s += keys[digits[i] - '0'][idx[i]];
            }
            res.push_back(s);

            // Increment the last position, carrying to the left like an odometer.
            int pos = n - 1;
            while (pos >= 0) {
                idx[pos]++;
                if (idx[pos] < (int)keys[digits[pos] - '0'].size()) {
                    break;                     // no carry needed
                }
                idx[pos] = 0;                  // wrap around and carry
                pos--;
            }
            if (pos < 0) {
                break;                         // the leftmost position wrapped: done
            }
        }
        return res;
    }
};
```

**How it works:** visits combinations in the same order as backtracking, without recursion.

**Think of it like this:** a bike lock with dials of different sizes.

**Cost:** Time **O(4ⁿ · n)**. Space **O(n)** besides the output.

### Optimal: Backtracking, one level per digit
**The idea:** at level `i`, try each letter of `digits[i]`, then recurse to the next digit.

```cpp
class Solution {
public:
    vector<string> letterCombinations(string digits) {
        res.clear();
        cur.clear();
        if (digits.empty()) {
            return res;
        }
        bt(digits, 0);
        return res;
    }

private:
    // keys[d] = letters printed on phone key d.
    const vector<string> keys = {"", "", "abc", "def", "ghi",
                                 "jkl", "mno", "pqrs", "tuv", "wxyz"};
    vector<string> res;
    string cur;

    void bt(const string& digits, int i) {
        if (i == (int)digits.size()) {
            res.push_back(cur);              // one letter chosen per digit
            return;
        }
        for (char c : keys[digits[i] - '0']) {
            cur.push_back(c);                // choose a letter for digit i
            bt(digits, i + 1);               // move to the next digit
            cur.pop_back();                  // undo
        }
    }
};
```

**How it works**
1. One recursion level per digit.
2. Loop over that digit's letters: append, recurse, pop.
3. At the end of the digits, record the string.

**Think of it like this:** spinning one dial per digit and writing down every combination.

**Why it's optimal:** builds each answer once with a single reusable buffer.

**Cost:** Time **O(4ⁿ · n)**. Space **O(n)** recursion.

## n-queens

### Approach 1: Check conflicts by scanning the board
**The idea:** place queens row by row; before placing at `(r, c)`, scan up the column and both diagonals for an existing queen.

```cpp
class Solution {
public:
    vector<vector<string>> solveNQueens(int n) {
        this->n = n;
        board.assign(n, string(n, '.'));
        res.clear();
        place(0);
        return res;
    }

private:
    int n = 0;
    vector<string> board;
    vector<vector<string>> res;

    bool safe(int r, int c) {
        // Only rows above r can contain queens.
        for (int i = 1; i <= r; i++) {
            if (board[r - i][c] == 'Q') {
                return false;                         // same column
            }
            if (c - i >= 0 && board[r - i][c - i] == 'Q') {
                return false;                         // up-left diagonal
            }
            if (c + i < n && board[r - i][c + i] == 'Q') {
                return false;                         // up-right diagonal
            }
        }
        return true;
    }

    void place(int r) {
        if (r == n) {
            res.push_back(board);
            return;
        }
        for (int c = 0; c < n; c++) {
            if (safe(r, c)) {
                board[r][c] = 'Q';
                place(r + 1);
                board[r][c] = '.';
            }
        }
    }
};
```

**How it works:** each safety check costs O(n).

**Think of it like this:** before seating a guest, walking up the aisle to look for rivals.

**Cost:** Time **O(n! · n)**. Space **O(n²)**.

### Approach 2: Bitmasks (fastest)
**The idea:** store used columns and diagonals as bits in three integers. Free positions in a row are the zero bits of `cols | diag1 | diag2`.

```cpp
class Solution {
public:
    vector<vector<string>> solveNQueens(int n) {
        this->n = n;
        board.assign(n, string(n, '.'));
        res.clear();
        place(0, 0, 0, 0);
        return res;
    }

private:
    int n = 0;
    vector<string> board;
    vector<vector<string>> res;

    // cols: used columns. left / right: diagonals, already shifted to this row.
    void place(int r, int cols, int left, int right) {
        if (r == n) {
            res.push_back(board);
            return;
        }
        int all = (1 << n) - 1;                          // n ones
        int free = all & ~(cols | left | right);         // 1 = a safe column
        while (free != 0) {
            int bit = free & -free;                      // lowest safe column
            free -= bit;
            int c = __builtin_ctz(bit);                  // its index
            board[r][c] = 'Q';
            // Moving down one row shifts each diagonal one column.
            place(r + 1, cols | bit, (left | bit) << 1, (right | bit) >> 1);
            board[r][c] = '.';
        }
    }
};
```

**How it works:** `free & -free` isolates the lowest set bit; the diagonal masks shift as you go down rows.

**Think of it like this:** three transparent overlays with blocked squares drawn on them — stack them and see which holes are left.

**Cost:** Time **O(n!)** with tiny constants. Space **O(n)**.

### Optimal: Backtracking with column and diagonal arrays
**The idea:** one queen per row. Remember which columns and diagonals are taken in three boolean arrays so each safety check is O(1).

```cpp
class Solution {
public:
    vector<vector<string>> solveNQueens(int n) {
        this->n = n;
        board.assign(n, string(n, '.'));
        col.assign(n, false);
        diag.assign(2 * n, false);
        anti.assign(2 * n, false);
        res.clear();
        bt(0);
        return res;
    }

private:
    int n = 0;
    vector<string> board;
    vector<vector<string>> res;
    vector<bool> col;    // col[c]: a queen is in column c
    vector<bool> diag;   // diag[r + c]: a queen is on this "/" diagonal
    vector<bool> anti;   // anti[r - c + n]: a queen is on this "\" diagonal

    void bt(int r) {
        if (r == n) {
            res.push_back(board);                 // a queen in every row
            return;
        }
        for (int c = 0; c < n; c++) {
            if (col[c] || diag[r + c] || anti[r - c + n]) {
                continue;                         // attacked: try the next column
            }
            // Place the queen.
            col[c] = true;
            diag[r + c] = true;
            anti[r - c + n] = true;
            board[r][c] = 'Q';

            bt(r + 1);                            // fill the next row

            // Remove the queen (backtrack).
            board[r][c] = '.';
            col[c] = false;
            diag[r + c] = false;
            anti[r - c + n] = false;
        }
    }
};
```

**How it works**
1. Place row by row, so rows never clash.
2. Cells on the same "/" diagonal share `r + c`; on the same "\" diagonal share `r − c` (+ n keeps it ≥ 0).
3. Place, recurse, remove.

**Think of it like this:** seating rival kings at a table — keep a checklist of which columns and diagonals are already "claimed".

**Why it's the interview answer:** O(1) checks and very readable. Mention bitmasks as the speed-up.

**Cost:** Time **O(n!)**. Space **O(n)** besides the board.
