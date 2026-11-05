# Templates & Concepts

Templates are C++'s compile-time code generation mechanism: you write code once for "some type `T`" and the compiler **instantiates** a concrete version for each type used. C++20 **concepts** finally give templates readable constraints and error messages.

## 1. Function templates

```cpp
template <typename T>
T max_of(T a, T b) { return a < b ? b : a; }

max_of(3, 7);          // T deduced as int
max_of(2.5, 1.0);      // T = double
// max_of(3, 2.5);     // error: conflicting deductions (int vs double)
max_of<double>(3, 2.5);// explicit
```

The template itself generates no code; each distinct `T` used produces an instantiation (this is why templates usually live in headers — the definition must be visible at the point of instantiation).

## 2. Class templates

```cpp
template <typename T, std::size_t N>
class StaticVector {                      // fixed capacity, no heap: embedded-friendly
    std::array<T, N> data_{};
    std::size_t size_ = 0;
public:
    constexpr bool push_back(const T& v) {
        if (size_ == N) return false;
        data_[size_++] = v;
        return true;
    }
    constexpr T& operator[](std::size_t i) { return data_[i]; }
    constexpr std::size_t size() const { return size_; }
    constexpr auto begin() { return data_.begin(); }
    constexpr auto end() { return data_.begin() + size_; }
};

StaticVector<int, 16> v;          // N is a non-type template parameter
std::pair p{1, 2.0};              // C++17 CTAD: deduces pair<int, double>
std::vector w{1, 2, 3};           // vector<int>
```

### Non-type template parameters

Integers, enums, pointers, and (C++20) floating point and structural class types:

```cpp
template <uint32_t BaseAddr>
struct Gpio {
    static void set(int pin) { *reinterpret_cast<volatile uint32_t*>(BaseAddr + 0x18) = 1u << pin; }
};
using GpioA = Gpio<0x48000000>;    // zero-cost hardware abstraction
```

## 3. Specialisation

```cpp
template <typename T> struct TypeName { static constexpr const char* value = "unknown"; };
template <> struct TypeName<int>     { static constexpr const char* value = "int"; };     // full
template <typename T> struct TypeName<T*> { static constexpr const char* value = "pointer"; }; // partial

static_assert(std::string_view(TypeName<int*>::value) == "pointer");
```

- Class templates support **full and partial** specialisation.
- Function templates support only **full** specialisation — and you should prefer **overloading** instead.

## 4. Variadic templates & fold expressions

```cpp
// C++11 recursion style
void print() {}
template <typename T, typename... Rest>
void print(const T& first, const Rest&... rest) {
    std::cout << first << ' ';
    print(rest...);
}

// C++17 fold expressions: much simpler
template <typename... Ts>
auto sum(Ts... xs) { return (xs + ... + 0); }          // binary right fold with init

template <typename... Ts>
void print_all(const Ts&... xs) { ((std::cout << xs << ' '), ...); }   // comma fold

static_assert(sum(1, 2, 3) == 6);
sizeof...(Ts);   // number of pack elements
```

## 5. Type traits & `if constexpr`

```cpp
#include <type_traits>

template <typename T>
std::string to_str(const T& v) {
    if constexpr (std::is_arithmetic_v<T>)        // discarded branch isn't instantiated
        return std::to_string(v);
    else if constexpr (std::is_convertible_v<T, std::string_view>)
        return std::string(v);
    else
        static_assert(sizeof(T) == 0, "unsupported type");   // dependent false
}
```

Useful traits: `is_same_v`, `is_integral_v`, `is_pointer_v`, `is_trivially_copyable_v`, `remove_cvref_t`, `decay_t`, `conditional_t`, `enable_if_t`, `invoke_result_t`.

## 6. SFINAE (the old way)

"Substitution Failure Is Not An Error": if substituting `T` into a template signature fails, that overload is silently removed.

```cpp
template <typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
T gcd(T a, T b) { while (b) { a %= b; std::swap(a, b); } return a; }
```

It works, but error messages are horrendous. In C++20, use concepts.

## 7. Concepts (C++20)

A **concept** is a named compile-time predicate on types.

```cpp
#include <concepts>

// Using standard concepts — four equivalent spellings
template <std::integral T> T gcd1(T a, T b);
template <typename T> requires std::integral<T> T gcd2(T a, T b);
template <typename T> T gcd3(T a, T b) requires std::integral<T>;
std::integral auto gcd4(std::integral auto a, std::integral auto b);  // abbreviated

// Defining your own with a requires-expression
template <typename T>
concept Shape = requires(const T& s) {
    { s.area() } -> std::convertible_to<double>;    // expression must compile & return type
    { s.name() } -> std::same_as<std::string_view>;
};

template <typename T>
concept Hashable = requires(T a) {
    { std::hash<T>{}(a) } -> std::convertible_to<std::size_t>;
};

template <Shape S>
void report(const S& s) { std::cout << s.name() << ' ' << s.area() << '\n'; }
```

Benefits:
- **Clear errors:** "constraint `Shape<Foo>` not satisfied because `s.area()` is invalid" instead of 200 lines of instantiation backtrace.
- **Overloading by constraint:** the more constrained overload wins.

```cpp
template <std::input_iterator It>         void advance_it(It& it, int n) { while (n--) ++it; }
template <std::random_access_iterator It> void advance_it(It& it, int n) { it += n; }  // preferred when possible
```

Handy standard concepts: `same_as`, `convertible_to`, `derived_from`, `integral`, `floating_point`, `invocable`, `predicate`, `regular`, `totally_ordered`, `copyable`, `movable`, `ranges::range`, `ranges::random_access_range`.

## 8. Concepts vs virtual interfaces

| | Concepts / templates | Virtual functions |
|---|---|---|
| Dispatch | compile time | runtime |
| Overhead | none, inlinable | vptr + indirect call |
| Heterogeneous containers | no (each type distinct) | yes (`vector<unique_ptr<Base>>`) |
| Code size | grows per instantiation | one copy |
| Coupling | duck typing — no common base needed | must inherit |

## 9. Two-phase lookup and `typename`/`template` keywords

```cpp
template <typename C>
void f(const C& c) {
    typename C::const_iterator it = c.begin();  // `typename`: C::const_iterator is a type
    auto x = c.template get<0>();               // `template`: get is a member template
}

template <typename T>
struct Derived : Base<T> {
    void g() { this->helper(); }   // names from a dependent base need this-> or Base<T>::
};
```

## 10. Code bloat & compile time

Each instantiation generates code. Mitigations: factor type-independent logic into non-template helpers, `extern template` to suppress repeated instantiation, explicit instantiation in one `.cpp`, and C++20 modules.

```cpp
// header
extern template class std::vector<MyType>;     // don't instantiate here
// one .cpp
template class std::vector<MyType>;            // instantiate once
```

## Interview Q&A

- **Why are templates in headers?** The full definition is needed to instantiate for each type at compile time.
- **Template vs macro?** Templates are type-checked, scoped, debuggable, and respect overloading; macros are textual substitution.
- **What's CTAD?** Class Template Argument Deduction (C++17): `std::vector v{1,2}` deduces `vector<int>`.
- **What's the difference between `typename` and `class` in a template parameter list?** None (except some template-template param contexts pre-C++17).
- **What is a concept?** A named boolean predicate on template arguments, checked at compile time, that constrains overload resolution.
- **What is `auto` in a function parameter?** An abbreviated function template (C++20).
