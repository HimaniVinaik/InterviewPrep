# STL Containers

> **Key idea:** A container decides the **memory layout** of your data, and on modern CPUs layout matters about as much as Big-O. Contiguous containers (`vector`, `array`, `string`, `deque`'s blocks) are fast to scan and prefetch. Node-based containers (`list`, `map`, `unordered_map`) give **stable iterators** but pay a heap allocation and a likely cache miss per element. Default to `std::vector`. Switch only when you can name the operation that it makes too slow, or the guarantee (ordering, stability, fixed capacity) that you need.

**What you'll be able to do after this guide**
- Choose a container from its access pattern and justify it with complexity *and* memory layout.
- Explain `vector` growth, `reserve`, `emplace_back`, and why a `noexcept` move constructor matters.
- Recite the iterator-invalidation rules and write erase-while-iterating code correctly.
- Use `map`/`set` fully: `lower_bound`, `equal_range`, `try_emplace`, `insert_or_assign`, `extract`/`merge`, transparent comparators.
- Write a custom hash, tune load factors, and know the weaknesses of `std::unordered_map`.
- Build classic interview structures: an LRU cache, a top-K heap, a min-heap of pairs.
- Avoid heap allocation in embedded code with `std::array`, `std::pmr` and fixed-capacity containers.

---

## 1. Choosing a container

Ask these questions in order:

1. **Is the size fixed at compile time?** Use `std::array<T, N>`.
2. **Do you mostly append and iterate, or index by position?** Use `std::vector<T>`. This covers 80%+ of cases.
3. **Do you need fast insertion at *both* ends?** Use `std::deque<T>`, or a ring buffer.
4. **Do you look values up by key?**
   - Order doesn't matter: `std::unordered_map`/`unordered_set`, or an open-addressing map.
   - You need sorted iteration, range queries or "nearest key": `std::map`/`set`.
   - The data is built once and queried many times: a **sorted `vector`** with `lower_bound` (or C++23 `flat_map`).
5. **Do you need iterators and references to survive insertions and erasures elsewhere, or O(1) splicing?** Use `std::list`. Also consider a `vector` of `unique_ptr`, which keeps addresses stable but keeps the pointers contiguous.
6. **Do you only need LIFO, FIFO or "largest first"?** Use the adaptors `stack`, `queue` and `priority_queue`.

### Complexity cheat sheet

| Container | Layout | Index | Insert/erase | Find | Notes |
|---|---|---|---|---|---|
| `vector` | contiguous, growable | O(1) | end: amortised O(1); middle: O(n) | O(n); O(log n) if sorted | **default choice** |
| `array<T,N>` | contiguous, fixed, no heap | O(1) | — | O(n) | embedded-friendly; an aggregate |
| `string` | contiguous + SSO | O(1) | like `vector` | O(n·m) `find` | null-terminated `c_str()` |
| `deque` | array of fixed-size blocks | O(1) (two indirections) | both ends O(1); middle O(n) | O(n) | references survive end inserts |
| `list` | doubly linked nodes | O(n) | O(1) at a known iterator | O(n) | `splice`, stable iterators |
| `forward_list` | singly linked nodes | O(n) | O(1) *after* an iterator | O(n) | one pointer per node; no `size()` |
| `map`/`set` | red-black tree | O(log n) | O(log n) | O(log n) | ordered; stable iterators |
| `multimap`/`multiset` | red-black tree | O(log n) | O(log n) | O(log n) | duplicate keys |
| `unordered_map`/`set` | bucket array + node lists | avg O(1) | avg O(1) | avg O(1), worst O(n) | no order; rehash invalidates iterators |
| `priority_queue` | binary heap in a `vector` | top O(1) | push/pop O(log n) | — | max-heap by default |
| `stack` / `queue` | adaptors (default over `deque`) | top/front O(1) | O(1) | — | restricted interface |
| `flat_map`/`flat_set` (C++23) | two sorted `vector`s | O(log n) | O(n) | O(log n) | cache-friendly lookups |
| `span<T>` / `string_view` | non-owning views | O(1) | — | — | not containers, but take them as parameters |

---

## 2. `std::vector` in depth

A `vector` is three pointers: `begin`, `end` (one past the last element) and `end_of_storage`. `size() = end - begin` and `capacity() = end_of_storage - begin`.

### 2.1 Growth, `reserve` and amortised O(1)

When `size() == capacity()`, `push_back` allocates a bigger buffer, moves the elements over, then frees the old buffer. libstdc++ and libc++ **double** the capacity; MSVC grows it by **1.5×**. Geometric growth makes each push amortised O(1): with doubling, the total number of copies over n pushes is at most n + n/2 + n/4 + ... < 2n.

```cpp
#include <cassert>
#include <cstdio>
#include <vector>

int main() {
    std::vector<int> v;
    std::size_t lastCapacity = v.capacity();
    int reallocations = 0;
    std::printf("capacity growth:");
    for (int i = 0; i < 1000; ++i) {
        v.push_back(i);
        if (v.capacity() != lastCapacity) {
            lastCapacity = v.capacity();
            reallocations++;
            std::printf(" %zu", lastCapacity);      // libstdc++: 1 2 4 8 16 ... 1024
        }
    }
    std::printf("\n%d reallocations for 1000 push_backs\n", reallocations);

    // reserve(): one allocation up front, no reallocations afterwards.
    std::vector<int> w;
    w.reserve(1000);
    const int* before = w.data();
    for (int i = 0; i < 1000; ++i) {
        w.push_back(i);
    }
    assert(w.data() == before);              // the buffer never moved

    // clear() destroys elements but keeps the capacity; shrink_to_fit() *may* release it.
    w.clear();
    assert(w.empty() && w.capacity() >= 1000);
    w.shrink_to_fit();                       // a non-binding request (libstdc++ honours it)
    std::printf("after clear+shrink_to_fit: capacity=%zu\n", w.capacity());

    // resize() vs reserve(): resize changes size (value-initialises new elements).
    std::vector<int> r;
    r.resize(3);                             // {0, 0, 0}
    r.reserve(10);                           // size still 3
    assert(r.size() == 3 && r[2] == 0);
    return 0;
}
```

> **Pitfall:** `v.reserve(n)` and then `v[i] = x` for `i < n` is **undefined behaviour**. `reserve` allocates storage but creates no elements, so `size()` is still 0. Use `resize(n)` if you want to index, or `reserve` + `push_back`.

### 2.2 Why your move constructor must be `noexcept`

During reallocation, `vector` must keep the **strong exception guarantee**: if anything throws, the original vector is unchanged. It can only *move* elements if the move constructor can't throw. Otherwise it **copies** them (`std::move_if_noexcept`).

```cpp
#include <cassert>
#include <cstdio>
#include <string>
#include <vector>

struct Counters {
    static inline int copies = 0;
    static inline int moves = 0;
};

struct Fast {
    std::string data = "payload";
    Fast() = default;
    Fast(const Fast& o) : data(o.data) { Counters::copies++; }
    Fast(Fast&& o) noexcept : data(std::move(o.data)) { Counters::moves++; }   // noexcept
};

struct Slow {
    std::string data = "payload";
    Slow() = default;
    Slow(const Slow& o) : data(o.data) { Counters::copies++; }
    Slow(Slow&& o) : data(std::move(o.data)) { Counters::moves++; }            // may throw
};

template <typename T>
void grow(const char* label) {
    Counters::copies = 0;
    Counters::moves = 0;
    std::vector<T> v;
    for (int i = 0; i < 100; ++i) {
        v.emplace_back();
    }
    std::printf("%s: %d copies, %d moves during reallocations\n", label, Counters::copies, Counters::moves);
}

int main() {
    grow<Fast>("noexcept move");   // only moves
    grow<Slow>("throwing move ");  // only copies!
    assert(Counters::moves == 0);
    return 0;
}
```

Rule: write move operations as `noexcept`, or `= default` them. A defaulted move is `noexcept` whenever every member's move is.

### 2.3 `push_back` vs `emplace_back`

| Call | What happens |
|---|---|
| `v.push_back(x)` | copy-constructs from `x` |
| `v.push_back(std::move(x))` | move-constructs |
| `v.push_back(T(args))` | constructs a temporary, then moves it |
| `v.emplace_back(args...)` | constructs **in place** from `args` (no temporary) |

`emplace_back` helps for types that are expensive to move, or for construction from several arguments. It is also more permissive. `std::vector<std::unique_ptr<int>> v; v.emplace_back(new int(1));` compiles and can leak if the reallocation throws, which `push_back(std::make_unique<int>(1))` avoids. Also, `std::vector<std::vector<int>> v; v.emplace_back(1000000);` silently creates a vector of a million zeros, because `emplace_back` can call explicit constructors.

### 2.4 `vector<bool>` and other gotchas

- `std::vector<bool>` is a **bit-packed specialisation**. `operator[]` returns a proxy object, not `bool&`, so `auto& b = v[0];` doesn't compile and `&v[0]` isn't a `bool*`. It is also unsafe to write different bits from different threads. Use `std::vector<char>`, `std::bitset<N>` or `boost::dynamic_bitset` instead.
- `v.front()`/`v.back()`/`v.pop_back()` on an empty vector is UB.
- `insert`/`erase` in the middle shifts every later element: O(n).
- `std::vector<T>` with a `const T` element type is not allowed. Make the vector itself const instead.

---

## 3. `std::array`, `std::deque` and the linked lists

### 3.1 `std::array<T, N>`

A zero-overhead wrapper around a C array. It is an aggregate, so its storage lives in the object itself (on the stack, or statically), and it doesn't decay to a pointer. It supports `size()`, iterators, `==`/`<=>`, `std::to_array`, structured bindings and `constexpr`. It is the default for fixed-size buffers in embedded code.

### 3.2 `std::deque<T>`

A deque is a "map" (array) of pointers to fixed-size blocks; libstdc++ uses 512-byte blocks. `push_front` and `push_back` fill the first or last block and add a new block when it is full. That gives O(1) at both ends, and existing elements never move, so **references and pointers stay valid** on end inserts. Iterators are invalidated, because the map may be reallocated. Indexing costs two indirections. `std::stack` and `std::queue` use `deque` by default.

### 3.3 `std::list` and `forward_list`

Each element is its own heap node with `prev`/`next` pointers (16 bytes of overhead on 64-bit, plus allocator overhead). Nothing ever moves, so iterators stay valid until *that* element is erased, and `splice` moves nodes between lists in O(1) without copying. The classic justified use is the **LRU cache**:

```cpp
#include <cassert>
#include <cstdio>
#include <list>
#include <optional>
#include <string>
#include <unordered_map>

// O(1) get/put: the list keeps recency order, and the map points into the list.
class LruCache {
public:
    explicit LruCache(std::size_t capacity) : capacity_(capacity) {}

    std::optional<std::string> get(int key) {
        auto it = index_.find(key);
        if (it == index_.end()) {
            return std::nullopt;
        }
        order_.splice(order_.begin(), order_, it->second);   // move node to front: O(1), no copy
        return it->second->second;                            // iterator still valid after splice
    }

    void put(int key, std::string value) {
        if (auto it = index_.find(key); it != index_.end()) {
            it->second->second = std::move(value);
            order_.splice(order_.begin(), order_, it->second);
            return;
        }
        if (order_.size() == capacity_) {
            index_.erase(order_.back().first);                // evict least recently used
            order_.pop_back();
        }
        order_.emplace_front(key, std::move(value));
        index_[key] = order_.begin();
    }

private:
    using Entry = std::pair<int, std::string>;
    std::size_t capacity_;
    std::list<Entry> order_;                                  // front = most recent
    std::unordered_map<int, std::list<Entry>::iterator> index_;
};

int main() {
    LruCache cache(2);
    cache.put(1, "one");
    cache.put(2, "two");
    assert(cache.get(1) == "one");      // 1 is now most recent
    cache.put(3, "three");              // evicts 2
    assert(!cache.get(2));
    assert(cache.get(3) == "three" && cache.get(1) == "one");
    std::printf("LRU cache: key 2 evicted as expected\n");
    return 0;
}
```

`list` has member `sort()` (merge sort, O(n log n)), `merge`, `unique`, `remove_if` and `reverse`, because `std::sort` needs random-access iterators.

### 3.4 Why `vector` usually beats `list`, even for middle inserts

To insert into the *middle* of a list you first have to **find** the position, and that walk is O(n) pointer chasing with a cache miss per node. A vector does the same O(n) work as one `memmove` over contiguous memory, which the CPU's prefetcher streams through. The program below inserts n random values while keeping the sequence sorted (Bjarne Stroustrup's classic experiment):

```cpp
#include <algorithm>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <list>
#include <random>
#include <vector>

template <typename Container>
long long timeSortedInsert(const std::vector<int>& values, Container& c) {
    auto start = std::chrono::steady_clock::now();
    for (int value : values) {
        auto pos = std::find_if(c.begin(), c.end(), [&](int x) { return x >= value; });  // linear search
        c.insert(pos, value);
    }
    auto stop = std::chrono::steady_clock::now();
    return std::chrono::duration_cast<std::chrono::microseconds>(stop - start).count();
}

int main() {
    std::mt19937 rng(42);
    std::uniform_int_distribution<int> dist(0, 1'000'000);
    std::vector<int> values(5000);
    for (auto& v : values) {
        v = dist(rng);
    }

    std::vector<int> vec;
    std::list<int> lst;
    long long vecUs = timeSortedInsert(values, vec);
    long long lstUs = timeSortedInsert(values, lst);

    assert(std::is_sorted(vec.begin(), vec.end()));
    assert(std::equal(vec.begin(), vec.end(), lst.begin()));
    // Measured with g++ -O2 (no sanitizers): vector 1581 us, list 23339 us, about 15x faster.
    std::printf("sorted insert of %zu ints: vector %lld us, list %lld us\n", values.size(), vecUs, lstUs);
    return 0;
}
```

---

## 4. Iterator invalidation — the classic interview topic

| Container | Insert | Erase |
|---|---|---|
| `vector`/`string` | **all** if it reallocates; otherwise those at/after the insertion point | at/after the erase point (including `end()`) |
| `deque` | at either end: all iterators, **references stay valid**; in the middle: all | at an end: only the erased elements (and `end()` for the back); middle: all |
| `list`/`forward_list` | none | only the erased element |
| `map`/`set`/`multi*` | none | only the erased element |
| `unordered_*` | all iterators if a rehash happens (references stay valid); none otherwise | only the erased element |

```cpp
#include <algorithm>
#include <cassert>
#include <map>
#include <unordered_map>
#include <vector>

int main() {
    // vector: erase returns the next valid iterator.
    std::vector<int> v{1, 2, 3, 4, 5, 6};
    for (auto it = v.begin(); it != v.end();) {
        it = (*it % 2 == 0) ? v.erase(it) : std::next(it);
    }
    assert((v == std::vector<int>{1, 3, 5}));

    // C++20: one call, O(n), works for every standard container.
    std::vector<int> w{1, 2, 3, 4, 5, 6};
    std::erase_if(w, [](int x) { return x % 2 == 0; });
    assert(w == v);

    // Pre-C++20 equivalent: the erase-remove idiom.
    std::vector<int> u{1, 2, 3, 4, 5, 6};
    u.erase(std::remove_if(u.begin(), u.end(), [](int x) { return x % 2 == 0; }), u.end());
    assert(u == v);

    // map: only the erased node's iterator dies; erase(it) returns the next one.
    std::map<int, char> m{{1, 'a'}, {2, 'b'}, {3, 'c'}};
    for (auto it = m.begin(); it != m.end();) {
        if (it->first == 2) {
            it = m.erase(it);
        } else {
            ++it;
        }
    }
    assert(m.size() == 2 && !m.contains(2));

    // unordered_map: references survive a rehash; iterators may not.
    std::unordered_map<int, int> h{{1, 10}};
    int& ref = h[1];
    for (int i = 2; i < 1000; ++i) {
        h[i] = i;                    // several rehashes happen here
    }
    assert(ref == 10);               // still valid: the node didn't move
    return 0;
}
```

`std::remove_if` doesn't remove anything. It shifts the kept elements to the front and returns the new logical end. The `erase` call is what changes the size.

---

## 5. Ordered associative containers: `map`, `set`, `multimap`, `multiset`

These are red-black trees: self-balancing, with height ≤ 2·log₂(n+1). Each node holds the value, three pointers and a colour, so a `map<int,int>` node takes 40 bytes with libstdc++ on 64-bit (32-byte header plus the 8-byte pair), plus malloc overhead.

```cpp
#include <cassert>
#include <cstdio>
#include <map>
#include <set>
#include <string>
#include <string_view>

int main() {
    std::map<std::string, int> m;

    // Insertion flavours — know the differences.
    m["a"] = 1;                                 // inserts a default (0) first if missing, then assigns
    auto [it1, inserted1] = m.insert({"b", 2}); // never overwrites; reports whether it inserted
    auto [it2, inserted2] = m.insert({"b", 99});
    assert(inserted1 && !inserted2 && m["b"] == 2);
    m.insert_or_assign("b", 3);                 // C++17: overwrite if present
    m.try_emplace("c", 4);                      // C++17: constructs the value only if the key is absent
    m.try_emplace("c", 400);                    // no effect: "c" already present
    assert(m["b"] == 3 && m["c"] == 4);

    // Lookup without inserting: find / contains / at.
    assert(m.find("zzz") == m.end() && !m.contains("zzz"));
    assert(m.at("a") == 1);                     // throws std::out_of_range if absent
    assert(m.size() == 3);                      // find/contains didn't insert "zzz"

    // Ordered queries — the reason to choose map over unordered_map.
    std::set<int> s{10, 20, 30, 40};
    assert(*s.lower_bound(25) == 30);           // first element >= 25
    assert(*s.upper_bound(30) == 40);           // first element >  30
    auto below = s.lower_bound(25);
    assert(*std::prev(below) == 20);            // largest element < 25 ("floor")
    int inRange = 0;
    for (auto it = s.lower_bound(15); it != s.upper_bound(35); ++it) {
        inRange++;                              // range query [15, 35]: 20, 30
    }
    assert(inRange == 2);

    // multimap: equal_range gives all values for one key.
    std::multimap<std::string, int> scores{{"ana", 90}, {"bo", 70}, {"ana", 85}};
    auto [first, last] = scores.equal_range("ana");
    int total = 0;
    for (auto it = first; it != last; ++it) {
        total += it->second;
    }
    assert(total == 175 && scores.count("ana") == 2);

    // C++17 node handles: move a node between maps (or change its key) without reallocating.
    std::map<std::string, int> other;
    auto node = m.extract("a");
    node.key() = "A";                           // keys are const in the map, but not in a node handle
    other.insert(std::move(node));
    assert(!m.contains("a") && other.at("A") == 1);
    other.merge(m);                             // splices all nodes whose keys aren't already in `other`
    assert(m.empty() && other.size() == 3);

    // Transparent comparator: look up with string_view or const char* without building a std::string.
    std::map<std::string, int, std::less<>> fast{{"key", 1}};
    std::string_view probe = "key";
    assert(fast.find(probe) != fast.end());

    std::printf("map/set operations verified\n");
    return 0;
}
```

> **Pitfall:** `operator[]` inserts when the key is missing. It doesn't exist on a `const map`, and it requires the mapped type to be default-constructible. Inside a "read-only" loop, `if (m[key] == 0)` silently grows the map. Use `find`, `contains` or `at`.

### Custom ordering

The comparator must be a **strict weak ordering**. Two keys are treated as *equivalent* (the same key) when `!comp(a, b) && !comp(b, a)`. That is why comparing only one field merges records that differ in another field.

```cpp
#include <cassert>
#include <set>
#include <string>
#include <tuple>

struct Employee {
    std::string name;
    int age;
};

struct ByAgeThenName {
    bool operator()(const Employee& a, const Employee& b) const {
        return std::tie(a.age, a.name) < std::tie(b.age, b.name);   // lexicographic
    }
};

struct ByAgeOnly {
    bool operator()(const Employee& a, const Employee& b) const {
        return a.age < b.age;
    }
};

int main() {
    std::set<Employee, ByAgeThenName> full{{"ana", 30}, {"bo", 30}, {"cy", 25}};
    assert(full.size() == 3 && full.begin()->name == "cy");

    std::set<Employee, ByAgeOnly> lossy{{"ana", 30}, {"bo", 30}};   // "bo" is "equivalent" to "ana"
    assert(lossy.size() == 1);
    return 0;
}
```

---

## 6. Unordered containers (hash tables)

`std::unordered_map` is an array of **buckets**, each holding a linked list of nodes. (libstdc++ actually threads all nodes on one singly linked list, with buckets pointing into it.) A lookup hashes the key, picks bucket `hash % bucket_count()`, then compares keys with `==` along that bucket's chain.

- **Load factor** = `size() / bucket_count()`. When an insert would push it above `max_load_factor()` (default **1.0**), the table **rehashes** into roughly twice as many buckets. That is O(n) and invalidates iterators.
- **Average O(1)**, but **worst case O(n)** when many keys collide. Adversarial keys can trigger this (hash-flooding attacks), and so can a poor hash.
- `reserve(n)` sets the bucket count up front for n elements, avoiding rehashes.

```cpp
#include <cassert>
#include <cstddef>
#include <cstdio>
#include <functional>
#include <string>
#include <unordered_map>
#include <unordered_set>

struct Point {
    int x;
    int y;
    bool operator==(const Point&) const = default;   // unordered containers need ==
};

// Combine member hashes. The boost::hash_combine recipe mixes bits so (1,2) != (2,1).
inline void hashCombine(std::size_t& seed, std::size_t value) {
    seed ^= value + 0x9e3779b97f4a7c15ULL + (seed << 6) + (seed >> 2);
}

struct PointHash {
    std::size_t operator()(const Point& p) const noexcept {
        std::size_t seed = std::hash<int>{}(p.x);
        hashCombine(seed, std::hash<int>{}(p.y));
        return seed;
    }
};

// Alternatively specialise std::hash so you don't have to name the hasher.
template <>
struct std::hash<Point> {
    std::size_t operator()(const Point& p) const noexcept { return PointHash{}(p); }
};

int main() {
    std::unordered_map<Point, std::string, PointHash> labels;
    labels[{1, 2}] = "a";
    labels[{2, 1}] = "b";
    assert(labels.size() == 2 && labels.at({1, 2}) == "a");

    std::unordered_set<Point> visited{{0, 0}, {0, 1}};   // uses std::hash<Point>
    assert(visited.contains({0, 1}));

    // Watching the table grow.
    std::unordered_map<int, int> h;
    std::printf("max_load_factor=%.1f\n", static_cast<double>(h.max_load_factor()));
    std::size_t buckets = h.bucket_count();
    int rehashes = 0;
    for (int i = 0; i < 1000; ++i) {
        h[i] = i;
        if (h.bucket_count() != buckets) {
            buckets = h.bucket_count();
            rehashes++;
        }
    }
    std::printf("1000 inserts: %d rehashes, %zu buckets, load factor %.2f\n",
                rehashes, h.bucket_count(), static_cast<double>(h.load_factor()));

    std::unordered_map<int, int> pre;
    pre.reserve(1000);                        // enough buckets for 1000 elements at load factor 1.0
    std::size_t reserved = pre.bucket_count();
    for (int i = 0; i < 1000; ++i) {
        pre[i] = i;
    }
    assert(pre.bucket_count() == reserved);   // no rehash happened
    return 0;
}
```

**Performance note:** `std::unordered_map` is node-based. Its interface promises reference stability and a bucket API, which forces one allocation per element and pointer chasing. Open-addressing tables store elements inline in one flat array and are typically 2–5× faster: Abseil `flat_hash_map`, Boost `unordered_flat_map`, `ankerl::unordered_dense`. Mention them when an interviewer asks about high-performance hashing.

---

## 7. Container adaptors and heaps

```cpp
#include <cassert>
#include <cstdio>
#include <functional>
#include <queue>
#include <stack>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

// Top-K frequent words with a size-K min-heap: O(n log k).
std::vector<std::string> topK(const std::vector<std::string>& words, std::size_t k) {
    std::unordered_map<std::string, int> freq;
    for (const auto& w : words) {
        freq[w]++;
    }
    using Item = std::pair<int, std::string>;               // (count, word)
    auto worse = [](const Item& a, const Item& b) {         // "a should be popped before b"
        if (a.first != b.first) {
            return a.first > b.first;                       // lower count = worse (min-heap on count)
        }
        return a.second < b.second;                         // tie: alphabetically later is worse
    };
    std::priority_queue<Item, std::vector<Item>, decltype(worse)> heap(worse);
    for (const auto& [word, count] : freq) {
        heap.emplace(count, word);
        if (heap.size() > k) {
            heap.pop();                                     // drop the current worst
        }
    }
    std::vector<std::string> result(heap.size());
    for (auto i = result.size(); i-- > 0;) {
        result[i] = heap.top().second;
        heap.pop();
    }
    return result;
}

int main() {
    std::stack<int> st;                                      // LIFO: push / top / pop
    st.push(1);
    st.push(2);
    assert(st.top() == 2);

    std::queue<int> q;                                       // FIFO: push / front / pop
    q.push(1);
    q.push(2);
    assert(q.front() == 1);

    std::priority_queue<int> maxq;                           // max-heap by default (std::less)
    std::priority_queue<int, std::vector<int>, std::greater<>> minq;   // min-heap
    for (int x : {5, 1, 8, 3}) {
        maxq.push(x);
        minq.push(x);
    }
    assert(maxq.top() == 8 && minq.top() == 1);

    // The raw heap algorithms work on any random-access range.
    std::vector<int> h{3, 1, 4, 1, 5};
    std::make_heap(h.begin(), h.end());                      // O(n)
    std::pop_heap(h.begin(), h.end());                       // moves the max to the back
    assert(h.back() == 5);
    h.pop_back();

    auto best = topK({"a", "b", "a", "c", "b", "a", "d"}, 2);
    assert((best == std::vector<std::string>{"a", "b"}));
    std::printf("top-2: %s %s\n", best[0].c_str(), best[1].c_str());
    return 0;
}
```

`priority_queue` has no `decrease-key` and no iteration. For Dijkstra, push duplicates and skip stale entries when popped, or use a `std::set<pair<dist, node>>`, where an erase plus an insert acts as decrease-key.

---

## 8. `std::string` and the small-string optimisation

`std::string` stores short strings **inline**, in the object itself, with no heap allocation. This is SSO.

| Library | `sizeof(std::string)` (64-bit) | Inline capacity |
|---|---|---|
| libstdc++ (GCC) | 32 | 15 chars |
| libc++ (Clang/Apple) | 24 | 22 chars |
| MSVC STL | 32 | 15 chars |

```cpp
#include <cassert>
#include <cstdio>
#include <string>

int main() {
    std::string empty;
    std::printf("sizeof(std::string)=%zu, inline capacity=%zu\n", sizeof(std::string), empty.capacity());

    std::string small = "short";                    // fits inline: data() points into the object
    const char* inside = small.data();
    bool inlineStorage = inside >= reinterpret_cast<const char*>(&small) &&
                         inside < reinterpret_cast<const char*>(&small) + sizeof small;
    std::printf("\"short\" stored inline: %s\n", inlineStorage ? "yes" : "no");

    std::string big(100, 'x');                      // heap allocated
    std::string moved = std::move(big);             // steals the heap buffer: O(1)
    assert(moved.size() == 100);

    // Common operations and their costs.
    std::string s = "hello world";
    assert(s.find("world") == 6 && s.find('z') == std::string::npos);
    assert(s.substr(0, 5) == "hello");              // allocates a new string (string_view::substr doesn't)
    assert(s.starts_with("he") && s.ends_with("ld"));   // C++20
    s += '!';                                       // amortised O(1), like vector
    assert(s.back() == '!' && s.c_str()[s.size()] == '\0');
    return 0;
}
```

Moving a short string *copies* its characters, because there is no buffer to steal. Moving is still cheap: 15 bytes.

---

## 9. Containers in embedded and real-time code

The standard containers allocate through `std::allocator`, which uses the heap. That brings non-deterministic timing, fragmentation, and possible `bad_alloc` (or `abort` with `-fno-exceptions`). The options:

| Option | When |
|---|---|
| `std::array`, plain arrays | the size is known at compile time |
| `std::pmr::vector` etc. over a static buffer | you want the standard interface but your own memory |
| ETL (`etl::vector<T, N>`), Boost.StaticVector, C++26 `std::inplace_vector<T, N>` | fixed capacity, no heap, with a `vector`-like API |
| Ring buffer over `std::array` | queues between an ISR and the main loop |
| Allocate everything at start-up, never free | MISRA / safety-critical systems |

```cpp
#include <array>
#include <cassert>
#include <cstddef>
#include <cstdio>
#include <memory_resource>
#include <optional>
#include <vector>

// Fixed-capacity ring buffer: no heap, O(1) push/pop, typical ISR -> main-loop queue.
template <typename T, std::size_t N>
class RingBuffer {
public:
    bool push(const T& value) {
        if (count_ == N) {
            return false;                     // full: the caller decides (drop / overwrite / count)
        }
        data_[(head_ + count_) % N] = value;
        count_++;
        return true;
    }
    std::optional<T> pop() {
        if (count_ == 0) {
            return std::nullopt;
        }
        T value = data_[head_];
        head_ = (head_ + 1) % N;
        count_--;
        return value;
    }
    std::size_t size() const { return count_; }

private:
    std::array<T, N> data_{};
    std::size_t head_ = 0;
    std::size_t count_ = 0;
};

int main() {
    RingBuffer<int, 3> rb;
    assert(rb.push(1) && rb.push(2) && rb.push(3) && !rb.push(4));
    assert(rb.pop() == 1 && rb.push(4));
    assert(rb.pop() == 2 && rb.pop() == 3 && rb.pop() == 4 && !rb.pop());

    // pmr: standard containers, memory from a static buffer, no fallback to the heap.
    alignas(std::max_align_t) static std::byte pool[4096];
    std::pmr::monotonic_buffer_resource arena(pool, sizeof pool, std::pmr::null_memory_resource());
    std::pmr::vector<int> v(&arena);
    v.reserve(100);                           // carved out of `pool`
    for (int i = 0; i < 100; ++i) {
        v.push_back(i);
    }
    auto* addr = reinterpret_cast<std::byte*>(v.data());
    assert(addr >= pool && addr < pool + sizeof pool);   // really inside the static buffer
    std::printf("ring buffer ok; pmr vector lives in the static pool\n");
    return 0;
}
```

A `monotonic_buffer_resource` never frees individual allocations; memory is released only when the resource is destroyed. Use `unsynchronized_pool_resource` when you need reuse.

---

## 10. Interview checklist

- [ ] Pick a container from the access pattern; defend `vector` as the default with the cache-locality argument.
- [ ] `vector` growth (2× / 1.5×), amortised O(1), `reserve` vs `resize`, `clear` keeps capacity.
- [ ] Why `noexcept` moves matter for `vector` reallocation.
- [ ] `push_back` vs `emplace_back`, and `vector<bool>`.
- [ ] Iterator invalidation for every container family; erase-while-iterating; erase-remove vs `std::erase_if`.
- [ ] `map` internals (red-black tree); `operator[]` vs `insert` vs `try_emplace` vs `insert_or_assign`; `lower_bound`/`upper_bound`/`equal_range`; `extract`/`merge`; transparent comparators.
- [ ] Hash tables: buckets, load factor, rehash, custom hash and `==`, worst case O(n), open-addressing alternatives.
- [ ] Adaptors, and the heap algorithms; top-K with a min-heap; LRU with `list` + `unordered_map`.
- [ ] SSO sizes; `string_view` for parameters.
- [ ] Embedded: `array`, ring buffers, `pmr`, fixed-capacity containers.

---

## Practice

1. You need to store 10 million sensor readings that arrive in time order, then run many "average between time t1 and t2" queries. Which container would you use, and why?
2. Implement `firstUnique(const std::string& s)`, returning the index of the first non-repeating character (or −1) in O(n).
3. What does this print, and why? `std::map<std::string,int> m; if (m["x"] == 0) {} std::cout << m.size();`
4. Implement a `TimeMap` with `set(key, value, timestamp)` and `get(key, timestamp)` returning the value with the largest timestamp ≤ the given one (LeetCode 981).
5. Why can `std::unordered_map<std::pair<int,int>, int>` not be declared as is, and what are two ways to fix it?

:::details Show solution
1. A `std::vector` of `(timestamp, value)` pairs, appended in order, so it is already sorted. Add a **prefix-sum** array. Each query is two `lower_bound` binary searches, O(log n), plus O(1) arithmetic. A `map` would cost about 5× the memory (a node per reading) and run slower, because readings are never inserted in the middle.
2.
```cpp
#include <array>
#include <cassert>
#include <string>

int firstUnique(const std::string& s) {
    std::array<int, 256> count{};                        // fixed alphabet: an array beats a hash map
    for (unsigned char c : s) {
        count[c]++;
    }
    for (std::size_t i = 0; i < s.size(); ++i) {
        if (count[static_cast<unsigned char>(s[i])] == 1) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

int main() {
    assert(firstUnique("leetcode") == 0);
    assert(firstUnique("loveleetcode") == 2);
    assert(firstUnique("aabb") == -1);
    return 0;
}
```
3. It prints **1**. `m["x"]` inserts `{"x", 0}` because the key was missing. Use `m.find("x")`, `m.contains("x")` or `m.at("x")` for read-only access.
4.
```cpp
#include <cassert>
#include <map>
#include <string>
#include <unordered_map>

class TimeMap {
public:
    void set(const std::string& key, const std::string& value, int timestamp) {
        data_[key][timestamp] = value;
    }
    std::string get(const std::string& key, int timestamp) const {
        auto it = data_.find(key);
        if (it == data_.end()) {
            return "";
        }
        const auto& versions = it->second;
        auto after = versions.upper_bound(timestamp);    // first timestamp > t
        if (after == versions.begin()) {
            return "";                                   // nothing at or before t
        }
        return std::prev(after)->second;                 // largest timestamp <= t
    }

private:
    std::unordered_map<std::string, std::map<int, std::string>> data_;
};

int main() {
    TimeMap tm;
    tm.set("foo", "bar", 1);
    tm.set("foo", "bar2", 4);
    assert(tm.get("foo", 1) == "bar");
    assert(tm.get("foo", 3) == "bar");
    assert(tm.get("foo", 5) == "bar2");
    assert(tm.get("foo", 0).empty() && tm.get("nope", 9).empty());
    return 0;
}
```
   Since timestamps arrive in increasing order in the LeetCode version, a `vector<pair<int,string>>` per key with `upper_bound` would be even faster.
5. The standard provides no `std::hash<std::pair<int,int>>`. You can pass a hasher as the third template argument (`std::unordered_map<std::pair<int,int>, int, PairHash>`), or specialise `std::hash` for your *own* key type, such as `struct Cell { int r, c; }`. Specialising `std::hash` for `std::pair` itself is technically allowed only for program-defined types. Another option is to pack both ints into one 64-bit key: `(std::uint64_t(r) << 32) | std::uint32_t(c)`.
:::

---

## Interview Q&A

- **`map` vs `unordered_map`?** Ordered + O(log n) + stable iterators vs unordered + avg O(1) + hashing cost & rehash invalidation.
- **Why reserve?** Avoid repeated reallocations and iterator invalidation.
- **Difference between `size()` and `capacity()`?** Elements present vs allocated slots.
- **How does `deque` give O(1) push_front?** A map of fixed-size blocks; new blocks are added at either end.
- **What's the complexity of `std::sort`?** O(n log n) guaranteed (introsort). `std::list` has its own `sort()` (merge sort) since it lacks random access.
- **When is `list` the right choice?** When you need iterator stability and O(1) `splice` (e.g. LRU caches), not for performance in general.
- **Why is `push_back` amortised O(1)?** Capacity grows geometrically, so the total cost of all copies over n pushes is O(n) — O(1) per push on average, even though an individual push can be O(n).
- **Why does `vector` copy instead of move my objects when it grows?** Your move constructor isn't `noexcept`; to keep the strong exception guarantee, `vector` uses `move_if_noexcept` and falls back to copying.
- **What's wrong with `std::vector<bool>`?** It's a bit-packed specialisation: `operator[]` returns a proxy, not `bool&`; you can't take element addresses, and concurrent writes to different elements race.
- **How does `std::unordered_map` handle collisions?** Separate chaining: each bucket points to a linked list of nodes; when the load factor exceeds `max_load_factor` (1.0 by default) it rehashes into more buckets.
- **What's the difference between `insert`, `emplace`, `try_emplace` and `insert_or_assign` on a map?** `insert`/`emplace` don't overwrite (and `emplace` may construct the value even if the key exists); `try_emplace` constructs only when the key is absent; `insert_or_assign` overwrites if present.
- **How would you implement an LRU cache?** A `std::list` of (key, value) in recency order plus an `unordered_map` from key to list iterator; `get` splices the node to the front, `put` evicts from the back — both O(1).
- **What is SSO?** Small string optimisation: short strings are stored inside the `std::string` object itself (15 chars in libstdc++/MSVC, 22 in libc++), avoiding a heap allocation.
- **How do you use containers without a heap on a microcontroller?** `std::array`/ring buffers, `std::pmr` containers over a static buffer with `null_memory_resource` as upstream, or fixed-capacity containers (ETL, `inplace_vector`).

---

## External resources

- **cppreference — Containers library** (with per-member complexity and invalidation notes).
- **Bjarne Stroustrup — "Why you should avoid linked lists"** (GoingNative 2012 talk).
- **Chandler Carruth — "Efficiency with Algorithms, Performance with Data Structures"** (CppCon 2014).
- **Matt Kulukundis — "Designing a Fast, Efficient, Cache-friendly Hash Table, Step by Step"** (CppCon 2017, Abseil Swiss tables).
- **Howard Hinnant's Stack Overflow answers** on `vector` growth and `noexcept` moves.
- **ETL — Embedded Template Library** (etlcpp.com) for fixed-capacity containers.
