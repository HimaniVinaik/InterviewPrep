# Casts & the Type System

> **Key idea:** C++ is **statically typed** — every expression has a type the compiler knows, and the type decides what operations are legal and how bits are interpreted. A **cast** asks the compiler to treat a value as a different type. C++ splits the dangerous C cast into four named casts — `static_cast`, `dynamic_cast`, `const_cast`, `reinterpret_cast` — so each one says exactly what you intend, is easy to search for, and can be checked. Most bugs here come from **implicit** conversions you didn't notice, so we cover those too.

**What you'll be able to do after this guide**
- Pick the right named cast for every situation and explain what each one can and can't do.
- Use `dynamic_cast` and RTTI safely, and know their cost.
- Type-pun correctly with `std::bit_cast`/`memcpy` and avoid strict-aliasing UB.
- Predict implicit conversions: integer promotion, usual arithmetic conversions, narrowing, signed/unsigned mixing.
- Use `auto`, `decltype`, `std::variant`, `std::any` and `std::optional` to make types work for you.

---

## 1. The four named casts at a glance

| Cast | Use for | Checked | Typical example |
|---|---|---|---|
| `static_cast<T>(x)` | well-defined conversions the compiler can verify | compile time | `double` → `int`, `int` → `enum`, `void*` → `T*`, upcasts/known downcasts |
| `dynamic_cast<T>(x)` | safe downcast/cross-cast in polymorphic hierarchies | **run time** (RTTI) | `Base*` → `Derived*` (nullptr if wrong) |
| `const_cast<T>(x)` | add/remove `const`/`volatile` | compile time | calling a legacy API that forgot `const` |
| `reinterpret_cast<T>(x)` | reinterpret bits/addresses | none | pointer ↔ integer, hardware registers |
| `std::bit_cast<T>(x)` (C++20) | copy the bits of one trivially-copyable type into another | compile time (size check) | float bits ↔ integer |

**Rule of thumb:** if you need a cast, prefer them in this order: no cast → `static_cast` → `dynamic_cast` → `std::bit_cast` → `const_cast` → `reinterpret_cast`. Every step down needs more justification.

---

## 2. `static_cast`

Performs conversions that are known at compile time to make sense.

```cpp
#include <cstdio>
#include <cstdint>

enum class Color : std::uint8_t { Red = 1, Green = 2, Blue = 3 };

struct Base {
    virtual ~Base() = default;
};
struct Derived : Base {
    int extra = 42;
};

int main() {
    // 1. Numeric conversions (explicit, so readers see the possible loss).
    double price = 9.99;
    int whole = static_cast<int>(price);                 // truncates toward zero: 9
    long long big = 5'000'000'000LL;
    std::int32_t wrapped = static_cast<std::int32_t>(big);   // value doesn't fit: modular wrap (well-defined since C++20)
    std::printf("whole %d, wrapped %d\n", whole, wrapped);

    // 2. Integer division done in floating point.
    int a = 7;
    int b = 2;
    std::printf("int division %d, real division %.1f\n", a / b, static_cast<double>(a) / b);

    // 3. Scoped enums don't convert implicitly — static_cast both ways.
    Color c = static_cast<Color>(2);
    int raw = static_cast<int>(c);
    std::printf("color value %d\n", raw);

    // 4. void* back to the original type.
    int value = 5;
    void* opaque = &value;
    int* back = static_cast<int*>(opaque);
    std::printf("through void*: %d\n", *back);

    // 5. Up- and down-casts in a hierarchy (downcast is UNCHECKED: you must be sure).
    Derived d;
    Base* basePtr = &d;                                  // upcast: implicit, always safe
    Derived* known = static_cast<Derived*>(basePtr);     // downcast: fine HERE because it really is a Derived
    std::printf("extra %d\n", known->extra);
    return 0;
}
```

> **Danger:** `static_cast` downcasts are **not checked**. If `basePtr` actually pointed to a different derived type, using the result is undefined behaviour. Use it only when the type is guaranteed (e.g. CRTP, or after checking a type tag); otherwise use `dynamic_cast`.

---

## 3. `dynamic_cast`

Uses **run-time type information** (RTTI) to check a downcast or cross-cast in a polymorphic hierarchy (the base needs at least one virtual function).

- Pointer form: returns `nullptr` on failure.
- Reference form: throws `std::bad_cast` on failure.

```cpp
#include <cstdio>
#include <memory>
#include <typeinfo>
#include <vector>

struct Shape {
    virtual ~Shape() = default;
};
struct Circle : Shape {
    double r = 1.0;
};
struct Square : Shape {
    double s = 2.0;
};
struct Printable {
    virtual ~Printable() = default;
    virtual void print() const = 0;
};
struct FancySquare : Square, Printable {
    void print() const override { std::printf("  fancy square\n"); }
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>());
    shapes.push_back(std::make_unique<Square>());
    shapes.push_back(std::make_unique<FancySquare>());

    for (const auto& s : shapes) {
        if (auto* circle = dynamic_cast<Circle*>(s.get())) {          // nullptr if not a Circle
            std::printf("circle with r = %.1f\n", circle->r);
        } else if (auto* square = dynamic_cast<Square*>(s.get())) {   // also matches FancySquare (it IS a Square)
            std::printf("square with s = %.1f\n", square->s);
        }
        if (auto* p = dynamic_cast<Printable*>(s.get())) {            // CROSS-cast: Shape -> Printable sibling
            p->print();
        }
    }

    try {
        Shape& ref = *shapes[0];
        Square& sq = dynamic_cast<Square&>(ref);                      // reference form throws
        (void)sq;
    } catch (const std::bad_cast& e) {
        std::printf("bad_cast: the first shape is not a Square\n");
    }
    return 0;
}
```

**Costs and caveats**
- Each `dynamic_cast` walks type information at run time (string comparisons in some implementations, deep hierarchies cost more).
- It needs RTTI; many embedded and game codebases compile with `-fno-rtti`, which disables `dynamic_cast` and `typeid`.
- A chain of `dynamic_cast`s is usually a **design smell**: a virtual function, the visitor pattern, or `std::variant` + `std::visit` often express the intent better.

---

## 4. `const_cast`

Adds or removes `const`/`volatile`. Removing const is legal; **writing** through the result is undefined behaviour **if the original object was declared const**.

```cpp
#include <cstdio>
#include <cstring>

// Legacy API: takes char* but never writes.
int legacyCount(char* text, char ch) {
    int n = 0;
    for (; *text != '\0'; ++text) {
        if (*text == ch) {
            n++;
        }
    }
    return n;
}

class Buffer {
public:
    const char& at(std::size_t i) const {
        return data[i];
    }
    char& at(std::size_t i) {
        // Reuse the const version: safe because *this is known to be non-const here.
        return const_cast<char&>(static_cast<const Buffer&>(*this).at(i));
    }
private:
    char data[8] = "abcdefg";
};

int main() {
    const char* msg = "banana";
    std::printf("a's: %d\n", legacyCount(const_cast<char*>(msg), 'a'));   // OK: no write happens

    Buffer b;
    b.at(0) = 'X';                                   // non-const at() built on top of the const one
    std::printf("first: %c\n", b.at(0));
    return 0;
}
```

(The C++23 "deducing this" feature removes the need for the const/non-const duplication trick above — see *const, constexpr*.)

---

## 5. `reinterpret_cast`

Reinterprets a pointer or integer's **bits** as another pointer/integer type. It guarantees very little:

- pointer → integer large enough (`std::uintptr_t`) → the same pointer type: round-trips;
- any object pointer → `char*`/`unsigned char*`/`std::byte*` to inspect bytes;
- pointer to `T` → pointer to `U` → back to `T*`: round-trips (if alignment allows).

Everything else (like reading a `float` through an `int*`) is undefined behaviour under **strict aliasing**.

```cpp
#include <cstddef>
#include <cstdint>
#include <cstdio>

int main() {
    int x = 0x01020304;

    // Byte-level inspection through unsigned char* is allowed.
    const unsigned char* bytes = reinterpret_cast<const unsigned char*>(&x);
    std::printf("bytes: %02x %02x %02x %02x\n", bytes[0], bytes[1], bytes[2], bytes[3]);

    // Pointer -> integer -> pointer round trip (e.g. storing a pointer in an integer handle).
    std::uintptr_t address = reinterpret_cast<std::uintptr_t>(&x);
    int* again = reinterpret_cast<int*>(address);
    std::printf("round trip ok: %d, address aligned to 4: %s\n", *again == x, address % alignof(int) == 0 ? "yes" : "no");
    return 0;
}
```

The classic legitimate use in embedded code: turning a fixed address into a pointer to a memory-mapped register.

```cpp
// no-test (only meaningful on the target hardware)
#include <cstdint>
constexpr std::uintptr_t GPIOA_ODR = 0x40020014;
inline volatile std::uint32_t& gpioaOdr() {
    return *reinterpret_cast<volatile std::uint32_t*>(GPIOA_ODR);
}
// gpioaOdr() |= (1u << 5);   // set pin 5
```

---

## 6. Type punning done right

**Type punning** = looking at the bits of one type as another (e.g. the IEEE-754 bits of a float). The correct ways:

| Method | Works in | Notes |
|---|---|---|
| `std::bit_cast<To>(from)` | C++20 | sizes must match, both trivially copyable; `constexpr` |
| `std::memcpy(&to, &from, sizeof to)` | C and C++ | compilers optimise it to a single move |
| union member access | **C only** (defined in C99/C11) | UB in C++ |
| `reinterpret_cast` + dereference | — | **UB** (strict aliasing) |

```cpp
#include <bit>
#include <cstdint>
#include <cstdio>
#include <cstring>

// Decompose a float into its IEEE-754 fields.
void decompose(float f) {
    std::uint32_t bits = std::bit_cast<std::uint32_t>(f);
    std::uint32_t sign = bits >> 31;
    std::uint32_t exponent = (bits >> 23) & 0xFF;
    std::uint32_t mantissa = bits & 0x7FFFFF;
    std::printf("%10g = 0x%08x  sign %u  exponent %3u (unbiased %4d)  mantissa 0x%06x\n",
                f, bits, sign, exponent, static_cast<int>(exponent) - 127, mantissa);
}

// The famous "fast inverse square root", written without UB.
float fastInvSqrt(float x) {
    std::uint32_t i = std::bit_cast<std::uint32_t>(x);
    i = 0x5f3759df - (i >> 1);
    float y = std::bit_cast<float>(i);
    return y * (1.5f - 0.5f * x * y * y);      // one Newton step
}

int main() {
    decompose(1.0f);
    decompose(-2.5f);
    decompose(0.1f);

    double d = 3.5;
    std::uint64_t viaMemcpy;
    std::memcpy(&viaMemcpy, &d, sizeof d);     // portable to C and older C++
    std::printf("3.5 as bits: 0x%016llx\n", static_cast<unsigned long long>(viaMemcpy));

    std::printf("fastInvSqrt(4) = %.4f (exact 0.5)\n", fastInvSqrt(4.0f));
    static_assert(std::bit_cast<std::uint32_t>(1.0f) == 0x3f800000);   // works at compile time
    return 0;
}
```

---

## 7. C-style casts — why to avoid them

`(T)x` and `T(x)` try, in order: `const_cast`, `static_cast`, `static_cast` + `const_cast`, `reinterpret_cast`, `reinterpret_cast` + `const_cast` — whichever compiles first. So one innocent-looking cast can silently become a `reinterpret_cast` or strip `const`.

```cpp
#include <cstdio>

struct A {
    int a = 1;
};
struct B {
    int b = 2;
};
struct C : A, B {};

int main() {
    C c;
    B* viaStatic = static_cast<B*>(&c);                // adjusts the pointer to the B subobject
    // With an INCOMPLETE type (e.g. only forward-declared), a C-style cast quietly becomes a
    // reinterpret_cast and does NOT adjust the pointer — reading b would then read A's data.
    B* viaCStyle = (B*)&c;                            // here the types are complete, so it adjusts too...
    std::printf("static_cast: b = %d, C-style: b = %d\n", viaStatic->b, viaCStyle->b);
    std::printf("&c = %p, as B* = %p (different addresses!)\n",
                static_cast<void*>(&c), static_cast<void*>(viaStatic));
    return 0;
}
```

Named casts are **greppable**, state intent, and refuse to do the dangerous thing silently. Enable `-Wold-style-cast` to find C casts in C++ code. (Functional-style `T(x)` for constructing objects, like `std::string(ptr)`, is fine.)

---

## 8. Implicit conversions to watch

### Integer promotion

Before arithmetic, types smaller than `int` (`char`, `short`, `bool`, `std::uint8_t`, `std::uint16_t`) are promoted to `int`.

```cpp
#include <cstdint>
#include <cstdio>
#include <type_traits>

int main() {
    std::uint8_t a = 200;
    std::uint8_t b = 100;
    auto sum = a + b;                                    // int, not uint8_t
    static_assert(std::is_same_v<decltype(sum), int>);
    std::printf("200 + 100 = %d (no wrap: promoted to int)\n", sum);
    std::uint8_t stored = a + b;                         // narrowing on assignment: 300 % 256 = 44
    std::printf("stored back in uint8_t: %u\n", stored);

    std::uint8_t mask = 0x0F;
    auto inverted = ~mask;                               // ~ on a promoted int: 0xFFFFFFF0, not 0xF0!
    std::printf("~0x0F as int: 0x%x, as uint8_t: 0x%x\n", static_cast<unsigned>(inverted),
                static_cast<unsigned>(static_cast<std::uint8_t>(~mask)));
    return 0;
}
```

### Usual arithmetic conversions and signed/unsigned mixing

When two operands have different types, the "smaller" is converted to the "larger"; if one is **unsigned** and at least as wide, the signed one is converted to **unsigned** — negative numbers become huge.

```cpp
#include <cstdio>
#include <utility>
#include <vector>

int main() {
    int negative = -1;
    unsigned int positive = 1;
    if (negative < positive) {         // compiler warning -Wsign-compare: exactly the bug it's warning about
        std::printf("-1 < 1u\n");
    } else {
        std::printf("-1 < 1u is FALSE: -1 converts to %u\n", static_cast<unsigned>(negative));   // 4294967295
    }

    std::vector<int> v;                      // size() is unsigned (size_t)
    // for (int i = 0; i < v.size() - 1; i++)  // BUG: 0 - 1 wraps to a huge number -> out-of-bounds loop
    for (std::size_t i = 0; i + 1 < v.size(); i++) {   // rearrange so nothing goes negative
        std::printf("%d\n", v[i]);
    }

    // C++20: safe comparisons between signed and unsigned.
    std::printf("std::cmp_less(-1, 1u) = %d\n", std::cmp_less(negative, positive));
    return 0;
}
```

(`-Wall -Wextra` gives `-Wsign-compare` warnings for these — don't ignore them.)

### Narrowing and brace initialisation

Brace initialisation `{}` **rejects narrowing** conversions at compile time; `=` and `()` allow them silently.

```cpp
#include <cstdio>

int main() {
    double d = 3.7;
    int a = d;            // compiles (maybe with a warning): silently 3
    int b(d);             // same
    // int c{d};          // ERROR: narrowing conversion from double to int
    int c{static_cast<int>(d)};   // explicit is fine
    // char small{300};   // ERROR: 300 doesn't fit in char
    std::printf("%d %d %d\n", a, b, c);
    return 0;
}
```

### Floating point ↔ integer

- `double` → `int` truncates toward zero; if the value is out of range it's **undefined behaviour** (not a wrap).
- `int` → `float` can lose precision above 2²⁴ (16,777,216): `float` has only 24 bits of mantissa.
- Compare floats with a tolerance, not `==`.

```cpp
#include <cmath>
#include <cstdio>

int main() {
    float f = 16777217.0f;                         // 2^24 + 1 can't be represented
    std::printf("16777217 as float: %.1f\n", f);   // 16777216.0
    double sum = 0.1 + 0.2;
    std::printf("0.1 + 0.2 == 0.3? %s; within 1e-9? %s\n", sum == 0.3 ? "yes" : "no",
                std::fabs(sum - 0.3) < 1e-9 ? "yes" : "no");
    std::printf("trunc(-2.7) = %d, lround(-2.7) = %ld\n", static_cast<int>(-2.7), std::lround(-2.7));
    return 0;
}
```

### Conversion operators and `explicit`

User-defined conversions (single-argument constructors and `operator T()`) participate in implicit conversion — at most **one** user-defined conversion per expression. Mark them `explicit` unless the conversion is obviously safe.

```cpp
#include <cstdio>

class Meters {
public:
    explicit Meters(double v) : value(v) {}                 // explicit: no silent double -> Meters
    explicit operator double() const { return value; }      // explicit: needs static_cast<double>(m)
private:
    double value;
};

class Handle {
public:
    explicit operator bool() const { return fd >= 0; }      // explicit bool: still usable in if/while/&&
private:
    int fd = 3;
};

double runwayLength(Meters m) {
    return static_cast<double>(m);
}

int main() {
    std::printf("%.0f\n", runwayLength(Meters(3000)));
    // runwayLength(3000);                 // error: no implicit conversion — prevents unit mix-ups
    Handle h;
    if (h) {                              // contextual conversion to bool works with explicit operator bool
        std::printf("handle valid\n");
    }
    // int n = h;                          // error: would compile silently without `explicit`
    return 0;
}
```

---

## 9. RTTI: `typeid`

`typeid(expr)` returns a `std::type_info`. For a polymorphic object accessed through a reference/pointer it reports the **dynamic** type.

```cpp
#include <cstdio>
#include <typeindex>
#include <typeinfo>
#include <unordered_map>

struct Animal {
    virtual ~Animal() = default;
};
struct Dog : Animal {};
struct Cat : Animal {};

int main() {
    Dog d;
    Animal& a = d;
    std::printf("static type: %s\n", typeid(Animal).name());     // name() is implementation-specific (mangled)
    std::printf("dynamic type matches Dog? %s\n", typeid(a) == typeid(Dog) ? "yes" : "no");

    std::unordered_map<std::type_index, const char*> sounds = {   // type_index: usable as a map key
        {typeid(Dog), "woof"},
        {typeid(Cat), "meow"},
    };
    std::printf("sound: %s\n", sounds[typeid(a)]);
    return 0;
}
```

---

## 10. Letting the compiler deduce: `auto` and `decltype`

```cpp
#include <cstdio>
#include <map>
#include <string>
#include <type_traits>
#include <vector>

int main() {
    std::map<std::string, std::vector<int>> index = {{"a", {1, 2}}, {"b", {3}}};

    for (const auto& [key, values] : index) {        // auto + structured bindings: no long type names
        std::printf("%s has %zu values\n", key.c_str(), values.size());
    }

    // auto drops top-level const and references (like template deduction by value):
    const int ci = 5;
    const int& cref = ci;
    auto a = cref;                    // int (a copy)
    auto& b = cref;                   // const int&
    decltype(cref) c = ci;            // const int& — decltype keeps the declared type exactly
    decltype(auto) d = cref;          // const int& — deduce like decltype
    static_assert(std::is_same_v<decltype(a), int>);
    static_assert(std::is_same_v<decltype(b), const int&>);
    static_assert(std::is_same_v<decltype(c), const int&>);
    static_assert(std::is_same_v<decltype(d), const int&>);

    // Pitfall: auto with braces
    auto x1 = {1, 2, 3};              // std::initializer_list<int>, not a vector!
    auto x2{1};                       // int (C++17 rule)
    static_assert(std::is_same_v<decltype(x2), int>);
    std::printf("x1 has %zu elements\n", x1.size());
    return 0;
}
```

Guidelines: use `auto` when the type is obvious from the right-hand side or unimportant (iterators, lambdas, `make_unique`); spell the type when it carries meaning or you need a specific conversion (`std::size_t n = ...`).

---

## 11. Vocabulary types: `std::optional`, `std::variant`, `std::any`

These replace many casts and sentinel values with type-safe alternatives.

```cpp
#include <any>
#include <cstdio>
#include <optional>
#include <string>
#include <variant>
#include <vector>

// optional: "a value or nothing" — no magic -1 / nullptr sentinel.
std::optional<int> parsePort(const std::string& s) {
    if (s.empty() || s.size() > 5) {
        return std::nullopt;
    }
    int value = 0;
    for (char ch : s) {
        if (ch < '0' || ch > '9') {
            return std::nullopt;
        }
        value = value * 10 + (ch - '0');
    }
    if (value > 65535) {
        return std::nullopt;
    }
    return value;
}

// variant: "exactly one of these types" — a type-safe union.
using JsonValue = std::variant<std::nullptr_t, bool, double, std::string>;

std::string toString(const JsonValue& v) {
    return std::visit([](const auto& x) -> std::string {          // handles every alternative
        using T = std::decay_t<decltype(x)>;
        if constexpr (std::is_same_v<T, std::nullptr_t>) {
            return "null";
        } else if constexpr (std::is_same_v<T, bool>) {
            return x ? "true" : "false";
        } else if constexpr (std::is_same_v<T, double>) {
            return std::to_string(x);
        } else {
            return "\"" + x + "\"";
        }
    }, v);
}

int main() {
    for (const char* text : {"8080", "99999", "80a"}) {
        auto port = parsePort(text);
        std::printf("parsePort(%s) -> %s\n", text, port ? std::to_string(*port).c_str() : "invalid");
    }
    std::printf("value_or: %d\n", parsePort("bad").value_or(80));

    std::vector<JsonValue> values = {nullptr, true, 3.5, std::string("hi")};
    for (const auto& v : values) {
        std::printf("%s ", toString(v).c_str());
    }
    std::printf("\nholds a string? %s\n", std::holds_alternative<std::string>(values[3]) ? "yes" : "no");
    if (auto* d = std::get_if<double>(&values[2])) {               // checked access without exceptions
        std::printf("the double is %.1f\n", *d);
    }

    // any: "any copyable type" — type-erased; you must know the type to get it back.
    std::any box = 42;
    box = std::string("now a string");
    if (auto* s = std::any_cast<std::string>(&box)) {
        std::printf("any holds: %s\n", s->c_str());
    }
    try {
        std::any_cast<int>(box);
    } catch (const std::bad_any_cast&) {
        std::printf("any_cast<int> failed: wrong type\n");
    }
    return 0;
}
```

| Type | Means | Overhead |
|---|---|---|
| `std::optional<T>` | T or nothing | sizeof(T) + a flag; no heap |
| `std::variant<A, B, C>` | exactly one of a fixed set of types | largest alternative + index; no heap |
| `std::any` | any copyable type | type-erased; small values inline, others on the heap |
| `std::expected<T, E>` (C++23) | a value or an error | like variant of T and E (see *Error Handling*) |

---

## 12. Strong types: let the type system catch unit bugs

```cpp
#include <cstdio>

template <typename Tag>
class Quantity {                                         // a "strong typedef"
public:
    explicit constexpr Quantity(double v) : value(v) {}
    constexpr double get() const { return value; }
    constexpr Quantity operator+(Quantity o) const { return Quantity(value + o.value); }
private:
    double value;
};

struct MetersTag {};
struct SecondsTag {};
using Meters = Quantity<MetersTag>;
using Seconds = Quantity<SecondsTag>;

double speed(Meters distance, Seconds time) {
    return distance.get() / time.get();
}

int main() {
    Meters d(100.0);
    Seconds t(9.58);
    std::printf("speed %.2f m/s\n", speed(d, t));
    // speed(t, d);              // compile error: arguments swapped
    // Meters wrong = d + t;     // compile error: can't add seconds to meters
    return 0;
}
```

(The Mars Climate Orbiter was lost in 1999 because one team used pound-force seconds and another newton-seconds. Strong types make that a compile error.)

---

## 13. Interview checklist

- [ ] The four named casts + `bit_cast`: what each does and when it's UB.
- [ ] `dynamic_cast` returns nullptr / throws `bad_cast`; needs RTTI and a polymorphic base; it's a design smell in chains.
- [ ] Type punning: `bit_cast`/`memcpy`, never `reinterpret_cast` + dereference; unions are fine in C, UB in C++.
- [ ] Why C-style casts are dangerous; `-Wold-style-cast`.
- [ ] Integer promotion, signed/unsigned comparisons, narrowing, float precision.
- [ ] `explicit` constructors and conversion operators.
- [ ] `auto`/`decltype` deduction rules.
- [ ] `optional`, `variant` + `visit`, `any`; strong types.

---

## Practice

1. What does `std::uint16_t a = 65535; std::uint16_t b = 1; auto c = a + b;` give for `c`'s type and value? And `std::uint16_t d = a + b;`?
2. Rewrite this code to avoid UB: `float f = 2.0f; int bits = *(int*)&f;`
3. Replace a chain of `dynamic_cast`s over `Shape*` (Circle, Square, Triangle) with `std::variant<Circle, Square, Triangle>` and `std::visit` to compute the total area.
4. Why does `for (unsigned i = n - 1; i >= 0; i--)` never terminate? Write two correct versions.
5. Write a function `toUnderlying(E e)` that converts any enum to its underlying integer type (hint: `std::underlying_type_t`; C++23 has `std::to_underlying`).

:::details Show solution
1. Both operands are promoted to `int`, so `c` is `int` with value **65536**. Assigning back to `std::uint16_t d` wraps modulo 65536 → **0**.
2.
```cpp
#include <bit>
#include <cassert>
#include <cstdint>
#include <cstring>

int main() {
    float f = 2.0f;
    std::uint32_t bits = std::bit_cast<std::uint32_t>(f);     // C++20
    std::uint32_t bits2;
    std::memcpy(&bits2, &f, sizeof f);                        // any standard
    assert(bits == 0x40000000u && bits == bits2);
    return 0;
}
```
3.
```cpp
#include <cassert>
#include <variant>
#include <vector>

struct Circle { double r; };
struct Square { double s; };
struct Triangle { double b, h; };
using Shape = std::variant<Circle, Square, Triangle>;

struct AreaVisitor {
    double operator()(const Circle& c) const { return 3.0 * c.r * c.r; }
    double operator()(const Square& s) const { return s.s * s.s; }
    double operator()(const Triangle& t) const { return 0.5 * t.b * t.h; }
};

int main() {
    std::vector<Shape> shapes = {Circle{1}, Square{2}, Triangle{2, 3}};
    double total = 0;
    for (const auto& s : shapes) {
        total += std::visit(AreaVisitor{}, s);   // a missing overload is a compile error
    }
    assert(total == 3.0 + 4.0 + 3.0);
    return 0;
}
```
4. `i` is unsigned, so `i >= 0` is always true; after `i == 0`, `i--` wraps to the maximum value. Fixes: `for (std::size_t i = n; i-- > 0;)` or use a signed index `for (long long i = static_cast<long long>(n) - 1; i >= 0; i--)` (or iterate with reverse iterators / `std::views::reverse`).
5.
```cpp
#include <type_traits>

template <typename E>
constexpr std::underlying_type_t<E> toUnderlying(E e) noexcept {
    return static_cast<std::underlying_type_t<E>>(e);
}

enum class Level : unsigned char { Low = 1, High = 9 };
static_assert(toUnderlying(Level::High) == 9);

int main() {
    return 0;
}
```
:::

---

## Interview Q&A

- **Which cast for a safe downcast?** `dynamic_cast` (or `static_cast` if you *know* the type and want zero cost).
- **What does `reinterpret_cast` guarantee?** Very little — mostly round-tripping `T* → uintptr_t → T*` and to/from `char*`.
- **How do you view a float's bits?** `std::bit_cast` or `memcpy`.
- **Why doesn't `dynamic_cast` work with `-fno-rtti`?** It needs the runtime type information that flag removes.
- **What is integer promotion?** Types smaller than `int` (`char`, `short`, `uint8_t`) are converted to `int` before arithmetic.
- **Why are C-style casts discouraged in C++?** A single `(T)x` may perform a `const_cast`, `static_cast` or `reinterpret_cast` depending on what compiles, silently doing something dangerous; named casts state intent and are searchable.
- **Is type punning through a union allowed?** In C, yes; in C++ reading a member other than the last one written is undefined behaviour — use `std::bit_cast` or `memcpy`.
- **Why can `-1 < 1u` be false?** The usual arithmetic conversions turn `-1` into an unsigned value (4294967295 for 32-bit), so the comparison is done in unsigned arithmetic; use `std::cmp_less` or avoid mixing signedness.
- **What does brace initialisation do about narrowing?** It rejects narrowing conversions (e.g. `int x{3.5}`) at compile time.
- **When is `const_cast` safe?** When the object you eventually write through wasn't originally declared const, or when you only remove const to call an API that doesn't modify.
- **What's the difference between `std::variant` and `std::any`?** `variant` holds one of a fixed set of types known at compile time with no heap allocation and checked visitation; `any` holds any copyable type, type-erased, and you must know the type to retrieve it.
- **What does `explicit` on a conversion operator do?** Prevents implicit conversions while still allowing explicit casts and, for `operator bool`, use in conditions.

---

## External resources

- **cppreference — Explicit type conversion, `static_cast`, `dynamic_cast`, `const_cast`, `reinterpret_cast`, `std::bit_cast`, Implicit conversions.**
- **C++ Core Guidelines — ES.48–ES.50 (avoid casts), C.146 (dynamic_cast), Type safety profile.**
- **Scott Meyers — *Effective C++*, Item 27 ("Minimize casting")** and ***Effective Modern C++*, Items 1–6** (type deduction, `auto`).
- **Shafik Yaghmour — "What is the Strict Aliasing Rule and Why do we care?"** (GitHub gist).
- **Jonathan Boccara — "Strong types for strong interfaces"** (fluentcpp.com) and the NamedType library.
