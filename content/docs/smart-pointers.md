# Smart Pointers

Smart pointers are RAII wrappers that **own** a heap object and automatically release it. They turn memory-management bugs (leaks, double frees, dangling pointers) into compile errors or impossibilities. In modern C++ you should rarely write `delete`.

| Type | Ownership | Copyable | Overhead | Use for |
|---|---|---|---|---|
| `std::unique_ptr<T>` | exclusive | no (move-only) | **zero** (same as raw pointer with default deleter) | the default choice |
| `std::shared_ptr<T>` | shared, reference counted | yes | control block + atomic refcount ops | genuinely shared lifetime |
| `std::weak_ptr<T>` | non-owning observer of a `shared_ptr` | yes | control block access | caches, breaking cycles, observers |

Header: `<memory>`.

## 1. `std::unique_ptr` — the default

```cpp
#include <memory>

struct Sensor {
    explicit Sensor(int id) : id(id) { std::cout << "open " << id << '\n'; }
    ~Sensor() { std::cout << "close " << id << '\n'; }
    int id;
};

void demo() {
    auto s = std::make_unique<Sensor>(1);   // allocate + construct
    s->id = 2;                               // use like a pointer
    Sensor& ref = *s;                        // borrow
    Sensor* raw = s.get();                   // non-owning raw pointer

    // auto copy = s;                        // ERROR: copy constructor deleted
    auto moved = std::move(s);               // ownership transferred; s is now nullptr
    if (!s) std::cout << "s is empty\n";
}                                            // "close 2" printed here — automatically
```

### Key operations

```cpp
std::unique_ptr<int> p = std::make_unique<int>(5);
p.reset();                          // delete the object, p = nullptr
p.reset(new int(7));                // replace (prefer make_unique + assignment)
int* r = p.release();               // give up ownership WITHOUT deleting — you must delete r
delete r;
std::unique_ptr<int[]> arr = std::make_unique<int[]>(100);  // array form, uses delete[]
arr[3] = 1;
```

### Factories and polymorphism

```cpp
struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
struct Circle : Shape { double r; explicit Circle(double r) : r(r) {} double area() const override { return 3.14159 * r * r; } };

std::unique_ptr<Shape> make_shape(double r) {
    return std::make_unique<Circle>(r);   // implicit upcast unique_ptr<Circle> -> unique_ptr<Shape>
}

std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(make_shape(2.0));        // containers of unique_ptr: fine (move-only)
```

> **Warning:** The base class needs a **virtual destructor**, otherwise `unique_ptr<Shape>` deleting a `Circle` is undefined behaviour.

### Custom deleters — wrapping C resources

`unique_ptr` is perfect for C handles (files, sockets, SDK objects):

```cpp
// Function-pointer deleter (adds pointer-size storage)
std::unique_ptr<FILE, decltype(&std::fclose)> f(std::fopen("log.txt", "w"), &std::fclose);

// Stateless functor deleter: zero overhead
struct FileCloser { void operator()(FILE* f) const noexcept { if (f) std::fclose(f); } };
using FilePtr = std::unique_ptr<FILE, FileCloser>;
FilePtr open_log() { return FilePtr(std::fopen("log.txt", "w")); }

// C++20: a lambda in an unevaluated context
using SockPtr = std::unique_ptr<int, decltype([](int* fd) { ::close(*fd); delete fd; })>;
```

## 2. `std::shared_ptr` — shared ownership

```cpp
auto a = std::make_shared<Sensor>(3);   // refcount = 1
{
    std::shared_ptr<Sensor> b = a;      // copy -> refcount = 2
    std::cout << a.use_count() << '\n'; // 2
}                                        // b destroyed -> refcount = 1
a.reset();                               // refcount = 0 -> Sensor destroyed
```

### How it works: the control block

```text
 shared_ptr a ──┐            ┌──────────── control block ────────────┐
                ├──> object  │ strong count (shared_ptrs)            │
 shared_ptr b ──┘            │ weak count (weak_ptrs + 1 if strong>0)│
   (each holds 2 pointers:   │ deleter, allocator                    │
    object* + control*)      └───────────────────────────────────────┘
```

- `sizeof(shared_ptr<T>)` is two pointers.
- Copying increments the strong count **atomically** (thread-safe counting, but *not* thread-safe access to the object itself or to the same `shared_ptr` instance).
- The object is destroyed when the strong count hits 0; the control block is freed when the weak count also hits 0.

### Why `make_shared`?

```cpp
auto p1 = std::make_shared<Widget>(args);         // ONE allocation: object + control block together
std::shared_ptr<Widget> p2(new Widget(args));     // TWO allocations
```

`make_shared` is faster and cache-friendlier. Caveat: because the object and control block share one allocation, the object's **memory** isn't released until all `weak_ptr`s are gone too (destructor still runs on time).

Both `make_unique` and `make_shared` also avoid a historical leak in `f(std::shared_ptr<A>(new A), g())` when `g()` throws (fixed by C++17 evaluation-order rules, but the habit remains good).

### Aliasing constructor and casts

```cpp
struct Pair { int x, y; };
auto sp = std::make_shared<Pair>();
std::shared_ptr<int> py(sp, &sp->y);   // shares ownership of Pair, points at y

std::shared_ptr<Shape> s = std::make_shared<Circle>(1.0);
auto c = std::dynamic_pointer_cast<Circle>(s);   // also static_/const_/reinterpret_pointer_cast
```

### `enable_shared_from_this`

When an object needs a `shared_ptr` to itself (e.g. to register callbacks):

```cpp
class Session : public std::enable_shared_from_this<Session> {
public:
    void start() {
        auto self = shared_from_this();   // keeps *this alive during async op
        async_read([self](auto data) { self->on_data(data); });
    }
};
// Must already be owned by a shared_ptr: auto s = std::make_shared<Session>(); s->start();
```

> **Danger:** Never create two separate `shared_ptr`s from the same raw pointer: `shared_ptr<T> a(raw), b(raw);` → two control blocks → double delete.

## 3. `std::weak_ptr` — observe without owning

```cpp
std::weak_ptr<Sensor> w;
{
    auto s = std::make_shared<Sensor>(4);
    w = s;
    if (auto locked = w.lock()) {           // try to get a shared_ptr
        std::cout << locked->id << '\n';    // safe to use here
    }
}
std::cout << w.expired() << '\n';           // 1 — object is gone, no dangling access possible
```

### Breaking reference cycles

```cpp
struct Node {
    std::shared_ptr<Node> next;   // owning forward link
    std::weak_ptr<Node> prev;     // non-owning back link — breaks the cycle
};
```

If both were `shared_ptr`, two nodes pointing at each other would keep each other alive forever (refcount never reaches 0) → leak. Typical cycle-breaking spots: parent ↔ child, observer ↔ subject, cache entries.

## 4. Passing smart pointers to functions

From the C++ Core Guidelines (R.30–R.37) — **the most common interview follow-up**:

| Signature | Meaning |
|---|---|
| `void f(Widget&)` / `const Widget&` | just use the object (most functions!) |
| `void f(Widget*)` | use it; may be null |
| `void f(std::unique_ptr<Widget>)` | **takes ownership** (caller must `std::move`) |
| `void f(std::unique_ptr<Widget>&)` | may **reseat** the caller's pointer |
| `void f(std::shared_ptr<Widget>)` | **shares** ownership (keeps a copy) |
| `void f(const std::shared_ptr<Widget>&)` | might keep a copy; rarely needed |

```cpp
void draw(const Shape& s);                       // doesn't care about ownership
void adopt(std::unique_ptr<Shape> s);           // sink

auto s = std::make_unique<Circle>(1.0);
draw(*s);
adopt(std::move(s));                             // explicit transfer at the call site
```

> **Rule of thumb:** Pass smart pointers only when the function participates in ownership. Otherwise pass `T&` or `T*`. Passing `shared_ptr` by value everywhere costs atomic increments/decrements on every call.

## 5. Returning smart pointers

```cpp
std::unique_ptr<Widget> make() { auto w = std::make_unique<Widget>(); return w; } // implicit move
```

Return `unique_ptr` from factories — callers can convert it to `shared_ptr` if they want (`std::shared_ptr<W> s = make();`). The reverse is impossible.

## 6. Common mistakes

```cpp
// 1. Owning raw new without RAII
Widget* w = new Widget; risky(); delete w;              // leak if risky() throws

// 2. Two owners from one raw pointer
Widget* raw = new Widget;
std::unique_ptr<Widget> a(raw), b(raw);                  // double delete

// 3. Deleting what you don't own
void f(Widget* w) { delete w; }                          // caller may still own it

// 4. Using get() to create another owner
std::shared_ptr<Widget> s2(s1.get());                    // separate control block -> double delete

// 5. Capturing shared_ptr 'this' by raw pointer in async callbacks
async([this] { use(); });                                // object may be destroyed first
// fix: capture shared_from_this() or a weak_ptr and lock()

// 6. unique_ptr<T[]> vs unique_ptr<T> mismatch
std::unique_ptr<int> bad(new int[10]);                   // delete instead of delete[] -> UB
```

## 7. Performance notes

- `unique_ptr` with a stateless deleter: **same size and speed as a raw pointer**. Use it freely, including in embedded code (if you use the heap at all).
- `shared_ptr` copy = atomic increment (tens of cycles, more with contention). Move it when you can: `std::move(sp)` costs no atomic ops.
- `std::atomic<std::shared_ptr<T>>` (C++20) gives lock-free-ish atomic swapping of the pointer itself.

## 8. Implement a minimal `unique_ptr` (common interview task)

```cpp
template <typename T>
class UniquePtr {
    T* p_ = nullptr;
public:
    UniquePtr() = default;
    explicit UniquePtr(T* p) noexcept : p_(p) {}
    ~UniquePtr() { delete p_; }

    UniquePtr(const UniquePtr&) = delete;             // no copying
    UniquePtr& operator=(const UniquePtr&) = delete;

    UniquePtr(UniquePtr&& o) noexcept : p_(std::exchange(o.p_, nullptr)) {}
    UniquePtr& operator=(UniquePtr&& o) noexcept {
        if (this != &o) reset(std::exchange(o.p_, nullptr));
        return *this;
    }

    T* get() const noexcept { return p_; }
    T& operator*() const { return *p_; }
    T* operator->() const noexcept { return p_; }
    explicit operator bool() const noexcept { return p_ != nullptr; }
    T* release() noexcept { return std::exchange(p_, nullptr); }
    void reset(T* p = nullptr) noexcept { T* old = std::exchange(p_, p); delete old; }
};
```

Notice: deleted copy operations, `noexcept` moves (so containers move instead of copy), `explicit operator bool`, and `reset` deleting *after* assigning (safe if the destructor re-enters).

## 9. Implement a minimal `shared_ptr` (follow-up)

```cpp
template <typename T>
class SharedPtr {
    T* p_ = nullptr;
    std::atomic<long>* cnt_ = nullptr;
    void release() {
        if (cnt_ && cnt_->fetch_sub(1, std::memory_order_acq_rel) == 1) { delete p_; delete cnt_; }
    }
public:
    SharedPtr() = default;
    explicit SharedPtr(T* p) : p_(p), cnt_(p ? new std::atomic<long>(1) : nullptr) {}
    SharedPtr(const SharedPtr& o) noexcept : p_(o.p_), cnt_(o.cnt_) { if (cnt_) cnt_->fetch_add(1, std::memory_order_relaxed); }
    SharedPtr(SharedPtr&& o) noexcept : p_(std::exchange(o.p_, nullptr)), cnt_(std::exchange(o.cnt_, nullptr)) {}
    SharedPtr& operator=(SharedPtr o) noexcept {      // copy-and-swap handles both copy & move
        std::swap(p_, o.p_); std::swap(cnt_, o.cnt_); return *this;
    }
    ~SharedPtr() { release(); }
    T* get() const noexcept { return p_; }
    T& operator*() const { return *p_; }
    T* operator->() const noexcept { return p_; }
    long use_count() const noexcept { return cnt_ ? cnt_->load() : 0; }
};
```

Why `relaxed` increment but `acq_rel` decrement? Increments only need atomicity; the final decrement must synchronise so all writes to the object happen-before its deletion.

## Interview Q&A

- **Why is `unique_ptr` move-only?** Exclusive ownership: copying would create two owners → double delete.
- **Is `shared_ptr` thread-safe?** The reference count is. Concurrent reads of the same `shared_ptr` object are fine; concurrent writes to the *same instance* need synchronisation (or `atomic<shared_ptr>`). The pointee has no protection.
- **When would you use `weak_ptr`?** Caches, observers, back-pointers, breaking cycles.
- **`make_shared` downside?** Memory held until the last `weak_ptr` dies; can't use a custom deleter.
- **Can `unique_ptr` be used with incomplete types (PImpl)?** Yes, but the destructor of the owning class must be defined where `T` is complete (define `~Widget()` in the .cpp, even as `= default`).
