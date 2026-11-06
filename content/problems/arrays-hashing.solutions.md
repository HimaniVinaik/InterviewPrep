## contains-duplicate

### Approach 1: Brute force — compare every pair
**The idea:** take each number and compare it with every number after it. If any two match, there is a duplicate.

```cpp
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        int n = nums.size();

        // Pick the first number of the pair.
        for (int i = 0; i < n; i++) {
            // Compare it with every number AFTER it (so each pair is checked once).
            for (int j = i + 1; j < n; j++) {
                // Same value at two different positions = duplicate.
                if (nums[i] == nums[j]) {
                    return true;
                }
            }
        }

        // No pair matched.
        return false;
    }
};
```

**How it works**
1. The outer loop chooses position `i`.
2. The inner loop starts at `i + 1`, so we never compare a number with itself and never check the same pair twice.
3. The first time two values are equal we can stop — one duplicate is enough.

**Think of it like this:** you have a pile of cards and you hold each card up against every other card in the pile. It works, but it's slow when the pile is big.

**Cost:** Time **O(n²)** — about n²/2 comparisons (for 100 000 numbers that's 5 billion). Space **O(1)** — just two loop counters.

### Approach 2: Sort, then compare neighbours
**The idea:** after sorting, equal values sit next to each other, so we only need to compare each number with the one right before it.

```cpp
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Sorting puts equal values side by side: [3,1,3] -> [1,3,3].
        sort(nums.begin(), nums.end());

        // Compare each element with its left neighbour.
        for (int i = 1; i < (int)nums.size(); i++) {
            if (nums[i] == nums[i - 1]) {
                return true;
            }
        }

        return false;
    }
};
```

**How it works**
1. `sort` rearranges the array in increasing order.
2. If a value appears twice, the two copies must now be adjacent.
3. One pass comparing neighbours finds them.

**Think of it like this:** line people up by height — twins will end up standing next to each other, so you only look at neighbours.

**Cost:** Time **O(n log n)** for the sort (the scan is only O(n)). Space **O(1)** extra, but it changes the input array — ask the interviewer if that's allowed.

### Optimal: Hash set
**The idea:** walk through the numbers once and keep a set of values already seen. A set answers "have I seen this?" in O(1) on average.

```cpp
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Every value we have already looked at.
        unordered_set<int> seen;

        // Look at each number exactly once.
        for (int x : nums) {
            // Already in the set? Then x appeared before.
            if (seen.count(x) > 0) {
                return true;
            }
            // First time we meet x: remember it.
            seen.insert(x);
        }

        // Finished without finding any repeat.
        return false;
    }
};
```

**How it works**
1. Start with an empty set `seen`.
2. For each number `x`, first **check** the set, then **add** `x`.
3. If the check ever succeeds, `x` was added earlier → duplicate → return `true` immediately.
4. If we finish the loop, every value was new → return `false`.

**Think of it like this:** a guest list at a door. Each guest's name is checked against the list; if the name is already there, someone is trying to enter twice. Checking a well-organised list (a hash set) is instant, no matter how long it is.

**Why it's optimal:** every number must be looked at at least once, so O(n) time is the best possible. We trade O(n) memory for that speed.

**Cost:** Time **O(n)** on average. Space **O(n)** for the set.

## valid-anagram

### Approach 1: Sort both strings
**The idea:** two words are anagrams if they contain the same letters — so after sorting their letters, they must be identical.

```cpp
class Solution {
public:
    bool isAnagram(string s, string t) {
        // Different lengths can never be anagrams.
        if (s.size() != t.size()) {
            return false;
        }

        // "anagram" -> "aaagmnr", "nagaram" -> "aaagmnr"
        sort(s.begin(), s.end());
        sort(t.begin(), t.end());

        // Same sorted letters <=> same multiset of letters.
        return s == t;
    }
};
```

**How it works:** sorting turns any arrangement of the same letters into one standard ("canonical") form, so comparing the sorted strings compares the letters regardless of order.

**Think of it like this:** two bags of Scrabble tiles. Lay each bag's tiles out in alphabetical order and see if the two rows look the same.

**Cost:** Time **O(n log n)** for sorting. Space **O(1)** extra (we sort our own copies — the strings were passed by value).

### Approach 2: Hash map of counts
**The idea:** count every character in `s`, then "use up" those counts with the characters of `t`. Works for any characters, not just a–z.

```cpp
class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) {
            return false;
        }

        // count[c] = how many times c appears in s, minus how many in t.
        unordered_map<char, int> count;

        // Add one for every character of s.
        for (char c : s) {
            count[c]++;
        }

        // Remove one for every character of t.
        for (char c : t) {
            count[c]--;
            // t uses c more times than s has it.
            if (count[c] < 0) {
                return false;
            }
        }

        // Equal lengths and no count went negative => every count is exactly 0.
        return true;
    }
};
```

**How it works:** after the first loop, `count` describes the letters of `s`. The second loop removes `t`'s letters. If `t` ever needs a letter that `s` doesn't have (count goes below 0), they differ. Because the lengths are equal, "nothing went negative" also means "nothing is left over".

**Think of it like this:** `s` fills a shopping basket; `t` is a list of items to take back out. If you ever reach for an item that isn't in the basket, the lists don't match.

**Cost:** Time **O(n)**. Space **O(k)** for k distinct characters.

### Optimal: Fixed array of 26 counters
**The idea:** the input is only lowercase letters, so a plain array of 26 integers is the fastest possible "hash map".

```cpp
class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) {
            return false;
        }

        // cnt[0] is for 'a', cnt[1] for 'b', ... cnt[25] for 'z'. All start at 0.
        int cnt[26] = {0};

        for (int i = 0; i < (int)s.size(); i++) {
            // 'c' - 'a' turns a letter into its index: 'a'->0, 'b'->1, ...
            cnt[s[i] - 'a']++;   // letter from s: +1
            cnt[t[i] - 'a']--;   // letter from t: -1
        }

        // If every counter came back to zero, both strings have the same letters.
        for (int i = 0; i < 26; i++) {
            if (cnt[i] != 0) {
                return false;
            }
        }
        return true;
    }
};
```

**How it works**
1. One loop handles both strings: `+1` for each letter of `s`, `−1` for each letter of `t`.
2. A counter ends at 0 exactly when that letter appears equally often in both strings.
3. Any non-zero counter means a mismatch.

**Think of it like this:** 26 tally marks on a whiteboard — `s` adds a mark, `t` erases one. Anagrams leave a clean whiteboard.

**Why it's optimal:** every character must be read once (O(n)), and 26 counters is constant memory.

**Cost:** Time **O(n)**. Space **O(1)** (always 26 integers).

## two-sum

### Approach 1: Brute force — try every pair
**The idea:** check all pairs `(i, j)` and return the one whose sum is `target`.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        int n = nums.size();

        for (int i = 0; i < n; i++) {
            // j starts after i, so we never use the same element twice.
            for (int j = i + 1; j < n; j++) {
                if (nums[i] + nums[j] == target) {
                    return {i, j};
                }
            }
        }

        // The problem guarantees an answer, so we never get here.
        return {};
    }
};
```

**How it works:** two nested loops visit every pair once. It's correct and easy to explain, so it's a good first answer in an interview — then improve it.

**Think of it like this:** at a party, to find two people whose ages add to 50, you ask every possible couple. Exhausting!

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Sort indices, then two pointers
**The idea:** in a sorted list, a pointer at each end can find the pair by moving inward. We sort *indices* so we still know the original positions.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        int n = nums.size();

        // idx = [0, 1, 2, ..., n-1]
        vector<int> idx(n);
        for (int i = 0; i < n; i++) {
            idx[i] = i;
        }

        // Order the indices by the value they point to.
        sort(idx.begin(), idx.end(), [&](int a, int b) {
            return nums[a] < nums[b];
        });

        int left = 0;
        int right = n - 1;
        while (left < right) {
            int sum = nums[idx[left]] + nums[idx[right]];

            if (sum == target) {
                return {idx[left], idx[right]};
            }

            if (sum < target) {
                // Too small: the only way to grow the sum is a bigger left value.
                left++;
            } else {
                // Too big: use a smaller right value.
                right--;
            }
        }
        return {};
    }
};
```

**How it works:** after sorting, the smallest value is on the left and the largest on the right. If the sum is too small, the left value can't be part of any answer (even paired with the largest value it's too small), so we drop it. Symmetrically for too big.

**Think of it like this:** two people walking toward each other along a sorted shelf of weights, each step getting closer to the target total.

**Cost:** Time **O(n log n)** for sorting. Space **O(n)** for the index array.

### Optimal: One-pass hash map
**The idea:** while walking the array, for each number ask "have I already seen the number that would complete the pair?". A hash map from value → index answers that instantly.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // idx[value] = the index where we saw that value.
        unordered_map<int, int> idx;

        for (int i = 0; i < (int)nums.size(); i++) {
            // The partner nums[i] needs to reach target.
            int need = target - nums[i];

            // Did we see the partner earlier?
            if (idx.count(need) > 0) {
                return {idx[need], i};
            }

            // Not yet: remember this number and where it is.
            idx[nums[i]] = i;
        }
        return {};
    }
};
```

**How it works**
1. For position `i`, compute `need = target − nums[i]`.
2. Look `need` up in the map. If it's there, we have our two indices.
3. Otherwise store `nums[i] → i` so future numbers can find it.
4. We look up **before** storing, so a number can never be paired with itself.

**Think of it like this:** you're collecting puzzle pieces. Each time you pick one up, you check your box for its matching piece. If it isn't there, you drop this piece in the box and keep going.

**Why it's optimal:** each number is handled once with O(1) work, and we can't avoid reading every number.

**Cost:** Time **O(n)** on average. Space **O(n)** for the map.

## group-anagrams

### Approach 1: Compare each word with every existing group
**The idea:** put each word into the first group whose representative is an anagram of it; if none fits, start a new group.

```cpp
class Solution {
    // True if a and b contain exactly the same letters.
    bool isAnagram(const string& a, const string& b) {
        if (a.size() != b.size()) {
            return false;
        }
        int cnt[26] = {0};
        for (int i = 0; i < (int)a.size(); i++) {
            cnt[a[i] - 'a']++;
            cnt[b[i] - 'a']--;
        }
        for (int i = 0; i < 26; i++) {
            if (cnt[i] != 0) {
                return false;
            }
        }
        return true;
    }

public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        vector<vector<string>> groups;

        for (const string& word : strs) {
            bool placed = false;

            // Try every group we already have.
            for (vector<string>& group : groups) {
                // group[0] represents the whole group.
                if (isAnagram(group[0], word)) {
                    group.push_back(word);
                    placed = true;
                    break;
                }
            }

            // No existing group matched: start a new one.
            if (!placed) {
                groups.push_back({word});
            }
        }
        return groups;
    }
};
```

**How it works:** each word is compared against one representative per group using the 26-counter anagram check.

**Think of it like this:** sorting mail by hand — for each letter you walk along every pigeonhole to see where it belongs.

**Cost:** Time **O(n² · k)** in the worst case (every word in its own group). Space **O(n · k)**.

### Approach 2: Sorted word as the key
**The idea:** all anagrams become the same string once their letters are sorted ("eat", "tea", "ate" → "aet"). Use that sorted string as a hash-map key.

```cpp
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        // key (sorted letters) -> all words with those letters
        unordered_map<string, vector<string>> groups;

        for (const string& word : strs) {
            string key = word;
            sort(key.begin(), key.end());   // "tea" -> "aet"
            groups[key].push_back(word);    // creates the group if it doesn't exist
        }

        // Copy every group into the answer.
        vector<vector<string>> result;
        for (auto& entry : groups) {
            result.push_back(entry.second);
        }
        return result;
    }
};
```

**How it works:** the sorted string is a "fingerprint" shared by all anagrams and by nothing else, so the hash map collects each anagram family under one key.

**Think of it like this:** label each box with the alphabetised letters of a word; every anagram goes into the box with the same label.

**Cost:** Time **O(n · k log k)** (sorting each word of length k). Space **O(n · k)**.

### Optimal: Letter counts as the key
**The idea:** instead of sorting, build the key from the 26 letter counts — this costs O(k) per word instead of O(k log k).

```cpp
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;

        for (const string& word : strs) {
            // Count each letter of the word.
            int cnt[26] = {0};
            for (char c : word) {
                cnt[c - 'a']++;
            }

            // Turn the counts into a string key, e.g. "1#0#0#...#1#".
            // The '#' separators stop counts like 1,11 and 11,1 from looking the same.
            string key;
            for (int i = 0; i < 26; i++) {
                key += to_string(cnt[i]);
                key += '#';
            }

            groups[key].push_back(word);
        }

        vector<vector<string>> result;
        for (auto& entry : groups) {
            result.push_back(entry.second);
        }
        return result;
    }
};
```

**How it works**
1. Two words are anagrams exactly when their 26 letter counts are equal.
2. We encode the counts as a string so they can be a hash-map key.
3. Every word goes into the group for its key.

**Think of it like this:** describe each word by an ingredient list ("1 a, 1 e, 1 t"). Recipes with the same ingredient list belong together.

**Why it's optimal:** we must read every character (O(n · k)), and this does O(1) work per character plus O(26) per word.

**Cost:** Time **O(n · k)**. Space **O(n · k)**.

## top-k-frequent-elements

### Approach 1: Count, then sort by frequency
**The idea:** count how often each number appears, sort the (number, count) pairs by count, and take the first k.

```cpp
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        // freq[x] = how many times x appears.
        unordered_map<int, int> freq;
        for (int x : nums) {
            freq[x]++;
        }

        // Move the counts into a vector so we can sort them.
        vector<pair<int, int>> pairs;   // (number, count)
        for (auto& entry : freq) {
            pairs.push_back({entry.first, entry.second});
        }

        // Highest count first.
        sort(pairs.begin(), pairs.end(), [](const pair<int, int>& a, const pair<int, int>& b) {
            return a.second > b.second;
        });

        // Take the first k numbers.
        vector<int> result;
        for (int i = 0; i < k; i++) {
            result.push_back(pairs[i].first);
        }
        return result;
    }
};
```

**How it works:** counting is O(n); sorting the m distinct numbers by count is O(m log m).

**Think of it like this:** tally the votes, sort the candidates by votes, read off the top k.

**Cost:** Time **O(n + m log m)**. Space **O(m)** for m distinct numbers.

### Approach 2: Min-heap that keeps only k elements
**The idea:** keep the k most frequent numbers seen so far in a min-heap. When it grows past k, throw away the least frequent.

```cpp
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> freq;
        for (int x : nums) {
            freq[x]++;
        }

        // Min-heap ordered by count: the LEAST frequent sits on top.
        // Each entry is (count, number).
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> heap;

        for (auto& entry : freq) {
            heap.push({entry.second, entry.first});
            // More than k candidates? Drop the weakest one.
            if ((int)heap.size() > k) {
                heap.pop();
            }
        }

        // What's left are the k most frequent.
        vector<int> result;
        while (!heap.empty()) {
            result.push_back(heap.top().second);
            heap.pop();
        }
        return result;
    }
};
```

**How it works:** the heap is a "top-k club" with room for k members. A new candidate joins; if the club is over capacity, the weakest member leaves.

**Think of it like this:** a leaderboard with only k slots — every new score bumps off the lowest one.

**Cost:** Time **O(n + m log k)**. Space **O(m + k)**. Best when data streams in or k is small.

### Optimal: Bucket sort by frequency
**The idea:** a number can appear at most n times, so make n + 1 buckets where `bucket[f]` holds the numbers that appear exactly f times. Read buckets from the highest frequency down.

```cpp
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        int n = nums.size();

        // Step 1: count each number.
        unordered_map<int, int> freq;
        for (int x : nums) {
            freq[x]++;
        }

        // Step 2: bucket[f] = list of numbers that appear exactly f times.
        vector<vector<int>> bucket(n + 1);
        for (auto& entry : freq) {
            int number = entry.first;
            int count = entry.second;
            bucket[count].push_back(number);
        }

        // Step 3: walk from the highest possible frequency down to 1.
        vector<int> result;
        for (int f = n; f >= 1; f--) {
            for (int number : bucket[f]) {
                result.push_back(number);
                if ((int)result.size() == k) {
                    return result;   // got k numbers: done
                }
            }
        }
        return result;
    }
};
```

**How it works**
1. Count frequencies (O(n)).
2. Instead of sorting by frequency, drop each number into the bucket for its frequency (O(m)).
3. Scanning buckets from n down to 1 visits numbers from most to least frequent — sorted for free.

**Think of it like this:** shelves numbered 1 to n. Each number is placed on the shelf matching its count. To find the most popular, start at the top shelf and walk down.

**Why it's optimal:** O(n) total — we never sort, and every number must be counted at least once.

**Cost:** Time **O(n)**. Space **O(n)**.

## product-of-array-except-self

### Approach 1: Brute force — multiply everything else
**The idea:** for each position, multiply all the other numbers.

```cpp
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> answer(n, 1);

        for (int i = 0; i < n; i++) {
            // Multiply every number except the one at i.
            for (int j = 0; j < n; j++) {
                if (j != i) {
                    answer[i] *= nums[j];
                }
            }
        }
        return answer;
    }
};
```

**How it works:** a direct translation of the definition.

**Think of it like this:** for each person in a group photo, count everyone else by walking around the whole group again.

**Cost:** Time **O(n²)**. Space **O(1)** extra.

### Approach 2: Prefix and suffix arrays
**The idea:** the product of "everything except i" = (product of everything **left** of i) × (product of everything **right** of i). Precompute both.

```cpp
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();

        // left[i]  = nums[0] * ... * nums[i-1]   (1 if nothing on the left)
        // right[i] = nums[i+1] * ... * nums[n-1] (1 if nothing on the right)
        vector<int> left(n, 1);
        vector<int> right(n, 1);

        for (int i = 1; i < n; i++) {
            left[i] = left[i - 1] * nums[i - 1];
        }
        for (int i = n - 2; i >= 0; i--) {
            right[i] = right[i + 1] * nums[i + 1];
        }

        vector<int> answer(n);
        for (int i = 0; i < n; i++) {
            answer[i] = left[i] * right[i];
        }
        return answer;
    }
};
```

**How it works:** each `left[i]` reuses `left[i − 1]` (one multiplication), and likewise for `right`, so each array takes one pass.

**Think of it like this:** a running total from the front of a queue and another from the back; each person's answer is the two totals that meet at them.

**Cost:** Time **O(n)**. Space **O(n)** for the two helper arrays.

### Optimal: One output array + running products
**The idea:** same left × right idea, but store the left products directly in the answer and fold the right products in on a second pass with a single variable.

```cpp
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> ans(n, 1);

        // Pass 1 (left to right): ans[i] = product of everything LEFT of i.
        int prefix = 1;
        for (int i = 0; i < n; i++) {
            ans[i] = prefix;        // write first, so nums[i] itself is not included
            prefix *= nums[i];      // then include nums[i] for the next position
        }

        // Pass 2 (right to left): multiply in the product of everything RIGHT of i.
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) {
            ans[i] *= suffix;
            suffix *= nums[i];
        }

        return ans;
    }
};
```

**How it works**
1. After pass 1, `ans[i]` holds the left product.
2. Pass 2 walks backwards with `suffix` = product of everything to the right, multiplying it into `ans[i]`.
3. The order "use, then update" in both loops is what keeps `nums[i]` out of its own answer.

**Think of it like this:** the prefix-and-suffix version, but instead of writing both lists on paper you keep one list and carry the second total in your head.

**Why it's optimal:** O(n) time is required to read the input, and the only memory used (besides the required output) is two numbers.

**Cost:** Time **O(n)**. Space **O(1)** extra (the output array doesn't count).

## valid-sudoku

### Approach 1: Check rows, columns and boxes separately
**The idea:** do three independent checks — every row, every column, every 3×3 box — each with a fresh "seen" set.

```cpp
class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& board) {
        // Check each row.
        for (int r = 0; r < 9; r++) {
            unordered_set<char> seen;
            for (int c = 0; c < 9; c++) {
                char d = board[r][c];
                if (d == '.') {
                    continue;   // empty cell
                }
                if (seen.count(d) > 0) {
                    return false;
                }
                seen.insert(d);
            }
        }

        // Check each column.
        for (int c = 0; c < 9; c++) {
            unordered_set<char> seen;
            for (int r = 0; r < 9; r++) {
                char d = board[r][c];
                if (d == '.') {
                    continue;
                }
                if (seen.count(d) > 0) {
                    return false;
                }
                seen.insert(d);
            }
        }

        // Check each 3x3 box. (boxRow, boxCol) is the top-left cell of the box.
        for (int boxRow = 0; boxRow < 9; boxRow += 3) {
            for (int boxCol = 0; boxCol < 9; boxCol += 3) {
                unordered_set<char> seen;
                for (int r = boxRow; r < boxRow + 3; r++) {
                    for (int c = boxCol; c < boxCol + 3; c++) {
                        char d = board[r][c];
                        if (d == '.') {
                            continue;
                        }
                        if (seen.count(d) > 0) {
                            return false;
                        }
                        seen.insert(d);
                    }
                }
            }
        }

        return true;
    }
};
```

**How it works:** each of the 27 units (9 rows, 9 columns, 9 boxes) gets its own set; a repeated digit within a unit makes the board invalid.

**Think of it like this:** three inspectors walk the board — one checks rows, one columns, one boxes.

**Cost:** Time **O(81 × 3) = O(1)**. Space **O(1)** (a set of at most 9 digits).

### Approach 2: One pass with string keys
**The idea:** visit every cell once and record three facts like "5 in row 0", "5 in col 3", "5 in box 1". If any fact was already recorded, the board is invalid.

```cpp
class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& board) {
        unordered_set<string> seen;

        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                char d = board[r][c];
                if (d == '.') {
                    continue;
                }

                // Three human-readable facts about this digit.
                string inRow = string(1, d) + " in row " + to_string(r);
                string inCol = string(1, d) + " in col " + to_string(c);
                string inBox = string(1, d) + " in box " + to_string(r / 3) + "-" + to_string(c / 3);

                // Any fact already known means a repeat.
                if (seen.count(inRow) > 0 || seen.count(inCol) > 0 || seen.count(inBox) > 0) {
                    return false;
                }
                seen.insert(inRow);
                seen.insert(inCol);
                seen.insert(inBox);
            }
        }
        return true;
    }
};
```

**How it works:** the strings encode (digit, unit) pairs, so one set handles all 27 units at once.

**Think of it like this:** a notebook of sentences; if you're about to write a sentence that's already in the notebook, something is repeated.

**Cost:** Time **O(1)** (81 cells). Space **O(1)** (at most 243 strings) — but building strings is slow in practice.

### Optimal: Bitmasks
**The idea:** for each row, column and box keep a 9-bit "used digits" mask. Checking and setting a bit is a single machine instruction.

```cpp
class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& board) {
        // rows[r]: bit d is 1 if digit d is already used in row r. Same idea for cols and boxes.
        int rows[9] = {0};
        int cols[9] = {0};
        int boxes[9] = {0};

        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                char ch = board[r][c];
                if (ch == '.') {
                    continue;
                }

                int digit = ch - '0';        // '5' -> 5
                int bit = 1 << digit;        // 5 -> binary 100000
                int b = (r / 3) * 3 + c / 3; // which of the 9 boxes (0..8)

                // Is this digit already used in the row, column or box?
                if ((rows[r] & bit) != 0 || (cols[c] & bit) != 0 || (boxes[b] & bit) != 0) {
                    return false;
                }

                // Mark the digit as used in all three.
                rows[r] |= bit;
                cols[c] |= bit;
                boxes[b] |= bit;
            }
        }
        return true;
    }
};
```

**How it works**
1. Each digit 1–9 owns one bit position.
2. `mask & bit` tests whether the digit is already present; `mask |= bit` records it.
3. Box number: `(r / 3) * 3 + c / 3` numbers the boxes 0..8 left-to-right, top-to-bottom.

**Think of it like this:** each row, column and box has a panel of 9 light switches. Placing a digit flips its switch on; if the switch was already on, that digit was used twice.

**Why it's optimal:** the board has a fixed 81 cells, and each costs a handful of bit operations — about as fast as this can be.

**Cost:** Time **O(1)**. Space **O(1)** (27 integers).

## encode-and-decode-strings

### Approach 1: Escape a delimiter
**The idea:** separate strings with `#`. If a string itself contains `#` (or the escape character `\`), put a `\` in front so the decoder knows it's data.

```cpp
class Codec {
public:
    string encode(const vector<string>& strs) {
        string out;
        for (const string& s : strs) {
            for (char c : s) {
                // Special characters get a backslash in front of them.
                if (c == '#' || c == '\\') {
                    out += '\\';
                }
                out += c;
            }
            // An unescaped '#' marks the end of one string.
            out += '#';
        }
        return out;
    }

    vector<string> decode(const string& s) {
        vector<string> result;
        string current;
        for (int i = 0; i < (int)s.size(); i++) {
            if (s[i] == '\\') {
                // Escaped character: take the NEXT character literally.
                i++;
                current += s[i];
            } else if (s[i] == '#') {
                // Real separator: one string is complete.
                result.push_back(current);
                current.clear();
            } else {
                current += s[i];
            }
        }
        return result;
    }
};
```

**How it works:** escaping guarantees that an unescaped `#` can only be a separator.

**Think of it like this:** like writing `\"` inside a quoted string in code so the quote isn't mistaken for the end.

**Cost:** Time **O(total characters)**. Space **O(total characters)**.

### Approach 2: Fixed 4-byte length header
**The idea:** before each string, write its length as exactly 4 bytes. The decoder always reads 4 bytes, then that many characters.

```cpp
class Codec {
public:
    string encode(const vector<string>& strs) {
        string out;
        for (const string& s : strs) {
            unsigned int len = s.size();
            // Write the length as 4 bytes, most significant byte first.
            out += char((len >> 24) & 0xFF);
            out += char((len >> 16) & 0xFF);
            out += char((len >> 8) & 0xFF);
            out += char(len & 0xFF);
            out += s;
        }
        return out;
    }

    vector<string> decode(const string& s) {
        vector<string> result;
        int i = 0;
        while (i + 4 <= (int)s.size()) {
            // Rebuild the 4-byte length.
            unsigned int len = 0;
            for (int b = 0; b < 4; b++) {
                len = (len << 8) | (unsigned char)s[i + b];
            }
            i += 4;
            // The next `len` characters are the string, whatever they contain.
            result.push_back(s.substr(i, len));
            i += len;
        }
        return result;
    }
};
```

**How it works:** a fixed-size header means the decoder never has to search for anything — it always knows how much to read.

**Think of it like this:** every parcel has a label stating its exact weight, so you know exactly how much to unload.

**Cost:** Time **O(total characters)**. Space **O(total characters)**. This is how binary network protocols frame messages.

### Optimal: Length + '#' prefix
**The idea:** write each string as `<length>#<content>`. The decoder reads digits up to the `#`, then takes exactly `length` characters, so `#` inside the content is harmless.

```cpp
class Codec {
public:
    string encode(const vector<string>& strs) {
        string out;
        for (const string& s : strs) {
            out += to_string(s.size());   // e.g. "5"
            out += '#';                   // end of the length
            out += s;                     // the content itself
        }
        return out;
    }

    vector<string> decode(const string& s) {
        vector<string> result;
        int i = 0;
        while (i < (int)s.size()) {
            // Find the '#' that ends the length digits.
            int hash = i;
            while (s[hash] != '#') {
                hash++;
            }

            // The digits between i and hash are the length.
            int len = stoi(s.substr(i, hash - i));

            // The content starts right after '#'.
            result.push_back(s.substr(hash + 1, len));

            // Jump to the start of the next encoded string.
            i = hash + 1 + len;
        }
        return result;
    }
};
```

**How it works**
1. `["ab", "c#d"]` encodes to `"2#ab3#c#d"`.
2. The decoder reads `2`, takes 2 chars `"ab"`, then reads `3`, takes 3 chars `"c#d"` — the `#` inside is skipped over because we jump by length.

**Think of it like this:** a chapter book where every chapter starts with "this chapter is N pages long" — you can skip straight to the next chapter without reading the words.

**Why it's optimal:** every character is written and read once; the length prefix uses only a few extra characters per string.

**Cost:** Time **O(total characters)**. Space **O(total characters)**.

## longest-consecutive-sequence

### Approach 1: Sort, then count runs
**The idea:** after sorting, consecutive numbers sit next to each other, so we can count runs in one scan.

```cpp
class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        if (nums.empty()) {
            return 0;
        }

        sort(nums.begin(), nums.end());

        int best = 1;      // longest run found so far
        int current = 1;   // length of the run ending at nums[i]

        for (int i = 1; i < (int)nums.size(); i++) {
            if (nums[i] == nums[i - 1]) {
                // Duplicate: doesn't extend or break the run.
                continue;
            }
            if (nums[i] == nums[i - 1] + 1) {
                // Next number in sequence: extend the run.
                current++;
            } else {
                // Gap: start a new run.
                current = 1;
            }
            best = max(best, current);
        }
        return best;
    }
};
```

**How it works:** sorted order turns "consecutive values" into "adjacent positions"; duplicates are skipped so `[1, 2, 2, 3]` still counts as a run of 3.

**Think of it like this:** arrange numbered tickets in order, then walk along counting how long each unbroken stretch is.

**Cost:** Time **O(n log n)**. Space **O(1)** extra. Simple, but the problem asks for O(n).

### Approach 2: Hash set, count from every number (too slow)
**The idea:** put everything in a set, and from *every* number count upward while the next number exists.

```cpp
class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        unordered_set<int> s(nums.begin(), nums.end());
        int best = 0;

        for (int x : s) {
            int length = 1;
            // Count x+1, x+2, ... as long as they exist.
            while (s.count(x + length) > 0) {
                length++;
            }
            best = max(best, length);
        }
        return best;
    }
};
```

**How it works:** correct, but a run of length L gets re-counted from each of its L members, so `[1..n]` costs 1 + 2 + … + n = O(n²). Seeing *why* this is slow leads directly to the optimal fix.

**Think of it like this:** every person in a queue counts the people behind them — lots of repeated counting.

**Cost:** Time **O(n²)** worst case. Space **O(n)**.

### Optimal: Hash set, count only from the start of each run
**The idea:** only start counting at a number that **begins** a run (its predecessor `x − 1` is not in the set). Then every number is counted once.

```cpp
class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        // All numbers, duplicates removed, with O(1) lookups.
        unordered_set<int> s(nums.begin(), nums.end());
        int best = 0;

        for (int x : s) {
            // If x-1 exists, x is in the middle of a run — someone else will count it.
            if (s.count(x - 1) > 0) {
                continue;
            }

            // x starts a run: count x, x+1, x+2, ...
            int len = 1;
            while (s.count(x + len) > 0) {
                len++;
            }

            best = max(best, len);
        }
        return best;
    }
};
```

**How it works**
1. `[100, 4, 200, 1, 3, 2]` → starts are 100, 200 and 1 (because 99, 199 and 0 are missing).
2. From 1 we count 1, 2, 3, 4 → length 4. 3 and 2 are skipped because they aren't starts.
3. Each number is walked over by the inner loop at most once (only from its run's start), so the total work is O(n) even though there are two loops.

**Think of it like this:** in each queue, only the person at the **front** counts the line. Everyone else waits, so nobody is counted twice.

**Why it's optimal:** we read each number O(1) times, and reading the input is unavoidable.

**Cost:** Time **O(n)** on average. Space **O(n)** for the set.
