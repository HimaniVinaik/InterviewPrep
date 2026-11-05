# C & Embedded Classics

These are the "write it on the whiteboard in C" questions that firmware, driver, and systems teams ask. They test pointers, memory, bits, `volatile`, and attention to edge cases more than algorithms.

**What interviewers look for**
- Correct handling of `NULL`, zero length, overlap, alignment, and overflow.
- Use of fixed-width types (`uint8_t`, `uint32_t`) from `<stdint.h>` and `size_t` for sizes.
- Clear ownership: who allocates, who frees.
- Knowing *why* the standard library version is faster/safer than yours.

## Implement memcpy and memmove
- difficulty: Medium
- leetcode: -
- slug: memcpy-memmove

Implement `void* my_memcpy(void* dst, const void* src, size_t n)` and `void* my_memmove(...)`. Explain the difference.

### Hint
`memcpy` assumes the regions don't overlap; `memmove` must handle overlap by choosing the copy direction.

### Solution
```c
#include <stddef.h>
#include <stdint.h>

void *my_memcpy(void *restrict dst, const void *restrict src, size_t n) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    while (n--) *d++ = *s++;
    return dst;
}

void *my_memmove(void *dst, const void *src, size_t n) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    if (d == s || n == 0) return dst;
    if (d < s) {                       /* copy forward */
        while (n--) *d++ = *s++;
    } else {                           /* overlap with dst after src: copy backward */
        d += n; s += n;
        while (n--) *--d = *--s;
    }
    return dst;
}
```

### Explanation
- Work through `unsigned char*` — the only type allowed to alias any object.
- `restrict` (C99) promises no overlap, enabling the compiler to vectorise `memcpy`. Calling `memcpy` on overlapping buffers is **undefined behaviour**.
- `memmove` copies backward when `dst` lies inside `[src, src+n)`, so source bytes are read before being overwritten.
- Strictly, comparing pointers into different objects with `<` is unspecified in ISO C; real libc implementations cast to `uintptr_t`.
- Production versions copy word-at-a-time once aligned (`uint32_t`/`uint64_t`/SIMD), handling the unaligned head and tail bytewise.

**Time:** O(n) · **Space:** O(1)

## Implement strlen, strcpy and strcmp
- difficulty: Easy
- leetcode: -
- slug: strlen-strcpy-strcmp

Implement the three classic C string functions.

### Hint
C strings are NUL-terminated `char` arrays. `strcmp` compares as `unsigned char`.

### Solution
```c
#include <stddef.h>

size_t my_strlen(const char *s) {
    const char *p = s;
    while (*p) ++p;
    return (size_t)(p - s);          /* pointer difference = length */
}

char *my_strcpy(char *dst, const char *src) {
    char *ret = dst;
    while ((*dst++ = *src++) != '\0') { }   /* copies the terminator too */
    return ret;
}

int my_strcmp(const char *a, const char *b) {
    while (*a && *a == *b) { ++a; ++b; }
    return (unsigned char)*a - (unsigned char)*b;
}
```

### Explanation
- `strcpy` has no bounds checking — the source of countless buffer overflows. Discuss `strncpy` (doesn't always NUL-terminate!), `strlcpy` (BSD), `snprintf`, and C11 Annex K `strcpy_s`.
- `strcmp` must compare as `unsigned char`, otherwise characters ≥ 0x80 compare incorrectly on platforms where `char` is signed.
- `strlen` is O(n) every call — avoid calling it in a loop condition.

**Time:** O(n) · **Space:** O(1)

## String to Integer (atoi)
- difficulty: Medium
- leetcode: 8
- slug: string-to-integer-atoi

Parse an integer: skip leading spaces, optional sign, digits; clamp to the 32-bit range on overflow.

### Hint
Detect overflow before `result * 10 + digit`.

### Solution
```cpp
class Solution {
public:
    int myAtoi(string s) {
        size_t i = 0, n = s.size();
        while (i < n && s[i] == ' ') ++i;
        int sign = 1;
        if (i < n && (s[i] == '+' || s[i] == '-')) sign = (s[i++] == '-') ? -1 : 1;
        int r = 0;
        while (i < n && isdigit((unsigned char)s[i])) {
            int d = s[i++] - '0';
            if (r > (INT_MAX - d) / 10) return sign == 1 ? INT_MAX : INT_MIN;
            r = r * 10 + d;
        }
        return r * sign;
    }
};
```

### Explanation
`r > (INT_MAX - d) / 10` ⇔ `r*10 + d > INT_MAX`, without overflowing. Clamping on the positive side also correctly yields `INT_MIN` for `-2147483648` and below. In real C, use `strtol` and check `errno == ERANGE` and the `endptr`; never use `atoi` (no error reporting).

**Time:** O(n) · **Space:** O(1)

## Bit Manipulation Macros & Register Access
- difficulty: Easy
- leetcode: -
- slug: bit-macros-registers

Write macros/inline functions to set, clear, toggle and test bit `n` of a register, and to write a multi-bit field. Then write to a memory-mapped register at `0x40021000`.

### Hint
Use unsigned constants, parenthesise macro arguments, and access hardware through a `volatile` pointer.

### Solution
```c
#include <stdint.h>

#define BIT(n)            (1UL << (n))
#define SET_BIT(r, n)     ((r) |=  BIT(n))
#define CLEAR_BIT(r, n)   ((r) &= ~BIT(n))
#define TOGGLE_BIT(r, n)  ((r) ^=  BIT(n))
#define TEST_BIT(r, n)    (((r) >> (n)) & 1UL)

/* Write `val` into a field of `width` bits at `pos` (read-modify-write). */
static inline uint32_t field_write(uint32_t reg, unsigned pos, unsigned width, uint32_t val) {
    uint32_t mask = ((width >= 32) ? 0xFFFFFFFFu : ((1u << width) - 1u)) << pos;
    return (reg & ~mask) | ((val << pos) & mask);
}

/* Memory-mapped register */
#define RCC_BASE   0x40021000UL
#define RCC_CR     (*(volatile uint32_t *)(RCC_BASE + 0x00))

void enable_hse(void) {
    SET_BIT(RCC_CR, 16);                 /* HSEON */
    while (!TEST_BIT(RCC_CR, 17)) { }    /* wait for HSERDY — volatile forces re-read */
}
```

### Explanation
- `volatile` tells the compiler every access has side effects, so it cannot cache the value in a register or remove the polling loop.
- `1UL` avoids UB when shifting into bit 31 of a signed `int`.
- Parenthesise macro parameters: `SET_BIT(r, a+1)` must expand correctly.
- **Read-modify-write is not atomic.** If an ISR touches the same register, disable interrupts around it or use hardware set/clear registers (e.g. STM32 `BSRR`) / bit-banding.
- Modern C++ alternative: `constexpr` functions or a typed register template instead of macros.

**Time:** O(1) · **Space:** O(1)

## Circular (Ring) Buffer
- difficulty: Medium
- leetcode: 622
- slug: design-circular-queue

Implement a fixed-size ring buffer of bytes for a UART driver: `push` from an ISR, `pop` from the main loop, lock-free for a single producer / single consumer.

### Hint
Power-of-two size lets you wrap with `& (N-1)`. Keep free-running `head`/`tail` counters; `head - tail` is the count even across wraparound (unsigned arithmetic).

### Solution
```c
#include <stdint.h>
#include <stdbool.h>
#include <stdatomic.h>

#define RB_SIZE 256u                      /* must be a power of two */
_Static_assert((RB_SIZE & (RB_SIZE - 1)) == 0, "RB_SIZE must be power of 2");

typedef struct {
    uint8_t buf[RB_SIZE];
    _Atomic uint32_t head;                /* written only by producer (ISR) */
    _Atomic uint32_t tail;                /* written only by consumer (main) */
} ringbuf_t;

bool rb_push(ringbuf_t *rb, uint8_t byte) {          /* called from ISR */
    uint32_t h = atomic_load_explicit(&rb->head, memory_order_relaxed);
    uint32_t t = atomic_load_explicit(&rb->tail, memory_order_acquire);
    if (h - t == RB_SIZE) return false;               /* full */
    rb->buf[h & (RB_SIZE - 1)] = byte;
    atomic_store_explicit(&rb->head, h + 1, memory_order_release); /* publish */
    return true;
}

bool rb_pop(ringbuf_t *rb, uint8_t *out) {           /* called from main loop */
    uint32_t t = atomic_load_explicit(&rb->tail, memory_order_relaxed);
    uint32_t h = atomic_load_explicit(&rb->head, memory_order_acquire);
    if (h == t) return false;                         /* empty */
    *out = rb->buf[t & (RB_SIZE - 1)];
    atomic_store_explicit(&rb->tail, t + 1, memory_order_release);
    return true;
}
```

### Explanation
- **Free-running indices**: `head - tail` (unsigned) is always the element count, even after `uint32_t` wraps — no "one slot wasted" trick needed.
- **SPSC lock-free**: each index has exactly one writer. Release/acquire ordering guarantees the byte is written *before* the consumer sees the new `head`.
- On a single-core MCU without C11 atomics, `volatile` indices plus a compiler barrier work in practice, but atomics state the intent correctly.
- LeetCode 622 (Design Circular Queue) is the same structure without concurrency.

**Time:** O(1) per op · **Space:** O(N)

## Endianness: Detect and Byte-Swap
- difficulty: Easy
- leetcode: -
- slug: endianness

Write a function that detects the machine's endianness and one that byte-swaps a `uint32_t`. Then parse a big-endian 32-bit value from a byte buffer portably.

### Hint
Inspect the first byte of a known multi-byte value. For parsing, assemble with shifts — it's endian-independent.

### Solution
```c
#include <stdint.h>
#include <string.h>

int is_little_endian(void) {
    uint32_t x = 1;
    unsigned char first;
    memcpy(&first, &x, 1);          /* well-defined way to inspect bytes */
    return first == 1;
}

uint32_t bswap32(uint32_t x) {
    return  (x >> 24)
         | ((x >>  8) & 0x0000FF00u)
         | ((x <<  8) & 0x00FF0000u)
         |  (x << 24);
}

/* Portable: works on any host endianness, any alignment */
uint32_t read_be32(const uint8_t *p) {
    return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) |
           ((uint32_t)p[2] <<  8) |  (uint32_t)p[3];
}
```

### Explanation
- Little-endian (x86, most ARM configs) stores the least significant byte at the lowest address. Network byte order is big-endian (`htonl`/`ntohl`).
- **Don't** parse by casting `(uint32_t*)buf` — that can be misaligned (a fault on some cores) and violates strict aliasing. Shifts are portable and compilers turn them into a single `REV`/`BSWAP` instruction.
- C++20: `std::endian::native`; C++23: `std::byteswap`. GCC/Clang: `__builtin_bswap32`.
- The `(uint32_t)` casts matter: `p[0] << 24` would promote to `int` and overflow if `p[0] >= 0x80`.

**Time:** O(1) · **Space:** O(1)

## Reverse Words in a String (in place)
- difficulty: Medium
- leetcode: 151
- slug: reverse-words-in-a-string

Reverse the order of words; collapse multiple spaces; no leading/trailing spaces. Do it in place with O(1) extra space.

### Hint
Reverse the whole string, then reverse each word, compacting spaces with a write pointer.

### Solution
```cpp
class Solution {
public:
    string reverseWords(string s) {
        ranges::reverse(s);
        size_t w = 0, n = s.size();
        for (size_t i = 0; i < n; ) {
            if (s[i] == ' ') { ++i; continue; }
            if (w > 0) s[w++] = ' ';                  // single separator
            size_t start = w;
            while (i < n && s[i] != ' ') s[w++] = s[i++];
            reverse(s.begin() + start, s.begin() + w); // un-reverse the word
        }
        s.resize(w);
        return s;
    }
};
```

### Explanation
Reverse-all-then-reverse-each is a classic in-place trick (also used for array rotation: reverse whole, reverse parts). The write pointer `w` never overtakes the read pointer `i`, so compaction is safe.

**Time:** O(n) · **Space:** O(1)

## Aligned Malloc
- difficulty: Medium
- leetcode: -
- slug: aligned-malloc

Implement `void* aligned_malloc(size_t size, size_t align)` and `aligned_free(void*)` using only `malloc`/`free`. `align` is a power of two (e.g. for DMA buffers).

### Hint
Over-allocate by `align - 1 + sizeof(void*)`, round the address up, and stash the original pointer just before the returned block.

### Solution
```c
#include <stdint.h>
#include <stdlib.h>

void *aligned_malloc(size_t size, size_t align) {
    if (align == 0 || (align & (align - 1))) return NULL;    /* power of two only */
    size_t extra = align - 1 + sizeof(void *);
    void *raw = malloc(size + extra);
    if (!raw) return NULL;
    uintptr_t start = (uintptr_t)raw + sizeof(void *);
    uintptr_t aligned = (start + (align - 1)) & ~(uintptr_t)(align - 1);  /* round up */
    ((void **)aligned)[-1] = raw;                             /* stash original */
    return (void *)aligned;
}

void aligned_free(void *p) {
    if (p) free(((void **)p)[-1]);
}
```

### Explanation
- Round up to a multiple of `align`: `(x + a - 1) & ~(a - 1)` — a must-know bit trick.
- Storing the raw pointer just before the aligned block lets `aligned_free` recover it.
- Size overflow check (`size + extra` wrapping) is a good extra to mention.
- Standard alternatives: C11 `aligned_alloc` (size must be a multiple of align), POSIX `posix_memalign`, C++17 `operator new(size, std::align_val_t)` and `alignas`.

**Time:** O(1) · **Space:** O(align) overhead

## Debounce a Button
- difficulty: Medium
- leetcode: -
- slug: debounce-button

A mechanical button bounces for up to ~10 ms. Write a debounce routine called from a 1 ms timer tick that reports a stable pressed/released state and a "pressed" event.

### Hint
Shift raw samples into an integer; the state is stable when the history is all 1s or all 0s.

### Solution
```c
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    uint16_t history;   /* last 16 samples, LSB = newest */
    bool     stable;    /* debounced state */
} debounce_t;

/* Call every 1 ms with the raw pin level. Returns true on a press edge. */
bool debounce_update(debounce_t *d, bool raw) {
    d->history = (uint16_t)((d->history << 1) | (raw ? 1u : 0u));
    bool was = d->stable;
    if (d->history == 0xFFFFu)      d->stable = true;    /* 16 ms solid high */
    else if (d->history == 0x0000u) d->stable = false;   /* 16 ms solid low  */
    return d->stable && !was;                            /* rising edge */
}
```

### Explanation
- The shift-register approach needs no timers or counters and rejects any glitch shorter than 16 samples.
- Call it from a periodic timer, **not** from a GPIO edge interrupt (a bouncing pin would storm the CPU with interrupts).
- Variant: an integrator/counter that saturates at N gives the same effect with tunable hysteresis.

**Time:** O(1) per tick · **Space:** O(1)

## Fixed-Size Memory Pool Allocator
- difficulty: Hard
- leetcode: -
- slug: memory-pool

Embedded systems often forbid `malloc` after init. Implement a fixed-block pool allocator with O(1) `pool_alloc` and `pool_free` over a static buffer.

### Hint
Thread a free list *through the unused blocks themselves* — each free block stores a pointer to the next free block.

### Solution
```c
#include <stddef.h>
#include <stdint.h>

#define BLOCK_SIZE  32u
#define NUM_BLOCKS  64u

typedef union block {
    union block *next;                     /* valid while free */
    uint8_t data[BLOCK_SIZE];              /* valid while allocated */
} block_t;

static block_t pool[NUM_BLOCKS];           /* union => properly aligned for a pointer */
static block_t *free_list;

void pool_init(void) {
    for (size_t i = 0; i < NUM_BLOCKS - 1; ++i) pool[i].next = &pool[i + 1];
    pool[NUM_BLOCKS - 1].next = NULL;
    free_list = &pool[0];
}

void *pool_alloc(void) {
    block_t *b = free_list;
    if (b) free_list = b->next;            /* pop */
    return b;
}

void pool_free(void *p) {
    if (!p) return;
    block_t *b = p;
    b->next = free_list;                   /* push */
    free_list = b;
}
```

### Explanation
- No per-block header, no fragmentation, deterministic O(1) — ideal for real-time systems.
- Using a `union` guarantees the blocks are aligned for a pointer and big enough to hold one.
- Not thread/ISR-safe as written: wrap alloc/free in a critical section (disable interrupts) or use an RTOS mutex.
- Debug extras: fill freed blocks with a pattern (`0xDEADBEEF`), and check `p` lies within `pool` and on a block boundary to catch bad frees.

**Time:** O(1) · **Space:** O(NUM_BLOCKS × BLOCK_SIZE)
