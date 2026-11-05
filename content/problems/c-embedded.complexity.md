## memcpy-memmove
### Complexity
**Time, step by step** (n bytes)
1. `memcpy`: n iterations of one load and one store → O(n).
2. `memmove`: one pointer comparison to choose a direction, then n iterations → O(n).
3. Total: **O(n)**. A word-at-a-time copy is still O(n) but does about n/8 iterations on 64-bit; SIMD versions copy 16–64 bytes per instruction.

**Space:** two pointers → **O(1)**. (The temporary-buffer memmove is O(n) extra and can fail to allocate.)

**Practical note:** for large copies the real bottleneck is memory bandwidth, not instruction count — which is why DMA engines exist on microcontrollers.

## strlen-strcpy-strcmp
### Complexity
**Time** (n = string length):
- `strlen`: scans until `'\0'` → **O(n)**. Calling it inside a loop condition, as in `for (i = 0; i < strlen(s); ++i)`, makes the loop O(n²).
- `strcpy`: copies n + 1 bytes → **O(n)**.
- `strcmp`: stops at the first difference or terminator → **O(min(n₁, n₂))**.

**Space:** **O(1)** for all three.

## string-to-integer-atoi
### Complexity
**Time, step by step**
1. Skipping spaces, the optional sign, and then the digits: each character is examined at most once.
2. Per digit: one overflow check (a division by a constant, which compilers turn into a multiply) and one multiply-add → O(1).
3. Total: **O(n)**.

**Space:** **O(1)**.

## bit-macros-registers
### Complexity
**Time:** every set/clear/toggle/test is a constant number of bit operations → **O(1)**. On ARM Cortex-M a set compiles to a load–OR–store sequence (three instructions); on cores with bit-banding or dedicated set/reset registers (`BSRR`) it's a single store.

**Space:** **O(1)**. Macros and inline functions add no runtime storage; `constexpr` masks fold into immediate operands.

**The busy-wait loop** `while (!TEST_BIT(reg, 17))` is O(time until the hardware sets the flag) — always add a timeout in production code.

## design-circular-queue
### Complexity
**Time:** each push or pop is a bounds check, one array access, an index mask and one atomic store → **O(1)** worst case. There's no allocation or shifting of elements, which is why ring buffers are used in ISRs.

**Space:** the fixed buffer of N bytes plus two 32-bit indices → **O(N)**, decided at compile time.

**Why a power-of-two size:** `idx & (N − 1)` is one instruction; `idx % N` can be a slow division (no hardware divider on Cortex-M0).

## endianness
### Complexity
**Time:**
- Detection: one `memcpy` of 1 byte → **O(1)** (a compile-time constant with C++20 `std::endian`).
- `bswap32`: four shifts, two masks, three ORs → **O(1)** — or a single `REV`/`BSWAP` instruction after optimisation.
- `read_be32`: four loads, three shifts, three ORs → **O(1)**.

**Space:** **O(1)**.

**For a buffer of n words:** converting the whole buffer is O(n) — or zero cost if the data can be consumed in its native order.

## reverse-words-in-a-string
### Complexity
**Time, step by step** (n = length)
1. Reversing the whole string: n/2 swaps → O(n).
2. The compaction scan: read pointer `i` visits every character once → O(n).
3. Reversing each word: the word lengths sum to ≤ n → O(n).
4. `resize`: O(1).
5. Total: **O(n)** (about three passes).

**Space:** in place → **O(1)** extra. The split/join version is O(n) extra for the word list.

## aligned-malloc
### Complexity
**Time:** one `malloc` plus a constant amount of pointer arithmetic → **O(1)** beyond the allocator's own cost. `aligned_free` is one load plus one `free`.

**Space, step by step**
- Overhead per allocation: up to `align − 1` padding bytes + `sizeof(void*)` for the stashed pointer.
- For 64-byte alignment on 64-bit: up to 71 extra bytes per block.
- The byte-offset variant cuts the stash to 1 byte (for align ≤ 256).

## debounce-button
### Complexity
**Time:** each 1 ms tick does one shift, one OR and two comparisons → **O(1)** per tick (only a few instructions). The CPU load is about tick_rate × cost, e.g. 1 kHz × ~10 cycles ≈ 0.01% of a 100 MHz core.

**Space:** 2–3 bytes per button (16-bit history + state) → **O(1)**.

**Latency:** a press is reported after 16 consecutive stable samples = 16 ms with a 1 ms tick — the trade-off between noise immunity and responsiveness.

## memory-pool
### Complexity
**Time:**
- `pool_init`: links all N blocks → **O(N)**, done once at boot.
- `pool_alloc`: pop the free-list head → **O(1)** worst case.
- `pool_free`: push onto the free list → **O(1)** worst case.

Deterministic O(1) is the whole point — general-purpose `malloc` has variable, potentially long execution time.

**Space:**
- N × BLOCK_SIZE bytes of static storage (allocated at link time) + one head pointer.
- **Zero per-block overhead:** the free-list link lives inside the free block itself (the `union`).
- **No external fragmentation:** every block is the same size, so any free block satisfies any request.
