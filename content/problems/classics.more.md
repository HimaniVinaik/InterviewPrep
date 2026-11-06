## fizz-buzz

### Walkthrough
**Goal:** map each i to "Fizz", "Buzz", "FizzBuzz", or the number.

1. Reserve `n` slots in the output (avoids repeated reallocation).
2. For each `i` from 1 to n, start with an empty string `s`.
3. If `i % 3 == 0` append "Fizz"; **independently**, if `i % 5 == 0` append "Buzz". Multiples of 15 get both, in the right order.
4. If `s` is still empty, the number wasn't divisible by either → use `to_string(i)`.
5. Move `s` into the vector (no copy).

**Dry run** n = 15 (selected):

| i | i % 3 | i % 5 | s | output |
|---|---|---|---|---|
| 1 | 1 | 1 | "" | "1" |
| 3 | 0 | 3 | "Fizz" | "Fizz" |
| 5 | 2 | 0 | "Buzz" | "Buzz" |
| 9 | 0 | 4 | "Fizz" | "Fizz" |
| 15 | 0 | 0 | "FizzBuzz" | "FizzBuzz" |

## two-sum

### Walkthrough
**Goal:** one pass; for each number, check whether its complement was already seen.

1. `seen` maps **value → index** for every number visited so far.
2. At index i, compute `need = target − nums[i]`.
3. If `need` is in `seen`, its index and i are the answer.
4. Otherwise record `nums[i] → i` and move on.

**Dry run** `nums = [3, 2, 4]`, target 6:

| i | nums[i] | need | seen before | found? |
|---|---|---|---|---|
| 0 | 3 | 3 | {} | no → add 3→0 |
| 1 | 2 | 4 | {3→0} | no → add 2→1 |
| 2 | 4 | 2 | {3→0, 2→1} | **yes → [1, 2]** |

At i = 0 we looked up 3 *before* inserting 3, which is why `[0, 0]` is never returned.

## reverse-string

### Walkthrough
**Goal:** reverse in place.

1. `l` at the first index, `r` at the last.
2. Swap `s[l]` and `s[r]`; this puts both characters in their final positions.
3. Move both inward; stop when they meet or cross (`l < r` fails).

**Dry run** `[h, e, l, l, o]`:

| l | r | swap | array after |
|---|---|---|---|
| 0 | 4 | h ↔ o | o e l l h |
| 1 | 3 | e ↔ l | o l l e h |
| 2 | 2 | stop (l == r) | o l l e h |

Two swaps for five characters — ⌊n/2⌋ in general.

## palindrome-number

### Walkthrough
**Goal:** check digit symmetry using only arithmetic, without overflow.

1. **Quick rejects:** negatives (the `−` has no mirror), and numbers ending in 0 except 0 itself (they'd need a leading 0).
2. Build `rev` from the last digits of `x` while chopping them off `x`: `rev = rev·10 + x % 10`, `x /= 10`.
3. Stop when `x ≤ rev` — we've consumed half the digits.
4. Even digit count → `x == rev`. Odd → the middle digit is in `rev`, so compare `x == rev / 10`.

**Dry run** x = 12321:

| x | rev | x > rev? |
|---|---|---|
| 12321 | 0 | yes |
| 1232 | 1 | yes |
| 123 | 12 | yes |
| 12 | 123 | no → stop |

`x == rev / 10` → 12 == 12 → **true**. For x = 1221: (122, 1) → (12, 12) stop → `x == rev` → true.

## fibonacci-number

### Walkthrough
**Goal:** F(n) iteratively in O(1) space.

1. Keep `a = F(i)`, `b = F(i+1)`, starting at i = 0: `a = 0`, `b = 1`.
2. Each step advances i by one: the new pair is `(F(i+1), F(i+2)) = (b, a + b)`.
3. After n steps, `a = F(n)`.

**Dry run** n = 6:

| step | a | b |
|---|---|---|
| 0 | 0 | 1 |
| 1 | 1 | 1 |
| 2 | 1 | 2 |
| 3 | 2 | 3 |
| 4 | 3 | 5 |
| 5 | 5 | 8 |
| 6 | **8** | 13 |

## roman-to-integer

### Walkthrough
**Goal:** sum symbol values, subtracting a symbol that precedes a larger one.

1. For each position i, get its value v.
2. If the next symbol is larger (IV, IX, XL, XC, CD, CM), this symbol is subtracted.
3. Otherwise it's added.

**Dry run** "MCMXCIV":

| i | symbol | value | next value | action | total |
|---|---|---|---|---|---|
| 0 | M | 1000 | 100 | + | 1000 |
| 1 | C | 100 | 1000 | − | 900 |
| 2 | M | 1000 | 10 | + | 1900 |
| 3 | X | 10 | 100 | − | 1890 |
| 4 | C | 100 | 1 | + | 1990 |
| 5 | I | 1 | 5 | − | 1989 |
| 6 | V | 5 | — | + | **1994** |

## longest-common-prefix

### Walkthrough
**Goal:** longest prefix shared by every string.

1. Use `strs[0]` as the reference.
2. For column i (character position), read `c = strs[0][i]`.
3. Check every other string: if it's too short (`i == size`) or has a different char at i, the answer is `strs[0].substr(0, i)`.
4. If the loop finishes, all of `strs[0]` is the prefix.

**Dry run** `["flower", "flow", "flight"]`:

| i | c | flow | flight | result |
|---|---|---|---|---|
| 0 | f | f ✔ | f ✔ | continue |
| 1 | l | l ✔ | l ✔ | continue |
| 2 | o | o ✔ | i ✘ | return "fl" |

## remove-duplicates-from-sorted-array

### Walkthrough
**Goal:** compact unique values to the front, in place.

1. `w` = number of unique values written so far; `nums[0]` is always unique → `w = 1`.
2. Scan `r` from 1. If `nums[r]` differs from the last written value `nums[w−1]`, it's new → write it at `nums[w]`, `w++`.
3. Return `w`.

**Dry run** `[0, 0, 1, 1, 1, 2, 2, 3]`:

| r | nums[r] | last written | write? | w |
|---|---|---|---|---|
| 1 | 0 | 0 | no | 1 |
| 2 | 1 | 0 | yes | 2 |
| 3, 4 | 1 | 1 | no | 2 |
| 5 | 2 | 1 | yes | 3 |
| 6 | 2 | 2 | no | 3 |
| 7 | 3 | 2 | yes | **4** |

Front of the array: `[0, 1, 2, 3, …]`.

## merge-sorted-array

### Walkthrough
**Goal:** merge in place by filling the empty tail first.

1. Three pointers: `i` = last real element of nums1, `j` = last of nums2, `w` = last slot of nums1.
2. Put the larger of `nums1[i]` and `nums2[j]` at `w`, move that pointer and `w` left.
3. Loop while nums2 has elements. When nums2 runs out, nums1's remaining prefix is already sorted and in place.

**Dry run** `nums1 = [1,2,3,_,_,_]`, `nums2 = [2,5,6]`:

| i (val) | j (val) | w | write | nums1 |
|---|---|---|---|---|
| 2 (3) | 2 (6) | 5 | 6 | 1 2 3 _ _ 6 |
| 2 (3) | 1 (5) | 4 | 5 | 1 2 3 _ 5 6 |
| 2 (3) | 0 (2) | 3 | 3 | 1 2 3 3 5 6 |
| 1 (2) | 0 (2) | 2 | 2 (from nums2, tie) | 1 2 2 3 5 6 |
| — | −1 | | stop | **1 2 2 3 5 6** |

## majority-element

### Walkthrough
**Goal:** find the element occurring more than n/2 times in one pass, O(1) space (Boyer–Moore).

1. Keep a `candidate` and a `count`.
2. When `count == 0`, adopt the current element as candidate.
3. Matching element → `count++`; different → `count--` (one majority vote and one other vote cancel).
4. The majority can't be cancelled completely, so it remains the candidate at the end.

**Dry run** `[2, 2, 1, 1, 1, 2, 2]`:

| x | candidate | count |
|---|---|---|
| 2 | 2 | 1 |
| 2 | 2 | 2 |
| 1 | 2 | 1 |
| 1 | 2 | 0 |
| 1 | 1 | 1 |
| 2 | 1 | 0 |
| 2 | 2 | 1 → **2** |

## count-primes

### Walkthrough
**Goal:** count primes below n with the Sieve of Eratosthenes.

1. Assume everything is prime; `composite[i] = false`.
2. Walk p from 2 upward. If p is still unmarked, it's prime → count it.
3. Mark p², p² + p, p² + 2p, … as composite. Start at p² because smaller multiples k·p (k < p) were marked by k's prime factors already.
4. Each number is marked once per prime factor → total work n·Σ(1/p) = O(n log log n).

**Dry run** n = 20:

| prime p | marks starting at p² |
|---|---|
| 2 | 4, 6, 8, 10, 12, 14, 16, 18 |
| 3 | 9, 12, 15, 18 |
| 5 | 25 ≥ 20 → nothing |
| 7, 11, 13, 17, 19 | nothing |

Primes: 2, 3, 5, 7, 11, 13, 17, 19 → **8**.

## rotate-array

### Walkthrough
**Goal:** rotate right by k in place using three reversals.

1. Normalise `k %= n` (rotating by n changes nothing).
2. Reverse the whole array — the last k elements are now at the front, but backwards.
3. Reverse the first k elements — fixes their order.
4. Reverse the remaining n − k — fixes theirs.

**Dry run** `[1,2,3,4,5,6,7]`, k = 3:

| step | array |
|---|---|
| start | 1 2 3 4 5 6 7 |
| reverse all | 7 6 5 4 3 2 1 |
| reverse first 3 | **5 6 7** 4 3 2 1 |
| reverse last 4 | 5 6 7 **1 2 3 4** |

## first-unique-character-in-a-string

### Walkthrough
**Goal:** index of the first character that appears exactly once.

1. **Pass 1:** count each letter.
2. **Pass 2:** scan the string again in order; the first position whose letter has count 1 is the answer.

**Dry run** `"loveleetcode"`: counts l:2, o:2, v:1, e:4, t:1, c:1, d:1.

| i | char | count | unique? |
|---|---|---|---|
| 0 | l | 2 | no |
| 1 | o | 2 | no |
| 2 | v | 1 | **yes → 2** |

## find-the-index-of-the-first-occurrence-in-a-string

### Walkthrough
**Goal:** linear-time substring search (KMP).

1. **Failure function** `pi[i]` for the needle: length of the longest proper prefix of `needle[0..i]` that's also a suffix of it.
2. **Search:** keep `k` = how many needle characters currently match.
   1. On mismatch with `k > 0`, fall back to `k = pi[k−1]` — the longest border of what we matched is still matched. The haystack index never moves back.
   2. On match, `k++`. When `k == m`, a full match ends at i.

**Failure function for "abab":**

| i | needle[0..i] | longest border | pi[i] |
|---|---|---|---|
| 0 | a | — | 0 |
| 1 | ab | — | 0 |
| 2 | aba | a | 1 |
| 3 | abab | ab | 2 |

**Search "abab" in "abaabab":** match a,b,a (k = 3), mismatch at haystack[3] = 'a' vs 'b' → k = pi[2] = 1 (the trailing "a" still counts); continue a…b…a…b → k = 4 at i = 6 → answer **3**.

## pascals-triangle

### Walkthrough
**Goal:** row r has r+1 entries; edges are 1, inner entries sum the two above.

1. Create row r filled with 1s (handles both edges).
2. For each inner column c (1..r−1): `row[c] = rows[r−1][c−1] + rows[r−1][c]` (the two numbers above).
3. Append the row.

**Dry run** (5 rows):

| r | computation | row |
|---|---|---|
| 0 | — | 1 |
| 1 | — | 1 1 |
| 2 | 1+1 | 1 2 1 |
| 3 | 1+2, 2+1 | 1 3 3 1 |
| 4 | 1+3, 3+3, 3+1 | 1 4 6 4 1 |

## sqrtx

### Walkthrough
**Goal:** largest m with m² ≤ x, via binary search on the answer.

1. The predicate "m² ≤ x" is true for small m and false for large m (monotonic).
2. Search `[lo, hi] = [0, x]` for the **last** true value.
3. `mid` rounds **up** (`(hi − lo + 1)/2`): with `lo = mid` on success, rounding down could make `mid == lo` forever.
4. Success → `lo = mid`; failure → `hi = mid − 1`. Stop when `lo == hi`.

**Dry run** x = 8:

| lo | hi | mid | mid² ≤ 8? | update |
|---|---|---|---|---|
| 0 | 8 | 4 | 16 no | hi = 3 |
| 0 | 3 | 2 | 4 yes | lo = 2 |
| 2 | 3 | 3 | 9 no | hi = 2 |

Answer **2**.

## add-binary

### Walkthrough
**Goal:** add binary strings of any length.

1. Pointers `i`, `j` at the last characters, `carry = 0`.
2. While either string has digits left **or** carry is 1: `sum = carry` + the digit from `a` + the digit from `b` (missing digits count as 0).
3. Output bit `sum % 2`, new carry `sum / 2`.
4. Bits were produced least-significant first → reverse once at the end.

**Dry run** a = "1010", b = "1011":

| i | j | bits | carry in | sum | out bit | carry out |
|---|---|---|---|---|---|---|
| 3 | 3 | 0 + 1 | 0 | 1 | 1 | 0 |
| 2 | 2 | 1 + 1 | 0 | 2 | 0 | 1 |
| 1 | 1 | 0 + 0 | 1 | 1 | 1 | 0 |
| 0 | 0 | 1 + 1 | 0 | 2 | 0 | 1 |
| — | — | — | 1 | 1 | 1 | 0 |

Collected "10101" (reversed from "10101" — a palindrome here) → **"10101"** (10 + 11 = 21).

## implement-queue-using-stacks

### Walkthrough
**Goal:** FIFO behaviour from two LIFO stacks with amortised O(1) operations.

1. `push` always goes onto `in`.
2. `pop`/`peek` read from `out`. If `out` is empty, pour everything from `in` into `out` — this reverses the order, so the oldest element ends up on top.
3. Never pour while `out` still has elements (that would break the order).
4. **Amortised analysis:** each element is pushed onto `in` once, moved to `out` once, and popped from `out` once → 3 stack operations per element over its lifetime, so the average per queue operation is O(1).

**Dry run** push 1, push 2, peek, pop, push 3, pop, pop:

| op | in (bottom→top) | out (bottom→top) | returns |
|---|---|---|---|
| push 1 | 1 | | |
| push 2 | 1 2 | | |
| peek | | 2 1 (poured) | 1 |
| pop | | 2 | 1 |
| push 3 | 3 | 2 | |
| pop | 3 | | 2 |
| pop | | 3 (poured) → | 3 |

## sort-colors

### Walkthrough
**Goal:** one-pass, in-place 3-way partition (Dutch national flag).

1. Regions: `[0, lo)` = 0s, `[lo, mid)` = 1s, `[mid, hi]` = unprocessed, `(hi, n)` = 2s.
2. Look at `nums[mid]`:
   1. 0 → swap into the 0 region: `swap(nums[lo], nums[mid])`, `lo++`, `mid++` (the swapped-in value is a known 1, so `mid` can advance).
   2. 1 → already in place: `mid++`.
   3. 2 → swap with `nums[hi]`, `hi--`; **don't** advance `mid` — the value that came from `hi` hasn't been examined.
3. Stop when `mid > hi`.

**Dry run** `[2, 0, 2, 1, 1, 0]`:

| lo | mid | hi | nums[mid] | action | array |
|---|---|---|---|---|---|
| 0 | 0 | 5 | 2 | swap with hi | 0 0 2 1 1 2 |
| 0 | 0 | 4 | 0 | swap lo | 0 0 2 1 1 2 |
| 1 | 1 | 4 | 0 | swap lo | 0 0 2 1 1 2 |
| 2 | 2 | 4 | 2 | swap with hi | 0 0 1 1 2 2 |
| 2 | 2 | 3 | 1 | mid++ | |
| 2 | 3 | 3 | 1 | mid++ → stop | **0 0 1 1 2 2** |

## intersection-of-two-arrays-ii

### Walkthrough
**Goal:** multiset intersection — each common value appears min(countA, countB) times.

1. Count the smaller array into a hash map (less memory).
2. Walk the larger array: for each x with a remaining count > 0, output x and decrement the count.
3. Decrementing ensures x is emitted no more times than it appears in the smaller array.

**Dry run** `a = [4, 9, 5]`, `b = [9, 4, 9, 8, 4]`: counts from a = {4:1, 9:1, 5:1}.

| x in b | count before | output? | count after |
|---|---|---|---|
| 9 | 1 | yes | 0 |
| 4 | 1 | yes | 0 |
| 9 | 0 | no | 0 |
| 8 | — | no | — |
| 4 | 0 | no | 0 |

Result **[9, 4]**.
