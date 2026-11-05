# STL Containers

Choosing the right container is a performance decision you'll be asked to justify. Know the complexities, memory layout and iterator-invalidation rules.

## 1. Complexity cheat sheet

| Container | Layout | Access | Insert/erase | Find | Notes |
|---|---|---|---|---|---|
| `vector` | contiguous, growable | O(1) | end: amortised O(1); middle: O(n) | O(n) / O(log n) sorted | **default choice** |
| `array<T,N>` | contiguous, fixed | O(1) | — | O(n) | no heap; embedded-friendly |
| `deque` | chunked blocks | O(1) | both ends O(1) | O(n) | stable refs on end inserts |
| `list` | doubly linked nodes | O(n) | O(1) at iterator | O(n) | `splice`; stable iterators |
| `forward_list` | singly linked | O(n) | O(1) after iterator | O(n) | minimal overhead |
| `map`/`set` | red-black tree | O(log n) | O(log n) | O(log n) | ordered; stable iterators |
| `multimap`/`multiset` | red-black tree | O(log n) | O(log n) | O(log n) | duplicate keys |
| `unordered_map`/`set` | hash table (buckets of nodes) | avg O(1) | avg O(1) | avg O(1), worst O(n) | no order |
| `priority_queue` | heap over vector | top O(1) | O(log n) | — | adaptor |
| `stack`/`queue` | adaptors over deque | O(1) ends | O(1) | — | adaptor |
| `flat_map` (C++23) | sorted vectors | O(log n) | O(n) | O(log n) | cache-friendly lookups |
| `string` | contiguous + SSO | O(1) | like vector | O(n) | small-string optimisation |

## 2. `std::vector` internals

```cpp
std::vector<int> v;
v.reserve(1000);        // allocate capacity up front: no reallocations for 1000 push_backs
for (int i = 0; i < 1000; ++i) v.push_back(i);
v.size();               // 1000 elements
v.capacity();           // >= 1000
v.shrink_to_fit();      // non-binding request to release spare capacity
```

- Three pointers: `begin`, `end`, `end_of_capacity`.
- When full, it allocates a bigger buffer (growth factor 1.5× MSVC, 2× libstdc++), **moves** elements (if move is `noexcept`), and frees the old buffer → amortised O(1) `push_back`.
- `emplace_back(args...)` constructs in place; `push_back(T&&)` moves.
- `vector<bool>` is a bit-packed specialisation — not a real container (`&v[0]` isn't a `bool*`). Use `vector<char>` or `std::bitset` when that matters.

### Why vector usually beats list

Even for middle insertions, a `vector` is often faster than `list` for small/medium n because contiguous memory is cache-friendly and prefetchable; each `list` node is a separate allocation and a likely cache miss.

## 3. Iterator invalidation (classic interview topic)

| Container | Insert | Erase |
|---|---|---|
| `vector`/`string` | all invalidated if reallocation; else those at/after the point | at/after the erase point |
| `deque` | insert at ends: iterators invalidated, **references stay valid**; middle: all | ends: only erased; middle: all |
| `list`/`forward_list` | none | only the erased element |
| `map`/`set` | none | only the erased element |
| `unordered_*` | all iterators if rehash happens (references stay valid) | only the erased element |

```cpp
// ❌ Classic bug
for (auto it = v.begin(); it != v.end(); ++it)
    if (*it % 2 == 0) v.erase(it);        // `it` is invalid after erase

// ✅ erase returns the next valid iterator
for (auto it = v.begin(); it != v.end(); )
    it = (*it % 2 == 0) ? v.erase(it) : std::next(it);

// ✅✅ C++20
std::erase_if(v, [](int x) { return x % 2 == 0; });
```

## 4. Associative containers

```cpp
std::map<std::string, int> m;
m["a"] = 1;                      // operator[] inserts default if missing (not on const map!)
m.insert({"b", 2});              // no overwrite if exists
m.insert_or_assign("b", 3);      // C++17 overwrite
m.try_emplace("c", 4);           // C++17: constructs only if key absent
if (m.contains("a")) {}          // C++20
auto it = m.lower_bound("b");    // first key >= "b" (ordered containers only)

// Transparent comparator: look up with string_view without constructing a std::string
std::map<std::string, int, std::less<>> m2;
m2.find(std::string_view("key"));
```

### Custom hash for `unordered_map`

```cpp
struct Point { int x, y; bool operator==(const Point&) const = default; };
struct PointHash {
    size_t operator()(const Point& p) const noexcept {
        size_t h = std::hash<int>{}(p.x);
        return h ^ (std::hash<int>{}(p.y) + 0x9e3779b9 + (h << 6) + (h >> 2));  // boost::hash_combine
    }
};
std::unordered_map<Point, std::string, PointHash> labels;
```

Tune with `reserve(n)` (avoid rehashes) and `max_load_factor`. `std::unordered_map` is node-based and not the fastest hash map; open-addressing maps (Abseil `flat_hash_map`, Boost `unordered_flat_map`) are 2–5× faster.

## 5. Adaptors

```cpp
std::stack<int> st;          // push/top/pop
std::queue<int> q;           // push/front/pop
std::priority_queue<int, std::vector<int>, std::greater<>> minq;   // min-heap
```

## 6. Strings and SSO

`std::string` stores short strings (≈15 chars libstdc++, 22 libc++) inline without heap allocation (**small string optimisation**). `sizeof(std::string)` is typically 32 bytes. Pass `std::string_view` for read-only parameters.

## 7. Embedded considerations

- Standard containers allocate from the heap via `std::allocator`. Options: `std::array`, `std::pmr` containers with a `monotonic_buffer_resource` over a static buffer, or the **ETL** (Embedded Template Library) fixed-capacity containers.

```cpp
#include <memory_resource>
alignas(std::max_align_t) static std::byte pool[4096];
std::pmr::monotonic_buffer_resource arena(pool, sizeof pool, std::pmr::null_memory_resource());
std::pmr::vector<int> v(&arena);   // allocates from `pool`; throws if exhausted
```

## Interview Q&A

- **`map` vs `unordered_map`?** Ordered + O(log n) + stable iterators vs unordered + avg O(1) + hashing cost & rehash invalidation.
- **Why reserve?** Avoid repeated reallocations and iterator invalidation.
- **Difference between `size()` and `capacity()`?** Elements present vs allocated slots.
- **How does `deque` give O(1) push_front?** A map of fixed-size blocks; new blocks are added at either end.
- **What's the complexity of `std::sort`?** O(n log n) guaranteed (introsort). `std::list` has its own `sort()` (merge sort) since it lacks random access.
- **When is `list` the right choice?** When you need iterator stability and O(1) `splice` (e.g. LRU caches), not for performance in general.
