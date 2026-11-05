# Data Structures Deep Dive

Understanding *how* each structure works lets you choose correctly, analyse complexity, and implement one from scratch when asked (a common C++/embedded request).

## 1. Arrays & dynamic arrays

Contiguous memory → O(1) indexing, excellent cache locality. Dynamic arrays (`std::vector`) grow geometrically for amortised O(1) appends.

```cpp
template <class T>
class DynArray {
    T* data_ = nullptr;
    std::size_t size_ = 0, cap_ = 0;
    void grow() {
        std::size_t ncap = cap_ ? cap_ * 2 : 4;
        T* nd = static_cast<T*>(::operator new(ncap * sizeof(T)));      // raw storage
        for (std::size_t i = 0; i < size_; ++i) {
            std::construct_at(nd + i, std::move_if_noexcept(data_[i]));  // move if safe
            std::destroy_at(data_ + i);
        }
        ::operator delete(data_);
        data_ = nd; cap_ = ncap;
    }
public:
    ~DynArray() { std::destroy_n(data_, size_); ::operator delete(data_); }
    void push_back(T v) { if (size_ == cap_) grow(); std::construct_at(data_ + size_++, std::move(v)); }
    T& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
};
```

(Copy/move operations omitted for brevity — in an interview, mention the Rule of Five.)

## 2. Linked lists

Nodes with pointers. O(1) insert/delete at a known position, O(n) access, poor cache locality. Variants: singly, doubly, circular, intrusive lists (the node pointers live inside the object — Linux kernel `list_head`, embedded RTOS ready lists; no extra allocation).

```c
/* Intrusive doubly linked list (C) */
typedef struct list_node { struct list_node *prev, *next; } list_node;
#define container_of(ptr, type, member) ((type *)((char *)(ptr) - offsetof(type, member)))

typedef struct { int id; list_node link; } task_t;      /* the list node is embedded */
```

## 3. Stacks & queues

- Stack (LIFO): array-backed; push/pop O(1). Call stacks, undo, DFS, parsing.
- Queue (FIFO): ring buffer or linked list. BFS, task queues, UART buffers.
- Deque: both ends O(1).
- Circular buffer: fixed array + head/tail indices — the embedded workhorse (see *Problems → C & Embedded → Ring Buffer*).

## 4. Hash tables

Map keys to buckets via a hash function. Average O(1), worst O(n).

| Collision strategy | How | Pros/cons |
|---|---|---|
| Separate chaining | each bucket is a list (`std::unordered_map`) | simple; pointer chasing |
| Open addressing (linear/quadratic probing, Robin Hood) | probe for the next free slot in one array | cache-friendly, faster; deletion needs tombstones; must keep load factor < ~0.7–0.9 |

```cpp
// Minimal open-addressing set of non-negative ints (linear probing, power-of-two capacity)
class IntSet {
    std::vector<int> slots_;              // -1 = empty
    std::size_t mask_, count_ = 0;
    static std::size_t hash(int k) { return std::size_t(k) * 0x9E3779B97F4A7C15ull; }
public:
    explicit IntSet(std::size_t cap_pow2 = 16) : slots_(cap_pow2, -1), mask_(cap_pow2 - 1) {}
    bool insert(int k) {
        if ((count_ + 1) * 10 > slots_.size() * 7) rehash();     // keep load <= 0.7
        for (std::size_t i = hash(k) & mask_;; i = (i + 1) & mask_) {
            if (slots_[i] == k) return false;
            if (slots_[i] == -1) { slots_[i] = k; ++count_; return true; }
        }
    }
    bool contains(int k) const {
        for (std::size_t i = hash(k) & mask_;; i = (i + 1) & mask_) {
            if (slots_[i] == -1) return false;
            if (slots_[i] == k) return true;
        }
    }
private:
    void rehash() {
        IntSet bigger(slots_.size() * 2);
        for (int k : slots_) if (k != -1) bigger.insert(k);
        *this = std::move(bigger);
    }
};
```

Good hash functions spread bits (multiply-shift, MurmurHash finaliser, xxHash). Adversarial inputs can force O(n) — use randomised seeds for untrusted keys.

## 5. Trees

- **Binary tree:** each node ≤ 2 children. Height h: operations O(h).
- **BST:** left < node < right. Balanced → h = O(log n); degenerate (sorted inserts) → O(n).
- **Self-balancing BSTs:** AVL (strict balance, faster lookups), **red-black** (looser, cheaper inserts — `std::map`), treaps, splay trees.
- **B-trees / B+ trees:** wide nodes (hundreds of keys) sized to disk pages → databases and file systems.

Traversals: pre-order (copy/serialize), in-order (sorted output for BST), post-order (delete/aggregate), level-order (BFS).

## 6. Heaps

Complete binary tree in an array: children of `i` at `2i+1`, `2i+2`; parent at `(i−1)/2`. Heap property: parent ≤ children (min-heap).

```cpp
class MinHeap {
    std::vector<int> a_;
    void sift_up(std::size_t i) {
        while (i > 0) { auto p = (i - 1) / 2; if (a_[p] <= a_[i]) break; std::swap(a_[p], a_[i]); i = p; }
    }
    void sift_down(std::size_t i) {
        for (;;) {
            std::size_t l = 2 * i + 1, r = l + 1, m = i;
            if (l < a_.size() && a_[l] < a_[m]) m = l;
            if (r < a_.size() && a_[r] < a_[m]) m = r;
            if (m == i) return;
            std::swap(a_[i], a_[m]); i = m;
        }
    }
public:
    void push(int x) { a_.push_back(x); sift_up(a_.size() - 1); }
    int top() const { return a_.front(); }
    void pop() { a_.front() = a_.back(); a_.pop_back(); if (!a_.empty()) sift_down(0); }
    bool empty() const { return a_.empty(); }
};
```

push/pop O(log n), top O(1), build-heap from an array O(n) (sift down from the last parent). Used for priority queues, schedulers (RTOS timers), Dijkstra, top-k, heapsort.

## 7. Tries

Prefix tree; each edge is a character. O(L) insert/search independent of the number of words. Compressed tries (radix trees) merge single-child chains — used in IP routing tables and the Linux kernel. See *Problems → Tries*.

## 8. Graphs

Representations:

| | Adjacency list | Adjacency matrix | Edge list |
|---|---|---|---|
| Space | O(V + E) | O(V²) | O(E) |
| Edge check | O(deg) | O(1) | O(E) |
| Iterate neighbours | O(deg) | O(V) | — |
| Best for | sparse graphs (most) | dense graphs, Floyd–Warshall | Kruskal |

## 9. Union-Find (Disjoint Set Union)

Tracks partitions of elements; `find` (which set?) and `unite` (merge) in near-O(1) amortised with path compression + union by rank/size. Used for connectivity, Kruskal's MST, cycle detection, image segmentation. Template in *Problems → Graphs*.

## 10. Specialised structures worth knowing

| Structure | What it gives you |
|---|---|
| **Segment tree** | range queries (sum/min/max) + point/range updates in O(log n) |
| **Fenwick tree (BIT)** | prefix sums with updates in O(log n), tiny code |
| **Sparse table** | O(1) range-min queries on static arrays |
| **Skip list** | probabilistic balanced "linked list" with O(log n) search (Redis sorted sets) |
| **Bloom filter** | set membership with false positives, no false negatives, tiny memory |
| **LRU structure** | hash map + doubly linked list |
| **Bitset** | dense boolean sets, 64 ops per instruction |
| **Monotonic deque** | sliding window min/max |
| **Rope** | efficient string edits (text editors) |
| **Circular buffer** | fixed-memory FIFO (audio, UART, logging) |

```cpp
// Fenwick tree (1-indexed)
struct Fenwick {
    std::vector<long long> t;
    explicit Fenwick(int n) : t(n + 1) {}
    void add(int i, long long v) { for (; i < (int)t.size(); i += i & -i) t[i] += v; }
    long long sum(int i) const { long long s = 0; for (; i > 0; i -= i & -i) s += t[i]; return s; }
    long long range(int l, int r) const { return sum(r) - sum(l - 1); }
};
```

## Choosing quickly

- Need order? → sorted vector, `map`/`set`, heap (partial order).
- Need fast lookup by key? → hash map.
- Need FIFO/LIFO? → queue/stack (ring buffer in embedded).
- Need min/max repeatedly? → heap.
- Need prefix queries on strings? → trie.
- Need connectivity? → union-find or BFS.
- Need range queries with updates? → Fenwick/segment tree.
- Memory-constrained/real-time? → fixed-size arrays, ring buffers, pools, intrusive lists.
