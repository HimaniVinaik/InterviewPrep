# Classes & OOP in C++

C++ interviews love class mechanics: what the compiler generates for you, how virtual dispatch works, and the subtle traps (slicing, missing virtual destructors, initialisation order). This guide covers everything from a basic class to vtables.

## 1. Anatomy of a class

```cpp
class Account {
public:                                   // interface
    explicit Account(std::string owner, long long cents = 0)
        : owner_(std::move(owner)), balance_(cents) {}    // member initialiser list

    void deposit(long long c) {
        if (c <= 0) throw std::invalid_argument("non-positive deposit");
        balance_ += c;
    }
    [[nodiscard]] long long balance() const noexcept { return balance_; }  // const member fn
    const std::string& owner() const noexcept { return owner_; }

    static int count() { return count_; } // static: belongs to the class, no `this`

private:                                  // invariants live here
    std::string owner_;
    long long balance_ = 0;               // default member initialiser
    inline static int count_ = 0;         // C++17 inline static member
};
```

- `class` defaults to `private`, `struct` to `public` — that's the **only** difference.
- **Encapsulation:** private data + public functions that maintain invariants.
- `const` member functions promise not to modify the object; they're the only ones callable on `const Account&`.
- `mutable` members may be modified even in `const` functions (caches, mutexes).

## 2. Constructors

```cpp
class Point {
public:
    Point() = default;                          // default ctor
    Point(int x, int y) : x_(x), y_(y) {}      // parameterised
    explicit Point(int v) : Point(v, v) {}      // delegating ctor + explicit
    Point(const Point&) = default;              // copy ctor
    Point(Point&&) noexcept = default;          // move ctor
private:
    int x_ = 0, y_ = 0;
};

Point a;            // default
Point b{1, 2};      // brace (uniform) initialisation — no narrowing allowed
Point c = b;        // copy
// Point d = 5;     // error: explicit forbids implicit conversion
Point d{5};         // OK
```

### Member initialiser lists — use them

```cpp
class Widget {
    const int id_;          // const members MUST be initialised in the list
    std::string& ref_;      // references too
    std::string name_;
public:
    Widget(int id, std::string& r, std::string n)
        : id_(id), ref_(r), name_(std::move(n)) {}   // initialise, don't assign in the body
};
```

> **Gotcha:** Members are initialised in **declaration order**, not in the order you write the initialiser list. `-Wreorder` warns. If `b_` is declared before `a_`, then `: a_(1), b_(a_)` reads an uninitialised `a_`.

### `explicit`

Mark single-argument constructors (and conversion operators) `explicit` unless implicit conversion is genuinely desired. Prevents surprises like `void f(Buffer); f(42);` silently creating a 42-element buffer.

## 3. The special member functions

| Function | Signature | Generated when |
|---|---|---|
| default ctor | `T()` | no user-declared constructors |
| destructor | `~T()` | not user-declared |
| copy ctor | `T(const T&)` | no user move ops |
| copy assign | `T& operator=(const T&)` | no user move ops |
| move ctor | `T(T&&)` | no user copy ops/dtor/move assign |
| move assign | `T& operator=(T&&)` | no user copy ops/dtor/move ctor |

See *References & Move Semantics* for the Rule of 0/3/5. Use `= default` to request and `= delete` to forbid:

```cpp
class NonCopyable {
public:
    NonCopyable() = default;
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};
```

## 4. Inheritance

```cpp
class Shape {
public:
    explicit Shape(std::string name) : name_(std::move(name)) {}
    virtual ~Shape() = default;                       // ESSENTIAL for polymorphic bases
    virtual double area() const = 0;                  // pure virtual -> Shape is abstract
    virtual void describe() const { std::cout << name_ << ": " << area() << '\n'; }
    const std::string& name() const { return name_; }
private:
    std::string name_;
};

class Rect : public Shape {
public:
    Rect(double w, double h) : Shape("rect"), w_(w), h_(h) {}   // base initialised first
    double area() const override { return w_ * h_; }            // override: compiler-checked
private:
    double w_, h_;
};

class Square final : public Rect {                              // final: no further derivation
public:
    explicit Square(double s) : Rect(s, s) {}
    void describe() const override { std::cout << "square! "; Rect::describe(); }
};

std::vector<std::unique_ptr<Shape>> v;
v.push_back(std::make_unique<Rect>(2, 3));
v.push_back(std::make_unique<Square>(2));
for (const auto& s : v) s->describe();     // dynamic dispatch
```

### Access in inheritance

| Base member | `public` inheritance | `protected` | `private` |
|---|---|---|---|
| public | public | protected | private |
| protected | protected | protected | private |
| private | inaccessible | inaccessible | inaccessible |

Public inheritance models **is-a**. Private inheritance means *implemented-in-terms-of* (prefer composition).

### `override` and `final`

Always write `override`. Without it, a typo or signature mismatch (missing `const`) silently creates a new function instead of overriding:

```cpp
struct Base { virtual void f(int) const; };
struct D : Base {
    void f(int);              // NOT an override (missing const) — hides Base::f
    void f(int) const override;  // correct; compiler errors if it doesn't override
};
```

## 5. How virtual functions work: vtables

```text
 Rect object                      Rect's vtable (one per class, in .rodata)
 ┌──────────────┐                ┌────────────────────────┐
 │ vptr ────────┼──────────────► │ &Rect::~Rect           │
 │ name_        │                │ &Rect::area            │
 │ w_, h_       │                │ &Shape::describe       │
 └──────────────┘                └────────────────────────┘
```

- Each polymorphic class has a **vtable**: an array of function pointers.
- Each object stores a hidden **vptr** (typically the first 8 bytes) pointing to its class's vtable.
- `s->area()` compiles to: load vptr → load slot → indirect call.
- Cost: one pointer per object, an indirect call (hard to inline; may mispredict). Usually negligible, but matters in hot loops and on small MCUs.
- During construction/destruction, the vptr points at the **currently constructing class's** vtable — so virtual calls in constructors don't dispatch to derived overrides.

```cpp
struct B { B() { hello(); } virtual void hello() { std::puts("B"); } };
struct D : B { void hello() override { std::puts("D"); } };
D d;   // prints "B" — D's part doesn't exist yet
```

## 6. Virtual destructors

```cpp
struct Base { ~Base() { } };            // NOT virtual
struct Derived : Base { std::vector<int> big; };
Base* p = new Derived;
delete p;                               // UNDEFINED BEHAVIOUR: ~Derived never runs
```

> **Rule:** A base class destructor should be either **public and virtual** or **protected and non-virtual** (Core Guideline C.35).

## 7. Object slicing

```cpp
Rect r(2, 3);
Shape s = r;      // won't compile here (Shape is abstract) — but with a concrete base:
struct Animal { virtual std::string sound() const { return "..."; } };
struct Dog : Animal { std::string sound() const override { return "woof"; } };
Dog d;
Animal a = d;                 // SLICED: copies only the Animal part
std::cout << a.sound();       // "..."
void speak(Animal an);        // pass-by-value also slices
void speak(const Animal& an); // correct: polymorphism needs references or pointers
```

Prevent slicing in polymorphic hierarchies by deleting copy operations in the base or making it abstract.

## 8. Abstract classes and interfaces

A class with at least one pure virtual function can't be instantiated. A pure "interface" in C++:

```cpp
class ILogger {
public:
    virtual ~ILogger() = default;
    virtual void log(std::string_view msg) = 0;
protected:
    ILogger() = default;      // only derived classes construct
};
```

Pure virtual functions *can* have a definition (`void ILogger::log(std::string_view) {}`) callable as `ILogger::log(...)` — a trivia favourite.

## 9. Multiple inheritance & the diamond

```cpp
struct Device { int id = 0; };
struct Readable : virtual Device { };    // virtual inheritance
struct Writable : virtual Device { };
struct Port : Readable, Writable { };    // only ONE Device subobject
Port p; p.id = 3;                        // unambiguous thanks to virtual inheritance
```

Without `virtual`, `Port` contains two `Device` subobjects and `p.id` is ambiguous. Virtual bases are initialised by the **most-derived** class. Multiple inheritance of *interfaces* (pure abstract classes) is common and fine; multiple inheritance of state is usually a design smell.

## 10. Operator overloading

```cpp
struct Vec2 {
    double x = 0, y = 0;
    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }
    friend Vec2 operator+(Vec2 a, const Vec2& b) { return a += b; }  // symmetric, via +=
    friend bool operator==(const Vec2&, const Vec2&) = default;      // C++20
    double& operator[](size_t i) { return i == 0 ? x : y; }
    friend std::ostream& operator<<(std::ostream& os, const Vec2& v) {
        return os << '(' << v.x << ", " << v.y << ')';
    }
};

// C++20 three-way comparison generates <, <=, >, >= (and == when defaulted)
struct Version {
    int major, minor, patch;
    auto operator<=>(const Version&) const = default;
};
static_assert(Version{1, 2, 3} < Version{1, 3, 0});
```

Guidelines: implement `+` in terms of `+=`; make symmetric binary operators non-members (often hidden `friend`s); return `*this` by reference from assignment operators; don't overload `&&`, `||`, or `,` (they lose short-circuiting/sequencing).

## 11. `friend`, `static`, `this`

- `friend` grants a function or class access to private members. Use sparingly — operators and tightly coupled helpers.
- `static` data members are shared by all instances; `static` member functions have no `this`.
- `this` is a pointer to the current object (`T* const`, or `const T*` in const functions). C++23 *deducing this* lets you write `void f(this Self&& self)`.

## 12. Composition over inheritance

```cpp
// Inheritance couples you to the base's implementation
class Car : public Engine { };            // a car IS-A engine? no.

// Composition: has-a, swappable, testable
class Car {
    std::unique_ptr<IEngine> engine_;     // inject any engine; mock in tests
public:
    explicit Car(std::unique_ptr<IEngine> e) : engine_(std::move(e)) {}
};
```

## 13. Static polymorphism (CRTP) vs dynamic

```cpp
template <class Derived>
struct Shape {
    double area() const { return static_cast<const Derived&>(*this).area_impl(); }
};
struct Sq : Shape<Sq> { double s; double area_impl() const { return s * s; } };
```

No vtable, fully inlinable — common in embedded and high-performance code. C++20 **concepts** often replace CRTP for compile-time interfaces. See *Design → Behavioral Patterns*.

## Interview Q&A

- **What are the four pillars of OOP?** Encapsulation, abstraction, inheritance, polymorphism.
- **Compile-time vs runtime polymorphism?** Overloading/templates/CRTP vs virtual functions.
- **Can constructors be virtual?** No (no object yet, no vptr). Use a virtual `clone()` / factory instead.
- **Can you call a virtual function from a destructor?** Yes, but it dispatches to the current class, not derived.
- **What's the size of a class with one virtual function and an `int`?** Typically 16 on 64-bit (8 vptr + 4 int + 4 padding).
- **Overloading vs overriding vs hiding?** Same scope different params / derived replaces virtual with same signature / derived name hides all base overloads (bring them back with `using Base::f;`).
- **What is `= delete` useful for besides copy?** Forbidding unwanted conversions: `void f(double); void f(int) = delete;`.
