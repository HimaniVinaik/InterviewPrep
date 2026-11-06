# Templates & Concepts

> **Key idea:** a template is a **recipe** the compiler uses to stamp out real functions and classes for the types you use — `max<int>`, `max<double>`, `std::vector<std::string>`. Nothing exists until you use it ("instantiation"), the code is fully type-checked for each type, and calls are resolved at compile time — so templates give you generic code with **zero run-time overhead**. **Concepts** (C++20) let you state what a template needs from its types ("must be sortable", "must be a number"), turning pages of cryptic errors into one clear sentence.

**What you'll be able to do after this guide**
- Write function and class templates, including non-type, default and template-template parameters.
- Understand template argument deduction, CTAD, and why templates live in headers.
- Specialise templates fully and partially; know how overload resolution chooses.
- Write variadic templates and fold expressions.
- Use type traits, `if constexpr`, SFINAE (to read old code) and concepts (to write new code).
- Explain two-phase lookup, `typename`/`template` disambiguators, code bloat and compile-time costs.

---

## 1. Function templates

```cpp
#include <cstdio>
#include <string>

template <typename T>                       // T is a placeholder for a type
T maxOf(T a, T b) {
    if (a < b) {                            // requires T to support <
        return b;
    }
    return a;
}

int main() {
    std::printf("%d\n", maxOf(3, 7));                           // T deduced as int
    std::printf("%.1f\n", maxOf(2.5, 1.5));                     // T = double
    std::printf("%s\n", maxOf(std::string("pear"), std::string("apple")).c_str());   // T = std::string
    std::printf("%.1f\n", maxOf<double>(3, 2.5));               // explicit: deduction would conflict (int vs double)
    // maxOf(3, 2.5);                                           // error: T deduced as both int and double
    return 0;
}
```

The compiler generates one function per distinct `T` (an **instantiation**). `maxOf<int>` and `maxOf<double>` are separate functions in the binary.

### Template argument deduction — the rules that bite

| Parameter | Argument `const int& x` | Argument `int[3] a` | Argument `"hi"` |
|---|---|---|---|
| `T param` (by value) | `T = int` (top-level const & refs dropped) | `T = int*` (decays) | `T = const char*` |
| `T& param` | `T = const int` | `T = int[3]` (no decay) | `T = const char[3]` |
| `T&& param` (forwarding) | `T = const int&` (lvalue) | `T = int(&)[3]` | `T = const char(&)[3]` |

No implicit conversions happen during deduction: `maxOf(3, 2.5)` fails rather than converting.

### Multiple and defaulted parameters, return types

```cpp
#include <cstdio>
#include <type_traits>

// Different types for a and b; the return type is whatever a + b produces.
template <typename A, typename B>
auto add(A a, B b) {
    return a + b;
}

// Default template argument, used when it can't be deduced.
template <typename To = double, typename From>
To convert(From f) {
    return static_cast<To>(f);
}

int main() {
    auto r = add(1, 2.5);                         // int + double -> double
    static_assert(std::is_same_v<decltype(r), double>);
    std::printf("%.1f %.2f %d\n", r, convert(7), convert<int>(3.9));
    return 0;
}
```

### Abbreviated function templates (C++20)

`auto` parameters make a function a template without the `template <...>` line:

```cpp
#include <cstdio>

auto square(auto x) {          // same as template <typename T> auto square(T x)
    return x * x;
}

int main() {
    std::printf("%d %.2f\n", square(9), square(1.5));
    return 0;
}
```

---

## 2. Class templates

```cpp
#include <cstdio>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

template <typename T>
class Stack {
public:
    void push(T value) {
        items.push_back(std::move(value));
    }

    T pop() {
        if (items.empty()) {
            throw std::out_of_range("pop on empty stack");
        }
        T top = std::move(items.back());
        items.pop_back();
        return top;
    }

    const T& peek() const;                // defined outside the class below

    bool empty() const { return items.empty(); }
    std::size_t size() const { return items.size(); }

private:
    std::vector<T> items;
};

// Out-of-class member definition: repeat the template header and Stack<T>::
template <typename T>
const T& Stack<T>::peek() const {
    if (items.empty()) {
        throw std::out_of_range("peek on empty stack");
    }
    return items.back();
}

int main() {
    Stack<int> numbers;
    numbers.push(1);
    numbers.push(2);
    Stack<std::string> words;
    words.push("hello");
    std::printf("%d %s %zu\n", numbers.pop(), words.peek().c_str(), numbers.size());
    return 0;
}
```

**Only member functions that are actually used are instantiated.** That's why `std::vector<NoDefaultCtor>` works as long as you don't call `resize(n)`.

### Non-type template parameters (NTTPs)

Template parameters can be **values** known at compile time: integers, enums, pointers, and (C++20) floating point and simple class types.

```cpp
#include <cstddef>
#include <cstdio>

template <typename T, std::size_t N>
class FixedBuffer {                         // capacity baked into the type: no heap, no size member needed
public:
    bool push(const T& v) {
        if (count == N) {
            return false;
        }
        data[count++] = v;
        return true;
    }
    std::size_t size() const { return count; }
    static constexpr std::size_t capacity() { return N; }
private:
    T data[N]{};
    std::size_t count = 0;
};

template <int Exponent>
constexpr long long power(long long base) {  // the exponent is a compile-time constant
    long long r = 1;
    for (int i = 0; i < Exponent; i++) {
        r *= base;
    }
    return r;
}

int main() {
    FixedBuffer<int, 4> buf;
    for (int i = 0; i < 6; i++) {
        buf.push(i);
    }
    std::printf("size %zu / capacity %zu\n", buf.size(), FixedBuffer<int, 4>::capacity());
    static_assert(power<3>(2) == 8);
    std::printf("2^10 = %lld\n", power<10>(2));
    // FixedBuffer<int, 4> and FixedBuffer<int, 5> are DIFFERENT, unrelated types.
    return 0;
}
```

`std::array<T, N>`, `std::bitset<N>` and `std::span<T, N>` use NTTPs.

### Class Template Argument Deduction (CTAD, C++17)

```cpp
#include <cstdio>
#include <mutex>
#include <utility>
#include <vector>

template <typename T>
struct Wrapper {
    T value;
};
template <typename T>
Wrapper(T) -> Wrapper<T>;                 // a deduction guide (needed for aggregates before C++20)

int main() {
    std::vector v{1, 2, 3};               // std::vector<int>
    std::pair p{1, 2.5};                  // std::pair<int, double>
    Wrapper w{3.14};                      // Wrapper<double>
    std::mutex m;
    std::lock_guard lock(m);              // std::lock_guard<std::mutex>
    std::printf("%zu %.1f %.2f\n", v.size(), p.second, w.value);
    return 0;
}
```

### Member templates and template template parameters

```cpp
#include <cstdio>
#include <deque>
#include <list>
#include <vector>

template <typename T>
class Box {
public:
    explicit Box(T v) : value(v) {}
    template <typename U>                    // a member template: convert Box<T> to Box<U>
    Box<U> as() const {
        return Box<U>(static_cast<U>(value));
    }
    T get() const { return value; }
private:
    T value;
};

// A template template parameter: pass a container TEMPLATE, not a type.
template <typename T, template <typename, typename> class Container = std::vector>
class Queue {
public:
    void push(const T& v) { items.push_back(v); }
    std::size_t size() const { return items.size(); }
private:
    Container<T, std::allocator<T>> items;
};

int main() {
    Box<double> b(3.9);
    std::printf("%d\n", b.as<int>().get());
    Queue<int> q1;
    Queue<int, std::deque> q2;
    Queue<int, std::list> q3;
    q1.push(1);
    q2.push(2);
    q3.push(3);
    std::printf("%zu %zu %zu\n", q1.size(), q2.size(), q3.size());
    return 0;
}
```

---

## 3. Why templates live in headers

The compiler needs the **full definition** of a template at the point where it's instantiated (each `.cpp` that uses `Stack<int>`). If the definition were only in `stack.cpp`, other files couldn't stamp out `Stack<int>` → linker errors ("undefined reference to `Stack<int>::push`").

Options:
1. Put template definitions in the header (the norm; often a `.hpp` or a `-inl.h`/`.tpp` included at the end of the header).
2. **Explicit instantiation**: define in a `.cpp` and list the types you support: `template class Stack<int>;`. Users of other types get linker errors — useful to hide implementation and cut compile times.
3. `extern template class Stack<int>;` in the header tells other files "don't instantiate, it exists elsewhere" — speeds up builds.
4. C++20 modules make this cleaner: templates are exported with their definitions, but compiled once.

Instantiating the same template in many `.cpp` files is fine: the linker merges the duplicates (templates are exempt from the one-definition rule's "one per program" for this reason — they're implicitly *inline*).

---

## 4. Specialisation

Provide a different implementation for specific template arguments.

```cpp
#include <cstdio>
#include <cstring>
#include <string>

// Primary template
template <typename T>
struct TypeName {
    static std::string get() { return "unknown"; }
};

// Full (explicit) specialisations
template <>
struct TypeName<int> {
    static std::string get() { return "int"; }
};
template <>
struct TypeName<double> {
    static std::string get() { return "double"; }
};

// Partial specialisation: any pointer type (class templates only)
template <typename T>
struct TypeName<T*> {
    static std::string get() { return TypeName<T>::get() + "*"; }
};

// Partial specialisation on a pattern
template <typename T, std::size_t N>
struct TypeName<T[N]> {
    static std::string get() { return TypeName<T>::get() + "[" + std::to_string(N) + "]"; }
};

// Function templates can be fully specialised — but OVERLOADING is usually better.
template <typename T>
bool equal(const T& a, const T& b) {
    return a == b;
}
inline bool equal(const char* a, const char* b) {      // an overload, not a specialisation
    return std::strcmp(a, b) == 0;
}

int main() {
    std::printf("%s %s %s %s %s\n", TypeName<int>::get().c_str(), TypeName<double**>::get().c_str(),
                TypeName<int[4]>::get().c_str(), TypeName<char>::get().c_str(), TypeName<double*[2]>::get().c_str());
    char a[] = "hi";
    char b[] = "hi";
    std::printf("equal C strings by content: %d\n", equal(static_cast<const char*>(a), static_cast<const char*>(b)));
    return 0;
}
```

> **Pitfall:** function templates can't be partially specialised, and full specialisations don't take part in overload resolution (only the primary template does) — this produces surprises. Overload instead, or forward to a class template you can partially specialise.

---

## 5. Variadic templates and fold expressions

A **parameter pack** (`typename... Ts`, `Ts... args`) holds zero or more arguments.

```cpp
#include <cstdio>
#include <string>
#include <utility>

// C++17 fold expressions: apply an operator across the pack.
template <typename... Ts>
auto sum(Ts... xs) {
    return (xs + ... + 0);                  // ((x1 + x2) + x3) + 0 ... works for an empty pack too
}

template <typename... Ts>
bool allPositive(Ts... xs) {
    return ((xs > 0) && ...);               // short-circuits
}

template <typename... Ts>
void printAll(const Ts&... xs) {
    ((std::printf("%s ", std::to_string(xs).c_str())), ...);   // fold over the comma operator
    std::printf("(%zu args)\n", sizeof...(Ts));                 // sizeof... counts the pack
}

// The pre-C++17 way: recursion with a base case.
void printRecursive() {
    std::printf("\n");
}
template <typename First, typename... Rest>
void printRecursive(const First& first, const Rest&... rest) {
    std::printf("[%s]", std::to_string(first).c_str());
    printRecursive(rest...);                // pack expansion: peel one argument per call
}

// Perfect-forwarding factory: the pattern behind make_unique/emplace_back.
template <typename T, typename... Args>
T make(Args&&... args) {
    return T(std::forward<Args>(args)...);
}

int main() {
    std::printf("sum = %d, sum() = %d, mixed = %.1f\n", sum(1, 2, 3, 4), sum(), sum(1, 2.5));
    std::printf("allPositive: %d %d\n", allPositive(1, 2, 3), allPositive(1, -2));
    printAll(1, 2.5, 3L);
    printRecursive(1, 2, 3);
    std::string s = make<std::string>(3, 'z');
    std::printf("%s\n", s.c_str());
    return 0;
}
```

| Fold | Expands to |
|---|---|
| `(pack op ...)` | `x1 op (x2 op (x3 op x4))` (right fold) |
| `(... op pack)` | `((x1 op x2) op x3) op x4` (left fold) |
| `(pack op ... op init)` | with an initial value (needed for empty packs with most operators) |

---

## 6. Type traits and `if constexpr`

`<type_traits>` answers questions about types **at compile time**: `std::is_integral_v<T>`, `std::is_pointer_v<T>`, `std::is_same_v<A, B>`, `std::remove_reference_t<T>`, `std::decay_t<T>`, …

`if constexpr` (C++17) discards the branch that isn't taken, so it doesn't even need to compile for that type:

```cpp
#include <cstdio>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
std::string describe(const T& value) {
    if constexpr (std::is_integral_v<T>) {
        return "integer " + std::to_string(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return "float " + std::to_string(value);
    } else if constexpr (std::is_same_v<T, std::string>) {
        return "string \"" + value + "\"";                  // only compiled when T is std::string
    } else {
        return "something with size " + std::to_string(sizeof(T));
    }
}

// Writing your own trait: primary template false, specialisation true.
template <typename T>
struct IsVector : std::false_type {};
template <typename T, typename A>
struct IsVector<std::vector<T, A>> : std::true_type {};
template <typename T>
inline constexpr bool isVector = IsVector<T>::value;

int main() {
    std::printf("%s\n%s\n%s\n%s\n", describe(42).c_str(), describe(2.5).c_str(),
                describe(std::string("hi")).c_str(), describe(std::vector<int>{1}).c_str());
    static_assert(isVector<std::vector<int>> && !isVector<int>);
    static_assert(std::is_same_v<std::decay_t<const int&>, int>);
    static_assert(std::is_same_v<std::remove_pointer_t<double*>, double>);
    return 0;
}
```

Without `if constexpr`, a normal `if` would try to compile `"string \"" + value` for `int` and fail.

---

## 7. SFINAE (the pre-C++20 way)

**S**ubstitution **F**ailure **I**s **N**ot **A**n **E**rror: if substituting a type into a template's signature produces an invalid type, that template is silently removed from the overload set instead of causing an error. Old code used it (via `std::enable_if`) to constrain templates. You need to **read** it; write concepts instead.

```cpp
#include <cstdio>
#include <string_view>
#include <type_traits>

// Only participates when T is integral.
template <typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
const char* kind(T) {
    return "integral (SFINAE)";
}

// Only participates when T is floating point.
template <typename T, std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
const char* kind(T) {
    return "floating (SFINAE)";
}

// Expression SFINAE: only if t.size() is a valid expression.
template <typename T>
auto sizeOf(const T& t) -> decltype(t.size()) {
    return t.size();
}

int main() {
    std::printf("%s, %s\n", kind(3), kind(2.5));
    std::printf("size %zu\n", sizeOf(std::string_view("hello")));
    // kind("x");   // error: no matching function — but the message is long and cryptic
    return 0;
}
```

---

## 8. Concepts (C++20)

A **concept** is a named compile-time predicate on types. Use it to **constrain** templates: the template only accepts types that satisfy it, errors point at the unmet requirement, and overloading by constraint "just works".

```cpp
#include <concepts>
#include <cstdio>
#include <string>
#include <vector>

// 1. Use standard concepts directly.
template <std::integral T>
T gcd(T a, T b) {
    while (b != 0) {
        T t = a % b;
        a = b;
        b = t;
    }
    return a;
}

// 2. Define your own with a requires-expression: "these expressions must compile".
template <typename T>
concept Shape = requires(const T& s) {
    { s.area() } -> std::convertible_to<double>;     // must have area() returning something double-like
    { s.name() } -> std::convertible_to<std::string>;
};

struct Circle {
    double r;
    double area() const { return 3.14159 * r * r; }
    std::string name() const { return "circle"; }
};

struct Tree {};                                          // not a Shape

// 3. Four equivalent ways to apply a concept:
template <Shape S>
void print1(const S& s) { std::printf("%s: %.2f\n", s.name().c_str(), s.area()); }

template <typename S>
    requires Shape<S>
void print2(const S& s) { print1(s); }

void print3(const Shape auto& s) { print1(s); }        // abbreviated syntax

template <typename S>
void print4(const S& s) requires Shape<S> { print1(s); }

// 4. Overloading by constraint: the more constrained overload wins.
template <typename T>
const char* category(T) { return "anything"; }
template <std::integral T>
const char* category(T) { return "integral"; }
template <std::signed_integral T>                       // subsumes std::integral: more specific
const char* category(T) { return "signed integral"; }

int main() {
    std::printf("gcd %d\n", gcd(84, 36));
    // gcd(1.5, 2.5);   // error: "the constraint std::integral<double> was not satisfied" — a clear message
    Circle c{1.0};
    print1(c);
    print2(c);
    print3(c);
    print4(c);
    // print3(Tree{});  // error: Tree does not satisfy Shape (no area())
    static_assert(Shape<Circle> && !Shape<Tree>);
    std::printf("%s / %s / %s\n", category(2.5), category(7u), category(-7));
    return 0;
}
```

### Useful standard concepts

| Concept | Means |
|---|---|
| `std::integral`, `std::floating_point`, `std::signed_integral` | number kinds |
| `std::same_as<T, U>`, `std::convertible_to<T, U>`, `std::derived_from<D, B>` | type relationships |
| `std::equality_comparable`, `std::totally_ordered` | supports `==` / `<` etc. |
| `std::copyable`, `std::movable`, `std::regular` | value-like behaviour |
| `std::invocable<F, Args...>`, `std::predicate<F, Args...>` | callable with these arguments |
| `std::ranges::range`, `std::ranges::random_access_range`, `std::input_iterator` | ranges and iterators |

### requires-expressions in detail

```cpp
#include <concepts>
#include <cstdio>
#include <iterator>
#include <list>
#include <string>
#include <vector>

template <typename C>
concept Container = requires(C c, const C cc) {
    typename C::value_type;                       // a nested type must exist
    { cc.size() } -> std::convertible_to<std::size_t>;
    { c.begin() } -> std::input_or_output_iterator;
    c.clear();                                    // simple requirement: just must compile
    requires std::default_initializable<C>;       // nested requirement
};

template <Container C>
void report(const C& c) {
    std::printf("container with %zu elements\n", c.size());
}

int main() {
    report(std::vector<int>{1, 2, 3});
    report(std::list<std::string>{"a"});
    report(std::string("hello"));
    static_assert(!Container<int>);
    return 0;
}
```

---

## 9. Concepts vs virtual interfaces

| | Concepts (static) | Virtual interface (dynamic) |
|---|---|---|
| Binding | compile time | run time |
| Types must inherit from a base | no — "duck typing" checked by the compiler | yes |
| Heterogeneous containers | no (each type is separate) | yes |
| Overhead | none, fully inlinable | vptr + indirect call |
| Errors | at compile time | at compile time for signatures |
| Adding new types | recompile users | plugins, separate compilation |

Use concepts for generic algorithms and libraries; virtual interfaces when you need to choose implementations at run time or store mixed types together.

---

## 10. Two-phase lookup and the `typename`/`template` keywords

Templates are checked twice:

1. **At definition:** everything that doesn't depend on `T` is looked up and checked.
2. **At instantiation:** everything that depends on `T` (a **dependent name**) is checked for the actual type.

For dependent names, the compiler can't know whether `T::x` is a type, a value or a template, so you must tell it:

```cpp
#include <cstdio>
#include <vector>

template <typename Container>
void printFirst(const Container& c) {
    typename Container::const_iterator it = c.begin();   // `typename`: this dependent name IS a type
    std::printf("first = %d\n", *it);
}

struct Maker {
    template <typename T>
    static T make() { return T(42); }
};

template <typename M>
int callMember() {
    return M::template make<int>();                       // `template`: the dependent name IS a template
}

template <typename T>
struct Base {
    int value = 7;
};

template <typename T>
struct Derived : Base<T> {
    int get() const {
        return this->value;                                // members of a dependent base need this-> (or Base<T>::)
    }
};

int main() {
    printFirst(std::vector<int>{5, 6});
    std::printf("%d %d\n", callMember<Maker>(), Derived<int>{}.get());
    return 0;
}
```

(C++20 relaxed the `typename` requirement in many contexts where only a type can appear, but you'll still see and need it.)

---

## 11. Compile-time computation

Templates plus `constexpr`/`consteval` let you compute at compile time. Modern code prefers `constexpr` functions over old-style template metaprogramming:

```cpp
#include <array>
#include <cstdio>

// Old style: recursion through template instantiation.
template <unsigned N>
struct Factorial {
    static constexpr unsigned long long value = N * Factorial<N - 1>::value;
};
template <>
struct Factorial<0> {
    static constexpr unsigned long long value = 1;
};

// Modern style: an ordinary constexpr function.
constexpr unsigned long long factorial(unsigned n) {
    unsigned long long r = 1;
    for (unsigned i = 2; i <= n; i++) {
        r *= i;
    }
    return r;
}

// Generate a lookup table at compile time.
template <std::size_t N>
constexpr std::array<unsigned long long, N> factorialTable() {
    std::array<unsigned long long, N> t{};
    for (std::size_t i = 0; i < N; i++) {
        t[i] = factorial(static_cast<unsigned>(i));
    }
    return t;
}

int main() {
    static_assert(Factorial<10>::value == 3628800);
    static_assert(factorial(10) == 3628800);
    constexpr auto table = factorialTable<15>();
    std::printf("14! = %llu (looked up, computed at compile time)\n", table[14]);
    return 0;
}
```

---

## 12. Code bloat and compile time

- Every distinct instantiation is separate machine code. `Stack<int>`, `Stack<long>`, `Stack<unsigned>` → three copies. Mitigations: factor type-independent code into a non-template base; use type erasure for rarely-hot paths; explicit instantiation in one `.cpp`.
- Heavy template code slows compilation: precompiled headers, `extern template`, modules, and keeping templates lean all help. Tools: `-ftime-trace` (Clang) shows where compile time goes.
- Linkers merge identical instantiations ("COMDAT folding"), and identical-code folding (`--icf`) can merge different instantiations that compile to the same instructions.

---

## 13. Interview checklist

- [ ] Function/class templates, instantiation on use, why definitions go in headers.
- [ ] Deduction rules (decay, references, no conversions), CTAD.
- [ ] Non-type parameters; `std::array<T, N>`.
- [ ] Full vs partial specialisation; prefer overloading for functions.
- [ ] Variadic templates, `sizeof...`, fold expressions, perfect forwarding.
- [ ] Type traits, `if constexpr`, SFINAE/`enable_if` (read), concepts (write).
- [ ] Standard concepts; requires-expressions; constraint subsumption.
- [ ] Dependent names: `typename`, `template`, `this->`.
- [ ] Code bloat and compile-time trade-offs.

---

## Practice

1. Write `template <typename T, std::size_t N> constexpr std::size_t arraySize(const T (&)[N])` and use it in a `static_assert`.
2. Write a variadic `bool contains(const T& needle, const Ts&... haystack)` with a fold expression.
3. Write a concept `Hashable` (requires `std::hash<T>{}(t)` to be convertible to `std::size_t`) and a function `void put(Hashable auto key)`.
4. Implement a type trait `IsSmartPointer<T>` that is true for `std::unique_ptr<U>` and `std::shared_ptr<U>`.
5. Explain why this doesn't compile and fix it: `template <typename T> void f(std::vector<T> v) { std::vector<T>::iterator it = v.begin(); }`

:::details Show solution
1.
```cpp
#include <cstddef>

template <typename T, std::size_t N>
constexpr std::size_t arraySize(const T (&)[N]) {
    return N;                                   // N deduced from the array type; array not decayed (reference)
}

int main() {
    int a[7] = {};
    static_assert(arraySize(a) == 7);
    return 0;
}
```
2.
```cpp
#include <cassert>

template <typename T, typename... Ts>
bool contains(const T& needle, const Ts&... haystack) {
    return ((haystack == needle) || ...);       // false for an empty pack
}

int main() {
    assert(contains(3, 1, 2, 3));
    assert(!contains(9, 1, 2));
    assert(!contains(1));
    return 0;
}
```
3.
```cpp
#include <concepts>
#include <cstdio>
#include <functional>
#include <string>

template <typename T>
concept Hashable = requires(const T& t) {
    { std::hash<T>{}(t) } -> std::convertible_to<std::size_t>;
};

void put(Hashable auto key) {
    std::printf("hash = %zu\n", std::hash<decltype(key)>{}(key) % 1000);
}

struct NoHash {};

int main() {
    put(42);
    put(std::string("key"));
    static_assert(!Hashable<NoHash>);
    return 0;
}
```
4.
```cpp
#include <memory>
#include <type_traits>

template <typename T>
struct IsSmartPointer : std::false_type {};
template <typename T, typename D>
struct IsSmartPointer<std::unique_ptr<T, D>> : std::true_type {};
template <typename T>
struct IsSmartPointer<std::shared_ptr<T>> : std::true_type {};

int main() {
    static_assert(IsSmartPointer<std::unique_ptr<int>>::value);
    static_assert(IsSmartPointer<std::shared_ptr<double>>::value);
    static_assert(!IsSmartPointer<int*>::value);
    return 0;
}
```
5. `std::vector<T>::iterator` is a **dependent name**; before C++20 the compiler assumes it's a value, so the declaration doesn't parse. Write `typename std::vector<T>::iterator it = v.begin();` — or simply `auto it = v.begin();`.
:::

---

## Interview Q&A

- **Why are templates in headers?** The full definition is needed to instantiate for each type at compile time.
- **Template vs macro?** Templates are type-checked, scoped, debuggable, and respect overloading; macros are textual substitution.
- **What's CTAD?** Class Template Argument Deduction (C++17): `std::vector v{1,2}` deduces `vector<int>`.
- **What's the difference between `typename` and `class` in a template parameter list?** None (except some template-template param contexts pre-C++17).
- **What is a concept?** A named boolean predicate on template arguments, checked at compile time, that constrains overload resolution.
- **What is `auto` in a function parameter?** An abbreviated function template (C++20).
- **What is SFINAE?** Substitution failure is not an error: if substituting template arguments makes a signature invalid, that candidate is dropped from overload resolution instead of causing an error — the basis of `std::enable_if`.
- **Full vs partial specialisation?** Full specialisation provides an implementation for one exact set of arguments; partial specialisation (class templates only) for a pattern such as `T*` or `std::vector<T>`.
- **Why prefer overloading to specialising function templates?** Function templates can't be partially specialised, and explicit specialisations don't participate in overload resolution, which leads to surprising choices.
- **What does `if constexpr` do?** Evaluates the condition at compile time and discards the untaken branch, so it doesn't have to compile for the current type.
- **What is a fold expression?** A C++17 way to apply a binary operator across a parameter pack, e.g. `(args + ...)`.
- **When do you need the `typename` keyword inside a template?** To tell the compiler that a dependent qualified name (like `T::value_type`) is a type.
- **What causes template code bloat and how do you limit it?** One copy of code per instantiation; move type-independent code to non-template helpers, use explicit instantiation or type erasure where performance doesn't need specialisation.

---

## External resources

- **cppreference — Templates, Constraints and concepts, Fold expressions, Type traits, SFINAE.**
- **David Vandevoorde, Nicolai Josuttis & Douglas Gregor — *C++ Templates: The Complete Guide* (2nd ed.)** — the reference.
- **Andreas Fertig — *Programming with C++20*** (concepts chapter) and **Bjarne Stroustrup — "Concepts: The Future of Generic Programming"** (paper).
- **Walter E. Brown — "Modern Template Metaprogramming: A Compendium"** (CppCon 2014 talk).
- **C++ Insights** (cppinsights.io): see the instantiations the compiler generates.
