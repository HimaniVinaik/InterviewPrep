# Creational Patterns

Creational patterns control **how objects are created**, decoupling client code from concrete classes and construction details.

| Pattern | Intent | Modern C++ note |
|---|---|---|
| Singleton | exactly one instance, global access | Meyers singleton; prefer dependency injection |
| Factory Method | subclasses/functions decide which class to instantiate | return `std::unique_ptr<Base>` |
| Abstract Factory | create families of related objects | interface of factory methods |
| Builder | construct complex objects step by step | fluent API or designated initialisers |
| Prototype | clone existing objects | virtual `clone()` returning `unique_ptr` |
| Object Pool | reuse expensive objects | common in embedded / games |

## 1. Singleton

**Intent:** guarantee a single instance and a global access point (logger, hardware peripheral, config).

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;          // C++11: thread-safe lazy initialisation ("magic statics")
        return inst;
    }
    void log(std::string_view msg) {
        std::lock_guard lk(m_);
        std::println("[log] {}", msg);
    }

    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
private:
    Logger() = default;              // only instance() can construct
    std::mutex m_;
};

Logger::instance().log("boot");
```

**Why it's controversial:** hidden global state, hard to test (can't substitute a fake), hidden dependencies, destruction-order issues at exit.

**Better alternative:** create one instance in `main` and pass it by reference (dependency injection). Use a singleton only for truly unique things — e.g. a hardware peripheral wrapper where two instances would be a bug.

```cpp
// Embedded: one class per peripheral, can't be copied or constructed twice
class Uart1 {
public:
    static Uart1& get() { static Uart1 u; return u; }
    void write(uint8_t b);
private:
    Uart1() { /* enable clock, configure pins, set baud */ }
};
```

**Interview follow-up — double-checked locking (pre-C++11 style):** explain it's broken without proper atomics/memory ordering and unnecessary now thanks to magic statics.

## 2. Factory Method

**Intent:** define an interface for creating an object, but let a function or subclass decide which concrete type.

```cpp
struct Sensor {
    virtual ~Sensor() = default;
    virtual double read() = 0;
};
struct Thermistor : Sensor { double read() override { return 21.5; } };
struct Bme280     : Sensor { double read() override { return 22.1; } };

enum class SensorKind { Thermistor, Bme280 };

std::unique_ptr<Sensor> make_sensor(SensorKind k) {
    switch (k) {
        case SensorKind::Thermistor: return std::make_unique<Thermistor>();
        case SensorKind::Bme280:     return std::make_unique<Bme280>();
    }
    return nullptr;
}
```

### Registry-based factory (open for extension)

```cpp
class SensorFactory {
    using Creator = std::function<std::unique_ptr<Sensor>()>;
    std::unordered_map<std::string, Creator> creators_;
public:
    void reg(std::string name, Creator c) { creators_[std::move(name)] = std::move(c); }
    std::unique_ptr<Sensor> create(const std::string& name) const {
        auto it = creators_.find(name);
        return it == creators_.end() ? nullptr : it->second();
    }
};

SensorFactory f;
f.reg("bme280", [] { return std::make_unique<Bme280>(); });
auto s = f.create("bme280");      // new sensors register themselves: no switch to edit
```

## 3. Abstract Factory

**Intent:** create **families** of related objects without specifying concrete classes. E.g. a UI toolkit per OS, or a HAL per board.

```cpp
struct IGpio { virtual ~IGpio() = default; virtual void set(int pin, bool v) = 0; };
struct ISpi  { virtual ~ISpi()  = default; virtual void transfer(std::span<uint8_t>) = 0; };

struct IHalFactory {
    virtual ~IHalFactory() = default;
    virtual std::unique_ptr<IGpio> gpio() = 0;
    virtual std::unique_ptr<ISpi>  spi(int bus) = 0;
};

struct Stm32Hal : IHalFactory {
    std::unique_ptr<IGpio> gpio() override;
    std::unique_ptr<ISpi>  spi(int bus) override;
};
struct SimHal : IHalFactory {            // host simulation for tests
    std::unique_ptr<IGpio> gpio() override;
    std::unique_ptr<ISpi>  spi(int bus) override;
};

void app_main(IHalFactory& hal) {        // app code never names a concrete board
    auto led = hal.gpio();
    led->set(5, true);
}
```

## 4. Builder

**Intent:** construct a complex object step by step; same construction process can produce different representations; avoids "telescoping constructors".

```cpp
class HttpRequest {
public:
    class Builder;
    std::string method, url, body;
    std::vector<std::pair<std::string, std::string>> headers;
    std::chrono::milliseconds timeout{5000};
};

class HttpRequest::Builder {
    HttpRequest r_;
public:
    explicit Builder(std::string url) { r_.url = std::move(url); r_.method = "GET"; }
    Builder& method(std::string m)          { r_.method = std::move(m); return *this; }
    Builder& header(std::string k, std::string v) { r_.headers.emplace_back(std::move(k), std::move(v)); return *this; }
    Builder& body(std::string b)            { r_.body = std::move(b); return *this; }
    Builder& timeout(std::chrono::milliseconds t) { r_.timeout = t; return *this; }
    HttpRequest build() {
        if (r_.method == "GET" && !r_.body.empty()) throw std::logic_error("GET with body");
        return std::move(r_);               // validate once, at the end
    }
};

auto req = HttpRequest::Builder("https://api.example.com/v1/data")
               .method("POST")
               .header("Content-Type", "application/json")
               .body(R"({"temp": 21.5})")
               .timeout(std::chrono::seconds(2))
               .build();
```

**C++20 lightweight alternative** for plain configuration: designated initialisers.

```cpp
struct SpiConfig { uint32_t hz = 1'000'000; uint8_t mode = 0; bool lsb_first = false; };
Spi spi(SpiConfig{.hz = 8'000'000, .mode = 3});
```

## 5. Prototype

**Intent:** create new objects by cloning existing ones — useful when the concrete type is only known through a base pointer.

```cpp
struct Shape {
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
};

// CRTP helper to avoid writing clone() in every subclass
template <class Derived, class Base = Shape>
struct Cloneable : Base {
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Derived>(static_cast<const Derived&>(*this));
    }
};
struct Circle : Cloneable<Circle> { double r = 1; };

std::unique_ptr<Shape> a = std::make_unique<Circle>();
auto b = a->clone();          // deep copy of the right dynamic type
```

This is also the answer to *"How do you copy a polymorphic object?"* and *"Why can't constructors be virtual?"*

## 6. Object Pool

**Intent:** reuse a fixed set of pre-allocated objects instead of allocating/freeing (deterministic timing — great for embedded, networking buffers, game entities).

```cpp
template <class T, std::size_t N>
class ObjectPool {
    union Slot { Slot* next; alignas(T) std::byte storage[sizeof(T)]; };
    std::array<Slot, N> slots_;
    Slot* free_ = nullptr;
public:
    ObjectPool() {
        for (std::size_t i = 0; i < N; ++i) slots_[i].next = (i + 1 < N) ? &slots_[i + 1] : nullptr;
        free_ = &slots_[0];
    }
    template <class... Args>
    T* acquire(Args&&... args) {
        if (!free_) return nullptr;
        Slot* s = std::exchange(free_, free_->next);
        return std::construct_at(reinterpret_cast<T*>(s->storage), std::forward<Args>(args)...);
    }
    void release(T* obj) {
        std::destroy_at(obj);
        auto* s = reinterpret_cast<Slot*>(obj);
        s->next = free_;
        free_ = s;
    }
};
```

Pair with a `unique_ptr` + custom deleter that calls `release` for RAII-safe handles.

## Choosing in an interview

- Need to hide *which* class is created → **Factory**.
- Families of objects that must match → **Abstract Factory**.
- Many optional parameters / validation at the end → **Builder**.
- Copy through a base pointer → **Prototype**.
- One hardware resource → **Singleton** (with caveats) or just one instance passed by reference.
- No heap / bounded latency → **Object Pool**.

## Interview Q&A

- **What are the drawbacks of the Singleton pattern?** Hidden global state, hidden dependencies, hard to substitute in tests, and destruction-order problems at exit. Prefer creating one instance and passing it explicitly (dependency injection).
- **How do you implement a thread-safe singleton in modern C++?** Use a function-local static (`static T inst; return inst;`) — since C++11 its initialisation is guaranteed thread-safe ("magic statics").
- **When would you use the Builder pattern?** When an object has many optional parameters or needs validation once fully configured — it avoids telescoping constructors. Designated initialisers are a lightweight C++20 alternative for plain configs.
- **Factory Method vs Abstract Factory?** Factory Method creates one product, letting a function/subclass decide the concrete type. Abstract Factory creates families of related products that must match (e.g. a whole HAL per board).
- **How do you copy an object through a base-class pointer?** The Prototype pattern: a virtual `clone()` returning `std::unique_ptr<Base>`, implemented in each derived class (often via a CRTP helper).
