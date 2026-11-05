# Binary, Two's Complement & Floats

How numbers are stored in bits is core knowledge for C, embedded and systems interviews — and the root of many real bugs.

## 1. Number bases

| Decimal | Binary | Hex | Octal |
|---|---|---|---|
| 0 | 0000 | 0x0 | 0 |
| 5 | 0101 | 0x5 | 05 |
| 10 | 1010 | 0xA | 012 |
| 15 | 1111 | 0xF | 017 |
| 255 | 1111 1111 | 0xFF | 0377 |
| 4096 | 1 0000 0000 0000 | 0x1000 | 010000 |

Each hex digit = 4 bits (a nibble). Convert binary ↔ hex by grouping nibbles: `1101 0110` = `0xD6`.

C/C++ literals: `0x1F`, `0b1010` (C++14, C23), `017` (octal — beware leading zeros!), `1'000'000` (C++14 digit separators).

**Unsigned n-bit range:** 0 … 2ⁿ − 1. Memorise: 2⁸ = 256, 2¹⁰ = 1024, 2¹⁶ = 65,536, 2³² ≈ 4.29 × 10⁹.

## 2. Signed integers: two's complement

Since C++20 and C23, two's complement is **mandatory**. For n bits, the most significant bit has weight −2ⁿ⁻¹.

```text
 8-bit:  0111 1111 = +127
         0000 0001 = +1
         0000 0000 =  0
         1111 1111 = -1
         1000 0000 = -128      range: -128 … +127 (asymmetric!)
```

**Negate:** invert all bits and add 1: `-x == ~x + 1`.
`5 = 0000 0101` → invert `1111 1010` → +1 → `1111 1011 = -5`.

Why two's complement? The same adder circuit works for signed and unsigned addition, there's only one zero, and overflow wraps naturally in hardware.

**Consequences**
- `abs(INT_MIN)` overflows (no +2³¹ representation) — UB.
- `-INT_MIN` overflows.
- Sign extension: converting `int8_t(-1)` (0xFF) to `int32_t` gives 0xFFFFFFFF; converting `uint8_t(0xFF)` gives 0x000000FF.
- Arithmetic right shift of negatives: `-8 >> 1 == -4` (implementation-defined before C++20, now defined as arithmetic).

## 3. Overflow semantics

| Type | Overflow |
|---|---|
| unsigned | wraps modulo 2ⁿ — well-defined |
| signed | **undefined behaviour** (compiler assumes it never happens) |

```c
uint8_t a = 250; a += 10;          /* 4 — wraps */
int32_t b = INT32_MAX; b += 1;     /* UB! */
uint32_t elapsed = now - start;    /* correct even when the tick counter wraps — a classic embedded idiom */
```

## 4. Endianness

How multi-byte values are ordered in memory. Value `0x12345678` at address 0x100:

| Address | 0x100 | 0x101 | 0x102 | 0x103 |
|---|---|---|---|---|
| Big-endian | 12 | 34 | 56 | 78 |
| Little-endian | 78 | 56 | 34 | 12 |

- Little-endian: x86, ARM (almost always), RISC-V.
- Big-endian: network byte order, many file formats/protocols (and some older CPUs, e.g. PowerPC, 68k).
- Bit order within a byte is a separate concern (serial protocols send MSB or LSB first).

See *Problems → C & Embedded → Endianness* for portable serialisation code.

## 5. Floating point (IEEE 754)

```text
 float (32-bit):   [S][ EEEEEEEE ][ MMMMMMMMMMMMMMMMMMMMMMM ]
                    1      8                  23
 double (64-bit):   1 sign, 11 exponent, 52 mantissa
 value = (-1)^S × 1.M × 2^(E − bias)     bias = 127 (float), 1023 (double)
```

**Example:** `1.0f` = 0x3F800000 → S=0, E=127 (→ 2⁰), M=0. `-2.5f` = 0xC0200000.

| Property | float | double |
|---|---|---|
| Significant decimal digits | ~7 | ~15–16 |
| Max | ~3.4 × 10³⁸ | ~1.8 × 10³⁰⁸ |
| Smallest normal | ~1.2 × 10⁻³⁸ | ~2.2 × 10⁻³⁰⁸ |
| Epsilon (gap above 1.0) | 1.19 × 10⁻⁷ | 2.22 × 10⁻¹⁶ |
| Largest consecutive integer | 2²⁴ = 16,777,216 | 2⁵³ |

**Special values:** ±0, ±∞ (E all ones, M = 0), NaN (E all ones, M ≠ 0), subnormals (E = 0: gradual underflow, often very slow on CPUs — flush-to-zero modes exist).

### Floating-point traps

```cpp
0.1 + 0.2 == 0.3;                  // false! 0.1 isn't exactly representable in binary
float f = 16777216.0f; f + 1.0f == f;   // true: beyond 2^24 floats can't represent every integer
NaN == NaN;                        // false — use std::isnan
float acc = 0; for (int i = 0; i < 10'000'000; ++i) acc += 0.1f;   // ≈ 1,087,937 not 1,000,000 — error accumulates
(a + b) + c != a + (b + c);        // not associative: compilers won't reorder without -ffast-math
```

**Comparing floats:** use a tolerance appropriate to the magnitude:

```cpp
bool nearly_equal(double a, double b, double rel = 1e-9, double abs_eps = 1e-12) {
    return std::fabs(a - b) <= std::max(abs_eps, rel * std::max(std::fabs(a), std::fabs(b)));
}
```

**Summation:** sum small-to-large, use `double` accumulators, or Kahan compensated summation. **Money:** never use floating point — use integer cents or decimal types.

### Embedded considerations

- Many MCUs (Cortex-M0/M3) have **no FPU**: floats are emulated in software (~10–100× slower) → use fixed-point.
- Cortex-M4F/M7 have single-precision FPUs: `double` is still emulated! Write `1.5f`, not `1.5`, and use `-Wdouble-promotion`.
- `printf("%f")` pulls in a large library; newlib-nano needs `-u _printf_float`.

## 6. Characters & text

- ASCII: 7-bit; `'0'` = 0x30, `'A'` = 0x41, `'a'` = 0x61. `'a' - 'A'` = 32 (bit 5 → case toggle: `c ^ 0x20`).
- UTF-8: variable length 1–4 bytes, ASCII-compatible. Continuation bytes are `10xxxxxx`. `std::string::size()` counts bytes, not characters.

## 7. Quick conversions to memorise

| Value | Hex |
|---|---|
| 1 KB | 0x400 |
| 64 KB | 0x10000 |
| 1 MB | 0x100000 |
| INT8_MIN / INT8_MAX | 0x80 / 0x7F |
| INT32_MAX | 0x7FFFFFFF |
| −1 (32-bit) | 0xFFFFFFFF |
| 1.0f | 0x3F800000 |

## Practice

1. What is `-1` as `uint16_t`? **65535 (0xFFFF).**
2. `int8_t x = 0x9C;` value? 0x9C = 156 → 156 − 256 = **−100**.
3. Is `(uint8_t)200 + (uint8_t)100 > 255` true? **Yes** — both promote to `int` (300).
4. How many distinct `float` values lie between 1.0 and 2.0? **2²³ = 8,388,608.**
5. Why might `for (float x = 0; x != 1.0f; x += 0.1f)` never end? 0.1 accumulates rounding error and never equals exactly 1.0.
