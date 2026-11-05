# C Essentials for Interviews

C is still the language of firmware, kernels, drivers and most embedded interviews. These are the topics that come up again and again.

## 1. The many meanings of `static`

```c
static int counter;            /* file scope: internal linkage — invisible to other .c files */

static void helper(void) { }   /* function with internal linkage */

int next_id(void) {
    static int id = 0;         /* block scope: static storage — keeps value between calls,
                                  initialised once, lives in .bss/.data, NOT on the stack */
    return ++id;
}
```

Interview favourite: "What does `static` do?" — answer all three cases (plus C++'s static members).

## 2. Storage classes & qualifiers

| Keyword | Meaning |
|---|---|
| `auto` | default for locals (C23 repurposes it for type inference) |
| `register` | hint to keep in a register; can't take its address |
| `static` | see above |
| `extern` | declaration of a variable/function defined elsewhere |
| `const` | read-only (not a compile-time constant in C before C23 `constexpr`) |
| `volatile` | every access must actually happen — for hardware & signal/ISR-shared variables |
| `restrict` | (C99) this pointer is the only way to access the object |
| `_Atomic` | (C11) atomic type |
| `_Thread_local` | (C11) per-thread storage |

## 3. `volatile` in depth

```c
#define STATUS_REG (*(volatile uint32_t *)0x40011000u)

while ((STATUS_REG & TX_READY) == 0) { }   /* without volatile, compiler may read once and loop forever */

volatile bool g_data_ready = false;        /* set in ISR, polled in main */
void UART_IRQHandler(void) { g_data_ready = true; }
```

When to use `volatile`:
1. Memory-mapped peripheral registers.
2. Variables modified by an ISR and read in main code (or vice versa).
3. Variables modified by `setjmp`/`longjmp` or signal handlers (`volatile sig_atomic_t`).

What `volatile` does **not** do: make operations atomic (`x++` is still read-modify-write), or order accesses relative to non-volatile memory, or provide inter-core synchronisation. Combine with critical sections or C11 atomics.

> **Interview:** "Can a variable be both `const` and `volatile`?" — Yes: a read-only hardware status register. `const` = *your code* won't write it; `volatile` = it can change underneath you.

## 4. Structs, unions, bit-fields

```c
typedef struct {
    uint8_t  id;
    uint32_t timestamp;     /* padding inserted before this for alignment */
    uint16_t value;
} sample_t;                 /* typically 12 bytes, not 7 */

/* Union: all members share storage; size = largest member */
typedef union {
    uint32_t word;
    uint8_t  bytes[4];      /* type punning via unions is allowed in C (not in C++) */
} word_t;

/* Bit-fields: compact flags */
struct ctrl {
    unsigned enable   : 1;
    unsigned mode     : 3;
    unsigned reserved : 4;
};
```

> **Warning:** Bit-field layout (bit order, padding, whether they straddle units) is **implementation-defined**. Don't use bit-fields to map hardware registers or wire formats portably — use masks and shifts.

**Flexible array member** (C99):

```c
typedef struct { size_t len; uint8_t data[]; } packet_t;
packet_t *p = malloc(sizeof *p + n);
p->len = n;
```

## 5. Strings

```c
char a[] = "hi";          /* array of 3 chars (incl. '\0'), writable */
const char *p = "hi";     /* pointer to a literal — modifying it is UB */
sizeof a;                 /* 3 */
strlen(a);                /* 2 */
```

Safe-ish handling: always know your buffer size; prefer `snprintf(buf, sizeof buf, ...)`; `strncpy` does **not** guarantee NUL-termination; check return values.

## 6. Dynamic memory

```c
int *arr = malloc(n * sizeof *arr);     /* sizeof *arr: robust if the type changes */
if (!arr) { /* handle */ }
int *z = calloc(n, sizeof *z);          /* zeroed; also checks n*size overflow */
int *tmp = realloc(arr, 2 * n * sizeof *arr);
if (!tmp) { free(arr); /* handle */ } else arr = tmp;   /* never `arr = realloc(arr, ...)` — leaks on failure */
free(arr); arr = NULL;                  /* avoid dangling */
```

Don't cast `malloc`'s result in C (it hides a missing `#include <stdlib.h>` in C89 and is noise). `free(NULL)` is a no-op.

## 7. Function pointers & callbacks

```c
typedef void (*event_cb)(void *ctx, int event);

typedef struct { event_cb cb; void *ctx; } listener_t;

void fire(listener_t *l, int ev) { if (l->cb) l->cb(l->ctx, ev); }

/* State machine via table of function pointers */
typedef enum { ST_IDLE, ST_RUN, ST_FAULT, ST_COUNT } state_t;
typedef state_t (*state_fn)(int input);
static state_t idle(int in)  { return in ? ST_RUN : ST_IDLE; }
static state_t run(int in)   { return in < 0 ? ST_FAULT : ST_RUN; }
static state_t fault(int in) { (void)in; return ST_FAULT; }
static const state_fn table[ST_COUNT] = { idle, run, fault };
state_t step(state_t s, int in) { return table[s](in); }
```

The `void *ctx` parameter is C's closure — it's how C APIs (qsort_r, pthread_create, RTOS task creation) pass user state.

## 8. Preprocessor

```c
#define SQUARE(x) ((x) * (x))           /* parenthesise everything */
SQUARE(i++);                            /* still evaluates i++ twice -> UB. Prefer static inline */

#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))   /* only works on real arrays */
#define STR(x) #x                       /* stringify */
#define CAT(a, b) a##b                  /* token paste */

#define LOG(fmt, ...) printf("[%s:%d] " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)

/* Multi-statement macro: wrap in do { } while (0) so it behaves like one statement */
#define SWAP(a, b) do { int _t = (a); (a) = (b); (b) = _t; } while (0)

#if defined(DEBUG) && DEBUG > 1
#  define TRACE(...) printf(__VA_ARGS__)
#else
#  define TRACE(...) ((void)0)
#endif
```

**X-macros** generate parallel tables:

```c
#define ERRORS(X) X(OK, "ok") X(TIMEOUT, "timeout") X(CRC, "crc error")
#define AS_ENUM(name, str) ERR_##name,
#define AS_STR(name, str) str,
typedef enum { ERRORS(AS_ENUM) ERR_COUNT } err_t;
static const char *const err_str[] = { ERRORS(AS_STR) };
```

## 9. Integer types & promotions

```c
#include <stdint.h>   /* uint8_t ... uint64_t, int32_t, uintptr_t */
#include <stddef.h>   /* size_t, ptrdiff_t, offsetof */
#include <stdbool.h>  /* bool (keyword in C23) */
#include <inttypes.h> /* PRIu32 etc. for printf */

uint8_t a = 200, b = 100;
uint8_t c = a + b;        /* 44: a and b promoted to int (300), then truncated */
if (a + b > 255) { }      /* true! comparison done in int */
unsigned u = 0; int i = -1;
if (i < u) { }            /* false: i converted to UINT_MAX */
printf("%" PRIu32 "\n", (uint32_t)x);
printf("%zu\n", sizeof x);
```

## 10. Undefined behaviour highlights in C

Signed overflow, out-of-bounds access, use after free, uninitialised reads, strict aliasing violations, shifting by ≥ width, modifying a string literal, `i = i++` (unsequenced), data races. See *Undefined Behavior*.

## 11. Modern C: C11 → C23

| Standard | Features |
|---|---|
| C99 | `//` comments, `stdint.h`, `bool`, `inline`, VLAs, designated initialisers, compound literals, `restrict`, flexible array members, mixed declarations |
| C11 | `_Static_assert`, `_Generic`, `_Atomic` & `<stdatomic.h>`, `<threads.h>`, `_Alignas/_Alignof`, anonymous structs/unions, `_Noreturn`; VLAs optional |
| C17 | bug-fix release |
| C23 | `nullptr`, `true/false/bool` keywords, `constexpr` objects, `typeof`, `auto` inference, `[[nodiscard]]`-style attributes, `#embed`, `<stdbit.h>`, checked arithmetic `<stdckdint.h>` (`ckd_add`), binary literals, digit separators `1'000`, `static_assert` keyword |

```c
/* Designated initialisers + compound literals (C99) */
uart_cfg_t cfg = { .baud = 115200, .parity = PARITY_NONE };
draw((point_t){ .x = 1, .y = 2 });

/* _Generic: type-based dispatch (C11) */
#define abs_any(x) _Generic((x), int: abs, long: labs, double: fabs)(x)

/* C23 */
#include <stdckdint.h>
int r; if (ckd_add(&r, a, b)) { /* overflow */ }
```

## Interview Q&A

- **Difference between `#include <x.h>` and `"x.h"`?** Angle brackets search system include paths; quotes search the current directory first.
- **What is `sizeof` evaluated at?** Compile time (except for VLAs). It's an operator, not a function.
- **What does `extern "C"` do?** (C++ side) disables name mangling so C and C++ can link.
- **Why `do { } while(0)` in macros?** Makes the macro a single statement that requires a trailing semicolon and works inside `if/else`.
- **What is `offsetof`?** Byte offset of a member within a struct — used for `container_of` in the Linux kernel.
- **Stack vs heap allocation of a 1 MB buffer on an MCU?** Neither, usually — a static buffer in `.bss` sized at link time.
