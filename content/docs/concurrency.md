# Concurrency

> **Key idea:** Threads share memory, and that is both the attraction and the danger. Any data touched by more than one thread, with at least one of them writing, needs **synchronisation**: a mutex, an atomic, or a hand-off through a queue. Without it you have a **data race**, which in C++ is **undefined behaviour**, not just a "wrong number". Synchronisation provides two things: **atomicity** (no one sees a half-done update) and **visibility/ordering** (writes made before a release are seen after the matching acquire). Most concurrency interview questions are variations of race conditions, deadlocks, producer/consumer queues, atomics and the memory model, and thread pools.

**What you'll be able to do after this guide**
- Create, join and cancel threads correctly (`std::thread`, `std::jthread`, `stop_token`) and pass arguments safely.
- Protect shared state with the right lock (`lock_guard`, `scoped_lock`, `unique_lock`, `shared_mutex`) and avoid deadlock.
- Write a correct producer/consumer queue with condition variables, handling spurious and lost wakeups.
- Use atomics: CAS loops, memory orderings, release/acquire publication, spinlocks, a lock-free SPSC ring buffer.
- Use futures, `async`, promises, `packaged_task`, and the C++20 latch/barrier/semaphore.
- Build a thread pool, parallelise work, and avoid false sharing, contention and oversubscription.
- Apply all of this to embedded systems: ISRs, critical sections, RTOS primitives, priority inversion.

---

## 1. Vocabulary

| Term | Meaning |
|---|---|
| **Concurrency** | several tasks make progress in overlapping time (possibly interleaved on one core) |
| **Parallelism** | tasks literally run at the same time on several cores |
| **Race condition** | the result depends on timing (a logic bug, even with locks: "check-then-act") |
| **Data race** | two unsynchronised accesses to the same location, at least one a write: **UB** |
| **Critical section** | code that must not run in more than one thread at once |
| **Deadlock** | threads wait for each other forever |
| **Livelock** | threads keep reacting to each other without making progress |
| **Starvation** | a thread never gets the resource it needs |
| **Lock-free** | at least one thread always makes progress, even if others are suspended |
| **Wait-free** | *every* thread finishes its operation in a bounded number of steps |

---

## 2. Threads

```cpp
#include <cassert>
#include <chrono>
#include <cstdio>
#include <functional>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

void fill(std::vector<int>& out, int value, int count) {
    for (int i = 0; i < count; ++i) {
        out.push_back(value);
    }
}

thread_local int tlsCounter = 0;          // one independent copy per thread

int main() {
    // 1. A thread starts running immediately; join() waits for it to finish.
    std::vector<int> data;
    std::thread t(fill, std::ref(data), 7, 3);   // arguments are COPIED unless wrapped in std::ref
    t.join();                                    // a joinable thread destroyed without join/detach -> std::terminate
    assert(data.size() == 3);

    // 2. Lambdas capture what they need. Make sure captured references outlive the thread.
    std::string message = "hello";
    std::thread t2([&message] { message += " world"; });
    t2.join();
    assert(message == "hello world");

    // 3. std::jthread (C++20): joins automatically and carries a stop_token.
    int iterations = 0;
    {
        std::jthread worker([&iterations](std::stop_token st) {
            while (!st.stop_requested()) {
                iterations++;
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
            }
        });
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        worker.request_stop();                   // cooperative cancellation (the destructor would do it too)
    }                                            // joined here
    assert(iterations > 0);

    // 4. thread_local: each thread sees its own variable.
    tlsCounter = 100;
    std::thread t3([] { tlsCounter++; assert(tlsCounter == 1); });
    t3.join();
    assert(tlsCounter == 100);

    // 5. An exception escaping a thread function calls std::terminate, so catch it inside
    //    (or use std::async / std::promise, which carry exceptions back to the caller).
    std::string error;
    std::thread t4([&error] {
        try {
            throw std::runtime_error("sensor offline");
        } catch (const std::exception& e) {
            error = e.what();
        }
    });
    t4.join();
    assert(error == "sensor offline");

    std::printf("hardware threads: %u, worker iterations: %d\n",
                std::thread::hardware_concurrency(), iterations);
    return 0;
}
```

> **Pitfall:** `detach()` lets a thread run on independently. When `main` returns, detached threads are killed mid-work, and any locals they reference are long gone. Prefer `jthread` or explicit joins. Detach only threads that own all their data, and only when you're sure they don't need to finish.

> **Pitfall:** `std::thread t(f, buffer);` where `buffer` is a `char*` to a local array, and `f` takes a `std::string`: the *conversion* happens in the new thread, possibly after the caller has returned. Convert before starting the thread: `std::thread t(f, std::string(buffer));`.

---

## 3. Mutexes and locks

A **data race** looks like this:

```cpp
// no-test (data race: UB; usually prints less than 200000)
int counter = 0;
std::thread a([&] { for (int i = 0; i < 100000; ++i) { ++counter; } });   // load, add, store
std::thread b([&] { for (int i = 0; i < 100000; ++i) { ++counter; } });
a.join(); b.join();
```

`++counter` is three steps (load, add, store). Two threads can both load 41 and both store 42. Without sanitizers, one run printed 173827 instead of 200000; ThreadSanitizer names both lines. The fix is to make the read-modify-write *atomic* with respect to other threads:

```cpp
#include <cassert>
#include <cstdio>
#include <map>
#include <mutex>
#include <optional>
#include <shared_mutex>
#include <string>
#include <thread>
#include <vector>

class Counter {
public:
    void increment() {
        std::lock_guard<std::mutex> lock(mutex_);   // locked here...
        ++value_;
    }                                               // ...unlocked here, even on exceptions
    long get() const {
        std::lock_guard lock(mutex_);               // CTAD: std::lock_guard<std::mutex>
        return value_;
    }
private:
    mutable std::mutex mutex_;                      // mutable: lockable in const members
    long value_ = 0;
};

// Many readers, occasional writer: shared_mutex.
class Config {
public:
    std::optional<std::string> get(const std::string& key) const {
        std::shared_lock lock(mutex_);              // shared: readers run concurrently
        auto it = values_.find(key);
        if (it == values_.end()) {
            return std::nullopt;
        }
        return it->second;
    }
    void set(const std::string& key, std::string value) {
        std::unique_lock lock(mutex_);              // exclusive: waits for all readers to leave
        values_[key] = std::move(value);
    }
private:
    mutable std::shared_mutex mutex_;
    std::map<std::string, std::string> values_;
};

int main() {
    Counter counter;
    std::vector<std::thread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([&counter] {
            for (int i = 0; i < 10000; ++i) {
                counter.increment();
            }
        });
    }
    for (auto& th : threads) {
        th.join();
    }
    assert(counter.get() == 40000);                 // always, unlike the racy version

    Config config;
    config.set("mode", "eco");
    std::vector<std::thread> readers;
    for (int r = 0; r < 4; ++r) {
        readers.emplace_back([&config] {
            for (int i = 0; i < 1000; ++i) {
                assert(config.get("mode").has_value());
            }
        });
    }
    config.set("mode", "turbo");
    for (auto& th : readers) {
        th.join();
    }
    assert(config.get("mode") == "turbo");

    // unique_lock: movable, can unlock early, can defer or try.
    std::mutex m;
    std::unique_lock<std::mutex> lock(m, std::defer_lock);   // not locked yet
    assert(!lock.owns_lock());
    if (lock.try_lock()) {
        lock.unlock();                                       // release early, before slow work
    }

    std::printf("counter=%ld config.mode=%s\n", counter.get(), config.get("mode")->c_str());
    return 0;
}
```

| Lock | Use |
|---|---|
| `std::lock_guard` | simplest scoped lock of one mutex |
| `std::scoped_lock` (C++17) | lock **several** mutexes at once without deadlock; also fine for one |
| `std::unique_lock` | movable; `defer_lock`/`try_to_lock`/`adopt_lock`; unlock and relock; required by `condition_variable` |
| `std::shared_lock` + `std::shared_mutex` | many readers or one writer |
| `std::recursive_mutex` | the same thread may lock it again (usually a design smell) |
| `std::timed_mutex` | `try_lock_for`/`try_lock_until` |

> **Tip:** Keep critical sections **short**. Copy the data out under the lock, then do the slow work (I/O, logging, calling callbacks) after releasing it. Never call unknown code while holding a lock: it might try to take the same lock, or another one in the opposite order.

### 3.1 Check-then-act: a race condition with no data race

Every access below is locked, but the *combination* still isn't atomic:

```cpp
// no-test (logic race)
if (account.balance() >= 100) {      // lock, read, unlock
    account.withdraw(100);           // lock, write, unlock  -> two threads can both pass the check
}
```

The fix is to put the check and the action in **one** critical section, in a method such as `bool tryWithdraw(int amount)`. Thread-safe *components* don't make thread-safe *programs*. The interface itself must offer atomic operations.

---

## 4. Deadlock

```cpp
// no-test (can deadlock)
// Thread 1: lock(a) then lock(b)        Thread 2: lock(b) then lock(a)
```

Deadlock needs **all four Coffman conditions**: mutual exclusion, hold-and-wait, no preemption, and circular wait. Break any one of them:

| Technique | Breaks |
|---|---|
| A global **lock order** (always lock a lower ID or address first) | circular wait |
| `std::scoped_lock(a, b)` / `std::lock(a, b)` (deadlock-avoidance algorithm) | hold-and-wait |
| `try_lock` with back-off and retry | hold-and-wait |
| One coarse lock, or message passing / an actor per resource | mutual exclusion on several locks |
| Timeouts (`try_lock_for`) + error handling | no preemption (a workaround) |

```cpp
#include <cassert>
#include <cstdio>
#include <mutex>
#include <thread>
#include <vector>

struct Account {
    int id;
    long balance;
    std::mutex m;
};

// Both locks are taken together; scoped_lock avoids deadlock even if another
// thread calls transfer(to, from, ...) at the same moment.
bool transfer(Account& from, Account& to, long amount) {
    if (&from == &to) {
        return false;                               // locking the same mutex twice would be UB
    }
    std::scoped_lock lock(from.m, to.m);
    if (from.balance < amount) {
        return false;                               // check and act inside ONE critical section
    }
    from.balance -= amount;
    to.balance += amount;
    return true;
}

// The alternative: a fixed global order (by id).
bool transferOrdered(Account& from, Account& to, long amount) {
    if (&from == &to) {
        return false;
    }
    Account& first = from.id < to.id ? from : to;
    Account& second = from.id < to.id ? to : from;
    std::lock_guard l1(first.m);
    std::lock_guard l2(second.m);
    if (from.balance < amount) {
        return false;
    }
    from.balance -= amount;
    to.balance += amount;
    return true;
}

int main() {
    Account a{1, 1000, {}};
    Account b{2, 1000, {}};
    std::vector<std::thread> threads;
    for (int i = 0; i < 4; ++i) {
        threads.emplace_back([&] {
            for (int k = 0; k < 1000; ++k) {
                transfer(a, b, 1);                  // opposite directions at the same time:
                transferOrdered(b, a, 1);           // with naive locking this could deadlock
            }
        });
    }
    for (auto& t : threads) {
        t.join();
    }
    assert(a.balance + b.balance == 2000);          // money is conserved
    std::printf("a=%ld b=%ld total=%ld\n", a.balance, b.balance, a.balance + b.balance);
    return 0;
}
```

---

## 5. Condition variables: producer/consumer

A `condition_variable` lets a thread **sleep until a condition becomes true**. It is always used with a mutex that protects the condition's state, and always with a **predicate**:

```cpp
#include <cassert>
#include <condition_variable>
#include <cstdio>
#include <mutex>
#include <optional>
#include <queue>
#include <thread>
#include <vector>

// Bounded, closable blocking queue: the core of most pipelines and thread pools.
template <typename T>
class BlockingQueue {
public:
    explicit BlockingQueue(std::size_t capacity) : capacity_(capacity) {}

    // Blocks while full. Returns false if the queue was closed.
    bool push(T value) {
        std::unique_lock lock(mutex_);
        notFull_.wait(lock, [&] { return closed_ || items_.size() < capacity_; });
        if (closed_) {
            return false;
        }
        items_.push(std::move(value));
        lock.unlock();                         // unlock before notify: the woken thread can take the lock at once
        notEmpty_.notify_one();
        return true;
    }

    // Blocks while empty. Returns nullopt once closed AND drained.
    std::optional<T> pop() {
        std::unique_lock lock(mutex_);
        notEmpty_.wait(lock, [&] { return closed_ || !items_.empty(); });   // handles spurious wakeups
        if (items_.empty()) {
            return std::nullopt;               // closed and nothing left
        }
        T value = std::move(items_.front());
        items_.pop();
        lock.unlock();
        notFull_.notify_one();
        return value;
    }

    void close() {
        {
            std::lock_guard lock(mutex_);
            closed_ = true;
        }
        notEmpty_.notify_all();                // wake everyone so they can see `closed_`
        notFull_.notify_all();
    }

private:
    std::mutex mutex_;
    std::condition_variable notEmpty_;
    std::condition_variable notFull_;
    std::queue<T> items_;
    std::size_t capacity_;
    bool closed_ = false;
};

int main() {
    BlockingQueue<int> queue(4);              // small capacity: producers really do block
    constexpr int kProducers = 3;
    constexpr int kPerProducer = 1000;

    std::vector<std::thread> producers;
    for (int p = 0; p < kProducers; ++p) {
        producers.emplace_back([&queue, p] {
            for (int i = 1; i <= kPerProducer; ++i) {
                queue.push(p * kPerProducer + i);
            }
        });
    }

    std::mutex sumMutex;
    long long total = 0;
    std::vector<std::thread> consumers;
    for (int c = 0; c < 2; ++c) {
        consumers.emplace_back([&] {
            long long local = 0;
            while (auto item = queue.pop()) {   // loops until closed and drained
                local += *item;
            }
            std::lock_guard lock(sumMutex);
            total += local;
        });
    }

    for (auto& t : producers) {
        t.join();
    }
    queue.close();                             // no more items: consumers exit after draining
    for (auto& t : consumers) {
        t.join();
    }

    long long n = kProducers * kPerProducer;
    assert(total == n * (n + 1) / 2);          // every item consumed exactly once
    std::printf("consumed %lld items, sum=%lld\n", n, total);
    return 0;
}
```

> **Key rules:**
> 1. Always `wait(lock, predicate)`, or wait inside a `while (!condition)` loop. Waits can return **spuriously**, and another consumer may have taken the item first.
> 2. Change the condition's state **while holding the mutex**, even if the state is an atomic. Otherwise the notification can fall between the waiter's check and its sleep: a **lost wakeup**.
> 3. `notify_one` wakes one waiter. Use `notify_all` for state changes that every waiter must see, such as shutdown.

---

## 6. Atomics

`std::atomic<T>` makes single operations on a value indivisible, and lets you choose their ordering. For `int`, pointers and `bool` it's lock-free on every mainstream CPU.

```cpp
#include <atomic>
#include <cassert>
#include <cstdio>
#include <thread>
#include <vector>

// CAS loop: atomically update to max(current, value). The pattern behind every lock-free algorithm.
void atomicMax(std::atomic<int>& target, int value) {
    int current = target.load(std::memory_order_relaxed);
    while (current < value &&
           !target.compare_exchange_weak(current, value, std::memory_order_relaxed)) {
        // On failure, compare_exchange stores the latest value into `current`; loop and retry.
    }
}

int main() {
    std::atomic<int> hits{0};
    hits.fetch_add(1, std::memory_order_relaxed);    // atomic read-modify-write
    hits++;                                          // the same, with seq_cst ordering
    hits += 3;
    assert(hits.load() == 5);

    int expected = 5;
    bool swapped = hits.compare_exchange_strong(expected, 50);   // if hits == 5 then hits = 50
    assert(swapped && hits == 50);
    expected = 7;
    swapped = hits.compare_exchange_strong(expected, 70);        // fails: hits is 50
    assert(!swapped && expected == 50);                          // expected updated to the actual value

    int old = hits.exchange(0);                      // set and return the previous value
    assert(old == 50 && hits == 0);

    std::atomic<int> best{0};
    std::vector<std::thread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([&best, t] {
            for (int i = 0; i < 1000; ++i) {
                atomicMax(best, t * 1000 + i);
            }
        });
    }
    for (auto& th : threads) {
        th.join();
    }
    assert(best == 3999);

    static_assert(std::atomic<int>::is_always_lock_free);
    // std::atomic<BigStruct> is allowed too, but it is implemented with a hidden lock
    // (GCC needs -latomic for it), so is_lock_free() returns false.
    std::printf("hits=%d best=%d (atomic<int> is always lock-free)\n", hits.load(), best.load());
    return 0;
}
```

`compare_exchange_weak` may fail spuriously (on LL/SC architectures like ARM). It is fine inside a retry loop, where it can be faster. Use `_strong` when you don't loop.

> **Interview:** "Is `++x` on an `int` atomic?" No. It compiles to a load, an add and a store, and even on x86 another core can interleave between them. `std::atomic<int>::operator++` emits `lock xadd` on x86 and an LDREX/STREX loop or `LDADD` on ARM.

---

## 7. The memory model and memory orderings

Compilers and CPUs **reorder** memory operations that look independent from inside one thread: store buffers, out-of-order execution, caching values in registers. The memory model says which reorderings another thread is allowed to observe. The core concept is **happens-before**. If a *release* store is read by an *acquire* load, everything the writer did before the release is visible to the reader after the acquire.

| Order | Guarantees | Typical use |
|---|---|---|
| `relaxed` | atomicity only; no ordering with other variables | counters, statistics, `shared_ptr` refcount increments |
| `acquire` (loads) | later reads/writes in this thread can't move before it | consuming published data, taking a lock |
| `release` (stores) | earlier reads/writes in this thread can't move after it | publishing data, releasing a lock |
| `acq_rel` (RMW) | both | lock-free updates, refcount decrement |
| `seq_cst` (default) | acquire/release **plus** a single total order of all seq_cst operations | the default; easiest to reason about |

```cpp
#include <atomic>
#include <cassert>
#include <cstdio>
#include <string>
#include <thread>

struct Message {
    std::string text;
    int priority = 0;
};

Message g_message;                       // plain, non-atomic data
std::atomic<bool> g_ready{false};        // the flag that publishes it

void producer() {
    g_message.text = "calibrated";       // 1. write the data
    g_message.priority = 7;
    g_ready.store(true, std::memory_order_release);   // 2. publish: 1 can't move after this
}

void consumer() {
    while (!g_ready.load(std::memory_order_acquire)) {   // 3. once we see true...
        std::this_thread::yield();
    }
    // 4. ...everything written before the release is visible. No data race on g_message.
    assert(g_message.text == "calibrated" && g_message.priority == 7);
}

int main() {
    std::thread c(consumer);
    std::thread p(producer);
    p.join();
    c.join();

    // Relaxed is enough for a pure counter: only the final total matters.
    std::atomic<long> events{0};
    std::thread a([&] { for (int i = 0; i < 50000; ++i) { events.fetch_add(1, std::memory_order_relaxed); } });
    std::thread b([&] { for (int i = 0; i < 50000; ++i) { events.fetch_add(1, std::memory_order_relaxed); } });
    a.join();
    b.join();                            // join() itself synchronises, so the final value is visible
    assert(events == 100000);

    std::printf("message '%s' published safely; events=%ld\n", g_message.text.c_str(), events.load());
    return 0;
}
```

**Why `seq_cst` exists: the store-buffering example.** Start with `x = y = 0`. Thread 1 runs `x = 1; r1 = y;` and thread 2 runs `y = 1; r2 = x;`. With release/acquire, or on real x86 hardware with plain stores, the outcome `r1 == 0 && r2 == 0` is **possible**, because each store can sit in its core's store buffer while the load runs. With `seq_cst` on all four operations, that outcome is forbidden. This is the pattern in Dekker's and Peterson's algorithms, and the reason x86 needs an `mfence` (or `xchg`) for seq_cst stores.

**Practical advice:** use `seq_cst` (the default) unless profiling proves it's a bottleneck. Use `relaxed` only for independent counters and flags that publish no other data. Use release/acquire for publishing data or hand-offs between two threads. Weaker orderings are where subtle bugs live, and x86 hides many of them (it is strongly ordered) until the code runs on ARM.

---

## 8. Spinlocks and `atomic_flag`

```cpp
#include <atomic>
#include <cassert>
#include <mutex>
#include <thread>
#include <vector>

class Spinlock {
public:
    void lock() {
        while (flag_.test_and_set(std::memory_order_acquire)) {   // try to grab it
            while (flag_.test(std::memory_order_relaxed)) {       // C++20: spin on a read (cache-friendly)
                // Optional: _mm_pause() on x86 / __yield() on ARM, or flag_.wait(true) to sleep.
            }
        }
    }
    void unlock() {
        flag_.clear(std::memory_order_release);
    }

private:
    std::atomic_flag flag_ = ATOMIC_FLAG_INIT;   // the only type guaranteed lock-free
};

int main() {
    Spinlock spin;
    long total = 0;
    std::vector<std::thread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([&] {
            for (int i = 0; i < 10000; ++i) {
                std::lock_guard<Spinlock> lock(spin);   // works: Spinlock meets BasicLockable
                total++;
            }
        });
    }
    for (auto& th : threads) {
        th.join();
    }
    assert(total == 40000);
    return 0;
}
```

Spinlocks only make sense for very short critical sections on multi-core systems, where sleeping costs more than waiting. Under contention, or when the lock holder gets pre-empted, they burn CPU. A good `std::mutex` already spins briefly before sleeping (a futex on Linux). On a **single-core MCU**, spinning against an ISR **deadlocks**: the ISR spins forever while the main code that holds the lock never runs. Disable interrupts instead.

---

## 9. Lock-free single-producer/single-consumer ring buffer

This is the most useful lock-free structure in practice. It passes data between exactly one producer and one consumer, for example audio callback → UI, ISR → main loop, or network thread → parser. It uses no locks and allocates nothing.

```cpp
#include <array>
#include <atomic>
#include <cassert>
#include <cstddef>
#include <cstdio>
#include <optional>
#include <thread>

template <typename T, std::size_t N>
class SpscQueue {
    static_assert((N & (N - 1)) == 0, "N must be a power of two");
public:
    bool push(const T& value) {                      // called by the producer only
        std::size_t head = head_.load(std::memory_order_relaxed);
        std::size_t tail = tail_.load(std::memory_order_acquire);   // see the consumer's progress
        if (head - tail == N) {
            return false;                            // full
        }
        buffer_[head & (N - 1)] = value;
        head_.store(head + 1, std::memory_order_release);           // publish the element
        return true;
    }

    std::optional<T> pop() {                         // called by the consumer only
        std::size_t tail = tail_.load(std::memory_order_relaxed);
        std::size_t head = head_.load(std::memory_order_acquire);   // see the published elements
        if (head == tail) {
            return std::nullopt;                     // empty
        }
        T value = buffer_[tail & (N - 1)];
        tail_.store(tail + 1, std::memory_order_release);           // free the slot
        return value;
    }

private:
    std::array<T, N> buffer_{};
    alignas(64) std::atomic<std::size_t> head_{0};   // written by the producer
    alignas(64) std::atomic<std::size_t> tail_{0};   // written by the consumer (separate cache line)
};

int main() {
    SpscQueue<int, 256> queue;
    constexpr int kCount = 100000;

    std::thread producer([&] {
        for (int i = 1; i <= kCount; ++i) {
            while (!queue.push(i)) {
                std::this_thread::yield();           // full: wait for the consumer
            }
        }
    });

    long long sum = 0;
    int expectedNext = 1;
    bool inOrder = true;
    for (int received = 0; received < kCount;) {
        if (auto v = queue.pop()) {
            inOrder = inOrder && (*v == expectedNext);
            expectedNext++;
            sum += *v;
            received++;
        } else {
            std::this_thread::yield();
        }
    }
    producer.join();

    assert(inOrder && sum == static_cast<long long>(kCount) * (kCount + 1) / 2);
    std::printf("SPSC: %d items in order, sum=%lld\n", kCount, sum);
    return 0;
}
```

The indices grow without bound and are masked on use, so `head - tail` is always the fill level, even when `size_t` wraps. Multi-producer or multi-consumer lock-free queues are much harder because of the ABA problem and memory reclamation. In production use a proven library: `boost::lockfree`, moodycamel `ConcurrentQueue`, Folly `MPMCQueue`.

---

## 10. Futures, `async`, promises and `packaged_task`

```cpp
#include <atomic>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <future>
#include <numeric>
#include <stdexcept>
#include <thread>
#include <vector>

long long sumRange(const std::vector<int>& v, std::size_t begin, std::size_t end) {
    return std::accumulate(v.begin() + static_cast<long>(begin), v.begin() + static_cast<long>(end), 0LL);
}

int main() {
    std::vector<int> data(1'000'000, 1);

    // std::async: run a function and get its result (or exception) through a future.
    auto firstHalf = std::async(std::launch::async, sumRange, std::cref(data), 0, data.size() / 2);
    long long secondHalf = sumRange(data, data.size() / 2, data.size());   // work here meanwhile
    assert(firstHalf.get() + secondHalf == 1'000'000);                       // get() blocks; once only

    // Exceptions travel through the future and are rethrown by get().
    auto failing = std::async(std::launch::async, [] () -> int { throw std::runtime_error("bad input"); });
    try {
        failing.get();
        assert(false);
    } catch (const std::runtime_error& e) {
        std::printf("caught from async task: %s\n", e.what());
    }

    // std::promise: set a value from any thread, at any point.
    std::promise<int> promise;
    std::future<int> fromPromise = promise.get_future();
    std::thread setter([&promise] {
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
        promise.set_value(42);
    });
    assert(fromPromise.wait_for(std::chrono::seconds(5)) == std::future_status::ready);
    assert(fromPromise.get() == 42);
    setter.join();

    // packaged_task: wrap a callable so that calling it fulfils a future (thread pools use this).
    std::packaged_task<int(int, int)> task([](int a, int b) { return a * b; });
    std::future<int> product = task.get_future();
    std::thread runner(std::move(task), 6, 7);
    assert(product.get() == 42);
    runner.join();

    // shared_future: several threads can wait on the same result.
    std::promise<void> go;
    std::shared_future<void> start = go.get_future().share();
    std::vector<std::thread> waiters;
    std::atomic<int> started{0};
    for (int i = 0; i < 3; ++i) {
        waiters.emplace_back([start, &started] { start.wait(); started++; });
    }
    go.set_value();                                  // release everyone at once
    for (auto& w : waiters) {
        w.join();
    }
    assert(started == 3);
    return 0;
}
```

| Launch policy | Behaviour |
|---|---|
| `std::launch::async` | runs on a new thread, guaranteed |
| `std::launch::deferred` | runs lazily on the thread that calls `get()`/`wait()` |
| default (`async \| deferred`) | the implementation chooses; it may never run if you never call `get()` |

> **Pitfall:** The future returned by `std::async` **blocks in its destructor** until the task finishes. `std::async(std::launch::async, f);` on its own line, without storing the future, runs *synchronously*: the temporary future is destroyed at the `;`, which waits for `f`.

---

## 11. C++20 synchronisation primitives

```cpp
#include <atomic>
#include <barrier>
#include <cassert>
#include <cstdio>
#include <latch>
#include <semaphore>
#include <thread>
#include <vector>

int main() {
    constexpr int kWorkers = 4;

    // latch: a one-shot countdown. "Wait until N things have happened."
    std::latch initialised(kWorkers);
    // barrier: reusable. All threads meet at the end of each phase; the completion function runs once per phase.
    int phasesCompleted = 0;
    std::barrier phaseEnd(kWorkers, [&phasesCompleted]() noexcept { phasesCompleted++; });
    // counting_semaphore: at most 2 workers use the "device" at a time.
    std::counting_semaphore<2> device(2);
    std::atomic<int> usingDevice{0};
    std::atomic<int> peak{0};

    std::vector<std::jthread> workers;
    for (int w = 0; w < kWorkers; ++w) {
        workers.emplace_back([&] {
            initialised.count_down();               // "I'm ready"
            for (int phase = 0; phase < 3; ++phase) {
                device.acquire();
                int now = ++usingDevice;
                int seen = peak.load();
                while (now > seen && !peak.compare_exchange_weak(seen, now)) {
                }
                --usingDevice;
                device.release();
                phaseEnd.arrive_and_wait();         // nobody starts phase+1 until all finish phase
            }
        });
    }
    initialised.wait();                             // main thread: all workers have started
    workers.clear();                                // join them all

    assert(phasesCompleted == 3);
    assert(peak <= 2);

    // binary_semaphore as a signal: unlike a mutex, any thread may release it.
    std::binary_semaphore signal(0);
    std::jthread notifier([&signal] { signal.release(); });
    signal.acquire();                               // blocks until the other thread signals

    std::printf("phases=%d, peak device users=%d\n", phasesCompleted, peak.load());
    return 0;
}
```

| Primitive | Reusable? | Use |
|---|---|---|
| `std::latch` | no | wait for N events (start-up, fan-in) |
| `std::barrier` | yes | iterative phases (simulations, parallel algorithms) |
| `std::counting_semaphore<N>` | yes | limit concurrency, or count available resources |
| `std::binary_semaphore` | yes | signal between threads (any thread can release) |
| `atomic::wait/notify_one` | yes | sleep until a value changes, without a mutex or condvar |
| `std::call_once` + `std::once_flag` | — | one-time initialisation |

**One-time initialisation:** since C++11, initialising a function-local `static` is thread-safe ("magic statics"). That makes `static Logger& instance() { static Logger l; return l; }` a correct lazy singleton. Use `std::call_once` when initialisation isn't tied to a single static.

---

## 12. A thread pool (a common design question)

```cpp
#include <cassert>
#include <condition_variable>
#include <cstdio>
#include <functional>
#include <future>
#include <mutex>
#include <queue>
#include <stdexcept>
#include <thread>
#include <type_traits>
#include <vector>

class ThreadPool {
public:
    explicit ThreadPool(std::size_t threads) {
        for (std::size_t i = 0; i < threads; ++i) {
            workers_.emplace_back([this] { workerLoop(); });
        }
    }

    ThreadPool(const ThreadPool&) = delete;
    ThreadPool& operator=(const ThreadPool&) = delete;

    ~ThreadPool() {
        {
            std::lock_guard lock(mutex_);
            stopping_ = true;
        }
        cv_.notify_all();
        for (auto& w : workers_) {
            w.join();                         // queued tasks are finished first (see workerLoop)
        }
    }

    // Returns a future for the result; exceptions inside the task arrive through the future.
    template <typename F, typename... Args>
    auto submit(F&& f, Args&&... args) -> std::future<std::invoke_result_t<F, Args...>> {
        using R = std::invoke_result_t<F, Args...>;
        auto task = std::make_shared<std::packaged_task<R()>>(
            std::bind(std::forward<F>(f), std::forward<Args>(args)...));
        std::future<R> result = task->get_future();
        {
            std::lock_guard lock(mutex_);
            if (stopping_) {
                throw std::runtime_error("submit on a stopped pool");
            }
            tasks_.emplace([task] { (*task)(); });   // shared_ptr because std::function must be copyable
        }
        cv_.notify_one();
        return result;
    }

private:
    void workerLoop() {
        while (true) {
            std::function<void()> task;
            {
                std::unique_lock lock(mutex_);
                cv_.wait(lock, [this] { return stopping_ || !tasks_.empty(); });
                if (stopping_ && tasks_.empty()) {
                    return;                   // drain the queue, then exit
                }
                task = std::move(tasks_.front());
                tasks_.pop();
            }
            task();                           // run OUTSIDE the lock
        }
    }

    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex mutex_;
    std::condition_variable cv_;
    bool stopping_ = false;
};

int main() {
    ThreadPool pool(4);
    std::vector<std::future<long long>> results;
    for (int i = 1; i <= 100; ++i) {
        results.push_back(pool.submit([](int n) { return static_cast<long long>(n) * n; }, i));
    }
    long long total = 0;
    for (auto& f : results) {
        total += f.get();
    }
    assert(total == 338350);                  // sum of squares 1..100

    auto failing = pool.submit([] () -> int { throw std::logic_error("task failed"); });
    try {
        failing.get();
    } catch (const std::logic_error& e) {
        std::printf("sum of squares = %lld; task error propagated: %s\n", total, e.what());
    }
    return 0;
}
```

Follow-up questions to expect, with good answers:
- **Work stealing:** give each worker its own deque, and let idle workers steal from the back of others' deques. This reduces contention on the single queue.
- **Bounded queue:** use it for back-pressure, so producers block (or are rejected) when the pool falls behind.
- **Avoiding deadlock:** a task that waits on another task's future in the same pool can deadlock once all workers are blocked waiting.
- **Shutdown:** decide whether to drain the queue or drop it, and whether to cancel running tasks (pass a `stop_token`).

---

## 13. Parallel speed-ups and performance pitfalls

```cpp
#include <algorithm>
#include <atomic>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <numeric>
#include <thread>
#include <vector>

struct alignas(64) PaddedCounter {        // one counter per 64-byte cache line
    std::atomic<long> value{0};
};

struct PackedCounter {                     // 8 bytes: eight of them share one cache line
    std::atomic<long> value{0};
};

template <typename Counter>
long long timeIncrements(unsigned threads) {
    std::vector<Counter> counters(threads);
    auto start = std::chrono::steady_clock::now();
    std::vector<std::thread> ts;
    for (unsigned t = 0; t < threads; ++t) {
        ts.emplace_back([&counters, t] {
            for (int i = 0; i < 2'000'000; ++i) {
                counters[t].value.fetch_add(1, std::memory_order_relaxed);   // each thread: its OWN counter
            }
        });
    }
    for (auto& th : ts) {
        th.join();
    }
    auto elapsed = std::chrono::steady_clock::now() - start;
    return std::chrono::duration_cast<std::chrono::milliseconds>(elapsed).count();
}

int main() {
    // Data parallelism: split the range, give each thread a chunk, combine the partial results.
    std::vector<int> data(4'000'000);
    std::iota(data.begin(), data.end(), 0);
    unsigned threads = std::max(2u, std::min(8u, std::thread::hardware_concurrency()));
    std::vector<long long> partial(threads, 0);
    std::vector<std::thread> pool;
    std::size_t chunk = data.size() / threads;
    for (unsigned t = 0; t < threads; ++t) {
        std::size_t begin = t * chunk;
        std::size_t end = (t + 1 == threads) ? data.size() : begin + chunk;
        pool.emplace_back([&, t, begin, end] {
            long long local = 0;                       // accumulate in a local, not in partial[t]
            for (std::size_t i = begin; i < end; ++i) {
                local += data[i];
            }
            partial[t] = local;                        // one write per thread
        });
    }
    for (auto& th : pool) {
        th.join();
    }
    long long total = std::accumulate(partial.begin(), partial.end(), 0LL);
    long long n = static_cast<long long>(data.size());
    assert(total == n * (n - 1) / 2);

    // False sharing: no data is shared, yet packed counters are much slower on a multi-core machine.
    // Measured on a 4-core VM (ASan build): packed 260 ms vs padded 22 ms, about 12x.
    long long packedMs = timeIncrements<PackedCounter>(threads);
    long long paddedMs = timeIncrements<PaddedCounter>(threads);
    std::printf("parallel sum ok with %u threads; packed counters %lld ms, padded %lld ms\n",
                threads, packedMs, paddedMs);
    return 0;
}
```

| Pitfall | Symptom | Fix |
|---|---|---|
| **False sharing** | threads writing *different* variables on the same 64-byte cache line slow each other down | `alignas(64)` / `std::hardware_destructive_interference_size`; accumulate in locals |
| **Lock contention** | threads mostly waiting; CPU idle | shorter critical sections, sharding (one lock per bucket), reader/writer locks, per-thread data + merge |
| **Oversubscription** | more runnable threads than cores → context switches | size pools to `hardware_concurrency()`; don't nest pools |
| **Amdahl's law** | speed-up flattens out | with a serial fraction s, the maximum speed-up is 1 / s; shrink the serial part |
| **Too-fine tasks** | scheduling overhead exceeds the work | batch work into chunks of roughly 10–100 µs |
| **Convoying / thundering herd** | `notify_all` wakes every waiter, and only one makes progress | `notify_one`, or per-waiter condition variables |

---

## 14. Embedded concurrency: ISRs and RTOS

| Situation | Correct tool |
|---|---|
| Flag set in an ISR, polled in the main loop | `std::atomic<bool>`, or `volatile` on a single-core MCU where the flag publishes no other data |
| Multi-byte data shared with an ISR | a critical section (`__disable_irq()` / `taskENTER_CRITICAL()`), or an SPSC ring buffer |
| ISR → task hand-off | RTOS queue / semaphore / task notification, using the `...FromISR` API variants |
| Mutual exclusion between tasks | an RTOS **mutex** (with priority inheritance), never a binary semaphore |
| Counting resources (buffers, DMA channels) | counting semaphore |
| Waiting for one of several events | event groups / flags |

Rules for interrupt service routines:
- **Never block** in an ISR. That means no mutexes, `printf`, `malloc` or waiting on a queue. Do the minimum, then defer the rest to a task (the "top half / bottom half" pattern).
- Keep ISRs short and bounded, and clear the interrupt source.
- `volatile` stops the compiler from caching the variable. It does **not** make a 64-bit read atomic on a 32-bit MCU, and it doesn't order other memory accesses.
- Read-modify-write on a shared peripheral register (`REG |= bit`) from both an ISR and main code is a race. Use bit-band or atomic set/clear registers, or a critical section.

**Priority inversion:** a low-priority task holds a mutex that a high-priority task needs. A medium-priority task, which doesn't need the mutex, pre-empts the low-priority one, so the high-priority task waits indefinitely. The fix is **priority inheritance**: the holder temporarily runs at the waiter's priority. FreeRTOS mutexes implement it; binary semaphores don't. Another fix is the priority-ceiling protocol. The famous case is Mars Pathfinder (1997), where watchdog resets were fixed by enabling priority inheritance on a VxWorks mutex, uploaded remotely.

```cpp
// no-test (FreeRTOS sketch)
static QueueHandle_t g_samples;                       // created with xQueueCreate(32, sizeof(uint16_t))

extern "C" void ADC_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    uint16_t sample = ADC1->DR;                       // reading DR clears the interrupt
    xQueueSendFromISR(g_samples, &sample, &woken);    // never blocks
    portYIELD_FROM_ISR(woken);                        // switch now if a higher-priority task was unblocked
}

void processingTask(void*) {
    for (;;) {
        uint16_t sample;
        if (xQueueReceive(g_samples, &sample, portMAX_DELAY) == pdPASS) {
            filterAndStore(sample);                   // the slow work happens in task context
        }
    }
}
```

---

## 15. Finding concurrency bugs

| Tool | Finds |
|---|---|
| ThreadSanitizer (`-fsanitize=thread`) | data races, lock-order inversions (potential deadlocks), use of destroyed mutexes |
| Helgrind / DRD (Valgrind) | races and lock-order problems without recompiling (much slower) |
| Clang `-Wthread-safety` + annotations (`GUARDED_BY`, `REQUIRES`) | "accessed without holding the lock" at compile time |
| Stress tests with many iterations + `std::this_thread::yield()` injection | rare interleavings |
| Model checkers (CDSChecker, Relacy) | weak-memory-ordering bugs |
| `gdb` → `thread apply all bt` | where each thread is stuck in a deadlock |

---

## 16. Interview checklist

- [ ] Data race vs race condition; why a data race is UB.
- [ ] `thread` vs `jthread`; join/detach; argument copying and `std::ref`; exceptions in threads.
- [ ] Lock types; RAII locking; short critical sections; check-then-act.
- [ ] Coffman conditions; lock ordering; `scoped_lock`.
- [ ] Condition variables: predicate waits, spurious and lost wakeups, `notify_one` vs `notify_all`; a bounded blocking queue.
- [ ] Atomics: RMW operations, CAS loops, `weak` vs `strong`, lock-free vs wait-free.
- [ ] Memory orderings; release/acquire publication; when to use relaxed; the store-buffering example.
- [ ] Spinlock vs mutex; SPSC ring buffer.
- [ ] `async`/`future`/`promise`/`packaged_task`; launch policies; the blocking future destructor.
- [ ] Latch, barrier, semaphore; magic statics; `call_once`.
- [ ] Thread pool design; false sharing; Amdahl's law.
- [ ] ISRs, critical sections, RTOS primitives, priority inversion and inheritance.

---

## Practice

1. Two threads must print numbers 1 to 10 alternately: the "odd" thread prints odd numbers, the "even" thread prints even numbers, and the output is in order. Implement it with a mutex and a condition variable.
2. Why is this "double-checked locking" broken before C++11 (and still broken if `instance` is a plain pointer)? `if (!instance) { lock(); if (!instance) instance = new Singleton; unlock(); } return instance;` Give two correct versions.
3. Implement `class CountdownLatch { void countDown(); void wait(); }` without using `std::latch`.
4. A teammate protects `std::vector<int> v` with a mutex, but returns `const std::vector<int>& get()` that takes the lock, then returns the reference. What's wrong, and how do you fix it?
5. Using only `std::atomic`, implement a ticket counter that hands out unique, increasing IDs to many threads, and explain which memory order is sufficient.

:::details Show solution
1.
```cpp
#include <cassert>
#include <condition_variable>
#include <mutex>
#include <thread>
#include <vector>

int main() {
    std::mutex m;
    std::condition_variable cv;
    int next = 1;
    std::vector<int> printed;           // stands in for stdout, so we can check the order

    auto worker = [&](int parity) {     // parity 1 = odd thread, 0 = even thread
        while (true) {
            std::unique_lock lock(m);
            cv.wait(lock, [&] { return next > 10 || next % 2 == parity; });
            if (next > 10) {
                return;
            }
            printed.push_back(next);
            next++;
            cv.notify_all();            // the other thread's predicate may now be true
        }
    };

    std::thread odd(worker, 1);
    std::thread even(worker, 0);
    odd.join();
    even.join();
    assert((printed == std::vector<int>{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}));
    return 0;
}
```
2. The unlocked first read of `instance` races with the write in another thread. Worse, `instance = new Singleton` can become visible *before* the constructor's writes, because the store of the pointer may be reordered ahead of them. Another thread then sees a non-null pointer to an unconstructed object. Fix 1: a function-local static, `static Singleton& get() { static Singleton s; return s; }`, which is thread-safe since C++11. Fix 2: `std::call_once`, or a `std::atomic<Singleton*>` read with `acquire` and published with `release` inside the lock.
3.
```cpp
#include <cassert>
#include <condition_variable>
#include <mutex>
#include <thread>
#include <vector>

class CountdownLatch {
public:
    explicit CountdownLatch(int count) : count_(count) {}
    void countDown() {
        std::lock_guard lock(m_);
        if (count_ > 0 && --count_ == 0) {
            cv_.notify_all();           // release every waiter
        }
    }
    void wait() {
        std::unique_lock lock(m_);
        cv_.wait(lock, [this] { return count_ == 0; });
    }
private:
    std::mutex m_;
    std::condition_variable cv_;
    int count_;
};

int main() {
    CountdownLatch latch(3);
    std::vector<std::thread> ts;
    std::mutex dm;
    int done = 0;
    for (int i = 0; i < 3; ++i) {
        ts.emplace_back([&] {
            {
                std::lock_guard lock(dm);
                done++;
            }
            latch.countDown();
        });
    }
    latch.wait();
    {
        std::lock_guard lock(dm);
        assert(done == 3);
    }
    for (auto& t : ts) {
        t.join();
    }
    return 0;
}
```
4. The lock is released when `get()` returns, but the caller keeps reading through the reference **without** the lock while other threads modify the vector. That is a data race, and a reallocation would leave the reference dangling. Fixes: return a **copy** (`std::vector<int> snapshot() const`), or accept a callback and run it under the lock (`template <class F> void withData(F f) const { std::lock_guard l(m_); f(v_); }`), or offer specific atomic operations such as `size()`, `push`, `sumAll()`.
5.
```cpp
#include <algorithm>
#include <atomic>
#include <cassert>
#include <mutex>
#include <thread>
#include <vector>

std::atomic<unsigned long> g_nextTicket{1};

unsigned long takeTicket() {
    // fetch_add is one indivisible RMW, so no two threads can get the same value.
    // relaxed suffices: we only need uniqueness and per-variable order, not to publish other data.
    return g_nextTicket.fetch_add(1, std::memory_order_relaxed);
}

int main() {
    std::vector<std::vector<unsigned long>> perThread(4);
    std::vector<std::thread> ts;
    for (int t = 0; t < 4; ++t) {
        ts.emplace_back([&perThread, t] {
            for (int i = 0; i < 1000; ++i) {
                perThread[t].push_back(takeTicket());
            }
        });
    }
    for (auto& th : ts) {
        th.join();
    }
    std::vector<unsigned long> all;
    for (auto& v : perThread) {
        assert(std::is_sorted(v.begin(), v.end()));   // increasing within each thread
        all.insert(all.end(), v.begin(), v.end());
    }
    std::sort(all.begin(), all.end());
    assert(std::adjacent_find(all.begin(), all.end()) == all.end());   // all unique
    assert(all.front() == 1 && all.back() == 4000);
    return 0;
}
```
   All atomic operations on a *single* variable form one total "modification order", even with `relaxed`, so the values are unique and each thread sees them increase. Use acquire/release only if a ticket is also used to publish other data.
:::

---

## Interview Q&A

- **Mutex vs semaphore?** A mutex has ownership (only the locker unlocks) and is for mutual exclusion; a counting semaphore counts resources/signals and can be posted by anyone (e.g. from an ISR).
- **What's a spurious wakeup?** A condition variable wait returning without notification — always re-check the predicate.
- **Is `++x` on an `int` atomic?** No: load, add, store. Use `std::atomic<int>`.
- **What does `memory_order_relaxed` guarantee?** Only that the operation itself is atomic.
- **How do you detect races?** ThreadSanitizer (`-fsanitize=thread`), code review, design (message passing, immutability).
- **What are the four conditions for deadlock?** Mutual exclusion, hold-and-wait, no preemption and circular wait (Coffman); prevent it by breaking one — usually a consistent lock order or `std::scoped_lock`.
- **What's the difference between a data race and a race condition?** A data race is unsynchronised concurrent access with at least one write — undefined behaviour. A race condition is any timing-dependent bug, which can exist even when every access is properly locked (check-then-act).
- **Why must the condition variable's predicate be modified under the mutex?** Otherwise the change and notification can happen between the waiter's predicate check and its going to sleep, and the wakeup is lost.
- **What does release/acquire give you?** If an acquire load reads the value written by a release store, all writes before the release are visible after the acquire — the standard way to publish data to another thread.
- **What happens if a `std::thread` is destroyed while joinable?** `std::terminate` is called. Join or detach it first, or use `std::jthread`, which requests stop and joins in its destructor.
- **Why might `std::async(f);` run synchronously?** The returned future is a temporary; its destructor blocks until the task completes, so the statement waits for `f` to finish.
- **What is false sharing and how do you fix it?** Threads writing different variables that share a cache line force the line to bounce between cores; pad/align hot per-thread data to 64 bytes or accumulate in locals.
- **What is priority inversion?** A high-priority task waits on a resource held by a low-priority task, which is preempted by a medium-priority task; fix with priority-inheritance mutexes or priority ceilings.
- **When is a spinlock better than a mutex?** For very short critical sections on multi-core systems where the holder is never preempted — otherwise a mutex (which can sleep) is better; never use one against an ISR on a single core.
- **What's the ABA problem?** In a CAS-based structure, a value changes from A to B and back to A between a thread's read and its CAS, so the CAS wrongly succeeds; solved with tagged pointers/version counters or safe memory reclamation (hazard pointers, epochs).

---

## External resources

- **Anthony Williams — *C++ Concurrency in Action* (2nd ed.)**: the definitive book on C++ threads, atomics and the memory model.
- **cppreference — Thread support library, `std::memory_order`, `std::atomic`.**
- **Herb Sutter — "atomic<> Weapons"** (C++ and Beyond 2012, 2 parts): the memory model explained.
- **Jeff Preshing's blog** (preshing.com): acquire/release, lock-free programming, memory reordering caught in the act.
- **Fedor Pikus — "C++ atomics, from basic to advanced"** (CppCon 2017).
- **FreeRTOS documentation** — queues, semaphores, mutexes and priority inheritance; **"What really happened on Mars?"** (Glenn Reeves, Mars Pathfinder).
