# Undefined Behavior

> **Key idea:** **Undefined behaviour (UB)** means the C++ standard places *no requirements at all* on what the program does. It might crash, print garbage, appear to work perfectly, or work in debug and break in release. The real danger is the **optimiser**. It is allowed to assume UB *never happens*, so it removes checks and rewrites loops based on that assumption. A UB bug is not "a wrong value in one place". It is a broken contract that can change code far from the bug.

**What you'll be able to do after this guide**
- Tell undefined, unspecified and implementation-defined behaviour apart, with examples.
- Recite the common UB catalogue: memory, arithmetic, types/aliasing, lifetime, sequencing, library preconditions, concurrency.
- Explain *why* optimisers make UB so surprising (deleted null checks, folded overflow checks, infinite loops).
- Write safe replacements: checked arithmetic, safe shifts, safe float→int, `std::bit_cast`, iterator-safe erasure, atomics.
- Catch UB with sanitizers, warnings, hardened standard libraries and `constexpr` evaluation, and read their reports.

---

## 1. Three kinds of "not fully specified"

| Term | What the standard says | Must the compiler document it? | Example |
|---|---|---|---|
| **Undefined** | no requirements; the whole program becomes meaningless | no | signed overflow, null dereference, data race |
| **Unspecified** | one of several valid outcomes, may differ run to run | no | order of evaluating function arguments; whether identical string literals share storage |
| **Implementation-defined** | one valid outcome, chosen and **documented** by the implementation | yes | `sizeof(long)`, signedness of plain `char`, `sizeof(void*)` |

There is also **erroneous behaviour** (C++26): reading an uninitialised automatic variable gives an unspecified value and is flagged as a bug, but it is no longer UB.

Unspecified and implementation-defined behaviour are fine to have in a program, as long as you don't *depend* on one particular choice. The program below has both and no UB, so the runner compiles it with sanitizers:

```cpp
#include <climits>
#include <cstdio>

int trace(const char* name, int value) {
    std::printf("evaluating %s\n", name);    // shows the (unspecified) evaluation order
    return value;
}

int add(int a, int b) {
    return a + b;
}

int main() {
    // Implementation-defined: each compiler/platform documents these.
    std::printf("sizeof(int)=%zu sizeof(long)=%zu sizeof(void*)=%zu\n",
                sizeof(int), sizeof(long), sizeof(void*));
    std::printf("plain char is %s\n", (CHAR_MIN < 0) ? "signed" : "unsigned");

    // Unspecified: the arguments may be evaluated in either order.
    // GCC on x86-64 typically evaluates right to left; Clang left to right.
    int sum = add(trace("a", 1), trace("b", 2));
    std::printf("sum = %d (always 3, whatever the order)\n", sum);
    return 0;
}
```

> **Interview:** "Is `f(i++, i++)` UB?" Before C++17, yes: the two side effects were unsequenced. Since C++17 the arguments are **indeterminately sequenced**. One runs completely before the other, in an unspecified order, so it is not UB, but the result is still unpredictable.

---

## 2. The UB catalogue — know these cold

The snippets in this section **are** UB, so they are marked `no-test` and never run. Each subsection then shows a safe version that does run.

### 2.1 Memory and object lifetime

```cpp
// no-test (each line is undefined behaviour)
int* p = nullptr; *p = 1;                 // null dereference
int a[4]; a[4] = 0;                       // out-of-bounds write (a[4] is one past the end)
int* end = a + 5;                         // forming a pointer past one-past-the-end is UB even without dereferencing
int* q = new int; delete q; *q = 2;       // use-after-free
delete q;                                 // double delete
int* r = new int[3]; delete r;            // new[] paired with delete (must be delete[])
int& dangling() { int x = 0; return x; }  // returning a reference to a local
int x; int y = x + 1;                     // reading an uninitialised int (UB before C++26, erroneous since)
char* s = (char*)"hi"; s[0] = 'H';        // modifying a string literal
std::string_view sv = std::string("temp"); // view into a temporary destroyed at the ';'
```

**Iterator and reference invalidation** is the UB you are most likely to write in real code:

```cpp
// no-test (UB: `first` may refer to freed memory after push_back)
std::vector<int> v = {1, 2, 3};
int& first = v[0];
v.push_back(4);          // capacity 3 -> reallocation: old buffer freed
std::printf("%d\n", first);
```

AddressSanitizer reports it exactly (real output, GCC 13, `-fsanitize=address -g`):

```text
==3632==ERROR: AddressSanitizer: heap-use-after-free on address 0x502000000010 ...
READ of size 4 at 0x502000000010 thread T0
    #0 ... in main b.cpp:7
freed by thread T0 here:
    #0 ... in operator delete(void*, unsigned long)
    #1 ... in std::__new_allocator<int>::deallocate(int*, unsigned long)
```

The safe patterns: hold **indices** instead of references, `reserve` up front, or re-take the reference after the modification. When erasing during a loop, use the iterator that `erase` returns, or use `std::erase_if`.

```cpp
#include <cassert>
#include <cstdio>
#include <vector>

int main() {
    // 1. Indices survive reallocation; references and iterators don't.
    std::vector<int> v = {1, 2, 3};
    std::size_t firstIndex = 0;
    v.push_back(4);
    assert(v[firstIndex] == 1);

    // 2. reserve() guarantees no reallocation until size exceeds capacity.
    std::vector<int> w;
    w.reserve(10);
    w.push_back(7);
    int& seven = w[0];
    for (int i = 0; i < 9; ++i) {
        w.push_back(i);              // still within capacity 10: `seven` stays valid
    }
    assert(seven == 7);

    // 3. Erasing while iterating: use the iterator that erase() returns...
    std::vector<int> nums = {1, 2, 3, 4, 5, 6};
    for (auto it = nums.begin(); it != nums.end();) {
        if (*it % 2 == 0) {
            it = nums.erase(it);     // erase returns the next valid iterator
        } else {
            ++it;
        }
    }
    assert((nums == std::vector<int>{1, 3, 5}));

    // ...or, simpler and O(n), C++20 std::erase_if.
    std::vector<int> more = {1, 2, 3, 4, 5, 6};
    std::size_t removed = std::erase_if(more, [](int n) { return n % 2 == 0; });
    assert(removed == 3 && more.size() == 3);

    std::printf("all invalidation-safe patterns passed\n");
    return 0;
}
```

| Container | Operation | What gets invalidated |
|---|---|---|
| `vector`, `string` | `push_back`/`insert` that reallocates | **everything** |
| `vector`, `string` | `insert`/`erase` without reallocation | elements at and after the position |
| `deque` | insert/erase in the middle | everything |
| `deque` | `push_front`/`push_back` | iterators (references stay valid) |
| `list`, `forward_list`, `map`, `set` | insert | nothing |
| `list`, `map`, `set` | erase | only the erased element |
| `unordered_*` | insert that rehashes | iterators (references stay valid) |

### 2.2 Arithmetic

```cpp
// no-test (each line is undefined behaviour for 32-bit int)
int big = INT_MAX; big + 1;               // signed overflow (unsigned arithmetic wraps: defined)
INT_MIN / -1;  INT_MIN % -1;              // the result does not fit in int
std::abs(INT_MIN);                        // same problem
x / 0;  x % 0;                            // integer division by zero
1 << 32;   1u << 32;                      // shift count >= width (UB for unsigned too)
1 << -1;                                  // negative shift count
-1 << 1;                                  // UB before C++20; defined (== -2) since C++20
int i = static_cast<int>(1e10);           // float -> int out of range
```

Since C++20 signed integers are two's complement, and left shifts of negative values are defined, provided the shift count is in range. **Signed overflow is still UB**, because compilers rely on it for loop optimisations.

Safe replacements:

```cpp
#include <cassert>
#include <climits>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <limits>
#include <optional>

// Checked addition: GCC/Clang builtin (C23 has ckd_add in <stdckdint.h>; C++26 adds it too).
std::optional<int> checkedAdd(int a, int b) {
    int result = 0;
    if (__builtin_add_overflow(a, b, &result)) {
        return std::nullopt;
    }
    return result;
}

// Portable version: test *before* doing the operation.
bool addWouldOverflow(int a, int b) {
    if (b > 0) {
        return a > INT_MAX - b;
    }
    return a < INT_MIN - b;
}

// Shifts: the count must be < the bit width, and work on unsigned values.
std::uint32_t safeShiftLeft(std::uint32_t value, unsigned count) {
    if (count >= 32) {
        return 0;                      // pick a policy; the language gives you none
    }
    return value << count;
}

// float -> int: check the range (and NaN) before converting.
std::optional<int> toIntChecked(double d) {
    if (std::isnan(d)) {
        return std::nullopt;
    }
    // INT_MAX is exactly representable in double; the valid range is (INT_MIN-1, INT_MAX+1).
    if (d >= 2147483648.0 || d <= -2147483649.0) {
        return std::nullopt;
    }
    return static_cast<int>(d);        // truncates toward zero
}

// Division: guard both the zero divisor and INT_MIN / -1.
std::optional<int> safeDivide(int a, int b) {
    if (b == 0 || (a == INT_MIN && b == -1)) {
        return std::nullopt;
    }
    return a / b;
}

int main() {
    assert(checkedAdd(1, 2) == 3);
    assert(!checkedAdd(INT_MAX, 1));
    assert(addWouldOverflow(INT_MAX, 1) && addWouldOverflow(INT_MIN, -1));
    assert(!addWouldOverflow(-5, 3));

    assert(safeShiftLeft(1u, 31) == 0x80000000u);
    assert(safeShiftLeft(1u, 32) == 0);

    assert(toIntChecked(3.99) == 3 && toIntChecked(-3.99) == -3);
    assert(!toIntChecked(1e10) && !toIntChecked(std::nan("")));

    assert(safeDivide(7, 2) == 3 && !safeDivide(1, 0) && !safeDivide(INT_MIN, -1));

    // Unsigned arithmetic is defined: it wraps modulo 2^N.
    std::uint32_t u = std::numeric_limits<std::uint32_t>::max();
    u += 1;
    assert(u == 0);

    std::printf("checked arithmetic: all cases handled without UB\n");
    return 0;
}
```

> **Pitfall:** Small types are promoted to `int` before arithmetic. `std::uint16_t a = 65535; a * a` multiplies two **signed ints**, and 4294836225 overflows `int`: UB! Write `static_cast<std::uint32_t>(a) * a`.

### 2.3 Types, aliasing and alignment

```cpp
// no-test (each line is undefined behaviour)
float f = 1.0f; int bits = *reinterpret_cast<int*>(&f);   // strict aliasing violation
union U { float f; int i; }; U u; u.f = 1; int j = u.i;    // reading the inactive member (OK in C, UB in C++)
const int c = 1; *const_cast<int*>(&c) = 2;                // modifying a const object
alignas(4) unsigned char buf[8]; auto* p32 = reinterpret_cast<std::uint32_t*>(buf + 1); *p32; // misaligned + aliasing
```

**Strict aliasing rule:** you may only access an object through its own type (or a signed/unsigned variant of it), or through `char`, `unsigned char` or `std::byte`. The compiler uses the rule to assume that an `int*` and a `float*` never point to the same memory, which lets it keep values in registers.

The correct tools are `std::bit_cast` (C++20) and `std::memcpy`. Compilers optimise both to a single register move.

```cpp
#include <bit>
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <cstring>

// Decode a little-endian uint32 from an arbitrary byte offset (typical for network/sensor packets).
std::uint32_t readLE32(const unsigned char* bytes) {
    std::uint32_t value = 0;
    std::memcpy(&value, bytes, sizeof value);     // no alignment or aliasing problems
    if constexpr (std::endian::native == std::endian::big) {
        value = __builtin_bswap32(value);
    }
    return value;
}

// Portable alternative that doesn't care about host endianness at all.
std::uint32_t readLE32Shifts(const unsigned char* b) {
    return static_cast<std::uint32_t>(b[0]) |
           (static_cast<std::uint32_t>(b[1]) << 8) |
           (static_cast<std::uint32_t>(b[2]) << 16) |
           (static_cast<std::uint32_t>(b[3]) << 24);
}

int main() {
    float f = 1.0f;
    auto bits = std::bit_cast<std::uint32_t>(f);
    assert(bits == 0x3F800000u);                  // IEEE-754 single precision 1.0

    unsigned char packet[8] = {0xAA, 0x78, 0x56, 0x34, 0x12, 0, 0, 0};
    assert(readLE32(packet + 1) == 0x12345678u);  // offset 1 is misaligned: memcpy is still fine
    assert(readLE32Shifts(packet + 1) == 0x12345678u);

    std::printf("bits of 1.0f = 0x%08X, packet field = 0x%08X\n",
                static_cast<unsigned>(bits), static_cast<unsigned>(readLE32(packet + 1)));
    return 0;
}
```

### 2.4 Control flow, sequencing and classes

```cpp
// no-test (each line is undefined behaviour)
int g() { }                       // flowing off the end of a non-void function (main is the exception)
i = i++ + 1;                      // UB before C++17 (unsequenced); well-defined since C++17
a[i] = i++;                       // UB before C++17; since C++17 the right side is sequenced first
for (int k = 0; ; ++k) { }        // infinite loop with no observable side effects
                                  // (UB; C++26 makes trivial `while (true) {}` loops well-defined)
struct B { B() { init(); } virtual void init() = 0; };  // calling a pure virtual from a constructor
Base* b = new Derived; delete b;  // deleting through a base without a virtual destructor
```

```cpp
#include <cassert>
#include <cstdio>
#include <memory>

struct Base {
    virtual ~Base() = default;          // virtual: delete through Base* is now defined
    virtual int id() const = 0;
};

struct Derived : Base {
    int id() const override { return 42; }
};

// [[noreturn]] / std::unreachable document "control never gets here".
int signOf(int x) {
    if (x > 0) {
        return 1;
    }
    if (x < 0) {
        return -1;
    }
    return 0;                           // every path returns: no UB
}

int main() {
    std::unique_ptr<Base> b = std::make_unique<Derived>();
    assert(b->id() == 42);              // Derived's destructor runs correctly at scope end
    assert(signOf(-7) == -1 && signOf(0) == 0);

    int i = 0;
    i = i++ + 1;                        // defined since C++17 (still bad style): i == 1
                                        // GCC still warns with -Wsequence-point: good, don't write this
    assert(i == 1);
    std::printf("class and sequencing examples are well-defined\n");
    return 0;
}
```

> **Tip:** `-Wreturn-type` (on by default in GCC) catches most "flows off the end" bugs. Make it an error with `-Werror=return-type`.

### 2.5 Library preconditions

The standard library has many preconditions. Breaking one is UB, even though it looks like a "normal" call:

| Call | Precondition |
|---|---|
| `v[i]`, `s[i]` | `i < size()` (`at(i)` checks and throws) |
| `v.front()`, `v.back()`, `v.pop_back()` | the container is not empty |
| `*opt` (`std::optional`) | it holds a value (`value()` checks and throws) |
| `std::sort(first, last, comp)` | `comp` is a **strict weak ordering** |
| `std::lower_bound`, `binary_search` | the range is sorted (partitioned) by the same comparator |
| `std::memcpy(dst, src, n)` | the ranges don't overlap (use `memmove`); pointers valid even when `n == 0` |
| `std::string_view(p)` | `p` is not null |
| `std::unique_ptr::operator*` | the pointer is not null |
| `std::thread` destructor | must be joined or detached, otherwise `std::terminate` (defined, but fatal) |

A comparator using `<=` breaks strict weak ordering, because `comp(a, a)` must be false. With `std::sort` this can read out of bounds and crash on large inputs.

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <stdexcept>
#include <string>
#include <tuple>
#include <vector>

struct Employee {
    std::string name;
    int age;
};

int main() {
    std::vector<Employee> staff = {{"Ana", 30}, {"Bo", 25}, {"Cy", 30}, {"Di", 25}};

    // WRONG (UB): [](auto& a, auto& b) { return a.age <= b.age; }   -- comp(a, a) is true
    // RIGHT: strict "less than". Compare several fields with std::tie (lexicographic).
    std::sort(staff.begin(), staff.end(), [](const Employee& a, const Employee& b) {
        return std::tie(a.age, a.name) < std::tie(b.age, b.name);
    });

    assert(staff[0].name == "Bo" && staff[1].name == "Di" && staff[3].name == "Cy");

    // Checked access when the index is not proven to be in range.
    try {
        (void)staff.at(10);
    } catch (const std::out_of_range&) {
        std::printf("at(10) threw out_of_range instead of UB\n");
    }
    return 0;
}
```

### 2.6 Concurrency

A **data race** happens when two threads access the same memory location without synchronisation and at least one access is a write. It is UB. It is not just "a lost update".

```cpp
// no-test (data race: UB)
int counter = 0;
std::thread t([] { for (int i = 0; i < 100000; ++i) { ++counter; } });
for (int i = 0; i < 100000; ++i) { ++counter; }
t.join();
```

Built without sanitizers, two runs printed `173827` and `120961` instead of 200000. ThreadSanitizer (`-fsanitize=thread`) names the exact lines:

```text
WARNING: ThreadSanitizer: data race (pid=3641)
  Read of size 4 at 0x55c098da701c by main thread:
    #0 main c.cpp:6
  Previous write of size 4 at 0x55c098da701c by thread T1:
    #0 operator() c.cpp:5
```

```cpp
#include <atomic>
#include <cassert>
#include <cstdio>
#include <mutex>
#include <thread>

int main() {
    // Fix 1: std::atomic for a single shared value.
    std::atomic<int> counter{0};
    std::thread t([&] {
        for (int i = 0; i < 100000; ++i) {
            counter.fetch_add(1, std::memory_order_relaxed);   // relaxed is enough for a pure counter
        }
    });
    for (int i = 0; i < 100000; ++i) {
        counter.fetch_add(1, std::memory_order_relaxed);
    }
    t.join();
    assert(counter.load() == 200000);

    // Fix 2: a mutex when several values must change together.
    std::mutex m;
    long total = 0;
    long items = 0;
    auto work = [&] {
        for (int i = 0; i < 1000; ++i) {
            std::lock_guard<std::mutex> lock(m);
            total += i;
            items += 1;              // invariant: both updated atomically as a pair
        }
    };
    std::thread a(work);
    std::thread b(work);
    a.join();
    b.join();
    assert(items == 2000 && total == 2 * 499500);

    std::printf("counter = %d, items = %ld\n", counter.load(), items);
    return 0;
}
```

> **Danger (embedded):** `volatile` is **not** synchronisation. It stops the compiler from caching a variable in a register, which you need for memory-mapped registers and for flags shared with an ISR on a single core. It does not give atomicity or ordering between threads. Use `std::atomic` (or disable interrupts around the access) for data shared with an ISR or another core.

---

## 3. Why optimisers make UB scary

The compiler reasons: "this program has no UB, so whatever path would lead to UB is never taken." Three classic consequences follow.

### 3.1 Overflow checks get folded away

```cpp
// no-test (relies on UB)
bool will_overflow(int x) { return x + 1 < x; }   // "x + 1 can't overflow" => always false
```

These are real results for `will_overflow(INT_MAX)` with GCC 13 and the same source file:

| Build | Result |
|---|---|
| `g++ -O0` | `0` (the expression is folded to `false` even without optimisation) |
| `g++ -O2` | `0` |
| `g++ -O1 -fsanitize=undefined` | `1`, plus `runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'` |

One program with three behaviours. That is what "no requirements" means. Write the check *before* the operation (`x == INT_MAX`), or use `__builtin_add_overflow`.

### 3.2 Null checks get deleted

```cpp
// no-test (illustration)
void process(int* p) {
    int v = *p;          // dereference: compiler may now assume p != nullptr
    if (!p) {            // ...so this check is "dead" and GCC's -fdelete-null-pointer-checks removes it
        return;
    }
    use(v);
}
```

This pattern caused a real Linux kernel vulnerability (CVE-2009-1897, in the tun driver). The kernel now builds with `-fno-delete-null-pointer-checks`. The fix is to check before you dereference.

### 3.3 Loops change shape

```cpp
// no-test (UB: a[8] is out of bounds on the last iterations)
int a[8];
for (int i = 0; i < 10; ++i) { a[i] = i; }
```

Accessing `a[8]` is UB, so the compiler may conclude that `i < 8` holds whenever the body runs. It can then drop the `i < 10` test and produce an **infinite loop**, or write over neighbouring variables. Similarly, `for (int i = 0; i <= n; i += 2)` can loop forever when `n == INT_MAX`. Because overflow "can't happen", the compiler is also free to widen `i` to 64 bits.

### 3.4 Time travel

UB doesn't have to "happen at the line". The standard says that if any execution contains UB, the **whole execution** has no requirements, including the parts *before* the UB. In practice the compiler may hoist, merge or delete code on paths that lead to UB. A `printf` placed just before a null dereference may never appear.

---

## 4. Tools that catch UB

| Tool | Flag | Catches | Overhead |
|---|---|---|---|
| UndefinedBehaviorSanitizer | `-fsanitize=undefined` | signed overflow, bad shifts, misaligned access, null deref, some bounds, invalid enum/bool loads, float→int overflow (`-fsanitize=float-cast-overflow`) | low (~1.2×) |
| AddressSanitizer | `-fsanitize=address` | out-of-bounds (heap/stack/global), use-after-free, double free, use-after-return, leaks (LeakSanitizer) | ~2×, more memory |
| ThreadSanitizer | `-fsanitize=thread` | data races, some deadlocks | 5–15× |
| MemorySanitizer (Clang only) | `-fsanitize=memory` | reads of uninitialised memory | ~3× |
| Warnings | `-Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wnull-dereference` | many issues at compile time | none |
| Static analysis | clang-tidy, cppcheck, Clang Static Analyzer, PVS-Studio, Coverity | path-sensitive patterns | build time |
| Hardened library | `-D_GLIBCXX_ASSERTIONS` (libstdc++), `-D_LIBCPP_HARDENING_MODE=...` (libc++), MSVC `_ITERATOR_DEBUG_LEVEL` | `operator[]` bounds, `front()` on empty, null `optional` deref | small |
| Constant evaluation | `constexpr` + `static_assert` | **any** core-language UB is a compile error | none at run time |
| Valgrind (Memcheck) | `valgrind ./a.out` | memory errors, uninitialised reads, without recompiling | 20–50× |

ASan and TSan can't be combined in one build. A typical CI setup has three jobs: `address,undefined`, then `thread`, then (with Clang) `memory`.

```bash
g++ -std=c++20 -g -O1 -fno-omit-frame-pointer -fsanitize=address,undefined main.cpp -o app && ./app
```

```bash
UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1 ./app
```

```bash
g++ -std=c++20 -g -O1 -fsanitize=thread main.cpp -o app_tsan && ./app_tsan
```

```bash
g++ -std=c++20 -O2 -D_GLIBCXX_ASSERTIONS main.cpp -o app_hardened
```

> **Tip:** By default UBSan *prints and continues*. Use `-fno-sanitize-recover=all` (or `halt_on_error=1`) so that UB fails your tests instead of scrolling past in a log.

### 4.1 `constexpr` turns UB into compile errors

During constant evaluation the compiler **must** diagnose core-language UB: overflow, out-of-bounds access, null dereference, use after lifetime. That makes `static_assert` tests a free UB checker for pure functions:

```cpp
#include <array>
#include <cstdio>

constexpr int sumFirst(const std::array<int, 4>& values, int count) {
    int total = 0;
    for (int i = 0; i < count; ++i) {
        total += values[static_cast<std::size_t>(i)];   // out of range would be UB...
    }
    return total;
}

constexpr int square(int x) {
    return x * x;
}

constexpr std::array<int, 4> kData = {1, 2, 3, 4};

static_assert(sumFirst(kData, 4) == 10);
static_assert(square(46340) == 2147395600);     // fits in int
// static_assert(sumFirst(kData, 5) == 10);     // ERROR: read past the end in a constant expression
// static_assert(square(46341) > 0);            // ERROR: signed overflow is not a constant expression

int main() {
    std::printf("constexpr checks passed: %d %d\n", sumFirst(kData, 4), square(46340));
    return 0;
}
```

---

## 5. Lifetime subtleties

### 5.1 Temporaries and views

A **temporary** lives until the end of the full-expression (the `;`), with one exception: binding it directly to a `const T&` or `T&&` **local** extends its lifetime. The extension does *not* carry through function calls, members of a returned object, or views:

```cpp
// no-test (the last three lines dangle)
const std::string& r = std::string("abc").substr(1);   // OK: the prvalue from substr binds directly, so its life is extended
std::string_view sv = std::string("abc");              // DANGLES: string_view is not a reference
const auto& first = makeVector()[0];                   // DANGLES: operator[] returns a reference into the temporary
for (char c : getConfig().name()) { }                  // DANGLES before C++23 if name() returns a reference into the temporary
```

C++23 (P2718) extends the lifetime of temporaries in the range-initialiser of a range-`for` loop, which fixes the last case.

```cpp
#include <cassert>
#include <cstdio>
#include <string>
#include <string_view>
#include <vector>

std::vector<int> makeVector() {
    return {10, 20, 30};
}

std::string makeName() {
    return "temporary name";
}

int main() {
    // Lifetime extension: the temporary returned by makeName() lives as long as `name`.
    const std::string& name = makeName();
    assert(name == "temporary name");

    // Copy out of a temporary instead of referencing into it.
    int first = makeVector()[0];          // a copy, so no dangling
    assert(first == 10);

    // Keep the owner alive for as long as the view is used.
    std::string owner = makeName();
    std::string_view view = owner;
    assert(view.substr(0, 9) == "temporary");

    std::printf("lifetime rules respected: %s / %d\n", name.c_str(), first);
    return 0;
}
```

### 5.2 Object lifetime and storage reuse

- An object's lifetime ends when its destructor starts. Calling member functions after that is UB.
- Constructing a new object in the old storage with placement-new is fine. To reach it through the *old* pointer you need `std::launder` when the type has const or reference members (rare, mostly in library code).
- Since C++20, **implicit-lifetime types** (scalars, arrays, aggregates with trivial destructors) are created implicitly by `malloc`, `memcpy` and `std::start_lifetime_as` (C++23). Code like `S* s = (S*)malloc(sizeof(S)); s->a = 1;` was technically UB before C++20 and is fine now.

```cpp
#include <cassert>
#include <cstdio>
#include <new>
#include <string>

struct Message {
    std::string text;
    int priority;
};

int main() {
    // Manual lifetime control, as in std::optional / std::vector internals.
    alignas(Message) unsigned char storage[sizeof(Message)];

    Message* m = new (storage) Message{"hello", 1};   // lifetime begins
    assert(m->text == "hello");
    m->~Message();                                     // lifetime ends; *m must not be used now

    m = new (storage) Message{"again", 2};             // new object in the same storage
    assert(m->priority == 2);                          // using the pointer returned by new is always OK
    m->~Message();

    std::printf("placement-new lifetime handled correctly\n");
    return 0;
}
```

---

## 6. UB in embedded and systems code

| Pattern | Why it's UB / wrong | Fix |
|---|---|---|
| `*(uint32_t*)(buf + 1)` on a packet | misaligned + strict aliasing; HardFault on Cortex-M0 | `memcpy` or byte shifts |
| Flag shared with an ISR as a plain `bool` | the compiler may hoist the read out of the loop (data race) | `std::atomic<bool>` / `volatile` + single-core reasoning |
| `1 << 31` on a 32-bit `int` | UB in C and before C++14; implementation-defined in C++14/17 | `1u << 31`, or `UINT32_C(1) << 31` |
| Deep recursion on a small stack | stack overflow (no diagnostic) | iterative algorithms, stack painting, `-fstack-usage` |
| `uint8_t` arithmetic overflowing `int` | promotion to `int`, then signed overflow (e.g. `uint16_t * uint16_t`) | cast to `uint32_t` first |
| Reading a register struct through a `union` | inactive-member read in C++ | `memcpy` / `bit_cast`, or write the driver in C |
| `memcpy(dst, nullptr, 0)` | UB in C up to C23 (fixed in C2y), and in C++ | guard `n > 0` or pass valid pointers |

---

## 7. Writing UB-free code — a checklist of habits

- Initialise everything: `int x{};`, `T* p = nullptr;`, and use `= default` members with initialisers.
- Prefer `.at()`, `std::span` and range-`for` over raw indexing; build debug/CI with `_GLIBCXX_ASSERTIONS`.
- Do bit manipulation on unsigned types; check signed arithmetic *before* operating (`__builtin_*_overflow`, `ckd_add`).
- Type-pun only with `std::bit_cast` or `memcpy`.
- Own memory with RAII and smart pointers; never mix `new[]` with `delete`.
- Give polymorphic bases a virtual destructor.
- Don't hold references, pointers or iterators across container modifications.
- Use strict weak orderings (`<`, `std::tie(...) < std::tie(...)`) in comparators.
- Share data between threads only through `std::atomic`, mutexes or message queues.
- Run the test suite under ASan+UBSan and under TSan in CI, with `-fno-sanitize-recover`.
- Unit-test pure functions with `static_assert` so the compiler checks them for UB.

---

## 8. Interview checklist

- [ ] Define undefined vs unspecified vs implementation-defined, with an example of each.
- [ ] List ten UB sources: null/dangling/out-of-bounds, use-after-free, double free, uninitialised read, signed overflow, bad shift, division by zero, strict aliasing, data race, missing return, comparator violations.
- [ ] Explain how optimisers exploit UB: deleted null checks, folded overflow checks, infinite loops, "time travel".
- [ ] Know the C++17 sequencing changes (`i = i++`, `f(i++, i++)`) and the C++20 changes (two's complement, shifts).
- [ ] Iterator invalidation rules for `vector`, `deque`, `list`/`map`, `unordered_*`.
- [ ] Safe alternatives: `__builtin_add_overflow`, unsigned shifts, `bit_cast`/`memcpy`, `erase_if`, atomics.
- [ ] Which sanitizer finds what; why ASan and TSan need separate builds; `constexpr` as a UB detector.
- [ ] Embedded specifics: alignment faults, ISR flags, `volatile` vs atomic, stack overflow.

---

## Practice

1. For each line, say whether it is UB, unspecified, implementation-defined or fine (assume 32-bit `int`, C++20): (a) `int x = INT_MAX; x++;` (b) `unsigned u = 0; u--;` (c) `char c = 200;` (d) `int y = -8 >> 1;` (e) `printf("%d %d", f(), g());` (f) `int z = 1 << 31;`
2. This function is supposed to return `true` if `a + b` overflows. Why is it broken, and how do you fix it? `bool overflows(int a, int b) { return a + b < a; }`
3. Find the UB and fix it:
   ```cpp
   // no-test (contains a bug)
   std::vector<int> v = {1, 2, 3, 4};
   for (auto it = v.begin(); it != v.end(); ++it) {
       if (*it == 2) { v.erase(it); }
   }
   ```
4. Write `std::uint32_t parseU32BE(const unsigned char* p)` that reads a big-endian 32-bit value from a possibly misaligned buffer, with no UB.
5. Why can `std::sort(v.begin(), v.end(), [](int a, int b) { return a <= b; });` crash? Give the rule it breaks and a correct comparator.

:::details Show solution
1. (a) **UB** (signed overflow). (b) **Fine**: unsigned wraps to `UINT_MAX`. (c) **Fine since C++20**. It is a conversion, not overflow: if `char` is signed the value is −56 (modular since C++20, implementation-defined before); if unsigned, 200. Signedness of `char` is implementation-defined. (d) **Fine since C++20**: an arithmetic shift, giving −4 (implementation-defined before). (e) **Unspecified** order of `f()` and `g()`, but no UB. (f) **Fine since C++20** (`INT_MIN`), implementation-defined in C++14/17 and UB in C++11/C. Prefer `1u << 31`.
2. The overflow itself is UB, so the compiler may assume `a + b < a` is equivalent to `b < 0` and the "check" no longer tests overflow. Test before adding:
```cpp
#include <cassert>
#include <climits>

bool overflows(int a, int b) {
    if (b > 0) {
        return a > INT_MAX - b;
    }
    return a < INT_MIN - b;
}

bool overflowsBuiltin(int a, int b) {
    int ignored = 0;
    return __builtin_add_overflow(a, b, &ignored);
}

int main() {
    assert(overflows(INT_MAX, 1) && overflows(INT_MIN, -1));
    assert(!overflows(100, -200) && !overflows(INT_MAX, 0));
    assert(overflowsBuiltin(INT_MAX, 1) && !overflowsBuiltin(1, 1));
    return 0;
}
```
3. `erase(it)` invalidates `it`, and the loop then increments it: UB. Use the returned iterator, or `std::erase`:
```cpp
#include <cassert>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3, 4};
    for (auto it = v.begin(); it != v.end();) {
        if (*it == 2) {
            it = v.erase(it);
        } else {
            ++it;
        }
    }
    assert((v == std::vector<int>{1, 3, 4}));

    std::vector<int> w = {1, 2, 3, 4};
    std::erase(w, 2);                      // C++20: erase-remove in one call
    assert(w == v);
    return 0;
}
```
4.
```cpp
#include <cassert>
#include <cstdint>

std::uint32_t parseU32BE(const unsigned char* p) {
    // Byte-wise reads: no alignment requirement, no aliasing issue, endian-independent.
    return (static_cast<std::uint32_t>(p[0]) << 24) |
           (static_cast<std::uint32_t>(p[1]) << 16) |
           (static_cast<std::uint32_t>(p[2]) << 8) |
           static_cast<std::uint32_t>(p[3]);
}

int main() {
    const unsigned char buf[6] = {0x00, 0xDE, 0xAD, 0xBE, 0xEF, 0x00};
    assert(parseU32BE(buf + 1) == 0xDEADBEEFu);   // misaligned offset is fine
    return 0;
}
```
   The casts matter. `p[0] << 24` alone promotes `p[0]` to `int`, and `0xDE << 24` overflows a signed `int` (UB before C++20).
5. `std::sort` requires a **strict weak ordering**, so `comp(a, a)` must be `false`. With `<=` it is `true` for equal elements. The unguarded inner loops of introsort's partition step rely on the comparator to stop at a sentinel element, so they can run past the end of the array. Use `a < b`, or `std::greater<>{}` for descending order, and `std::tie` for multi-field keys.
:::

---

## Interview Q&A

- **Is `i = i++` UB?** In C, yes. In C++17 and later the right operand of `=` is sequenced before the left, so it's well-defined (but still terrible code).
- **Is unsigned overflow UB?** No — it wraps modulo 2ⁿ.
- **Why does my code work in debug but not release?** Classic sign of UB (or uninitialised memory / data races) exposed by optimisation.
- **What is the signedness of `char`?** Implementation-defined (signed on x86, unsigned on ARM Linux).
- **Name three UB sources in embedded code.** Unaligned access through cast pointers, a flag shared with an ISR without `volatile`/atomic (a data race), stack overflow, and shifting by the bit width or more.
- **What's the difference between undefined, unspecified and implementation-defined behaviour?** Undefined: no requirements at all. Unspecified: one of several allowed outcomes, not documented (argument evaluation order). Implementation-defined: one outcome the compiler must document (`sizeof(long)`).
- **Why doesn't the compiler just warn about every UB?** Most UB depends on run-time values (is this index in range? does this add overflow?). The optimiser doesn't "detect" UB. It *assumes* it is absent, so there is nothing to warn about. Sanitizers check at run time instead.
- **How can a null check disappear?** If the pointer was dereferenced earlier, the compiler infers that it is non-null (otherwise the program had UB) and removes the later check as dead code.
- **What is the strict aliasing rule?** You may only access an object through its own type (or its signed/unsigned variant), or through `char`/`unsigned char`/`std::byte`. Use `std::bit_cast` or `memcpy` to reinterpret bits.
- **Which sanitizer would you use for a crash that only happens with several threads?** ThreadSanitizer for data races, in a separate build from ASan. Add ASan for the memory corruption the race may cause.
- **Is reading an uninitialised `int` still UB in C++26?** No. It becomes *erroneous behaviour*: the value is unspecified and implementations are encouraged to diagnose it, but the optimiser may no longer treat it as "can't happen". `[[indeterminate]]` opts back into the old behaviour.
- **Is converting `1e10` to `int` UB?** Yes. Converting a floating-point value whose truncated value doesn't fit in the target integer type is UB, and so is NaN. Check the range first. UBSan catches it with `-fsanitize=float-cast-overflow`.

---

## External resources

- **cppreference — Undefined behavior**, **Order of evaluation**, **Object lifetime**, **Iterator invalidation** (per-container tables).
- **John Regehr — "A Guide to Undefined Behavior in C and C++"** (blog series, Embedded in Academia).
- **Chris Lattner — "What Every C Programmer Should Know About Undefined Behavior"** (LLVM blog, 3 parts).
- **Raymond Chen — "Undefined behavior can result in time travel"** (The Old New Thing).
- **Clang docs — UndefinedBehaviorSanitizer, AddressSanitizer, ThreadSanitizer, MemorySanitizer.**
- **P2795 — Erroneous behaviour for uninitialized reads** (C++26) and **P2809 — Trivial infinite loops are not UB** (C++26).
