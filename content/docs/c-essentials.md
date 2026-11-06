# C Essentials for Interviews

> **Key idea:** C gives you the machine with a thin layer of syntax on top: memory is bytes, pointers are addresses, arrays are contiguous, and nothing cleans up after you. That's why it's still the language of firmware, kernels, drivers and most embedded interviews. C interviews probe whether you really understand **memory** (pointers, arrays, strings, structs and their layout, the heap), the **keywords with subtle meanings** (`static`, `const`, `volatile`, `extern`), **bit manipulation**, the **preprocessor**, and **undefined behaviour**. Every example here is plain C17, compiled with `-Wall -Wextra -fsanitize=address,undefined`.

**What you'll be able to do after this guide**
- Explain `static`, `extern`, `const` and `volatile` in every context, including `const` with pointers.
- Reason precisely about pointers vs arrays, decay, `sizeof`, pointer arithmetic and multi-dimensional arrays.
- Handle C strings safely and implement the classic string functions.
- Predict struct layout (padding, alignment, `offsetof`), and use unions, bit-fields, flexible array members and designated initialisers.
- Manage heap memory without leaks (`malloc`/`calloc`/`realloc` patterns, a growable array, the `goto cleanup` idiom).
- Write callbacks, function-pointer state machines and opaque handles.
- Use the preprocessor safely (`do { } while (0)`, X-macros, `_Generic`).
- Do bit manipulation fluently and avoid integer-promotion traps.

---

## 1. `static`: three meanings in C

```c
#include <assert.h>
#include <stdio.h>

static int g_module_counter = 0;      /* file scope: INTERNAL linkage -- invisible to other .c files */

static void bump(void) {              /* a function with internal linkage: a private helper */
    g_module_counter++;
}

int next_id(void) {
    static int id = 0;                /* block scope: STATIC STORAGE DURATION -- one instance,     */
    return ++id;                      /* initialised once (before main), keeps its value between   */
}                                     /* calls; lives in .data/.bss, not on the stack              */

/* C99: `static` inside an array parameter promises at least N elements. */
int sum4(const int values[static 4]) {
    return values[0] + values[1] + values[2] + values[3];
}

int main(void) {
    bump();
    bump();
    assert(g_module_counter == 2);

    assert(next_id() == 1);
    assert(next_id() == 2);
    assert(next_id() == 3);           /* the value persisted across calls */

    int data[4] = {1, 2, 3, 4};
    assert(sum4(data) == 10);
    printf("counter=%d next id=%d sum4=%d\n", g_module_counter, next_id(), sum4(data));
    return 0;
}
```

> **Interview:** "What does `static` do?" Cover every case. On a **global or function**, it gives internal linkage: the name is private to the file. On a **local variable**, it gives static storage duration: the variable persists across calls and is initialised once. In an **array parameter**, `[static N]` promises at least N elements. In C++ it also marks class members that are shared rather than per-object.

---

## 2. Storage duration, linkage and qualifiers

| Keyword | Meaning |
|---|---|
| `auto` | the (redundant) default for locals; C23 reuses it for type inference |
| `register` | a hint to keep the variable in a register; you can't take its address |
| `static` | see §1 |
| `extern` | declares a variable/function **defined elsewhere** (in another file) |
| `const` | read-only through this name. **Not** a compile-time constant in C (so `const int n = 5; int a[n];` is a VLA). Use `#define`/`enum`, or C23 `constexpr`. |
| `volatile` | every read and write must really happen, in program order: for hardware registers and ISR/signal-shared data |
| `restrict` (C99) | a promise that this pointer is the only way to reach the object, so the compiler may optimise more |
| `_Atomic` (C11) | atomic type (`<stdatomic.h>`) |
| `_Thread_local` (C11) | one instance per thread (`thread_local` in C23) |

| Storage duration | Created / destroyed | Where | Default value |
|---|---|---|---|
| automatic (locals) | entering / leaving the block | stack (or registers) | **indeterminate**: reading it is UB |
| static (globals, `static` locals) | before `main` / at exit | `.data` (initialised) or `.bss` (zero) | **zero** |
| allocated (`malloc`) | `malloc` / `free` | heap | indeterminate (`calloc`: zero) |
| thread | thread start / end | TLS | zero |

### 2.1 `const` and pointers: read right to left

```c
#include <assert.h>
#include <stdio.h>

int main(void) {
    int a = 1;
    int b = 2;

    const int *p1 = &a;        /* pointer to const int: can't modify *p1, can repoint p1 */
    p1 = &b;                   /* OK */
    /* *p1 = 5;                   error: assignment of read-only location */

    int *const p2 = &a;        /* const pointer to int: can modify *p2, can't repoint */
    *p2 = 10;                  /* OK */
    /* p2 = &b;                   error: assignment of read-only variable */

    const int *const p3 = &b;  /* neither */
    assert(*p1 == 2 && a == 10 && *p3 == 2);

    /* int const * is the same as const int * -- `const` applies to what's on its left,
       or to the right if nothing is on its left. */
    int const *same = &a;
    assert(*same == 10);

    printf("a=%d b=%d\n", a, b);
    return 0;
}
```

---

## 3. `volatile` in depth

```c
/* no-test (embedded: memory-mapped registers) */
#define UART1_SR   (*(volatile uint32_t *)0x40011000u)   /* status register */
#define UART1_DR   (*(volatile uint32_t *)0x40011004u)   /* data register   */
#define SR_TXE     (1u << 7)

void uart_putc(char c) {
    while ((UART1_SR & SR_TXE) == 0) { }   /* without volatile, the compiler may read SR once and spin forever */
    UART1_DR = (uint32_t)c;                /* without volatile, a write with no later read may be removed */
}

volatile bool g_rx_ready = false;          /* written in the ISR, polled in main */
void USART1_IRQHandler(void) { g_rx_ready = true; }
```

Use `volatile` for:
1. Memory-mapped peripheral registers.
2. Variables changed by an ISR and read by main code, or the reverse, on a single-core MCU.
3. Variables changed by signal handlers (`volatile sig_atomic_t`), and locals modified between `setjmp` and `longjmp`.

```c
#include <assert.h>
#include <signal.h>
#include <stdio.h>

static volatile sig_atomic_t g_signal_count = 0;   /* the only type you may portably write in a handler */

static void on_signal(int sig) {
    signal(sig, on_signal);                         /* re-arm: see the note below */
    g_signal_count++;                               /* keep handlers tiny: set a flag and return */
}

int main(void) {
    signal(SIGUSR1, on_signal);
    raise(SIGUSR1);                                 /* deliver the signal synchronously */
    raise(SIGUSR1);
    assert(g_signal_count == 2);
    printf("handled %d signals\n", (int)g_signal_count);
    return 0;
}
```

> **Pitfall (found while testing this example):** Compiled with `gcc -std=c17`, the first version (without the re-arm line) was **killed by the second `raise`**. In strict ISO mode, glibc's `signal()` uses System V semantics, which reset the handler to `SIG_DFL` after each delivery. With `-std=gnu17` it uses BSD semantics and keeps the handler. Portable C has to re-install the handler. POSIX code should use `sigaction()`, which states the semantics explicitly.

What `volatile` does **not** do:
- It doesn't make operations atomic. `g_count++` is still a load, an add and a store, and an ISR can fire in between.
- It doesn't order accesses relative to *non*-volatile memory.
- It provides no synchronisation between cores or threads. Use C11 `<stdatomic.h>`, critical sections, or RTOS primitives.

> **Interview:** "Can a variable be both `const` and `volatile`?" Yes. A read-only hardware status register is `const volatile uint32_t`: `const` means *your code* won't write it, and `volatile` means it can change underneath you.

---

## 4. Pointers and arrays

An array is **not** a pointer. In most expressions, though, an array **decays** to a pointer to its first element. The exceptions are `sizeof arr`, `&arr`, and a string literal used to initialise a char array.

```c
#include <assert.h>
#include <stddef.h>
#include <stdio.h>

#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))   /* only valid for real arrays, not pointers */

size_t size_in_function(int arr[10]) {   /* the parameter is really `int *arr`: the 10 is ignored */
    return sizeof arr;                   /* size of a POINTER (8 on 64-bit), not of the array */
}

int sum_matrix(int rows, int cols, int m[rows][cols]) {   /* C99 VLA parameter: dims passed first */
    int total = 0;
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            total += m[r][c];
        }
    }
    return total;
}

int main(void) {
    int arr[10] = {0};
    assert(sizeof arr == 10 * sizeof(int));        /* 40: the whole array */
    assert(ARRAY_SIZE(arr) == 10);
    assert(size_in_function(arr) == sizeof(int *)); /* decayed to a pointer */

    int *p = arr;                                  /* decay: p == &arr[0] */
    assert(p + 3 == &arr[3]);                      /* pointer arithmetic is in ELEMENTS, not bytes */
    assert(*(p + 3) == p[3] && p[3] == 3[p]);      /* a[i] is defined as *(a + i), so 3[p] works too */
    assert((char *)(p + 1) - (char *)p == sizeof(int));

    int (*whole)[10] = &arr;                       /* pointer to an array of 10 ints */
    assert((char *)(whole + 1) - (char *)whole == sizeof arr);   /* +1 skips the whole array */

    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};          /* row-major: m[1][0] follows m[0][2] in memory */
    assert(&m[1][0] == &m[0][2] + 1);
    assert(sum_matrix(2, 3, m) == 21);

    const char *names[] = {"ana", "bo", "cy"};     /* array of pointers (ragged) */
    assert(ARRAY_SIZE(names) == 3 && names[1][1] == 'o');

    ptrdiff_t distance = &arr[7] - &arr[2];        /* subtracting pointers into the same array */
    assert(distance == 5);

    printf("sizeof arr=%zu, in function=%zu, distance=%td\n",
           sizeof arr, size_in_function(arr), distance);
    return 0;
}
```

| Declaration | Read it as |
|---|---|
| `int *p[10]` | array of 10 pointers to int |
| `int (*p)[10]` | pointer to an array of 10 ints |
| `int *f(void)` | function returning a pointer to int |
| `int (*f)(void)` | pointer to a function returning int |
| `int (*fp[4])(int)` | array of 4 pointers to functions taking an int and returning an int |
| `char **argv` | pointer to a pointer to char (an array of strings) |

Use the "clockwise/spiral rule", or `cdecl.org`, to read complicated declarations. In real code, use a `typedef`.

> **Pitfall:** Pointer arithmetic is only defined within an array, plus one past its end. Comparing or subtracting pointers into *different* objects, or forming `arr + 11` for a 10-element array, is undefined behaviour even if you never dereference it.

---

## 5. Strings

A C string is a `char` array terminated by `'\0'`. The length is not stored anywhere, so every function walks the bytes looking for the terminator.

```c
#include <assert.h>
#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Classic implementations interviewers ask for. */
size_t my_strlen(const char *s) {
    const char *p = s;
    while (*p) {
        p++;
    }
    return (size_t)(p - s);
}

void reverse_in_place(char *s) {
    size_t n = strlen(s);
    if (n < 2) {
        return;
    }
    for (size_t i = 0, j = n - 1; i < j; ++i, --j) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
    }
}

/* Safe copy: always NUL-terminates, reports truncation (like BSD strlcpy). */
size_t safe_copy(char *dst, size_t dst_size, const char *src) {
    size_t len = strlen(src);
    if (dst_size > 0) {
        size_t n = len < dst_size - 1 ? len : dst_size - 1;
        memcpy(dst, src, n);
        dst[n] = '\0';
    }
    return len;                       /* >= dst_size means it was truncated */
}

/* atoi has no error reporting; strtol does. */
bool parse_int(const char *text, int *out) {
    char *end = NULL;
    errno = 0;
    long value = strtol(text, &end, 10);
    if (end == text || *end != '\0' || errno == ERANGE || value < INT_MIN || value > INT_MAX) {
        return false;
    }
    *out = (int)value;
    return true;
}

int main(void) {
    char a[] = "hello";               /* array of 6 chars, writable, initialised from the literal */
    const char *lit = "hello";        /* pointer to a string literal: writing through it is UB */
    assert(sizeof a == 6 && strlen(a) == 5 && my_strlen(lit) == 5);

    reverse_in_place(a);
    assert(strcmp(a, "olleh") == 0);  /* compare with strcmp, never with == (that compares addresses) */

    char small[4];
    size_t needed = safe_copy(small, sizeof small, "truncate me");
    assert(strcmp(small, "tru") == 0 && needed == 11);

    char buf[32];
    int written = snprintf(buf, sizeof buf, "%s-%d", "id", 42);   /* bounded; returns the full length */
    assert(written == 5 && strcmp(buf, "id-42") == 0);

    int n = 0;
    assert(parse_int("1234", &n) && n == 1234);
    assert(!parse_int("12ab", &n) && !parse_int("99999999999", &n) && !parse_int("", &n));

    /* Tokenising: strtok modifies its input and isn't reentrant; strtok_r / manual loops are safer. */
    char csv[] = "a,bb,,ccc";
    int fields = 0;
    for (char *tok = strtok(csv, ","); tok != NULL; tok = strtok(NULL, ",")) {
        fields++;                     /* note: strtok skips the empty field between ",," */
    }
    assert(fields == 3);

    assert(toupper((unsigned char)'q') == 'Q');   /* ctype functions need unsigned char values */
    printf("reversed=%s small=%s buf=%s fields=%d\n", a, small, buf, fields);
    return 0;
}
```

| Function | Pitfall |
|---|---|
| `gets` | removed in C11: no bounds at all. Use `fgets`. |
| `strcpy`, `strcat`, `sprintf` | no bounds. Use `snprintf`, or copies with explicit sizes. |
| `strncpy` | does **not** NUL-terminate if the source is too long, and it pads with zeros |
| `strncat(dst, src, n)` | `n` is the maximum to *append*, not the buffer size |
| `atoi`, `atof` | no error detection; UB on overflow. Use `strtol`/`strtod`. |
| `strtok` | modifies the input, keeps hidden static state, skips empty fields |
| `scanf("%s")` | unbounded. Use `%31s` with a 32-byte buffer, and check the return value. |
| `toupper(c)` with a negative `char` | UB. Cast to `unsigned char` first. |

---

## 6. Structs, padding, unions and bit-fields

```c
#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    uint8_t  id;          /* offset 0 */
                          /* 3 bytes padding so `timestamp` is 4-byte aligned */
    uint32_t timestamp;   /* offset 4 */
    uint16_t value;       /* offset 8 */
                          /* 2 bytes tail padding so arrays of sample_t keep alignment */
} sample_t;               /* 12 bytes, not 7 */

typedef struct {
    uint32_t timestamp;   /* largest first: no interior padding */
    uint16_t value;
    uint8_t  id;
} sample_packed_by_order_t;   /* 8 bytes */

/* Container_of (Linux kernel): get the enclosing struct from a pointer to one member. */
#define container_of(ptr, type, member) ((type *)((char *)(ptr) - offsetof(type, member)))

typedef struct list_node {
    struct list_node *next;
} list_node;

typedef struct {
    int priority;
    list_node node;       /* intrusive list hook */
} task_t;

/* Union: all members share storage; size = the largest member (plus alignment). */
typedef union {
    uint32_t word;
    uint8_t  bytes[4];
} word_t;

/* Tagged union: the C version of std::variant. */
typedef enum { SHAPE_CIRCLE, SHAPE_RECT } shape_kind;
typedef struct {
    shape_kind kind;
    union {
        struct { double r; } circle;
        struct { double w, h; } rect;
    };                    /* C11 anonymous union */
} shape_t;

double area(const shape_t *s) {
    switch (s->kind) {
        case SHAPE_CIRCLE: return 3.14159 * s->circle.r * s->circle.r;
        case SHAPE_RECT:   return s->rect.w * s->rect.h;
    }
    return 0.0;
}

/* Bit-fields: compact flags (layout is implementation-defined -- don't map hardware with them). */
struct flags {
    unsigned enabled : 1;
    unsigned mode    : 3;   /* 0..7 */
    unsigned error   : 1;
};

int main(void) {
    assert(sizeof(sample_t) == 12);
    assert(offsetof(sample_t, timestamp) == 4 && offsetof(sample_t, value) == 8);
    assert(sizeof(sample_packed_by_order_t) == 8);

    task_t t = {.priority = 5, .node = {NULL}};
    list_node *hook = &t.node;
    task_t *owner = container_of(hook, task_t, node);
    assert(owner == &t && owner->priority == 5);

    word_t w = {.word = 0x11223344u};
    int little_endian = (w.bytes[0] == 0x44);     /* union punning is allowed in C (not in C++) */

    shape_t shapes[] = {
        {.kind = SHAPE_CIRCLE, .circle = {.r = 1.0}},       /* designated initialisers (C99) */
        {.kind = SHAPE_RECT, .rect = {.w = 2.0, .h = 3.0}},
    };
    assert(area(&shapes[1]) == 6.0);

    struct flags f = {.enabled = 1, .mode = 5};
    f.mode = (unsigned)(f.mode + 3) & 7u;          /* store wraps within 3 bits */
    assert(f.enabled == 1 && f.mode == 0 && f.error == 0);

    /* Struct assignment copies all bytes; comparison must be done field by field
       (memcmp can see different padding bytes). */
    sample_t s1 = {.id = 1, .timestamp = 100, .value = 7};
    sample_t s2 = s1;
    assert(s2.timestamp == 100);

    /* Compound literal (C99): an unnamed object created in place. */
    const sample_t *tmp = &(sample_t){.id = 9};
    assert(tmp->id == 9 && tmp->value == 0);      /* unnamed members are zero-initialised */

    printf("sizeof(sample_t)=%zu reordered=%zu little_endian=%d area=%.1f\n",
           sizeof(sample_t), sizeof(sample_packed_by_order_t), little_endian, area(&shapes[0]));
    return 0;
}
```

| Rule | Detail |
|---|---|
| Each member is aligned to its own alignment | usually its size for scalars: `uint32_t` → 4, `double` → 8 (4 on some 32-bit ABIs) |
| A struct is aligned to its strictest member | and its size is rounded up to a multiple of that |
| Members stay in declaration order | the compiler may not reorder them; order them largest first to minimise padding |
| `__attribute__((packed))` / `#pragma pack(1)` | removes padding, but misaligned access is slow or **faults** on some CPUs (Cortex-M0), and taking `&packed.member` is dangerous |
| Wire formats and registers | serialise byte by byte with shifts, or `memcpy` into a packed buffer; never send a struct's raw bytes between different compilers or CPUs |

### 6.1 Flexible array members

```c
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    size_t  len;
    uint8_t data[];          /* C99 flexible array member: must be last; contributes 0 to sizeof */
} packet_t;

packet_t *packet_create(const uint8_t *payload, size_t len) {
    packet_t *p = malloc(sizeof *p + len);   /* one allocation for header + payload */
    if (p == NULL) {
        return NULL;
    }
    p->len = len;
    memcpy(p->data, payload, len);
    return p;
}

int main(void) {
    const uint8_t bytes[] = {0xDE, 0xAD, 0xBE, 0xEF};
    packet_t *p = packet_create(bytes, sizeof bytes);
    assert(p != NULL && p->len == 4 && p->data[3] == 0xEF);
    printf("sizeof(packet_t)=%zu, payload=%zu bytes\n", sizeof(packet_t), p->len);
    free(p);                                  /* one free for the whole thing */
    return 0;
}
```

---

## 7. Dynamic memory

```c
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* A growable array ("vector in C"): the most-asked C data structure after linked lists. */
typedef struct {
    int    *data;
    size_t  size;
    size_t  capacity;
} int_vec;

int vec_push(int_vec *v, int value) {
    if (v->size == v->capacity) {
        size_t new_cap = v->capacity ? v->capacity * 2 : 4;
        if (new_cap > SIZE_MAX / sizeof *v->data) {
            return -1;                                     /* the multiplication would overflow */
        }
        int *tmp = realloc(v->data, new_cap * sizeof *v->data);
        if (tmp == NULL) {
            return -1;                                     /* v->data is still valid and owned by v */
        }
        v->data = tmp;
        v->capacity = new_cap;
    }
    v->data[v->size++] = value;
    return 0;
}

void vec_free(int_vec *v) {
    free(v->data);                                         /* free(NULL) is a no-op */
    v->data = NULL;                                        /* defensive: no dangling pointer */
    v->size = v->capacity = 0;
}

int main(void) {
    size_t n = 5;
    int *arr = malloc(n * sizeof *arr);    /* sizeof *arr: stays correct if the type changes */
    if (arr == NULL) {
        return 1;
    }
    for (size_t i = 0; i < n; ++i) {
        arr[i] = (int)i;                   /* malloc'd memory is uninitialised: write before reading */
    }

    int *zeros = calloc(n, sizeof *zeros); /* zero-filled; also checks n * size for overflow */
    assert(zeros != NULL && zeros[4] == 0);

    /* realloc pattern: NEVER `arr = realloc(arr, ...)` -- on failure that leaks the old block. */
    int *bigger = realloc(arr, 2 * n * sizeof *arr);
    if (bigger == NULL) {
        free(arr);
        free(zeros);
        return 1;
    }
    arr = bigger;                          /* the old contents were preserved */
    assert(arr[4] == 4);

    free(arr);
    free(zeros);

    int_vec v = {0};
    for (int i = 0; i < 100; ++i) {
        if (vec_push(&v, i * i) != 0) {
            vec_free(&v);
            return 1;
        }
    }
    assert(v.size == 100 && v.data[99] == 9801 && v.capacity == 128);
    printf("vector: size=%zu capacity=%zu last=%d\n", v.size, v.capacity, v.data[v.size - 1]);
    vec_free(&v);
    return 0;
}
```

| Bug | Symptom | Tool |
|---|---|---|
| leak (no `free`) | memory grows | ASan/LeakSanitizer, Valgrind |
| use after `free` | random corruption, crash later | ASan |
| double `free` | heap corruption, abort | ASan, glibc's "double free detected" |
| buffer overflow (`malloc(strlen(s))`, forgetting the `+1` for the `'\0'`) | overwrites the heap metadata | ASan |
| freeing a non-heap pointer, or `free(p + 1)` | crash | ASan |
| `n * size` overflow in `malloc` | a tiny buffer, then an overflow | use `calloc`, or check `n > SIZE_MAX / size` |

> **Tip:** Don't cast `malloc`'s return value in C. `void *` converts implicitly, and the cast can hide a missing `#include <stdlib.h>` in C89. In embedded code, avoid the heap entirely after start-up: allocate static pools or arrays sized at compile time, because fragmentation and non-deterministic timing are real problems.

### 7.1 Error handling with `goto cleanup`

C has no destructors, so the idiomatic way to release several resources on every error path is a single exit label:

```c
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Returns 0 on success, a negative code on failure; frees everything on every path. */
int copy_upper(const char *text, char **out) {
    int rc = -1;
    char *buf = NULL;
    char *scratch = NULL;

    size_t len = strlen(text);
    buf = malloc(len + 1);
    if (buf == NULL) {
        goto cleanup;
    }
    scratch = malloc(len + 1);
    if (scratch == NULL) {
        goto cleanup;
    }
    for (size_t i = 0; i <= len; ++i) {
        char c = text[i];
        scratch[i] = (c >= 'a' && c <= 'z') ? (char)(c - 'a' + 'A') : c;
    }
    memcpy(buf, scratch, len + 1);
    *out = buf;
    buf = NULL;                 /* ownership transferred to the caller */
    rc = 0;

cleanup:
    free(scratch);              /* free(NULL) is fine, so no extra checks needed */
    free(buf);
    return rc;
}

int main(void) {
    char *result = NULL;
    assert(copy_upper("hello, c", &result) == 0);
    assert(strcmp(result, "HELLO, C") == 0);
    printf("%s\n", result);
    free(result);
    return 0;
}
```

The Linux kernel uses this pattern everywhere, with labels like `err_free_buf:` unwinding in reverse order of acquisition.

---

## 8. Function pointers, callbacks and opaque handles

```c
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

/* 1. Callbacks with a context pointer: C's closures. */
typedef void (*event_cb)(void *ctx, int event);

typedef struct {
    event_cb cb;
    void *ctx;
} listener_t;

static void fire(const listener_t *l, int ev) {
    if (l->cb != NULL) {
        l->cb(l->ctx, ev);
    }
}

static void count_events(void *ctx, int event) {
    int *total = ctx;                   /* the callback knows what ctx really is */
    *total += event;
}

/* 2. qsort with a comparator. */
static int compare_desc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (y > x) - (y < x);           /* never `return y - x;` -- it can overflow */
}

/* 3. A table-driven state machine. */
typedef enum { ST_IDLE, ST_RUN, ST_FAULT, ST_COUNT } state_t;
typedef state_t (*state_fn)(int input);

static state_t on_idle(int in)  { return in > 0 ? ST_RUN : ST_IDLE; }
static state_t on_run(int in)   { return in < 0 ? ST_FAULT : ST_RUN; }
static state_t on_fault(int in) { return in == 0 ? ST_IDLE : ST_FAULT; }   /* 0 = reset */

static const state_fn kTransitions[ST_COUNT] = {
    [ST_IDLE] = on_idle,                /* designated array initialisers keep the table in sync */
    [ST_RUN] = on_run,
    [ST_FAULT] = on_fault,
};

static state_t step(state_t s, int input) {
    return kTransitions[s](input);
}

int main(void) {
    int total = 0;
    listener_t l = {.cb = count_events, .ctx = &total};
    fire(&l, 3);
    fire(&l, 4);
    assert(total == 7);

    int values[] = {3, 9, 1, 7};
    qsort(values, 4, sizeof values[0], compare_desc);
    assert(values[0] == 9 && values[3] == 1);

    state_t s = ST_IDLE;
    int inputs[] = {0, 1, 5, -1, 3, 0};
    for (size_t i = 0; i < sizeof inputs / sizeof inputs[0]; ++i) {
        s = step(s, inputs[i]);
    }
    assert(s == ST_IDLE);               /* idle -> run -> fault -> reset to idle */

    printf("events total=%d sorted first=%d final state=%d\n", total, values[0], (int)s);
    return 0;
}
```

The **opaque handle** pattern gives C encapsulation and a stable ABI. The header only *declares* the struct, so users can hold pointers to it but can't see or touch its members:

```c
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

/* ---- ring.h (public) ---- */
typedef struct ring ring;                  /* incomplete type: layout hidden from users */
ring *ring_create(size_t capacity);
void  ring_destroy(ring *r);
int   ring_push(ring *r, int value);       /* 0 on success, -1 if full */
int   ring_pop(ring *r, int *out);         /* 0 on success, -1 if empty */

/* ---- ring.c (private) ---- */
struct ring {
    size_t head;
    size_t count;
    size_t capacity;
    int    data[];                         /* flexible array member */
};

ring *ring_create(size_t capacity) {
    ring *r = malloc(sizeof *r + capacity * sizeof r->data[0]);
    if (r != NULL) {
        r->head = 0;
        r->count = 0;
        r->capacity = capacity;
    }
    return r;
}

void ring_destroy(ring *r) {
    free(r);
}

int ring_push(ring *r, int value) {
    if (r->count == r->capacity) {
        return -1;
    }
    r->data[(r->head + r->count) % r->capacity] = value;
    r->count++;
    return 0;
}

int ring_pop(ring *r, int *out) {
    if (r->count == 0) {
        return -1;
    }
    *out = r->data[r->head];
    r->head = (r->head + 1) % r->capacity;
    r->count--;
    return 0;
}

/* ---- main.c (user) ---- */
int main(void) {
    ring *r = ring_create(2);
    assert(r != NULL);
    assert(ring_push(r, 1) == 0 && ring_push(r, 2) == 0 && ring_push(r, 3) == -1);
    int v = 0;
    assert(ring_pop(r, &v) == 0 && v == 1);
    /* r->count = 0;   error in main.c: dereferencing pointer to incomplete type */
    ring_destroy(r);
    printf("opaque ring buffer works; first value popped = %d\n", v);
    return 0;
}
```

`FILE *` in `<stdio.h>` works exactly like this. So do many driver and SDK APIs.

---

## 9. A singly linked list: the classic C exercise

```c
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

typedef struct node {
    int value;
    struct node *next;
} node;

/* Pointer-to-pointer insertion: no special case for the head. */
int push_front(node **head, int value) {
    node *n = malloc(sizeof *n);
    if (n == NULL) {
        return -1;
    }
    n->value = value;
    n->next = *head;
    *head = n;
    return 0;
}

/* Remove the first node with `value`, using the "pointer to the link" technique (Linus's "good taste"). */
void remove_value(node **head, int value) {
    for (node **link = head; *link != NULL; link = &(*link)->next) {
        if ((*link)->value == value) {
            node *dead = *link;
            *link = dead->next;          /* works for the head and for middle nodes alike */
            free(dead);
            return;
        }
    }
}

node *reverse(node *head) {
    node *prev = NULL;
    while (head != NULL) {
        node *next = head->next;         /* save */
        head->next = prev;               /* flip */
        prev = head;                     /* advance */
        head = next;
    }
    return prev;
}

void free_list(node *head) {
    while (head != NULL) {
        node *next = head->next;         /* read next BEFORE freeing */
        free(head);
        head = next;
    }
}

int main(void) {
    node *list = NULL;
    for (int i = 1; i <= 4; ++i) {
        assert(push_front(&list, i) == 0);          /* 4 3 2 1 */
    }
    remove_value(&list, 4);                         /* remove the head: 3 2 1 */
    remove_value(&list, 2);                         /* remove a middle node: 3 1 */
    list = reverse(list);                           /* 1 3 */
    assert(list->value == 1 && list->next->value == 3 && list->next->next == NULL);

    for (node *n = list; n != NULL; n = n->next) {
        printf("%d ", n->value);
    }
    printf("\n");
    free_list(list);
    return 0;
}
```

---

## 10. The preprocessor

```c
#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SQUARE(x) ((x) * (x))          /* parenthesise every parameter and the whole body */
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define STR(x) #x                      /* stringify */
#define XSTR(x) STR(x)                 /* expand first, then stringify */
#define CAT(a, b) a##b                 /* token pasting */
#define LOG(fmt, ...) printf("[%s:%d] " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)

/* Multi-statement macro: do { } while (0) makes it a single statement that needs a ';'. */
#define SWAP_INT(a, b) do { int swap_tmp_ = (a); (a) = (b); (b) = swap_tmp_; } while (0)

/* X-macros: one list generates the enum AND the matching string table. */
#define ERROR_LIST(X)           \
    X(OK,       "ok")           \
    X(TIMEOUT,  "timeout")      \
    X(CRC,      "crc error")
#define AS_ENUM(name, text) ERR_##name,
#define AS_TEXT(name, text) text,
typedef enum { ERROR_LIST(AS_ENUM) ERR_COUNT } err_t;
static const char *const kErrorText[ERR_COUNT] = { ERROR_LIST(AS_TEXT) };

/* _Generic (C11): compile-time dispatch on the type of an expression. */
#define abs_any(x) _Generic((x), int: abs, long: labs, double: fabs)(x)
#define type_name(x) _Generic((x), int: "int", double: "double", char *: "char *", default: "other")

static inline int square_fn(int x) {   /* prefer static inline functions where possible */
    return x * x;
}

int main(void) {
    int i = 3;
    assert(SQUARE(i + 1) == 16);       /* with ((x)*(x)); a naive x*x would give 3+1*3+1 = 7 */
    assert(MAX(2, 7) == 7);
    /* SQUARE(i++) would evaluate i++ twice: unsequenced modification = UB. square_fn(i++) is fine. */
    assert(square_fn(i++) == 9 && i == 4);

    int CAT(sensor, 1) = 42;           /* declares sensor1 */
    assert(sensor1 == 42);
    assert(strcmp(XSTR(ERR_COUNT), "ERR_COUNT") == 0);

    int a = 1;
    int b = 2;
    if (a < b)
        SWAP_INT(a, b);                /* safe even without braces, thanks to do/while(0) */
    else
        a = 0;
    assert(a == 2 && b == 1);

    assert(ERR_COUNT == 3 && strcmp(kErrorText[ERR_CRC], "crc error") == 0);
    assert(abs_any(-5) == 5 && abs_any(-2.5) == 2.5);
    assert(strcmp(type_name(1.0), "double") == 0);

    LOG("%d errors defined", (int)ERR_COUNT);
    return 0;
}
```

| Pitfall | Example | Fix |
|---|---|---|
| missing parentheses | `#define DOUBLE(x) x + x` → `3 * DOUBLE(2)` gives 8 | `((x) + (x))` |
| double evaluation | `MAX(i++, j)` | `static inline` functions |
| multi-statement macro breaks `if/else` | `#define F() a(); b()` | `do { ... } while (0)` |
| name capture | a temporary inside the macro shadows the caller's variable | unusual names (`swap_tmp_`), or functions |
| `#` doesn't expand its argument | `STR(VERSION)` → `"VERSION"` | the two-level `XSTR` |

---

## 11. Integers, promotions and bit manipulation

### 11.1 Integer promotion and conversions

```c
#include <assert.h>
#include <inttypes.h>
#include <limits.h>
#include <stdint.h>
#include <stdio.h>

int main(void) {
    uint8_t a = 200;
    uint8_t b = 100;
    uint8_t c = (uint8_t)(a + b);      /* a and b are promoted to int: 300, then truncated to 44 */
    assert(c == 44);
    assert(a + b > 255);               /* the comparison happens in int: true */

    unsigned u = 1;
    int i = -1;
    assert(i < (int)u);                /* compared as ints: -1 < 1 */
    assert((unsigned)i > u);           /* in a mixed comparison, -1 converts to UINT_MAX
                                          (-Wsign-compare warns about `i < u`) */

    uint16_t x = 0xFFFF;
    uint32_t wide = (uint32_t)x * x;   /* cast first: x * x would be int * int = overflow (UB) */
    assert(wide == 0xFFFE0001u);

    int64_t big = INT64_C(1) << 40;    /* use the right-width constant: 1 << 40 overflows int */
    printf("c=%u wide=%" PRIu32 " big=%" PRId64 " sizeof(long)=%zu\n",
           (unsigned)c, wide, big, sizeof(long));
    return 0;
}
```

The rules in short:
1. **Integer promotion.** Anything smaller than `int` (`char`, `short`, `uint8_t`, `uint16_t`, bit-fields) is converted to `int` before arithmetic.
2. **Usual arithmetic conversions.** When signed and unsigned types of the same rank meet, the signed operand is converted to **unsigned**.
3. Signed overflow is UB. Unsigned arithmetic wraps modulo 2ⁿ.
4. Use `<stdint.h>` fixed-width types for hardware and protocols, `size_t` for sizes and indices, and the `PRIu32`/`%zu` format macros.

### 11.2 Bit manipulation — the embedded interview staple

```c
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

#define BIT(n)            (1u << (n))
#define SET_BIT(r, n)     ((r) |= BIT(n))
#define CLEAR_BIT(r, n)   ((r) &= ~BIT(n))
#define TOGGLE_BIT(r, n)  ((r) ^= BIT(n))
#define TEST_BIT(r, n)    (((r) >> (n)) & 1u)

/* Write a multi-bit field: clear it with a mask, then OR in the shifted value. */
static uint32_t set_field(uint32_t reg, unsigned shift, unsigned width, uint32_t value) {
    uint32_t mask = ((width < 32 ? (1u << width) : 0u) - 1u) << shift;
    return (reg & ~mask) | ((value << shift) & mask);
}

static unsigned popcount_kernighan(uint32_t x) {   /* each step clears the lowest set bit */
    unsigned count = 0;
    while (x != 0) {
        x &= x - 1;
        count++;
    }
    return count;
}

static bool is_power_of_two(uint32_t x) {
    return x != 0 && (x & (x - 1)) == 0;
}

static uint32_t next_power_of_two(uint32_t x) {    /* for x >= 1 and x <= 2^31 */
    x--;
    x |= x >> 1;
    x |= x >> 2;
    x |= x >> 4;
    x |= x >> 8;
    x |= x >> 16;
    return x + 1;
}

static uint32_t swap_bytes32(uint32_t x) {         /* endianness conversion */
    return ((x & 0x000000FFu) << 24) | ((x & 0x0000FF00u) << 8) |
           ((x & 0x00FF0000u) >> 8)  | ((x & 0xFF000000u) >> 24);
}

static uint8_t reverse_bits8(uint8_t b) {
    b = (uint8_t)(((b & 0xF0u) >> 4) | ((b & 0x0Fu) << 4));
    b = (uint8_t)(((b & 0xCCu) >> 2) | ((b & 0x33u) << 2));
    b = (uint8_t)(((b & 0xAAu) >> 1) | ((b & 0x55u) << 1));
    return b;
}

static bool is_little_endian(void) {
    uint16_t probe = 1;
    return *(const uint8_t *)&probe == 1;          /* reading via unsigned char is always allowed */
}

int main(void) {
    uint32_t reg = 0;
    SET_BIT(reg, 3);
    SET_BIT(reg, 0);
    assert(reg == 0x9);
    CLEAR_BIT(reg, 0);
    TOGGLE_BIT(reg, 4);
    assert(reg == 0x18 && TEST_BIT(reg, 4) == 1 && TEST_BIT(reg, 0) == 0);

    reg = set_field(0xFFFFFFFFu, 4, 3, 0x2);       /* bits [6:4] = 0b010 */
    assert(reg == 0xFFFFFFAFu);

    assert(popcount_kernighan(0xF0F0u) == 8);
    assert(is_power_of_two(64) && !is_power_of_two(96) && !is_power_of_two(0));
    assert(next_power_of_two(17) == 32 && next_power_of_two(32) == 32);
    assert(swap_bytes32(0x11223344u) == 0x44332211u);
    assert(reverse_bits8(0x01) == 0x80 && reverse_bits8(0xB0) == 0x0D);

    uint32_t lowest = 0x68u & (0u - 0x68u);         /* isolate the lowest set bit: x & -x */
    assert(lowest == 0x8);

    printf("reg=0x%08X popcount(0xF0F0)=%u little_endian=%d\n",
           (unsigned)reg, popcount_kernighan(0xF0F0u), is_little_endian());
    return 0;
}
```

> **Pitfall:** `1 << 31` on a 32-bit `int` is UB in C, because it overflows the signed type. Always shift unsigned values (`1u << 31`, `UINT32_C(1) << 31`). Shifting by the width or more (`x << 32` for a 32-bit `x`) is UB even for unsigned types.

---

## 12. Undefined behaviour highlights in C

The *Undefined Behavior* guide covers these in depth. The usual suspects in C code:
- Signed overflow, and shifts that are too large or negative.
- Out-of-bounds access; pointer arithmetic outside an array.
- Use after `free`, double `free`, freeing a non-heap pointer.
- Reading uninitialised locals or `malloc`'d memory.
- Strict aliasing violations, e.g. `*(float *)&some_int`. Use `memcpy`; union punning is fine in C.
- Modifying a string literal.
- `i = i++`, and `a[i] = i++`: unsequenced modifications.
- Data races between threads, or with an ISR.
- A missing `return` in a non-void function whose value is used.
- `memcpy` with overlapping ranges (use `memmove`); passing `NULL` to `memcpy` even with size 0 (fixed in C2y).

---

## 13. Modern C: C99 → C23

| Standard | Features |
|---|---|
| C99 | `//` comments, `<stdint.h>`, `bool`, `inline`, VLAs, designated initialisers, compound literals, `restrict`, flexible array members, mixed declarations and code, `snprintf`, `long long` |
| C11 | `_Static_assert`, `_Generic`, `_Atomic` & `<stdatomic.h>`, `<threads.h>`, `_Alignas`/`_Alignof`, anonymous structs/unions, `_Noreturn`, `gets` removed; VLAs made optional |
| C17 | a bug-fix release |
| C23 | `nullptr`, `true`/`false`/`bool` as keywords, `constexpr` objects, `typeof`, `auto` inference, `[[nodiscard]]`/`[[maybe_unused]]`/`[[deprecated]]`, `#embed`, `<stdbit.h>`, checked arithmetic `<stdckdint.h>`, binary literals `0b1010`, digit separators `1'000'000`, `static_assert` keyword, `= {}` empty initialiser, `unreachable()` |

```c
/* no-test (C23: needs GCC 14+ / Clang 18+ with -std=c23) */
#include <stdckdint.h>
#include <stdbit.h>

constexpr int kBufferSize = 256;                 /* a real compile-time constant */
static_assert(kBufferSize % 64 == 0);

[[nodiscard]] int read_sensor(int *out);

int add_checked(int a, int b, int *out) {
    return ckd_add(out, a, b) ? -1 : 0;          /* true if the result overflowed */
}

typeof(kBufferSize) copy = kBufferSize;
auto ones = stdc_count_ones(0xF0u);              /* popcount, portable */
int *p = nullptr;
```

---

## 14. Interview checklist

- [ ] `static` (three meanings in C), `extern`, storage durations and default values.
- [ ] `const` with pointers (`const int *`, `int *const`); `const` isn't a constant expression in C.
- [ ] `volatile`: when it's required, what it doesn't do, `const volatile`.
- [ ] Arrays vs pointers: decay, `sizeof` in functions, pointer arithmetic, 2D arrays, reading declarations.
- [ ] Strings: the terminator, dangerous functions, `snprintf`, `strtol`; implement `strlen`/reverse/`atoi`.
- [ ] Struct padding and `offsetof`; reorder to shrink; packed structs' costs; unions and tagged unions; bit-fields' portability.
- [ ] Heap: `malloc`/`calloc`/`realloc` patterns, overflow checks, leaks/double free; `goto cleanup`.
- [ ] Function pointers, `qsort`, state tables, opaque handles.
- [ ] Linked list: insert, delete with `node **`, reverse, free.
- [ ] Macros: parenthesisation, `do { } while (0)`, `#`/`##`, X-macros, `_Generic`.
- [ ] Integer promotions and signed/unsigned conversions; bit tricks; endianness.

---

## Practice

1. What does this print on a typical 64-bit Linux system, and why? `char s[] = "abc"; char *p = s; printf("%zu %zu %zu", sizeof s, sizeof p, strlen(p));`
2. Implement `void *my_memmove(void *dst, const void *src, size_t n)` that handles overlapping regions.
3. Write a macro or function that rounds `x` up to the next multiple of a power-of-two alignment `a` (as used for buffer alignment), without division.
4. Find all the bugs: `char *dup(const char *s) { char *d = malloc(strlen(s)); strcpy(d, s); return d; }`
5. Reorder `struct { char a; double b; char c; int d; }` to minimise its size on x86-64, and give both sizes.

:::details Show solution
1. `4 8 3`. `sizeof s` is the array: 3 characters plus the terminator. `sizeof p` is the size of a pointer, 8 on 64-bit. `strlen` counts characters up to the `'\0'`.
2.
```c
#include <assert.h>
#include <stddef.h>
#include <string.h>

void *my_memmove(void *dst, const void *src, size_t n) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    if (d == s || n == 0) {
        return dst;
    }
    if (d < s) {
        for (size_t i = 0; i < n; ++i) {      /* copy forwards: safe when dst is before src */
            d[i] = s[i];
        }
    } else {
        for (size_t i = n; i-- > 0;) {        /* copy backwards: safe when dst is after src */
            d[i] = s[i];
        }
    }
    return dst;
}

int main(void) {
    char buf[] = "abcdef";
    my_memmove(buf + 2, buf, 4);              /* overlapping, dst after src */
    assert(strcmp(buf, "ababcd") == 0);
    char buf2[] = "abcdef";
    my_memmove(buf2, buf2 + 2, 4);            /* overlapping, dst before src */
    assert(strcmp(buf2, "cdefef") == 0);
    return 0;
}
```
   Strictly, comparing pointers into different objects with `<` is unspecified. Real implementations compare addresses as integers (`uintptr_t`), which is fine on flat-memory systems.
3.
```c
#include <assert.h>
#include <stdint.h>

#define ALIGN_UP(x, a) (((x) + ((a) - 1)) & ~((a) - 1))   /* a must be a power of two */

static inline uintptr_t align_up(uintptr_t x, uintptr_t a) {
    return (x + (a - 1)) & ~(a - 1);
}

int main(void) {
    assert(ALIGN_UP(13u, 8u) == 16u && ALIGN_UP(16u, 8u) == 16u && ALIGN_UP(0u, 4u) == 0u);
    assert(align_up(1, 64) == 64 && align_up(65, 64) == 128);
    return 0;
}
```
4. There are three bugs. (a) `malloc(strlen(s))` has no room for the `'\0'`, so `strcpy` overflows by one byte. Use `strlen(s) + 1`. (b) The result of `malloc` isn't checked for `NULL`. (c) It's a reimplementation of `strdup` (POSIX, standard in C23), so just use that. Fixed: `size_t n = strlen(s) + 1; char *d = malloc(n); if (d) { memcpy(d, s, n); } return d;`
5. In declaration order: `a` at 0, 7 bytes of padding, `b` at 8–15, `c` at 16, 3 bytes of padding, `d` at 20–23. Total **24**. Reordered largest first, `struct { double b; int d; char a; char c; }` puts `b` at 0, `d` at 8, `a` at 12, `c` at 13, plus 2 bytes of tail padding. Total **16**.
:::

---

## Interview Q&A

- **Difference between `#include <x.h>` and `"x.h"`?** Angle brackets search system include paths; quotes search the current directory first.
- **What is `sizeof` evaluated at?** Compile time (except for VLAs). It's an operator, not a function.
- **What does `extern "C"` do?** (C++ side) disables name mangling so C and C++ can link.
- **Why `do { } while(0)` in macros?** Makes the macro a single statement that requires a trailing semicolon and works inside `if/else`.
- **What is `offsetof`?** Byte offset of a member within a struct — used for `container_of` in the Linux kernel.
- **Stack vs heap allocation of a 1 MB buffer on an MCU?** Neither, usually — a static buffer in `.bss` sized at link time.
- **What are the three meanings of `static` in C?** Internal linkage for globals/functions, static storage duration (persisting, once-initialised) for locals, and a minimum-size promise in array parameters (`int a[static 4]`).
- **What's the difference between `const int *p` and `int *const p`?** The first is a pointer to const data (can repoint, can't modify through it); the second is a const pointer (can modify the data, can't repoint).
- **When must you use `volatile`?** For memory-mapped registers, variables shared with ISRs or signal handlers, and locals modified between `setjmp`/`longjmp` — it forces every access to happen but provides no atomicity.
- **Why is `sizeof(arr)` different inside a function?** An array parameter is adjusted to a pointer, so `sizeof` gives the pointer size; pass the length separately.
- **Why does a struct have padding?** So each member is aligned for efficient (or legal) access, and so arrays of the struct keep every element aligned; order members by decreasing size to reduce it.
- **Why is `p = realloc(p, n)` a bug?** If `realloc` fails it returns NULL but the original block is still allocated — assigning NULL to `p` loses the only pointer to it (a leak).
- **How do you check if a number is a power of two?** `x != 0 && (x & (x - 1)) == 0` — a power of two has exactly one set bit.
- **How do you detect endianness at run time?** Store `1` in a `uint16_t` and inspect its first byte through an `unsigned char *` — 1 means little-endian.
- **What is an opaque pointer?** A pointer to a struct that's only declared in the public header, so users can pass it around but can't access its members — encapsulation and ABI stability in C (`FILE *`).

---

## External resources

- **Brian Kernighan & Dennis Ritchie — *The C Programming Language* (2nd ed.)**.
- **Jens Gustedt — *Modern C*** (free online edition; covers C17/C23).
- **cppreference — C reference** (en.cppreference.com/w/c).
- **SEI CERT C Coding Standard** — secure-coding rules with examples.
- **Peter van der Linden — *Expert C Programming: Deep C Secrets*** (declarations, arrays vs pointers).
- **Sean Eron Anderson — "Bit Twiddling Hacks"** (graphics.stanford.edu/~seander/bithacks.html).
- **MISRA C:2012/2023** guidelines for safety-critical embedded C.
