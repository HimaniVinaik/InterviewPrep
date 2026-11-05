# LLD Worked Examples

Six classic low-level design problems, each with requirements, design decisions and compact C++20 code you could write in an interview.

## 1. LRU Cache (generic, thread-safe)

**Requirements:** `get(key)` and `put(key, value)` in O(1); evict the least recently used entry at capacity; optionally thread-safe.

**Design:** hash map from key → list iterator; `std::list` keeps recency order (front = most recent). A mutex guards both. See Problems → LRU Cache for the LeetCode version.

```cpp
template <class K, class V>
class LruCache {
    using Entry = std::pair<K, V>;
    std::size_t cap_;
    std::list<Entry> items_;
    std::unordered_map<K, typename std::list<Entry>::iterator> index_;
    mutable std::mutex m_;
public:
    explicit LruCache(std::size_t cap) : cap_(cap) { if (cap == 0) throw std::invalid_argument("cap"); }

    std::optional<V> get(const K& k) {
        std::lock_guard lk(m_);
        auto it = index_.find(k);
        if (it == index_.end()) return std::nullopt;
        items_.splice(items_.begin(), items_, it->second);   // mark most-recent
        return it->second->second;
    }

    void put(K k, V v) {
        std::lock_guard lk(m_);
        if (auto it = index_.find(k); it != index_.end()) {
            it->second->second = std::move(v);
            items_.splice(items_.begin(), items_, it->second);
            return;
        }
        if (items_.size() == cap_) {
            index_.erase(items_.back().first);
            items_.pop_back();
        }
        items_.emplace_front(k, std::move(v));
        index_.emplace(std::move(k), items_.begin());
    }
};
```

**Extensions to discuss:** LFU (frequency buckets of lists), TTL expiry, sharding the cache into N locked segments to reduce contention, `std::shared_mutex` won't help much because `get` mutates recency.

## 2. Parking Lot

**Requirements:** multiple levels; spots of size Small/Medium/Large; vehicles Bike/Car/Truck need ≥ their size; issue a ticket on entry; compute the fee on exit; pricing may change; multiple gates concurrently.

```cpp
enum class Size : uint8_t { Small, Medium, Large };

struct Vehicle { std::string plate; Size size; };

class Spot {
public:
    Spot(int level, int id, Size s) : level_(level), id_(id), size_(s) {}
    bool fits(const Vehicle& v) const { return !occupant_ && v.size <= size_; }
    void park(const Vehicle& v) { occupant_ = v.plate; }
    void free() { occupant_.reset(); }
    int level() const { return level_; } int id() const { return id_; } Size size() const { return size_; }
private:
    int level_, id_; Size size_;
    std::optional<std::string> occupant_;
};

struct Ticket {
    int id; std::string plate; int level, spot;
    std::chrono::system_clock::time_point entered;
};

struct IPricing {
    virtual ~IPricing() = default;
    virtual long long fee_cents(Size, std::chrono::minutes parked) const = 0;
};
class HourlyPricing : public IPricing {
    std::array<long long, 3> per_hour_;
public:
    explicit HourlyPricing(std::array<long long, 3> rates) : per_hour_(rates) {}
    long long fee_cents(Size s, std::chrono::minutes m) const override {
        auto hours = (m.count() + 59) / 60;                    // round up
        return std::max<long long>(1, hours) * per_hour_[static_cast<int>(s)];
    }
};

class ParkingLot {
public:
    ParkingLot(std::vector<Spot> spots, std::unique_ptr<IPricing> pricing, const IClock& clock)
        : spots_(std::move(spots)), pricing_(std::move(pricing)), clock_(clock) {}

    std::optional<Ticket> enter(const Vehicle& v) {
        std::lock_guard lk(m_);                                // gates call concurrently
        auto it = std::ranges::find_if(spots_, [&](const Spot& s) { return s.fits(v); });
        if (it == spots_.end()) return std::nullopt;           // full for this size
        it->park(v);
        Ticket t{next_id_++, v.plate, it->level(), it->id(), clock_.now()};
        active_.emplace(t.id, std::make_pair(t, &*it));
        return t;
    }

    std::expected<long long, std::string> exit(int ticket_id) {
        std::lock_guard lk(m_);
        auto it = active_.find(ticket_id);
        if (it == active_.end()) return std::unexpected("unknown ticket");
        auto& [ticket, spot] = it->second;
        auto mins = std::chrono::duration_cast<std::chrono::minutes>(clock_.now() - ticket.entered);
        long long fee = pricing_->fee_cents(spot->size(), mins);
        spot->free();
        active_.erase(it);
        return fee;
    }
private:
    std::vector<Spot> spots_;                     // stable: never resized after construction
    std::unique_ptr<IPricing> pricing_;
    const IClock& clock_;
    std::unordered_map<int, std::pair<Ticket, Spot*>> active_;
    int next_id_ = 1;
    std::mutex m_;
};
```

**Talking points:** spot allocation as a Strategy (nearest to gate, fill lowest level first); per-size free lists (`std::set<int>` of free spot ids) for O(log n) allocation instead of a linear scan; `Spot*` stability relies on not resizing `spots_`; an Observer to update "free spots" displays.

## 3. Elevator System

**Requirements:** N elevators, M floors; hall calls (up/down) and car calls (floor buttons); efficient scheduling; doors; safety (overweight, emergency stop).

**Design:**
- `Elevator` has a **State** (Idle, MovingUp, MovingDown, DoorsOpen, Maintenance) and a set of target floors.
- `Dispatcher` assigns hall calls to elevators using a **Strategy** (nearest car, SCAN/"elevator algorithm", destination dispatch).
- A `tick()` drives the simulation — on real hardware, events come from sensors.

```cpp
enum class Dir { Up, Down, Idle };

class Elevator {
public:
    explicit Elevator(int id) : id_(id) {}
    void add_stop(int floor) { stops_.insert(floor); }
    int floor() const { return floor_; }
    Dir dir() const { return dir_; }
    std::size_t load() const { return stops_.size(); }

    void tick() {                                    // one time-step
        if (stops_.empty()) { dir_ = Dir::Idle; return; }
        if (stops_.contains(floor_)) { open_doors(); stops_.erase(floor_); return; }
        // SCAN: keep going in the current direction while stops remain that way
        if (dir_ == Dir::Idle) dir_ = (*stops_.begin() > floor_) ? Dir::Up : Dir::Down;
        if (dir_ == Dir::Up && stops_.upper_bound(floor_) == stops_.end()) dir_ = Dir::Down;
        if (dir_ == Dir::Down && stops_.lower_bound(floor_) == stops_.begin()) dir_ = Dir::Up;
        floor_ += (dir_ == Dir::Up) ? 1 : -1;
    }
private:
    void open_doors() { /* door state machine: open -> wait -> close; obstruction sensor */ }
    int id_, floor_ = 0;
    Dir dir_ = Dir::Idle;
    std::set<int> stops_;                            // ordered: easy next-stop queries
};

struct IDispatchStrategy {
    virtual ~IDispatchStrategy() = default;
    virtual Elevator& choose(std::vector<Elevator>& cars, int floor, Dir want) = 0;
};

struct NearestCar : IDispatchStrategy {
    Elevator& choose(std::vector<Elevator>& cars, int floor, Dir want) override {
        auto cost = [&](const Elevator& e) {
            int d = std::abs(e.floor() - floor);
            bool on_the_way = (e.dir() == Dir::Up && want == Dir::Up && e.floor() <= floor) ||
                              (e.dir() == Dir::Down && want == Dir::Down && e.floor() >= floor);
            return d + (e.dir() == Dir::Idle || on_the_way ? 0 : 2 * 50) + int(e.load());
        };
        return *std::ranges::min_element(cars, {}, cost);
    }
};
```

**Talking points:** SCAN vs LOOK algorithms (disk scheduling analogy), starvation avoidance, peak-time modes (up-peak in the morning), safety interlocks as highest-priority states, testing via a simulated clock.

## 4. Rate Limiter (Token Bucket)

**Requirements:** allow at most `rate` requests per second with bursts up to `capacity`; per-client limits; thread-safe; O(1).

```cpp
class TokenBucket {
    double capacity_, tokens_, rate_;                       // tokens per second
    std::chrono::steady_clock::time_point last_;
    std::mutex m_;
public:
    TokenBucket(double capacity, double rate)
        : capacity_(capacity), tokens_(capacity), rate_(rate), last_(std::chrono::steady_clock::now()) {}

    bool try_acquire(double n = 1.0) {
        std::lock_guard lk(m_);
        auto now = std::chrono::steady_clock::now();
        std::chrono::duration<double> dt = now - last_;
        last_ = now;
        tokens_ = std::min(capacity_, tokens_ + dt.count() * rate_);   // lazy refill
        if (tokens_ < n) return false;
        tokens_ -= n;
        return true;
    }
};

class RateLimiter {
    std::unordered_map<std::string, std::unique_ptr<TokenBucket>> buckets_;
    std::mutex m_;
    double cap_, rate_;
public:
    RateLimiter(double cap, double rate) : cap_(cap), rate_(rate) {}
    bool allow(const std::string& client) {
        TokenBucket* b;
        {
            std::lock_guard lk(m_);
            auto& slot = buckets_[client];
            if (!slot) slot = std::make_unique<TokenBucket>(cap_, rate_);
            b = slot.get();
        }
        return b->try_acquire();
    }
};
```

**Alternatives to compare:** fixed window counter (simple, burst at window edges), sliding window log (exact, memory heavy), sliding window counter (approximate, cheap), leaky bucket (smooth output). Use `steady_clock`, never `system_clock`, for intervals. Distributed version → see HLD (Redis + Lua).

## 5. Logger

**Requirements:** levels (Trace…Fatal), multiple sinks (console, file, UART), formatting, minimal overhead when disabled, thread-safe, optionally asynchronous.

```cpp
enum class Level : uint8_t { Trace, Debug, Info, Warn, Error, Fatal };

struct ISink {
    virtual ~ISink() = default;
    virtual void write(Level, std::string_view msg) = 0;
};
struct ConsoleSink : ISink {
    void write(Level l, std::string_view m) override { std::println("[{}] {}", int(l), m); }
};

class Logger {
    std::vector<std::unique_ptr<ISink>> sinks_;
    std::atomic<Level> min_{Level::Info};
    std::mutex m_;
public:
    void add_sink(std::unique_ptr<ISink> s) { std::lock_guard lk(m_); sinks_.push_back(std::move(s)); }
    void set_level(Level l) { min_.store(l, std::memory_order_relaxed); }

    template <class... Args>
    void log(Level l, std::format_string<Args...> fmt, Args&&... args) {
        if (l < min_.load(std::memory_order_relaxed)) return;    // cheap early-out: no formatting
        std::string msg = std::format(fmt, std::forward<Args>(args)...);
        std::lock_guard lk(m_);
        for (auto& s : sinks_) s->write(l, msg);
    }
};

// Usage
Logger log;
log.add_sink(std::make_unique<ConsoleSink>());
log.log(Level::Warn, "battery {:.2f} V below {} V", 3.21, 3.3);
```

**Talking points:** `std::format_string` checks the format at compile time; an async variant pushes messages into a lock-free queue drained by a background thread; on MCUs use a ring buffer + deferred UART/DMA transmission and compile out low levels with a macro/`if constexpr`; include `std::source_location` for file/line.

## 6. Thread Pool / Task Scheduler

The full thread pool implementation is in *Docs → Concurrency*. Design points to raise:
- Work queue type: single locked queue vs per-worker queues with **work stealing**.
- Returning results: `std::packaged_task` + `std::future`.
- Shutdown semantics: drain queue vs cancel; `std::jthread` + `stop_token`.
- Back-pressure: bounded queue that blocks or rejects when full.
- Priorities: `priority_queue` of tasks; beware starvation.
- Delayed tasks: a min-heap ordered by deadline + condition variable `wait_until`.

## 7. Vending Machine (State pattern sketch)

```text
 Idle ──insertCoin──► HasMoney ──select──► Dispensing ──done──► Idle
   ▲                     │ cancel                │ out of stock
   └──── refund ◄────────┘                       └──► HasMoney (refund or reselect)
```

Each state is a class implementing `insert_coin`, `select`, `cancel`, `dispense`; invalid actions in a state return an error. In embedded C this becomes a state×event table.
