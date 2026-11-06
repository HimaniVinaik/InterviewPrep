# Smart Pointers

> **Key idea:** a smart pointer is a small object that **owns** a heap object and deletes it automatically when the owner goes away. It turns "remember to call `delete` on every path, including exceptions" into "it just happens" — that's **RAII** (Resource Acquisition Is Initialisation). Choose the smart pointer by the **ownership** you mean: one owner (`unique_ptr`), shared owners (`shared_ptr`), or an observer that doesn't own (`weak_ptr`, or a plain raw pointer/reference).

**What you'll be able to do after this guide**
- Choose between `unique_ptr`, `shared_ptr`, `weak_ptr` and raw pointers/references for any design.
- Explain exactly what happens in memory: control blocks, reference counts, `make_shared`'s single allocation.
- Use custom deleters to wrap C resources (files, sockets, handles), and arrays.
- Pass and return smart pointers correctly, avoid cycles and double-ownership bugs.
- Implement a minimal `unique_ptr` and `shared_ptr` in an interview.

---

## 1. Why raw `new`/`delete` is fragile

```cpp
// no-test (the problem)
void process() {
    Widget* w = new Widget();
    if (!w->ready()) {
        return;                // LEAK: forgot delete on this path
    }
    w->run();                  // if run() throws -> LEAK
    delete w;
}
```

Every `return`, `break`, `throw` and future edit is a chance to leak or double-delete. A smart pointer's **destructor** runs on every exit path, including stack unwinding during exceptions:

```cpp
#include <cstdio>
#include <memory>
#include <stdexcept>

struct Widget {
    Widget() { std::printf("Widget acquired\n"); }
    ~Widget() { std::printf("Widget released\n"); }
    void run() { throw std::runtime_error("run failed"); }
};

void process() {
    auto w = std::make_unique<Widget>();   // owns the Widget
    w->run();                              // throws...
}                                          // ...but ~unique_ptr still deletes the Widget

int main() {
    try {
        process();
    } catch (const std::exception& e) {
        std::printf("caught: %s (and nothing leaked)\n", e.what());
    }
    return 0;
}
```

| Type | Ownership | Copyable | Overhead vs raw pointer |
|---|---|---|---|
| `std::unique_ptr<T>` | exclusive (one owner) | no — **move only** | none (same size, same code) with the default deleter |
| `std::shared_ptr<T>` | shared (reference counted) | yes | 2 pointers + a control block + atomic count updates |
| `std::weak_ptr<T>` | none (observes a `shared_ptr`) | yes | 2 pointers; must `lock()` to use |
| `T*` / `T&` | none (non-owning view) | yes | none |

---

## 2. `std::unique_ptr` — the default choice

```cpp
#include <cstdio>
#include <memory>
#include <utility>

struct Node {
    int value;
    explicit Node(int v) : value(v) { std::printf("  Node(%d)\n", v); }
    ~Node() { std::printf("  ~Node(%d)\n", value); }
};

std::unique_ptr<Node> makeNode(int v) {
    return std::make_unique<Node>(v);      // returned by move (or elided) — no copy needed
}

int main() {
    std::printf("create:\n");
    std::unique_ptr<Node> a = makeNode(1);
    std::printf("a->value = %d, (*a).value = %d\n", a->value, (*a).value);

    // std::unique_ptr<Node> b = a;         // ERROR: copy constructor is deleted
    std::unique_ptr<Node> b = std::move(a); // transfer ownership
    std::printf("after move: a is %s, b->value = %d\n", a ? "non-null" : "null", b->value);

    std::printf("reset b to a new node (old one destroyed first):\n");
    b.reset(new Node(2));                   // prefer b = std::make_unique<Node>(2)

    Node* observer = b.get();               // non-owning raw pointer: fine to use, never delete it
    std::printf("observer->value = %d\n", observer->value);

    Node* released = b.release();           // b gives up ownership — YOU must delete now
    std::printf("released, b is %s\n", b ? "non-null" : "null");
    delete released;

    std::printf("end of main:\n");
    return 0;
}
```

### Key operations

| Operation | Meaning |
|---|---|
| `std::make_unique<T>(args...)` | allocate + construct (C++14). Preferred. |
| `p.get()` | the raw pointer, ownership unchanged |
| `p.release()` | give up ownership, return the raw pointer (caller must delete) |
| `p.reset(q)` | delete the current object, take ownership of `q` (or become empty) |
| `p.swap(q)`, `std::swap(p, q)` | exchange |
| `if (p)` / `p == nullptr` | empty check |
| `std::move(p)` | transfer ownership |
| `std::unique_ptr<T[]>` | array form: uses `delete[]`, offers `operator[]` |

### Polymorphism and factories

`unique_ptr<Base>` can hold a `Derived`, and deletes it correctly **as long as `Base` has a virtual destructor**.

```cpp
#include <cstdio>
#include <memory>
#include <string>
#include <vector>

struct Shape {
    virtual ~Shape() = default;                 // essential for deleting through Base*
    virtual double area() const = 0;
    virtual std::string name() const = 0;
};

struct Circle : Shape {
    double r;
    explicit Circle(double radius) : r(radius) {}
    double area() const override { return 3.14159 * r * r; }
    std::string name() const override { return "circle"; }
};

struct Square : Shape {
    double s;
    explicit Square(double side) : s(side) {}
    double area() const override { return s * s; }
    std::string name() const override { return "square"; }
};

// A factory returns unique_ptr: the caller clearly becomes the owner.
std::unique_ptr<Shape> makeShape(const std::string& kind, double size) {
    if (kind == "circle") {
        return std::make_unique<Circle>(size);   // unique_ptr<Circle> converts to unique_ptr<Shape>
    }
    if (kind == "square") {
        return std::make_unique<Square>(size);
    }
    return nullptr;
}

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;  // a container of owned, polymorphic objects
    shapes.push_back(makeShape("circle", 1.0));
    shapes.push_back(makeShape("square", 2.0));
    shapes.push_back(std::make_unique<Circle>(0.5));
    for (const auto& s : shapes) {               // iterate by const reference: no ownership change
        std::printf("%s: %.2f\n", s->name().c_str(), s->area());
    }
    return 0;                                    // vector destroys -> each unique_ptr deletes its shape
}
```

### Custom deleters — wrapping C resources

A deleter is any callable invoked instead of `delete`. This makes `unique_ptr` a general RAII wrapper for **anything** that needs cleanup.

```cpp
#include <cstdio>
#include <cstdlib>
#include <memory>

// 1. A function-object deleter: zero size, so unique_ptr stays as small as a raw pointer.
struct FileCloser {
    void operator()(std::FILE* f) const {
        if (f != nullptr) {
            std::fclose(f);
            std::printf("  file closed\n");
        }
    }
};
using FilePtr = std::unique_ptr<std::FILE, FileCloser>;

FilePtr openFile(const char* path, const char* mode) {
    return FilePtr(std::fopen(path, mode));
}

int main() {
    {
        FilePtr f = openFile("demo.txt", "w");
        if (!f) {
            return 1;
        }
        std::fputs("hello from RAII\n", f.get());   // C APIs take the raw pointer
    }                                               // closed here automatically

    // 2. A lambda deleter (C++20: lambdas without captures are default-constructible).
    auto freeDeleter = [](void* p) {
        std::free(p);
        std::printf("  malloc'd block freed\n");
    };
    std::unique_ptr<int, decltype(freeDeleter)> block(static_cast<int*>(std::malloc(sizeof(int) * 4)), freeDeleter);
    block.get()[0] = 42;

    // 3. A function pointer deleter: works, but stores an extra pointer (16 bytes total).
    std::unique_ptr<std::FILE, int (*)(std::FILE*)> g(std::fopen("demo.txt", "r"), &std::fclose);
    char line[64];
    if (g && std::fgets(line, sizeof line, g.get())) {
        std::printf("  read back: %s", line);
    }
    std::printf("sizeof: unique_ptr<FILE, FileCloser> = %zu, with fn-pointer deleter = %zu\n",
                sizeof(FilePtr), sizeof(g));
    std::remove("demo.txt");
    return 0;
}
```

### Arrays

```cpp
#include <cstdio>
#include <memory>

int main() {
    auto arr = std::make_unique<int[]>(5);    // value-initialised: all zeros; uses delete[]
    for (int i = 0; i < 5; i++) {
        arr[i] = i * i;
    }
    std::printf("arr[4] = %d\n", arr[4]);
    // But usually a std::vector<int> is the better choice: it knows its size and can grow.
    return 0;
}
```

### PImpl with `unique_ptr`

The "pointer to implementation" idiom hides a class's private members in the `.cpp`, cutting compile times and keeping the ABI stable. `unique_ptr` works with an **incomplete** type, but its deleter needs the complete type — so the owner's destructor must be defined where `Impl` is complete.

```cpp
// --- widget.h ---------------------------------------------------------
#include <cstdio>
#include <memory>

class Widget {
public:
    Widget();
    ~Widget();                                 // declared here...
    Widget(Widget&&) noexcept;
    Widget& operator=(Widget&&) noexcept;
    void greet() const;
private:
    struct Impl;                               // incomplete here
    std::unique_ptr<Impl> impl;
};

// --- widget.cpp -------------------------------------------------------
struct Widget::Impl {
    int secret = 42;                           // private details live only in the .cpp
};
Widget::Widget() : impl(std::make_unique<Impl>()) {}
Widget::~Widget() = default;                   // ...defined where Impl is complete
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;
void Widget::greet() const { std::printf("secret is %d\n", impl->secret); }

// --- main.cpp ---------------------------------------------------------
int main() {
    Widget w;
    w.greet();
    Widget moved = std::move(w);
    moved.greet();
    return 0;
}
```

If you write `~Widget()` inline in the header (or leave it implicit), you get a compile error like "invalid application of sizeof to incomplete type".

---

## 3. `std::shared_ptr` — shared ownership

Use it when several parts of the program must keep the same object alive and there's **no single obvious owner** (e.g. a texture shared by many sprites, a node in a graph, a callback that may outlive its creator).

```cpp
#include <cstdio>
#include <memory>

struct Texture {
    ~Texture() { std::printf("  texture freed\n"); }
};

int main() {
    std::shared_ptr<Texture> a = std::make_shared<Texture>();
    std::printf("use_count after make_shared: %ld\n", a.use_count());   // 1
    {
        std::shared_ptr<Texture> b = a;                                 // copy: count + 1
        std::shared_ptr<Texture> c = b;
        std::printf("use_count with a, b, c: %ld\n", a.use_count());    // 3
    }                                                                   // b, c destroyed: count - 2
    std::printf("use_count after inner scope: %ld\n", a.use_count());   // 1

    std::shared_ptr<Texture> moved = std::move(a);                      // move: count unchanged, a empty
    std::printf("after move: a %s, count %ld\n", a ? "non-null" : "null", moved.use_count());
    std::printf("resetting the last owner:\n");
    moved.reset();                                                      // count 0 -> object destroyed
    std::printf("done\n");
    return 0;
}
```

### How it works: the control block

```text
shared_ptr<T>  (two pointers)
┌───────────────┬────────────────┐
│ T* ptr        │ control block* │
└──────┬────────┴────────┬───────┘
       │                 ▼
       │        ┌──────────────────────────────┐
       │        │ strong count  (shared_ptrs)  │  object destroyed when it hits 0
       │        │ weak count    (weak_ptrs + 1)│  control block freed when it hits 0
       │        │ deleter, allocator           │
       ▼        └──────────────────────────────┘
   the T object
```

- Copying a `shared_ptr` **atomically** increments the strong count; destroying one decrements it.
- Strong count 0 → the **object** is destroyed (deleter runs).
- Weak count 0 (after strong is 0) → the **control block** is freed.
- Atomic increments are cheap but not free; that's why you shouldn't copy `shared_ptr`s needlessly (pass by `const&` or raw pointer when you're not taking ownership).

### Why `make_shared`?

```cpp
// no-test (comparison)
auto a = std::shared_ptr<Widget>(new Widget());  // 2 allocations: Widget + control block
auto b = std::make_shared<Widget>();             // 1 allocation: [control block | Widget] together
```

| | `make_shared` | `shared_ptr(new T)` |
|---|---|---|
| Allocations | 1 | 2 |
| Cache locality | better (count next to object) | worse |
| Exception safety (pre-C++17 argument evaluation) | safe | `f(shared_ptr<T>(new T), g())` could leak |
| Custom deleter | not possible | possible |
| Memory freed when | **last weak_ptr** dies (object + block are one allocation) | object freed at strong 0, block at weak 0 |

The last row matters for **huge objects observed by long-lived `weak_ptr`s**: with `make_shared`, the object's memory (not its destructor) stays allocated until the weak pointers die.

### Aliasing constructor and casts

```cpp
#include <cstdio>
#include <memory>

struct Base {
    virtual ~Base() = default;
};
struct Derived : Base {
    int extra = 7;
};
struct Pair {
    int first = 1;
    int second = 2;
};

int main() {
    std::shared_ptr<Base> b = std::make_shared<Derived>();
    std::shared_ptr<Derived> d = std::dynamic_pointer_cast<Derived>(b);   // shares the same control block
    std::printf("extra = %d, use_count = %ld\n", d->extra, b.use_count()); // 2

    // Aliasing constructor: point at a MEMBER, but keep the whole Pair alive.
    auto pair = std::make_shared<Pair>();
    std::shared_ptr<int> second(pair, &pair->second);
    pair.reset();                                  // Pair is still alive because `second` shares ownership
    std::printf("second = %d\n", *second);
    return 0;
}
```

`static_pointer_cast`, `dynamic_pointer_cast`, `const_pointer_cast` and `reinterpret_pointer_cast` mirror the normal casts but keep sharing ownership. **Never** do `std::shared_ptr<Derived>(static_cast<Derived*>(b.get()))` — that creates a second, independent control block → double delete.

### `enable_shared_from_this`

An object managed by `shared_ptr` sometimes needs a `shared_ptr` to **itself** (e.g. to register itself as a callback that keeps it alive). `std::shared_ptr<T>(this)` would create a second control block → double delete. Inherit from `enable_shared_from_this`:

```cpp
#include <cstdio>
#include <functional>
#include <memory>
#include <vector>

std::vector<std::function<void()>> pendingCallbacks;

class Session : public std::enable_shared_from_this<Session> {
public:
    void startAsync() {
        auto self = shared_from_this();          // shares the EXISTING control block
        pendingCallbacks.push_back([self] {      // the callback keeps the session alive
            self->onComplete();
        });
    }
    void onComplete() { std::printf("session completed safely\n"); }
    ~Session() { std::printf("session destroyed\n"); }
};

int main() {
    {
        auto s = std::make_shared<Session>();    // must already be owned by a shared_ptr!
        s->startAsync();
    }                                            // s goes out of scope, but the callback still owns it
    std::printf("running callbacks...\n");
    for (auto& cb : pendingCallbacks) {
        cb();
    }
    pendingCallbacks.clear();                    // last owner gone -> destroyed
    return 0;
}
```

Calling `shared_from_this()` on an object not owned by any `shared_ptr` throws `std::bad_weak_ptr` (C++17).

### Thread safety — precisely

- The **reference counts** are thread-safe: different threads may copy and destroy **different `shared_ptr` instances** that share the same object.
- A **single `shared_ptr` instance** read and written by several threads at once is a data race (use a mutex or `std::atomic<std::shared_ptr<T>>` in C++20).
- The **pointee** gets no protection at all — synchronise access to the object yourself.

---

## 4. `std::weak_ptr` — observe without owning

A `weak_ptr` points at an object managed by `shared_ptr`s but **doesn't keep it alive**. To use it, call `lock()`, which returns a `shared_ptr` (empty if the object is already gone).

```cpp
#include <cstdio>
#include <memory>
#include <string>
#include <unordered_map>

struct Image {
    std::string name;
    explicit Image(std::string n) : name(std::move(n)) { std::printf("  load %s\n", name.c_str()); }
    ~Image() { std::printf("  unload %s\n", name.c_str()); }
};

// A cache that doesn't keep images alive by itself.
class ImageCache {
public:
    std::shared_ptr<Image> get(const std::string& name) {
        if (auto it = cache.find(name); it != cache.end()) {
            if (std::shared_ptr<Image> alive = it->second.lock()) {   // still loaded?
                std::printf("  cache hit: %s\n", name.c_str());
                return alive;
            }
        }
        auto img = std::make_shared<Image>(name);
        cache[name] = img;                                             // store a weak reference
        return img;
    }
private:
    std::unordered_map<std::string, std::weak_ptr<Image>> cache;
};

int main() {
    ImageCache cache;
    auto a = cache.get("cat.png");          // loads
    auto b = cache.get("cat.png");          // hit: same object
    std::printf("same object: %s\n", a == b ? "yes" : "no");
    a.reset();
    b.reset();                              // last user gone -> unloaded, even though the cache "knows" it
    auto c = cache.get("cat.png");          // expired weak_ptr -> loads again
    return 0;
}
```

### Breaking reference cycles

Two objects holding `shared_ptr`s to each other keep each other's count ≥ 1 forever — a **leak**, even though nothing else refers to them.

```cpp
#include <cstdio>
#include <memory>

struct Child;

struct Parent {
    std::shared_ptr<Child> child;
    ~Parent() { std::printf("  ~Parent\n"); }
};

struct Child {
    std::weak_ptr<Parent> parent;          // weak back-pointer: breaks the cycle
    ~Child() { std::printf("  ~Child\n"); }
    void hello() {
        if (auto p = parent.lock()) {      // check the parent still exists
            std::printf("  child sees its parent (count %ld)\n", p.use_count());
        }
    }
};

int main() {
    {
        auto p = std::make_shared<Parent>();
        p->child = std::make_shared<Child>();
        p->child->parent = p;              // if this were shared_ptr, neither destructor would ever run
        p->child->hello();
    }
    std::printf("both destroyed above — no leak\n");
    return 0;
}
```

**Rule of thumb:** ownership goes "down" (parent → child) as `unique_ptr` or `shared_ptr`; back-pointers go "up" as `weak_ptr` or raw pointers (when the parent is guaranteed to outlive the child).

---

## 5. Passing smart pointers to functions

The parameter type should say what the function does with **ownership** (C++ Core Guidelines R.30–R.37):

| Parameter | Means | Example |
|---|---|---|
| `T&` / `const T&` | I just use the object; it must exist | `void draw(const Shape& s)` |
| `T*` | I just use it; it may be absent | `void draw(const Shape* s)` |
| `std::unique_ptr<T>` (by value) | **I take ownership** (caller must `std::move`) | `void adopt(std::unique_ptr<Shape> s)` |
| `std::unique_ptr<T>&` | I may **reseat** the caller's pointer | `void replace(std::unique_ptr<Shape>& s)` |
| `std::shared_ptr<T>` (by value) | **I share ownership** (I'll keep a copy) | `void store(std::shared_ptr<Shape> s)` |
| `const std::shared_ptr<T>&` | I *might* take a copy | rarely needed |

```cpp
#include <cstdio>
#include <memory>
#include <utility>
#include <vector>

struct Job {
    int id;
};

void inspect(const Job& job) {                          // no ownership involved: plain reference
    std::printf("inspect job %d\n", job.id);
}

class Scheduler {
public:
    void submit(std::unique_ptr<Job> job) {              // sink: takes ownership
        queue.push_back(std::move(job));
    }
    std::size_t size() const { return queue.size(); }
private:
    std::vector<std::unique_ptr<Job>> queue;
};

int main() {
    auto job = std::make_unique<Job>(Job{7});
    inspect(*job);                                       // pass the object, not the smart pointer
    Scheduler s;
    s.submit(std::move(job));                            // explicit transfer is visible at the call site
    std::printf("job now %s, scheduler holds %zu\n", job ? "still ours" : "moved away", s.size());
    return 0;
}
```

> **Pitfall:** taking `const std::shared_ptr<T>&` everywhere "for speed" hides intent and still forces callers to have a `shared_ptr`. If the function doesn't care about ownership, take `T&` — it works for objects owned by **anything** (stack, `unique_ptr`, `shared_ptr`, a container).

## 6. Returning smart pointers

- Return `std::unique_ptr<T>` from factories — the caller can convert it to `shared_ptr` if needed (`std::shared_ptr<T> s = makeThing();`), but not the other way round.
- Return by value; never `std::move` a local in a `return` statement (it disables copy elision and is pointless).
- Return `T*`/`T&` for **non-owning** access to something you keep owning (e.g. `container.find()`).

```cpp
#include <cstdio>
#include <memory>

struct Config {
    int port = 8080;
};

std::unique_ptr<Config> loadConfig() {
    auto cfg = std::make_unique<Config>();
    cfg->port = 9000;
    return cfg;                                  // no std::move needed
}

int main() {
    std::shared_ptr<Config> shared = loadConfig();   // unique_ptr -> shared_ptr: fine
    std::printf("port %d, owners %ld\n", shared->port, shared.use_count());
    return 0;
}
```

---

## 7. Common mistakes

| Mistake | What goes wrong | Fix |
|---|---|---|
| Two `shared_ptr`s from one raw pointer | two control blocks → double delete | create once, then copy; or `make_shared` |
| `shared_ptr<T>(this)` | second control block | `enable_shared_from_this` |
| `shared_ptr` cycles | leak | `weak_ptr` for back-references |
| `delete p.get()` | double delete | never delete what a smart pointer owns |
| Storing `get()` and using it after the owner died | dangling | keep the owner alive, or use `weak_ptr` |
| No virtual destructor in a polymorphic base | derived destructor never runs (UB) | `virtual ~Base() = default;` |
| `unique_ptr<T>` for arrays from `new T[n]` | `delete` instead of `delete[]` | `unique_ptr<T[]>` or `std::vector` |
| `shared_ptr` by default "to be safe" | hidden ownership, atomic overhead, cycles | start with `unique_ptr`; share only when needed |
| `std::auto_ptr` | removed in C++17 (copy = silent move) | `unique_ptr` |

```cpp
// no-test (the classic double delete)
Widget* raw = new Widget();
std::shared_ptr<Widget> a(raw);
std::shared_ptr<Widget> b(raw);   // second control block: both will delete raw
```

---

## 8. Performance notes

- `unique_ptr` with a stateless deleter compiles to exactly the same code as a raw pointer + `delete`.
- `shared_ptr` costs: an extra allocation (unless `make_shared`), 16 bytes per pointer, and **atomic** increments/decrements on every copy/destroy (tens of cycles; more under contention between cores).
- Pass `shared_ptr` by value only when the callee keeps it; otherwise pass `T&` or `T*`.
- `std::move` a `shared_ptr` instead of copying when you're done with the source — no atomic operations.
- Avoid `shared_ptr` in hot inner loops; hold a raw pointer/reference for the duration of the loop.

---

## 9. Implement a minimal `unique_ptr` (common interview task)

```cpp
#include <cassert>
#include <cstdio>
#include <utility>

template <typename T>
class UniquePtr {
public:
    UniquePtr() noexcept = default;
    explicit UniquePtr(T* p) noexcept : ptr(p) {}

    ~UniquePtr() {
        delete ptr;                                   // delete nullptr is a no-op
    }

    UniquePtr(const UniquePtr&) = delete;             // no copies: exclusive ownership
    UniquePtr& operator=(const UniquePtr&) = delete;

    UniquePtr(UniquePtr&& other) noexcept : ptr(other.ptr) {
        other.ptr = nullptr;                          // the source gives up ownership
    }

    UniquePtr& operator=(UniquePtr&& other) noexcept {
        if (this != &other) {
            reset(other.release());
        }
        return *this;
    }

    T* get() const noexcept { return ptr; }
    T& operator*() const { return *ptr; }
    T* operator->() const noexcept { return ptr; }
    explicit operator bool() const noexcept { return ptr != nullptr; }

    T* release() noexcept {
        T* p = ptr;
        ptr = nullptr;
        return p;
    }

    void reset(T* p = nullptr) noexcept {
        T* old = ptr;
        ptr = p;                                       // assign first: safe even if ~T touches *this
        delete old;
    }

private:
    T* ptr = nullptr;
};

template <typename T, typename... Args>
UniquePtr<T> makeUnique(Args&&... args) {
    return UniquePtr<T>(new T(std::forward<Args>(args)...));   // perfect forwarding
}

struct Tracker {
    static inline int alive = 0;
    int v;
    explicit Tracker(int x) : v(x) { alive++; }
    ~Tracker() { alive--; }
};

int main() {
    {
        auto a = makeUnique<Tracker>(5);
        assert(Tracker::alive == 1 && a->v == 5);
        UniquePtr<Tracker> b = std::move(a);
        assert(!a && b && (*b).v == 5);
        b.reset(new Tracker(6));
        assert(Tracker::alive == 1 && b->v == 6);
        UniquePtr<Tracker> c;
        c = std::move(b);
        assert(Tracker::alive == 1);
    }
    assert(Tracker::alive == 0);                      // everything cleaned up
    std::printf("UniquePtr works, no leaks\n");
    return 0;
}
```

Talking points: move-only, `noexcept` moves (so `std::vector<UniquePtr<T>>` moves instead of failing to copy), self-move-assignment guard, `explicit operator bool`, and the custom-deleter template parameter + empty-base optimisation in the real one.

## 10. Implement a minimal `shared_ptr` (follow-up)

```cpp
#include <atomic>
#include <cassert>
#include <cstdio>
#include <utility>

template <typename T>
class SharedPtr {
    struct ControlBlock {
        std::atomic<long> count{1};
    };

public:
    SharedPtr() noexcept = default;
    explicit SharedPtr(T* p) : ptr(p), block(p ? new ControlBlock() : nullptr) {}

    SharedPtr(const SharedPtr& other) noexcept : ptr(other.ptr), block(other.block) {
        if (block) {
            block->count.fetch_add(1, std::memory_order_relaxed);   // relaxed is enough for increments
        }
    }

    SharedPtr(SharedPtr&& other) noexcept : ptr(other.ptr), block(other.block) {
        other.ptr = nullptr;
        other.block = nullptr;                                     // no count change on move
    }

    SharedPtr& operator=(SharedPtr other) noexcept {               // copy-and-swap handles copy AND move
        std::swap(ptr, other.ptr);
        std::swap(block, other.block);
        return *this;                                              // `other` releases our old object
    }

    ~SharedPtr() {
        release();
    }

    long useCount() const noexcept { return block ? block->count.load() : 0; }
    T* get() const noexcept { return ptr; }
    T& operator*() const { return *ptr; }
    T* operator->() const noexcept { return ptr; }

private:
    void release() noexcept {
        // acq_rel: the thread that drops the count to zero must see all writes made by other owners.
        if (block && block->count.fetch_sub(1, std::memory_order_acq_rel) == 1) {
            delete ptr;
            delete block;
        }
    }

    T* ptr = nullptr;
    ControlBlock* block = nullptr;
};

int main() {
    SharedPtr<int> a(new int(10));
    {
        SharedPtr<int> b = a;
        SharedPtr<int> c;
        c = b;
        assert(a.useCount() == 3 && *c == 10);
        SharedPtr<int> d = std::move(c);
        assert(a.useCount() == 3 && c.get() == nullptr);
    }
    assert(a.useCount() == 1);
    std::printf("SharedPtr works: count back to %ld\n", a.useCount());
    return 0;
}
```

What the real one adds: weak counts, type-erased deleters/allocators, `make_shared`'s combined allocation, aliasing, and converting constructors (`SharedPtr<Derived>` → `SharedPtr<Base>`).

---

## 11. Decision guide

```text
Do you need heap allocation at all?
 ├─ no  → plain object / container (std::vector, std::optional, std::array)
 └─ yes → who owns it?
          ├─ exactly one owner (most cases)   → std::unique_ptr<T>
          ├─ several owners, no clear one     → std::shared_ptr<T>
          │      └─ need back-references/caches → std::weak_ptr<T>
          └─ you're just using it              → T& or T* (non-owning)
```

---

## Practice

1. Wrap a POSIX-style handle API (`int open_resource()`, `void close_resource(int)`) in an RAII type using `unique_ptr` with a custom deleter, or write a small move-only handle class.
2. Build a doubly linked list where `next` is `std::unique_ptr<Node>` and `prev` is a raw `Node*`. Why is a raw `prev` safe here? What problem appears when destroying a list of 1,000,000 nodes, and how do you fix it?
3. Implement an observer pattern: a `Subject` holds `std::weak_ptr<Observer>`s and skips (and removes) expired ones when notifying.
4. What does this print and why? `auto p = std::make_shared<int>(1); std::weak_ptr<int> w = p; p.reset(); std::printf("%d %d\n", (int)w.expired(), (int)w.use_count());`
5. Add `weak_ptr` support to the minimal `SharedPtr`: a separate weak count, object deleted at strong 0, control block deleted when both reach 0.

:::details Show solution
1.
```cpp
#include <cstdio>
#include <memory>

int open_resource() { std::printf("  open -> handle 3\n"); return 3; }
void close_resource(int h) { std::printf("  close handle %d\n", h); }

class Handle {
public:
    explicit Handle(int h) : h(h) {}
    ~Handle() {
        if (h >= 0) {
            close_resource(h);
        }
    }
    Handle(const Handle&) = delete;
    Handle& operator=(const Handle&) = delete;
    Handle(Handle&& o) noexcept : h(o.h) { o.h = -1; }
    Handle& operator=(Handle&& o) noexcept {
        if (this != &o) {
            if (h >= 0) {
                close_resource(h);
            }
            h = o.h;
            o.h = -1;
        }
        return *this;
    }
    int get() const { return h; }
private:
    int h;
};

int main() {
    Handle a(open_resource());
    Handle b = std::move(a);          // only b closes it
    std::printf("  using handle %d\n", b.get());
    return 0;
}
```
(`unique_ptr` needs a pointer-like type, so an `int` handle is cleaner as a tiny move-only class like this.)
2. The list owns every node through the `next` chain. A node's `prev` points at the node that owns it, and an owner always outlives what it owns, so `prev` can never dangle while the list is intact — it only observes, so a raw pointer is the right type. Destroying the head destroys `next`, which destroys its `next`… recursively: 1,000,000 nested destructor calls overflow the stack. Fix: write `~List()` iteratively — repeatedly `head = std::move(head->next);`.
3. Store `std::vector<std::weak_ptr<Observer>>`; in `notify()`, `lock()` each one; if the result is empty, erase it (use `std::erase_if` with `w.expired()`), otherwise call it.
4. `1 0`: the object was destroyed when the last `shared_ptr` was reset, so the `weak_ptr` is expired and its use count is 0.
5. Add `std::atomic<long> weak{1}` (the "+1" represents all strong owners together). When strong drops to 0, delete the object, then decrement weak; whoever drops weak to 0 deletes the block. `lock()` must increment strong only if it's non-zero (a compare-exchange loop).
:::

---

## Interview Q&A

- **Why is `unique_ptr` move-only?** Exclusive ownership: copying would create two owners → double delete.
- **Is `shared_ptr` thread-safe?** The reference count is. Concurrent reads of the same `shared_ptr` object are fine; concurrent writes to the *same instance* need synchronisation (or `atomic<shared_ptr>`). The pointee has no protection.
- **When would you use `weak_ptr`?** Caches, observers, back-pointers, breaking cycles.
- **`make_shared` downside?** Memory held until the last `weak_ptr` dies; can't use a custom deleter.
- **Can `unique_ptr` be used with incomplete types (PImpl)?** Yes, but the destructor of the owning class must be defined where `T` is complete (define `~Widget()` in the .cpp, even as `= default`).
- **What's in a `shared_ptr` control block?** The strong count, the weak count, and the deleter/allocator (and, with `make_shared`, the object itself in the same allocation).
- **Why is `shared_ptr<T>(this)` a bug, and what do you use instead?** It creates a second, independent control block, so the object gets deleted twice; inherit from `enable_shared_from_this` and call `shared_from_this()`.
- **How do you choose the parameter type for a function that uses an object owned by a smart pointer?** If it doesn't affect ownership, take `T&`/`const T&` (or `T*` if optional); take `unique_ptr<T>` by value to take ownership, `shared_ptr<T>` by value to share it.
- **What's the size of `unique_ptr<T>` and `shared_ptr<T>`?** `unique_ptr` with a stateless deleter is one pointer (8 bytes on 64-bit); `shared_ptr` is two pointers (16 bytes) plus a separately (or jointly, with `make_shared`) allocated control block.
- **Why should a polymorphic base class have a virtual destructor when used with smart pointers?** Deleting a derived object through a base pointer without a virtual destructor is undefined behaviour — the derived destructor won't run. (`shared_ptr` created from `make_shared<Derived>` happens to remember the right deleter, but `unique_ptr<Base>` does not.)

---

## External resources

- **cppreference — `std::unique_ptr`, `std::shared_ptr`, `std::weak_ptr`, `std::enable_shared_from_this`.**
- **C++ Core Guidelines, section R (Resource management)**, especially R.20–R.37 on smart pointers and parameter passing.
- **Herb Sutter — GotW #89–#91** ("Smart Pointers", "Smart Pointer Parameters") at herbsutter.com.
- **Scott Meyers — *Effective Modern C++*, Items 18–22** (unique_ptr, shared_ptr, weak_ptr, make functions, PImpl).
- **Herb Sutter — "Leak-Freedom in C++... By Default"** (CppCon 2016 talk): ownership patterns, cycles and deferred destruction.
