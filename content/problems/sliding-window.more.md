## best-time-to-buy-and-sell-stock

### Walkthrough
**Goal:** max of `prices[sell] − prices[buy]` with buy before sell.

1. For a fixed sell day, the best buy day is the **cheapest day before it**.
2. So scan once, keeping `minPrice` seen so far.
3. At each day, the candidate profit is `price − minPrice`; keep the max.
4. Update `minPrice` with today (order of the two updates doesn't matter here since profit with itself is 0).

**Dry run** `[7, 1, 5, 3, 6, 4]`:

| day | price | minPrice | profit today | best |
|---|---|---|---|---|
| 0 | 7 | 7 | 0 | 0 |
| 1 | 1 | 1 | 0 | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | **5** |
| 5 | 4 | 1 | 3 | 5 |

## longest-substring-without-repeating-characters

### Walkthrough
**Goal:** longest window `[l, r]` with all distinct characters.

1. `last[c]` = most recent index of character `c` (−1 if unseen).
2. Extend `r` one step at a time.
3. If `s[r]` was last seen **inside the window** (`last[c] ≥ l`), the window now has a repeat. Jump `l` to `last[c] + 1` — every smaller `l` would still contain both copies.
4. Record `last[c] = r` and update `best = max(best, r − l + 1)`.

**Dry run** `"abcabcbb"`:

| r | c | last[c] | l after | window | best |
|---|---|---|---|---|---|
| 0 | a | −1 | 0 | a | 1 |
| 1 | b | −1 | 0 | ab | 2 |
| 2 | c | −1 | 0 | abc | 3 |
| 3 | a | 0 | 1 | bca | 3 |
| 4 | b | 1 | 2 | cab | 3 |
| 5 | c | 2 | 3 | abc | 3 |
| 6 | b | 4 | 5 | cb | 3 |
| 7 | b | 6 | 7 | b | 3 |

**Why `last[c] >= l`?** In `"abba"`, at the final `a`, `last['a'] = 0` but `l = 2` already — that old `a` is outside the window and must be ignored.

## longest-repeating-character-replacement

### Walkthrough
**Goal:** longest window where `windowLength − (count of most frequent letter) ≤ k`.

1. Keep `cnt[26]` for the window and `maxf` = highest count seen.
2. Add `s[r]`, update `maxf`.
3. If the window needs more than `k` replacements, slide `l` right by one (decrement its count).
4. Record `r − l + 1`.
5. **Subtlety:** `maxf` is never lowered when shrinking. That's safe: the answer can only *grow* when a window reaches a larger `maxf`, so a stale `maxf` merely keeps the window size constant rather than producing a wrong bigger answer.

**Dry run** `s = "AABABBA"`, `k = 1`:

| r | char | maxf | window len | len − maxf | shrink? | best |
|---|---|---|---|---|---|---|
| 0 | A | 1 | 1 | 0 | no | 1 |
| 1 | A | 2 | 2 | 0 | no | 2 |
| 2 | B | 2 | 3 | 1 | no | 3 |
| 3 | A | 3 | 4 | 1 | no | 4 |
| 4 | B | 3 | 5 | 2 | yes → len 4 | 4 |
| 5 | B | 3 | 5 | 2 | yes → len 4 | 4 |
| 6 | A | 3 | 5 | 2 | yes → len 4 | 4 |

Answer **4** (e.g. "AABA" → "AAAA").

## permutation-in-string

### Walkthrough
**Goal:** does some window of length `|s1|` in `s2` have the same letter counts as `s1`?

1. Count `s1` into `need`.
2. Slide a fixed-size window over `s2` with counts in `win`.
3. Each step: add the entering character `s2[r]`; once `r ≥ n`, remove the leaving one `s2[r − n]`.
4. Compare `win == need` (26 integers — constant time).

**Dry run** `s1 = "ab"`, `s2 = "eidbaooo"` (only a, b counts shown):

| r | added | removed | window | win(a,b) | match? |
|---|---|---|---|---|---|
| 1 | i | — | "ei" | 0,0 | no |
| 2 | d | e | "id" | 0,0 | no |
| 3 | b | i | "db" | 0,1 | no |
| 4 | a | d | "ba" | 1,1 | **yes** |

## minimum-window-substring

### Walkthrough
**Goal:** shortest window of `s` containing all characters of `t` (with multiplicity).

1. `need[c]` = how many of `c` the window still requires (starts as counts in `t`). `missing` = total still required.
2. **Expand** with `r`: `need[s[r]]--`. If it was positive before, we filled a requirement → `missing--`. (Negative `need` = surplus.)
3. When `missing == 0`, the window is valid. **Shrink** from `l` as much as possible:
   1. Record the window if it's the smallest.
   2. Remove `s[l]`: `need[s[l]]++`. If it becomes positive, we just lost a required char → `missing++`, the window is invalid again.
   3. `l++`.
4. Continue expanding.

**Dry run** `s = "ADOBECODEBANC"`, `t = "ABC"` (key moments):

| r | char | missing | valid window found when shrinking | best |
|---|---|---|---|---|
| 5 | C | 0 | "ADOBEC" (0..5) → removing A breaks it | ADOBEC (6) |
| 10 | A | 0 | "DOBECODEBA" → shrink to "CODEBA" (5..10) | ADOBEC |
| 12 | C | 0 | shrink to "BANC" (9..12) | **BANC (4)** |

## sliding-window-maximum

### Walkthrough
**Goal:** max of every length-k window in O(n).

1. Keep a deque of **indices** whose values are strictly decreasing from front to back. The front is the current max.
2. For each `i`:
   1. **Expire:** if the front index is `≤ i − k`, it's outside the window → pop front.
   2. **Dominate:** pop from the back while `nums[back] ≤ nums[i]` — those can never be a max again, since `i` is larger and stays longer.
   3. Push `i` at the back.
   4. Once `i ≥ k − 1`, output `nums[front]`.

**Dry run** `nums = [1, 3, −1, −3, 5, 3, 6, 7]`, `k = 3` (deque shown as values):

| i | num | deque after | output |
|---|---|---|---|
| 0 | 1 | [1] | |
| 1 | 3 | [3] | |
| 2 | −1 | [3, −1] | 3 |
| 3 | −3 | [3, −1, −3] | 3 |
| 4 | 5 | [5] (3 expired, others dominated) | 5 |
| 5 | 3 | [5, 3] | 5 |
| 6 | 6 | [6] | 6 |
| 7 | 7 | [7] | 7 |
