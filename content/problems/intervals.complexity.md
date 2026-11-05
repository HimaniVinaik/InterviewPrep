## merge-intervals
### Complexity
**Time, step by step**
1. Sorting n intervals: O(n log n) comparisons. Each compares two `vector<int>`s, which is O(1) for 2-element vectors.
2. One linear pass, each interval either appended or merged in O(1): O(n).
3. Total: **O(n log n)** — the sort dominates.

**Space:**
- Output: up to n intervals (counted as output).
- Sorting: O(log n) stack.
- Extra: **O(log n)**.

## insert-interval
### Complexity
**Time, step by step**
1. The "before" loop, the "overlap" loop and the "after" loop together advance `i` from 0 to n exactly once.
2. Each step copies or merges one interval in O(1).
3. Total: **O(n)** — no sorting, because the input is already sorted.

**Space:** output O(n); extra **O(1)**.

**Note:** binary search can locate the overlap range in O(log n), but building the output is still O(n).

## non-overlapping-intervals
### Complexity
**Time, step by step**
1. Sorting by end time: O(n log n).
2. Greedy scan: O(1) per interval → O(n).
3. Total: **O(n log n)**.

**Space:** O(log n) for sorting → **O(1)** extra besides that.

**Comparison:** the LIS-style DP is O(n²).

## meeting-rooms
### Complexity
**Time:** sort O(n log n) + one pass comparing neighbours O(n) → **O(n log n)**.

**Space:** **O(1)** extra (O(log n) sort stack).

## meeting-rooms-ii
### Complexity
**Time, step by step**
1. Copying starts and ends into two vectors: O(n).
2. Sorting both: 2 × O(n log n).
3. Two-pointer sweep: `i` advances n times and `j` at most n times in total → O(n).
4. Total: **O(n log n)**.

**Space:** two arrays of n → **O(n)**.

**Comparison:** the min-heap version has the same bounds; the difference-map version is also O(n log n) due to the ordered map.

## minimum-interval-to-include-each-query
### Complexity
**Time, step by step** (n intervals, q queries)
1. Sorting intervals: O(n log n).
2. Sorting query indices: O(q log q).
3. Every interval is pushed into the heap once: O(n log n).
4. Every interval is popped at most once (lazy deletion): O(n log n).
5. Each query reads the top: O(1) → O(q).
6. Total: **O(n log n + q log q)**.

**Space:** heap O(n), order array O(q), answers O(q) → **O(n + q)**.

**Comparison:** brute force is O(n · q) — 10¹⁰ operations at the limits.
