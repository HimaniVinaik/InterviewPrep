## contains-duplicate
### Complexity
**Time, step by step** (n = number of elements)
1. `seen.reserve(n)` — allocates the bucket array once: O(n).
2. Loop runs at most n times.
3. Each `insert` hashes the int (O(1)) and probes one bucket: **average O(1)**, worst case O(n) if many keys collide.
4. Total: n × O(1) = **O(n) average**, O(n²) worst case (adversarial collisions).

**Space, step by step**
- The set stores up to n distinct values → **O(n)**.
- Loop variables: O(1).

**Can we do better?** O(1) extra space is possible by sorting in place (O(n log n) time). Any comparison-based approach needs Ω(n log n) time for element distinctness, so hashing's O(n) relies on hashing, not comparisons.

## valid-anagram
### Complexity
**Time, step by step** (n = length of s)
1. Length check: O(1) (`size()` is stored).
2. One loop over n indices, two array updates each: O(n).
3. `all_of` over 26 counters: O(26) = O(1).
4. Total: **O(n)**.

**Space, step by step**
- `array<int, 26>`: 104 bytes regardless of n → **O(1)**.
- Strings are passed by value (copies) on LeetCode's signature: O(n) — use `const string&` in real code to avoid that.

**Can we do better?** No: every character must be read at least once, so Ω(n).

## two-sum
### Complexity
**Time, step by step**
1. Loop over n elements.
2. Per element: one subtraction O(1), one `find` average O(1), one insert average O(1) (amortised — the table occasionally rehashes, O(n) once, spread over many inserts).
3. Total: **O(n) average**.

**Space, step by step**
- Hash map holds at most n−1 entries before the answer is found → **O(n)**.

**Trade-off:** sorting + two pointers uses O(n log n) time and O(n) for the index array; brute force uses O(n²) time and O(1) space. Hashing trades memory for speed.

## group-anagrams
### Complexity
**Time, step by step** (n words, maximum length k)
1. For each word: count letters O(k); build the key from 26 counts O(26); hash the key O(key length) = O(26·digits) = O(1) w.r.t. n and k… plus moving the word in O(1).
2. Per word: O(k + 26) → O(k).
3. Building the output: moving n strings O(n).
4. Total: **O(n·k)**.

**Space, step by step**
- The map stores every word once (moved, not copied) → O(n·k).
- Keys: one per group, each O(26) characters → O(n) in the worst case.
- Total: **O(n·k)**.

**Comparison:** the sorted-string key costs O(k log k) per word → O(n·k log k).

## top-k-frequent-elements
### Complexity
**Time, step by step** (n elements, m distinct)
1. Counting into the hash map: n average-O(1) updates → O(n).
2. Creating n + 1 buckets: O(n).
3. Distributing m distinct values into buckets: O(m) ≤ O(n).
4. Scanning buckets from n down to 1: O(n) bucket visits + O(k) values collected.
5. Total: **O(n)**.

**Space, step by step**
- Frequency map: O(m).
- Buckets: n + 1 vectors + m stored values → O(n).
- Output: O(k).
- Total: **O(n)**.

**Comparison:** heap version is O(n + m log k) time, O(m + k) space; sorting is O(n + m log m).

## product-of-array-except-self
### Complexity
**Time, step by step**
1. `ans(n, 1)`: O(n) initialisation.
2. Prefix pass: n iterations × O(1).
3. Suffix pass: n iterations × O(1).
4. Total: 3n → **O(n)**.

**Space, step by step**
- Output array: O(n) but **not counted** (the problem says the output doesn't count).
- `prefix`, `suffix`, loop index: O(1).
- Total extra: **O(1)**.

**Why not O(1) total?** The answer itself has n numbers, so Ω(n) memory is unavoidable for the output.

## valid-sudoku
### Complexity
**Time, step by step**
1. Exactly 81 cells are visited.
2. Each visit: a few divisions, one OR, one AND, three ORs — O(1).
3. Total: 81 × O(1) = **O(1)** (constant, because the board size is fixed).

If generalised to an N×N board with √N×√N boxes: **O(N²)**.

**Space, step by step**
- 27 `uint16_t` masks = 54 bytes → **O(1)**.
- Generalised: O(N) masks of N bits → O(N²) bits.

## encode-and-decode-strings
### Complexity
**Time, step by step** (L = total characters across all strings, n = number of strings)
1. **Encode:** for each string, `to_string(size)` O(digits) + append payload O(len). Sum over strings: O(L + n·log₁₀(maxLen)) → **O(L + n)**.
2. **Decode:** each `find('#')` scans only the digits of one length prefix; `stoul` parses those digits; `substr` copies the payload. Every character is touched a constant number of times → **O(L + n)**.

**Space, step by step**
- Encoded string: L characters + n length prefixes → O(L + n).
- Decoded output: O(L).
- Extra working space (temporary `substr` of the digits): O(log maxLen).

## longest-consecutive-sequence
### Complexity
**Time, step by step**
1. Building the set from n numbers: n inserts, average O(1) each → O(n).
2. Outer loop over the set: ≤ n iterations, each with one `contains(x − 1)` check → O(n).
3. Inner `while`: runs only for run starts. Across **all** starts, the inner loop visits each number exactly once (each number belongs to exactly one run) → O(n) total, not per start.
4. Total: O(n) + O(n) + O(n) = **O(n) average**.

**Space, step by step**
- Hash set of up to n numbers → **O(n)**.

**Key amortised argument:** a nested loop is not automatically O(n²). Count total work across all iterations, not the worst case of one iteration times n.
