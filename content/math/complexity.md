# Big-O & Complexity Analysis

Every coding interview ends with "What's the time and space complexity?" Answer precisely, and know *why*.

## 1. Asymptotic notation

| Notation | Meaning | Analogy |
|---|---|---|
| **O(g)** | upper bound: f grows **no faster** than g | ≤ |
| **Ω(g)** | lower bound: f grows **at least** as fast as g | ≥ |
| **Θ(g)** | tight bound: both | = |
| o(g) | strictly slower | < |

Formally, f(n) = O(g(n)) if there exist c > 0 and n₀ such that f(n) ≤ c·g(n) for all n ≥ n₀. In interviews, "O" is used loosely to mean the tight bound.

**Rules:** drop constants (O(3n) = O(n)); keep the dominant term (O(n² + n log n) = O(n²)); different inputs get different variables (O(m + n), not O(n)).

## 2. Common complexity classes

| Complexity | Name | n = 10⁶ feasible? | Example |
|---|---|---|---|
| O(1) | constant | ✅ | hash lookup, array index |
| O(log n) | logarithmic | ✅ | binary search, balanced BST |
| O(√n) | | ✅ | trial-division primality |
| O(n) | linear | ✅ | single scan |
| O(n log n) | linearithmic | ✅ | sorting, heap of n items |
| O(n²) | quadratic | ❌ (10¹² ops) | all pairs |
| O(n³) | cubic | ❌ | Floyd–Warshall, naive matmul |
| O(2ⁿ) | exponential | n ≤ ~25 | subsets |
| O(n!) | factorial | n ≤ ~11 | permutations |

**Rule of thumb:** ~10⁸ simple operations per second in C++. Use input constraints to *infer* the intended complexity:

| n up to | Target |
|---|---|
| 10–12 | O(n!) |
| 20–25 | O(2ⁿ) |
| 100–500 | O(n³) |
| 10³–10⁴ | O(n²) |
| 10⁵–10⁶ | O(n log n) / O(n) |
| 10⁹+ | O(log n) / O(1) |

## 3. Analysing loops

```cpp
for (int i = 0; i < n; ++i)          // O(n)
    for (int j = 0; j < n; ++j) {}   // O(n²) total

for (int i = 0; i < n; ++i)
    for (int j = i; j < n; ++j) {}   // n + (n-1) + ... + 1 = n(n+1)/2 = O(n²)

for (int i = 1; i < n; i *= 2) {}    // O(log n)

for (int i = 0; i < n; ++i)
    for (int j = 1; j < n; j *= 2) {}  // O(n log n)

for (int i = 1; i <= n; ++i)
    for (int j = i; j <= n; j += i) {} // n/1 + n/2 + ... + n/n = n·H(n) = O(n log n)  (harmonic series)
```

## 4. Recursion: the recurrence → closed form

| Recurrence | Solution | Example |
|---|---|---|
| T(n) = T(n/2) + O(1) | O(log n) | binary search |
| T(n) = T(n−1) + O(1) | O(n) | linear recursion |
| T(n) = T(n−1) + O(n) | O(n²) | selection sort recursion |
| T(n) = 2T(n/2) + O(1) | O(n) | tree traversal |
| T(n) = 2T(n/2) + O(n) | O(n log n) | merge sort |
| T(n) = 2T(n−1) + O(1) | O(2ⁿ) | naive Fibonacci (≈ φⁿ, φ ≈ 1.618) |

### Master theorem

For T(n) = a·T(n/b) + f(n), compare f(n) with n^(log_b a):

1. If f(n) = O(n^(log_b a − ε)) → T(n) = Θ(n^(log_b a)) — leaves dominate.
2. If f(n) = Θ(n^(log_b a)) → T(n) = Θ(n^(log_b a) · log n) — balanced.
3. If f(n) = Ω(n^(log_b a + ε)) (+ regularity) → T(n) = Θ(f(n)) — root dominates.

Examples: merge sort a=2, b=2, f=n → case 2 → n log n. Karatsuba a=3, b=2, f=n → n^(log₂3) ≈ n^1.585. Strassen a=7, b=2, f=n² → n^2.807.

### Recursion tree intuition

Work per level × number of levels. Merge sort: each level does O(n) merging, there are log n levels → O(n log n).

### Recursion space

Space = maximum call-stack depth × frame size. DFS on a skewed tree is O(n) stack; balanced O(log n).

## 5. Amortised analysis

Some operations are occasionally expensive but cheap on average over a sequence.

**Dynamic array `push_back`:** doubling capacity copies 1 + 2 + 4 + … + n < 2n elements over n pushes → **amortised O(1)** per push. (Growth by a constant *addition* would be O(n) amortised — always grow geometrically.)

Other examples: union-find with path compression (α(n) — inverse Ackermann, effectively constant), monotonic stack (each element pushed/popped once), sliding window (each element enters/leaves once).

Methods: aggregate (total/n), accounting (prepay "credits"), potential function.

## 6. Space complexity

Count **auxiliary** space (beyond the input) unless asked otherwise: hash maps, recursion depth, output (sometimes excluded). In embedded interviews, constant factors matter: "O(1) space" with a 64 KB lookup table may not fit.

## 7. Beyond Big-O: what actually affects speed

- **Cache behaviour:** contiguous arrays beat linked structures by large constant factors.
- **Branch prediction:** sorted data can make a branchy loop many times faster.
- **Allocation:** heap allocations cost ~50–100 ns each.
- **I/O dominates:** disk/network latency dwarfs CPU work.
- Average vs worst case: quicksort O(n log n) average, O(n²) worst; hash table O(1) average, O(n) worst.

## 8. Complexities of common data structures

| Structure | Access | Search | Insert | Delete |
|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) |
| Dynamic array (end) | O(1) | O(n) | O(1)* | O(1) |
| Linked list | O(n) | O(n) | O(1)† | O(1)† |
| Hash table | — | O(1)* | O(1)* | O(1)* |
| Balanced BST | O(log n) | O(log n) | O(log n) | O(log n) |
| Binary heap | top O(1) | O(n) | O(log n) | pop O(log n) |
| Trie | — | O(L) | O(L) | O(L) |

\* amortised/average · † given a pointer to the position

## 9. Sorting algorithms

| Algorithm | Best | Average | Worst | Space | Stable |
|---|---|---|---|---|---|
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | ✅ |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | ✅ |
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) | ❌ |
| Heapsort | O(n log n) | O(n log n) | O(n log n) | O(1) | ❌ |
| Counting sort | O(n + k) | O(n + k) | O(n + k) | O(k) | ✅ |
| Radix sort | O(d(n + b)) | | | O(n + b) | ✅ |

Comparison sorts can't beat Ω(n log n): there are n! orderings, and each comparison yields one bit, so you need log₂(n!) ≈ n log n comparisons.

## Practice

What's the complexity?

```cpp
int f(int n) { if (n <= 1) return 1; return f(n / 2) + f(n / 2); }   // T(n)=2T(n/2)+1 -> O(n)
int g(int n) { int s = 0; for (int i = n; i > 0; i /= 2) for (int j = 0; j < i; ++j) ++s; return s; }
// n + n/2 + n/4 + ... = 2n -> O(n), not O(n log n)!
```
