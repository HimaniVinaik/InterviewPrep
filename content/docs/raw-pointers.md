# Raw Pointers Mastery

Raw pointers are the foundation of both C and C++. Even in modern C++ where ownership is expressed with smart pointers, **raw pointers remain the right tool for non-owning access** — and interviewers (especially embedded and systems teams) will test you on them relentlessly.

> **Key:** In modern C++, a raw pointer `T*` should mean *"I can see this object, but I don't own it."* Ownership belongs to smart pointers, containers, or the stack.

## 1. What a pointer is

A pointer is a variable that holds a **memory address**. Its type tells the compiler what lives at that address — which determines how many bytes to read and how pointer arithmetic scales.

```cpp
int x = 42;
int* p = &x;      // p holds the address of x
*p = 7;           // dereference: write through the pointer -> x == 7
int** pp = &p;    // pointer to pointer
**pp = 9;         // x == 9

std::cout << p << '\n';        // address, e.g. 0x7ffd5c3a1b2c
std::cout << sizeof(p) << '\n'; // 8 on a 64-bit platform, regardless of T
```

| Expression | Meaning |
|---|---|
| `&x` | address-of x |
| `*p` | object p points to |
| `p->m` | `(*p).m` |
| `p[i]` | `*(p + i)` |
| `&p[i]` | `p + i` |

## 2. Declarations: read them right-to-left

```cpp
int* a, b;            // a is int*, b is int!  (the * binds to the name)
int *c, *d;           // both pointers

const int* p1;        // pointer to const int    (can't modify *p1, can reseat p1)
int const* p2;        // same as p1
int* const p3 = &x;   // const pointer to int    (can modify *p3, can't reseat)
const int* const p4 = &x; // const pointer to const int

int* arr[10];         // array of 10 pointers to int
int (*parr)[10];      // pointer to an array of 10 ints
int (*fp)(double);    // pointer to function taking double returning int
int* (*fp2)(int*);    // pointer to function taking int* returning int*
```

> **Tip:** Read from the variable name outward, going right first, then left: `int (*parr)[10]` → "parr is a **pointer** to an **array of 10** **ints**". The **spiral rule** generalises this.

### const-correctness

`const T*` in a function parameter documents "I won't modify what you give me" and lets callers pass const objects. You can always convert `T*` → `const T*` implicitly, never the reverse (without `const_cast`).

```cpp
size_t count_spaces(const char* s);   // promises not to modify the string
```

## 3. Pointer arithmetic

Arithmetic is in units of `sizeof(T)`, not bytes.

```cpp
int a[5] = {10, 20, 30, 40, 50};
int* p = a;          // array decays to pointer to first element
p += 2;              // now points to a[2] (advanced 2*sizeof(int) bytes)
std::ptrdiff_t d = p - a;   // 2 — difference in elements
int* end = a + 5;    // one-past-the-end: valid to form & compare, NOT to dereference
for (int* it = a; it != end; ++it) std::cout << *it;
```

Rules (break them and you have **undefined behaviour**):
- Arithmetic is only valid within the same array (plus one past the end).
- Subtracting/comparing pointers into *different* arrays is UB (or unspecified for `<`).
- Dereferencing one-past-the-end is UB.

### Byte-level access

To walk raw bytes, cast to `unsigned char*` (or `std::byte*`). This is the one type allowed to alias anything.

```cpp
uint32_t v = 0x11223344;
auto* bytes = reinterpret_cast<const unsigned char*>(&v);
for (size_t i = 0; i < sizeof v; ++i) std::printf("%02x ", bytes[i]); // 44 33 22 11 on little-endian
```

## 4. Arrays and decay

An array is **not** a pointer, but in most expressions it *decays* into a pointer to its first element.

```cpp
int a[10];
sizeof(a);          // 40 — the whole array
int* p = a;
sizeof(p);          // 8 — just a pointer

void f(int arr[10]);  // the 10 is ignored! Parameter is really `int* arr`
void g(int (&arr)[10]); // reference to array: size preserved
template <size_t N> void h(int (&arr)[N]); // deduces N

// Modern C++: pass std::span (C++20) — pointer + length together
void process(std::span<const int> data) {
    for (int x : data) { /* ... */ }
}
process(a);          // works with C arrays, std::array, std::vector
```

Classic interview trap:

```cpp
void bad(int arr[]) {
    size_t n = sizeof(arr) / sizeof(arr[0]); // WRONG: sizeof(int*)/sizeof(int) = 2
}
```

### 2-D arrays

```cpp
int m[3][4];               // contiguous, row-major: m[r][c] == *(&m[0][0] + r*4 + c)
int (*row)[4] = m;         // m decays to pointer-to-array-of-4
void take(int m[][4], int rows);  // all but the first dimension must be known

int** jag = new int*[3];   // "array of pointers" — NOT the same layout as int[3][4]
```

## 5. Pointers and strings

```cpp
const char* s = "hello";   // string literal: static storage, READ-ONLY
// s[0] = 'H';             // UB — modifying a literal (C++ requires const char*)
char buf[] = "hello";      // array copy on the stack — writable, size 6 (incl. '\0')
```

## 6. Null, dangling and wild pointers

| Kind | What it is | Fix |
|---|---|---|
| **Null** | `nullptr` — points nowhere; dereferencing is UB | check before use, or use references when null isn't valid |
| **Dangling** | points to an object whose lifetime ended | ownership discipline, smart pointers, don't return addresses of locals |
| **Wild / uninitialised** | never initialised, holds garbage | always initialise: `T* p = nullptr;` |

```cpp
int* dangling() {
    int local = 5;
    return &local;          // BUG: local dies at return
}

std::vector<int> v{1, 2, 3};
int* p = &v[0];
v.push_back(4);             // may reallocate -> p dangles (iterator invalidation)
```

> **Danger:** Use `nullptr`, never `NULL` or `0`, in C++. `NULL` is an integer constant and can pick the wrong overload: `f(NULL)` may call `f(int)` instead of `f(char*)`.

## 7. Dynamic memory with raw pointers

```cpp
int* one = new int(5);       // single object
int* many = new int[100];    // array
delete one;                  // matching forms are mandatory:
delete[] many;               // new -> delete, new[] -> delete[]   (mixing = UB)

// C style
int* c = (int*)std::malloc(100 * sizeof(int));  // no constructors run!
std::free(c);
```

Common bugs: **leak** (no delete), **double free**, **use-after-free**, **mismatched new[]/delete**, `malloc` + `delete`. Modern rule: you should almost never write `new`/`delete` by hand — use `std::make_unique`, containers, or RAII wrappers. See *Smart Pointers*.

## 8. Pointer vs reference

| | Pointer `T*` | Reference `T&` |
|---|---|---|
| Can be null | yes | no (must bind to an object) |
| Can be reseated | yes | no |
| Needs dereference syntax | yes (`*p`, `p->`) | no |
| Arithmetic | yes | no |
| Use when | optional / reseatable / arrays / C APIs | must exist, non-owning alias |

Guideline (C++ Core Guidelines F.60): prefer `T*` over `T&` when "no argument" is a valid option.

## 9. Function pointers

```cpp
int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

int (*op)(int, int) = add;     // or &add
int r = op(2, 3);              // 5

using BinOp = int (*)(int, int);     // readable alias
BinOp table[] = {add, sub};          // dispatch table (common in embedded state machines)
r = table[1](9, 4);                  // 5

// C callback style
void qsort(void* base, size_t n, size_t size, int (*cmp)(const void*, const void*));
int cmp_int(const void* a, const void* b) {
    int x = *static_cast<const int*>(a), y = *static_cast<const int*>(b);
    return (x > y) - (x < y);   // avoids overflow of x - y
}
```

In C++, prefer templates or `std::function` for callbacks that capture state, but function pointers remain the lingua franca of C APIs, ISR vector tables and plugin interfaces.

### Pointers to members

```cpp
struct S { int a; int get() const { return a; } };
int S::* pm = &S::a;            // pointer to data member
int (S::*pf)() const = &S::get; // pointer to member function
S s{3};
s.*pm = 4;
int v = (s.*pf)();              // 4; std::invoke(pf, s) is the modern spelling
```

## 10. `void*`

A type-erased pointer: can hold any object address, cannot be dereferenced or used in arithmetic (standard C++), must be cast back to the correct type.

```cpp
void* raw = &x;
int* back = static_cast<int*>(raw);   // OK: same type it came from
```

## 11. Pointer aliasing and `restrict`

Two pointers *alias* if they can refer to the same memory. Compilers must assume aliasing unless they can prove otherwise, which inhibits optimisation:

```cpp
void add_to(int* a, const int* b, int n) {
    for (int i = 0; i < n; ++i) a[i] += *b;  // *b must be reloaded every iteration: a may alias b
}
```

C99 `restrict` (and the compiler extension `__restrict__` in C++) promises no aliasing. **Strict aliasing rule:** accessing an object through a pointer of an unrelated type (e.g. `float` via `int*`) is UB — use `memcpy` or C++20 `std::bit_cast` for type punning.

## 12. Interview checklist

- Explain `const int*` vs `int* const`.
- Why does `sizeof(arr)` differ inside a function?
- What is one-past-the-end and why is it allowed?
- Write `swap(int* a, int* b)`; then explain why C++ uses references instead.
- Reverse a linked list with pointers (see Problems → Linked List).
- What happens when you `delete` a pointer twice? (UB — heap corruption.)
- What does `int (*(*f)(int))[5]` declare? (f is a pointer to a function taking int, returning a pointer to an array of 5 ints.)
- How do you catch pointer bugs? AddressSanitizer (`-fsanitize=address`), Valgrind, static analysis (clang-tidy). See *Learn → Debugging*.

## Practice

```cpp
// What does this print? (assume 4-byte int, little-endian)
int a[] = {1, 2, 3, 4};
int* p = a + 1;
std::cout << *p++ << ' ' << *p << ' ' << p[-2] << ' ' << (p - a) << '\n';
// Answer: "2 3 1 2"  — *p++ reads a[1] then advances; p[-2] is a[0].
```

## Interview Q&A

- **What's the difference between `const int*` and `int* const`?** `const int*` is a pointer to a const int: you can't modify the pointee but can reseat the pointer. `int* const` is a const pointer: you can modify the pointee but can't reseat it.
- **Why does `sizeof(arr)` inside a function give the wrong array size?** An array parameter decays to a pointer, so `sizeof` returns the pointer size (e.g. 8), not the array size. Pass the size separately, use `std::span`, or take the array by reference.
- **What is one-past-the-end and why is it allowed?** A pointer to the position just after the last element. You may form and compare it (it's the end of loops and iterator ranges) but never dereference it.
- **What is a dangling pointer? Give two ways to create one.** A pointer to an object whose lifetime has ended: returning the address of a local variable, or keeping a pointer into a `std::vector` that later reallocates (or after `delete`).
- **Why should C++ code use `nullptr` instead of `NULL`?** `NULL` is an integer constant (0 or `0L`), so `f(NULL)` can pick an integer overload. `nullptr` has its own type `std::nullptr_t` and only converts to pointer types.
- **Pointer vs reference: when do you choose a pointer?** Use a pointer when the value may be absent (null), needs reseating, or for arrays/C APIs. Use a reference when the object must exist and the alias never changes.
- **What does the strict aliasing rule say?** You may only access an object through its own type (or a signed/unsigned variant, or `char`/`unsigned char`/`std::byte`). Reading a `float` through an `int*` is undefined behaviour — use `memcpy` or `std::bit_cast`.
