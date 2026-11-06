## memcpy-memmove

### Approach 1: Word-at-a-time memcpy (fast path for aligned data)
**The idea:** copying one byte per loop is slow. If both pointers can be aligned to a machine word, copy 8 bytes (one `size_t`) per loop instead, and handle the leftover bytes one at a time.

```c
#include <stddef.h>
#include <stdint.h>

void *fast_memcpy(void *restrict dst, const void *restrict src, size_t n) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    const size_t WORD = sizeof(size_t);          /* 8 on a 64-bit machine */

    /* The fast path only works if dst and src have the same offset inside a word. */
    if ((((uintptr_t)d ^ (uintptr_t)s) & (WORD - 1)) == 0) {
        /* 1. Copy single bytes until d sits on a word boundary. */
        while (n > 0 && ((uintptr_t)d & (WORD - 1)) != 0) {
            *d = *s;
            d++;
            s++;
            n--;
        }
        /* 2. Copy whole words. */
        size_t *dw = (size_t *)(void *)d;
        const size_t *sw = (const size_t *)(const void *)s;
        while (n >= WORD) {
            *dw = *sw;
            dw++;
            sw++;
            n -= WORD;
        }
        d = (unsigned char *)dw;
        s = (const unsigned char *)sw;
    }

    /* 3. Copy whatever is left, one byte at a time. */
    while (n > 0) {
        *d = *s;
        d++;
        s++;
        n--;
    }
    return dst;
}
```

**How it works**
1. "Head": bytes before the first aligned address.
2. "Body": whole words, about 8× fewer loop iterations.
3. "Tail": the remaining 0–7 bytes.

**Think of it like this:** moving books one at a time until you reach a box, then moving whole boxes, then the last few loose books.

**Cost:** Time **O(n)** with ~8× fewer iterations. Space **O(1)**. Real `memcpy` goes further with SIMD. (Word access through `size_t*` bends strict-aliasing rules; libc builds its version with special compiler flags.)

### Approach 2: memmove via a temporary buffer
**The idea:** copy the source into a separate buffer first, then copy that buffer to the destination. Overlap can't corrupt anything because the source is saved before you write.

```c
#include <stdlib.h>
#include <string.h>

void *simple_memmove(void *dst, const void *src, size_t n) {
    /* malloc(0) may return NULL, so always ask for at least 1 byte. */
    unsigned char *tmp = malloc(n > 0 ? n : 1);
    if (tmp == NULL) {
        return NULL;                 /* out of memory */
    }
    memcpy(tmp, src, n);             /* 1. snapshot the source */
    memcpy(dst, tmp, n);             /* 2. write it to the destination */
    free(tmp);
    return dst;
}
```

**How it works:** the snapshot makes overlap irrelevant.

**Think of it like this:** photocopying a page before writing over part of it.

**Cost:** Time **O(n)**. Space **O(n)** heap — allocation can fail and is banned in many embedded projects, which is why the direction trick is preferred.

### Optimal: Byte copy + choose the copy direction for overlap
**The idea:** `memcpy` may assume the regions don't overlap. `memmove` must handle overlap: if the destination starts *after* the source, copy from the end backwards so you never overwrite bytes you still need.

```c
#include <stddef.h>
#include <stdint.h>

/* restrict promises the compiler the two regions never overlap. */
void *my_memcpy(void *restrict dst, const void *restrict src, size_t n) {
    unsigned char *d = dst;             /* byte pointers: void* can't be dereferenced */
    const unsigned char *s = src;
    while (n > 0) {
        *d = *s;                        /* copy one byte */
        d++;
        s++;
        n--;
    }
    return dst;                         /* the standard says return the destination */
}

void *my_memmove(void *dst, const void *src, size_t n) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    if (d == s || n == 0) {
        return dst;                     /* nothing to do */
    }
    if (d < s) {
        /* Destination is before the source: copying forwards is safe. */
        while (n > 0) {
            *d = *s;
            d++;
            s++;
            n--;
        }
    } else {
        /* Destination is after the source: copy backwards, starting at the end. */
        d += n;
        s += n;
        while (n > 0) {
            d--;
            s--;
            *d = *s;
            n--;
        }
    }
    return dst;
}
```

**How it works**
1. Use `unsigned char*` to copy raw bytes.
2. `memcpy`: straight forward copy.
3. `memmove`: forwards if `dst < src`, backwards otherwise.

**Think of it like this:** shifting people along a bench to the right — you must move the person at the right end first, or someone gets sat on.

**Why it's the expected answer:** correct for overlap with O(1) memory and no allocation; mention the word-at-a-time speed-up as a follow-up.

**Cost:** Time **O(n)**. Space **O(1)**.

## strlen-strcpy-strcmp

### Approach 1: Index-based versions
**The idea:** use an index `i` instead of moving pointers — often easier to read.

```c
#include <stddef.h>

size_t idx_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {          /* stop at the terminating NUL */
        n++;
    }
    return n;
}

char *idx_strcpy(char *dst, const char *src) {
    size_t i = 0;
    while (1) {
        dst[i] = src[i];            /* copy, including the final '\0' */
        if (src[i] == '\0') {
            break;
        }
        i++;
    }
    return dst;
}

int idx_strcmp(const char *a, const char *b) {
    size_t i = 0;
    while (a[i] != '\0' && a[i] == b[i]) {
        i++;                        /* skip the common prefix */
    }
    /* Compare as unsigned char, as the standard requires. */
    return (unsigned char)a[i] - (unsigned char)b[i];
}
```

**How it works:** identical logic to the pointer versions; the compiler produces almost the same machine code.

**Think of it like this:** counting houses by number instead of walking from door to door.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 2: Bounded, safer variants
**The idea:** `strcpy` overflows if `dst` is too small. Bounded versions take the buffer size and never write past it.

```c
#include <stddef.h>

/* Copies at most size-1 characters and ALWAYS NUL-terminates (like BSD strlcpy).
   Returns strlen(src), so the caller can detect truncation: ret >= size. */
size_t my_strlcpy(char *dst, const char *src, size_t size) {
    size_t len = 0;
    while (src[len] != '\0') {
        len++;
    }
    if (size > 0) {
        size_t n = len;
        if (n > size - 1) {
            n = size - 1;            /* leave room for the terminator */
        }
        for (size_t i = 0; i < n; i++) {
            dst[i] = src[i];
        }
        dst[n] = '\0';
    }
    return len;
}

/* Like strlen, but never reads more than max bytes. */
size_t my_strnlen(const char *s, size_t max) {
    size_t n = 0;
    while (n < max && s[n] != '\0') {
        n++;
    }
    return n;
}
```

**How it works:** every loop is limited by the buffer size, not just by the NUL.

**Think of it like this:** pouring a drink with a measuring cup instead of filling until it overflows.

**Cost:** Time **O(n)**. Space **O(1)**. Bring this up when asked "what's wrong with `strcpy`?".

### Optimal: Classic pointer versions
**The idea:** walk pointers until the terminating `'\0'`. Pointer subtraction gives the length; `strcmp` compares as `unsigned char`.

```c
#include <stddef.h>

size_t my_strlen(const char *s) {
    const char *p = s;
    while (*p != '\0') {
        p++;                          /* move to the next character */
    }
    return (size_t)(p - s);           /* distance between pointers = length */
}

char *my_strcpy(char *dst, const char *src) {
    char *ret = dst;                  /* remember the start to return it */
    while (1) {
        *dst = *src;                  /* copy one char (including the final '\0') */
        if (*src == '\0') {
            break;
        }
        dst++;
        src++;
    }
    return ret;
}

int my_strcmp(const char *a, const char *b) {
    while (*a != '\0' && *a == *b) {
        a++;                          /* skip characters that are equal */
        b++;
    }
    /* <0, 0 or >0. Cast so that chars above 127 compare correctly. */
    return (unsigned char)*a - (unsigned char)*b;
}
```

**How it works**
1. `strlen`: advance until `'\0'`, return the pointer difference.
2. `strcpy`: copy each char including the terminator.
3. `strcmp`: skip the equal prefix, return the difference of the first mismatch.

**Think of it like this:** C strings are trains with a red caboose (`'\0'`) at the end — you walk until you see it.

**Why it's the expected answer:** shows pointer fluency and the `unsigned char` detail interviewers look for.

**Cost:** Time **O(n)**. Space **O(1)**.

## string-to-integer-atoi

### Approach 1: Parse with a 64-bit accumulator and clamp
**The idea:** build the number in `long long` and clamp as soon as it passes the `int` limits.

```cpp
class Solution {
public:
    int myAtoi(string s) {
        size_t i = 0;
        size_t n = s.size();
        while (i < n && s[i] == ' ') {
            i++;                                  // skip leading spaces
        }
        int sign = 1;
        if (i < n && (s[i] == '+' || s[i] == '-')) {
            if (s[i] == '-') {
                sign = -1;
            }
            i++;
        }
        long long r = 0;
        while (i < n && isdigit((unsigned char)s[i])) {
            r = r * 10 + (s[i] - '0');
            i++;
            // Check inside the loop so r can't overflow even 64 bits on long inputs.
            if (r * sign > INT_MAX) {
                return INT_MAX;
            }
            if (r * sign < INT_MIN) {
                return INT_MIN;
            }
        }
        return (int)(r * sign);
    }
};
```

**How it works:** a bigger accumulator makes the overflow check simple.

**Think of it like this:** using a bigger jug so you can see when it would overflow the small one.

**Cost:** Time **O(n)**. Space **O(1)**.

### Approach 2: State machine (finite automaton)
**The idea:** model the parser as states: START → SIGNED → NUMBER → END. Each character moves you between states.

```cpp
class Solution {
public:
    int myAtoi(string s) {
        enum State { START, SIGNED, NUMBER, END };
        State st = START;
        long long r = 0;
        int sign = 1;

        for (char c : s) {
            if (st == START && c == ' ') {
                continue;                                  // still skipping spaces
            }
            if (st == START && (c == '+' || c == '-')) {
                if (c == '-') {
                    sign = -1;
                }
                st = SIGNED;
                continue;
            }
            if (isdigit((unsigned char)c)) {
                st = NUMBER;
                r = r * 10 + (c - '0');
                if (r > (long long)INT_MAX + 1) {
                    r = (long long)INT_MAX + 1;            // saturate: big enough for both limits
                }
                continue;
            }
            st = END;                                      // anything else stops parsing
            break;
        }

        r = r * sign;
        if (r > INT_MAX) {
            return INT_MAX;
        }
        if (r < INT_MIN) {
            return INT_MIN;
        }
        return (int)r;
    }
};
```

**How it works:** each state only accepts certain characters; anything unexpected ends parsing.

**Think of it like this:** the same structure as a firmware protocol parser reading bytes from a UART.

**Cost:** Time **O(n)**. Space **O(1)**.

### Optimal: 32-bit only, check overflow before each digit
**The idea:** skip spaces, read an optional sign, then add digits — but before `r = r * 10 + d`, check whether it would exceed `INT_MAX`.

```cpp
class Solution {
public:
    int myAtoi(string s) {
        size_t i = 0;
        size_t n = s.size();

        // 1. Skip leading spaces.
        while (i < n && s[i] == ' ') {
            i++;
        }

        // 2. Optional sign.
        int sign = 1;
        if (i < n && (s[i] == '+' || s[i] == '-')) {
            if (s[i] == '-') {
                sign = -1;
            }
            i++;
        }

        // 3. Digits.
        int r = 0;
        while (i < n && isdigit((unsigned char)s[i])) {
            int d = s[i] - '0';
            i++;
            // Would r * 10 + d be bigger than INT_MAX? Rearranged so nothing overflows.
            if (r > (INT_MAX - d) / 10) {
                if (sign == 1) {
                    return INT_MAX;
                }
                return INT_MIN;
            }
            r = r * 10 + d;
        }
        return r * sign;
    }
};
```

**How it works**
1. Skip spaces; read `+`/`-`.
2. For each digit, check `r > (INT_MAX − d) / 10` first.
3. On overflow clamp to `INT_MAX` or `INT_MIN`. (−2147483648 clamps correctly too.)

**Think of it like this:** checking the bucket's remaining room before pouring in each cup.

**Why it's optimal:** O(n), pure 32-bit arithmetic, and every edge case (spaces, sign, junk, overflow) handled in order.

**Cost:** Time **O(n)**. Space **O(1)**.

## bit-macros-registers

### Approach 1: Type-safe C++ inline functions instead of macros
**The idea:** macros have no types and can evaluate arguments twice. `constexpr` templates generate identical machine code but are type-checked.

```cpp
#include <cstdint>
#include <type_traits>

// A value with only bit n set.
template <class T>
constexpr T bit(unsigned n) {
    static_assert(std::is_unsigned_v<T>, "use unsigned types for bit work");
    return T{1} << n;
}

// r = r | x instead of r |= x: compound assignment on volatile is deprecated in C++20.
template <class T>
void setBit(volatile T& r, unsigned n) {
    r = r | bit<T>(n);
}

template <class T>
void clearBit(volatile T& r, unsigned n) {
    r = r & ~bit<T>(n);
}

template <class T>
void toggleBit(volatile T& r, unsigned n) {
    r = r ^ bit<T>(n);
}

template <class T>
constexpr bool testBit(T r, unsigned n) {
    return (r >> n) & T{1};
}

// A register at a fixed address, known at compile time.
template <std::uintptr_t Addr>
struct Reg32 {
    static volatile std::uint32_t& ref() {
        return *reinterpret_cast<volatile std::uint32_t*>(Addr);
    }
    static void set(unsigned n) {
        ref() = ref() | (1u << n);
    }
    static void clear(unsigned n) {
        ref() = ref() & ~(1u << n);
    }
    static bool test(unsigned n) {
        return (ref() >> n) & 1u;
    }
};

using RCC_CR = Reg32<0x40021000>;   // usage: RCC_CR::set(16);
```

**How it works:** after inlining, `setBit(reg, 3)` compiles to the same single OR instruction as the macro.

**Think of it like this:** a labelled tool instead of a bare blade — same cut, fewer accidents.

**Cost:** Same machine code as macros. Benefits: type checking, no double evaluation, scoped names, debuggable.

### Approach 2: Bit-field overlay (know it, mostly avoid it)
**The idea:** describe the register as a struct of named bit-fields so you can write `reg.bits.hseon = 1`.

```c
#include <stdint.h>

typedef union {
    uint32_t word;                 /* the whole register */
    struct {
        uint32_t hsion  : 1;       /* bit 0  */
        uint32_t hsirdy : 1;       /* bit 1  */
        uint32_t        : 14;      /* bits 2..15 reserved */
        uint32_t hseon  : 1;       /* bit 16 */
        uint32_t hserdy : 1;       /* bit 17 */
        uint32_t        : 14;      /* bits 18..31 reserved */
    } bits;
} rcc_cr_t;

#define RCC_CR_REG (*(volatile rcc_cr_t *)0x40021000UL)
/* usage: RCC_CR_REG.bits.hseon = 1; */
```

**How it works:** the compiler generates the masks and shifts for you.

**Think of it like this:** labelled light switches on a panel — nice to read, but the panel's wiring order is up to the compiler.

**Cost:** Bit order and packing are **implementation-defined**, and each field write is a hidden read-modify-write (sometimes with the wrong access width). MISRA and most firmware teams prefer masks.

### Optimal: Classic mask macros + volatile register access
**The idea:** set with OR, clear with AND-NOT, toggle with XOR, test with shift-and-AND. Hardware registers are accessed through a `volatile` pointer so every read and write really happens.

```c
#include <stdint.h>

/* Parentheses around every argument and the whole expression prevent precedence bugs. */
#define BIT(n)            (1UL << (n))
#define SET_BIT(r, n)     ((r) |=  BIT(n))
#define CLEAR_BIT(r, n)   ((r) &= ~BIT(n))
#define TOGGLE_BIT(r, n)  ((r) ^=  BIT(n))
#define TEST_BIT(r, n)    (((r) >> (n)) & 1UL)

/* Write `val` into a field of `width` bits starting at bit `pos` (read-modify-write). */
static inline uint32_t field_write(uint32_t reg, unsigned pos, unsigned width, uint32_t val) {
    uint32_t ones;
    if (width >= 32) {
        ones = 0xFFFFFFFFu;               /* 1u << 32 would be undefined */
    } else {
        ones = (1u << width) - 1u;        /* e.g. width 3 → 0b111 */
    }
    uint32_t mask = ones << pos;          /* the bits that belong to the field */
    return (reg & ~mask) | ((val << pos) & mask);   /* clear the field, then insert val */
}

/* A memory-mapped register: an address treated as a volatile 32-bit variable. */
#define RCC_BASE   0x40021000UL
#define RCC_CR     (*(volatile uint32_t *)(RCC_BASE + 0x00))

void enable_hse(void) {
    SET_BIT(RCC_CR, 16);                  /* HSEON: turn the external oscillator on */
    while (!TEST_BIT(RCC_CR, 17)) {
        /* wait for HSERDY; volatile forces a fresh read every loop */
    }
}
```

**How it works**
1. `|` turns bits on, `& ~` turns them off, `^` flips them.
2. Fields: build a mask, clear the old field, OR in the new value.
3. `volatile` stops the compiler from caching the register in a CPU register or deleting the polling loop.

**Think of it like this:** a row of light switches; masks pick which switches you touch, and `volatile` means "always go and look at the real switch".

**Why it's the expected answer:** universal, portable across compilers, and exactly what vendor HALs do.

**Cost:** Time **O(1)**. Space **O(1)**.

## design-circular-queue

### Approach 1: Head index + element count
**The idea:** store where the front is and how many elements there are. The tail is `(head + count) % capacity`.

```cpp
class MyCircularQueue {
public:
    explicit MyCircularQueue(int k) : buf(k) {}

    bool enQueue(int value) {
        if (isFull()) {
            return false;
        }
        int tail = (head + count) % buf.size();   // first free slot after the last element
        buf[tail] = value;
        count++;
        return true;
    }

    bool deQueue() {
        if (isEmpty()) {
            return false;
        }
        head = (head + 1) % buf.size();           // the front moves forward, wrapping around
        count--;
        return true;
    }

    int Front() const {
        if (isEmpty()) {
            return -1;
        }
        return buf[head];
    }

    int Rear() const {
        if (isEmpty()) {
            return -1;
        }
        return buf[(head + count - 1) % buf.size()];
    }

    bool isEmpty() const {
        return count == 0;
    }

    bool isFull() const {
        return count == (int)buf.size();
    }

private:
    vector<int> buf;
    int head = 0;       // index of the front element
    int count = 0;      // number of elements stored
};
```

**How it works:** the count removes the "is head == tail full or empty?" ambiguity.

**Think of it like this:** a round table where you remember who sits first and how many people are seated.

**Cost:** Time **O(1)** for every operation. Space **O(k)**.

### Approach 2: Head/tail with one wasted slot
**The idea:** allocate k + 1 slots and never fill the last one, so `head == tail` always means empty and `tail + 1 == head` means full.

```cpp
class MyCircularQueue {
public:
    explicit MyCircularQueue(int k) : buf(k + 1) {}

    bool enQueue(int value) {
        if (isFull()) {
            return false;
        }
        buf[tail] = value;
        tail = (tail + 1) % buf.size();
        return true;
    }

    bool deQueue() {
        if (isEmpty()) {
            return false;
        }
        head = (head + 1) % buf.size();
        return true;
    }

    int Front() const {
        if (isEmpty()) {
            return -1;
        }
        return buf[head];
    }

    int Rear() const {
        if (isEmpty()) {
            return -1;
        }
        return buf[(tail + buf.size() - 1) % buf.size()];   // the slot just before tail
    }

    bool isEmpty() const {
        return head == tail;
    }

    bool isFull() const {
        return (tail + 1) % buf.size() == head;
    }

private:
    vector<int> buf;    // capacity k + 1: one slot always stays empty
    int head = 0;       // next element to read
    int tail = 0;       // next slot to write
};
```

**How it works:** head is changed only by the reader and tail only by the writer — no shared counter.

**Think of it like this:** a car park that always keeps one space free so you can tell "full" from "empty" by looking at the barrier positions alone.

**Cost:** Time **O(1)**. Space **O(k + 1)**. Classic in device drivers.

### Optimal: Lock-free single-producer / single-consumer ring buffer (C, power-of-two size)
**The idea:** for an ISR (producer) and main loop (consumer), use free-running `head` and `tail` counters. `head − tail` is the number of items, and `index & (SIZE − 1)` wraps cheaply. Atomics publish data safely without disabling interrupts.

```c
#include <stdint.h>
#include <stdbool.h>
#include <stdatomic.h>

#define RB_SIZE 256u                          /* must be a power of two */
_Static_assert((RB_SIZE & (RB_SIZE - 1)) == 0, "RB_SIZE must be a power of 2");

typedef struct {
    uint8_t buf[RB_SIZE];
    _Atomic uint32_t head;                    /* written only by the producer (ISR) */
    _Atomic uint32_t tail;                    /* written only by the consumer (main loop) */
} ringbuf_t;

/* Called from the ISR. Returns false if the buffer is full. */
bool rb_push(ringbuf_t *rb, uint8_t byte) {
    uint32_t h = atomic_load_explicit(&rb->head, memory_order_relaxed);
    uint32_t t = atomic_load_explicit(&rb->tail, memory_order_acquire);
    if (h - t == RB_SIZE) {
        return false;                         /* full (works even when the counters wrap) */
    }
    rb->buf[h & (RB_SIZE - 1)] = byte;        /* & instead of %: cheap wrap-around */
    /* release: the byte above becomes visible before the new head does */
    atomic_store_explicit(&rb->head, h + 1, memory_order_release);
    return true;
}

/* Called from the main loop. Returns false if the buffer is empty. */
bool rb_pop(ringbuf_t *rb, uint8_t *out) {
    uint32_t t = atomic_load_explicit(&rb->tail, memory_order_relaxed);
    uint32_t h = atomic_load_explicit(&rb->head, memory_order_acquire);
    if (h == t) {
        return false;                         /* empty */
    }
    *out = rb->buf[t & (RB_SIZE - 1)];
    atomic_store_explicit(&rb->tail, t + 1, memory_order_release);
    return true;
}
```

**How it works**
1. `head` and `tail` only ever increase; unsigned subtraction handles wrap-around.
2. Each side writes only its own counter → no lock needed.
3. Acquire/release ordering guarantees the consumer sees the byte before it sees the updated `head`.

**Think of it like this:** a conveyor belt with one loader and one unloader, each moving their own marker; neither ever touches the other's marker.

**Why it's optimal (for embedded):** O(1), no locks, no disabling interrupts, no division — this is what UART drivers use.

**Cost:** Time **O(1)**. Space **O(RB_SIZE)**.

## endianness

### Approach 1: Union-based detection (C only)
**The idea:** store `1` in a 32-bit integer and look at its first byte through a union.

```c
#include <stdint.h>

int is_little_endian_union(void) {
    union {
        uint32_t u;
        uint8_t b[4];
    } x = { .u = 1 };
    /* Little-endian stores the least significant byte (0x01) first. */
    return x.b[0] == 1;
}
```

**How it works:** a union lets two types share the same bytes. Reading a different member than you wrote is defined in C but **undefined in C++**.

**Think of it like this:** looking through a window at the first byte of the number.

**Cost:** Time **O(1)**. In C++, use `std::endian::native == std::endian::little` (C++20) instead.

### Approach 2: Byte swap with a loop, or the compiler builtin
**The idea:** peel bytes off one end and push them onto the other.

```c
#include <stdint.h>

uint32_t bswap32_loop(uint32_t x) {
    uint32_t r = 0;
    for (int i = 0; i < 4; i++) {
        r = (r << 8) | (x & 0xFFu);   /* move x's lowest byte into r */
        x >>= 8;                      /* next byte of x */
    }
    return r;
}

uint32_t bswap32_builtin(uint32_t x) {
#if defined(__GNUC__) || defined(__clang__)
    return __builtin_bswap32(x);      /* one REV (ARM) / BSWAP (x86) instruction */
#else
    return bswap32_loop(x);
#endif
}
```

**How it works:** like reversing a 4-digit number digit by digit, in base 256.

**Think of it like this:** unstacking four boxes and restacking them in reverse.

**Cost:** Time **O(1)**. C++23 also has `std::byteswap`.

### Optimal: memcpy detection + mask-and-shift swap + portable reader
**The idea:** inspect the first byte with `memcpy` (always well defined), swap bytes with shifts and masks, and parse network data with an explicit big-endian reader so the host's endianness never matters.

```c
#include <stdint.h>
#include <string.h>

int is_little_endian(void) {
    uint32_t x = 1;
    unsigned char first;
    memcpy(&first, &x, 1);            /* copy the first byte in memory: always legal */
    return first == 1;                /* 0x01 first → least significant byte first */
}

uint32_t bswap32(uint32_t x) {
    return  (x >> 24)                 /* byte 3 → byte 0 */
         | ((x >>  8) & 0x0000FF00u)  /* byte 2 → byte 1 */
         | ((x <<  8) & 0x00FF0000u)  /* byte 1 → byte 2 */
         |  (x << 24);                /* byte 0 → byte 3 */
}

/* Read a big-endian (network order) 32-bit value from a byte buffer.
   Works on any host and any alignment. */
uint32_t read_be32(const uint8_t *p) {
    return ((uint32_t)p[0] << 24)
         | ((uint32_t)p[1] << 16)
         | ((uint32_t)p[2] <<  8)
         |  (uint32_t)p[3];
}
```

**How it works**
1. Detection: little-endian stores `0x01` in the first byte.
2. Swap: each byte is shifted to its mirror position; masks drop the rest.
3. `read_be32` builds the value from bytes, so you never need to know the host's order.

**Think of it like this:** writing a date as DD/MM vs MM/DD — `read_be32` always reads the format the message was written in.

**Why it's the expected answer:** no undefined behaviour in C or C++, and the portable reader is how real protocol code is written.

**Cost:** Time **O(1)**. Space **O(1)**.

## reverse-words-in-a-string

### Approach 1: Split into words, join in reverse
**The idea:** `>>` on a string stream skips any amount of whitespace and reads one word at a time.

```cpp
class Solution {
public:
    string reverseWords(string s) {
        istringstream in(s);
        vector<string> words;
        string w;
        while (in >> w) {
            words.push_back(w);            // extra spaces are skipped automatically
        }
        string out;
        for (int i = (int)words.size() - 1; i >= 0; i--) {
            out += words[i];
            if (i > 0) {
                out += ' ';                // single space between words
            }
        }
        return out;
    }
};
```

**How it works:** tokenise, then output in reverse.

**Think of it like this:** cutting a sentence into word cards and laying them down backwards.

**Cost:** Time **O(n)**. Space **O(n)**.

### Approach 2: Manual tokenising with a stack
**The idea:** the same, without `stringstream`: collect characters into the current word; a space ends the word.

```cpp
class Solution {
public:
    string reverseWords(string s) {
        vector<string> stack;
        string cur;
        for (char c : s) {
            if (c == ' ') {
                if (!cur.empty()) {
                    stack.push_back(cur);  // a word just ended
                    cur.clear();
                }
            } else {
                cur += c;
            }
        }
        if (!cur.empty()) {
            stack.push_back(cur);          // the last word
        }

        string out;
        while (!stack.empty()) {
            out += stack.back();           // last word first
            stack.pop_back();
            if (!stack.empty()) {
                out += ' ';
            }
        }
        return out;
    }
};
```

**How it works:** a stack naturally reverses the order of words.

**Think of it like this:** stacking plates as you read them, then taking them off the top.

**Cost:** Time **O(n)**. Space **O(n)**. This is what you'd write in C.

### Optimal: In place — reverse everything, then reverse each word
**The idea:** reversing the whole string puts the words in the right order but spells each word backwards. Then reverse each word, compacting spaces as you go.

```cpp
class Solution {
public:
    string reverseWords(string s) {
        reverse(s.begin(), s.end());          // "the sky" → "yks eht"

        size_t w = 0;                          // write position
        size_t n = s.size();
        size_t i = 0;                          // read position
        while (i < n) {
            if (s[i] == ' ') {
                i++;                           // skip spaces
                continue;
            }
            if (w > 0) {
                s[w] = ' ';                    // exactly one space between words
                w++;
            }
            size_t start = w;
            while (i < n && s[i] != ' ') {
                s[w] = s[i];                   // copy the word to the write position
                w++;
                i++;
            }
            reverse(s.begin() + start, s.begin() + w);   // un-reverse this word
        }
        s.resize(w);                           // drop leftover characters
        return s;
    }
};
```

**How it works**
1. Reverse the whole string.
2. Read words, write them left-compacted with single spaces.
3. Reverse each word back.

**Think of it like this:** turning a sentence written on cards upside down (word order fixed, letters mirrored), then flipping each card.

**Why it's optimal:** O(n) time and O(1) extra space — the follow-up for C-style strings.

**Cost:** Time **O(n)**. Space **O(1)** extra.

## aligned-malloc

### Approach 1: Use the standard APIs
**The idea:** in real code, use what the platform provides.

```c
#include <stdlib.h>

void *aligned_alloc_std(size_t size, size_t align) {
    /* C11 aligned_alloc requires size to be a multiple of align: round it up. */
    size_t rounded = (size + align - 1) & ~(align - 1);
    return aligned_alloc(align, rounded);        /* release it with plain free() */
}
```

```cpp
#include <new>
#include <cstddef>

void* aligned_new(std::size_t size, std::size_t align) {
    return ::operator new(size, std::align_val_t{align});   // C++17; throws on failure
}

void aligned_delete(void* p, std::size_t align) {
    ::operator delete(p, std::align_val_t{align});
}
```

**How it works:** the library handles the bookkeeping. Others: POSIX `posix_memalign`, MSVC `_aligned_malloc`, and `alignas(64)` for static or stack objects.

**Think of it like this:** buying the right-sized box instead of cutting one down yourself.

**Cost:** Time and space depend on the allocator.

### Approach 2: Store a 1-byte offset instead of a full pointer
**The idea:** for alignments up to 256, store the distance back to the raw block in one byte just before the returned pointer.

```c
#include <stdint.h>
#include <stdlib.h>

void *aligned_malloc_small(size_t size, size_t align) {
    if (align == 0 || (align & (align - 1)) != 0 || align > 256) {
        return NULL;                       /* power of two up to 256 only */
    }
    unsigned char *raw = malloc(size + align);   /* align extra bytes: room for the offset */
    if (raw == NULL) {
        return NULL;
    }
    /* Round (raw + align) down to a multiple of align: the result is always > raw. */
    uintptr_t a = ((uintptr_t)raw + align) & ~(uintptr_t)(align - 1);
    unsigned char *p = (unsigned char *)a;
    p[-1] = (unsigned char)(p - raw - 1);  /* gap size 0..255 */
    return p;
}

void aligned_free_small(void *ptr) {
    if (ptr == NULL) {
        return;
    }
    unsigned char *p = ptr;
    free(p - p[-1] - 1);                   /* walk back to the original block */
}
```

**How it works:** the gap is at most `align − 1` bytes, so one byte can describe it.

**Think of it like this:** leaving a sticky note saying "the real start is 13 steps back".

**Cost:** Saves 7 bytes of overhead per allocation compared with storing a pointer — a classic embedded trade-off.

### Optimal: Over-allocate, round up, stash the original pointer
**The idea:** allocate `size + align − 1 + sizeof(void*)` bytes, round the address up to the alignment, and store the original pointer just before the returned block so `aligned_free` can find it.

```c
#include <stdint.h>
#include <stdlib.h>

void *aligned_malloc(size_t size, size_t align) {
    /* The rounding trick below only works for powers of two. */
    if (align == 0 || (align & (align - 1)) != 0) {
        return NULL;
    }
    /* Worst case we skip align-1 bytes, plus room to store one pointer. */
    size_t extra = align - 1 + sizeof(void *);
    void *raw = malloc(size + extra);
    if (raw == NULL) {
        return NULL;
    }
    /* Leave space for the pointer, then round UP to the next multiple of align. */
    uintptr_t start = (uintptr_t)raw + sizeof(void *);
    uintptr_t aligned = (start + (align - 1)) & ~(uintptr_t)(align - 1);

    /* Store the original pointer in the slot just before the aligned block. */
    ((void **)aligned)[-1] = raw;
    return (void *)aligned;
}

void aligned_free(void *p) {
    if (p != NULL) {
        free(((void **)p)[-1]);      /* fetch the original pointer and free that */
    }
}
```

**How it works**
1. Power-of-two check: `align & (align − 1)` is 0 only for powers of two.
2. Round up: `(x + align − 1) & ~(align − 1)`.
3. The slot before the block remembers what `malloc` returned.

**Think of it like this:** parking in a big space, moving forward to the nearest painted line, and leaving a note behind your car saying where the space really started.

**Why it's the expected answer:** shows pointer arithmetic, alignment math and ownership — the three things the question tests.

**Cost:** Time **O(1)**. Space **O(align + sizeof(void*))** overhead per allocation.

## debounce-button

### Approach 1: Counter (integrator) debounce
**The idea:** a counter moves up when the pin reads high and down when it reads low. The state only changes when the counter hits the top or the bottom.

```c
#include <stdbool.h>
#include <stdint.h>

typedef struct {
    uint8_t count;        /* 0 .. DEBOUNCE_TICKS */
    bool stable;          /* debounced state */
} integrator_t;

#define DEBOUNCE_TICKS 10u

/* Call every 1 ms with the raw pin level. Returns true on a press (rising edge). */
bool integrator_update(integrator_t *d, bool raw) {
    bool was = d->stable;
    if (raw) {
        if (d->count < DEBOUNCE_TICKS) {
            d->count++;
        }
    } else {
        if (d->count > 0) {
            d->count--;
        }
    }
    if (d->count == DEBOUNCE_TICKS) {
        d->stable = true;           /* held high long enough */
    } else if (d->count == 0) {
        d->stable = false;          /* held low long enough */
    }
    return d->stable && !was;       /* became pressed this tick */
}
```

**How it works:** occasional noise only nudges the counter a little; you get hysteresis for free.

**Think of it like this:** a bucket that fills when the button is pressed and drains when released; only a full or empty bucket changes the state.

**Cost:** Time **O(1)** per tick. Space **2 bytes**.

### Approach 2: Edge interrupt + lockout time
**The idea:** react to the first edge in an interrupt, then ignore further edges for 20 ms.

```c
#include <stdbool.h>
#include <stdint.h>

static volatile uint32_t g_ms;            /* incremented by a 1 ms SysTick interrupt */
static volatile uint32_t last_edge;
static volatile bool pressed_event;

/* GPIO falling-edge interrupt handler. */
void button_exti_isr(void) {
    uint32_t now = g_ms;
    /* Unsigned subtraction works even when g_ms wraps around. */
    if ((uint32_t)(now - last_edge) > 20u) {
        pressed_event = true;             /* first edge after a quiet period */
    }
    last_edge = now;
    /* clear the EXTI pending flag here */
}
```

**How it works:** bounces arrive within a few ms of each other, so they fall inside the lockout window.

**Think of it like this:** a doorbell that ignores repeated presses for a moment.

**Cost:** Lowest latency and the CPU can sleep, but a bouncing contact can fire many interrupts; many designs disable the interrupt in the ISR and re-enable it from a timer.

### Optimal: Shift-register debounce
**The idea:** every 1 ms, shift the raw reading into a 16-bit history. Only 16 identical readings in a row (all 1s or all 0s) change the stable state.

```c
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    uint16_t history;   /* last 16 samples, lowest bit = newest */
    bool     stable;    /* debounced state */
} debounce_t;

/* Call every 1 ms with the raw pin level. Returns true on a press edge. */
bool debounce_update(debounce_t *d, bool raw) {
    /* Shift the history left and put the newest sample in bit 0. */
    uint16_t sample = raw ? 1u : 0u;
    d->history = (uint16_t)((d->history << 1) | sample);

    bool was = d->stable;
    if (d->history == 0xFFFFu) {
        d->stable = true;         /* 16 ms solidly high */
    } else if (d->history == 0x0000u) {
        d->stable = false;        /* 16 ms solidly low */
    }
    /* Anything in between = still bouncing: keep the old state. */

    return d->stable && !was;     /* report only the moment it became pressed */
}
```

**How it works**
1. The history is a sliding window of the last 16 samples.
2. All ones → pressed; all zeros → released; anything else → no change.
3. Return true only on the transition to pressed.

**Think of it like this:** only believing the button after it has "said the same thing" 16 times in a row.

**Why it's the expected answer:** tiny (3 bytes), O(1), deterministic timing, easy to tune (window size = sample period × 16).

**Cost:** Time **O(1)** per tick. Space **3 bytes**.

## memory-pool

### Approach 1: Bitmap allocator
**The idea:** one bit per block: 1 = in use. Find the lowest 0 bit with a "count trailing zeros" instruction.

```c
#include <stdint.h>
#include <stddef.h>

#define BLOCK_SIZE 32u
#define NUM_BLOCKS 64u

static _Alignas(max_align_t) uint8_t storage[NUM_BLOCKS][BLOCK_SIZE];
static uint64_t used;                     /* bit i set = block i allocated */

void *bitmap_alloc(void) {
    if (used == UINT64_MAX) {
        return NULL;                      /* all 64 blocks are in use */
    }
    /* ~used has a 1 for every free block; ctz finds the lowest one. */
    unsigned i = (unsigned)__builtin_ctzll(~used);
    used |= 1ull << i;                    /* mark it used */
    return storage[i];
}

void bitmap_free(void *p) {
    /* Which block is p? Its byte offset divided by the block size. */
    size_t i = (size_t)((uint8_t *)p - &storage[0][0]) / BLOCK_SIZE;
    used &= ~(1ull << i);                 /* mark it free */
}
```

**How it works:** `__builtin_ctzll` is one CPU instruction on most targets.

**Think of it like this:** a row of 64 parking lights; a car takes the first dark space.

**Cost:** Time **O(1)**. Space **1 bit per block**. Bonus: you can detect double frees and list allocated blocks.

### Approach 2: Stack of free indices
**The idea:** keep the indices of free blocks in a separate array used as a stack.

```c
#include <stdint.h>

#define NUM_BLOCKS 64u
#define BLOCK_SIZE 32u

static _Alignas(8) uint8_t blocks[NUM_BLOCKS][BLOCK_SIZE];
static uint8_t free_idx[NUM_BLOCKS];      /* stack of free block numbers */
static uint8_t free_top;                  /* how many entries are on the stack */

void idxpool_init(void) {
    for (uint8_t i = 0; i < NUM_BLOCKS; i++) {
        free_idx[i] = (uint8_t)(NUM_BLOCKS - 1 - i);   /* block 0 ends up on top */
    }
    free_top = NUM_BLOCKS;
}

void *idxpool_alloc(void) {
    if (free_top == 0) {
        return (void *)0;                 /* pool exhausted */
    }
    free_top--;
    return blocks[free_idx[free_top]];    /* pop a free block number */
}

void idxpool_free(void *p) {
    uint8_t index = (uint8_t)(((uint8_t *)p - &blocks[0][0]) / BLOCK_SIZE);
    free_idx[free_top] = index;           /* push it back */
    free_top++;
}
```

**How it works:** bookkeeping lives outside the blocks, so freed blocks aren't overwritten.

**Think of it like this:** a stack of numbered tickets for free lockers.

**Cost:** Time **O(1)**. Space **1 byte per block** — helps when debugging use-after-free.

### Optimal: Intrusive free list
**The idea:** a free block isn't storing anything, so use its own bytes to hold a pointer to the next free block. Allocate = pop from the list; free = push onto it.

```c
#include <stddef.h>
#include <stdint.h>

#define BLOCK_SIZE  32u
#define NUM_BLOCKS  64u

/* A block is either a link in the free list or user data — never both at once. */
typedef union block {
    union block *next;                   /* used while the block is free */
    uint8_t data[BLOCK_SIZE];            /* used while the block is allocated */
} block_t;

static block_t pool[NUM_BLOCKS];         /* the union guarantees pointer alignment */
static block_t *free_list;               /* first free block, or NULL */

void pool_init(void) {
    /* Chain every block to the next one. */
    for (size_t i = 0; i < NUM_BLOCKS - 1; i++) {
        pool[i].next = &pool[i + 1];
    }
    pool[NUM_BLOCKS - 1].next = NULL;
    free_list = &pool[0];
}

void *pool_alloc(void) {
    block_t *b = free_list;
    if (b != NULL) {
        free_list = b->next;             /* pop the first free block */
    }
    return b;                            /* NULL when the pool is empty */
}

void pool_free(void *p) {
    if (p == NULL) {
        return;
    }
    block_t *b = p;
    b->next = free_list;                 /* push the block back on the front */
    free_list = b;
}
```

**How it works**
1. `pool_init` links all blocks into a list.
2. `pool_alloc` pops the head of the list.
3. `pool_free` pushes the block back.

**Think of it like this:** each empty locker holds a note with the number of the next empty locker.

**Why it's optimal:** O(1) alloc and free, **zero** metadata overhead, no fragmentation, deterministic timing — ideal for real-time systems.

**Cost:** Time **O(1)**. Space: no extra memory beyond the blocks.
