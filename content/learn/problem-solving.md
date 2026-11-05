# Problem-Solving Framework

Most candidates fail coding interviews not because they lack knowledge, but because they lack a **process**. Use the same framework every time until it's automatic.

## The 7 steps (≈45 minutes)

| # | Step | Time | What to say/do |
|---|---|---|---|
| 1 | **Understand** | 3–5 min | Restate the problem. Ask about input size, ranges, duplicates, negatives, empty input, sortedness, output format. |
| 2 | **Examples** | 2–3 min | Work a normal example by hand, then edge cases (empty, one element, all equal, max size). |
| 3 | **Brute force** | 2 min | State the naive solution and its complexity. It proves you understand the problem. |
| 4 | **Optimise** | 5–10 min | Identify the bottleneck; match to a pattern (below). Talk through trade-offs. |
| 5 | **Plan** | 2 min | Outline the algorithm in bullet points / pseudocode. Get the interviewer's buy-in. |
| 6 | **Code** | 15 min | Clean, modular code with good names. Narrate as you go. |
| 7 | **Test** | 5 min | Trace your example line by line; check edge cases; state time/space complexity. |

> **Tip:** Silence is your enemy. Interviewers grade *thinking*, and they can only grade what you say out loud. If stuck, say what you're considering and why it doesn't work yet.

## Pattern recognition cheat sheet

| If the problem says… | Think… |
|---|---|
| "sorted array", "find target", "minimum X such that…" | **Binary search** (on index or on answer) |
| "pair/triplet with sum", "palindrome", "in place" | **Two pointers** |
| "longest/shortest substring/subarray with…" | **Sliding window** |
| "subarray sum equals k" (with negatives) | **Prefix sums + hash map** |
| "have we seen this", "count frequencies", "group by" | **Hash map / set** |
| "next greater/smaller", "matching brackets" | **Stack / monotonic stack** |
| "top k", "k-th largest", "merge k sorted", "median of stream" | **Heap** |
| "all combinations/permutations/subsets", "place N items under constraints" | **Backtracking** |
| "number of ways", "min/max cost", overlapping subproblems | **Dynamic programming** |
| "connected", "islands", "grid", "network" | **BFS/DFS / union-find** |
| "shortest path" unweighted / weighted | **BFS / Dijkstra** |
| "prerequisites", "ordering", "dependencies" | **Topological sort** |
| "prefix", "dictionary of words", "autocomplete" | **Trie** |
| "intervals", "meetings", "overlapping ranges" | **Sort + sweep / merge** |
| "tree", "BST" | **DFS recursion** (what do I need from children?) |
| "appears once", "no extra space", "power of two" | **Bit manipulation** |
| "linked list" + "middle/cycle/kth from end" | **Fast & slow pointers** |
| "design a data structure with O(1) ops" | **Hash map + linked list / array** combos |
| "locally best choice works" | **Greedy** (prove it!) |

## Use the constraints

n ≤ 20 → exponential is fine. n ≤ 10⁴ → O(n²) is OK. n ≤ 10⁵–10⁶ → need O(n log n) or O(n). Values up to 10⁹ → watch `int` overflow on sums. See *Math → Big-O* for the full table.

## When you're stuck

1. **Simplify:** solve a smaller version (1-D before 2-D, k = 1 before general k, no duplicates first).
2. **Brute force, then find repeated work** — that's where memoisation, hashing or precomputation goes.
3. **Try every data structure** mentally: would a heap/hash map/stack/sorted order make the key step O(1) or O(log n)?
4. **Work backwards** from the desired output.
5. **Look at the examples for structure** — monotonic? symmetric? sorted after transformation?
6. **Ask for a hint** — it's better than 15 minutes of silence. Using a hint well still scores.

## Writing interview-quality C++

```cpp
// ✅ Good habits
vector<int> topK(const vector<int>& nums, int k) {      // const& for read-only input
    if (k <= 0) return {};                               // handle edge cases explicitly
    unordered_map<int, int> freq;
    for (int x : nums) ++freq[x];                        // range-for, clear names
    // ...
}
```

- Use descriptive names (`left`, `right`, `windowSum`) — not `a`, `b`, `t2`.
- Extract helpers (`isValid(r, c)`, `neighbors(node)`).
- Prefer `size_t`/`int` consistently; cast `.size()` when comparing with signed values or subtracting.
- Know your STL cold: `sort`, `lower_bound`, `unordered_map::find`, `priority_queue` with `greater<>`, `accumulate`, `iota`, structured bindings.
- Don't over-optimise prematurely; get a correct solution first, then improve.

## Testing your code (out loud)

1. Trace the main example — write variable values in a table.
2. Edge cases: empty input, single element, duplicates, negatives, overflow, already-sorted/reverse-sorted, k = 0 / k = n.
3. Off-by-one checks on loop bounds and window sizes.
4. State complexity: "O(n log n) time for sorting, O(n) extra space for the map."

## Behavioural signals interviewers score

- **Communication:** clarifying questions, narrating, receptive to hints.
- **Problem solving:** structured approach, considers alternatives, trade-offs.
- **Coding:** correct, clean, idiomatic, handles edge cases.
- **Verification:** tests without being asked, finds own bugs.

## Practice regimen (uses this site)

1. Follow the **Problems roadmap** in order; 2–3 problems/day.
2. Timebox: 25 minutes to solve before opening the hint; 10 more before *Show Answer*.
3. After reading an answer, **re-implement it from scratch without looking** the same day.
4. **Star** problems you couldn't solve; re-do starred ones after 3 days and 1 week (spaced repetition).
5. Once a week, do a timed mock: 2 random problems in 60 minutes, talking out loud (record yourself).
