# Error Handling

> **Key idea:** every non-trivial program has operations that can fail — a file is missing, input is malformed, memory runs out, a sensor stops responding. Good error handling answers three questions: **how is the failure reported** (exception, error code, `std::optional`, `std::expected`), **who handles it** (often far from where it happened), and **what state is the program in afterwards** (exception-safety guarantees). C++ offers several mechanisms; choosing the right one for each situation — and never ignoring errors silently — is the skill.

**What you'll be able to do after this guide**
- Choose between exceptions, error codes, `std::optional`, `std::expected` and assertions for any failure.
- Throw, catch and rethrow correctly; design exception hierarchies; understand stack unwinding.
- Write code with the basic, strong and no-throw guarantees; use `noexcept` correctly.
- Use `std::expected` (C++23), `std::error_code` and `[[nodiscard]]` for exception-free code.
- Handle errors in embedded / `-fno-exceptions` environments; use assertions and contracts.

---

## 1. Kinds of failure, and the right tool for each

| Situation | Example | Best tool |
|---|---|---|
| **Programming bug** (precondition violated) | index out of range, null passed where forbidden | `assert`, contracts, crash fast |
| **Expected, frequent failure** the caller handles immediately | parse a number from user input, look up a key | `std::optional`, `std::expected`, return status |
| **Exceptional, rare failure** handled far up the stack | out of memory, file system full, network down mid-transaction | exceptions |
| **Constructor can't establish its invariant** | can't open the file a `File` object represents | exception (or a factory returning `expected`) |
| **No exceptions allowed** (embedded, real-time, some game engines) | sensor read timeout | error codes / `std::expected` |

| Mechanism | Pros | Cons |
|---|---|---|
| Exceptions | can't be ignored; separate error path from logic; propagate automatically; work in constructors/operators | invisible control flow; costly when thrown; binary size; banned in some domains |
| Error codes / `bool` | simple, explicit, cheap, no runtime support | easy to ignore; clutter every call site; can't return from constructors |
| `std::optional<T>` | "value or nothing", explicit | no information about *why* |
| `std::expected<T, E>` (C++23) | value **or** a typed error; explicit; cheap | must be checked at each level (no automatic propagation) |
| `assert` / contracts | catch bugs during development | not for recoverable runtime errors |

---

## 2. Exceptions: throw, catch, rethrow

```cpp
#include <cstdio>
#include <stdexcept>
#include <string>
#include <vector>

double safeDivide(double a, double b) {
    if (b == 0.0) {
        throw std::invalid_argument("division by zero");     // throw an OBJECT (usually a std::exception subclass)
    }
    return a / b;
}

double average(const std::vector<double>& values) {
    double total = 0;
    for (double v : values) {
        total += v;
    }
    return safeDivide(total, static_cast<double>(values.size()));   // the exception passes through here untouched
}

int main() {
    try {
        std::printf("average = %.2f\n", average({1, 2, 3}));
        std::printf("average = %.2f\n", average({}));         // throws from deep inside safeDivide
        std::printf("never printed\n");
    } catch (const std::invalid_argument& e) {                // catch by const reference
        std::printf("invalid argument: %s\n", e.what());
    } catch (const std::exception& e) {                       // more general handlers go LAST
        std::printf("other error: %s\n", e.what());
    } catch (...) {                                           // catch-all: anything at all
        std::printf("unknown error\n");
    }
    return 0;
}
```

**Rules**
- **Throw by value, catch by `const&`.** Catching by value copies and **slices** derived exceptions; catching by pointer raises ownership questions.
- Handlers are tried **in order** — put the most specific first. (Compilers warn when a later handler can never be reached.)
- Throw objects derived from `std::exception` so callers can catch them uniformly and call `what()`.

### The standard exception hierarchy

```text
std::exception
├── std::logic_error          (bugs: preconditions violated — could have been prevented)
│   ├── std::invalid_argument
│   ├── std::domain_error
│   ├── std::length_error
│   └── std::out_of_range       (e.g. vector::at, string::substr)
├── std::runtime_error        (failures only detectable at run time)
│   ├── std::range_error
│   ├── std::overflow_error
│   ├── std::underflow_error
│   └── std::system_error       (wraps an std::error_code: OS / errno errors)
│       └── std::ios_base::failure, std::filesystem::filesystem_error
├── std::bad_alloc            (new failed)
├── std::bad_cast, std::bad_typeid, std::bad_any_cast, std::bad_variant_access
├── std::bad_optional_access, std::bad_function_call, std::bad_weak_ptr
└── std::bad_exception
```

### Custom exception types

Add **context** the handler needs: what failed, with which input, and (if useful) an error code.

```cpp
#include <cstdio>
#include <stdexcept>
#include <string>

class ConfigError : public std::runtime_error {
public:
    ConfigError(const std::string& key, int line)
        : std::runtime_error("bad config key '" + key + "' at line " + std::to_string(line)),
          key(key), line(line) {}
    const std::string& badKey() const noexcept { return key; }
    int lineNumber() const noexcept { return line; }
private:
    std::string key;
    int line;
};

void loadConfig() {
    throw ConfigError("timeout_ms", 12);
}

int main() {
    try {
        loadConfig();
    } catch (const ConfigError& e) {                 // specific handler can use the extra fields
        std::printf("%s (key=%s, line=%d)\n", e.what(), e.badKey().c_str(), e.lineNumber());
    }
    return 0;
}
```

### Rethrowing and nesting

```cpp
#include <cstdio>
#include <exception>
#include <stdexcept>
#include <string>

void readSensor() {
    throw std::runtime_error("I2C timeout");
}

void initialiseDevice() {
    try {
        readSensor();
    } catch (...) {
        // Add context while keeping the original exception inside (C++11 nested exceptions).
        std::throw_with_nested(std::runtime_error("device initialisation failed"));
    }
}

void printNested(const std::exception& e, int depth = 0) {
    std::printf("%*s- %s\n", depth * 2, "", e.what());
    try {
        std::rethrow_if_nested(e);
    } catch (const std::exception& inner) {
        printNested(inner, depth + 1);
    }
}

void logAndRethrow() {
    try {
        initialiseDevice();
    } catch (const std::exception& e) {
        std::printf("logging: %s\n", e.what());
        throw;                              // `throw;` rethrows the ORIGINAL object (no copy, no slicing)
        // throw e;                         // WRONG: copies, and slices to std::exception
    }
}

int main() {
    try {
        logAndRethrow();
    } catch (const std::exception& e) {
        std::printf("error chain:\n");
        printNested(e);
    }
    return 0;
}
```

---

## 3. Stack unwinding

When an exception is thrown, the runtime walks back up the call stack, **destroying every fully-constructed local object** in each frame (running their destructors), until it finds a matching `catch`. This is what makes **RAII** the backbone of exception safety: resources owned by objects are released automatically.

```cpp
#include <cstdio>
#include <stdexcept>

struct Resource {
    const char* name;
    explicit Resource(const char* n) : name(n) { std::printf("  acquire %s\n", name); }
    ~Resource() { std::printf("  release %s\n", name); }
};

void level3() {
    Resource r("socket");
    throw std::runtime_error("network down");
}

void level2() {
    Resource r("buffer");
    level3();
    std::printf("  not reached\n");
}

void level1() {
    Resource r("lock");
    level2();
}

int main() {
    try {
        level1();
    } catch (const std::exception& e) {
        std::printf("caught '%s' after every resource was released (innermost first)\n", e.what());
    }
    return 0;
}
```

- If **no handler** is found, `std::terminate` is called (whether the stack unwinds first is implementation-defined).
- If a **destructor throws** while unwinding, `std::terminate` is called. Destructors are implicitly `noexcept` for this reason.
- Raw `new` without an owner leaks during unwinding — another reason for smart pointers.

---

## 4. Exception safety guarantees

What does a function promise if something it calls throws?

| Guarantee | Promise | Typical technique |
|---|---|---|
| **No-throw** (`noexcept`) | never fails | destructors, `swap`, moves, `release()` |
| **Strong** | commit-or-rollback: on failure, state is exactly as before | do the work on a copy, then `swap`/commit with no-throw operations |
| **Basic** | no leaks, invariants hold, but state may have changed | RAII everywhere |
| **None** | anything | never acceptable in production code |

```cpp
#include <cstdio>
#include <stdexcept>
#include <string>
#include <vector>

class Roster {
public:
    // BASIC guarantee only: if the second push_back throws, the first name stays added.
    void addPairBasic(const std::string& a, const std::string& b) {
        names.push_back(a);
        names.push_back(maybeThrow(b));
    }

    // STRONG guarantee: build the new state on the side, then commit with a no-throw swap.
    void addPairStrong(const std::string& a, const std::string& b) {
        std::vector<std::string> next = names;      // copy (may throw: nothing changed yet)
        next.push_back(a);
        next.push_back(maybeThrow(b));
        names.swap(next);                           // noexcept commit
    }

    std::size_t size() const { return names.size(); }

private:
    static std::string maybeThrow(const std::string& s) {
        if (s.empty()) {
            throw std::invalid_argument("empty name");
        }
        return s;
    }
    std::vector<std::string> names;
};

int main() {
    Roster basic;
    try {
        basic.addPairBasic("ada", "");
    } catch (const std::exception&) {
    }
    Roster strong;
    try {
        strong.addPairStrong("ada", "");
    } catch (const std::exception&) {
    }
    std::printf("after failure: basic has %zu names (partial change), strong has %zu (unchanged)\n",
                basic.size(), strong.size());
    return 0;
}
```

The strong guarantee costs a copy; offer it where callers need it (assignment operators, transactions), basic elsewhere.

---

## 5. `noexcept`

`noexcept` declares that a function **won't throw**. If it throws anyway, `std::terminate` is called immediately — no unwinding to callers.

Why it matters:
- **Performance:** `std::vector` moves elements during reallocation only if the move constructor is `noexcept` (otherwise it copies to keep the strong guarantee). See *Move Semantics*.
- **Optimisation:** the compiler can skip unwinding bookkeeping.
- **Documentation:** callers know they don't need a handler.

```cpp
#include <cstdio>
#include <type_traits>
#include <utility>
#include <vector>

struct Widget {
    std::vector<int> data;
    Widget() = default;
    Widget(Widget&&) noexcept = default;               // mark moves noexcept
    Widget& operator=(Widget&&) noexcept = default;
    Widget(const Widget&) = default;
    Widget& operator=(const Widget&) = default;
};

void mayThrow() {}
void wontThrow() noexcept {}

template <typename T>
void swapValues(T& a, T& b) noexcept(std::is_nothrow_move_constructible_v<T> &&
                                     std::is_nothrow_move_assignable_v<T>) {   // conditional noexcept
    T tmp = std::move(a);
    a = std::move(b);
    b = std::move(tmp);
}

int main() {
    std::printf("noexcept(mayThrow()) = %d, noexcept(wontThrow()) = %d\n", noexcept(mayThrow()), noexcept(wontThrow()));
    std::printf("Widget nothrow move: %d\n", std::is_nothrow_move_constructible_v<Widget>);
    Widget a;
    Widget b;
    std::printf("swapValues<Widget> noexcept: %d\n", noexcept(swapValues(a, b)));
    return 0;
}
```

**When to write `noexcept`:** destructors (implicit), move operations, `swap`, and simple functions that genuinely can't fail. **Don't** put it on functions that allocate or call things that might throw "just in case" — a wrong `noexcept` turns a recoverable error into a crash.

---

## 6. `std::optional`: "a value or nothing"

When failure needs no explanation (lookup misses, optional configuration), `std::optional` is clearer than sentinel values like `-1` or `nullptr`.

```cpp
#include <charconv>
#include <cstdio>
#include <optional>
#include <string_view>

std::optional<int> parseInt(std::string_view text) {
    int value = 0;
    auto [ptr, ec] = std::from_chars(text.data(), text.data() + text.size(), value);   // no exceptions, no locale
    if (ec != std::errc() || ptr != text.data() + text.size()) {
        return std::nullopt;                         // not a complete, valid integer
    }
    return value;
}

int main() {
    for (std::string_view s : {"42", "-7", "12abc", "", "99999999999"}) {
        if (std::optional<int> v = parseInt(s)) {
            std::printf("'%.*s' -> %d\n", static_cast<int>(s.size()), s.data(), *v);
        } else {
            std::printf("'%.*s' -> invalid\n", static_cast<int>(s.size()), s.data());
        }
    }
    std::printf("with default: %d\n", parseInt("oops").value_or(0));
    // parseInt("oops").value();   // throws std::bad_optional_access if empty
    return 0;
}
```

---

## 7. `std::expected<T, E>` (C++23): value or error

`std::expected` holds **either** a value of type `T` **or** an error of type `E`. Like an error code, it's explicit and cheap; unlike an error code, the result and the error travel together and the error can carry rich information.

```cpp
// c++23 — std::expected needs a C++23 standard library
#include <cstdio>
#include <expected>
#include <string>

enum class ParseError { Empty, NotANumber, OutOfRange };

const char* describe(ParseError e) {
    switch (e) {
        case ParseError::Empty: {
            return "empty input";
        }
        case ParseError::NotANumber: {
            return "not a number";
        }
        case ParseError::OutOfRange: {
            return "out of range";
        }
    }
    return "?";
}

std::expected<int, ParseError> parsePercent(const std::string& s) {
    if (s.empty()) {
        return std::unexpected(ParseError::Empty);          // the error path
    }
    int value = 0;
    for (char c : s) {
        if (c < '0' || c > '9') {
            return std::unexpected(ParseError::NotANumber);
        }
        value = value * 10 + (c - '0');
        if (value > 100) {
            return std::unexpected(ParseError::OutOfRange);
        }
    }
    return value;                                            // the success path
}

// Monadic operations (C++23): chain steps; errors short-circuit automatically.
std::expected<double, ParseError> toFraction(const std::string& s) {
    return parsePercent(s).transform([](int p) { return p / 100.0; });
}

int main() {
    for (const char* input : {"75", "", "7x", "250"}) {
        auto r = parsePercent(input);
        if (r) {                                              // has a value?
            std::printf("'%s' -> %d%%\n", input, *r);
        } else {
            std::printf("'%s' -> error: %s\n", input, describe(r.error()));
        }
    }
    auto f = toFraction("40");
    std::printf("fraction %.2f, fallback %.2f\n", f.value_or(-1), toFraction("abc").value_or(-1));
    return 0;
}
```

| Operation | Meaning |
|---|---|
| `if (r)` / `r.has_value()` | succeeded? |
| `*r`, `r->member`, `r.value()` | the value (`value()` throws `bad_expected_access` on error) |
| `r.error()` | the error |
| `r.value_or(x)` | value or a default |
| `r.and_then(f)` | if value, call `f(value)` returning another `expected` |
| `r.transform(f)` | if value, map it with `f` |
| `r.or_else(f)` | if error, try to recover |

Before C++23, libraries like `tl::expected` or Boost.Outcome provide the same thing.

---

## 8. Error codes the modern way

For C-style APIs or exception-free code, return a status — but make it hard to ignore and easy to understand.

```cpp
#include <cerrno>
#include <cstdio>
#include <cstring>
#include <system_error>

enum class [[nodiscard]] Status { Ok, Timeout, BadChecksum };     // the whole enum is nodiscard

[[nodiscard]] Status readPacket(char* buffer, int size) {         // warning if the result is ignored
    if (size < 4) {
        return Status::BadChecksum;
    }
    std::memcpy(buffer, "ABC", 4);
    return Status::Ok;
}

// std::error_code: portable OS error codes with categories and messages.
std::error_code openConfig(const char* path, std::FILE** out) {
    *out = std::fopen(path, "r");
    if (*out == nullptr) {
        return std::error_code(errno, std::generic_category());
    }
    return {};                                                      // an empty error_code means success
}

int main() {
    char buf[8];
    if (readPacket(buf, sizeof buf) != Status::Ok) {
        std::printf("read failed\n");
        return 1;
    }
    std::printf("packet: %s\n", buf);
    // readPacket(buf, 8);           // warning: ignoring return value declared [[nodiscard]]

    std::FILE* f = nullptr;
    if (std::error_code ec = openConfig("/no/such/file.cfg", &f)) {   // an error_code converts to true if set
        std::printf("open failed: %s (code %d)\n", ec.message().c_str(), ec.value());
    } else {
        std::fclose(f);
    }
    return 0;
}
```

The `std::filesystem` library shows both styles: every function has a throwing overload and one taking a `std::error_code&` out-parameter.

---

## 9. Constructors, destructors and errors

- **Constructors** have no return value, so the clean way to report failure is to **throw** — the object never exists, and already-constructed members are cleaned up (see *RAII*).
- Without exceptions: make the constructor private and use a **factory** that returns `std::optional`/`std::expected`/`std::unique_ptr` (null on failure). Avoid "zombie" objects with a separate `init()` that callers can forget.
- **Destructors** must not throw. If cleanup can fail (flushing a file, committing a transaction), give the class an explicit `close()`/`commit()` that can report errors, and make the destructor a silent best-effort fallback.

```cpp
// c++23 — std::expected needs a C++23 standard library
#include <cstdio>
#include <expected>
#include <string>
#include <utility>

class Connection {
public:
    static std::expected<Connection, std::string> open(const std::string& host) {   // factory instead of throwing ctor
        if (host.empty()) {
            return std::unexpected("empty host name");
        }
        return Connection(host);
    }
    ~Connection() {
        if (openFlag) {
            std::printf("  closing %s (best effort, never throws)\n", host.c_str());
        }
    }
    Connection(Connection&& o) noexcept : host(std::move(o.host)), openFlag(std::exchange(o.openFlag, false)) {}
    const std::string& name() const { return host; }
private:
    explicit Connection(std::string h) : host(std::move(h)), openFlag(true) {}
    std::string host;
    bool openFlag = false;
};

int main() {
    auto bad = Connection::open("");
    std::printf("bad: %s\n", bad ? "connected" : bad.error().c_str());
    auto good = Connection::open("example.org");
    if (good) {
        std::printf("connected to %s\n", good->name().c_str());
    }
    return 0;
}
```

---

## 10. The cost of exceptions

Modern ABIs (Itanium on Linux/macOS, x64 Windows) use **table-based "zero-cost" exceptions**:

- **Happy path:** essentially no run-time cost — no checks on every call. (Some optimisations are inhibited, and binary size grows with unwind tables.)
- **Throw path:** expensive — allocating the exception, walking unwind tables, running destructors: microseconds, roughly 10,000× slower than a return.

So exceptions are fine for genuinely **exceptional** situations, and a poor fit for expected control flow ("not found", "end of input") in hot loops.

```cpp
#include <chrono>
#include <cstdio>
#include <optional>
#include <stdexcept>

int throwingFind(int key) {
    if (key % 2 == 1) {
        throw std::runtime_error("not found");
    }
    return key;
}

std::optional<int> optionalFind(int key) {
    if (key % 2 == 1) {
        return std::nullopt;
    }
    return key;
}

int main() {
    using Clock = std::chrono::steady_clock;
    const int n = 100000;
    long long sum = 0;

    auto t0 = Clock::now();
    for (int i = 0; i < n; i++) {
        try {
            sum += throwingFind(i);
        } catch (const std::exception&) {
        }
    }
    auto t1 = Clock::now();
    for (int i = 0; i < n; i++) {
        if (auto v = optionalFind(i)) {
            sum += *v;
        }
    }
    auto t2 = Clock::now();
    auto us = [](auto d) { return static_cast<long long>(std::chrono::duration_cast<std::chrono::microseconds>(d).count()); };
    std::printf("50%% failures: exceptions %lld us, optional %lld us (sum %lld)\n", us(t1 - t0), us(t2 - t1), sum);
    return 0;
}
```

---

## 11. Embedded and `-fno-exceptions`

Many firmware, game and real-time codebases disable exceptions (`-fno-exceptions`) because of code size, non-deterministic timing of throws, or heap use for exception objects.

- `throw` becomes a compile error; library code that would throw usually calls `std::abort` instead (e.g. `std::vector::at` on out-of-range).
- Use `std::expected`/`std::optional`/status enums with `[[nodiscard]]`.
- Use `new (std::nothrow)` or avoid the heap entirely (static pools).
- Treat **programming errors** with `assert` / a fault handler that logs and resets the device.
- MISRA C++ and AUTOSAR C++14 have specific rules on exceptions; many safety-critical projects forbid them.

```cpp
#include <initializer_list>
#include <cstdint>
#include <cstdio>

enum class [[nodiscard]] SensorStatus : std::uint8_t { Ok, NotReady, BusError };

struct Reading {
    std::int16_t celsiusTimes10;
};

// The typical embedded signature: status return + out-parameter (or std::expected in C++23).
SensorStatus readTemperature(Reading& out, int simulatedBus) {
    if (simulatedBus < 0) {
        return SensorStatus::BusError;
    }
    out.celsiusTimes10 = static_cast<std::int16_t>(215 + simulatedBus);
    return SensorStatus::Ok;
}

int main() {
    Reading r{};
    for (int bus : {3, -1}) {
        SensorStatus s = readTemperature(r, bus);
        if (s == SensorStatus::Ok) {
            std::printf("temperature %d.%d C\n", r.celsiusTimes10 / 10, r.celsiusTimes10 % 10);
        } else {
            std::printf("sensor error %d: retry, then report fault\n", static_cast<int>(s));
        }
    }
    return 0;
}
```

---

## 12. Assertions, contracts and "fail fast"

**Bugs are not errors to recover from.** If a precondition is violated, the program is already in an unknown state — stop as early and loudly as possible.

```cpp
#include <cassert>
#include <cstdio>
#include <span>

// Precondition: values is non-empty. Violating it is a BUG in the caller.
int maxValue(std::span<const int> values) {
    assert(!values.empty() && "maxValue requires at least one element");   // checked in debug builds
    int best = values[0];
    for (int v : values) {
        if (v > best) {
            best = v;
        }
    }
    return best;
}

int main() {
    static_assert(sizeof(int) >= 4, "this code assumes 32-bit int");   // checked at compile time
    int data[] = {3, 9, 2};
    std::printf("max = %d\n", maxValue(data));
    return 0;
}
```

| Tool | When checked | Disabled by |
|---|---|---|
| `static_assert(cond, msg)` | compile time | never |
| `assert(cond)` | run time | `NDEBUG` (release builds) |
| custom `CHECK`/`EXPECTS` macros | run time, always | your choice |
| C++26 contracts (`pre`, `post`, `contract_assert`) | run time, configurable | build mode |

> **Pitfall:** never put side effects inside `assert` — `assert(initialise())` disappears entirely in release builds.

---

## 13. Error-handling design guidelines

1. **Decide per layer.** Low-level code close to the OS/hardware often returns codes; application layers often use exceptions or `expected`; a top-level handler logs and reports.
2. **Don't ignore errors.** `[[nodiscard]]` on status-returning functions; catch exceptions only where you can do something useful (recover, retry, add context, translate, or log at the top).
3. **Add context as errors travel up** (nested exceptions, or wrapping errors in `expected`).
4. **Don't use exceptions for normal control flow** — "end of file" or "key not found" aren't exceptional.
5. **Keep error paths tested**: unit tests for every failure branch; fault injection in integration tests.
6. **Translate at boundaries**: C APIs, threads (`std::exception_ptr` to carry an exception to another thread), and module boundaries.

```cpp
#include <cstdio>
#include <exception>
#include <stdexcept>
#include <thread>

int main() {
    std::exception_ptr failure;                // carries an exception across threads
    std::thread worker([&failure] {
        try {
            throw std::runtime_error("worker failed");
        } catch (...) {
            failure = std::current_exception();
        }
    });
    worker.join();
    if (failure) {
        try {
            std::rethrow_exception(failure);   // rethrow on the main thread
        } catch (const std::exception& e) {
            std::printf("main thread caught: %s\n", e.what());
        }
    }
    return 0;
}
```

(`std::async`/`std::future::get()` does this for you automatically.)

---

## 14. Interview checklist

- [ ] Choose a mechanism per failure kind: bug → assert; expected → optional/expected; exceptional → exception.
- [ ] Throw by value, catch by const reference, most-specific first; `throw;` vs `throw e;`.
- [ ] Stack unwinding runs destructors → RAII; uncaught → `std::terminate`.
- [ ] Basic / strong / no-throw guarantees; copy-and-swap for strong.
- [ ] `noexcept`: meaning, `vector` reallocation, conditional noexcept, don't lie.
- [ ] `std::expected` API and monadic chaining; `[[nodiscard]]`; `std::error_code`.
- [ ] Constructors throw or use factories; destructors never throw.
- [ ] Cost model of exceptions; `-fno-exceptions` patterns for embedded.
- [ ] `exception_ptr` across threads.

---

## Practice

1. Write `std::optional<std::size_t> findIndex(const std::vector<int>&, int)` and use it with `value_or`.
2. Make this function give the **strong** guarantee: `void Account::transfer(Account& to, int amount) { balance -= amount; to.deposit(amount); }` where `deposit` may throw.
3. Write a small `Result<T>` class (before C++23) holding either a `T` or a `std::string` error, with `ok()`, `value()`, `error()`.
4. What happens here and why? `struct S { ~S() { throw 1; } }; int main() { try { S s; throw 2; } catch (...) {} }`
5. Convert an exception-based `loadUser(id)` API into an `expected`-based one and show how a caller chains `loadUser(id).and_then(loadOrders)`.

:::details Show solution
1.
```cpp
#include <cassert>
#include <optional>
#include <vector>

std::optional<std::size_t> findIndex(const std::vector<int>& v, int target) {
    for (std::size_t i = 0; i < v.size(); i++) {
        if (v[i] == target) {
            return i;
        }
    }
    return std::nullopt;
}

int main() {
    std::vector<int> v = {4, 8, 15};
    assert(findIndex(v, 8).value() == 1);
    assert(findIndex(v, 99).value_or(v.size()) == 3);   // "not found" mapped to end
    return 0;
}
```
2. Do the operation that may throw **first**, then the operation that can't: `to.deposit(amount); balance -= amount;` (subtracting an int can't throw). If `deposit` throws, neither account changed. In general: prepare everything that can fail on the side, then commit with no-throw operations.
3.
```cpp
#include <cassert>
#include <string>
#include <utility>
#include <variant>

template <typename T>
class Result {
public:
    static Result success(T v) { return Result(std::move(v)); }
    static Result failure(std::string e) { return Result(Error{std::move(e)}); }
    bool ok() const { return std::holds_alternative<T>(state); }
    const T& value() const { return std::get<T>(state); }
    const std::string& error() const { return std::get<Error>(state).message; }
private:
    struct Error {
        std::string message;
    };
    explicit Result(T v) : state(std::move(v)) {}
    explicit Result(Error e) : state(std::move(e)) {}
    std::variant<T, Error> state;
};

Result<int> half(int x) {
    if (x % 2 != 0) {
        return Result<int>::failure("odd number");
    }
    return Result<int>::success(x / 2);
}

int main() {
    assert(half(10).ok() && half(10).value() == 5);
    assert(!half(3).ok() && half(3).error() == "odd number");
    return 0;
}
```
4. `throw 2` starts unwinding, which destroys `s`; its destructor throws while another exception is active. Destructors are implicitly `noexcept`, so `std::terminate` is called (the program aborts; `catch (...)` never runs). Even without `noexcept`, two simultaneous in-flight exceptions mean `terminate`.
5. `std::expected<User, Error> loadUser(int id);` and `std::expected<std::vector<Order>, Error> loadOrders(const User&);`. Then `auto orders = loadUser(id).and_then(loadOrders);` — if `loadUser` fails, `loadOrders` isn't called and the error propagates in `orders`.
:::

---

## Interview Q&A

- **Why catch by reference?** Avoids slicing derived exceptions and an extra copy.
- **What happens if an exception escapes `main`?** `std::terminate` (stack may not unwind).
- **Can constructors report errors without exceptions?** Not directly — use a factory returning `std::expected`/`optional`, or a two-phase `init()`.
- **What's the cost of exceptions?** "Zero-cost" on the happy path in table-based ABIs; throwing is expensive (microseconds) and code size grows.
- **Difference between `throw;` and `throw e;`?** `throw;` rethrows the original object (preserving its dynamic type); `throw e;` copies — possibly slicing.
- **What is stack unwinding?** After a throw, the runtime destroys all fully-constructed local objects in each frame, from innermost outwards, until a matching handler is found — which is why RAII cleans up automatically.
- **What are the basic, strong and no-throw guarantees?** Basic: no leaks and invariants hold; strong: on failure the state is unchanged (commit-or-rollback); no-throw: the operation never fails.
- **What happens if a `noexcept` function throws?** `std::terminate` is called immediately; the exception never reaches the caller.
- **When would you use `std::expected` instead of exceptions?** For expected, frequently-handled failures, in exception-free codebases, or when you want the error to be part of the function's type and handled explicitly by the caller.
- **What does `[[nodiscard]]` do?** Makes the compiler warn when a caller ignores the return value — essential for status codes and `expected`.
- **How do you pass an exception from a worker thread to the main thread?** Catch it with `std::current_exception()` into a `std::exception_ptr` and rethrow it with `std::rethrow_exception` (or use `std::future`, which does this automatically).
- **Should you use `assert` for invalid user input?** No — asserts are for programming bugs and are removed in release builds; validate user input with real error handling.

---

## External resources

- **cppreference — Exceptions, `noexcept`, `std::expected`, `std::optional`, `std::error_code`, `std::nested_exception`.**
- **C++ Core Guidelines — section E (Error handling).**
- **Herb Sutter — *Exceptional C++*** (exception safety) and his proposal "Zero-overhead deterministic exceptions" (P0709).
- **Jon Kalb — "Exception-Safe Code"** (CppCon 2014, three parts).
- **Andrei Alexandrescu — "Systematic Error Handling in C++"** (the talk that inspired `expected`).
