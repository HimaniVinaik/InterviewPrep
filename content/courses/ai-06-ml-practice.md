# Level 6 · Generalisation & Classic Algorithms

> **Key idea:** the goal of ML is **not** to do well on the training data — it's to do well on data the model has never seen. Everything in this level (validation sets, regularisation, cross-validation) exists to measure and improve that. Then you'll code four classic algorithms that every ML engineer should know: k-NN, decision trees, k-means and PCA.

**Goals of this level**
- Understand **overfitting vs underfitting** and the **bias–variance trade-off**.
- Use **train / validation / test** splits and **k-fold cross-validation** correctly.
- Apply **L2 / L1 regularisation** and see what they do to the weights.
- Implement **k-nearest neighbours**, a **decision tree**, **k-means** clustering and **PCA** from scratch.

## 1. Overfitting and underfitting

Fit polynomials of different degree to 15 noisy points from a smooth curve:

| Degree | Training error | Test error | Diagnosis |
|---|---|---|---|
| 1 (a line) | high | high | **Underfitting** — model too simple (high bias) |
| 3 | low | low | Just right |
| 14 | ~0 | huge | **Overfitting** — memorised the noise (high variance) |

```python
import numpy as np

rng = np.random.default_rng(0)

def true_f(x):
    return np.sin(2 * x)

x_train = np.sort(rng.uniform(-2, 2, 15))
y_train = true_f(x_train) + rng.normal(0, 0.2, 15)
x_test = np.linspace(-2, 2, 200)
y_test = true_f(x_test) + rng.normal(0, 0.2, 200)

def poly_features(x, degree):
    return np.column_stack([x ** k for k in range(degree + 1)])   # 1, x, x^2, ...

def fit(x, y, degree, lam=0.0):
    F = poly_features(x, degree)
    # Ridge regression closed form: (F^T F + lam*I)^-1 F^T y   (lam = 0 -> plain least squares)
    return np.linalg.solve(F.T @ F + lam * np.eye(degree + 1), F.T @ y)

def mse(w, x, y, degree):
    return np.mean((poly_features(x, degree) @ w - y) ** 2)

results = {}
for degree in (1, 3, 9, 14):
    w = fit(x_train, y_train, degree, lam=1e-10)   # tiny lam only for numerical stability
    results[degree] = (mse(w, x_train, y_train, degree), mse(w, x_test, y_test, degree))
    print(f"degree {degree:2d}: train MSE {results[degree][0]:.4f}   test MSE {results[degree][1]:.4f}")

assert results[3][1] < results[1][1]          # degree 3 beats the underfitting line
assert results[14][0] < results[3][0]         # degree 14 fits training data better...
assert results[14][1] > results[3][1]         # ...but generalises worse
```

**Bias–variance trade-off in one sentence:** simple models are consistently wrong in the same way (bias); complex models are wrong in different ways depending on which data they happened to see (variance). The best model balances the two — and more data lets you afford more complexity.

## 2. Train, validation, test

| Split | Used for | Typical size |
|---|---|---|
| **Training** set | fitting the weights | 60–80% |
| **Validation** set | choosing hyper-parameters (degree, λ, learning rate, when to stop) | 10–20% |
| **Test** set | one final, honest score — touch it **once** | 10–20% |

> **Warning:** every time you look at the test score and change something, you leak information about the test set into your model, and the score becomes optimistic. That's why the validation set exists.

**Hyper-parameters** are settings you choose (learning rate, number of layers, λ); **parameters** are what training learns (weights).

### k-fold cross-validation

When data is scarce, a single validation split is noisy. **k-fold CV**: split the training data into k folds; train k times, each time validating on a different fold; average the k scores.

```python
import numpy as np

rng = np.random.default_rng(1)
x = rng.uniform(-2, 2, 60)
y = np.sin(2 * x) + rng.normal(0, 0.2, 60)

def poly(x, d):
    return np.column_stack([x ** k for k in range(d + 1)])

def kfold_score(x, y, degree, lam, k=5):
    folds = np.array_split(rng.permutation(len(x)), k)
    scores = []
    for i in range(k):
        val = folds[i]
        tr = np.concatenate([folds[j] for j in range(k) if j != i])
        F = poly(x[tr], degree)
        w = np.linalg.solve(F.T @ F + lam * np.eye(degree + 1), F.T @ y[tr])
        scores.append(np.mean((poly(x[val], degree) @ w - y[val]) ** 2))
    return np.mean(scores)

best = None
for degree in range(1, 11):
    s = kfold_score(x, y, degree, lam=1e-6)
    if best is None or s < best[1]:
        best = (degree, s)
    print(f"degree {degree:2d}: 5-fold CV MSE {s:.4f}")
print("best degree by cross-validation:", best[0])
assert 3 <= best[0] <= 9
```

## 3. Regularisation: discouraging complexity

Add a penalty on large weights to the loss:

```text
L2 (Ridge):  loss = MSE + λ · Σ wⱼ²      → gradient gets + 2λ·w   ("weight decay")
L1 (Lasso):  loss = MSE + λ · Σ |wⱼ|     → gradient gets + λ·sign(w)
```

- **L2** shrinks all weights smoothly towards 0. Large weights are what let a polynomial wiggle wildly, so L2 smooths the fit.
- **L1** pushes many weights to **exactly** 0 — automatic feature selection.
- λ is a hyper-parameter: too small → overfits, too large → underfits. Choose it on the validation set.

From the probability view (Level 3), L2 = assuming a Gaussian **prior** on the weights; L1 = a Laplace prior.

```python
import numpy as np

rng = np.random.default_rng(0)
x = np.sort(rng.uniform(-2, 2, 15))
y = np.sin(2 * x) + rng.normal(0, 0.2, 15)
x_val = np.linspace(-2, 2, 200)
y_val = np.sin(2 * x_val)

F = np.column_stack([x ** k for k in range(15)])          # degree-14 polynomial
F_val = np.column_stack([x_val ** k for k in range(15)])

for lam in (1e-10, 1e-3, 1e-1, 10.0):
    w = np.linalg.solve(F.T @ F + lam * np.eye(15), F.T @ y)
    val = np.mean((F_val @ w - y_val) ** 2)
    print(f"lambda {lam:7.0e}: largest |w| {np.abs(w).max():10.2f}   validation MSE {val:.4f}")
```

Watch the largest weight shrink by orders of magnitude and the validation error drop, then rise again when λ is too big.

## 4. k-Nearest Neighbours (k-NN)

The simplest classifier there is: **to classify a point, look at the k closest training points and take a majority vote.** No training at all — the "model" is the data.

```python
import numpy as np

class KNN:
    def __init__(self, k=5):
        self.k = k

    def fit(self, X, y):
        self.X = X                    # "training" = remembering the data
        self.y = y
        return self

    def predict(self, Xq):
        # Squared distances from every query point to every training point: shape (q, n)
        d2 = ((Xq[:, None, :] - self.X[None, :, :]) ** 2).sum(axis=2)
        nearest = np.argsort(d2, axis=1)[:, :self.k]          # indices of the k closest
        votes = self.y[nearest]                               # their labels, shape (q, k)
        return np.array([np.bincount(v).argmax() for v in votes])

rng = np.random.default_rng(0)
X = np.vstack([rng.normal([0, 0], 1, (100, 2)), rng.normal([3, 3], 1, (100, 2))])
y = np.repeat([0, 1], 100)
idx = rng.permutation(200)
tr, te = idx[:150], idx[150:]

for k in (1, 5, 15):
    acc = np.mean(KNN(k).fit(X[tr], y[tr]).predict(X[te]) == y[te])
    print(f"k = {k:2d}: test accuracy {acc:.2f}")
```

- Small k → jagged boundary (overfits); large k → smooth (may underfit).
- **Always scale features** — distance is dominated by the feature with the biggest numbers.
- Prediction is slow (compare to every training point); in high dimensions all points look equally far apart (the **curse of dimensionality**).

## 5. Decision trees

A decision tree asks yes/no questions about features ("is x₁ < 2.3?") until it reaches a leaf with a prediction. Training greedily picks, at each node, the question that makes the two children as **pure** as possible.

**Gini impurity** of a group with class proportions p₁…p_K:

```text
Gini = 1 − Σ pₖ²         0 = pure (one class), 0.5 = 50/50 mix for 2 classes
```

The best split minimises the weighted average Gini of the two children.

```python
import numpy as np

def gini(y):
    if len(y) == 0:
        return 0.0
    p = np.bincount(y) / len(y)
    return 1.0 - np.sum(p ** 2)

def best_split(X, y):
    best = (None, None, gini(y))                 # (feature, threshold, impurity)
    for f in range(X.shape[1]):
        for thr in np.unique(X[:, f]):
            left = y[X[:, f] < thr]
            right = y[X[:, f] >= thr]
            if len(left) == 0 or len(right) == 0:
                continue
            impurity = (len(left) * gini(left) + len(right) * gini(right)) / len(y)
            if impurity < best[2]:
                best = (f, thr, impurity)
    return best

def build(X, y, depth=0, max_depth=4, min_samples=5):
    majority = int(np.bincount(y).argmax())
    if depth == max_depth or len(y) < min_samples or gini(y) == 0.0:
        return {"leaf": majority}
    f, thr, _ = best_split(X, y)
    if f is None:
        return {"leaf": majority}
    mask = X[:, f] < thr
    return {
        "feature": f, "threshold": thr,
        "left": build(X[mask], y[mask], depth + 1, max_depth, min_samples),
        "right": build(X[~mask], y[~mask], depth + 1, max_depth, min_samples),
    }

def predict_one(node, x):
    while "leaf" not in node:
        node = node["left"] if x[node["feature"]] < node["threshold"] else node["right"]
    return node["leaf"]

rng = np.random.default_rng(2)
X = rng.uniform(-3, 3, size=(400, 2))
y = ((X[:, 0] > 0) ^ (X[:, 1] > 0)).astype(int)        # XOR pattern: a line can't do this
tree = build(X[:300], y[:300])
acc = np.mean([predict_one(tree, x) == t for x, t in zip(X[300:], y[300:])])
print(f"decision tree test accuracy on XOR data: {acc:.2f}")    # ≈ 0.97+
assert acc > 0.9
```

Trees handle non-linear patterns and mixed feature types, need no scaling, and are easy to explain — but a single deep tree overfits. **Random forests** (many trees on random subsets, averaged) and **gradient-boosted trees** (XGBoost, LightGBM) fix that and are still the best tools for tabular data.

## 6. k-means clustering (unsupervised)

No labels — just find k groups. Repeat two steps:

1. **Assign** each point to its nearest centre.
2. **Move** each centre to the mean of its assigned points.

```python
import numpy as np

def kmeans(X, k, iters=100, seed=0):
    rng = np.random.default_rng(seed)
    centres = X[rng.choice(len(X), k, replace=False)]          # start at k random points
    for _ in range(iters):
        d2 = ((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2)
        labels = d2.argmin(axis=1)                             # 1. assign
        new = np.array([X[labels == j].mean(axis=0) if np.any(labels == j) else centres[j]
                        for j in range(k)])                    # 2. move
        if np.allclose(new, centres):
            break                                              # converged
        centres = new
    return centres, labels

rng = np.random.default_rng(5)
true_centres = np.array([[0, 0], [5, 5], [0, 6]])
X = np.vstack([rng.normal(c, 0.8, (100, 2)) for c in true_centres])
centres, labels = kmeans(X, 3)
print("found centres:\n", np.round(centres[np.argsort(centres[:, 0] + 10 * centres[:, 1])], 2))
```

k-means minimises the total squared distance to the centres. It can get stuck in a bad local minimum, so run it several times with different starts (or use **k-means++** initialisation) and keep the best.

## 7. PCA: compressing data to its main directions

**Principal Component Analysis** finds the directions along which the data varies most. Projecting onto the top few directions keeps most of the information in far fewer numbers — useful for visualisation, compression and speeding up other models.

Recipe: centre the data, compute the covariance matrix, take its top eigenvectors.

```python
import numpy as np

rng = np.random.default_rng(0)
# 3-D data that really lives near a 2-D plane
latent = rng.normal(size=(500, 2))
mixing = np.array([[2.0, 0.0, 1.0], [0.0, 1.0, 1.0]])
X = latent @ mixing + rng.normal(0, 0.05, (500, 3))

Xc = X - X.mean(axis=0)                          # 1. centre
cov = Xc.T @ Xc / (len(X) - 1)                   # 2. covariance (3 x 3)
eigvals, eigvecs = np.linalg.eigh(cov)           # 3. eigen-decomposition (ascending)
order = np.argsort(eigvals)[::-1]
eigvals, eigvecs = eigvals[order], eigvecs[:, order]

explained = eigvals / eigvals.sum()
print("variance explained by each component:", explained.round(4))   # third is tiny
Z = Xc @ eigvecs[:, :2]                          # 4. project to 2-D
X_back = Z @ eigvecs[:, :2].T + X.mean(axis=0)   # reconstruct from 2 numbers per point
print("reconstruction MSE:", np.mean((X_back - X) ** 2).round(5))
assert explained[2] < 0.01
```

## 8. k-NN in C++

```cpp
#include <algorithm>
#include <array>
#include <cassert>
#include <cstdio>
#include <random>
#include <vector>

struct Point {
    std::array<double, 2> x;
    int label;
};

int knnPredict(const std::vector<Point>& train, const std::array<double, 2>& q, int k) {
    // (squared distance, label) for every training point
    std::vector<std::pair<double, int>> dist;
    dist.reserve(train.size());
    for (const Point& p : train) {
        double dx = p.x[0] - q[0];
        double dy = p.x[1] - q[1];
        dist.push_back({dx * dx + dy * dy, p.label});
    }
    // Only the k smallest are needed: partial sort is O(n log k) instead of O(n log n).
    std::partial_sort(dist.begin(), dist.begin() + k, dist.end());
    int votes[2] = {0, 0};
    for (int i = 0; i < k; i++) {
        votes[dist[i].second]++;
    }
    return votes[1] > votes[0] ? 1 : 0;
}

int main() {
    std::mt19937 rng(0);
    std::normal_distribution<double> n01(0.0, 1.0);
    std::vector<Point> train, test;
    for (int i = 0; i < 300; i++) {
        int label = i % 2;
        double c = label ? 3.0 : 0.0;
        Point p{{c + n01(rng), c + n01(rng)}, label};
        if (i < 200) {
            train.push_back(p);
        } else {
            test.push_back(p);
        }
    }
    int correct = 0;
    for (const Point& p : test) {
        if (knnPredict(train, p.x, 5) == p.label) {
            correct++;
        }
    }
    double acc = static_cast<double>(correct) / test.size();
    std::printf("k-NN (k=5) accuracy: %.2f\n", acc);
    assert(acc > 0.9);
    return 0;
}
```

## Checkpoint

- [ ] I can explain overfitting, underfitting and the bias–variance trade-off with the polynomial example.
- [ ] I know what each of train / validation / test is for, and never tune on the test set.
- [ ] I can say what L1 and L2 regularisation do to the weights.
- [ ] I implemented k-NN, a decision tree, k-means and PCA, and they work on toy data.

## Exercises

1. In the polynomial example, plot (or print) train and test MSE for every degree 1–14. Where is the "sweet spot"?
2. Repeat the overfitting experiment with 150 training points instead of 15. What happens to the degree-14 model's test error? Why?
3. Implement **L1-regularised** linear regression with gradient descent (use `np.sign(w)`). On data where only 3 of 20 features matter, check that most of the other weights become ~0.
4. Add **k-means++** initialisation: pick the first centre at random, then pick each next centre with probability proportional to its squared distance to the nearest centre already chosen.
5. Build a **random forest**: train 25 trees, each on a bootstrap sample (sample n points with replacement) and with `max_depth=6`; predict by majority vote. Compare its test accuracy with a single tree on a noisy dataset.

:::details Show solution
1. Training MSE keeps falling as degree grows; test MSE falls until about degree 3–7 and then rises sharply. The sweet spot is the minimum of the test (or validation) curve.
2. With 10× more data, the degree-14 model has far less room to chase noise, so its test error drops close to the degree-3 model's. **More data is the best regulariser.**
3.
```python
import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(size=(500, 20))
w_true = np.zeros(20)
w_true[[2, 7, 11]] = [3.0, -2.0, 1.5]
y = X @ w_true + rng.normal(0, 0.1, 500)
w = np.zeros(20)
lam = 0.05
for _ in range(3000):
    g = 2 * X.T @ (X @ w - y) / len(y) + lam * np.sign(w)
    w -= 0.01 * g
print(np.round(w, 2))   # large values at 2, 7, 11; the rest within ~0.01 of 0
```
(Plain gradient descent makes the zeros "jitter" around 0; the proper algorithm uses a *soft-threshold* step — look up "proximal gradient / ISTA".)
4.
```python
import numpy as np
def kmeans_pp_init(X, k, rng):
    centres = [X[rng.integers(len(X))]]
    for _ in range(k - 1):
        d2 = np.min(((X[:, None] - np.array(centres)[None]) ** 2).sum(2), axis=1)
        centres.append(X[rng.choice(len(X), p=d2 / d2.sum())])
    return np.array(centres)
rng = np.random.default_rng(0)
X = rng.normal(size=(300, 2))
print(kmeans_pp_init(X, 3, rng).shape)   # (3, 2)
```
5. Use `rng.choice(n, n, replace=True)` for each bootstrap sample, call `build` from section 5 on it, and take `np.bincount(votes).argmax()` over the 25 trees. On noisy data the forest is typically several points more accurate than one tree, because averaging cancels out each tree's individual overfitting (it reduces variance).
:::

## External resources

- **ISLP — An Introduction to Statistical Learning with Python** (free at statlearning.com): Chapters 2 (bias–variance), 5 (cross-validation), 6 (regularisation), 8 (trees), 12 (PCA, k-means). The standard MS-level reference for this material.
- **StatQuest** videos: "Bias and Variance", "Cross Validation", "Ridge vs Lasso", "Decision Trees", "Random Forests", "PCA" (YouTube).
- **scikit-learn User Guide** (scikit-learn.org): once you've written these yourself, learn the production versions.
- **Hands-On Machine Learning** by Aurélien Géron, Part I — practical classic ML with scikit-learn.
- **CS229 notes** on regularisation and model selection, and on k-means / PCA / EM.
