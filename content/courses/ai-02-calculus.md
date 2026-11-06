# Level 2 · Derivatives, Gradients & the Chain Rule

> **Key idea:** a **derivative** answers one question: *"if I nudge this input a tiny bit, how much does the output change?"* Training a model is just asking that question for every weight, then nudging each weight in the direction that makes the error smaller.

**Goals of this level**
- Understand a derivative as a **slope** / "sensitivity", and compute simple ones.
- Understand **partial derivatives** and the **gradient** (a vector of slopes).
- Master the **chain rule** — the entire idea behind backpropagation.
- Check any derivative numerically, in Python and C++. (You'll use this to debug every model you write.)

## 1. The derivative as a slope

Imagine you're standing on a hill in fog. You can't see the bottom, but you can feel which way the ground tilts under your feet. That tilt is the **derivative**.

For a function f(x), the derivative f′(x) is the slope at x:

```text
            f(x + h) − f(x)
f′(x)  ≈  ─────────────────     for a tiny h (like 0.00001)
                   h
```

Read it as "change in output ÷ change in input".

**Example:** f(x) = x². At x = 3, nudge by h = 0.001:

```text
f(3.001) = 9.006001       f(3) = 9
slope ≈ (9.006001 − 9) / 0.001 = 6.001   →  exactly 6 as h → 0
```

So at x = 3, increasing x by a little increases x² by about **6 times** as much.

### The handful of rules you actually need

| Function | Derivative | Example |
|---|---|---|
| c (constant) | 0 | f(x) = 5 → 0 |
| x | 1 | |
| xⁿ | n·xⁿ⁻¹ | x² → 2x, x³ → 3x² |
| c·f(x) | c·f′(x) | 3x² → 6x |
| f + g | f′ + g′ | x² + x → 2x + 1 |
| eˣ | eˣ | (its own slope!) |
| ln x | 1/x | |
| f·g (product rule) | f′g + fg′ | x·eˣ → eˣ + x·eˣ |

That's it. Everything else in deep learning is built from these plus the chain rule.

### What the sign tells you

- f′(x) > 0: going right goes **up**.
- f′(x) < 0: going right goes **down**.
- f′(x) = 0: flat — a bottom, a top, or a plateau.

**Minimising** a function = walking in the direction opposite to the slope until it's flat. That's gradient descent:

```text
x_new = x − learning_rate · f′(x)
```

```python
# Minimise f(x) = (x - 3)^2 + 1 by gradient descent. The answer is x = 3.
def f(x):
    return (x - 3) ** 2 + 1

def df(x):
    return 2 * (x - 3)          # derivative, by the power rule + chain rule

x = -4.0                        # start somewhere bad
lr = 0.1
for step in range(50):
    x = x - lr * df(x)          # step downhill
    if step % 10 == 0:
        print(f"step {step:2d}: x = {x:.4f}, f(x) = {f(x):.4f}")
print(f"final x = {x:.5f}")      # ≈ 3.00010
assert abs(x - 3) < 1e-3
```

## 2. Many inputs: partial derivatives and the gradient

A model's loss depends on **many** weights: L(w₁, w₂, …, wₙ). A **partial derivative** ∂L/∂wᵢ asks: "if I nudge only wᵢ (keeping all others fixed), how does L change?"

**Example:** f(x, y) = x² + 3xy + y³

```text
∂f/∂x = 2x + 3y        (treat y as a constant)
∂f/∂y = 3x + 3y²       (treat x as a constant)

At (x, y) = (1, 2):  ∂f/∂x = 2 + 6 = 8,   ∂f/∂y = 3 + 12 = 15
```

The **gradient** ∇f is all partial derivatives stacked into a vector:

```text
∇f(1, 2) = [8, 15]
```

**The key fact:** the gradient points in the direction of **steepest increase**. So −∇f points steepest **downhill**. Gradient descent for many weights:

```text
w_new = w − learning_rate · ∇L(w)       (every weight updated at once)
```

## 3. The chain rule — the engine of backpropagation

Most functions in ML are **compositions**: the output of one step feeds the next. If y = f(g(x)), then

```text
dy/dx = f′(g(x)) · g′(x)          "outer slope × inner slope"
```

**Intuition:** if g doubles small changes (g′ = 2) and f triples small changes (f′ = 3), then f(g(x)) multiplies small changes by 2 × 3 = 6. Slopes multiply along a chain.

**Example:** y = (3x + 1)²

```text
inner: u = 3x + 1        du/dx = 3
outer: y = u²            dy/du = 2u
chain: dy/dx = dy/du · du/dx = 2u · 3 = 6(3x + 1)
At x = 1: 6 · 4 = 24
```

**A neural-network-shaped example.** One neuron with weight w, input x = 2, target t = 1:

```text
z = w · x            (weighted input)
a = σ(z)             (sigmoid activation, σ(z) = 1 / (1 + e^(−z)))
L = (a − t)²         (squared error)

dL/dw = dL/da · da/dz · dz/dw
      = 2(a − t) · σ(z)(1 − σ(z)) · x
```

(σ′(z) = σ(z)(1 − σ(z)) is a famous identity; you'll prove it in the exercises.)

Each factor is a **local** derivative that only depends on one step. Backpropagation (Level 8) is simply: compute every local derivative and multiply them **from the output backwards**, reusing products so nothing is computed twice.

```python
import math

def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))

x, t = 2.0, 1.0
w = 0.5

# Forward pass: compute and remember every intermediate value.
z = w * x
a = sigmoid(z)
L = (a - t) ** 2

# Backward pass: chain rule, from the loss back to w.
dL_da = 2 * (a - t)
da_dz = a * (1 - a)              # sigmoid'(z) = sigmoid(z) * (1 - sigmoid(z))
dz_dw = x
dL_dw = dL_da * da_dz * dz_dw
print(f"L = {L:.6f}, dL/dw (chain rule) = {dL_dw:.6f}")

# Check numerically: nudge w and see how L changes.
h = 1e-6
def loss(w):
    return (sigmoid(w * x) - t) ** 2
numeric = (loss(w + h) - loss(w - h)) / (2 * h)
print(f"dL/dw (numerical)  = {numeric:.6f}")
assert abs(numeric - dL_dw) < 1e-8
```

## 4. Gradient checking — your safety net

The **centred difference** is much more accurate than the one-sided formula:

```text
f′(x) ≈ [f(x + h) − f(x − h)] / (2h)       error shrinks like h²
```

To check a gradient for many weights, nudge **one weight at a time** and compare with your analytic gradient using the **relative error**:

```text
relative error = |analytic − numeric| / max(|analytic|, |numeric|, tiny)

< 1e-7   perfect          ~1e-4  suspicious        > 1e-2  you have a bug
```

```python
import numpy as np

def f(v):
    x, y = v
    return x**2 + 3*x*y + y**3

def grad_f(v):                       # the analytic gradient we derived above
    x, y = v
    return np.array([2*x + 3*y, 3*x + 3*y**2])

def numerical_gradient(func, v, h=1e-5):
    g = np.zeros_like(v)
    for i in range(len(v)):
        old = v[i]
        v[i] = old + h
        f_plus = func(v)
        v[i] = old - h
        f_minus = func(v)
        v[i] = old                   # restore!
        g[i] = (f_plus - f_minus) / (2 * h)
    return g

v = np.array([1.0, 2.0])
analytic = grad_f(v)
numeric = numerical_gradient(f, v)
rel = np.abs(analytic - numeric) / np.maximum(np.abs(analytic), 1e-12)
print("analytic:", analytic, "numeric:", numeric)   # [8, 15] both
print("max relative error:", rel.max())
assert rel.max() < 1e-7
```

The same tool in C++ — written generically so it works for any function of a vector:

```cpp
#include <cassert>
#include <cmath>
#include <cstdio>
#include <functional>
#include <vector>

using Vec = std::vector<double>;

// Centred finite differences: nudge one coordinate at a time.
Vec numericalGradient(const std::function<double(const Vec&)>& f, Vec v, double h = 1e-5) {
    Vec g(v.size());
    for (size_t i = 0; i < v.size(); i++) {
        double old = v[i];
        v[i] = old + h;
        double plus = f(v);
        v[i] = old - h;
        double minus = f(v);
        v[i] = old;                          // restore the coordinate
        g[i] = (plus - minus) / (2.0 * h);
    }
    return g;
}

int main() {
    auto f = [](const Vec& v) {
        double x = v[0];
        double y = v[1];
        return x * x + 3 * x * y + y * y * y;
    };
    Vec v = {1.0, 2.0};
    Vec analytic = {2 * v[0] + 3 * v[1], 3 * v[0] + 3 * v[1] * v[1]};   // [8, 15]
    Vec numeric = numericalGradient(f, v);
    for (size_t i = 0; i < v.size(); i++) {
        double rel = std::fabs(analytic[i] - numeric[i]) / std::fabs(analytic[i]);
        std::printf("d/dv%zu: analytic %.6f  numeric %.6f  rel.err %.2e\n",
                    i, analytic[i], numeric[i], rel);
        assert(rel < 1e-7);
    }
    return 0;
}
```

## 5. Gradients of vector expressions (you'll need these)

When the loss involves matrices, the same rules apply entry by entry. Three results come up again and again:

| Expression | Gradient | Note |
|---|---|---|
| y = w · x (scalar) | ∂y/∂w = x | each weight's slope is its input |
| y = W x (vector) | ∂L/∂W = (∂L/∂y) xᵀ | an **outer product**: shape (out, in) |
| | ∂L/∂x = Wᵀ (∂L/∂y) | send the error back through the transpose |
| L = ½‖y − t‖² | ∂L/∂y = y − t | the ½ cancels the 2 from the power rule |

**How to remember the shapes:** a gradient always has **the same shape as the thing it's the gradient of**. W is (out, in), so ∂L/∂W must be (out, in) — and the only way to get that from a (out,) vector and an (in,) vector is the outer product.

```python
import numpy as np

rng = np.random.default_rng(1)
W = rng.normal(size=(2, 3))
x = rng.normal(size=3)
t = rng.normal(size=2)

def loss(W):
    y = W @ x
    return 0.5 * np.sum((y - t) ** 2)

# Analytic: dL/dy = y - t ; dL/dW = outer(dL/dy, x)
y = W @ x
dL_dy = y - t
dL_dW = np.outer(dL_dy, x)            # shape (2, 3), same as W

# Numerical check, entry by entry.
num = np.zeros_like(W)
h = 1e-5
for i in range(W.shape[0]):
    for j in range(W.shape[1]):
        Wp = W.copy(); Wp[i, j] += h
        Wm = W.copy(); Wm[i, j] -= h
        num[i, j] = (loss(Wp) - loss(Wm)) / (2 * h)

print("max abs difference:", np.abs(num - dL_dW).max())
assert np.allclose(num, dL_dW, atol=1e-8)
```

## Checkpoint

- [ ] I can explain a derivative as "how sensitive the output is to a nudge of the input".
- [ ] I can differentiate x³ + 2x, (2x − 1)², and e^(3x) using the rules and the chain rule.
- [ ] I know that −gradient points downhill, and can write the gradient-descent update.
- [ ] I can numerically check any gradient and interpret the relative error.

## Exercises

1. Differentiate: (a) f(x) = 4x³ − 2x + 7, (b) g(x) = (x² + 1)³, (c) h(x) = e^(−2x).
2. Prove σ′(z) = σ(z)(1 − σ(z)) for σ(z) = 1 / (1 + e^(−z)).
3. For f(x, y) = x²y + sin(y), compute ∇f at (2, 0) by hand, then confirm with `numerical_gradient`.
4. Gradient descent on f(x, y) = (x − 1)² + 10(y + 2)². Start at (0, 0). What happens with lr = 0.01, 0.09 and 0.11? Why does the y-direction cause trouble first?
5. In C++, use `numericalGradient` to check the gradient of L(w) = (σ(w·2) − 1)² at w = 0.5 against the chain-rule formula.

:::details Show solution
1. (a) 12x² − 2. (b) Chain rule: 3(x² + 1)² · 2x = 6x(x² + 1)². (c) −2e^(−2x).
2. σ(z) = (1 + e^(−z))⁻¹. Chain rule: σ′ = −(1 + e^(−z))⁻² · (−e^(−z)) = e^(−z) / (1 + e^(−z))². Write e^(−z) / (1 + e^(−z)) = 1 − σ(z), so σ′ = σ(z) · (1 − σ(z)).
3. ∂f/∂x = 2xy = 0; ∂f/∂y = x² + cos y = 4 + 1 = 5. So ∇f(2, 0) = [0, 5].
```python
import numpy as np
f = lambda v: v[0]**2 * v[1] + np.sin(v[1])
v = np.array([2.0, 0.0]); h = 1e-5; g = np.zeros(2)
for i in range(2):
    p = v.copy(); p[i] += h
    m = v.copy(); m[i] -= h
    g[i] = (f(p) - f(m)) / (2 * h)
print(g)   # ≈ [0. 5.]
```
4. The gradient is [2(x − 1), 20(y + 2)]. Each step multiplies the y-error by (1 − 20·lr) and the x-error by (1 − 2·lr). With lr = 0.01 both shrink (slowly in x). With lr = 0.09, 1 − 1.8 = −0.8: y overshoots and oscillates but still converges. With lr = 0.11, 1 − 2.2 = −1.2: the y-error grows by 20% each step and **diverges**. The steep direction (big curvature) limits the learning rate — this is exactly why feature scaling (Level 4) and adaptive optimisers like Adam (Level 10) exist.
5.
```cpp
#include <cmath>
#include <cstdio>
int main() {
    auto sig = [](double z) { return 1.0 / (1.0 + std::exp(-z)); };
    auto L = [&](double w) { double a = sig(w * 2.0); return (a - 1.0) * (a - 1.0); };
    double w = 0.5, h = 1e-6;
    double a = sig(w * 2.0);
    double analytic = 2 * (a - 1.0) * a * (1 - a) * 2.0;
    double numeric = (L(w + h) - L(w - h)) / (2 * h);
    std::printf("%.8f %.8f\n", analytic, numeric);   // agree to ~1e-9
    return 0;
}
```
:::

## External resources

- **3Blue1Brown — "Essence of Calculus"** (YouTube): chapters 1–4 give perfect intuition for derivatives and the chain rule.
- **Khan Academy — Multivariable calculus: gradients and partial derivatives.**
- **"The Matrix Calculus You Need For Deep Learning"** — Terence Parr & Jeremy Howard (free, explained.ai). Read it after Level 8.
- **CS231n notes — "Optimization: Stochastic Gradient Descent"** and "Backprop, Intuitions" (cs231n.github.io).
- **Mathematics for Machine Learning** (mml-book.github.io), Chapter 5: Vector Calculus.
