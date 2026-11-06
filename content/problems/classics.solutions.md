## fizz-buzz

### Approach 1: Classic if / else-if chain
**The idea:** check "divisible by 15" first, then 3, then 5, otherwise the number itself.

```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> out;
        for (int i = 1; i <= n; i++) {
            if (i % 15 == 0) {
                out.push_back("FizzBuzz");     // must come first: 15 is divisible by 3 and 5
            } else if (i % 3 == 0) {
                out.push_back("Fizz");
            } else if (i % 5 == 0) {
                out.push_back("Buzz");
            } else {
                out.push_back(to_string(i));
            }
        }
        return out;
    }
};
```

**How it works:** the order of checks matters — testing 3 before 15 would print "Fizz" for 15.

**Think of it like this:** a sorting machine that checks the most specific rule first.

**Cost:** Time **O(n)**. Space **O(1)** extra.

### Approach 2: Counters instead of modulo
**The idea:** division is slow on small CPUs. Count up to 3 and to 5 instead and reset.

```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> out;
        int three = 0;
        int five = 0;
        for (int i = 1; i <= n; i++) {
            three++;
            five++;
            string s;
            if (three == 3) {
                s += "Fizz";
                three = 0;
            }
            if (five == 5) {
                s += "Buzz";
                five = 0;
            }
            if (s.empty()) {
                s = to_string(i);
            }
            out.push_back(s);
        }
        return out;
    }
};
```

**How it works:** each counter hits its limit exactly on the multiples.

**Think of it like this:** two metronomes ticking every 3 and every 5 beats.

**Cost:** Time **O(n)**. Space **O(1)** extra. Good to mention for microcontrollers without a divide instruction.

### Approach 3: Data-driven rules table
**The idea:** put the rules in a list so adding "7 → Bazz" is a one-line change.

```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        const vector<pair<int, string>> rules = {{3, "Fizz"}, {5, "Buzz"}};
        vector<string> out;
        for (int i = 1; i <= n; i++) {
            string s;
            for (const pair<int, string>& rule : rules) {
                if (i % rule.first == 0) {
                    s += rule.second;
                }
            }
            if (s.empty()) {
                s = to_string(i);
            }
            out.push_back(s);
        }
        return out;
    }
};
```

**How it works:** rules are applied in order and their words concatenated.

**Think of it like this:** a recipe card you can extend without rewriting the kitchen.

**Cost:** Time **O(n · rules)**. Space **O(rules)**. Shows you think about extensibility.

### Optimal: Build the word by concatenation
**The idea:** append "Fizz" for multiples of 3 and "Buzz" for multiples of 5; if nothing was appended, use the number.

```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> out;
        out.reserve(n);                     // one allocation for the whole vector
        for (int i = 1; i <= n; i++) {
            string s;
            if (i % 3 == 0) {
                s += "Fizz";
            }
            if (i % 5 == 0) {
                s += "Buzz";                // 15 gets both: "FizzBuzz"
            }
            if (s.empty()) {
                s = to_string(i);           // neither rule applied
            }
            out.push_back(s);
        }
        return out;
    }
};
```

**How it works**
1. Independent `if`s (not `else if`) let 15 collect both words.
2. Empty string → use the number.
3. `reserve` avoids repeated reallocation.

**Think of it like this:** two stamps — you press each one if it applies, and if the page is still blank you write the number.

**Why it's optimal:** O(n), no special 15 case, and easy to extend.

**Cost:** Time **O(n)**. Space **O(1)** extra (besides the output).

## two-sum

### Approach 1: Brute force — every pair
**The idea:** try every pair (i, j) with i < j.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        int n = nums.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (nums[i] + nums[j] == target) {
                    return {i, j};
                }
            }
        }
        return {};
    }
};
```

**How it works:** checks all n(n−1)/2 pairs.

**Think of it like this:** introducing every guest at a party to every other guest.

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Sort (value, index) pairs + two pointers
**The idea:** sort a copy that remembers original indices; move two pointers inwards depending on whether the sum is too small or too big.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        vector<pair<int, int>> v;              // (value, original index)
        for (int i = 0; i < (int)nums.size(); i++) {
            v.push_back({nums[i], i});
        }
        sort(v.begin(), v.end());

        int l = 0;
        int r = v.size() - 1;
        while (l < r) {
            int sum = v[l].first + v[r].first;
            if (sum == target) {
                return {min(v[l].second, v[r].second), max(v[l].second, v[r].second)};
            }
            if (sum < target) {
                l++;                           // need a bigger sum
            } else {
                r--;                           // need a smaller sum
            }
        }
        return {};
    }
};
```

**How it works:** sorted order lets each comparison rule out a whole row or column of pairs.

**Think of it like this:** two people walking towards each other along a sorted line until their numbers add up.

**Cost:** Time **O(n log n)**. Space **O(n)**.

### Optimal: One pass with a hash map
**The idea:** for each number, the partner you need is `target − x`. Remember every number you've seen with its index; check whether the partner is already there.

```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;            // value → index
        for (int i = 0; i < (int)nums.size(); i++) {
            int need = target - nums[i];         // the partner we're looking for
            auto it = seen.find(need);
            if (it != seen.end()) {
                return {it->second, i};          // partner seen earlier
            }
            seen[nums[i]] = i;                   // remember this number for later
        }
        return {};
    }
};
```

**How it works**
1. Look up the partner before inserting the current number (so a number isn't paired with itself).
2. Insert the current number.

**Think of it like this:** at a dance, each person checks the list "is my partner already here?" before writing their own name on it.

**Why it's optimal:** one pass, O(1) average lookups.

**Cost:** Time **O(n)** average. Space **O(n)**.

## reverse-string

### Approach 1: Recursion
**The idea:** swap the outer pair, then reverse the inside.

```cpp
class Solution {
public:
    void reverseString(vector<char>& s) {
        reverseRange(s, 0, (int)s.size() - 1);
    }

private:
    void reverseRange(vector<char>& s, int l, int r) {
        if (l >= r) {
            return;                 // 0 or 1 characters left
        }
        swap(s[l], s[r]);
        reverseRange(s, l + 1, r - 1);
    }
};
```

**How it works:** each call handles one pair.

**Think of it like this:** peeling the outer layer of an onion and passing the rest on.

**Cost:** Time **O(n)**. Space **O(n)** call stack.

### Approach 2: XOR swap (no temporary variable)
**The idea:** `a ^= b; b ^= a; a ^= b` swaps two values without a temporary — a classic trick (but slower than `swap` on modern CPUs).

```cpp
class Solution {
public:
    void reverseString(vector<char>& s) {
        int l = 0;
        int r = (int)s.size() - 1;
        while (l < r) {
            s[l] ^= s[r];      // l = a ^ b
            s[r] ^= s[l];      // r = b ^ (a ^ b) = a
            s[l] ^= s[r];      // l = (a ^ b) ^ a = b
            l++;
            r--;
        }
    }
};
```

**How it works:** XOR is its own inverse. Never use it when the two positions could be the same (it zeroes the value) — `l < r` prevents that.

**Think of it like this:** a party trick; know it, don't ship it.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 3: Standard library
**The idea:** `std::reverse` does exactly this.

```cpp
class Solution {
public:
    void reverseString(vector<char>& s) {
        reverse(s.begin(), s.end());
    }
};
```

**How it works:** the library uses the two-pointer swap internally.

**Think of it like this:** using the tool that already exists.

**Cost:** Time **O(n)**. Space **O(1)**. Say it, then write the manual version.

### Optimal: Two pointers swapping inwards
**The idea:** swap the first and last characters, move both pointers inwards, repeat until they meet.

```cpp
class Solution {
public:
    void reverseString(vector<char>& s) {
        int l = 0;                       // left end
        int r = (int)s.size() - 1;       // right end
        while (l < r) {
            swap(s[l], s[r]);            // exchange the outer pair
            l++;
            r--;
        }
    }
};
```

**How it works**
1. `l` from the left, `r` from the right.
2. Swap, then move inwards.
3. Stop when they meet (the middle character stays put).

**Think of it like this:** two people at opposite ends of a row swapping seats and walking towards each other.

**Why it's optimal:** n/2 swaps, O(1) memory, in place.

**Cost:** Time **O(n)**. Space **O(1)**.

## palindrome-number

### Approach 1: Convert to a string
**The idea:** turn the number into text and compare it with its reverse.

```cpp
class Solution {
public:
    bool isPalindrome(int x) {
        string s = to_string(x);                // "-121" is never a palindrome
        string reversed(s.rbegin(), s.rend());
        return s == reversed;
    }
};
```

**How it works:** strings make reversing easy.

**Think of it like this:** writing the number down and reading it backwards.

**Cost:** Time **O(digits)**. Space **O(digits)**. The follow-up asks to avoid strings.

### Approach 2: Reverse the whole number (use 64 bits)
**The idea:** reverse all the digits in a `long long` (so it can't overflow) and compare.

```cpp
class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0) {
            return false;
        }
        long long reversed = 0;
        int original = x;
        while (x > 0) {
            reversed = reversed * 10 + x % 10;
            x /= 10;
        }
        return reversed == original;
    }
};
```

**How it works:** a palindrome equals its reverse.

**Think of it like this:** spelling the number backwards digit by digit.

**Cost:** Time **O(digits)**. Space **O(1)**.

### Optimal: Reverse only half the number
**The idea:** pop digits from the right into `rev` until `rev` is at least as big as what's left of x. Then the two halves should match.

```cpp
class Solution {
public:
    bool isPalindrome(int x) {
        // Negative numbers, and numbers ending in 0 (except 0 itself), can't be palindromes.
        if (x < 0 || (x % 10 == 0 && x != 0)) {
            return false;
        }
        int rev = 0;                    // the reversed right half
        while (x > rev) {               // stop at the middle
            rev = rev * 10 + x % 10;    // move the last digit of x onto rev
            x /= 10;
        }
        // Even digit count: halves equal. Odd: drop the middle digit from rev.
        return x == rev || x == rev / 10;
    }
};
```

**How it works**
1. `12321`: x → 12, rev → 123.
2. Odd length: compare `x` with `rev / 10` (12 == 12).
3. Only half the digits are reversed, so `rev` can't overflow.

**Think of it like this:** folding a strip of paper in the middle and checking the halves line up.

**Why it's optimal:** no strings, no overflow, half the work.

**Cost:** Time **O(digits)**. Space **O(1)**.

## fibonacci-number

### Approach 1: Naive recursion
**The idea:** `F(n) = F(n−1) + F(n−2)`, directly.

```cpp
class Solution {
public:
    int fib(int n) {
        if (n < 2) {
            return n;          // F(0) = 0, F(1) = 1
        }
        return fib(n - 1) + fib(n - 2);
    }
};
```

**How it works:** the definition, but `fib(n−2)` is computed again inside `fib(n−1)`.

**Think of it like this:** a family tree that doubles at every generation.

**Cost:** Time **O(2ⁿ)** (≈ 1.6ⁿ). Space **O(n)**.

### Approach 2: Memoisation
**The idea:** remember each `F(i)` the first time you compute it.

```cpp
class Solution {
public:
    int fib(int n) {
        memo.assign(n + 1, -1);
        return f(n);
    }

private:
    vector<int> memo;

    int f(int i) {
        if (i < 2) {
            return i;
        }
        if (memo[i] != -1) {
            return memo[i];
        }
        memo[i] = f(i - 1) + f(i - 2);
        return memo[i];
    }
};
```

**How it works:** each value is computed once.

**Think of it like this:** writing answers on a whiteboard so nobody recomputes them.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 3: Fast doubling (O(log n))
**The idea:** `F(2k) = F(k) · (2F(k+1) − F(k))` and `F(2k+1) = F(k)² + F(k+1)²`. Halve n at each step.

```cpp
class Solution {
public:
    int fib(int n) {
        return (int)pairFor(n).first;
    }

private:
    // Returns {F(n), F(n + 1)}.
    pair<long long, long long> pairFor(int n) {
        if (n == 0) {
            return {0, 1};
        }
        pair<long long, long long> half = pairFor(n / 2);
        long long a = half.first;           // F(k)
        long long b = half.second;          // F(k + 1)
        long long even = a * (2 * b - a);   // F(2k)
        long long odd = a * a + b * b;      // F(2k + 1)
        if (n % 2 == 0) {
            return {even, odd};
        }
        return {odd, even + odd};
    }
};
```

**How it works:** like fast exponentiation, n halves each call.

**Think of it like this:** jumping to F(2k) straight from F(k) instead of walking every step.

**Cost:** Time **O(log n)**. Space **O(log n)**.

### Optimal: Two rolling variables
**The idea:** keep only the last two Fibonacci numbers and slide forward.

```cpp
class Solution {
public:
    int fib(int n) {
        int a = 0;     // F(i)
        int b = 1;     // F(i + 1)
        for (int i = 0; i < n; i++) {
            int next = a + b;   // F(i + 2)
            a = b;
            b = next;
        }
        return a;      // after n steps, a = F(n)
    }
};
```

**How it works**
1. Start with F(0) and F(1).
2. Each loop moves the pair one step: (F(i), F(i+1)) → (F(i+1), F(i+2)).

**Think of it like this:** walking up stairs while remembering only the last two steps.

**Why it's optimal:** O(n) time, O(1) memory, simplest correct answer (fast doubling only matters for huge n).

**Cost:** Time **O(n)**. Space **O(1)**.

## roman-to-integer

### Approach 1: Replace subtractive pairs first
**The idea:** IV, IX, XL, XC, CD and CM are the only subtractive pairs. Add their values, remove them, then add the remaining single symbols.

```cpp
class Solution {
public:
    int romanToInt(string s) {
        const vector<pair<string, int>> pairs = {
            {"IV", 4}, {"IX", 9}, {"XL", 40}, {"XC", 90}, {"CD", 400}, {"CM", 900}};
        int total = 0;
        for (const pair<string, int>& p : pairs) {
            size_t pos = s.find(p.first);
            while (pos != string::npos) {
                total += p.second;
                s.replace(pos, 2, "");             // remove the pair
                pos = s.find(p.first);
            }
        }
        for (char c : s) {
            total += value(c);
        }
        return total;
    }

private:
    int value(char c) {
        switch (c) {
            case 'I': return 1;
            case 'V': return 5;
            case 'X': return 10;
            case 'L': return 50;
            case 'C': return 100;
            case 'D': return 500;
            case 'M': return 1000;
        }
        return 0;
    }
};
```

**How it works:** after removing subtractive pairs, every symbol is simply added.

**Think of it like this:** first handling the tricky words, then reading the rest normally.

**Cost:** Time **O(n²)** worst case for repeated `find`/`replace`. Space **O(1)**.

### Approach 2: Scan right to left
**The idea:** walk from the right. If a symbol is smaller than the one to its right, subtract it; otherwise add it.

```cpp
class Solution {
public:
    int romanToInt(string s) {
        int total = 0;
        int previous = 0;                  // value of the symbol to the right
        for (int i = s.size() - 1; i >= 0; i--) {
            int v = value(s[i]);
            if (v < previous) {
                total -= v;                // e.g. the I in IV
            } else {
                total += v;
            }
            previous = v;
        }
        return total;
    }

private:
    int value(char c) {
        switch (c) {
            case 'I': return 1;
            case 'V': return 5;
            case 'X': return 10;
            case 'L': return 50;
            case 'C': return 100;
            case 'D': return 500;
            case 'M': return 1000;
        }
        return 0;
    }
};
```

**How it works:** the same rule seen from the other side.

**Think of it like this:** reading the number backwards and spotting "small before big".

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Left-to-right with look-ahead
**The idea:** add each symbol's value, unless it's smaller than the next symbol — then subtract it (IV = −1 + 5).

```cpp
class Solution {
public:
    int romanToInt(string s) {
        int total = 0;
        for (size_t i = 0; i < s.size(); i++) {
            int v = val(s[i]);
            bool nextIsBigger = (i + 1 < s.size()) && (v < val(s[i + 1]));
            if (nextIsBigger) {
                total -= v;                // subtractive notation: IV, IX, XL, ...
            } else {
                total += v;
            }
        }
        return total;
    }

private:
    static int val(char c) {
        switch (c) {
            case 'I': return 1;
            case 'V': return 5;
            case 'X': return 10;
            case 'L': return 50;
            case 'C': return 100;
            case 'D': return 500;
            case 'M': return 1000;
        }
        return 0;
    }
};
```

**How it works**
1. `MCMXCIV`: M(+1000) C(−100, next is M) M(+1000) X(−10) C(+100) I(−1) V(+5) = 1994.

**Think of it like this:** a small symbol before a big one is a "discount" on the big one.

**Why it's optimal:** one pass, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## longest-common-prefix

### Approach 1: Horizontal scanning
**The idea:** start with the first word as the prefix; shorten it until every other word starts with it.

```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        string prefix = strs[0];
        for (size_t k = 1; k < strs.size(); k++) {
            // Shrink prefix until strs[k] starts with it.
            while (strs[k].compare(0, prefix.size(), prefix) != 0) {
                prefix.pop_back();
                if (prefix.empty()) {
                    return "";
                }
            }
        }
        return prefix;
    }
};
```

**How it works:** the prefix can only get shorter.

**Think of it like this:** trimming a key until it fits every lock.

**Cost:** Time **O(S)** for S total characters. Space **O(1)** extra.

### Approach 2: Sort, then compare only the first and last words
**The idea:** after sorting, the first and last words are the most different; their common prefix is everyone's.

```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        sort(strs.begin(), strs.end());
        const string& first = strs.front();
        const string& last = strs.back();
        size_t i = 0;
        while (i < first.size() && i < last.size() && first[i] == last[i]) {
            i++;
        }
        return first.substr(0, i);
    }
};
```

**How it works:** any word in between shares at least what the extremes share.

**Think of it like this:** in a dictionary, the first and last words on a page share the page's prefix.

**Cost:** Time **O(n log n · L)** for sorting. Space **O(1)** extra.

### Approach 3: Binary search on the prefix length
**The idea:** "do all words share the first `len` characters?" is true up to some length and false after. Binary search it.

```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        int shortest = INT_MAX;
        for (const string& s : strs) {
            shortest = min(shortest, (int)s.size());
        }
        int lo = 0;
        int hi = shortest;
        while (lo < hi) {
            int mid = lo + (hi - lo + 1) / 2;       // try a longer prefix
            if (allStartWith(strs, mid)) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }
        return strs[0].substr(0, lo);
    }

private:
    bool allStartWith(const vector<string>& strs, int len) {
        for (const string& s : strs) {
            if (s.compare(0, len, strs[0], 0, len) != 0) {
                return false;
            }
        }
        return true;
    }
};
```

**How it works:** standard "binary search on the answer".

**Think of it like this:** guessing the prefix length higher or lower.

**Cost:** Time **O(S log L)**. Space **O(1)**.

### Optimal: Vertical scanning (column by column)
**The idea:** compare the i-th character of every word; stop at the first column where any word differs or ends.

```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        if (strs.empty()) {
            return "";
        }
        for (size_t i = 0; i < strs[0].size(); i++) {
            char c = strs[0][i];                        // the character every word must have
            for (size_t k = 1; k < strs.size(); k++) {
                if (i == strs[k].size() || strs[k][i] != c) {
                    return strs[0].substr(0, i);        // word k ends or differs here
                }
            }
        }
        return strs[0];                                 // the whole first word is shared
    }
};
```

**How it works**
1. Column i: all words must have the same character.
2. Stop at the first mismatch or the end of any word.

**Think of it like this:** reading all the words stacked on top of each other, column by column.

**Why it's optimal:** stops at the first mismatch, never looks past the shortest word, no sorting.

**Cost:** Time **O(S)** in the worst case (O(n · prefix) typically). Space **O(1)**.

## remove-duplicates-from-sorted-array

### Approach 1: Collect unique values in a set, then write back
**The idea:** an ordered `set` keeps one copy of each value in sorted order.

```cpp
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        set<int> unique(nums.begin(), nums.end());
        int k = 0;
        for (int v : unique) {
            nums[k] = v;
            k++;
        }
        return k;
    }
};
```

**How it works:** the set removes duplicates and keeps them sorted.

**Think of it like this:** dropping numbered tokens into a box that rejects repeats.

**Cost:** Time **O(n log n)**. Space **O(n)** — the problem wants O(1).

### Approach 2: `std::unique`
**The idea:** the standard algorithm moves unique elements to the front and returns the new end.

```cpp
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        auto newEnd = unique(nums.begin(), nums.end());   // works on sorted ranges
        return newEnd - nums.begin();
    }
};
```

**How it works:** `unique` is exactly the read/write pointer algorithm below.

**Think of it like this:** the library already ships this tool.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: Read pointer + write pointer
**The idea:** `w` marks the end of the unique part. Scan with `r`; whenever `nums[r]` differs from the last unique value, write it at `w`.

```cpp
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        if (nums.empty()) {
            return 0;
        }
        int w = 1;                                // nums[0..w) are the unique values
        for (int r = 1; r < (int)nums.size(); r++) {
            if (nums[r] != nums[w - 1]) {         // a new value (array is sorted)
                nums[w] = nums[r];
                w++;
            }
        }
        return w;
    }
};
```

**How it works**
1. Sorted input → duplicates are next to each other.
2. Compare with the last *kept* value, `nums[w − 1]`.

**Think of it like this:** a bouncer letting someone in only if they're not identical to the last person who got in.

**Why it's optimal:** one pass, in place.

**Cost:** Time **O(n)**. Space **O(1)**.

## merge-sorted-array

### Approach 1: Copy in and sort
**The idea:** put nums2 into the empty tail of nums1 and sort.

```cpp
class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        for (int j = 0; j < n; j++) {
            nums1[m + j] = nums2[j];
        }
        sort(nums1.begin(), nums1.end());
    }
};
```

**How it works:** ignores that both inputs are already sorted.

**Think of it like this:** dumping two sorted piles together and re-sorting.

**Cost:** Time **O((m + n) log(m + n))**. Space **O(1)**.

### Approach 2: Forward merge with a copy of nums1
**The idea:** copy nums1's real values out, then merge from the front.

```cpp
class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        vector<int> first(nums1.begin(), nums1.begin() + m);   // save nums1's values
        int i = 0;
        int j = 0;
        int w = 0;
        while (i < m || j < n) {
            if (j >= n || (i < m && first[i] <= nums2[j])) {
                nums1[w] = first[i];
                i++;
            } else {
                nums1[w] = nums2[j];
                j++;
            }
            w++;
        }
    }
};
```

**How it works:** the copy prevents overwriting values we haven't merged yet.

**Think of it like this:** moving the first pile to a side table before merging.

**Cost:** Time **O(m + n)**. Space **O(m)**.

### Optimal: Merge backwards from the end
**The idea:** nums1 has empty space at the end. Fill it from the back with the larger of the two current tails — nothing unread is ever overwritten.

```cpp
class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        int i = m - 1;          // last real value in nums1
        int j = n - 1;          // last value in nums2
        int w = m + n - 1;      // next position to write (from the back)

        // Once nums2 is used up, what's left of nums1 is already in place.
        while (j >= 0) {
            if (i >= 0 && nums1[i] > nums2[j]) {
                nums1[w] = nums1[i];      // the bigger value goes to the back
                i--;
            } else {
                nums1[w] = nums2[j];
                j--;
            }
            w--;
        }
    }
};
```

**How it works**
1. Three pointers: `i`, `j`, and write position `w`.
2. Write the bigger tail at `w`.
3. Stop when nums2 is empty.

**Think of it like this:** filling a bookshelf from the right end with the tallest remaining book from either pile.

**Why it's optimal:** O(m + n), in place, no copy.

**Cost:** Time **O(m + n)**. Space **O(1)**.

## majority-element

### Approach 1: Hash map counts
**The idea:** count every value; return the one appearing more than n/2 times.

```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        unordered_map<int, int> count;
        for (int x : nums) {
            count[x]++;
            if (count[x] > (int)nums.size() / 2) {
                return x;
            }
        }
        return -1;
    }
};
```

**How it works:** returns as soon as a value passes half.

**Think of it like this:** counting votes in a ballot box.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Sort and take the middle
**The idea:** a value filling more than half the array must cover the middle position after sorting.

```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        return nums[nums.size() / 2];
    }
};
```

**How it works:** a block longer than n/2 always crosses the centre.

**Think of it like this:** if more than half the people in a queue wear red, the middle person wears red.

**Cost:** Time **O(n log n)**. Space **O(1)**.

### Approach 3: Bit voting
**The idea:** for each of the 32 bits, the majority element's bit wins the vote among all numbers.

```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        unsigned result = 0;
        int n = nums.size();
        for (int bit = 0; bit < 32; bit++) {
            int ones = 0;
            for (int x : nums) {
                if (((unsigned)x >> bit) & 1u) {
                    ones++;
                }
            }
            if (ones > n / 2) {
                result |= (1u << bit);     // the majority has this bit set
            }
        }
        return (int)result;
    }
};
```

**How it works:** the majority element contributes more than half the votes for each of its bits.

**Think of it like this:** 32 separate yes/no elections.

**Cost:** Time **O(32 · n)**. Space **O(1)**.

### Optimal: Boyer–Moore voting
**The idea:** pair each majority element with a different element and cancel them; the majority survives. Keep a candidate and a count.

```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        int candidate = 0;
        int count = 0;
        for (int x : nums) {
            if (count == 0) {
                candidate = x;           // start a new block with x as the candidate
            }
            if (x == candidate) {
                count++;                 // supporter
            } else {
                count--;                 // opponent cancels one supporter
            }
        }
        return candidate;
    }
};
```

**How it works**
1. When the count hits 0, everything so far cancels out exactly.
2. The majority can't be fully cancelled, so it's the final candidate.

**Think of it like this:** a battle where each soldier takes out one enemy; the army with more than half the soldiers always has someone left standing.

**Why it's optimal:** O(n) time, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## count-primes

### Approach 1: Trial division for every number
**The idea:** for each number below n, check divisors up to its square root.

```cpp
class Solution {
public:
    int countPrimes(int n) {
        int count = 0;
        for (int x = 2; x < n; x++) {
            if (isPrime(x)) {
                count++;
            }
        }
        return count;
    }

private:
    bool isPrime(int x) {
        for (long long d = 2; d * d <= x; d++) {
            if (x % d == 0) {
                return false;
            }
        }
        return true;
    }
};
```

**How it works:** a composite number has a divisor ≤ √x.

**Think of it like this:** testing each number on its own.

**Cost:** Time **O(n √n)**. Space **O(1)**.

### Approach 2: Odd-only sieve (half the memory)
**The idea:** 2 is the only even prime, so only store odd numbers.

```cpp
class Solution {
public:
    int countPrimes(int n) {
        if (n < 3) {
            return 0;
        }
        // index i represents the odd number 2i + 1.
        int size = n / 2;
        vector<bool> composite(size, false);
        int count = 1;                                   // the prime 2
        for (long long i = 1; i < size; i++) {
            if (composite[i]) {
                continue;
            }
            long long p = 2 * i + 1;
            if (p >= n) {
                break;
            }
            count++;
            // Mark odd multiples p*p, p*p + 2p, ...
            for (long long q = p * p; q < n; q += 2 * p) {
                composite[q / 2] = true;
            }
        }
        return count;
    }
};
```

**How it works:** even multiples are skipped entirely.

**Think of it like this:** crossing out multiples on a list that only has odd numbers.

**Cost:** Time **O(n log log n)**. Space **O(n / 2)** bits.

### Optimal: Sieve of Eratosthenes
**The idea:** every prime p crosses out its multiples starting from p². Whatever is never crossed out is prime.

```cpp
class Solution {
public:
    int countPrimes(int n) {
        if (n < 3) {
            return 0;                           // no primes below 2
        }
        vector<bool> composite(n, false);
        int count = 0;
        for (long long p = 2; p < n; p++) {
            if (composite[p]) {
                continue;                       // already crossed out
            }
            count++;                            // p survived: it's prime
            // Smaller multiples of p were crossed out by smaller primes, so start at p*p.
            for (long long q = p * p; q < n; q += p) {
                composite[q] = true;
            }
        }
        return count;
    }
};
```

**How it works**
1. Walk numbers from 2.
2. An uncrossed number is prime; cross out its multiples from p².
3. `long long` keeps `p * p` from overflowing.

**Think of it like this:** a sieve that lets composites fall through and keeps the primes.

**Why it's optimal:** O(n log log n) is nearly linear.

**Cost:** Time **O(n log log n)**. Space **O(n)** bits.

## rotate-array

### Approach 1: Extra array
**The idea:** element i moves to `(i + k) % n`.

```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        vector<int> rotated(n);
        for (int i = 0; i < n; i++) {
            rotated[(i + k) % n] = nums[i];
        }
        nums = rotated;
    }
};
```

**How it works:** each element goes straight to its new position.

**Think of it like this:** reseating everyone at a round table k seats to the right.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Cyclic replacements
**The idea:** move an element to its target, then move the element that was there to *its* target, and so on, until you return to the start. Repeat for each cycle.

```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;
        int moved = 0;
        for (int start = 0; moved < n; start++) {
            int current = start;
            int carried = nums[start];
            do {
                int next = (current + k) % n;
                swap(carried, nums[next]);     // put carried down, pick up the old value
                current = next;
                moved++;
            } while (current != start);
        }
    }
};
```

**How it works:** gcd(n, k) separate cycles cover every position exactly once.

**Think of it like this:** musical chairs where each person pushes the next one along.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 3: Rotate one step, k times
**The idea:** move the last element to the front, k times.

```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;
        for (int step = 0; step < k; step++) {
            int last = nums[n - 1];
            for (int i = n - 1; i > 0; i--) {
                nums[i] = nums[i - 1];         // shift everything right by one
            }
            nums[0] = last;
        }
    }
};
```

**How it works:** literal simulation.

**Think of it like this:** turning a dial one click at a time.

**Cost:** Time **O(n · k)**. Space **O(1)**.

### Optimal: Three reversals
**The idea:** reverse the whole array, then reverse the first k elements, then the rest.

```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;                                        // rotating by n is a no-op
        reverse(nums.begin(), nums.end());             // [1..7] → [7 6 5 4 3 2 1]
        reverse(nums.begin(), nums.begin() + k);       // first k → [5 6 7 | 4 3 2 1]
        reverse(nums.begin() + k, nums.end());         // the rest → [5 6 7 1 2 3 4]
    }
};
```

**How it works**
1. Full reversal puts the last k elements at the front (backwards).
2. Reversing each part fixes their internal order.

**Think of it like this:** flipping a deck upside down, then flipping each of two piles back.

**Why it's optimal:** O(n), O(1) memory, and much simpler than cyclic replacements.

**Cost:** Time **O(n)**. Space **O(1)**.

## first-unique-character-in-a-string

### Approach 1: Brute force — count each character
**The idea:** for each position, count how often its character appears in the whole string.

```cpp
class Solution {
public:
    int firstUniqChar(string s) {
        int n = s.size();
        for (int i = 0; i < n; i++) {
            int count = 0;
            for (int j = 0; j < n; j++) {
                if (s[j] == s[i]) {
                    count++;
                }
            }
            if (count == 1) {
                return i;
            }
        }
        return -1;
    }
};
```

**How it works:** direct definition.

**Think of it like this:** asking every person "is anyone else wearing your shirt?".

**Cost:** Time **O(n²)**. Space **O(1)**.

### Approach 2: Compare first and last index
**The idea:** a character is unique exactly when its first and last occurrence are the same position.

```cpp
class Solution {
public:
    int firstUniqChar(string s) {
        for (int i = 0; i < (int)s.size(); i++) {
            if (s.find(s[i]) == (size_t)i && s.rfind(s[i]) == (size_t)i) {
                return i;
            }
        }
        return -1;
    }
};
```

**How it works:** `find` searches from the left, `rfind` from the right.

**Think of it like this:** if the first and last time you see someone is the same moment, they only showed up once.

**Cost:** Time **O(n²)** worst case. Space **O(1)**.

### Optimal: Count in one pass, find in a second
**The idea:** count each letter, then return the first position whose letter has count 1.

```cpp
class Solution {
public:
    int firstUniqChar(string s) {
        array<int, 26> cnt{};                 // all zeros
        for (char c : s) {
            cnt[c - 'a']++;
        }
        for (int i = 0; i < (int)s.size(); i++) {
            if (cnt[s[i] - 'a'] == 1) {
                return i;                     // first letter that appears exactly once
            }
        }
        return -1;
    }
};
```

**How it works**
1. Pass 1: tally the 26 letters.
2. Pass 2: the first position with a tally of 1.

**Think of it like this:** count the votes first, then read the ballots again in order to find the first single-vote name.

**Why it's optimal:** two linear passes, 26 integers of memory.

**Cost:** Time **O(n)**. Space **O(1)** (26 counters).

## find-the-index-of-the-first-occurrence-in-a-string

### Approach 1: Brute force sliding comparison
**The idea:** try every start position and compare character by character.

```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        int n = haystack.size();
        int m = needle.size();
        for (int start = 0; start + m <= n; start++) {
            int k = 0;
            while (k < m && haystack[start + k] == needle[k]) {
                k++;
            }
            if (k == m) {
                return start;                 // matched every character
            }
        }
        return -1;
    }
};
```

**How it works:** slides the needle along one step at a time.

**Think of it like this:** holding a stencil over each position of the text.

**Cost:** Time **O(n · m)**. Space **O(1)**.

### Approach 2: Rabin–Karp rolling hash
**The idea:** compare hashes instead of strings. Sliding the window by one updates the hash in O(1). Confirm real matches with a direct comparison.

```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        int n = haystack.size();
        int m = needle.size();
        if (m > n) {
            return -1;
        }
        const unsigned long long B = 131;          // base; arithmetic wraps mod 2^64
        unsigned long long target = 0;
        unsigned long long window = 0;
        unsigned long long power = 1;              // B^(m-1)
        for (int i = 0; i < m; i++) {
            target = target * B + needle[i];
            window = window * B + haystack[i];
            if (i > 0) {
                power *= B;
            }
        }
        for (int start = 0; ; start++) {
            if (window == target && haystack.compare(start, m, needle) == 0) {
                return start;
            }
            if (start + m >= n) {
                break;
            }
            // Remove the leftmost character, add the next one.
            window = (window - haystack[start] * power) * B + haystack[start + m];
        }
        return -1;
    }
};
```

**How it works:** most positions are rejected by one integer comparison.

**Think of it like this:** comparing fingerprints before comparing faces.

**Cost:** Time **O(n + m)** expected. Space **O(1)**.

### Approach 3: Standard library
**The idea:** `string::find` does it for you.

```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        size_t pos = haystack.find(needle);
        if (pos == string::npos) {
            return -1;
        }
        return (int)pos;
    }
};
```

**How it works:** the library's tuned search.

**Think of it like this:** Ctrl+F.

**Cost:** Implementation-defined (fast in practice). Mention it, then write KMP if asked.

### Optimal: KMP (Knuth–Morris–Pratt)
**The idea:** when a match fails after k characters, the needle's own structure tells you how much of it still matches — so you never move backwards in the haystack. `pi[i]` = length of the longest proper prefix of `needle[0..i]` that is also a suffix.

```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        int m = needle.size();
        if (m == 0) {
            return 0;
        }

        // 1. Failure function: pi[i] = longest border of needle[0..i].
        vector<int> pi(m, 0);
        int k = 0;                                   // length of the current border
        for (int i = 1; i < m; i++) {
            while (k > 0 && needle[i] != needle[k]) {
                k = pi[k - 1];                       // fall back to a shorter border
            }
            if (needle[i] == needle[k]) {
                k++;
            }
            pi[i] = k;
        }

        // 2. Scan the haystack; k = how many needle chars currently match.
        k = 0;
        for (int i = 0; i < (int)haystack.size(); i++) {
            while (k > 0 && haystack[i] != needle[k]) {
                k = pi[k - 1];                       // fall back, never move i back
            }
            if (haystack[i] == needle[k]) {
                k++;
            }
            if (k == m) {
                return i - m + 1;                    // full match ending at i
            }
        }
        return -1;
    }
};
```

**How it works**
1. Build `pi` for the needle.
2. Scan the haystack once; on a mismatch, jump `k` back using `pi` instead of restarting.
3. `k == m` → found.

**Think of it like this:** if you're matching "ababc" and fail at "c", you already know the last "ab" you read could be the start of a new match — so you continue from there.

**Why it's optimal:** guaranteed O(n + m), no hashing.

**Cost:** Time **O(n + m)**. Space **O(m)**.

## pascals-triangle

### Approach 1: Binomial coefficients directly
**The idea:** row r, column c is C(r, c), and `C(r, c) = C(r, c−1) · (r − c + 1) / c`.

```cpp
class Solution {
public:
    vector<vector<int>> generate(int numRows) {
        vector<vector<int>> rows;
        for (int r = 0; r < numRows; r++) {
            vector<int> row(r + 1);
            long long value = 1;                     // C(r, 0)
            for (int c = 0; c <= r; c++) {
                row[c] = (int)value;
                value = value * (r - c) / (c + 1);   // C(r, c + 1)
            }
            rows.push_back(row);
        }
        return rows;
    }
};
```

**How it works:** each entry is computed from the one to its left, exactly.

**Think of it like this:** "how many ways to choose c items from r" for every cell.

**Cost:** Time **O(numRows²)**. Space **O(1)** extra.

### Approach 2: Build each row in place from the previous
**The idea:** keep one row; to get the next, append a 1 and update from right to left.

```cpp
class Solution {
public:
    vector<vector<int>> generate(int numRows) {
        vector<vector<int>> rows;
        vector<int> row;
        for (int r = 0; r < numRows; r++) {
            row.push_back(1);                       // new right edge
            // Right to left, so row[c - 1] is still the previous row's value.
            for (int c = r - 1; c > 0; c--) {
                row[c] = row[c] + row[c - 1];
            }
            rows.push_back(row);
        }
        return rows;
    }
};
```

**How it works:** the same addition rule, updating one array.

**Think of it like this:** the 1-D DP trick from Unique Paths.

**Cost:** Time **O(numRows²)**. Space **O(numRows)** extra.

### Optimal: Each entry is the sum of the two above it
**The idea:** edges are 1; every inner entry = left-above + right-above.

```cpp
class Solution {
public:
    vector<vector<int>> generate(int numRows) {
        vector<vector<int>> rows;
        for (int r = 0; r < numRows; r++) {
            vector<int> row(r + 1, 1);              // the edges are 1
            for (int c = 1; c < r; c++) {
                row[c] = rows[r - 1][c - 1] + rows[r - 1][c];   // the two numbers above
            }
            rows.push_back(row);
        }
        return rows;
    }
};
```

**How it works**
1. Row r has r + 1 entries, starting and ending with 1.
2. Inner entries add the two above.

**Think of it like this:** a pyramid of bricks where each brick's number is the sum of the two it rests on.

**Why it's optimal:** O(1) work per number in the output.

**Cost:** Time **O(numRows²)**. Space **O(1)** extra (besides the output).

## sqrtx

### Approach 1: Linear search
**The idea:** try 1, 2, 3, … until the square exceeds x.

```cpp
class Solution {
public:
    int mySqrt(int x) {
        long long r = 0;
        while ((r + 1) * (r + 1) <= x) {
            r++;
        }
        return (int)r;
    }
};
```

**How it works:** stops at the last r with r² ≤ x.

**Think of it like this:** counting up until you overshoot.

**Cost:** Time **O(√x)**. Space **O(1)**.

### Approach 2: Newton's method (integer)
**The idea:** repeatedly improve a guess with `r = (r + x / r) / 2`; it converges very fast.

```cpp
class Solution {
public:
    int mySqrt(int x) {
        if (x < 2) {
            return x;
        }
        long long r = x;
        while (r * r > x) {
            r = (r + x / r) / 2;     // average of r and x / r
        }
        return (int)r;
    }
};
```

**How it works:** the average of an over-estimate and an under-estimate is a better estimate.

**Think of it like this:** halving the error with each guess.

**Cost:** Time **O(log x)** (quadratic convergence). Space **O(1)**.

### Optimal: Binary search on the answer
**The idea:** "is mid² ≤ x?" is true for small mid and false for large. Find the largest mid where it's true.

```cpp
class Solution {
public:
    int mySqrt(int x) {
        long long lo = 0;
        long long hi = x;                         // the answer is in [0, x]
        while (lo < hi) {
            // Upper middle: with lo = mid below, a lower middle could loop forever.
            long long mid = lo + (hi - lo + 1) / 2;
            if (mid * mid <= x) {
                lo = mid;                         // mid works: answer is mid or larger
            } else {
                hi = mid - 1;                     // too big
            }
        }
        return (int)lo;
    }
};
```

**How it works**
1. `long long` so `mid * mid` can't overflow.
2. Upper middle avoids an infinite loop when `lo = mid`.
3. Ends at the largest r with r² ≤ x.

**Think of it like this:** guessing a number between 0 and x with "too high / OK" answers.

**Why it's optimal:** O(log x), simple, no floating point.

**Cost:** Time **O(log x)**. Space **O(1)**.

## add-binary

### Approach 1: Convert to integers (breaks on long inputs)
**The idea (don't rely on it):** parse both strings as binary numbers, add, convert back. Inputs can be 10⁴ digits long — far beyond 64 bits.

```cpp
class Solution {
public:
    string addBinary(string a, string b) {
        // stoull throws (or overflows) once a string has more than 64 digits.
        unsigned long long x = stoull(a, nullptr, 2);
        unsigned long long y = stoull(b, nullptr, 2);
        unsigned long long sum = x + y;
        if (sum == 0) {
            return "0";
        }
        string out;
        while (sum > 0) {
            out.push_back(char('0' + (sum & 1)));   // lowest bit first
            sum >>= 1;
        }
        reverse(out.begin(), out.end());
        return out;
    }
};
```

**How it works:** fine for short strings; throws `out_of_range` for long ones.

**Think of it like this:** squeezing a 10 000-digit number into a 64-slot box.

**Cost:** Time **O(n)**. Space **O(n)**. Mention it to show you know why the digit-by-digit method is needed.

### Approach 2: Pad to equal length first
**The idea:** pad the shorter string with leading zeros so both have the same length, then add column by column.

```cpp
class Solution {
public:
    string addBinary(string a, string b) {
        size_t n = max(a.size(), b.size());
        a.insert(0, n - a.size(), '0');            // left-pad with zeros
        b.insert(0, n - b.size(), '0');
        string out(n, '0');
        int carry = 0;
        for (int i = n - 1; i >= 0; i--) {
            int sum = (a[i] - '0') + (b[i] - '0') + carry;
            out[i] = char('0' + sum % 2);
            carry = sum / 2;
        }
        if (carry > 0) {
            out.insert(out.begin(), '1');
        }
        return out;
    }
};
```

**How it works:** equal lengths remove the "is there a digit here?" checks.

**Think of it like this:** writing both numbers right-aligned on squared paper.

**Cost:** Time **O(max(m, n))**. Space **O(max(m, n))**.

### Optimal: Add from the right with a carry
**The idea:** grade-school addition in base 2: walk both strings from the end, add the digits and the carry.

```cpp
class Solution {
public:
    string addBinary(string a, string b) {
        string out;
        int i = a.size() - 1;
        int j = b.size() - 1;
        int carry = 0;
        while (i >= 0 || j >= 0 || carry != 0) {
            int sum = carry;
            if (i >= 0) {
                sum += a[i] - '0';
                i--;
            }
            if (j >= 0) {
                sum += b[j] - '0';
                j--;
            }
            out.push_back(char('0' + (sum & 1)));   // sum % 2: the digit
            carry = sum >> 1;                       // sum / 2: the carry
        }
        reverse(out.begin(), out.end());            // we built it backwards
        return out;
    }
};
```

**How it works**
1. Missing digits count as 0.
2. Digit = `sum & 1`, carry = `sum >> 1`.
3. Keep going while there's a carry; reverse at the end.

**Think of it like this:** adding on paper, but you only ever write 0 or 1 and carry 1.

**Why it's optimal:** one pass, works for any length.

**Cost:** Time **O(max(m, n))**. Space **O(max(m, n))** for the output.

## implement-queue-using-stacks

### Approach 1: Make push expensive (keep one stack in queue order)
**The idea:** on every push, move everything to a helper stack, push the new item, and move everything back. The top is then always the front.

```cpp
class MyQueue {
public:
    void push(int x) {
        // Move everything out, put x at the bottom, move everything back.
        while (!s1.empty()) {
            s2.push(s1.top());
            s1.pop();
        }
        s1.push(x);
        while (!s2.empty()) {
            s1.push(s2.top());
            s2.pop();
        }
    }

    int pop() {
        int v = s1.top();
        s1.pop();
        return v;
    }

    int peek() {
        return s1.top();
    }

    bool empty() {
        return s1.empty();
    }

private:
    stack<int> s1;   // top = front of the queue
    stack<int> s2;   // temporary helper
};
```

**How it works:** the newest item always ends up at the bottom of `s1`.

**Think of it like this:** re-stacking all your plates every time a new one arrives so the oldest is on top.

**Cost:** `push` **O(n)**; `pop`/`peek` **O(1)**.

### Approach 2: Single stack + recursion for pop
**The idea:** to pop the bottom element, recursively pop everything above it, take the bottom, then push the rest back as the recursion unwinds.

```cpp
class MyQueue {
public:
    void push(int x) {
        s.push(x);
    }

    int pop() {
        int top = s.top();
        s.pop();
        if (s.empty()) {
            return top;              // this was the bottom: the front of the queue
        }
        int front = pop();           // the call stack is our second stack
        s.push(top);                 // put it back on the way out
        return front;
    }

    int peek() {
        int front = pop();
        // Put it back at the bottom: rebuild with it underneath.
        pushBottom(front);
        return front;
    }

    bool empty() {
        return s.empty();
    }

private:
    stack<int> s;

    void pushBottom(int x) {
        if (s.empty()) {
            s.push(x);
            return;
        }
        int top = s.top();
        s.pop();
        pushBottom(x);
        s.push(top);
    }
};
```

**How it works:** recursion uses the call stack as the hidden second stack.

**Think of it like this:** lifting plates off one at a time in your hands until you reach the bottom one.

**Cost:** `pop`/`peek` **O(n)** time and **O(n)** call stack.

### Optimal: Two stacks, transfer only when the output stack is empty
**The idea:** push onto `in`. When you need the front, and `out` is empty, pour everything from `in` into `out` — this reverses the order so the oldest is on top.

```cpp
class MyQueue {
public:
    void push(int x) {
        in.push(x);                  // new items always go here
    }

    int pop() {
        shift();
        int v = out.top();
        out.pop();
        return v;
    }

    int peek() {
        shift();
        return out.top();
    }

    bool empty() const {
        return in.empty() && out.empty();
    }

private:
    stack<int> in;                   // newest on top
    stack<int> out;                  // oldest on top

    // Reverse `in` into `out`, but only when `out` has nothing left.
    void shift() {
        if (out.empty()) {
            while (!in.empty()) {
                out.push(in.top());
                in.pop();
            }
        }
    }
};
```

**How it works**
1. `push` → `in`.
2. `pop`/`peek` read from `out`; refill it from `in` only when it's empty.
3. Each element moves from `in` to `out` exactly once.

**Think of it like this:** an inbox and an outbox — you only flip the inbox pile into the outbox when the outbox is empty.

**Why it's optimal:** amortised O(1) for every operation.

**Cost:** All operations **amortised O(1)**. Space **O(n)**.

## sort-colors

### Approach 1: Library sort
**The idea:** just sort.

```cpp
class Solution {
public:
    void sortColors(vector<int>& nums) {
        sort(nums.begin(), nums.end());
    }
};
```

**How it works:** general-purpose sorting.

**Think of it like this:** a full sorting machine for three kinds of ball.

**Cost:** Time **O(n log n)**. The problem asks you not to use it.

### Approach 2: Counting sort (two passes)
**The idea:** count the 0s, 1s and 2s, then overwrite the array.

```cpp
class Solution {
public:
    void sortColors(vector<int>& nums) {
        int count[3] = {0, 0, 0};
        for (int x : nums) {
            count[x]++;
        }
        int i = 0;
        for (int color = 0; color < 3; color++) {
            for (int k = 0; k < count[color]; k++) {
                nums[i] = color;
                i++;
            }
        }
    }
};
```

**How it works:** with only three values, counting is enough.

**Think of it like this:** counting red, white and blue balls, then laying them out.

**Cost:** Time **O(n)** (two passes). Space **O(1)**.

### Optimal: Dutch national flag (one pass, three pointers)
**The idea:** keep `[0, lo)` all 0s, `[lo, mid)` all 1s, `(hi, end]` all 2s. Look at `nums[mid]` and swap it into the right region.

```cpp
class Solution {
public:
    void sortColors(vector<int>& nums) {
        int lo = 0;                      // next spot for a 0
        int mid = 0;                     // the element being examined
        int hi = (int)nums.size() - 1;   // next spot for a 2

        while (mid <= hi) {
            if (nums[mid] == 0) {
                swap(nums[lo], nums[mid]);   // send the 0 to the left region
                lo++;
                mid++;
            } else if (nums[mid] == 2) {
                swap(nums[mid], nums[hi]);   // send the 2 to the right region
                hi--;
                // Don't move mid: the value just swapped in hasn't been checked yet.
            } else {
                mid++;                       // 1 is already in the middle region
            }
        }
    }
};
```

**How it works**
1. 0 → swap to `lo`, advance both.
2. 2 → swap to `hi`, shrink `hi`, re-check `mid`.
3. 1 → leave it, advance `mid`.

**Think of it like this:** sorting a pile of red, white and blue balls by throwing reds to the left wall and blues to the right wall as you walk along.

**Why it's optimal:** one pass, in place, O(1) memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## intersection-of-two-arrays-ii

### Approach 1: Brute force with "used" markers
**The idea:** for each element of a, find an unused equal element in b and mark it used.

```cpp
class Solution {
public:
    vector<int> intersect(vector<int>& a, vector<int>& b) {
        vector<bool> used(b.size(), false);
        vector<int> out;
        for (int x : a) {
            for (int j = 0; j < (int)b.size(); j++) {
                if (!used[j] && b[j] == x) {
                    used[j] = true;           // each element of b matches only once
                    out.push_back(x);
                    break;
                }
            }
        }
        return out;
    }
};
```

**How it works:** the markers handle duplicates.

**Think of it like this:** pairing socks from two drawers one by one.

**Cost:** Time **O(m · n)**. Space **O(n)**.

### Approach 2: Sort both + two pointers
**The idea:** after sorting, walk both arrays like a merge; equal values go into the output.

```cpp
class Solution {
public:
    vector<int> intersect(vector<int>& a, vector<int>& b) {
        sort(a.begin(), a.end());
        sort(b.begin(), b.end());
        vector<int> out;
        size_t i = 0;
        size_t j = 0;
        while (i < a.size() && j < b.size()) {
            if (a[i] < b[j]) {
                i++;
            } else if (a[i] > b[j]) {
                j++;
            } else {
                out.push_back(a[i]);       // common value
                i++;
                j++;
            }
        }
        return out;
    }
};
```

**How it works:** the smaller side moves forward until the values meet.

**Think of it like this:** two sorted lists of names read side by side.

**Cost:** Time **O(m log m + n log n)**. Space **O(1)** extra. Best if the arrays are already sorted (a common follow-up).

### Optimal: Count the smaller array in a hash map
**The idea:** count each value of the smaller array; walk the other array and take a value whenever its count is still positive.

```cpp
class Solution {
public:
    vector<int> intersect(vector<int>& a, vector<int>& b) {
        if (a.size() > b.size()) {
            swap(a, b);                       // count the smaller array: less memory
        }
        unordered_map<int, int> cnt;
        for (int x : a) {
            cnt[x]++;
        }
        vector<int> out;
        for (int x : b) {
            auto it = cnt.find(x);
            if (it != cnt.end() && it->second > 0) {
                out.push_back(x);
                it->second--;                 // use up one copy
            }
        }
        return out;
    }
};
```

**How it works**
1. Count the smaller array.
2. Each match uses up one copy, so duplicates appear the right number of times.

**Think of it like this:** a guest list with "+1" counts; each arrival crosses off one.

**Why it's optimal:** O(m + n) time with memory proportional to the smaller array.

**Cost:** Time **O(m + n)**. Space **O(min(m, n))**.
