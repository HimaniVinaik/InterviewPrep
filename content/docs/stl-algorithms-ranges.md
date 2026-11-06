# Algorithms & Ranges

> **Key idea:** A raw `for` loop tells the reader *how* you iterate. An algorithm tells them *what* you're doing: `find_if`, `partition`, `lower_bound`. The `<algorithm>` and `<numeric>` headers hold about 100 well-tested, often vectorised operations with documented complexity. C++20 **ranges** make them nicer: you pass a whole container instead of `begin()`/`end()`, add **projections** such as `&Employee::age`, and chain lazy **views** with `|`. Many interview questions are just "know which algorithm to call", and a coding answer that calls the right algorithm is shorter and has fewer bugs.

**What you'll be able to do after this guide**
- Pick the right algorithm (and know its complexity) for searching, sorting, partitioning, set operations, permutations and numeric folds.
- Use binary search correctly, including `partition_point` for "binary search on the answer".
- Avoid the classic traps: `accumulate`'s init type, `remove` not removing, `unique` needing sorted input, comparators that aren't strict weak orderings.
- Use `std::ranges` algorithms with projections, and understand their return types and `std::ranges::dangling`.
- Compose lazy views (`filter`, `transform`, `take`, `split`, `join`, `keys`, `zip`, `enumerate`), and know when views dangle or cache.
- Write your own constrained generic algorithm.

---

## 1. Why algorithms beat raw loops

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <vector>

// Raw loop: the reader has to simulate it to see that it's "is there a negative number?"
bool hasNegativeLoop(const std::vector<int>& v) {
    for (std::size_t i = 0; i < v.size(); ++i) {
        if (v[i] < 0) {
            return true;
        }
    }
    return false;
}

// Algorithm: the name *is* the documentation.
bool hasNegative(const std::vector<int>& v) {
    return std::ranges::any_of(v, [](int x) { return x < 0; });
}

int main() {
    std::vector<int> data{3, 1, -4, 1, 5};
    assert(hasNegativeLoop(data) == hasNegative(data));
    std::printf("hasNegative = %s\n", hasNegative(data) ? "true" : "false");
    return 0;
}
```

What algorithms give you:
- **Intent.** "Rotate", "partition" and "merge" are vocabulary.
- **Correctness.** There are no off-by-one indices, and the edge cases (empty ranges, one element) are handled.
- **Performance.** Library implementations use `memmove` for trivially copyable `copy`, vectorised `find`/`count`/`min_element` (MSVC, libstdc++ in places), and introsort.
- **Composability.** Algorithms work on any container, `span` or view.

Sean Parent's advice: "No raw loops." Write a loop only when no algorithm, or simple combination of algorithms, expresses the intent.

---

## 2. Non-modifying algorithms: searching and querying

| Algorithm | Returns | Complexity |
|---|---|---|
| `find`, `find_if`, `find_if_not` | iterator to the first match, or `end` | O(n) |
| `find_first_of(r, set)` | first element that is in `set` | O(n·m) |
| `adjacent_find` | first pair of equal neighbours | O(n) |
| `search(r, pattern)` | first occurrence of a subsequence (Boyer–Moore searchers available) | O(n·m) |
| `all_of`, `any_of`, `none_of` | `bool` | O(n) |
| `count`, `count_if` | number of matches | O(n) |
| `mismatch(a, b)` | the first position where they differ | O(n) |
| `equal(a, b)` | `bool` (check the sizes!) | O(n) |
| `min_element`, `max_element`, `minmax_element` | iterators | O(n) |
| `for_each` | the function object (C++20: an `in_fun_result`) | O(n) |

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <functional>
#include <string>
#include <string_view>
#include <vector>

int main() {
    std::vector<int> v{4, 8, 15, 16, 23, 42};

    auto it = std::ranges::find(v, 16);
    assert(it != v.end() && it - v.begin() == 3);

    auto firstOdd = std::ranges::find_if(v, [](int x) { return x % 2 != 0; });
    assert(*firstOdd == 15);

    assert(std::ranges::count_if(v, [](int x) { return x > 10; }) == 4);
    assert(std::ranges::all_of(v, [](int x) { return x > 0; }));
    assert(std::ranges::none_of(v, [](int x) { return x > 100; }));

    auto [mn, mx] = std::ranges::minmax_element(v);
    assert(*mn == 4 && *mx == 42);

    std::vector<int> other{4, 8, 99, 16};
    auto [inV, inOther] = std::ranges::mismatch(v, other);
    assert(*inV == 15 && *inOther == 99);

    std::vector<int> dup{1, 2, 2, 3};
    assert(*std::ranges::adjacent_find(dup) == 2);

    // Substring-style search on any sequence, plus the Boyer-Moore searcher (C++17).
    std::string text = "the quick brown fox";
    std::string_view needle = "brown";
    auto pos = std::search(text.begin(), text.end(),
                           std::boyer_moore_searcher(needle.begin(), needle.end()));
    assert(pos - text.begin() == 10);

    std::printf("min=%d max=%d first odd=%d\n", *mn, *mx, *firstOdd);
    return 0;
}
```

> **Pitfall:** The 3-iterator `std::equal(a.begin(), a.end(), b.begin())` assumes `b` is at least as long as `a`. It reads past the end of a shorter `b`, which is UB. Use the 4-iterator form, `std::ranges::equal(a, b)`, or `a == b` for containers.

---

## 3. Sorting and ordering

| Algorithm | Guarantee | Complexity | Stable? |
|---|---|---|---|
| `sort` | fully sorted | O(n log n) worst case (introsort: quicksort → heapsort fallback, insertion sort for small parts) | no |
| `stable_sort` | sorted, equal elements keep their order | O(n log n) with extra memory, O(n log² n) without | **yes** |
| `partial_sort(first, middle, last)` | the smallest k elements sorted at the front | O(n log k) | no |
| `nth_element(first, nth, last)` | `*nth` is what a full sort would put there; smaller elements before it, larger after | **O(n) average** (introselect) | no |
| `is_sorted`, `is_sorted_until` | check | O(n) | — |
| `list::sort` | for linked lists (no random access) | O(n log n) merge sort | yes |

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <functional>
#include <string>
#include <tuple>
#include <vector>

struct Person {
    std::string name;
    int age;
    double score;
};

int main() {
    std::vector<int> v{5, 2, 9, 1, 7, 3};

    std::ranges::sort(v);                                   // ascending
    assert((v == std::vector<int>{1, 2, 3, 5, 7, 9}));
    std::ranges::sort(v, std::ranges::greater{});           // descending
    assert(v.front() == 9);

    // Median in O(n) average: nth_element, not a full sort.
    std::vector<int> data{9, 1, 8, 2, 7, 3, 6};
    auto mid = data.begin() + static_cast<long>(data.size() / 2);
    std::ranges::nth_element(data, mid);
    assert(*mid == 6);                                      // sorted would be 1 2 3 6 7 8 9

    // Top 3 smallest in order: partial_sort, O(n log k).
    std::vector<int> scores{50, 10, 40, 20, 30};
    std::ranges::partial_sort(scores, scores.begin() + 3);
    assert(scores[0] == 10 && scores[1] == 20 && scores[2] == 30);

    // Sorting records: projections and multi-key comparators.
    std::vector<Person> people{{"ana", 30, 9.5}, {"bo", 25, 7.0}, {"cy", 30, 8.0}, {"di", 25, 9.9}};
    std::ranges::sort(people, {}, &Person::age);            // projection: compare by age
    assert(people.front().age == 25);

    // stable_sort keeps the existing order of equal keys -> "sort by score, then by age".
    std::ranges::sort(people, std::ranges::greater{}, &Person::score);
    std::ranges::stable_sort(people, {}, &Person::age);
    assert(people[0].name == "di" && people[1].name == "bo");   // age 25, higher score first
    assert(people[2].name == "ana" && people[3].name == "cy");  // age 30, higher score first

    // Or do it in one pass with a lexicographic key: age asc, score desc.
    std::ranges::sort(people, [](const Person& a, const Person& b) {
        return std::tuple(a.age, -a.score) < std::tuple(b.age, -b.score);
    });
    assert(people[0].name == "di");

    std::printf("median=%d, first person=%s\n", *mid, people[0].name.c_str());
    return 0;
}
```

> **Danger:** The comparator must be a **strict weak ordering**: `comp(a, a)` is false, it is transitive, and "equivalence" is transitive. `[](int a, int b) { return a <= b; }` breaks it, and `std::sort` can then read out of bounds. Also beware of comparing floats when NaN is present: every comparison with NaN is false, which breaks transitivity of equivalence.

---

## 4. Binary search on sorted ranges

All of these need the range to be sorted (strictly speaking, *partitioned*) by the **same** comparator you pass. They run in O(log n) comparisons. On non-random-access iterators such as `std::list` or `std::set` iterators, the *iterator steps* are O(n), so use the member `set::lower_bound` there.

| Algorithm | Returns |
|---|---|
| `lower_bound(r, x)` | first element **≥ x** (the insertion point that keeps order) |
| `upper_bound(r, x)` | first element **> x** |
| `equal_range(r, x)` | `{lower_bound, upper_bound}` — all elements equal to `x` |
| `binary_search(r, x)` | `bool` only |
| `partition_point(r, pred)` | first element for which `pred` is false (range partitioned by `pred`) |

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> v{1, 3, 3, 3, 5, 8};

    auto lo = std::ranges::lower_bound(v, 3);
    auto hi = std::ranges::upper_bound(v, 3);
    assert(lo - v.begin() == 1 && hi - v.begin() == 4);
    assert(hi - lo == 3);                                   // count of 3s in O(log n)

    auto [first, last] = std::ranges::equal_range(v, 3);
    assert(first == lo && last == hi);

    assert(std::ranges::binary_search(v, 5) && !std::ranges::binary_search(v, 4));

    // Insert while keeping the vector sorted.
    v.insert(std::ranges::upper_bound(v, 4), 4);
    assert(std::ranges::is_sorted(v));

    // Floor / ceiling queries.
    auto ceil = std::ranges::lower_bound(v, 6);             // smallest >= 6
    assert(*ceil == 8);
    auto floor = std::ranges::upper_bound(v, 6);            // one past the largest <= 6
    assert(*std::prev(floor) == 5);

    // "Binary search on the answer": smallest integer k with k*k >= 50.
    // partition_point over a lazy iota view: pred is true for small k, false for large k.
    auto candidates = std::views::iota(0, 100);
    auto k = std::ranges::partition_point(candidates, [](int x) { return x * x < 50; });
    assert(*k == 8);

    std::printf("count(3)=%td, first k with k*k>=50 is %d\n", hi - lo, *k);
    return 0;
}
```

`partition_point` is the general form behind every "binary search the minimum capacity / speed / time" interview problem: Koko eating bananas, ship packages within D days, split an array's largest sum. Express "is this answer feasible?" as a predicate that flips from false to true once, and search over `views::iota(lo, hi)`.

---

## 5. Modifying algorithms

| Algorithm | Effect |
|---|---|
| `copy`, `copy_if`, `copy_n`, `copy_backward` | copy into an output range (which must be big enough, or use an inserter) |
| `move`, `move_backward` | move elements |
| `transform(in, out, f)` / `transform(a, b, out, f)` | map one or two ranges |
| `fill`, `fill_n`, `generate`, `generate_n`, `iota` | write values |
| `replace`, `replace_if`, `replace_copy` | substitute values |
| `remove`, `remove_if`, `unique` | shift the kept elements forward, return the new logical end |
| `reverse`, `rotate`, `shuffle`, `sample` | reorder |
| `swap_ranges`, `iter_swap` | exchange |

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <iterator>
#include <numeric>
#include <random>
#include <ranges>
#include <string>
#include <vector>

int main() {
    std::vector<int> src{1, 2, 3, 4, 5, 6};

    // copy_if into an empty vector: use back_inserter, never an unsized destination.
    std::vector<int> evens;
    std::ranges::copy_if(src, std::back_inserter(evens), [](int x) { return x % 2 == 0; });
    assert((evens == std::vector<int>{2, 4, 6}));

    // transform with two inputs: element-wise sum.
    std::vector<int> sums(3);
    std::ranges::transform(evens, std::vector<int>{10, 20, 30}, sums.begin(), std::plus<>{});
    assert((sums == std::vector<int>{12, 24, 36}));

    // remove does NOT shrink the container...
    std::vector<int> r{1, 0, 2, 0, 3};
    auto newEnd = std::remove(r.begin(), r.end(), 0);
    assert(r.size() == 5 && newEnd - r.begin() == 3);       // size unchanged; tail is unspecified
    r.erase(newEnd, r.end());                                // ...erase does
    assert((r == std::vector<int>{1, 2, 3}));
    std::vector<int> r2{1, 0, 2, 0, 3};
    std::erase(r2, 0);                                       // C++20 one-liner
    assert(r2 == r);

    // unique only removes ADJACENT duplicates, so sort first to dedupe.
    std::vector<int> d{3, 1, 3, 2, 1};
    std::ranges::sort(d);
    auto [dupFirst, dupLast] = std::ranges::unique(d);       // ranges version returns a subrange
    d.erase(dupFirst, dupLast);
    assert((d == std::vector<int>{1, 2, 3}));

    // rotate: move [mid, end) to the front. Returns the new position of the old first element.
    std::vector<int> rot{1, 2, 3, 4, 5};
    std::rotate(rot.begin(), rot.begin() + 2, rot.end());
    assert((rot == std::vector<int>{3, 4, 5, 1, 2}));

    // Slide a block of elements to a new position with one rotate (Sean Parent's "slide").
    std::vector<char> items{'a', 'b', 'X', 'Y', 'c', 'd'};
    std::rotate(items.begin() + 1, items.begin() + 2, items.begin() + 4);   // move XY before b
    assert((items == std::vector<char>{'a', 'X', 'Y', 'b', 'c', 'd'}));

    std::vector<int> seq(5);
    std::iota(seq.begin(), seq.end(), 1);                    // 1 2 3 4 5
    std::mt19937 rng(7);
    std::ranges::shuffle(seq, rng);
    assert(std::ranges::is_permutation(seq, std::vector<int>{1, 2, 3, 4, 5}));

    std::string word = "level";
    assert(std::ranges::equal(word, word | std::views::reverse));   // palindrome check

    std::printf("rotate -> %d %d %d %d %d\n", rot[0], rot[1], rot[2], rot[3], rot[4]);
    return 0;
}
```

---

## 6. Partitioning

```cpp
#include <algorithm>
#include <cassert>
#include <vector>

int main() {
    // partition: O(n), not stable. Returns the start of the "false" group.
    std::vector<int> v{1, 2, 3, 4, 5, 6, 7, 8};
    auto isEven = [](int x) { return x % 2 == 0; };
    auto [falseFirst, falseLast] = std::ranges::partition(v, isEven);
    assert(std::ranges::all_of(v.begin(), falseFirst, isEven));
    assert(std::ranges::none_of(falseFirst, v.end(), isEven));

    // stable_partition keeps the relative order in both groups.
    std::vector<int> s{1, 2, 3, 4, 5, 6, 7, 8};
    std::ranges::stable_partition(s, isEven);
    assert((s == std::vector<int>{2, 4, 6, 8, 1, 3, 5, 7}));

    // Classic: move all zeros to the end while keeping the order of the others (LeetCode 283).
    std::vector<int> z{0, 1, 0, 3, 12};
    std::ranges::stable_partition(z, [](int x) { return x != 0; });
    assert((z == std::vector<int>{1, 3, 12, 0, 0}));

    assert(std::ranges::is_partitioned(s, isEven));
    return 0;
}
```

---

## 7. Set operations, merging and permutations

The set algorithms work on **sorted ranges** of any kind (vectors, too), in O(n + m):

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <iterator>
#include <string>
#include <vector>

int main() {
    std::vector<int> a{1, 2, 4, 5, 7};
    std::vector<int> b{2, 3, 5, 8};

    std::vector<int> uni, inter, diff, sym;
    std::ranges::set_union(a, b, std::back_inserter(uni));
    std::ranges::set_intersection(a, b, std::back_inserter(inter));
    std::ranges::set_difference(a, b, std::back_inserter(diff));             // in a, not in b
    std::ranges::set_symmetric_difference(a, b, std::back_inserter(sym));
    assert((uni == std::vector<int>{1, 2, 3, 4, 5, 7, 8}));
    assert((inter == std::vector<int>{2, 5}));
    assert((diff == std::vector<int>{1, 4, 7}));
    assert((sym == std::vector<int>{1, 3, 4, 7, 8}));
    assert(std::ranges::includes(a, std::vector<int>{2, 7}));                // subset test

    // merge two sorted ranges (keeps duplicates), and inplace_merge two sorted halves.
    std::vector<int> merged;
    std::ranges::merge(a, b, std::back_inserter(merged));
    assert(merged.size() == a.size() + b.size() && std::ranges::is_sorted(merged));

    std::vector<int> halves{1, 4, 9, 2, 3, 10};
    std::inplace_merge(halves.begin(), halves.begin() + 3, halves.end());     // the merge-sort step
    assert(std::ranges::is_sorted(halves));

    // Permutations in lexicographic order: start from the sorted sequence.
    std::string s = "abc";
    int count = 0;
    do {
        count++;
    } while (std::ranges::next_permutation(s).found);
    assert(count == 6 && s == "abc");                        // wraps back to sorted when done

    std::string p = "cab";
    std::ranges::next_permutation(p);                        // next lexicographic: "cba"
    assert(p == "cba");

    std::printf("union size=%zu, permutations of abc=%d\n", uni.size(), count);
    return 0;
}
```

---

## 8. Numeric algorithms (`<numeric>`)

| Algorithm | Computes | Notes |
|---|---|---|
| `accumulate(f, l, init, op)` | left fold | **the result type is the type of `init`** |
| `reduce(f, l, init)` | unordered fold | may reorder, so `op` must be associative and commutative; parallelisable |
| `transform_reduce(a, b, init)` | inner product, or map-then-reduce | dot products, sums of squares |
| `inner_product` | older inner product, strict order | |
| `partial_sum`, `inclusive_scan` | prefix sums `[a0, a0+a1, ...]` | |
| `exclusive_scan(f, l, out, init)` | `[init, init+a0, ...]` | |
| `adjacent_difference` | `[a0, a1-a0, a2-a1, ...]` | inverse of `partial_sum` |
| `iota` | fill with `v, v+1, ...` | |
| `gcd`, `lcm`, `midpoint` (C++20) | | `midpoint` doesn't overflow |
| `ranges::fold_left` (C++23) | ranges-style accumulate | |

```cpp
#include <cassert>
#include <climits>
#include <cstdio>
#include <functional>
#include <numeric>
#include <string>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4};

    // The init type decides the accumulator type.
    std::vector<double> d{0.5, 0.5, 0.5};
    assert(std::accumulate(d.begin(), d.end(), 0) == 0);       // int accumulator: 0 + 0 + 0 + 0
    assert(std::accumulate(d.begin(), d.end(), 0.0) == 1.5);   // correct

    std::vector<int> big{INT_MAX, INT_MAX};
    long long safe = std::accumulate(big.begin(), big.end(), 0LL);  // no int overflow
    assert(safe == 2LL * INT_MAX);

    // Any binary operation: product, string join.
    assert(std::accumulate(v.begin(), v.end(), 1, std::multiplies<>{}) == 24);
    std::vector<std::string> words{"a", "b", "c"};
    std::string joined = std::accumulate(std::next(words.begin()), words.end(), words[0],
                                         [](std::string acc, const std::string& w) {
                                             return std::move(acc) + "," + w;
                                         });
    assert(joined == "a,b,c");

    // Dot product and sum of squares.
    std::vector<int> w{10, 20, 30, 40};
    assert(std::transform_reduce(v.begin(), v.end(), w.begin(), 0) == 300);
    int sumSquares = std::transform_reduce(v.begin(), v.end(), 0, std::plus<>{},
                                           [](int x) { return x * x; });
    assert(sumSquares == 30);

    // Prefix sums -> O(1) range-sum queries.
    std::vector<int> prefix(v.size() + 1, 0);
    std::inclusive_scan(v.begin(), v.end(), prefix.begin() + 1);   // prefix = {0, 1, 3, 6, 10}
    auto rangeSum = [&](std::size_t l, std::size_t r) { return prefix[r + 1] - prefix[l]; };
    assert(rangeSum(1, 2) == 5);                                  // 2 + 3

    std::vector<int> ex(v.size());
    std::exclusive_scan(v.begin(), v.end(), ex.begin(), 0);       // {0, 1, 3, 6}
    assert(ex.back() == 6);

    std::vector<int> diffs(v.size());
    std::adjacent_difference(prefix.begin() + 1, prefix.end(), diffs.begin());
    assert(diffs == v);                                            // undoes the prefix sum

    assert(std::gcd(12, 18) == 6 && std::lcm(4, 6) == 12);
    assert(std::midpoint(INT_MAX - 2, INT_MAX) == INT_MAX - 1);     // (a + b) / 2 would overflow

    std::printf("sum of squares=%d, joined=%s\n", sumSquares, joined.c_str());
    return 0;
}
```

```cpp
// no-test (parallel algorithms: libstdc++ needs TBB, link with -ltbb)
#include <execution>
double total = std::reduce(std::execution::par_unseq, data.begin(), data.end(), 0.0);
std::sort(std::execution::par, big.begin(), big.end());
```

| Policy | Meaning |
|---|---|
| `seq` | sequential (but the order of calls is not guaranteed the way it is for a plain loop) |
| `par` | may run on several threads; your function must not race |
| `par_unseq` | may also vectorise and interleave within a thread: no locks or allocation inside |
| `unseq` (C++20) | vectorised on a single thread |

---

## 9. Iterators: categories, adaptors and helpers

| Category | Operations | Examples |
|---|---|---|
| input | single pass: `++`, `*` (read) | `istream_iterator` |
| output | single pass: `++`, `*` (write) | `ostream_iterator`, `back_inserter` |
| forward | multi-pass | `forward_list`, `unordered_*` |
| bidirectional | `--` too | `list`, `map`, `set` |
| random access | `+ n`, `[]`, `<`, `-` | `deque` |
| contiguous (C++20) | elements adjacent in memory | `vector`, `array`, `string`, `span` |

Algorithms state the minimum category they need. `sort` needs random access, `reverse` needs bidirectional, and `find` works with plain input iterators. That's why `std::list` has its own `sort()`.

```cpp
#include <algorithm>
#include <cassert>
#include <iterator>
#include <list>
#include <sstream>
#include <string>
#include <vector>

int main() {
    // Stream iterators: parse whitespace-separated numbers, then write them back out.
    std::istringstream in("3 1 4 1 5");
    std::vector<int> nums{std::istream_iterator<int>(in), std::istream_iterator<int>()};
    assert(nums.size() == 5);

    std::ostringstream out;
    std::ranges::copy(nums, std::ostream_iterator<int>(out, ","));
    assert(out.str() == "3,1,4,1,5,");

    // Inserters grow the destination instead of overwriting.
    std::list<int> front;
    std::ranges::copy(nums, std::front_inserter(front));       // reversed: 5 1 4 1 3
    assert(front.front() == 5);

    // Reverse iterators and their .base() off-by-one.
    std::vector<int> v{1, 2, 3, 2, 5};
    auto lastTwo = std::find(v.rbegin(), v.rend(), 2);           // search from the back
    assert(lastTwo.base() - v.begin() == 4);                     // base() points one past it
    assert(std::prev(lastTwo.base()) - v.begin() == 3);          // the element itself

    // distance / advance / next / prev work for every category (O(n) for non-random-access).
    std::list<int> l{10, 20, 30, 40};
    auto it = std::next(l.begin(), 2);
    assert(*it == 30 && std::distance(l.begin(), it) == 2);
    std::advance(it, -1);
    assert(*it == 20);
    return 0;
}
```

---

## 10. C++20 ranges algorithms

`std::ranges::` versions of the algorithms:
- take a **range** directly (`std::ranges::sort(v)`);
- accept a **projection**, applied to each element before the comparison or predicate (a member pointer or any callable);
- are constrained with concepts, so wrong arguments give readable errors;
- return **more information**. For example, `ranges::copy` returns `{in, out}` and `ranges::unique` returns a `subrange`;
- refuse to return dangling iterators into temporaries.

```cpp
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <string>
#include <vector>

struct Employee {
    std::string name;
    int age;
    double salary;
};

std::vector<int> makeNumbers() {
    return {3, 1, 2};
}

int main() {
    std::vector<Employee> staff{{"ana", 41, 95e3}, {"bo", 29, 70e3}, {"cy", 35, 82e3}};

    std::ranges::sort(staff, {}, &Employee::salary);                 // {} = default comparator (less)
    assert(staff.front().name == "bo");

    auto it = std::ranges::find(staff, "cy", &Employee::name);       // find by member
    assert(it != staff.end() && it->age == 35);

    auto oldest = std::ranges::max_element(staff, {}, &Employee::age);
    assert(oldest->name == "ana");

    auto total = 0.0;
    std::ranges::for_each(staff, [&](double s) { total += s; }, &Employee::salary);
    assert(total == 247e3);

    // Richer return values: where input stopped and where output ended.
    std::vector<int> src{1, 2, 3};
    std::vector<int> dst(5, 0);
    auto [inEnd, outEnd] = std::ranges::copy(src, dst.begin());
    assert(inEnd == src.end() && outEnd - dst.begin() == 3);

    // Dangling protection: an iterator into a temporary would dangle, so you get ranges::dangling.
    auto result = std::ranges::max_element(makeNumbers());
    static_assert(std::is_same_v<decltype(result), std::ranges::dangling>);
    // *result;   // compile error: can't dereference ranges::dangling

    std::printf("lowest paid: %s, oldest: %s\n", staff.front().name.c_str(), oldest->name.c_str());
    return 0;
}
```

---

## 11. Views: lazy, composable, non-owning

A **view** is a range that is cheap to copy (O(1)) and usually doesn't own its elements. Views are **lazy**: an adaptor like `filter` stores the predicate and computes nothing until you iterate. The `|` operator chains adaptors into pipelines.

```cpp
#include <cassert>
#include <cstdio>
#include <map>
#include <ranges>
#include <string>
#include <string_view>
#include <vector>

int main() {
    // Laziness: count how many times transform actually runs.
    int calls = 0;
    std::vector<int> v{1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto pipeline = v
        | std::views::filter([](int x) { return x % 2 == 0; })
        | std::views::transform([&](int x) { calls++; return x * x; })
        | std::views::take(2);
    assert(calls == 0);                                  // building the pipeline computes nothing
    int sum = 0;
    for (int x : pipeline) {
        sum += x;                                        // 4 + 16
    }
    assert(sum == 20 && calls == 2);                     // only as much work as needed

    // Infinite ranges are fine, because evaluation is lazy.
    int oddSquares = 0;
    for (int x : std::views::iota(1)
                     | std::views::filter([](int n) { return n % 2 == 1; })
                     | std::views::transform([](int n) { return n * n; })
                     | std::views::take(10)) {
        oddSquares += x;
    }
    assert(oddSquares == 1330);

    // keys / values over maps (or any range of pairs/tuples).
    std::map<std::string, int> stock{{"apple", 3}, {"pear", 0}, {"plum", 7}};
    int units = 0;
    for (int n : stock | std::views::values) {
        units += n;
    }
    assert(units == 10);
    for (const std::string& name : stock | std::views::keys | std::views::take(1)) {
        assert(name == "apple");
    }

    // split a string and join it back together.
    std::string_view csv = "a,bb,ccc";
    std::vector<std::string> fields;
    for (auto part : csv | std::views::split(',')) {
        fields.emplace_back(part.begin(), part.end());
    }
    assert((fields == std::vector<std::string>{"a", "bb", "ccc"}));

    std::vector<std::vector<int>> nested{{1, 2}, {3}, {}, {4, 5}};
    int flat = 0;
    for (int x : nested | std::views::join) {
        flat = flat * 10 + x;                            // 12345
    }
    assert(flat == 12345);

    // drop / take_while / drop_while / reverse / elements<N>
    std::vector<int> temps{-3, -1, 2, 5, -2, 8};
    int firstPositives = 0;
    for (int t : temps | std::views::drop_while([](int x) { return x < 0; })
                       | std::views::take_while([](int x) { return x > 0; })) {
        firstPositives++;                                 // 2, 5
        (void)t;
    }
    assert(firstPositives == 2);

    std::printf("sum=%d calls=%d oddSquares=%d fields=%zu\n", sum, calls, oddSquares, fields.size());
    return 0;
}
```

| View | Does |
|---|---|
| `views::iota(a)` / `iota(a, b)` | integers from `a` (infinite) or `a..b-1` |
| `views::filter(pred)` | keep matching elements |
| `views::transform(f)` | map each element |
| `views::take(n)` / `drop(n)` | prefix / skip |
| `views::take_while(p)` / `drop_while(p)` | conditional prefix / skip |
| `views::reverse` | reversed (bidirectional ranges) |
| `views::keys` / `values` / `elements<N>` | members of pairs/tuples |
| `views::split(d)` / `lazy_split(d)` | split by a delimiter |
| `views::join` | flatten a range of ranges |
| `views::common` | make begin/end the same type (for legacy algorithms) |
| `views::all`, `views::counted(it, n)` | wrap a range / an iterator + count |
| `views::zip`, `zip_transform` (C++23) | walk ranges in parallel |
| `views::enumerate` (C++23) | (index, element) |
| `views::chunk(n)`, `slide(n)`, `stride(n)`, `chunk_by(p)` (C++23) | groups / windows / every n-th / runs |
| `views::adjacent<N>`, `pairwise` (C++23) | neighbouring tuples |
| `views::cartesian_product`, `join_with`, `repeat`, `as_rvalue` (C++23) | |
| `ranges::to<C>()` (C++23) | materialise a view into a container |

```cpp
// c++23 — needs GCC 13+ / Clang 17+ with -std=c++23
#include <cassert>
#include <cstdio>
#include <ranges>
#include <string>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6, 7};

    int strided = 0;
    for (int x : v | std::views::stride(3)) {             // 1, 4, 7
        strided += x;
    }
    assert(strided == 12);

    int increases = 0;
    for (auto [a, b] : v | std::views::pairwise) {        // (1,2) (2,3) ...
        if (b > a) {
            increases++;
        }
    }
    assert(increases == 6);

    std::vector<int> runs{1, 1, 2, 2, 2, 3};
    int groups = 0;
    for (auto group : runs | std::views::chunk_by(std::ranges::equal_to{})) {
        groups++;                                         // {1,1} {2,2,2} {3}
        (void)group;
    }
    assert(groups == 3);

    std::vector<std::string> names{"ana", "bo"};
    std::vector<int> ages{31, 25};
    for (auto [i, pair] : std::views::enumerate(std::views::zip(names, ages))) {
        auto& [name, age] = pair;
        std::printf("%td: %s is %d\n", i, name.c_str(), age);
    }
    return 0;
}
```

### View pitfalls

```cpp
// no-test (each of these is a bug)
auto evens() {
    std::vector<int> local{1, 2, 3, 4};
    return local | std::views::filter(isEven);       // DANGLING: the view refers to `local`
}

auto f = v | std::views::filter(pred);
for (int& x : f) { x += 1; }                         // UB if the change makes pred(x) false
                                                     // (filter caches begin(); its invariant breaks)

const auto cf = v | std::views::filter(pred);
for (int x : cf) {}                                  // ERROR: filter_view isn't const-iterable
                                                     // (begin() is cached, so it needs a non-const object)
```

- Views **don't own** their data (except `owning_view` and views of rvalue containers moved in, as in `std::move(vec) | views::filter(...)`). Never return a view of a local.
- `filter`, `drop_while` and some others **cache** `begin()` on first use, so they aren't const-iterable. Take views by `auto&&` or by value in generic code, not by `const&`.
- Each element access in a `transform` view calls the function again. If it's expensive and you iterate twice, materialise the result into a container.
- Views need C++20 compilers; GCC 10/11 are partial. For production code on old toolchains, range-v3 provides the same model.

---

## 12. Writing your own generic algorithm (C++20)

```cpp
#include <algorithm>
#include <cassert>
#include <concepts>
#include <functional>
#include <list>
#include <ranges>
#include <string>
#include <vector>

// Count elements matching a predicate, with an optional projection, for any input range.
template <std::ranges::input_range R, class Proj = std::identity,
          std::indirect_unary_predicate<std::projected<std::ranges::iterator_t<R>, Proj>> Pred>
std::ranges::range_difference_t<R> countMatching(R&& r, Pred pred, Proj proj = {}) {
    std::ranges::range_difference_t<R> n = 0;
    for (auto&& x : r) {
        if (std::invoke(pred, std::invoke(proj, x))) {
            ++n;
        }
    }
    return n;
}

// Return the k largest elements (sorted descending) without fully sorting the input.
template <std::ranges::forward_range R>
    requires std::totally_ordered<std::ranges::range_value_t<R>>
std::vector<std::ranges::range_value_t<R>> topK(R&& r, std::size_t k) {
    std::vector<std::ranges::range_value_t<R>> all(std::ranges::begin(r), std::ranges::end(r));
    k = std::min(k, all.size());
    std::ranges::partial_sort(all, all.begin() + static_cast<long>(k), std::ranges::greater{});
    all.resize(k);
    return all;
}

struct Item {
    std::string name;
    int qty;
};

int main() {
    std::vector<Item> items{{"a", 0}, {"b", 5}, {"c", 2}};
    assert(countMatching(items, [](int q) { return q > 0; }, &Item::qty) == 2);

    std::list<int> l{5, 1, 9, 3};
    assert(countMatching(l, [](int x) { return x > 2; }) == 3);         // works on lists too
    assert(countMatching(std::views::iota(0, 10), [](int x) { return x % 3 == 0; }) == 4);

    assert((topK(l, 2) == std::vector<int>{9, 5}));
    return 0;
}
```

---

## 13. Interview checklist

- [ ] Replace raw loops with `find_if`, `any_of`, `count_if`, `transform`, `accumulate`, `partition`, `remove_if`.
- [ ] Sorting family: `sort` (introsort, not stable), `stable_sort`, `partial_sort` O(n log k), `nth_element` O(n) average.
- [ ] Strict weak ordering rules and multi-key comparators (`std::tie`/`tuple`).
- [ ] Binary search family: `lower_bound` (≥), `upper_bound` (>), `equal_range`, `partition_point` for "binary search on the answer".
- [ ] `remove`/`unique` only shift elements; erase-remove vs C++20 `std::erase`/`erase_if`.
- [ ] Set operations and `merge` on sorted ranges; `next_permutation`.
- [ ] `accumulate` init-type trap; `reduce` vs `accumulate`; prefix sums with `inclusive_scan`.
- [ ] Iterator categories and inserters; `reverse_iterator::base()`.
- [ ] Ranges: projections, richer return values, `ranges::dangling`.
- [ ] Views: lazy evaluation, the common adaptors, dangling views, caching/const-iterability.

---

## Practice

1. Given `std::vector<int> v`, remove duplicates while keeping the result sorted, in two lines.
2. Find the k-th largest element in O(n) average time (LeetCode 215).
3. Using `partition_point`, find the minimum eating speed so that Koko can finish piles `{3, 6, 7, 11}` within `h = 8` hours (LeetCode 875).
4. Using views only (no raw loops), compute the sum of the squares of all numbers in `[1, 100]` that are divisible by 3 or 5.
5. Why does this code print garbage or crash? `std::vector<int> v{3,1,2}; std::vector<int> out; std::copy(v.begin(), v.end(), out.begin());` Fix it two ways.

:::details Show solution
1.
```cpp
#include <algorithm>
#include <cassert>
#include <vector>

int main() {
    std::vector<int> v{4, 1, 4, 2, 1, 3};
    std::ranges::sort(v);
    v.erase(std::unique(v.begin(), v.end()), v.end());   // unique needs adjacent duplicates
    assert((v == std::vector<int>{1, 2, 3, 4}));
    return 0;
}
```
2.
```cpp
#include <algorithm>
#include <cassert>
#include <functional>
#include <vector>

int kthLargest(std::vector<int> nums, int k) {          // by value: we reorder our own copy
    auto nth = nums.begin() + (k - 1);
    std::nth_element(nums.begin(), nth, nums.end(), std::greater<>{});   // introselect, O(n) average
    return *nth;
}

int main() {
    assert(kthLargest({3, 2, 1, 5, 6, 4}, 2) == 5);
    assert(kthLargest({3, 2, 3, 1, 2, 4, 5, 5, 6}, 4) == 4);
    return 0;
}
```
3.
```cpp
#include <algorithm>
#include <cassert>
#include <ranges>
#include <vector>

int minEatingSpeed(const std::vector<int>& piles, long long h) {
    auto hoursNeeded = [&](int speed) {
        long long hours = 0;
        for (int p : piles) {
            hours += (p + speed - 1) / speed;              // ceil(p / speed)
        }
        return hours;
    };
    int maxPile = *std::ranges::max_element(piles);
    auto speeds = std::views::iota(1, maxPile + 1);        // the answer is in [1, maxPile]
    // Predicate: "too slow". It's true for small speeds and false from the answer onward.
    auto it = std::ranges::partition_point(speeds, [&](int s) { return hoursNeeded(s) > h; });
    return *it;
}

int main() {
    assert(minEatingSpeed({3, 6, 7, 11}, 8) == 4);
    assert(minEatingSpeed({30, 11, 23, 4, 20}, 5) == 30);
    assert(minEatingSpeed({30, 11, 23, 4, 20}, 6) == 23);
    return 0;
}
```
4.
```cpp
#include <cassert>
#include <ranges>

int main() {
    auto squares = std::views::iota(1, 101)
        | std::views::filter([](int x) { return x % 3 == 0 || x % 5 == 0; })
        | std::views::transform([](int x) { return x * x; });
    int total = 0;
    for (int s : squares) {          // C++23: std::ranges::fold_left(squares, 0, std::plus{})
        total += s;
    }
    assert(total == 164'036);
    return 0;
}
```
5. `std::copy` writes through `out.begin()`, but `out` is empty. There is no storage, so the program writes out of bounds, which is UB. Fix 1: `std::copy(v.begin(), v.end(), std::back_inserter(out));`. Fix 2: size the destination first with `out.resize(v.size());`, or simply write `std::vector<int> out(v.begin(), v.end());` (or `out = v;`).
:::

---

## Interview Q&A

- **Why prefer algorithms over raw loops?** Intent is named, fewer off-by-one bugs, library implementations are optimised (vectorised `find`, `memcpy` for trivially copyable `copy`).
- **What's a projection?** A callable applied to each element before the comparison/predicate — `&Employee::age`.
- **Are views expensive to copy?** No — views are designed to be O(1) to copy/move (they don't own elements, except `owning_view`).
- **What does `std::remove` actually do?** Shifts kept elements forward and returns the new logical end. The container's size doesn't change until you `erase`.
- **`std::accumulate` vs `std::reduce`?** `accumulate` is strictly left-to-right; `reduce` may reorder (requires associativity/commutativity) and can be parallelised.
- **What algorithm does `std::sort` use?** Introsort: quicksort with median-of-three pivots, switching to heapsort if recursion gets too deep (guaranteeing O(n log n)) and insertion sort for small partitions. It isn't stable.
- **How do you find the median of an unsorted vector efficiently?** `std::nth_element` to the middle position — O(n) on average — instead of a full O(n log n) sort.
- **What's the difference between `lower_bound` and `upper_bound`?** `lower_bound` returns the first element not less than the value (≥); `upper_bound` returns the first element greater than it (>). Their difference is the count of equal elements.
- **What's wrong with `std::accumulate(v.begin(), v.end(), 0)` for a `vector<double>`?** The accumulator type is `int` (from `0`), so every partial sum is truncated; use `0.0`.
- **Why can't you call `std::sort` on a `std::list`?** `std::sort` needs random-access iterators; `list` only has bidirectional ones, so it provides a member `sort()` (merge sort).
- **What is `std::ranges::dangling`?** The type a ranges algorithm returns instead of an iterator when you pass an rvalue (temporary) range, so you can't accidentally use an iterator into a destroyed container.
- **Why isn't a `filter_view` const-iterable?** It caches the result of the first `begin()` call to keep amortised O(1) `begin()`, which mutates the view, so iteration needs a non-const view.

---

## External resources

- **cppreference — Algorithms library, Numerics library, Ranges library** (each with complexity and examples).
- **Jonathan Boccara — "105 STL Algorithms in Less Than an Hour"** (CppCon 2018) and the "World Map of C++ STL Algorithms".
- **Sean Parent — "C++ Seasoning"** (GoingNative 2013): "no raw loops", `rotate` and `stable_partition` tricks.
- **Eric Niebler — range-v3** documentation and blog (the basis for C++20 ranges).
- **Tristan Brindle — "An Overview of Standard Ranges"** (CppCon 2019).
