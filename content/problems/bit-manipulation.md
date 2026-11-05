# Bit Manipulation

**Recognise it when:** "without extra space", "appears once/twice", powers of two, subsets as masks, flags/registers — a **favourite in embedded interviews**.

**Must-know identities**
| Expression | Meaning |
|---|---|
| `x & (x - 1)` | clear lowest set bit (`== 0` ⇒ power of two, for x > 0) |
| `x & -x` | isolate lowest set bit |
| `x ^ x == 0`, `x ^ 0 == x` | XOR cancels pairs |
| `x \| (1u << k)` / `x & ~(1u << k)` / `x ^ (1u << k)` | set / clear / toggle bit k |
| `(x >> k) & 1u` | test bit k |

**C++20 `<bit>` header:** `std::popcount`, `std::countl_zero`, `std::countr_zero`, `std::has_single_bit`, `std::bit_width`, `std::rotl`, `std::byteswap` (C++23). Prefer these over hand-rolled loops in production — they compile to single instructions.

> **Danger:** Shifting a signed negative value left, or shifting by ≥ the bit width, is undefined/implementation-defined. Use **unsigned** types for bit work.

## Single Number
- difficulty: Easy
- leetcode: 136
- slug: single-number

Every element appears twice except one. Find it in O(n) time, O(1) space.

### Hint
XOR is associative, commutative, and `a ^ a = 0`.

### Solution
```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        int x = 0;
        for (int v : nums) x ^= v;
        return x;
    }
};
```

### Explanation
All pairs cancel, leaving the unique value. Variant (LC 137, every other element thrice): count each bit position modulo 3.

**Time:** O(n) · **Space:** O(1)

## Number of 1 Bits
- difficulty: Easy
- leetcode: 191
- slug: number-of-1-bits

Return the number of set bits (Hamming weight) of an unsigned integer.

### Hint
`n &= n - 1` removes one set bit per iteration.

### Solution
```cpp
class Solution {
public:
    int hammingWeight(uint32_t n) {
        int count = 0;
        while (n) { n &= n - 1; ++count; }   // Kernighan's trick
        return count;
        // C++20: return std::popcount(n);
    }
};
```

### Explanation
The loop runs once per set bit, not per bit. Also know the SWAR (parallel) version:

```cpp
uint32_t popcount32(uint32_t x) {
    x = x - ((x >> 1) & 0x55555555u);
    x = (x & 0x33333333u) + ((x >> 2) & 0x33333333u);
    x = (x + (x >> 4)) & 0x0F0F0F0Fu;
    return (x * 0x01010101u) >> 24;
}
```

**Time:** O(set bits) · **Space:** O(1)

## Counting Bits
- difficulty: Easy
- leetcode: 338
- slug: counting-bits

Return `ans[i]` = number of 1 bits in `i` for `0 ≤ i ≤ n`.

### Hint
`bits(i) = bits(i >> 1) + (i & 1)`.

### Solution
```cpp
class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1, 0);
        for (int i = 1; i <= n; ++i) ans[i] = ans[i >> 1] + (i & 1);
        return ans;
    }
};
```

### Explanation
DP over bits: `i >> 1` drops the lowest bit, which we add back. Alternative: `ans[i] = ans[i & (i-1)] + 1`.

**Time:** O(n) · **Space:** O(n)

## Reverse Bits
- difficulty: Easy
- leetcode: 190
- slug: reverse-bits

Reverse the bits of a 32-bit unsigned integer.

### Hint
Shift result left, shift input right, 32 times. Or swap halves, then quarters, etc.

### Solution
```cpp
class Solution {
public:
    uint32_t reverseBits(uint32_t n) {
        // Divide & conquer: swap 16-bit halves, then bytes, nibbles, pairs, bits
        n = (n >> 16) | (n << 16);
        n = ((n & 0xFF00FF00u) >> 8) | ((n & 0x00FF00FFu) << 8);
        n = ((n & 0xF0F0F0F0u) >> 4) | ((n & 0x0F0F0F0Fu) << 4);
        n = ((n & 0xCCCCCCCCu) >> 2) | ((n & 0x33333333u) << 2);
        n = ((n & 0xAAAAAAAAu) >> 1) | ((n & 0x55555555u) << 1);
        return n;
    }
};
```

### Explanation
5 constant-time steps instead of a 32-iteration loop — the same masks are used in DSP bit-reversal for FFTs. Simple loop version: `for (int i = 0; i < 32; ++i) { r = (r << 1) | (n & 1); n >>= 1; }`. ARM has a single `RBIT` instruction.

**Time:** O(1) · **Space:** O(1)

## Missing Number
- difficulty: Easy
- leetcode: 268
- slug: missing-number

`n` distinct numbers from `[0, n]`, one missing. Find it.

### Hint
XOR all indices and values; or Gauss sum minus actual sum.

### Solution
```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        int x = nums.size();
        for (int i = 0; i < (int)nums.size(); ++i) x ^= i ^ nums[i];
        return x;
    }
};
```

### Explanation
XOR avoids the overflow risk of `n(n+1)/2` for large `n` — mention it.

**Time:** O(n) · **Space:** O(1)

## Sum of Two Integers
- difficulty: Medium
- leetcode: 371
- slug: sum-of-two-integers

Add two integers without `+` or `-`.

### Hint
XOR = sum without carry; AND shifted left = carry. Repeat until no carry.

### Solution
```cpp
class Solution {
public:
    int getSum(int a, int b) {
        unsigned ua = a, ub = b;                // unsigned: well-defined wraparound & shifts
        while (ub) {
            unsigned carry = (ua & ub) << 1;
            ua ^= ub;
            ub = carry;
        }
        return (int)ua;
    }
};
```

### Explanation
This is exactly a ripple-carry adder in hardware. Using `unsigned` avoids UB from left-shifting negative numbers (pre-C++20) and signed overflow. Converting back to `int` is well-defined modulo 2³² since C++20.

**Time:** O(32) · **Space:** O(1)

## Reverse Integer
- difficulty: Medium
- leetcode: 7
- slug: reverse-integer

Reverse the digits of a 32-bit signed int; return 0 if it overflows. You may not use 64-bit integers.

### Hint
Check for overflow **before** multiplying by 10.

### Solution
```cpp
class Solution {
public:
    int reverse(int x) {
        int r = 0;
        while (x != 0) {
            int d = x % 10;                       // C++: sign follows x
            x /= 10;
            if (r > INT_MAX / 10 || (r == INT_MAX / 10 && d > 7)) return 0;
            if (r < INT_MIN / 10 || (r == INT_MIN / 10 && d < -8)) return 0;
            r = r * 10 + d;
        }
        return r;
    }
};
```

### Explanation
Signed overflow is **undefined behaviour** in C/C++, so you must test before it happens. In C++ `%` truncates toward zero, so negative numbers produce negative digits and the same loop handles both signs. In real code, `__builtin_mul_overflow` / C23 `ckd_mul` do this for you.

**Time:** O(log x) · **Space:** O(1)

## Power of Two
- difficulty: Easy
- leetcode: 231
- slug: power-of-two

Is `n` a power of two?

### Hint
Powers of two have exactly one set bit.

### Solution
```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        return n > 0 && (n & (n - 1)) == 0;
        // C++20: return n > 0 && std::has_single_bit((unsigned)n);
    }
};
```

### Explanation
Used constantly in embedded code: checking buffer sizes so that `index & (size - 1)` can replace `index % size` in ring buffers.

**Time:** O(1) · **Space:** O(1)
