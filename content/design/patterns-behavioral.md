# Behavioral Patterns

Behavioral patterns are about **algorithms and the assignment of responsibilities** between objects — how they communicate and who decides what.

| Pattern | Intent |
|---|---|
| Strategy | swap algorithms at runtime (or compile time) |
| Observer | notify many subscribers of state changes |
| Command | encapsulate a request as an object (undo, queues, macros) |
| State | change behaviour when internal state changes |
| Template Method | fixed algorithm skeleton, customisable steps |
| Iterator | sequential access without exposing internals |
| Visitor | add operations to a class hierarchy without modifying it |
| Chain of Responsibility | pass a request along handlers until one handles it |
| Mediator | centralise complex communication between objects |
| CRTP (C++ idiom) | static polymorphism via templates |

## 1. Strategy

**Intent:** define a family of interchangeable algorithms.

```cpp
// Runtime strategy with an interface
struct ICompression {
    virtual ~ICompression() = default;
    virtual std::vector<uint8_t> compress(std::span<const uint8_t>) = 0;
};
struct Rle  : ICompression { std::vector<uint8_t> compress(std::span<const uint8_t>) override; };
struct Lz4  : ICompression { std::vector<uint8_t> compress(std::span<const uint8_t>) override; };

class Logger {
    std::unique_ptr<ICompression> codec_;
public:
    explicit Logger(std::unique_ptr<ICompression> c) : codec_(std::move(c)) {}
    void set_codec(std::unique_ptr<ICompression> c) { codec_ = std::move(c); }
    void flush(std::span<const uint8_t> buf) { auto out = codec_->compress(buf); /* write */ }
};

// Lightweight strategy: just a callable
class Sorter {
    std::function<bool(int, int)> cmp_;
public:
    explicit Sorter(std::function<bool(int, int)> c) : cmp_(std::move(c)) {}
    void sort(std::vector<int>& v) { std::ranges::sort(v, cmp_); }
};

// Compile-time strategy (policy-based design): zero overhead
template <class CompressionPolicy>
class FastLogger : private CompressionPolicy {
public:
    void flush(std::span<const uint8_t> buf) { auto out = this->compress(buf); }
};
```

STL examples: comparators in `std::sort`, allocators, hash functions.

## 2. Observer (publish/subscribe)

**Intent:** when one object changes, all dependents are notified automatically.

```cpp
template <class... Args>
class Signal {
public:
    using Slot = std::function<void(Args...)>;
    using Id = std::size_t;

    Id connect(Slot s) { slots_.emplace(next_, std::move(s)); return next_++; }
    void disconnect(Id id) { slots_.erase(id); }
    void emit(Args... args) const {
        for (const auto& [id, s] : slots_) s(args...);
    }
private:
    std::map<Id, Slot> slots_;
    Id next_ = 0;
};

struct BatteryMonitor {
    Signal<float> on_low;                     // subject
    void sample(float v) { if (v < 3.3f) on_low.emit(v); }
};

BatteryMonitor bm;
auto id = bm.on_low.connect([](float v) { std::println("Low battery: {:.2f} V", v); });
bm.on_low.connect([](float) { /* reduce CPU clock */ });
bm.sample(3.1f);
bm.on_low.disconnect(id);
```

Pitfalls interviewers probe:
- **Lifetime:** observers destroyed while still subscribed → dangling callbacks. Use RAII connection handles (disconnect in destructor) or `weak_ptr` observers.
- **Re-entrancy:** a callback that subscribes/unsubscribes during `emit` invalidates iterators — copy the slot list or defer modifications.
- **Thread safety:** protect the subscriber list; don't hold the lock while calling callbacks (deadlock risk).

## 3. Command

**Intent:** encapsulate a request as an object — enabling undo/redo, queuing, logging, macro recording, and transactional behaviour.

```cpp
struct ICommand {
    virtual ~ICommand() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class Document { public: std::string text; };

class InsertText : public ICommand {
    Document& doc_; std::size_t pos_; std::string s_;
public:
    InsertText(Document& d, std::size_t p, std::string s) : doc_(d), pos_(p), s_(std::move(s)) {}
    void execute() override { doc_.text.insert(pos_, s_); }
    void undo() override    { doc_.text.erase(pos_, s_.size()); }
};

class History {
    std::vector<std::unique_ptr<ICommand>> done_, undone_;
public:
    void run(std::unique_ptr<ICommand> c) { c->execute(); done_.push_back(std::move(c)); undone_.clear(); }
    void undo() { if (done_.empty()) return; done_.back()->undo(); undone_.push_back(std::move(done_.back())); done_.pop_back(); }
    void redo() { if (undone_.empty()) return; undone_.back()->execute(); done_.push_back(std::move(undone_.back())); undone_.pop_back(); }
};
```

Embedded flavour: a command queue between ISRs/tasks (`std::variant<SetLed, StartMotor, ...>` messages processed by a worker task).

## 4. State

**Intent:** an object alters its behaviour when its internal state changes — it appears to change class. The OO alternative to giant `switch` statements.

```cpp
// Modern C++: states as variant alternatives, transitions via std::visit
struct Idle {};
struct Connecting { int attempts = 0; };
struct Connected { std::string peer; };
struct Error { std::string reason; };
using State = std::variant<Idle, Connecting, Connected, Error>;

struct EvConnect {}; struct EvSuccess { std::string peer; }; struct EvFail {}; struct EvReset {};
using Event = std::variant<EvConnect, EvSuccess, EvFail, EvReset>;

template <class... Fs> struct overloaded : Fs... { using Fs::operator()...; };

State transition(const State& s, const Event& e) {
    return std::visit(overloaded{
        [](const Idle&, const EvConnect&) -> State { return Connecting{}; },
        [](const Connecting&, const EvSuccess& ev) -> State { return Connected{ev.peer}; },
        [](const Connecting& c, const EvFail&) -> State {
            if (c.attempts >= 3) return Error{"too many retries"};
            return Connecting{c.attempts + 1};
        },
        [](const auto&, const EvReset&) -> State { return Idle{}; },
        [](const auto& st, const auto&) -> State { return st; },   // ignore other events
    }, s, e);
}
```

Classic GoF version: an abstract `State` class with `handle()` methods; the context holds `std::unique_ptr<State>` and states replace it. For embedded C, a **table-driven FSM** (state × event → handler + next state) is the norm — see *Embedded Software Architecture*.

## 5. Template Method

**Intent:** define the skeleton of an algorithm in a base class and let subclasses override specific steps. In C++ this pairs naturally with the **NVI (non-virtual interface)** idiom.

```cpp
class SensorDriver {
public:
    std::optional<float> sample() {                // fixed algorithm, non-virtual
        if (!wake()) return std::nullopt;
        auto raw = read_raw();
        sleep();
        if (!raw) return std::nullopt;
        return convert(*raw);
    }
    virtual ~SensorDriver() = default;
private:
    virtual bool wake() { return true; }           // optional hook with default
    virtual std::optional<uint16_t> read_raw() = 0;   // required step
    virtual float convert(uint16_t raw) = 0;
    virtual void sleep() {}
};
```

## 6. Iterator

**Intent:** traverse a collection without exposing its representation. In C++, implement the iterator concept so range-for and `<algorithm>` work.

```cpp
template <class T, std::size_t N>
class RingBuffer {
    std::array<T, N> buf_{};
    std::size_t head_ = 0, size_ = 0;
public:
    void push(const T& v) { buf_[(head_ + size_) % N] = v; if (size_ < N) ++size_; else head_ = (head_ + 1) % N; }

    class iterator {
        const RingBuffer* rb_; std::size_t i_;
    public:
        using iterator_category = std::forward_iterator_tag;
        using value_type = T; using difference_type = std::ptrdiff_t;
        using pointer = const T*; using reference = const T&;
        iterator() = default;
        iterator(const RingBuffer* rb, std::size_t i) : rb_(rb), i_(i) {}
        reference operator*() const { return rb_->buf_[(rb_->head_ + i_) % N]; }
        iterator& operator++() { ++i_; return *this; }
        iterator operator++(int) { auto t = *this; ++i_; return t; }
        bool operator==(const iterator& o) const { return i_ == o.i_; }
    };
    iterator begin() const { return {this, 0}; }
    iterator end() const { return {this, size_}; }
};

RingBuffer<int, 4> rb;
for (int i = 0; i < 6; ++i) rb.push(i);
for (int x : rb) std::print("{} ", x);         // 2 3 4 5
```

## 7. Visitor

**Intent:** add new operations over a fixed class hierarchy without modifying those classes (double dispatch).

```cpp
// Classic double-dispatch visitor
struct Circle; struct Rect;
struct ShapeVisitor { virtual void visit(const Circle&) = 0; virtual void visit(const Rect&) = 0; virtual ~ShapeVisitor() = default; };
struct Shape { virtual void accept(ShapeVisitor& v) const = 0; virtual ~Shape() = default; };
struct Circle : Shape { double r; void accept(ShapeVisitor& v) const override { v.visit(*this); } };
struct Rect   : Shape { double w, h; void accept(ShapeVisitor& v) const override { v.visit(*this); } };

struct AreaVisitor : ShapeVisitor {
    double total = 0;
    void visit(const Circle& c) override { total += 3.14159 * c.r * c.r; }
    void visit(const Rect& r) override   { total += r.w * r.h; }
};

// Modern alternative: std::variant + std::visit — no accept() boilerplate
using AnyShape = std::variant<Circle, Rect>;
double area(const AnyShape& s) {
    return std::visit(overloaded{
        [](const Circle& c) { return 3.14159 * c.r * c.r; },
        [](const Rect& r)   { return r.w * r.h; },
    }, s);
}
```

Trade-off: Visitor makes adding **operations** easy and adding **types** hard (every visitor must change) — the opposite of virtual functions (the "expression problem").

## 8. Chain of Responsibility

```cpp
struct Handler {
    virtual ~Handler() = default;
    void set_next(std::unique_ptr<Handler> n) { next_ = std::move(n); }
    void handle(const Request& r) { if (!try_handle(r) && next_) next_->handle(r); }
protected:
    virtual bool try_handle(const Request& r) = 0;
private:
    std::unique_ptr<Handler> next_;
};
```

Used for middleware pipelines, event bubbling in UIs, interrupt/exception handler chains, protocol parsers.

## 9. Mediator

Objects communicate through a central mediator instead of referencing each other directly (e.g. an event bus, a chat room, an air-traffic controller). Reduces many-to-many coupling to many-to-one.

## 10. CRTP — Curiously Recurring Template Pattern

**Intent:** static polymorphism — the base class template knows the derived type at compile time.

```cpp
template <class Derived>
class Driver {
public:
    void init() {
        derived().configure_clock();       // resolved at compile time, inlinable
        derived().configure_pins();
    }
private:
    Derived& derived() { return static_cast<Derived&>(*this); }
};

class Spi1 : public Driver<Spi1> {
    friend class Driver<Spi1>;
    void configure_clock() { /* RCC */ }
    void configure_pins()  { /* GPIO AF */ }
};

// Other CRTP uses: mixins that add operators, object counters, enable_shared_from_this
template <class T> struct Comparable {
    friend bool operator!=(const T& a, const T& b) { return !(a == b); }
};
```

C++23 *deducing this* simplifies many CRTP uses:

```cpp
struct Base { void init(this auto&& self) { self.configure_clock(); } };
```

## Recognition guide

- "Switch algorithm based on config" → **Strategy**.
- "Notify interested parties" → **Observer**.
- "Undo/redo, queue jobs, log actions" → **Command**.
- "Behaviour depends on mode; big switch on state" → **State**.
- "Same steps, different details per subclass" → **Template Method**.
- "Custom container usable with range-for" → **Iterator**.
- "New operations on a stable set of types" → **Visitor** / `std::variant`.
- "Polymorphism without virtual overhead" → **CRTP** / concepts.

## Interview Q&A

- **Strategy vs State pattern?** Both swap behaviour via a held object. Strategy is chosen by the client to vary an algorithm; State changes itself as the object's internal state transitions.
- **What are common pitfalls with the Observer pattern?** Dangling callbacks when observers die while subscribed, re-entrancy (modifying the subscriber list during notification), and thread safety / calling callbacks while holding a lock.
- **How does the Command pattern enable undo/redo?** Each request is an object with `execute()` and `undo()`; a history stack of executed commands can be popped to undo and re-executed to redo.
- **What is CRTP and why use it?** The Curiously Recurring Template Pattern: `class D : public Base<D>`. The base knows the derived type at compile time, giving static polymorphism with no vtable and full inlining.
- **What's a modern C++ alternative to the classic Visitor pattern?** `std::variant` with `std::visit` and an overloaded lambda set — no `accept()` boilerplate, and the compiler checks every alternative is handled.
