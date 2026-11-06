# C/C++ Interview Q&A

> **Key idea:** This is the rapid-fire page for the night before an interview: about 125 questions, each with a short, precise answer you could say out loud in under a minute. Each section links back to the full guide for the topic. A good spoken answer has three parts: **definition → why it matters → an example or pitfall**. Cover the answer, say yours aloud, then compare. The Mock Interview tab draws its questions from this page.

**How to use this page**
- Read one section at a time and answer aloud before you look at the answer.
- Mark the questions you couldn't answer crisply, and revisit the full guide for each one.
- For "what does this print?" questions, the runnable programs at the end verify every claim.

---

## Memory & pointers

*Full guides: Raw Pointers, Smart Pointers, RAII & Memory.*

**1. Pointer vs reference?** A pointer is an object holding an address: nullable, reseatable, supports arithmetic. A reference is an alias: must be bound at initialisation, can't be null or reseated.

**2. Stack vs heap?** Stack: automatic, fast, scope-bound, limited size. Heap: dynamic, slower allocation, manual or RAII-managed lifetime, fragmentation possible.

**3. What is a memory leak? How do you find one?** Allocated memory never freed and no longer reachable. LeakSanitizer/ASan, Valgrind, heap profilers; prevent with RAII/smart pointers.

**4. What is a dangling pointer?** A pointer to memory whose lifetime ended (freed, out of scope, reallocated vector).

**5. `delete` vs `delete[]`?** `delete[]` destroys every element of an array allocated with `new[]`. Mixing them is UB.

**6. `malloc` vs `new`?** `new` calls constructors, is type-safe, throws on failure, and pairs with `delete`; `malloc` returns raw `void*` memory, returns `NULL`, pairs with `free`.

**7. What is RAII?** Binding a resource's lifetime to an object: acquire in the constructor, release in the destructor.

**8. `unique_ptr` vs `shared_ptr` vs `weak_ptr`?** Exclusive ownership (zero overhead) / shared ref-counted ownership / non-owning observer of a `shared_ptr` that can break cycles.

**9. What is a memory alignment and why does padding exist?** CPUs access naturally-aligned data efficiently (or only); compilers pad structs so each member meets `alignof`.

**10. What does `sizeof` an empty class return?** 1 (objects need distinct addresses).

**11. Why prefer `make_shared` over `shared_ptr<T>(new T)`?** One allocation for the object and its control block instead of two (faster, better locality), and no leak if another argument's evaluation throws; the downside is that the memory is only freed when the last `weak_ptr` is gone too.

**12. What's inside a `shared_ptr`?** Two pointers: one to the object and one to a control block holding the strong count, the weak count, the deleter and the allocator; the counts are updated atomically, so copies cost an atomic increment.

**13. How do you create a reference cycle with `shared_ptr`, and how do you break it?** Two objects that hold `shared_ptr`s to each other never reach count zero and leak; make one direction (usually child→parent or observer) a `weak_ptr` and `lock()` it when needed.

**14. What is `enable_shared_from_this` for?** Letting an object that's already owned by a `shared_ptr` safely create another `shared_ptr` to itself; `shared_ptr<T>(this)` would create a second control block and double-delete.

**15. What's the difference between `nullptr`, `NULL` and `0`?** `nullptr` has its own type (`std::nullptr_t`) that converts only to pointer types; `NULL` is an implementation macro for `0` or `0L`, so `f(NULL)` can call `f(int)` instead of `f(char*)`.

**16. What is placement new?** `new (address) T(args)` constructs an object in memory you already own, without allocating; you must call the destructor explicitly (`p->~T()`) — used by `std::vector`, `std::optional` and memory pools.

**17. What is a custom deleter?** A callable a smart pointer uses instead of `delete`, e.g. `unique_ptr<FILE, decltype(&fclose)>`; for `unique_ptr` it's part of the type, for `shared_ptr` it's stored in the control block.

## Classes & OOP

*Full guide: OOP & Classes.*

**18. What special member functions can the compiler generate?** Default ctor, destructor, copy ctor, copy assignment, move ctor, move assignment.

**19. Rule of 0/3/5?** Prefer no custom special members (0). If you define a destructor/copy op you probably need all three (3) — plus the two moves (5).

**20. Why a virtual destructor?** Deleting a derived object through a base pointer is UB without it.

**21. How are virtual functions implemented?** A per-class vtable of function pointers and a per-object vptr; calls go through an indirect jump.

**22. What is object slicing?** Copying a derived object into a base object by value, losing the derived part.

**23. Overloading vs overriding?** Overloading: same name, different parameters, resolved at compile time. Overriding: derived class re-implements a virtual function with the same signature, resolved at runtime.

**24. What is an abstract class?** A class with at least one pure virtual function (`= 0`); can't be instantiated.

**25. Can a constructor be virtual? A destructor?** No / yes (and should be in polymorphic bases).

**26. What is the diamond problem?** Multiple inheritance from two classes sharing a base creates two base subobjects; `virtual` inheritance shares one.

**27. What does `explicit` do?** Prevents a constructor/conversion operator from being used for implicit conversions.

**28. What does `final` do?** Prevents further overriding of a virtual function or derivation from a class.

**29. Struct vs class?** Only the default access (public vs private) — and default inheritance access.

**30. What is `this`?** A pointer to the object a member function was called on.

**31. What is the initialisation order of members?** Declaration order in the class, regardless of initialiser-list order.

**32. Why does calling a virtual function in a constructor not dispatch to the derived class?** While the base constructor runs, the derived part doesn't exist yet and the vptr points at the base's vtable, so the base version is called (a pure virtual call there is UB).

**33. When are the move constructor and move assignment generated implicitly?** Only if the class declares no copy operations, no move operations and no destructor; declaring a destructor silently turns moves into copies.

**34. What is the copy-and-swap idiom?** Implement assignment by taking the argument by value (copy or move) and swapping it with `*this`; it gives the strong exception guarantee and handles self-assignment for free.

**35. What does `= delete` do, and where is it useful?** Removes a function from overload resolution with a compile error if called — for non-copyable types, or to block unwanted conversions like `void f(double) = delete;`.

**36. What is a `friend`?** A function or class granted access to private members; common for symmetric operators (`operator<<`, `operator==`) — it isn't inherited or transitive.

**37. What's the size of a class with one virtual function and an `int`?** Typically 16 bytes on 64-bit: an 8-byte vptr, the 4-byte int, and 4 bytes of padding.

**38. What is CRTP?** The Curiously Recurring Template Pattern, `class D : public Base<D>`: the base calls derived functions through `static_cast<D*>(this)`, giving static polymorphism with no vtable.

**39. What is PImpl and why use it?** "Pointer to implementation": the class holds only a `unique_ptr` to a private impl struct, so private members can change without recompiling clients — faster builds and a stable ABI, at the cost of an indirection and an allocation.

**40. What's the difference between `static` and non-static member functions?** Static members have no `this`, can't access instance members directly, and can be called as `Class::f()` — they also convert to plain function pointers (useful as C callbacks).

**41. What is a conversion operator?** A member like `explicit operator bool() const` that converts the object to another type; mark it `explicit` to avoid surprising implicit conversions.

## Templates & generic programming

*Full guide: Templates & Concepts.*

**42. Why must template definitions usually be in headers?** Templates are instantiated where they're used, so the compiler needs the full definition in every translation unit that uses them (or explicit instantiation in one `.cpp`).

**43. What is template specialisation?** Providing a separate implementation for specific template arguments — full specialisation (`template<> struct Hash<int>`) or partial specialisation for class templates (`template<class T> struct Hash<T*>`).

**44. What is SFINAE?** "Substitution failure is not an error": if substituting template arguments into a declaration fails, that overload is quietly removed instead of causing an error — the pre-C++20 basis of `enable_if`.

**45. Concepts vs SFINAE?** Concepts state constraints directly (`template <std::integral T>`), give readable errors at the call site and allow overloading by constraint; SFINAE achieves the same through obscure `enable_if` tricks.

**46. What is a variadic template?** A template taking any number of arguments (`template <class... Ts>`), expanded with pack expansion or fold expressions (`(args + ...)`).

**47. What is a forwarding (universal) reference?** `T&&` where `T` is deduced (or `auto&&`): it binds to both lvalues and rvalues, and `std::forward<T>` preserves which one it was.

**48. What does `typename` mean in `typename T::value_type`?** It tells the compiler that a dependent name is a type; without it, `T::value_type` is assumed to be a value.

**49. What are the costs of templates?** Longer compile times, code bloat from many instantiations, and (pre-concepts) terrible error messages; there's no run-time cost.

**50. What is `if constexpr`?** A compile-time `if` in templates: the discarded branch isn't instantiated, so it can contain code that's only valid for some types.

## Modern C++

*Full guides: Move Semantics, Lambdas, Const & constexpr, Modern C++.*

**51. What does `std::move` do?** Casts to an rvalue reference; it moves nothing itself.

**52. What is perfect forwarding?** Passing arguments through a template while preserving lvalue/rvalue-ness via forwarding references and `std::forward`.

**53. What is `auto` deduction?** Template-argument deduction rules: drops top-level const/references unless you write `auto&`/`const auto&`/`auto&&`.

**54. `constexpr` vs `const`?** Compile-time constant (or compile-time-capable function) vs read-only.

**55. What is a lambda under the hood?** An unnamed class with `operator()` whose captures are members.

**56. What are concepts?** Named compile-time constraints on template parameters (C++20).

**57. What's `std::optional` for?** A value that may be absent, without sentinel values or heap allocation.

**58. `std::variant` vs inheritance?** Closed set of types, value semantics, no heap, `std::visit` dispatch vs open set, reference semantics, virtual dispatch.

**59. What is `string_view`?** A non-owning (pointer, length) view of characters — cheap to pass, must not outlive the data.

**60. What is `std::span`?** Non-owning view over contiguous elements (C++20) — replaces pointer + length.

**61. What is RVO/NRVO?** Return value optimisation: constructing the returned object directly in the caller's storage. Guaranteed for prvalues since C++17.

**62. What is `noexcept` and why does it matter for move constructors?** A promise not to throw; `std::vector` moves elements on reallocation only if the move constructor is `noexcept`.

**63. What's new in C++20?** Concepts, ranges, coroutines, modules, `<=>`, `span`, `format`, `jthread`, designated initialisers, `consteval`/`constinit`.

**64. What's the difference between lvalues, prvalues and xvalues?** An lvalue has identity and can't be moved from implicitly (a named variable); a prvalue is a pure temporary value (`42`, `f()` returning by value); an xvalue is an expiring object with identity (`std::move(x)`) — prvalues and xvalues are rvalues.

**65. Should you `return std::move(local);`?** No — it disables NRVO and forces a move; returning the local by name is already treated as an rvalue if the copy isn't elided.

**66. What is a moved-from object's state?** Valid but unspecified for standard types: you may destroy it or assign to it, but you shouldn't rely on its value (except where specified, e.g. a moved-from `unique_ptr` is null).

**67. What's the danger of capturing by reference in a lambda?** If the lambda outlives the captured variables (stored callbacks, threads, returned lambdas), the references dangle; capture by value or move-capture `[p = std::move(p)]` instead.

**68. What does `[=]` capture in a member function?** Before C++20 it implicitly captured `this` (a pointer), so members are accessed by reference and can dangle; write `[*this]` to copy the object or `[this]` explicitly.

**69. `std::function` vs a template parameter for callables?** `std::function` type-erases any callable (one type, can be stored) at the cost of an indirect call and possible heap allocation; a template parameter is inlined and zero-cost but makes the function a template.

**70. What is structured binding?** `auto [key, value] = pair;` unpacks pairs, tuples, arrays and simple structs into named variables (C++17).

**71. What is `std::expected`?** A C++23 type holding either a value `T` or an error `E` — explicit error handling without exceptions, with monadic `and_then`/`transform`.

**72. `consteval` vs `constexpr` vs `constinit`?** A `consteval` function must run at compile time; a `constexpr` function may; a `constinit` variable must be initialised at compile time but remains mutable.

## STL

*Full guides: STL Containers, Algorithms & Ranges.*

**73. `vector` vs `list`?** Contiguous & cache-friendly vs node-based with stable iterators and O(1) splice. `vector` wins almost always.

**74. `map` vs `unordered_map`?** Red-black tree O(log n) ordered vs hash table average O(1) unordered.

**75. When are vector iterators invalidated?** On reallocation (all), or insert/erase (at and after the position).

**76. What does `reserve` do?** Allocates capacity without changing size.

**77. `emplace_back` vs `push_back`?** Construct in place from arguments vs copy/move an existing object.

**78. How does `std::sort` work?** Introsort: quicksort, switching to heapsort on deep recursion and insertion sort for small ranges. O(n log n) worst case.

**79. Why is `push_back` amortised O(1)?** Capacity grows geometrically (×2 in libstdc++/libc++, ×1.5 in MSVC), so total copying over n pushes is O(n).

**80. What does `map::operator[]` do if the key is missing?** Inserts a value-initialised element and returns a reference to it — so it can't be used on a `const map`; use `find`, `contains` or `at` to look up without inserting.

**81. What does `std::remove` do?** Shifts the kept elements forward and returns the new logical end; the container's size is unchanged until you call `erase` (or use C++20 `std::erase`/`erase_if`).

**82. What is a strict weak ordering and why does `std::sort` need one?** A comparator where `comp(a, a)` is false and comparisons are transitive (including equivalence); violating it (e.g. using `<=`) is UB and can crash `std::sort`.

**83. What are `lower_bound` and `upper_bound`?** On a sorted range, the first element `>= x` and the first element `> x`; their difference is the number of elements equal to `x`.

**84. How would you implement an LRU cache?** A `std::list` of (key, value) in recency order plus an `unordered_map` from key to list iterator: `get` splices the node to the front, `put` evicts from the back — both O(1).

**85. What is the small string optimisation?** Short strings (≤15 chars in libstdc++/MSVC, 22 in libc++) are stored inside the `std::string` object itself, avoiding heap allocation.

**86. Why is `std::vector<bool>` special?** It's a bit-packed specialisation whose `operator[]` returns a proxy, not `bool&` — you can't take element addresses and concurrent writes to different elements race.

## Error handling

*Full guide: Exceptions & Error Handling.*

**87. What are the exception-safety guarantees?** No-throw (never fails), strong (on failure, state is unchanged — commit-or-rollback), basic (on failure, no leaks and invariants hold), none.

**88. Why shouldn't destructors throw?** Destructors run during stack unwinding; a second exception while one is in flight calls `std::terminate` — and since C++11 destructors are `noexcept` by default.

**89. Exceptions vs error codes?** Exceptions separate error handling from the normal path, can't be ignored and propagate automatically, but cost code size and unpredictable time when thrown; error codes (or `expected`) are explicit and deterministic — preferred in embedded and hot paths.

**90. How do you report an error from a constructor?** Throw an exception — or, with exceptions disabled, use a factory function returning `std::optional`/`std::expected` and keep the constructor private.

**91. What happens if an exception isn't caught?** `std::terminate` is called (by default `abort`), and whether the stack is unwound first is implementation-defined.

**92. What does catching by value instead of by reference do?** It copies the exception and slices derived exception types; always `catch (const std::exception& e)`.

## Concurrency

*Full guide: Concurrency.*

**93. What is a race condition / data race?** Timing-dependent behaviour / unsynchronised concurrent access with a write — UB in C++.

**94. Mutex vs semaphore?** Ownership-based mutual exclusion vs a counter of available resources/signals.

**95. What is a deadlock and how do you prevent it?** Circular waiting on locks; consistent lock ordering, `std::scoped_lock`, timeouts.

**96. Does `volatile` make code thread-safe?** No. Use `std::atomic` or locks.

**97. What is a condition variable and why the predicate?** A wait/notify mechanism; the predicate guards against spurious wakeups and lost notifications.

**98. What is false sharing?** Different threads writing different data on the same cache line, causing coherence traffic.

**99. What does `memory_order_acquire`/`release` guarantee?** If an acquire load reads the value written by a release store, all writes before the release are visible after the acquire — the standard way to publish data.

**100. What happens when a joinable `std::thread` is destroyed?** `std::terminate` is called; join or detach it first, or use `std::jthread`, which requests stop and joins automatically.

**101. What is a lock-free data structure?** One where some thread always makes progress even if others are suspended, typically built on atomic compare-and-swap loops; it avoids blocking but is hard to get right (ABA problem, memory reclamation).

**102. What is priority inversion?** A high-priority task waits for a lock held by a low-priority task, which is preempted by a medium-priority task; fixed with priority-inheritance mutexes.

**103. How are function-local statics initialised with threads?** Thread-safely, exactly once ("magic statics", C++11) — the basis of the Meyers singleton.

## Compilation, linking & build

*Full guides: Compilation & Linking, Make, CMake.*

**104. Steps of compilation?** Preprocessing, compilation, assembly, linking.

**105. Meanings of `static`?** Internal linkage (file scope), persistent local (block scope), class-level member (C++).

**106. What does `extern` do?** Declares a variable/function defined in another translation unit.

**107. `#define` vs `const` vs `constexpr`?** Textual substitution (no type/scope) vs typed read-only vs typed compile-time constant.

**108. What is name mangling?** Encoding types into symbol names to support overloading; disabled with `extern "C"`.

**109. Static vs dynamic linking?** Code copied into the executable at build time vs loaded from a shared library at runtime.

**110. What is the ODR?** One Definition Rule: exactly one definition of each non-inline function/variable per program.

**111. What is a header guard?** `#pragma once` or `#ifndef` macros preventing multiple inclusion in a TU.

**112. "undefined reference" vs "multiple definition"?** Undefined reference: something was declared and used but no linked object defines it (missing `.cpp`/library, signature mismatch, missing `extern "C"`); multiple definition: a non-inline definition in a header included by several TUs.

**113. What does `inline` mean today?** Mainly "may be defined in several translation units" (an ODR exemption); whether a call is actually inlined is the optimiser's choice.

**114. What's the static initialisation order fiasco?** Globals in different TUs are initialised in an unspecified order, so one global's constructor may use another that isn't constructed yet; fix with function-local statics or `constinit`.

**115. Why does the order of `-l` libraries matter?** GNU ld resolves symbols left to right and only extracts archive members that satisfy currently-undefined symbols, so libraries must follow the objects that use them.

**116. What is CMake's PRIVATE/PUBLIC/INTERFACE?** Whether a usage requirement (include dirs, definitions, links) applies only to building the target, to the target and its consumers, or only to consumers.

## C & embedded

*Full guides: C Essentials, C vs C++, Undefined Behavior.*

**117. What does `volatile` mean?** Accesses can't be optimised away or reordered with respect to other volatile accesses — for MMIO and ISR-shared variables.

**118. What is undefined behaviour? Examples?** No requirements on behaviour: signed overflow, null dereference, OOB access, use-after-free, data races.

**119. How do you swap two integers without a temporary?** `a ^= b; b ^= a; a ^= b;` (fails if `a` and `b` alias the same object — and `std::swap` is clearer and as fast).

**120. `const int *p` vs `int *const p`?** Pointer to const data (can repoint, can't write through it) vs const pointer (can write the data, can't repoint).

**121. Why is `sizeof(arr)` different inside a function?** Array parameters are adjusted to pointers, so `sizeof` gives the pointer size; pass the length (or use `std::span`).

**122. How do you set, clear, toggle and test bit n?** `x |= 1u << n;` `x &= ~(1u << n);` `x ^= 1u << n;` `(x >> n) & 1u` — always on unsigned types.

**123. How do you check if a number is a power of two?** `x != 0 && (x & (x - 1)) == 0`.

**124. How do you detect endianness?** Store `1` in a `uint16_t` and inspect its first byte through `unsigned char*` (or `std::endian::native` in C++20).

**125. Why avoid dynamic allocation in embedded firmware?** Fragmentation, non-deterministic timing and allocation failure at run time; allocate statically or from fixed pools at start-up.

**126. Can you call `printf` or `malloc` in an ISR?** No — they may block, take locks, or not be reentrant; set a flag or push to a lock-free queue and do the work in a task.

**127. What's the difference between `#include <x>` and `#include "x"`?** Angle brackets search the system/`-I` include paths; quotes search the including file's directory first, then the same paths.

## Tricky outputs

*Full guide: Undefined Behavior.*

These are the classic "what does this print?" snippets. Every well-defined case is verified by the program below. The UB cases are only listed, because UB has no single right output.

```cpp
// no-test (the UB cases: there is no correct output)
int i = 5;
std::cout << i++ + ++i;            // UB: unsequenced modifications of i (still UB in C++17)
int x = INT_MAX; x + 1;            // UB: signed overflow
int a[3]; a[3] = 0;                // UB: out of bounds
```

```cpp
#include <cassert>
#include <climits>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <map>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

struct A {
    virtual ~A() = default;
    virtual std::string f() const { return "A"; }
    std::string g() const { return "A"; }          // non-virtual
};

struct B : A {
    std::string f() const override { return "B"; }
    std::string g() const { return "B"; }          // hides A::g, doesn't override it
};

struct Base {
    Base() { who = name(); }                        // virtual call in a constructor
    virtual ~Base() = default;
    virtual std::string name() const { return "Base"; }
    std::string who;
};

struct Derived : Base {
    std::string name() const override { return "Derived"; }
};

int main() {
    int arr[5] = {1, 2, 3};                          // the rest are zero-initialised
    assert(arr[3] == 0 && arr[4] == 0);

    std::vector<int> v(3, 7);                        // three 7s
    std::vector<int> w{3, 7};                        // initializer_list wins: {3, 7}
    assert(v.size() == 3 && w.size() == 2 && w[0] == 3);

    unsigned u = 0;
    u--;                                             // wraps: defined
    assert(u == UINT_MAX);

    std::unique_ptr<A> p = std::make_unique<B>();
    assert(p->f() == "B");                           // virtual: dynamic type
    assert(p->g() == "A");                           // non-virtual: static type
    B b;
    A sliced = b;                                    // slicing: copies only the A part
    assert(sliced.f() == "A");

    Derived d;
    assert(d.who == "Base");                         // no virtual dispatch to Derived during Base()

    char s[] = "hello";
    assert(sizeof(s) == 6 && std::strlen(s) == 5);

    assert((-1 < 0u) == false);                      // -1 converts to UINT_MAX (-Wsign-compare warns: the point)
    assert(sizeof('a') == 1);                        // char in C++ (int in C)
    assert(7 / 2 == 3 && -7 / 2 == -3 && -7 % 2 == -1);   // integer division truncates toward zero

    std::map<std::string, int> m;
    if (m["missing"] == 0) {}                        // operator[] inserts
    assert(m.size() == 1);

    int x = 10;
    auto byValue = [x] { return x; };
    auto byRef = [&x] { return x; };
    x = 20;
    assert(byValue() == 10 && byRef() == 20);        // captured at creation vs at call

    std::ostringstream out;
    out << (true ? 1 : 0) << ' ' << std::boolalpha << true << ' ' << (0.1 + 0.2 == 0.3);
    assert(out.str() == "1 true false");             // floating-point rounding

    const char* lit = "abc";
    std::string str = "abc";
    assert(str == lit && std::string_view("abc").size() == 3);

    std::printf("all tricky-output claims verified\n");
    return 0;
}
```

## Interview checklist

- [ ] Memory: pointers vs references, stack vs heap, RAII, the smart pointer trio and their internals.
- [ ] Classes: special members, rule of 0/3/5, virtual dispatch and vtables, slicing, virtual destructors.
- [ ] Templates: why they live in headers, specialisation, SFINAE vs concepts, forwarding references.
- [ ] Modern C++: move semantics, value categories, lambdas and their captures, `optional`/`variant`/`expected`.
- [ ] STL: complexities, iterator invalidation, `map::operator[]`, erase-remove, strict weak ordering.
- [ ] Errors: exception-safety guarantees, `noexcept`, destructors never throw.
- [ ] Concurrency: data race vs race condition, mutex vs semaphore, deadlock, condition-variable predicates, atomics and memory order.
- [ ] Build: the four stages, ODR, `inline`, linkage, link order, static initialisation order.
- [ ] C/embedded: `volatile`, `const` pointers, bit manipulation, ISRs, no heap.

## External resources

- **isocpp.org — C++ Super-FAQ** (the official FAQ, by Bjarne Stroustrup and others).
- **C++ Core Guidelines** (isocpp.github.io/CppCoreGuidelines).
- **Scott Meyers — *Effective C++* and *Effective Modern C++***.
- **cppreference.com** for precise definitions.
- **The other Docs guides on this site**: each section above maps to one, with runnable examples and practice problems.
