## memcpy-memmove

### Approach 1: Word-at-a-time memcpy (aligned fast path)
```c
#include <stddef.h>
#include <stdint.h>

void *fast_memcpy(void *restrict dst, const void *restrict src, size_t n) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    /* Fast path only if both pointers share the same alignment offset */
    if ((((uintptr_t)d ^ (uintptr_t)s) & (sizeof(size_t) - 1)) == 0) {
        while (n && ((uintptr_t)d & (sizeof(size_t) - 1))) { *d++ = *s++; --n; }   /* head bytes */
        size_t *dw = (size_t *)(void *)d;
        const size_t *sw = (const size_t *)(const void *)s;
        for (; n >= sizeof(size_t); n -= sizeof(size_t)) *dw++ = *sw++;          /* whole words */
        d = (unsigned char *)dw;
        s = (const unsigned char *)sw;
    }
    while (n--) *d++ = *s++;                                                     /* tail bytes */
    return dst;
}
```

**Time:** O(n), ~8× fewer loop iterations on 64-bit · **Space:** O(1). The real `memcpy` goes further with SIMD and unrolling. (Strictly, word access through `size_t*` bends strict aliasing; libc implementations are compiled specially for this.)

### Approach 2: memmove via a temporary buffer
```c
#include <stdlib.h>
#include <string.h>

void *simple_memmove(void *dst, const void *src, size_t n) {
    unsigned char *tmp = malloc(n ? n : 1);
    if (!tmp) return NULL;
    memcpy(tmp, src, n);         /* snapshot the source first... */
    memcpy(dst, tmp, n);         /* ...so overlap can't corrupt it */
    free(tmp);
    return dst;
}
```

**Time:** O(n) · **Space:** O(n) heap. Obviously correct for overlap, but allocation can fail and is banned in many embedded codebases — which is why the direction trick is preferred.

### Walkthrough
**Goal:** copy n bytes; `memmove` must also work when source and destination overlap.

1. Treat memory as `unsigned char` — the one type allowed to read any object's bytes.
2. **memcpy:** copy forward byte by byte. `restrict` tells the compiler the regions don't overlap, allowing vectorisation.
3. **memmove** — pick the direction so we never overwrite unread source bytes:
   1. `dst < src`: copying forward reads each byte before the write position reaches it → forward is safe.
   2. `dst > src` and overlapping: a forward copy would overwrite source bytes before reading them → copy **backward** from the end.

**Dry run** (overlap) buffer `A B C D E`, `memmove(buf + 1, buf, 4)` — shift right by one:

| step (backward) | write | buffer |
|---|---|---|
| 1 | buf[4] = buf[3] (D) | A B C D D |
| 2 | buf[3] = buf[2] (C) | A B C C D |
| 3 | buf[2] = buf[1] (B) | A B B C D |
| 4 | buf[1] = buf[0] (A) | A A B C D ✔ |

A forward copy would produce `A A A A A` — every write clobbers the next byte to be read.

## strlen-strcpy-strcmp

### Approach 1: Index-based versions
```c
#include <stddef.h>

size_t idx_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') ++n;
    return n;
}

char *idx_strcpy(char *dst, const char *src) {
    size_t i = 0;
    do { dst[i] = src[i]; } while (src[i++] != '\0');     /* copy terminator too */
    return dst;
}

int idx_strcmp(const char *a, const char *b) {
    size_t i = 0;
    while (a[i] && a[i] == b[i]) ++i;
    return (unsigned char)a[i] - (unsigned char)b[i];
}
```

**Time:** O(n) · **Space:** O(1). Easier to read for some interviewers; the compiler generates nearly identical code to the pointer versions.

### Approach 2: Bounded, safer variants
```c
#include <stddef.h>

/* Copies at most size-1 chars and ALWAYS NUL-terminates (like BSD strlcpy).
   Returns strlen(src) so callers can detect truncation (ret >= size). */
size_t my_strlcpy(char *dst, const char *src, size_t size) {
    size_t len = 0;
    while (src[len]) ++len;
    if (size) {
        size_t n = len < size - 1 ? len : size - 1;
        for (size_t i = 0; i < n; ++i) dst[i] = src[i];
        dst[n] = '\0';
    }
    return len;
}

size_t my_strnlen(const char *s, size_t max) {        /* never reads past max bytes */
    size_t n = 0;
    while (n < max && s[n]) ++n;
    return n;
}
```

**Time:** O(n) · **Space:** O(1). This is the version to bring up when the interviewer asks "what's wrong with strcpy?" — bounded copies prevent buffer overflows.

### Walkthrough
**Goal:** implement the three core NUL-terminated string routines.

1. **strlen:** advance a pointer until it hits `'\0'`; the length is the pointer difference `p − s`.
2. **strcpy:** `while ((*dst++ = *src++) != '\0')` — the assignment's value is the copied char, so the loop copies the terminator and then stops.
3. **strcmp:** advance while both strings have the same non-NUL character; return the difference of the first differing characters **as `unsigned char`**.

**Dry run** `strcmp("cat", "car")`:

| i | a[i] | b[i] | equal? |
|---|---|---|---|
| 0 | c | c | yes |
| 1 | a | a | yes |
| 2 | t (116) | r (114) | no → return 2 (> 0: "cat" sorts after "car") |

**Signedness trap:** with `char` signed (x86), `'\xE9'` (é) is negative and would sort *before* `'a'` unless cast to `unsigned char`.

## string-to-integer-atoi

### Approach 1: Parse with a 64-bit accumulator and clamp
```cpp
class Solution {
public:
    int myAtoi(string s) {
        size_t i = 0, n = s.size();
        while (i < n && s[i] == ' ') ++i;
        int sign = 1;
        if (i < n && (s[i] == '+' || s[i] == '-')) sign = s[i++] == '-' ? -1 : 1;
        long long r = 0;
        while (i < n && isdigit((unsigned char)s[i])) {
            r = r * 10 + (s[i++] - '0');
            if (r * sign > INT_MAX) return INT_MAX;          // clamp as soon as we pass the limit
            if (r * sign < INT_MIN) return INT_MIN;
        }
        return int(r * sign);
    }
};
```

**Time:** O(n) · **Space:** O(1). Simpler overflow logic; checking inside the loop keeps `r` from overflowing even 64 bits on long digit strings.

### Approach 2: Deterministic finite automaton
```cpp
class Solution {
public:
    int myAtoi(string s) {
        enum State { START, SIGNED, NUMBER, END };
        State st = START;
        long long r = 0;
        int sign = 1;
        for (char c : s) {
            if (st == START && c == ' ') continue;
            if (st == START && (c == '+' || c == '-')) { sign = c == '-' ? -1 : 1; st = SIGNED; continue; }
            if (st != END && isdigit((unsigned char)c)) {
                st = NUMBER;
                r = min<long long>(r * 10 + (c - '0'), (long long)INT_MAX + 1);   // saturate
                continue;
            }
            st = END;                                                  // anything else stops parsing
            break;
        }
        r *= sign;
        return (int)clamp<long long>(r, INT_MIN, INT_MAX);
    }
};
```

**Time:** O(n) · **Space:** O(1). Parsing as an explicit state machine — the same structure as firmware protocol parsers.

### Walkthrough
**Goal:** parse an integer like C's `atoi`, but clamp instead of overflowing.

1. Skip leading spaces.
2. Read an optional sign.
3. Read digits; stop at the first non-digit.
4. **Before** `r = r·10 + d`, check `r > (INT_MAX − d) / 10` — if true, the result would exceed INT_MAX → return INT_MAX (or INT_MIN for negatives; clamping the magnitude at INT_MAX + 1 gives exactly INT_MIN).
5. Apply the sign.

**Dry run** `"   -42abc"`:

| i | char | action | r |
|---|---|---|---|
| 0–2 | spaces | skip | 0 |
| 3 | − | sign = −1 | 0 |
| 4 | 4 | r = 4 | 4 |
| 5 | 2 | r = 42 | 42 |
| 6 | a | stop | → **−42** |

`"91283472332"` → overflow detected at r = 912834723 with d = 3 → **INT_MAX**.

## bit-macros-registers

### Approach 1: Type-safe C++ inline functions instead of macros
```cpp
#include <cstdint>
#include <type_traits>

template <class T> constexpr T bit(unsigned n) {
    static_assert(std::is_unsigned_v<T>, "use unsigned types for bit work");
    return T{1} << n;
}
template <class T> constexpr void setBit(volatile T& r, unsigned n)    { r = r | bit<T>(n); }
template <class T> constexpr void clearBit(volatile T& r, unsigned n)  { r = r & ~bit<T>(n); }
template <class T> constexpr void toggleBit(volatile T& r, unsigned n) { r = r ^ bit<T>(n); }
template <class T> constexpr bool testBit(T r, unsigned n)             { return (r >> n) & T{1}; }

// Typed register wrapper: address baked in at compile time
template <std::uintptr_t Addr>
struct Reg32 {
    static volatile std::uint32_t& ref() { return *reinterpret_cast<volatile std::uint32_t*>(Addr); }
    static void set(unsigned n)   { ref() = ref() | (1u << n); }
    static void clear(unsigned n) { ref() = ref() & ~(1u << n); }
    static bool test(unsigned n)  { return (ref() >> n) & 1u; }
};
using RCC_CR = Reg32<0x40021000>;
```

**Space/time:** identical machine code to the macros after inlining. Benefits: type checking, no double-evaluation of arguments, scoped names, debuggable. (Writing `r = r | x` instead of `r |= x` avoids C++20's deprecation of compound assignment on `volatile`.)

### Approach 2: Bit-fields overlay (know it, mostly avoid it)
```c
#include <stdint.h>

typedef union {
    uint32_t word;
    struct {
        uint32_t hsion   : 1;   /* bit 0  */
        uint32_t hsirdy  : 1;   /* bit 1  */
        uint32_t         : 14;  /* reserved */
        uint32_t hseon   : 1;   /* bit 16 */
        uint32_t hserdy  : 1;   /* bit 17 */
        uint32_t         : 14;
    } bits;
} rcc_cr_t;

#define RCC_CR_REG (*(volatile rcc_cr_t *)0x40021000UL)
/* usage: RCC_CR_REG.bits.hseon = 1; */
```

Readable, and some vendor headers do this — but bit order and packing of bit-fields are **implementation-defined**, and each field write is a hidden read-modify-write (sometimes with the wrong access width). MISRA and most firmware teams prefer masks and shifts.

### Walkthrough
**Goal:** safe, readable bit operations on memory-mapped registers.

1. `BIT(n)` = `1UL << n` — unsigned so shifting into bit 31 is defined.
2. **Set:** `r |= mask` turns the mask's bits on, leaves others unchanged.
3. **Clear:** `r &= ~mask` turns them off.
4. **Toggle:** `r ^= mask` flips them.
5. **Test:** `(r >> n) & 1`.
6. **Multi-bit field:** clear the field with `~(fieldMask << pos)`, then OR in `(value << pos) & mask`.
7. Access hardware through a `volatile` pointer so every read/write really happens (e.g. the busy-wait on a ready flag).

**Dry run** writing value 0b101 into a 3-bit field at position 4 of `reg = 0xFF`:

| step | expression | result (binary) |
|---|---|---|
| mask | 0b111 << 4 | 0111 0000 |
| clear field | 0xFF & ~mask | 1000 1111 |
| place value | (0b101 << 4) & mask | 0101 0000 |
| combine | OR | **1101 1111** = 0xDF |

## design-circular-queue

### Approach 1: LeetCode-style class with head + count
```cpp
class MyCircularQueue {
    vector<int> buf;
    int head = 0, count = 0;
public:
    explicit MyCircularQueue(int k) : buf(k) {}
    bool enQueue(int v) {
        if (isFull()) return false;
        buf[(head + count) % buf.size()] = v;        // tail = head + count
        ++count;
        return true;
    }
    bool deQueue() {
        if (isEmpty()) return false;
        head = (head + 1) % buf.size();
        --count;
        return true;
    }
    int Front() const { return isEmpty() ? -1 : buf[head]; }
    int Rear() const { return isEmpty() ? -1 : buf[(head + count - 1) % buf.size()]; }
    bool isEmpty() const { return count == 0; }
    bool isFull() const { return count == (int)buf.size(); }
};
```

**Time:** O(1) all ops · **Space:** O(k). Storing a count (instead of head/tail only) removes the full-vs-empty ambiguity and works for any capacity.

### Approach 2: "Waste one slot" head/tail version
```cpp
class MyCircularQueue {
    vector<int> buf;                    // capacity k+1; one slot always empty
    int head = 0, tail = 0;             // tail = next write position
public:
    explicit MyCircularQueue(int k) : buf(k + 1) {}
    bool enQueue(int v) {
        if (isFull()) return false;
        buf[tail] = v;
        tail = (tail + 1) % buf.size();
        return true;
    }
    bool deQueue() {
        if (isEmpty()) return false;
        head = (head + 1) % buf.size();
        return true;
    }
    int Front() const { return isEmpty() ? -1 : buf[head]; }
    int Rear() const { return isEmpty() ? -1 : buf[(tail + buf.size() - 1) % buf.size()]; }
    bool isEmpty() const { return head == tail; }
    bool isFull() const { return (tail + 1) % buf.size() == head; }
};
```

**Time:** O(1) · **Space:** O(k + 1). Classic in drivers: head is written only by the consumer and tail only by the producer, so there's no shared `count` variable to protect.

### Walkthrough
**Goal:** fixed-capacity FIFO with O(1) operations and no allocation (the embedded ring buffer).

1. Capacity is a **power of two**, so `index & (SIZE − 1)` replaces the slower `% SIZE`.
2. `head` and `tail` are **free-running** counters that only ever increase; `head − tail` (unsigned) is the element count even after the 32-bit counters wrap around.
3. **push (ISR):** full if `head − tail == SIZE`. Write the byte, then *publish* by storing `head + 1` with release ordering.
4. **pop (main loop):** empty if `head == tail`. Read the byte, then store `tail + 1`.
5. Each index has exactly one writer → lock-free for a single producer and single consumer.

**Dry run** SIZE = 4:

| op | head | tail | count | slot used |
|---|---|---|---|---|
| push A | 1 | 0 | 1 | 0 |
| push B | 2 | 0 | 2 | 1 |
| pop → A | 2 | 1 | 1 | 0 |
| push C, D, E | 5 | 1 | 4 (full) | 2, 3, 0 (wrapped) |
| push F | — | — | full → false | |

## endianness

### Approach 1: Union-based detection (C only)
```c
#include <stdint.h>

int is_little_endian_union(void) {
    union { uint32_t u; uint8_t b[4]; } x = { .u = 1 };
    return x.b[0] == 1;          /* type punning via unions is defined in C, UB in C++ */
}
```

Compact and common in C code. In C++, use `memcpy`, `std::bit_cast`, or simply `std::endian::native == std::endian::little` (C++20).

### Approach 2: Byte swap with a loop / compiler builtins
```c
#include <stdint.h>

uint32_t bswap32_loop(uint32_t x) {
    uint32_t r = 0;
    for (int i = 0; i < 4; ++i) {
        r = (r << 8) | (x & 0xFFu);   /* move lowest byte of x to the next position of r */
        x >>= 8;
    }
    return r;
}

uint32_t bswap32_builtin(uint32_t x) {
#if defined(__GNUC__) || defined(__clang__)
    return __builtin_bswap32(x);     /* single REV / BSWAP instruction */
#else
    return bswap32_loop(x);
#endif
}
```

Same result; the builtin (or C++23 `std::byteswap`) compiles to one instruction on ARM (`REV`) and x86 (`BSWAP`).

### Walkthrough
**Goal:** detect byte order, swap bytes, and parse big-endian data portably.

1. **Detect:** store `uint32_t x = 1` and inspect its first byte in memory (via `memcpy`). Little-endian stores the least significant byte first → that byte is 1.
2. **Swap:** move each byte to the mirrored position with shifts and masks.
3. **Parse wire data:** build the value from bytes with shifts. Shifts operate on *values*, not memory, so this works on any host endianness and any alignment.

**Dry run** `bswap32(0x12345678)`:

| term | value |
|---|---|
| x >> 24 | 0x00000012 |
| (x >> 8) & 0x0000FF00 | 0x00003400 |
| (x << 8) & 0x00FF0000 | 0x00560000 |
| x << 24 | 0x78000000 |
| OR | **0x78563412** |

Bytes `{0x12, 0x34, 0x56, 0x78}` read with `read_be32` → `0x12345678` on every machine.

## reverse-words-in-a-string

### Approach 1: Split into words, join in reverse
```cpp
class Solution {
public:
    string reverseWords(string s) {
        istringstream in(s);
        vector<string> words;
        for (string w; in >> w; ) words.push_back(w);       // >> skips any amount of whitespace
        string out;
        for (int i = (int)words.size() - 1; i >= 0; --i) {
            out += words[i];
            if (i) out += ' ';
        }
        return out;
    }
};
```

**Time:** O(n) · **Space:** O(n). The quickest correct answer; the follow-up asks for O(1) extra space.

### Approach 2: Stack of words, scanning manually
```cpp
class Solution {
public:
    string reverseWords(string s) {
        vector<string> st;
        string cur;
        for (char c : s) {
            if (c == ' ') { if (!cur.empty()) { st.push_back(cur); cur.clear(); } }
            else cur += c;
        }
        if (!cur.empty()) st.push_back(cur);
        string out;
        while (!st.empty()) { out += st.back(); st.pop_back(); if (!st.empty()) out += ' '; }
        return out;
    }
};
```

**Time:** O(n) · **Space:** O(n). Explicit tokenisation — what you'd write in C without `stringstream`.

### Walkthrough
**Goal:** reverse word order, collapse spaces, O(1) extra memory.

1. Reverse the entire string → the words are in the right order, but each word is spelled backwards.
2. Scan with a read pointer `i` and a write pointer `w`:
   1. Skip spaces.
   2. Before each word except the first, write one space.
   3. Copy the word's characters to `w`, then reverse that copied segment to fix its spelling.
3. Truncate the string at `w` (removes trailing spaces and leftovers).

**Dry run** `"  the sky  "`:

| step | string |
|---|---|
| reverse all | `"  yks eht  "` |
| copy "yks" → reverse | `"sky"…` |
| add space, copy "eht" → reverse | `"sky the"…` |
| resize to w | **`"sky the"`** |

## aligned-malloc

### Approach 1: Use the standard APIs
```c
#include <stdlib.h>

void *aligned_alloc_std(size_t size, size_t align) {
    /* C11: size must be a multiple of align -> round it up */
    size_t rounded = (size + align - 1) & ~(align - 1);
    return aligned_alloc(align, rounded);          /* free() with plain free */
}
```

```cpp
#include <new>
#include <cstddef>

void* aligned_new(std::size_t size, std::size_t align) {
    return ::operator new(size, std::align_val_t{align});          // C++17; throws on failure
}
void aligned_delete(void* p, std::size_t align) {
    ::operator delete(p, std::align_val_t{align});
}
```

In real code use these (or POSIX `posix_memalign`, MSVC `_aligned_malloc`); C++ `alignas(64)` handles static/automatic objects. The hand-written version is for showing you understand the arithmetic.

### Approach 2: Store the offset in a byte instead of a full pointer
```c
#include <stdint.h>
#include <stdlib.h>

/* Works for align up to 256: stash (aligned - raw) in the byte just before the block */
void *aligned_malloc_small(size_t size, size_t align) {
    if (align == 0 || (align & (align - 1)) || align > 256) return NULL;
    unsigned char *raw = malloc(size + align);              /* at least 1 byte of room for the offset */
    if (!raw) return NULL;
    uintptr_t a = ((uintptr_t)raw + align) & ~(uintptr_t)(align - 1);   /* always > raw */
    unsigned char *p = (unsigned char *)a;
    p[-1] = (unsigned char)(p - raw - 1);                   /* offset 0..255 */
    return p;
}

void aligned_free_small(void *ptr) {
    if (!ptr) return;
    unsigned char *p = ptr;
    free(p - p[-1] - 1);
}
```

Saves 7 bytes of overhead per allocation versus storing a pointer — the kind of trade-off embedded interviewers like to discuss.

### Walkthrough
**Goal:** return memory aligned to `align` (a power of two) using only `malloc`, and free it correctly later.

1. Over-allocate `size + align − 1 + sizeof(void*)`: enough slack to slide forward to an aligned address *and* room to store the original pointer.
2. Start just after the pointer slot: `start = raw + sizeof(void*)`.
3. Round up: `aligned = (start + align − 1) & ~(align − 1)` — adding `align − 1` then clearing the low bits rounds up to a multiple of `align`.
4. Store `raw` at `aligned − sizeof(void*)` so `aligned_free` can find it.
5. `aligned_free(p)`: read the stashed pointer and `free` it.

**Dry run** `align = 64`, `malloc` returns `raw = 0x1008`, 8-byte pointers:

| step | value |
|---|---|
| start = raw + 8 | 0x1010 |
| start + 63 | 0x104F |
| & ~63 | **0x1040** (aligned) |
| stash raw at | 0x1038 |

## debounce-button

### Approach 1: Counter (integrator) debounce
```c
#include <stdbool.h>
#include <stdint.h>

typedef struct { uint8_t count; bool stable; } integrator_t;
#define DEBOUNCE_TICKS 10u

/* Called every 1 ms. Count moves toward the raw level; state flips only at the extremes. */
bool integrator_update(integrator_t *d, bool raw) {
    bool was = d->stable;
    if (raw) { if (d->count < DEBOUNCE_TICKS) ++d->count; }
    else     { if (d->count > 0) --d->count; }
    if (d->count == DEBOUNCE_TICKS) d->stable = true;
    else if (d->count == 0) d->stable = false;
    return d->stable && !was;                     /* press event */
}
```

**Time:** O(1) per tick · **Space:** 2 bytes. Tolerates occasional noise in the middle of a press (the count only drifts back slightly) and gives hysteresis for free.

### Approach 2: Edge interrupt + lockout timer
```c
#include <stdbool.h>
#include <stdint.h>

static volatile uint32_t g_ms;            /* incremented by a 1 ms SysTick ISR */
static volatile uint32_t last_edge;
static volatile bool pressed_event;

void button_exti_isr(void) {              /* GPIO falling-edge interrupt */
    uint32_t now = g_ms;
    if ((uint32_t)(now - last_edge) > 20u) pressed_event = true;   /* ignore edges within 20 ms */
    last_edge = now;
    /* clear the EXTI pending flag here */
}
```

Lowest latency (reacts on the first edge) and the CPU can sleep until the button is touched. But a bouncing contact can fire many interrupts, so many designs disable the EXTI line in the ISR and re-enable it from a timer.

### Walkthrough
**Goal:** report a clean press even though the contact chatters for several milliseconds.

1. Sample the pin every 1 ms from a timer.
2. Shift each sample into a 16-bit history: `history = (history << 1) | raw`.
3. If all 16 bits are 1 (`0xFFFF`), the button has been solidly high for 16 ms → stable = pressed. All 0 → stable = released. Anything mixed → keep the previous state.
4. Report a *press event* when the stable state changes from released to pressed.

**Dry run** (8-bit history for brevity; 1 = pressed):

| ms | raw | history | stable | event |
|---|---|---|---|---|
| 0 | 1 | 00000001 | released | |
| 1 | 0 | 00000010 | released | (bounce) |
| 2 | 1 | 00000101 | released | |
| 3–9 | 1 | … 11111111 | **pressed** at ms 9 | **press** |

## memory-pool

### Approach 1: Bitmap allocator
```c
#include <stdint.h>
#include <stddef.h>

#define BLOCK_SIZE 32u
#define NUM_BLOCKS 64u

static _Alignas(max_align_t) uint8_t storage[NUM_BLOCKS][BLOCK_SIZE];
static uint64_t used;                                    /* bit i set = block i allocated */

void *bitmap_alloc(void) {
    if (used == UINT64_MAX) return NULL;                 /* all 64 blocks in use */
    unsigned i = (unsigned)__builtin_ctzll(~used);       /* lowest free block (count trailing zeros) */
    used |= 1ull << i;
    return storage[i];
}

void bitmap_free(void *p) {
    size_t i = (size_t)((uint8_t *)p - &storage[0][0]) / BLOCK_SIZE;
    used &= ~(1ull << i);
}
```

**Time:** O(1) using a count-trailing-zeros instruction · **Space:** 1 bit per block. Bonus: you can detect double frees (bit already clear) and list allocated blocks for debugging — the free-list version can't.

### Approach 2: Stack of free indices
```c
#include <stdint.h>

#define NUM_BLOCKS 64u
#define BLOCK_SIZE 32u

static _Alignas(8) uint8_t blocks[NUM_BLOCKS][BLOCK_SIZE];
static uint8_t free_idx[NUM_BLOCKS];
static uint8_t free_top;

void idxpool_init(void) {
    for (uint8_t i = 0; i < NUM_BLOCKS; ++i) free_idx[i] = (uint8_t)(NUM_BLOCKS - 1 - i);
    free_top = NUM_BLOCKS;
}
void *idxpool_alloc(void) { return free_top ? blocks[free_idx[--free_top]] : (void *)0; }
void idxpool_free(void *p) {
    free_idx[free_top++] = (uint8_t)(((uint8_t *)p - &blocks[0][0]) / BLOCK_SIZE);
}
```

**Time:** O(1) · **Space:** 1 byte per block of metadata kept outside the blocks — freed blocks aren't overwritten, which helps when debugging use-after-free.

### Walkthrough
**Goal:** O(1), fragmentation-free allocation of fixed-size blocks from a static array.

1. Each block is a `union` of "next free pointer" and "payload bytes" — free blocks store the list link *inside themselves*, so there's no metadata overhead.
2. **init:** link block 0 → 1 → … → N−1 → NULL; `free_list` points at block 0.
3. **alloc:** pop the head of the free list (`free_list = head->next`), return the head. Empty list → NULL.
4. **free:** push the block back: `b->next = free_list; free_list = b`.
5. Protect alloc/free with a critical section if ISRs or multiple tasks use the pool.

**Dry run** (4 blocks):

| op | free list | returned |
|---|---|---|
| init | B0 → B1 → B2 → B3 | |
| alloc | B1 → B2 → B3 | B0 |
| alloc | B2 → B3 | B1 |
| free(B0) | B0 → B2 → B3 | |
| alloc | B2 → B3 | B0 (LIFO reuse, cache-warm) |
