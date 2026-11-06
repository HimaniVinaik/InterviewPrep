## memcpy-memmove

### Walkthrough
**Goal:** copy n bytes; `memmove` must also work when source and destination overlap.

1. Treat memory as `unsigned char` — the one type allowed to read any object's bytes.
2. **memcpy:** copy forward byte by byte. `restrict` tells the compiler the regions don't overlap, allowing vectorisation.
3. **memmove** — pick the direction so we never overwrite unread source bytes:
   1. `dst < src`: copying forward reads each byte before the write position reaches it → forward is safe.
   2. `dst > src` and overlapping: a forward copy would overwrite source bytes before reading them → copy **backward** from the end.

**Dry run** (overlap) buffer `A B C D E`, `memmove(buf + 1, buf, 4)` — shift right by one:

| step (backward) | write | buffer |
|---|---|---|
| 1 | buf[4] = buf[3] (D) | A B C D D |
| 2 | buf[3] = buf[2] (C) | A B C C D |
| 3 | buf[2] = buf[1] (B) | A B B C D |
| 4 | buf[1] = buf[0] (A) | A A B C D ✔ |

A forward copy would produce `A A A A A` — every write clobbers the next byte to be read.

## strlen-strcpy-strcmp

### Walkthrough
**Goal:** implement the three core NUL-terminated string routines.

1. **strlen:** advance a pointer until it hits `'\0'`; the length is the pointer difference `p − s`.
2. **strcpy:** `while ((*dst++ = *src++) != '\0')` — the assignment's value is the copied char, so the loop copies the terminator and then stops.
3. **strcmp:** advance while both strings have the same non-NUL character; return the difference of the first differing characters **as `unsigned char`**.

**Dry run** `strcmp("cat", "car")`:

| i | a[i] | b[i] | equal? |
|---|---|---|---|
| 0 | c | c | yes |
| 1 | a | a | yes |
| 2 | t (116) | r (114) | no → return 2 (> 0: "cat" sorts after "car") |

**Signedness trap:** with `char` signed (x86), `'\xE9'` (é) is negative and would sort *before* `'a'` unless cast to `unsigned char`.

## string-to-integer-atoi

### Walkthrough
**Goal:** parse an integer like C's `atoi`, but clamp instead of overflowing.

1. Skip leading spaces.
2. Read an optional sign.
3. Read digits; stop at the first non-digit.
4. **Before** `r = r·10 + d`, check `r > (INT_MAX − d) / 10` — if true, the result would exceed INT_MAX → return INT_MAX (or INT_MIN for negatives; clamping the magnitude at INT_MAX + 1 gives exactly INT_MIN).
5. Apply the sign.

**Dry run** `"   -42abc"`:

| i | char | action | r |
|---|---|---|---|
| 0–2 | spaces | skip | 0 |
| 3 | − | sign = −1 | 0 |
| 4 | 4 | r = 4 | 4 |
| 5 | 2 | r = 42 | 42 |
| 6 | a | stop | → **−42** |

`"91283472332"` → overflow detected at r = 912834723 with d = 3 → **INT_MAX**.

## bit-macros-registers

### Walkthrough
**Goal:** safe, readable bit operations on memory-mapped registers.

1. `BIT(n)` = `1UL << n` — unsigned so shifting into bit 31 is defined.
2. **Set:** `r |= mask` turns the mask's bits on, leaves others unchanged.
3. **Clear:** `r &= ~mask` turns them off.
4. **Toggle:** `r ^= mask` flips them.
5. **Test:** `(r >> n) & 1`.
6. **Multi-bit field:** build `mask = ones << pos`, clear the field with `reg & ~mask`, then OR in `(val << pos) & mask`.
7. Access hardware through a `volatile` pointer so every read/write really happens (e.g. the busy-wait on a ready flag).

**Dry run** writing value 0b101 into a 3-bit field at position 4 of `reg = 0xFF`:

| step | expression | result (binary) |
|---|---|---|
| mask | 0b111 << 4 | 0111 0000 |
| clear field | 0xFF & ~mask | 1000 1111 |
| place value | (0b101 << 4) & mask | 0101 0000 |
| combine | OR | **1101 1111** = 0xDF |

## design-circular-queue

### Walkthrough
**Goal:** fixed-capacity FIFO with O(1) operations and no allocation (the embedded ring buffer).

1. Capacity is a **power of two**, so `index & (SIZE − 1)` replaces the slower `% SIZE`.
2. `head` and `tail` are **free-running** counters that only ever increase; `head − tail` (unsigned) is the element count even after the 32-bit counters wrap around.
3. **push (ISR):** full if `head − tail == SIZE`. Write the byte, then *publish* by storing `head + 1` with release ordering.
4. **pop (main loop):** empty if `head == tail`. Read the byte, then store `tail + 1`.
5. Each index has exactly one writer → lock-free for a single producer and single consumer.

**Dry run** SIZE = 4:

| op | head | tail | count | slot used |
|---|---|---|---|---|
| push A | 1 | 0 | 1 | 0 |
| push B | 2 | 0 | 2 | 1 |
| pop → A | 2 | 1 | 1 | 0 |
| push C, D, E | 5 | 1 | 4 (full) | 2, 3, 0 (wrapped) |
| push F | — | — | full → false | |

## endianness

### Walkthrough
**Goal:** detect byte order, swap bytes, and parse big-endian data portably.

1. **Detect:** store `uint32_t x = 1` and inspect its first byte in memory (via `memcpy`). Little-endian stores the least significant byte first → that byte is 1.
2. **Swap:** move each byte to the mirrored position with shifts and masks.
3. **Parse wire data:** build the value from bytes with shifts. Shifts operate on *values*, not memory, so this works on any host endianness and any alignment.

**Dry run** `bswap32(0x12345678)`:

| term | value |
|---|---|
| x >> 24 | 0x00000012 |
| (x >> 8) & 0x0000FF00 | 0x00003400 |
| (x << 8) & 0x00FF0000 | 0x00560000 |
| x << 24 | 0x78000000 |
| OR | **0x78563412** |

Bytes `{0x12, 0x34, 0x56, 0x78}` read with `read_be32` → `0x12345678` on every machine.

## reverse-words-in-a-string

### Walkthrough
**Goal:** reverse word order, collapse spaces, O(1) extra memory.

1. Reverse the entire string → the words are in the right order, but each word is spelled backwards.
2. Scan with a read pointer `i` and a write pointer `w`:
   1. Skip spaces.
   2. Before each word except the first, write one space.
   3. Copy the word's characters to `w`, then reverse that copied segment to fix its spelling.
3. Truncate the string at `w` (removes trailing spaces and leftovers).

**Dry run** `"  the sky  "`:

| step | string |
|---|---|
| reverse all | `"  yks eht  "` |
| copy "yks" → reverse | `"sky"…` |
| add space, copy "eht" → reverse | `"sky the"…` |
| resize to w | **`"sky the"`** |

## aligned-malloc

### Walkthrough
**Goal:** return memory aligned to `align` (a power of two) using only `malloc`, and free it correctly later.

1. Over-allocate `size + align − 1 + sizeof(void*)`: enough slack to slide forward to an aligned address *and* room to store the original pointer.
2. Start just after the pointer slot: `start = raw + sizeof(void*)`.
3. Round up: `aligned = (start + align − 1) & ~(align − 1)` — adding `align − 1` then clearing the low bits rounds up to a multiple of `align`.
4. Store `raw` at `aligned − sizeof(void*)` so `aligned_free` can find it.
5. `aligned_free(p)`: read the stashed pointer and `free` it.

**Dry run** `align = 64`, `malloc` returns `raw = 0x1008`, 8-byte pointers:

| step | value |
|---|---|
| start = raw + 8 | 0x1010 |
| start + 63 | 0x104F |
| & ~63 | **0x1040** (aligned) |
| stash raw at | 0x1038 |

## debounce-button

### Walkthrough
**Goal:** report a clean press even though the contact chatters for several milliseconds.

1. Sample the pin every 1 ms from a timer.
2. Shift each sample into a 16-bit history: `history = (history << 1) | raw`.
3. If all 16 bits are 1 (`0xFFFF`), the button has been solidly high for 16 ms → stable = pressed. All 0 → stable = released. Anything mixed → keep the previous state.
4. Report a *press event* when the stable state changes from released to pressed.

**Dry run** (8-bit history for brevity; 1 = pressed):

| ms | raw | history | stable | event |
|---|---|---|---|---|
| 0 | 1 | 00000001 | released | |
| 1 | 0 | 00000010 | released | (bounce) |
| 2 | 1 | 00000101 | released | |
| 3–9 | 1 | … 11111111 | **pressed** at ms 9 | **press** |

## memory-pool

### Walkthrough
**Goal:** O(1), fragmentation-free allocation of fixed-size blocks from a static array.

1. Each block is a `union` of "next free pointer" and "payload bytes" — free blocks store the list link *inside themselves*, so there's no metadata overhead.
2. **init:** link block 0 → 1 → … → N−1 → NULL; `free_list` points at block 0.
3. **alloc:** pop the head of the free list (`free_list = head->next`), return the head. Empty list → NULL.
4. **free:** push the block back: `b->next = free_list; free_list = b`.
5. Protect alloc/free with a critical section if ISRs or multiple tasks use the pool.

**Dry run** (4 blocks):

| op | free list | returned |
|---|---|---|
| init | B0 → B1 → B2 → B3 | |
| alloc | B1 → B2 → B3 | B0 |
| alloc | B2 → B3 | B1 |
| free(B0) | B0 → B2 → B3 | |
| alloc | B2 → B3 | B0 (LIFO reuse, cache-warm) |
