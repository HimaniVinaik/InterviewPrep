## implement-trie-prefix-tree

### Approach 1: Hash set of words + scan for prefixes
**The idea:** store the words in a hash set. `search` is a set lookup; `startsWith` checks every word.

```cpp
class Trie {
public:
    void insert(const string& word) {
        words.insert(word);
    }

    bool search(const string& word) const {
        return words.count(word) > 0;
    }

    bool startsWith(const string& prefix) const {
        // Check every stored word: does it begin with prefix?
        for (const string& w : words) {
            if (w.compare(0, prefix.size(), prefix) == 0) {
                return true;
            }
        }
        return false;
    }

private:
    unordered_set<string> words;
};
```

**How it works:** `compare(0, len, prefix)` compares the first `len` characters of `w` with `prefix`.

**Think of it like this:** a box of index cards — finding an exact card is quick with a good filing system, but finding "anything starting with app" means flipping through every card.

**Cost:** `insert`/`search` **O(L)** average. `startsWith` **O(N·L)** for N stored words — too slow for many queries.

### Approach 2: Trie with a hash map of children
**The idea:** a tree where each edge is a letter. Children are stored in a map, which works for any alphabet (not just a–z).

```cpp
class Trie {
public:
    Trie() {
        root = make_unique<Node>();
    }

    void insert(const string& word) {
        Node* node = root.get();
        for (char c : word) {
            // Create the child for this letter if it doesn't exist yet.
            if (node->children.count(c) == 0) {
                node->children[c] = make_unique<Node>();
            }
            node = node->children[c].get();
        }
        node->isWord = true;              // a word ends at this node
    }

    bool search(const string& word) const {
        const Node* node = find(word);
        return node != nullptr && node->isWord;
    }

    bool startsWith(const string& prefix) const {
        return find(prefix) != nullptr;
    }

private:
    struct Node {
        unordered_map<char, unique_ptr<Node>> children;   // letter → child
        bool isWord = false;
    };
    unique_ptr<Node> root;

    // Follow the letters of s from the root. nullptr if the path breaks.
    const Node* find(const string& s) const {
        const Node* node = root.get();
        for (char c : s) {
            auto it = node->children.find(c);
            if (it == node->children.end()) {
                return nullptr;
            }
            node = it->second.get();
        }
        return node;
    }
};
```

**How it works:** words that share a prefix share the same path from the root.

**Think of it like this:** a phone's predictive keyboard — each letter you type narrows you down one branch.

**Cost:** **O(L)** per operation. Space: the map has extra overhead per node.

### Optimal: Trie with a fixed array of 26 children
**The idea:** for lowercase letters, each node has exactly 26 slots — `next[c - 'a']`. Indexing an array is faster than hashing.

```cpp
class Trie {
public:
    void insert(const string& word) {
        Node* node = &root;
        for (char c : word) {
            // unique_ptr owns the child: it is freed automatically with the trie.
            unique_ptr<Node>& child = node->next[c - 'a'];
            if (child == nullptr) {
                child = make_unique<Node>();    // create the missing branch
            }
            node = child.get();                 // step down (non-owning raw pointer)
        }
        node->end = true;                       // mark: a word ends here
    }

    bool search(const string& word) const {
        const Node* node = walk(word);
        // The path must exist AND a word must end exactly there.
        return node != nullptr && node->end;
    }

    bool startsWith(const string& prefix) const {
        // Only the path needs to exist.
        return walk(prefix) != nullptr;
    }

private:
    struct Node {
        array<unique_ptr<Node>, 26> next{};     // one slot per letter a..z
        bool end = false;                       // does a word end at this node?
    };
    Node root;

    // Follow s letter by letter. Returns the last node, or nullptr if the path breaks.
    const Node* walk(const string& s) const {
        const Node* node = &root;
        for (char c : s) {
            node = node->next[c - 'a'].get();
            if (node == nullptr) {
                return nullptr;
            }
        }
        return node;
    }
};
```

**How it works**
1. **insert:** walk down, creating children as needed; mark the last node `end = true`.
2. **walk:** follow the letters; stop with `nullptr` as soon as a child is missing.
3. **search:** the path exists and ends on a node marked `end`.
4. **startsWith:** the path exists.

**Think of it like this:** a filing cabinet with 26 drawers, each drawer containing another 26-drawer cabinet. Spelling a word is opening one drawer per letter.

**Why it's optimal:** every operation is O(L) no matter how many words are stored, and array indexing is as fast as it gets. `unique_ptr` means no manual `delete` and no leaks.

**Cost:** Time **O(L)** per operation. Space **O(total letters × 26)** pointers in the worst case.

## design-add-and-search-words-data-structure

### Approach 1: Group words by length, compare with wildcards
**The idea:** a pattern can only match words of the same length. Keep words bucketed by length and compare each one character by character.

```cpp
class WordDictionary {
public:
    void addWord(const string& word) {
        byLength[word.size()].push_back(word);
    }

    bool search(const string& pattern) const {
        auto it = byLength.find(pattern.size());
        if (it == byLength.end()) {
            return false;                     // no word of this length at all
        }
        for (const string& w : it->second) {
            if (matches(w, pattern)) {
                return true;
            }
        }
        return false;
    }

private:
    unordered_map<size_t, vector<string>> byLength;

    // '.' in the pattern matches any letter.
    bool matches(const string& word, const string& pattern) const {
        for (size_t i = 0; i < word.size(); i++) {
            if (pattern[i] != '.' && pattern[i] != word[i]) {
                return false;
            }
        }
        return true;
    }
};
```

**How it works:** simple filtering by length, then a direct comparison.

**Think of it like this:** a crossword helper that keeps a separate list for 3-letter words, 4-letter words, and so on.

**Cost:** `addWord` **O(L)**. `search` **O(N·L)** in the worst case.

### Optimal: Trie + DFS that branches on `.`
**The idea:** store words in a trie. Normal letters follow one child; a `.` tries every child.

```cpp
class WordDictionary {
public:
    void addWord(const string& word) {
        Node* node = &root;
        for (char c : word) {
            unique_ptr<Node>& child = node->next[c - 'a'];
            if (child == nullptr) {
                child = make_unique<Node>();
            }
            node = child.get();
        }
        node->end = true;
    }

    bool search(const string& word) const {
        return dfs(&root, word, 0);
    }

private:
    struct Node {
        array<unique_ptr<Node>, 26> next{};
        bool end = false;
    };
    Node root;

    // Can word[i..] be matched starting at node?
    bool dfs(const Node* node, const string& word, int i) const {
        if (i == (int)word.size()) {
            return node->end;                 // used every character: is it a full word?
        }

        if (word[i] == '.') {
            // Wildcard: try every child that exists.
            for (const unique_ptr<Node>& child : node->next) {
                if (child != nullptr && dfs(child.get(), word, i + 1)) {
                    return true;
                }
            }
            return false;
        }

        // Normal letter: only one child to follow.
        const Node* child = node->next[word[i] - 'a'].get();
        if (child == nullptr) {
            return false;
        }
        return dfs(child, word, i + 1);
    }
};
```

**How it works**
1. `dfs(node, i)` asks whether `word[i..]` can be matched from `node`.
2. At the end of the word, succeed only if `node->end`.
3. A letter follows one child; `.` tries all of them.

**Think of it like this:** following directions through a maze where some signs say "any door" — you try each door until one leads out.

**Why it's optimal:** words without dots cost O(L); dots only explore branches that actually exist, sharing all common prefixes.

**Cost:** `addWord` **O(L)**. `search` **O(L)** without dots, up to **O(26^d · L)** with d dots (bounded by the trie size).

## word-search-ii

### Approach 1: Run Word Search once per word
**The idea:** for each word, try every starting cell with a DFS (exactly LeetCode 79).

```cpp
class Solution {
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        vector<string> res;
        for (const string& w : words) {
            if (exists(board, w)) {
                res.push_back(w);
            }
        }
        return res;
    }

private:
    bool exists(vector<vector<char>>& board, const string& word) {
        for (int r = 0; r < (int)board.size(); r++) {
            for (int c = 0; c < (int)board[0].size(); c++) {
                if (dfs(board, word, 0, r, c)) {
                    return true;
                }
            }
        }
        return false;
    }

    bool dfs(vector<vector<char>>& board, const string& word, int i, int r, int c) {
        if (i == (int)word.size()) {
            return true;                         // matched every letter
        }
        if (r < 0 || c < 0 || r >= (int)board.size() || c >= (int)board[0].size()) {
            return false;                        // off the board
        }
        if (board[r][c] != word[i]) {
            return false;                        // wrong letter (or already used: '#')
        }
        char saved = board[r][c];
        board[r][c] = '#';                       // mark as used on this path
        bool found = dfs(board, word, i + 1, r + 1, c) ||
                     dfs(board, word, i + 1, r - 1, c) ||
                     dfs(board, word, i + 1, r, c + 1) ||
                     dfs(board, word, i + 1, r, c - 1);
        board[r][c] = saved;                     // un-mark (backtrack)
        return found;
    }
};
```

**How it works:** correct, but words that share a prefix ("oath", "oat") redo the same exploration.

**Think of it like this:** searching a word-search puzzle from scratch for every word on the list.

**Cost:** Time **O(W · R·C · 4^L)**. Space **O(L)** recursion.

### Approach 2: Trie of all words (no pruning)
**The idea:** put all the words in a trie and do one DFS per cell, walking the trie and the board together. Stop when the board's letter isn't a child in the trie.

```cpp
class Solution {
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        root = make_unique<Node>();
        for (const string& w : words) {
            Node* node = root.get();
            for (char c : w) {
                unique_ptr<Node>& child = node->next[c - 'a'];
                if (child == nullptr) {
                    child = make_unique<Node>();
                }
                node = child.get();
            }
            node->word = w;                       // the word that ends here
        }

        res.clear();
        for (int r = 0; r < (int)board.size(); r++) {
            for (int c = 0; c < (int)board[0].size(); c++) {
                dfs(board, r, c, root.get());
            }
        }
        return res;
    }

private:
    struct Node {
        array<unique_ptr<Node>, 26> next{};
        string word;                              // non-empty if a word ends here
    };
    unique_ptr<Node> root;
    vector<string> res;

    void dfs(vector<vector<char>>& board, int r, int c, Node* parent) {
        if (r < 0 || c < 0 || r >= (int)board.size() || c >= (int)board[0].size()) {
            return;
        }
        char ch = board[r][c];
        if (ch == '#') {
            return;                               // already on the current path
        }
        Node* node = parent->next[ch - 'a'].get();
        if (node == nullptr) {
            return;                               // no word continues with this letter
        }
        if (!node->word.empty()) {
            res.push_back(node->word);
            node->word.clear();                   // report each word only once
        }
        board[r][c] = '#';
        dfs(board, r + 1, c, node);
        dfs(board, r - 1, c, node);
        dfs(board, r, c + 1, node);
        dfs(board, r, c - 1, node);
        board[r][c] = ch;
    }
};
```

**How it works:** all words share one exploration, and a missing trie child stops a path immediately.

**Think of it like this:** searching the puzzle once with the whole word list in your head, organised by prefix.

**Cost:** Time **O(R·C · 4^L)** (all words at once). Space **O(total letters)** for the trie.

### Optimal: Trie + backtracking + pruning found branches
**The idea:** Approach 2, plus: once a branch of the trie has no words left to find, cut it off. Later searches never walk into dead branches.

```cpp
class Solution {
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        // Build the trie. allNodes owns the memory; next[] holds plain pointers.
        allNodes.clear();
        Node* root = newNode();
        for (const string& w : words) {
            Node* node = root;
            for (char c : w) {
                int idx = c - 'a';
                if (node->next[idx] == nullptr) {
                    node->next[idx] = newNode();
                    node->kids++;                  // one more child under this node
                }
                node = node->next[idx];
            }
            node->word = w;
        }

        res.clear();
        R = board.size();
        C = board[0].size();
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                dfs(board, r, c, root);
            }
        }
        return res;
    }

private:
    struct Node {
        Node* next[26] = {};    // children (not owned)
        int kids = 0;           // how many children are still attached
        string word;            // non-empty if a word ends here (and isn't found yet)
    };
    vector<unique_ptr<Node>> allNodes;   // owns every node → freed automatically
    vector<string> res;
    int R = 0;
    int C = 0;

    Node* newNode() {
        allNodes.push_back(make_unique<Node>());
        return allNodes.back().get();
    }

    void dfs(vector<vector<char>>& b, int r, int c, Node* parent) {
        if (r < 0 || c < 0 || r >= R || c >= C) {
            return;                                 // off the board
        }
        if (b[r][c] == '#') {
            return;                                 // already used on this path
        }
        int idx = b[r][c] - 'a';
        Node* n = parent->next[idx];
        if (n == nullptr) {
            return;                                 // no remaining word goes this way
        }

        if (!n->word.empty()) {
            res.push_back(n->word);                 // found a word
            n->word.clear();                        // don't report it twice
        }

        char ch = b[r][c];
        b[r][c] = '#';                              // mark visited
        dfs(b, r + 1, c, n);
        dfs(b, r - 1, c, n);
        dfs(b, r, c + 1, n);
        dfs(b, r, c - 1, n);
        b[r][c] = ch;                               // unmark (backtrack)

        // Prune: nothing left to find below n → detach it from its parent.
        if (n->word.empty() && n->kids == 0) {
            parent->next[idx] = nullptr;
            parent->kids--;
        }
    }
};
```

**How it works**
1. Build one trie for all words; the node at the end of each word stores the word.
2. From every cell, DFS while stepping through the trie in lockstep.
3. Mark the cell `#` while it's on the path; restore it afterwards.
4. Record a word when you reach its node, then clear it.
5. After exploring, remove nodes that have no word and no children.

**Think of it like this:** a scavenger hunt with a checklist organised by first letters — when you've found every item on a page of the checklist, you tear the page out so nobody wastes time on it again.

**Why it's optimal:** the trie shares prefix work across all words, and pruning makes the search shrink as words are found — the standard accepted solution.

**Cost:** Time **O(R·C · 4 · 3^(L−1))** worst case (each step after the first has at most 3 new directions). Space **O(total letters)**.
