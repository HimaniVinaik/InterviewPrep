# RAII & the Memory Model

> **Key idea:** every C++ object has a precise **lifetime** — it begins when its constructor finishes and ends when its destructor runs. **RAII** (Resource Acquisition Is Initialisation) ties every resource (memory, file, lock, socket, GPU buffer) to the lifetime of an object, so cleanup happens automatically and exactly once, on every path, including exceptions. Add a clear picture of *where* objects live (stack, heap, static storage) and how they're laid out (alignment, padding), and you can reason about almost any C++ memory question.

**What you'll be able to do after this guide**
- Draw a process's memory layout and say where any variable lives.
- Explain stack vs heap trade-offs, object lifetime rules and storage durations.
- Write RAII classes and scope guards; reason about exception safety.
- Compute struct sizes with alignment and padding; know what `new`/`delete` really do.
- Use sanitizers and Valgrind to find memory errors; understand the basics of the concurrency memory model.

---

## 1. Process memory layout

A running program's virtual address space (typical Linux x86-64, simplified):

```text
high addresses
┌─────────────────────────────┐
│ kernel space                │  not accessible to the program
├─────────────────────────────┤
│ stack  (grows ↓)            │  local variables, return addresses, function arguments
│   ...                       │  ~8 MB per thread by default
├─────────────────────────────┤
│ memory-mapped region        │  shared libraries, mmap'd files, large malloc blocks
├─────────────────────────────┤
│   ...                       │
│ heap   (grows ↑)            │  new / malloc
├─────────────────────────────┤
│ .bss                        │  zero-initialised globals/statics (takes no space in the file)
│ .data                       │  initialised globals/statics
│ .rodata                     │  string literals, const globals, vtables
│ .text                       │  machine code
└─────────────────────────────┘
low addresses
```

```cpp
#include <cstdio>
#include <cstdlib>

int initialisedGlobal = 42;          // .data
int zeroGlobal;                      // .bss (zero-initialised)
const char* literal = "hello";       // the pointer is in .data, the characters in .rodata

void function() {}                   // .text

int main() {
    int local = 1;                   // stack
    static int staticLocal = 2;      // .data (lives for the whole program)
    int* heap = static_cast<int*>(std::malloc(sizeof(int)));   // heap

    std::printf("text   (function)    %p\n", reinterpret_cast<void*>(&function));
    std::printf("rodata (literal)     %p\n", static_cast<const void*>(literal));
    std::printf("data   (global)      %p\n", static_cast<void*>(&initialisedGlobal));
    std::printf("data   (static local)%p\n", static_cast<void*>(&staticLocal));
    std::printf("bss    (zero global) %p\n", static_cast<void*>(&zeroGlobal));
    std::printf("heap                 %p\n", static_cast<void*>(heap));
    std::printf("stack  (local)       %p\n", static_cast<void*>(&local));
    std::free(heap);
    return 0;
}
```

(The exact addresses differ every run because of **ASLR** — address space layout randomisation, a security feature.)

### Storage durations

| Duration | Where | Created | Destroyed | Example |
|---|---|---|---|---|
| **Automatic** | stack (or registers) | when the declaration is reached | at the end of the enclosing scope | `int x;` inside a function |
| **Static** | .data / .bss | before `main` (globals) or on first use (function statics) | after `main` returns, reverse order | globals, `static` locals, `static` members |
| **Thread** | per-thread storage | when the thread starts / first use | when the thread ends | `thread_local int counter;` |
| **Dynamic** | heap | `new` / `malloc` | `delete` / `free` (you decide) | `new Widget()` |

---

## 2. Stack vs heap

| | Stack | Heap |
|---|---|---|
| Allocation speed | essentially free (move the stack pointer) | slower: the allocator must find a free block (and may take a lock) |
| Lifetime | scope-bound, automatic | manual (or managed by RAII owners) |
| Size limit | small (~1–8 MB per thread) | large (all available memory) |
| Fragmentation | none | possible |
| Cache behaviour | hot, contiguous | depends; scattered allocations hurt locality |
| Size known at | compile time (VLAs are not standard C++) | run time |
| Failure mode | stack overflow → crash | `std::bad_alloc` / `nullptr` |

**Use the stack by default.** Use the heap when the object is large, its size is only known at run time, it must outlive the current scope, or it's polymorphic and owned through a base pointer. Containers like `std::vector` give you the best of both: the small handle lives on the stack, the elements on the heap, and the destructor frees them.

```cpp
#include <cstdio>
#include <memory>
#include <vector>

struct Big {
    double data[100000];             // 800 KB
};

int main() {
    // Big onStack;                  // risky: may overflow an 8 MB stack in deeper call chains or threads
    auto onHeap = std::make_unique<Big>();          // heap, freed automatically
    onHeap->data[0] = 1.0;

    std::vector<double> dynamic(100000, 0.0);       // handle on the stack (24 bytes), elements on the heap
    std::printf("sizeof(vector) = %zu bytes, but it manages %zu bytes on the heap\n",
                sizeof(dynamic), dynamic.size() * sizeof(double));
    return 0;
}
```

> **Danger:** deep or unbounded recursion and large local arrays are the usual causes of stack overflow. Embedded systems often have only a few KB of stack per task — know your budget.

---

## 3. Object lifetime in detail

### Construction and destruction order

- Members are constructed in **declaration order** (not the order in the initialiser list!) and destroyed in **reverse** order.
- Base classes are constructed before members, and destroyed after them.
- Local objects are destroyed in reverse order of construction at the end of their scope.

```cpp
#include <cstdio>

struct Tracer {
    const char* name;
    explicit Tracer(const char* n) : name(n) { std::printf("  construct %s\n", name); }
    ~Tracer() { std::printf("  destroy   %s\n", name); }
};

struct Base {
    Tracer b{"Base member"};
};

struct Derived : Base {
    Tracer first{"first"};
    Tracer second{"second"};
    // Initialiser list in the "wrong" order: members are STILL built first, then second.
    Derived() : second("second (from init list)"), first("first (from init list)") {}
};

int main() {
    std::printf("making Derived:\n");
    {
        Derived d;
    }
    std::printf("locals:\n");
    {
        Tracer a{"a"};
        Tracer b{"b"};
    }                                 // b destroyed before a
    return 0;
}
```

(GCC/Clang warn with `-Wreorder` when the initialiser list order differs from declaration order — because using one member to initialise another can read an uninitialised value.)

### Temporaries and lifetime extension

A temporary dies at the end of the **full expression** (`;`) — except when bound directly to a `const T&` or `T&&` local, which extends its life to the reference's scope.

```cpp
#include <cstdio>
#include <string>

std::string makeName() {
    return "temporary";
}

int main() {
    const std::string& extended = makeName();   // lifetime extended: OK to use below
    std::printf("%s\n", extended.c_str());

    const char* dangling = makeName().c_str();  // the string dies at the ';' -> pointer dangles
    (void)dangling;                             // using it would be UB

    std::string safe = makeName();              // the simplest correct choice: own a copy (moved, cheap)
    std::printf("%s\n", safe.c_str());
    return 0;
}
```

> **Pitfall:** lifetime extension does **not** propagate through function returns. `const std::string& f() { return std::string("x"); }` returns a dangling reference. Similarly `for (auto& x : getVector()[0])` iterates a dangling element before C++23.

### Static initialisation order fiasco

Globals in **different translation units** are initialised in an unspecified order. If one global's constructor uses another from a different `.cpp`, it may see an uninitialised object.

```cpp
#include <cstdio>
#include <string>

// Fix: a function-local static is initialised on first use, thread-safely (C++11 "magic statics").
std::string& registryName() {
    static std::string name = "global registry";   // constructed the first time this runs
    return name;
}

struct UsesRegistry {
    UsesRegistry() { std::printf("constructing with %s\n", registryName().c_str()); }
};

UsesRegistry early;   // safe no matter which .cpp file is initialised first

int main() {
    std::printf("main: %s\n", registryName().c_str());
    return 0;
}
```

Also consider `constinit` (C++20) to guarantee a global is initialised at compile time, and avoid non-trivial globals entirely when you can.

---

## 4. RAII in practice

The pattern: **acquire in the constructor, release in the destructor, forbid accidental copies.**

```cpp
#include <cstdio>
#include <stdexcept>
#include <utility>

// A RAII wrapper for a C FILE*.
class File {
public:
    File(const char* path, const char* mode) : f(std::fopen(path, mode)) {
        if (f == nullptr) {
            throw std::runtime_error("cannot open file");   // no object -> nothing to clean up
        }
    }
    ~File() {
        if (f != nullptr) {
            std::fclose(f);                                  // always runs, even during exceptions
        }
    }

    File(const File&) = delete;                              // two owners would close twice
    File& operator=(const File&) = delete;

    File(File&& other) noexcept : f(std::exchange(other.f, nullptr)) {}   // transfer ownership
    File& operator=(File&& other) noexcept {
        if (this != &other) {
            if (f != nullptr) {
                std::fclose(f);
            }
            f = std::exchange(other.f, nullptr);
        }
        return *this;
    }

    void write(const char* text) {
        if (std::fputs(text, f) < 0) {
            throw std::runtime_error("write failed");
        }
    }

private:
    std::FILE* f;
};

int main() {
    try {
        File out("raii_demo.txt", "w");
        out.write("line 1\n");
        File moved = std::move(out);          // ownership moves; only `moved` will close
        moved.write("line 2\n");
        throw std::runtime_error("something went wrong");    // file still closed properly
    } catch (const std::exception& e) {
        std::printf("caught: %s — file was closed by ~File\n", e.what());
    }
    std::remove("raii_demo.txt");
    return 0;
}
```

The standard library is full of RAII types:

| Resource | RAII type |
|---|---|
| Heap memory | `std::unique_ptr`, `std::shared_ptr`, `std::vector`, `std::string` |
| Mutex lock | `std::lock_guard`, `std::unique_lock`, `std::scoped_lock` |
| Files | `std::fstream` |
| Threads | `std::jthread` (joins in its destructor) |
| Anything else | `unique_ptr` with a custom deleter, or a small class like `File` |

### Scope guards

For one-off cleanup, a **scope guard** runs a lambda when the scope ends:

```cpp
#include <cstdio>
#include <utility>

template <typename F>
class ScopeGuard {
public:
    explicit ScopeGuard(F fn) : fn(std::move(fn)) {}
    ~ScopeGuard() {
        if (active) {
            fn();
        }
    }
    void dismiss() { active = false; }      // e.g. "commit": don't roll back
    ScopeGuard(const ScopeGuard&) = delete;
    ScopeGuard& operator=(const ScopeGuard&) = delete;
private:
    F fn;
    bool active = true;
};

bool transferMoney(int& from, int& to, int amount, bool failHalfway) {
    from -= amount;
    ScopeGuard rollback([&] {
        from += amount;                     // undo if we don't reach the commit
        std::printf("  rolled back\n");
    });
    if (failHalfway) {
        return false;                       // guard fires
    }
    to += amount;
    rollback.dismiss();                     // success: keep the change
    return true;
}

int main() {
    int a = 100;
    int b = 0;
    transferMoney(a, b, 30, false);
    std::printf("after success: a=%d b=%d\n", a, b);
    transferMoney(a, b, 30, true);
    std::printf("after failure: a=%d b=%d\n", a, b);
    return 0;
}
```

---

## 5. Exception safety guarantees

When a function throws, what state is the program left in?

| Guarantee | Promise | Example |
|---|---|---|
| **No-throw** | never throws | destructors, `swap`, move operations marked `noexcept` |
| **Strong** | either succeeds, or the state is unchanged (commit-or-rollback) | `std::vector::push_back` (if the element's move is noexcept or it's copyable) |
| **Basic** | invariants hold and nothing leaks, but the state may have changed | most operations |
| **None** | anything goes | avoid |

RAII gives you the basic guarantee almost for free. The **copy-and-swap** idiom gives the strong guarantee for assignment:

```cpp
#include <algorithm>
#include <cstddef>
#include <cstdio>
#include <utility>

class Buffer {
public:
    explicit Buffer(std::size_t n) : size(n), data(new int[n]()) {}
    ~Buffer() { delete[] data; }

    Buffer(const Buffer& other) : size(other.size), data(new int[other.size]) {   // may throw — before touching *this
        std::copy(other.data, other.data + size, data);
    }

    Buffer& operator=(Buffer other) noexcept {   // 1. copy made by the parameter (can throw — *this untouched)
        swap(other);                             // 2. swap can't throw
        return *this;                            // 3. `other` destroys our old buffer
    }

    void swap(Buffer& other) noexcept {
        std::swap(size, other.size);
        std::swap(data, other.data);
    }

    std::size_t length() const { return size; }

private:
    std::size_t size;
    int* data;
};

int main() {
    Buffer a(3);
    Buffer b(10);
    a = b;                     // strong guarantee: if copying throws, a is unchanged
    a = Buffer(5);             // also handles move-assignment (the parameter is move-constructed)
    std::printf("a has %zu elements\n", a.length());
    return 0;
}
```

### Constructors that throw

If a constructor throws: members and bases that were **already fully constructed** are destroyed (in reverse order), the object's own destructor does **not** run, and memory from `new` is released. So a class that holds two raw resources leaks the first if acquiring the second throws — another reason to make every member its own RAII type.

```cpp
#include <cstdio>
#include <memory>
#include <stdexcept>

struct Part {
    const char* name;
    explicit Part(const char* n, bool fail = false) : name(n) {
        if (fail) {
            throw std::runtime_error("part failed");
        }
        std::printf("  acquired %s\n", name);
    }
    ~Part() { std::printf("  released %s\n", name); }
};

struct Machine {
    std::unique_ptr<Part> engine;
    std::unique_ptr<Part> wheels;
    Machine() : engine(std::make_unique<Part>("engine")), wheels(std::make_unique<Part>("wheels", true)) {}
    ~Machine() { std::printf("  ~Machine (never printed here)\n"); }
};

int main() {
    try {
        Machine m;
    } catch (const std::exception& e) {
        std::printf("caught: %s — the engine was still released\n", e.what());
    }
    return 0;
}
```

### Destructors must not throw

Destructors are implicitly `noexcept`. If a destructor throws during stack unwinding (while another exception is in flight), `std::terminate` is called. Log errors in destructors, or offer an explicit `close()` that can throw and have the destructor swallow failures.

---

## 6. `new` and `delete` under the hood

`new T(args)` does **two** things, and `delete p` reverses them:

```text
new T(args)        →  1. void* mem = operator new(sizeof(T));   // allocate raw memory (may throw bad_alloc)
                      2. construct T in mem (placement new)     // if this throws, operator delete(mem) is called
delete p           →  1. p->~T();                               // destroy
                      2. operator delete(p);                    // free raw memory
```

You can replace `operator new`/`operator delete` globally or per class — e.g. to count allocations, use a pool, or forbid heap use in real-time code.

```cpp
#include <cstdio>
#include <cstdlib>
#include <new>
#include <string>
#include <vector>

static std::size_t allocations = 0;

void* operator new(std::size_t size) {           // replaces the global allocation function
    allocations++;
    if (void* p = std::malloc(size)) {
        return p;
    }
    throw std::bad_alloc();
}
void operator delete(void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }

int main() {
    std::size_t before = allocations;
    std::vector<int> v;
    for (int i = 0; i < 1000; i++) {
        v.push_back(i);                          // grows geometrically: ~11 allocations, not 1000
    }
    std::size_t vectorAllocs = allocations - before;

    before = allocations;
    std::vector<int> w;
    w.reserve(1000);                             // one allocation up front
    for (int i = 0; i < 1000; i++) {
        w.push_back(i);
    }
    std::printf("push_back x1000: %zu allocations; with reserve: %zu\n", vectorAllocs, allocations - before);

    before = allocations;
    std::string small = "short";                 // small-string optimisation: stored inside the object
    std::size_t smallAllocs = allocations - before;
    before = allocations;
    std::string large(100, 'x');                 // too long for SSO: heap allocation
    std::printf("short string allocations: %zu (SSO); 100-char string: %zu\n",
                smallAllocs, allocations - before);
    return 0;
}
```

### Placement new and manual lifetime

```cpp
#include <cstdio>
#include <new>
#include <string>

int main() {
    alignas(std::string) unsigned char storage[sizeof(std::string)];   // raw, suitably aligned bytes
    std::string* s = new (storage) std::string("built in place");      // construct, no allocation of the object
    std::printf("%s\n", s->c_str());
    s->~basic_string();                                                 // destroy explicitly
    // Never `delete s` — the memory wasn't from operator new.
    return 0;
}
```

This is how `std::vector`, `std::optional` and object pools work internally: separate "get memory" from "construct an object in it". C++17's `std::launder` and C++20's `std::construct_at`/`std::destroy_at` are the modern helpers.

---

## 7. Alignment and padding

Every type has an **alignment**: its address must be a multiple of that number (`alignof(T)`). CPUs load aligned data fastest; some (many embedded ARM cores) fault on misaligned access. The compiler inserts **padding** so every member is aligned, and pads the end so arrays of the struct stay aligned.

```text
struct Bad {          offset  size        struct Good {        offset size
    char  a;          0       1               double d;        0      8
    // 7 bytes padding                        int    i;        8      4
    double d;         8       8               char   a;        12     1
    char  b;          16      1               char   b;        13     1
    // 3 bytes padding                        // 2 bytes tail padding
    int   i;          20      4           };                    sizeof = 16
};                    sizeof = 24
```

```cpp
#include <cstddef>
#include <cstdint>
#include <cstdio>

struct Bad {
    char a;
    double d;
    char b;
    int i;
};

struct Good {          // same members, ordered largest alignment first
    double d;
    int i;
    char a;
    char b;
};

#pragma pack(push, 1)
struct PackedHeader {  // e.g. a wire format: no padding at all (slower/unsafe to access on some CPUs)
    std::uint8_t type;
    std::uint32_t length;
    std::uint16_t checksum;
};
#pragma pack(pop)

struct alignas(64) CacheLine {   // force 64-byte alignment: avoids false sharing between threads
    int counter;
};

int main() {
    std::printf("Bad:  sizeof %zu, align %zu, offsets a=%zu d=%zu b=%zu i=%zu\n",
                sizeof(Bad), alignof(Bad), offsetof(Bad, a), offsetof(Bad, d), offsetof(Bad, b), offsetof(Bad, i));
    std::printf("Good: sizeof %zu\n", sizeof(Good));
    std::printf("PackedHeader: sizeof %zu (no padding)\n", sizeof(PackedHeader));
    std::printf("CacheLine: sizeof %zu, align %zu\n", sizeof(CacheLine), alignof(CacheLine));
    static_assert(sizeof(Good) < sizeof(Bad), "reordering saves space");
    return 0;
}
```

**Rules of thumb**
- Order members from largest to smallest alignment to minimise padding.
- `sizeof(struct)` is always a multiple of its alignment.
- Never `memcmp` structs to compare them — padding bytes have indeterminate values.
- For network/file formats, don't `memcpy` a struct onto the wire: serialise field by field with explicit sizes and byte order (see *Endianness* in the C & Embedded problems).

### Empty classes

An empty class has `sizeof` ≥ 1 so distinct objects have distinct addresses — but as a **base class** it can take zero bytes (the empty base optimisation), and C++20's `[[no_unique_address]]` lets an empty **member** take zero bytes. That's how `std::unique_ptr` with a stateless deleter stays one pointer in size.

```cpp
#include <cstdio>

struct Empty {};
struct WithMember {
    int x;
    Empty e;                        // takes space (+ padding)
};
struct WithEbo : Empty {
    int x;                          // the empty base takes no space
};
struct WithAttribute {
    int x;
    [[no_unique_address]] Empty e;  // C++20
};

int main() {
    std::printf("Empty %zu, WithMember %zu, WithEbo %zu, WithAttribute %zu\n",
                sizeof(Empty), sizeof(WithMember), sizeof(WithEbo), sizeof(WithAttribute));
    return 0;
}
```

---

## 8. Memory errors and the tools that catch them

| Bug | Symptom | Best tool |
|---|---|---|
| Heap buffer overflow | corruption, random crashes later | AddressSanitizer (`-fsanitize=address`) |
| Stack buffer overflow | corrupted locals/return address | ASan, `-fstack-protector-strong` |
| Use after free / return | wrong values, crashes | ASan |
| Double free / mismatched free | heap corruption | ASan, Valgrind |
| Memory leak | growing memory use | LeakSanitizer (part of ASan), Valgrind `--leak-check=full`, heaptrack |
| Uninitialised read | nondeterministic behaviour | MemorySanitizer (Clang), Valgrind |
| Data race | rare, timing-dependent bugs | ThreadSanitizer (`-fsanitize=thread`) |
| Integer overflow, bad shifts, null deref | UB | UBSan (`-fsanitize=undefined`) |

```bash
g++ -std=c++20 -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer main.cpp -o app && ./app
valgrind --leak-check=full --track-origins=yes ./app      # no recompilation needed (slower)
```

Run your unit tests under sanitizers in CI — they find bugs that only show up "sometimes" in production. (Every runnable example in these guides is compiled and run with ASan + UBSan.)

---

## 9. The C++ memory model (concurrency) in brief

The **memory model** defines what values a thread may observe when several threads touch the same memory.

- A **data race** — two threads access the same memory location, at least one writes, without synchronisation — is **undefined behaviour**. Not "a slightly wrong value": UB.
- Synchronise with mutexes, `std::atomic`, or other primitives that create **happens-before** relationships.
- Atomics take a **memory order**: `seq_cst` (default, simplest, one global order), `acquire`/`release` (pairs that publish data from one thread to another), `relaxed` (atomicity only — counters).

```cpp
#include <atomic>
#include <cstdio>
#include <thread>

int payload = 0;                       // plain data
std::atomic<bool> ready{false};        // the "flag" that publishes it

void producer() {
    payload = 42;                                       // 1. write the data
    ready.store(true, std::memory_order_release);       // 2. publish: everything before is visible...
}

void consumer() {
    while (!ready.load(std::memory_order_acquire)) {    // 3. ...to whoever acquires the flag
        std::this_thread::yield();
    }
    std::printf("payload = %d (guaranteed 42)\n", payload);
}

int main() {
    std::thread c(consumer);
    std::thread p(producer);
    p.join();
    c.join();
    return 0;
}
```

The *Concurrency* guide covers this in depth (mutexes, condition variables, atomics, memory orders, false sharing).

---

## 10. Interview checklist

- [ ] Draw the memory layout and place globals, statics, locals, heap objects, literals and code.
- [ ] Explain the four storage durations.
- [ ] Construction order (bases, members in declaration order) and reverse destruction.
- [ ] RAII: acquire in constructor, release in destructor, delete or define copy/move.
- [ ] Exception guarantees and copy-and-swap; why destructors must not throw.
- [ ] What `new`/`delete` do in two steps; placement new.
- [ ] Compute `sizeof` with padding; reorder members to shrink.
- [ ] Name the sanitizer for each memory bug.

---

## Practice

1. Compute `sizeof` for `struct S { char a; int b; char c; short d; double e; };` on x86-64. Then reorder it to the smallest size.
2. Write a RAII `Timer` that prints how long its scope took when it's destroyed.
3. Write a RAII `LockGuard` for a `std::mutex` and explain why `std::lock_guard<std::mutex>(m);` (with no variable name) is a bug.
4. Write a class `Pool<T, N>` that stores N objects in a static buffer, constructs them with placement new on `create(args...)` and destroys them on `destroy(T*)`.
5. Why does this crash or print garbage, and how do you fix it? `std::string_view name() { std::string s = "temp"; return s; }`

:::details Show solution
1. Offsets: a 0, (3 padding), b 4, c 8, (1 padding), d 10, (4 padding), e 16 → **24** bytes. Reordered `double e; int b; short d; char a; char c;` → 8 + 4 + 2 + 1 + 1 = **16** bytes (no padding).
2.
```cpp
#include <chrono>
#include <cstdio>

class Timer {
public:
    explicit Timer(const char* label) : label(label), start(std::chrono::steady_clock::now()) {}
    ~Timer() {
        auto us = std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - start);
        std::printf("%s took %lld us\n", label, static_cast<long long>(us.count()));
    }
    Timer(const Timer&) = delete;
    Timer& operator=(const Timer&) = delete;
private:
    const char* label;
    std::chrono::steady_clock::time_point start;
};

int main() {
    Timer t("loop");
    volatile long sum = 0;
    for (long i = 0; i < 1000000; i++) {
        sum += i;
    }
    return 0;
}
```
3. A `LockGuard` locks in its constructor and unlocks in its destructor (copy deleted). `std::lock_guard<std::mutex>(m);` creates an unnamed **temporary** that is destroyed at the end of that statement — the lock is released immediately, so nothing is protected. (It may even parse as declaring a variable named `m`.) Always name it: `std::lock_guard<std::mutex> lock(m);` — or use `std::scoped_lock lock(m);`.
4. Keep `alignas(T) unsigned char buf[N][sizeof(T)]` and a `bool used[N]`. `create` finds a free slot, does `new (buf[i]) T(std::forward<Args>(args)...)`, marks it used; `destroy(p)` calls `p->~T()` and computes the slot index from the address. The destructor of the pool destroys any still-used slots.
5. `std::string_view` doesn't own characters; it points into `s`, which is destroyed when the function returns → dangling view (and with SSO the bytes lived inside `s` on the stack). Return `std::string` instead.
:::

---

## Interview Q&A

- **What is RAII and why does it matter?** Lifetime-bound resource management; exception-safe, leak-free, no `finally` needed.
- **Where do string literals live?** Read-only static storage (`.rodata`).
- **What's the size of an empty class?** At least 1 byte (distinct addresses), except as a base (empty base optimisation) or with `[[no_unique_address]]`.
- **What happens if a constructor throws?** Fully constructed members and bases are destroyed; the destructor of the object itself does **not** run; memory from `new` is freed automatically.
- **Why must destructors not throw?** If one throws during stack unwinding, `std::terminate` is called. Destructors are implicitly `noexcept`.
- **Stack vs heap — when do you use each?** Stack by default (fast, automatic, small); heap for large objects, run-time sizes, objects that outlive the scope, or polymorphic ownership — always owned by an RAII type.
- **In what order are members constructed?** In declaration order, after base classes — regardless of the order in the constructor's initialiser list; destruction is the exact reverse.
- **What does `new T` do?** Calls `operator new(sizeof(T))` to get raw memory, then constructs a `T` in it; if the constructor throws, the memory is released. `delete` runs the destructor then `operator delete`.
- **Why can `sizeof` of a struct be bigger than the sum of its members?** Padding is inserted so each member meets its alignment, and at the end so arrays of the struct stay aligned.
- **What is the static initialisation order fiasco and how do you avoid it?** Globals in different translation units initialise in an unspecified order, so one may use another before it's constructed; use function-local statics (construct-on-first-use) or `constinit`.
- **What is a data race?** Two threads accessing the same memory location without synchronisation, at least one writing — undefined behaviour in C++.

---

## External resources

- **cppreference — Object lifetime, Storage duration, `new` expression, Alignment.**
- **C++ Core Guidelines — R (Resource management), C.31–C.37 (destructors), E (error handling).**
- **"What Every Programmer Should Know About Memory"** — Ulrich Drepper (caches, layout, NUMA).
- **Jon Kalb — "Exception-Safe Code"** (CppCon talk series) and **Herb Sutter — *Exceptional C++*** (exception guarantees, copy-and-swap).
- **Google Sanitizers wiki** (github.com/google/sanitizers) and the **Valgrind user manual**.
