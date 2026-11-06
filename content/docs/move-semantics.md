# References & Move Semantics

> **Key idea:** copying a big object (a `std::vector` with a million elements) means allocating and copying a million elements. But if the source is about to be thrown away anyway — a temporary, or something you explicitly say you're done with — you can **steal** its internals (one pointer swap) instead. That's **move semantics**. To make it work, C++ classifies every expression as an *lvalue* ("has a name, will live on") or an *rvalue* ("temporary, about to die"), and lets you overload on the difference with `T&&`.

**What you'll be able to do after this guide**
- Classify expressions as lvalues/rvalues and explain value categories.
- Write correct move constructors and move assignment, with `noexcept`.
- Apply the Rule of Zero / Three / Five and know which special members the compiler generates.
- Explain copy elision, RVO/NRVO, and why `return std::move(x)` is usually wrong.
- Use forwarding references and `std::forward` for perfect forwarding.
- Choose parameter-passing styles (by value, `const&`, `&&`) for performance.

---

## 1. References first

A **reference** is another name for an existing object. It must be initialised, can't be reseated, and can't be null.

```cpp
#include <cstdio>
#include <string>

void addExclamation(std::string& s) {      // lvalue reference: modifies the caller's object
    s += "!";
}

std::size_t length(const std::string& s) { // const reference: read-only, no copy, accepts temporaries too
    return s.size();
}

int main() {
    std::string greeting = "hi";
    std::string& alias = greeting;           // alias and greeting are the same object
    alias += " there";
    addExclamation(greeting);
    std::printf("%s (length %zu)\n", greeting.c_str(), length(greeting));
    std::printf("temporary length: %zu\n", length(std::string("abc")));   // const& binds to a temporary
    // std::string& bad = std::string("x");  // error: a non-const lvalue reference can't bind to a temporary
    return 0;
}
```

| Reference type | Binds to | Typical use |
|---|---|---|
| `T&` | modifiable lvalues only | output/in-out parameters |
| `const T&` | anything (lvalues, rvalues, temporaries) | read-only parameters |
| `T&&` (non-template) | rvalues only | move constructors, sink overloads |
| `T&&` / `auto&&` (deduced) | anything — a **forwarding reference** | perfect forwarding |

---

## 2. Lvalues and rvalues

Rough but useful test: **if you can take its address with `&`, it's an lvalue.**

| Expression | Category | Why |
|---|---|---|
| `x`, `v[0]`, `*p`, `obj.member` | lvalue | names a lasting object |
| `++x`, `x = 3` | lvalue | refers back to x |
| `42`, `x + y`, `f()` returning by value | prvalue (pure rvalue) | a temporary value |
| `x++` | prvalue | a copy of the old value |
| `std::move(x)`, `static_cast<T&&>(x)` | xvalue ("eXpiring") | an lvalue you declared done with |
| `"text"` | **lvalue** (a `const char[5]` array in static storage) | surprise! |

```text
                expression
              /            \
         glvalue          rvalue
        /       \        /      \
   lvalue        xvalue        prvalue
 (has identity, (has identity,  (no identity:
  can't move)    movable)        a temporary value)
```

> **Key:** a **named rvalue reference is an lvalue**. Inside `void f(std::string&& s)`, the expression `s` has a name, so it's an lvalue — to move from it again you must write `std::move(s)`. This trips up almost everyone.

```cpp
#include <cstdio>
#include <string>
#include <utility>

void which(const std::string&) { std::printf("  lvalue overload\n"); }
void which(std::string&&) { std::printf("  rvalue overload\n"); }

void forwardIt(std::string&& s) {
    which(s);              // s has a NAME -> lvalue overload!
    which(std::move(s));   // now an rvalue
}

int main() {
    std::string name = "a";
    std::printf("which(name):\n");
    which(name);
    std::printf("which(std::string(\"b\")):\n");
    which(std::string("b"));
    std::printf("which(std::move(name)):\n");
    which(std::move(name));
    std::printf("inside forwardIt:\n");
    forwardIt(std::string("c"));
    return 0;
}
```

---

## 3. What `std::move` actually does

**Nothing at run time.** It's just a cast to an rvalue reference:

```cpp
// no-test (how the standard library defines it, simplified)
template <typename T>
constexpr std::remove_reference_t<T>&& move(T&& t) noexcept {
    return static_cast<std::remove_reference_t<T>&&>(t);
}
```

It says "I'm done with this object; you may steal from it". The actual stealing happens only if the receiving side has a **move constructor or move assignment** that picks the `T&&` overload.

```cpp
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<int> big(1'000'000, 7);
    const int* before = big.data();

    std::vector<int> copied = big;                 // allocates and copies 1,000,000 ints
    std::vector<int> moved = std::move(big);       // steals the buffer: O(1)

    std::printf("moved.data() == original buffer? %s\n", moved.data() == before ? "yes" : "no");
    std::printf("big after move: size %zu (valid but unspecified; in practice empty)\n", big.size());
    std::printf("copied has its own buffer? %s\n", copied.data() != before ? "yes" : "no");

    // A moved-from object is still usable: assign to it, clear it, or destroy it.
    big = {1, 2, 3};
    std::printf("big reused: size %zu\n", big.size());

    const std::string constName = "constant";
    std::string stolen = std::move(constName);     // const T&& -> binds to the COPY constructor!
    std::printf("const source still intact: %s\n", constName.c_str());
    return 0;
}
```

---

## 4. Writing a move constructor and move assignment

A class managing a resource directly must define its copy and move operations. Here's a complete, correct example:

```cpp
#include <algorithm>
#include <cstddef>
#include <cstdio>
#include <utility>

class Buffer {
public:
    explicit Buffer(std::size_t n) : size(n), data(new int[n]()) {
        std::printf("  allocate %zu\n", n);
    }

    ~Buffer() {
        delete[] data;                                     // fine for nullptr too
    }

    // Copy constructor: deep copy.
    Buffer(const Buffer& other) : size(other.size), data(new int[other.size]) {
        std::copy(other.data, other.data + size, data);
        std::printf("  copy %zu\n", size);
    }

    // Move constructor: steal, then leave the source empty but valid.
    Buffer(Buffer&& other) noexcept
        : size(std::exchange(other.size, 0)),
          data(std::exchange(other.data, nullptr)) {      // exchange: take value, set the source
        std::printf("  move %zu\n", size);
    }

    // Copy assignment (copy-and-swap: strong exception guarantee).
    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            Buffer temp(other);                           // may throw — *this untouched
            swap(temp);
        }
        return *this;
    }

    // Move assignment: free our old buffer, steal the other's.
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {                             // guard against self-move (x = std::move(x))
            delete[] data;
            size = std::exchange(other.size, 0);
            data = std::exchange(other.data, nullptr);
        }
        return *this;
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

Buffer makeBuffer(std::size_t n) {
    Buffer b(n);
    return b;                                              // NRVO, or an implicit move — never a copy
}

int main() {
    std::printf("construct a:\n");
    Buffer a(3);
    std::printf("b = a (copy):\n");
    Buffer b = a;
    std::printf("c = std::move(a):\n");
    Buffer c = std::move(a);
    std::printf("b = makeBuffer(5):\n");
    b = makeBuffer(5);                                     // move assignment from a temporary
    std::printf("sizes: a=%zu b=%zu c=%zu\n", a.length(), b.length(), c.length());
    return 0;
}
```

### Why `noexcept` matters

When `std::vector` grows, it must transfer elements to the new buffer while keeping the **strong exception guarantee**: if anything throws, the old vector must be untouched. Moving elements destroys the originals, so if a move could throw half-way, the guarantee would be broken. Therefore `vector` uses `std::move_if_noexcept`: it **moves only if the move constructor is `noexcept`**, otherwise it **copies**.

```cpp
#include <cstdio>
#include <vector>

struct NoexceptMove {
    NoexceptMove() = default;
    NoexceptMove(const NoexceptMove&) { std::printf("c"); }
    NoexceptMove(NoexceptMove&&) noexcept { std::printf("m"); }
};

struct ThrowingMove {
    ThrowingMove() = default;
    ThrowingMove(const ThrowingMove&) { std::printf("c"); }
    ThrowingMove(ThrowingMove&&) { std::printf("m"); }       // not noexcept
};

int main() {
    std::vector<NoexceptMove> a(4);
    std::printf("noexcept move, growing: ");
    a.push_back({});                     // reallocation: the 4 old elements are MOVED (m)
    std::printf("\n");

    std::vector<ThrowingMove> b(4);
    std::printf("throwing move, growing: ");
    b.push_back({});                     // reallocation: the 4 old elements are COPIED (c)
    std::printf("\n");
    return 0;
}
```

Output: `mmmmm` then `mcccc`. The first letter is the new element (a temporary, always moved in); the next four are the old elements being relocated — moved when the move constructor is `noexcept`, copied when it isn't.

So: **mark move constructors and move assignment `noexcept`** (they almost never need to throw). Same for `swap`.

### The moved-from state

After a move, the source must be **valid but unspecified**: you may destroy it, assign to it, or call functions without preconditions (`clear()`, `size()`), but don't rely on its value. Standard types document stronger guarantees in places (`std::unique_ptr` and `std::shared_ptr` are guaranteed null; moved-from `std::vector`/`std::string` are empty in practice).

---

## 5. The Rule of Zero, Three and Five

The **special member functions**: default constructor, destructor, copy constructor, copy assignment, move constructor, move assignment.

| Rule | When | What to write |
|---|---|---|
| **Rule of Zero** | your members already manage themselves (`std::string`, `std::vector`, `std::unique_ptr`) | **nothing** — the compiler-generated versions are correct. This should be most classes. |
| **Rule of Three** (pre-C++11) | you manage a resource by hand | destructor + copy constructor + copy assignment |
| **Rule of Five** (C++11+) | you manage a resource by hand | the three above + move constructor + move assignment |

```cpp
#include <cstdio>
#include <memory>
#include <string>
#include <vector>

// Rule of Zero: every member cleans up after itself, so the class needs no special members.
class Document {
public:
    Document(std::string title, std::vector<std::string> lines)
        : title(std::move(title)), lines(std::move(lines)) {}
    std::size_t lineCount() const { return lines.size(); }
private:
    std::string title;
    std::vector<std::string> lines;
    std::unique_ptr<int> cache;            // move-only member -> Document is automatically move-only
};

int main() {
    Document d("notes", {"a", "b", "c"});
    Document moved = std::move(d);         // generated move constructor: moves every member
    // Document copy = moved;              // error: unique_ptr member makes copying deleted
    std::printf("moved has %zu lines\n", moved.lineCount());
    return 0;
}
```

### What the compiler generates (simplified)

| You declare… | Default ctor | Destructor | Copy ctor/assign | Move ctor/assign |
|---|---|---|---|---|
| nothing | yes | yes | yes | yes |
| any constructor | **no** | yes | yes | yes |
| destructor | yes | — | yes (deprecated) | **not declared** → copies are used instead! |
| copy ctor or copy assign | yes | yes | — | **not declared** → copies are used |
| move ctor or move assign | yes | yes | **deleted** | — |

The dangerous row: **declaring a destructor (even `~T() = default;`) silently removes the moves**, so your "moves" become copies. If you declare any of the five, declare (or `= default`) all of them.

```cpp
#include <cstdio>
#include <type_traits>
#include <vector>

struct Plain {
    std::vector<int> v;
};

struct WithDestructor {
    std::vector<int> v;
    ~WithDestructor() {}          // user-declared destructor: implicit moves are NOT generated
};

struct Fixed {
    std::vector<int> v;
    ~Fixed() {}
    Fixed() = default;
    Fixed(const Fixed&) = default;
    Fixed& operator=(const Fixed&) = default;
    Fixed(Fixed&&) noexcept = default;          // bring the moves back explicitly
    Fixed& operator=(Fixed&&) noexcept = default;
};

int main() {
    WithDestructor a{std::vector<int>(1000)};
    const int* before = a.v.data();
    WithDestructor b = std::move(a);            // copies the vector! (no move constructor exists)
    std::printf("WithDestructor: buffer stolen? %s\n", b.v.data() == before ? "yes" : "no (copied)");

    Fixed c{};
    c.v.resize(1000);
    before = c.v.data();
    Fixed d = std::move(c);
    std::printf("Fixed:          buffer stolen? %s\n", d.v.data() == before ? "yes" : "no");

    std::printf("nothrow move constructible: Plain=%d WithDestructor=%d Fixed=%d\n",
                std::is_nothrow_move_constructible_v<Plain>,
                std::is_nothrow_move_constructible_v<WithDestructor>,
                std::is_nothrow_move_constructible_v<Fixed>);
    return 0;
}
```

---

## 6. Copy elision and return value optimisation

Returning a local object by value is cheap — the compiler constructs it **directly in the caller's storage**.

| Case | Guarantee |
|---|---|
| `return T(args);` / `return makeT();` (returning a prvalue) | **mandatory** elision since C++17 (works even for non-movable types) |
| `return local;` (named local, NRVO) | allowed, very commonly done; if not elided, the local is **implicitly moved** |
| `T x = T(args);` | mandatory elision since C++17 |

```cpp
#include <cstdio>
#include <utility>

struct Loud {
    Loud() { std::printf("  default construct\n"); }
    Loud(const Loud&) { std::printf("  COPY\n"); }
    Loud(Loud&&) noexcept { std::printf("  move\n"); }
};

Loud prvalue() {
    return Loud();                        // guaranteed: constructed directly in the caller
}

Loud named() {
    Loud local;
    return local;                         // NRVO (usually elided) or implicit move — never a copy
}

Loud pessimised() {
    Loud local;
    return std::move(local);              // DON'T: disables NRVO, forces a move
}

int main() {
    std::printf("prvalue():\n");
    Loud a = prvalue();
    std::printf("named():\n");
    Loud b = named();
    std::printf("pessimised():\n");
    Loud c = pessimised();
    return 0;
}
```

> **Rule:** never write `return std::move(local);` for a local variable or by-value parameter. It's at best useless and at worst prevents elision. (`-Wpessimizing-move` warns about it.) Do use `std::move` when returning a **member** or something accessed through a reference, which wouldn't be moved implicitly.

---

## 7. Forwarding references and perfect forwarding

In a **template** where `T` is deduced, `T&&` is a **forwarding reference** (also called a universal reference): it binds to anything, and `T` remembers whether the argument was an lvalue or an rvalue.

**Reference collapsing** rules make that work:

```text
T = int&   →  T&& = int& &&  → int&     (lvalue argument)
T = int    →  T&& = int&&               (rvalue argument)
```

`std::forward<T>(x)` re-applies the original category: rvalue if the caller passed an rvalue, lvalue otherwise. That's **perfect forwarding** — used by `make_unique`, `emplace_back`, `std::thread`, wrappers and factories.

```cpp
#include <cstdio>
#include <memory>
#include <string>
#include <utility>

void sink(const std::string& s) { std::printf("  copy-sink(%s)\n", s.c_str()); }
void sink(std::string&& s) { std::printf("  move-sink(%s)\n", s.c_str()); }

template <typename T>
void wrapperBad(T&& arg) {
    sink(arg);                             // always lvalue: rvalues get copied
}

template <typename T>
void wrapperGood(T&& arg) {
    sink(std::forward<T>(arg));            // preserves lvalue/rvalue-ness
}

// A tiny make_unique: forward any arguments to T's constructor.
template <typename T, typename... Args>
std::unique_ptr<T> myMakeUnique(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

int main() {
    std::string name = "lvalue";
    std::printf("wrapperBad:\n");
    wrapperBad(name);
    wrapperBad(std::string("temp"));       // copied — wasteful
    std::printf("wrapperGood:\n");
    wrapperGood(name);
    wrapperGood(std::string("temp"));      // moved
    auto p = myMakeUnique<std::string>(5, 'x');
    std::printf("myMakeUnique: %s\n", p->c_str());
    return 0;
}
```

> **Pitfall:** `std::forward` an argument **once**. Forwarding the same rvalue twice may move from it twice. And `T&&` is only a forwarding reference when `T` is deduced *for that function call* — `std::vector<T>&&`, or `T&&` in a non-template member of a class template, are plain rvalue references.

### `auto&&`

`auto&&` is also a forwarding reference — used in range-for loops over containers whose elements may be proxies (`std::vector<bool>`) or in generic lambdas:

```cpp
#include <cstdio>
#include <utility>
#include <vector>

int main() {
    std::vector<bool> flags = {true, false, true};
    for (auto&& f : flags) {               // works even though *it is a proxy object, not bool&
        f = !f;
    }
    std::printf("%d %d %d\n", (int)flags[0], (int)flags[1], (int)flags[2]);

    auto log = [](auto&&... args) {        // generic variadic lambda forwarding its arguments
        ((std::printf("%d ", static_cast<int>(std::forward<decltype(args)>(args)))), ...);
        std::printf("\n");
    };
    log(1, 2, 3);
    return 0;
}
```

---

## 8. Parameter passing: what to choose

| Situation | Signature | Cost for lvalue arg | Cost for rvalue arg |
|---|---|---|---|
| Cheap to copy (int, double, pointers, small structs ≤ 2–3 words) | `void f(T x)` | copy | copy |
| Read-only | `void f(const T& x)` | none | none |
| Modify caller's object | `void f(T& x)` | none | n/a |
| **Sink** (store a copy) — simple | `void f(T x)` then `std::move(x)` into place | copy + move | move + move |
| Sink — optimal | overload `f(const T&)` + `f(T&&)` | copy | move |
| Generic forwarding | `template<class U> void f(U&& x)` + `std::forward` | copy | move |

The "pass by value and move" idiom is the simple, almost-optimal default for sinks such as constructors:

```cpp
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

class Person {
public:
    explicit Person(std::string name) : name(std::move(name)) {}   // one constructor handles both cases
    const std::string& getName() const { return name; }            // return by const& to avoid copies
    void addTag(std::string tag) { tags.push_back(std::move(tag)); }
private:
    std::string name;
    std::vector<std::string> tags;
};

int main() {
    std::string n = "Ada Lovelace";
    Person a(n);                         // n is copied into the parameter, then moved into the member
    Person b("Grace Hopper");             // the temporary is moved twice — no copies at all
    a.addTag("mathematician");
    std::printf("%s / %s (n still usable: %s)\n", a.getName().c_str(), b.getName().c_str(), n.c_str());
    return 0;
}
```

---

## 9. `emplace` vs `push`

`push_back(x)` copies or moves an existing object into the container; `emplace_back(args...)` **constructs** the element in place from constructor arguments (perfect forwarding).

```cpp
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

struct Entry {
    std::string key;
    int value;
    Entry(std::string k, int v) : key(std::move(k)), value(v) { std::printf("  construct %s\n", key.c_str()); }
    Entry(const Entry& o) : key(o.key), value(o.value) { std::printf("  copy %s\n", key.c_str()); }
    Entry(Entry&& o) noexcept : key(std::move(o.key)), value(o.value) { std::printf("  move\n"); }
};

int main() {
    std::vector<Entry> v;
    v.reserve(4);                          // avoid reallocation noise
    std::printf("push_back(Entry(...)):\n");
    v.push_back(Entry("a", 1));            // construct temporary + move
    std::printf("emplace_back(...):\n");
    v.emplace_back("b", 2);                // construct directly in the vector
    Entry e("c", 3);
    std::printf("push_back(e):\n");
    v.push_back(e);                        // copy (e is an lvalue)
    std::printf("push_back(std::move(e)):\n");
    v.push_back(std::move(e));             // move
    return 0;
}
```

Prefer `emplace_back` when you have constructor arguments; for an existing object, `push_back(std::move(x))` is equally good and clearer. Beware: `emplace_back` can call `explicit` constructors you didn't intend (e.g. `std::vector<std::unique_ptr<T>> v; v.emplace_back(rawPtr);` compiles silently).

---

## 10. Interview checklist

- [ ] Lvalue vs rvalue; a named rvalue reference is an lvalue.
- [ ] `std::move` is a cast; moving happens in the move constructor/assignment.
- [ ] Moved-from objects are valid but unspecified.
- [ ] `noexcept` moves so `vector` reallocation moves instead of copies.
- [ ] Rule of Zero first; declaring a destructor suppresses implicit moves.
- [ ] RVO/NRVO; never `return std::move(local)`.
- [ ] Forwarding references, reference collapsing, `std::forward`.
- [ ] Parameter passing table, sink "by value and move".

---

## Practice

1. Implement a `String` class with a `char*` buffer: constructor from `const char*`, destructor, copy and move constructors, copy and move assignment. Count allocations in a test.
2. Explain the output of `std::vector<std::string> v; std::string s = "hello"; v.push_back(std::move(s)); std::printf("[%s]\n", s.c_str());` — is it guaranteed?
3. Write `template <typename F, typename... Args> auto timeCall(F&& f, Args&&... args)` that calls `f` with perfectly forwarded arguments and prints the elapsed time, returning `f`'s result.
4. A class has members `std::string name; std::mutex m;`. Which special members does the compiler generate? How would you make the class movable?
5. Why does `std::swap` for most types not need a temporary *copy* any more?

:::details Show solution
1.
```cpp
#include <cassert>
#include <cstring>
#include <utility>

static int allocations = 0;

class String {
public:
    String(const char* s = "") : len(std::strlen(s)), data(new char[len + 1]) {
        allocations++;
        std::memcpy(data, s, len + 1);
    }
    ~String() { delete[] data; }
    String(const String& o) : len(o.len), data(new char[o.len + 1]) {
        allocations++;
        std::memcpy(data, o.data, len + 1);
    }
    String(String&& o) noexcept : len(std::exchange(o.len, 0)), data(std::exchange(o.data, nullptr)) {}
    String& operator=(String o) noexcept {          // copy-and-swap covers copy AND move assignment
        std::swap(len, o.len);
        std::swap(data, o.data);
        return *this;
    }
    const char* c_str() const { return data ? data : ""; }
private:
    std::size_t len;
    char* data;
};

int main() {
    String a("hello");                   // 1 allocation
    String b = a;                        // 2
    String c = std::move(a);             // still 2: moved
    b = String("world");                 // 3: the temporary; then moved in
    assert(allocations == 3);
    assert(std::strcmp(c.c_str(), "hello") == 0 && std::strcmp(b.c_str(), "world") == 0);
    assert(std::strcmp(a.c_str(), "") == 0);   // moved-from: valid
    return 0;
}
```
2. It prints `[]` with all mainstream implementations, but the standard only guarantees `s` is in a *valid but unspecified* state, so you mustn't rely on it being empty. Short strings may even be copied rather than moved, leaving the old contents.
3.
```cpp
#include <chrono>
#include <cstdio>
#include <utility>

template <typename F, typename... Args>
decltype(auto) timeCall(F&& f, Args&&... args) {
    auto start = std::chrono::steady_clock::now();
    struct Report {
        std::chrono::steady_clock::time_point s;
        ~Report() {
            auto us = std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - s).count();
            std::printf("took %lld us\n", static_cast<long long>(us));
        }
    } report{start};                     // prints even for void functions or if f throws
    return std::forward<F>(f)(std::forward<Args>(args)...);
}

int main() {
    int r = timeCall([](int a, int b) { return a + b; }, 2, 3);
    std::printf("result %d\n", r);
    return 0;
}
```
4. `std::mutex` is neither copyable nor movable, so the class's copy and move operations are all **deleted** (default ctor and destructor are still generated). To make it movable, write a move constructor that moves `name` and default-constructs a fresh mutex (the mutex itself is never moved), or hold `std::unique_ptr<std::mutex>`.
5. Since C++11 `std::swap` is `T tmp = std::move(a); a = std::move(b); b = std::move(tmp);` — three moves, no deep copies. Types like `std::vector` also provide member/ADL `swap` overloads that just swap pointers.
:::

---

## Interview Q&A

- **Does `std::move` move?** No — it casts to an rvalue so a move overload can be selected.
- **Why is `const T&&` almost useless?** You can't steal from a const object, so it binds rvalues but can't move.
- **What happens if you `std::move` a `const` object?** You get `const T&&`, which picks the **copy** constructor. Silent copy!
- **Is `T&&` always an rvalue reference?** Only when `T` isn't deduced. In templates/`auto&&` it's a forwarding reference.
- **What's the cost of moving a `std::vector`?** O(1): three pointers swapped. Moving a `std::array<int, 1000>` is O(n) — it has no heap buffer to steal.
- **Why should move constructors be `noexcept`?** `std::vector` (and other containers) only move elements during reallocation if the move can't throw; otherwise they copy to keep the strong exception guarantee.
- **What's the Rule of Zero?** Design classes whose members manage their own resources (containers, smart pointers), so you write no destructor, copy or move operations at all.
- **What does declaring a destructor do to the implicit move operations?** It stops them from being generated, so moves silently fall back to copies — `= default` the moves explicitly if you need a destructor.
- **Is a named rvalue reference an lvalue or an rvalue?** An lvalue — it has a name; use `std::move` (or `std::forward`) to pass it on as an rvalue.
- **Why is `return std::move(local);` a bad idea?** It prevents named return value optimisation and forces a move; returning the local by name already moves it implicitly when elision doesn't happen.
- **What state is a moved-from object in?** Valid but unspecified: it can be destroyed or assigned to, but its value shouldn't be relied on (except where documented, e.g. moved-from smart pointers are null).
- **`emplace_back` vs `push_back`?** `emplace_back` constructs the element in place from constructor arguments; `push_back` copies or moves an existing object. They're equivalent when you already have the object (use `push_back(std::move(x))`).

---

## External resources

- **cppreference — Value categories, Move constructors, Copy elision, `std::move`, `std::forward`.**
- **Scott Meyers — *Effective Modern C++*, Items 23–30** (rvalue references, move semantics, perfect forwarding).
- **Howard Hinnant — "Everything You Ever Wanted To Know About Move Semantics"** (talk) and his special-member-function table.
- **Thomas Becker — "C++ Rvalue References Explained"** (thbecker.net): the classic tutorial.
- **C++ Core Guidelines — C.20–C.22 (Rule of Zero/Five), F.15–F.19 (parameter passing).**
