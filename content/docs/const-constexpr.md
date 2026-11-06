# const, constexpr, consteval, constinit

> **Key idea:** these keywords answer two different questions. **`const`** answers *"can this change?"* — it's a promise of immutability, checked by the compiler. **`constexpr`/`consteval`/`constinit`** answer *"when is this computed?"* — they move work from run time to **compile time**, which makes programs faster, catches errors earlier, and (on microcontrollers) lets data live in flash instead of RAM.

**What you'll be able to do after this guide**
- Apply `const` correctly to variables, pointers, references, parameters, return types and member functions.
- Explain logical vs bitwise constness, `mutable`, and `const_cast`'s rules.
- Write `constexpr` variables, functions, constructors and classes; know what's allowed in them.
- Choose between `constexpr`, `consteval`, `constinit` and `if consteval`.
- Use compile-time computation for lookup tables, validation and zero-cost configuration.

---

## 1. `const` variables

```cpp
#include <cstdio>

int main() {
    const int maxUsers = 100;          // must be initialised; can never change
    // maxUsers = 101;                 // error: assignment of read-only variable

    int n = 0;
    if (std::scanf("%d", &n) != 1) {   // a value only known at run time...
        n = 0;                         // (no input: fall back to 0)
    }
    const int runtimeConst = n * 2;    // ...can still be const: it just can't change after this line

    const double pi = 3.14159;
    std::printf("%d %d %.5f\n", maxUsers, runtimeConst, pi);
    return 0;
}
```

`const` means **read-only after initialisation** — it does **not** mean "known at compile time". `runtimeConst` above is const but computed at run time.

**Why bother?**
- The compiler stops accidental modification (a bug caught at compile time).
- It documents intent: readers know the value never changes after this point.
- Optimisers can keep const values in registers or fold them.
- `const` objects at namespace scope have **internal linkage** by default in C++ (each `.cpp` gets its own copy unless declared `extern` or `inline`).

---

## 2. `const` with pointers and references

Read right to left (see *Raw Pointers*):

| Declaration | Pointer can be reseated? | Pointee can be modified? |
|---|---|---|
| `int* p` | yes | yes |
| `const int* p` (= `int const* p`) | yes | **no** |
| `int* const p` | **no** | yes |
| `const int* const p` | no | no |
| `const int& r` | (references never reseat) | no |

```cpp
#include <cstdio>
#include <string>
#include <vector>

// Parameter passing with const:
void printAll(const std::vector<std::string>& names) {   // const&: no copy, can't modify the caller's vector
    for (const std::string& n : names) {                  // const& in loops: no copies of each string
        std::printf("%s ", n.c_str());
    }
    std::printf("\n");
}

void scale(std::vector<double>& values, const double factor) {   // `const double` by value: a local promise only
    for (double& v : values) {
        v *= factor;
    }
}

int main() {
    std::vector<std::string> names = {"ada", "grace"};
    printAll(names);
    std::vector<double> v = {1, 2, 3};
    scale(v, 2.0);
    std::printf("%.0f %.0f %.0f\n", v[0], v[1], v[2]);

    int x = 1;
    const int& view = x;          // a read-only VIEW of a modifiable object
    x = 5;                        // x itself can still change...
    std::printf("view sees %d\n", view);   // ...and the view sees it: const& means "I won't modify", not "it won't change"
    return 0;
}
```

> **Key:** a `const T&` parameter promises *the function* won't modify the argument — it doesn't promise *nobody else* will. Aliasing (another reference to the same object) can still change it.

`const` on a **by-value** parameter (`void f(const int x)`) is an implementation detail invisible to callers — the function signature is the same as `void f(int x)`. Some style guides use it in definitions for safety; it doesn't belong in declarations.

### `const` return values

- Returning `const T` by value (e.g. `const std::string f()`) is an outdated idiom: it **blocks move semantics** at the call site. Don't.
- Returning `const T&` gives read-only access to something that outlives the call (a member, a static).

---

## 3. `const` member functions

A `const` member function promises not to change the object's **observable state**. Inside it, `this` has type `const T*`.

```cpp
#include <cstdio>
#include <string>
#include <vector>

class Inventory {
public:
    void add(const std::string& item) { items.push_back(item); }      // non-const: modifies

    std::size_t count() const { return items.size(); }               // const: read-only

    // Overloading on const: const objects get read-only access, others can modify.
    std::string& at(std::size_t i) { return items[i]; }
    const std::string& at(std::size_t i) const { return items[i]; }

private:
    std::vector<std::string> items;
};

void report(const Inventory& inv) {
    std::printf("%zu items, first: %s\n", inv.count(), inv.at(0).c_str());   // calls the const overloads
    // inv.add("x");          // error: add() is not const
    // inv.at(0) = "y";       // error: the const at() returns const std::string&
}

int main() {
    Inventory inv;
    inv.add("apple");
    inv.at(0) = "banana";     // non-const at(): modifiable
    report(inv);
    return 0;
}
```

**Rule:** mark every member function that doesn't modify the object `const`. If you forget, your class can't be used through `const&` — and since `const&` is the standard way to pass objects, that makes it nearly unusable.

### Logical constness and `mutable`

Some members don't affect the object's *logical* value: caches, statistics counters, mutexes. Mark them `mutable` so `const` functions can update them.

```cpp
#include <cmath>
#include <cstdio>
#include <mutex>
#include <optional>

class Polygon {
public:
    explicit Polygon(double side) : side(side) {}

    double area() const {
        std::lock_guard<std::mutex> lock(m);           // locking a mutex modifies it: must be mutable
        if (!cachedArea) {
            std::printf("  (computing area)\n");
            cachedArea = side * side;                  // expensive computation, cached
        }
        return *cachedArea;
    }

    void setSide(double s) {
        std::lock_guard<std::mutex> lock(m);
        side = s;
        cachedArea.reset();                            // invalidate the cache when the real state changes
    }

private:
    double side;
    mutable std::optional<double> cachedArea;          // a cache: not part of the logical value
    mutable std::mutex m;
};

int main() {
    const Polygon p(3.0);
    std::printf("%.1f\n", p.area());
    std::printf("%.1f (cached)\n", p.area());
    return 0;
}
```

> **Interview:** `const` member functions should be **thread-safe for concurrent readers** — the standard library assumes it. If a `const` function mutates `mutable` members, protect them (mutex or atomics), as above.

### C++23: deducing `this` removes const/non-const duplication

```cpp
// c++23 — needs GCC 14+, Clang 18+ or MSVC 19.32+ with -std=c++23
#include <cstdio>
#include <string>
#include <vector>

class Inventory {
public:
    std::vector<std::string> items{"apple", "pear"};

    // One function template replaces the const and non-const overloads of at().
    template <typename Self>
    auto&& at(this Self&& self, std::size_t i) {
        return std::forward<Self>(self).items[i];      // const-ness follows the object
    }
};

int main() {
    Inventory inv;
    inv.at(0) = "banana";                                 // non-const object: modifiable
    const Inventory& view = inv;
    std::printf("%s %s\n", view.at(0).c_str(), view.at(1).c_str());   // const object: read-only
    return 0;
}
```

---

## 4. `const_cast` — and when it's undefined behaviour

`const_cast` removes (or adds) `const`. Its only legitimate use is calling an old API that forgot `const` on a parameter it doesn't actually modify. **Modifying an object that was originally defined `const` is undefined behaviour** — it might live in read-only memory.

```cpp
#include <cstdio>
#include <cstring>

// An old C API that takes char* but never modifies the string.
std::size_t legacyLength(char* s) {
    return std::strlen(s);
}

int main() {
    const char* message = "hello";
    std::size_t n = legacyLength(const_cast<char*>(message));   // OK: legacyLength doesn't write
    std::printf("%zu\n", n);

    int original = 5;                  // NOT const
    const int& view = original;
    const_cast<int&>(view) = 6;        // OK: the underlying object isn't const
    std::printf("%d\n", original);

    // const int truly = 5;
    // const_cast<int&>(truly) = 6;    // UB: the object itself is const (may crash, or the compiler may assume 5)
    return 0;
}
```

---

## 5. `constexpr` variables

A `constexpr` variable is `const` **and** must be initialised with a constant expression — its value is known at compile time, so it can be used where the language requires constants: array sizes, template arguments, `case` labels, `static_assert`.

```cpp
#include <array>
#include <cstdio>

constexpr int kBufferSize = 64;                 // a true compile-time constant
constexpr double kPi = 3.141592653589793;
constexpr double kTwoPi = 2 * kPi;              // computed by the compiler

int main() {
    std::array<int, kBufferSize> buffer{};      // template argument: must be a constant
    char scratch[kBufferSize / 2];              // array bound: must be a constant
    static_assert(kBufferSize % 8 == 0, "buffer must be a multiple of 8");

    int mode = 2;
    switch (mode) {
        case kBufferSize / 32: {                // case label: must be a constant
            std::printf("mode two\n");
            break;
        }
        default: {
            break;
        }
    }
    scratch[0] = 0;
    std::printf("%zu %.4f %d\n", buffer.size(), kTwoPi, scratch[0]);
    return 0;
}
```

`constexpr` replaces `#define` constants in C++: it's typed, scoped, debuggable and respects namespaces.

```cpp
// no-test (comparison)
#define BUFFER_SIZE 64                 // C style: no type, no scope, textual replacement
constexpr int kBufferSize = 64;        // C++ style
inline constexpr int kShared = 64;     // C++17: one shared definition across all .cpp files (use in headers)
```

---

## 6. `constexpr` functions

A `constexpr` function **can** be evaluated at compile time if called with constant arguments in a context that needs a constant; otherwise it simply runs at run time like a normal function. One function, two uses.

```cpp
#include <cstdio>

constexpr unsigned long long fib(unsigned n) {
    unsigned long long a = 0;
    unsigned long long b = 1;
    for (unsigned i = 0; i < n; i++) {         // loops, locals and branches are fine (C++14+)
        unsigned long long next = a + b;
        a = b;
        b = next;
    }
    return a;
}

constexpr bool isPrime(unsigned n) {
    if (n < 2) {
        return false;
    }
    for (unsigned d = 2; d * d <= n; d++) {
        if (n % d == 0) {
            return false;
        }
    }
    return true;
}

int main() {
    constexpr auto f50 = fib(50);              // forced compile-time evaluation (constexpr variable)
    static_assert(f50 == 12586269025ULL);
    static_assert(isPrime(97) && !isPrime(91));

    unsigned n = 0;
    if (std::scanf("%u", &n) != 1) {            // unknown at compile time...
        n = 10;
    }
    std::printf("fib(50) = %llu, fib(%u) = %llu (run time)\n", f50, n, fib(n));   // ...so this runs normally
    return 0;
}
```

### What's allowed in a `constexpr` function (it grew every standard)

| Standard | Additions |
|---|---|
| C++11 | essentially a single `return` statement |
| C++14 | loops, local variables, multiple statements, mutation of locals |
| C++17 | `if constexpr`, constexpr lambdas |
| C++20 | `try`/`catch` blocks (but no throwing at compile time), virtual functions, `std::vector`/`std::string` with transient allocation (`new`/`delete` that's freed before the end of evaluation), `std::is_constant_evaluated()` |
| C++23 | `static constexpr` locals, non-literal variables in unevaluated paths, `if consteval` |

Not allowed during **compile-time** evaluation: undefined behaviour (signed overflow, out-of-bounds — the compiler must reject it, which makes `static_assert`-based tests a great UB detector), calling non-constexpr functions, `reinterpret_cast`, I/O.

```cpp
#include <cstdio>
#include <vector>

constexpr int sumOfSquares(int n) {
    std::vector<int> squares;                 // C++20: a vector inside a constexpr function
    for (int i = 1; i <= n; i++) {
        squares.push_back(i * i);
    }
    int total = 0;
    for (int s : squares) {
        total += s;
    }
    return total;                             // the vector is destroyed before evaluation ends: allowed
}

constexpr int overflowAtCompileTime() {
    int x = 2147483647;
    return x + 1;                             // signed overflow: UB
}

int main() {
    static_assert(sumOfSquares(10) == 385);
    // constexpr int bad = overflowAtCompileTime();   // ERROR at compile time: "overflow in constant expression"
    std::printf("%d\n", sumOfSquares(3));
    return 0;
}
```

### `constexpr` constructors and literal classes

```cpp
#include <cstdio>

class Vec2 {
public:
    constexpr Vec2(double x, double y) : x(x), y(y) {}
    constexpr Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    constexpr double dot(const Vec2& o) const { return x * o.x + y * o.y; }
    constexpr double getX() const { return x; }
private:
    double x;
    double y;
};

constexpr Vec2 kOrigin{0, 0};
constexpr Vec2 kUnitX{1, 0};
constexpr Vec2 kDiagonal = kUnitX + Vec2{0, 1};      // computed at compile time
static_assert(kDiagonal.dot(kDiagonal) == 2.0);

int main() {
    std::printf("%.1f %.1f\n", kDiagonal.getX(), kOrigin.dot(kUnitX));
    return 0;
}
```

---

## 7. `consteval` — must run at compile time (C++20)

A `consteval` function is an **immediate function**: every call must produce a compile-time constant. Use it when running at run time would be a mistake — e.g. validating format strings, computing hashes of string literals, unit conversions in configuration.

```cpp
#include <cstdint>
#include <cstdio>
#include <string_view>

// FNV-1a hash of a string literal, guaranteed to be computed by the compiler.
consteval std::uint32_t hashLiteral(std::string_view s) {
    std::uint32_t h = 2166136261u;
    for (char c : s) {
        h ^= static_cast<unsigned char>(c);
        h *= 16777619u;
    }
    return h;
}

std::uint32_t hashRuntime(std::string_view s) {      // the same algorithm for run-time strings
    std::uint32_t h = 2166136261u;
    for (char c : s) {
        h ^= static_cast<unsigned char>(c);
        h *= 16777619u;
    }
    return h;
}

void handleCommand(std::string_view cmd) {
    switch (hashRuntime(cmd)) {
        case hashLiteral("start"): {                  // case labels computed at compile time
            std::printf("starting\n");
            break;
        }
        case hashLiteral("stop"): {
            std::printf("stopping\n");
            break;
        }
        default: {
            std::printf("unknown command\n");
            break;
        }
    }
}

consteval int checkedPercent(int p) {
    if (p < 0 || p > 100) {
        throw "percent out of range";                 // a throw in consteval = compile ERROR, not a run-time exception
    }
    return p;
}

int main() {
    handleCommand("start");
    handleCommand("stop");
    handleCommand("jump");
    constexpr int ok = checkedPercent(75);
    // constexpr int bad = checkedPercent(150);     // compile error: the throw is reached at compile time
    std::printf("percent %d\n", ok);
    return 0;
}
```

| | `constexpr` function | `consteval` function |
|---|---|---|
| Can run at compile time | yes | yes — always |
| Can run at run time | yes | **no** (calling with run-time values is an error) |
| Typical use | general utilities usable both ways | validation, literal processing, guaranteed zero run-time cost |

### `if consteval` / `std::is_constant_evaluated()`

Sometimes you want different code for compile time (portable, simple) and run time (fast intrinsics, SIMD, logging):

```cpp
#include <cmath>
#include <cstdio>
#include <type_traits>

constexpr double mySqrt(double x) {
    if (std::is_constant_evaluated()) {           // C++20 (C++23: `if consteval { ... }`)
        double guess = x > 1 ? x : 1;             // Newton's method: usable by the compiler
        for (int i = 0; i < 60; i++) {
            guess = 0.5 * (guess + x / guess);
        }
        return guess;
    }
    return std::sqrt(x);                          // run time: the hardware instruction
}

int main() {
    constexpr double c = mySqrt(2.0);             // compile-time path
    double r = mySqrt(2.0);                       // run-time path
    std::printf("%.12f %.12f\n", c, r);
    return 0;
}
```

---

## 8. `constinit` — initialise at compile time, but stay mutable (C++20)

`constinit` guarantees a **static or thread-local** variable is initialised at compile time (no dynamic initialisation, so no static-initialisation-order problems) — but unlike `constexpr`, the variable is **not const**; you can change it later.

```cpp
#include <cstdio>

constexpr int initialLimit() {
    return 100;
}

constinit int requestLimit = initialLimit();   // initialised by the compiler: no "static init order fiasco"
constinit thread_local int perThreadCounter = 0;
// constinit int bad = std::rand();            // error: not a constant initialiser

int main() {
    requestLimit += 50;                         // constinit variables are mutable
    perThreadCounter++;
    std::printf("limit %d, counter %d\n", requestLimit, perThreadCounter);
    return 0;
}
```

---

## 9. Summary table

| Keyword | Applies to | Immutable? | Compile-time? |
|---|---|---|---|
| `const` | variables, pointers, references, member functions | yes | not necessarily |
| `constexpr` variable | variables | yes (implies const) | **yes, required** |
| `constexpr` function | functions, constructors, lambdas | — | *possible* (compile or run time) |
| `consteval` | functions | — | **always** |
| `constinit` | static / thread_local variables | **no** | initialisation only |
| `mutable` | data members | opts out of const | — |
| `if consteval` / `is_constant_evaluated()` | inside functions | — | branch on the evaluation context |

---

## 10. Compile-time computation in practice

### Lookup tables in flash (embedded)

```cpp
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>

// A 256-entry sine table for a waveform generator, computed entirely by the compiler.
// On a microcontroller, a constexpr/const table like this is placed in flash (.rodata), not RAM.
constexpr std::array<std::int16_t, 256> makeSineTable() {
    std::array<std::int16_t, 256> table{};
    for (int i = 0; i < 256; i++) {
        // Taylor-series sine (std::sin is only constexpr from C++26).
        double x = 2.0 * 3.141592653589793 * i / 256.0 - 3.141592653589793;
        double term = x;
        double s = x;
        for (int k = 1; k < 12; k++) {
            term *= -x * x / ((2 * k) * (2 * k + 1));
            s += term;
        }
        table[i] = static_cast<std::int16_t>(-s * 32767.0);      // sin(x - pi) = -sin(x)
    }
    return table;
}

constexpr auto kSine = makeSineTable();

int main() {
    std::printf("sin samples: [0]=%d [64]=%d [128]=%d [192]=%d\n", kSine[0], kSine[64], kSine[128], kSine[192]);
    std::printf("check against std::sin at 64: %d\n", static_cast<int>(std::sin(2 * 3.141592653589793 * 64 / 256) * 32767));
    return 0;
}
```

### Compile-time validation

```cpp
#include <cstdio>
#include <string_view>

// Reject malformed configuration at compile time.
consteval std::string_view checkedPin(std::string_view pin) {
    if (pin.size() < 2 || pin[0] != 'P' || pin[1] < 'A' || pin[1] > 'H') {
        throw "pin must look like PA0..PH15";
    }
    return pin;
}

struct LedConfig {
    std::string_view pin;
    int brightness;
};

constexpr LedConfig kStatusLed{checkedPin("PB7"), 80};
// constexpr LedConfig kBad{checkedPin("X9"), 80};   // compile error

int main() {
    std::printf("status LED on %.*s at %d%%\n", static_cast<int>(kStatusLed.pin.size()), kStatusLed.pin.data(),
                kStatusLed.brightness);
    return 0;
}
```

---

## 11. Interview checklist

- [ ] `const` = immutable after initialisation, not necessarily compile-time.
- [ ] `const` placement with pointers; `const&` parameters; no `const` by-value returns.
- [ ] `const` member functions, overloading on const, `mutable` for caches/mutexes, thread safety of const.
- [ ] `const_cast` rules: modifying a truly const object is UB.
- [ ] `constexpr` variables vs functions; what's allowed per standard.
- [ ] `consteval`, `constinit`, `if consteval`.
- [ ] Practical uses: lookup tables in flash, validation, replacing macros.

---

## Practice

1. Write `constexpr int countBits(unsigned x)` and use it in a `static_assert` for several values.
2. Make this class const-correct: `class Temperature { double c; public: double get(); void set(double v); double fahrenheit(); };`
3. Write a `consteval` function `parseHex(std::string_view)` that converts `"FF"` to 255 at compile time and rejects invalid characters.
4. What's wrong here? `const std::vector<int> makeData() { return {1, 2, 3}; } std::vector<int> v = makeData();`
5. Explain the difference: `const int a = 10;` vs `constexpr int b = 10;` vs `constinit int c = 10;` (at namespace scope).

:::details Show solution
1.
```cpp
constexpr int countBits(unsigned x) {
    int count = 0;
    while (x != 0) {
        x &= x - 1;              // clear the lowest set bit
        count++;
    }
    return count;
}

static_assert(countBits(0) == 0);
static_assert(countBits(0b1011) == 3);
static_assert(countBits(0xFFFFFFFFu) == 32);

int main() {
    return 0;
}
```
2. `double get() const;`, `double fahrenheit() const;` (they only read), `void set(double v);` stays non-const. Optionally `[[nodiscard]]` on the getters.
3.
```cpp
#include <string_view>

consteval unsigned parseHex(std::string_view s) {
    unsigned value = 0;
    for (char c : s) {
        unsigned digit;
        if (c >= '0' && c <= '9') {
            digit = c - '0';
        } else if (c >= 'A' && c <= 'F') {
            digit = c - 'A' + 10;
        } else if (c >= 'a' && c <= 'f') {
            digit = c - 'a' + 10;
        } else {
            throw "invalid hex digit";      // makes the call a compile error
        }
        value = value * 16 + digit;
    }
    return value;
}

static_assert(parseHex("FF") == 255 && parseHex("1a2B") == 0x1A2B);

int main() {
    return 0;
}
```
4. Returning `const std::vector<int>` by value prevents moving from the returned temporary in some contexts (e.g. `v = makeData();` must **copy** because you can't move from a const rvalue). Return plain `std::vector<int>`.
5. `a`: immutable; initialised at compile time here because the initialiser is constant (usable in constant expressions since it's an integral const with a constant initialiser), internal linkage. `b`: same but *guaranteed* compile-time and usable anywhere a constant is needed, for any literal type. `c`: guaranteed compile-time **initialisation** but **mutable** afterwards; external linkage like any non-const global.
:::

---

## Interview Q&A

- **Difference between `const` and `constexpr`?** `const` = immutable, maybe runtime-initialised. `constexpr` = compile-time constant (variables) / compile-time-capable (functions).
- **Can a `constexpr` function run at runtime?** Yes, when its arguments aren't constant or the context doesn't require a constant.
- **What does `const` after a member function mean?** `this` is a pointer-to-const; the function can't modify non-mutable members and can be called on const objects.
- **Why might `const` data save RAM on an MCU?** The linker can place it in flash (`.rodata`) instead of copying it to RAM.
- **What's the point of `constinit`?** Eliminating dynamic initialisation of globals (and its ordering problems) without making them const.
- **What's the difference between `constexpr` and `consteval` functions?** A `constexpr` function may run at compile time or run time; a `consteval` function must always produce a compile-time constant.
- **When is using `const_cast` undefined behaviour?** When you modify an object that was originally declared `const`; removing const from a view of a non-const object is fine.
- **What is `mutable` for?** Members that don't affect the object's logical state (caches, counters, mutexes) so they can be updated inside `const` member functions.
- **Why should `const` member functions be thread-safe?** Callers (and the standard library) assume concurrent calls to const functions are safe, so any `mutable` state they touch must be synchronised.
- **Why not return `const T` by value?** It prevents the caller from moving from the returned temporary, forcing copies.
- **What happens if a `constexpr` evaluation hits undefined behaviour?** In a constant-expression context the compiler must reject it with an error, which makes `static_assert` tests a UB detector.

---

## External resources

- **cppreference — `const`/`volatile` qualifiers, `constexpr` specifier, `consteval`, `constinit`, `std::is_constant_evaluated`.**
- **C++ Core Guidelines — Con.1–Con.5 (constants and immutability), F.4 ("if a function might be evaluated at compile time, declare it constexpr").**
- **Jason Turner — "constexpr ALL the Things!"** (CppCon 2017 talk, with Ben Deane) and C++ Weekly episodes on constexpr.
- **Herb Sutter — "You don't know const and mutable"** (talk/blog): const and thread safety.
- **Scott Meyers — *Effective Modern C++*, Items 15 (use constexpr) and 16 (make const member functions thread safe).**
