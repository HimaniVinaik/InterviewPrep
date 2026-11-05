# References & Move Semantics

Move semantics (C++11) let objects **transfer** their resources instead of copying them. They're why returning a `std::vector` by value is cheap and why `std::unique_ptr` can exist.

## 1. Lvalues and rvalues

- **lvalue:** has identity — you can take its address. Variables, `*p`, `a[i]`, functions returning `T&`.
- **prvalue (pure rvalue):** a temporary with no identity. `42`, `x + y`, `std::string("hi")`, functions returning `T`.
- **xvalue ("expiring"):** has identity but can be moved from. `std::move(x)`, functions returning `T&&`.

*glvalue* = lvalue ∪ xvalue; *rvalue* = prvalue ∪ xvalue.

```cpp
int x = 5;
int& lr = x;          // lvalue reference: binds to lvalues
// int& bad = 5;      // error: can't bind non-const lvalue ref to rvalue
const int& cr = 5;    // OK: const lvalue ref binds to anything (extends temporary lifetime)
int&& rr = 5;         // rvalue reference: binds to rvalues
// int&& bad2 = x;    // error
int&& ok = std::move(x);  // std::move casts x to an xvalue
```

> **Key:** A *named* rvalue reference is itself an **lvalue**. Inside `void f(std::string&& s)`, `s` is an lvalue — you must `std::move(s)` again to move from it.

## 2. What `std::move` actually does

Nothing at runtime. It is just a cast:

```cpp
template <class T>
constexpr std::remove_reference_t<T>&& move(T&& t) noexcept {
    return static_cast<std::remove_reference_t<T>&&>(t);
}
```

It *permits* moving by selecting the `T&&` overload. The move constructor does the real work.

## 3. Move constructor & move assignment

```cpp
class Buffer {
    size_t size_ = 0;
    int* data_ = nullptr;
public:
    explicit Buffer(size_t n) : size_(n), data_(new int[n]{}) {}
    ~Buffer() { delete[] data_; }

    // Copy: deep copy
    Buffer(const Buffer& o) : size_(o.size_), data_(new int[o.size_]) {
        std::copy(o.data_, o.data_ + size_, data_);
    }
    Buffer& operator=(const Buffer& o) {
        if (this != &o) {
            Buffer tmp(o);          // copy-and-swap: strong exception guarantee
            swap(tmp);
        }
        return *this;
    }

    // Move: steal the pointer, leave the source empty but valid
    Buffer(Buffer&& o) noexcept
        : size_(std::exchange(o.size_, 0)), data_(std::exchange(o.data_, nullptr)) {}
    Buffer& operator=(Buffer&& o) noexcept {
        if (this != &o) {
            delete[] data_;
            size_ = std::exchange(o.size_, 0);
            data_ = std::exchange(o.data_, nullptr);
        }
        return *this;
    }

    void swap(Buffer& o) noexcept { std::swap(size_, o.size_); std::swap(data_, o.data_); }
};
```

### Why `noexcept` matters

`std::vector::push_back` provides the strong exception guarantee. When it reallocates, it will only **move** elements if the move constructor is `noexcept` — otherwise it **copies** (via `std::move_if_noexcept`). Forgetting `noexcept` can silently make your vector growth O(n) deep copies.

### Moved-from state

A moved-from standard library object is in a *valid but unspecified* state: you may destroy it or assign to it; don't rely on its value. Your own types should leave moved-from objects destructible and assignable.

## 4. Rule of Zero / Three / Five

| Rule | Statement |
|---|---|
| **Zero** | If your class only holds RAII members (`std::string`, `std::vector`, `unique_ptr`), declare **none** of the special members. The compiler-generated ones are correct. ← *preferred* |
| **Three** (C++98) | If you need a custom destructor, copy constructor, or copy assignment, you probably need all three. |
| **Five** (C++11) | …plus move constructor and move assignment. |

```cpp
// Rule of Zero: no destructor, no copy/move code — all correct by construction
class Person {
    std::string name_;
    std::vector<std::string> emails_;
    std::unique_ptr<Avatar> avatar_;   // makes Person move-only automatically
};
```

### Implicit generation rules (simplified)

- Declaring a **destructor** or **copy operation** suppresses implicit **move** operations (moves fall back to copies!).
- Declaring a **move operation** deletes the implicit **copy** operations.
- `= default` and `= delete` let you state intent explicitly.

## 5. Copy elision and RVO

```cpp
Buffer make() { return Buffer(1000); }   // C++17: guaranteed elision — no copy, no move
Buffer b = make();                         // constructed directly in b

Buffer make2() {
    Buffer local(1000);
    return local;          // NRVO (named RVO): usually elided; if not, it's MOVED automatically
}
```

> **Warning:** Don't write `return std::move(local);` — it *prevents* NRVO and forces a move. Locals and by-value parameters are already treated as rvalues in `return` statements. Use `std::move` only when returning something that is neither, e.g. a data member you want to move out (`return std::move(member_);`).

## 6. Forwarding references & perfect forwarding

`T&&` where `T` is a **deduced template parameter** (or `auto&&`) is a *forwarding reference*, not an rvalue reference. It binds to anything, and `std::forward<T>` restores the original value category.

```cpp
template <class T, class... Args>
std::unique_ptr<T> my_make_unique(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

void sink(const std::string&) { std::puts("copy"); }
void sink(std::string&&)      { std::puts("move"); }

template <class T> void relay(T&& x) { sink(std::forward<T>(x)); }

std::string s = "hi";
relay(s);              // T = std::string&  -> forwards as lvalue -> "copy"
relay(std::string{});  // T = std::string   -> forwards as rvalue -> "move"
```

**Reference collapsing:** `& &` → `&`, `& &&` → `&`, `&& &` → `&`, `&& &&` → `&&`. That's how `T&&` with `T = std::string&` becomes `std::string&`.

## 7. Practical guidelines

- **Parameters you will store:** take by value and move: `Widget(std::string name) : name_(std::move(name)) {}` — one copy for lvalues, zero for rvalues.
- **Read-only parameters:** `const T&` (or `std::string_view` / `std::span`).
- **Sink parameters for move-only types:** `std::unique_ptr<T>` by value.
- Use `emplace_back(args...)` to construct in place; `push_back(std::move(x))` to move an existing object.
- Never use an object after moving from it (except to reassign or destroy).
- Mark move operations `noexcept`.

## Interview Q&A

- **Does `std::move` move?** No — it casts to an rvalue so a move overload can be selected.
- **Why is `const T&&` almost useless?** You can't steal from a const object, so it binds rvalues but can't move.
- **What happens if you `std::move` a `const` object?** You get `const T&&`, which picks the **copy** constructor. Silent copy!
- **Is `T&&` always an rvalue reference?** Only when `T` isn't deduced. In templates/`auto&&` it's a forwarding reference.
- **What's the cost of moving a `std::vector`?** O(1): three pointers swapped. Moving a `std::array<int, 1000>` is O(n) — it has no heap buffer to steal.
