## reverse-linked-list
### Complexity
**Time, step by step**
1. The loop advances `head` once per node: n iterations.
2. Each iteration does 4 pointer assignments → O(1).
3. Total: **O(n)**.

**Space:** `prev`, `next` → **O(1)**. The recursive version uses O(n) stack frames — for a 10⁶-node list that can overflow a typical 1–8 MB stack.

## merge-two-sorted-lists
### Complexity
**Time, step by step** (m, n = list lengths)
1. Each iteration of the main loop attaches exactly one node and advances one list: at most m + n − 1 iterations.
2. Attaching the remainder: O(1) (a single pointer assignment, regardless of its length).
3. Total: **O(m + n)**.

**Space:** a stack-allocated dummy node + `tail` → **O(1)**. No new nodes are allocated; existing ones are relinked.

## linked-list-cycle
### Complexity
**Time, step by step**
1. **No cycle:** fast reaches null after ⌈n/2⌉ iterations → O(n).
2. **Cycle** with tail length a and cycle length c: slow enters the cycle after a steps. Once both are inside, the gap shrinks by 1 per step, so they meet within c more steps.
3. Total: a + c ≤ n iterations → **O(n)**.

**Space:** two pointers → **O(1)**. (The hash-set approach is O(n) space.)

## reorder-list
### Complexity
**Time, step by step**
1. Finding the middle (fast moves 2, slow moves 1): ~n/2 iterations → O(n).
2. Reversing the second half: n/2 nodes → O(n).
3. Interleaving: n/2 iterations → O(n).
4. Total: **O(n)** (three linear passes).

**Space:** a constant number of pointers → **O(1)**. The array approach is O(n).

## remove-nth-node-from-end-of-list
### Complexity
**Time, step by step**
1. Advancing `lead` n + 1 steps: O(n).
2. Moving both pointers until `lead` is null: L − n steps for list length L.
3. Unlinking + `delete`: O(1).
4. Total: L + 1 steps → **O(L)**, in a single pass.

**Space:** dummy node + two pointers → **O(1)**.

## copy-list-with-random-pointer
### Complexity
**Time, step by step** (n nodes)
1. Interleave copies: one pass, one `new` per node → O(n).
2. Wire `random`: one pass, O(1) per node → O(n).
3. Unweave: one pass → O(n).
4. Total: 3 passes → **O(n)**.

**Space, step by step**
- The n copied nodes are the output (not counted).
- Extra: a few pointers → **O(1)**. The hash-map approach needs O(n) for the map.

## add-two-numbers
### Complexity
**Time, step by step** (m, n = lengths)
1. The loop runs once per digit position: max(m, n) times, plus one more if a final carry remains.
2. Each iteration: an addition, a division, a modulo, one `new` → O(1).
3. Total: **O(max(m, n))**.

**Space:**
- Result list: max(m, n) + 1 nodes (output).
- Extra: `carry`, `tail` → **O(1)**.

## find-the-duplicate-number
### Complexity
**Time, step by step**
1. Phase 1 (meeting inside the cycle): the tail plus at most one cycle length → O(n) steps.
2. Phase 2 (finding the entrance): at most the tail length a ≤ n → O(n) steps.
3. Each step is one or two array reads → O(1).
4. Total: **O(n)**.

**Space:** two integer "pointers" → **O(1)**, and the array is never modified — the two constraints that make this problem hard.

## lru-cache
### Complexity
**Time, per operation**
- `get`: hash lookup average O(1) + `splice` O(1) (relinks one node, no copying) → **O(1)** average.
- `put` (update): lookup + value write + splice → **O(1)**.
- `put` (insert at capacity): erase from the map O(1) + `pop_back` O(1) + `emplace_front` O(1) + map insert O(1) → **O(1)** average.

**Space, step by step**
- List: up to `capacity` nodes, each holding key + value + two pointers.
- Map: up to `capacity` entries (key + list iterator).
- Total: **O(capacity)**.

**Note:** "O(1)" is average-case because of hashing; the linked-list operations are worst-case O(1).

## merge-k-sorted-lists
### Complexity
**Time, step by step** (N = total nodes, k = number of lists)
1. Initial heap of ≤ k heads: k pushes → O(k log k).
2. Every node is pushed once and popped once: N × O(log k) per heap operation.
3. Total: **O(N log k)**.

**Space:** the heap holds at most k pointers → **O(k)**. No new nodes.

**Comparison:** divide and conquer is also O(N log k) with O(1) extra; merging one by one is O(N·k).

## reverse-nodes-in-k-group
### Complexity
**Time, step by step**
1. For each group, finding `kth` walks k nodes: O(k).
2. Reversing the group: k nodes → O(k).
3. There are ⌊n/k⌋ full groups, plus one final probe of < k nodes.
4. Total: each node is visited about twice → **O(n)**.

**Space:** a constant number of pointers → **O(1)**. The recursive version uses O(n/k) stack frames.
