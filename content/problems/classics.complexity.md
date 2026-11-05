## fizz-buzz
### Complexity
**Time, step by step**
1. The loop runs n times.
2. Each iteration: two modulo operations (O(1)), at most two short appends, and either a move or a `to_string` (O(digits) = O(log₁₀ n)).
3. Total: **O(n log n)** counting digit conversions exactly; usually quoted as **O(n)** because numbers fit in a machine word.

**Space:** output n strings (not counted); extra **O(1)** — `reserve(n)` avoids repeated reallocation of the output vector.

## two-sum
### Complexity
**Time:** n iterations, each one average-O(1) hash lookup and one average-O(1) insert → **O(n)** average (O(n²) worst case under adversarial hash collisions).

**Space:** up to n − 1 map entries → **O(n)**.

**Ladder of solutions:** O(n²)/O(1) brute force → O(n log n)/O(n) sort + two pointers → **O(n)/O(n)** hashing.

## reverse-string
### Complexity
**Time:** ⌊n/2⌋ swaps → **O(n)**.

**Space:** two indices → **O(1)**. The recursive version uses O(n) stack frames.

## palindrome-number
### Complexity
**Time, step by step** (d = number of decimal digits = ⌊log₁₀ x⌋ + 1)
1. The loop moves one digit from x to `rev` per iteration.
2. It stops at the middle: ⌈d/2⌉ iterations.
3. Total: **O(d) = O(log₁₀ x)** — at most 5 iterations for 32-bit ints.

**Space:** **O(1)**. The string version needs O(d).

## fibonacci-number
### Complexity
**Time:** n iterations, one addition each → **O(n)**.

**Space:** **O(1)**.

| method | time | space |
|---|---|---|
| naive recursion | O(φⁿ) | O(n) |
| memoisation | O(n) | O(n) |
| iteration | O(n) | O(1) |
| fast doubling / matrix | O(log n) | O(log n) / O(1) |

**Big-number caveat:** F(n) has about 0.209·n decimal digits, so with arbitrary-precision integers each addition costs O(n) and the iterative method is really O(n²) bit operations.

## roman-to-integer
### Complexity
**Time:** one pass with at most two `switch` lookups per character → **O(n)**. Roman numerals up to 3999 have at most 15 characters, so practically O(1).

**Space:** **O(1)**.

## longest-common-prefix
### Complexity
**Time, step by step** (n strings, P = length of the answer)
1. Vertical scanning examines column i of every string until the first mismatch.
2. Columns 0..P are examined across all n strings: O(n · (P + 1)).
3. Total: **O(n · P)** ≤ O(S), where S is the total number of characters. It never reads past the answer + 1 character in any string.

**Space:** **O(1)** extra (the output is a substring).

**Comparison:** sorting first is O(S log n) — only the first and last strings need comparing afterwards.

## remove-duplicates-from-sorted-array
### Complexity
**Time:** the read pointer visits every element once; each write is O(1) → **O(n)**.

**Space:** **O(1)**.

## merge-sorted-array
### Complexity
**Time, step by step**
1. Each iteration writes one element into its final slot and moves the write pointer left.
2. The loop ends when nums2 is exhausted: at most m + n iterations.
3. Total: **O(m + n)**.

**Space:** three indices → **O(1)**.

**Why backwards is key:** a forward merge would need an O(m) copy of nums1 to avoid overwriting unread elements.

## majority-element
### Complexity
**Time:** one pass, O(1) per element → **O(n)**.

**Space:** `candidate`, `count` → **O(1)**.

**Comparison:** hash map O(n)/O(n); sorting O(n log n)/O(1); bit voting O(32·n)/O(1).

## count-primes
### Complexity
**Time, step by step**
1. The outer loop visits p = 2..n−1: O(n).
2. For each prime p, the inner loop marks about n/p multiples (starting from p²).
3. Total marking work: n · Σ (1/p) over primes p < n = n · ln ln n (Mertens' theorem).
4. Total: **O(n log log n)** — effectively linear.

**Space:** `vector<bool>` of n bits → **O(n)** bits (≈ 625 KB for n = 5·10⁶). The odd-only sieve halves that.

**Comparison:** trial division of every number is O(n√n).

## rotate-array
### Complexity
**Time, step by step**
1. `k %= n`: O(1).
2. Three reversals touch n, k and n − k elements → 2n element moves.
3. Total: **O(n)**.

**Space:** **O(1)**.

**Comparison:** an extra array is O(n) space; rotating by one step k times is O(n · k); cyclic replacements move each element exactly once (n moves) in O(1) space.

## first-unique-character-in-a-string
### Complexity
**Time:** two passes over n characters, O(1) work each → **O(n)**.

**Space:** 26 counters → **O(1)**.

## find-the-index-of-the-first-occurrence-in-a-string
### Complexity
**Time, step by step** (n = haystack length, m = needle length)
1. **Failure function:** `i` advances m times. `k` increases by at most 1 per step and every fallback decreases it, so the total number of fallbacks ≤ the total number of increases ≤ m → O(m).
2. **Search:** same potential argument with the haystack: ≤ n increases, so ≤ n fallbacks → O(n).
3. Total: **O(n + m)**, and the haystack pointer never moves backwards (useful for streams).

**Space:** the `pi` array → **O(m)**.

**Comparison:** brute force O(n · m) worst case; Rabin–Karp O(n + m) expected.

## pascals-triangle
### Complexity
**Time:** row r needs r − 1 additions; summing over r < numRows gives ≈ numRows²/2 → **O(numRows²)** — optimal, since the output has that many numbers.

**Space:** **O(1)** extra (output excluded).

## sqrtx
### Complexity
**Time, step by step**
1. The search range `[0, x]` halves every iteration.
2. ⌈log₂(x + 1)⌉ ≤ 31 iterations for 32-bit x.
3. Each iteration: one multiplication and one comparison.
4. Total: **O(log x)**.

**Space:** **O(1)**.

**Comparison:** Newton's method converges quadratically (the number of correct digits doubles each step) → O(log log x) iterations once close; the bit-by-bit method is a fixed 16 iterations for 32-bit.

## add-binary
### Complexity
**Time:** max(m, n) + 1 iterations of O(1) work, plus one reversal of the output → **O(max(m, n))**.

**Space:** output of max(m, n) + 1 characters; extra **O(1)**.

**Pitfall:** `out = char + out` (prepending) inside the loop would be O(n²) overall — append and reverse once instead.

## implement-queue-using-stacks
### Complexity
**Time, step by step**
- `push`: one stack push → **O(1)**.
- `pop` / `peek`: O(1) if `out` is non-empty; otherwise pour all k elements from `in` → O(k).
- **Amortised analysis:** each element is pushed to `in` once, moved to `out` once and popped once → 4 stack operations per element over its lifetime. So any sequence of q operations costs O(q) in total → **amortised O(1)** per operation.

**Space:** every element lives in exactly one stack → **O(n)**.

## sort-colors
### Complexity
**Time, step by step**
1. Each iteration either advances `mid` or decrements `hi`, shrinking the unknown region `[mid, hi]` by one.
2. The unknown region starts at size n → exactly n iterations.
3. Each iteration does at most one swap.
4. Total: **O(n)** in a single pass.

**Space:** three indices → **O(1)**.

**Comparison:** counting sort is also O(n)/O(1) but makes two passes.

## intersection-of-two-arrays-ii
### Complexity
**Time, step by step** (m, n = sizes, smaller array counted)
1. Counting the smaller array: O(min(m, n)) average-O(1) map updates.
2. Scanning the larger array: O(max(m, n)) lookups.
3. Total: **O(m + n)** average.

**Space:** the map over the smaller array → **O(min(m, n))**.

**Follow-ups:**
- Both arrays sorted → two pointers, O(m + n) time, O(1) space.
- `nums2` too large for memory → stream it in chunks against the in-memory counts of `nums1`.
