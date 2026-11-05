# RAII & the Memory Model

**RAII — Resource Acquisition Is Initialization** — is *the* central C++ idiom: tie every resource (memory, file, lock, socket, GPU buffer, interrupt-disable) to the lifetime of an object. The constructor acquires; the destructor releases. Because destructors run automatically when objects go out of scope — **including during exception unwinding** — resources can't leak.

## 1. Process memory layout

```text
 high addresses
 ┌──────────────────────┐
 │ stack (grows down)   │  locals, return addresses, saved registers
 │          ↓           │
 │                      │
 │          ↑           │
 │ heap (grows up)      │  new / malloc
 ├──────────────────────┤
 │ .bss                 │  zero-initialised globals/statics
 │ .data                │  initialised globals/statics
 │ .rodata              │  string literals, const tables
 │ .text                │  machine code
 └──────────────────────┘
 low addresses
```

On a microcontroller, `.text`/`.rodata` live in **flash**, `.data` is copied from flash to **RAM** at startup, `.bss` is zeroed by the startup code, and the stack is a fixed region (often only a few KB!).

| Storage duration | Where | Lifetime | Example |
|---|---|---|---|
| automatic | stack | until end of scope | `int x;` inside a function |
| static | .data/.bss | whole program | globals, `static` locals |
| dynamic | heap | until `delete`/`free` | `new T` |
| thread | TLS | thread lifetime | `thread_local int x;` |

## 2. Stack vs heap

| | Stack | Heap |
|---|---|---|
| Allocation cost | ~free (move stack pointer) | allocator call, possible lock, fragmentation |
| Size | small, fixed (1–8 MB desktop, KB on MCUs) | large |
| Lifetime | scope-bound | manual / owner-controlled |
| Fragmentation | none | yes |
| Failure mode | stack overflow (crash) | `std::bad_alloc` / `nullptr` |

> **Interview:** "Why do embedded systems avoid the heap?" — non-deterministic timing, fragmentation over long uptimes, and failure handling. Typical policy: allocate everything at init, or use fixed-size pools (see Problems → C & Embedded → Memory Pool).

## 3. RAII in practice

```cpp
class File {
    std::FILE* f_;
public:
    explicit File(const char* path, const char* mode) : f_(std::fopen(path, mode)) {
        if (!f_) throw std::runtime_error("open failed");
    }
    ~File() { if (f_) std::fclose(f_); }

    File(const File&) = delete;                    // a file handle has one owner
    File& operator=(const File&) = delete;
    File(File&& o) noexcept : f_(std::exchange(o.f_, nullptr)) {}
    File& operator=(File&& o) noexcept {
        if (this != &o) { if (f_) std::fclose(f_); f_ = std::exchange(o.f_, nullptr); }
        return *this;
    }

    void write(std::string_view s) { std::fwrite(s.data(), 1, s.size(), f_); }
};

void log_event() {
    File f("events.log", "a");
    f.write("boot\n");
    might_throw();          // if this throws, ~File still closes the file
}                           // closed here otherwise
```

RAII types in the standard library: `std::vector`, `std::string`, `std::unique_ptr`, `std::lock_guard`/`scoped_lock`, `std::fstream`, `std::jthread`.

### Scope guards

```cpp
template <class F>
struct ScopeExit {
    F f;
    ~ScopeExit() { f(); }
};
template <class F> ScopeExit(F) -> ScopeExit<F>;   // CTAD guide

void critical() {
    disable_irq();
    ScopeExit restore{[] { enable_irq(); }};       // runs on every exit path
    // ... touch shared state ...
}
```

## 4. Object lifetime

An object's lifetime begins when its initialisation completes and ends when its destructor starts (or storage is reused). Order rules worth knowing:

- Locals are destroyed in **reverse order** of construction.
- Members are constructed in **declaration order** (not initialiser-list order!) and destroyed in reverse.
- Base classes are constructed before members; destroyed after.
- Temporaries die at the end of the full expression — unless bound to a `const T&` or `T&&` local, which extends their lifetime.

```cpp
const std::string& r = std::string("hi");   // lifetime extended to r's scope
std::string_view sv = std::string("hi");    // DANGLING: string_view doesn't extend lifetime
```

### Static initialisation order fiasco

Globals in different translation units are initialised in unspecified order. If `a.cpp`'s global uses `b.cpp`'s global during construction, it may see an unconstructed object. Fix with function-local statics (initialised on first use, thread-safe since C++11) or `constinit`:

```cpp
Logger& logger() {
    static Logger instance;   // "Meyers singleton": constructed on first call
    return instance;
}
```

## 5. `new` and `delete` under the hood

`new T(args)` does two things: calls `operator new(sizeof(T))` to get raw memory, then runs `T`'s constructor in it. `delete p` runs the destructor, then `operator delete`.

```cpp
// Placement new: construct in memory you already have
alignas(Widget) unsigned char buf[sizeof(Widget)];
Widget* w = new (buf) Widget(42);    // no allocation
w->~Widget();                         // must call destructor manually
// C++17/20 helpers: std::construct_at, std::destroy_at
```

Placement new is how `std::vector`, `std::optional`, memory pools and embedded object pools construct objects in pre-allocated storage.

## 6. Alignment and padding

Every type has an alignment requirement (`alignof(T)`); the compiler inserts padding so members are aligned.

```cpp
struct A { char c; int i; char d; };   // 1 + 3 pad + 4 + 1 + 3 pad = 12 bytes
struct B { int i; char c; char d; };   // 4 + 1 + 1 + 2 pad = 8 bytes
static_assert(sizeof(A) == 12 && sizeof(B) == 8);   // typical; implementation-defined
```

> **Tip:** Order members from largest to smallest alignment to minimise padding — a classic embedded memory-saving trick.

```cpp
struct alignas(64) CacheLine { std::atomic<int> counter; };  // avoid false sharing
#pragma pack(push, 1)                                       // packed wire format (non-portable;
struct Header { uint8_t type; uint32_t len; };             //  unaligned access can fault on some CPUs)
#pragma pack(pop)
```

## 7. Memory errors and how to catch them

| Bug | Tool |
|---|---|
| Leak | LeakSanitizer (`-fsanitize=address`), Valgrind memcheck |
| Use-after-free, overflow | AddressSanitizer |
| Uninitialised reads | MemorySanitizer (clang), Valgrind |
| Data races | ThreadSanitizer (`-fsanitize=thread`) |
| Stack overflow (MCU) | stack painting / watermarking, MPU guard region |

## 8. The C++ memory model (concurrency)

The *memory model* also defines how threads see each other's writes. Key ideas (details in *Concurrency*):

- A **data race** (two threads, at least one writing, no synchronisation) is undefined behaviour.
- Synchronisation (mutexes, atomics with acquire/release) establishes **happens-before** relationships.
- `volatile` is **not** a synchronisation primitive in C++ — it is for memory-mapped I/O.

## Interview Q&A

- **What is RAII and why does it matter?** Lifetime-bound resource management; exception-safe, leak-free, no `finally` needed.
- **Where do string literals live?** Read-only static storage (`.rodata`).
- **What's the size of an empty class?** At least 1 byte (distinct addresses), except as a base (empty base optimisation) or with `[[no_unique_address]]`.
- **What happens if a constructor throws?** Fully constructed members and bases are destroyed; the destructor of the object itself does **not** run; memory from `new` is freed automatically.
- **Why must destructors not throw?** If one throws during stack unwinding, `std::terminate` is called. Destructors are implicitly `noexcept`.
