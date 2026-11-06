# Raw Pointers Mastery

> **Key idea:** a pointer is just a variable that holds a **memory address**. Everything else — arrays, strings, dynamic memory, polymorphism, iterators, smart pointers — is built on that one idea. If you can draw memory as boxes with addresses and arrows, you can answer any pointer question.

**What you'll be able to do after this guide**
- Read and write any pointer declaration, including `const` placement and function pointers.
- Reason about pointer arithmetic, arrays, decay, and multi-dimensional arrays at the byte level.
- Spot dangling, wild, double-free and aliasing bugs — and know which tools catch them.
- Explain pointers vs references, `void*`, `restrict`, pointers to members and the strict aliasing rule in an interview.

---

## 1. Memory as numbered boxes

Your program's memory is a long row of bytes, each with a number — its **address**. A variable occupies one or more consecutive bytes.

```text
address:   0x1000  0x1001  0x1002  0x1003  0x1004 ...
           ┌───────────────────────────────┐
int x = 42 │        42 (4 bytes)           │
           └───────────────────────────────┘
```

- `&x` — "address of x" → `0x1000`.
- A **pointer** `int* p = &x;` is another variable whose *value* is `0x1000`.
- `*p` — "dereference": go to the address stored in `p` and use what's there → `42`.

```text
   p (8 bytes, at 0x2000)            x (4 bytes, at 0x1000)
  ┌──────────────┐                   ┌──────┐
  │   0x1000     │ ───────────────►  │  42  │
  └──────────────┘                   └──────┘
```

```cpp
#include <cstdio>

int main() {
    int x = 42;
    int* p = &x;                 // p holds the address of x

    std::printf("x  = %d\n", x);
    std::printf("&x = %p\n", static_cast<void*>(&x));
    std::printf("p  = %p (same address)\n", static_cast<void*>(p));
    std::printf("*p = %d\n", *p);          // read through the pointer

    *p = 100;                    // write through the pointer: changes x
    std::printf("x after *p = 100: %d\n", x);

    int** pp = &p;               // a pointer to a pointer
    **pp = 7;                    // follow two arrows
    std::printf("x after **pp = 7: %d\n", x);

    std::printf("sizeof(int) = %zu, sizeof(int*) = %zu, sizeof(char*) = %zu\n",
                sizeof(int), sizeof(int*), sizeof(char*));   // all pointers: 8 bytes on 64-bit
    return 0;
}
```

> **Key:** every object pointer has the same size on a given platform (8 bytes on 64-bit systems) regardless of what it points to. The **type** of a pointer (`int*`, `double*`) tells the compiler two things: how many bytes to read when you dereference, and how far to move when you do arithmetic.

### Three operators, three meanings of `*`

| Where | Meaning | Example |
|---|---|---|
| In a declaration | "is a pointer" | `int* p;` |
| In an expression | "dereference" | `*p = 3;` |
| Between two values | multiplication | `a * b` |

And `&` in a declaration means **reference** (`int& r = x;`), while in an expression it means **address-of** (`&x`).

---

## 2. Reading declarations: right to left

Read from the variable name **outwards**, going right first then left (the "spiral" or right-left rule):

| Declaration | Read as |
|---|---|
| `int* p` | p is a pointer to int |
| `const int* p` | p is a pointer to an int that is const |
| `int const* p` | same as above (const binds to what's on its left; if nothing, to its right) |
| `int* const p` | p is a **const pointer** to int |
| `const int* const p` | p is a const pointer to a const int |
| `int** p` | p is a pointer to a pointer to int |
| `int* a[10]` | a is an array of 10 pointers to int |
| `int (*a)[10]` | a is a pointer to an array of 10 ints |
| `int (*f)(double)` | f is a pointer to a function taking double, returning int |
| `int* (*f)(int*)` | f is a pointer to a function taking int*, returning int* |
| `int (*fs[4])(int)` | fs is an array of 4 pointers to functions int → int |

> **Pitfall:** `int* a, b;` declares **one** pointer `a` and one plain `int b`. The `*` belongs to the variable, not the type. Declare one variable per line.

### const-correctness

```cpp
#include <cstdio>

int main() {
    int a = 1;
    int b = 2;

    const int* p1 = &a;     // pointer to const: can't change *p1, CAN reseat p1
    // *p1 = 5;             // error: assignment of read-only location
    p1 = &b;                // fine

    int* const p2 = &a;     // const pointer: CAN change *p2, can't reseat
    *p2 = 5;                // fine: a is now 5
    // p2 = &b;             // error: assignment of read-only variable

    const int* const p3 = &a;   // neither
    std::printf("a=%d *p1=%d *p3=%d\n", a, *p1, *p3);
    return 0;
}
```

**Rule:** you can always *add* const when converting (`int*` → `const int*` is implicit), but never silently remove it (that needs `const_cast`, and writing to a truly const object through it is UB).

A common interview question — why doesn't `int**` convert to `const int**`?

```cpp
// no-test (shows why the language forbids it)
const int secret = 42;
int* p = nullptr;
const int** pp = &p;   // ERROR in C++ — and here is the hole it would open:
*pp = &secret;         // p now points at secret...
*p = 0;                // ...and we'd modify a const object through a plain int*
```

`int**` → `const int* const*` *is* allowed, because the middle `const` closes the hole.

---

## 3. Pointer arithmetic

Adding `n` to a `T*` moves it by `n * sizeof(T)` **bytes** — by `n` elements, not `n` bytes.

```text
int arr[4] = {10, 20, 30, 40};        sizeof(int) == 4
address:   0x100   0x104   0x108   0x10C   0x110
           [ 10  ] [ 20  ] [ 30  ] [ 40  ]  (one past the end)
            p       p+1     p+2     p+3     p+4
```

| Operation | Result | Meaning |
|---|---|---|
| `p + n`, `p - n` | pointer | move n elements |
| `p++`, `p--` | pointer | move one element |
| `q - p` | `std::ptrdiff_t` | number of elements between them (same array only) |
| `p < q` | bool | which comes first (same array only) |
| `p[n]` | element | exactly `*(p + n)` |

```cpp
#include <cstddef>
#include <cstdio>

int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    int* p = arr;                       // points at arr[0]
    int* end = arr + 5;                 // one past the last element: valid to form, never dereference

    // Walk with a pointer, the C way.
    for (int* it = p; it != end; ++it) {
        std::printf("%d ", *it);
    }
    std::printf("\n");

    std::printf("p[2] = %d, *(p + 2) = %d, 2[p] = %d\n", p[2], *(p + 2), 2[p]);   // all identical!

    int* third = &arr[2];
    std::ptrdiff_t distance = third - p;            // in elements, not bytes
    std::printf("third - p = %td elements = %td bytes\n", distance, distance * (std::ptrdiff_t)sizeof(int));

    double d[3] = {1.5, 2.5, 3.5};
    double* dp = d;
    std::printf("dp = %p, dp + 1 = %p (8 bytes later)\n",
                static_cast<void*>(dp), static_cast<void*>(dp + 1));
    return 0;
}
```

`2[p]` works because `a[b]` is *defined* as `*(a + b)` and addition is commutative — a classic trivia question, never write it in real code.

### What's legal and what's UB

- You may point anywhere **inside** an array or **one past its end**.
- Computing a pointer **before the start** or **more than one past the end** is undefined behaviour — even if you never dereference it.
- Subtracting or comparing (`<`) pointers into **different** arrays is UB (use `std::less<>` if you need an ordering of arbitrary pointers).
- A single object counts as an array of one: `&x + 1` is a valid one-past-the-end pointer.

### Byte-level access

`char`, `unsigned char` and `std::byte` pointers may alias any object, so they're how you inspect raw bytes:

```cpp
#include <cstddef>
#include <cstdint>
#include <cstdio>

int main() {
    std::uint32_t value = 0x11223344;
    const unsigned char* bytes = reinterpret_cast<const unsigned char*>(&value);
    std::printf("bytes in memory: ");
    for (std::size_t i = 0; i < sizeof(value); i++) {
        std::printf("%02x ", bytes[i]);          // little-endian machines print 44 33 22 11
    }
    std::printf("\n");

    // Walking a struct's bytes shows padding inserted for alignment.
    struct S {
        char c;     // offset 0
        int i;      // offset 4 (3 bytes of padding before it)
    };
    std::printf("sizeof(S) = %zu, offsetof(S, i) = %zu\n", sizeof(S), offsetof(S, i));
    return 0;
}
```

---

## 4. Arrays and pointer decay

An array is **not** a pointer — it's a block of N elements. But in most expressions an array **decays** into a pointer to its first element, losing its size.

```cpp
#include <cstdio>

void takesPointer(int* a) {                       // `int a[]` and `int a[100]` mean the SAME thing here
    std::printf("inside function: sizeof(a) = %zu (just a pointer!)\n", sizeof(a));
}

template <std::size_t N>
void takesArrayRef(int (&a)[N]) {                 // a reference to an array keeps the size
    std::printf("by reference: N = %zu, sizeof = %zu\n", N, sizeof(a));
}

int main() {
    int arr[10] = {};
    std::printf("in main: sizeof(arr) = %zu, count = %zu\n", sizeof(arr), sizeof(arr) / sizeof(arr[0]));
    takesPointer(arr);                            // decays to int*
    takesArrayRef(arr);

    int* p = arr;                                 // decay: &arr[0]
    int (*whole)[10] = &arr;                      // pointer to the whole array — different type
    std::printf("p + 1 moves %zu bytes, whole + 1 moves %zu bytes\n",
                (size_t)((char*)(p + 1) - (char*)p), (size_t)((char*)(whole + 1) - (char*)whole));
    return 0;
}
```

Decay does **not** happen for: `sizeof arr`, `&arr`, `decltype(arr)`, binding to an array reference, and string-literal initialisation of a `char` array.

> **Tip:** in modern C++ pass `std::span<int>` (C++20) — a pointer + size pair that works with arrays, `std::vector` and `std::array` alike, and never loses the length.

```cpp
#include <array>
#include <cstdio>
#include <span>
#include <vector>

int sum(std::span<const int> values) {          // one function for every contiguous container
    int total = 0;
    for (int v : values) {
        total += v;
    }
    return total;
}

int main() {
    int c_array[] = {1, 2, 3};
    std::array<int, 4> std_array = {1, 2, 3, 4};
    std::vector<int> vec = {10, 20};
    std::printf("%d %d %d %d\n", sum(c_array), sum(std_array), sum(vec), sum(std::span(vec).subspan(1)));
    return 0;
}
```

### Multi-dimensional arrays

A 2-D array `int m[3][4]` is **one contiguous block** of 12 ints, stored row by row. `m[i][j]` lives at offset `i*4 + j`.

```cpp
#include <cstdio>
#include <cstdlib>

void printMatrix(const int (*rows)[4], int nRows) {   // pointer to arrays of 4 ints: column count is part of the type
    for (int i = 0; i < nRows; i++) {
        for (int j = 0; j < 4; j++) {
            std::printf("%3d", rows[i][j]);
        }
        std::printf("\n");
    }
}

int main() {
    int m[3][4];
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 4; j++) {
            m[i][j] = i * 10 + j;
        }
    }
    printMatrix(m, 3);                                 // int[3][4] decays to int (*)[4]

    // Same memory, viewed flat:
    const int* flat = &m[0][0];
    std::printf("flat[1*4 + 2] = %d == m[1][2] = %d\n", flat[1 * 4 + 2], m[1][2]);

    // A dynamically sized matrix: one allocation, manual indexing (cache-friendly).
    int rows = 3;
    int cols = 5;
    int* grid = static_cast<int*>(std::malloc(sizeof(int) * rows * cols));
    for (int i = 0; i < rows * cols; i++) {
        grid[i] = i;
    }
    std::printf("grid(2, 3) = %d\n", grid[2 * cols + 3]);
    std::free(grid);
    return 0;
}
```

The "array of pointers to rows" (`int**`) layout — allocating each row separately — is **not** the same as `int[3][4]`: it needs `rows + 1` allocations, isn't contiguous, and an `int[3][4]` can't be passed as `int**`. Prefer one flat buffer.

---

## 5. Pointers and C strings

A C string is a `char` array ending with `'\0'`. A string literal `"hi"` is a `const char[3]` stored in read-only memory.

```cpp
#include <cstdio>
#include <cstring>

std::size_t myStrlen(const char* s) {
    const char* p = s;
    while (*p != '\0') {
        p++;
    }
    return static_cast<std::size_t>(p - s);     // pointer difference = length
}

int main() {
    const char* literal = "hello";   // points into read-only memory — must be const char*
    char buffer[] = "hello";         // a writable COPY on the stack: char[6]
    buffer[0] = 'j';
    // literal[0] = 'j';             // error (and UB in C if you cast const away)

    std::printf("%s %s, lengths %zu %zu\n", literal, buffer, myStrlen(literal), std::strlen(buffer));
    std::printf("sizeof(literal) = %zu (pointer), sizeof(buffer) = %zu (array incl. '\\0')\n",
                sizeof(literal), sizeof(buffer));
    return 0;
}
```

> **Danger:** forgetting space for the terminator (`char name[5] = "hello";` has no room for `'\0'` in C++ — it's an error; in C it silently drops the terminator) is a classic buffer bug. Prefer `std::string` and `std::string_view` in C++.

---

## 6. Null, dangling, wild — and other ways to crash

| Kind | What it is | Typical cause |
|---|---|---|
| **Null** | points to nothing (`nullptr`) | not found / optional value; dereferencing it is UB (usually a crash) |
| **Wild** | uninitialised — random address | `int* p;` then `*p = 3;` |
| **Dangling** | object's lifetime has ended | returning `&local`, use after `delete`, iterator/pointer into a `vector` that reallocated |
| **Double free** | `delete` twice | two owners of one raw pointer |
| **Leak** | allocation never freed | early `return` or exception before `delete` |
| **Mismatched** | `new[]` + `delete`, `malloc` + `delete` | mixing allocation APIs |
| **Out of bounds** | outside the array | off-by-one loops |

```cpp
// no-test (each line is a bug on purpose — don't run this)
int* danglingLocal() {
    int x = 5;
    return &x;            // x dies when the function returns
}
void bugs() {
    int* p = new int(3);
    delete p;
    *p = 4;               // use after free
    delete p;             // double free

    std::vector<int> v = {1, 2, 3};
    int* first = &v[0];
    v.push_back(4);       // may reallocate: first now dangles
    *first = 9;           // UB

    int* wild;            // uninitialised
    *wild = 1;            // writes to a random address
}
```

**Defences:**
1. Initialise every pointer (`int* p = nullptr;`).
2. Prefer automatic storage and containers; use smart pointers for ownership (see *Smart Pointers*).
3. Set raw pointers to `nullptr` after `delete` when they live on.
4. Compile with sanitizers during development: `-fsanitize=address,undefined` catches use-after-free, double-free, overflows and leaks with a precise stack trace. Valgrind does similar without recompiling.

```cpp
#include <cstdio>
#include <vector>

int main() {
    // The vector-reallocation bug, made safe: hold an INDEX, not a pointer.
    std::vector<int> v = {1, 2, 3};
    std::size_t firstIndex = 0;
    std::printf("capacity before: %zu\n", v.capacity());
    for (int i = 0; i < 100; i++) {
        v.push_back(i);                         // reallocates several times
    }
    std::printf("capacity after: %zu, v[firstIndex] = %d (still valid)\n", v.capacity(), v[firstIndex]);

    // Or reserve up front if you must keep pointers.
    std::vector<int> w;
    w.reserve(100);
    w.push_back(1);
    int* stable = &w[0];
    for (int i = 0; i < 99; i++) {
        w.push_back(i);                         // no reallocation: capacity was reserved
    }
    std::printf("*stable = %d\n", *stable);
    return 0;
}
```

---

## 7. Dynamic memory with raw pointers

| Allocate | Free | Notes |
|---|---|---|
| `new T(args)` | `delete p` | calls constructor / destructor |
| `new T[n]` | `delete[] p` | array form — must match! |
| `std::malloc(bytes)` | `std::free(p)` | C: no constructors; returns `void*` |
| `::operator new(bytes)` | `::operator delete(p)` | raw memory, used inside allocators |
| placement `new (buf) T(args)` | `p->~T()` | construct in memory you already own |

```cpp
#include <cstdio>
#include <cstdlib>
#include <new>

struct Widget {
    int id;
    explicit Widget(int i) : id(i) { std::printf("  construct %d\n", id); }
    ~Widget() { std::printf("  destroy %d\n", id); }
};

int main() {
    std::printf("single object:\n");
    Widget* w = new Widget(1);          // allocate + construct
    delete w;                           // destroy + free
    w = nullptr;

    std::printf("array:\n");
    int* nums = new int[3]{7, 8, 9};
    std::printf("  nums[2] = %d\n", nums[2]);
    delete[] nums;                      // [] because it came from new[]

    std::printf("placement new into a buffer we own:\n");
    alignas(Widget) unsigned char storage[sizeof(Widget)];
    Widget* inPlace = new (storage) Widget(2);     // construct only, no allocation
    inPlace->~Widget();                            // destroy only, no free

    std::printf("malloc (no constructor runs):\n");
    int* raw = static_cast<int*>(std::malloc(4 * sizeof(int)));
    if (raw == nullptr) {
        return 1;                                   // malloc reports failure with nullptr
    }
    raw[0] = 1;
    std::free(raw);

    std::printf("new throws on failure; nothrow returns nullptr:\n");
    int* maybe = new (std::nothrow) int[10];
    std::printf("  got %s\n", maybe ? "memory" : "nullptr");
    delete[] maybe;
    return 0;
}
```

> **Interview:** "Why must `new[]` pair with `delete[]`?" — `new[]` may store the element count next to the array so `delete[]` knows how many destructors to run. Plain `delete` on such a pointer is UB (for types with destructors it typically corrupts the heap).

**Modern rule:** application code should almost never write `new`/`delete`. Use `std::make_unique`, `std::make_shared`, `std::vector`, `std::string`. Raw pointers remain perfect as **non-owning observers** ("I can see this object; I don't own it").

---

## 8. Pointer vs reference

| | Pointer `T*` | Reference `T&` |
|---|---|---|
| Can be null | yes | no (a "null reference" is UB) |
| Can be reseated | yes | no — bound forever at initialisation |
| Must be initialised | no (but should be) | yes |
| Arithmetic | yes | no |
| Syntax | `*p`, `p->m` | used like the object itself |
| Has its own address | yes (`&p`) | `&r` gives the referent's address |
| Typical use | optional / reseatable / arrays / C APIs | function parameters, return of members |

```cpp
#include <cstdio>

void incrementByPointer(int* p) {
    if (p != nullptr) {          // pointers must be checked
        (*p)++;
    }
}

void incrementByReference(int& r) {
    r++;                         // always refers to a real object
}

int* findFirstNegative(int* begin, int* end) {   // pointer: "maybe nothing found"
    for (int* it = begin; it != end; ++it) {
        if (*it < 0) {
            return it;
        }
    }
    return nullptr;
}

int main() {
    int x = 1;
    incrementByPointer(&x);
    incrementByPointer(nullptr);  // safely ignored
    incrementByReference(x);
    std::printf("x = %d\n", x);   // 3

    int data[] = {4, 2, -7, 5};
    if (int* neg = findFirstNegative(data, data + 4)) {
        std::printf("first negative: %d at index %td\n", *neg, neg - data);
    }
    return 0;
}
```

**Guideline (C++ Core Guidelines F.60):** prefer `T*` over `T&` when "no argument" is a valid option; otherwise prefer references. For read-only large objects, pass `const T&`.

---

## 9. Function pointers

A function's name decays to a pointer to it — used for callbacks, dispatch tables, and C APIs like `qsort`.

```cpp
#include <cstdio>
#include <cstdlib>

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }
int mul(int a, int b) { return a * b; }

using BinaryOp = int (*)(int, int);          // a readable alias for the pointer type

int apply(BinaryOp op, int a, int b) {
    return op(a, b);                         // call through the pointer
}

int compareInts(const void* a, const void* b) {   // the C qsort callback signature
    int x = *static_cast<const int*>(a);
    int y = *static_cast<const int*>(b);
    return (x > y) - (x < y);                // -1, 0, 1 without overflow
}

int main() {
    BinaryOp table[] = {add, sub, mul};      // a dispatch table
    const char* names[] = {"add", "sub", "mul"};
    for (int i = 0; i < 3; i++) {
        std::printf("%s(7, 3) = %d\n", names[i], apply(table[i], 7, 3));
    }

    int (*explicitSyntax)(int, int) = &add;  // & and * are optional for functions
    std::printf("(*explicitSyntax)(2, 2) = %d\n", (*explicitSyntax)(2, 2));

    int values[] = {5, -2, 9, 0};
    std::qsort(values, 4, sizeof(int), compareInts);
    std::printf("sorted: %d %d %d %d\n", values[0], values[1], values[2], values[3]);
    return 0;
}
```

In C++ you'll usually prefer templates, lambdas or `std::function` for callbacks (see *Lambdas*), but **captureless lambdas convert to function pointers**, so they still work with C APIs.

### Pointers to members

A pointer to a data member or member function is an **offset/selector**, not an address — you need an object to use it, with `.*` or `->*`.

```cpp
#include <cstdio>

struct Point {
    int x;
    int y;
    int sum() const { return x + y; }
};

int main() {
    int Point::*field = &Point::y;            // which field
    int (Point::*method)() const = &Point::sum;

    Point p{3, 4};
    Point* pp = &p;
    std::printf("p.*field = %d, pp->*field = %d\n", p.*field, pp->*field);
    std::printf("(p.*method)() = %d\n", (p.*method)());
    field = &Point::x;                         // pick a different field at run time
    std::printf("now p.*field = %d\n", p.*field);
    return 0;
}
```

They're used in generic code (e.g. "sort by this field"); `std::invoke` and C++20 ranges projections accept them directly.

---

## 10. `void*` — the untyped pointer

`void*` can hold the address of any object, but can't be dereferenced or used in arithmetic until you cast it back to the right type. It's how C writes generic code (`malloc`, `memcpy`, `qsort`, thread arguments).

```cpp
#include <cstdio>
#include <cstring>

void printAs(const void* data, char type) {
    if (type == 'i') {
        std::printf("int: %d\n", *static_cast<const int*>(data));
    } else if (type == 'd') {
        std::printf("double: %.2f\n", *static_cast<const double*>(data));
    }
}

int main() {
    int i = 5;
    double d = 2.5;
    printAs(&i, 'i');
    printAs(&d, 'd');

    unsigned char copy[sizeof(double)];
    std::memcpy(copy, &d, sizeof d);        // memcpy takes void*: works for any type
    double back;
    std::memcpy(&back, copy, sizeof back);
    std::printf("round trip: %.2f\n", back);
    return 0;
}
```

> **Pitfall:** in C, `void*` converts implicitly to any object pointer (`int* p = malloc(...)`). In C++ it doesn't — you need `static_cast`. Casting a `void*` back to the **wrong** type is UB that no compiler can catch. In C++ prefer templates, `std::variant`, or `std::any`.

---

## 11. Aliasing, strict aliasing and `restrict`

Two pointers **alias** if they may point to the same memory. Aliasing forces the compiler to reload values:

```cpp
// no-test (illustration)
void addTwice(int* a, const int* b) {
    *a += *b;
    *a += *b;     // must reload *b: what if a == b? Then *b just changed.
}
```

**Strict aliasing rule:** you may only access an object through an lvalue of its own type (or a signed/unsigned variant, a `const` version, or `char`/`unsigned char`/`std::byte`). The compiler assumes an `int*` and a `float*` never point to the same object — so type-punning through casts is UB and can produce wrong results at `-O2`.

```cpp
#include <bit>
#include <cstdint>
#include <cstdio>
#include <cstring>

int main() {
    float f = 1.0f;

    // WRONG (UB): std::uint32_t bits = *reinterpret_cast<std::uint32_t*>(&f);

    std::uint32_t viaMemcpy;
    std::memcpy(&viaMemcpy, &f, sizeof f);             // OK everywhere, optimised to one move
    std::uint32_t viaBitCast = std::bit_cast<std::uint32_t>(f);   // C++20, constexpr-friendly
    std::printf("1.0f bits = 0x%08x and 0x%08x\n", viaMemcpy, viaBitCast);   // 0x3f800000
    return 0;
}
```

**`restrict`** (C99; `__restrict` as a compiler extension in C++) is your *promise* that, within its scope, memory accessed through this pointer isn't accessed through any other pointer. It lets the compiler vectorise loops and keep values in registers — and breaking the promise is UB. `memcpy` uses it; that's why overlapping `memcpy` is UB and you need `memmove`.

---

## 12. Pointers, `const` and member functions

Inside a member function, `this` is a pointer to the object. In a `const` member function, `this` is a pointer to **const**, which is why you can't modify members there — unless they're `mutable`.

```cpp
#include <cstdio>

class Counter {
public:
    int value() const {
        reads++;                     // allowed: reads is mutable (e.g. statistics, caches, mutexes)
        return count;                // `this` is `const Counter*` here
    }
    void increment() {
        this->count++;               // `this` is `Counter*` here; "this->" is optional
    }
    int readCount() const { return reads; }

private:
    int count = 0;
    mutable int reads = 0;
};

int main() {
    Counter c;
    c.increment();
    c.increment();
    const Counter& view = c;         // read-only view
    std::printf("value %d, read %d time(s)\n", view.value(), view.readCount());
    return 0;
}
```

---

## 13. Ownership vocabulary (the bridge to smart pointers)

When you see a raw pointer in modern code, ask: **who deletes it?**

| Situation | Use |
|---|---|
| I own it, alone | `std::unique_ptr<T>` |
| Ownership is shared | `std::shared_ptr<T>` (+ `std::weak_ptr` to observe/break cycles) |
| I just look at it, it may be absent | `T*` (non-owning) |
| I just look at it, it's always there | `T&` |
| A sequence of elements | `std::span<T>` / iterators |
| Talking to a C API | raw pointer + RAII wrapper (`unique_ptr` with a custom deleter) |

The C++ Core Guidelines summarise it: **a raw pointer `T*` is non-owning.** If it owns, make that visible in the type.

---

## 14. Interview checklist

- [ ] Draw memory: boxes, addresses, arrows — before answering any pointer question.
- [ ] `const` placement: what can change, the pointer or the pointee?
- [ ] Arithmetic is in elements; `p[i] == *(p + i)`; one-past-the-end is legal but not dereferenceable.
- [ ] Arrays decay; `sizeof` in a function gives the pointer size; use `std::span`.
- [ ] `new`/`delete`, `new[]`/`delete[]`, `malloc`/`free` — never mix.
- [ ] Dangling sources: returning locals, use-after-free, reallocation.
- [ ] Strict aliasing: `memcpy`/`std::bit_cast`, never `reinterpret_cast` to pun.
- [ ] Raw pointers don't own; ownership belongs in smart pointers or containers.

---

## Practice

1. Write `void reverse(int* begin, int* end)` that reverses an array in place using only pointers (no indices).
2. Write `char* myStrcpy(char* dst, const char* src)` and `int myStrcmp(const char*, const char*)`. Then explain why `strcpy` is dangerous and what to use instead.
3. Allocate a `rows × cols` matrix as **one** block and write an `at(r, c)` helper. Then write the version with an array of row pointers that still uses only **two** allocations.
4. Write a function that returns pointers to the minimum and maximum elements of an array (via two `int**` out-parameters). How would you write it in modern C++?
5. Explain what this prints and why: `int a[3] = {1, 2, 3}; int* p = a; std::printf("%d\n", *p++ + ++*p);`

:::details Show solution
1.
```cpp
#include <cassert>
#include <utility>

void reverse(int* begin, int* end) {
    while (begin < end) {
        --end;                         // end is one past the last element
        if (begin == end) {
            break;
        }
        std::swap(*begin, *end);
        ++begin;
    }
}

int main() {
    int a[] = {1, 2, 3, 4, 5};
    reverse(a, a + 5);
    assert(a[0] == 5 && a[2] == 3 && a[4] == 1);
    int b[] = {1, 2};
    reverse(b, b + 2);
    assert(b[0] == 2 && b[1] == 1);
    return 0;
}
```
2.
```cpp
#include <cassert>
#include <cstring>

char* myStrcpy(char* dst, const char* src) {
    char* out = dst;
    while ((*dst = *src) != '\0') {     // copy, including the terminator
        dst++;
        src++;
    }
    return out;
}

int myStrcmp(const char* a, const char* b) {
    while (*a != '\0' && *a == *b) {
        a++;
        b++;
    }
    return static_cast<unsigned char>(*a) - static_cast<unsigned char>(*b);
}

int main() {
    char buf[16];
    myStrcpy(buf, "pointer");
    assert(std::strcmp(buf, "pointer") == 0);
    assert(myStrcmp("abc", "abd") < 0 && myStrcmp("b", "a") > 0 && myStrcmp("x", "x") == 0);
    return 0;
}
```
`strcpy` doesn't know the destination's size, so a long source overflows the buffer (a classic security hole). Use `std::string`, or `snprintf`/`strlcpy`-style bounded copies in C.
3. One block: `int* m = new int[rows * cols]; at(r, c) = m[r * cols + c]`. Two allocations: `int** rowsPtr = new int*[rows]; int* data = new int[rows * cols]; for r: rowsPtr[r] = data + r * cols;` — then `rowsPtr[r][c]` works, the data stays contiguous, and cleanup is `delete[] data; delete[] rowsPtr;`.
4. `void minMax(const int* a, int n, const int** mn, const int** mx)` setting `*mn`/`*mx`. Modern C++: `auto [mn, mx] = std::minmax_element(v.begin(), v.end());` returning iterators.
5. It's **undefined behaviour** in every version of C and C++: the left operand modifies `p` (`p++`) while the right operand reads `p` (`*p`) and modifies `a[?]`, and the two operands of `+` are unsequenced (C++17's new sequencing rules cover `<<`, `=`, `[]` and others, but not `+`). The right interview answer is "it's a bug; split it into separate statements".
:::

---

## Interview Q&A

- **What's the difference between `const int*` and `int* const`?** `const int*` is a pointer to a const int: you can't modify the pointee but can reseat the pointer. `int* const` is a const pointer: you can modify the pointee but can't reseat it.
- **Why does `sizeof(arr)` inside a function give the wrong array size?** An array parameter decays to a pointer, so `sizeof` returns the pointer size (e.g. 8), not the array size. Pass the size separately, use `std::span`, or take the array by reference.
- **What is one-past-the-end and why is it allowed?** A pointer to the position just after the last element. You may form and compare it (it's the end of loops and iterator ranges) but never dereference it.
- **What is a dangling pointer? Give two ways to create one.** A pointer to an object whose lifetime has ended: returning the address of a local variable, or keeping a pointer into a `std::vector` that later reallocates (or after `delete`).
- **Why should C++ code use `nullptr` instead of `NULL`?** `NULL` is an integer constant (0 or `0L`), so `f(NULL)` can pick an integer overload. `nullptr` has its own type `std::nullptr_t` and only converts to pointer types.
- **Pointer vs reference: when do you choose a pointer?** Use a pointer when the value may be absent (null), needs reseating, or for arrays/C APIs. Use a reference when the object must exist and the alias never changes.
- **What does the strict aliasing rule say?** You may only access an object through its own type (or a signed/unsigned variant, or `char`/`unsigned char`/`std::byte`). Reading a `float` through an `int*` is undefined behaviour — use `memcpy` or `std::bit_cast`.
- **Why must `new[]` be paired with `delete[]`?** `new[]` may store the element count so `delete[]` can run every destructor; plain `delete` on it is undefined behaviour.
- **What's the difference between `int* a[10]` and `int (*a)[10]`?** The first is an array of 10 pointers to int; the second is a single pointer to an array of 10 ints (its `+1` moves 40 bytes).
- **Why can't `int**` convert to `const int**`?** It would let you store the address of a const object into an `int*` and then modify it; `const int* const*` is allowed because the extra const closes that hole.
- **What does `restrict` promise?** That the memory reached through this pointer isn't accessed through any other pointer in that scope, letting the compiler optimise; violating it is undefined behaviour (it's why `memcpy` requires non-overlapping buffers).
- **What does `this` point to in a const member function?** It's a pointer to const (`const T*`), so members can't be modified except those declared `mutable`.

---

## External resources

- **cppreference — Pointer declaration** (en.cppreference.com/w/cpp/language/pointer) and **Array-to-pointer conversion**.
- **C++ Core Guidelines** — sections F.22–F.27 (pointer parameters), R.3 ("a raw pointer is non-owning"), ES.42 ("keep use of pointers simple").
- ***Expert C Programming: Deep C Secrets*** (Peter van der Linden) — chapters on declarations and arrays vs pointers.
- **"Understanding Strict Aliasing"** — Mike Acton; and Shafik Yaghmour's "What is the Strict Aliasing Rule and Why do we care?" (GitHub gist).
- **Godbolt Compiler Explorer** (godbolt.org) — look at the assembly for pointer arithmetic and `restrict` to see what the compiler does.
