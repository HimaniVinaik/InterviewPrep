# Tries

**Recognise it when:** many queries share **prefixes** — autocomplete, word dictionaries, wildcard matching, searching many words in a grid, longest common prefix, XOR-maximisation (binary trie).

```cpp
struct TrieNode {
    array<unique_ptr<TrieNode>, 26> next{};   // owning children, auto-freed
    bool end = false;
};
```

- Insert/search cost O(L) per word regardless of dictionary size.
- `array<..., 26>` is fast but memory-heavy; use `unordered_map<char, ...>` for large alphabets.
- For performance-critical code, allocate nodes from a `vector<Node>` pool and use `int` indices instead of pointers (cache-friendly, no per-node `new`).

## Implement Trie (Prefix Tree)
- difficulty: Medium
- leetcode: 208
- slug: implement-trie-prefix-tree

Implement `insert(word)`, `search(word)` and `startsWith(prefix)`.

### Hint
Each node has up to 26 children and an end-of-word flag.

### Solution
```cpp
class Trie {
    struct Node {
        array<unique_ptr<Node>, 26> next{};
        bool end = false;
    };
    Node root;

    const Node* walk(string_view s) const {
        const Node* n = &root;
        for (char c : s) {
            n = n->next[c - 'a'].get();
            if (!n) return nullptr;
        }
        return n;
    }
public:
    void insert(const string& word) {
        Node* n = &root;
        for (char c : word) {
            auto& child = n->next[c - 'a'];
            if (!child) child = make_unique<Node>();
            n = child.get();
        }
        n->end = true;
    }
    bool search(const string& word) const    { auto* n = walk(word); return n && n->end; }
    bool startsWith(const string& p) const   { return walk(p) != nullptr; }
};
```

### Explanation
`unique_ptr` children mean the whole trie frees itself when `Trie` is destroyed — no manual `delete`, no leaks (a good talking point for ownership). `walk` is shared by both queries and is `const`.

**Time:** O(L) per op · **Space:** O(total chars × 26)

## Design Add and Search Words Data Structure
- difficulty: Medium
- leetcode: 211
- slug: design-add-and-search-words-data-structure

Support `addWord(word)` and `search(word)` where `word` may contain `'.'` matching any letter.

### Hint
Trie + DFS: on `'.'`, try every existing child.

### Solution
```cpp
class WordDictionary {
    struct Node { array<unique_ptr<Node>, 26> next{}; bool end = false; };
    Node root;
    bool dfs(const Node* n, const string& w, int i) const {
        if (i == (int)w.size()) return n->end;
        if (w[i] == '.') {
            for (auto& ch : n->next)
                if (ch && dfs(ch.get(), w, i + 1)) return true;
            return false;
        }
        auto& ch = n->next[w[i] - 'a'];
        return ch && dfs(ch.get(), w, i + 1);
    }
public:
    void addWord(const string& w) {
        Node* n = &root;
        for (char c : w) {
            auto& ch = n->next[c - 'a'];
            if (!ch) ch = make_unique<Node>();
            n = ch.get();
        }
        n->end = true;
    }
    bool search(const string& w) const { return dfs(&root, w, 0); }
};
```

### Explanation
Regular letters follow one branch; wildcards branch out. Worst case (all dots) explores the whole trie, but typical searches are fast.

**Time:** O(L) without dots, O(26^dots · L) worst · **Space:** O(total chars)

## Word Search II
- difficulty: Hard
- leetcode: 212
- slug: word-search-ii

Given a grid of letters and a list of words, return all words that can be formed by adjacent (4-directional) cells, each cell used once per word.

### Hint
Build a trie of the words, then DFS from every cell, walking the trie alongside. Prune exhausted trie branches.

### Solution
```cpp
class Solution {
    struct Node { array<Node*, 26> next{}; const string* word = nullptr; int kids = 0; };
    vector<Node> pool;                 // node storage: no per-node new/delete
    vector<string> res;
    int R = 0, C = 0;

    Node* newNode() { pool.emplace_back(); return &pool.back(); }

    void dfs(vector<vector<char>>& b, int r, int c, Node* parent) {
        if (r < 0 || c < 0 || r >= R || c >= C || b[r][c] == '#') return;
        int idx = b[r][c] - 'a';
        Node* n = parent->next[idx];
        if (!n) return;                               // no word continues this way
        if (n->word) { res.push_back(*n->word); n->word = nullptr; }   // dedupe
        char ch = b[r][c];
        b[r][c] = '#';                                // mark visited
        dfs(b, r + 1, c, n); dfs(b, r - 1, c, n);
        dfs(b, r, c + 1, n); dfs(b, r, c - 1, n);
        b[r][c] = ch;                                 // unmark (backtrack)
        if (!n->word && n->kids == 0) {               // prune exhausted branch
            parent->next[idx] = nullptr;
            --parent->kids;
        }
    }
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        size_t total = 1;
        for (auto& w : words) total += w.size();
        pool.reserve(total);                          // CRUCIAL: no reallocation => Node* stay valid
        Node* root = newNode();
        for (auto& w : words) {
            Node* n = root;
            for (char c : w) {
                if (!n->next[c - 'a']) { n->next[c - 'a'] = newNode(); ++n->kids; }
                n = n->next[c - 'a'];
            }
            n->word = &w;
        }
        R = board.size(); C = board[0].size();
        for (int r = 0; r < R; ++r)
            for (int c = 0; c < C; ++c) dfs(board, r, c, root);
        return res;
    }
};
```

### Explanation
Searching each word separately is O(words × cells × 4^L). The trie shares prefixes so one DFS from each cell checks **all** words at once. Key details:
- `pool.reserve(total)` is essential: if the vector reallocated, every stored `Node*` would dangle. (A great pointer/iterator-invalidation talking point.)
- Marking visited cells in place with `'#'` avoids a separate visited array.
- **Pruning:** once a node has no word and no children left, unlink it from its parent so later DFS calls stop early. This turns TLE into accepted on big inputs.

**Time:** O(cells × 4 × 3^(L−1)) · **Space:** O(total chars)
