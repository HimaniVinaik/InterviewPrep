# Lambdas & Functional C++

A lambda is an anonymous function object written inline. They're everywhere in modern C++: STL algorithm predicates, callbacks, thread bodies, custom comparators and deleters. Interviewers test **capture semantics** and **what the compiler generates**.

## 1. Syntax

```cpp
[captures] (params) specifiers -> ReturnType { body }

auto add = [](int a, int b) { return a + b; };           // return type deduced
auto div = [](double a, double b) -> double { return a / b; };
auto hello = [] { std::puts("hi"); };                     // () optional if no params
std::cout << add(2, 3);                                   // 5
```

## 2. What a lambda really is

The compiler turns every lambda into a unique, unnamed **class** with an `operator()` (a *closure type*). Captures become data members.

```cpp
int factor = 3;
auto scale = [factor](int x) { return x * factor; };

// is roughly equivalent to:
class __Lambda_42 {
    int factor;                                   // captured by value
public:
    explicit __Lambda_42(int f) : factor(f) {}
    int operator()(int x) const { return x * factor; }   // const by default!
};
auto scale2 = __Lambda_42{factor};
```

Consequences:
- Each lambda has its own unique type — use `auto` (or a template / `std::function`) to store it.
- `sizeof` a lambda = size of its captures (a captureless lambda is 1 byte, empty).
- `operator()` is `const` by default → you can't modify by-value captures unless you add `mutable`.
- A **captureless** lambda converts implicitly to a plain function pointer (handy for C APIs).

```cpp
int (*fp)(int, int) = [](int a, int b) { return a * b; };   // OK: no captures
std::qsort(arr, n, sizeof(int), [](const void* a, const void* b) {
    int x = *static_cast<const int*>(a), y = *static_cast<const int*>(b);
    return (x > y) - (x < y);
});
```

## 3. Captures

| Capture | Meaning |
|---|---|
| `[]` | nothing |
| `[x]` | `x` by value (copy at creation time) |
| `[&x]` | `x` by reference |
| `[=]` | everything used, by value |
| `[&]` | everything used, by reference |
| `[=, &y]` | all by value except `y` by reference |
| `[&, x]` | all by reference except `x` by value |
| `[this]` | the `this` pointer (members accessed through it — by reference!) |
| `[*this]` | a copy of the whole object (C++17) |
| `[p = std::move(ptr)]` | **init capture** (C++14): new member initialised from any expression |
| `[...args = std::move(args)]` | pack init capture (C++20) |

```cpp
int counter = 0;
auto byVal = [counter]() mutable { return ++counter; };  // modifies its OWN copy
auto byRef = [&counter]() { return ++counter; };         // modifies the original
byVal(); byVal();      // returns 1, 2 — `counter` still 0
byRef();               // counter == 1
```

### Value captures are taken at creation

```cpp
int x = 1;
auto f = [x] { return x; };
x = 100;
f();   // 1 — the copy was made when the lambda was created
```

### Init captures: moving into a lambda

```cpp
auto data = std::make_unique<std::vector<int>>(1000);
auto task = [buf = std::move(data)] { return buf->size(); };   // lambda now owns the buffer
// std::function requires copyable callables -> use std::move_only_function (C++23) for this
```

## 4. Dangling captures — the #1 lambda bug

```cpp
std::function<int()> make_counter() {
    int count = 0;
    return [&count] { return ++count; };    // BUG: count dies when make_counter returns
}

// Fix: capture by value (+ mutable) so the closure owns its state
std::function<int()> make_counter_ok() {
    return [count = 0]() mutable { return ++count; };
}
```

**`[this]` in async code** is the same bug in disguise:

```cpp
void Widget::start() {
    timer_.async_wait([this] { refresh(); });          // Widget may be destroyed first!
    timer_.async_wait([self = shared_from_this()] { self->refresh(); });   // keeps it alive
    timer_.async_wait([weak = weak_from_this()] {        // or: don't extend lifetime, just check
        if (auto self = weak.lock()) self->refresh();
    });
}
```

> **Warning:** `[=]` inside a member function used to capture `this` implicitly (deprecated in C++20). Write `[this]` or `[*this]` explicitly.

## 5. Generic lambdas (C++14) and template lambdas (C++20)

```cpp
auto print = [](const auto& x) { std::cout << x << '\n'; };  // operator() is a template
print(42); print("hi"); print(3.14);

// C++20 explicit template parameters: access the type, constrain it
auto sum_vec = []<typename T>(const std::vector<T>& v) {
    return std::accumulate(v.begin(), v.end(), T{});
};

// Constrained with a concept
auto twice = [](std::integral auto n) { return n * 2; };
// twice(1.5);  // error: double doesn't satisfy std::integral
```

## 6. Lambdas with the STL

```cpp
std::vector<Employee> staff = load();

std::ranges::sort(staff, [](const Employee& a, const Employee& b) {
    return std::tie(a.dept, a.salary) < std::tie(b.dept, b.salary);   // multi-key compare
});

auto rich = std::ranges::count_if(staff, [min = 100'000](const auto& e) { return e.salary > min; });

std::erase_if(staff, [](const auto& e) { return e.retired; });   // C++20

// Custom hash / comparator types
auto cmp = [](int a, int b) { return a > b; };
std::priority_queue<int, std::vector<int>, decltype(cmp)> minHeap(cmp);
std::set<int, decltype(cmp)> desc;          // C++20: stateless lambdas are default-constructible
```

## 7. Storing callables: `auto` vs templates vs `std::function`

| Option | Overhead | Use when |
|---|---|---|
| `auto f = lambda;` | none, inlinable | local use |
| `template <class F> void run(F&& f)` | none, inlinable | algorithms / generic code |
| `void run(std::invocable<int> auto f)` | none (C++20 abbreviated template) | same, with constraints |
| `std::function<R(Args...)>` | type erasure: possible heap allocation, indirect call | storing heterogeneous callbacks at runtime |
| `std::move_only_function` (C++23) | like above, supports move-only captures | callbacks owning `unique_ptr`s |
| `std::function_ref` (C++26) / function pointer + `void*` | no allocation | non-owning callback params |

```cpp
class Button {
    std::vector<std::function<void()>> handlers_;
public:
    void on_click(std::function<void()> h) { handlers_.push_back(std::move(h)); }
    void click() { for (auto& h : handlers_) h(); }
};
```

> **Tip:** For embedded/real-time code, avoid `std::function` (may allocate). Use templates, function pointers with a context `void*`, or a fixed-capacity *inplace function* (e.g. ETL's `etl::delegate`).

## 8. Recursive lambdas

```cpp
// C++14-20: pass the lambda to itself
auto fib = [](auto&& self, int n) -> int { return n < 2 ? n : self(self, n - 1) + self(self, n - 2); };
fib(fib, 10);   // 55

// C++23: deducing this
auto fib23 = [](this auto&& self, int n) -> int { return n < 2 ? n : self(n - 1) + self(n - 2); };
fib23(10);
```

## 9. IIFE — immediately invoked lambda

Great for initialising `const` variables with complex logic:

```cpp
const auto config = [&] {
    Config c;
    if (argc > 1) c.path = argv[1];
    c.verbose = std::getenv("VERBOSE") != nullptr;
    return c;
}();                                // note the () — called right away
```

## 10. `constexpr` lambdas & lambdas in unevaluated contexts

```cpp
constexpr auto square = [](int x) { return x * x; };   // implicitly constexpr since C++17
static_assert(square(5) == 25);

// C++20: lambdas in decltype — e.g. as a deleter type
using FilePtr = std::unique_ptr<FILE, decltype([](FILE* f) { std::fclose(f); })>;
```

## 11. `std::bind` — know it, prefer lambdas

```cpp
auto add5 = std::bind(std::plus<>{}, std::placeholders::_1, 5);   // old style
auto add5l = [](int x) { return x + 5; };                          // clearer, faster
// C++20: std::bind_front(f, args...) is the one bind still worth using
```

## Interview Q&A

- **What type is a lambda?** A unique unnamed closure class type with `operator()`.
- **Why doesn't `[x] { ++x; }` compile?** `operator()` is `const`; use `mutable`.
- **Can a lambda capture a `unique_ptr`?** Yes, with init capture `[p = std::move(p)]`, but the closure becomes move-only (won't fit in `std::function`).
- **Lambda vs function pointer performance?** Lambdas passed to templates are typically inlined; function pointers usually aren't.
- **What does `[=]` capture?** Only variables actually used in the body (odr-used), by copy. Globals and statics aren't captured — they're accessed directly.
- **When are captures evaluated?** By-value captures copy at lambda creation; by-reference captures read at call time.
