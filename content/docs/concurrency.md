# Concurrency

Concurrency questions show up in systems, embedded and backend interviews: race conditions, deadlocks, condition variables, atomics, and the memory model.

## 1. Vocabulary

- **Concurrency:** multiple tasks making progress in overlapping time (may be interleaved on one core).
- **Parallelism:** tasks literally executing simultaneously on multiple cores.
- **Race condition:** outcome depends on timing. A **data race** (unsynchronised access, ≥1 writer) is **UB** in C++.
- **Critical section:** code that must not run concurrently.
- **Deadlock:** threads wait on each other forever. **Livelock:** they keep reacting without progress. **Starvation:** one never gets the resource.

## 2. Threads

```cpp
#include <thread>
void work(int id) { std::println("worker {}", id); }

std::thread t(work, 1);
t.join();                     // wait. A joinable std::thread destroyed without join/detach -> std::terminate

std::jthread jt(work, 2);     // C++20: joins automatically in destructor
std::jthread loop([](std::stop_token st) {
    while (!st.stop_requested()) { /* ... */ }
});
loop.request_stop();          // cooperative cancellation

unsigned cores = std::thread::hardware_concurrency();
```

Arguments are **copied** into the thread; use `std::ref(x)` to pass by reference (and make sure `x` outlives the thread).

## 3. Mutexes and locks

```cpp
#include <mutex>
class Counter {
    mutable std::mutex m_;
    long value_ = 0;
public:
    void inc() { std::lock_guard lk(m_); ++value_; }          // RAII lock (CTAD)
    long get() const { std::scoped_lock lk(m_); return value_; }
};
```

| Lock | Use |
|---|---|
| `std::lock_guard` | simplest scoped lock of one mutex |
| `std::scoped_lock` (C++17) | lock **several** mutexes at once, deadlock-free |
| `std::unique_lock` | movable, can unlock/relock, required by condition variables |
| `std::shared_lock` + `std::shared_mutex` | many readers / one writer |

### Deadlock and how to avoid it

```cpp
// Thread 1: lock(a); lock(b);    Thread 2: lock(b); lock(a);   -> deadlock
std::scoped_lock both(a, b);      // uses a deadlock-avoidance algorithm
```

The four **Coffman conditions** (all needed for deadlock): mutual exclusion, hold-and-wait, no preemption, circular wait. Break one: consistent global lock ordering (breaks circular wait), `scoped_lock`/`std::lock`, `try_lock` with backoff, or don't hold locks while calling unknown code.

## 4. Condition variables — producer/consumer

```cpp
#include <condition_variable>
#include <queue>

template <class T>
class BlockingQueue {
    std::queue<T> q_;
    std::mutex m_;
    std::condition_variable cv_;
public:
    void push(T v) {
        { std::lock_guard lk(m_); q_.push(std::move(v)); }
        cv_.notify_one();                         // notify after unlocking: avoids a wasted wakeup
    }
    T pop() {
        std::unique_lock lk(m_);
        cv_.wait(lk, [&] { return !q_.empty(); });   // predicate handles spurious wakeups
        T v = std::move(q_.front());
        q_.pop();
        return v;
    }
};
```

> **Key:** Always wait **with a predicate** (or in a `while` loop). Condition variables can wake spuriously, and a notification sent before you started waiting is lost.

## 5. Atomics

```cpp
#include <atomic>
std::atomic<int> hits{0};
hits.fetch_add(1, std::memory_order_relaxed);   // atomic RMW
hits++;                                          // same, seq_cst
int expected = 5;
hits.compare_exchange_strong(expected, 6);       // CAS: if hits==5 set 6, else expected=hits
std::atomic_flag lock = ATOMIC_FLAG_INIT;        // guaranteed lock-free
std::atomic<int>::is_always_lock_free;           // compile-time check
```

### Memory ordering

| Order | Guarantees | Typical use |
|---|---|---|
| `relaxed` | atomicity only, no ordering | counters, statistics |
| `acquire` (loads) | later reads/writes can't move before it | consuming published data |
| `release` (stores) | earlier reads/writes can't move after it | publishing data |
| `acq_rel` | both, for RMW ops | locks, refcount decrement |
| `seq_cst` (default) | single global order of all seq_cst ops | default; easiest to reason about |

```cpp
// Publish/subscribe with release/acquire
int payload;                       // plain data
std::atomic<bool> ready{false};

void producer() { payload = 42; ready.store(true, std::memory_order_release); }
void consumer() {
    while (!ready.load(std::memory_order_acquire)) { }
    assert(payload == 42);         // guaranteed: release "happens-before" acquire
}
```

### Spinlock

```cpp
class Spinlock {
    std::atomic<bool> locked_{false};
public:
    void lock() {
        while (locked_.exchange(true, std::memory_order_acquire)) {
            while (locked_.load(std::memory_order_relaxed)) { /* spin on read: cache friendly */ }
        }
    }
    void unlock() { locked_.store(false, std::memory_order_release); }
};
```

Spinlocks only make sense for very short critical sections on multi-core systems. On a single-core MCU, a spinlock against an ISR deadlocks — disable interrupts instead.

### `volatile` is not atomic

`volatile` prevents the compiler from optimising away accesses (for MMIO), but gives **no atomicity and no inter-thread ordering**. Use `std::atomic` for thread communication.

## 6. Futures, async, and C++20 primitives

```cpp
auto fut = std::async(std::launch::async, [] { return expensive(); });
int r = fut.get();                      // blocks; rethrows exceptions from the task

std::promise<int> p; std::future<int> f = p.get_future();
std::thread([&p] { p.set_value(7); }).join();

std::latch start(1);                    // one-shot countdown
std::barrier sync(4);                   // reusable phase barrier
std::counting_semaphore<8> slots(8);    // limit concurrency
slots.acquire(); /* ... */ slots.release();
```

## 7. Thread pool (common design question)

```cpp
class ThreadPool {
    std::vector<std::jthread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex m_;
    std::condition_variable cv_;
    bool stop_ = false;
public:
    explicit ThreadPool(size_t n) {
        for (size_t i = 0; i < n; ++i)
            workers_.emplace_back([this] {
                for (;;) {
                    std::function<void()> task;
                    {
                        std::unique_lock lk(m_);
                        cv_.wait(lk, [this] { return stop_ || !tasks_.empty(); });
                        if (stop_ && tasks_.empty()) return;
                        task = std::move(tasks_.front());
                        tasks_.pop();
                    }
                    task();                          // run outside the lock
                }
            });
    }
    template <class F>
    auto submit(F f) -> std::future<std::invoke_result_t<F>> {
        auto pt = std::make_shared<std::packaged_task<std::invoke_result_t<F>()>>(std::move(f));
        auto fut = pt->get_future();
        { std::lock_guard lk(m_); tasks_.emplace([pt] { (*pt)(); }); }
        cv_.notify_one();
        return fut;
    }
    ~ThreadPool() {
        { std::lock_guard lk(m_); stop_ = true; }
        cv_.notify_all();                            // jthreads join in their destructors
    }
};
```

## 8. Performance pitfalls

- **False sharing:** two threads write different variables on the same 64-byte cache line → the line ping-pongs between cores. Fix: `alignas(std::hardware_destructive_interference_size)` (or 64).
- **Lock contention:** shrink critical sections; shard data; use reader/writer locks or lock-free structures.
- **Oversubscription:** more runnable threads than cores → context-switch overhead.

## 9. Embedded concurrency (ISRs & RTOS)

- Shared variable between ISR and main loop: make it `volatile` (or atomic) **and** protect multi-step access with a critical section (`__disable_irq()` / `taskENTER_CRITICAL()`).
- Never block (mutex, `printf`, `malloc`) in an ISR — defer work to a task via a queue/semaphore ("top half / bottom half").
- **Priority inversion:** a low-priority task holds a mutex needed by a high-priority task while a medium task preempts. Fix: priority inheritance mutexes (FreeRTOS mutexes support it). Famous case: Mars Pathfinder (1997).

## Interview Q&A

- **Mutex vs semaphore?** A mutex has ownership (only the locker unlocks) and is for mutual exclusion; a counting semaphore counts resources/signals and can be posted by anyone (e.g. from an ISR).
- **What's a spurious wakeup?** A condition variable wait returning without notification — always re-check the predicate.
- **Is `++x` on an `int` atomic?** No: load, add, store. Use `std::atomic<int>`.
- **What does `memory_order_relaxed` guarantee?** Only that the operation itself is atomic.
- **How do you detect races?** ThreadSanitizer (`-fsanitize=thread`), code review, design (message passing, immutability).
