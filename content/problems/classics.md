# Classics

The problems every programmer meets first, and interviewers still use as warm-ups or phone-screen filters. They're "easy", but each one hides a lesson: modular arithmetic, overflow, in-place updates, two pointers, hashing, sieves, binary search on the answer. Do them fast **and** cleanly, then study the alternative solutions — interviewers often ask "can you do it another way?".

**How to use this path**
- Solve each one in under 10 minutes, then compare with *every* approach shown.
- Explain the complexity out loud — the "Complexity analysis" section shows the level of detail to aim for.
- These are independent of the roadmap tree: do them any time as a warm-up.

## FizzBuzz
- difficulty: Easy
- leetcode: 412
- slug: fizz-buzz

Return a list of strings for `1..n`: `"FizzBuzz"` if divisible by 3 and 5, `"Fizz"` if divisible by 3, `"Buzz"` if divisible by 5, otherwise the number itself.

```text
n = 5 -> ["1","2","Fizz","4","Buzz"]
```

### Hint
Check the combined case (divisible by 15) first — or build the string by concatenation so you never need to.

### Solution
```cpp
class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> out;
        out.reserve(n);
        for (int i = 1; i <= n; ++i) {
            string s;
            if (i % 3 == 0) s += "Fizz";
            if (i % 5 == 0) s += "Buzz";
            out.push_back(s.empty() ? to_string(i) : std::move(s));
        }
        return out;
    }
};
```

### Explanation
Building the string by concatenation means the "both" case falls out for free — and adding a new rule (e.g. 7 → "Bazz") is one more `if`, not a combinatorial explosion of `else if` branches. That extensibility is what interviewers probe with FizzBuzz.

**Time:** O(n) · **Space:** O(1) extra (output excluded)

## Two Sum
- difficulty: Easy
- leetcode: 1
- slug: two-sum

Given `nums` and `target`, return indices of the two numbers adding to `target` (exactly one answer; don't reuse an element).

```text
nums = [3, 2, 4], target = 6 -> [1, 2]
```

### Hint
For each number, the partner you need is `target − x`. Remember what you've seen.

### Solution
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;                // value -> index
        for (int i = 0; i < (int)nums.size(); ++i) {
            if (auto it = seen.find(target - nums[i]); it != seen.end()) return {it->second, i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
```

### Explanation
The complement lookup turns the O(n²) pair search into one pass. Looking up *before* inserting prevents using the same element twice (e.g. `[3, 2, 4]`, target 6 must not return `[0, 0]`).

**Time:** O(n) · **Space:** O(n)

## Reverse String
- difficulty: Easy
- leetcode: 344
- slug: reverse-string

Reverse a character array in place with O(1) extra memory.

```text
["h","e","l","l","o"] -> ["o","l","l","e","h"]
```

### Hint
Swap the ends and move inward.

### Solution
```cpp
class Solution {
public:
    void reverseString(vector<char>& s) {
        for (int l = 0, r = (int)s.size() - 1; l < r; ++l, --r)
            swap(s[l], s[r]);
    }
};
```

### Explanation
Two pointers converge; each swap fixes two positions, so n/2 swaps. In production you'd write `std::reverse(s.begin(), s.end())` — but the interviewer wants to see the loop and the `l < r` condition (with `l <= r` the middle element swaps with itself — harmless, but sloppy).

**Time:** O(n) · **Space:** O(1)

## Palindrome Number
- difficulty: Easy
- leetcode: 9
- slug: palindrome-number

Return `true` if integer `x` reads the same backward. Solve it without converting to a string.

```text
121 -> true    -121 -> false    10 -> false
```

### Hint
Reverse only the second half of the digits and compare with the first half.

### Solution
```cpp
class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;   // negatives & trailing zeros
        int rev = 0;
        while (x > rev) {                                     // stop at the middle
            rev = rev * 10 + x % 10;
            x /= 10;
        }
        return x == rev || x == rev / 10;                     // even / odd digit count
    }
};
```

### Explanation
Reversing only half the number means `rev` never exceeds the original's magnitude → no overflow possible. When `x ≤ rev` we've passed the middle. For odd lengths the middle digit ends up in `rev` and is dropped with `rev / 10`.

**Time:** O(log₁₀ x) · **Space:** O(1)

## Fibonacci Number
- difficulty: Easy
- leetcode: 509
- slug: fibonacci-number

Compute `F(n)` where `F(0) = 0`, `F(1) = 1`, `F(n) = F(n−1) + F(n−2)`.

```text
n = 4 -> 3        (0, 1, 1, 2, 3)
```

### Hint
The naive recursion recomputes subproblems. Keep only the last two values.

### Solution
```cpp
class Solution {
public:
    int fib(int n) {
        int a = 0, b = 1;                  // F(i), F(i+1)
        for (int i = 0; i < n; ++i) {
            int next = a + b;
            a = b;
            b = next;
        }
        return a;
    }
};
```

### Explanation
The canonical first DP problem: recursion → memoisation → tabulation → O(1) space. Mention that F(n) grows like φⁿ, so `int` overflows past n = 46 (use `uint64_t` up to 93, big integers beyond), and that O(log n) is possible with matrix exponentiation or fast doubling.

**Time:** O(n) · **Space:** O(1)

## Roman to Integer
- difficulty: Easy
- leetcode: 13
- slug: roman-to-integer

Convert a Roman numeral (I=1, V=5, X=10, L=50, C=100, D=500, M=1000) to an integer. Subtractive pairs: IV=4, IX=9, XL=40, XC=90, CD=400, CM=900.

```text
"MCMXCIV" -> 1994
```

### Hint
If a symbol is smaller than the one after it, subtract it; otherwise add it.

### Solution
```cpp
class Solution {
    static int val(char c) {
        switch (c) {
            case 'I': return 1;   case 'V': return 5;   case 'X': return 10;
            case 'L': return 50;  case 'C': return 100; case 'D': return 500;
            case 'M': return 1000;
        }
        return 0;
    }
public:
    int romanToInt(string s) {
        int total = 0;
        for (size_t i = 0; i < s.size(); ++i) {
            int v = val(s[i]);
            if (i + 1 < s.size() && v < val(s[i + 1])) total -= v;   // subtractive notation
            else total += v;
        }
        return total;
    }
};
```

### Explanation
One look-ahead rule handles all six subtractive cases without listing them. A `switch` compiles to a jump table — faster than a hash map lookup for a fixed set of characters.

**Time:** O(n) · **Space:** O(1)

## Longest Common Prefix
- difficulty: Easy
- leetcode: 14
- slug: longest-common-prefix

Return the longest common prefix of an array of strings (`""` if none).

```text
["flower","flow","flight"] -> "fl"
```

### Hint
Compare character by character down the columns (vertical scanning); stop at the first mismatch or the shortest string's end.

### Solution
```cpp
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        if (strs.empty()) return "";
        for (size_t i = 0; i < strs[0].size(); ++i) {
            char c = strs[0][i];
            for (size_t k = 1; k < strs.size(); ++k)
                if (i == strs[k].size() || strs[k][i] != c) return strs[0].substr(0, i);
        }
        return strs[0];
    }
};
```

### Explanation
Vertical scanning stops as soon as any string disagrees, so it never reads past the answer's length + 1 in any string. Checking `i == strs[k].size()` first prevents out-of-range access on shorter strings.

**Time:** O(S) where S = total characters examined ≤ n·m · **Space:** O(1) extra

## Remove Duplicates from Sorted Array
- difficulty: Easy
- leetcode: 26
- slug: remove-duplicates-from-sorted-array

Remove duplicates **in place** from a sorted array so each value appears once; return the number of unique elements `k` (the first `k` slots hold them).

```text
[0,0,1,1,1,2,2,3,3,4] -> 5, nums = [0,1,2,3,4,...]
```

### Hint
Read/write pointers: write a value only when it differs from the last written one.

### Solution
```cpp
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        if (nums.empty()) return 0;
        int w = 1;                                   // nums[0..w) are unique
        for (int r = 1; r < (int)nums.size(); ++r)
            if (nums[r] != nums[w - 1]) nums[w++] = nums[r];
        return w;
    }
};
```

### Explanation
Because the array is sorted, duplicates are adjacent, so comparing with the last *written* value suffices. This is what `std::unique` does (it returns the new logical end; combine with `erase` to shrink a vector).

**Time:** O(n) · **Space:** O(1)

## Merge Sorted Array
- difficulty: Easy
- leetcode: 88
- slug: merge-sorted-array

`nums1` has length `m + n` (last n slots are empty); `nums2` has n elements. Both sorted. Merge `nums2` into `nums1` in place.

```text
nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3 -> [1,2,2,3,5,6]
```

### Hint
Fill from the **back** — the empty space is at the end, so nothing gets overwritten.

### Solution
```cpp
class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        int i = m - 1, j = n - 1, w = m + n - 1;
        while (j >= 0) {                                    // once nums2 is done, nums1's rest is in place
            if (i >= 0 && nums1[i] > nums2[j]) nums1[w--] = nums1[i--];
            else nums1[w--] = nums2[j--];
        }
    }
};
```

### Explanation
Merging from the front would overwrite unread `nums1` elements. From the back, the write pointer `w` is always ≥ the read pointer `i` (there are exactly `j + 1` free slots between them), so no data is lost. When `nums2` is exhausted, the remaining `nums1` elements are already in position.

**Time:** O(m + n) · **Space:** O(1)

## Majority Element
- difficulty: Easy
- leetcode: 169
- slug: majority-element

Return the element appearing more than ⌊n/2⌋ times (guaranteed to exist).

```text
[2,2,1,1,1,2,2] -> 2
```

### Hint
Boyer–Moore voting: pair off different elements; the majority survives.

### Solution
```cpp
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        int candidate = 0, count = 0;
        for (int x : nums) {
            if (count == 0) candidate = x;          // start a new block
            count += (x == candidate) ? 1 : -1;
        }
        return candidate;
    }
};
```

### Explanation
Each "−1" cancels one majority element against one other element. Since the majority has more than half the elements, it can't be fully cancelled and must be the final candidate. If existence weren't guaranteed, a second pass would verify the count.

**Time:** O(n) · **Space:** O(1)

## Count Primes
- difficulty: Medium
- leetcode: 204
- slug: count-primes

Count the primes strictly less than `n`.

```text
n = 10 -> 4   (2, 3, 5, 7)
```

### Hint
Sieve of Eratosthenes: cross out multiples of each prime, starting from p².

### Solution
```cpp
class Solution {
public:
    int countPrimes(int n) {
        if (n < 3) return 0;
        vector<bool> composite(n, false);
        int count = 0;
        for (long long p = 2; p < n; ++p) {
            if (composite[p]) continue;
            ++count;                                        // p is prime
            for (long long q = p * p; q < n; q += p) composite[q] = true;
        }
        return count;
    }
};
```

### Explanation
Starting at `p²` is safe because smaller multiples `k·p` (k < p) were already crossed out by the smaller prime factor of k. `long long` prevents `p * p` overflowing for large n. The sieve is the standard tool whenever you need many primes.

**Time:** O(n log log n) · **Space:** O(n) bits

## Rotate Array
- difficulty: Medium
- leetcode: 189
- slug: rotate-array

Rotate an array to the right by `k` steps, in place.

```text
[1,2,3,4,5,6,7], k = 3 -> [5,6,7,1,2,3,4]
```

### Hint
Reverse the whole array, then reverse the first k and the remaining n−k separately.

### Solution
```cpp
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;                                            // k may exceed n
        reverse(nums.begin(), nums.end());
        reverse(nums.begin(), nums.begin() + k);
        reverse(nums.begin() + k, nums.end());
    }
};
```

### Explanation
Rotating right by k moves the last k elements to the front. Reversing everything puts them in front but backwards; the two partial reversals fix the order of each block. Don't forget `k %= n`. `std::rotate(nums.begin(), nums.end() - k, nums.end())` does this in the STL.

**Time:** O(n) · **Space:** O(1)

## First Unique Character in a String
- difficulty: Easy
- leetcode: 387
- slug: first-unique-character-in-a-string

Return the index of the first non-repeating character in `s`, or −1.

```text
"loveleetcode" -> 2   ('v')
```

### Hint
Two passes: count every character, then find the first with count 1.

### Solution
```cpp
class Solution {
public:
    int firstUniqChar(string s) {
        array<int, 26> cnt{};
        for (char c : s) ++cnt[c - 'a'];
        for (int i = 0; i < (int)s.size(); ++i)
            if (cnt[s[i] - 'a'] == 1) return i;
        return -1;
    }
};
```

### Explanation
The first pass gathers global information (counts), the second applies it in original order — a pattern that recurs constantly. A fixed `array<int, 26>` beats a hash map for lowercase letters.

**Time:** O(n) · **Space:** O(1) (26 counters)

## Find the Index of the First Occurrence in a String
- difficulty: Easy
- leetcode: 28
- slug: find-the-index-of-the-first-occurrence-in-a-string

Return the index of the first occurrence of `needle` in `haystack`, or −1 (this is `strstr` / `string::find`).

```text
haystack = "sadbutsad", needle = "sad" -> 0
```

### Hint
Brute force is O(n·m). KMP precomputes, for the needle, how far you can shift after a mismatch.

### Solution
```cpp
class Solution {
public:
    int strStr(string haystack, string needle) {
        int m = needle.size();
        if (m == 0) return 0;
        vector<int> pi(m, 0);                         // KMP failure function
        for (int i = 1, k = 0; i < m; ++i) {
            while (k > 0 && needle[i] != needle[k]) k = pi[k - 1];
            if (needle[i] == needle[k]) ++k;
            pi[i] = k;
        }
        for (int i = 0, k = 0; i < (int)haystack.size(); ++i) {
            while (k > 0 && haystack[i] != needle[k]) k = pi[k - 1];   // fall back, never move i back
            if (haystack[i] == needle[k]) ++k;
            if (k == m) return i - m + 1;
        }
        return -1;
    }
};
```

### Explanation
`pi[i]` = length of the longest proper prefix of `needle[0..i]` that is also a suffix. After a mismatch, the matched part's longest border tells us how much of the needle is still matched, so the haystack pointer never moves backwards → linear time.

**Time:** O(n + m) · **Space:** O(m)

## Pascal's Triangle
- difficulty: Easy
- leetcode: 118
- slug: pascals-triangle

Generate the first `numRows` rows of Pascal's triangle.

```text
numRows = 5 -> [[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]
```

### Hint
Each inner entry is the sum of the two entries above it.

### Solution
```cpp
class Solution {
public:
    vector<vector<int>> generate(int numRows) {
        vector<vector<int>> rows;
        for (int r = 0; r < numRows; ++r) {
            vector<int> row(r + 1, 1);                          // edges are 1
            for (int c = 1; c < r; ++c) row[c] = rows[r - 1][c - 1] + rows[r - 1][c];
            rows.push_back(std::move(row));
        }
        return rows;
    }
};
```

### Explanation
Row r holds the binomial coefficients C(r, 0..r); the addition rule is Pascal's identity C(r, c) = C(r−1, c−1) + C(r−1, c) — the same recurrence behind many counting DPs (grid paths, combinations).

**Time:** O(numRows²) · **Space:** O(1) extra (output excluded)

## Sqrt(x)
- difficulty: Easy
- leetcode: 69
- slug: sqrtx

Return ⌊√x⌋ for a non-negative int `x`, without `sqrt` or `pow`.

```text
x = 8 -> 2
```

### Hint
Binary search for the largest `m` with `m·m ≤ x`. Beware overflow in `m·m`.

### Solution
```cpp
class Solution {
public:
    int mySqrt(int x) {
        long long lo = 0, hi = x;                     // answer is in [0, x]
        while (lo < hi) {
            long long mid = lo + (hi - lo + 1) / 2;   // upper mid: avoids an infinite loop
            if (mid * mid <= x) lo = mid;             // mid works: answer is mid or larger
            else hi = mid - 1;
        }
        return (int)lo;
    }
};
```

### Explanation
"Largest value satisfying a monotonic condition" = binary search on the answer. Because we set `lo = mid` on success, mid must round **up**; otherwise `lo = mid` could repeat forever when `hi = lo + 1`. `long long` keeps `mid * mid` from overflowing.

**Time:** O(log x) · **Space:** O(1)

## Add Binary
- difficulty: Easy
- leetcode: 67
- slug: add-binary

Add two binary strings and return the sum as a binary string.

```text
a = "1010", b = "1011" -> "10101"
```

### Hint
Grade-school addition from the right with a carry.

### Solution
```cpp
class Solution {
public:
    string addBinary(string a, string b) {
        string out;
        int i = a.size() - 1, j = b.size() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry) {
            int sum = carry;
            if (i >= 0) sum += a[i--] - '0';
            if (j >= 0) sum += b[j--] - '0';
            out.push_back(char('0' + (sum & 1)));     // sum % 2
            carry = sum >> 1;                          // sum / 2
        }
        reverse(out.begin(), out.end());
        return out;
    }
};
```

### Explanation
Same skeleton as Add Two Numbers and Multiply Strings: walk from the least significant digit, continue while *either* input or the carry remains. Appending then reversing once is O(n); inserting at the front each time would be O(n²).

**Time:** O(max(m, n)) · **Space:** O(1) extra (output excluded)

## Implement Queue using Stacks
- difficulty: Easy
- leetcode: 232
- slug: implement-queue-using-stacks

Implement a FIFO queue (`push`, `pop`, `peek`, `empty`) using only two stacks.

```text
push(1), push(2), peek() -> 1, pop() -> 1, empty() -> false
```

### Hint
One stack receives pushes; the other serves pops. Move elements over only when the output stack is empty.

### Solution
```cpp
class MyQueue {
    stack<int> in, out;
    void shift() {                                    // reverse `in` into `out` only when needed
        if (out.empty())
            while (!in.empty()) { out.push(in.top()); in.pop(); }
    }
public:
    void push(int x) { in.push(x); }
    int pop() { shift(); int v = out.top(); out.pop(); return v; }
    int peek() { shift(); return out.top(); }
    bool empty() const { return in.empty() && out.empty(); }
};
```

### Explanation
Moving the input stack onto the output stack reverses the order, turning LIFO into FIFO. Each element is moved at most once in its lifetime, so although a single `pop` can cost O(n), the **amortised** cost per operation is O(1) — the textbook amortised-analysis example.

**Time:** amortised O(1) per op · **Space:** O(n)

## Sort Colors
- difficulty: Medium
- leetcode: 75
- slug: sort-colors

Sort an array of 0s, 1s and 2s in place in one pass (Dutch national flag).

```text
[2,0,2,1,1,0] -> [0,0,1,1,2,2]
```

### Hint
Three regions: 0s at the front (`lo`), 2s at the back (`hi`), scan with `mid`.

### Solution
```cpp
class Solution {
public:
    void sortColors(vector<int>& nums) {
        int lo = 0, mid = 0, hi = (int)nums.size() - 1;
        while (mid <= hi) {
            if (nums[mid] == 0) swap(nums[lo++], nums[mid++]);
            else if (nums[mid] == 2) swap(nums[mid], nums[hi--]);   // don't advance mid: recheck swapped value
            else ++mid;
        }
    }
};
```

### Explanation
Invariant: `[0, lo)` = 0s, `[lo, mid)` = 1s, `[mid, hi]` = unknown, `(hi, end)` = 2s. Each step shrinks the unknown region by one. After swapping with `hi`, the new `nums[mid]` is unexamined, so `mid` stays. This 3-way partition is also how robust quicksort handles duplicates.

**Time:** O(n) single pass · **Space:** O(1)

## Intersection of Two Arrays II
- difficulty: Easy
- leetcode: 350
- slug: intersection-of-two-arrays-ii

Return the intersection of two arrays, including duplicates as many times as they appear in both.

```text
nums1 = [1,2,2,1], nums2 = [2,2] -> [2,2]
```

### Hint
Count the smaller array in a hash map; walk the other and consume counts.

### Solution
```cpp
class Solution {
public:
    vector<int> intersect(vector<int>& a, vector<int>& b) {
        if (a.size() > b.size()) swap(a, b);          // count the smaller array
        unordered_map<int, int> cnt;
        for (int x : a) ++cnt[x];
        vector<int> out;
        for (int x : b)
            if (auto it = cnt.find(x); it != cnt.end() && it->second > 0) { out.push_back(x); --it->second; }
        return out;
    }
};
```

### Explanation
Counting the smaller array minimises memory. Follow-ups interviewers ask: if both are sorted → two pointers with O(1) space; if `nums2` is on disk and too big for memory → stream it in chunks against the in-memory count map of `nums1`.

**Time:** O(m + n) · **Space:** O(min(m, n))
