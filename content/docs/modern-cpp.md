# Modern C++ (11 → 23) Feature Map

"Modern C++" means C++11 and later. Interviewers expect you to be fluent in C++17 and comfortable with the headline **C++20** features; C++23 knowledge is a bonus. This page maps what each standard added, then deep-dives C++20.

> **Tip:** Compile with `-std=c++20` (GCC ≥ 11, Clang ≥ 14, MSVC 19.29+). For C++23 use `-std=c++23` (GCC 13+/14+, Clang 17+). Check support at cppreference "compiler support".

## The map

| Standard | Headline features |
|---|---|
| **C++11** | `auto`, range-for, lambdas, move semantics & rvalue refs, `nullptr`, `constexpr`, `unique_ptr`/`shared_ptr`, `std::thread`/`mutex`/`atomic`, `enum class`, `override`/`final`, uniform `{}` init, `initializer_list`, variadic templates, `static_assert`, `unordered_map`, `std::array`, `= default`/`= delete`, delegating ctors, `noexcept`, user-defined literals |
| **C++14** | generic lambdas (`auto` params), init captures, `make_unique`, relaxed `constexpr`, `auto` return types, binary literals `0b1010`, digit separators `1'000'000`, `std::exchange`, `[[deprecated]]` |
| **C++17** | structured bindings, `if`/`switch` with initialiser, `if constexpr`, fold expressions, CTAD, `std::optional`/`variant`/`any`, `std::string_view`, `std::filesystem`, parallel algorithms, inline variables, nested namespaces `a::b::c`, guaranteed copy elision, `[[nodiscard]]`/`[[maybe_unused]]`/`[[fallthrough]]`, `std::byte`, `<charconv>` |
| **C++20** | **concepts**, **ranges**, **coroutines**, **modules**, three-way comparison `<=>`, designated initialisers, `consteval`/`constinit`, `std::span`, `std::format`, `std::jthread` & `stop_token`, `<bit>`, `std::source_location`, `<numbers>`, calendar/time zones, `contains()`, `std::erase_if`, template lambdas, `[[likely]]`, `using enum`, `char8_t`, semaphores/latches/barriers, `atomic<shared_ptr>`, `std::ssize`, `std::cmp_less` |
| **C++23** | `std::expected`, `std::print`/`println`, deducing `this`, `std::mdspan`, `std::flat_map`, `std::generator`, `ranges::to`, `views::zip`/`enumerate`/`chunk`/`slide`, `if consteval`, `std::byteswap`, `std::to_underlying`, `std::unreachable`, multidimensional `operator[]`, `import std;` |
| **C++26** (finalising) | static reflection, contracts, `std::execution` (senders/receivers), `std::inplace_vector`, `#embed`, pack indexing, `= delete("reason")`, linear algebra |

## C++11–17 essentials you must write fluently

```cpp
// Structured bindings + if-init (C++17)
std::map<std::string, int> ages{{"ana", 31}, {"bo", 25}};
for (const auto& [name, age] : ages) std::cout << name << '=' << age << '\n';
if (auto it = ages.find("bo"); it != ages.end()) it->second++;

// optional / variant / string_view
std::optional<int> find_id(std::string_view name);
std::variant<int, std::string> token = "id";
std::visit([](const auto& v) { std::cout << v; }, token);

// enum class: scoped, strongly typed, explicit underlying type
enum class State : uint8_t { Idle, Running, Fault };
State s = State::Idle;
```

> **Warning:** `std::string_view` doesn't own its data. Never return a `string_view` to a local `std::string`, and never store one longer than the string it views.

## C++20 deep dive

### 1. Concepts
Constrain templates with readable predicates. Full guide: *Templates & Concepts*.

```cpp
template <typename T>
concept Number = std::integral<T> || std::floating_point<T>;

auto average(const std::vector<Number auto>& v);   // error out early if misused

template <Number T>
T clamp01(T x) { return std::clamp(x, T{0}, T{1}); }
```

### 2. Ranges
Algorithms that take whole ranges, plus lazy, composable **views**. Full guide: *Algorithms & Ranges*.

```cpp
#include <ranges>
std::vector<int> v{5, 3, 8, 1, 9, 2};
std::ranges::sort(v);                                   // no begin()/end() noise

auto evens_squared = v
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; });   // lazy: nothing computed yet
for (int x : evens_squared) std::cout << x << ' ';      // 4 64

for (int i : std::views::iota(0, 5)) {}                 // 0..4
for (auto [i, x] : std::views::enumerate(v)) {}          // C++23
auto vec = evens_squared | std::ranges::to<std::vector>();  // C++23
```

### 3. Three-way comparison `<=>` ("spaceship")

```cpp
struct Date {
    int year, month, day;
    auto operator<=>(const Date&) const = default;   // generates <, <=, >, >=, and == (because defaulted)
};
Date a{2024, 5, 1}, b{2024, 6, 1};
bool earlier = a < b;                               // memberwise lexicographic
auto ord = (1 <=> 2);                               // std::strong_ordering::less
```

Return types: `std::strong_ordering` (ints), `std::weak_ordering` (case-insensitive strings), `std::partial_ordering` (floats — NaN is unordered).

### 4. Designated initialisers

```cpp
struct UartConfig { uint32_t baud = 115200; uint8_t data_bits = 8; bool parity = false; };
UartConfig cfg{.baud = 9600, .parity = true};      // must follow declaration order
```

Hugely readable for config structs and embedded peripheral setup.

### 5. `std::span` — non-owning view of contiguous memory

```cpp
void checksum(std::span<const uint8_t> data);   // pointer + size in one type
uint8_t raw[64]; std::vector<uint8_t> vec(128); std::array<uint8_t, 8> arr{};
checksum(raw); checksum(vec); checksum(arr);     // all work
checksum({raw + 4, 16});                         // sub-span
std::span<const uint8_t, 8> fixed = arr;         // static extent: size known at compile time
auto header = std::span(vec).first(4);           // first(), last(), subspan()
```

Replaces the error-prone `(const uint8_t* p, size_t n)` pair. Zero overhead.

### 6. `std::format` (and C++23 `std::print`)

```cpp
#include <format>
std::string s = std::format("{} has {:>5} pts ({:.1f}%)", "ana", 42, 93.456);
// "ana has    42 pts (93.5%)"
std::format("{:#010x}", 255);        // "0x000000ff"
std::format("{:b}", 5);              // "101"
std::println("temp={}C", 21.5);      // C++23 <print>: type-safe printf
```

Type-safe (format strings checked at compile time via `consteval`), extensible (`std::formatter<T>` specialisation), and faster than iostreams.

### 7. Coroutines

Functions that can **suspend** (`co_await`, `co_yield`) and **resume** later, with state stored in a heap-allocated (often elided) frame. The language gives the machinery; libraries provide the types (`std::generator` in C++23, `cppcoro`, Asio awaitables).

```cpp
#include <generator>            // C++23
std::generator<uint64_t> fibonacci() {
    uint64_t a = 0, b = 1;
    while (true) {
        co_yield a;             // suspend, hand out a value
        a = std::exchange(b, a + b);
    }
}
for (auto f : fibonacci() | std::views::take(10)) std::cout << f << ' ';
```

Use cases: lazy sequences, async I/O without callback hell, state machines (e.g. protocol parsers) written as straight-line code.

### 8. Modules

```cpp
// math.cppm
export module math;
export int add(int a, int b) { return a + b; }

// main.cpp
import math;
import std;                      // C++23 standard library module
int main() { std::println("{}", add(2, 3)); }
```

Benefits: faster builds (no re-parsing headers), no macro leakage, explicit exports. Tooling support (CMake 3.28+, Ninja) is maturing — know the concept, but most codebases still use headers.

### 9. `std::jthread` and stop tokens

```cpp
std::jthread worker([](std::stop_token st) {
    while (!st.stop_requested()) { poll_sensor(); std::this_thread::sleep_for(10ms); }
});
// destructor requests stop AND joins automatically — no std::terminate on forgetting join()
```

### 10. Smaller C++20 gems

```cpp
if (map.contains(key)) {}                       // instead of find() != end()
std::erase_if(vec, [](int x) { return x < 0; }); // instead of erase-remove idiom
std::ssize(vec);                                 // signed size
std::cmp_less(-1, 1u);                           // true — safe mixed-sign compare
std::popcount(0b1011u);                          // 3   (<bit>)
std::bit_ceil(17u);                              // 32
std::numbers::pi;                                // <numbers>
auto loc = std::source_location::current();      // file/line/function without macros
if (x > 0) [[likely]] { }                        // branch hints
using enum State;                                // bring enumerators into scope
std::latch done(3); std::counting_semaphore<4> slots(4);
template <auto N> struct Fixed {};               // class-type NTTPs, e.g. compile-time strings
```

## C++23 highlights

```cpp
std::expected<Config, Error> load();                // value or error (see Error Handling)

struct Widget {
    template <class Self>
    auto&& name(this Self&& self) { return std::forward<Self>(self).name_; }  // deducing this
    std::string name_;
};

std::mdspan grid(data.data(), rows, cols);          // multidimensional view
grid[r, c] = 1.0;                                   // multi-arg operator[]

std::flat_map<int, std::string> fm;                 // sorted vector-backed map: cache-friendly
auto u = std::to_underlying(State::Fault);          // enum -> underlying integer
[[assume(n > 0)]];                                  // optimiser hint
std::unreachable();                                 // tell the compiler a path is impossible
```

## What to say in interviews

- "I default to C++20: concepts for template interfaces, `std::span` and `string_view` for non-owning parameters, ranges for pipelines, `std::format` for formatting, `jthread` for threads, and smart pointers for ownership."
- Know **why** each feature exists (the problem it solves), not just syntax.
- Be honest about tooling maturity: modules and some C++23 library parts may not be available on every compiler, especially embedded toolchains (many are on GCC 10–13 with partial C++20).

## Interview Q&A

- **Name four headline features of C++20.** Concepts, ranges, coroutines and modules — plus `<=>`, `std::span`, `std::format`, `std::jthread`, designated initialisers, `consteval`/`constinit`.
- **What problem do concepts solve?** They give templates named, checked constraints, producing readable errors at the call site and enabling overloading by constraint — replacing SFINAE/`enable_if` tricks.
- **What is `std::span` and when do you use it?** A non-owning view of a contiguous sequence (pointer + size). Use it for function parameters instead of `(T* ptr, size_t len)`; it accepts C arrays, `std::array` and `std::vector`.
- **What does `auto operator<=>(const T&) const = default;` give you?** Memberwise three-way comparison, from which the compiler derives `<`, `<=`, `>`, `>=`; a defaulted `<=>` also implicitly declares a defaulted `==`.
- **How is `std::jthread` better than `std::thread`?** It joins automatically in its destructor (a joinable `std::thread` would call `std::terminate`) and supports cooperative cancellation via `std::stop_token`.
- **What is a dangling `string_view` and how does it happen?** A `string_view` doesn't own its characters; if the `std::string` it refers to is destroyed (e.g. a temporary or a local returned from a function), the view points at freed memory.
- **What does C++23's `std::expected<T, E>` provide?** A value-or-error return type: either a `T` or an error `E`, explicitly checked by the caller — error handling without exceptions.
