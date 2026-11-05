## contains-duplicate

### Approach 1: Brute Force (compare every pair)
**Idea:** for every element, compare it with every element after it. If any two are equal, there's a duplicate.

```cpp
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        int n = nums.size();
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j)      // j starts after i: each pair checked once
                if (nums[i] == nums[j]) return true;
        return false;
    }
};
```

**Time:** O(n²) — n(n−1)/2 comparisons · **Space:** O(1). Times out for n = 10⁵ (≈5·10⁹ comparisons).

### Approach 2: Sort, then check neighbours
**Idea:** after sorting, equal values are adjacent, so one linear pass comparing `nums[i]` with `nums[i-1]` finds any duplicate.

```cpp
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        ranges::sort(nums);                         // O(n log n), modifies the input
        for (size_t i = 1; i < nums.size(); ++i)
            if (nums[i] == nums[i - 1]) return true;
        return false;
    }
};
```

**Time:** O(n log n) · **Space:** O(1) extra (O(log n) sort recursion). Good when memory is tight and mutating the input is allowed — ask the interviewer!

### Walkthrough
**Goal:** answer "have I seen this value before?" for each element in O(1).

1. Create an empty `unordered_set<int> seen`. `reserve(n)` pre-sizes the hash table so it never rehashes.
2. Visit each `x` left to right.
3. `seen.insert(x)` returns a `pair<iterator, bool>`. The `bool` is `true` if `x` was newly inserted, `false` if it was already there.
4. If the insert failed (`false`), `x` appeared earlier → return `true` immediately (early exit).
5. If the loop finishes, every insert succeeded → all values distinct → return `false`.

**Dry run** on `[1, 2, 3, 1]`:

| step | x | seen before | insert succeeded? | action |
|---|---|---|---|---|
| 1 | 1 | {} | yes | continue |
| 2 | 2 | {1} | yes | continue |
| 3 | 3 | {1,2} | yes | continue |
| 4 | 1 | {1,2,3} | **no** | return true |

**Edge cases:** empty array or single element → false. Negative numbers and `INT_MIN` work fine in a hash set.

**Comparison:** brute force O(n²)/O(1) → sorting O(n log n)/O(1) → hash set O(n)/O(n). This is the classic time–space trade-off to say out loud.

## valid-anagram

### Approach 1: Sort both strings
**Idea:** two strings are anagrams iff their sorted forms are identical.

```cpp
class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) return false;
        ranges::sort(s);
        ranges::sort(t);
        return s == t;
    }
};
```

**Time:** O(n log n) · **Space:** O(1) extra (we sort our own copies — parameters are by value).

### Approach 2: Hash map counts (works for Unicode / any characters)
```cpp
class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) return false;
        unordered_map<char, int> cnt;
        for (char c : s) ++cnt[c];
        for (char c : t) {
            if (--cnt[c] < 0) return false;   // t has more of c than s
        }
        return true;                           // equal lengths + no negatives => all zero
    }
};
```

**Time:** O(n) · **Space:** O(k) distinct characters. Generalises beyond 26 letters.

### Walkthrough
**Goal:** compare the multiset of letters in `s` and `t`.

1. **Length check:** different lengths can never be anagrams → return false (also guarantees same loop bounds).
2. Make `array<int, 26> cnt{}` — the `{}` zero-initialises all 26 counters.
3. Single loop over index `i`: `++cnt[s[i] - 'a']` and `--cnt[t[i] - 'a']`. `c - 'a'` maps `'a'..'z'` to `0..25`.
4. After the loop each counter = (count in s) − (count in t).
5. All zero ⇔ same letter counts ⇔ anagram. `ranges::all_of` checks that.

**Dry run** `s = "rat"`, `t = "car"` (showing only non-zero counters):

| i | s[i] | t[i] | after update |
|---|---|---|---|
| 0 | r | c | r:+1, c:−1 |
| 1 | a | a | r:+1, c:−1 (a cancels) |
| 2 | t | r | t:+1, c:−1 (r cancels) |

`t` and `c` are non-zero → **false**.

**Why one array, not two?** Incrementing for `s` and decrementing for `t` halves memory and lets one check (`== 0`) replace comparing two arrays.

## two-sum

### Approach 1: Brute Force (all pairs)
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i < (int)nums.size(); ++i)
            for (int j = i + 1; j < (int)nums.size(); ++j)
                if (nums[i] + nums[j] == target) return {i, j};
        return {};
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: Sort indices + two pointers
**Idea:** sort the *indices* by value (so original positions are kept), then converge two pointers like Two Sum II.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        vector<int> idx(nums.size());
        iota(idx.begin(), idx.end(), 0);                         // 0,1,2,...
        ranges::sort(idx, {}, [&](int i) { return nums[i]; });   // order indices by value
        int l = 0, r = (int)idx.size() - 1;
        while (l < r) {
            long long sum = (long long)nums[idx[l]] + nums[idx[r]];
            if (sum == target) return {idx[l], idx[r]};
            if (sum < target) ++l; else --r;
        }
        return {};
    }
};
```

**Time:** O(n log n) · **Space:** O(n) for the index array. Useful when you also need *all* pairs or the input is already sorted.

### Approach 3: Two-pass hash map
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> idx;
        for (int i = 0; i < (int)nums.size(); ++i) idx[nums[i]] = i;    // last index of each value
        for (int i = 0; i < (int)nums.size(); ++i) {
            auto it = idx.find(target - nums[i]);
            if (it != idx.end() && it->second != i) return {i, it->second};  // not the same element
        }
        return {};
    }
};
```

**Time:** O(n) · **Space:** O(n). The one-pass version (Optimal) is simpler because it never needs the `!= i` check.

### Walkthrough
**Goal:** for each `nums[i]`, find whether its complement `target − nums[i]` appeared earlier.

1. `idx` maps **value → index** of numbers already visited.
2. For each `i`: compute `need = target - nums[i]`.
3. Look up `need`. If found, the earlier index and `i` form the answer.
4. Otherwise store `nums[i] → i` and continue.
5. Looking up **before** inserting guarantees we never pair an element with itself (e.g. `target = 6`, `nums[i] = 3` alone).

**Dry run** `nums = [2, 7, 11, 15]`, `target = 9`:

| i | nums[i] | need | idx before | found? |
|---|---|---|---|---|
| 0 | 2 | 7 | {} | no → store 2→0 |
| 1 | 7 | 2 | {2→0} | **yes** → return [0, 1] |

**Duplicates case** `nums = [3, 3]`, `target = 6`: at i=0 need 3 not present, store 3→0; at i=1 need 3 found at 0 → [0,1]. ✔

**Interview tip:** mention the C++17 `if (auto it = ...; cond)` init-statement keeps `it` scoped to the `if`.

## group-anagrams

### Approach 1: Sorted string as key
```cpp
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;
        for (auto& s : strs) {
            string key = s;
            ranges::sort(key);                 // "eat" -> "aet"
            groups[key].push_back(s);
        }
        vector<vector<string>> out;
        for (auto& [k, g] : groups) out.push_back(std::move(g));
        return out;
    }
};
```

**Time:** O(n · k log k) for n words of length k · **Space:** O(n·k). Simplest to write in an interview.

### Approach 2: Brute force — compare each word against existing groups
```cpp
class Solution {
    static bool isAnagram(const string& a, const string& b) {
        if (a.size() != b.size()) return false;
        array<int, 26> c{};
        for (size_t i = 0; i < a.size(); ++i) { ++c[a[i] - 'a']; --c[b[i] - 'a']; }
        return ranges::all_of(c, [](int x) { return x == 0; });
    }
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        vector<vector<string>> groups;
        for (auto& s : strs) {
            bool placed = false;
            for (auto& g : groups)
                if (isAnagram(g[0], s)) { g.push_back(s); placed = true; break; }
            if (!placed) groups.push_back({s});
        }
        return groups;
    }
};
```

**Time:** O(n² · k) worst case (every word its own group) · **Space:** O(n·k). Shows why a canonical key + hash map matters.

### Walkthrough
**Goal:** put words into buckets keyed by something every anagram shares.

1. For each word, count letters into `array<int, 26> cnt{}`.
2. Turn the counts into a string key: `"1#0#0#...#"`. The `#` separators matter — without them, counts `1,11` and `11,1` would both become `"111"`.
3. `groups[key]` creates an empty vector the first time the key is seen (`operator[]` default-inserts), then we append the word.
4. `std::move(s)` steals the string's buffer instead of copying it — fine because we don't need `strs` afterwards.
5. Finally move each bucket into the output.

**Dry run** `["eat","tea","tan","ate","nat","bat"]` (key shown as letters for readability):

| word | key (letter counts) | bucket after |
|---|---|---|
| eat | a1 e1 t1 | {eat} |
| tea | a1 e1 t1 | {eat, tea} |
| tan | a1 n1 t1 | {tan} |
| ate | a1 e1 t1 | {eat, tea, ate} |
| nat | a1 n1 t1 | {tan, nat} |
| bat | a1 b1 t1 | {bat} |

**Choosing a key:** sorted string (O(k log k), simple) vs counts (O(k), longer key). For short words they're similar; mention both.

## top-k-frequent-elements

### Approach 1: Count + sort all by frequency
```cpp
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> freq;
        for (int x : nums) ++freq[x];
        vector<pair<int, int>> v(freq.begin(), freq.end());          // (value, count)
        ranges::sort(v, [](auto& a, auto& b) { return a.second > b.second; });
        vector<int> out;
        for (int i = 0; i < k; ++i) out.push_back(v[i].first);
        return out;
    }
};
```

**Time:** O(n + m log m), m = distinct values · **Space:** O(m).

### Approach 2: Min-heap of size k
```cpp
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> freq;
        for (int x : nums) ++freq[x];
        using P = pair<int, int>;                                       // (count, value)
        priority_queue<P, vector<P>, greater<>> pq;                     // smallest count on top
        for (auto [val, c] : freq) {
            pq.emplace(c, val);
            if ((int)pq.size() > k) pq.pop();                           // drop least frequent
        }
        vector<int> out;
        while (!pq.empty()) { out.push_back(pq.top().second); pq.pop(); }
        return out;
    }
};
```

**Time:** O(n + m log k) · **Space:** O(m + k). Best when data streams in or k ≪ m.

### Approach 3: Quickselect with nth_element
```cpp
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> freq;
        for (int x : nums) ++freq[x];
        vector<pair<int, int>> v(freq.begin(), freq.end());
        nth_element(v.begin(), v.begin() + k - 1, v.end(),
                    [](auto& a, auto& b) { return a.second > b.second; });   // top k in front
        vector<int> out;
        for (int i = 0; i < k; ++i) out.push_back(v[i].first);
        return out;
    }
};
```

**Time:** O(n) average, O(m²) worst · **Space:** O(m).

### Walkthrough
**Goal:** find the k values with the highest counts, faster than sorting.

1. Count frequencies in a hash map: O(n).
2. **Key observation:** any count is between 1 and n. So create `n + 1` buckets where `bucket[f]` holds all values that appear exactly `f` times.
3. Walk `f` from n down to 1, appending values until we have k of them.
4. Total work: counting O(n) + filling buckets O(m) + scanning buckets O(n) = O(n).

**Dry run** `nums = [1,1,1,2,2,3]`, `k = 2`:

- freq = {1:3, 2:2, 3:1}
- buckets: `bucket[3] = [1]`, `bucket[2] = [2]`, `bucket[1] = [3]`

| f | bucket[f] | out after |
|---|---|---|
| 6, 5, 4 | [] | [] |
| 3 | [1] | [1] |
| 2 | [2] | [1, 2] → size k, stop |

**Which to present?** Start with the heap (most general), then mention bucket sort as the O(n) improvement — interviewers like seeing the progression.

## product-of-array-except-self

### Approach 1: Brute force
```cpp
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> ans(n, 1);
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < n; ++j)
                if (j != i) ans[i] *= nums[j];
        return ans;
    }
};
```

**Time:** O(n²) · **Space:** O(1) extra.

### Approach 2: Prefix and suffix arrays
**Idea:** `prefix[i]` = product of everything left of `i`, `suffix[i]` = product of everything right of `i`; answer = `prefix[i] * suffix[i]`.

```cpp
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> prefix(n, 1), suffix(n, 1), ans(n);
        for (int i = 1; i < n; ++i) prefix[i] = prefix[i - 1] * nums[i - 1];
        for (int i = n - 2; i >= 0; --i) suffix[i] = suffix[i + 1] * nums[i + 1];
        for (int i = 0; i < n; ++i) ans[i] = prefix[i] * suffix[i];
        return ans;
    }
};
```

**Time:** O(n) · **Space:** O(n) extra. The Optimal approach just folds both arrays into `ans` + one variable.

### Approach 3: Division (only if allowed) with zero handling
```cpp
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int zeros = 0; long long prod = 1;
        for (int x : nums) { if (x == 0) ++zeros; else prod *= x; }
        vector<int> ans(nums.size(), 0);
        for (size_t i = 0; i < nums.size(); ++i) {
            if (zeros > 1) ans[i] = 0;
            else if (zeros == 1) ans[i] = nums[i] == 0 ? (int)prod : 0;
            else ans[i] = (int)(prod / nums[i]);
        }
        return ans;
    }
};
```

**Time:** O(n) · **Space:** O(1). The problem forbids division — but discussing why (zeros!) shows depth.

### Walkthrough
**Goal:** `ans[i] = (product of nums[0..i-1]) × (product of nums[i+1..n-1])` in O(n), O(1) extra.

1. **Pass 1 (left → right):** keep `prefix` = product of elements *before* `i`. Write `ans[i] = prefix`, *then* multiply `prefix *= nums[i]`. Order matters: write first so `nums[i]` isn't included.
2. **Pass 2 (right → left):** keep `suffix` = product of elements *after* `i`. Multiply `ans[i] *= suffix`, then `suffix *= nums[i]`.
3. Each `ans[i]` now holds left-product × right-product.

**Dry run** `nums = [1, 2, 3, 4]`:

Pass 1:

| i | prefix (before) | ans[i] | prefix after |
|---|---|---|---|
| 0 | 1 | 1 | 1 |
| 1 | 1 | 1 | 2 |
| 2 | 2 | 2 | 6 |
| 3 | 6 | 6 | 24 |

Pass 2:

| i | suffix (before) | ans[i] = ans[i]·suffix | suffix after |
|---|---|---|---|
| 3 | 1 | 6 | 4 |
| 2 | 4 | 8 | 12 |
| 1 | 12 | 12 | 24 |
| 0 | 24 | 24 | 24 |

Result `[24, 12, 8, 6]` ✔. Zeros need no special handling — they just flow through the products.

## valid-sudoku

### Approach 1: Three passes with hash sets
```cpp
class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& b) {
        for (int i = 0; i < 9; ++i) {
            unordered_set<char> row, col, box;
            for (int j = 0; j < 9; ++j) {
                char r = b[i][j], c = b[j][i];
                char x = b[3 * (i / 3) + j / 3][3 * (i % 3) + j % 3];   // j-th cell of box i
                if (r != '.' && !row.insert(r).second) return false;
                if (c != '.' && !col.insert(c).second) return false;
                if (x != '.' && !box.insert(x).second) return false;
            }
        }
        return true;
    }
};
```

**Time:** O(81) · **Space:** O(9) per iteration. Clever indexing: `i` selects row/column/box, `j` the cell within it.

### Approach 2: One pass with a set of encoded strings
```cpp
class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& b) {
        unordered_set<string> seen;
        for (int r = 0; r < 9; ++r)
            for (int c = 0; c < 9; ++c) {
                char d = b[r][c];
                if (d == '.') continue;
                string row = string(1, d) + " in row " + to_string(r);
                string col = string(1, d) + " in col " + to_string(c);
                string box = string(1, d) + " in box " + to_string(r / 3) + to_string(c / 3);
                if (!seen.insert(row).second || !seen.insert(col).second || !seen.insert(box).second)
                    return false;
            }
        return true;
    }
};
```

**Time:** O(81) · **Space:** O(243). Very readable; slower due to string building.

### Walkthrough
**Goal:** detect any digit repeated in a row, column or 3×3 box.

1. Keep 27 bitmasks: `row[9]`, `col[9]`, `box[9]` (`uint16_t`, bit d = "digit d used").
2. For each filled cell `(r, c)` with digit `d`, form `bit = 1 << d`.
3. **Box index:** `b = (r/3)*3 + c/3`. Rows 0–2 & cols 0–2 → box 0; rows 0–2 & cols 3–5 → box 1; … rows 6–8 & cols 6–8 → box 8.
4. If `(row[r] | col[c] | box[b]) & bit` is non-zero, the digit already exists in one of the three → invalid.
5. Otherwise set the bit in all three.

**Box index table:**

| r \ c | 0–2 | 3–5 | 6–8 |
|---|---|---|---|
| 0–2 | 0 | 1 | 2 |
| 3–5 | 3 | 4 | 5 |
| 6–8 | 6 | 7 | 8 |

**Example:** cell (4, 7) = '5' → box = (4/3)*3 + 7/3 = 3 + 2 = 5; bit = 1<<5 = 0b100000.

**Note:** this checks *validity* of the current board, not *solvability* (that's LC 37, backtracking).

## encode-and-decode-strings

### Approach 1: Escaping a delimiter
**Idea:** use `#` as a separator and escape any `#` (and the escape char) inside the data.

```cpp
class Codec {
public:
    string encode(const vector<string>& strs) {
        string out;
        for (const auto& s : strs) {
            for (char c : s) {
                if (c == '#' || c == '\\') out += '\\';   // escape special chars
                out += c;
            }
            out += '#';                                     // unescaped '#' = end of string
        }
        return out;
    }
    vector<string> decode(const string& s) {
        vector<string> out;
        string cur;
        for (size_t i = 0; i < s.size(); ++i) {
            if (s[i] == '\\') cur += s[++i];                // take next char literally
            else if (s[i] == '#') { out.push_back(cur); cur.clear(); }
            else cur += s[i];
        }
        return out;
    }
};
```

**Time:** O(total chars) · **Space:** O(total). Like CSV quoting or SLIP/COBS framing in embedded serial protocols.

### Approach 2: Fixed-width binary length header
```cpp
class Codec {
public:
    string encode(const vector<string>& strs) {
        string out;
        for (const auto& s : strs) {
            uint32_t n = s.size();
            for (int b = 3; b >= 0; --b) out += char((n >> (8 * b)) & 0xFF);   // 4-byte big-endian length
            out += s;
        }
        return out;
    }
    vector<string> decode(const string& s) {
        vector<string> out;
        size_t i = 0;
        while (i + 4 <= s.size()) {
            uint32_t n = 0;
            for (int b = 0; b < 4; ++b) n = (n << 8) | (unsigned char)s[i + b];
            out.push_back(s.substr(i + 4, n));
            i += 4 + n;
        }
        return out;
    }
};
```

**Time:** O(total) · **Space:** O(total). No parsing of digits; exactly how binary protocols (TLV, protobuf length-delimited) work.

### Walkthrough
**Goal:** a reversible encoding that is unambiguous for *any* characters.

1. **Encode:** for each string append `<length>#<payload>`. E.g. `["ab", "c#d"]` → `"2#ab3#c#d"`.
2. **Decode:** start at `i = 0`.
   1. Find the first `#` at or after `i` — everything between is the decimal length.
   2. Parse the length with `stoul`.
   3. The payload is exactly the next `len` characters after the `#`, no matter what they contain.
   4. Advance `i` past the payload and repeat.

**Dry run** decoding `"2#ab3#c#d"`:

| i | '#' at | len | payload | next i |
|---|---|---|---|---|
| 0 | 1 | 2 | "ab" | 4 |
| 4 | 5 | 3 | "c#d" | 9 (end) |

The `#` inside `"c#d"` is never treated as a separator because we skip it by length.

**Edge cases:** empty list → `""` → decodes to `[]`; list with an empty string → `"0#"` → `[""]`.

## longest-consecutive-sequence

### Approach 1: Sort and scan
```cpp
class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        if (nums.empty()) return 0;
        ranges::sort(nums);
        int best = 1, cur = 1;
        for (size_t i = 1; i < nums.size(); ++i) {
            if (nums[i] == nums[i - 1]) continue;                 // duplicate: run unchanged
            if (nums[i] == nums[i - 1] + 1) ++cur;                // extends run
            else cur = 1;                                         // gap: new run
            best = max(best, cur);
        }
        return best;
    }
};
```

**Time:** O(n log n) · **Space:** O(1) extra. Simple and often accepted — but the problem asks for O(n).

### Approach 2: Union-Find on neighbouring values
```cpp
class Solution {
    unordered_map<int, int> parent, size_;
    int find(int x) { while (parent[x] != x) x = parent[x] = parent[parent[x]]; return x; }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (size_[a] < size_[b]) swap(a, b);
        parent[b] = a; size_[a] += size_[b];
    }
public:
    int longestConsecutive(vector<int>& nums) {
        for (int x : nums) { parent[x] = x; size_[x] = 1; }
        for (int x : nums)
            if (x != INT_MAX && parent.count(x + 1)) unite(x, x + 1);
        int best = 0;
        for (auto& [x, p] : parent) if (p == x) best = max(best, size_[x]);
        return best;
    }
};
```

**Time:** ≈O(n α(n)) · **Space:** O(n). Demonstrates DSU; heavier than needed.

### Walkthrough
**Goal:** O(n) by only counting runs from their **start**.

1. Put all numbers in an `unordered_set` (removes duplicates, O(1) lookups).
2. For each `x` in the set: if `x − 1` exists, `x` is in the middle of a run — skip it.
3. Otherwise `x` starts a run: count upward while `x + len` exists.
4. Track the best length.
5. **Why O(n)?** Each number is "walked over" by the inner while only from its run's start, so across all starts the inner loop runs at most n times total.

**Dry run** `[100, 4, 200, 1, 3, 2]` → set {100, 4, 200, 1, 3, 2}:

| x | x−1 in set? | run counted | best |
|---|---|---|---|
| 100 | no (99) | 100 → len 1 | 1 |
| 4 | yes (3) | skip | 1 |
| 200 | no | len 1 | 1 |
| 1 | no (0) | 1,2,3,4 → len 4 | **4** |
| 3 | yes | skip | 4 |
| 2 | yes | skip | 4 |

**Gotcha:** iterating over the original array (with duplicates like `[1,1,1,...]`) can redo work; iterate the set.
