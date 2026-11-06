# Level 5 · Logistic Regression & Classification

> **Key idea:** to predict a **category** (spam / not spam, digit 0–9) instead of a number, squash the linear model's output into a probability with the **sigmoid** (two classes) or **softmax** (many classes), and train with **cross-entropy**. This model is literally a one-layer neural network.

**Goals of this level**
- Build binary logistic regression from scratch: sigmoid, binary cross-entropy, gradient, training loop.
- See the beautiful result that its gradient is just **(prediction − label) × input**.
- Extend to many classes with **softmax regression**.
- Measure classifiers properly: accuracy, **precision, recall, F1**, confusion matrix, thresholds.

## 1. From a line to a probability

Linear regression outputs any number. For a yes/no question we want a probability between 0 and 1. The **sigmoid** function does exactly that:

```text
σ(z) = 1 / (1 + e^(−z))

z = −∞ → 0      z = 0 → 0.5      z = +∞ → 1
```

The model:

```text
z = w · x + b            (a "score", also called the logit)
p = σ(z)                 (probability that the label is 1)
predict 1 if p ≥ 0.5     (equivalently, if z ≥ 0)
```

The set of points where z = 0 is a straight line (a plane in more dimensions) — the **decision boundary**. Logistic regression is a *linear classifier*.

## 2. The loss: binary cross-entropy

From Level 3, the negative log-likelihood of a label t ∈ {0, 1}:

```text
loss = −[ t·log(p) + (1 − t)·log(1 − p) ]
```

- If t = 1: loss = −log p. Small when p is near 1.
- If t = 0: loss = −log(1 − p). Small when p is near 0.

> **Warning:** don't use MSE for classification. With a sigmoid, MSE gives tiny gradients when the model is confidently wrong (the sigmoid is flat there), so learning stalls. Cross-entropy's log cancels that flatness.

## 3. The gradient (the nicest result in ML)

Chain rule through loss → p → z → w:

```text
∂loss/∂p = −t/p + (1 − t)/(1 − p)
∂p/∂z    = p(1 − p)                    (sigmoid derivative, Level 2)
∂z/∂w    = x

Multiply and simplify:  ∂loss/∂z = p − t
So:                     ∂loss/∂w = (p − t) · x,     ∂loss/∂b = p − t
```

**Exactly the same form as linear regression**: (prediction − target) × input. That's no coincidence — it happens whenever you pair the "right" loss with the output function (MSE with identity, cross-entropy with sigmoid/softmax).

## 4. Logistic regression from scratch (NumPy)

```python
import numpy as np

rng = np.random.default_rng(0)

# Two blobs of points: class 0 around (-1, -1), class 1 around (1.5, 1.5)
n = 400
X0 = rng.normal(loc=[-1.0, -1.0], scale=1.0, size=(n // 2, 2))
X1 = rng.normal(loc=[1.5, 1.5], scale=1.0, size=(n // 2, 2))
X = np.vstack([X0, X1])
t = np.concatenate([np.zeros(n // 2), np.ones(n // 2)])

idx = rng.permutation(n)
train, test = idx[:300], idx[300:]

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))

def bce(p, t):
    eps = 1e-12                                  # avoid log(0)
    return -np.mean(t * np.log(p + eps) + (1 - t) * np.log(1 - p + eps))

w = np.zeros(2)
b = 0.0
lr = 0.1
for epoch in range(1000):
    p = sigmoid(X[train] @ w + b)                # forward: probabilities
    grad_z = p - t[train]                        # (prediction - label)
    w -= lr * X[train].T @ grad_z / len(train)   # average gradient
    b -= lr * grad_z.mean()
    if epoch % 250 == 0:
        print(f"epoch {epoch:4d}  loss {bce(p, t[train]):.4f}")

p_test = sigmoid(X[test] @ w + b)
accuracy = np.mean((p_test >= 0.5) == t[test])
print(f"w = {w.round(3)}, b = {b:.3f}, test accuracy = {accuracy:.3f}")   # ≈ 0.95
assert accuracy > 0.9
```

The learned boundary is the line `w₁x₁ + w₂x₂ + b = 0`, running between the two blobs.

> **Tip:** for very negative z, `np.exp(-z)` overflows. Production code uses a stable version: compute `log(1 + e^(−|z|))` and branch on the sign of z — or, better, compute the loss directly from the logits, which is what PyTorch's `BCEWithLogitsLoss` does.

## 5. Many classes: softmax regression

For K classes, use one weight vector per class — a weight **matrix** W of shape (K, d) — to get K scores, then softmax them:

```text
z = W x + b            shape (K,)
p = softmax(z)         K probabilities summing to 1
loss = −log p[true class]
```

And the gradient is again "prediction − target", where the target is a **one-hot** vector (1 for the true class, 0 elsewhere):

```text
∂loss/∂z = p − onehot(t)
∂loss/∂W = (p − onehot(t)) xᵀ        (outer product, shape (K, d))
```

```python
import numpy as np

rng = np.random.default_rng(1)

# Three classes in 2-D
centers = np.array([[0.0, 3.0], [-3.0, -2.0], [3.0, -2.0]])
X = np.vstack([rng.normal(c, 1.0, size=(150, 2)) for c in centers])
y = np.repeat([0, 1, 2], 150)
K, d = 3, 2

def softmax_rows(Z):
    Z = Z - Z.max(axis=1, keepdims=True)         # stability, row by row
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

W = np.zeros((K, d))
b = np.zeros(K)
onehot = np.eye(K)[y]                            # (450, 3)
lr = 0.1
for epoch in range(500):
    P = softmax_rows(X @ W.T + b)                # (450, 3)
    G = (P - onehot) / len(X)                    # dLoss/dZ, averaged
    W -= lr * G.T @ X                            # (3, 450) @ (450, 2) -> (3, 2)
    b -= lr * G.sum(axis=0)

loss = -np.mean(np.log(P[np.arange(len(y)), y]))
acc = np.mean(P.argmax(axis=1) == y)
print(f"loss {loss:.4f}, training accuracy {acc:.3f}")    # accuracy ≈ 0.99
assert acc > 0.95
```

> **Key:** this is **exactly** the last layer of every image classifier. A deep network just replaces the raw input x with learned features.

## 6. The same in C++

Binary logistic regression, one example at a time (stochastic gradient descent):

```cpp
#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <random>
#include <vector>

struct Sample {
    double x1;
    double x2;
    int label;          // 0 or 1
};

double sigmoid(double z) {
    // Stable for large |z|: never computes exp of a big positive number.
    if (z >= 0) {
        return 1.0 / (1.0 + std::exp(-z));
    }
    double e = std::exp(z);
    return e / (1.0 + e);
}

int main() {
    std::mt19937 rng(0);
    std::normal_distribution<double> noise(0.0, 1.0);
    std::vector<Sample> data;
    for (int i = 0; i < 400; i++) {
        int label = i % 2;
        double cx = label ? 1.5 : -1.0;          // class centres
        data.push_back({cx + noise(rng), cx + noise(rng), label});
    }

    double w1 = 0.0;
    double w2 = 0.0;
    double b = 0.0;
    const double lr = 0.05;
    for (int epoch = 0; epoch < 50; epoch++) {
        std::shuffle(data.begin(), data.end(), rng);
        double loss = 0.0;
        for (const Sample& s : data) {
            double p = sigmoid(w1 * s.x1 + w2 * s.x2 + b);
            double g = p - s.label;              // dLoss/dz = prediction - label
            w1 -= lr * g * s.x1;
            w2 -= lr * g * s.x2;
            b -= lr * g;
            double pc = std::clamp(p, 1e-12, 1.0 - 1e-12);
            loss += -(s.label * std::log(pc) + (1 - s.label) * std::log(1 - pc));
        }
        if (epoch % 10 == 0) {
            std::printf("epoch %2d  loss %.4f\n", epoch, loss / data.size());
        }
    }

    int correct = 0;
    for (const Sample& s : data) {
        int predicted = sigmoid(w1 * s.x1 + w2 * s.x2 + b) >= 0.5 ? 1 : 0;
        if (predicted == s.label) {
            correct++;
        }
    }
    double acc = static_cast<double>(correct) / data.size();
    std::printf("w = (%.3f, %.3f), b = %.3f, accuracy = %.3f\n", w1, w2, b, acc);
    assert(acc > 0.9);
    return 0;
}
```

## 7. Measuring a classifier

**Accuracy** (fraction correct) can lie. If 1% of transactions are fraud, a model that always says "not fraud" is 99% accurate and useless.

The **confusion matrix** for a binary classifier:

| | predicted 1 | predicted 0 |
|---|---|---|
| **actually 1** | TP (true positive) | FN (false negative) |
| **actually 0** | FP (false positive) | TN (true negative) |

| Metric | Formula | Question it answers |
|---|---|---|
| Precision | TP / (TP + FP) | "When I say yes, how often am I right?" |
| Recall (sensitivity) | TP / (TP + FN) | "Of all the real yeses, how many did I find?" |
| F1 | 2·P·R / (P + R) | One number balancing both |
| Specificity | TN / (TN + FP) | "Of the real nos, how many did I correctly reject?" |

**The threshold trade-off.** Predict 1 when p ≥ threshold. Lower the threshold → catch more positives (recall ↑) but more false alarms (precision ↓). A cancer screen wants high recall; a spam filter wants high precision (losing a real email is bad).

The **ROC curve** plots recall vs false-positive rate for every threshold; the **AUC** (area under it) is the probability that a random positive gets a higher score than a random negative (1.0 = perfect, 0.5 = coin flip).

```python
import numpy as np

def confusion(pred, t):
    tp = np.sum((pred == 1) & (t == 1))
    fp = np.sum((pred == 1) & (t == 0))
    fn = np.sum((pred == 0) & (t == 1))
    tn = np.sum((pred == 0) & (t == 0))
    return tp, fp, fn, tn

def precision_recall_f1(pred, t):
    tp, fp, fn, tn = confusion(pred, t)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1

def auc(scores, t):
    # Probability that a random positive scores higher than a random negative.
    pos = scores[t == 1]
    neg = scores[t == 0]
    wins = (pos[:, None] > neg[None, :]).sum() + 0.5 * (pos[:, None] == neg[None, :]).sum()
    return wins / (len(pos) * len(neg))

rng = np.random.default_rng(3)
t = (rng.random(1000) < 0.1).astype(int)             # only 10% positives
scores = np.clip(0.3 * t + rng.normal(0.3, 0.15, 1000), 0, 1)   # a mediocre model

for threshold in (0.3, 0.5, 0.7):
    pred = (scores >= threshold).astype(int)
    p, r, f1 = precision_recall_f1(pred, t)
    print(f"threshold {threshold}: precision {p:.2f}  recall {r:.2f}  F1 {f1:.2f}")
print(f"accuracy of always predicting 0: {np.mean(t == 0):.2f}   <- looks great, is useless")
print(f"AUC: {auc(scores, t):.3f}")
```

## 8. Logistic regression is a one-neuron network

```text
inputs x₁ … x_d ──(weights w)──► Σ + b ──► σ ──► p
```

That diagram *is* an artificial neuron. In Level 7 we'll stack many of them into layers, which lets the decision boundary bend — something a single logistic regression can't do.

## Checkpoint

- [ ] I can derive ∂loss/∂z = p − t for sigmoid + binary cross-entropy.
- [ ] I implemented binary and softmax logistic regression from scratch, and the accuracy is > 90%.
- [ ] I can explain why accuracy is misleading on imbalanced data and compute precision, recall and F1.
- [ ] I know why we don't use MSE with a sigmoid output.

## Exercises

1. Prove that the decision boundary of logistic regression is a straight line in 2-D.
2. Create a dataset where class 1 is a ring around class 0 (points with radius < 1 vs radius between 2 and 3). Train logistic regression on (x₁, x₂). What accuracy do you get? Now add the feature x₁² + x₂². What happens and why?
3. Add **L2 regularisation** to the binary model: loss += λ/2 · ‖w‖². What changes in the gradient? Try λ = 0.01 and λ = 1.
4. A classifier on a dataset with 50 positives and 950 negatives produces TP = 40, FP = 60. Compute precision, recall, F1 and accuracy.
5. Implement softmax regression in C++ for the 3-class blobs (use a `std::vector<std::array<double, 2>>` for W).

:::details Show solution
1. We predict class 1 when σ(z) ≥ 0.5, i.e. when z = w₁x₁ + w₂x₂ + b ≥ 0. The boundary w₁x₁ + w₂x₂ + b = 0 is the equation of a line (x₂ = −(w₁x₁ + b)/w₂).
2. With raw (x₁, x₂) the best line can only cut the plane in half, so accuracy stays near the share of the larger class (~50–60%). With the extra feature r² = x₁² + x₂², class 0 has r² < 1 and class 1 has r² > 4, so a threshold on that single feature separates them perfectly → ~100%. Choosing good features is powerful — and **learning** features automatically is exactly what hidden layers do (Level 7).
```python
import numpy as np
rng = np.random.default_rng(0)
r = np.concatenate([rng.uniform(0, 1, 200), rng.uniform(2, 3, 200)])
a = rng.uniform(0, 2 * np.pi, 400)
X = np.column_stack([r * np.cos(a), r * np.sin(a)])
t = np.repeat([0, 1], 200)
def fit(F):
    F = (F - F.mean(0)) / F.std(0)
    w = np.zeros(F.shape[1])
    b = 0.0
    for _ in range(2000):
        p = 1 / (1 + np.exp(-(F @ w + b)))
        g = p - t
        w -= 0.5 * F.T @ g / len(t)
        b -= 0.5 * g.mean()
    return np.mean(((F @ w + b) >= 0) == t)
print("raw features:", fit(X))                                      # ~0.5
print("with r^2:   ", fit(np.column_stack([X, (X**2).sum(1)])))     # 1.0
```
3. The gradient gains a term λw: `w -= lr * (X.T @ (p - t) / n + lam * w)`. The bias is usually not regularised. Larger λ pulls weights towards 0: the boundary stays in a similar place but the probabilities become less extreme (less over-confident).
4. FN = 50 − 40 = 10, TN = 950 − 60 = 890. Precision = 40/100 = **0.40**. Recall = 40/50 = **0.80**. F1 = 2·0.4·0.8/1.2 ≈ **0.533**. Accuracy = (40 + 890)/1000 = **0.93**, which hides the fact that 60% of alarms are false.
5. Same structure as the NumPy version: for each sample compute 3 scores, softmax them (subtract the max), set g_k = p_k − [k == y], then `W[k][j] -= lr * g_k * x[j]` and `b[k] -= lr * g_k`.
:::

## External resources

- **Andrew Ng, Machine Learning Specialization — Course 1, Week 3** (classification and logistic regression).
- **CS229 Lecture Notes 1, Part II** (logistic regression, Newton's method, generalised linear models).
- **StatQuest: "Logistic Regression"**, **"ROC and AUC, Clearly Explained"** (YouTube).
- **Google ML Crash Course — "Classification"**: thresholds, precision/recall, ROC with interactive widgets.
- **ISLP (statlearning.com), Chapter 4**: classification with Python labs.
