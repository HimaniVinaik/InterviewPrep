# Error Handling

C++ offers several error-reporting strategies, and choosing well is an architecture decision. Interviewers ask about exception safety guarantees, `noexcept`, and (increasingly) `std::expected`.

## 1. The options

| Mechanism | Pros | Cons | Typical use |
|---|---|---|---|
| Exceptions | can't be ignored, clean happy path, carry rich info, work in constructors | non-deterministic cost when thrown, binary size, often banned in embedded/games | application code, constructors, truly exceptional conditions |
| Error codes / `bool` | simple, deterministic, C-compatible | easily ignored, clutter | C APIs, drivers, ISRs |
| `std::optional<T>` (C++17) | "value or nothing" | no reason given | lookups, parsing |
| `std::expected<T, E>` (C++23) | value **or** typed error, explicit, no exceptions | more verbose call sites | recoverable failures, `-fno-exceptions` code |
| `assert` / contracts | catch programmer bugs | removed in release (`NDEBUG`) | invariants, preconditions |
| `std::terminate` / panic | fail fast | stops the program | unrecoverable corruption |

## 2. Exceptions basics

```cpp
#include <stdexcept>

double safe_div(double a, double b) {
    if (b == 0.0) throw std::invalid_argument("division by zero");
    return a / b;
}

try {
    safe_div(1, 0);
} catch (const std::invalid_argument& e) {     // catch by const reference (avoids slicing)
    std::cerr << "bad input: " << e.what() << '\n';
} catch (const std::exception& e) {            // more general handlers last
    std::cerr << e.what() << '\n';
} catch (...) {                                // anything
    throw;                                     // rethrow the same exception object
}
```

Standard hierarchy: `std::exception` → `logic_error` (`invalid_argument`, `out_of_range`, `length_error`) and `runtime_error` (`range_error`, `overflow_error`, `system_error`), plus `bad_alloc`, `bad_cast`, `bad_optional_access`…

### Stack unwinding

When an exception propagates, destructors of all fully constructed local objects run in reverse order. That's why **RAII** makes exception-safe code natural, and why **destructors must not throw** (an exception escaping a destructor during unwinding calls `std::terminate`).

## 3. Exception safety guarantees

| Guarantee | Promise | Example |
|---|---|---|
| **No-throw** | never throws | destructors, `swap`, move ops (ideally) |
| **Strong** | commit-or-rollback: on failure, state unchanged | `vector::push_back` (if move is noexcept or copy is used) |
| **Basic** | no leaks, invariants hold, but state may change | most operations |
| None | anything goes | avoid |

**Copy-and-swap** gives the strong guarantee:

```cpp
Widget& Widget::operator=(const Widget& other) {
    Widget tmp(other);   // may throw — but *this untouched
    swap(tmp);           // noexcept
    return *this;
}
```

## 4. `noexcept`

```cpp
void reset() noexcept;                       // promise: no exceptions escape
template <class T> void f(T& t) noexcept(noexcept(t.clear()));   // conditional
static_assert(noexcept(std::declval<std::vector<int>&>().clear()));
```

- If a `noexcept` function throws, `std::terminate` is called — no unwinding guarantee.
- Mark move constructors, move assignment, `swap`, and destructors `noexcept` — containers rely on it to choose moves over copies.
- `noexcept` is part of the function type since C++17.

## 5. `std::expected` (C++23)

```cpp
#include <expected>

enum class ParseErr { Empty, BadDigit, Overflow };

std::expected<int, ParseErr> parse_int(std::string_view s) {
    if (s.empty()) return std::unexpected(ParseErr::Empty);
    int v = 0;
    for (char c : s) {
        if (c < '0' || c > '9') return std::unexpected(ParseErr::BadDigit);
        if (v > (INT_MAX - (c - '0')) / 10) return std::unexpected(ParseErr::Overflow);
        v = v * 10 + (c - '0');
    }
    return v;
}

auto r = parse_int("123");
if (r) std::cout << *r;                 // value
else   handle(r.error());               // error

// Monadic chaining (C++23)
auto doubled = parse_int("21")
    .transform([](int v) { return v * 2; })                         // maps the value
    .or_else([](ParseErr) { return std::expected<int, ParseErr>(0); }); // recover
```

Before C++23, `tl::expected` or Boost.Outcome provide the same idea.

## 6. Error codes the modern way

```cpp
std::error_code ec;
auto size = std::filesystem::file_size("data.bin", ec);   // non-throwing overload
if (ec) std::cerr << ec.message() << '\n';

// <charconv>: fast, locale-free, non-throwing numeric parsing
int value;
auto [ptr, err] = std::from_chars(s.data(), s.data() + s.size(), value);
if (err == std::errc{}) { /* ok */ }
```

`[[nodiscard]]` makes ignoring a returned error a compiler warning:

```cpp
[[nodiscard]] bool flash_write(uint32_t addr, std::span<const uint8_t> data);
flash_write(a, d);   // warning: ignoring return value
```

## 7. Embedded & `-fno-exceptions`

Many embedded, game and safety-critical codebases compile with `-fno-exceptions` (and `-fno-rtti`) because of:
- Code size (unwind tables, runtime support).
- Non-deterministic throw latency — unacceptable in hard real-time paths.
- Certification standards (MISRA C++, AUTOSAR) restricting them.

Then: return codes / `expected`, `[[nodiscard]]`, assertions, and a well-defined fault handler (log + safe state + reset).

## 8. Assertions and contracts

```cpp
#include <cassert>
void set_duty(float pct) {
    assert(pct >= 0.f && pct <= 100.f && "duty out of range");   // debug only
}
static_assert(sizeof(Packet) == 64, "Packet layout changed");      // compile time, always
```

C++26 adds language contracts (`pre`, `post`, `contract_assert`).

## Interview Q&A

- **Why catch by reference?** Avoids slicing derived exceptions and an extra copy.
- **What happens if an exception escapes `main`?** `std::terminate` (stack may not unwind).
- **Can constructors report errors without exceptions?** Not directly — use a factory returning `std::expected`/`optional`, or a two-phase `init()`.
- **What's the cost of exceptions?** "Zero-cost" on the happy path in table-based ABIs; throwing is expensive (microseconds) and code size grows.
- **Difference between `throw;` and `throw e;`?** `throw;` rethrows the original object (preserving its dynamic type); `throw e;` copies — possibly slicing.
