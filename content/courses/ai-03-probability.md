# Level 3 · Probability & Statistics for ML

> **Key idea:** a classifier doesn't say "this is a cat". It says "I'm 92% sure this is a cat". Probability is the language for that uncertainty — and the most common loss function in deep learning, **cross-entropy**, falls straight out of it.

**Goals of this level**
- Use probabilities, distributions, mean, variance and standard deviation confidently.
- Understand conditional probability and **Bayes' rule** with a real example.
- Understand **likelihood** and **maximum likelihood** — the principle behind most loss functions.
- Derive **mean squared error** and **cross-entropy** from first principles, and code softmax safely.

## 1. Probability basics

A **probability** is a number between 0 (impossible) and 1 (certain). For a fair die, P(roll = 3) = 1/6.

| Rule | Formula | Example |
|---|---|---|
| Everything adds to 1 | Σ P(x) = 1 | six faces × 1/6 = 1 |
| Not | P(not A) = 1 − P(A) | P(not a 6) = 5/6 |
| And (independent) | P(A and B) = P(A)·P(B) | two sixes: 1/36 |
| Or (exclusive) | P(A or B) = P(A) + P(B) | 1 or 2: 2/6 |

A **random variable** is a quantity whose value is uncertain (a die roll, tomorrow's temperature). Its **distribution** says how likely each value is.

## 2. Summaries: mean, variance, standard deviation

- **Mean (expected value)** — the average you'd get over many tries: E[X] = Σ x · P(x). For a die: (1 + 2 + … + 6)/6 = 3.5.
- **Variance** — the average squared distance from the mean: Var[X] = E[(X − μ)²]. It measures spread.
- **Standard deviation** σ = √variance — spread in the original units.

```python
import numpy as np

rng = np.random.default_rng(0)
rolls = rng.integers(1, 7, size=100_000)          # 100k die rolls

print("mean:", rolls.mean())                      # ≈ 3.5
print("variance:", rolls.var())                   # ≈ 2.9167 (exact: 35/12)
print("std:", rolls.std())                        # ≈ 1.708
assert abs(rolls.mean() - 3.5) < 0.02
assert abs(rolls.var() - 35 / 12) < 0.05
```

> **Tip:** "Normalising" data in ML means subtracting the mean and dividing by the standard deviation of each feature, so every feature has mean 0 and std 1. You'll see in Level 4 why that makes training much faster.

## 3. The two distributions you'll meet everywhere

**Bernoulli** — one yes/no event with P(yes) = p. Every binary classifier outputs a Bernoulli probability.

**Normal (Gaussian)** — the bell curve, described by its mean μ and standard deviation σ:

```text
p(x) = 1 / (σ√(2π)) · exp( −(x − μ)² / (2σ²) )
```

About 68% of values fall within 1σ of the mean, 95% within 2σ. Weight initialisation (Level 10), noise in data, and diffusion models (Level 15) all use it.

```python
import numpy as np

rng = np.random.default_rng(42)
samples = rng.normal(loc=10.0, scale=2.0, size=200_000)   # mean 10, std 2

within_1 = np.mean(np.abs(samples - 10) < 2)
within_2 = np.mean(np.abs(samples - 10) < 4)
print(f"within 1 sigma: {within_1:.3f}, within 2 sigma: {within_2:.3f}")   # ≈ 0.683, 0.954
assert abs(within_1 - 0.683) < 0.01 and abs(within_2 - 0.954) < 0.01
```

## 4. Conditional probability and Bayes' rule

P(A | B) means "the probability of A **given** that B happened".

```text
P(A | B) = P(A and B) / P(B)
```

**Bayes' rule** flips a conditional around:

```text
              P(B | A) · P(A)
P(A | B)  =  ─────────────────
                   P(B)
```

**Worked example — a medical test.** A disease affects 1% of people. A test catches 99% of sick people, but also gives a false alarm for 5% of healthy people. You test positive. What's the chance you're sick?

```text
P(sick) = 0.01              P(positive | sick) = 0.99
P(healthy) = 0.99           P(positive | healthy) = 0.05

P(positive) = 0.99·0.01 + 0.05·0.99 = 0.0099 + 0.0495 = 0.0594

P(sick | positive) = 0.0099 / 0.0594 ≈ 0.167   → only about 17%!
```

Most positives come from the huge healthy group. This "base-rate" effect matters in ML too: a fraud detector that's "95% accurate" can still be useless if fraud is rare (Level 5 covers precision and recall).

```python
# Check the medical-test example by simulation.
import numpy as np

rng = np.random.default_rng(7)
n = 2_000_000
sick = rng.random(n) < 0.01
positive = np.where(sick, rng.random(n) < 0.99, rng.random(n) < 0.05)
p_sick_given_pos = sick[positive].mean()
print(f"P(sick | positive) ≈ {p_sick_given_pos:.3f}")   # ≈ 0.167
assert abs(p_sick_given_pos - 0.0099 / 0.0594) < 0.01
```

## 5. Likelihood and maximum likelihood (the big idea)

Suppose you flip a coin 10 times and get 7 heads. What's the best guess for p = P(heads)?

The **likelihood** of a value of p is "how probable the observed data would be if p were true":

```text
L(p) = p⁷ · (1 − p)³
```

**Maximum likelihood estimation (MLE):** choose the p that makes the data most probable. Products of many small numbers are awkward, so we take the logarithm (it doesn't move the maximum) and **minimise the negative log-likelihood**:

```text
NLL(p) = −[7·log p + 3·log(1 − p)]
dNLL/dp = −7/p + 3/(1 − p) = 0   →   p = 7/10
```

The common-sense answer — but now we have a *principle* that works for any model:

> **Key:** almost every loss function in ML is a negative log-likelihood. Training = maximum likelihood estimation.

```python
import numpy as np

heads, tails = 7, 3
ps = np.linspace(0.01, 0.99, 981)
nll = -(heads * np.log(ps) + tails * np.log(1 - ps))
best = ps[np.argmin(nll)]
print(f"p that minimises the NLL: {best:.3f}")        # 0.700
assert abs(best - 0.7) < 1e-9
```

### Mean squared error = MLE with Gaussian noise

If we assume target = prediction + Gaussian noise, the likelihood of each data point is the normal density. Its negative log is

```text
−log p(t | y) = (t − y)² / (2σ²) + constant
```

Minimising the sum over the dataset = minimising **Σ (t − y)²** — the **mean squared error** you'll use for regression in Level 4.

### Cross-entropy = MLE for classification

For a yes/no label t ∈ {0, 1} and predicted probability y = P(t = 1):

```text
P(t | y) = y^t · (1 − y)^(1 − t)
−log P(t | y) = −[ t·log y + (1 − t)·log(1 − y) ]      ← binary cross-entropy
```

For K classes with predicted probabilities y₁…y_K and the true class c:

```text
loss = −log y_c          ← categorical cross-entropy ("log loss")
```

**Intuition:** you're charged −log(probability you gave to the right answer). Confident and right → loss ≈ 0. Confident and wrong → huge loss.

| Probability given to the true class | Loss −log(p) |
|---|---|
| 0.99 | 0.01 |
| 0.5 | 0.69 |
| 0.1 | 2.30 |
| 0.001 | 6.91 |

## 6. Softmax: turning scores into probabilities

A classifier produces raw scores ("logits") z₁…z_K, which can be any real numbers. **Softmax** turns them into probabilities that are positive and add to 1:

```text
softmax(z)ᵢ = e^(zᵢ) / Σⱼ e^(zⱼ)
```

**Numerical-safety trick:** e^1000 overflows. Subtracting the largest score from all scores doesn't change the result (it cancels in the fraction) but keeps the numbers small. Similarly, compute log-softmax directly instead of `log(softmax(z))`.

```python
import numpy as np

def softmax(z):
    z = z - np.max(z)                 # stability: the largest exponent becomes e^0 = 1
    e = np.exp(z)
    return e / e.sum()

def log_softmax(z):
    z = z - np.max(z)
    return z - np.log(np.sum(np.exp(z)))

def cross_entropy(logits, true_class):
    return -log_softmax(logits)[true_class]

logits = np.array([2.0, 1.0, 0.1])
p = softmax(logits)
print("probabilities:", p.round(4), "sum:", p.sum())     # [0.659 0.2424 0.0986] 1.0
print("loss if class 0 is right:", round(cross_entropy(logits, 0), 4))   # 0.417
print("loss if class 2 is right:", round(cross_entropy(logits, 2), 4))   # 2.317

big = np.array([1000.0, 1001.0, 1002.0])
print("stable softmax of huge scores:", softmax(big).round(4))   # no overflow
assert np.isclose(softmax(logits).sum(), 1.0)
assert np.all(np.isfinite(softmax(big)))
```

The same, in C++ — the "subtract the max" trick is identical:

```cpp
#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <vector>

std::vector<double> softmax(const std::vector<double>& z) {
    double maxZ = *std::max_element(z.begin(), z.end());
    std::vector<double> out(z.size());
    double sum = 0.0;
    for (size_t i = 0; i < z.size(); i++) {
        out[i] = std::exp(z[i] - maxZ);     // shift for numerical stability
        sum += out[i];
    }
    for (double& v : out) {
        v /= sum;
    }
    return out;
}

double crossEntropy(const std::vector<double>& logits, size_t trueClass) {
    double maxZ = *std::max_element(logits.begin(), logits.end());
    double sumExp = 0.0;
    for (double z : logits) {
        sumExp += std::exp(z - maxZ);
    }
    double logProb = (logits[trueClass] - maxZ) - std::log(sumExp);   // log-softmax
    return -logProb;
}

int main() {
    std::vector<double> logits = {2.0, 1.0, 0.1};
    std::vector<double> p = softmax(logits);
    std::printf("p = %.4f %.4f %.4f\n", p[0], p[1], p[2]);          // 0.6590 0.2424 0.0986
    std::printf("CE(class 0) = %.4f\n", crossEntropy(logits, 0));   // 0.4170
    assert(std::fabs(p[0] + p[1] + p[2] - 1.0) < 1e-12);
    std::vector<double> huge = softmax({1000.0, 1001.0, 1002.0});
    assert(std::isfinite(huge[0]));
    return 0;
}
```

## 7. A few statistics terms you'll hear

| Term | Meaning in one line |
|---|---|
| **Sample vs population** | Your dataset is a sample; you want to do well on the whole population (new data). |
| **Bias (of an estimator)** | Systematically off in one direction. |
| **Variance (of an estimator)** | Changes a lot between different samples of data. |
| **i.i.d.** | "Independent and identically distributed" — the usual assumption about training examples. |
| **Prior / posterior** | Belief before / after seeing data (Bayes). Regularisation (Level 6) is a prior in disguise. |
| **KL divergence** | How different two distributions are; shows up in VAEs (Level 15) and RLHF. |

## Checkpoint

- [ ] I can compute the mean, variance and standard deviation of a small list by hand.
- [ ] I can redo the medical-test Bayes calculation from memory.
- [ ] I can explain "maximum likelihood" in one sentence and why we use the negative log.
- [ ] I can write a numerically stable softmax and cross-entropy.

## Exercises

1. A bag has 3 red and 2 blue balls. Draw 2 without replacement. P(both red)?
2. Mean and standard deviation of [2, 4, 4, 4, 5, 5, 7, 9]?
3. Spam filter: 20% of email is spam. The word "prize" appears in 40% of spam and 1% of normal mail. An email contains "prize" — P(spam)?
4. Show that subtracting a constant c from every logit doesn't change softmax.
5. A model predicts [0.7, 0.2, 0.1] for 3 classes. Compute the cross-entropy when the true class is 0, then 1. Which mistake is penalised more, and why does that make sense?
6. Write a Python function that estimates p for a coin by maximum likelihood using **gradient descent** on the NLL instead of the formula. Start at p = 0.5.

:::details Show solution
1. 3/5 · 2/4 = 6/20 = **0.3**.
2. Mean = 40/8 = 5. Squared deviations: 9, 1, 1, 1, 0, 0, 4, 16 → sum 32 → variance 32/8 = 4 → **std 2**.
3. P(prize) = 0.4·0.2 + 0.01·0.8 = 0.08 + 0.008 = 0.088. P(spam | prize) = 0.08/0.088 ≈ **0.909**.
4. e^(zᵢ − c) / Σ e^(zⱼ − c) = (e^(zᵢ) e^(−c)) / (e^(−c) Σ e^(zⱼ)) — the e^(−c) cancels.
5. Class 0: −ln 0.7 ≈ **0.357**. Class 1: −ln 0.2 ≈ **1.609**. Giving the true answer only 20% probability is a bigger mistake, so it costs more.
6.
```python
import numpy as np
heads, tails = 7, 3
p = 0.5
lr = 0.01
for step in range(2000):
    grad = -heads / p + tails / (1 - p)       # d NLL / dp
    p -= lr * grad
    p = min(max(p, 1e-6), 1 - 1e-6)           # keep it a valid probability
print(round(p, 4))                            # 0.7
```
:::

## External resources

- **Seeing Theory** (seeing-theory.brown.edu): beautiful interactive probability lessons.
- **StatQuest with Josh Starmer** (YouTube): "Maximum Likelihood", "Bayes' Theorem", "Cross Entropy" — very clear.
- **Mathematics for Machine Learning** (mml-book.github.io), Chapter 6: Probability and Distributions.
- **Think Stats** / **Think Bayes** by Allen Downey (free online): probability through Python code.
- **CS229 Probability Review** (Stanford, free PDF): the refresher MS students use.
