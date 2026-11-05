## single-number
### Complexity
**Time:** one XOR per element → **O(n)**.

**Space:** one accumulator → **O(1)**.

**Why XOR wins:** hash map O(n) space; sorting O(n log n) time. XOR achieves the lower bounds on both (every element must be read; no storage is needed).

## number-of-1-bits
### Complexity
**Time, step by step**
1. Each `n &= n − 1` clears exactly one set bit.
2. The loop runs once per set bit: popcount(n) iterations, at most 32.
3. Total: **O(k)** for k set bits, ≤ O(32) = O(1).

**Space:** **O(1)**.

**Comparison:** checking every bit is always 32 iterations; a 256-entry table is 4 lookups; `std::popcount` is typically a single instruction.

## counting-bits
### Complexity
**Time:** n + 1 entries, each one shift, one AND, one addition, one table read → **O(n)**.

**Space:** the output array only → **O(1)** extra.

**Comparison:** running popcount on each number is O(n log n) (up to log n bits per number) without a hardware instruction.

## reverse-bits
### Complexity
**Time:** exactly 5 swap stages of a few shifts/ANDs/ORs each → **O(1)** — log₂(32) = 5 stages. The bit-by-bit loop is 32 iterations: also O(1), with ~6× more operations.

**Space:** **O(1)**. The lookup-table variant uses 256 bytes.

## missing-number
### Complexity
**Time:** one pass with two XORs per index → **O(n)**.

**Space:** **O(1)**.

**Overflow note:** the Gauss-sum approach computes n(n+1)/2, which overflows 32-bit `int` for n ≥ 65 536 unless done in 64-bit. XOR can never overflow.

## sum-of-two-integers
### Complexity
**Time, step by step**
1. Each iteration computes `carry = (a & b) << 1` and `a ^= b`.
2. Every iteration shifts the carry one position left, so a carry can propagate at most 32 positions.
3. Total: **O(32) = O(1)** iterations for 32-bit integers (O(w) for w-bit words).

**Space:** **O(1)**.

## reverse-integer
### Complexity
**Time:** one iteration per decimal digit → **O(log₁₀ |x|)**, at most 10 for 32-bit ints.

**Space:** **O(1)**.

**Why the pre-check matters:** testing `r > INT_MAX / 10` *before* multiplying keeps every intermediate value in range, so the computation never invokes signed-overflow UB.

## power-of-two
### Complexity
**Time:** one comparison, one subtraction, one AND → **O(1)**.

**Space:** **O(1)**.

**Comparison:** repeated division is O(log n); the `2³⁰ % n` trick is O(1) but uses a (slower) division.
