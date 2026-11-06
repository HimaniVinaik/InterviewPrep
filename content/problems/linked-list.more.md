## reverse-linked-list

### Walkthrough
**Goal:** flip every `next` pointer in one pass with O(1) memory.

1. `prev = nullptr` (the new tail points to nothing), `cur = head`.
2. Loop while `cur`:
   1. `next = cur->next` — save the rest of the list **before** we overwrite the link.
   2. `cur->next = prev` — flip.
   3. `prev = cur` — prev advances.
   4. `cur = next` — cur advances.
3. When `cur` is null, `prev` is the old tail = new head.

**Dry run** `1 → 2 → 3 → null`:

| step | prev | cur | next | links after flip |
|---|---|---|---|---|
| 1 | null | 1 | 2 | 1→null |
| 2 | 1 | 2 | 3 | 2→1→null |
| 3 | 2 | 3 | null | 3→2→1→null |
| end | 3 | null | — | return 3 |

**Common bug:** doing `cur->next = prev` before saving `next` — you lose the rest of the list.

## merge-two-sorted-lists

### Walkthrough
**Goal:** splice nodes from both lists in sorted order, no allocation.

1. Stack-allocated `dummy` node; `tail = &dummy`. The dummy removes the "is the result empty?" special case.
2. While both lists have nodes, pick the smaller head (`<=` keeps it stable), attach it to `tail`, advance that list and `tail`.
3. One list ran out → attach the remainder of the other in O(1) (it's already sorted).
4. Return `dummy.next`.

**Dry run** `a = 1→2→4`, `b = 1→3→4`:

| a head | b head | pick | result so far |
|---|---|---|---|
| 1 | 1 | a(1) | 1 |
| 2 | 1 | b(1) | 1→1 |
| 2 | 3 | a(2) | 1→1→2 |
| 4 | 3 | b(3) | …→3 |
| 4 | 4 | a(4) | …→4 |
| null | 4 | attach b | 1→1→2→3→4→4 |

## linked-list-cycle

### Walkthrough
**Goal:** detect a cycle with O(1) memory — Floyd's tortoise and hare.

1. `slow` moves 1 step, `fast` moves 2 steps.
2. No cycle → `fast` reaches `nullptr` → false.
3. Cycle → once both are inside it, the gap between them changes by 1 each step (fast gains one node), so after at most "cycle length" steps they meet → true.

**Dry run** `3 → 2 → 0 → −4 → (back to 2)`:

| step | slow | fast |
|---|---|---|
| 0 | 3 | 3 |
| 1 | 2 | 0 |
| 2 | 0 | 2 |
| 3 | −4 | −4 → **meet** |

**Follow-up (cycle start, LC 142):** after meeting, move one pointer to `head`; advance both by 1; they meet at the cycle entrance. Proof: if the tail length is a and they met b steps into the cycle of length c, then a ≡ c − b (mod c).

## reorder-list

### Walkthrough
**Goal:** `L0 → Ln → L1 → Ln−1 → …` in place with O(1) memory, by combining three primitives.

1. **Find the middle** with slow/fast (`fast` starts at `head->next`, so `slow` ends at the last node of the first half).
2. **Cut and reverse** the second half: `second = slow->next; slow->next = nullptr;` then reverse `second`.
3. **Interleave** the first half and the reversed second half, one node from each.

**Dry run** `1→2→3→4→5`:

- Middle: slow stops at 3 → first half `1→2→3`, second `4→5`.
- Reverse second: `5→4`.
- Interleave:

| a | b | links created | list so far |
|---|---|---|---|
| 1 | 5 | 1→5, 5→2 | 1→5→2→3 |
| 2 | 4 | 2→4, 4→3 | 1→5→2→4→3 |
| 3 | null | stop | 1→5→2→4→3 |

## remove-nth-node-from-end-of-list

### Walkthrough
**Goal:** one pass, by keeping two pointers exactly `n + 1` nodes apart.

1. `dummy` before `head` (handles deleting the head itself).
2. Move `lead` `n + 1` steps from the dummy.
3. Move `lead` and `lag` together until `lead` is null. Now `lag` sits right **before** the node to delete.
4. Unlink: `lag->next = lag->next->next`.

**Dry run** `1→2→3→4→5`, `n = 2` (remove 4). Positions: D=dummy.

| phase | lag | lead |
|---|---|---|
| after n+1 = 3 steps | D | 3 |
| step | 1 | 4 |
| step | 2 | 5 |
| step | 3 | null → stop |

`lag = 3` → `3->next = 5` → `1→2→3→5`.

## copy-list-with-random-pointer

### Walkthrough
**Goal:** O(1) extra space by storing the original→copy mapping *inside the list*.

1. **Interleave:** after each original node insert its copy: `A → A' → B → B' → …`. Now `copy(X) = X->next`.
2. **Wire randoms:** for each original `X`, `X'->random = X->random ? X->random->next : null` (the copy of the random target sits right after it).
3. **Unweave:** restore originals' `next` and link copies together.

**Dry run** `A(random→C) → B(random→null) → C(random→A)`:

| step | list / pointers |
|---|---|
| interleave | A → A' → B → B' → C → C' |
| A'.random | A.random = C → C.next = C' |
| B'.random | null |
| C'.random | C.random = A → A.next = A' |
| unweave | originals: A→B→C, copies: A'→B'→C' |

## add-two-numbers

### Walkthrough
**Goal:** grade-school addition, least significant digit first (the lists are already reversed).

1. `dummy` + `tail`, `carry = 0`.
2. Loop while either list has digits **or** `carry` is non-zero.
3. `sum = carry` + the digit from `a` + the digit from `b` (a missing digit counts as 0).
4. New node with `sum % 10`; `carry = sum / 10`.
5. Advance whichever lists still have nodes.

**Dry run** `2→4→3` (342) + `5→6→4` (465):

| a | b | carry in | sum | digit | carry out |
|---|---|---|---|---|---|
| 2 | 5 | 0 | 7 | 7 | 0 |
| 4 | 6 | 0 | 10 | 0 | 1 |
| 3 | 4 | 1 | 8 | 8 | 0 |

Result `7→0→8` (807). For `9→9` + `1`: digits 0, 0 and the final carry creates a third node `1` → `0→0→1` (100).

## find-the-duplicate-number

### Walkthrough
**Goal:** treat the array as a linked list `i → nums[i]` and find the cycle entrance.

1. Values are in `[1, n]` and there are `n + 1` of them, so following `i → nums[i]` from index 0 never leaves the array.
2. Two indices point to the duplicate value → that node has two incoming edges → it's where the "tail" joins the cycle.
3. **Phase 1:** slow = `nums[slow]`, fast = `nums[nums[fast]]` until they meet (inside the cycle).
4. **Phase 2:** reset slow to 0; move both one step at a time; they meet at the entrance = the duplicate.

**Dry run** `nums = [1, 3, 4, 2, 2]` (edges: 0→1, 1→3, 3→2, 2→4, 4→2):

Phase 1:

| slow | fast |
|---|---|
| 1 | 3 |
| 3 | 4 |
| 2 | 4 |
| 4 | 4 → meet |

Phase 2: slow=0, fast=4 → (1, 2) → (3, 4) → (2, 2) → **duplicate 2**.

## lru-cache

### Walkthrough
**Goal:** O(1) lookup **and** O(1) "mark as most recent" **and** O(1) eviction of the oldest.

1. A **hash map** gives O(1) lookup key → list node.
2. A **doubly linked list** keeps recency order: front = most recent, back = least recent. Moving a node to the front or removing the back is O(1) when you already hold the node.
3. `get(key)`: miss → −1. Hit → move the node to the front (`splice`), return its value.
4. `put(key, value)`: existing key → update and move to front. New key at capacity → erase the back node and its map entry, then insert at the front.

**Dry run** capacity 2:

| op | list (front→back) | returns |
|---|---|---|
| put(1,1) | [1] | |
| put(2,2) | [2, 1] | |
| get(1) | [1, 2] | 1 |
| put(3,3) | evict 2 → [3, 1] | |
| get(2) | [3, 1] | −1 |
| put(4,4) | evict 1 → [4, 3] | |
| get(1) | | −1 |
| get(3) | [3, 4] | 3 |

## merge-k-sorted-lists

### Walkthrough
**Goal:** always take the globally smallest head among k lists.

1. Push every non-empty list's head into a **min-heap** (comparator `a->val > b->val` because `priority_queue` is a max-heap by default).
2. Pop the smallest node, append it to the result.
3. If that node has a `next`, push it — it's now that list's head.
4. Repeat until the heap is empty. The heap never holds more than k nodes.

**Dry run** lists `[1→4→5, 1→3→4, 2→6]` (heap contents shown as values):

| heap | pop | push | result |
|---|---|---|---|
| {1,1,2} | 1 (list A) | 4 | 1 |
| {1,2,4} | 1 (list B) | 3 | 1,1 |
| {2,3,4} | 2 (C) | 6 | 1,1,2 |
| {3,4,6} | 3 (B) | 4 | …,3 |
| {4,4,6} | 4 (A) | 5 | …,4 |
| {4,5,6} | 4 (B) | — | …,4 |
| {5,6} | 5, then 6 | — | 1,1,2,3,4,4,5,6 |

## reverse-nodes-in-k-group

### Walkthrough
**Goal:** reverse each full block of k nodes in place, leave the remainder.

1. `dummy → head`; `groupPrev = &dummy` (node before the current group).
2. Find `kth`: walk k steps from `groupPrev`. If we fall off the list, stop — fewer than k nodes remain.
3. `groupNext = kth->next` (first node after the group).
4. Reverse the group with `prev = groupNext` as the initial "null" — so the reversed group's tail automatically points to `groupNext`.
5. Reconnect: `groupPrev->next = kth` (new group head). The old first node is now the group's tail → becomes the next `groupPrev`.

**Dry run** `1→2→3→4→5`, `k = 2`:

| groupPrev | kth | groupNext | after reversing | list |
|---|---|---|---|---|
| D | 2 | 3 | 2→1→3 | D→2→1→3→4→5 |
| 1 | 4 | 5 | 4→3→5 | 2→1→4→3→5 |
| 3 | (walk hits null) | — | stop | **2→1→4→3→5** |
