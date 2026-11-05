## fizz-buzz

### Approach 1: Classic if / else-if chain
```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> out;
        for (int i = 1; i <= n; ++i) {
            if (i % 15 == 0) out.push_back("FizzBuzz");      // must come first!
            else if (i % 3 == 0) out.push_back("Fizz");
            else if (i % 5 == 0) out.push_back("Buzz");
            else out.push_back(to_string(i));
        }
        return out;
    }
};
```

**Time:** O(n) · **Space:** O(1) extra. The most common answer; the classic bug is checking `% 3` before `% 15`.

### Approach 2: Counters instead of modulo
```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> out;
        int three = 0, five = 0;
        for (int i = 1; i <= n; ++i) {
            ++three; ++five;
            string s;
            if (three == 3) { s += "Fizz"; three = 0; }
            if (five == 5) { s += "Buzz"; five = 0; }
            out.push_back(s.empty() ? to_string(i) : s);
        }
        return out;
    }
};
```

**Time:** O(n) · **Space:** O(1) extra. No division at all — relevant on small MCUs without a hardware divider (Cortex-M0), where `%` is a slow library call.

### Approach 3: Data-driven rules table
```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        static const vector<pair<int, string>> rules = {{3, "Fizz"}, {5, "Buzz"}};   // add {7,"Bazz"} freely
        vector<string> out;
        for (int i = 1; i <= n; ++i) {
            string s;
            for (const auto& [d, word] : rules) if (i % d == 0) s += word;
            out.push_back(s.empty() ? to_string(i) : s);
        }
        return out;
    }
};
```

**Time:** O(n · r) for r rules · **Space:** O(r). The Open/Closed principle in miniature: new rules = new data, not new branches.

### Walkthrough
**Goal:** map each i to "Fizz", "Buzz", "FizzBuzz", or the number.

1. Reserve `n` slots in the output (avoids repeated reallocation).
2. For each `i` from 1 to n, start with an empty string `s`.
3. If `i % 3 == 0` append "Fizz"; **independently**, if `i % 5 == 0` append "Buzz". Multiples of 15 get both, in the right order.
4. If `s` is still empty, the number wasn't divisible by either → use `to_string(i)`.
5. Move `s` into the vector (no copy).

**Dry run** n = 15 (selected):

| i | i % 3 | i % 5 | s | output |
|---|---|---|---|---|
| 1 | 1 | 1 | "" | "1" |
| 3 | 0 | 3 | "Fizz" | "Fizz" |
| 5 | 2 | 0 | "Buzz" | "Buzz" |
| 9 | 0 | 4 | "Fizz" | "Fizz" |
| 15 | 0 | 0 | "FizzBuzz" | "FizzBuzz" |

## two-sum

### Approach 1: Brute force — every pair
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

**Time:** O(n²) · **Space:** O(1). Always state this first, then optimise.

### Approach 2: Sort (value, index) pairs + two pointers
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        vector<pair<int, int>> v;                        // (value, original index)
        for (int i = 0; i < (int)nums.size(); ++i) v.push_back({nums[i], i});
        ranges::sort(v);
        int l = 0, r = (int)v.size() - 1;
        while (l < r) {
            long long s = (long long)v[l].first + v[r].first;
            if (s == target) return {min(v[l].second, v[r].second), max(v[l].second, v[r].second)};
            if (s < target) ++l; else --r;
        }
        return {};
    }
};
```

**Time:** O(n log n) · **Space:** O(n). Sorting loses the original indices, so carry them along in pairs.

### Approach 3: Binary search for the complement
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        vector<pair<int, int>> v;
        for (int i = 0; i < (int)nums.size(); ++i) v.push_back({nums[i], i});
        ranges::sort(v);
        for (int i = 0; i < (int)v.size(); ++i) {
            int need = target - v[i].first;
            auto it = lower_bound(v.begin() + i + 1, v.end(), make_pair(need, INT_MIN));
            if (it != v.end() && it->first == need) return {min(v[i].second, it->second), max(v[i].second, it->second)};
        }
        return {};
    }
};
```

**Time:** O(n log n) · **Space:** O(n). A middle step between brute force and hashing.

### Walkthrough
**Goal:** one pass; for each number, check whether its complement was already seen.

1. `seen` maps **value → index** for every number visited so far.
2. At index i, compute `need = target − nums[i]`.
3. If `need` is in `seen`, its index and i are the answer.
4. Otherwise record `nums[i] → i` and move on.

**Dry run** `nums = [3, 2, 4]`, target 6:

| i | nums[i] | need | seen before | found? |
|---|---|---|---|---|
| 0 | 3 | 3 | {} | no → add 3→0 |
| 1 | 2 | 4 | {3→0} | no → add 2→1 |
| 2 | 4 | 2 | {3→0, 2→1} | **yes → [1, 2]** |

At i = 0 we looked up 3 *before* inserting 3, which is why `[0, 0]` is never returned.

## reverse-string

### Approach 1: Recursion
```cpp
class Solution {
    void rev(vector<char>& s, int l, int r) {
        if (l >= r) return;
        swap(s[l], s[r]);
        rev(s, l + 1, r - 1);
    }
public:
    void reverseString(vector<char>& s) { rev(s, 0, (int)s.size() - 1); }
};
```

**Time:** O(n) · **Space:** O(n) call stack — violates the O(1) requirement and could overflow on huge inputs.

### Approach 2: XOR swap (no temporary)
```cpp
class Solution {
public:
    void reverseString(vector<char>& s) {
        for (int l = 0, r = (int)s.size() - 1; l < r; ++l, --r) {
            s[l] ^= s[r];                 // only safe because l != r (never the same object)
            s[r] ^= s[l];
            s[l] ^= s[r];
        }
    }
};
```

**Time:** O(n) · **Space:** O(1). A favourite trivia question; in practice `std::swap` is just as fast and clearer, and XOR-swapping an element with itself zeroes it.

### Approach 3: Standard library
```cpp
class Solution {
public:
    void reverseString(vector<char>& s) { ranges::reverse(s); }
};
```

**Time:** O(n) · **Space:** O(1). What you'd ship.

### Walkthrough
**Goal:** reverse in place.

1. `l` at the first index, `r` at the last.
2. Swap `s[l]` and `s[r]`; this puts both characters in their final positions.
3. Move both inward; stop when they meet or cross (`l < r` fails).

**Dry run** `[h, e, l, l, o]`:

| l | r | swap | array after |
|---|---|---|---|
| 0 | 4 | h ↔ o | o e l l h |
| 1 | 3 | e ↔ l | o l l e h |
| 2 | 2 | stop (l == r) | o l l e h |

Two swaps for five characters — ⌊n/2⌋ in general.

## palindrome-number

### Approach 1: Convert to string
```cpp
class Solution {
public:
    bool isPalindrome(int x) {
        string s = to_string(x);
        return equal(s.begin(), s.begin() + s.size() / 2, s.rbegin());
    }
};
```

**Time:** O(d) for d digits · **Space:** O(d). Negative numbers fail automatically ("-121" vs "121-"). Simplest, but the follow-up forbids strings.

### Approach 2: Reverse the whole number (with overflow care)
```cpp
class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0) return false;
        long long rev = 0;                           // 64-bit: a reversed int can exceed INT_MAX
        for (int t = x; t > 0; t /= 10) rev = rev * 10 + t % 10;
        return rev == x;
    }
};
```

**Time:** O(d) · **Space:** O(1). Works, but needs a wider type — the half-reversal avoids that entirely.

### Approach 3: Compare the first and last digits, peeling both ends
```cpp
class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0) return false;
        int div = 1;
        while (x / div >= 10) div *= 10;             // div = 10^(digits-1)
        while (x > 0) {
            if (x / div != x % 10) return false;     // leading vs trailing digit
            x = (x % div) / 10;                      // drop both ends
            div /= 100;
        }
        return true;
    }
};
```

**Time:** O(d) · **Space:** O(1). Mirrors the two-pointer string check, using arithmetic.

### Walkthrough
**Goal:** check digit symmetry using only arithmetic, without overflow.

1. **Quick rejects:** negatives (the `−` has no mirror), and numbers ending in 0 except 0 itself (they'd need a leading 0).
2. Build `rev` from the last digits of `x` while chopping them off `x`: `rev = rev·10 + x % 10`, `x /= 10`.
3. Stop when `x ≤ rev` — we've consumed half the digits.
4. Even digit count → `x == rev`. Odd → the middle digit is in `rev`, so compare `x == rev / 10`.

**Dry run** x = 12321:

| x | rev | x > rev? |
|---|---|---|
| 12321 | 0 | yes |
| 1232 | 1 | yes |
| 123 | 12 | yes |
| 12 | 123 | no → stop |

`x == rev / 10` → 12 == 12 → **true**. For x = 1221: (122, 1) → (12, 12) stop → `x == rev` → true.

## fibonacci-number

### Approach 1: Naive recursion
```cpp
class Solution {
public:
    int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
};
```

**Time:** O(φⁿ) ≈ O(1.618ⁿ) · **Space:** O(n) stack. fib(40) makes ~330 million calls — the textbook example of overlapping subproblems.

### Approach 2: Memoisation
```cpp
class Solution {
    unordered_map<int, int> memo;
public:
    int fib(int n) {
        if (n < 2) return n;
        if (auto it = memo.find(n); it != memo.end()) return it->second;
        return memo[n] = fib(n - 1) + fib(n - 2);
    }
};
```

**Time:** O(n) · **Space:** O(n). Same recursion, each subproblem computed once.

### Approach 3: Fast doubling (O(log n))
```cpp
class Solution {
    // returns {F(n), F(n+1)}
    pair<long long, long long> fd(int n) {
        if (n == 0) return {0, 1};
        auto [a, b] = fd(n / 2);                    // a = F(k), b = F(k+1), k = n/2
        long long c = a * (2 * b - a);              // F(2k)
        long long d = a * a + b * b;                // F(2k+1)
        return n % 2 ? make_pair(d, c + d) : make_pair(c, d);
    }
public:
    int fib(int n) { return (int)fd(n).first; }
};
```

**Time:** O(log n) · **Space:** O(log n). Identities F(2k) = F(k)·(2F(k+1) − F(k)) and F(2k+1) = F(k)² + F(k+1)². Used with modular arithmetic for huge n.

### Approach 4: Closed form (Binet)
F(n) = (φⁿ − ψⁿ)/√5 with φ = (1+√5)/2. Elegant, but floating-point error makes it wrong for n ≳ 70 with doubles — a good answer to "why not just use the formula?".

### Walkthrough
**Goal:** F(n) iteratively in O(1) space.

1. Keep `a = F(i)`, `b = F(i+1)`, starting at i = 0: `a = 0`, `b = 1`.
2. Each step advances i by one: the new pair is `(F(i+1), F(i+2)) = (b, a + b)`.
3. After n steps, `a = F(n)`.

**Dry run** n = 6:

| step | a | b |
|---|---|---|
| 0 | 0 | 1 |
| 1 | 1 | 1 |
| 2 | 1 | 2 |
| 3 | 2 | 3 |
| 4 | 3 | 5 |
| 5 | 5 | 8 |
| 6 | **8** | 13 |

## roman-to-integer

### Approach 1: Replace subtractive pairs first
```cpp
class Solution {
public:
    int romanToInt(string s) {
        static const pair<const char*, int> pairs[] = {
            {"CM", 900}, {"CD", 400}, {"XC", 90}, {"XL", 40}, {"IX", 9}, {"IV", 4},
            {"M", 1000}, {"D", 500}, {"C", 100}, {"L", 50}, {"X", 10}, {"V", 5}, {"I", 1}};
        int total = 0;
        size_t i = 0;
        while (i < s.size()) {
            for (auto [sym, v] : pairs) {
                size_t len = strlen(sym);
                if (s.compare(i, len, sym) == 0) { total += v; i += len; break; }   // greedy: two-char first
            }
        }
        return total;
    }
};
```

**Time:** O(n) (13-entry table is constant) · **Space:** O(1). Explicitly lists the six subtractive forms.

### Approach 2: Scan right to left
```cpp
class Solution {
public:
    int romanToInt(string s) {
        unordered_map<char, int> v{{'I', 1}, {'V', 5}, {'X', 10}, {'L', 50}, {'C', 100}, {'D', 500}, {'M', 1000}};
        int total = 0, prev = 0;
        for (int i = (int)s.size() - 1; i >= 0; --i) {
            int cur = v[s[i]];
            total += cur < prev ? -cur : cur;       // smaller than its right neighbour -> subtract
            prev = cur;
        }
        return total;
    }
};
```

**Time:** O(n) · **Space:** O(1). Same rule, no look-ahead needed.

### Walkthrough
**Goal:** sum symbol values, subtracting a symbol that precedes a larger one.

1. For each position i, get its value v.
2. If the next symbol is larger (IV, IX, XL, XC, CD, CM), this symbol is subtracted.
3. Otherwise it's added.

**Dry run** "MCMXCIV":

| i | symbol | value | next value | action | total |
|---|---|---|---|---|---|
| 0 | M | 1000 | 100 | + | 1000 |
| 1 | C | 100 | 1000 | − | 900 |
| 2 | M | 1000 | 10 | + | 1900 |
| 3 | X | 10 | 100 | − | 1890 |
| 4 | C | 100 | 1 | + | 1990 |
| 5 | I | 1 | 5 | − | 1989 |
| 6 | V | 5 | — | + | **1994** |

## longest-common-prefix

### Approach 1: Horizontal scanning
```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        if (strs.empty()) return "";
        string prefix = strs[0];
        for (size_t k = 1; k < strs.size() && !prefix.empty(); ++k) {
            size_t i = 0;
            while (i < prefix.size() && i < strs[k].size() && prefix[i] == strs[k][i]) ++i;
            prefix.resize(i);                                    // shrink to the common part
        }
        return prefix;
    }
};
```

**Time:** O(S) total characters · **Space:** O(m). Fold the prefix across all strings.

### Approach 2: Sort, then compare only first and last
```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        if (strs.empty()) return "";
        ranges::sort(strs);
        const string &a = strs.front(), &b = strs.back();    // most different pair lexicographically
        size_t i = 0;
        while (i < a.size() && i < b.size() && a[i] == b[i]) ++i;
        return a.substr(0, i);
    }
};
```

**Time:** O(S log n) for sorting · **Space:** O(1) extra. Any prefix shared by the lexicographically smallest and largest strings is shared by everything between them.

### Approach 3: Binary search on the prefix length
```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        if (strs.empty()) return "";
        size_t minLen = ranges::min(strs, {}, &string::size).size();
        auto ok = [&](size_t len) {
            for (auto& s : strs) if (s.compare(0, len, strs[0], 0, len) != 0) return false;
            return true;
        };
        size_t lo = 0, hi = minLen;
        while (lo < hi) {
            size_t mid = (lo + hi + 1) / 2;
            if (ok(mid)) lo = mid; else hi = mid - 1;
        }
        return strs[0].substr(0, lo);
    }
};
```

**Time:** O(S · log m) · **Space:** O(1). Shows binary search on a monotonic predicate ("a prefix of length L is common").

### Walkthrough
**Goal:** longest prefix shared by every string.

1. Use `strs[0]` as the reference.
2. For column i (character position), read `c = strs[0][i]`.
3. Check every other string: if it's too short (`i == size`) or has a different char at i, the answer is `strs[0].substr(0, i)`.
4. If the loop finishes, all of `strs[0]` is the prefix.

**Dry run** `["flower", "flow", "flight"]`:

| i | c | flow | flight | result |
|---|---|---|---|---|
| 0 | f | f ✔ | f ✔ | continue |
| 1 | l | l ✔ | l ✔ | continue |
| 2 | o | o ✔ | i ✘ | return "fl" |

## remove-duplicates-from-sorted-array

### Approach 1: Copy unique values into a set, write back
```cpp
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        set<int> uniq(nums.begin(), nums.end());          // sorted, deduplicated
        int k = 0;
        for (int x : uniq) nums[k++] = x;
        return k;
    }
};
```

**Time:** O(n log n) · **Space:** O(n). Ignores that the input is already sorted and uses extra memory.

### Approach 2: `std::unique`
```cpp
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        return unique(nums.begin(), nums.end()) - nums.begin();   // shifts uniques forward, returns new end
    }
};
```

**Time:** O(n) · **Space:** O(1). Know that `unique` only removes **adjacent** duplicates (hence "sort first" in general) and doesn't shrink the container.

### Walkthrough
**Goal:** compact unique values to the front, in place.

1. `w` = number of unique values written so far; `nums[0]` is always unique → `w = 1`.
2. Scan `r` from 1. If `nums[r]` differs from the last written value `nums[w−1]`, it's new → write it at `nums[w]`, `w++`.
3. Return `w`.

**Dry run** `[0, 0, 1, 1, 1, 2, 2, 3]`:

| r | nums[r] | last written | write? | w |
|---|---|---|---|---|
| 1 | 0 | 0 | no | 1 |
| 2 | 1 | 0 | yes | 2 |
| 3, 4 | 1 | 1 | no | 2 |
| 5 | 2 | 1 | yes | 3 |
| 6 | 2 | 2 | no | 3 |
| 7 | 3 | 2 | yes | **4** |

Front of the array: `[0, 1, 2, 3, …]`.

## merge-sorted-array

### Approach 1: Copy in and sort
```cpp
class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        copy(nums2.begin(), nums2.end(), nums1.begin() + m);
        sort(nums1.begin(), nums1.end());
    }
};
```

**Time:** O((m+n) log(m+n)) · **Space:** O(1) extra (O(log) sort stack). Ignores that both inputs are sorted.

### Approach 2: Forward merge with a copy of nums1
```cpp
class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        vector<int> a(nums1.begin(), nums1.begin() + m);         // save nums1's real elements
        int i = 0, j = 0, w = 0;
        while (i < m && j < n) nums1[w++] = a[i] <= nums2[j] ? a[i++] : nums2[j++];
        while (i < m) nums1[w++] = a[i++];
        while (j < n) nums1[w++] = nums2[j++];
    }
};
```

**Time:** O(m + n) · **Space:** O(m). The standard merge step from merge sort; needs a copy because writing from the front would clobber unread elements.

### Walkthrough
**Goal:** merge in place by filling the empty tail first.

1. Three pointers: `i` = last real element of nums1, `j` = last of nums2, `w` = last slot of nums1.
2. Put the larger of `nums1[i]` and `nums2[j]` at `w`, move that pointer and `w` left.
3. Loop while nums2 has elements. When nums2 runs out, nums1's remaining prefix is already sorted and in place.

**Dry run** `nums1 = [1,2,3,_,_,_]`, `nums2 = [2,5,6]`:

| i (val) | j (val) | w | write | nums1 |
|---|---|---|---|---|
| 2 (3) | 2 (6) | 5 | 6 | 1 2 3 _ _ 6 |
| 2 (3) | 1 (5) | 4 | 5 | 1 2 3 _ 5 6 |
| 2 (3) | 0 (2) | 3 | 3 | 1 2 3 3 5 6 |
| 1 (2) | 0 (2) | 2 | 2 (from nums2, tie) | 1 2 2 3 5 6 |
| — | −1 | | stop | **1 2 2 3 5 6** |

## majority-element

### Approach 1: Hash map counts
```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        unordered_map<int, int> cnt;
        for (int x : nums) if (++cnt[x] > (int)nums.size() / 2) return x;
        return -1;
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Approach 2: Sort and take the middle
```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        ranges::sort(nums);
        return nums[nums.size() / 2];          // the majority must cover the middle index
    }
};
```

**Time:** O(n log n) · **Space:** O(1). A block longer than n/2 must contain index n/2 wherever it starts. (`nth_element` makes this O(n) average.)

### Approach 3: Bit voting
```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        unsigned res = 0;
        for (int b = 0; b < 32; ++b) {
            int ones = 0;
            for (int x : nums) ones += ((unsigned)x >> b) & 1u;
            if (ones > (int)nums.size() / 2) res |= 1u << b;    // majority's bit wins every vote
        }
        return (int)res;
    }
};
```

**Time:** O(32 · n) · **Space:** O(1).

### Walkthrough
**Goal:** find the element occurring more than n/2 times in one pass, O(1) space (Boyer–Moore).

1. Keep a `candidate` and a `count`.
2. When `count == 0`, adopt the current element as candidate.
3. Matching element → `count++`; different → `count--` (one majority vote and one other vote cancel).
4. The majority can't be cancelled completely, so it remains the candidate at the end.

**Dry run** `[2, 2, 1, 1, 1, 2, 2]`:

| x | candidate | count |
|---|---|---|
| 2 | 2 | 1 |
| 2 | 2 | 2 |
| 1 | 2 | 1 |
| 1 | 2 | 0 |
| 1 | 1 | 1 |
| 2 | 1 | 0 |
| 2 | 2 | 1 → **2** |

## count-primes

### Approach 1: Trial division for every number
```cpp
class Solution {
    static bool isPrime(int x) {
        if (x < 2) return false;
        for (int d = 2; (long long)d * d <= x; ++d) if (x % d == 0) return false;
        return true;
    }
public:
    int countPrimes(int n) {
        int c = 0;
        for (int i = 2; i < n; ++i) c += isPrime(i);
        return c;
    }
};
```

**Time:** O(n√n) · **Space:** O(1). Fine for one number, too slow for 5·10⁶ of them.

### Approach 2: Odd-only sieve (half the memory)
```cpp
class Solution {
public:
    int countPrimes(int n) {
        if (n < 3) return 0;
        // index i represents the odd number 2i+1
        vector<bool> comp(n / 2, false);
        int count = 1;                                    // the prime 2
        for (long long i = 1; i < n / 2; ++i) {
            if (comp[i]) continue;
            long long p = 2 * i + 1;
            if (p >= n) break;
            ++count;
            for (long long q = p * p; q < n; q += 2 * p) comp[q / 2] = true;   // odd multiples only
        }
        return count;
    }
};
```

**Time:** O(n log log n) · **Space:** O(n/2) bits. Skipping even numbers halves memory and work — typical embedded-style optimisation.

### Walkthrough
**Goal:** count primes below n with the Sieve of Eratosthenes.

1. Assume everything is prime; `composite[i] = false`.
2. Walk p from 2 upward. If p is still unmarked, it's prime → count it.
3. Mark p², p² + p, p² + 2p, … as composite. Start at p² because smaller multiples k·p (k < p) were marked by k's prime factors already.
4. Each number is marked once per prime factor → total work n·Σ(1/p) = O(n log log n).

**Dry run** n = 20:

| prime p | marks starting at p² |
|---|---|
| 2 | 4, 6, 8, 10, 12, 14, 16, 18 |
| 3 | 9, 12, 15, 18 |
| 5 | 25 ≥ 20 → nothing |
| 7, 11, 13, 17, 19 | nothing |

Primes: 2, 3, 5, 7, 11, 13, 17, 19 → **8**.

## rotate-array

### Approach 1: Extra array
```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        vector<int> out(n);
        for (int i = 0; i < n; ++i) out[(i + k) % n] = nums[i];    // element i moves to i+k
        nums = std::move(out);
    }
};
```

**Time:** O(n) · **Space:** O(n). The clearest statement of where each element goes.

### Approach 2: Cyclic replacements
```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;
        int moved = 0;
        for (int start = 0; moved < n; ++start) {          // gcd(n, k) independent cycles
            int cur = start, val = nums[start];
            do {
                int nxt = (cur + k) % n;
                swap(val, nums[nxt]);                      // drop val into its slot, pick up the old one
                cur = nxt;
                ++moved;
            } while (cur != start);
        }
    }
};
```

**Time:** O(n) · **Space:** O(1). Each element moves exactly once; the number of cycles is gcd(n, k).

### Approach 3: Rotate one step, k times
```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;
        for (int t = 0; t < k; ++t) {
            int last = nums[n - 1];
            for (int i = n - 1; i > 0; --i) nums[i] = nums[i - 1];
            nums[0] = last;
        }
    }
};
```

**Time:** O(n · k) · **Space:** O(1). The naive baseline — TLE for large k.

### Walkthrough
**Goal:** rotate right by k in place using three reversals.

1. Normalise `k %= n` (rotating by n changes nothing).
2. Reverse the whole array — the last k elements are now at the front, but backwards.
3. Reverse the first k elements — fixes their order.
4. Reverse the remaining n − k — fixes theirs.

**Dry run** `[1,2,3,4,5,6,7]`, k = 3:

| step | array |
|---|---|
| start | 1 2 3 4 5 6 7 |
| reverse all | 7 6 5 4 3 2 1 |
| reverse first 3 | **5 6 7** 4 3 2 1 |
| reverse last 4 | 5 6 7 **1 2 3 4** |

## first-unique-character-in-a-string

### Approach 1: Brute force — count each character's occurrences
```cpp
class Solution {
public:
    int firstUniqChar(string s) {
        for (int i = 0; i < (int)s.size(); ++i)
            if (count(s.begin(), s.end(), s[i]) == 1) return i;
        return -1;
    }
};
```

**Time:** O(n²) · **Space:** O(1).

### Approach 2: First/last index comparison
```cpp
class Solution {
public:
    int firstUniqChar(string s) {
        for (int i = 0; i < (int)s.size(); ++i)
            if (s.find(s[i]) == s.rfind(s[i])) return i;      // first and last occurrence coincide
        return -1;
    }
};
```

**Time:** O(n²) worst · **Space:** O(1). Concise; still quadratic.

### Approach 3: One pass over the string, one pass over the alphabet
```cpp
class Solution {
public:
    int firstUniqChar(string s) {
        array<int, 26> first; first.fill(-1);
        array<int, 26> cnt{};
        for (int i = 0; i < (int)s.size(); ++i) {
            int c = s[i] - 'a';
            if (first[c] < 0) first[c] = i;
            ++cnt[c];
        }
        int best = INT_MAX;
        for (int c = 0; c < 26; ++c) if (cnt[c] == 1) best = min(best, first[c]);
        return best == INT_MAX ? -1 : best;
    }
};
```

**Time:** O(n + 26) · **Space:** O(1). The second pass is over 26 letters instead of n characters — better for very long strings.

### Walkthrough
**Goal:** index of the first character that appears exactly once.

1. **Pass 1:** count each letter.
2. **Pass 2:** scan the string again in order; the first position whose letter has count 1 is the answer.

**Dry run** `"loveleetcode"`: counts l:2, o:2, v:1, e:4, t:1, c:1, d:1.

| i | char | count | unique? |
|---|---|---|---|
| 0 | l | 2 | no |
| 1 | o | 2 | no |
| 2 | v | 1 | **yes → 2** |

## find-the-index-of-the-first-occurrence-in-a-string

### Approach 1: Brute force sliding comparison
```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        int n = haystack.size(), m = needle.size();
        for (int i = 0; i + m <= n; ++i) {
            int j = 0;
            while (j < m && haystack[i + j] == needle[j]) ++j;
            if (j == m) return i;
        }
        return -1;
    }
};
```

**Time:** O(n · m) worst (e.g. "aaaa…ab" in "aaaa…a") · **Space:** O(1). Usually fast in practice; what `strstr` historically did.

### Approach 2: Rabin–Karp rolling hash
```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        int n = haystack.size(), m = needle.size();
        if (m > n) return -1;
        const unsigned long long B = 131;
        unsigned long long hN = 0, hW = 0, pow = 1;           // arithmetic mod 2^64 (wraps naturally)
        for (int i = 0; i < m; ++i) {
            hN = hN * B + needle[i];
            hW = hW * B + haystack[i];
            if (i) pow *= B;                                  // B^(m-1)
        }
        for (int i = 0; ; ++i) {
            if (hN == hW && haystack.compare(i, m, needle) == 0) return i;   // verify: collisions possible
            if (i + m >= n) break;
            hW = (hW - haystack[i] * pow) * B + haystack[i + m];          // slide the window by one
        }
        return -1;
    }
};
```

**Time:** O(n + m) expected · **Space:** O(1). The rolling update removes the leftmost character and appends the next one in O(1).

### Approach 3: Standard library
```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        auto pos = haystack.find(needle);
        return pos == string::npos ? -1 : (int)pos;
    }
};
```

**Time:** implementation-defined (typically fast, often O(n·m) worst) · **Space:** O(1). C++17 also offers `std::boyer_moore_searcher` for long patterns.

### Walkthrough
**Goal:** linear-time substring search (KMP).

1. **Failure function** `pi[i]` for the needle: length of the longest proper prefix of `needle[0..i]` that's also a suffix of it.
2. **Search:** keep `k` = how many needle characters currently match.
   1. On mismatch with `k > 0`, fall back to `k = pi[k−1]` — the longest border of what we matched is still matched. The haystack index never moves back.
   2. On match, `k++`. When `k == m`, a full match ends at i.

**Failure function for "abab":**

| i | needle[0..i] | longest border | pi[i] |
|---|---|---|---|
| 0 | a | — | 0 |
| 1 | ab | — | 0 |
| 2 | aba | a | 1 |
| 3 | abab | ab | 2 |

**Search "abab" in "abaabab":** match a,b,a (k = 3), mismatch at haystack[3] = 'a' vs 'b' → k = pi[2] = 1 (the trailing "a" still counts); continue a…b…a…b → k = 4 at i = 6 → answer **3**.

## pascals-triangle

### Approach 1: Binomial coefficients directly
```cpp
class Solution {
public:
    vector<vector<int>> generate(int numRows) {
        vector<vector<int>> rows;
        for (int r = 0; r < numRows; ++r) {
            vector<int> row(r + 1);
            long long c = 1;                              // C(r, 0)
            for (int k = 0; k <= r; ++k) {
                row[k] = (int)c;
                c = c * (r - k) / (k + 1);                // C(r, k+1) from C(r, k), exact
            }
            rows.push_back(std::move(row));
        }
        return rows;
    }
};
```

**Time:** O(numRows²) · **Space:** O(1) extra. Uses C(r, k+1) = C(r, k)·(r−k)/(k+1); each row is independent of the previous one.

### Approach 2: Build each row in place from the previous
```cpp
class Solution {
public:
    vector<vector<int>> generate(int numRows) {
        vector<vector<int>> rows;
        vector<int> row;
        for (int r = 0; r < numRows; ++r) {
            row.push_back(1);
            for (int c = r - 1; c > 0; --c) row[c] += row[c - 1];   // right-to-left: uses old values
            rows.push_back(row);
        }
        return rows;
    }
};
```

**Time:** O(numRows²) · **Space:** O(numRows) working row. Updating right-to-left avoids overwriting values still needed — the same trick as 0/1 knapsack.

### Walkthrough
**Goal:** row r has r+1 entries; edges are 1, inner entries sum the two above.

1. Create row r filled with 1s (handles both edges).
2. For each inner column c (1..r−1): `row[c] = prev[c−1] + prev[c]`.
3. Append the row.

**Dry run** (5 rows):

| r | computation | row |
|---|---|---|
| 0 | — | 1 |
| 1 | — | 1 1 |
| 2 | 1+1 | 1 2 1 |
| 3 | 1+2, 2+1 | 1 3 3 1 |
| 4 | 1+3, 3+3, 3+1 | 1 4 6 4 1 |

## sqrtx

### Approach 1: Linear search
```cpp
class Solution {
public:
    int mySqrt(int x) {
        long long i = 0;
        while ((i + 1) * (i + 1) <= x) ++i;
        return (int)i;
    }
};
```

**Time:** O(√x) — about 46 000 steps for INT_MAX · **Space:** O(1). Acceptable here, but doesn't scale to 64-bit inputs.

### Approach 2: Newton's method (integer)
```cpp
class Solution {
public:
    int mySqrt(int x) {
        if (x < 2) return x;
        long long r = x;
        while (r * r > x) r = (r + x / r) / 2;       // r_{k+1} = (r_k + x/r_k) / 2, decreases monotonically
        return (int)r;
    }
};
```

**Time:** O(log log x) iterations once close (quadratic convergence) · **Space:** O(1). How hardware and libm compute square roots.

### Approach 3: Bit-by-bit (digit-by-digit) square root
```cpp
class Solution {
public:
    int mySqrt(int x) {
        unsigned n = x, root = 0, bit = 1u << 30;
        while (bit > n) bit >>= 2;
        while (bit) {
            if (n >= root + bit) { n -= root + bit; root = (root >> 1) + bit; }
            else root >>= 1;
            bit >>= 2;
        }
        return (int)root;
    }
};
```

**Time:** O(16) iterations for 32-bit · **Space:** O(1). No multiplication or division — the embedded favourite (see Math → Embedded Math).

### Walkthrough
**Goal:** largest m with m² ≤ x, via binary search on the answer.

1. The predicate "m² ≤ x" is true for small m and false for large m (monotonic).
2. Search `[lo, hi] = [0, x]` for the **last** true value.
3. `mid` rounds **up** (`(hi − lo + 1)/2`): with `lo = mid` on success, rounding down could make `mid == lo` forever.
4. Success → `lo = mid`; failure → `hi = mid − 1`. Stop when `lo == hi`.

**Dry run** x = 8:

| lo | hi | mid | mid² ≤ 8? | update |
|---|---|---|---|---|
| 0 | 8 | 4 | 16 no | hi = 3 |
| 0 | 3 | 2 | 4 yes | lo = 2 |
| 2 | 3 | 3 | 9 no | hi = 2 |

Answer **2**.

## add-binary

### Approach 1: Convert to integers (breaks on long inputs)
```cpp
class Solution {
public:
    string addBinary(string a, string b) {
        unsigned long long x = stoull(a, nullptr, 2), y = stoull(b, nullptr, 2);   // only up to 64 bits!
        unsigned long long s = x + y;
        if (s == 0) return "0";
        string out;
        while (s) { out += char('0' + (s & 1)); s >>= 1; }
        return string(out.rbegin(), out.rend());
    }
};
```

**Time:** O(n) · **Space:** O(n). Fails for strings longer than 63 bits (the problem allows 10⁴) — the reason the digit-by-digit approach exists.

### Approach 2: Pad to equal length first
```cpp
class Solution {
public:
    string addBinary(string a, string b) {
        size_t n = max(a.size(), b.size());
        a.insert(0, n - a.size(), '0');                     // left-pad with zeros
        b.insert(0, n - b.size(), '0');
        string out(n, '0');
        int carry = 0;
        for (int i = (int)n - 1; i >= 0; --i) {
            int s = (a[i] - '0') + (b[i] - '0') + carry;
            out[i] = char('0' + s % 2);
            carry = s / 2;
        }
        return carry ? "1" + out : out;
    }
};
```

**Time:** O(n) · **Space:** O(n). Writes directly in position — no final reverse.

### Walkthrough
**Goal:** add binary strings of any length.

1. Pointers `i`, `j` at the last characters, `carry = 0`.
2. While either string has digits left **or** carry is 1: `sum = carry + digitA + digitB` (missing digits count as 0).
3. Output bit `sum % 2`, new carry `sum / 2`.
4. Bits were produced least-significant first → reverse once at the end.

**Dry run** a = "1010", b = "1011":

| i | j | bits | carry in | sum | out bit | carry out |
|---|---|---|---|---|---|---|
| 3 | 3 | 0 + 1 | 0 | 1 | 1 | 0 |
| 2 | 2 | 1 + 1 | 0 | 2 | 0 | 1 |
| 1 | 1 | 0 + 0 | 1 | 1 | 1 | 0 |
| 0 | 0 | 1 + 1 | 0 | 2 | 0 | 1 |
| — | — | — | 1 | 1 | 1 | 0 |

Collected "10101" (reversed from "10101" — a palindrome here) → **"10101"** (10 + 11 = 21).

## implement-queue-using-stacks

### Approach 1: Make push expensive (always keep `s1` in queue order)
```cpp
class MyQueue {
    stack<int> s1, s2;                               // s1.top() is always the front of the queue
public:
    void push(int x) {
        while (!s1.empty()) { s2.push(s1.top()); s1.pop(); }
        s1.push(x);                                  // new element goes to the bottom
        while (!s2.empty()) { s1.push(s2.top()); s2.pop(); }
    }
    int pop() { int v = s1.top(); s1.pop(); return v; }
    int peek() { return s1.top(); }
    bool empty() const { return s1.empty(); }
};
```

**Time:** push O(n), others O(1) · **Space:** O(n). Correct, but every push moves everything twice.

### Approach 2: Recursive pop (single stack + call stack)
```cpp
class MyQueue {
    stack<int> s;
    int popBottom() {                                // removes and returns the bottom element
        int top = s.top(); s.pop();
        if (s.empty()) return top;
        int bottom = popBottom();
        s.push(top);
        return bottom;
    }
public:
    void push(int x) { s.push(x); }
    int pop() { return popBottom(); }
    int peek() { int v = popBottom(); stack<int> tmp; while (!s.empty()) { tmp.push(s.top()); s.pop(); } s.push(v); while (!tmp.empty()) { s.push(tmp.top()); tmp.pop(); } return v; }
    bool empty() const { return s.empty(); }
};
```

**Time:** pop/peek O(n) · **Space:** O(n) recursion. Shows that the call stack can serve as the second stack — a trick question favourite.

### Walkthrough
**Goal:** FIFO behaviour from two LIFO stacks with amortised O(1) operations.

1. `push` always goes onto `in`.
2. `pop`/`peek` read from `out`. If `out` is empty, pour everything from `in` into `out` — this reverses the order, so the oldest element ends up on top.
3. Never pour while `out` still has elements (that would break the order).
4. **Amortised analysis:** each element is pushed onto `in` once, moved to `out` once, and popped from `out` once → 3 stack operations per element over its lifetime, so the average per queue operation is O(1).

**Dry run** push 1, push 2, peek, pop, push 3, pop, pop:

| op | in (bottom→top) | out (bottom→top) | returns |
|---|---|---|---|
| push 1 | 1 | | |
| push 2 | 1 2 | | |
| peek | | 2 1 (poured) | 1 |
| pop | | 2 | 1 |
| push 3 | 3 | 2 | |
| pop | 3 | | 2 |
| pop | | 3 (poured) → | 3 |

## sort-colors

### Approach 1: Library sort
```cpp
class Solution {
public:
    void sortColors(vector<int>& nums) { ranges::sort(nums); }
};
```

**Time:** O(n log n) · **Space:** O(log n). Correct, but misses the point: only three distinct values.

### Approach 2: Counting sort (two passes)
```cpp
class Solution {
public:
    void sortColors(vector<int>& nums) {
        array<int, 3> cnt{};
        for (int x : nums) ++cnt[x];
        int i = 0;
        for (int c = 0; c < 3; ++c)
            while (cnt[c]--) nums[i++] = c;
    }
};
```

**Time:** O(n) · **Space:** O(1). Simple and fast; the follow-up asks for a single pass.

### Walkthrough
**Goal:** one-pass, in-place 3-way partition (Dutch national flag).

1. Regions: `[0, lo)` = 0s, `[lo, mid)` = 1s, `[mid, hi]` = unprocessed, `(hi, n)` = 2s.
2. Look at `nums[mid]`:
   1. 0 → swap into the 0 region: `swap(nums[lo], nums[mid])`, `lo++`, `mid++` (the swapped-in value is a known 1, so `mid` can advance).
   2. 1 → already in place: `mid++`.
   3. 2 → swap with `nums[hi]`, `hi--`; **don't** advance `mid` — the value that came from `hi` hasn't been examined.
3. Stop when `mid > hi`.

**Dry run** `[2, 0, 2, 1, 1, 0]`:

| lo | mid | hi | nums[mid] | action | array |
|---|---|---|---|---|---|
| 0 | 0 | 5 | 2 | swap with hi | 0 0 2 1 1 2 |
| 0 | 0 | 4 | 0 | swap lo | 0 0 2 1 1 2 |
| 1 | 1 | 4 | 0 | swap lo | 0 0 2 1 1 2 |
| 2 | 2 | 4 | 2 | swap with hi | 0 0 1 1 2 2 |
| 2 | 2 | 3 | 1 | mid++ | |
| 2 | 3 | 3 | 1 | mid++ → stop | **0 0 1 1 2 2** |

## intersection-of-two-arrays-ii

### Approach 1: Sort both + two pointers
```cpp
class Solution {
public:
    vector<int> intersect(vector<int>& a, vector<int>& b) {
        ranges::sort(a); ranges::sort(b);
        vector<int> out;
        size_t i = 0, j = 0;
        while (i < a.size() && j < b.size()) {
            if (a[i] < b[j]) ++i;
            else if (a[i] > b[j]) ++j;
            else { out.push_back(a[i]); ++i; ++j; }   // common element: take one from each
        }
        return out;
    }
};
```

**Time:** O(m log m + n log n) · **Space:** O(1) extra. The answer to "what if the arrays are already sorted?" (then it's O(m + n)).

### Approach 2: Brute force with a used-marker
```cpp
class Solution {
public:
    vector<int> intersect(vector<int>& a, vector<int>& b) {
        vector<bool> used(b.size(), false);
        vector<int> out;
        for (int x : a)
            for (size_t j = 0; j < b.size(); ++j)
                if (!used[j] && b[j] == x) { used[j] = true; out.push_back(x); break; }
        return out;
    }
};
```

**Time:** O(m · n) · **Space:** O(n).

### Walkthrough
**Goal:** multiset intersection — each common value appears min(countA, countB) times.

1. Count the smaller array into a hash map (less memory).
2. Walk the larger array: for each x with a remaining count > 0, output x and decrement the count.
3. Decrementing ensures x is emitted no more times than it appears in the smaller array.

**Dry run** `a = [4, 9, 5]`, `b = [9, 4, 9, 8, 4]`: counts from a = {4:1, 9:1, 5:1}.

| x in b | count before | output? | count after |
|---|---|---|---|
| 9 | 1 | yes | 0 |
| 4 | 1 | yes | 0 |
| 9 | 0 | no | 0 |
| 8 | — | no | — |
| 4 | 0 | no | 0 |

Result **[9, 4]**.
