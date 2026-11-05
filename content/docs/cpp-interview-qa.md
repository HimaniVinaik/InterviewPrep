# C/C++ Interview Q&A

Short, precise answers to the questions that come up most. Cover the answer, say it out loud, then check.

## Memory & pointers

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

## Classes & OOP

**11. What special member functions can the compiler generate?** Default ctor, destructor, copy ctor, copy assignment, move ctor, move assignment.

**12. Rule of 0/3/5?** Prefer no custom special members (0). If you define a destructor/copy op you probably need all three (3) — plus the two moves (5).

**13. Why a virtual destructor?** Deleting a derived object through a base pointer is UB without it.

**14. How are virtual functions implemented?** A per-class vtable of function pointers and a per-object vptr; calls go through an indirect jump.

**15. What is object slicing?** Copying a derived object into a base object by value, losing the derived part.

**16. Overloading vs overriding?** Overloading: same name, different parameters, resolved at compile time. Overriding: derived class re-implements a virtual function with the same signature, resolved at runtime.

**17. What is an abstract class?** A class with at least one pure virtual function (`= 0`); can't be instantiated.

**18. Can a constructor be virtual? A destructor?** No / yes (and should be in polymorphic bases).

**19. What is the diamond problem?** Multiple inheritance from two classes sharing a base creates two base subobjects; `virtual` inheritance shares one.

**20. What does `explicit` do?** Prevents a constructor/conversion operator from being used for implicit conversions.

**21. What does `final` do?** Prevents further overriding of a virtual function or derivation from a class.

**22. Struct vs class?** Only the default access (public vs private) — and default inheritance access.

**23. What is `this`?** A pointer to the object a member function was called on.

**24. What is the initialisation order of members?** Declaration order in the class, regardless of initialiser-list order.

## Modern C++

**25. What does `std::move` do?** Casts to an rvalue reference; it moves nothing itself.

**26. What is perfect forwarding?** Passing arguments through a template while preserving lvalue/rvalue-ness via forwarding references and `std::forward`.

**27. What is `auto` deduction?** Template-argument deduction rules: drops top-level const/references unless you write `auto&`/`const auto&`/`auto&&`.

**28. `constexpr` vs `const`?** Compile-time constant (or compile-time-capable function) vs read-only.

**29. What is a lambda under the hood?** An unnamed class with `operator()` whose captures are members.

**30. What are concepts?** Named compile-time constraints on template parameters (C++20).

**31. What's `std::optional` for?** A value that may be absent, without sentinel values or heap allocation.

**32. `std::variant` vs inheritance?** Closed set of types, value semantics, no heap, `std::visit` dispatch vs open set, reference semantics, virtual dispatch.

**33. What is `string_view`?** A non-owning (pointer, length) view of characters — cheap to pass, must not outlive the data.

**34. What is `std::span`?** Non-owning view over contiguous elements (C++20) — replaces pointer + length.

**35. What is RVO/NRVO?** Return value optimisation: constructing the returned object directly in the caller's storage. Guaranteed for prvalues since C++17.

**36. What is `noexcept` and why does it matter for move constructors?** A promise not to throw; `std::vector` moves elements on reallocation only if the move constructor is `noexcept`.

**37. What's new in C++20?** Concepts, ranges, coroutines, modules, `<=>`, `span`, `format`, `jthread`, designated initialisers, `consteval`/`constinit`.

## STL

**38. `vector` vs `list`?** Contiguous & cache-friendly vs node-based with stable iterators and O(1) splice. `vector` wins almost always.

**39. `map` vs `unordered_map`?** Red-black tree O(log n) ordered vs hash table average O(1) unordered.

**40. When are vector iterators invalidated?** On reallocation (all), or insert/erase (at and after the position).

**41. What does `reserve` do?** Allocates capacity without changing size.

**42. `emplace_back` vs `push_back`?** Construct in place from arguments vs copy/move an existing object.

**43. How does `std::sort` work?** Introsort: quicksort, switching to heapsort on deep recursion and insertion sort for small ranges. O(n log n) worst case.

## Concurrency

**44. What is a race condition / data race?** Timing-dependent behaviour / unsynchronised concurrent access with a write — UB in C++.

**45. Mutex vs semaphore?** Ownership-based mutual exclusion vs a counter of available resources/signals.

**46. What is a deadlock and how do you prevent it?** Circular waiting on locks; consistent lock ordering, `std::scoped_lock`, timeouts.

**47. Does `volatile` make code thread-safe?** No. Use `std::atomic` or locks.

**48. What is a condition variable and why the predicate?** A wait/notify mechanism; the predicate guards against spurious wakeups and lost notifications.

**49. What is false sharing?** Different threads writing different data on the same cache line, causing coherence traffic.

## Compilation & C

**50. Steps of compilation?** Preprocessing, compilation, assembly, linking.

**51. Meanings of `static`?** Internal linkage (file scope), persistent local (block scope), class-level member (C++).

**52. What does `extern` do?** Declares a variable/function defined in another translation unit.

**53. `#define` vs `const` vs `constexpr`?** Textual substitution (no type/scope) vs typed read-only vs typed compile-time constant.

**54. What does `volatile` mean?** Accesses can't be optimised away or reordered with respect to other volatile accesses — for MMIO and ISR-shared variables.

**55. What is undefined behaviour? Examples?** No requirements on behaviour: signed overflow, null dereference, OOB access, use-after-free, data races.

**56. What is name mangling?** Encoding types into symbol names to support overloading; disabled with `extern "C"`.

**57. Static vs dynamic linking?** Code copied into the executable at build time vs loaded from a shared library at runtime.

**58. What is the ODR?** One Definition Rule: exactly one definition of each non-inline function/variable per program.

**59. What is a header guard?** `#pragma once` or `#ifndef` macros preventing multiple inclusion in a TU.

**60. How do you swap two integers without a temporary?** `a ^= b; b ^= a; a ^= b;` (fails if `a` and `b` alias the same object — and `std::swap` is clearer and as fast).

## Tricky outputs

```cpp
int i = 5;
std::cout << i++ + ++i;      // C++17: still unsequenced between operands of + -> UB. Don't.

int a[5] = {1, 2, 3};        // remaining elements zero-initialised -> {1,2,3,0,0}

std::vector<int> v(3, 7);    // {7,7,7}
std::vector<int> w{3, 7};    // {3,7} — initializer_list constructor wins with braces

unsigned x = 0; x--;         // 4294967295 (wraps, defined)

struct A { virtual void f() { std::cout << "A"; } };
struct B : A { void f() override { std::cout << "B"; } };
A* p = new B; p->f();        // "B"
A a = B{}; a.f();            // "A" (sliced)

char s[] = "hello";
std::cout << sizeof(s) << strlen(s);   // 6 5
```
