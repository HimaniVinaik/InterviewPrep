# Undefined Behavior

**Undefined behaviour (UB)** means the standard places *no requirements* on what happens. The program may crash, appear to work, or behave differently at `-O2` vs `-O0`. Optimisers assume UB never happens and transform code accordingly — which is why UB bugs are so surprising.

| Term | Meaning | Example |
|---|---|---|
| Undefined | anything can happen | signed overflow, null dereference |
| Unspecified | one of several valid outcomes, undocumented | order of evaluating function arguments |
| Implementation-defined | documented choice per compiler/platform | `sizeof(long)`, signedness of `char`, right-shift of negative ints (pre-C++20) |

## 1. The UB catalogue (know these cold)

### Memory
```cpp
int* p = nullptr; *p = 1;                 // null dereference
int a[4]; a[4] = 0;                       // out-of-bounds write
int* q = new int; delete q; *q = 2;       // use-after-free
delete q;                                 // double delete
int* r = new int[3]; delete r;            // mismatched new[]/delete
int& dangling() { int x = 0; return x; }  // returning reference to a local
int x; int y = x + 1;                     // reading an uninitialised variable
```

### Arithmetic
```cpp
int big = INT_MAX; big + 1;               // signed overflow (unsigned wraps — defined)
1 << 32;                                  // shift >= width of int
1 << -1;                                  // negative shift
-1 << 1;                                  // UB before C++20 (now defined)
INT_MIN / -1;                             // overflow
x / 0;  x % 0;                            // division by zero
```

### Types & aliasing
```cpp
float f; int i = *(int*)&f;               // strict aliasing violation
struct S { int a; }; ((S*)malloc(sizeof(S)))->a = 1;   // pre-C++20: no object created (now implicit-lifetime OK)
const int c = 1; *const_cast<int*>(&c) = 2;            // modifying a const object
```

### Sequencing & misc
```cpp
i = i++ + 1;                              // unsequenced modification (UB in C; well-defined since C++17 for =)
f(i++, i++);                              // unspecified order (C++17: indeterminately sequenced, not UB)
int g() { }                               // falling off the end of a non-void function (except main)
while (true) {}                           // infinite loop without side effects (C++: UB, pre-C++26 trivial-loop rules)
std::vector<int> v; v[0];                 // out of range operator[] (use .at() for checked access)
```

### Concurrency
```cpp
int counter = 0;     // two threads doing ++counter without synchronisation: data race = UB
```

## 2. Why optimisers make UB scary

```cpp
bool will_overflow(int x) { return x + 1 < x; }   // compiler may fold to `return false;`
```
Because signed overflow "can't happen", `x + 1 < x` is always false.

```cpp
void process(int* p) {
    int v = *p;              // dereference: compiler now assumes p != nullptr
    if (!p) return;          // ...so this check can be deleted!
    use(v);
}
```

```cpp
for (int i = 0; i < 10; ++i) a[i] = i;   // with int a[8]: may turn into an infinite loop
```

## 3. Tools that catch UB

| Tool | Flag | Catches |
|---|---|---|
| UndefinedBehaviorSanitizer | `-fsanitize=undefined` | overflow, bad shifts, misaligned access, null, bounds (some) |
| AddressSanitizer | `-fsanitize=address` | OOB, use-after-free, double free, leaks |
| ThreadSanitizer | `-fsanitize=thread` | data races |
| MemorySanitizer (clang) | `-fsanitize=memory` | uninitialised reads |
| Warnings | `-Wall -Wextra -Wpedantic -Wshadow -Wconversion` | many at compile time |
| Static analysis | clang-tidy, cppcheck, PVS, Coverity | patterns |
| `constexpr` evaluation | `static_assert(f())` | UB inside constant evaluation is a **compile error** |
| Hardened STL | `-D_GLIBCXX_ASSERTIONS`, libc++ hardening | `operator[]` bounds |

```bash
g++ -std=c++20 -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer main.cpp && ./a.out
```

## 4. Writing UB-free code

- Initialise everything (`int x{};`, `T* p = nullptr;`).
- Use `.at()` or `std::span` with bounds checks in debug builds.
- Use unsigned types for bit manipulation; check signed arithmetic for overflow first (`__builtin_add_overflow`, C23 `ckd_add`).
- Use `memcpy`/`std::bit_cast` for type punning.
- Prefer RAII and smart pointers over manual `new`/`delete`.
- Protect shared data with mutexes or atomics.
- Run the test suite under sanitizers in CI.

## Interview Q&A

- **Is `i = i++` UB?** In C, yes. In C++17 and later, assignment is sequenced right-to-left so it's well-defined (but still terrible code).
- **Is unsigned overflow UB?** No — it wraps modulo 2ⁿ.
- **Why does my code work in debug but not release?** Classic sign of UB (or uninitialised memory / data races) exposed by optimisation.
- **What is the signedness of `char`?** Implementation-defined (signed on x86, unsigned on ARM Linux).
- **Name three UB sources in embedded code.** Unaligned access via casted pointers, missing `volatile` + data race with ISR (technically a race), stack overflow, shifting by too much.
