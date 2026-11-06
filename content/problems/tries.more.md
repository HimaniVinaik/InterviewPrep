## implement-trie-prefix-tree

### Walkthrough
**Goal:** O(L) insert/search/prefix regardless of how many words are stored.

1. Each node has 26 child slots and an `end` flag ("a word ends here").
2. **insert:** start at the root; for each character, create the child if missing, then step into it. Mark the final node `end = true`.
3. **walk(s):** follow characters from the root; if a child is missing, return null.
4. **search(w):** `walk(w)` exists **and** is marked `end`.
5. **startsWith(p):** `walk(p)` exists (no `end` needed).

**Dry run:** insert "apple", search "app", startsWith "app", insert "app", search "app":

| op | path walked | result |
|---|---|---|
| insert apple | creates a→p→p→l→e, marks e | |
| search app | a→p→p exists, `end` false | **false** |
| startsWith app | a→p→p exists | **true** |
| insert app | path exists, mark second p | |
| search app | `end` true | **true** |

## design-add-and-search-words-data-structure

### Walkthrough
**Goal:** trie lookup where `.` matches any letter.

1. `dfs(node, i)`: can `word[i..]` be matched starting at `node`?
2. `i == size` → succeed only if `node->end`.
3. Regular letter → follow that one child (fail if missing).
4. `.` → try **every** existing child; succeed if any branch succeeds.

**Dry run** words {bad, dad, mad}; search ".ad":

| depth | char | candidates | survive |
|---|---|---|---|
| 0 | . | b, d, m | try b first |
| 1 | a | b→a ✔ | |
| 2 | d | b→a→d ✔, end = true | **true** (stops early) |

Search "b..": b → a (only child) → d, end → true. Search "b.x": b → a → no x → back up, no other children → false.

## word-search-ii

### Walkthrough
**Goal:** find all dictionary words in the grid with one DFS per cell, sharing prefixes.

1. **Build a trie** of all words; the node where a word ends stores that word.
2. From every cell, DFS while walking the trie in lockstep: the next cell's letter must be a child of the current trie node, otherwise stop immediately (prefix pruning).
3. When the trie node has a word, record it and clear it (so it's reported once).
4. Mark the cell `#` while it's on the current path; restore it on return (backtracking).
5. **Branch pruning:** after exploring, if a trie node has no word and no children left, unlink it from its parent. Later searches skip dead branches entirely.

**Dry run** board row `o a a n` / `e t a e` …, words {oath, eat}:

| start cell | trie path | result |
|---|---|---|
| (0,0) 'o' | o → a (0,1) → t (1,1) → h (2,1) | found "oath", prune o-a-t-h |
| (1,0) 'e' | e → a? (no 'a' neighbour forming e-a-t... ) | continue |
| (1,3) 'e' | e → a (1,2) → t (1,1) | found "eat" |

**Complexity intuition:** without the trie each word re-explores the grid; with it, all words share one exploration per cell.
