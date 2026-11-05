## valid-parentheses
### Complexity
**Time, step by step** (n = length)
1. One pass over n characters.
2. Each character: either one `push_back` (amortised O(1)) or one comparison + `pop_back` (O(1)).
3. Final `empty()` check: O(1).
4. Total: **O(n)**.

**Space, step by step**
- Worst case all openers, e.g. `"(((((("` → n elements on the stack → **O(n)**.
- Best case alternating `"()()"` → stack depth ≤ 1.

## min-stack
### Complexity
**Time, per operation**
- `push`: one `min` + `emplace_back` → amortised **O(1)** (a vector occasionally reallocates; doubling makes the average constant).
- `pop`, `top`, `getMin`: direct access to `back()` → **O(1)** worst case.

**Space, step by step**
- Each element stores two ints (value + min so far) → 2n ints → **O(n)**.
- The two-stack variant stores the second stack only on new minima: still O(n) worst case (strictly decreasing pushes), often much less.

## evaluate-reverse-polish-notation
### Complexity
**Time, step by step** (n tokens, each of bounded length)
1. One pass over the tokens.
2. Number token: `stoll` parses its digits, O(token length) = O(1) for bounded numbers; one push.
3. Operator token: two pops, one arithmetic op, one push → O(1).
4. Total: **O(n)**.

**Space, step by step**
- Stack holds at most ⌈n/2⌉ operands (every operator reduces the stack by one) → **O(n)**.

## generate-parentheses
### Complexity
**Time, step by step**
1. The number of valid strings is the n-th Catalan number Cₙ = C(2n, n)/(n+1) ≈ 4ⁿ / (n^(3/2)·√π).
2. Thanks to pruning, every recursion path leads to a valid output; the recursion tree has O(Cₙ · n) nodes in total.
3. Copying each finished string into the output costs O(n).
4. Total: **O(Cₙ · n) = O(4ⁿ / √n)**.

**Space, step by step**
- Recursion depth 2n → O(n) stack frames.
- The working string `cur`: O(n).
- Output: Cₙ strings of length 2n (not counted as extra).
- Extra: **O(n)**.

## daily-temperatures
### Complexity
**Time, step by step**
1. The outer loop runs n times.
2. Every index is pushed onto the stack **exactly once** and popped **at most once**.
3. So across the whole run, the inner `while` executes at most n pops in total.
4. Total: n pushes + ≤ n pops + n comparisons that stop the while → **O(n)** (amortised analysis).

**Space, step by step**
- Answer array: O(n) (output).
- Stack: up to n indices for strictly decreasing temperatures → **O(n)** extra.

## car-fleet
### Complexity
**Time, step by step**
1. Building `cars` (position, time): O(n).
2. Sorting by position: **O(n log n)** — dominates.
3. One linear scan with O(1) work per car: O(n).
4. Total: **O(n log n)**.

**Space, step by step**
- The `cars` vector of n pairs → **O(n)**.
- Sorting: O(log n) stack.

**Can we do better?** If positions are bounded (≤ target ≤ 10⁶), bucket the cars by position instead of sorting → O(n + target) time.

## largest-rectangle-in-histogram
### Complexity
**Time, step by step**
1. Appending the 0 sentinel: amortised O(1).
2. The loop visits n + 1 bars.
3. Each index is pushed once and popped once → at most n + 1 pops overall; each pop does O(1) area work.
4. Total: **O(n)** (amortised, same argument as Daily Temperatures).

**Space, step by step**
- Stack of indices: up to n + 1 for an increasing histogram → **O(n)**.

**Comparison:** brute force (expand each bar) is O(n²); divide and conquer is O(n log n) average.
