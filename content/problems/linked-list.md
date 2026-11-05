# Linked List

**Recognise it when:** the input is a `ListNode*`. These problems test **raw pointer fluency** — exactly what C/C++ and embedded interviews probe.

**Toolkit**
- **Dummy head** (`ListNode dummy; ListNode* tail = &dummy;`) removes special cases for the first node.
- **Fast/slow pointers** find the middle, detect cycles, find the k-th from the end.
- **Reverse in place** with three pointers: `prev`, `cur`, `next`.
- Draw boxes and arrows! Update pointers in an order that never loses the rest of the list.

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};
```

> **Interview:** In LeetCode, nodes are leaked on purpose. In real C++ code, owning lists would use `std::unique_ptr<Node> next` — but beware: destroying a long `unique_ptr` chain recursively can **overflow the stack**. Write an iterative destructor.

## Reverse Linked List
- difficulty: Easy
- leetcode: 206
- slug: reverse-linked-list

Reverse a singly linked list and return the new head.

### Hint
Walk the list and flip each `next` pointer to point backwards. Save `next` before overwriting it.

### Solution
```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        while (head) {
            ListNode* next = head->next;  // 1. save
            head->next = prev;            // 2. flip
            prev = head;                  // 3. advance prev
            head = next;                  // 4. advance cur
        }
        return prev;
    }
};
```

### Explanation
The order save → flip → advance is the whole trick. Recursive version (O(n) stack):

```cpp
ListNode* reverseList(ListNode* h) {
    if (!h || !h->next) return h;
    ListNode* newHead = reverseList(h->next);
    h->next->next = h;   // the node after h now points back at h
    h->next = nullptr;
    return newHead;
}
```

**Time:** O(n) · **Space:** O(1) iterative

## Merge Two Sorted Lists
- difficulty: Easy
- leetcode: 21
- slug: merge-two-sorted-lists

Merge two sorted lists by splicing their nodes together.

### Hint
Dummy head + tail pointer; always attach the smaller head.

### Solution
```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
        ListNode dummy;                 // lives on the stack — no leak
        ListNode* tail = &dummy;
        while (a && b) {
            ListNode*& smaller = (a->val <= b->val) ? a : b;  // reference to a pointer!
            tail->next = smaller;
            tail = smaller;
            smaller = smaller->next;    // advances a or b
        }
        tail->next = a ? a : b;
        return dummy.next;
    }
};
```

### Explanation
`ListNode*& smaller` is a **reference to a pointer** — advancing it advances whichever list we took from. Using `<=` keeps the merge stable. No allocation: we just relink existing nodes.

**Time:** O(m + n) · **Space:** O(1)

## Linked List Cycle
- difficulty: Easy
- leetcode: 141
- slug: linked-list-cycle

Return `true` if the list has a cycle. O(1) memory.

### Hint
Floyd's tortoise and hare.

### Solution
```cpp
class Solution {
public:
    bool hasCycle(ListNode* head) {
        ListNode *slow = head, *fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) return true;
        }
        return false;
    }
};
```

### Explanation
In a cycle, the fast pointer gains one node per step on the slow one, so it must eventually land on it. Without a cycle, fast hits `nullptr`.

Follow-up (LC 142, cycle start): after they meet, reset one pointer to `head` and move both one step at a time — they meet at the cycle entrance.

Note the declaration `ListNode *slow, *fast` — the `*` binds to each name, a classic C gotcha.

**Time:** O(n) · **Space:** O(1)

## Reorder List
- difficulty: Medium
- leetcode: 143
- slug: reorder-list

Reorder `L0→L1→…→Ln` into `L0→Ln→L1→Ln-1→…` in place.

### Hint
Three classic steps: find the middle, reverse the second half, interleave.

### Solution
```cpp
class Solution {
public:
    void reorderList(ListNode* head) {
        if (!head || !head->next) return;
        // 1. middle
        ListNode *slow = head, *fast = head->next;
        while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
        // 2. reverse second half
        ListNode* second = slow->next;
        slow->next = nullptr;
        ListNode* prev = nullptr;
        while (second) { ListNode* n = second->next; second->next = prev; prev = second; second = n; }
        // 3. interleave
        ListNode *a = head, *b = prev;
        while (b) {
            ListNode *an = a->next, *bn = b->next;
            a->next = b;
            b->next = an;
            a = an; b = bn;
        }
    }
};
```

### Explanation
Combines three primitives you must know cold. Starting `fast = head->next` makes `slow` stop at the end of the first half for both even and odd lengths.

**Time:** O(n) · **Space:** O(1)

## Remove Nth Node From End of List
- difficulty: Medium
- leetcode: 19
- slug: remove-nth-node-from-end-of-list

Remove the n-th node from the end and return the head. One pass.

### Hint
Advance a lead pointer `n` steps; then move both until lead reaches the end.

### Solution
```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0, head);
        ListNode *lead = &dummy, *lag = &dummy;
        for (int i = 0; i <= n; ++i) lead = lead->next;   // gap of n+1
        while (lead) { lead = lead->next; lag = lag->next; }
        ListNode* victim = lag->next;
        lag->next = victim->next;
        delete victim;        // fine here; LeetCode nodes are heap-allocated
        return dummy.next;
    }
};
```

### Explanation
With a gap of `n+1`, when `lead` falls off the end, `lag` is right *before* the node to delete. The dummy handles removing the head itself.

**Time:** O(n) · **Space:** O(1)

## Copy List with Random Pointer
- difficulty: Medium
- leetcode: 138
- slug: copy-list-with-random-pointer

Each node has `next` and `random` (may be null). Deep-copy the list.

### Hint
Map original → copy. Or interleave copies inside the original list for O(1) extra space.

### Solution
```cpp
class Solution {
public:
    Node* copyRandomList(Node* head) {
        // 1. Interleave: A -> A' -> B -> B' ...
        for (Node* p = head; p; p = p->next->next) {
            Node* copy = new Node(p->val);
            copy->next = p->next;
            p->next = copy;
        }
        // 2. Wire randoms: copy's random = original's random's copy
        for (Node* p = head; p; p = p->next->next)
            p->next->random = p->random ? p->random->next : nullptr;
        // 3. Unweave
        Node dummy(0);
        Node* tail = &dummy;
        for (Node* p = head; p; p = p->next) {
            tail->next = p->next;
            tail = tail->next;
            p->next = tail->next;     // restore original
        }
        return dummy.next;
    }
};
```

### Explanation
Placing each copy directly after its original gives O(1) access from original to copy (`p->next`) without a hash map. Simpler O(n)-space version: `unordered_map<Node*, Node*>` in two passes.

**Time:** O(n) · **Space:** O(1) extra

## Add Two Numbers
- difficulty: Medium
- leetcode: 2
- slug: add-two-numbers

Two non-negative numbers are stored as reversed digit lists. Return their sum as a list.

```text
(2→4→3) + (5→6→4) = 7→0→8   // 342 + 465 = 807
```

### Hint
Grade-school addition with a carry; continue while either list or the carry remains.

### Solution
```cpp
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* a, ListNode* b) {
        ListNode dummy;
        ListNode* tail = &dummy;
        int carry = 0;
        while (a || b || carry) {
            int sum = carry + (a ? a->val : 0) + (b ? b->val : 0);
            carry = sum / 10;
            tail->next = new ListNode(sum % 10);
            tail = tail->next;
            if (a) a = a->next;
            if (b) b = b->next;
        }
        return dummy.next;
    }
};
```

### Explanation
The `|| carry` condition handles a final carry (e.g. 5 + 5 = 10). This is how big-integer libraries work: least-significant digit first.

**Time:** O(max(m,n)) · **Space:** O(1) extra

## Find the Duplicate Number
- difficulty: Medium
- leetcode: 287
- slug: find-the-duplicate-number

`nums` has `n+1` integers in `[1, n]`; exactly one value repeats. Find it without modifying the array, O(1) space.

### Hint
Treat `i → nums[i]` as a linked list. The duplicate is the entrance to a cycle.

### Solution
```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = nums[0], fast = nums[nums[0]];
        while (slow != fast) { slow = nums[slow]; fast = nums[nums[fast]]; }
        slow = 0;                                // phase 2: find cycle entry
        while (slow != fast) { slow = nums[slow]; fast = nums[fast]; }
        return slow;
    }
};
```

### Explanation
Two indices point to the duplicate value, so the functional graph `i → nums[i]` has a node with in-degree 2 → a cycle entrance. Floyd's algorithm finds the entrance. (Index 0 is never a target since values are ≥ 1, so it's a valid start outside the cycle.)

**Time:** O(n) · **Space:** O(1)

## LRU Cache
- difficulty: Medium
- leetcode: 146
- slug: lru-cache

Design a cache with capacity `cap` supporting `get(key)` and `put(key, value)` in O(1), evicting the least recently used key.

### Hint
Hash map for O(1) lookup + doubly linked list for O(1) reordering. `std::list::splice` moves a node without reallocating.

### Solution
```cpp
class LRUCache {
    int cap;
    list<pair<int, int>> items;                                // front = most recent
    unordered_map<int, list<pair<int, int>>::iterator> pos;    // key -> node
public:
    explicit LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) return -1;
        items.splice(items.begin(), items, it->second);       // move to front, O(1)
        return it->second->second;
    }

    void put(int key, int value) {
        if (auto it = pos.find(key); it != pos.end()) {
            it->second->second = value;
            items.splice(items.begin(), items, it->second);
            return;
        }
        if ((int)items.size() == cap) {                        // evict LRU (back)
            pos.erase(items.back().first);
            items.pop_back();
        }
        items.emplace_front(key, value);
        pos[key] = items.begin();
    }
};
```

### Explanation
`std::list` iterators stay valid when other elements are inserted/erased and across `splice`, so storing them in the map is safe. This is among the **most asked** design-y coding questions — be ready to also hand-roll the doubly linked list with raw pointers and sentinel head/tail nodes.

**Time:** O(1) per op · **Space:** O(capacity)

## Merge k Sorted Lists
- difficulty: Hard
- leetcode: 23
- slug: merge-k-sorted-lists

Merge `k` sorted linked lists into one.

### Hint
Min-heap of the current heads. Or divide and conquer pairwise merging.

### Solution
```cpp
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; }; // min-heap
        priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);
        for (auto* l : lists) if (l) pq.push(l);
        ListNode dummy;
        ListNode* tail = &dummy;
        while (!pq.empty()) {
            ListNode* n = pq.top(); pq.pop();
            tail->next = n; tail = n;
            if (n->next) pq.push(n->next);
        }
        return dummy.next;
    }
};
```

### Explanation
The heap always holds at most `k` nodes — the smallest unmerged node of each list. `priority_queue` is a **max**-heap by default; the comparator with `>` turns it into a min-heap. `decltype(cmp)` passes the lambda's type as the template argument.

**Time:** O(N log k) · **Space:** O(k)

## Reverse Nodes in k-Group
- difficulty: Hard
- leetcode: 25
- slug: reverse-nodes-in-k-group

Reverse the nodes of the list `k` at a time. Leftover nodes (< k) stay as is.

### Hint
Check that k nodes exist; reverse that segment; reconnect `groupPrev` to the new head and the old head to the next group.

### Solution
```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* groupPrev = &dummy;
        while (true) {
            ListNode* kth = groupPrev;
            for (int i = 0; i < k && kth; ++i) kth = kth->next;
            if (!kth) break;                         // fewer than k left
            ListNode* groupNext = kth->next;
            // reverse [groupPrev->next, kth]
            ListNode *prev = groupNext, *cur = groupPrev->next;
            while (cur != groupNext) {
                ListNode* n = cur->next;
                cur->next = prev;
                prev = cur; cur = n;
            }
            ListNode* oldHead = groupPrev->next;     // becomes group tail
            groupPrev->next = kth;
            groupPrev = oldHead;
        }
        return dummy.next;
    }
};
```

### Explanation
Initialising `prev = groupNext` means the reversed segment's tail automatically points at the next group — no separate reconnection step. Then link the previous group to `kth` (new head) and move `groupPrev` to the old head (new tail).

**Time:** O(n) · **Space:** O(1)
