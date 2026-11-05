# Calculus for ML

Training a neural network is calculus: compute how the loss changes with respect to every parameter (the gradient), then step downhill. You don't need to be a mathematician — you need derivatives, the chain rule, and gradient descent intuition.

## 1. Derivatives

The derivative f′(x) is the instantaneous rate of change — the slope of the tangent:

f′(x) = lim (h→0) [f(x + h) − f(x)] / h

| f(x) | f′(x) |
|---|---|
| c | 0 |
| xⁿ | n·xⁿ⁻¹ |
| eˣ | eˣ |
| ln x | 1/x |
| sin x / cos x | cos x / −sin x |
| σ(x) = 1/(1 + e⁻ˣ) | σ(x)(1 − σ(x)) |
| tanh x | 1 − tanh² x |
| ReLU(x) = max(0, x) | 1 if x > 0 else 0 |

**Rules:** sum (f + g)′ = f′ + g′; product (fg)′ = f′g + fg′; quotient (f/g)′ = (f′g − fg′)/g²; **chain rule** (f(g(x)))′ = f′(g(x))·g′(x).

## 2. Numerical derivatives

```cpp
double derivative(auto f, double x, double h = 1e-5) {
    return (f(x + h) - f(x - h)) / (2 * h);    // central difference: error O(h²)
}
```

Too large h → truncation error; too small → floating-point cancellation. ~1e-5 for doubles is a good start. Used for **gradient checking** — verifying analytic gradients in an ML implementation.

## 3. Partial derivatives & gradients

For f(x, y), the partial ∂f/∂x treats y as constant. The **gradient** ∇f = (∂f/∂x, ∂f/∂y, …) points in the direction of steepest increase; its magnitude is the steepness.

Example: f(x, y) = x²y + 3y → ∂f/∂x = 2xy, ∂f/∂y = x² + 3.

**Jacobian:** matrix of all first partial derivatives of a vector-valued function (used in robotics kinematics, EKF sensor fusion). **Hessian:** matrix of second derivatives (curvature; Newton's method).

## 4. The chain rule — heart of backpropagation

If L depends on y, and y depends on w: ∂L/∂w = ∂L/∂y · ∂y/∂w. In a network, gradients flow **backwards** layer by layer, multiplying local derivatives.

**Example: one neuron, squared loss**

```text
 z = w·x + b        ŷ = σ(z)        L = (ŷ − y)²

 ∂L/∂ŷ = 2(ŷ − y)
 ∂ŷ/∂z = σ(z)(1 − σ(z))
 ∂z/∂w = x,  ∂z/∂b = 1

 ∂L/∂w = 2(ŷ − y) · σ(z)(1 − σ(z)) · x
 ∂L/∂b = 2(ŷ − y) · σ(z)(1 − σ(z))
```

Frameworks (PyTorch, JAX) do this automatically: **automatic differentiation** records the computation graph in the forward pass and applies the chain rule in reverse (reverse-mode autodiff = backprop).

## 5. Gradient descent

Repeat: θ ← θ − η · ∇L(θ), where η is the **learning rate**.

```cpp
// Fit y = w*x + b by gradient descent on mean squared error
struct Fit { double w = 0, b = 0; };
Fit train(const std::vector<double>& xs, const std::vector<double>& ys, double lr = 0.01, int epochs = 2000) {
    Fit m; const double n = xs.size();
    for (int e = 0; e < epochs; ++e) {
        double gw = 0, gb = 0;
        for (size_t i = 0; i < xs.size(); ++i) {
            double err = (m.w * xs[i] + m.b) - ys[i];   // prediction - target
            gw += 2 * err * xs[i] / n;                  // dL/dw
            gb += 2 * err / n;                          // dL/db
        }
        m.w -= lr * gw;
        m.b -= lr * gb;
    }
    return m;
}
```

| Variant | Idea |
|---|---|
| Batch GD | gradient over the whole dataset (slow per step, stable) |
| **SGD / mini-batch** | gradient on a small random batch (noisy but fast; standard) |
| Momentum | accumulate velocity to smooth noisy steps and speed through ravines |
| RMSProp | per-parameter step sizes from recent gradient magnitudes |
| **Adam / AdamW** | momentum + RMSProp + bias correction (default optimiser for transformers) |

Learning rate too high → divergence/oscillation; too low → slow convergence. Schedules: warm-up then cosine decay.

## 6. Loss functions

| Loss | Formula | Use |
|---|---|---|
| Mean squared error | (1/n) Σ(ŷ − y)² | regression |
| Mean absolute error | (1/n) Σ\|ŷ − y\| | robust regression |
| Binary cross-entropy | −[y log ŷ + (1 − y) log(1 − ŷ)] | binary classification |
| Cross-entropy + softmax | −log softmax(z)_true | multi-class classification, LLM next-token prediction |

**Softmax:** softmax(z)ᵢ = e^zᵢ / Σⱼ e^zⱼ. Implement stably by subtracting max(z) first (prevents overflow in exp):

```cpp
std::vector<double> softmax(std::vector<double> z) {
    double mx = *std::ranges::max_element(z), sum = 0;
    for (double& v : z) { v = std::exp(v - mx); sum += v; }
    for (double& v : z) v /= sum;
    return z;
}
```

Neat fact: the gradient of cross-entropy w.r.t. the logits through softmax is simply **ŷ − y**.

## 7. Integrals (where they appear)

- Area under a curve: probability density → probability; energy from power over time (battery coulomb counting = integrating current).
- Numerical integration: Riemann sums, **trapezoid rule** ∫ ≈ Σ (f(xᵢ) + f(xᵢ₊₁))/2 · Δx, Simpson's rule.
- The **I** term in PID control is an integral.

## 8. Optimisation landscape vocabulary

- **Convex** functions have one global minimum (linear/logistic regression); neural networks are non-convex but SGD works well in practice.
- Local minima, saddle points, plateaus.
- **Vanishing gradients:** repeated multiplication of small derivatives (sigmoid saturates) → early layers stop learning. Fixes: ReLU/GELU, residual connections, normalisation layers, careful initialisation.
- **Exploding gradients:** gradient clipping.
- **Regularisation:** L2 weight decay adds λ|w|² to the loss → gradient adds 2λw.

## Practice

1. d/dx of (3x² + 2)⁵? → 5(3x² + 2)⁴ · 6x = **30x(3x² + 2)⁴**.
2. Gradient of f(x, y) = x² + y² at (1, 2)? → **(2, 4)**.
3. One GD step on f(x) = x² from x = 3 with η = 0.1? x ← 3 − 0.1·6 = **2.4**.
4. Why subtract max(z) in softmax? Prevents `exp` overflow; the result is mathematically identical.
