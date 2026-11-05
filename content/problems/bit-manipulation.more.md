## single-number

### Approach 1: Hash map counts
```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        unordered_map<int, int> cnt;
        for (int x : nums) ++cnt[x];
        for (auto [v, c] : cnt) if (c == 1) return v;
        return 0;
    }
};
```

**Time:** O(n) · **Space:** O(n). Violates the O(1)-space requirement.

### Approach 2: Sort and scan pairs
```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        ranges::sort(nums);
        for (size_t i = 0; i + 1 < nums.size(); i += 2)
            if (nums[i] != nums[i + 1]) return nums[i];   // pair broken: nums[i] is single
        return nums.back();
    }
};
```

**Time:** O(n log n) · **Space:** O(1).

### Approach 3: Math — 2·(sum of distinct) − sum
```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        unordered_set<int> s(nums.begin(), nums.end());
        long long distinct = 0, total = 0;
        for (int x : s) distinct += x;
        for (int x : nums) total += x;
        return int(2 * distinct - total);
    }
};
```

**Time:** O(n) · **Space:** O(n). Cute, but XOR is better in every way.

### Walkthrough
**Goal:** one value appears once, every other twice; O(n) time, O(1) space.

1. XOR facts: `x ^ x = 0`, `x ^ 0 = x`, and XOR is commutative and associative — order doesn't matter.
2. XOR all numbers together: each pair cancels to 0, leaving only the single number.

**Dry run** `[4, 1, 2, 1, 2]` (binary):

| x | acc before | acc after |
|---|---|---|
| 4 (100) | 000 | 100 |
| 1 (001) | 100 | 101 |
| 2 (010) | 101 | 111 |
| 1 (001) | 111 | 110 |
| 2 (010) | 110 | **100 = 4** |

## number-of-1-bits

### Approach 1: Check every bit
```cpp
class Solution {
public:
    int hammingWeight(uint32_t n) {
        int count = 0;
        for (int i = 0; i < 32; ++i) count += (n >> i) & 1u;
        return count;
    }
};
```

**Time:** O(32) · **Space:** O(1). Straightforward; always 32 iterations.

### Approach 2: Byte lookup table
```cpp
constexpr array<uint8_t, 256> makePopTable() {            // free function: complete before use
    array<uint8_t, 256> t{};
    for (int i = 1; i < 256; ++i) t[i] = (i & 1) + t[i / 2];
    return t;
}
constexpr auto table = makePopTable();                      // computed at compile time, stored in ROM

class Solution {
public:
    int hammingWeight(uint32_t n) {
        return table[n & 0xFF] + table[(n >> 8) & 0xFF] + table[(n >> 16) & 0xFF] + table[n >> 24];
    }
};
```

**Time:** O(1) — 4 lookups · **Space:** 256 bytes. A classic embedded speed/memory trade-off on CPUs without a popcount instruction. (The builder must be a free function: a `static constexpr` member can't call a member function of a class that isn't complete yet.)

### Approach 3: Hardware / standard library
```cpp
class Solution {
public:
    int hammingWeight(uint32_t n) { return std::popcount(n); }   // C++20 <bit>; compiles to POPCNT/CNT
};
```

**Time:** O(1) · **Space:** O(1). What you'd write in production.

### Walkthrough
**Goal:** count set bits using Brian Kernighan's trick.

1. `n & (n − 1)` clears the **lowest set bit**: subtracting 1 flips that bit to 0 and all lower zeros to 1; the AND removes them all.
2. Repeat until `n` is 0; the number of iterations = number of set bits.

**Dry run** `n = 0b101100` (44):

| n | n − 1 | n & (n−1) | count |
|---|---|---|---|
| 101100 | 101011 | 101000 | 1 |
| 101000 | 100111 | 100000 | 2 |
| 100000 | 011111 | 000000 | **3** |

## counting-bits

### Approach 1: Popcount each number
```cpp
class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1);
        for (int i = 0; i <= n; ++i) {
            int c = 0;
            for (unsigned x = i; x; x &= x - 1) ++c;
            ans[i] = c;
        }
        return ans;
    }
};
```

**Time:** O(n log n) · **Space:** O(1) extra. The problem asks for O(n).

### Approach 2: DP using the highest power of two
```cpp
class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1, 0);
        int offset = 1;                               // largest power of two <= i
        for (int i = 1; i <= n; ++i) {
            if (offset * 2 == i) offset = i;
            ans[i] = 1 + ans[i - offset];             // i = offset + (i - offset)
        }
        return ans;
    }
};
```

**Time:** O(n) · **Space:** O(1) extra. A third valid recurrence: `ans[i] = ans[i & (i − 1)] + 1`.

### Walkthrough
**Goal:** popcount for every i in 0..n in O(n).

1. `i >> 1` is i with its lowest bit removed — a smaller number whose answer is already known.
2. Add back the removed bit: `ans[i] = ans[i >> 1] + (i & 1)`.

**Dry run** n = 6:

| i | binary | i >> 1 | ans[i >> 1] | i & 1 | ans[i] |
|---|---|---|---|---|---|
| 0 | 000 | 0 | — | 0 | 0 |
| 1 | 001 | 0 | 0 | 1 | 1 |
| 2 | 010 | 1 | 1 | 0 | 1 |
| 3 | 011 | 1 | 1 | 1 | 2 |
| 4 | 100 | 2 | 1 | 0 | 1 |
| 5 | 101 | 2 | 1 | 1 | 2 |
| 6 | 110 | 3 | 2 | 0 | 2 |

## reverse-bits

### Approach 1: Bit-by-bit loop
```cpp
class Solution {
public:
    uint32_t reverseBits(uint32_t n) {
        uint32_t r = 0;
        for (int i = 0; i < 32; ++i) {
            r = (r << 1) | (n & 1u);    // append n's lowest bit to r
            n >>= 1;
        }
        return r;
    }
};
```

**Time:** O(32) · **Space:** O(1). The first version to write.

### Approach 2: Byte lookup table
```cpp
constexpr array<uint8_t, 256> makeRevTable() {
    array<uint8_t, 256> t{};
    for (int i = 0; i < 256; ++i) {
        uint8_t r = 0;
        for (int b = 0; b < 8; ++b) if (i >> b & 1) r |= 1u << (7 - b);
        t[i] = r;
    }
    return t;
}
constexpr auto rev = makeRevTable();

class Solution {
public:
    uint32_t reverseBits(uint32_t n) {
        return (uint32_t)rev[n & 0xFF] << 24 | (uint32_t)rev[(n >> 8) & 0xFF] << 16 |
               (uint32_t)rev[(n >> 16) & 0xFF] << 8 | rev[n >> 24];          // reverse bytes AND bits
    }
};
```

**Time:** O(1) · **Space:** 256 bytes. The follow-up answer for "called many times".

### Walkthrough
**Goal:** reverse 32 bits in O(1) with divide and conquer.

1. Swap the two 16-bit halves.
2. Within each half, swap the two bytes (mask `0xFF00FF00` / `0x00FF00FF`).
3. Within each byte, swap nibbles (`0xF0F0F0F0` / `0x0F0F0F0F`).
4. Within each nibble, swap bit pairs (`0xCCCCCCCC` / `0x33333333`).
5. Within each pair, swap single bits (`0xAAAAAAAA` / `0x55555555`).

After 5 = log₂(32) steps every bit has moved to its mirrored position.

**8-bit illustration** `abcdefgh`:

| step | result |
|---|---|
| swap nibbles | `efgh abcd` |
| swap pairs | `ghef cdab` |
| swap bits | `hgfe dcba` ✔ |

## missing-number

### Approach 1: Sort
```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        ranges::sort(nums);
        for (int i = 0; i < (int)nums.size(); ++i) if (nums[i] != i) return i;
        return nums.size();
    }
};
```

**Time:** O(n log n) · **Space:** O(1).

### Approach 2: Gauss sum
```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        long long n = nums.size();
        long long expected = n * (n + 1) / 2;                    // 0 + 1 + ... + n
        return int(expected - accumulate(nums.begin(), nums.end(), 0LL));
    }
};
```

**Time:** O(n) · **Space:** O(1). Use 64-bit to avoid overflow for large n.

### Approach 3: Hash set / boolean array
```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        vector<bool> seen(nums.size() + 1, false);
        for (int x : nums) seen[x] = true;
        for (size_t i = 0; i < seen.size(); ++i) if (!seen[i]) return i;
        return -1;
    }
};
```

**Time:** O(n) · **Space:** O(n).

### Walkthrough
**Goal:** find the one number from `0..n` that's absent.

1. XOR all indices `0..n−1`, the value `n`, and all array values together.
2. Every present number appears twice (once as an index/n, once as a value) and cancels; the missing one appears only once.

**Dry run** `[3, 0, 1]` (n = 3):

| step | XOR with | acc |
|---|---|---|
| init | n = 3 | 3 |
| i = 0 | 0 ^ 3 | 0 |
| i = 1 | 1 ^ 0 | 1 |
| i = 2 | 2 ^ 1 | **2** |

## sum-of-two-integers

### Approach 1: Recursive formulation
```cpp
class Solution {
public:
    int getSum(int a, int b) {
        if (b == 0) return a;
        unsigned sum = (unsigned)a ^ (unsigned)b;                 // add without carry
        unsigned carry = ((unsigned)a & (unsigned)b) << 1;        // carry bits move left
        return getSum((int)sum, (int)carry);
    }
};
```

**Time:** O(32) · **Space:** O(32) recursion. Same algorithm as Optimal.

### Approach 2: Bit-by-bit full adder
```cpp
class Solution {
public:
    int getSum(int a, int b) {
        unsigned x = a, y = b, res = 0, carry = 0;
        for (int i = 0; i < 32; ++i) {
            unsigned ai = (x >> i) & 1u, bi = (y >> i) & 1u;
            unsigned s = ai ^ bi ^ carry;                         // full-adder sum bit
            carry = (ai & bi) | (ai & carry) | (bi & carry);      // full-adder carry out
            res |= s << i;
        }
        return (int)res;
    }
};
```

**Time:** O(32) · **Space:** O(1). Literally a ripple-carry adder: one full adder per bit.

### Walkthrough
**Goal:** a + b using only bit operations.

1. `a ^ b` adds each bit position **ignoring carries** (1+1 → 0).
2. `(a & b) << 1` computes the carries: positions where both bits are 1, moved one place left.
3. The real sum = partial sum + carries → repeat with `a = a ^ b`, `b = carry` until no carry remains.
4. Use `unsigned` so shifting and overflow are well-defined; negative numbers work via two's complement wraparound.

**Dry run** `a = 5 (0101)`, `b = 3 (0011)`:

| iteration | a | b (carry) | a ^ b | (a & b) << 1 |
|---|---|---|---|---|
| 1 | 0101 | 0011 | 0110 | 0010 |
| 2 | 0110 | 0010 | 0100 | 0100 |
| 3 | 0100 | 0100 | 0000 | 1000 |
| 4 | 0000 | 1000 | 1000 | 0000 → stop |

Result `1000` = **8**.

## reverse-integer

### Approach 1: Use a 64-bit accumulator (not allowed by the problem, but common)
```cpp
class Solution {
public:
    int reverse(int x) {
        long long r = 0;
        while (x != 0) { r = r * 10 + x % 10; x /= 10; }
        if (r > INT_MAX || r < INT_MIN) return 0;
        return (int)r;
    }
};
```

**Time:** O(log x) · **Space:** O(1). Simplest correct code — but the problem says "assume you can't store 64-bit integers", so be ready for the follow-up.

### Approach 2: String reversal
```cpp
class Solution {
public:
    int reverse(int x) {
        string s = to_string(x);
        bool neg = s[0] == '-';
        if (neg) s.erase(0, 1);
        std::reverse(s.begin(), s.end());
        string lim = neg ? "2147483648" : "2147483647";
        while (s.size() > 1 && s[0] == '0') s.erase(0, 1);          // strip leading zeros
        if (s.size() == lim.size() && s > lim) return 0;             // same length: lexicographic = numeric
        int r = stoi(s);
        return neg ? -r : r;
    }
};
```

**Time:** O(log x) · **Space:** O(log x). Overflow check by comparing digit strings — a useful trick for big numbers.

### Walkthrough
**Goal:** reverse the decimal digits, returning 0 if the result doesn't fit in 32 bits — without ever overflowing.

1. Pop the last digit: `d = x % 10`, `x /= 10` (in C++ both keep the sign of `x`, so negatives work naturally).
2. **Before** pushing (`r = r·10 + d`), check it won't overflow:
   1. `r > INT_MAX/10`, or `r == INT_MAX/10` and `d > 7` → overflow (INT_MAX = 2147483647).
   2. `r < INT_MIN/10`, or `r == INT_MIN/10` and `d < −8` → underflow (INT_MIN = −2147483648).
3. Push the digit.

**Dry run** `x = −123`:

| x | d | r after |
|---|---|---|
| −123 | −3 | −3 |
| −12 | −2 | −32 |
| −1 | −1 | **−321** |

`x = 1534236469` → reversed would be 9646324351 > INT_MAX; the check trips when `r = 964632435 > 214748364` → return **0**.

## power-of-two

### Approach 1: Divide by two repeatedly
```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        if (n <= 0) return false;
        while (n % 2 == 0) n /= 2;
        return n == 1;
    }
};
```

**Time:** O(log n) · **Space:** O(1).

### Approach 2: Divisibility by the largest power of two
```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        return n > 0 && (1 << 30) % n == 0;     // 2^30 is the largest power of two in int
    }
};
```

**Time:** O(1) · **Space:** O(1). Works because the only divisors of 2³⁰ are powers of two. (Same trick: `1162261467 % n == 0` for powers of three.)

### Approach 3: Isolate the lowest set bit
```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        long long x = n;
        return x > 0 && (x & -x) == x;          // the lowest set bit is the only set bit
    }
};
```

**Time:** O(1) · **Space:** O(1).

### Walkthrough
**Goal:** exactly one bit set.

1. Powers of two in binary: `1, 10, 100, 1000, …` — a single 1.
2. `n − 1` flips that bit to 0 and all lower bits to 1, so `n & (n − 1) == 0` exactly when there was a single set bit.
3. Exclude `n ≤ 0` (0 has no set bits; negative numbers have the sign bit set).

**Examples:**

| n | binary | n − 1 | n & (n−1) | power of 2? |
|---|---|---|---|---|
| 8 | 1000 | 0111 | 0000 | yes |
| 6 | 0110 | 0101 | 0100 | no |
| 1 | 0001 | 0000 | 0000 | yes (2⁰) |
