# C Coding Standards (MISRA / CERT)

Production C — especially firmware for automotive, medical, industrial and aerospace — is written against coding standards that ban the language's most dangerous corners. Knowing their *rationale* impresses embedded interviewers.

## 1. The major standards

| Standard | Focus | Used in |
|---|---|---|
| **MISRA C:2012** (+ amendments, MISRA C:2023) | safety & reliability; decidable rules for static analysis | automotive (ISO 26262), industrial, medical, rail |
| **CERT C** (SEI) | security: avoiding exploitable bugs | security-sensitive code, any domain |
| **Barr Group Embedded C Coding Standard** | practical bug-reducing style for firmware | general embedded |
| **JSF AV C++ / AUTOSAR C++14 / MISRA C++:2023** | C++ equivalents | avionics, automotive |
| Linux kernel coding style | consistency/readability | kernel & drivers |

MISRA rules are classified **mandatory**, **required** (deviation needs a documented justification), or **advisory**.

## 2. Representative MISRA-style rules and why

| Rule (paraphrased) | Rationale |
|---|---|
| Use fixed-width types (`uint16_t`), not `int`/`long` | size of `int` varies by platform |
| No implicit conversions that change signedness or narrow ("essential type model") | silent truncation & sign bugs |
| No dynamic memory allocation (`malloc`/`free`) | fragmentation, non-determinism, failure handling |
| No recursion | unbounded stack use can't be statically verified |
| Every `switch` has a `default`; every `if … else if` chain ends with `else` | defensive handling of unexpected values |
| No `goto` (advisory; forward `goto` to cleanup sometimes allowed) | structured control flow |
| A function has a single point of exit (advisory) | easier reasoning (debated) |
| Loop counters must not be floating point | rounding errors |
| All code must be reachable; no unused variables/parameters | dead code hides bugs |
| No `<stdio.h>` in production code; no `atoi`/`atof`; no `setjmp`/`longjmp` | undefined/implementation-defined behaviour, no error reporting |
| Function-like macros only when necessary; prefer `static inline` functions | type safety, double evaluation |
| The value returned by a non-void function shall be used | ignored error codes |
| No pointer arithmetic except array indexing | out-of-bounds errors |
| Initialise all automatic variables before use | indeterminate values |
| Bit-fields only of `unsigned int`/`signed int`/`_Bool` | implementation-defined layout |
| Octal constants are banned (`0123`) | `010 == 8` surprises |
| Unsigned integer constants have a `U` suffix | `1 << 31` on `int` is UB |
| Braces around every `if`/`for`/`while` body | Apple "goto fail" bug |

```c
/* Non-compliant */
if (len > max)
    len = max;
    log_truncation();         /* looks conditional, isn't */

/* Compliant */
if (len > max) {
    len = max;
    log_truncation();
}
```

## 3. CERT C highlights (security)

- **STR31-C:** guarantee storage for strings has room for the data *and* the NUL terminator.
- **ARR30-C:** don't form or use out-of-bounds pointers or array subscripts.
- **INT30-C / INT32-C:** ensure unsigned wraps and signed overflows can't occur on untrusted data.
- **MEM30-C:** don't access freed memory; **MEM31-C:** free dynamically allocated memory exactly once.
- **FIO30-C:** exclude user input from format strings (`printf(user)` → format-string attacks).
- **ERR33-C:** detect and handle standard library errors (check `malloc`, `fopen`, `snprintf` returns).
- **EXP33-C:** don't read uninitialised memory.
- **MSC32-C:** properly seed pseudo-random generators; use CSPRNGs for security.

```c
/* Format string vulnerability */
printf(user_input);            /* ❌ attacker controls %n, %s ... */
printf("%s", user_input);      /* ✅ */

/* Integer overflow before allocation */
size_t n = count * sizeof(item_t);            /* ❌ can wrap -> small allocation -> heap overflow */
if (count > SIZE_MAX / sizeof(item_t)) return ERR_TOO_BIG;   /* ✅ check first */
item_t *items = malloc(count * sizeof *items);
```

## 4. Practical defensive C patterns

```c
/* Compile-time checks */
_Static_assert(sizeof(packet_t) == 64, "packet layout must match the wire format");

/* Explicit, bounded string handling */
char name[32];
int n = snprintf(name, sizeof name, "%s-%u", prefix, id);
if (n < 0 || (size_t)n >= sizeof name) { /* truncated: handle */ }

/* Parameter validation at module boundaries */
status_t uart_write(uart_t *u, const uint8_t *data, size_t len) {
    if (u == NULL || (data == NULL && len != 0U)) { return STATUS_EINVAL; }
    /* ... */
    return STATUS_OK;
}

/* Opaque types for encapsulation */
typedef struct uart uart_t;            /* header: incomplete type */
uart_t *uart_open(uint8_t port);       /* users can't poke at internals */

/* const-correct APIs */
uint32_t crc32(const uint8_t *data, size_t len);

/* Enumerations with explicit sizes and a count for range checks */
typedef enum { LED_OFF = 0, LED_ON, LED_BLINK, LED_MODE_COUNT } led_mode_t;
```

## 5. Module structure

```text
uart.h      public API: types, function prototypes, doc comments; include guards; no globals
uart.c      implementation; static (file-private) helpers and state
uart_cfg.h  compile-time configuration
```

- One module = one responsibility; `static` everything that isn't part of the API.
- No `extern` global variables in headers — provide accessor functions.
- Headers are self-contained (include what they use) and idempotent.

## 6. Tooling

- **Compiler warnings:** `-Wall -Wextra -Wconversion -Wshadow -Wstrict-prototypes -Wmissing-prototypes -Wcast-align -Wformat=2 -Werror`.
- **Static analysers / MISRA checkers:** PC-lint Plus, Polyspace, LDRA, Parasoft, Helix QAC, cppcheck (with the MISRA addon), CodeChecker, Coverity.
- **Runtime:** sanitizers on host builds of portable modules; MPU regions and stack guards on target.
- **Complexity limits:** cyclomatic complexity per function (e.g. ≤ 10–15), enforced by tools.

## 7. Documenting deviations

When a rule must be broken (e.g. casting an integer to a pointer for MMIO — itself a MISRA deviation), record:

```c
/* MISRA C:2012 Rule 11.4 deviation: conversion of integer to pointer is required
 * to access memory-mapped peripheral registers. Address validated against the
 * device memory map. Reviewed: DEV-0042 */
#define GPIOA ((gpio_regs_t *)0x48000000UL)
```

## Interview Q&A

- **Why does MISRA ban dynamic memory?** Fragmentation over long uptimes, non-deterministic timing, and `malloc` failure paths that are rarely tested.
- **Why ban recursion?** Worst-case stack depth can't be bounded statically, and stacks are small.
- **What's the essential type model?** MISRA's stricter type system on top of C (essentially Boolean, character, signed, unsigned, enum, floating) that forbids mixing categories implicitly.
- **How do you handle a rule you need to break?** A formal, documented, reviewed deviation — never silently.
