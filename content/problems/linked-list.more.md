## reverse-linked-list

### Approach 1: Copy values to a vector, write them back reversed
```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        vector<int> vals;
        for (ListNode* p = head; p; p = p->next) vals.push_back(p->val);
        for (ListNode* p = head; p; p = p->next) { p->val = vals.back(); vals.pop_back(); }
        return head;
    }
};
```

**Time:** O(n) · **Space:** O(n). Reverses *values*, not links — interviewers usually reject it, but it's a valid starting point.

### Approach 2: Recursive
```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        if (!head || !head->next) return head;        // 0 or 1 node: already reversed
        ListNode* newHead = reverseList(head->next);  // reverse the rest
        head->next->next = head;                      // the node after head points back
        head->next = nullptr;                         // head becomes the tail
        return newHead;
    }
};
```

**Time:** O(n) · **Space:** O(n) call stack — risky for long lists (stack overflow), especially on embedded targets.

### Approach 3: Stack of node pointers
```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        if (!head) return nullptr;
        vector<ListNode*> st;
        for (ListNode* p = head; p; p = p->next) st.push_back(p);
        ListNode* newHead = st.back();
        for (int i = (int)st.size() - 1; i > 0; --i) st[i]->next = st[i - 1];
        st[0]->next = nullptr;
        return newHead;
    }
};
```

**Time:** O(n) · **Space:** O(n). Relinks nodes, but uses memory the iterative version doesn't need.

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

### Approach 1: Recursive
```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
        if (!a) return b;
        if (!b) return a;
        if (a->val <= b->val) { a->next = mergeTwoLists(a->next, b); return a; }
        b->next = mergeTwoLists(a, b->next);
        return b;
    }
};
```

**Time:** O(m + n) · **Space:** O(m + n) recursion. Elegant, but stack depth grows with list length.

### Approach 2: Collect, sort, rebuild (what not to do)
```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
        vector<ListNode*> nodes;
        for (auto* p = a; p; p = p->next) nodes.push_back(p);
        for (auto* p = b; p; p = p->next) nodes.push_back(p);
        stable_sort(nodes.begin(), nodes.end(), [](auto* x, auto* y) { return x->val < y->val; });
        for (size_t i = 0; i + 1 < nodes.size(); ++i) nodes[i]->next = nodes[i + 1];
        if (nodes.empty()) return nullptr;
        nodes.back()->next = nullptr;
        return nodes[0];
    }
};
```

**Time:** O((m+n) log(m+n)) · **Space:** O(m+n). Ignores that inputs are already sorted — useful only as contrast.

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

### Approach 1: Hash set of visited nodes
```cpp
class Solution {
public:
    bool hasCycle(ListNode* head) {
        unordered_set<ListNode*> seen;
        for (ListNode* p = head; p; p = p->next)
            if (!seen.insert(p).second) return true;   // visited this node before
        return false;
    }
};
```

**Time:** O(n) · **Space:** O(n). Stores node *addresses*, not values (values may repeat).

### Approach 2: Mark visited nodes by rewiring (destructive)
```cpp
class Solution {
public:
    bool hasCycle(ListNode* head) {
        ListNode sentinel;
        while (head) {
            if (head->next == &sentinel) return true;   // we've been here
            ListNode* nxt = head->next;
            head->next = &sentinel;                     // mark as visited (destroys the list!)
            head = nxt;
        }
        return false;
    }
};
```

**Time:** O(n) · **Space:** O(1). Destroys the list — only mention it as a "what if you may modify input" idea.

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

### Approach 1: Array of nodes + two pointers
```cpp
class Solution {
public:
    void reorderList(ListNode* head) {
        vector<ListNode*> v;
        for (auto* p = head; p; p = p->next) v.push_back(p);
        int i = 0, j = (int)v.size() - 1;
        while (i < j) {
            v[i]->next = v[j];
            ++i;
            if (i == j) break;
            v[j]->next = v[i];
            --j;
        }
        if (!v.empty()) v[i]->next = nullptr;      // terminate the new tail
    }
};
```

**Time:** O(n) · **Space:** O(n). Easiest to get right.

### Approach 2: Stack for the second half
```cpp
class Solution {
public:
    void reorderList(ListNode* head) {
        stack<ListNode*> st;
        int n = 0;
        for (auto* p = head; p; p = p->next) { st.push(p); ++n; }
        ListNode* cur = head;
        for (int k = 0; k < n / 2; ++k) {           // insert n/2 nodes from the back
            ListNode* last = st.top(); st.pop();
            ListNode* nxt = cur->next;
            cur->next = last;
            last->next = nxt;
            cur = nxt;
        }
        if (cur) cur->next = nullptr;
    }
};
```

**Time:** O(n) · **Space:** O(n).

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

### Approach 1: Two passes (count the length first)
```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        int len = 0;
        for (auto* p = head; p; p = p->next) ++len;
        ListNode dummy(0, head);
        ListNode* prev = &dummy;
        for (int i = 0; i < len - n; ++i) prev = prev->next;   // node before the target
        ListNode* victim = prev->next;
        prev->next = victim->next;
        delete victim;
        return dummy.next;
    }
};
```

**Time:** O(n) (two passes) · **Space:** O(1). Perfectly acceptable; the follow-up asks for one pass.

### Approach 2: Vector of node pointers
```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0, head);
        vector<ListNode*> v{&dummy};
        for (auto* p = head; p; p = p->next) v.push_back(p);
        ListNode* prev = v[v.size() - 1 - n];                 // node before the target
        ListNode* victim = prev->next;
        prev->next = victim->next;
        delete victim;
        return dummy.next;
    }
};
```

**Time:** O(n) · **Space:** O(n).

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

### Approach 1: Hash map original → copy (two passes)
```cpp
class Solution {
public:
    Node* copyRandomList(Node* head) {
        unordered_map<Node*, Node*> copy;
        for (Node* p = head; p; p = p->next) copy[p] = new Node(p->val);
        for (Node* p = head; p; p = p->next) {
            copy[p]->next = p->next ? copy[p->next] : nullptr;
            copy[p]->random = p->random ? copy[p->random] : nullptr;
        }
        return head ? copy[head] : nullptr;
    }
};
```

**Time:** O(n) · **Space:** O(n). Clearest approach — present this first.

### Approach 2: Recursive with memoisation (graph-clone style)
```cpp
class Solution {
    unordered_map<Node*, Node*> memo;
public:
    Node* copyRandomList(Node* p) {
        if (!p) return nullptr;
        if (auto it = memo.find(p); it != memo.end()) return it->second;
        Node* c = new Node(p->val);
        memo[p] = c;                               // register before recursing (cycles via random)
        c->next = copyRandomList(p->next);
        c->random = copyRandomList(p->random);
        return c;
    }
};
```

**Time:** O(n) · **Space:** O(n) + recursion depth O(n). Same as Clone Graph — shows the pattern transfer.

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

### Approach 1: Recursive with carry
```cpp
class Solution {
    ListNode* add(ListNode* a, ListNode* b, int carry) {
        if (!a && !b && !carry) return nullptr;
        int sum = carry + (a ? a->val : 0) + (b ? b->val : 0);
        auto* node = new ListNode(sum % 10);
        node->next = add(a ? a->next : nullptr, b ? b->next : nullptr, sum / 10);
        return node;
    }
public:
    ListNode* addTwoNumbers(ListNode* a, ListNode* b) { return add(a, b, 0); }
};
```

**Time:** O(max(m,n)) · **Space:** O(max(m,n)) recursion.

### Approach 2: Convert to integers (broken — know why)
Converting each list to a `long long`, adding, and converting back fails as soon as a list has more than ~18 digits (the problem allows 100). That's why the digit-by-digit approach exists — mention it to show you considered overflow.

### Walkthrough
**Goal:** grade-school addition, least significant digit first (the lists are already reversed).

1. `dummy` + `tail`, `carry = 0`.
2. Loop while either list has digits **or** `carry` is non-zero.
3. `sum = carry + digitA + digitB` (missing digits count as 0).
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

### Approach 1: Sort a copy
```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        vector<int> v = nums;                       // don't modify the input
        ranges::sort(v);
        for (size_t i = 1; i < v.size(); ++i) if (v[i] == v[i - 1]) return v[i];
        return -1;
    }
};
```

**Time:** O(n log n) · **Space:** O(n).

### Approach 2: Binary search on the value range (pigeonhole)
```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int lo = 1, hi = (int)nums.size() - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            int cnt = 0;
            for (int x : nums) cnt += x <= mid;     // how many values in [1, mid]
            if (cnt > mid) hi = mid;                // too many -> duplicate is in [1, mid]
            else lo = mid + 1;
        }
        return lo;
    }
};
```

**Time:** O(n log n) · **Space:** O(1). Meets the constraints (read-only, O(1) space) without the cycle trick.

### Approach 3: Bit counting
```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int n = nums.size() - 1, ans = 0;
        for (int b = 0; b < 32; ++b) {
            int mask = 1 << b, have = 0, base = 0;
            for (int x : nums) have += (x & mask) != 0;
            for (int i = 1; i <= n; ++i) base += (i & mask) != 0;
            if (have > base) ans |= mask;           // duplicate contributes extra 1s at this bit
        }
        return ans;
    }
};
```

**Time:** O(32 · n) · **Space:** O(1).

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

### Approach 1: Hand-written doubly linked list with sentinels
```cpp
class LRUCache {
    struct Node { int key, val; Node *prev, *next; };
    int cap;
    unordered_map<int, Node*> pos;
    Node head{0, 0, nullptr, nullptr}, tail{0, 0, nullptr, nullptr};   // sentinels
    void unlink(Node* n) { n->prev->next = n->next; n->next->prev = n->prev; }
    void pushFront(Node* n) { n->next = head.next; n->prev = &head; head.next->prev = n; head.next = n; }
public:
    explicit LRUCache(int capacity) : cap(capacity) { head.next = &tail; tail.prev = &head; }
    ~LRUCache() { for (Node* n = head.next; n != &tail; ) { Node* nx = n->next; delete n; n = nx; } }
    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) return -1;
        unlink(it->second); pushFront(it->second);
        return it->second->val;
    }
    void put(int key, int value) {
        if (auto it = pos.find(key); it != pos.end()) {
            it->second->val = value; unlink(it->second); pushFront(it->second); return;
        }
        if ((int)pos.size() == cap) {                     // evict least recent (before tail)
            Node* lru = tail.prev;
            unlink(lru); pos.erase(lru->key); delete lru;
        }
        Node* n = new Node{key, value, nullptr, nullptr};
        pushFront(n); pos[key] = n;
    }
};
```

**Time:** O(1) per op · **Space:** O(capacity). What many interviewers actually want: raw pointer manipulation with sentinel nodes (no null checks).

### Approach 2: Timestamps + ordered map (O(log n))
```cpp
class LRUCache {
    int cap, clock = 0;
    unordered_map<int, pair<int, int>> kv;   // key -> (value, last-used time)
    map<int, int> byTime;                    // time -> key (oldest first)
public:
    explicit LRUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        auto it = kv.find(key);
        if (it == kv.end()) return -1;
        byTime.erase(it->second.second);
        it->second.second = ++clock;
        byTime[clock] = key;
        return it->second.first;
    }
    void put(int key, int value) {
        if (get(key) != -1) { kv[key].first = value; return; }   // get() refreshed recency
        if ((int)kv.size() == cap) {
            auto oldest = byTime.begin();
            kv.erase(oldest->second);
            byTime.erase(oldest);
        }
        kv[key] = {value, ++clock};
        byTime[clock] = key;
    }
};
```

**Time:** O(log n) · **Space:** O(n). Simpler to reason about; easily extended to LFU-style policies.

### Walkthrough
**Goal:** O(1) lookup **and** O(1) "mark as most recent" **and** O(1) eviction of the oldest.

1. A **hash map** gives O(1) lookup key → list node.
2. A **doubly linked list** keeps recency order: front = most recent, back = least recent. Moving a node to the front or removing the back is O(1) when you already hold the node.
3. `get(key)`: miss → −1. Hit → move the node to the front (`splice`), return its value.
4. `put(key, val)`: existing key → update and move to front. New key at capacity → erase the back node and its map entry, then insert at the front.

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

### Approach 1: Collect all values, sort, rebuild
```cpp
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        vector<ListNode*> nodes;
        for (auto* l : lists) for (auto* p = l; p; p = p->next) nodes.push_back(p);
        ranges::sort(nodes, {}, [](ListNode* n) { return n->val; });
        ListNode dummy; ListNode* t = &dummy;
        for (auto* n : nodes) { t->next = n; t = n; }
        t->next = nullptr;
        return dummy.next;
    }
};
```

**Time:** O(N log N) · **Space:** O(N).

### Approach 2: Divide and conquer (pairwise merging)
```cpp
class Solution {
    ListNode* merge2(ListNode* a, ListNode* b) {
        ListNode d; ListNode* t = &d;
        while (a && b) {
            ListNode*& s = a->val <= b->val ? a : b;
            t->next = s; t = s; s = s->next;
        }
        t->next = a ? a : b;
        return d.next;
    }
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        if (lists.empty()) return nullptr;
        for (size_t step = 1; step < lists.size(); step *= 2)          // like bottom-up merge sort
            for (size_t i = 0; i + step < lists.size(); i += 2 * step)
                lists[i] = merge2(lists[i], lists[i + step]);
        return lists[0];
    }
};
```

**Time:** O(N log k) · **Space:** O(1). Same complexity as the heap, no heap needed.

### Approach 3: Merge one by one
Merging list 1 with 2, then the result with 3, … costs O(N·k) — each node gets re-walked up to k times. Mention it as the naive version.

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

### Approach 1: Recursive
```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode* p = head;
        for (int i = 0; i < k; ++i) { if (!p) return head; p = p->next; }   // fewer than k: keep
        ListNode* prev = reverseKGroup(p, k);        // already-processed rest of the list
        ListNode* cur = head;
        for (int i = 0; i < k; ++i) {                // reverse this group onto `prev`
            ListNode* nxt = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nxt;
        }
        return prev;
    }
};
```

**Time:** O(n) · **Space:** O(n/k) recursion. Shortest correct version.

### Approach 2: Collect a group into an array, relink
```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* prevTail = &dummy;
        vector<ListNode*> grp;
        while (true) {
            grp.clear();
            ListNode* p = prevTail->next;
            while (p && (int)grp.size() < k) { grp.push_back(p); p = p->next; }
            if ((int)grp.size() < k) break;
            for (int i = k - 1; i > 0; --i) grp[i]->next = grp[i - 1];   // reverse links
            grp[0]->next = p;                                             // old head -> next group
            prevTail->next = grp[k - 1];
            prevTail = grp[0];
        }
        return dummy.next;
    }
};
```

**Time:** O(n) · **Space:** O(k). Easier to visualise.

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
