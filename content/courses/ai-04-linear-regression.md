# Level 4 · Linear Regression & Gradient Descent

> **Key idea:** this is your first real learning algorithm, and it contains the full recipe used by every neural network: **model → loss → gradient → update → repeat**. Once you've coded it from scratch in Python and C++, deep learning is "the same thing with a bigger model".

**Goals of this level**
- Define a model, a loss and its gradient for linear regression.
- Implement **gradient descent** from scratch — loop version, vectorised NumPy version, and C++.
- Understand the **learning rate**, **feature scaling**, and **mini-batch / stochastic** gradient descent.
- Evaluate a model on held-out **test data**, and compare with the exact **normal-equation** solution.

## 1. The problem

You have examples (x, y) and want a function that predicts y from x. Linear regression assumes the relationship is (roughly) a straight line:

```text
ŷ = w·x + b            (one feature)
ŷ = w₁x₁ + w₂x₂ + … + w_d x_d + b = w · x + b      (d features)
```

- **x** — input features (e.g. house size, bedrooms)
- **w** — weights: how much each feature matters
- **b** — bias: the prediction when all features are 0
- **ŷ** ("y-hat") — the prediction

**Learning** = finding the w and b that fit the data best.

## 2. The loss: mean squared error

How wrong is a given (w, b)? For each example take the error (ŷ − y), square it (so negatives don't cancel and big errors cost more), and average:

```text
            1   n
MSE(w, b) = ─   Σ (ŷᵢ − yᵢ)²
            n  i=1
```

(Level 3 showed this is maximum likelihood if the noise is Gaussian.)

## 3. The gradient

Using the chain rule (Level 2) on each squared error:

```text
∂MSE/∂w = (2/n) Σ (ŷᵢ − yᵢ) · xᵢ
∂MSE/∂b = (2/n) Σ (ŷᵢ − yᵢ)
```

**Read it in words:** each example "votes" to change w in proportion to *its error times its input*. Big error → big vote. Input of zero → no say about w (changing w wouldn't change its prediction).

With many features, in matrix form (X is the (n, d) data matrix, one row per example):

```text
ŷ = X w + b
error = ŷ − y                         shape (n,)
∂MSE/∂w = (2/n) · Xᵀ · error          shape (d,)
∂MSE/∂b = (2/n) · Σ error
```

## 4. Gradient descent — version 1: plain loops

Start with w = 0, b = 0 and repeat: compute the gradient, step against it.

```python
import random

# Synthetic data: y = 3x + 2 + noise
random.seed(0)
xs = [random.uniform(0, 10) for _ in range(100)]
ys = [3 * x + 2 + random.gauss(0, 1) for x in xs]

w, b = 0.0, 0.0
lr = 0.01                                 # learning rate
n = len(xs)

for epoch in range(2000):
    grad_w = 0.0
    grad_b = 0.0
    loss = 0.0
    for x, y in zip(xs, ys):
        y_hat = w * x + b                 # 1. predict
        error = y_hat - y                 # 2. compare
        loss += error ** 2 / n
        grad_w += 2 * error * x / n       # 3. gradient (chain rule)
        grad_b += 2 * error / n
    w -= lr * grad_w                      # 4. update (step downhill)
    b -= lr * grad_b
    if epoch % 500 == 0:
        print(f"epoch {epoch:4d}  loss {loss:8.4f}  w {w:.3f}  b {b:.3f}")

print(f"learned: y = {w:.3f}x + {b:.3f}   (truth: 3x + 2)")   # ≈ 2.909x + 2.542
assert abs(w - 3) < 0.2 and abs(b - 2) < 0.7
```

One full pass over the data is called an **epoch**.

Notice the answer is close to, but not exactly, `3x + 2`. That's correct behaviour: with only 100 noisy points, the line that best fits *this* sample is slightly different from the hidden rule. More data → closer to the truth.

## 5. Version 2: vectorised NumPy (how real code looks)

Loops in Python are slow. NumPy does the same maths on whole arrays at once — often 100× faster.

```python
import numpy as np

rng = np.random.default_rng(0)

# 500 houses, 3 features: size (m²), bedrooms, age (years)
n = 500
X = np.column_stack([
    rng.uniform(40, 250, n),
    rng.integers(1, 6, n).astype(float),
    rng.uniform(0, 60, n),
])
true_w = np.array([2.0, 15.0, -0.8])        # price in thousands: +2k per m², +15k per bedroom, -0.8k per year
true_b = 50.0
y = X @ true_w + true_b + rng.normal(0, 10, n)

# --- Feature scaling: mean 0, std 1 for every column (see section 6 for why) ---
mu = X.mean(axis=0)
sigma = X.std(axis=0)
Xs = (X - mu) / sigma

# --- Train / test split: hold back 20% to measure performance honestly ---
idx = rng.permutation(n)
train, test = idx[:400], idx[400:]

w = np.zeros(3)
b = 0.0
lr = 0.1
for epoch in range(500):
    y_hat = Xs[train] @ w + b
    error = y_hat - y[train]
    grad_w = 2 * Xs[train].T @ error / len(train)
    grad_b = 2 * error.mean()
    w -= lr * grad_w
    b -= lr * grad_b

def mse(Xpart, ypart):
    return np.mean((Xpart @ w + b - ypart) ** 2)

print(f"train MSE {mse(Xs[train], y[train]):.1f}   test MSE {mse(Xs[test], y[test]):.1f}")   # both ≈ 100 (noise² = 10²)

# Convert weights back to original units to compare with the truth.
w_orig = w / sigma
b_orig = b - np.sum(w * mu / sigma)
print("weights in original units:", w_orig.round(2), "bias:", round(b_orig, 1))   # ≈ [1.99 15.71 -0.77], 48.5
assert np.allclose(w_orig, true_w, atol=1.0)       # close to [2, 15, -0.8]; the noise moves it a little
```

The MSE can't go below about 100 because we added noise with standard deviation 10 (10² = 100). A model can't predict pure randomness — that's the **irreducible error**.

## 6. Why feature scaling matters

Without scaling, house size (40–250) is ~50× bigger than bedrooms (1–5). The loss surface becomes a long, thin valley: the gradient is huge along "size" and tiny along "bedrooms". A learning rate small enough not to explode along size is far too small to make progress along bedrooms.

```text
unscaled: a long thin valley         scaled: a round bowl
   ________________________             ____
  (________________________)           (    )
  gradient zig-zags slowly            gradient points at the centre
```

**Standardisation** — subtract the mean and divide by the standard deviation for each feature — makes the bowl round, so one learning rate works for every direction.

> **Warning:** compute μ and σ **on the training set only**, then apply the same μ and σ to the test set. Using test statistics is a form of "data leakage" — your test score would be over-optimistic.

## 7. The learning rate

| Learning rate | What happens |
|---|---|
| Too small | Loss decreases, but painfully slowly. |
| About right | Loss drops quickly and smoothly, then flattens. |
| Too big | Loss bounces around or **explodes** to `inf`/`nan`. |

Practical recipe: try 1, 0.1, 0.01, 0.001 and pick the largest one where the loss still goes down smoothly. (Level 10 covers schedules and Adam.)

## 8. Stochastic and mini-batch gradient descent

Computing the gradient on **all** examples each step is expensive for millions of examples. Instead, estimate it from a small random **mini-batch** (e.g. 32 examples). The estimate is noisy, but you get many more steps for the same compute — and the noise even helps escape bad spots.

| Variant | Examples per step |
|---|---|
| Batch gradient descent | all n |
| Stochastic gradient descent (SGD) | 1 |
| **Mini-batch** gradient descent | 16–512 (the standard) |

```python
import numpy as np

rng = np.random.default_rng(1)
n, d = 10_000, 5
X = rng.normal(size=(n, d))
true_w = rng.normal(size=d)
y = X @ true_w + 0.5 + rng.normal(0, 0.1, n)

w = np.zeros(d)
b = 0.0
lr = 0.05
batch_size = 64

for epoch in range(5):
    order = rng.permutation(n)                     # shuffle every epoch
    for start in range(0, n, batch_size):
        batch = order[start:start + batch_size]
        Xb, yb = X[batch], y[batch]
        error = Xb @ w + b - yb
        w -= lr * 2 * Xb.T @ error / len(batch)
        b -= lr * 2 * error.mean()
    loss = np.mean((X @ w + b - y) ** 2)
    print(f"epoch {epoch}  loss {loss:.5f}")       # quickly approaches 0.01 (noise 0.1²)

assert np.allclose(w, true_w, atol=0.02)
```

After only 5 epochs (≈ 780 small steps) the weights are already accurate.

## 9. The exact answer: the normal equation

Linear regression is special: you can solve it in one shot. Setting the gradient to zero gives

```text
w = (XᵀX)⁻¹ Xᵀ y          (with a column of 1s in X to absorb the bias)
```

```python
import numpy as np

rng = np.random.default_rng(2)
X = rng.normal(size=(200, 3))
y = X @ np.array([1.5, -2.0, 0.7]) + 4.0 + rng.normal(0, 0.1, 200)

X1 = np.column_stack([X, np.ones(len(X))])          # add the bias column
w_exact = np.linalg.solve(X1.T @ X1, X1.T @ y)      # solve, don't invert explicitly
print("exact solution [w1 w2 w3 b]:", w_exact.round(3))
assert np.allclose(w_exact, [1.5, -2.0, 0.7, 4.0], atol=0.05)
```

**Why not always do this?** It costs O(d³) and needs all data in memory. It doesn't exist for neural networks at all — there's no formula, only gradient descent. That's why we learn gradient descent first.

## 10. The same thing in C++

No libraries — just the standard library. Structure mirrors the NumPy version.

```cpp
#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <random>
#include <vector>

struct Dataset {
    std::vector<std::vector<double>> X;   // n rows, d features
    std::vector<double> y;
};

Dataset makeData(size_t n, std::mt19937& rng) {
    std::uniform_real_distribution<double> u(-1.0, 1.0);
    std::normal_distribution<double> noise(0.0, 0.1);
    const std::vector<double> trueW = {2.0, -3.0, 0.5};
    const double trueB = 1.0;
    Dataset data;
    for (size_t i = 0; i < n; i++) {
        std::vector<double> x = {u(rng), u(rng), u(rng)};
        double target = trueB + noise(rng);
        for (size_t j = 0; j < x.size(); j++) {
            target += trueW[j] * x[j];
        }
        data.X.push_back(x);
        data.y.push_back(target);
    }
    return data;
}

struct LinearModel {
    std::vector<double> w;
    double b = 0.0;

    explicit LinearModel(size_t d) : w(d, 0.0) {}

    double predict(const std::vector<double>& x) const {
        double s = b;
        for (size_t j = 0; j < w.size(); j++) {
            s += w[j] * x[j];
        }
        return s;
    }
};

double meanSquaredError(const LinearModel& m, const Dataset& data) {
    double total = 0.0;
    for (size_t i = 0; i < data.y.size(); i++) {
        double e = m.predict(data.X[i]) - data.y[i];
        total += e * e;
    }
    return total / data.y.size();
}

// One epoch of mini-batch gradient descent.
void trainEpoch(LinearModel& m, const Dataset& data, double lr, size_t batchSize, std::mt19937& rng) {
    std::vector<size_t> order(data.y.size());
    for (size_t i = 0; i < order.size(); i++) {
        order[i] = i;
    }
    std::shuffle(order.begin(), order.end(), rng);

    size_t d = m.w.size();
    for (size_t start = 0; start < order.size(); start += batchSize) {
        size_t end = std::min(start + batchSize, order.size());
        std::vector<double> gradW(d, 0.0);
        double gradB = 0.0;
        for (size_t k = start; k < end; k++) {
            size_t i = order[k];
            double error = m.predict(data.X[i]) - data.y[i];
            for (size_t j = 0; j < d; j++) {
                gradW[j] += 2.0 * error * data.X[i][j];
            }
            gradB += 2.0 * error;
        }
        double count = static_cast<double>(end - start);
        for (size_t j = 0; j < d; j++) {
            m.w[j] -= lr * gradW[j] / count;   // average gradient over the batch
        }
        m.b -= lr * gradB / count;
    }
}

int main() {
    std::mt19937 rng(42);
    Dataset train = makeData(2000, rng);
    Dataset test = makeData(500, rng);

    LinearModel model(3);
    for (int epoch = 0; epoch < 30; epoch++) {
        trainEpoch(model, train, 0.05, 32, rng);
        if (epoch % 10 == 0) {
            std::printf("epoch %2d  train MSE %.5f\n", epoch, meanSquaredError(model, train));
        }
    }
    std::printf("w = [%.3f, %.3f, %.3f], b = %.3f\n", model.w[0], model.w[1], model.w[2], model.b);
    std::printf("test MSE = %.5f\n", meanSquaredError(model, test));   // ≈ 0.01
    assert(std::fabs(model.w[0] - 2.0) < 0.05 && std::fabs(model.w[1] + 3.0) < 0.05);
    return 0;
}
```

> **Note:** `std::vector<std::vector<double>>` is simple but not fast (each row is a separate allocation). Level 8's C++ network uses one flat array instead.

## 11. Polynomial regression: curves with a linear model

"Linear" means linear **in the weights**, not in x. Add features like x², x³ and the same code fits curves:

```python
import numpy as np

rng = np.random.default_rng(3)
x = rng.uniform(-3, 3, 200)
y = 0.5 * x**3 - x**2 + 2 + rng.normal(0, 1, 200)

# Features: x, x^2, x^3 (then scale them)
F = np.column_stack([x, x**2, x**3])
mu, sd = F.mean(0), F.std(0)
Fs = (F - mu) / sd

w, b = np.zeros(3), 0.0
for _ in range(3000):
    err = Fs @ w + b - y
    w -= 0.05 * 2 * Fs.T @ err / len(y)
    b -= 0.05 * 2 * err.mean()

coef = w / sd                                   # back to original units
print("x, x^2, x^3 coefficients:", coef.round(2))   # ≈ [0, -1, 0.5]
assert np.allclose(coef, [0.0, -1.0, 0.5], atol=0.15)
```

But too many polynomial features lets the model fit the noise — **overfitting**, the subject of Level 6.

## Checkpoint

- [ ] I can write the four steps of gradient descent from memory: predict, compute loss, gradient, update.
- [ ] I can derive ∂MSE/∂w and ∂MSE/∂b with the chain rule.
- [ ] I know why we scale features and why we compute scaling statistics on the training set only.
- [ ] I implemented linear regression in both NumPy and C++, and they learn the true weights.

## Exercises

1. In the loop version, try learning rates 0.001, 0.01, 0.03 and 0.05. Record the loss after 2000 epochs. Which one diverges, and why does it diverge at a smaller value than in the scaled NumPy example?
2. Remove feature scaling from the NumPy house example (use `X` instead of `Xs`). What's the largest learning rate that doesn't diverge? How many epochs does it now need?
3. Add **early stopping** to the mini-batch example: keep 10% of data for validation and stop when validation loss hasn't improved for 3 epochs.
4. Replace MSE with **mean absolute error** |ŷ − y|. Derive its gradient (hint: the derivative of |e| is sign(e)). When is MAE preferable? (Think about outliers.)
5. In C++, add an `R²` score function: R² = 1 − SS_res / SS_tot. What R² does your model reach on the test set?

:::details Show solution
1. x goes up to 10 and mean(x²) ≈ 41, so the loss curves very steeply along w (curvature ≈ 2·41 plus a little from b ≈ 85). Gradient descent is only stable if lr < 2/85 ≈ 0.024. So 0.01 converges (to w ≈ 2.909, b ≈ 2.545), 0.001 hasn't finished after 2000 epochs (w ≈ 3.06, b ≈ 1.47), and 0.03 and 0.05 explode to enormous numbers. In the scaled example every feature has variance 1, so the curvature is ~2 and lr up to ~1 is stable.
2. With unscaled features the curvature along "size" is about 2·mean(size²) ≈ 45,000, so lr must be below ~4e-5. At such a tiny rate the bedrooms and age weights barely move: you need hundreds of thousands of epochs. This is why scaling is not optional.
3.
```python
import numpy as np
rng = np.random.default_rng(1)
n, d = 10_000, 5
X = rng.normal(size=(n, d)); true_w = rng.normal(size=d)
y = X @ true_w + 0.5 + rng.normal(0, 0.1, n)
idx = rng.permutation(n); tr, va = idx[:9000], idx[9000:]
w, b = np.zeros(d), 0.0
best, bad = float('inf'), 0
for epoch in range(100):
    order = rng.permutation(tr)
    for s in range(0, len(order), 64):
        bt = order[s:s+64]
        e = X[bt] @ w + b - y[bt]
        w -= 0.05 * 2 * X[bt].T @ e / len(bt); b -= 0.05 * 2 * e.mean()
    val = np.mean((X[va] @ w + b - y[va]) ** 2)
    if val < best - 1e-6:
        best, bad = val, 0
    else:
        bad += 1
        if bad == 3:
            print("stopped at epoch", epoch); break
```
4. ∂MAE/∂w = (1/n) Σ sign(ŷᵢ − yᵢ) · xᵢ. Every example pushes with the same strength regardless of how big its error is, so a few huge outliers can't dominate the fit — MAE is more **robust**. (The Huber loss blends both: MSE for small errors, MAE for big ones.)
5. SS_res = Σ (yᵢ − ŷᵢ)², SS_tot = Σ (yᵢ − ȳ)². With noise std 0.1 the target variance is ≈ 4.4 and the error variance ≈ 0.01, so R² ≈ 1 − 0.01/4.4 ≈ 0.998.
:::

## External resources

- **Andrew Ng, Machine Learning Specialization — Course 1, Week 1–2** (linear regression and gradient descent).
- **CS229 Lecture Notes 1: Supervised Learning** (Stanford, free PDF): the MS-level derivation, including the normal equation.
- **StatQuest: "Gradient Descent, Step-by-Step"** and **"Linear Regression"** (YouTube).
- **An Introduction to Statistical Learning (ISLR / ISLP)**, Chapter 3 — free PDF at statlearning.com, now with Python labs.
- **Distill.pub — "Why Momentum Really Works"**: beautiful interactive look at gradient descent on valleys (preview of Level 10).
