## contains-duplicate

### Walkthrough
**Goal:** answer "have I seen this value before?" for each element in O(1).

1. Create an empty `unordered_set<int> seen`.
2. Visit each `x` left to right.
3. `seen.count(x) > 0` asks "is `x` already in the set?" — a hash lookup that takes O(1) on average.
4. If the insert failed (`false`), `x` appeared earlier → return `true` immediately (early exit).
5. If the loop finishes, every insert succeeded → all values distinct → return `false`.

**Dry run** on `[1, 2, 3, 1]`:

| step | x | seen before | insert succeeded? | action |
|---|---|---|---|---|
| 1 | 1 | {} | yes | continue |
| 2 | 2 | {1} | yes | continue |
| 3 | 3 | {1,2} | yes | continue |
| 4 | 1 | {1,2,3} | **no** | return true |

**Edge cases:** empty array or single element → false. Negative numbers and `INT_MIN` work fine in a hash set.

**Comparison:** brute force O(n²)/O(1) → sorting O(n log n)/O(1) → hash set O(n)/O(n). This is the classic time–space trade-off to say out loud.

## valid-anagram

### Walkthrough
**Goal:** compare the multiset of letters in `s` and `t`.

1. **Length check:** different lengths can never be anagrams → return false (also guarantees same loop bounds).
2. Make `int cnt[26] = {0}` — 26 counters, all starting at zero.
3. Single loop over index `i`: `++cnt[s[i] - 'a']` and `--cnt[t[i] - 'a']`. `c - 'a'` maps `'a'..'z'` to `0..25`.
4. After the loop each counter = (count in s) − (count in t).
5. All zero ⇔ same letter counts ⇔ anagram. A final loop over the 26 counters checks that.

**Dry run** `s = "rat"`, `t = "car"` (showing only non-zero counters):

| i | s[i] | t[i] | after update |
|---|---|---|---|
| 0 | r | c | r:+1, c:−1 |
| 1 | a | a | r:+1, c:−1 (a cancels) |
| 2 | t | r | t:+1, c:−1 (r cancels) |

`t` and `c` are non-zero → **false**.

**Why one array, not two?** Incrementing for `s` and decrementing for `t` halves memory and lets one check (`== 0`) replace comparing two arrays.

## two-sum

### Walkthrough
**Goal:** for each `nums[i]`, find whether its complement `target − nums[i]` appeared earlier.

1. `idx` maps **value → index** of numbers already visited.
2. For each `i`: compute `need = target - nums[i]`.
3. Look up `need`. If found, the earlier index and `i` form the answer.
4. Otherwise store `nums[i] → i` and continue.
5. Looking up **before** inserting guarantees we never pair an element with itself (e.g. `target = 6`, `nums[i] = 3` alone).

**Dry run** `nums = [2, 7, 11, 15]`, `target = 9`:

| i | nums[i] | need | idx before | found? |
|---|---|---|---|---|
| 0 | 2 | 7 | {} | no → store 2→0 |
| 1 | 7 | 2 | {2→0} | **yes** → return [0, 1] |

**Duplicates case** `nums = [3, 3]`, `target = 6`: at i=0 need 3 not present, store 3→0; at i=1 need 3 found at 0 → [0,1]. ✔

**Interview tip:** say out loud why you look up `need` *before* inserting `nums[i]` — it shows you thought about the "same element twice" edge case.

## group-anagrams

### Walkthrough
**Goal:** put words into buckets keyed by something every anagram shares.

1. For each word, count its letters into `int cnt[26] = {0}`.
2. Turn the counts into a string key: `"1#0#0#...#"`. The `#` separators matter — without them, counts `1,11` and `11,1` would both become `"111"`.
3. `groups[key]` creates an empty vector the first time the key is seen (`operator[]` default-inserts), then we append the word.
4. Finally copy each group from the map into the result vector.
5. Finally move each bucket into the output.

**Dry run** `["eat","tea","tan","ate","nat","bat"]` (key shown as letters for readability):

| word | key (letter counts) | bucket after |
|---|---|---|
| eat | a1 e1 t1 | {eat} |
| tea | a1 e1 t1 | {eat, tea} |
| tan | a1 n1 t1 | {tan} |
| ate | a1 e1 t1 | {eat, tea, ate} |
| nat | a1 n1 t1 | {tan, nat} |
| bat | a1 b1 t1 | {bat} |

**Choosing a key:** sorted string (O(k log k), simple) vs counts (O(k), longer key). For short words they're similar; mention both.

## top-k-frequent-elements

### Walkthrough
**Goal:** find the k values with the highest counts, faster than sorting.

1. Count frequencies in a hash map: O(n).
2. **Key observation:** any count is between 1 and n. So create `n + 1` buckets where `bucket[f]` holds all values that appear exactly `f` times.
3. Walk `f` from n down to 1, appending values until we have k of them.
4. Total work: counting O(n) + filling buckets O(m) + scanning buckets O(n) = O(n).

**Dry run** `nums = [1,1,1,2,2,3]`, `k = 2`:

- freq = {1:3, 2:2, 3:1}
- buckets: `bucket[3] = [1]`, `bucket[2] = [2]`, `bucket[1] = [3]`

| f | bucket[f] | out after |
|---|---|---|
| 6, 5, 4 | [] | [] |
| 3 | [1] | [1] |
| 2 | [2] | [1, 2] → size k, stop |

**Which to present?** Start with the heap (most general), then mention bucket sort as the O(n) improvement — interviewers like seeing the progression.

## product-of-array-except-self

### Walkthrough
**Goal:** `ans[i] = (product of nums[0..i-1]) × (product of nums[i+1..n-1])` in O(n), O(1) extra.

1. **Pass 1 (left → right):** keep `prefix` = product of elements *before* `i`. Write `ans[i] = prefix`, *then* multiply `prefix *= nums[i]`. Order matters: write first so `nums[i]` isn't included.
2. **Pass 2 (right → left):** keep `suffix` = product of elements *after* `i`. Multiply `ans[i] *= suffix`, then `suffix *= nums[i]`.
3. Each `ans[i]` now holds left-product × right-product.

**Dry run** `nums = [1, 2, 3, 4]`:

Pass 1:

| i | prefix (before) | ans[i] | prefix after |
|---|---|---|---|
| 0 | 1 | 1 | 1 |
| 1 | 1 | 1 | 2 |
| 2 | 2 | 2 | 6 |
| 3 | 6 | 6 | 24 |

Pass 2:

| i | suffix (before) | ans[i] = ans[i]·suffix | suffix after |
|---|---|---|---|
| 3 | 1 | 6 | 4 |
| 2 | 4 | 8 | 12 |
| 1 | 12 | 12 | 24 |
| 0 | 24 | 24 | 24 |

Result `[24, 12, 8, 6]` ✔. Zeros need no special handling — they just flow through the products.

## valid-sudoku

### Walkthrough
**Goal:** detect any digit repeated in a row, column or 3×3 box.

1. Keep 27 bitmasks: `rows[9]`, `cols[9]`, `boxes[9]` (bit d = "digit d used").
2. For each filled cell `(r, c)` with digit `d`, form `bit = 1 << d`.
3. **Box index:** `b = (r/3)*3 + c/3`. Rows 0–2 & cols 0–2 → box 0; rows 0–2 & cols 3–5 → box 1; … rows 6–8 & cols 6–8 → box 8.
4. If `rows[r] & bit`, `cols[c] & bit` or `boxes[b] & bit` is non-zero, the digit already exists in one of the three → invalid.
5. Otherwise set the bit in all three.

**Box index table:**

| r \ c | 0–2 | 3–5 | 6–8 |
|---|---|---|---|
| 0–2 | 0 | 1 | 2 |
| 3–5 | 3 | 4 | 5 |
| 6–8 | 6 | 7 | 8 |

**Example:** cell (4, 7) = '5' → box = (4/3)*3 + 7/3 = 3 + 2 = 5; bit = 1<<5 = 0b100000.

**Note:** this checks *validity* of the current board, not *solvability* (that's LC 37, backtracking).

## encode-and-decode-strings

### Walkthrough
**Goal:** a reversible encoding that is unambiguous for *any* characters.

1. **Encode:** for each string append `<length>#<payload>`. E.g. `["ab", "c#d"]` → `"2#ab3#c#d"`.
2. **Decode:** start at `i = 0`.
   1. Find the first `#` at or after `i` — everything between is the decimal length.
   2. Parse the length with `stoi`.
   3. The payload is exactly the next `len` characters after the `#`, no matter what they contain.
   4. Advance `i` past the payload and repeat.

**Dry run** decoding `"2#ab3#c#d"`:

| i | '#' at | len | payload | next i |
|---|---|---|---|---|
| 0 | 1 | 2 | "ab" | 4 |
| 4 | 5 | 3 | "c#d" | 9 (end) |

The `#` inside `"c#d"` is never treated as a separator because we skip it by length.

**Edge cases:** empty list → `""` → decodes to `[]`; list with an empty string → `"0#"` → `[""]`.

## longest-consecutive-sequence

### Walkthrough
**Goal:** O(n) by only counting runs from their **start**.

1. Put all numbers in an `unordered_set` (removes duplicates, O(1) lookups).
2. For each `x` in the set: if `x − 1` exists, `x` is in the middle of a run — skip it.
3. Otherwise `x` starts a run: count upward while `x + len` exists.
4. Track the best length.
5. **Why O(n)?** Each number is "walked over" by the inner while only from its run's start, so across all starts the inner loop runs at most n times total.

**Dry run** `[100, 4, 200, 1, 3, 2]` → set {100, 4, 200, 1, 3, 2}:

| x | x−1 in set? | run counted | best |
|---|---|---|---|
| 100 | no (99) | 100 → len 1 | 1 |
| 4 | yes (3) | skip | 1 |
| 200 | no | len 1 | 1 |
| 1 | no (0) | 1,2,3,4 → len 4 | **4** |
| 3 | yes | skip | 4 |
| 2 | yes | skip | 4 |

**Gotcha:** iterating over the original array (with duplicates like `[1,1,1,...]`) can redo work; iterate the set.
