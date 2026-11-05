## implement-trie-prefix-tree

### Approach 1: Hash set of words + linear prefix scan
```cpp
class Trie {
    unordered_set<string> words;
public:
    void insert(const string& w) { words.insert(w); }
    bool search(const string& w) const { return words.count(w) > 0; }
    bool startsWith(const string& p) const {
        for (const auto& w : words)
            if (w.compare(0, p.size(), p) == 0) return true;   // w starts with p
        return false;
    }
};
```

**Time:** insert/search O(L), startsWith O(N·L) · **Space:** O(total chars). Shows exactly what a trie fixes: prefix queries.

### Approach 2: Array-pool trie (cache-friendly, no pointers)
```cpp
class Trie {
    vector<array<int, 26>> next{array<int, 26>{}};   // node 0 = root; 0 means "no child"
    vector<bool> end{false};
public:
    void insert(const string& w) {
        int n = 0;
        for (char c : w) {
            int& child = next[n][c - 'a'];
            if (!child) {
                child = next.size();                  // index of the node about to be created
                next.push_back({});                   // may reallocate: `child` ref is invalid after!
                end.push_back(false);
            }
            n = next[n][c - 'a'];                     // re-read instead of using the dangling ref
        }
        end[n] = true;
    }
    int walk(const string& s) const {
        int n = 0;
        for (char c : s) { n = next[n][c - 'a']; if (!n) return -1; }
        return n;
    }
    bool search(const string& w) const { int n = walk(w); return n >= 0 && end[n]; }
    bool startsWith(const string& p) const { return walk(p) >= 0; }
};
```

**Time:** O(L) · **Space:** O(nodes × 26 ints). One allocation strategy, contiguous memory — common in competitive programming and embedded. Note the reference-invalidation trap in `insert`!

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

### Approach 1: Bucket words by length, compare with wildcards
```cpp
class WordDictionary {
    unordered_map<size_t, vector<string>> byLen;
public:
    void addWord(const string& w) { byLen[w.size()].push_back(w); }
    bool search(const string& w) {
        auto it = byLen.find(w.size());
        if (it == byLen.end()) return false;
        for (const auto& cand : it->second) {
            bool ok = true;
            for (size_t i = 0; i < w.size() && ok; ++i)
                ok = w[i] == '.' || w[i] == cand[i];
            if (ok) return true;
        }
        return false;
    }
};
```

**Time:** search O(N·L) · **Space:** O(total chars). Surprisingly competitive when there are few words per length.

### Approach 2: Trie with iterative BFS search
```cpp
class WordDictionary {
    struct Node { array<unique_ptr<Node>, 26> next{}; bool end = false; };
    Node root;
public:
    void addWord(const string& w) {
        Node* n = &root;
        for (char c : w) { auto& ch = n->next[c - 'a']; if (!ch) ch = make_unique<Node>(); n = ch.get(); }
        n->end = true;
    }
    bool search(const string& w) {
        vector<Node*> frontier{&root};                 // all trie nodes matching the prefix so far
        for (char c : w) {
            vector<Node*> nxt;
            for (Node* n : frontier) {
                if (c == '.') { for (auto& ch : n->next) if (ch) nxt.push_back(ch.get()); }
                else if (n->next[c - 'a']) nxt.push_back(n->next[c - 'a'].get());
            }
            if (nxt.empty()) return false;
            frontier = std::move(nxt);
        }
        return ranges::any_of(frontier, [](Node* n) { return n->end; });
    }
};
```

**Time:** same bounds as DFS · **Space:** frontier can grow wide. Shows the search as a set of simultaneous states (like an NFA).

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

### Approach 1: Run Word Search (LC 79) once per word
```cpp
class Solution {
    bool dfs(vector<vector<char>>& b, const string& w, int i, int r, int c) {
        if (i == (int)w.size()) return true;
        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || b[r][c] != w[i]) return false;
        char t = b[r][c]; b[r][c] = '#';
        bool f = dfs(b, w, i + 1, r + 1, c) || dfs(b, w, i + 1, r - 1, c) ||
                 dfs(b, w, i + 1, r, c + 1) || dfs(b, w, i + 1, r, c - 1);
        b[r][c] = t;
        return f;
    }
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        vector<string> res;
        for (auto& w : words) {
            bool found = false;
            for (int r = 0; r < (int)board.size() && !found; ++r)
                for (int c = 0; c < (int)board[0].size() && !found; ++c)
                    found = dfs(board, w, 0, r, c);
            if (found) res.push_back(w);
        }
        return res;
    }
};
```

**Time:** O(W · R·C · 4^L) — TLE with 3·10⁴ words · **Space:** O(L). The baseline the trie improves on.

### Approach 2: Trie with `unique_ptr` nodes (no pruning)
```cpp
class Solution {
    struct Node { array<unique_ptr<Node>, 26> next{}; const string* word = nullptr; };
    vector<string> res;
    void dfs(vector<vector<char>>& b, int r, int c, Node* n) {
        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || b[r][c] == '#') return;
        Node* nx = n->next[b[r][c] - 'a'].get();
        if (!nx) return;
        if (nx->word) { res.push_back(*nx->word); nx->word = nullptr; }
        char t = b[r][c]; b[r][c] = '#';
        dfs(b, r + 1, c, nx); dfs(b, r - 1, c, nx); dfs(b, r, c + 1, nx); dfs(b, r, c - 1, nx);
        b[r][c] = t;
    }
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        Node root;
        for (auto& w : words) {
            Node* n = &root;
            for (char ch : w) { auto& p = n->next[ch - 'a']; if (!p) p = make_unique<Node>(); n = p.get(); }
            n->word = &w;
        }
        for (int r = 0; r < (int)board.size(); ++r)
            for (int c = 0; c < (int)board[0].size(); ++c) dfs(board, r, c, &root);
        return res;
    }
};
```

**Time:** O(R·C · 4 · 3^(L−1)) · **Space:** O(total chars). Correct and usually fast enough; Optimal adds branch pruning.

### Walkthrough
**Goal:** find all dictionary words in the grid with one DFS per cell, sharing prefixes.

1. **Build a trie** of all words; store at each word's last node a pointer to the word.
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
