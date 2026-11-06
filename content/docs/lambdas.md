# Lambdas & Functional C++

> **Key idea:** a lambda is a short, unnamed function you write right where you need it — typically to pass to an algorithm, a callback, or a thread. Under the hood the compiler turns every lambda into a small **class with an `operator()`** (a "closure type"), and every captured variable into a **data member** of that class. Once you see lambdas that way, captures, `mutable`, lifetimes, copying and performance all make sense.

**What you'll be able to do after this guide**
- Read and write every part of lambda syntax, and know what the compiler generates for it.
- Choose captures correctly (by value, by reference, init captures, `this`, `*this`) and avoid dangling captures.
- Write generic and template lambdas, recursive lambdas, IIFEs, and `constexpr` lambdas.
- Use lambdas with the STL and ranges; store callables with `auto`, templates, `std::function` and `std::function_ref`/`std::move_only_function`.
- Explain the performance difference between lambdas, function pointers and `std::function`.

---

## 1. Syntax

```text
[captures] (parameters) specifiers -> return_type { body }
    │           │            │             │
    │           │            │             └─ optional: usually deduced from `return`
    │           │            └─ optional: mutable, constexpr, consteval, noexcept, static (C++23)
    │           └─ optional if empty (C++23 allows omitting it even with specifiers)
    └─ which outside variables the body may use, and how
```

```cpp
#include <cstdio>

int main() {
    auto hello = [] { std::printf("hello\n"); };              // no captures, no parameters
    auto add = [](int a, int b) { return a + b; };            // return type deduced: int
    auto divide = [](double a, double b) -> double {          // explicit return type
        if (b == 0) {
            return 0;                                         // int 0 converts to double because of -> double
        }
        return a / b;
    };
    int base = 10;
    auto addBase = [base](int x) { return x + base; };        // captures `base` by value

    hello();
    std::printf("%d %.2f %d\n", add(2, 3), divide(1, 4), addBase(5));
    std::printf("%d\n", [](int x) { return x * x; }(7));      // define and call immediately
    return 0;
}
```

---

## 2. What a lambda really is

The compiler rewrites a lambda into a class. This lambda:

```cpp
// no-test (illustration)
int threshold = 5;
auto isBig = [threshold](int x) { return x > threshold; };
```

becomes, roughly:

```cpp
// no-test (what the compiler generates)
class __Lambda_17 {                         // unique, unnamed type
public:
    explicit __Lambda_17(int t) : threshold(t) {}
    bool operator()(int x) const {          // const by default!
        return x > threshold;
    }
private:
    int threshold;                          // the captured copy
};
__Lambda_17 isBig(threshold);
```

Consequences:

- Every lambda expression has its **own unique type** — even two identical lambdas. You can't name it; use `auto`, a template parameter, or `std::function`.
- `operator()` is **`const`** by default, so by-value captures can't be modified unless you write `mutable`.
- The closure's **size** is the size of its captures: a captureless lambda is an empty class (size 1).
- A **captureless** lambda converts implicitly to a plain function pointer (useful for C APIs).

```cpp
#include <cstdio>
#include <type_traits>

int applyC(int (*fn)(int), int v) {             // a C-style API that wants a function pointer
    return fn(v);
}

int main() {
    auto a = [] { return 1; };
    auto b = [] { return 1; };
    std::printf("same type? %s\n", std::is_same_v<decltype(a), decltype(b)> ? "yes" : "no");   // no

    int x = 1;
    double y = 2.0;
    auto none = [] {};
    auto oneInt = [x] { return x; };
    auto intAndDouble = [x, y] { return x + y; };
    auto byRef = [&x] { return x; };
    std::printf("sizes: none=%zu int=%zu int+double=%zu ref=%zu\n",
                sizeof(none), sizeof(oneInt), sizeof(intAndDouble), sizeof(byRef));

    std::printf("captureless lambda as function pointer: %d\n", applyC([](int v) { return v * 3; }, 7));
    int (*fp)(int) = +[](int v) { return v + 1; };     // unary + forces the conversion explicitly
    std::printf("fp(1) = %d\n", fp(1));
    return 0;
}
```

---

## 3. Captures

| Capture | Meaning |
|---|---|
| `[]` | nothing |
| `[x]` | `x` by value (copied when the lambda is **created**) |
| `[&x]` | `x` by reference (read when the lambda is **called**) |
| `[=]` | everything used, by value |
| `[&]` | everything used, by reference |
| `[=, &x]` | by value, except `x` by reference |
| `[&, x]` | by reference, except `x` by value |
| `[this]` | the current object, **by pointer** |
| `[*this]` | a **copy** of the current object (C++17) |
| `[y = expr]` | init capture: a new member `y` initialised with `expr` (C++14) |
| `[&y = expr]` | init capture by reference |
| `[...args]` / `[...xs = std::move(args)]` | capture a parameter pack (C++20 for init form) |

Only variables with **automatic storage** are captured. Globals, `static` locals and `constexpr` constants are simply used directly — no capture needed.

### Value captures are taken at creation, reference captures at call time

```cpp
#include <cstdio>

int main() {
    int counter = 1;
    auto byValue = [counter] { return counter; };
    auto byReference = [&counter] { return counter; };
    counter = 100;
    std::printf("byValue() = %d (copied when created)\n", byValue());       // 1
    std::printf("byReference() = %d (reads the current value)\n", byReference());   // 100
    return 0;
}
```

### `mutable`

```cpp
#include <cstdio>

int main() {
    int calls = 0;
    auto counter = [calls]() mutable {      // mutable: the lambda's OWN copy may change
        calls++;
        return calls;
    };
    counter();
    counter();
    std::printf("lambda's copy: %d, outer variable still: %d\n", counter(), calls);   // 3, 0

    auto copy = counter;                    // copying the closure copies its state too
    std::printf("copy continues from the same state: %d\n", copy());               // 4
    return 0;
}
```

### Init captures: moving into a lambda, computing once

```cpp
#include <cstdio>
#include <memory>
#include <string>
#include <utility>
#include <vector>

int main() {
    auto resource = std::make_unique<std::string>("owned by the lambda");
    auto task = [res = std::move(resource)] {              // move a move-only object INTO the closure
        std::printf("  %s\n", res->c_str());
    };
    std::printf("resource after move: %s\n", resource ? "still here" : "null");
    task();

    std::vector<int> data(1000, 1);
    auto summary = [n = data.size(), first = data.front()] {   // compute once, store the results
        return n * first;
    };
    std::printf("summary %zu\n", summary());

    std::string prefix = "[log] ";
    auto log = [&p = prefix](const char* msg) {             // a reference with a shorter name
        std::printf("%s%s\n", p.c_str(), msg);
    };
    log("hello");
    return 0;
}
```

A closure that holds a `unique_ptr` is itself **move-only** — it can't go into `std::function` (which requires copyable callables), but it can go into `std::move_only_function` (C++23) or be passed as a template parameter.

### Capturing `this`

```cpp
#include <cstdio>
#include <functional>
#include <vector>

class Button {
public:
    explicit Button(const char* label) : label(label) {}

    std::function<void()> onClickRef() {
        return [this] { std::printf("  clicked %s (via this pointer)\n", label); };   // stores a POINTER
    }
    std::function<void()> onClickCopy() const {
        return [*this] { std::printf("  clicked %s (via copy)\n", label); };          // stores a COPY (C++17)
    }

private:
    const char* label;
};

int main() {
    std::vector<std::function<void()>> handlers;
    {
        Button ok("OK");
        handlers.push_back(ok.onClickCopy());       // safe even after `ok` is destroyed
        auto refHandler = ok.onClickRef();
        refHandler();                               // fine: ok is still alive here
    }                                               // ok destroyed: a [this] handler stored here would dangle
    for (auto& h : handlers) {
        h();
    }
    return 0;
}
```

> **Pitfall:** `[=]` in a member function used to capture `this` **implicitly** (by pointer!) — so "capture everything by value" still referred to the live object. C++20 deprecates that; write `[=, this]` or `[*this]` explicitly.

---

## 4. Dangling captures — the #1 lambda bug

A by-reference capture (or a captured `this`, or a captured raw pointer) is only valid while the referenced object is alive. Lambdas that **outlive the current scope** — returned, stored, or run on another thread — must capture **by value** (or own what they need).

```cpp
// no-test (bugs)
std::function<int()> makeCounter() {
    int count = 0;
    return [&count] { return ++count; };    // count dies when makeCounter returns -> dangling reference
}

void startWork(std::vector<int>& results) {
    std::thread t([&] { results.push_back(42); });   // if the caller's vector dies before t finishes -> UB
    t.detach();
}
```

```cpp
#include <cstdio>
#include <functional>

std::function<int()> makeCounter() {
    int count = 0;
    return [count]() mutable {      // by value: the closure owns its own counter
        return ++count;
    };
}

int main() {
    auto next = makeCounter();
    next();
    next();
    std::printf("counter: %d\n", next());   // 3
    return 0;
}
```

**Rule of thumb:** use `[&]` freely for lambdas that run **immediately** and don't escape (passed to `std::sort`, `std::for_each`, called on the spot). For anything stored or deferred, capture by value or with init captures, and think about `this`.

---

## 5. Generic lambdas (C++14) and template lambdas (C++20)

`auto` parameters make the call operator a template:

```cpp
#include <cstdio>
#include <string>
#include <vector>

int main() {
    auto twice = [](auto x) { return x + x; };          // template <class T> auto operator()(T x) const
    std::printf("%d %.1f %s\n", twice(21), twice(1.25), twice(std::string("ab")).c_str());

    // C++20 template lambda: name the type, constrain it, or get at the element type.
    auto sumAll = []<typename T>(const std::vector<T>& v) {
        T total{};
        for (const T& x : v) {
            total += x;
        }
        return total;
    };
    std::printf("%d %.1f\n", sumAll(std::vector<int>{1, 2, 3}), sumAll(std::vector<double>{0.5, 0.25}));

    // Variadic generic lambda + fold expression.
    auto printAll = [](const auto&... args) {
        ((std::printf("%s ", std::to_string(args).c_str())), ...);
        std::printf("\n");
    };
    printAll(1, 2.5, 3L);
    return 0;
}
```

---

## 6. Lambdas with the STL and ranges

This is where lambdas earn their keep: custom comparisons, predicates and transformations, written right at the call site.

```cpp
#include <algorithm>
#include <cstdio>
#include <numeric>
#include <ranges>
#include <string>
#include <vector>

struct Employee {
    std::string name;
    int age;
    double salary;
};

int main() {
    std::vector<Employee> staff = {
        {"Ana", 34, 72000}, {"Ben", 28, 58000}, {"Cy", 45, 91000}, {"Dee", 28, 61000},
    };

    // Sort by age, then by salary descending.
    std::sort(staff.begin(), staff.end(), [](const Employee& a, const Employee& b) {
        if (a.age != b.age) {
            return a.age < b.age;
        }
        return a.salary > b.salary;
    });
    for (const auto& e : staff) {
        std::printf("%s(%d) ", e.name.c_str(), e.age);
    }
    std::printf("\n");

    // Count / find with predicates that capture a threshold.
    double limit = 60000;
    auto richCount = std::count_if(staff.begin(), staff.end(), [limit](const Employee& e) {
        return e.salary > limit;
    });
    auto it = std::find_if(staff.begin(), staff.end(), [](const Employee& e) { return e.age > 40; });
    std::printf("earning > %.0f: %td, first over 40: %s\n", limit, richCount, it->name.c_str());

    // Accumulate with a custom combine step.
    double payroll = std::accumulate(staff.begin(), staff.end(), 0.0,
                                     [](double sum, const Employee& e) { return sum + e.salary; });
    std::printf("payroll %.0f\n", payroll);

    // C++20 ranges: compose lazily with views; projections replace many lambdas.
    auto youngNames = staff
        | std::views::filter([](const Employee& e) { return e.age < 30; })
        | std::views::transform([](const Employee& e) { return e.name; });
    for (const std::string& n : youngNames) {
        std::printf("young: %s\n", n.c_str());
    }
    auto oldest = std::ranges::max_element(staff, {}, &Employee::age);   // projection: compare by age
    std::printf("oldest: %s\n", oldest->name.c_str());

    // Erase-remove made easy (C++20).
    std::erase_if(staff, [](const Employee& e) { return e.salary < 60000; });
    std::printf("after erase_if: %zu employees\n", staff.size());
    return 0;
}
```

> **Tip:** comparators for `std::sort`, `std::set`, `std::priority_queue` must define a **strict weak ordering** — use `<`, never `<=`. A `<=` comparator is undefined behaviour and can crash `std::sort`.

### Lambdas as comparators for containers

```cpp
#include <cstdio>
#include <queue>
#include <set>
#include <string>
#include <vector>

int main() {
    auto byLength = [](const std::string& a, const std::string& b) {
        if (a.size() != b.size()) {
            return a.size() < b.size();
        }
        return a < b;
    };
    std::set<std::string, decltype(byLength)> words(byLength);        // pass the lambda object
    for (const char* w : {"pear", "fig", "banana", "kiwi"}) {
        words.insert(w);
    }
    for (const auto& w : words) {
        std::printf("%s ", w.c_str());
    }
    std::printf("\n");

    auto greater = [](int a, int b) { return a > b; };
    std::priority_queue<int, std::vector<int>, decltype(greater)> minHeap(greater);   // a min-heap
    for (int v : {5, 1, 4}) {
        minHeap.push(v);
    }
    std::printf("smallest: %d\n", minHeap.top());
    return 0;
}
```

(In C++20, captureless lambdas are default-constructible, so `std::set<std::string, decltype(byLength)> words;` also works.)

---

## 7. Storing callables: `auto`, templates, `std::function`

| Way | Type erasure | Allocation | Inlining | Use when |
|---|---|---|---|---|
| `auto f = [..]{..};` | no | no | yes | local use |
| `template <class F> void run(F&& f)` | no | no | yes | accepting a callable in a function |
| `void run(std::invocable<int> auto f)` | no | no | yes | C++20 constrained version |
| `std::function<R(Args...)>` | yes | possibly (small-buffer optimised) | rarely | storing heterogeneous callables (callbacks, maps of handlers) |
| `std::move_only_function` (C++23) | yes | possibly | rarely | storing move-only callables |
| `std::function_ref` (C++26) / function pointer | yes | no | rarely | non-owning callback parameters |

```cpp
#include <concepts>
#include <cstdio>
#include <functional>
#include <map>
#include <string>

// Accept any callable cheaply: a template (inlinable, zero overhead).
template <typename F>
int applyTwice(F&& f, int x) {
    return f(f(x));
}

// C++20 concept-constrained version: clearer errors.
int applyN(std::invocable<int> auto f, int x, int n) {
    for (int i = 0; i < n; i++) {
        x = f(x);
    }
    return x;
}

int main() {
    std::printf("%d %d\n", applyTwice([](int v) { return v * 3; }, 2), applyN([](int v) { return v + 1; }, 0, 5));

    // std::function: one type that holds ANY callable with the matching signature.
    std::map<std::string, std::function<double(double, double)>> ops = {
        {"+", [](double a, double b) { return a + b; }},
        {"*", std::multiplies<double>()},                      // a function object
        {"max", [](double a, double b) { return a > b ? a : b; }},
    };
    for (const auto& [name, fn] : ops) {
        std::printf("%s(6, 7) = %.0f\n", name.c_str(), fn(6, 7));
    }

    std::function<void()> empty;
    if (!empty) {
        std::printf("empty std::function: calling it would throw std::bad_function_call\n");
    }
    return 0;
}
```

### Performance in one picture

```text
template / auto lambda  →  direct call, usually inlined          (fastest)
function pointer        →  indirect call, rarely inlined
std::function           →  indirect call through type-erased storage;
                           may heap-allocate for big captures   (most flexible)
```

`std::function` is great for storing callbacks; don't use it as the parameter type of a hot generic algorithm — take a template parameter instead.

---

## 8. Recursive lambdas

A lambda can't refer to itself by name (the name isn't in scope inside its own initialiser). Options:

```cpp
// c++23 — needs GCC 14+, Clang 18+ or MSVC 19.32+ with -std=c++23
#include <cstdio>

int main() {
    // 1. C++23 "deducing this": the lambda receives itself as an explicit first parameter.
    auto fib = [](this auto self, int n) -> long long {
        if (n < 2) {
            return n;
        }
        return self(n - 1) + self(n - 2);
    };
    std::printf("fib(20) = %lld\n", fib(20));
    return 0;
}
```

```cpp
#include <cstdio>
#include <functional>

int main() {
    // 2. Pass the lambda to itself (works in C++14 and later).
    auto fact = [](auto&& self, int n) -> long long {
        if (n <= 1) {
            return 1;
        }
        return n * self(self, n - 1);
    };
    std::printf("fact(10) = %lld\n", fact(fact, 10));

    // 3. std::function (simple, but adds type-erasure overhead and must be declared first).
    std::function<int(int)> sumTo = [&sumTo](int n) {
        if (n == 0) {
            return 0;
        }
        return n + sumTo(n - 1);
    };
    std::printf("sumTo(100) = %d\n", sumTo(100));
    return 0;
}
```

(Recursive lambdas are handy for DFS in interview solutions — though a private member function is often more readable.)

---

## 9. IIFE — immediately invoked lambdas

Use a lambda that's called on the spot to initialise a `const` variable with complex logic:

```cpp
#include <cstdio>
#include <string>

int main() {
    int mode = 2;
    const std::string label = [&] {          // complex initialisation, but the result stays const
        if (mode == 1) {
            return std::string("fast");
        }
        if (mode == 2) {
            return std::string("balanced");
        }
        return std::string("safe");
    }();                                     // <- the () calls it immediately
    std::printf("label = %s\n", label.c_str());
    return 0;
}
```

---

## 10. `constexpr`, `consteval`, `static` and `noexcept` lambdas

```cpp
#include <array>
#include <cstdio>

int main() {
    // Lambdas are implicitly constexpr when they can be (C++17).
    constexpr auto square = [](int x) { return x * x; };
    static_assert(square(12) == 144);                                // evaluated at compile time

    constexpr auto table = [] {                                      // build a lookup table at compile time
        std::array<int, 10> t{};
        for (int i = 0; i < 10; i++) {
            t[i] = i * i * i;
        }
        return t;
    }();
    static_assert(table[3] == 27);

    auto safe = [](int a, int b) noexcept { return a + b; };         // noexcept is part of the type
    static_assert(noexcept(safe(1, 2)));

    std::printf("square(7) = %d, table[9] = %d\n", square(7), table[9]);
    return 0;
}
```

C++20 also allows lambdas in **unevaluated contexts** (e.g. `decltype([](int a, int b) { return a < b; })` as a template argument) and captureless lambdas are default-constructible and assignable. C++23 adds `static` lambdas (`[] static (int x) { ... }`) whose call operator has no `this` — slightly cheaper when passed around.

---

## 11. Higher-order functions and functional style

Lambdas can **return** lambdas and **take** lambdas, letting you build behaviour from small pieces:

```cpp
#include <cstdio>
#include <functional>
#include <string>
#include <vector>

// Returns a function that adds n.
auto adder(int n) {
    return [n](int x) { return x + n; };
}

// Composes two functions: compose(f, g)(x) = f(g(x)).
template <typename F, typename G>
auto compose(F f, G g) {
    return [f, g](auto x) { return f(g(x)); };
}

// Memoise any int -> long long function.
auto memoise(std::function<long long(int)> fn) {
    std::vector<long long> cache;
    return [fn, cache](int n) mutable {
        if (n < (int)cache.size() && cache[n] != -1) {
            return cache[n];
        }
        long long r = fn(n);
        if (n >= (int)cache.size()) {
            cache.resize(n + 1, -1);
        }
        cache[n] = r;
        return r;
    };
}

int main() {
    auto add5 = adder(5);
    auto timesTwo = [](int x) { return x * 2; };
    auto add5ThenDouble = compose(timesTwo, add5);
    std::printf("add5(1) = %d, double(add5(1)) = %d\n", add5(1), add5ThenDouble(1));

    // Currying: turn f(a, b) into f(a)(b).
    auto curriedPow = [](double base) {
        return [base](int exp) {
            double r = 1;
            for (int i = 0; i < exp; i++) {
                r *= base;
            }
            return r;
        };
    };
    std::printf("2^10 = %.0f\n", curriedPow(2)(10));

    auto slowSquare = memoise([](int n) { return static_cast<long long>(n) * n; });
    std::printf("memoised: %lld %lld\n", slowSquare(12), slowSquare(12));
    return 0;
}
```

---

## 12. `std::bind` — know it, prefer lambdas

`std::bind` creates a callable by fixing some arguments. Lambdas do the same more readably, with better error messages and better inlining:

```cpp
#include <cstdio>
#include <functional>

int volume(int w, int h, int d) {
    return w * h * d;
}

int main() {
    using namespace std::placeholders;
    auto bound = std::bind(volume, 2, _1, 3);                  // fix w=2, d=3
    auto lambda = [](int h) { return volume(2, h, 3); };        // same thing, clearer
    auto front = std::bind_front(volume, 2, 4);                 // C++20: fix the leading arguments
    std::printf("%d %d %d\n", bound(5), lambda(5), front(5));
    return 0;
}
```

---

## 13. Lambdas and concurrency

Lambdas are the usual way to give work to threads, `std::async` and thread pools. Two rules: **capture by value (or move in) whatever the task needs**, and **protect shared state**.

```cpp
#include <cstdio>
#include <future>
#include <mutex>
#include <numeric>
#include <thread>
#include <vector>

int main() {
    std::vector<int> data(1000);
    std::iota(data.begin(), data.end(), 1);

    // async + lambda: compute two halves in parallel.
    auto half = data.size() / 2;
    auto left = std::async(std::launch::async, [&data, half] {          // data outlives the futures: & is safe here
        return std::accumulate(data.begin(), data.begin() + half, 0LL);
    });
    long long right = std::accumulate(data.begin() + half, data.end(), 0LL);
    std::printf("sum = %lld\n", left.get() + right);                    // 500500

    // Threads updating shared state through a lambda: lock it.
    long long total = 0;
    std::mutex m;
    std::vector<std::jthread> workers;
    for (int t = 0; t < 4; t++) {
        workers.emplace_back([&, t] {                                   // t by value: each thread its own id
            long long local = 0;
            for (int i = t; i < 1000; i += 4) {
                local += data[i];
            }
            std::lock_guard lock(m);
            total += local;
        });
    }
    workers.clear();                                                    // jthreads join on destruction
    std::printf("threaded total = %lld\n", total);
    return 0;
}
```

---

## 14. Interview checklist

- [ ] A lambda is an unnamed class with `operator()`; captures are members.
- [ ] Every lambda has a unique type; captureless lambdas convert to function pointers.
- [ ] Value captures copy at creation; reference captures read at call time.
- [ ] `operator()` is const → `mutable` to change copies.
- [ ] Init captures for move-only objects; such closures are move-only.
- [ ] `[this]` stores a pointer; `[*this]` copies; implicit `this` in `[=]` is deprecated.
- [ ] Dangling reference captures in stored/async lambdas.
- [ ] Templates vs function pointers vs `std::function` (performance, flexibility).
- [ ] Recursive lambdas: deducing this, self-passing, `std::function`.

---

## Practice

1. Write `makeMultiplier(int k)` returning a lambda, and use it with `std::transform` to multiply a vector by 3.
2. Sort a `std::vector<std::pair<std::string, int>>` by the int descending, ties by the string ascending, using one lambda.
3. Write a `EventBus` class with `subscribe(std::string topic, std::function<void(const std::string&)>)` and `publish(topic, message)`. What lifetime problem appears if a subscriber captures `this` and is destroyed? Fix it with `std::weak_ptr`.
4. What's printed? `int x = 1; auto f = [x]() mutable { return ++x; }; auto g = f; f(); f(); std::printf("%d %d %d\n", x, f(), g());`
5. Implement a `retry(fn, attempts)` higher-order function that calls `fn` until it returns `true` or attempts run out, returning the number of calls made.

:::details Show solution
1.
```cpp
#include <algorithm>
#include <cassert>
#include <vector>

auto makeMultiplier(int k) {
    return [k](int x) { return x * k; };
}

int main() {
    std::vector<int> v = {1, 2, 3};
    std::transform(v.begin(), v.end(), v.begin(), makeMultiplier(3));
    assert((v == std::vector<int>{3, 6, 9}));
    return 0;
}
```
2.
```cpp
#include <algorithm>
#include <cassert>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<std::string, int>> v = {{"b", 2}, {"a", 2}, {"c", 5}};
    std::sort(v.begin(), v.end(), [](const auto& x, const auto& y) {
        if (x.second != y.second) {
            return x.second > y.second;     // int descending
        }
        return x.first < y.first;           // then string ascending
    });
    assert(v[0].first == "c" && v[1].first == "a" && v[2].first == "b");
    return 0;
}
```
3. Store `std::unordered_map<std::string, std::vector<std::function<...>>>`. If a subscriber object registers `[this](auto& m) { handle(m); }` and is then destroyed, publishing calls through a dangling `this` → UB. Fix: subscribers are owned by `shared_ptr`; register `[weak = std::weak_ptr<Sub>(self)](auto& m) { if (auto s = weak.lock()) { s->handle(m); } }`, or return a subscription token whose destructor unsubscribes (RAII).
4. `1 4 2`. `x` outside is never modified (captured by value). `g` was copied from `f` before any call, so it has its own `x = 1` → `g()` returns 2. `f` was called twice (2, 3), then `f()` in the printf returns 4. (The order in which printf's arguments are evaluated is unspecified, but `f()` and `g()` don't interact, so the values are the same either way.)
5.
```cpp
#include <cassert>

template <typename F>
int retry(F&& fn, int attempts) {
    for (int i = 1; i <= attempts; i++) {
        if (fn()) {
            return i;
        }
    }
    return attempts;
}

int main() {
    int tries = 0;
    int calls = retry([&tries] { return ++tries == 3; }, 5);
    assert(calls == 3);
    assert(retry([] { return false; }, 4) == 4);
    return 0;
}
```
:::

---

## Interview Q&A

- **What type is a lambda?** A unique unnamed closure class type with `operator()`.
- **Why doesn't `[x] { ++x; }` compile?** `operator()` is `const`; use `mutable`.
- **Can a lambda capture a `unique_ptr`?** Yes, with init capture `[p = std::move(p)]`, but the closure becomes move-only (won't fit in `std::function`).
- **Lambda vs function pointer performance?** Lambdas passed to templates are typically inlined; function pointers usually aren't.
- **What does `[=]` capture?** Only variables actually used in the body (odr-used), by copy. Globals and statics aren't captured — they're accessed directly.
- **When are captures evaluated?** By-value captures copy at lambda creation; by-reference captures read at call time.
- **What's the difference between `[this]` and `[*this]`?** `[this]` captures the object's pointer (dangles if the object dies); `[*this]` (C++17) captures a copy of the whole object.
- **When is capturing by reference safe?** When the lambda runs and finishes while the referenced variables are still alive — e.g. passed straight to an algorithm; not when it's stored, returned, or run asynchronously.
- **How do you write a recursive lambda?** In C++23 with an explicit object parameter (`[](this auto self, int n)`), otherwise by passing the lambda to itself or by storing it in a `std::function` captured by reference.
- **What does `std::function` cost compared with a template parameter?** Type erasure: an indirect call that usually can't be inlined, and possibly a heap allocation for large captures.
- **Can a lambda be used where a C function pointer is expected?** Only if it has no captures; then it converts implicitly (or with unary `+`).

---

## External resources

- **cppreference — Lambda expressions** (all forms, by standard version).
- **Bartłomiej Filipek — *C++ Lambda Story*** (book) and his "Lambdas: from C++11 to C++20" articles at cppstories.com.
- **Scott Meyers — *Effective Modern C++*, Items 31–34** (capture modes, init capture, prefer lambdas to `std::bind`).
- **C++ Core Guidelines — F.50–F.54** (when to use lambdas, capturing by reference vs value, `this`).
- **C++ Insights** (cppinsights.io): paste a lambda and see the class the compiler generates.
