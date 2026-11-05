# const, constexpr, consteval, constinit

C++ has four "const-ish" keywords with distinct meanings. Getting them right is a marker of a modern C++ developer.

| Keyword | Applies to | Meaning |
|---|---|---|
| `const` | variables, member functions, pointers | read-only after initialisation (may be a runtime value) |
| `constexpr` | variables, functions, `if` | *can* be evaluated at compile time (variables: *must* be) |
| `consteval` (C++20) | functions | *must* be evaluated at compile time ("immediate function") |
| `constinit` (C++20) | static/thread-local variables | must be **initialised** at compile time, but is mutable afterwards |

## 1. `const`

```cpp
const int limit = read_config();     // runtime value, but can't change afterwards
const std::string& name = person.name();   // read-only view

void print(const std::vector<int>& v);     // won't modify the caller's vector

class Sensor {
    mutable std::mutex m_;           // modifiable in const member functions
    int value_ = 0;
public:
    int value() const {              // callable on const Sensor&
        std::lock_guard lk(m_);
        return value_;
    }
};
```

### const and pointers (read right to left)

```cpp
const int* a;        // pointer to const int
int* const b = &x;   // const pointer to int
const int* const c = &x;
```

### Const-correctness pays off

- Documents intent; the compiler enforces it.
- Lets functions accept temporaries (`const T&` binds rvalues).
- Enables placing data in **flash/ROM** on microcontrollers: `const uint8_t lut[256] = {...};` goes to `.rodata` instead of consuming RAM.

### Top-level vs low-level const

```cpp
void f(const int x);     // top-level const: irrelevant to callers (same signature as f(int))
void g(const int* p);    // low-level const: part of the contract
```

## 2. `constexpr` variables

```cpp
constexpr int kBufSize = 256;                    // compile-time constant, usable as array size
constexpr double kPi = 3.14159265358979;
std::array<uint8_t, kBufSize> buf{};
constexpr std::array<int, 4> kPrimes{2, 3, 5, 7};
```

`constexpr` variables are implicitly `const`. At namespace scope they also have internal linkage unless declared `inline constexpr` (C++17) — use `inline constexpr` in headers to get one shared definition.

## 3. `constexpr` functions

A `constexpr` function **may** run at compile time if called with constant arguments in a constant-expression context; otherwise it runs at runtime like a normal function.

```cpp
constexpr uint32_t crc32_table_entry(uint32_t i) {
    for (int k = 0; k < 8; ++k) i = (i & 1) ? (i >> 1) ^ 0xEDB88320u : i >> 1;
    return i;
}

constexpr auto make_crc_table() {
    std::array<uint32_t, 256> t{};
    for (uint32_t i = 0; i < 256; ++i) t[i] = crc32_table_entry(i);
    return t;
}

constexpr auto kCrcTable = make_crc_table();      // computed by the compiler, stored in ROM
static_assert(kCrcTable[1] == 0x77073096u);

uint32_t runtime_val = crc32_table_entry(read_sensor());   // same function at runtime
```

What's allowed in `constexpr` functions has grown each standard:
- C++11: a single `return` statement.
- C++14: loops, local variables, multiple statements.
- C++17: `constexpr` lambdas, `if constexpr`.
- C++20: `try` blocks, virtual functions, `std::vector`/`std::string` *transiently* (allocated and freed within the evaluation), `std::is_constant_evaluated()`.
- C++23: `if consteval`, `static constexpr` locals, more of `<cmath>`.

> **Tip:** Compile-time lookup tables (CRC, sine tables, gamma curves, register configs) are a killer embedded use case: zero runtime cost, verified by `static_assert`.

## 4. `consteval` — immediate functions (C++20)

```cpp
consteval uint32_t baud_divisor(uint32_t clk, uint32_t baud) {
    if (clk % baud > baud / 50) throw "baud error > 2%";   // compile error if hit
    return clk / baud;
}
constexpr auto kDiv = baud_divisor(16'000'000, 115'200);   // OK, evaluated by compiler
// auto bad = baud_divisor(clk_at_runtime, 9600);          // error: not a constant expression
```

Use `consteval` when a runtime call would be a bug — e.g. compile-time-validated format strings (`std::format` uses this), hashing string literals, register value encoding.

## 5. `constinit` (C++20)

Guarantees a static variable is initialised at compile time (no dynamic initialisation → no static initialisation order fiasco), while still allowing modification at runtime.

```cpp
constinit int g_boot_count = 0;          // zero-cost init, mutable
constinit thread_local int t_depth = 0;
```

## 6. `if constexpr` vs `if consteval`

```cpp
template <typename T>
auto abs_val(T v) {
    if constexpr (std::is_unsigned_v<T>) return v;   // compile-time branch on types
    else return v < 0 ? -v : v;
}

constexpr double fast_sqrt(double x) {
    if consteval { return newton_sqrt(x); }          // C++23: compile-time path
    else { return std::sqrt(x); }                    // runtime path (hardware sqrt)
}
```

## 7. `const` vs `#define`

```cpp
#define BUF_SIZE 256              // C style: no type, no scope, no debugger symbol
constexpr std::size_t kBufSize = 256;    // typed, scoped, visible to tools
enum class Mode : uint8_t { Idle, Run }; // instead of #define MODE_IDLE 0
```

In C, `const int` is not a constant expression (can't size a static array in C89/C99 at file scope), which is why C code leans on `#define` and `enum`. C23 adds `constexpr` objects to C.

## Interview Q&A

- **Difference between `const` and `constexpr`?** `const` = immutable, maybe runtime-initialised. `constexpr` = compile-time constant (variables) / compile-time-capable (functions).
- **Can a `constexpr` function run at runtime?** Yes, when its arguments aren't constant or the context doesn't require a constant.
- **What does `const` after a member function mean?** `this` is a pointer-to-const; the function can't modify non-mutable members and can be called on const objects.
- **Why might `const` data save RAM on an MCU?** The linker can place it in flash (`.rodata`) instead of copying it to RAM.
- **What's the point of `constinit`?** Eliminating dynamic initialisation of globals (and its ordering problems) without making them const.
