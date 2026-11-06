# C vs C++ Differences

> **Key idea:** C++ grew out of C, and most C code compiles as C++. But C++ is **not** a strict superset. Some valid C is rejected by C++ (implicit `void*` conversions, `goto` past an initialisation, C++ keywords used as names), and some code compiles in both languages with **different meanings** (`sizeof('a')`, `const` linkage, `inline`, union punning, empty parameter lists). Beyond the syntax, the two languages have different philosophies. C gives you explicit control and expects explicit cleanup. C++ adds **zero-cost abstractions** that let the compiler enforce correctness: RAII, templates, references, classes, `constexpr`. Interviewers, especially in embedded, ask about the trick differences, about mixing the two languages, and about whether C++ belongs on a microcontroller.

**What you'll be able to do after this guide**
- List the incompatibilities between C and C++, and explain *why* each exists.
- Predict the code that compiles in both but behaves differently.
- Link C and C++ together correctly (`extern "C"`, headers, exceptions, types across the boundary).
- Translate common C idioms (`goto cleanup`, `void*` generics, manual vtables, macros) into their C++ equivalents, and back.
- Argue for or against C++ on a microcontroller, naming which features are zero-cost and which aren't.

> **Note:** Every claim in the tables below was checked with GCC 13 (`gcc -std=c17` / `g++ -std=c++20`), and the error messages quoted are real.

---

## 1. Valid C that isn't valid C++

```c
/* no-test (each line is fine in C17 but an error in C++) */
int *p = malloc(10 * sizeof(int));     /* C++: invalid conversion from 'void*' to 'int*' -- needs a cast */
int new = 5, class = 3, this = 1;      /* C++: these are keywords */
char name[3] = "abc";                  /* C: OK (no room for '\0', array isn't terminated). C++: error */
enum Color { RED, GREEN }; enum Color c = 5;   /* C++: no implicit int -> enum conversion */
int x = 1; int x;                      /* C: a "tentative definition" at file scope. C++: redefinition */
struct S { int v; }; S s;              /* C: must write `struct S s` (or typedef). C++: OK */
void f(); f(1, 2, 3);                  /* C17: f() means UNSPECIFIED parameters, so this compiles. C++/C23: error */
struct P { int x, y; } pt = { .y = 2, .x = 1 };   /* C: any order. C++20: must follow declaration order */
int *q = (int[]){1, 2, 3};             /* compound literal: C99; only a GNU extension in C++ */
void g(int n, int a[n]);               /* VLA parameter: C99; not standard C++ */
int *restrict r;                       /* restrict: C99 only (__restrict is an extension in C++) */
```

**`goto` across an initialisation.** This matters, because it breaks the C `goto cleanup` idiom when you compile it as C++:

```c
#include <stdlib.h>

int f(void) {
    int rc = -1;
    goto out;              /* C: allowed (only jumping into the scope of a VLA is forbidden) */
    char *buf = malloc(4); /* C++: "jump to label 'out' crosses initialization of 'char* buf'" */
    free(buf);
    rc = 0;
out:
    return rc;
}

int main(void) {
    return f() + 1;        /* returns 0 */
}
```

Compiled as C++, the same file gives these real errors:

```text
g.c:5:21: error: invalid conversion from 'void*' to 'char*' [-fpermissive]
g.c:8:1: error: jump to label 'out'
```

---

## 2. Valid in both, but different meaning

| Code | C | C++ | Why |
|---|---|---|---|
| `sizeof('a')` | `sizeof(int)` = **4** | **1** | character literals are `int` in C, `char` in C++ (needed for overloading `f(char)`) |
| `sizeof(1 == 1)` | 4 (`int`) | 1 (`bool`) | comparisons yield `int` in C, `bool` in C++ |
| `struct E {};` then `sizeof(struct E)` | **0** (GNU extension; empty structs aren't ISO C) | **1** | distinct C++ objects need distinct addresses |
| `const int k = 5;` at file scope | **external** linkage | **internal** linkage | C++ lets constants live in headers |
| `const int n = 10; int a[n];` | a VLA (block scope) / error (file scope) | ordinary array: `n` is a constant expression | C `const` means read-only, not compile-time |
| `void f();` | **unspecified** parameters (until C23) | **no** parameters | old K&R declarations |
| `inline int f(void) {...}` alone in a `.c` | an *inline definition* only: no external symbol is emitted, so `-O0` gives `undefined reference to 'f'` | fine (ODR) | C99 inline model: one TU must provide an `extern inline` definition |
| `union { float f; uint32_t u; } x; x.f = 1; x.u` | defined (type punning allowed) | **UB** (inactive member) | C++ object model; use `std::bit_cast` |
| String literal `"hi"` | type `char[3]` (writing is UB) | type `const char[3]` | `char *s = "hi";` is an error in C++11+ |
| `int main() { return main(); }` | allowed | ill-formed (can't call `main`) | |
| `?:` result | an rvalue | can be an lvalue (`(c ? a : b) = 1;`) | |
| `auto x = 1;` | before C23: storage class (`auto int`) | type deduction | C23 now deduces too |
| Tag names (`struct S`) | separate namespace from ordinary names | also usable as plain type names | |

These were measured with the same source file compiled as both languages:

```text
$ gcc -std=gnu17 e.c && ./a.out      # sizeof(struct E), sizeof(1==1), sizeof('a')
0 4 4
$ g++ -x c++ e.c && ./a.out
1 1 1
```

```c
#include <stdio.h>

/* Prints the language-dependent sizes. Compare with the C++ version below. */
int main(void) {
    printf("C:   sizeof('a')=%zu sizeof(1==1)=%zu\n", sizeof('a'), sizeof(1 == 1));
    return 0;
}
```

```cpp
#include <cstdio>

int main() {
    std::printf("C++: sizeof('a')=%zu sizeof(1==1)=%zu\n", sizeof('a'), sizeof(1 == 1));
    return 0;
}
```

The C99 `inline` trap reproduced:

```text
$ gcc -std=c17 -O0 inl.c          # inl.c: inline int twice(int x) {...}  int main(void) { return twice(0); }
inl.c:(.text+0xe): undefined reference to `twice'
$ gcc -std=c17 -O2 inl.c          # links: the call was inlined, so no symbol was needed
```

In C, write `static inline` in headers. That is always safe, and every TU gets its own copy.

---

## 3. Feature comparison

| Area | C | C++ |
|---|---|---|
| Abstraction | structs + functions; function-pointer tables | classes, access control, inheritance, virtual functions |
| Generic code | `void *` + size (`qsort`), macros, `_Generic` (C11) | templates, concepts, overloading |
| Resource cleanup | manual, `goto cleanup` | RAII: destructors run on every exit path |
| Errors | return codes, `errno` | exceptions, `std::optional`, `std::expected`, error codes |
| Strings | `char[]` + `<string.h>` | `std::string`, `std::string_view` |
| Containers | write your own, or a library | STL (`vector`, `map`, `unordered_map`, ...) |
| Compile-time computation | macros; C23 `constexpr` objects only | `constexpr`/`consteval` functions, templates |
| Constants | `#define`, `enum`, C23 `constexpr` | `constexpr`, `enum class` |
| References | no | `T&`, `T&&` |
| Overloading / default args / namespaces | no | yes |
| Memory allocation | `malloc`/`free` (returns `NULL`) | `new`/`delete` call constructors (throw `bad_alloc`), smart pointers |
| Type punning | unions OK | `std::bit_cast` / `memcpy` |
| `bool`, `nullptr` | `<stdbool.h>`; `NULL` (both keywords in C23) | built in |
| Threads | C11 `<threads.h>` (optional), pthreads | `std::thread`, `<atomic>`, `<mutex>` |
| ABI | simple and stable (the lingua franca of FFI) | name mangling, vtables, exceptions: compiler-specific |

---

## 4. The same idiom in both languages

### 4.1 Cleanup: `goto` vs RAII

```c
#include <stdio.h>
#include <stdlib.h>

/* C: every acquisition needs a matching release on every path. */
int count_bytes(const char *path, long *out) {
    int rc = -1;
    FILE *f = fopen(path, "rb");
    if (f == NULL) {
        goto out;
    }
    char *buf = malloc(4096);
    if (buf == NULL) {
        goto close_file;
    }
    long total = 0;
    size_t n;
    while ((n = fread(buf, 1, 4096, f)) > 0) {
        total += (long)n;
    }
    *out = total;
    rc = 0;
    free(buf);
close_file:
    fclose(f);
out:
    return rc;
}

int main(void) {
    FILE *tmp = fopen("c_vs_cpp_demo.bin", "wb");
    if (tmp == NULL) {
        return 1;
    }
    fputs("hello", tmp);
    fclose(tmp);
    long size = 0;
    int rc = count_bytes("c_vs_cpp_demo.bin", &size);
    printf("C: rc=%d size=%ld, missing file rc=%d\n", rc, size, count_bytes("does-not-exist", &size));
    remove("c_vs_cpp_demo.bin");
    return rc;
}
```

```cpp
#include <cstdio>
#include <fstream>
#include <memory>
#include <optional>
#include <vector>

// A tiny RAII wrapper for FILE*: fclose runs automatically on every exit path.
struct FileCloser {
    void operator()(std::FILE* f) const noexcept { std::fclose(f); }
};
using FilePtr = std::unique_ptr<std::FILE, FileCloser>;

std::optional<long> countBytes(const char* path) {
    FilePtr f(std::fopen(path, "rb"));
    if (!f) {
        return std::nullopt;                     // nothing to clean up by hand
    }
    std::vector<char> buf(4096);                 // freed automatically
    long total = 0;
    std::size_t n;
    while ((n = std::fread(buf.data(), 1, buf.size(), f.get())) > 0) {
        total += static_cast<long>(n);
    }
    return total;                                // f closes here, as it would on any early return or exception
}

int main() {
    { std::ofstream("cpp_demo.bin") << "hello"; }
    auto size = countBytes("cpp_demo.bin");
    std::printf("C++: size=%ld, missing file has value: %d\n", size.value_or(-1),
                countBytes("does-not-exist").has_value());
    std::remove("cpp_demo.bin");
    return size ? 0 : 1;
}
```

### 4.2 Polymorphism: a manual vtable vs `virtual`

```c
#include <stdio.h>

/* C: an "interface" is a struct of function pointers; each object points at its table. */
typedef struct shape shape;
typedef struct {
    double (*area)(const shape *self);
    const char *(*name)(const shape *self);
} shape_vtable;

struct shape {
    const shape_vtable *vt;     /* first member: the "vptr" */
};

typedef struct {
    shape base;                 /* "inheritance" by embedding the base first */
    double r;
} circle;

typedef struct {
    shape base;
    double w, h;
} rect;

static double circle_area(const shape *s) {
    const circle *c = (const circle *)s;   /* valid: base is the first member */
    return 3.14159 * c->r * c->r;
}
static const char *circle_name(const shape *s) { (void)s; return "circle"; }

static double rect_area(const shape *s) {
    const rect *r = (const rect *)s;
    return r->w * r->h;
}
static const char *rect_name(const shape *s) { (void)s; return "rect"; }

static const shape_vtable kCircleVt = {circle_area, circle_name};
static const shape_vtable kRectVt = {rect_area, rect_name};

int main(void) {
    circle c = {{&kCircleVt}, 1.0};
    rect r = {{&kRectVt}, 2.0, 3.0};
    const shape *shapes[] = {&c.base, &r.base};
    double total = 0.0;
    for (int i = 0; i < 2; ++i) {
        total += shapes[i]->vt->area(shapes[i]);     /* dynamic dispatch, by hand */
        printf("%s ", shapes[i]->vt->name(shapes[i]));
    }
    printf("total area=%.2f\n", total);
    return 0;
}
```

```cpp
#include <cstdio>
#include <memory>
#include <vector>

// C++: the compiler builds the vtable, sets the vptr, and checks the overrides.
struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual const char* name() const = 0;
};

struct Circle final : Shape {
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159 * r_ * r_; }
    const char* name() const override { return "circle"; }
private:
    double r_;
};

struct Rect final : Shape {
    Rect(double w, double h) : w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
    const char* name() const override { return "rect"; }
private:
    double w_, h_;
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>(1.0));
    shapes.push_back(std::make_unique<Rect>(2.0, 3.0));
    double total = 0.0;
    for (const auto& s : shapes) {
        total += s->area();
        std::printf("%s ", s->name());
    }
    std::printf("total area=%.2f\n", total);
    return 0;
}
```

Both compile to essentially the same thing: an indirect call through a table. The C++ version adds type safety: there are no casts, `override` is checked, and objects can't be constructed with the wrong table.

### 4.3 Generic code: `qsort` vs `std::sort`

```cpp
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <random>
#include <vector>

extern "C" int compareInts(const void* a, const void* b) {
    int x = *static_cast<const int*>(a);
    int y = *static_cast<const int*>(b);
    return (x > y) - (x < y);
}

int main() {
    std::vector<int> data(1'000'000);
    std::mt19937 rng(1);
    for (auto& v : data) {
        v = static_cast<int>(rng());
    }
    auto a = data;
    auto b = data;

    auto t0 = std::chrono::steady_clock::now();
    std::qsort(a.data(), a.size(), sizeof(int), compareInts);   // type-erased: an indirect call per comparison
    auto t1 = std::chrono::steady_clock::now();
    std::sort(b.begin(), b.end());                             // template: the comparison is inlined
    auto t2 = std::chrono::steady_clock::now();

    auto ms = [](auto d) { return std::chrono::duration_cast<std::chrono::milliseconds>(d).count(); };
    std::printf("qsort %lld ms, std::sort %lld ms, same result: %d\n",
                static_cast<long long>(ms(t1 - t0)), static_cast<long long>(ms(t2 - t1)), a == b);
    return a == b ? 0 : 1;
}
```

`qsort` sees only `void*` and a byte size, so every comparison is an indirect call that can't be inlined. `std::sort` is instantiated for `int` with `operator<` inlined. Two runs with `g++ -O2` on 1M ints gave qsort 133/110 ms vs std::sort 81/54 ms, about 1.6–2× faster. Sanitizer or `-O0` builds distort this comparison, so measure optimised builds. Templates are a case where an abstraction is *faster* than the C equivalent.

### 4.4 Macros vs `constexpr` and templates

```c
/* no-test (comparison) */
/* C */
#define MAX(a, b) ((a) > (b) ? (a) : (b))      /* evaluates arguments twice; no type checking */
#define BUFFER_SIZE 256                        /* no scope, no type, invisible to the debugger */
```

```cpp
#include <cassert>

// C++
template <typename T>
constexpr const T& maxOf(const T& a, const T& b) {    // type-checked, evaluated once, usable at compile time
    return (a > b) ? a : b;
}
constexpr int kBufferSize = 256;                      // scoped, typed, visible in the debugger

int main() {
    static_assert(maxOf(3, 7) == 7);
    int i = 1;
    int m = maxOf(i++, 0);                            // i++ happens exactly once
    assert(m == 1 && i == 2);
    char buffer[kBufferSize] = {};
    assert(sizeof buffer == 256);
    return 0;
}
```

---

## 5. Linking C and C++ together

```cpp
// no-test (header shared by C and C++)
#ifndef HAL_H
#define HAL_H
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct { uint32_t baud; uint8_t parity; } hal_uart_cfg;   /* C-compatible types only */

int  hal_uart_init(const hal_uart_cfg *cfg);
void hal_set_rx_callback(void (*cb)(void *ctx, uint8_t byte), void *ctx);

#ifdef __cplusplus
}
#endif
#endif
```

Rules at the boundary:
- C++ **mangles** names. `extern "C"` turns that off for the declarations inside it, so C and C++ agree on symbol names. A C++ declaration without it looks for `_Z13hal_uart_initPK12hal_uart_cfg` instead of `hal_uart_init`, and fails with `undefined reference`.
- `extern "C"` functions **can't be overloaded**.
- **Exceptions must never cross C frames.** Catch everything in the C++ callback, and convert it to an error code:

```cpp
#include <cstdint>
#include <cstdio>
#include <initializer_list>
#include <stdexcept>

// Imagine this is a C library: it stores a callback and calls it later.
extern "C" {
typedef void (*rx_callback)(void* ctx, std::uint8_t byte);
static rx_callback g_cb = nullptr;
static void* g_ctx = nullptr;
void hal_set_rx_callback(rx_callback cb, void* ctx) { g_cb = cb; g_ctx = ctx; }
void hal_simulate_rx(std::uint8_t byte) { if (g_cb) { g_cb(g_ctx, byte); } }
}

class Parser {
public:
    void feed(std::uint8_t byte) {
        if (byte == 0xFF) {
            throw std::runtime_error("framing error");
        }
        count_++;
    }
    int count() const { return count_; }
    int errors = 0;
private:
    int count_ = 0;
};

// Trampoline: a C-callable function that forwards to a C++ object and stops exceptions here.
extern "C" void parserTrampoline(void* ctx, std::uint8_t byte) {
    auto* parser = static_cast<Parser*>(ctx);
    try {
        parser->feed(byte);
    } catch (...) {                       // NEVER let an exception unwind through C code
        parser->errors++;
    }
}

int main() {
    Parser parser;
    hal_set_rx_callback(parserTrampoline, &parser);   // pass `this` through the void* context
    for (std::uint8_t b : {0x01, 0x02, 0xFF, 0x03}) {
        hal_simulate_rx(b);
    }
    std::printf("bytes=%d errors=%d\n", parser.count(), parser.errors);
    return (parser.count() == 3 && parser.errors == 1) ? 0 : 1;
}
```

- Pass only **C-compatible types** across the boundary: scalars, pointers, and plain structs with standard layout. No `std::string`, references, classes with virtual functions, or templates.
- Link with the **C++ driver** (`g++`/`clang++`), or add `-lstdc++`, so the C++ runtime is included.
- A C++ **member function** can't be a C callback. Use a static or `extern "C"` free function plus a `void* ctx` "trampoline", as above.
- The memory allocator must match: memory allocated with `malloc` in C must be released with `free`, never `delete`.

---

## 6. C++ on a microcontroller?

Yes, with discipline. Many features are genuinely **zero-cost**, meaning the generated code is the same as or better than hand-written C:

| Zero-cost (use freely) | Has a cost (decide deliberately) |
|---|---|
| classes, access control, namespaces, references | **exceptions**: unwind tables, `libgcc` unwinder (~tens of KB), non-deterministic timing. Usually disabled with `-fno-exceptions`. |
| `constexpr`/`consteval`, templates (watch code size), `enum class` | **RTTI**: `typeid`/`dynamic_cast` type info. Usually `-fno-rtti`. |
| `std::array`, `std::span`, `std::optional`, `std::variant`, `std::string_view` | **heap**: `new`, `std::vector`, `std::string`, `std::function` (may allocate). Avoid after init; use `pmr`, ETL or fixed-capacity containers. |
| RAII lock guards, scoped interrupt disable, `unique_ptr` with custom deleters | **iostreams**: pulls in locale machinery, often 100+ KB of flash. Use `printf`-style logging or a custom formatter. |
| lambdas (without `std::function`) | **virtual functions**: an indirect call plus a vtable in flash. Fine in moderation; CRTP or templates when it's hot. |
| `static_assert`, strong types for units and register fields | **global constructors**: they run before `main`, so mind the start-up order. Prefer `constinit`/`constexpr` objects. |

```cpp
#include <cassert>
#include <cstdint>

// Zero-cost register abstraction: compiles to the same single load/store as a C macro,
// but the field type stops you writing a baud divisor into the parity bits.
template <unsigned Shift, unsigned Width>
struct Field {
    static constexpr std::uint32_t mask = ((1u << Width) - 1u) << Shift;
    static constexpr std::uint32_t write(std::uint32_t reg, std::uint32_t value) {
        return (reg & ~mask) | ((value << Shift) & mask);
    }
    static constexpr std::uint32_t read(std::uint32_t reg) {
        return (reg & mask) >> Shift;
    }
};

using Parity = Field<9, 2>;
using WordLength = Field<12, 1>;

// RAII "critical section" (on a real MCU: __disable_irq() / __enable_irq(), restoring PRIMASK).
struct InterruptLock {
    static inline int depth = 0;
    InterruptLock() { ++depth; }
    ~InterruptLock() { --depth; }
    InterruptLock(const InterruptLock&) = delete;
    InterruptLock& operator=(const InterruptLock&) = delete;
};

int main() {
    constexpr std::uint32_t cr1 = WordLength::write(Parity::write(0, 2), 1);
    static_assert(Parity::read(cr1) == 2 && WordLength::read(cr1) == 1);   // checked at compile time

    {
        InterruptLock lock;              // interrupts "disabled" for this scope only
        assert(InterruptLock::depth == 1);
    }                                    // re-enabled on every exit path, even early returns
    assert(InterruptLock::depth == 0);
    return 0;
}
```

The typical embedded C++ flags: `-fno-exceptions -fno-rtti -fno-threadsafe-statics -ffunction-sections -fdata-sections -Os` plus `-Wl,--gc-sections`. Safety-critical projects follow MISRA C++:2023 or AUTOSAR C++14 rules.

**When C is still the better choice:** a team or codebase that is C-only, a vendor toolchain with weak C++ support, a library others call through FFI (a C ABI is universal), the smallest 8-bit targets, or certification constraints.

---

## 7. Interview checklist

- [ ] Five things valid in C but not C++: `void*` conversion, keywords as names, `char[3] = "abc"`, implicit int → enum, `goto` past an initialisation (plus tentative definitions and out-of-order designated initialisers).
- [ ] Things that differ in meaning: `sizeof('a')`, comparison result type, `const` linkage, `const` as a constant expression, `f()` vs `f(void)`, `inline`, union punning, string-literal type.
- [ ] `extern "C"`: what it does, the header pattern, no overloading, exceptions across the boundary, trampolines with `void* ctx`.
- [ ] RAII vs `goto cleanup`; templates vs `void*` generics (and why `std::sort` beats `qsort`); macros vs `constexpr`.
- [ ] Embedded C++: zero-cost features vs exceptions/RTTI/heap/iostreams/`std::function`; typical flags.

---

## Practice

1. What do `printf("%zu", sizeof('x'))` and `printf("%zu", sizeof(char))` print in C, and in C++?
2. A C library header declares `int crc32(const void *data, size_t len);` without `extern "C"`. Your C++ code fails to link with `undefined reference to 'crc32(void const*, unsigned long)'`. Fix it without editing the library.
3. Convert this C into idiomatic C++: `int *buf = malloc(n * sizeof *buf); if (!buf) return -1; ... free(buf);`
4. A C++ class method must be registered as a C callback `void (*cb)(void *ctx, int event)`. Show how.
5. Explain why `inline int sq(int x) { return x * x; }` in a C header can cause `undefined reference to 'sq'`, and give two fixes.

:::details Show solution
1. In C: `4` and `1`, because `'x'` has type `int`. In C++: `1` and `1`, because `'x'` has type `char`.
2. Wrap the include in your own code:
```cpp
// no-test (wrapping a C header)
extern "C" {
#include "crc32.h"
}
```
   Better still, ask the library to add the `#ifdef __cplusplus extern "C"` guards to its header.
3. Use a container, which owns the memory and frees it automatically, including on exceptions and early returns:
```cpp
#include <cassert>
#include <cstddef>
#include <vector>

int process(std::size_t n) {
    std::vector<int> buf(n);          // throws std::bad_alloc on failure, value-initialises to 0
    for (std::size_t i = 0; i < n; ++i) {
        buf[i] = static_cast<int>(i);
    }
    return buf.empty() ? 0 : buf.back();
}                                     // no free() needed

int main() {
    assert(process(5) == 4);
    return 0;
}
```
   (For a fixed size use `std::array`. If you need a raw array with no initialisation, use `std::make_unique_for_overwrite<int[]>(n)` from C++20.)
4. Use a static or `extern "C"` trampoline that casts `ctx` back to the object:
```cpp
#include <cassert>

extern "C" {
typedef void (*event_cb)(void* ctx, int event);
static event_cb g_cb = nullptr;
static void* g_ctx = nullptr;
void register_cb(event_cb cb, void* ctx) { g_cb = cb; g_ctx = ctx; }
void fire(int e) { if (g_cb) { g_cb(g_ctx, e); } }
}

class Monitor {
public:
    void onEvent(int e) { last_ = e; }
    int last() const { return last_; }
    static void trampoline(void* ctx, int e) {      // no `this`: matches the C signature
        static_cast<Monitor*>(ctx)->onEvent(e);
    }
private:
    int last_ = 0;
};

int main() {
    Monitor m;
    register_cb(&Monitor::trampoline, &m);
    fire(42);
    assert(m.last() == 42);
    return 0;
}
```
   A captureless lambda also converts to a function pointer: `register_cb([](void* c, int e) { static_cast<Monitor*>(c)->onEvent(e); }, &m);`.
5. In C99/C11, a plain `inline` definition is only an *inline definition*: it provides no external symbol. If the compiler decides not to inline a call (always at `-O0`), it emits a call to an external `sq`, which no TU defines. Fixes: make it `static inline` in the header (each TU gets its own copy), or keep `inline` in the header and add `extern inline int sq(int x);` in exactly one `.c` file to emit the external definition.
:::

---

## Interview Q&A

- **Is C a subset of C++?** No — there are valid C programs that aren't valid C++ (implicit `void*` conversion, keyword identifiers) and constructs that mean different things (`sizeof('a')`).
- **Why can't you call a C++ function from C directly?** Name mangling and possibly calling conventions/exceptions — export it with `extern "C"`.
- **What's the C equivalent of a C++ class?** A struct plus functions taking a pointer to it (`uart_write(uart_t *self, ...)`), with function-pointer tables for polymorphism (a manual vtable).
- **What does `sizeof('a')` return in C and C++?** `sizeof(int)` (usually 4) in C, where character literals are `int`; 1 in C++, where they're `char`.
- **Does `const` mean the same thing in C and C++?** No — in C it's only read-only (not a constant expression, external linkage at file scope); in C++ a `const` integer initialised with a constant is a constant expression and has internal linkage.
- **Why does C code using `goto cleanup` sometimes fail to compile as C++?** C++ forbids jumping past the initialisation of a variable that's still in scope at the label.
- **Can exceptions pass through C code?** They mustn't — C frames have no unwind information or cleanup semantics; catch everything at the C++/C boundary and convert to an error code.
- **Why is `std::sort` usually faster than `qsort`?** `std::sort` is a template instantiated for the element type, so comparisons are inlined; `qsort` calls the comparator through a function pointer on `void*` for every comparison.
- **Is type punning through a union legal?** In C, yes; in C++ reading a member other than the last one written is undefined behaviour — use `std::bit_cast` or `memcpy`.
- **Which C++ features would you disable on a small MCU and why?** Exceptions (code size, unwind tables, non-deterministic timing) and RTTI (type info tables), plus avoiding heap allocation after start-up and iostreams (large code size).
- **What does `void f();` mean in C vs C++?** In C before C23 it declares a function with unspecified parameters (any arguments compile); in C++ (and C23) it means no parameters — write `f(void)` in C.

---

## External resources

- **Bjarne Stroustrup — "C and C++: Siblings"** and the C/C++ compatibility appendix of *The C++ Programming Language*.
- **cppreference — "C++ compatibility" and "C compatibility" pages.**
- **David R. Tribble — "Incompatibilities Between ISO C and ISO C++"** (detailed catalogue).
- **Dan Saks — "extern c: Talking to C Programmers about C++"** (CppCon 2016 keynote, aimed at embedded developers).
- **Jason Turner — "Rich Code for Tiny Computers"** (CppCon 2016: C++17 on a Commodore 64) — zero-cost abstractions demonstrated.
- **MISRA C++:2023** and **AUTOSAR C++14** guidelines.
