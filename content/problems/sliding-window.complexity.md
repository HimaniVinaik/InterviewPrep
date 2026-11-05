## best-time-to-buy-and-sell-stock
### Complexity
**Time, step by step**
1. One pass over n prices.
2. Each price: one `min` and one `max` → O(1).
3. Total: **O(n)**.

**Space:** `minPrice`, `best` → **O(1)**.

## longest-substring-without-repeating-characters
### Complexity
**Time, step by step** (n = length, Σ = alphabet size 256)
1. `last.fill(-1)`: O(Σ) = O(1).
2. `r` moves from 0 to n − 1: n iterations.
3. `l` only ever **jumps forward** (never moves back), so it never does more than n total movement — and here each jump is a single assignment, O(1).
4. Each iteration: one array read, one comparison, one write, one `max` → O(1).
5. Total: **O(n)**.

**Space:** `array<int, 256>` → **O(Σ) = O(1)**.

## longest-repeating-character-replacement
### Complexity
**Time, step by step**
1. `r` advances n times.
2. `l` advances at most n times over the whole run (it never moves back); in fact the `while` runs at most once per `r` because the window size never needs to shrink by more than 1.
3. Each step: one counter update, one `max` → O(1).
4. Total: **O(n)**.

**Space:** 26 counters → **O(1)**.

**Comparison:** the per-letter version is O(26·n) — same order, larger constant.

## permutation-in-string
### Complexity
**Time, step by step** (n = |s1|, m = |s2|)
1. Counting s1: O(n).
2. The window loop runs m times.
3. Each iteration: one increment, at most one decrement → O(1), plus comparing two `array<int, 26>` → O(26).
4. Total: O(n + 26·m) = **O(n + m)**.

**Space:** two 26-element arrays → **O(1)**.

**Constant-factor improvement:** the `matches` counter version makes each step O(1) instead of O(26).

## minimum-window-substring
### Complexity
**Time, step by step** (n = |s|, m = |t|)
1. Counting t into `need`: O(m).
2. `r` moves n times; `l` moves at most n times in total (it only increases).
3. Each move updates one counter and possibly `missing` → O(1).
4. Building the answer with `substr`: O(answer length) ≤ O(n).
5. Total: **O(n + m)**.

**Space:**
- `array<int, 128>` for ASCII → **O(1)** (O(Σ) for a general alphabet).
- Output string: O(n) worst case.

## sliding-window-maximum
### Complexity
**Time, step by step**
1. The loop runs n times.
2. Every index is pushed to the deque **once** and popped (from the front or the back) **at most once**.
3. Total pops across the run ≤ n, so all the `while` loops together cost O(n).
4. Total: **O(n)** amortised.

**Space, step by step**
- Deque holds at most k indices (anything older than k is expired) → **O(k)**.
- Output: n − k + 1 values (not counted).

**Comparison:** brute force O(n·k); heap O(n log n); block prefix/suffix maxima O(n) time with O(n) space.
