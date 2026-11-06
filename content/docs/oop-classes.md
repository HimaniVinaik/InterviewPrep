# Classes & OOP in C++

> **Key idea:** a class bundles **data** with the **operations** that keep that data valid (its *invariants*). Object-oriented design in C++ rests on four ideas — **encapsulation** (hide the data, expose operations), **abstraction** (users see *what*, not *how*), **inheritance** (reuse and "is-a" relationships), and **polymorphism** (one interface, many implementations). C++ gives you two kinds of polymorphism: **dynamic** (virtual functions, decided at run time through a vtable) and **static** (templates/overloading, decided at compile time).

**What you'll be able to do after this guide**
- Write well-designed classes: constructors, initialiser lists, `explicit`, `const` members, invariants.
- Use inheritance correctly: access specifiers, `virtual`, `override`, `final`, abstract interfaces.
- Explain exactly how virtual dispatch works (vptr, vtable), its costs, and what happens in constructors/destructors.
- Avoid slicing, missing virtual destructors, name hiding and diamond problems.
- Overload operators idiomatically, including `<=>` (C++20).
- Choose between inheritance, composition, CRTP and type erasure.

---

## 1. Anatomy of a class

```cpp
#include <cstdio>
#include <stdexcept>
#include <string>

class BankAccount {
public:                                            // the interface: what users may do
    BankAccount(std::string owner, long initialCents)
        : owner(std::move(owner)), balanceCents(initialCents) {
        if (initialCents < 0) {
            throw std::invalid_argument("negative opening balance");   // enforce the invariant from the start
        }
    }

    void deposit(long cents) {
        if (cents <= 0) {
            throw std::invalid_argument("deposit must be positive");
        }
        balanceCents += cents;
    }

    bool withdraw(long cents) {                    // returns false instead of breaking the invariant
        if (cents <= 0 || cents > balanceCents) {
            return false;
        }
        balanceCents -= cents;
        return true;
    }

    long balance() const { return balanceCents; }  // const: doesn't modify the object
    const std::string& name() const { return owner; }

private:                                           // the implementation: hidden, can change freely
    std::string owner;
    long balanceCents;                             // invariant: never negative
};

int main() {
    BankAccount acct("Ada", 1000);
    acct.deposit(500);
    bool ok = acct.withdraw(5000);                 // refused: would go negative
    std::printf("%s: balance %ld cents, big withdrawal %s\n",
                acct.name().c_str(), acct.balance(), ok ? "ok" : "refused");
    // acct.balanceCents = -1;                     // error: private — nobody can break the invariant
    return 0;
}
```

**Encapsulation in one sentence:** make the data private so that the only way to change it is through member functions that keep it valid.

| | `class` | `struct` |
|---|---|---|
| Default member access | `private` | `public` |
| Default inheritance | `private` | `public` |
| Convention | types with invariants | plain data aggregates |

That's the **only** difference. Use `struct` for passive data (`struct Point { double x, y; };`) and `class` when there's an invariant to protect.

---

## 2. Constructors

```cpp
#include <cstdio>
#include <string>
#include <vector>

class Matrix {
public:
    Matrix() : Matrix(0, 0) {}                               // delegating constructor (C++11)
    Matrix(std::size_t r, std::size_t c, double fill = 0.0)
        : rows(r), cols(c), data(r * c, fill) {}             // member initialiser list
    explicit Matrix(std::size_t n) : Matrix(n, n) {          // explicit: no silent int -> Matrix conversions
        for (std::size_t i = 0; i < n; i++) {
            at(i, i) = 1.0;                                  // identity
        }
    }

    double& at(std::size_t r, std::size_t c) { return data[r * cols + c]; }
    double at(std::size_t r, std::size_t c) const { return data[r * cols + c]; }
    std::size_t size() const { return rows * cols; }

private:
    std::size_t rows;                                        // declared (and so initialised) before data
    std::size_t cols;
    std::vector<double> data;
};

double trace(const Matrix& m, std::size_t n) {
    double t = 0;
    for (std::size_t i = 0; i < n; i++) {
        t += m.at(i, i);
    }
    return t;
}

int main() {
    Matrix empty;
    Matrix filled(2, 3, 7.0);
    Matrix identity(4);
    std::printf("sizes %zu %zu %zu, trace of identity = %.0f\n",
                empty.size(), filled.size(), identity.size(), trace(identity, 4));
    // trace(4, 4);   // error thanks to explicit: 4 is not silently turned into a 4x4 Matrix
    return 0;
}
```

### Member initialiser lists — always prefer them

```cpp
// no-test (comparison)
class Slow {
    std::string name;
public:
    Slow(const std::string& n) { name = n; }        // default-constructs name, THEN assigns: two steps
};
class Fast {
    std::string name;
public:
    Fast(std::string n) : name(std::move(n)) {}     // constructs name once
};
```

You **must** use the initialiser list for: `const` members, reference members, members without a default constructor, and base classes with arguments. Members are initialised in **declaration order**, whatever order you write the list in (`-Wreorder` warns).

Default member initialisers (`int count = 0;` in the class body) are a great default; a constructor's initialiser list overrides them.

### `explicit`

Single-argument constructors (and conversion operators) are **implicit conversions** unless marked `explicit`. Make them `explicit` unless the conversion is genuinely natural (e.g. `std::string` from `const char*`).

### Aggregate and designated initialisation

```cpp
#include <cstdio>

struct Config {                     // an aggregate: public members, no user constructors
    int port = 8080;
    bool verbose = false;
    double timeoutSeconds = 2.5;
};

int main() {
    Config a{};                                        // all defaults
    Config b{9000, true};                              // positional
    Config c{.port = 443, .timeoutSeconds = 10.0};     // C++20 designated initialisers (in declaration order)
    std::printf("%d %d %d, verbose %d %d %d\n", a.port, b.port, c.port, a.verbose, b.verbose, c.verbose);
    return 0;
}
```

---

## 3. `const` correctness and `mutable`

A `const` member function promises not to modify the observable state. You can only call `const` functions on `const` objects and through `const&` — so marking every non-mutating function `const` is essential.

```cpp
#include <cstdio>
#include <mutex>
#include <string>

class Cache {
public:
    std::string lookup(int key) const {          // logically const...
        std::lock_guard<std::mutex> lock(m);     // ...but locking modifies the mutex: it's mutable
        hits++;
        return "value-" + std::to_string(key);
    }
    int hitCount() const { return hits; }

private:
    mutable std::mutex m;                        // implementation details that don't affect the logical value
    mutable int hits = 0;
};

void show(const Cache& c) {                      // only const members are callable here
    std::printf("%s, hits %d\n", c.lookup(7).c_str(), c.hitCount());
}

int main() {
    Cache c;
    show(c);
    show(c);
    return 0;
}
```

You can **overload on const** to return const or non-const access (`at()` above, `std::vector::operator[]`). C++23's "deducing this" removes the duplication.

---

## 4. Static members, `friend`, and `this`

```cpp
#include <cstdio>

class Widget {
public:
    Widget() { liveCount++; }
    ~Widget() { liveCount--; }
    Widget(const Widget&) { liveCount++; }
    static int live() { return liveCount; }        // no `this`: called as Widget::live()

    friend void debugPrint(const Widget& w);       // a non-member granted access to private parts

private:
    static inline int liveCount = 0;               // C++17 inline static: defined right here
    int secret = 42;
};

void debugPrint(const Widget& w) {
    std::printf("secret = %d\n", w.secret);
}

int main() {
    Widget a;
    {
        Widget b = a;
        std::printf("live widgets: %d\n", Widget::live());   // 2
    }
    std::printf("live widgets: %d\n", Widget::live());       // 1
    debugPrint(a);
    return 0;
}
```

`friend` is not a violation of encapsulation when it's used for things that are logically part of the class's interface — notably operators like `operator<<` and symmetric `operator==` (section 10).

---

## 5. Inheritance

```cpp
#include <cstdio>
#include <memory>
#include <string>
#include <vector>

class Animal {                                         // base class
public:
    explicit Animal(std::string name) : name(std::move(name)) {}
    virtual ~Animal() = default;                       // polymorphic base -> virtual destructor

    virtual std::string sound() const = 0;             // pure virtual: derived classes MUST implement
    virtual std::string describe() const {             // virtual with a default implementation
        return name + " says " + sound();
    }
    const std::string& getName() const { return name; }

protected:                                             // visible to derived classes, hidden from users
    std::string name;
};

class Dog : public Animal {                            // "a Dog is an Animal"
public:
    using Animal::Animal;                              // inherit Animal's constructors
    std::string sound() const override { return "woof"; }
};

class Puppy final : public Dog {                       // final: nobody can derive from Puppy
public:
    using Dog::Dog;
    std::string describe() const override {            // override: compiler checks the signature matches
        return Dog::describe() + " (tiny)";            // call the base version explicitly
    }
};

class Cat : public Animal {
public:
    using Animal::Animal;
    std::string sound() const override { return "meow"; }
};

int main() {
    std::vector<std::unique_ptr<Animal>> zoo;
    zoo.push_back(std::make_unique<Dog>("Rex"));
    zoo.push_back(std::make_unique<Cat>("Tom"));
    zoo.push_back(std::make_unique<Puppy>("Bit"));
    for (const auto& a : zoo) {
        std::printf("%s\n", a->describe().c_str());     // run-time dispatch on the real type
    }
    return 0;
}
```

### Access specifiers and inheritance modes

| Member in base | `public` inheritance | `protected` inheritance | `private` inheritance |
|---|---|---|---|
| `public` | public | protected | private |
| `protected` | protected | protected | private |
| `private` | inaccessible | inaccessible | inaccessible |

- **Public inheritance** models **is-a** (Liskov substitution: a `Dog` must work anywhere an `Animal` is expected). This is almost always what you want.
- **Private inheritance** models "is-implemented-in-terms-of" — usually composition (a member) is clearer.

### `override` and `final`

- `override` makes the compiler verify you're really overriding a base virtual function. Without it, a typo (`soud()`, or a missing `const`) silently creates a **new** function.
- `final` on a function stops further overriding; on a class, stops derivation (and lets the compiler devirtualise calls).

```cpp
// no-test (the bug override prevents)
struct Base {
    virtual void draw() const;
};
struct Derived : Base {
    void draw();            // forgot const: a NEW, unrelated function; Base::draw is still called through Base&
    // void draw() override;   // with override: compile error "does not override" — bug caught
};
```

---

## 6. How virtual functions work: vptr and vtable

When a class has at least one virtual function, the compiler:

1. Creates **one vtable per class** — a static array of function pointers to that class's implementations.
2. Adds a hidden **vptr** to every object, pointing at its class's vtable (set by the constructor).
3. Compiles `p->speak()` into: load the vptr, load the entry for `speak` from the table, call it.

```text
Dog object                 Dog vtable (one per class, in .rodata)
┌───────────────┐          ┌───────────────────────────┐
│ vptr ─────────┼────────► │ &Dog::~Dog                │
│ name          │          │ &Dog::sound               │
└───────────────┘          │ &Animal::describe         │  (not overridden: base version)
                           └───────────────────────────┘
call a->sound():   vt = a->vptr;   fn = vt[1];   fn(a);
```

```cpp
#include <cstdio>

struct NoVirtual {
    int x;
    void f() {}
};

struct WithVirtual {
    int x;
    virtual void f() {}
};

struct Base {
    virtual void hello() const { std::printf("Base::hello\n"); }
    virtual ~Base() = default;
};
struct Derived : Base {
    void hello() const override { std::printf("Derived::hello\n"); }
};

int main() {
    std::printf("sizeof NoVirtual = %zu, WithVirtual = %zu (vptr + int + padding)\n",
                sizeof(NoVirtual), sizeof(WithVirtual));

    Derived d;
    Base& viaRef = d;
    Base* viaPtr = &d;
    Base byValue = d;                 // SLICED: a real Base object, its vptr points at Base's vtable

    viaRef.hello();                   // Derived::hello  (dynamic dispatch)
    viaPtr->hello();                  // Derived::hello
    byValue.hello();                  // Base::hello
    viaPtr->Base::hello();            // explicit qualification: no dispatch
    return 0;
}
```

### Costs of virtual functions

| Cost | Size |
|---|---|
| Memory | one pointer (vptr) per object; one vtable per class |
| Call | an indirect call (two loads + jump), usually well predicted |
| Optimisation | the call can't be **inlined** unless the compiler can prove the type (devirtualisation: `final`, LTO, known object) |

For most code this is negligible; in tight inner loops over millions of small objects it matters — consider static polymorphism or data-oriented design there.

### Virtual calls in constructors and destructors

During `Base`'s constructor the object **is a `Base`** — the derived part doesn't exist yet — so virtual calls dispatch to `Base`'s version. The same holds in destructors (the derived part is already gone). Calling a pure virtual function there is undefined behaviour (typically "pure virtual method called" + abort).

```cpp
#include <cstdio>

struct Base {
    Base() { whoAmI(); }                  // calls Base::whoAmI, NOT Derived's
    virtual ~Base() { whoAmI(); }         // also Base::whoAmI
    virtual void whoAmI() const { std::printf("  Base\n"); }
};

struct Derived : Base {
    Derived() { whoAmI(); }
    ~Derived() override { whoAmI(); }
    void whoAmI() const override { std::printf("  Derived\n"); }
};

int main() {
    std::printf("constructing:\n");
    Derived d;
    std::printf("destroying:\n");
    return 0;
}
```

---

## 7. Virtual destructors

Deleting a derived object through a base pointer **without** a virtual destructor is undefined behaviour — in practice the derived destructor doesn't run and its resources leak.

```cpp
#include <cstdio>
#include <memory>

struct GoodBase {
    virtual ~GoodBase() { std::printf("  ~GoodBase\n"); }
};
struct GoodDerived : GoodBase {
    ~GoodDerived() override { std::printf("  ~GoodDerived (resources freed)\n"); }
};

int main() {
    std::printf("delete through base pointer with a virtual destructor:\n");
    std::unique_ptr<GoodBase> p = std::make_unique<GoodDerived>();
    p.reset();                         // both destructors run, derived first
    return 0;
}
```

**Rule (C++ Core Guidelines C.35):** a base class destructor should be either **public and virtual** (if you delete through base pointers) or **protected and non-virtual** (if you never do — e.g. CRTP or mixin bases).

---

## 8. Object slicing

Copying a derived object into a base **object** (not a pointer/reference) copies only the base part.

```cpp
#include <cstdio>
#include <string>
#include <vector>

struct Shape {
    virtual ~Shape() = default;
    virtual std::string name() const { return "shape"; }
};
struct Circle : Shape {
    double radius = 1.0;
    std::string name() const override { return "circle"; }
};

void printByValue(Shape s) { std::printf("  by value: %s\n", s.name().c_str()); }       // slices
void printByRef(const Shape& s) { std::printf("  by ref:   %s\n", s.name().c_str()); }  // no slicing

int main() {
    Circle c;
    printByValue(c);
    printByRef(c);
    std::vector<Shape> shapes;
    shapes.push_back(c);                 // sliced into a plain Shape — the radius is gone
    std::printf("  vector<Shape>[0]: %s\n", shapes[0].name().c_str());
    return 0;
}
```

**Fixes:** pass by reference or pointer; store `std::unique_ptr<Base>` in containers; make polymorphic bases non-copyable (`Shape(const Shape&) = delete;`) or give them a `virtual clone()` for deep copies.

---

## 9. Abstract classes and interfaces

A class with at least one **pure virtual** function (`= 0`) is abstract: it can't be instantiated. An "interface" in C++ is a class with only pure virtual functions and a virtual destructor.

```cpp
#include <cstdio>
#include <memory>
#include <string>

class Logger {                                  // interface
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

class ConsoleLogger : public Logger {
public:
    void log(const std::string& msg) override { std::printf("[console] %s\n", msg.c_str()); }
};

class PrefixLogger : public Logger {            // a decorator: wraps another Logger
public:
    PrefixLogger(std::string prefix, std::unique_ptr<Logger> inner)
        : prefix(std::move(prefix)), inner(std::move(inner)) {}
    void log(const std::string& msg) override { inner->log(prefix + msg); }
private:
    std::string prefix;
    std::unique_ptr<Logger> inner;
};

class OrderService {                            // depends on the abstraction, not a concrete logger
public:
    explicit OrderService(Logger& logger) : logger(logger) {}
    void placeOrder(int id) { logger.log("order " + std::to_string(id) + " placed"); }
private:
    Logger& logger;
};

int main() {
    PrefixLogger logger("[shop] ", std::make_unique<ConsoleLogger>());
    OrderService service(logger);               // dependency injection: easy to swap in a test logger
    service.placeOrder(17);
    return 0;
}
```

This is the **dependency inversion principle**: high-level code depends on interfaces, so implementations can be swapped (e.g. a fake logger in unit tests).

A pure virtual function may still have a body (`void Base::f() = 0` plus a definition) that derived classes can call explicitly — and a pure virtual **destructor** must have one.

---

## 10. Operator overloading

Make your types behave like built-ins — but only when the meaning is obvious.

```cpp
#include <compare>
#include <cstdio>
#include <ostream>
#include <sstream>

class Fraction {
public:
    Fraction(long n = 0, long d = 1) : num(n), den(d) { normalise(); }   // implicit from long: natural

    // Compound assignment as members (they modify *this)...
    Fraction& operator+=(const Fraction& o) {
        num = num * o.den + o.num * den;
        den *= o.den;
        normalise();
        return *this;
    }
    Fraction& operator*=(const Fraction& o) {
        num *= o.num;
        den *= o.den;
        normalise();
        return *this;
    }

    // ...binary operators as non-member friends, so both sides can convert: 1 + f and f + 1 both work.
    friend Fraction operator+(Fraction a, const Fraction& b) { return a += b; }
    friend Fraction operator*(Fraction a, const Fraction& b) { return a *= b; }
    Fraction operator-() const { return Fraction(-num, den); }

    // C++20: one defaulted == and a <=> give all six comparisons.
    friend bool operator==(const Fraction&, const Fraction&) = default;   // works because we normalise
    friend std::strong_ordering operator<=>(const Fraction& a, const Fraction& b) {
        return a.num * b.den <=> b.num * a.den;                              // dens are positive
    }

    friend std::ostream& operator<<(std::ostream& os, const Fraction& f) {
        return os << f.num << '/' << f.den;
    }

private:
    static long gcd(long a, long b) {
        while (b != 0) {
            long t = a % b;
            a = b;
            b = t;
        }
        return a < 0 ? -a : a;
    }
    void normalise() {
        if (den < 0) {
            num = -num;
            den = -den;
        }
        long g = gcd(num, den);
        if (g != 0) {
            num /= g;
            den /= g;
        }
    }
    long num;
    long den;
};

int main() {
    Fraction a(1, 2);
    Fraction b(1, 3);
    Fraction c = a + b;           // 5/6
    Fraction d = 1 + a;           // 3/2: 1 converts via the non-member operator
    std::ostringstream out;
    out << c << ' ' << d << ' ' << (a * b) << ' ' << -a;
    std::printf("%s\n", out.str().c_str());
    std::printf("a < b? %d   a == 2/4? %d   a >= b? %d\n", a < b, a == Fraction(2, 4), a >= b);
    return 0;
}
```

**Guidelines**

| Operator | Usually | Notes |
|---|---|---|
| `=`, `[]`, `()`, `->`, compound `+=` etc. | member | `=`, `[]`, `()`, `->` must be members |
| binary `+ - * / == <` | non-member (often `friend`) | symmetric conversions on both sides |
| `<<`, `>>` for streams | non-member | the left operand is the stream |
| `<=>` (C++20) | defaulted or custom | generates `< <= > >=`; `==` generates `!=` |
| `&&`, `||`, `,` | **don't overload** | lose short-circuiting / sequencing |

Implement `+` in terms of `+=` (as above) so there's one source of truth.

---

## 11. Multiple inheritance and the diamond

```text
        Device
       /      \
   Printer   Scanner
       \      /
        Copier        ← two Device subobjects unless inheritance is virtual
```

```cpp
#include <cstdio>

struct Device {
    int id = 0;
    explicit Device(int i = 0) : id(i) { std::printf("  Device(%d)\n", i); }
};

struct Printer : virtual Device {          // virtual base: shared by everyone who also inherits it virtually
    Printer() : Device(1) {}
};
struct Scanner : virtual Device {
    Scanner() : Device(2) {}
};

struct Copier : Printer, Scanner {
    Copier() : Device(42) {}               // the MOST-DERIVED class initialises the virtual base
};

int main() {
    Copier c;                              // prints Device(42) once
    std::printf("one shared Device, id = %d (no ambiguity)\n", c.id);
    return 0;
}
```

Without `virtual`, `Copier` would contain two `Device`s and `c.id` would be ambiguous. Virtual inheritance costs an extra indirection and complicates construction. In practice: **multiple inheritance of interfaces (pure abstract classes) is fine and common; multiple inheritance of state is best avoided.**

---

## 12. Overloading, overriding and hiding

| | Where | Rule |
|---|---|---|
| **Overloading** | same scope | same name, different parameters; chosen at compile time |
| **Overriding** | derived class | same signature as a base **virtual** function; chosen at run time |
| **Hiding** | derived class | any function with the same **name** hides **all** base overloads of that name |

```cpp
#include <cstdio>

struct Base {
    void print(int x) { std::printf("  Base::print(int %d)\n", x); }
    void print(double x) { std::printf("  Base::print(double %.1f)\n", x); }
};

struct Hides : Base {
    void print(const char* s) { std::printf("  Hides::print(%s)\n", s); }   // hides BOTH Base::print overloads
};

struct Unhides : Base {
    using Base::print;                                                      // bring the base overloads back
    void print(const char* s) { std::printf("  Unhides::print(%s)\n", s); }
};

int main() {
    Hides h;
    h.print("text");
    // h.print(3);            // error: Base::print(int) is hidden
    h.Base::print(3);         // explicit qualification still works
    Unhides u;
    u.print(3);
    u.print(2.5);
    u.print("text");
    return 0;
}
```

---

## 13. Composition over inheritance

Inheritance is the **tightest** coupling in C++: derived classes depend on the base's implementation details, and the hierarchy is fixed at compile time. Prefer **has-a** (a member) unless you truly need substitutability.

```cpp
#include <cstdio>
#include <string>
#include <vector>

// BAD idea: class Stack : public std::vector<int> — exposes insert(), erase(), [] ... breaks the "stack" contract.

class Stack {                                  // GOOD: has-a vector, exposes only stack operations
public:
    void push(int v) { items.push_back(v); }
    int pop() {
        int top = items.back();
        items.pop_back();
        return top;
    }
    bool empty() const { return items.empty(); }
private:
    std::vector<int> items;
};

// Behaviour by composition: swap strategies at run time.
struct Engine {
    virtual ~Engine() = default;
    virtual std::string start() const = 0;
};
struct Electric : Engine {
    std::string start() const override { return "silent hum"; }
};
struct Petrol : Engine {
    std::string start() const override { return "vroom"; }
};

class Car {
public:
    explicit Car(const Engine& e) : engine(&e) {}
    void swapEngine(const Engine& e) { engine = &e; }   // impossible if Car *inherited* from an engine type
    void drive() const { std::printf("  car: %s\n", engine->start().c_str()); }
private:
    const Engine* engine;
};

int main() {
    Stack s;
    s.push(1);
    s.push(2);
    std::printf("pop %d\n", s.pop());
    Electric e;
    Petrol p;
    Car car(p);
    car.drive();
    car.swapEngine(e);
    car.drive();
    return 0;
}
```

### SOLID in one table

| Principle | Meaning | C++ tool |
|---|---|---|
| **S**ingle responsibility | one reason to change per class | small classes, free functions |
| **O**pen/closed | extend without modifying | virtual interfaces, templates |
| **L**iskov substitution | derived usable wherever base is | honour base contracts; no surprising overrides |
| **I**nterface segregation | small, focused interfaces | several pure abstract classes |
| **D**ependency inversion | depend on abstractions | inject interfaces (references/smart pointers) |

---

## 14. Static polymorphism: templates and CRTP

When the set of types is known at compile time, you can get polymorphism **without** virtual calls — the compiler inlines everything.

```cpp
#include <cstdio>

// CRTP: the base knows the derived type as a template parameter.
template <typename Derived>
class Shape {
public:
    double area() const {
        return static_cast<const Derived*>(this)->areaImpl();   // resolved at compile time, inlinable
    }
    void describe() const { std::printf("  area = %.2f\n", area()); }
protected:
    ~Shape() = default;                                          // protected non-virtual: no deletion via base
};

class Square : public Shape<Square> {
public:
    explicit Square(double s) : side(s) {}
    double areaImpl() const { return side * side; }
private:
    double side;
};

class Circle : public Shape<Circle> {
public:
    explicit Circle(double r) : radius(r) {}
    double areaImpl() const { return 3.14159 * radius * radius; }
private:
    double radius;
};

template <typename T>
void report(const Shape<T>& s) {     // works for any CRTP shape, no vtable
    s.describe();
}

int main() {
    report(Square(2.0));
    report(Circle(1.0));
    return 0;
}
```

C++20 **concepts** are often a cleaner alternative to CRTP for "any type with an `area()`" (see *Templates & Concepts*).

| | Dynamic (virtual) | Static (templates/CRTP/concepts) |
|---|---|---|
| Decided | run time | compile time |
| Heterogeneous container | yes (`vector<unique_ptr<Base>>`) | no (each `Shape<T>` is a different type) |
| Inlining | usually not | yes |
| Binary size | one copy of code | one instantiation per type |
| Adding types without recompiling users | yes (plugins) | no |

### Type erasure: the best of both

`std::function`, `std::any` and hand-written type erasure give you a value type with run-time polymorphism **without** requiring an inheritance hierarchy from users:

```cpp
#include <cstdio>
#include <memory>
#include <vector>

class AnyShape {                                   // users never inherit from anything
public:
    template <typename T>
    AnyShape(T shape) : self(std::make_unique<Model<T>>(std::move(shape))) {}
    AnyShape(const AnyShape& o) : self(o.self->clone()) {}
    AnyShape& operator=(AnyShape o) noexcept {
        self = std::move(o.self);
        return *this;
    }
    double area() const { return self->area(); }

private:
    struct Concept {                               // internal interface
        virtual ~Concept() = default;
        virtual double area() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;
    };
    template <typename T>
    struct Model : Concept {                       // wraps any T that has .area()
        T shape;
        explicit Model(T s) : shape(std::move(s)) {}
        double area() const override { return shape.area(); }
        std::unique_ptr<Concept> clone() const override { return std::make_unique<Model>(*this); }
    };
    std::unique_ptr<Concept> self;
};

struct Rect {
    double w, h;
    double area() const { return w * h; }
};
struct Tri {
    double b, h;
    double area() const { return 0.5 * b * h; }
};

int main() {
    std::vector<AnyShape> shapes = {Rect{2, 3}, Tri{4, 5}, Rect{1, 1}};   // value semantics, heterogeneous
    double total = 0;
    for (const auto& s : shapes) {
        total += s.area();
    }
    std::printf("total area = %.1f\n", total);   // 6 + 10 + 1 = 17
    return 0;
}
```

(Sean Parent's talk "Inheritance Is the Base Class of Evil" popularised this pattern.)

---

## 15. Interview checklist

- [ ] Encapsulation and invariants; `class` vs `struct`.
- [ ] Initialiser lists, declaration-order initialisation, `explicit`, delegating constructors.
- [ ] `const` member functions and `mutable`.
- [ ] Virtual dispatch: vptr/vtable diagram, costs, behaviour in constructors/destructors.
- [ ] Virtual destructors; slicing and its fixes.
- [ ] `override`, `final`, abstract classes, interfaces, dependency injection.
- [ ] Operator overloading rules; `<=>`.
- [ ] Diamond problem and virtual inheritance.
- [ ] Overloading vs overriding vs hiding (`using Base::f`).
- [ ] Composition over inheritance; CRTP; type erasure.

---

## Practice

1. Design a `Shape` hierarchy with `Circle`, `Rectangle` and `Triangle`, a `virtual std::unique_ptr<Shape> clone() const`, and a function that deep-copies a `std::vector<std::unique_ptr<Shape>>`.
2. Write a `Vector2` class with `+`, `-`, scalar `*` (both `v * 2` and `2 * v`), `==`, and `operator<<`.
3. What does this print, and why? `struct B { virtual void f(int x = 1) { std::printf("B %d\n", x); } }; struct D : B { void f(int x = 2) override { std::printf("D %d\n", x); } }; B* p = new D; p->f();`
4. Without running it, give `sizeof` on x86-64 for `struct A { virtual void f(); char c; };` and `struct B : A { int i; };`.
5. Refactor `class Logger : public std::ofstream` into a composition-based design and explain what was wrong.

:::details Show solution
1.
```cpp
#include <cassert>
#include <memory>
#include <vector>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual std::unique_ptr<Shape> clone() const = 0;
};
struct Circle : Shape {
    double r;
    explicit Circle(double r) : r(r) {}
    double area() const override { return 3.14159 * r * r; }
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
};
struct Rectangle : Shape {
    double w, h;
    Rectangle(double w, double h) : w(w), h(h) {}
    double area() const override { return w * h; }
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Rectangle>(*this); }
};

std::vector<std::unique_ptr<Shape>> deepCopy(const std::vector<std::unique_ptr<Shape>>& in) {
    std::vector<std::unique_ptr<Shape>> out;
    out.reserve(in.size());
    for (const auto& s : in) {
        out.push_back(s->clone());     // virtual clone keeps the dynamic type: no slicing
    }
    return out;
}

int main() {
    std::vector<std::unique_ptr<Shape>> a;
    a.push_back(std::make_unique<Circle>(1.0));
    a.push_back(std::make_unique<Rectangle>(2.0, 3.0));
    auto b = deepCopy(a);
    assert(b.size() == 2 && b[1]->area() == 6.0 && b[0].get() != a[0].get());
    return 0;
}
```
2. Members `+=`, `-=`, `*=(double)`; non-member `operator+(Vector2, const Vector2&)`, `operator*(Vector2, double)` **and** `operator*(double, Vector2)` (the scalar-first version can't be a member), `friend bool operator==(const Vector2&, const Vector2&) = default;`, and `friend std::ostream& operator<<(std::ostream&, const Vector2&)`.
3. `D 1`. The function is dispatched dynamically (D's body runs), but **default arguments are bound statically** from the static type `B*`. Never change default arguments in overrides.
4. `A`: vptr (8) + `char` (1) + 7 bytes padding = **16**. `B`: also **16** with GCC/Clang — the Itanium C++ ABI lets a derived class reuse the *tail padding* of a non-POD base, so `i` goes at offset 12 inside A's padding. (A good answer explains vptr + padding, and notes that tail-padding reuse is ABI-specific — MSVC gives 24.)
5. Public inheritance from `std::ofstream` exposes every stream operation (seek, close, `<<` of arbitrary types) and makes `Logger` substitutable for a stream, which isn't the intent; it also can't easily switch to logging elsewhere. Better: `class Logger { public: void log(std::string_view); private: std::ofstream out; };` — or inject an interface (`LogSink`) so tests and other destinations are possible.
:::

---

## Interview Q&A

- **What are the four pillars of OOP?** Encapsulation, abstraction, inheritance, polymorphism.
- **Compile-time vs runtime polymorphism?** Overloading/templates/CRTP vs virtual functions.
- **Can constructors be virtual?** No (no object yet, no vptr). Use a virtual `clone()` / factory instead.
- **Can you call a virtual function from a destructor?** Yes, but it dispatches to the current class, not derived.
- **What's the size of a class with one virtual function and an `int`?** Typically 16 on 64-bit (8 vptr + 4 int + 4 padding).
- **Overloading vs overriding vs hiding?** Same scope different params / derived replaces virtual with same signature / derived name hides all base overloads (bring them back with `using Base::f;`).
- **What is `= delete` useful for besides copy?** Forbidding unwanted conversions: `void f(double); void f(int) = delete;`.
- **How does virtual dispatch work?** Each polymorphic object has a hidden vptr to its class's vtable (an array of function pointers); a virtual call loads the vptr, picks the entry, and calls it indirectly.
- **What is object slicing and how do you prevent it?** Copying a derived object into a base object keeps only the base part; pass by reference/pointer, store smart pointers, or make the base non-copyable.
- **Why use `override`?** The compiler verifies the function actually overrides a base virtual function, catching signature mismatches that would otherwise silently create a new function.
- **When should a destructor be virtual?** When objects may be deleted through a pointer to the base class; otherwise make the base destructor protected and non-virtual.
- **How does virtual inheritance solve the diamond problem?** The shared base becomes a single subobject, initialised by the most-derived class, so there's no duplicate state or ambiguity.
- **Are default arguments dynamically dispatched?** No — they come from the static type of the expression, while the function body comes from the dynamic type; don't redefine defaults in overrides.
- **What is CRTP?** A base class template parameterised by its derived class (`class D : Base<D>`), giving compile-time polymorphism without virtual calls.

---

## External resources

- **cppreference — Classes, Derived classes, Virtual functions, `override`, `final`, Operator overloading, Default comparisons.**
- **C++ Core Guidelines — section C (Classes and class hierarchies).**
- **Scott Meyers — *Effective C++* (3rd ed.), chapters 6 (Inheritance and OO design) and 4 (Designs and declarations).**
- **Sean Parent — "Inheritance Is the Base Class of Evil"** (GoingNative 2013): type erasure and value semantics.
- **Klaus Iglberger — *C++ Software Design*** (O'Reilly, 2022): modern design guidelines, type erasure, strategy vs CRTP.
