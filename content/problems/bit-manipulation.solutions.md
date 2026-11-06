## single-number

### Approach 1: Count with a hash map
**The idea:** count every value; return the one whose count is 1.

```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        unordered_map<int, int> count;
        for (int v : nums) {
            count[v]++;
        }
        for (const pair<const int, int>& entry : count) {
            if (entry.second == 1) {
                return entry.first;
            }
        }
        return 0;   // unreachable for valid input
    }
};
```

**How it works:** a tally of how often each number appears.

**Think of it like this:** a register at a party where everyone checks in twice except one person.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Sort, then check pairs
**The idea:** after sorting, pairs sit next to each other; the single number breaks the pattern.

```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        // Look at positions 0, 2, 4, ...: each should equal its right neighbour.
        for (int i = 0; i + 1 < (int)nums.size(); i += 2) {
            if (nums[i] != nums[i + 1]) {
                return nums[i];
            }
        }
        return nums.back();         // the single number is the last one
    }
};
```

**How it works:** pairs occupy (0,1), (2,3)… until the single number shifts everything.

**Think of it like this:** sorting socks into pairs; the one without a partner stands out.

**Cost:** Time **O(n log n)**. Space **O(1)**.

### Approach 3: Math — 2 × (sum of distinct values) − (sum of all values)
**The idea:** if every value appeared twice, the total would be twice the distinct sum. The difference is the single value.

```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        unordered_set<int> distinct(nums.begin(), nums.end());
        long long distinctSum = 0;
        for (int v : distinct) {
            distinctSum += v;
        }
        long long total = 0;
        for (int v : nums) {
            total += v;
        }
        return (int)(2 * distinctSum - total);
    }
};
```

**How it works:** `2·(a + b + c) − (a + a + b + b + c) = c`.

**Think of it like this:** counting how much money should be in the till if everyone paid twice.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: XOR everything
**The idea:** `x ^ x = 0` and `x ^ 0 = x`. XOR all numbers: every pair cancels, leaving the single one.

```cpp
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        int x = 0;
        for (int v : nums) {
            x ^= v;      // pairs cancel each other out
        }
        return x;
    }
};
```

**How it works**
1. XOR is commutative and associative — order doesn't matter.
2. `a ^ b ^ a = b`.
3. After all numbers, only the unpaired one remains.

**Think of it like this:** a light switch — flipping it twice leaves it as it was; the only switch left "on" is the one flipped once.

**Why it's optimal:** O(n) time and O(1) space, as the problem requires.

**Cost:** Time **O(n)**. Space **O(1)**.

## number-of-1-bits

### Approach 1: Check every bit
**The idea:** look at the lowest bit, shift right, repeat 32 times.

```cpp
class Solution {
public:
    int hammingWeight(uint32_t n) {
        int count = 0;
        for (int i = 0; i < 32; i++) {
            if (n & 1u) {
                count++;          // lowest bit is 1
            }
            n >>= 1;              // move the next bit into position 0
        }
        return count;
    }
};
```

**How it works:** `n & 1` reads the lowest bit; `>>= 1` moves to the next.

**Think of it like this:** reading a row of 32 light switches one by one.

**Cost:** Time **O(32)**. Space **O(1)**.

### Approach 2: Byte lookup table
**The idea:** precompute the bit count of all 256 byte values; a 32-bit number is 4 bytes.

```cpp
class Solution {
public:
    int hammingWeight(uint32_t n) {
        // table[b] = number of 1 bits in byte b.
        static int table[256];
        static bool built = false;
        if (!built) {
            for (int b = 1; b < 256; b++) {
                table[b] = table[b >> 1] + (b & 1);
            }
            built = true;
        }
        return table[n & 0xFF]
             + table[(n >> 8) & 0xFF]
             + table[(n >> 16) & 0xFF]
             + table[(n >> 24) & 0xFF];
    }
};
```

**How it works:** trades 256 integers of memory for 4 lookups.

**Think of it like this:** a multiplication table — you memorise small answers so you never compute them again.

**Cost:** Time **O(1)** (4 lookups). Space **O(256)**.

### Approach 3: Standard library / hardware instruction
**The idea:** C++20 `std::popcount` compiles to a single CPU instruction (`POPCNT`) on modern hardware.

```cpp
class Solution {
public:
    int hammingWeight(uint32_t n) {
        return std::popcount(n);      // C++20, <bit>; __builtin_popcount(n) before that
    }
};
```

**How it works:** the CPU counts the bits for you.

**Think of it like this:** using a calculator instead of counting by hand.

**Cost:** Time **O(1)**. Space **O(1)**. In production code, use this.

### Optimal: Brian Kernighan's trick
**The idea:** `n & (n − 1)` removes the lowest 1 bit. Count how many times you can do it before n is 0.

```cpp
class Solution {
public:
    int hammingWeight(uint32_t n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;      // clear the lowest set bit
            count++;
        }
        return count;
    }
};
```

**How it works**
1. Subtracting 1 flips the lowest 1 to 0 and the zeros below it to 1s.
2. ANDing with the original clears all of those → exactly one 1 bit disappears.
3. Loop count = number of 1 bits.

**Think of it like this:** popping balloons one at a time and counting the pops.

**Why it's optimal:** loops only as many times as there are 1 bits (≤ 32), with no tables.

**Cost:** Time **O(number of 1 bits)**. Space **O(1)**.

## counting-bits

### Approach 1: Popcount each number
**The idea:** count the bits of each i separately with Kernighan's trick.

```cpp
class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1);
        for (int i = 0; i <= n; i++) {
            int x = i;
            int bits = 0;
            while (x != 0) {
                x &= x - 1;     // remove the lowest 1 bit
                bits++;
            }
            ans[i] = bits;
        }
        return ans;
    }
};
```

**How it works:** independent counting for every number.

**Think of it like this:** counting the coins in every jar separately.

**Cost:** Time **O(n log n)**. Space **O(1)** extra.

### Approach 2: DP using the highest power of two
**The idea:** for i in `[2^k, 2^(k+1))`, i = 2^k + (i − 2^k), so `bits(i) = 1 + bits(i − 2^k)`.

```cpp
class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1, 0);
        int power = 1;                       // the highest power of two ≤ i
        for (int i = 1; i <= n; i++) {
            if (power * 2 == i) {
                power = i;                   // reached the next power of two
            }
            ans[i] = 1 + ans[i - power];     // the top bit plus the rest
        }
        return ans;
    }
};
```

**How it works:** removing the top bit gives a smaller number we've already solved.

**Think of it like this:** 13 = 8 + 5, so it has one more bit than 5.

**Cost:** Time **O(n)**. Space **O(1)** extra.

### Optimal: DP with `i >> 1`
**The idea:** `i >> 1` is i without its lowest bit — a smaller, already-solved number. Add the lowest bit back.

```cpp
class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1, 0);           // ans[0] = 0
        for (int i = 1; i <= n; i++) {
            // i >> 1 drops the last bit; (i & 1) is that last bit.
            ans[i] = ans[i >> 1] + (i & 1);
        }
        return ans;
    }
};
```

**How it works**
1. `i >> 1` < i, so its answer is ready.
2. `i & 1` says whether the dropped bit was a 1.

**Think of it like this:** the number of 1s in 1011 is the number in 101, plus the last 1.

**Why it's optimal:** O(1) work per number, no special cases.

**Cost:** Time **O(n)**. Space **O(1)** extra (besides the output).

## reverse-bits

### Approach 1: Bit-by-bit loop
**The idea:** take the lowest bit of n and push it onto the result from the right, 32 times.

```cpp
class Solution {
public:
    uint32_t reverseBits(uint32_t n) {
        uint32_t result = 0;
        for (int i = 0; i < 32; i++) {
            result <<= 1;            // make room on the right
            result |= (n & 1u);      // copy n's lowest bit there
            n >>= 1;                 // move to n's next bit
        }
        return result;
    }
};
```

**How it works:** bits leave n from the right and enter result from the right, which reverses their order.

**Think of it like this:** taking plates off one stack and putting them on another — the order flips.

**Cost:** Time **O(32)**. Space **O(1)**.

### Approach 2: Byte lookup table
**The idea:** precompute the reversal of every byte; reverse each of the 4 bytes and put them in the opposite order.

```cpp
class Solution {
public:
    uint32_t reverseBits(uint32_t n) {
        static uint8_t rev[256];
        static bool built = false;
        if (!built) {
            for (int b = 0; b < 256; b++) {
                uint8_t r = 0;
                for (int i = 0; i < 8; i++) {
                    if (b & (1 << i)) {
                        r |= (1 << (7 - i));
                    }
                }
                rev[b] = r;
            }
            built = true;
        }
        return ((uint32_t)rev[n & 0xFF] << 24)
             | ((uint32_t)rev[(n >> 8) & 0xFF] << 16)
             | ((uint32_t)rev[(n >> 16) & 0xFF] << 8)
             | ((uint32_t)rev[(n >> 24) & 0xFF]);
    }
};
```

**How it works:** the lowest byte, reversed, becomes the highest byte, and so on.

**Think of it like this:** reversing a sentence by reversing each word and then the word order.

**Cost:** Time **O(1)**. Space **O(256)**. Fast when called many times.

### Optimal: Divide and conquer with masks
**The idea:** swap the two 16-bit halves, then the bytes inside each half, then nibbles, pairs and single bits — 5 steps in total.

```cpp
class Solution {
public:
    uint32_t reverseBits(uint32_t n) {
        // 1. Swap the 16-bit halves.
        n = (n >> 16) | (n << 16);
        // 2. Swap bytes within each half.
        n = ((n & 0xFF00FF00u) >> 8) | ((n & 0x00FF00FFu) << 8);
        // 3. Swap 4-bit nibbles within each byte.
        n = ((n & 0xF0F0F0F0u) >> 4) | ((n & 0x0F0F0F0Fu) << 4);
        // 4. Swap 2-bit pairs within each nibble.
        n = ((n & 0xCCCCCCCCu) >> 2) | ((n & 0x33333333u) << 2);
        // 5. Swap single bits within each pair.
        n = ((n & 0xAAAAAAAAu) >> 1) | ((n & 0x55555555u) << 1);
        return n;
    }
};
```

**How it works**
1. Each mask selects the left or right half of every block.
2. Shifting moves each half into the other's place.
3. After log₂(32) = 5 rounds, every bit is mirrored.

**Think of it like this:** reversing a deck of cards by cutting it in half and swapping the halves, then doing the same inside each half, and so on.

**Why it's optimal:** constant time, no loops, no tables — 5 lines of mask-and-shift.

**Cost:** Time **O(1)**. Space **O(1)**.

## missing-number

### Approach 1: Sort
**The idea:** after sorting, `nums[i]` should equal i; the first mismatch is the missing number.

```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        for (int i = 0; i < (int)nums.size(); i++) {
            if (nums[i] != i) {
                return i;
            }
        }
        return nums.size();          // 0..n-1 are all present, so n is missing
    }
};
```

**How it works:** a sorted list of 0..n with one gap.

**Think of it like this:** lining up numbered tickets and finding the first gap.

**Cost:** Time **O(n log n)**. Space **O(1)**.

### Approach 2: Boolean "seen" array
**The idea:** mark every number you see; the unmarked one is missing.

```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        int n = nums.size();
        vector<bool> seen(n + 1, false);
        for (int v : nums) {
            seen[v] = true;
        }
        for (int i = 0; i <= n; i++) {
            if (!seen[i]) {
                return i;
            }
        }
        return -1;
    }
};
```

**How it works:** a checklist of 0..n.

**Think of it like this:** a register where you tick off each student who arrives.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 3: Gauss sum
**The idea:** 0 + 1 + … + n = n(n + 1)/2. Subtract the actual sum.

```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        long long n = nums.size();
        long long expected = n * (n + 1) / 2;
        long long actual = 0;
        for (int v : nums) {
            actual += v;
        }
        return (int)(expected - actual);
    }
};
```

**How it works:** the missing number is the difference between what should be there and what is.

**Think of it like this:** a cashier knows the total for a full set; the shortfall is the missing item.

**Cost:** Time **O(n)**. Space **O(1)**. `long long` avoids overflow.

### Optimal: XOR indices and values
**The idea:** XOR every index 0..n−1, the number n, and every value. Present numbers appear twice and cancel; the missing one remains.

```cpp
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        int x = nums.size();                 // start with n (there's no index n)
        for (int i = 0; i < (int)nums.size(); i++) {
            x ^= i;                          // the index
            x ^= nums[i];                    // the value
        }
        return x;
    }
};
```

**How it works**
1. Every number in 0..n appears as an index (or as n) once.
2. Every present number also appears once as a value → it cancels.
3. The missing number only appears once.

**Think of it like this:** Single Number in disguise — pair up "slot numbers" with "values found".

**Why it's optimal:** O(n), O(1), and no overflow risk.

**Cost:** Time **O(n)**. Space **O(1)**.

## sum-of-two-integers

### Approach 1: Recursive formulation
**The idea:** `a + b = (a XOR b) + (carries shifted left)`. Recurse until there's no carry.

```cpp
class Solution {
public:
    int getSum(int a, int b) {
        return add((unsigned)a, (unsigned)b);
    }

private:
    int add(unsigned a, unsigned b) {
        if (b == 0) {
            return (int)a;                  // nothing left to add
        }
        unsigned sumWithoutCarry = a ^ b;
        unsigned carry = (a & b) << 1;
        return add(sumWithoutCarry, carry);
    }
};
```

**How it works:** each call moves the carries one position left; after at most 32 calls, they vanish.

**Think of it like this:** adding numbers on paper but writing the carries on a separate line, then adding that line too.

**Cost:** Time **O(32)**. Space **O(32)** stack.

### Approach 2: Bit-by-bit full adder
**The idea:** simulate the circuit inside a CPU: for each bit position, combine the two input bits and the carry-in.

```cpp
class Solution {
public:
    int getSum(int a, int b) {
        unsigned ua = a;
        unsigned ub = b;
        unsigned result = 0;
        unsigned carry = 0;
        for (int i = 0; i < 32; i++) {
            unsigned x = (ua >> i) & 1u;
            unsigned y = (ub >> i) & 1u;
            unsigned sumBit = x ^ y ^ carry;                     // 1 if an odd number of 1s
            carry = (x & y) | (x & carry) | (y & carry);         // 1 if at least two 1s
            result |= (sumBit << i);
        }
        return (int)result;
    }
};
```

**How it works:** exactly what a hardware "full adder" does for one bit.

**Think of it like this:** column-by-column addition in binary.

**Cost:** Time **O(32)**. Space **O(1)**.

### Optimal: Iterative XOR + carry
**The idea:** XOR adds bits without carries; AND finds where carries happen; shift the carries left and repeat.

```cpp
class Solution {
public:
    int getSum(int a, int b) {
        // unsigned: shifting and wrap-around are well defined (no undefined behaviour).
        unsigned ua = a;
        unsigned ub = b;
        while (ub != 0) {
            unsigned carry = (ua & ub) << 1;   // positions where both bits are 1, moved left
            ua = ua ^ ub;                      // add without carrying
            ub = carry;                        // now add the carries
        }
        return (int)ua;
    }
};
```

**How it works**
1. `a ^ b` = sum ignoring carries (1 + 1 → 0).
2. `(a & b) << 1` = the carries.
3. Repeat until no carries; negative numbers work thanks to two's complement.

**Think of it like this:** passing the "carry" note one column left each round until nobody needs to carry.

**Why it's optimal:** at most 32 iterations, no recursion, no undefined behaviour.

**Cost:** Time **O(32)**. Space **O(1)**.

## reverse-integer

### Approach 1: 64-bit accumulator (simple, but breaks the rules)
**The idea:** build the reversed number in `long long`, then check if it fits in `int`. The problem says you can't store 64-bit integers, but it's a good first step.

```cpp
class Solution {
public:
    int reverse(int x) {
        long long r = 0;
        while (x != 0) {
            r = r * 10 + x % 10;     // x % 10 keeps the sign of x in C++
            x /= 10;
        }
        if (r > INT_MAX || r < INT_MIN) {
            return 0;
        }
        return (int)r;
    }
};
```

**How it works:** a 64-bit number can hold any reversed 32-bit number.

**Think of it like this:** using a bigger bucket so it can't overflow, then checking if the water fits the small bucket.

**Cost:** Time **O(digits)**. Space **O(1)**.

### Approach 2: String reversal
**The idea:** convert to a string, reverse the digits, convert back with a range check.

```cpp
class Solution {
public:
    int reverse(int x) {
        string s = to_string(x);
        bool negative = false;
        if (s[0] == '-') {
            negative = true;
            s = s.substr(1);
        }
        std::reverse(s.begin(), s.end());
        long long value = stoll(s);          // at most 10 digits: fits in long long
        if (negative) {
            value = -value;
        }
        if (value > INT_MAX || value < INT_MIN) {
            return 0;
        }
        return (int)value;
    }
};
```

**How it works:** strings make reversing trivial.

**Think of it like this:** writing the number down and reading it backwards.

**Cost:** Time **O(digits)**. Space **O(digits)**.

### Optimal: Pop and push digits with an overflow check *before* each push
**The idea:** take digits off the end of x and add them to r. Before `r = r * 10 + d`, check that it can't overflow.

```cpp
class Solution {
public:
    int reverse(int x) {
        int r = 0;
        while (x != 0) {
            int d = x % 10;      // last digit (negative if x is negative)
            x /= 10;

            // Would r * 10 + d go above INT_MAX (2147483647)?
            if (r > INT_MAX / 10 || (r == INT_MAX / 10 && d > 7)) {
                return 0;
            }
            // Would it go below INT_MIN (-2147483648)?
            if (r < INT_MIN / 10 || (r == INT_MIN / 10 && d < -8)) {
                return 0;
            }
            r = r * 10 + d;
        }
        return r;
    }
};
```

**How it works**
1. `d = x % 10`, `x /= 10` — both keep the sign of x in C++.
2. Compare r with `INT_MAX / 10` (214748364) before multiplying.
3. Push the digit.

**Think of it like this:** checking whether your suitcase can take one more item *before* you force it in.

**Why it's optimal:** uses only 32-bit arithmetic, as the problem demands.

**Cost:** Time **O(digits)** (≤ 10). Space **O(1)**.

## power-of-two

### Approach 1: Divide by two repeatedly
**The idea:** keep halving while even; a power of two ends at exactly 1.

```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        if (n <= 0) {
            return false;
        }
        while (n % 2 == 0) {
            n /= 2;
        }
        return n == 1;
    }
};
```

**How it works:** any other factor would leave an odd number bigger than 1.

**Think of it like this:** folding a strip of paper in half again and again; only a power-of-two length folds down to 1 exactly.

**Cost:** Time **O(log n)**. Space **O(1)**.

### Approach 2: Divisibility by the largest power of two
**The idea:** 2³⁰ is the largest power of two that fits in `int`. Every power of two divides it; nothing else does.

```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        const int biggest = 1 << 30;      // 1073741824
        return n > 0 && biggest % n == 0;
    }
};
```

**How it works:** 2³⁰'s only divisors are powers of two.

**Think of it like this:** only smaller powers of two fit into 2³⁰ evenly.

**Cost:** Time **O(1)**. Space **O(1)**.

### Approach 3: Isolate the lowest set bit
**The idea:** `n & -n` keeps only the lowest 1 bit. A power of two has only one 1 bit, so the result equals n.

```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        if (n <= 0) {
            return false;
        }
        long long x = n;              // avoid overflow when negating
        return (x & -x) == x;
    }
};
```

**How it works:** in two's complement, `-x = ~x + 1`, which keeps only the lowest set bit in common with x.

**Think of it like this:** "is the lowest switch that's on the only switch that's on?".

**Cost:** Time **O(1)**. Space **O(1)**.

### Optimal: `n & (n − 1) == 0`
**The idea:** a power of two is a single 1 bit. Subtracting 1 turns that bit off and all lower bits on, so the AND is 0.

```cpp
class Solution {
public:
    bool isPowerOfTwo(int n) {
        // n > 0 rules out 0 and negative numbers.
        // n & (n - 1) clears the lowest set bit: 0 means there was only one.
        return n > 0 && (n & (n - 1)) == 0;
    }
};
```

**How it works**
1. Powers of two look like `1`, `10`, `100`, `1000`, …
2. `1000 − 1 = 0111`; `1000 & 0111 = 0`.
3. Exclude `n ≤ 0`.

**Think of it like this:** if switching off the lowest light leaves the room dark, there was only one light on.

**Why it's optimal:** a single operation; C++20 also has `std::has_single_bit`.

**Cost:** Time **O(1)**. Space **O(1)**.
