# SOLID & Design Principles

Design principles are the vocabulary of design interviews. Know each one, a C++ example of violating it, and the fix.

## S — Single Responsibility Principle

> A class should have **one reason to change**.

```cpp
// ❌ Parses, validates, stores AND emails — four reasons to change
class ReportManager {
public:
    Report parse(std::string_view csv);
    bool validate(const Report&);
    void save(const Report&);      // DB schema changes affect this class
    void email(const Report&);     // SMTP changes affect this class
};

// ✅ Split by responsibility; compose at a higher level
class ReportParser    { public: Report parse(std::string_view csv); };
class ReportValidator { public: bool validate(const Report&); };
class ReportStore     { public: void save(const Report&); };
class Notifier        { public: void send(const Report&); };
```

## O — Open/Closed Principle

> Open for extension, closed for modification. Add behaviour by adding code, not by editing working code.

```cpp
// ❌ Every new shape edits this switch
double area(const Shape& s) {
    switch (s.kind) { case Kind::Circle: /*...*/; case Kind::Rect: /*...*/; }
}

// ✅ New shapes extend the hierarchy (or add a variant alternative + visitor)
struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
struct Circle : Shape { double r; double area() const override { return std::numbers::pi * r * r; } };
struct Hexagon : Shape { double s; double area() const override { return 1.5 * std::sqrt(3.0) * s * s; } };
```

## L — Liskov Substitution Principle

> Subtypes must be usable wherever their base type is expected **without breaking correctness**.

```cpp
// Classic violation: Square "is-a" Rectangle mathematically, but not behaviourally
class Rectangle {
public:
    virtual void setWidth(int w)  { w_ = w; }
    virtual void setHeight(int h) { h_ = h; }
    int area() const { return w_ * h_; }
protected:
    int w_ = 0, h_ = 0;
};
class Square : public Rectangle {
public:
    void setWidth(int w) override  { w_ = h_ = w; }   // surprises callers
    void setHeight(int h) override { w_ = h_ = h; }
};
void stretch(Rectangle& r) { r.setWidth(5); r.setHeight(4); assert(r.area() == 20); }  // fails for Square
```

Signs of LSP violations: overrides that throw "not supported", strengthen preconditions, weaken postconditions, or need `dynamic_cast` checks by callers. Fix: different abstractions (immutable shapes, or no inheritance relationship).

## I — Interface Segregation Principle

> Clients shouldn't depend on methods they don't use. Prefer small, focused interfaces.

```cpp
// ❌ A sensor that can't calibrate is forced to stub calibrate()
struct IDevice { virtual void read() = 0; virtual void write() = 0; virtual void calibrate() = 0; };

// ✅
struct IReadable   { virtual ~IReadable() = default;   virtual Sample read() = 0; };
struct IWritable   { virtual ~IWritable() = default;   virtual void write(std::span<const uint8_t>) = 0; };
struct ICalibrated { virtual ~ICalibrated() = default; virtual void calibrate() = 0; };
class Thermometer : public IReadable, public ICalibrated { /* ... */ };
```

## D — Dependency Inversion Principle

> High-level modules shouldn't depend on low-level modules; both depend on **abstractions**.

```cpp
// ❌ Business logic hard-wired to a specific UART driver — untestable off-target
class Telemetry {
    Stm32Uart uart_;
public:
    void send(const Packet& p) { uart_.write(p.bytes()); }
};

// ✅ Depend on an interface; inject the concrete driver (real on target, fake in tests)
struct ITransport { virtual ~ITransport() = default; virtual void write(std::span<const uint8_t>) = 0; };

class Telemetry {
    ITransport& out_;
public:
    explicit Telemetry(ITransport& out) : out_(out) {}
    void send(const Packet& p) { out_.write(p.bytes()); }
};

struct FakeTransport : ITransport {
    std::vector<uint8_t> sent;
    void write(std::span<const uint8_t> d) override { sent.insert(sent.end(), d.begin(), d.end()); }
};
```

**Static alternative** (zero overhead, common in embedded): template on the dependency, constrained by a concept.

```cpp
template <typename T>
concept Transport = requires(T t, std::span<const uint8_t> d) { t.write(d); };

template <Transport T>
class TelemetryT {
    T& out_;
public:
    explicit TelemetryT(T& out) : out_(out) {}
    void send(const Packet& p) { out_.write(p.bytes()); }
};
```

## Other principles you should name-drop correctly

| Principle | Meaning |
|---|---|
| **DRY** | Don't Repeat Yourself — one authoritative representation of each piece of knowledge |
| **KISS** | Keep It Simple — the simplest design that works |
| **YAGNI** | You Aren't Gonna Need It — don't build for hypothetical requirements |
| **Composition over inheritance** | Assemble behaviour from parts (has-a) rather than deep hierarchies (is-a) |
| **Law of Demeter** | Talk to friends, not strangers: avoid `a.getB().getC().doX()` |
| **Encapsulate what varies** | Isolate the parts likely to change behind an interface |
| **Program to an interface** | Depend on abstractions, not concrete classes |
| **Tell, don't ask** | Tell objects to do things instead of pulling their data out and deciding for them |
| **High cohesion, low coupling** | Related things together; minimal dependencies between modules |
| **Principle of least astonishment** | APIs should behave as users expect |
| **Fail fast** | Detect and report errors as early as possible |

## C++-specific design guidance

- **Value semantics by default.** Types that behave like `int` (copyable, comparable) are easier to reason about than reference-heavy object graphs.
- **Make interfaces easy to use correctly and hard to use incorrectly** (Scott Meyers): strong types (`Meters`, `Seconds`) instead of `double`, `enum class` instead of `bool` flags.

```cpp
void set_timeout(std::chrono::milliseconds t);   // set_timeout(500) won't compile; set_timeout(500ms) will
void open(const Path& p, OpenMode mode);         // instead of open(p, true, false)
```

- **Non-virtual interface (NVI):** public non-virtual function calls a private virtual — the base enforces pre/post-conditions.
- **PImpl** for ABI stability and compile-time firewalls (see *Structural Patterns*).

## Interview tips

- When you propose a class, say *what it's responsible for* in one sentence.
- Mention testability: dependency inversion → you can unit test with fakes.
- Don't over-engineer: an interviewer might push back on 10 interfaces for a 50-line problem — that's YAGNI.

## Interview Q&A

- **State the Single Responsibility Principle.** A class should have one reason to change — one responsibility. Split parsing, storage, networking and presentation into separate components.
- **Explain the Liskov Substitution Principle with an example.** Subtypes must be usable wherever the base type is expected without breaking correctness. Square deriving from a mutable Rectangle violates it: setting width then height gives an unexpected area.
- **What is Dependency Inversion and why does it help testing?** High-level code depends on abstractions (interfaces/concepts) rather than concrete classes. You can inject a fake implementation (e.g. a fake UART) in unit tests.
- **Composition vs inheritance: which do you prefer and why?** Prefer composition: has-a relationships are looser, swappable at runtime and easier to test. Use inheritance for genuine is-a relationships and interfaces.
- **What is the Interface Segregation Principle?** Clients shouldn't depend on methods they don't use; prefer several small focused interfaces over one fat interface.
