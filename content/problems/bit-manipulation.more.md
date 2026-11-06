## single-number

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
