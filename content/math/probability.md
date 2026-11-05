# Probability & Statistics

Probability appears in interviews as puzzles, randomized algorithms (quickselect, hashing, reservoir sampling, skip lists), and in ML, signal processing and reliability engineering.

## 1. Basics

- P(A) ∈ [0, 1]; P(not A) = 1 − P(A).
- **Union:** P(A ∪ B) = P(A) + P(B) − P(A ∩ B).
- **Independent:** P(A ∩ B) = P(A)·P(B).
- **Conditional:** P(A | B) = P(A ∩ B) / P(B).
- **Law of total probability:** P(A) = Σ P(A | Bᵢ) P(Bᵢ).

## 2. Bayes' theorem

P(A | B) = P(B | A) · P(A) / P(B)

**Classic:** a test is 99% sensitive (P(+|sick) = 0.99) and 95% specific (P(−|healthy) = 0.95). The disease affects 1%. P(sick | +)?

P(+) = 0.99·0.01 + 0.05·0.99 = 0.0099 + 0.0495 = 0.0594
P(sick | +) = 0.0099 / 0.0594 ≈ **16.7%** — low base rates dominate. (Same logic for false alarms in fault detection.)

## 3. Random variables & expectation

- **Expectation:** E[X] = Σ x·P(X = x). **Linearity:** E[X + Y] = E[X] + E[Y] — *always*, even if dependent. This is the most powerful trick for puzzles.
- **Variance:** Var(X) = E[X²] − E[X]². Standard deviation σ = √Var. For independent X, Y: Var(X + Y) = Var(X) + Var(Y).

**Example (linearity):** expected number of fixed points in a random permutation of n = Σ P(element i is fixed) = n · (1/n) = **1**.

**Example:** expected number of rolls of a die to get a 6: geometric with p = 1/6 → E = 1/p = **6**.

## 4. Distributions to know

| Distribution | Models | Mean | Variance |
|---|---|---|---|
| Bernoulli(p) | one yes/no trial | p | p(1−p) |
| Binomial(n, p) | # successes in n trials | np | np(1−p) |
| Geometric(p) | trials until first success | 1/p | (1−p)/p² |
| Poisson(λ) | # events in an interval (arrivals, bit errors) | λ | λ |
| Uniform(a, b) | equal likelihood | (a+b)/2 | (b−a)²/12 |
| Exponential(λ) | time between Poisson events (time to failure) | 1/λ | 1/λ² |
| Normal(μ, σ²) | sums of many small effects (sensor noise) | μ | σ² |

**68–95–99.7 rule:** for a normal distribution, ~68% within 1σ, 95% within 2σ, 99.7% within 3σ.

**Central Limit Theorem:** the average of many i.i.d. samples is approximately normal, with standard error σ/√n. Averaging 16 ADC samples reduces noise σ by 4 (2 extra bits of effective resolution).

## 5. Classic puzzles

**Birthday paradox:** with 23 people, P(two share a birthday) > 50%. P(no collision) = Π (1 − i/365). In hashing: with m buckets, collisions become likely after ~√m insertions (√(2^64) = 2^32 for 64-bit hashes).

**Coupon collector:** expected draws to collect all n coupons = n·H(n) ≈ n ln n.

**Monty Hall:** switching wins with probability 2/3 — your first pick is right only 1/3 of the time.

**Two children:** "At least one is a boy" → P(both boys) = 1/3 (BB, BG, GB equally likely).

**Expected value of max of two dice:** Σ P(max ≥ k) for k = 1..6 = (36 + 35 + 32 + 27 + 20 + 11)/36 = 161/36 ≈ 4.47.

**Random point on a stick broken in 3:** P(pieces form a triangle) = 1/4.

## 6. Randomized algorithms

### Reservoir sampling — pick k uniformly from a stream of unknown length

```cpp
std::vector<int> reservoir(std::istream& in, std::size_t k, std::mt19937& rng) {
    std::vector<int> res;
    int x; std::size_t i = 0;
    while (in >> x) {
        if (i < k) res.push_back(x);
        else {
            std::uniform_int_distribution<std::size_t> d(0, i);   // inclusive
            if (auto j = d(rng); j < k) res[j] = x;               // keep with prob k/(i+1)
        }
        ++i;
    }
    return res;
}
```

Proof sketch: item i is selected with probability k/(i+1) and survives each later step j with probability 1 − 1/(j+1) … the product telescopes to k/n.

### Fisher–Yates shuffle

```cpp
for (std::size_t i = v.size() - 1; i > 0; --i) {
    std::uniform_int_distribution<std::size_t> d(0, i);
    std::swap(v[i], v[d(rng)]);
}   // == std::ranges::shuffle(v, rng)
```

A naive "swap each with any random index" produces nⁿ outcomes, which isn't divisible by n!, so it's biased.

### Random numbers in C++

```cpp
std::random_device rd;                     // non-deterministic seed (if available)
std::mt19937_64 rng(rd());                 // Mersenne Twister engine
std::uniform_int_distribution<int> die(1, 6);
std::normal_distribution<double> noise(0.0, 0.1);
int roll = die(rng);
```

Don't use `rand() % n` (poor quality, modulo bias). For cryptography use an OS CSPRNG (`getrandom`, hardware TRNG on MCUs), never `mt19937`.

## 7. Statistics essentials

- **Mean** vs **median** (robust to outliers — use median filters for spiky sensors) vs **mode**.
- **Percentiles** (p50, p95, p99) for latency — averages hide tail latency.
- **Running mean/variance** in one pass (Welford's algorithm — numerically stable):

```cpp
struct Welford {
    std::size_t n = 0; double mean = 0, m2 = 0;
    void add(double x) { ++n; double d = x - mean; mean += d / n; m2 += d * (x - mean); }
    double variance() const { return n > 1 ? m2 / (n - 1) : 0.0; }   // sample variance
};
```

- **Correlation ≠ causation.** Pearson correlation measures linear relationship in [−1, 1].
- **Hypothesis testing:** p-value = P(data at least this extreme | null hypothesis). A/B tests, regression detection in benchmarks.

## 8. Reliability math (embedded / systems)

- **MTBF** (mean time between failures) = 1/λ for exponential failures. P(survive t) = e^(−λt).
- **Series system** (all must work): R = R₁·R₂·…; **parallel / redundant** (any works): R = 1 − Π(1 − Rᵢ). Two 99%-available servers in parallel → 99.99%.
- **Availability:** "five nines" 99.999% ≈ 5.26 minutes downtime/year.
- **Bit error rate:** P(at least one error in n bits) = 1 − (1 − p)ⁿ ≈ np for small p — why CRCs matter.

## Practice

1. Flip a fair coin until two heads in a row. Expected flips? **6.**
2. Expected number of distinct values when rolling a die 6 times? 6·(1 − (5/6)⁶) ≈ **3.99**.
3. A sensor fails with probability 2% per year. Two independent redundant sensors — P(both fail in a year)? **0.04%.**
