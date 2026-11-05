# Casts & the Type System

C++ replaces C's single all-powerful `(T)x` cast with four named casts, each with a narrow, searchable purpose.

| Cast | Purpose | Checked? |
|---|---|---|
| `static_cast<T>(x)` | well-defined conversions: numeric, up/down-casts you *know* are valid, `void*` → `T*` | compile time |
| `dynamic_cast<T>(x)` | safe downcast/cross-cast in polymorphic hierarchies | **runtime** (RTTI) |
| `const_cast<T>(x)` | add/remove `const`/`volatile` | compile time |
| `reinterpret_cast<T>(x)` | reinterpret bits: pointer ↔ integer, unrelated pointer types | none — dangerous |
| `std::bit_cast<T>(x)` (C++20) | copy object representation into another trivially-copyable type | compile time (sizes must match) |

## 1. `static_cast`

```cpp
double d = 3.9;
int i = static_cast<int>(d);              // 3 (truncation toward zero)
auto u = static_cast<unsigned>(-1);       // 4294967295 (modular)
enum class Color : uint8_t { Red = 1 };
auto raw = static_cast<uint8_t>(Color::Red);   // scoped enums need explicit casts

Base* b = new Derived;
Derived* dd = static_cast<Derived*>(b);   // OK only if b really points to a Derived — else UB

void* vp = &i;
int* ip = static_cast<int*>(vp);
```

## 2. `dynamic_cast`

```cpp
struct Animal { virtual ~Animal() = default; };
struct Dog : Animal { void bark(); };
struct Cat : Animal { };

void handle(Animal* a) {
    if (auto* d = dynamic_cast<Dog*>(a)) d->bark();    // nullptr if not a Dog
}
void handle_ref(Animal& a) {
    try { auto& d = dynamic_cast<Dog&>(a); d.bark(); }
    catch (const std::bad_cast&) { /* not a dog */ }
}
```

- Requires a polymorphic type (at least one virtual function).
- Costs a runtime walk of type info (string comparisons in some ABIs across shared libraries). Often disabled with `-fno-rtti` in embedded builds.
- Frequent `dynamic_cast` is a design smell — prefer virtual functions or `std::variant` + `std::visit`.

## 3. `const_cast`

```cpp
void legacy_api(char* s);          // doesn't actually modify s, but isn't const-correct
const std::string msg = "hi";
legacy_api(const_cast<char*>(msg.c_str()));   // OK as long as legacy_api doesn't write
```

> **Danger:** Modifying an object that was *originally declared* `const` through a `const_cast` pointer is undefined behaviour.

## 4. `reinterpret_cast`

```cpp
auto* reg = reinterpret_cast<volatile uint32_t*>(0x40020014);  // MMIO register
uintptr_t addr = reinterpret_cast<uintptr_t>(ptr);              // pointer -> integer
auto* bytes = reinterpret_cast<const std::byte*>(&obj);         // viewing bytes is allowed
float* f = reinterpret_cast<float*>(&some_int);                 // creating it is fine...
float bad = *f;                                                 // ...READING it violates strict aliasing: UB
```

## 5. Type punning done right

```cpp
float f = 1.0f;
// ❌ uint32_t bits = *reinterpret_cast<uint32_t*>(&f);   // strict aliasing UB
// ❌ union { float f; uint32_t u; } pun{f}; pun.u;       // UB in C++ (OK in C)
uint32_t bits;
std::memcpy(&bits, &f, sizeof bits);                       // ✅ always OK, optimised to a move
auto bits2 = std::bit_cast<uint32_t>(f);                   // ✅ C++20, constexpr
// bits == 0x3F800000
```

**Strict aliasing rule:** you may access an object only through its own type (or a signed/unsigned variant, or `char`/`unsigned char`/`std::byte`). Compilers optimise assuming this (`-fstrict-aliasing` at `-O2`). Violations produce bugs that appear only in optimised builds.

## 6. C-style casts — why to avoid them

`(T)x` tries `const_cast`, `static_cast`, `static_cast`+`const_cast`, `reinterpret_cast`, `reinterpret_cast`+`const_cast` in that order and silently picks the first that compiles. It can cast away const or reinterpret bits without you noticing, and it's impossible to grep for.

## 7. Implicit conversions to watch

```cpp
unsigned u = 1; int i = -1;
bool surprise = i < u;                   // false! -1 converts to UINT_MAX (-Wsign-compare)
std::vector<int> v;
for (int k = 0; k < v.size() - 1; ++k);  // v.size()-1 underflows to SIZE_MAX when empty!
uint8_t a = 200, b = 100;
auto c = a + b;                          // int 300: integer promotion before arithmetic
uint8_t d = a + b;                       // 44: narrowing on assignment (wraps)
int x{3.5};                              // error: brace-init forbids narrowing ✔
```

Use `std::ssize(v)` (C++20) for signed sizes, `std::cmp_less(i, u)` (C++20) for safe mixed-sign comparison, and enable `-Wconversion -Wsign-conversion`.

## 8. RTTI: `typeid`

```cpp
#include <typeinfo>
Animal* a = new Dog;
std::cout << typeid(*a).name();          // mangled name of Dog (dynamic type for polymorphic)
bool same = typeid(*a) == typeid(Dog);
```

## 9. `std::variant`, `std::any`, `std::optional`

Modern alternatives to casting-heavy designs:

```cpp
using Msg = std::variant<Ping, Data, Ack>;     // closed set of types, no heap, no vtable
void dispatch(const Msg& m) {
    std::visit([](const auto& x) { handle(x); }, m);   // overload resolution per alternative
}
std::optional<int> parse(std::string_view s);  // value or nothing — instead of -1 sentinels
std::any anything = 42;  int v = std::any_cast<int>(anything);  // type-erased, checked
```

## Interview Q&A

- **Which cast for a safe downcast?** `dynamic_cast` (or `static_cast` if you *know* the type and want zero cost).
- **What does `reinterpret_cast` guarantee?** Very little — mostly round-tripping `T* → uintptr_t → T*` and to/from `char*`.
- **How do you view a float's bits?** `std::bit_cast` or `memcpy`.
- **Why doesn't `dynamic_cast` work with `-fno-rtti`?** It needs the runtime type information that flag removes.
- **What is integer promotion?** Types smaller than `int` (`char`, `short`, `uint8_t`) are converted to `int` before arithmetic.
