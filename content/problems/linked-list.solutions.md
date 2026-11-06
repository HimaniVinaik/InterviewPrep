## reverse-linked-list

### Approach 1: Copy the values into a vector, write them back reversed
**The idea:** linked lists are awkward to walk backwards, but vectors aren't. Copy the values out, then write them back in reverse order.

```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // Step 1: copy every value into a vector, front to back.
        vector<int> values;
        for (ListNode* node = head; node != nullptr; node = node->next) {
            values.push_back(node->val);
        }

        // Step 2: walk the list again, writing the values from the back of the vector.
        int i = values.size() - 1;
        for (ListNode* node = head; node != nullptr; node = node->next) {
            node->val = values[i];
            i--;
        }

        // The nodes didn't move, only their values changed, so head is still the first node.
        return head;
    }
};
```

**How it works**
1. First pass stores `1, 2, 3` in a vector.
2. Second pass writes `3, 2, 1` back into the same nodes.

**Think of it like this:** instead of rearranging the train cars, you swap the cargo between them.

**Cost:** Time **O(n)** (two passes). Space **O(n)** for the vector. Interviewers usually reject it because it changes values instead of links.

### Approach 2: Recursion
**The idea:** reverse everything after the first node, then hook the first node onto the end of that reversed part.

```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // Base case: an empty list or a single node is already reversed.
        if (head == nullptr || head->next == nullptr) {
            return head;
        }

        // Reverse the rest of the list. newHead is the old last node.
        ListNode* newHead = reverseList(head->next);

        // head->next is still the node right after head; it is now the TAIL
        // of the reversed part. Make it point back at head.
        head->next->next = head;

        // head is now the last node, so it must point to nothing.
        head->next = nullptr;

        return newHead;
    }
};
```

**How it works**
1. `reverseList(1→2→3)` calls `reverseList(2→3)`, which calls `reverseList(3)` → returns 3.
2. Back in the call for 2: `2->next` is 3, so `3->next = 2`, and `2->next = nullptr` → `3→2`.
3. Back in the call for 1: `1->next` is 2, so `2->next = 1`, `1->next = nullptr` → `3→2→1`.

**Think of it like this:** "I'll let my friend reverse everyone behind me in the line, then I'll stand at the end."

**Cost:** Time **O(n)**. Space **O(n)** for the call stack — a 100 000-node list can overflow the stack.

### Optimal: Iterative three-pointer reversal
**The idea:** walk the list once and flip each arrow to point backwards. Save the next node before you overwrite the arrow, or you lose the rest of the list.

```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;   // the reversed part (starts empty)
        ListNode* cur = head;       // the node we are about to flip

        while (cur != nullptr) {
            ListNode* next = cur->next;  // 1. remember the rest of the list
            cur->next = prev;            // 2. flip this node's arrow backwards
            prev = cur;                  // 3. the reversed part now starts at cur
            cur = next;                  // 4. move on to the rest of the list
        }

        // cur fell off the end, so prev is the old last node = new first node.
        return prev;
    }
};
```

**How it works**
1. `prev` is the front of the already-reversed part; `cur` is the front of the not-yet-reversed part.
2. Each loop moves exactly one node from the "not reversed" part to the "reversed" part.
3. When nothing is left, `prev` is the new head.

**Think of it like this:** people in a line all facing forward. You walk down the line and turn each person around to face the person behind them — but you glance at who's next before turning them, so you don't lose your place.

**Why it's optimal:** every node must have its link changed, so O(n) time is required; this uses only three pointers.

**Cost:** Time **O(n)**. Space **O(1)**.

## merge-two-sorted-lists

### Approach 1: Collect, sort, rebuild (simple but wasteful)
**The idea:** ignore that the lists are sorted: dump every value into a vector, sort it, build a new list.

```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
        // Step 1: gather all values from both lists.
        vector<int> values;
        for (ListNode* node = a; node != nullptr; node = node->next) {
            values.push_back(node->val);
        }
        for (ListNode* node = b; node != nullptr; node = node->next) {
            values.push_back(node->val);
        }

        // Step 2: sort them.
        sort(values.begin(), values.end());

        // Step 3: build a brand-new list from the sorted values.
        ListNode dummy;              // placeholder in front of the result
        ListNode* tail = &dummy;     // last node of the result so far
        for (int v : values) {
            tail->next = new ListNode(v);
            tail = tail->next;
        }
        return dummy.next;
    }
};
```

**How it works:** sorting does all the work; the original nodes are thrown away.

**Think of it like this:** two sorted decks of cards — you shuffle them together and sort the whole pile from scratch, ignoring that each deck was already in order.

**Cost:** Time **O((n + m) log(n + m))**. Space **O(n + m)** for the vector and new nodes.

### Approach 2: Recursion
**The idea:** the smaller of the two heads goes first; what follows it is the merge of everything else.

```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
        // If one list is empty, the answer is simply the other list.
        if (a == nullptr) {
            return b;
        }
        if (b == nullptr) {
            return a;
        }

        if (a->val <= b->val) {
            // a's head is the smallest. Everything after it = merge(rest of a, b).
            a->next = mergeTwoLists(a->next, b);
            return a;
        } else {
            // b's head is the smallest.
            b->next = mergeTwoLists(a, b->next);
            return b;
        }
    }
};
```

**How it works:** each call decides one node and hands the rest to the next call.

**Think of it like this:** two queues of people sorted by height; the shortest person at the front of either queue steps forward, and you repeat with whoever is left.

**Cost:** Time **O(n + m)**. Space **O(n + m)** call stack.

### Optimal: Iterative merge with a dummy node
**The idea:** keep a `tail` pointer to the end of the result; repeatedly attach the smaller of the two heads.

```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
        ListNode dummy;             // fake first node, so the result is never "empty"
        ListNode* tail = &dummy;    // the last node of the merged list so far

        while (a != nullptr && b != nullptr) {
            if (a->val <= b->val) {
                tail->next = a;     // attach a's head
                a = a->next;        // a moves forward
            } else {
                tail->next = b;     // attach b's head
                b = b->next;        // b moves forward
            }
            tail = tail->next;      // the node we just attached is the new end
        }

        // One list ran out. The other one is already sorted: attach all of it at once.
        if (a != nullptr) {
            tail->next = a;
        } else {
            tail->next = b;
        }

        return dummy.next;          // skip the fake node
    }
};
```

**How it works**
1. `dummy` sits in front of the answer so the very first attach is not a special case.
2. Compare heads, attach the smaller, advance that list and `tail`.
3. When one list is empty, link the remainder of the other in O(1).

**Think of it like this:** zipping two sorted stacks of exam papers into one by always taking the paper with the lower number from the top of either stack.

**Why it's optimal:** every node must be looked at once; no new nodes and no extra memory.

**Cost:** Time **O(n + m)**. Space **O(1)**.

## linked-list-cycle

### Approach 1: Remember every node you've visited
**The idea:** walk the list and store each node's address in a hash set. If you see an address twice, there's a loop.

```cpp
class Solution {
public:
    bool hasCycle(ListNode* head) {
        unordered_set<ListNode*> seen;   // addresses of nodes already visited

        for (ListNode* node = head; node != nullptr; node = node->next) {
            if (seen.count(node) > 0) {
                return true;             // we came back to an old node → cycle
            }
            seen.insert(node);
        }

        return false;                    // we reached the end, so no cycle
    }
};
```

**How it works:** a list without a cycle ends at `nullptr`; a list with a cycle eventually revisits a node.

**Think of it like this:** dropping breadcrumbs in a maze — if you find your own breadcrumb, you've walked in a circle.

**Cost:** Time **O(n)**. Space **O(n)** for the set.

### Optimal: Floyd's tortoise and hare (slow/fast pointers)
**The idea:** one pointer moves 1 step at a time, another moves 2. If there's a loop, the fast one laps the slow one and they meet. If not, the fast one falls off the end.

```cpp
class Solution {
public:
    bool hasCycle(ListNode* head) {
        ListNode* slow = head;   // moves 1 step at a time
        ListNode* fast = head;   // moves 2 steps at a time

        // fast needs two valid steps, so check fast AND fast->next.
        while (fast != nullptr && fast->next != nullptr) {
            slow = slow->next;
            fast = fast->next->next;

            if (slow == fast) {
                return true;     // fast caught up from behind → loop
            }
        }

        return false;            // fast reached the end → no loop
    }
};
```

**How it works**
1. No cycle: `fast` reaches `nullptr` first → false.
2. Cycle: once both are in the loop, `fast` gains exactly one node per step on `slow`, so the gap shrinks to 0 within one lap → they meet.

**Think of it like this:** two runners on a track. If the track is a loop, the faster runner eventually laps the slower one. If it's a straight road, the faster one just finishes.

**Why it's optimal:** O(n) time, and only two pointers instead of a set of n addresses.

**Cost:** Time **O(n)**. Space **O(1)**.

## reorder-list

### Approach 1: Array of nodes + two pointers
**The idea:** put every node into a vector so you can jump to any position, then relink by taking one from the front, one from the back, and so on.

```cpp
class Solution {
public:
    void reorderList(ListNode* head) {
        // Step 1: store pointers to every node.
        vector<ListNode*> nodes;
        for (ListNode* node = head; node != nullptr; node = node->next) {
            nodes.push_back(node);
        }

        // Step 2: alternate between the front (left) and the back (right).
        int left = 0;
        int right = nodes.size() - 1;
        while (left < right) {
            nodes[left]->next = nodes[right];   // front → back
            left++;
            if (left == right) {
                break;                          // they met in the middle
            }
            nodes[right]->next = nodes[left];   // back → next front
            right--;
        }

        // Step 3: the last node we placed must end the list.
        if (!nodes.empty()) {
            nodes[left]->next = nullptr;
        }
    }
};
```

**How it works:** for `1 2 3 4 5` the links become 1→5, 5→2, 2→4, 4→3, then 3→null.

**Think of it like this:** you lay all the cards face up on a table, then pick first, last, second, second-last…

**Cost:** Time **O(n)**. Space **O(n)** for the vector.

### Approach 2: Stack for the back half
**The idea:** a stack hands nodes back in reverse order — exactly the order we need the back half.

```cpp
class Solution {
public:
    void reorderList(ListNode* head) {
        // Push every node; the top of the stack is the last node.
        stack<ListNode*> st;
        int count = 0;
        for (ListNode* node = head; node != nullptr; node = node->next) {
            st.push(node);
            count++;
        }

        if (head == nullptr) {
            return;
        }

        ListNode* cur = head;
        // Splice count / 2 nodes from the back, one after each front node.
        for (int i = 0; i < count / 2; i++) {
            ListNode* fromBack = st.top();      // the current last node
            st.pop();
            ListNode* next = cur->next;         // remember where cur pointed
            cur->next = fromBack;               // cur → back node
            fromBack->next = next;              // back node → old next
            cur = next;                         // continue from the old next
        }

        // cur is the middle node: it is the new last node, so end the list here.
        // (This also breaks the old link into the back half.)
        cur->next = nullptr;
    }
};
```

**How it works**
1. Pop the last node and splice it after the current front node.
2. Move forward to the next original node and repeat.
3. Finally cut the list after the middle so the old tail links don't create a loop.

**Think of it like this:** you hold the back half of the cards in your hand (reversed) and slide one between each pair at the front.

**Cost:** Time **O(n)**. Space **O(n)** for the stack.

### Optimal: Find middle → reverse second half → interleave
**The idea:** combine three classic list tricks, all in place: slow/fast to find the middle, the three-pointer reversal, then a zip.

```cpp
class Solution {
public:
    void reorderList(ListNode* head) {
        if (head == nullptr || head->next == nullptr) {
            return;   // 0 or 1 nodes: nothing to do
        }

        // 1. Find the middle. fast starts one ahead, so slow ends on the
        //    LAST node of the first half.
        ListNode* slow = head;
        ListNode* fast = head->next;
        while (fast != nullptr && fast->next != nullptr) {
            slow = slow->next;
            fast = fast->next->next;
        }

        // 2. Cut the list in two and reverse the second half.
        ListNode* second = slow->next;
        slow->next = nullptr;          // first half now ends here
        ListNode* prev = nullptr;
        while (second != nullptr) {
            ListNode* next = second->next;
            second->next = prev;
            prev = second;
            second = next;
        }
        // prev is now the head of the reversed second half.

        // 3. Interleave: one node from the first half (a), one from the second (b).
        ListNode* a = head;
        ListNode* b = prev;
        while (b != nullptr) {
            ListNode* aNext = a->next;  // save both "rests" before relinking
            ListNode* bNext = b->next;
            a->next = b;                // a → b
            b->next = aNext;            // b → the old next of a
            a = aNext;
            b = bNext;
        }
    }
};
```

**How it works**
1. `1→2→3→4→5`: slow stops at 3, so the halves are `1→2→3` and `4→5`.
2. Reverse the second half → `5→4`.
3. Zip: `1→5→2→4→3`.

**Think of it like this:** fold a strip of paper in half so the end lies on top of the start, then read it alternately from the top and bottom layer.

**Why it's optimal:** linear time, and unlike the vector/stack versions it needs no extra memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## remove-nth-node-from-end-of-list

### Approach 1: Two passes — count the length first
**The idea:** the n-th node from the end is the `(length − n)`-th node from the start (0-based). Count, then walk there.

```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        // Pass 1: count the nodes.
        int length = 0;
        for (ListNode* node = head; node != nullptr; node = node->next) {
            length++;
        }

        // A dummy in front of head makes removing the first node a normal case.
        ListNode dummy(0, head);

        // Pass 2: stop on the node just BEFORE the one to delete.
        ListNode* before = &dummy;
        for (int i = 0; i < length - n; i++) {
            before = before->next;
        }

        // Unlink the target node.
        ListNode* victim = before->next;
        before->next = victim->next;
        delete victim;

        return dummy.next;
    }
};
```

**How it works:** for `1→2→3→4→5`, `n = 2`: length 5, walk 3 steps from the dummy to node 3, unlink node 4.

**Think of it like this:** to find the 2nd-to-last person in a queue, first count everyone, then count again from the front.

**Cost:** Time **O(n)** (two passes). Space **O(1)**.

### Approach 2: Vector of node pointers
**The idea:** store all node addresses so you can index straight to the one before the target.

```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0, head);

        // nodes[0] is the dummy, nodes[1] is head, ...
        vector<ListNode*> nodes;
        for (ListNode* node = &dummy; node != nullptr; node = node->next) {
            nodes.push_back(node);
        }

        // The target is n from the end; the node before it is n + 1 from the end.
        ListNode* before = nodes[nodes.size() - n - 1];
        ListNode* victim = before->next;
        before->next = victim->next;
        delete victim;

        return dummy.next;
    }
};
```

**How it works:** one pass to fill the vector, then a direct index.

**Think of it like this:** writing the queue down on a numbered list so you can point at any position instantly.

**Cost:** Time **O(n)**. Space **O(n)**.

### Optimal: One pass with two pointers n + 1 apart
**The idea:** start `lead` n + 1 nodes ahead of `lag`. Move both together. When `lead` falls off the end, `lag` is right before the node to delete.

```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0, head);   // handles removing the head itself
        ListNode* lead = &dummy;
        ListNode* lag = &dummy;

        // Open a gap of n + 1 nodes between lead and lag.
        for (int i = 0; i <= n; i++) {
            lead = lead->next;
        }

        // Move both until lead runs off the end.
        while (lead != nullptr) {
            lead = lead->next;
            lag = lag->next;
        }

        // lag is now just before the node to remove.
        ListNode* victim = lag->next;
        lag->next = victim->next;
        delete victim;             // LeetCode nodes are heap-allocated

        return dummy.next;
    }
};
```

**How it works**
1. The gap between `lag` and `lead` stays n + 1 the whole time.
2. When `lead` is `nullptr` (one past the last node), `lag` is n + 1 behind it — the node before the target.

**Think of it like this:** hold a stick of fixed length and slide it along the list; when its front end goes off the edge, its back end is exactly where you need to cut.

**Why it's optimal:** single pass, no extra memory.

**Cost:** Time **O(n)**. Space **O(1)**.

## copy-list-with-random-pointer

### Approach 1: Hash map original → copy (two passes)
**The idea:** first create a copy of every node and remember which copy belongs to which original. Then wire up `next` and `random` by looking things up in the map.

```cpp
class Solution {
public:
    Node* copyRandomList(Node* head) {
        unordered_map<Node*, Node*> copyOf;   // original node → its copy
        copyOf[nullptr] = nullptr;            // so null pointers map to null

        // Pass 1: make a lonely copy of every node.
        for (Node* p = head; p != nullptr; p = p->next) {
            copyOf[p] = new Node(p->val);
        }

        // Pass 2: connect the copies the same way the originals are connected.
        for (Node* p = head; p != nullptr; p = p->next) {
            copyOf[p]->next = copyOf[p->next];
            copyOf[p]->random = copyOf[p->random];
        }

        return copyOf[head];
    }
};
```

**How it works:** after pass 1 every original has a copy; pass 2 translates each arrow "original X → original Y" into "copy X → copy Y".

**Think of it like this:** photocopying a class seating chart where each student also names a "buddy" — first make a name tag for everyone, then use a lookup sheet to copy who sits next to whom and who is whose buddy.

**Cost:** Time **O(n)**. Space **O(n)** for the map.

### Approach 2: Recursion with memoisation (like cloning a graph)
**The idea:** `clone(node)` returns the copy of a node, creating it if needed and cloning its `next` and `random` the same way.

```cpp
class Solution {
public:
    Node* copyRandomList(Node* head) {
        return cloneNode(head);
    }

private:
    unordered_map<Node*, Node*> copyOf;   // original → copy, already created

    Node* cloneNode(Node* original) {
        if (original == nullptr) {
            return nullptr;
        }
        // Already copied? Return the existing copy (this also stops infinite loops).
        if (copyOf.count(original) > 0) {
            return copyOf[original];
        }

        Node* copy = new Node(original->val);
        copyOf[original] = copy;               // register BEFORE recursing

        copy->next = cloneNode(original->next);
        copy->random = cloneNode(original->random);
        return copy;
    }
};
```

**How it works:** registering the copy before recursing means a `random` pointing back to an earlier node finds the existing copy instead of making a duplicate.

**Think of it like this:** exploring rooms in a house and drawing a map; when a door leads to a room you've already drawn, you just draw a line to it.

**Cost:** Time **O(n)**. Space **O(n)** for the map plus up to O(n) recursion depth.

### Optimal: Weave the copies into the list (O(1) extra space)
**The idea:** put each copy directly after its original (`A → A' → B → B'`). Now "the copy of X" is just `X->next`, so we don't need a map.

```cpp
class Solution {
public:
    Node* copyRandomList(Node* head) {
        // 1. Interleave: insert each copy right after its original.
        for (Node* p = head; p != nullptr; p = p->next->next) {
            Node* copy = new Node(p->val);
            copy->next = p->next;
            p->next = copy;
        }

        // 2. Wire randoms: the copy of p->random is p->random->next.
        for (Node* p = head; p != nullptr; p = p->next->next) {
            Node* copy = p->next;
            if (p->random != nullptr) {
                copy->random = p->random->next;
            } else {
                copy->random = nullptr;
            }
        }

        // 3. Unweave: pull the copies out into their own list
        //    and restore the originals' next pointers.
        Node dummy(0);
        Node* tail = &dummy;
        for (Node* p = head; p != nullptr; p = p->next) {
            Node* copy = p->next;
            tail->next = copy;        // append copy to the new list
            tail = copy;
            p->next = copy->next;     // original skips over its copy again
        }

        return dummy.next;
    }
};
```

**How it works**
1. `A → B → C` becomes `A → A' → B → B' → C → C'`.
2. If `A.random = C`, then `A'.random = C.next = C'`.
3. Unweaving gives back `A → B → C` and the new `A' → B' → C'`.

**Think of it like this:** every student's twin stands right behind them. "Who is my buddy's twin?" — just look behind your buddy.

**Why it's optimal:** O(n) time like the others, but the mapping lives inside the list itself, so no hash map is needed.

**Cost:** Time **O(n)**. Space **O(1)** extra (not counting the copies, which are the output).

## add-two-numbers

### Approach 1: Convert to numbers (broken — know why)
**The idea (don't do this):** turn each list into an integer, add, turn the sum back into a list. Lists can have 100 digits, which overflows even `unsigned long long` (about 20 digits). Interviewers ask this to see if you notice.

### Approach 2: Recursion with a carry
**The idea:** add the two front digits plus the carry; the rest of the answer is the sum of the rest of the lists with the new carry.

```cpp
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* a, ListNode* b) {
        return addWithCarry(a, b, 0);
    }

private:
    ListNode* addWithCarry(ListNode* a, ListNode* b, int carry) {
        // Nothing left to add at all → the number is finished.
        if (a == nullptr && b == nullptr && carry == 0) {
            return nullptr;
        }

        int sum = carry;
        if (a != nullptr) {
            sum += a->val;
            a = a->next;
        }
        if (b != nullptr) {
            sum += b->val;
            b = b->next;
        }

        ListNode* node = new ListNode(sum % 10);           // this digit
        node->next = addWithCarry(a, b, sum / 10);          // the remaining digits
        return node;
    }
};
```

**How it works:** each call produces one digit, exactly like one column of pencil-and-paper addition.

**Think of it like this:** each person in a line adds their column, writes the digit, and passes the carry to the next person.

**Cost:** Time **O(max(n, m))**. Space **O(max(n, m))** for the call stack.

### Optimal: Iterative grade-school addition
**The idea:** the digits are stored least-significant first, which is exactly the order you add by hand. Walk both lists together, keeping a carry.

```cpp
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* a, ListNode* b) {
        ListNode dummy;             // fake head for the result
        ListNode* tail = &dummy;    // last digit written so far
        int carry = 0;

        // Keep going while there are digits left OR a leftover carry.
        while (a != nullptr || b != nullptr || carry != 0) {
            int sum = carry;
            if (a != nullptr) {
                sum += a->val;      // digit from the first number
                a = a->next;
            }
            if (b != nullptr) {
                sum += b->val;      // digit from the second number
                b = b->next;
            }

            carry = sum / 10;                    // e.g. 15 → carry 1
            tail->next = new ListNode(sum % 10); // e.g. 15 → digit 5
            tail = tail->next;
        }

        return dummy.next;
    }
};
```

**How it works**
1. Missing digits (one list is shorter) count as 0.
2. `sum % 10` is the digit to write; `sum / 10` is the carry into the next column.
3. The `carry != 0` condition creates the extra final digit (e.g. 99 + 1 = 100).

**Think of it like this:** adding numbers on paper, right to left, writing one digit per column and carrying the 1.

**Why it's optimal:** every digit must be read and every result digit written; no recursion stack.

**Cost:** Time **O(max(n, m))**. Space **O(1)** extra (the output list doesn't count).

## find-the-duplicate-number

### Approach 1: Sort a copy
**The idea:** after sorting, equal values sit next to each other.

```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        vector<int> sorted = nums;          // don't modify the input
        sort(sorted.begin(), sorted.end());

        for (int i = 1; i < (int)sorted.size(); i++) {
            if (sorted[i] == sorted[i - 1]) {
                return sorted[i];           // two neighbours are equal
            }
        }
        return -1;                          // unreachable for valid input
    }
};
```

**How it works:** sorting groups duplicates; one scan finds them.

**Think of it like this:** sort a pile of numbered tickets and look for two identical tickets side by side.

**Cost:** Time **O(n log n)**. Space **O(n)** for the copy (the problem forbids modifying the input).

### Approach 2: Binary search on the value range (pigeonhole)
**The idea:** count how many numbers are `≤ mid`. With no duplicate below or at `mid`, that count would be at most `mid`. If the count is bigger, the duplicate is in `[1, mid]`.

```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int lo = 1;
        int hi = nums.size() - 1;     // values are in [1, n]

        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;

            // How many numbers are in the range [1, mid]?
            int count = 0;
            for (int x : nums) {
                if (x <= mid) {
                    count++;
                }
            }

            if (count > mid) {
                hi = mid;             // too many → duplicate is in [lo, mid]
            } else {
                lo = mid + 1;         // duplicate is in [mid + 1, hi]
            }
        }
        return lo;
    }
};
```

**How it works:** for `[1, 3, 4, 2, 2]` and `mid = 2`, three numbers (1, 2, 2) are ≤ 2, but only two slots exist → the duplicate is 1 or 2.

**Think of it like this:** if 3 pigeons fit into 2 holes, some hole has 2 pigeons.

**Cost:** Time **O(n log n)**. Space **O(1)**.

### Optimal: Floyd's cycle detection on `i → nums[i]`
**The idea:** treat each index as a node and `nums[i]` as its "next" pointer. Two indices point to the duplicate value, so the duplicate is where a cycle starts — find it like Linked List Cycle II.

```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        // Phase 1: slow moves 1 step, fast moves 2 steps, until they meet in the cycle.
        int slow = nums[0];
        int fast = nums[nums[0]];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[nums[fast]];
        }

        // Phase 2: restart slow from the beginning; move both 1 step at a time.
        // They meet exactly at the cycle's entrance = the duplicate value.
        slow = 0;
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
};
```

**How it works**
1. Values are in `[1, n]` with `n + 1` entries, so `nums[i]` is always a valid index → following it never leaves the array, so it must loop.
2. The duplicate value has two arrows coming into it → it's the entrance of the loop.
3. Phase 2 works because the distance from the start to the entrance equals the distance from the meeting point to the entrance (going around the loop).

**Think of it like this:** a treasure hunt where each clue tells you the next box. Two clues send you to the same box — that box is where you start going in circles.

**Why it's optimal:** O(n) time, O(1) space, and the array is not modified — all three constraints of the problem at once.

**Cost:** Time **O(n)**. Space **O(1)**.

## lru-cache

### Approach 1: Timestamps + ordered map (O(log n))
**The idea:** give every access an increasing "time". Keep a map from time → key, sorted, so the smallest time is the least recently used.

```cpp
class LRUCache {
public:
    explicit LRUCache(int capacity) {
        cap = capacity;
    }

    int get(int key) {
        auto it = entries.find(key);
        if (it == entries.end()) {
            return -1;                     // not in the cache
        }
        touch(key);                        // mark as just used
        return it->second.value;
    }

    void put(int key, int value) {
        if (entries.count(key) > 0) {
            entries[key].value = value;    // update existing key
            touch(key);
            return;
        }
        if ((int)entries.size() == cap) {
            // The smallest time in byTime is the least recently used key.
            int oldestKey = byTime.begin()->second;
            byTime.erase(byTime.begin());
            entries.erase(oldestKey);
        }
        clock++;
        entries[key] = {value, clock};
        byTime[clock] = key;
    }

private:
    struct Entry {
        int value;
        long long lastUsed;
    };

    int cap;
    long long clock = 0;                   // increases on every access
    unordered_map<int, Entry> entries;     // key → value + last-used time
    map<long long, int> byTime;            // last-used time → key, sorted

    // Move a key to "now" in the time order.
    void touch(int key) {
        byTime.erase(entries[key].lastUsed);
        clock++;
        entries[key].lastUsed = clock;
        byTime[clock] = key;
    }
};
```

**How it works:** `byTime.begin()` is always the oldest entry; updating a key's time is a remove + insert in the sorted map.

**Think of it like this:** stamping each library book with the date it was last borrowed; to make room, throw out the one with the oldest stamp.

**Cost:** Time **O(log n)** per operation. Space **O(capacity)**.

### Approach 2: Hand-written doubly linked list with sentinels
**The idea:** the same idea as the optimal solution, but we build the doubly linked list ourselves — this is what interviewers often ask for in C++.

```cpp
class LRUCache {
public:
    explicit LRUCache(int capacity) {
        cap = capacity;
        // Two fake nodes: head.next is the most recent, tail.prev is the oldest.
        head.next = &tail;
        tail.prev = &head;
    }

    ~LRUCache() {
        for (auto& entry : nodeOf) {
            delete entry.second;
        }
    }

    int get(int key) {
        auto it = nodeOf.find(key);
        if (it == nodeOf.end()) {
            return -1;
        }
        Node* node = it->second;
        unlink(node);
        pushFront(node);                // most recently used
        return node->value;
    }

    void put(int key, int value) {
        auto it = nodeOf.find(key);
        if (it != nodeOf.end()) {
            Node* node = it->second;
            node->value = value;
            unlink(node);
            pushFront(node);
            return;
        }
        if ((int)nodeOf.size() == cap) {
            Node* oldest = tail.prev;   // least recently used
            unlink(oldest);
            nodeOf.erase(oldest->key);
            delete oldest;
        }
        Node* node = new Node{key, value, nullptr, nullptr};
        pushFront(node);
        nodeOf[key] = node;
    }

private:
    struct Node {
        int key;
        int value;
        Node* prev;
        Node* next;
    };

    int cap;
    Node head{0, 0, nullptr, nullptr};   // sentinel before the newest
    Node tail{0, 0, nullptr, nullptr};   // sentinel after the oldest
    unordered_map<int, Node*> nodeOf;    // key → its node

    // Remove a node from wherever it is. O(1) because we know both neighbours.
    void unlink(Node* node) {
        node->prev->next = node->next;
        node->next->prev = node->prev;
    }

    // Insert a node right after the head sentinel.
    void pushFront(Node* node) {
        node->next = head.next;
        node->prev = &head;
        head.next->prev = node;
        head.next = node;
    }
};
```

**How it works:** the sentinels mean `unlink` and `pushFront` never need "is this the first/last node?" checks.

**Think of it like this:** a stack of plates where you can pull any plate out from the middle and put it on top; the bottom plate is the one nobody has touched for longest.

**Cost:** Time **O(1)** per operation. Space **O(capacity)**.

### Optimal: `std::list` + hash map of iterators
**The idea:** a hash map finds a key's node in O(1); a doubly linked list keeps the usage order, and `splice` moves a node to the front in O(1).

```cpp
class LRUCache {
public:
    explicit LRUCache(int capacity) {
        cap = capacity;
    }

    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) {
            return -1;                                   // miss
        }
        // Move this entry to the front (most recently used). O(1), no copying.
        items.splice(items.begin(), items, it->second);
        return it->second->second;                       // the value
    }

    void put(int key, int value) {
        auto it = pos.find(key);
        if (it != pos.end()) {
            it->second->second = value;                  // update the value
            items.splice(items.begin(), items, it->second);
            return;
        }

        if ((int)items.size() == cap) {
            // The back of the list is the least recently used entry: evict it.
            int oldKey = items.back().first;
            pos.erase(oldKey);
            items.pop_back();
        }

        items.push_front({key, value});                  // newest at the front
        pos[key] = items.begin();
    }

private:
    int cap;
    list<pair<int, int>> items;                                // (key, value), front = newest
    unordered_map<int, list<pair<int, int>>::iterator> pos;    // key → where it is in items
};
```

**How it works**
1. `get`: look up the iterator, splice that node to the front, return the value.
2. `put` on an existing key: update and splice to the front.
3. `put` on a new key when full: erase the back node and its map entry, then insert at the front.

**Think of it like this:** a phone's "recent apps" list — opening an app moves it to the top; when there's no room, the app at the bottom gets closed.

**Why it's optimal:** both the lookup (hash map) and the reordering (list splice) are O(1), and `std::list` iterators stay valid when other nodes move.

**Cost:** Time **O(1)** per `get`/`put`. Space **O(capacity)**.

## merge-k-sorted-lists

### Approach 1: Collect all values, sort, rebuild
**The idea:** throw every value into one vector, sort, build a new list.

```cpp
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        vector<int> values;
        for (ListNode* list : lists) {
            for (ListNode* node = list; node != nullptr; node = node->next) {
                values.push_back(node->val);
            }
        }

        sort(values.begin(), values.end());

        ListNode dummy;
        ListNode* tail = &dummy;
        for (int v : values) {
            tail->next = new ListNode(v);
            tail = tail->next;
        }
        return dummy.next;
    }
};
```

**How it works:** sorting ignores the existing order; simple and correct.

**Think of it like this:** dumping all k sorted piles on the floor and re-sorting from scratch.

**Cost:** Time **O(N log N)** for N total nodes. Space **O(N)**.

### Approach 2: Merge one list at a time
**The idea:** merge list 0 with list 1, then the result with list 2, and so on, using the two-list merge.

```cpp
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        ListNode* result = nullptr;
        for (ListNode* list : lists) {
            result = mergeTwo(result, list);
        }
        return result;
    }

private:
    ListNode* mergeTwo(ListNode* a, ListNode* b) {
        ListNode dummy;
        ListNode* tail = &dummy;
        while (a != nullptr && b != nullptr) {
            if (a->val <= b->val) {
                tail->next = a;
                a = a->next;
            } else {
                tail->next = b;
                b = b->next;
            }
            tail = tail->next;
        }
        if (a != nullptr) {
            tail->next = a;
        } else {
            tail->next = b;
        }
        return dummy.next;
    }
};
```

**How it works:** correct, but the growing result is walked again in every merge.

**Think of it like this:** adding new cards one pile at a time to an ever-growing sorted stack you have to flip through again each time.

**Cost:** Time **O(k · N)** — slow when k is large. Space **O(1)**.

### Approach 3: Divide and conquer (pairwise merging)
**The idea:** merge lists in pairs (0+1, 2+3, …), halving the number of lists each round, like merge sort.

```cpp
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        if (lists.empty()) {
            return nullptr;
        }

        int count = lists.size();
        // Each round merges list i with list i + step.
        for (int step = 1; step < count; step *= 2) {
            for (int i = 0; i + step < count; i += 2 * step) {
                lists[i] = mergeTwo(lists[i], lists[i + step]);
            }
        }
        return lists[0];
    }

private:
    ListNode* mergeTwo(ListNode* a, ListNode* b) {
        ListNode dummy;
        ListNode* tail = &dummy;
        while (a != nullptr && b != nullptr) {
            if (a->val <= b->val) {
                tail->next = a;
                a = a->next;
            } else {
                tail->next = b;
                b = b->next;
            }
            tail = tail->next;
        }
        if (a != nullptr) {
            tail->next = a;
        } else {
            tail->next = b;
        }
        return dummy.next;
    }
};
```

**How it works:** there are log k rounds, and each round touches every node once.

**Think of it like this:** a knockout tournament — pairs merge, winners merge, until one list remains.

**Cost:** Time **O(N log k)**. Space **O(1)**. Same speed as the heap, without the heap.

### Optimal: Min-heap of list heads
**The idea:** the next node of the answer is always the smallest among the k current heads. A min-heap finds it in O(log k).

```cpp
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        // priority_queue is a MAX-heap by default; "a > b" flips it into a min-heap.
        auto greaterVal = [](ListNode* a, ListNode* b) {
            return a->val > b->val;
        };
        priority_queue<ListNode*, vector<ListNode*>, decltype(greaterVal)> heap(greaterVal);

        // Start with the first node of every non-empty list.
        for (ListNode* list : lists) {
            if (list != nullptr) {
                heap.push(list);
            }
        }

        ListNode dummy;
        ListNode* tail = &dummy;
        while (!heap.empty()) {
            ListNode* smallest = heap.top();   // the globally smallest head
            heap.pop();

            tail->next = smallest;             // append it to the result
            tail = smallest;

            // Its successor is now the head of that list.
            if (smallest->next != nullptr) {
                heap.push(smallest->next);
            }
        }
        return dummy.next;
    }
};
```

**How it works**
1. The heap holds at most one node from each list (at most k nodes).
2. Pop the smallest, append it, push its `next`.
3. Every node is pushed and popped once.

**Think of it like this:** k checkout lines sorted by ticket number; a manager always calls the lowest ticket at the front of any line.

**Why it's optimal:** each of the N nodes costs one O(log k) heap operation; comparison-based merging can't do better than O(N log k).

**Cost:** Time **O(N log k)**. Space **O(k)** for the heap.

## reverse-nodes-in-k-group

### Approach 1: Recursion
**The idea:** check that k nodes exist; reverse those k; the last node of the reversed group points to the answer for the rest of the list.

```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        // Step 1: make sure there are at least k nodes.
        ListNode* check = head;
        for (int i = 0; i < k; i++) {
            if (check == nullptr) {
                return head;          // fewer than k: leave them as they are
            }
            check = check->next;
        }
        // check is now the first node AFTER this group.

        // Step 2: reverse exactly k nodes.
        ListNode* prev = nullptr;
        ListNode* cur = head;
        for (int i = 0; i < k; i++) {
            ListNode* next = cur->next;
            cur->next = prev;
            prev = cur;
            cur = next;
        }

        // Step 3: head is now the group's LAST node; attach the rest (solved recursively).
        head->next = reverseKGroup(cur, k);

        return prev;                  // prev is the group's new first node
    }
};
```

**How it works:** each call handles one group and delegates the rest.

**Think of it like this:** each group of k people turns around, then the last person in the group holds hands with whatever the next group becomes.

**Cost:** Time **O(n)**. Space **O(n / k)** for the call stack.

### Approach 2: Copy a group into an array, relink
**The idea:** put k nodes into a vector, then link them in reverse order by index — no tricky pointer juggling.

```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* groupPrev = &dummy;     // node just before the current group

        while (true) {
            // Collect the next k nodes.
            vector<ListNode*> group;
            ListNode* node = groupPrev->next;
            while (node != nullptr && (int)group.size() < k) {
                group.push_back(node);
                node = node->next;
            }
            if ((int)group.size() < k) {
                break;                    // not a full group: stop
            }
            // node is the first node after the group.

            // Link the group backwards: last → ... → first → node.
            groupPrev->next = group[k - 1];
            for (int i = k - 1; i > 0; i--) {
                group[i]->next = group[i - 1];
            }
            group[0]->next = node;

            groupPrev = group[0];         // old first node is the new group tail
        }
        return dummy.next;
    }
};
```

**How it works:** with the nodes in an array, "reverse" is just a loop over indices.

**Think of it like this:** lining the k people up by number on the floor, then reconnecting them from the highest number down.

**Cost:** Time **O(n)**. Space **O(k)** for the vector.

### Optimal: Iterative, in place, group by group
**The idea:** for each group, find its k-th node, reverse the group so its tail points to the next group, and reconnect it to the previous group.

```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* groupPrev = &dummy;    // the node right before the current group

        while (true) {
            // 1. Find the k-th node of this group.
            ListNode* kth = groupPrev;
            for (int i = 0; i < k && kth != nullptr; i++) {
                kth = kth->next;
            }
            if (kth == nullptr) {
                break;                   // fewer than k nodes left: done
            }
            ListNode* groupNext = kth->next;   // first node after the group

            // 2. Reverse the group. Starting prev at groupNext means the
            //    group's new tail automatically points to the next group.
            ListNode* prev = groupNext;
            ListNode* cur = groupPrev->next;
            while (cur != groupNext) {
                ListNode* next = cur->next;
                cur->next = prev;
                prev = cur;
                cur = next;
            }

            // 3. Reconnect: the previous part now points to kth (the new group head).
            ListNode* oldHead = groupPrev->next;   // this is now the group's tail
            groupPrev->next = kth;
            groupPrev = oldHead;                   // the next group starts after it
        }

        return dummy.next;
    }
};
```

**How it works**
1. `groupPrev` is the node before the group (the dummy at first).
2. Walk k steps to find `kth`; if the list ends first, stop.
3. Reverse the nodes between `groupPrev->next` and `kth`, with `groupNext` as the "end" marker.
4. Hook `groupPrev` to `kth`; the old first node becomes the next `groupPrev`.

**Think of it like this:** a long train; you uncouple k cars at a time, turn that block around, and couple it back in the same spot.

**Why it's optimal:** each node is visited a constant number of times, and only a handful of pointers are used — no recursion, no arrays.

**Cost:** Time **O(n)**. Space **O(1)**.
