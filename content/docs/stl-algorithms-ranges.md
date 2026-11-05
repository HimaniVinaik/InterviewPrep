# Algorithms & Ranges

Raw loops hide intent. The `<algorithm>` and `<numeric>` headers name common operations, are well tested, and are often faster. C++20 ranges make them composable and remove `begin()/end()` noise.

## 1. The algorithms you'll use 90% of the time

```cpp
#include <algorithm>
#include <numeric>
std::vector<int> v{4, 1, 3, 9, 7};

std::ranges::sort(v);                                  // 1 3 4 7 9
std::ranges::sort(v, std::greater{});                  // descending
std::ranges::stable_sort(people, {}, &Person::age);    // projection: sort by member
auto it = std::ranges::find(v, 7);                     // iterator or end
bool any = std::ranges::any_of(v, [](int x) { return x > 8; });
auto n = std::ranges::count_if(v, [](int x) { return x % 2; });
auto [mn, mx] = std::ranges::minmax(v);
int sum = std::accumulate(v.begin(), v.end(), 0);      // careful: init type sets result type!
long long big = std::accumulate(v.begin(), v.end(), 0LL);
std::ranges::reverse(v);
std::ranges::fill(v, 0);
std::iota(v.begin(), v.end(), 1);                      // 1 2 3 4 5
auto lb = std::ranges::lower_bound(v, 3);              // binary search on sorted range
bool has = std::ranges::binary_search(v, 3);
std::ranges::nth_element(v, v.begin() + 2);            // partial sort: average O(n)
std::ranges::partial_sort(v, v.begin() + 3);           // smallest 3 sorted at front
auto last = std::ranges::unique(v);                    // after sort: removes adjacent dups
std::ranges::transform(v, v.begin(), [](int x) { return x * 2; });
std::ranges::copy_if(v, std::back_inserter(out), pred);
std::next_permutation(v.begin(), v.end());
```

### Erase-remove idiom (pre-C++20)

```cpp
v.erase(std::remove(v.begin(), v.end(), 0), v.end());        // remove shifts, erase trims
std::erase(v, 0);                                            // C++20 one-liner
```

## 2. Numeric

```cpp
std::reduce(std::execution::par, v.begin(), v.end());        // parallel sum (C++17)
std::transform_reduce(a.begin(), a.end(), b.begin(), 0.0);    // dot product
std::partial_sum(v.begin(), v.end(), prefix.begin());         // prefix sums
std::inclusive_scan / std::exclusive_scan;
std::gcd(12, 18); std::lcm(4, 6);
std::midpoint(a, b);                                          // overflow-safe (C++20)
std::clamp(x, lo, hi);
```

## 3. Iterator categories

| Category | Operations | Example containers |
|---|---|---|
| input / output | single pass `++`, `*` | streams |
| forward | multi-pass | `forward_list`, `unordered_*` |
| bidirectional | `--` | `list`, `map`, `set` |
| random access | `+ n`, `[]`, `<` | `deque` |
| contiguous (C++20) | memory contiguous | `vector`, `array`, `string`, `span` |

Algorithms require minimum categories — `std::sort` needs random access, so `std::list` provides its own `sort()`.

## 4. C++20 Ranges

A **range** is anything with `begin()`/`end()`. `std::ranges::` algorithms accept ranges directly and support **projections**.

```cpp
struct Employee { std::string name; int age; double salary; };
std::vector<Employee> staff = load();

std::ranges::sort(staff, {}, &Employee::salary);              // sort by salary
auto it = std::ranges::find(staff, "Ana", &Employee::name);    // find by name
auto oldest = std::ranges::max_element(staff, {}, &Employee::age);
```

### Views: lazy, composable, non-owning

```cpp
namespace v = std::views;
auto result = staff
    | v::filter([](const Employee& e) { return e.age > 30; })
    | v::transform(&Employee::name)
    | v::take(5);                         // nothing computed until iterated

for (const std::string& name : result) std::cout << name << '\n';
```

| View | Does |
|---|---|
| `views::iota(a, b)` | integers a..b-1 (lazy) |
| `views::filter(pred)` | keep matching |
| `views::transform(f)` | map |
| `views::take(n)` / `drop(n)` | prefix / skip |
| `views::take_while` / `drop_while` | conditional prefix |
| `views::reverse` | reversed |
| `views::keys` / `values` | pair/tuple elements |
| `views::split(delim)` | split ranges (strings) |
| `views::join` | flatten |
| `views::zip` (C++23) | tuples of parallel ranges |
| `views::enumerate` (C++23) | (index, value) |
| `views::chunk(n)` / `slide(n)` (C++23) | groups / windows |
| `ranges::to<Container>()` (C++23) | materialise |

```cpp
// Split a CSV line (C++20/23)
std::string_view line = "a,bb,ccc";
for (auto part : line | std::views::split(',')) {
    std::string_view field(part.begin(), part.end());
    std::cout << field << '\n';
}

// Sum of squares of the first 10 odd numbers
auto odds_sq = std::views::iota(1)
    | std::views::filter([](int x) { return x % 2; })
    | std::views::transform([](int x) { return x * x; })
    | std::views::take(10);
int total = 0;
for (int x : odds_sq) total += x;          // 1330

// C++23
auto names = staff | std::views::transform(&Employee::name) | std::ranges::to<std::vector>();
for (auto [i, e] : std::views::enumerate(staff)) {}
for (auto [a, b] : std::views::zip(xs, ys)) {}
```

> **Warning:** Views reference their underlying range. Returning a view of a local container dangles. Some views (like `filter`) cache `begin()`, so iterating a filter view while modifying the underlying data is risky.

## 5. Writing your own generic algorithm (C++20)

```cpp
template <std::ranges::input_range R, class Pred>
    requires std::predicate<Pred, std::ranges::range_reference_t<R>>
auto count_matching(R&& r, Pred p) {
    std::ranges::range_difference_t<R> n = 0;
    for (auto&& x : r) if (p(x)) ++n;
    return n;
}
```

## Interview Q&A

- **Why prefer algorithms over raw loops?** Intent is named, fewer off-by-one bugs, library implementations are optimised (vectorised `find`, `memcpy` for trivially copyable `copy`).
- **What's a projection?** A callable applied to each element before the comparison/predicate — `&Employee::age`.
- **Are views expensive to copy?** No — views are designed to be O(1) to copy/move (they don't own elements, except `owning_view`).
- **What does `std::remove` actually do?** Shifts kept elements forward and returns the new logical end. The container's size doesn't change until you `erase`.
- **`std::accumulate` vs `std::reduce`?** `accumulate` is strictly left-to-right; `reduce` may reorder (requires associativity/commutativity) and can be parallelised.
