## best-time-to-buy-and-sell-stock

### Approach 1: Brute force over buy/sell pairs
```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int best = 0, n = prices.size();
        for (int b = 0; b < n; ++b)
            for (int s = b + 1; s < n; ++s)
                best = max(best, prices[s] - prices[b]);
        return best;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Kadane on daily differences
**Idea:** profit of buying on day b and selling on s = sum of daily changes between them → max subarray sum.

```cpp
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int cur = 0, best = 0;
        for (size_t i = 1; i < prices.size(); ++i) {
            cur = max(0, cur + prices[i] - prices[i - 1]);   // drop a losing streak
            best = max(best, cur);
        }
        return best;
    }
};
```

**Time:** O(n) · **Space:** O(1). Connects this problem to Maximum Subarray.

### Walkthrough
**Goal:** max of `prices[sell] − prices[buy]` with buy before sell.

1. For a fixed sell day, the best buy day is the **cheapest day before it**.
2. So scan once, keeping `minPrice` seen so far.
3. At each day, the candidate profit is `price − minPrice`; keep the max.
4. Update `minPrice` with today (order of the two updates doesn't matter here since profit with itself is 0).

**Dry run** `[7, 1, 5, 3, 6, 4]`:

| day | price | minPrice | profit today | best |
|---|---|---|---|---|
| 0 | 7 | 7 | 0 | 0 |
| 1 | 1 | 1 | 0 | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | **5** |
| 5 | 4 | 1 | 3 | 5 |

## longest-substring-without-repeating-characters

### Approach 1: Brute force — check every substring
```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        int n = s.size(), best = 0;
        for (int i = 0; i < n; ++i) {
            array<bool, 256> seen{};
            for (int j = i; j < n; ++j) {
                if (seen[(unsigned char)s[j]]) break;      // extend until a repeat
                seen[(unsigned char)s[j]] = true;
                best = max(best, j - i + 1);
            }
        }
        return best;
    }
};
```

**Time:** O(n · Σ) ≈ O(n²) · **Space:** O(Σ).

### Approach 2: Sliding window with a set (shrink step by step)
```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_set<char> win;
        int l = 0, best = 0;
        for (int r = 0; r < (int)s.size(); ++r) {
            while (win.count(s[r])) win.erase(s[l++]);    // shrink until s[r] is unique
            win.insert(s[r]);
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

**Time:** O(n) (each char inserted/erased once) · **Space:** O(Σ). The general sliding-window template.

### Walkthrough
**Goal:** longest window `[l, r]` with all distinct characters.

1. `last[c]` = most recent index of character `c` (−1 if unseen).
2. Extend `r` one step at a time.
3. If `s[r]` was last seen **inside the window** (`last[c] ≥ l`), the window now has a repeat. Jump `l` to `last[c] + 1` — every smaller `l` would still contain both copies.
4. Record `last[c] = r` and update `best = max(best, r − l + 1)`.

**Dry run** `"abcabcbb"`:

| r | c | last[c] | l after | window | best |
|---|---|---|---|---|---|
| 0 | a | −1 | 0 | a | 1 |
| 1 | b | −1 | 0 | ab | 2 |
| 2 | c | −1 | 0 | abc | 3 |
| 3 | a | 0 | 1 | bca | 3 |
| 4 | b | 1 | 2 | cab | 3 |
| 5 | c | 2 | 3 | abc | 3 |
| 6 | b | 4 | 5 | cb | 3 |
| 7 | b | 6 | 7 | b | 3 |

**Why `last[c] >= l`?** In `"abba"`, at the final `a`, `last['a'] = 0` but `l = 2` already — that old `a` is outside the window and must be ignored.

## longest-repeating-character-replacement

### Approach 1: Brute force over substrings
```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        int n = s.size(), best = 0;
        for (int i = 0; i < n; ++i) {
            array<int, 26> cnt{};
            int maxf = 0;
            for (int j = i; j < n; ++j) {
                maxf = max(maxf, ++cnt[s[j] - 'A']);
                if (j - i + 1 - maxf <= k) best = max(best, j - i + 1);
            }
        }
        return best;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: One window per target letter
**Idea:** for each letter X, find the longest window containing at most k non-X characters.

```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        int best = 0;
        for (char X = 'A'; X <= 'Z'; ++X) {
            int l = 0, others = 0;
            for (int r = 0; r < (int)s.size(); ++r) {
                if (s[r] != X) ++others;
                while (others > k) if (s[l++] != X) --others;
                best = max(best, r - l + 1);
            }
        }
        return best;
    }
};
```

**Time:** O(26 · n) · **Space:** O(1). Very easy to prove correct — no "stale maxf" subtlety.

### Walkthrough
**Goal:** longest window where `windowLength − (count of most frequent letter) ≤ k`.

1. Keep `cnt[26]` for the window and `maxf` = highest count seen.
2. Add `s[r]`, update `maxf`.
3. If the window needs more than `k` replacements, slide `l` right by one (decrement its count).
4. Record `r − l + 1`.
5. **Subtlety:** `maxf` is never lowered when shrinking. That's safe: the answer can only *grow* when a window reaches a larger `maxf`, so a stale `maxf` merely keeps the window size constant rather than producing a wrong bigger answer.

**Dry run** `s = "AABABBA"`, `k = 1`:

| r | char | maxf | window len | len − maxf | shrink? | best |
|---|---|---|---|---|---|---|
| 0 | A | 1 | 1 | 0 | no | 1 |
| 1 | A | 2 | 2 | 0 | no | 2 |
| 2 | B | 2 | 3 | 1 | no | 3 |
| 3 | A | 3 | 4 | 1 | no | 4 |
| 4 | B | 3 | 5 | 2 | yes → len 4 | 4 |
| 5 | B | 3 | 5 | 2 | yes → len 4 | 4 |
| 6 | A | 3 | 5 | 2 | yes → len 4 | 4 |

Answer **4** (e.g. "AABA" → "AAAA").

## permutation-in-string

### Approach 1: Sort every window
```cpp
class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int n = s1.size();
        ranges::sort(s1);
        for (int i = 0; i + n <= (int)s2.size(); ++i) {
            string w = s2.substr(i, n);
            ranges::sort(w);
            if (w == s1) return true;
        }
        return false;
    }
};
```

**Time:** O((m − n) · n log n) · **Space:** O(n).

### Approach 2: Sliding window with a `matches` counter
```cpp
class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int n = s1.size(), m = s2.size();
        if (n > m) return false;
        array<int, 26> a{}, b{};
        for (int i = 0; i < n; ++i) { ++a[s1[i] - 'a']; ++b[s2[i] - 'a']; }
        int matches = 0;
        for (int c = 0; c < 26; ++c) matches += a[c] == b[c];
        for (int r = n; r < m; ++r) {
            if (matches == 26) return true;
            int in = s2[r] - 'a', out = s2[r - n] - 'a';
            // add incoming char
            if (b[in] == a[in]) --matches;
            ++b[in];
            if (b[in] == a[in]) ++matches;
            // remove outgoing char
            if (b[out] == a[out]) --matches;
            --b[out];
            if (b[out] == a[out]) ++matches;
        }
        return matches == 26;
    }
};
```

**Time:** O(m) with O(1) per step (no 26-compare) · **Space:** O(1).

### Walkthrough
**Goal:** does some window of length `|s1|` in `s2` have the same letter counts as `s1`?

1. Count `s1` into `need`.
2. Slide a fixed-size window over `s2` with counts in `win`.
3. Each step: add the entering character `s2[r]`; once `r ≥ n`, remove the leaving one `s2[r − n]`.
4. Compare `win == need` (26 integers — constant time).

**Dry run** `s1 = "ab"`, `s2 = "eidbaooo"` (only a, b counts shown):

| r | added | removed | window | win(a,b) | match? |
|---|---|---|---|---|---|
| 1 | i | — | "ei" | 0,0 | no |
| 2 | d | e | "id" | 0,0 | no |
| 3 | b | i | "db" | 0,1 | no |
| 4 | a | d | "ba" | 1,1 | **yes** |

## minimum-window-substring

### Approach 1: Brute force over all substrings
```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        array<int, 128> need{};
        for (char c : t) ++need[c];
        int bestL = 0, bestLen = INT_MAX, n = s.size();
        for (int i = 0; i < n; ++i) {
            array<int, 128> have{};
            int formed = 0;
            for (int j = i; j < n && j - i + 1 < bestLen; ++j) {
                if (++have[s[j]] <= need[s[j]]) ++formed;     // counts a still-needed char
                if (formed == (int)t.size()) { bestLen = j - i + 1; bestL = i; break; }
            }
        }
        return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Sliding window over a filtered list of relevant positions
```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        array<int, 128> need{};
        for (char c : t) ++need[c];
        vector<int> pos;                              // indices of chars that appear in t
        for (int i = 0; i < (int)s.size(); ++i) if (need[s[i]]) pos.push_back(i);
        array<int, 128> have{};
        int formed = 0, l = 0, bestL = 0, bestLen = INT_MAX;
        for (int r = 0; r < (int)pos.size(); ++r) {
            char c = s[pos[r]];
            if (++have[c] <= need[c]) ++formed;
            while (formed == (int)t.size()) {
                int len = pos[r] - pos[l] + 1;
                if (len < bestLen) { bestLen = len; bestL = pos[l]; }
                char d = s[pos[l++]];
                if (--have[d] < need[d]) --formed;
            }
        }
        return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
    }
};
```

**Time:** O(|s| + |t|) · **Space:** O(|s|). Faster in practice when `t`'s characters are rare in `s`.

### Walkthrough
**Goal:** shortest window of `s` containing all characters of `t` (with multiplicity).

1. `need[c]` = how many of `c` the window still requires (starts as counts in `t`). `missing` = total still required.
2. **Expand** with `r`: `need[s[r]]--`. If it was positive before, we filled a requirement → `missing--`. (Negative `need` = surplus.)
3. When `missing == 0`, the window is valid. **Shrink** from `l` as much as possible:
   1. Record the window if it's the smallest.
   2. Remove `s[l]`: `need[s[l]]++`. If it becomes positive, we just lost a required char → `missing++`, the window is invalid again.
   3. `l++`.
4. Continue expanding.

**Dry run** `s = "ADOBECODEBANC"`, `t = "ABC"` (key moments):

| r | char | missing | valid window found when shrinking | best |
|---|---|---|---|---|
| 5 | C | 0 | "ADOBEC" (0..5) → removing A breaks it | ADOBEC (6) |
| 10 | A | 0 | "DOBECODEBA" → shrink to "CODEBA" (5..10) | ADOBEC |
| 12 | C | 0 | shrink to "BANC" (9..12) | **BANC (4)** |

## sliding-window-maximum

### Approach 1: Brute force — max of each window
```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        vector<int> out;
        for (int i = 0; i + k <= (int)nums.size(); ++i)
            out.push_back(*max_element(nums.begin() + i, nums.begin() + i + k));
        return out;
    }
};
```

**Time:** O(n · k) · **Space:** O(1).

### Approach 2: Max-heap with lazy deletion
```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        priority_queue<pair<int, int>> pq;            // (value, index)
        vector<int> out;
        for (int i = 0; i < (int)nums.size(); ++i) {
            pq.emplace(nums[i], i);
            if (i >= k - 1) {
                while (pq.top().second <= i - k) pq.pop();   // discard out-of-window maxima
                out.push_back(pq.top().first);
            }
        }
        return out;
    }
};
```

**Time:** O(n log n) · **Space:** O(n). A multiset also works (erase the leaving element explicitly).

### Approach 3: Block prefix/suffix maxima
```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& a, int k) {
        int n = a.size();
        vector<int> L(n), R(n), out;
        for (int i = 0; i < n; ++i) L[i] = (i % k == 0) ? a[i] : max(L[i - 1], a[i]);   // max from block start
        for (int i = n - 1; i >= 0; --i)
            R[i] = (i == n - 1 || (i + 1) % k == 0) ? a[i] : max(R[i + 1], a[i]);       // max to block end
        for (int i = 0; i + k <= n; ++i) out.push_back(max(R[i], L[i + k - 1]));
        return out;
    }
};
```

**Time:** O(n) · **Space:** O(n). A window always spans at most two blocks of size k.

### Walkthrough
**Goal:** max of every length-k window in O(n).

1. Keep a deque of **indices** whose values are strictly decreasing from front to back. The front is the current max.
2. For each `i`:
   1. **Expire:** if the front index is `≤ i − k`, it's outside the window → pop front.
   2. **Dominate:** pop from the back while `nums[back] ≤ nums[i]` — those can never be a max again, since `i` is larger and stays longer.
   3. Push `i` at the back.
   4. Once `i ≥ k − 1`, output `nums[front]`.

**Dry run** `nums = [1, 3, −1, −3, 5, 3, 6, 7]`, `k = 3` (deque shown as values):

| i | num | deque after | output |
|---|---|---|---|
| 0 | 1 | [1] | |
| 1 | 3 | [3] | |
| 2 | −1 | [3, −1] | 3 |
| 3 | −3 | [3, −1, −3] | 3 |
| 4 | 5 | [5] (3 expired, others dominated) | 5 |
| 5 | 3 | [5, 3] | 5 |
| 6 | 6 | [6] | 6 |
| 7 | 7 | [7] | 7 |
