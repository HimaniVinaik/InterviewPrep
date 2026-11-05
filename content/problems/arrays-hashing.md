# Arrays & Hashing

**Recognise it when:** you need to answer "have I seen X before?", count frequencies, group things by a key, or look up a complement in O(1).

**Core tools in C++:** `std::unordered_map`, `std::unordered_set`, fixed-size `std::array<int, 26>` for lowercase letters, sorting (`std::ranges::sort`) and prefix/suffix arrays.

**Mental checklist**
- Brute force is usually O(n²) pairs → a hash map turns the inner loop into an O(1) lookup.
- If the key space is small (letters, digits), use an array instead of a hash map — faster and cache-friendly.
- "Group by" problems → build a *canonical key* (sorted string, count signature).
- Need O(1) extra space? Think prefix/suffix passes or in-place marking.

## Contains Duplicate
- difficulty: Easy
- leetcode: 217
- slug: contains-duplicate

Given an integer array `nums`, return `true` if any value appears **at least twice**, and `false` if every element is distinct.

```text
Input: nums = [1,2,3,1]   Output: true
Input: nums = [1,2,3,4]   Output: false
```

### Hint
Track what you've already seen in a structure with O(1) membership tests.

### Solution
```cpp
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> seen;
        seen.reserve(nums.size());
        for (int x : nums) {
            // insert() returns {iterator, bool}; bool is false if x was already present
            if (!seen.insert(x).second) return true;
        }
        return false;
    }
};
```

### Explanation
Walk the array once and insert each value into a hash set. `insert` tells us whether the value was new, so the first failed insert means a duplicate.

Alternatives: sort then compare neighbours (O(n log n) time, O(1) extra space if you may mutate the input).

**Time:** O(n) average · **Space:** O(n)

## Valid Anagram
- difficulty: Easy
- leetcode: 242
- slug: valid-anagram

Given two strings `s` and `t` (lowercase English letters), return `true` if `t` is an anagram of `s`.

```text
Input: s = "anagram", t = "nagaram"   Output: true
Input: s = "rat", t = "car"           Output: false
```

### Hint
Anagrams have identical letter counts. The alphabet has only 26 letters.

### Solution
```cpp
class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) return false;
        array<int, 26> cnt{};               // value-initialised to zeros
        for (size_t i = 0; i < s.size(); ++i) {
            ++cnt[s[i] - 'a'];
            --cnt[t[i] - 'a'];
        }
        return ranges::all_of(cnt, [](int c) { return c == 0; });
    }
};
```

### Explanation
Increment for each char of `s`, decrement for each char of `t`. If every bucket returns to zero, the multisets of letters match.

Follow-up (Unicode): use `unordered_map<char32_t,int>` instead of a fixed array.

**Time:** O(n) · **Space:** O(1) (26 counters)

## Two Sum
- difficulty: Easy
- leetcode: 1
- slug: two-sum

Given an array `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. Exactly one solution exists; you may not use the same element twice.

```text
Input: nums = [2,7,11,15], target = 9   Output: [0,1]
```

### Hint
For each `x`, the partner you need is `target - x`. Have you seen it already?

### Solution
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> idx;        // value -> index
        for (int i = 0; i < (int)nums.size(); ++i) {
            int need = target - nums[i];
            if (auto it = idx.find(need); it != idx.end())   // C++17 if-init
                return {it->second, i};
            idx[nums[i]] = i;
        }
        return {};
    }
};
```

### Explanation
One pass: before storing the current number, check whether its complement is already in the map. Checking *before* inserting prevents pairing an element with itself.

This "complement lookup" idea is the seed of many problems (3Sum, 4Sum, subarray-sum-equals-k).

**Time:** O(n) · **Space:** O(n)

## Group Anagrams
- difficulty: Medium
- leetcode: 49
- slug: group-anagrams

Given an array of strings, group the anagrams together (any order).

```text
Input: ["eat","tea","tan","ate","nat","bat"]
Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
```

### Hint
Anagrams share a canonical form. What key would be identical for all of them?

### Solution
```cpp
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;
        for (auto& s : strs) {
            // Counting-sort signature: O(k) instead of O(k log k) sort
            array<int, 26> cnt{};
            for (char c : s) ++cnt[c - 'a'];
            string key;
            key.reserve(26 * 2);
            for (int c : cnt) { key += to_string(c); key += '#'; }
            groups[key].push_back(std::move(s));
        }
        vector<vector<string>> out;
        out.reserve(groups.size());
        for (auto& [_, g] : groups) out.push_back(std::move(g));
        return out;
    }
};
```

### Explanation
Map each word to a key that is equal for all anagrams. Two options:
- Sorted word (`"eat"` → `"aet"`) — simple, O(k log k) per word.
- Letter-count signature (`"1#0#0#…"`) — O(k) per word.

Note `std::move(s)` — we steal the strings out of the input instead of copying them.

**Time:** O(n·k) · **Space:** O(n·k)

## Top K Frequent Elements
- difficulty: Medium
- leetcode: 347
- slug: top-k-frequent-elements

Given an integer array `nums` and integer `k`, return the `k` most frequent elements. Better than O(n log n) is expected.

```text
Input: nums = [1,1,1,2,2,3], k = 2   Output: [1,2]
```

### Hint
Frequencies are bounded by `n`. Can you index buckets by frequency?

### Solution
```cpp
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> freq;
        for (int x : nums) ++freq[x];

        // bucket[f] = numbers that appear exactly f times
        vector<vector<int>> bucket(nums.size() + 1);
        for (auto [val, f] : freq) bucket[f].push_back(val);

        vector<int> out;
        for (int f = (int)nums.size(); f >= 1 && (int)out.size() < k; --f)
            for (int v : bucket[f]) {
                out.push_back(v);
                if ((int)out.size() == k) break;
            }
        return out;
    }
};
```

### Explanation
**Bucket sort by frequency:** a number's count is between 1 and n, so we create n+1 buckets and walk them from highest to lowest.

Alternative: a min-heap of size k (`priority_queue` with `greater<>`) gives O(n log k) — useful when the data is streaming.

**Time:** O(n) · **Space:** O(n)

## Product of Array Except Self
- difficulty: Medium
- leetcode: 238
- slug: product-of-array-except-self

Return an array `answer` where `answer[i]` is the product of all elements except `nums[i]`. No division allowed; O(n) time.

```text
Input: [1,2,3,4]   Output: [24,12,8,6]
```

### Hint
`answer[i] = (product of everything left of i) × (product of everything right of i)`.

### Solution
```cpp
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> ans(n, 1);
        int prefix = 1;
        for (int i = 0; i < n; ++i) {   // ans[i] = product of nums[0..i-1]
            ans[i] = prefix;
            prefix *= nums[i];
        }
        int suffix = 1;
        for (int i = n - 1; i >= 0; --i) { // multiply in product of nums[i+1..n-1]
            ans[i] *= suffix;
            suffix *= nums[i];
        }
        return ans;
    }
};
```

### Explanation
Two passes: the first stores prefix products in the output array, the second multiplies in a running suffix product. The output array doesn't count as extra space, so this is O(1) extra.

**Time:** O(n) · **Space:** O(1) extra

## Valid Sudoku
- difficulty: Medium
- leetcode: 36
- slug: valid-sudoku

Determine whether a partially filled 9×9 Sudoku board is valid: each row, column and 3×3 box must contain digits 1–9 without repetition. Empty cells are `'.'`.

### Hint
Each digit placement belongs to exactly one row, one column, and one box. Box index = `(r/3)*3 + c/3`.

### Solution
```cpp
class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& board) {
        // bitmasks: bit d set => digit d already used
        array<uint16_t, 9> row{}, col{}, box{};
        for (int r = 0; r < 9; ++r)
            for (int c = 0; c < 9; ++c) {
                char ch = board[r][c];
                if (ch == '.') continue;
                uint16_t bit = 1u << (ch - '0');
                int b = (r / 3) * 3 + c / 3;
                if ((row[r] | col[c] | box[b]) & bit) return false;
                row[r] |= bit; col[c] |= bit; box[b] |= bit;
            }
        return true;
    }
};
```

### Explanation
Instead of 27 hash sets, use 27 bitmasks (16-bit ints). Checking/setting a bit is one instruction — a nice embedded-flavoured optimisation to mention.

**Time:** O(81) = O(1) · **Space:** O(1)

## Encode and Decode Strings
- difficulty: Medium
- leetcode: 271
- slug: encode-and-decode-strings

Design an algorithm to encode a list of strings to a single string, and decode it back. Strings may contain **any** character, including delimiters.

### Hint
A plain delimiter fails if it appears in the data. Prefix each string with its length.

### Solution
```cpp
class Codec {
public:
    string encode(const vector<string>& strs) {
        string out;
        for (const auto& s : strs) {
            out += to_string(s.size());
            out += '#';
            out += s;
        }
        return out;
    }
    vector<string> decode(const string& s) {
        vector<string> out;
        size_t i = 0;
        while (i < s.size()) {
            size_t hash = s.find('#', i);
            size_t len = stoul(s.substr(i, hash - i));
            out.push_back(s.substr(hash + 1, len));
            i = hash + 1 + len;
        }
        return out;
    }
};
```

### Explanation
**Length-prefix framing** (`5#hello3#abc`): the decoder reads digits up to `#`, then consumes exactly `len` characters — so `#` inside the payload is harmless. This is exactly how network protocols (TLV, HTTP Content-Length, protobuf) frame messages.

**Time:** O(total chars) · **Space:** O(1) extra

## Longest Consecutive Sequence
- difficulty: Medium
- leetcode: 128
- slug: longest-consecutive-sequence

Given an unsorted array, return the length of the longest run of consecutive integers. Must run in O(n).

```text
Input: [100,4,200,1,3,2]   Output: 4   // 1,2,3,4
```

### Hint
Only start counting from numbers that are the *beginning* of a run (`x-1` not present).

### Solution
```cpp
class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        unordered_set<int> s(nums.begin(), nums.end());
        int best = 0;
        for (int x : s) {
            if (s.contains(x - 1)) continue;   // C++20: not the start of a run
            int len = 1;
            while (s.contains(x + len)) ++len;
            best = max(best, len);
        }
        return best;
    }
};
```

### Explanation
Each number is visited by the inner `while` at most once (only from its run's start), so the total work is O(n) despite the nested loop — an amortized-analysis argument interviewers like to hear.

Iterate over the **set**, not the array, so duplicates don't redo work.

**Time:** O(n) · **Space:** O(n)
