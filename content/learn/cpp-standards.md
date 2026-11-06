# Modern C++ Coding Standards

A distilled, opinionated guide based on the **C++ Core Guidelines** (Stroustrup & Sutter), current as of C++20/23. Following these consistently is what "senior-quality" C++ looks like in interviews and code review.

## 1. Resource management

- **No naked `new`/`delete`.** Use `std::make_unique`, `std::make_shared`, containers, or RAII wrappers. (R.11)
- **A raw pointer (`T*`) or reference (`T&`) is non-owning.** Ownership is expressed by types. (R.3, I.11)
- **Prefer `unique_ptr` over `shared_ptr`** unless ownership is genuinely shared. (R.21)
- **Rule of Zero:** let members manage resources; don't write special members unless you must. (C.20)
- **If you define or `=delete` any copy, move, or destructor, define or `=delete` them all.** (C.21)

## 2. Interfaces & functions

```cpp
// ✅ Clear, hard-to-misuse interfaces
[[nodiscard]] std::expected<Config, ParseError> parse_config(std::string_view text);
void fill(std::span<std::byte> buffer, std::byte value);              // span instead of (ptr, len)
void set_timeout(std::chrono::milliseconds t);                         // units in the type
enum class Parity : uint8_t { None, Even, Odd };                       // not bool/int flags
Uart open_uart(const UartConfig& cfg);                                 // config struct, designated init
```

| Parameter kind | Pass as |
|---|---|
| cheap to copy (int, double, iterators, `string_view`, `span`) | by value |
| read-only, expensive to copy | `const T&` |
| will be stored/moved from ("sink") | by value + `std::move` inside |
| output | **return it** (multiple: struct or tuple) — avoid out-params |
| in-out | `T&` |
| optional, non-owning | `T*` |
| transfer ownership | `std::unique_ptr<T>` by value |

- Keep functions short and single-purpose. (F.2, F.3)
- Mark functions that can't throw `noexcept`, especially move operations and destructors. (F.6, C.66)
- Use `[[nodiscard]]` on functions whose result must be checked.
- Prefer `constexpr` functions where possible. (F.4)

## 3. Classes

- Use `class` when there's an invariant; `struct` for plain aggregates. (C.2, C.8)
- **Make single-argument constructors `explicit`.** (C.46)
- Initialise members in declaration order; prefer **default member initialisers**. (C.47, C.48)
- Polymorphic base: **public virtual destructor** (or protected non-virtual). (C.35)
- Use `override` (or `final`) on every override; never repeat `virtual` on overrides. (C.128)
- Avoid protected data. (C.133)
- Make data members private unless the type is a plain aggregate.
- Prefer composition to inheritance; inheritance for interfaces/is-a only.
- Operators should mimic built-in semantics; prefer non-member symmetric operators; use defaulted `<=>`.

## 4. Types and safety

- Use `auto` to avoid repetition and for complicated types — but not when it obscures meaning. (ES.11)
- **Always initialise variables** (`int x{};`). (ES.20)
- Prefer `{}` initialisation (prevents narrowing). (ES.23)
- **No C-style casts**; use named casts, and few of them. (ES.48, ES.49)
- Don't use `reinterpret_cast` for type punning — use `std::bit_cast`. (C++20)
- Use `nullptr`, not `0`/`NULL`. (ES.47)
- Prefer `enum class`. (Enum.3)
- Prefer `std::array`/`std::vector`/`std::span` to C arrays. (SL.con.1)
- Use `gsl::not_null<T*>` or references when a pointer can't be null.
- Avoid signed/unsigned mixing; use `std::ssize`, `std::cmp_less`.

## 5. Expressions & statements

- One declaration per line; declare variables as late as possible and in the smallest scope (`if (auto x = ...; cond)`). (ES.5, ES.10)
- Prefer range-for and algorithms to raw loops. (ES.71, P.3)
- Avoid magic numbers: named `constexpr` constants. (ES.45)
- Don't rely on order of evaluation in complex expressions.
- Prefer `switch` over enums with no `default` so `-Wswitch` catches missing cases.
- Use `[[fallthrough]]` deliberately.

## 6. Error handling

- Use exceptions **or** `std::expected` consistently per codebase; never both for the same failure kind.
- Throw by value, catch by `const&`. (E.15)
- Never let destructors throw. (C.36)
- Use RAII so error paths clean up automatically. (E.6)
- Use `assert`/contracts for programmer errors; exceptions/`expected` for environmental failures.

## 7. Concurrency

- Avoid data races: protect shared mutable data with a mutex, or don't share it. (CP.2)
- Use RAII locks: `std::scoped_lock`, never manual `lock()`/`unlock()`. (CP.20)
- Use `std::jthread`; never `detach()`. (CP.25, CP.26)
- Always wait on condition variables with a predicate. (CP.42)
- Minimise time in critical sections; don't call unknown code under a lock. (CP.43, CP.22)
- Default to `seq_cst` atomics; only weaken ordering with a proof and a comment.

## 8. Templates & generic code

- Constrain templates with **concepts**. (T.10)
- Prefer standard concepts (`std::integral`, `std::ranges::range`) to hand-rolled ones.
- Use `if constexpr` rather than SFINAE tricks.
- Avoid template metaprogramming when `constexpr` functions work.

## 9. Naming & formatting

There's no single standard; be consistent. A common modern style:

| Thing | Style | Example |
|---|---|---|
| Types, concepts | `PascalCase` | `RingBuffer`, `Hashable` |
| Functions, variables | `snake_case` or `camelCase` | `read_sample()` |
| Constants | `kPascalCase` or `UPPER_CASE` | `kMaxRetries` |
| Private members | trailing underscore | `size_` |
| Macros (avoid!) | `UPPER_CASE` with project prefix | `PF_ASSERT` |
| Files | `snake_case.cpp/.hpp` | `ring_buffer.hpp` |

Automate formatting with **clang-format** (commit a `.clang-format`) so reviews focus on substance.

```yaml
# .clang-format
BasedOnStyle: Google
IndentWidth: 4
ColumnLimit: 110
```

## 10. Tooling baseline for every project

```cmake
target_compile_options(app PRIVATE
    -Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wsign-conversion
    -Wnon-virtual-dtor -Wold-style-cast -Wcast-align -Woverloaded-virtual
    -Wnull-dereference -Wdouble-promotion -Wimplicit-fallthrough
    $<$<CONFIG:Debug>:-fsanitize=address,undefined>)
target_link_options(app PRIVATE $<$<CONFIG:Debug>:-fsanitize=address,undefined>)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
```

```yaml
# .clang-tidy
Checks: >
  bugprone-*, cppcoreguidelines-*, modernize-*, performance-*, readability-*,
  -modernize-use-trailing-return-type, -readability-magic-numbers
WarningsAsErrors: 'bugprone-*'
```

CI: build with GCC and Clang, run unit tests under ASan/UBSan and TSan, run clang-tidy, enforce clang-format, measure coverage.

## 11. Things that are now considered outdated

| Old habit | Modern replacement |
|---|---|
| `NULL`, `0` for pointers | `nullptr` |
| `typedef` | `using` aliases |
| `#define` constants | `constexpr` / `inline constexpr` |
| `std::auto_ptr` | `std::unique_ptr` |
| manual `new`/`delete` | `make_unique`, containers |
| `(ptr, len)` pairs | `std::span` |
| `const std::string&` for read-only text | `std::string_view` (when no ownership/NUL needed) |
| `printf` / `iostream` chains | `std::format` / `std::print` |
| SFINAE / `enable_if` | concepts |
| `std::bind` | lambdas |
| `std::thread` + manual join | `std::jthread` |
| out-parameters | return values, structs, `std::optional`, `std::expected` |
| sentinel return values (-1) | `std::optional` / `std::expected` |
| erase-remove idiom | `std::erase_if` |
| `map.find(k) != map.end()` | `map.contains(k)` |
| `rand()` | `<random>` engines/distributions |

## Further reading

- C++ Core Guidelines — isocpp.github.io/CppCoreGuidelines
- "A Tour of C++" (3rd ed., C++20) — Stroustrup
- "Effective Modern C++" — Scott Meyers (C++11/14; still essential)
- cppreference.com — the reference
- Compiler Explorer (godbolt.org) — see what code compiles to

## Interview Q&A

- **What does "no naked new/delete" mean?** Ownership is expressed by RAII types: use `std::make_unique`/`make_shared` and containers, so memory is released automatically and exception-safely.
- **How should you pass a large read-only object to a function?** By `const T&` (or `std::string_view` / `std::span` for strings and contiguous data) — no copy, and the function can't modify it.
- **How do you pass a parameter you intend to store?** By value, then `std::move` it into the member: one copy for lvalue arguments, zero copies for rvalues.
- **Why mark move constructors `noexcept`?** Containers like `std::vector` only move elements during reallocation if the move constructor is `noexcept`; otherwise they copy to keep the strong exception guarantee.
- **Which compiler flags and tools belong in every C++ project?** `-Wall -Wextra -Wpedantic -Wshadow -Wconversion`, sanitizers (ASan/UBSan/TSan) in test builds, clang-tidy, clang-format, and a CI that builds with more than one compiler.
