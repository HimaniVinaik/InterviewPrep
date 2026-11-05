# Discrete Math & Combinatorics

Discrete math underpins algorithms: counting tells you how big a search space is, logic and sets underpin bit manipulation and databases, and induction proves algorithms correct.

## 1. Logic

| Operator | Symbol | C/C++ |
|---|---|---|
| AND | ∧ | `&&` (logical), `&` (bitwise) |
| OR | ∨ | `\|\|`, `\|` |
| NOT | ¬ | `!`, `~` |
| XOR | ⊕ | `!=` on bools, `^` |
| Implication p → q | ≡ ¬p ∨ q | `!p \|\| q` |

**De Morgan's laws:** ¬(p ∧ q) ≡ ¬p ∨ ¬q and ¬(p ∨ q) ≡ ¬p ∧ ¬q. Constantly useful for simplifying conditions:

```cpp
if (!(x >= lo && x <= hi))   // same as
if (x < lo || x > hi)
```

**Contrapositive:** p → q ≡ ¬q → ¬p (useful in proofs).
**Quantifiers:** ∀ ("for all") ↔ `std::ranges::all_of`; ∃ ("exists") ↔ `any_of`; ¬∀x P ≡ ∃x ¬P.

## 2. Sets

Union A ∪ B, intersection A ∩ B, difference A \ B, complement, symmetric difference A △ B. **Bitmask sets** for small universes (≤ 64 elements):

```cpp
uint64_t A = 0b1011, B = 0b0110;
auto uni = A | B, inter = A & B, diff = A & ~B, sym = A ^ B;
bool subset = (A & B) == A;                 // A ⊆ B
int card = std::popcount(A);                // |A|
for (uint64_t s = A; s; s = (s - 1) & A) {} // iterate all non-empty subsets of A
```

**Power set** of an n-element set has 2ⁿ subsets. **Inclusion–exclusion:** |A ∪ B| = |A| + |B| − |A ∩ B|; for three sets add back |A ∩ B ∩ C|.

## 3. Counting principles

- **Rule of product:** k independent choices with n₁, n₂, … options → n₁·n₂·… outcomes. (An 8-char password from 62 chars: 62⁸.)
- **Rule of sum:** disjoint alternatives add.
- **Complement counting:** count what you *don't* want and subtract (e.g. "at least one" problems).

## 4. Permutations & combinations

| | Formula | Example |
|---|---|---|
| Permutations of n | n! | orderings of 5 tasks: 120 |
| k-permutations | P(n,k) = n!/(n−k)! | podium of 3 from 10: 720 |
| Combinations | C(n,k) = n!/(k!(n−k)!) | choose 3 of 10: 120 |
| With repetition (multisets) | C(n+k−1, k) | "stars and bars" |
| Permutations with repeats | n!/(n₁!n₂!…) | anagrams of "MISSISSIPPI": 11!/(4!4!2!) = 34650 |

**Pascal's rule:** C(n,k) = C(n−1,k−1) + C(n−1,k) — a DP recurrence.

```cpp
// Overflow-safe nCk for moderate n: multiply then divide step by step (always exact)
unsigned long long nCk(int n, int k) {
    k = std::min(k, n - k);
    unsigned long long r = 1;
    for (int i = 1; i <= k; ++i) r = r * (n - k + i) / i;
    return r;
}
// Grid paths from (0,0) to (m,n) moving right/down: C(m+n, m)
```

**Binomial theorem:** (x + y)ⁿ = Σ C(n,k) xᵏ yⁿ⁻ᵏ. Sum of row n of Pascal's triangle = 2ⁿ.

## 5. Important sequences

| Sequence | Formula / recurrence | Shows up in |
|---|---|---|
| Arithmetic sum | 1 + 2 + … + n = n(n+1)/2 | nested loops, missing number |
| Squares sum | n(n+1)(2n+1)/6 | |
| Geometric sum | 1 + r + … + rⁿ = (rⁿ⁺¹ − 1)/(r − 1) | doubling arrays, 2ⁿ⁺¹ − 1 nodes in a perfect tree |
| Harmonic | H(n) ≈ ln n + 0.577 | sieve, coupon collector |
| Fibonacci | F(n) = F(n−1) + F(n−2) | climbing stairs, tiling |
| Catalan | Cₙ = C(2n,n)/(n+1): 1, 1, 2, 5, 14, 42 | valid parentheses, BST shapes, triangulations |
| Derangements | D(n) = (n−1)(D(n−1) + D(n−2)) | "nobody gets their own hat" |
| Stirling (2nd kind) | ways to partition n items into k non-empty sets | |

## 6. Pigeonhole principle

If n + 1 items go into n boxes, some box holds ≥ 2. Generalised: some box holds ≥ ⌈items/boxes⌉.

Applications: "Find the duplicate number" (n+1 values in [1,n] must repeat); any 367 people include two with the same birthday; a hash function from a larger to smaller domain must collide; lossless compression can't shrink every input.

## 7. Proof techniques

- **Direct proof.**
- **Contradiction:** assume the opposite, derive something impossible (√2 irrational; infinitely many primes).
- **Induction:** prove P(base); prove P(k) → P(k+1). *Strong induction* assumes all P(≤k). This is how you prove recursive algorithms and loop invariants correct.

**Example (induction):** Σᵢ₌₁ⁿ i = n(n+1)/2. Base n=1: 1 = 1. Step: assume true for k; then Σ to k+1 = k(k+1)/2 + (k+1) = (k+1)(k+2)/2. ∎

**Loop invariants** (induction in disguise): "At the start of each iteration, `a[0..i)` is sorted" (insertion sort). State it for binary search to avoid off-by-one bugs.

## 8. Graph theory essentials

- A tree with V nodes has exactly V − 1 edges, is connected, and acyclic.
- **Handshake lemma:** Σ degrees = 2E → the number of odd-degree vertices is even.
- A complete graph Kₙ has n(n−1)/2 edges.
- **Euler path** exists iff 0 or 2 vertices have odd degree (directed: in/out degree balance). **Hamiltonian path** (visit every vertex once) is NP-complete.
- A **DAG** has a topological order iff it has no cycles.
- **Bipartite** iff 2-colourable iff no odd cycle (check with BFS colouring).

## 9. Relations & functions

- Equivalence relation: reflexive, symmetric, transitive → partitions a set into classes (union-find maintains these!).
- Partial order: reflexive, antisymmetric, transitive → topological sorting; `std::sort` requires a *strict weak ordering* comparator (irreflexive, transitive, transitive incomparability). A comparator using `<=` breaks this and is UB.
- Functions: injective (one-to-one), surjective (onto), bijective — a perfect hash is an injective function into a small range.

## Practice

1. How many 4-digit PINs have at least one repeated digit? 10⁴ − 10·9·8·7 = 10000 − 5040 = **4960**.
2. How many ways to climb 10 stairs taking 1 or 2 steps? F(11) = **89**.
3. How many distinct BSTs with 4 keys? C₄ = **14**.
4. In a group of 13 people, prove two share a birth month. 13 people, 12 months — pigeonhole.
