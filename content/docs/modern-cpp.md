# Modern C++ (11 → 23) Feature Map

> **Key idea:** "Modern C++" means C++11 and later. Each standard since then has removed a class of everyday bugs or boilerplate. C++11 brought ownership (`unique_ptr`, move semantics), C++17 brought vocabulary types (`optional`, `variant`, `string_view`), C++20 brought constraints and views (concepts, ranges, `span`), and C++23 brought value-or-error returns and printing (`expected`, `print`). Interviewers expect fluency in **C++17**, comfort with the headline **C++20** features, and awareness of **C++23**. They care more about *which problem a feature solves* than about the syntax.

**What you'll be able to do after this guide**
- Place any feature in its standard and explain the problem it was added to solve.
- Write idiomatic C++17: structured bindings, `if`-init, `if constexpr`, fold expressions, CTAD, `optional`/`variant`/`string_view`.
- Use the C++20 headliners in real code: concepts, ranges, `<=>`, designated initialisers, `span`, `format`, coroutines, `jthread`, `consteval`/`constinit`.
- Know what C++23 adds (`expected`, `print`, deducing `this`, `mdspan`, `flat_map`, `generator`, `ranges::to`) and C++26's direction.
- Check compiler support and choose a standard for a project, including embedded toolchains.

> **Tip:** Compile with `-std=c++20` (GCC ≥ 11, Clang ≥ 14, MSVC 19.29+) or `-std=c++23` (GCC 14+, Clang 18+, MSVC 19.40+ with `/std:c++latest`). Library support lags behind the language. Check cppreference's "Compiler support" page or test the feature macros: `#if __cpp_lib_expected >= 202202L`.

---

## 1. The map

| Standard | Headline features |
|---|---|
| **C++11** | `auto`, range-for, lambdas, move semantics & rvalue refs, `nullptr`, `constexpr`, `unique_ptr`/`shared_ptr`, `std::thread`/`mutex`/`atomic`, memory model, `enum class`, `override`/`final`, uniform `{}` init, `initializer_list`, variadic templates, `static_assert`, `unordered_map`, `std::array`, `= default`/`= delete`, delegating & inheriting ctors, `noexcept`, user-defined literals, `<chrono>`, `<random>`, raw string literals |
| **C++14** | generic lambdas (`auto` params), init captures `[p = std::move(p)]`, `make_unique`, relaxed `constexpr` (loops, locals), `auto` return types, `decltype(auto)`, variable templates, binary literals `0b1010`, digit separators `1'000'000`, `std::exchange`, `[[deprecated]]`, `std::shared_timed_mutex`, chrono literals `10ms` |
| **C++17** | structured bindings, `if`/`switch` with initialiser, `if constexpr`, fold expressions, CTAD, `std::optional`/`variant`/`any`, `std::string_view`, `std::filesystem`, parallel algorithms, inline variables, nested namespaces `a::b::c`, guaranteed copy elision, `[[nodiscard]]`/`[[maybe_unused]]`/`[[fallthrough]]`, `std::byte`, `<charconv>`, `std::scoped_lock`, `std::invoke`/`apply`, `constexpr` lambdas, evaluation-order guarantees |
| **C++20** | **concepts**, **ranges**, **coroutines**, **modules**, `<=>`, designated initialisers, `consteval`/`constinit`, `std::span`, `std::format`, `std::jthread` & `stop_token`, `<bit>`, `std::source_location`, `<numbers>`, calendar/time zones, `contains()`, `std::erase_if`, template lambdas, `[[likely]]`, `using enum`, `char8_t`, semaphores/latches/barriers, `atomic<shared_ptr>`, `atomic::wait`, `std::ssize`, `std::cmp_less`, `constexpr` `vector`/`string`, class-type NTTPs, two's complement |
| **C++23** | `std::expected`, `std::print`/`println`, deducing `this`, `std::mdspan`, `std::flat_map`/`flat_set`, `std::generator`, `ranges::to`, `views::zip`/`enumerate`/`chunk`/`slide`/`stride`/`cartesian_product`, `if consteval`, `std::byteswap`, `std::to_underlying`, `std::unreachable`, `[[assume]]`, multidimensional `operator[]`, `import std;`, `std::move_only_function`, `std::stacktrace`, `auto(x)` decay-copy, `z` size literal |
| **C++26** | static reflection (`^^T`), contracts (`pre`/`post`/`contract_assert`), `std::execution` (senders/receivers), `std::inplace_vector`, `#embed`, pack indexing `Ts...[0]`, `= delete("reason")`, `<linalg>`, hazard pointers & RCU, erroneous behaviour for uninitialised reads, `std::hive`, placeholder `_` variables |

---

## 2. C++11/14 foundations you must write without thinking

Most of these have their own guides (Smart Pointers, Move Semantics, Lambdas, Templates). This section shows them working together.

```cpp
#include <cassert>
#include <chrono>
#include <cstdio>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace std::chrono_literals;      // 10ms, 2s ... (C++14)

enum class State : unsigned char { Idle, Running, Fault };   // C++11: scoped, explicit type

class Task {
public:
    explicit Task(std::string name) : name_(std::move(name)) {}
    virtual ~Task() = default;                       // C++11 = default
    Task(const Task&) = delete;                      // C++11 = delete: non-copyable
    Task& operator=(const Task&) = delete;
    virtual int run() = 0;
    const std::string& name() const noexcept { return name_; }   // C++11 noexcept
private:
    std::string name_;
};

class Blink final : public Task {                    // C++11 final
public:
    using Task::Task;                                // C++11 inheriting constructors
    int run() override { return ++count_; }          // C++11 override
private:
    int count_ = 0;                                  // C++11 default member initialiser
};

constexpr long long factorial(int n) {               // C++14 relaxed constexpr: loops allowed
    long long result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

int main() {
    static_assert(factorial(10) == 3'628'800);       // C++14 digit separators
    static_assert(0b1010 == 10);                     // C++14 binary literal

    std::vector<std::unique_ptr<Task>> tasks;        // C++11 unique_ptr, C++14 make_unique
    tasks.push_back(std::make_unique<Blink>("led"));

    for (auto& task : tasks) {                       // C++11 auto + range-for
        task->run();
    }
    assert(tasks[0]->run() == 2);

    auto owned = std::make_unique<int>(7);
    auto consume = [p = std::move(owned)] { return *p * 2; };   // C++14 init capture (move-only)
    assert(consume() == 14 && owned == nullptr);

    auto add = [](auto a, auto b) { return a + b; };            // C++14 generic lambda
    assert(add(1, 2) == 3 && add(1.5, 2.0) == 3.5);

    std::map<std::string, int> counts{{"a", 1}};                // C++11 uniform init
    int old = std::exchange(counts["a"], 5);                    // C++14 std::exchange
    assert(old == 1 && counts["a"] == 5);

    auto timeout = 250ms + 1s;                                  // chrono literals
    assert(std::chrono::duration_cast<std::chrono::milliseconds>(timeout).count() == 1250);

    State s = State::Running;
    std::printf("%s ran, state=%d, timeout=%lldms\n", tasks[0]->name().c_str(),
                static_cast<int>(s),
                static_cast<long long>(std::chrono::duration_cast<std::chrono::milliseconds>(timeout).count()));
    return 0;
}
```

| Feature | Problem it solved |
|---|---|
| `nullptr` | `NULL`/`0` was an `int`, so `f(NULL)` could pick the `f(int)` overload |
| `enum class` | old enums leaked names into the enclosing scope and converted silently to `int` |
| `override` / `final` | a typo in a signature silently created a *new* function instead of overriding |
| `= delete` | non-copyable classes needed the "private, undefined copy constructor" trick |
| move semantics | returning or inserting big objects meant deep copies |
| `unique_ptr` | `auto_ptr` "copied" by stealing; raw `new`/`delete` leaked on exceptions |
| `auto` | long iterator types; and `auto x = expr` can never be left uninitialised |
| `std::thread`/memory model | before C++11 the language had no notion of threads at all, so every threaded program relied on platform guarantees |

---

## 3. C++17: the "vocabulary" release

```cpp
#include <any>
#include <cassert>
#include <charconv>
#include <cstdio>
#include <map>
#include <optional>
#include <string>
#include <string_view>
#include <tuple>
#include <variant>
#include <vector>

namespace app::config::detail {                        // nested namespace definition
inline constexpr int kDefaultPort = 8080;              // inline variable: one definition across TUs
}

// std::optional: "maybe a value" without sentinels like -1.
std::optional<int> parsePort(std::string_view text) {
    int value = 0;
    auto [ptr, ec] = std::from_chars(text.data(), text.data() + text.size(), value);  // <charconv>
    if (ec != std::errc{} || ptr != text.data() + text.size() || value <= 0 || value > 65535) {
        return std::nullopt;
    }
    return value;
}

// if constexpr: compile-time branch; the discarded branch is never instantiated.
template <typename T>
std::string describe(const T& value) {
    if constexpr (std::is_integral_v<T>) {
        return "int:" + std::to_string(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return "float";
    } else {
        return "text:" + std::string(value);
    }
}

// Fold expression: apply an operator across a parameter pack.
template <typename... Ts>
auto sumAll(Ts... values) {
    return (values + ... + 0);                         // right fold with initial value
}

template <typename... Ts>
void printAll(const Ts&... values) {
    ((std::printf("%s ", describe(values).c_str())), ...);   // comma fold: call once per arg
    std::printf("\n");
}

struct Point {
    int x;
    int y;
};

[[nodiscard]] Point origin() {                          // ignoring the result warns
    return {0, 0};                                      // guaranteed copy elision
}

int main() {
    // Structured bindings: unpack pairs, tuples, arrays and simple structs.
    std::map<std::string, int> ages{{"ana", 31}, {"bo", 25}};
    for (const auto& [name, age] : ages) {
        std::printf("%s=%d ", name.c_str(), age);
    }
    std::printf("\n");
    auto [px, py] = origin();
    assert(px == 0 && py == 0);

    // if with initialiser: `it` is scoped to the if/else.
    if (auto it = ages.find("bo"); it != ages.end()) {
        it->second++;
    }
    assert(ages["bo"] == 26);

    assert(parsePort("443") == 443);
    assert(!parsePort("99999") && !parsePort("80x"));
    assert(parsePort("x").value_or(app::config::detail::kDefaultPort) == 8080);

    // std::variant: a type-safe union; std::visit dispatches on the active type.
    std::vector<std::variant<int, double, std::string>> tokens{42, 2.5, std::string("id")};
    int ints = 0;
    for (const auto& token : tokens) {
        std::visit([&](const auto& v) {
            using V = std::decay_t<decltype(v)>;
            if constexpr (std::is_same_v<V, int>) {
                ints++;
            }
        }, token);
    }
    assert(ints == 1 && std::holds_alternative<std::string>(tokens[2]));

    // std::any: holds any copyable type; you must know the type to get it back.
    std::any box = 3.14;
    assert(std::any_cast<double>(box) == 3.14);

    // CTAD: class template argument deduction.
    std::pair p{1, 2.0};               // std::pair<int, double>
    std::vector v{1, 2, 3};            // std::vector<int>
    std::tuple t{1, "x", 2.0};         // std::tuple<int, const char*, double>
    static_assert(std::is_same_v<decltype(p), std::pair<int, double>>);
    assert(v.size() == 3 && std::get<0>(t) == 1);

    assert(sumAll(1, 2, 3, 4) == 10 && sumAll() == 0);
    printAll(7, 1.5, "hi");
    return 0;
}
```

> **Danger:** `std::string_view` does not own its characters. Never return a `string_view` to a local `std::string`, never construct one from a temporary `std::string` and keep it, and remember it is **not null-terminated**, so it can't be passed to C APIs that expect `const char*`. Pass views by value; they are just a pointer and a size.

**Guaranteed copy elision (C++17):** returning a *prvalue* (`return T{...};`) constructs the object directly in the caller's storage. That works even for types that are neither copyable nor movable, such as `std::mutex` holders. Named return values (NRVO) are still only *allowed* to be elided, not guaranteed.

**Parallel algorithms (C++17):** `std::sort(std::execution::par, v.begin(), v.end());`. With GCC they need TBB (`-ltbb`). They help on large data and hurt on small data.

---

## 4. C++20 deep dive

### 4.1 Concepts

Concepts are named, checked constraints on template parameters. They replace `enable_if`/SFINAE and give errors at the *call site*. The full guide is *Templates & Concepts*.

```cpp
#include <algorithm>
#include <cassert>
#include <concepts>
#include <cstdio>
#include <string>
#include <vector>

template <typename T>
concept Number = std::integral<T> || std::floating_point<T>;

template <typename T>
concept HasSize = requires(const T& t) {
    { t.size() } -> std::convertible_to<std::size_t>;   // expression must compile and convert
};

template <Number T>
T clamp01(T x) {
    return std::clamp(x, T{0}, T{1});
}

double average(const std::vector<Number auto>& values) {   // abbreviated template syntax
    double total = 0;
    for (auto v : values) {
        total += v;
    }
    return values.empty() ? 0.0 : total / static_cast<double>(values.size());
}

// Overloading by constraint: the more constrained overload wins.
std::string kind(const auto&) { return "thing"; }
std::string kind(const HasSize auto&) { return "container"; }

int main() {
    assert(clamp01(1.7) == 1.0 && clamp01(-3) == 0);
    assert(average(std::vector<int>{1, 2, 3}) == 2.0);
    assert(kind(42) == "thing" && kind(std::string("abc")) == "container");
    // clamp01(std::string("x"));   // error: constraints not satisfied: 'Number<std::string>' is false
    std::printf("concepts: %s / %s\n", kind(42).c_str(), kind(std::vector<int>{}).c_str());
    return 0;
}
```

### 4.2 Ranges and views

Ranges let algorithms take a whole container, accept **projections**, and compose lazy **views** with `|`. The full guide is *Algorithms & Ranges*.

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <ranges>
#include <string>
#include <vector>

struct Order {
    std::string customer;
    double total;
};

int main() {
    std::vector<int> v{5, 3, 8, 1, 9, 2};
    std::ranges::sort(v);                                  // no begin()/end() noise
    assert(std::ranges::is_sorted(v));

    // Lazy pipeline: nothing is computed until you iterate.
    auto evensSquared = v
        | std::views::filter([](int x) { return x % 2 == 0; })
        | std::views::transform([](int x) { return x * x; });
    std::vector<int> out(evensSquared.begin(), evensSquared.end());
    assert((out == std::vector<int>{4, 64}));

    // Projection: sort by a member, no custom comparator needed.
    std::vector<Order> orders{{"cy", 30.0}, {"ana", 99.5}, {"bo", 12.0}};
    std::ranges::sort(orders, std::ranges::greater{}, &Order::total);
    assert(orders.front().customer == "ana");
    auto it = std::ranges::find(orders, "bo", &Order::customer);
    assert(it != orders.end() && it->total == 12.0);

    // Generators and adaptors.
    int sum = 0;
    for (int i : std::views::iota(1, 11) | std::views::take(3)) {
        sum += i;                                          // 1 + 2 + 3
    }
    assert(sum == 6);

    for (int x : v | std::views::reverse | std::views::take(2)) {
        std::printf("%d ", x);                             // 9 8
    }
    std::printf("\n");
    return 0;
}
```

C++23 adds `views::enumerate`, `zip`, `chunk`, `slide`, `stride`, `join_with`, `cartesian_product` and `std::ranges::to`. GCC 13 already ships most of the views:

```cpp
// c++23 — needs GCC 13+ (views) / GCC 14+ (ranges::to) with -std=c++23
#include <cassert>
#include <cstdio>
#include <ranges>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> names{"ana", "bo", "cy"};
    std::vector<int> scores{90, 75, 82};

    for (auto [i, name] : std::views::enumerate(names)) {          // index + element
        std::printf("%td:%s ", i, name.c_str());
    }
    std::printf("\n");

    for (auto [name, score] : std::views::zip(names, scores)) {    // walk two ranges together
        std::printf("%s=%d ", name.c_str(), score);
    }
    std::printf("\n");

    std::vector<int> data{1, 2, 3, 4, 5, 6, 7};
    int chunks = 0;
    for (auto chunk : data | std::views::chunk(3)) {               // {1,2,3} {4,5,6} {7}
        chunks++;
        (void)chunk;
    }
    assert(chunks == 3);

    int windows = 0;
    for (auto window : data | std::views::slide(3)) {              // {1,2,3} {2,3,4} ... 5 windows
        windows++;
        (void)window;
    }
    assert(windows == 5);
    return 0;
}
```

```cpp
// no-test (C++23 library: GCC 14+ / Clang 17+ with libc++)
auto squares = std::views::iota(1, 6)
             | std::views::transform([](int x) { return x * x; })
             | std::ranges::to<std::vector>();        // materialise a view into a container
```

### 4.3 Three-way comparison `<=>`

```cpp
#include <cassert>
#include <cctype>
#include <compare>
#include <cstdio>
#include <set>
#include <string>

struct Date {
    int year;
    int month;
    int day;
    auto operator<=>(const Date&) const = default;    // memberwise, in declaration order
    // a defaulted <=> also declares a defaulted ==
};

// Custom ordering: case-insensitive names are only *weakly* ordered ("Ana" ~ "ana").
struct Name {
    std::string text;
    std::weak_ordering operator<=>(const Name& other) const {
        for (std::size_t i = 0; i < text.size() && i < other.text.size(); ++i) {
            char a = static_cast<char>(std::tolower(static_cast<unsigned char>(text[i])));
            char b = static_cast<char>(std::tolower(static_cast<unsigned char>(other.text[i])));
            if (a != b) {
                return a <=> b;
            }
        }
        return text.size() <=> other.text.size();
    }
    bool operator==(const Name& other) const {
        return (*this <=> other) == 0;
    }
};

int main() {
    Date a{2024, 5, 1};
    Date b{2024, 6, 1};
    assert(a < b && a != b && b >= a);                  // all six operators from one line

    std::set<Date> dates{{2025, 1, 1}, {2023, 12, 31}};
    assert(dates.begin()->year == 2023);                // works as a map/set key

    assert((1 <=> 2) == std::strong_ordering::less);
    assert((Name{"Ana"} <=> Name{"ana"}) == 0 && Name{"Ana"} == Name{"aNa"});

    double nan = 0.0 / 0.0;
    assert((1.0 <=> nan) == std::partial_ordering::unordered);   // floats: partial ordering

    std::printf("Date and Name comparisons behave as expected\n");
    return 0;
}
```

| Category | Meaning | Typical type |
|---|---|---|
| `std::strong_ordering` | equal values are indistinguishable | integers, pointers, `std::string` |
| `std::weak_ordering` | equivalent values may differ | case-insensitive strings |
| `std::partial_ordering` | some values are unordered | `float`/`double` (NaN) |

### 4.4 Designated initialisers, `consteval`, `constinit`, class-type NTTPs

```cpp
#include <cassert>
#include <cstdint>
#include <cstdio>

struct UartConfig {
    std::uint32_t baud = 115200;
    std::uint8_t dataBits = 8;
    bool parity = false;
    std::uint8_t stopBits = 1;
};

// consteval: MUST run at compile time (an "immediate function").
// Computes the CRC-8 (poly 0x07) lookup-table entry for byte 0x80.
consteval std::uint32_t crc8EntryFor0x80() {
    std::uint32_t crc = 0x80;
    for (int bit = 0; bit < 8; ++bit) {
        crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xFF : (crc << 1) & 0xFF;
    }
    return crc;
}

// constinit: static storage initialised at compile time (no static-init-order fiasco),
// but the variable is still mutable at run time.
constinit int g_bootCount = 0;

// Class-type non-type template parameter (C++20): pass a struct as a template argument.
struct Version {
    int major;
    int minor;
};

template <Version V>
constexpr bool supportsCrc() {
    return V.major > 1 || (V.major == 1 && V.minor >= 2);
}

int main() {
    UartConfig cfg{.baud = 9600, .parity = true};      // unnamed members keep their defaults
    assert(cfg.dataBits == 8 && cfg.stopBits == 1);
    // UartConfig bad{.parity = true, .baud = 9600};  // error: must follow declaration order

    constexpr auto entry = crc8EntryFor0x80();
    static_assert(entry == crc8EntryFor0x80());
    g_bootCount++;

    static_assert(supportsCrc<Version{1, 2}>() && !supportsCrc<Version{1, 1}>());
    std::printf("baud=%u parity=%d crc-entry=0x%02X boots=%d\n",
                static_cast<unsigned>(cfg.baud), cfg.parity, static_cast<unsigned>(entry), g_bootCount);
    return 0;
}
```

| Keyword | Meaning |
|---|---|
| `constexpr` function | *may* run at compile time when its arguments are constant |
| `consteval` function | *must* run at compile time; each call is a constant expression |
| `constexpr` variable | constant, and initialised at compile time |
| `constinit` variable | initialised at compile time, but **mutable** afterwards |
| `if consteval` (C++23) | branch on whether we're currently in constant evaluation |

### 4.5 `std::span`: a non-owning view of contiguous memory

```cpp
#include <array>
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <span>
#include <vector>

// One signature accepts C arrays, std::array, std::vector, and sub-ranges.
std::uint8_t checksum(std::span<const std::uint8_t> data) {
    std::uint8_t sum = 0;
    for (std::uint8_t byte : data) {
        sum = static_cast<std::uint8_t>(sum + byte);
    }
    return sum;
}

// Static extent: the size is part of the type and checked at compile time.
std::uint16_t readHeader(std::span<const std::uint8_t, 2> header) {
    return static_cast<std::uint16_t>((header[0] << 8) | header[1]);
}

void zeroFill(std::span<std::uint8_t> out) {   // writable span
    for (auto& byte : out) {
        byte = 0;
    }
}

int main() {
    std::uint8_t raw[6] = {1, 2, 3, 4, 5, 6};
    std::vector<std::uint8_t> vec(10, 1);
    std::array<std::uint8_t, 2> arr{0x12, 0x34};

    assert(checksum(raw) == 21);
    assert(checksum(vec) == 10);
    assert(checksum(std::span(raw).subspan(2, 3)) == 12);     // {3, 4, 5}
    assert(checksum(std::span(raw).first(2)) == 3);
    assert(checksum(std::span(raw).last(1)) == 6);
    assert(readHeader(arr) == 0x1234);

    zeroFill(std::span(vec).first(5));
    assert(checksum(vec) == 5);

    std::printf("span: size=%zu bytes=%zu\n", std::span(raw).size(), std::span(raw).size_bytes());
    return 0;
}
```

`span` replaces the error-prone `(const uint8_t* p, size_t n)` pair at zero cost. Like `string_view`, it doesn't own anything: don't let it outlive the buffer.

### 4.6 `std::format`, and `std::print` in C++23

```cpp
#include <cassert>
#include <cstdio>
#include <format>
#include <string>

struct Temperature {
    double celsius;
};

// Make your own type formattable.
template <>
struct std::formatter<Temperature> : std::formatter<double> {
    auto format(const Temperature& t, std::format_context& ctx) const {
        auto out = std::formatter<double>::format(t.celsius, ctx);   // reuse {:.1f} etc.
        return std::format_to(out, "°C");
    }
};

int main() {
    std::string s = std::format("{} has {:>5} pts ({:.1f}%)", "ana", 42, 93.456);
    assert(s == "ana has    42 pts (93.5%)");

    assert(std::format("{:#010x}", 255) == "0x000000ff");   // alternate form, zero-padded, width 10
    assert(std::format("{:b}", 5) == "101");
    assert(std::format("{:<6}|{:^6}|{:>6}", "l", "c", "r") == "l     |  c   |     r");
    assert(std::format("{1} before {0}", "b", "a") == "a before b");   // positional arguments
    assert(std::format("{:.1f}", Temperature{21.46}) == "21.5°C");

    // std::format("{:d}", "text");   // compile error: format string checked at compile time
    std::printf("%s\n", s.c_str());
    return 0;
}
```

```cpp
// no-test (C++23 <print>: GCC 14+, Clang 18+ with libc++, MSVC 19.37+)
#include <print>
int main() {
    std::println("temp={:.1f}C sensors={}", 21.5, 3);   // type-safe printf, writes UTF-8 correctly
    std::print(stderr, "warning: {}\n", "low battery");
}
```

`std::format` is type-safe (checked at compile time through a `consteval` constructor), extensible through `std::formatter<T>`, and much faster than iostreams. It allocates a `std::string`. Use `std::format_to` or `format_to_n` with a buffer to avoid that.

### 4.7 Coroutines

A **coroutine** is a function that can **suspend** (`co_await`, `co_yield`) and **resume** later. Its locals live in a coroutine *frame*, which is usually heap-allocated, though the compiler can often elide the allocation. The language supplies only the machinery. Libraries supply the types: `std::generator` (C++23), Asio awaitables, cppcoro, folly.

C++20 ships no ready-made generator, so here is a minimal one. It shows every piece: `promise_type`, `initial_suspend`, `yield_value` and `coroutine_handle`.

```cpp
#include <cassert>
#include <coroutine>
#include <cstdint>
#include <cstdio>
#include <exception>
#include <utility>

template <typename T>
class Generator {
public:
    struct promise_type {
        T current{};
        Generator get_return_object() {
            return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }   // lazy: don't run until asked
        std::suspend_always final_suspend() noexcept { return {}; }     // keep frame alive for done()
        std::suspend_always yield_value(T value) noexcept {             // co_yield value
            current = std::move(value);
            return {};
        }
        void return_void() noexcept {}
        void unhandled_exception() { std::terminate(); }
    };

    explicit Generator(std::coroutine_handle<promise_type> h) : handle_(h) {}
    Generator(Generator&& other) noexcept : handle_(std::exchange(other.handle_, {})) {}
    Generator(const Generator&) = delete;
    ~Generator() {
        if (handle_) {
            handle_.destroy();            // free the coroutine frame
        }
    }

    bool next() {                         // resume until the next co_yield (or the end)
        handle_.resume();
        return !handle_.done();
    }
    const T& value() const { return handle_.promise().current; }

private:
    std::coroutine_handle<promise_type> handle_;
};

Generator<std::uint64_t> fibonacci() {
    std::uint64_t a = 0;
    std::uint64_t b = 1;
    while (true) {
        co_yield a;                       // suspend here, hand `a` to the caller
        a = std::exchange(b, a + b);      // resumes here on the next next()
    }
}

// A state machine written as straight-line code: parse "key=value;" pairs one char at a time.
Generator<int> countFields(const char* text) {
    int fields = 0;
    for (const char* p = text; *p != '\0'; ++p) {
        if (*p == ';') {
            fields++;
            co_yield fields;
        }
    }
}

int main() {
    auto fib = fibonacci();
    std::uint64_t last = 0;
    for (int i = 0; i < 10 && fib.next(); ++i) {
        std::printf("%llu ", static_cast<unsigned long long>(fib.value()));
        last = fib.value();
    }
    std::printf("\n");
    assert(last == 34);

    auto fields = countFields("a=1;b=2;c=3;");
    int seen = 0;
    while (fields.next()) {
        seen = fields.value();
    }
    assert(seen == 3);
    return 0;
}
```

With C++23 the library type does all of that for you:

```cpp
// no-test (C++23 <generator>: GCC 14+, MSVC 19.40+)
std::generator<std::uint64_t> fibonacci() {
    std::uint64_t a = 0, b = 1;
    while (true) { co_yield a; a = std::exchange(b, a + b); }
}
for (auto f : fibonacci() | std::views::take(10)) { std::println("{}", f); }
```

Typical uses are lazy sequences, async I/O without callback nesting (`co_await socket.read()`), and protocol parsers or state machines written as straight-line code. The costs to mention in an interview: a possible heap allocation per coroutine, hard debugging, and lifetime traps (a coroutine that takes a reference parameter can outlive the referenced object).

### 4.8 Modules

```cpp
// no-test (needs a module-aware build: CMake 3.28+ with Ninja, or MSVC)
// math.cppm — module interface unit
export module math;
export int add(int a, int b) { return a + b; }
int helper() { return 42; }          // not exported: invisible to importers

// main.cpp
import math;
import std;                          // C++23: the whole standard library as one module
int main() { std::println("{}", add(2, 3)); }
```

| Headers | Modules |
|---|---|
| textually pasted and re-parsed in every TU | compiled once to a binary module interface (BMI) |
| macros leak in both directions | macros don't cross the boundary |
| everything declared is visible | only `export`ed names are visible |
| include order can change meaning | import order doesn't matter |
| needs include guards / `#pragma once` | no guards needed |

Know the concept and its benefits. Most production code still uses headers, because build-system and toolchain support (especially for embedded compilers) is still maturing. See the *CMake* guide for `FILE_SET CXX_MODULES`.

### 4.9 Concurrency upgrades: `jthread`, `stop_token`, latch, semaphore, `atomic::wait`

```cpp
#include <atomic>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <latch>
#include <semaphore>
#include <thread>
#include <vector>

using namespace std::chrono_literals;

int main() {
    // jthread: joins in its destructor and supports cooperative cancellation.
    std::atomic<int> polls{0};
    {
        std::jthread worker([&](std::stop_token st) {
            while (!st.stop_requested()) {
                polls++;
                std::this_thread::sleep_for(1ms);
            }
        });
        std::this_thread::sleep_for(20ms);
    }   // ~jthread: request_stop() then join() -- no std::terminate
    assert(polls > 0);

    // latch: one-shot countdown. The main thread waits for 3 workers to finish setup.
    std::latch ready(3);
    std::counting_semaphore<2> slots(2);      // at most 2 workers in the "critical" region
    std::atomic<int> inside{0};
    std::atomic<int> maxInside{0};
    {
        std::vector<std::jthread> workers;
        for (int i = 0; i < 3; ++i) {
            workers.emplace_back([&] {
                ready.count_down();
                slots.acquire();
                int now = ++inside;
                int seen = maxInside.load();
                while (now > seen && !maxInside.compare_exchange_weak(seen, now)) {
                }
                std::this_thread::sleep_for(5ms);
                --inside;
                slots.release();
            });
        }
        ready.wait();                         // all 3 have started
    }
    assert(maxInside <= 2);

    // atomic::wait/notify: block until the value changes (no busy loop, no condition_variable).
    std::atomic<bool> done{false};
    std::jthread producer([&] {
        std::this_thread::sleep_for(5ms);
        done = true;
        done.notify_one();
    });
    done.wait(false);                         // sleeps while the value is still false
    assert(done);

    std::printf("polls>0, max concurrent=%d\n", maxInside.load());
    return 0;
}
```

The *Concurrency* guide covers these tools in depth.

### 4.10 Smaller C++20 gems

```cpp
#include <bit>
#include <cassert>
#include <cstdio>
#include <map>
#include <numbers>
#include <source_location>
#include <string>
#include <utility>
#include <vector>

enum class Color { Red, Green, Blue };

const char* colorName(Color c) {
    switch (c) {
        using enum Color;                       // C++20: enumerators without the prefix
        case Red: return "red";
        case Green: return "green";
        case Blue: return "blue";
    }
    return "?";
}

void logHere(const char* message, std::source_location loc = std::source_location::current()) {
    std::printf("[%s:%u %s] %s\n", loc.file_name(), static_cast<unsigned>(loc.line()),
                loc.function_name(), message);   // no __FILE__/__LINE__ macros needed
}

int main() {
    std::map<std::string, int> m{{"a", 1}};
    assert(m.contains("a") && !m.contains("z"));            // instead of find() != end()

    std::vector<int> v{-2, 5, -1, 7};
    std::erase_if(v, [](int x) { return x < 0; });           // instead of erase-remove
    assert(v.size() == 2 && std::ssize(v) == 2);             // signed size

    assert(std::cmp_less(-1, 1u));                           // true; plain -1 < 1u is false!
    assert(std::popcount(0b1011u) == 3);
    assert(std::bit_ceil(17u) == 32u && std::bit_floor(17u) == 16u);
    assert(std::has_single_bit(64u) && std::countr_zero(8u) == 3);
    assert(std::rotl(0x80000001u, 1) == 0x00000003u);
    assert(std::numbers::pi > 3.14159 && std::numbers::pi < 3.14160);

    int hits = 0;
    for (int x : v) {
        if (x > 0) [[likely]] {                              // branch-layout hint
            hits++;
        }
    }
    assert(hits == 2);

    auto twice = []<typename T>(const std::vector<T>& values) {   // template lambda
        return values.size() * 2;
    };
    assert(twice(v) == 4);

    assert(std::string(colorName(Color::Blue)) == "blue");
    logHere("gems ok");
    return 0;
}
```

---

## 5. C++23 highlights

Some C++23 library features (`print`, `generator`, `mdspan`, `flat_map`, `ranges::to`) need GCC 14/15 or recent libc++. Language features such as deducing `this` are in Clang 18 and GCC 14.

### 5.1 `std::expected`, monadic `optional`, `to_underlying`, `byteswap`, `unreachable`

```cpp
// c++23 — std::expected needs GCC 12+ / Clang 16+ (libc++) with -std=c++23
#include <bit>
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <expected>
#include <optional>
#include <string>
#include <utility>

enum class Error { Empty, NotANumber, OutOfRange };
enum class Mode : std::uint8_t { Off = 0, Eco = 3, Turbo = 7 };

std::expected<int, Error> parsePercent(const std::string& s) {
    if (s.empty()) {
        return std::unexpected(Error::Empty);
    }
    int value = 0;
    for (char c : s) {
        if (c < '0' || c > '9') {
            return std::unexpected(Error::NotANumber);
        }
        value = value * 10 + (c - '0');
        if (value > 100) {
            return std::unexpected(Error::OutOfRange);
        }
    }
    return value;
}

const char* modeName(Mode m) {
    switch (m) {
        case Mode::Off: return "off";
        case Mode::Eco: return "eco";
        case Mode::Turbo: return "turbo";
    }
    std::unreachable();          // promise to the optimiser: every enumerator is handled
}

int main() {
    // expected: value or error, with monadic chaining.
    auto half = parsePercent("80").transform([](int p) { return p / 2; });
    assert(half.has_value() && *half == 40);
    assert(parsePercent("x1").error() == Error::NotANumber);
    assert(parsePercent("150").value_or(-1) == -1);

    // C++23 monadic optional: and_then / transform / or_else.
    std::optional<std::string> input = "42";
    auto doubled = input
        .and_then([](const std::string& s) -> std::optional<int> {
            return s.empty() ? std::nullopt : std::optional<int>(std::stoi(s));
        })
        .transform([](int n) { return n * 2; });
    assert(doubled == 84);

    assert(std::to_underlying(Mode::Turbo) == 7);            // enum -> underlying integer
    assert(std::byteswap(std::uint32_t{0x11223344}) == 0x44332211u);
    std::printf("mode=%s half=%d\n", modeName(Mode::Eco), *half);
    return 0;
}
```

### 5.2 Deducing `this`

An explicit object parameter replaces the need for duplicate `const`/non-`const`/`&&` overloads, and allows recursive lambdas:

```cpp
// c++23 — needs GCC 14+, Clang 18+ or MSVC 19.32+ with -std=c++23
#include <cassert>
#include <cstdio>
#include <string>
#include <utility>

class Widget {
public:
    explicit Widget(std::string name) : name_(std::move(name)) {}

    // One template replaces three overloads: const&, &, and && (which moves out).
    template <class Self>
    auto&& name(this Self&& self) {
        return std::forward<Self>(self).name_;
    }

private:
    std::string name_;
};

int main() {
    Widget w("gear");
    const Widget& cw = w;
    assert(cw.name() == "gear");                   // const std::string&
    w.name() += "box";                             // std::string& (mutable)
    std::string stolen = std::move(w).name();      // std::string&& -> moved out
    assert(stolen == "gearbox");

    // Recursive lambda without std::function: `self` is the lambda itself.
    auto fib = [](this auto const& self, int n) -> int {
        return n < 2 ? n : self(n - 1) + self(n - 2);
    };
    assert(fib(10) == 55);
    std::printf("deducing this: %s, fib(10)=%d\n", stolen.c_str(), fib(10));
    return 0;
}
```

### 5.3 Library additions to recognise

```cpp
// no-test (C++23 library: GCC 14/15, recent libc++, MSVC 19.40+)
#include <flat_map>
#include <mdspan>
#include <print>
#include <stacktrace>

std::vector<double> data(rows * cols);
std::mdspan grid(data.data(), rows, cols);        // non-owning multidimensional view
grid[r, c] = 1.0;                                 // multi-argument operator[]

std::flat_map<int, std::string> fm;               // sorted vectors: cache-friendly lookups, O(n) inserts
fm.emplace(3, "three");

std::move_only_function<void()> job = [p = std::make_unique<int>(1)] { };   // std::function can't hold this

[[assume(n > 0)]];                                // optimiser may assume it; UB if false
std::println("{}", std::stacktrace::current());   // portable stack trace
auto copy = auto(vec);                            // decay-copy: an explicit prvalue copy
```

---

## 6. C++26: where the language is going

| Feature | What it gives you |
|---|---|
| **Static reflection** (`^^T`, `std::meta`) | iterate over a struct's members at compile time: serialisation and enum-to-string without macros |
| **Contracts** (`pre`, `post`, `contract_assert`) | preconditions and postconditions in the function signature, with selectable checking |
| **`std::execution`** (senders/receivers) | a standard model for asynchronous and parallel work, schedulers, cancellation |
| `std::inplace_vector<T, N>` | fixed-capacity vector with no heap; ideal for embedded |
| `#embed "file.bin"` | include binary data as an array initialiser |
| Pack indexing `Ts...[0]` | pick an element of a parameter pack directly |
| `= delete("reason")` | a custom message when someone calls a deleted function |
| `std::hive`, hazard pointers, RCU | specialised containers and concurrent memory reclamation |
| Erroneous behaviour | reading an uninitialised variable is no longer UB |

---

## 7. Choosing a standard for a project

| Situation | Recommendation |
|---|---|
| New desktop/server project | C++20, or C++23 if every target compiler supports what you use |
| Library used by others | the oldest standard your users need (often C++17), with feature-test macros for extras |
| Embedded (Cortex-M with arm-none-eabi-gcc 12/13) | C++17/20 language with `-fno-exceptions -fno-rtti`; avoid heap-heavy library parts (`std::function`, `std::format` allocations) |
| Safety-critical (MISRA C++:2023) | MISRA C++:2023 targets C++17 and restricts dynamic memory, exceptions and parts of the library |

```cpp
#include <cstdio>
#include <version>          // C++20: all __cpp_lib_* feature-test macros in one header

int main() {
    std::printf("__cplusplus = %ldL\n", static_cast<long>(__cplusplus));
#if defined(__cpp_concepts)
    std::printf("concepts: %ld\n", static_cast<long>(__cpp_concepts));
#endif
#if defined(__cpp_lib_format)
    std::printf("std::format available\n");
#endif
#if defined(__cpp_lib_expected)
    std::printf("std::expected available\n");
#else
    std::printf("std::expected not available in this mode\n");
#endif
    return 0;
}
```

`__cplusplus` is `201703L` for C++17, `202002L` for C++20 and `202302L` for C++23. MSVC reports `199711L` unless you pass `/Zc:__cplusplus`.

---

## 8. What to say in interviews

- "I default to C++20: concepts for template interfaces, `std::span` and `string_view` for non-owning parameters, ranges for pipelines, `std::format` for formatting, `jthread` for threads, smart pointers for ownership, and `[[nodiscard]]`/`optional`/`expected` for errors."
- Know **why** each feature exists (the problem it solves), not just the syntax.
- Be honest about tooling maturity: modules and parts of the C++23 library may not be available on every compiler, especially embedded toolchains.

### Interview checklist

- [ ] Place `auto`, lambdas, `make_unique`, structured bindings, `if constexpr`, concepts, `span`, `expected` in the right standard.
- [ ] Write C++17 idioms: structured bindings, `if`-init, `optional`/`variant` + `visit`, fold expressions, CTAD.
- [ ] Explain guaranteed copy elision vs NRVO.
- [ ] Concepts vs SFINAE; requires-expressions; overloading by constraint.
- [ ] Views are lazy, and they don't own their data; projections in `ranges::` algorithms.
- [ ] Defaulted `<=>`; the strong, weak and partial ordering categories.
- [ ] `constexpr` vs `consteval` vs `constinit`.
- [ ] Coroutine anatomy: `promise_type`, `co_yield`/`co_await`/`co_return`, frame lifetime.
- [ ] Modules vs headers.
- [ ] `jthread`/`stop_token`, latch/semaphore, `atomic::wait`.
- [ ] C++23: `expected`, `print`, deducing `this`, `mdspan`, `flat_map`, `generator`, `ranges::to`.

---

## Practice

1. Rewrite this C++03-style code in modern C++ (C++17/20): `std::map<std::string, int>::iterator it = m.find(k); if (it != m.end()) { int v = it->second; ... }`, and a function `void send(const uint8_t* data, size_t len)`.
2. Write a variadic `allPositive(args...)` that returns `true` if every argument is greater than zero, using a fold expression.
3. Make `struct Version { int major, minor, patch; };` sortable and usable as a `std::set` key with a single line, and show that `{1,2,3} < {1,10,0}`.
4. Write a coroutine-free C++20 pipeline that takes the words of a `std::vector<std::string>`, keeps the ones longer than 3 characters, upper-cases their first letter, and collects them into a new vector.
5. What's the difference between `constexpr int x = f();`, `constinit int y = f();` and `consteval int f();`?

:::details Show solution
1.
```cpp
#include <cassert>
#include <cstdint>
#include <map>
#include <numeric>
#include <span>
#include <string>
#include <vector>

int send(std::span<const std::uint8_t> data) {            // one parameter instead of (ptr, len)
    return std::accumulate(data.begin(), data.end(), 0);
}

int main() {
    std::map<std::string, int> m{{"k", 5}};
    if (auto it = m.find("k"); it != m.end()) {             // if-init: `it` doesn't leak
        auto& [key, value] = *it;                           // structured binding
        assert(key == "k" && value == 5);
    }
    if (m.contains("k")) {                                  // C++20, when only presence matters
        assert(m.at("k") == 5);
    }
    std::vector<std::uint8_t> payload{1, 2, 3};
    assert(send(payload) == 6);
    return 0;
}
```
2.
```cpp
#include <cassert>

template <typename... Ts>
constexpr bool allPositive(Ts... args) {
    return ((args > 0) && ...);      // unary right fold; empty pack -> true
}

static_assert(allPositive(1, 2.5, 3L));
static_assert(!allPositive(1, -2, 3));
static_assert(allPositive());

int main() {
    assert(allPositive(4, 5));
    return 0;
}
```
3.
```cpp
#include <cassert>
#include <compare>
#include <set>

struct Version {
    int major;
    int minor;
    int patch;
    auto operator<=>(const Version&) const = default;   // the single line
};

int main() {
    assert((Version{1, 2, 3} < Version{1, 10, 0}));      // compares major, then minor, then patch
    std::set<Version> versions{{2, 0, 0}, {1, 10, 0}, {1, 2, 3}};
    assert(versions.begin()->minor == 2);
    return 0;
}
```
4.
```cpp
#include <cassert>
#include <cctype>
#include <ranges>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> words{"the", "quick", "fox", "jumps"};
    auto view = words
        | std::views::filter([](const std::string& w) { return w.size() > 3; })
        | std::views::transform([](std::string w) {
              w[0] = static_cast<char>(std::toupper(static_cast<unsigned char>(w[0])));
              return w;
          });
    std::vector<std::string> result(view.begin(), view.end());   // C++23: | std::ranges::to<std::vector>()
    assert((result == std::vector<std::string>{"Quick", "Jumps"}));
    return 0;
}
```
5. `constexpr int x = f();` requires `f()` to be evaluated at compile time, and `x` is `const`. `constinit int y = f();` also requires compile-time initialisation, but `y` stays **mutable**. It is used for globals and `thread_local`s to rule out the static initialisation order fiasco. `consteval int f();` declares an *immediate function*: every call must produce a constant, so calling it with a run-time value is a compile error. A `constexpr` function, in contrast, *may* run at run time.
:::

---

## Interview Q&A

- **Name four headline features of C++20.** Concepts, ranges, coroutines and modules — plus `<=>`, `std::span`, `std::format`, `std::jthread`, designated initialisers, `consteval`/`constinit`.
- **What problem do concepts solve?** They give templates named, checked constraints, producing readable errors at the call site and enabling overloading by constraint — replacing SFINAE/`enable_if` tricks.
- **What is `std::span` and when do you use it?** A non-owning view of a contiguous sequence (pointer + size). Use it for function parameters instead of `(T* ptr, size_t len)`; it accepts C arrays, `std::array` and `std::vector`.
- **What does `auto operator<=>(const T&) const = default;` give you?** Memberwise three-way comparison, from which the compiler derives `<`, `<=`, `>`, `>=`; a defaulted `<=>` also implicitly declares a defaulted `==`.
- **How is `std::jthread` better than `std::thread`?** It joins automatically in its destructor (a joinable `std::thread` would call `std::terminate`) and supports cooperative cancellation via `std::stop_token`.
- **What is a dangling `string_view` and how does it happen?** A `string_view` doesn't own its characters; if the `std::string` it refers to is destroyed (e.g. a temporary or a local returned from a function), the view points at freed memory.
- **What does C++23's `std::expected<T, E>` provide?** A value-or-error return type: either a `T` or an error `E`, explicitly checked by the caller — error handling without exceptions.
- **What is guaranteed copy elision?** Since C++17, initialising an object from a prvalue of the same type (e.g. `return T{};` or `T x = T{};`) constructs it directly in place. No copy or move constructor is called or even required.
- **What does `if constexpr` do that a normal `if` can't?** It discards the untaken branch at compile time, so that branch may contain code that wouldn't compile for the current template arguments.
- **What's a fold expression?** A C++17 way to apply a binary operator across a parameter pack, e.g. `(args + ...)` or `((std::cout << args), ...)`, replacing recursive variadic templates.
- **What's the difference between `consteval` and `constexpr`?** A `constexpr` function *may* be evaluated at compile time; a `consteval` function *must* be, and every call has to produce a constant.
- **How does a coroutine differ from a normal function?** It can suspend and resume; its state lives in a coroutine frame (often heap-allocated) rather than on the stack, and its return type's `promise_type` controls its behaviour.
- **Why use modules instead of headers?** Faster builds (interfaces compiled once), no macro leakage, explicit exports and order independence; the cost is immature build-system/toolchain support.
- **What does deducing `this` (C++23) solve?** It lets one member function template replace `const`/non-`const`/rvalue overloads, and enables recursive lambdas and CRTP-like patterns without templates on the class.

---

## External resources

- **cppreference — C++11/14/17/20/23/26 feature pages** and **Compiler support** tables.
- **Anthony Calandra — "modern-cpp-features"** (GitHub cheatsheet with examples for each standard).
- **Bjarne Stroustrup — *A Tour of C++* (3rd ed., C++20)**.
- **Nicolai Josuttis — *C++17: The Complete Guide* and *C++20: The Complete Guide*.**
- **Lewis Baker — "Asymmetric Transfer"** blog (coroutines explained in depth).
- **Barry Revzin's blog** and the **ISO C++ trip reports** (Herb Sutter) for what's coming in C++26.
