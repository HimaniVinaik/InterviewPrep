# Level 0 · Course Map & Setup

> **Key idea:** you don't need to "understand AI" before starting. You need three things: a little high-school maths, the ability to write a loop, and patience to build things step by step. Every idea in this course is turned into code you write yourself.

## What you will be able to do at the end

By the last level you will have **written from scratch**, without any ML library:

- a linear regression and a logistic regression model trained with gradient descent,
- a multi-layer neural network that learns to read handwritten digits (in Python **and** in C++),
- your own automatic-differentiation engine (a tiny PyTorch),
- a convolutional neural network (CNN),
- an attention layer and a tiny GPT-style language model,

…and then you'll use **PyTorch** (and its C++ API, LibTorch) the way professionals do, knowing exactly what happens under the hood.

## The big picture in one minute

| Term | Plain meaning |
|---|---|
| **AI** (Artificial Intelligence) | Any technique that makes a computer do something we'd call "smart". |
| **ML** (Machine Learning) | Instead of writing the rules, you give examples and the computer *finds* the rules. |
| **Deep Learning** | ML using neural networks with many layers. |
| **Model** | A function with adjustable numbers inside it (called **parameters** or **weights**). |
| **Training** | Adjusting those numbers so the model's outputs match the examples. |
| **Loss** | A single number that says "how wrong is the model right now?". Training = make it small. |
| **Gradient** | The direction that makes the loss go up fastest. Step the *opposite* way to improve. |

That last row is the heart of almost everything: **measure how wrong you are, find which way is "less wrong", take a small step that way, repeat.** It's called **gradient descent**, and you'll write it in Level 4.

### A tiny taste

Here's a complete "machine learning" program. It learns the rule `y = 2x + 1` from examples, without being told it:

```python
# Learn y = w*x + b from examples, using gradient descent.
xs = [0.0, 1.0, 2.0, 3.0, 4.0]
ys = [1.0, 3.0, 5.0, 7.0, 9.0]          # secretly y = 2x + 1

w, b = 0.0, 0.0                          # start knowing nothing
lr = 0.05                                # learning rate: size of each step

for step in range(2000):
    # How should w and b change to reduce the average squared error?
    grad_w, grad_b = 0.0, 0.0
    for x, y in zip(xs, ys):
        error = (w * x + b) - y          # prediction minus truth
        grad_w += 2 * error * x / len(xs)
        grad_b += 2 * error / len(xs)
    w -= lr * grad_w                     # step downhill
    b -= lr * grad_b

print(f"learned w = {w:.3f}, b = {b:.3f}")   # ≈ 2.000 and 1.000
```

If that feels like magic right now, good — by the end of Level 4 you will be able to explain every line.

## How this course maps to a Master's in AI

A typical MS in Computer Science with an AI focus covers the topics below. This course covers the same ground, but **practically**: each theory topic becomes code you run.

| MS course (typical name) | Where it lives here |
|---|---|
| Linear Algebra / Mathematics for ML | Levels 1–3 |
| Probability & Statistics | Level 3 |
| Machine Learning (CS229-style) | Levels 4–6 |
| Neural Networks & Deep Learning | Levels 7–10 |
| Computer Vision (CS231n-style) | Level 11 |
| Deep Learning Frameworks / Systems | Levels 12, 17 |
| Natural Language Processing (CS224n-style) | Levels 13–14 |
| Generative Models | Level 15 |
| Reinforcement Learning | Level 16 |
| ML Systems / Efficient ML / Edge AI | Level 17 |
| Thesis / Capstone / Reading research | Level 18 |

## How to study each level

1. **Read the theory once** without worrying about every detail.
2. **Type the code yourself** — don't copy-paste. Typing forces you to notice every line.
3. **Run it, then break it.** Change a number, delete a line, and predict what will happen before you run it again.
4. **Do the exercises.** Solutions are hidden in "Show solution" boxes. Try for at least 20 minutes first.
5. **Mark the level complete** at the bottom of the page to track your progress.

Rough pace: one level per week at ~5 hours/week gives you the whole course in about 4–5 months.

## Setup: Python + NumPy

Python is the language of ML research; NumPy gives you fast arrays.

```bash
python3 --version              # want 3.10 or newer
python3 -m venv ~/ai-course    # an isolated environment for this course
source ~/ai-course/bin/activate
pip install numpy matplotlib jupyter
```

Check it works:

```python
import numpy as np

a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])
print(a + b)          # [5. 7. 9.]   element by element
print(a @ b)          # 32.0         dot product: 1*4 + 2*5 + 3*6
print(np.__version__)
```

Later (Level 12) you'll add PyTorch:

```bash
pip install torch torchvision          # CPU is fine for this course
```

## Setup: C++

Every core algorithm is also written in plain C++17/20 with only the standard library, so you see exactly what the CPU does.

```bash
g++ --version                          # GCC 10+ or Clang 12+
```

Test program:

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<double> a = {1, 2, 3};
    std::vector<double> b = {4, 5, 6};
    double dot = 0.0;
    for (size_t i = 0; i < a.size(); i++) {
        dot += a[i] * b[i];          // the same dot product as in NumPy
    }
    std::cout << "dot = " << dot << "\n";   // 32
    return 0;
}
```

```bash
g++ -std=c++20 -O2 -Wall test.cpp -o test && ./test
```

> **Tip:** always compile with `-O2` for anything that trains a model — unoptimised C++ can be 10× slower. While debugging, add `-g -fsanitize=address,undefined` to catch memory bugs.

## The datasets we'll use

| Dataset | What | Used in |
|---|---|---|
| Synthetic data | Points we generate ourselves with NumPy | Levels 4–7 |
| **MNIST** | 70,000 hand-written digits, 28×28 grey pixels | Levels 8, 11, 12 |
| Tiny Shakespeare | ~1 MB of text | Levels 13–14 |

MNIST can be downloaded once and reused; Level 8 includes a loader written from scratch (it's a very simple file format).

## Checkpoint

You're ready for Level 1 when you can:

- [ ] run a Python script that imports NumPy,
- [ ] compile and run a C++ program with `g++`,
- [ ] explain in your own words what "training a model" and "loss" mean.

## Exercises

1. Run the "tiny taste" program. Change `lr` to `0.2`. What happens? Then try `0.001`.
2. Change the data so the hidden rule is `y = −3x + 4`. Does the program still find it?
3. Write the dot-product program in C++ for two vectors of length 1,000,000 filled with 1.0. Time it with and without `-O2`.

:::details Show solution
1. With `lr = 0.2` the steps are too big: `w` and `b` jump back and forth past the answer and grow towards infinity (you'll see `nan` or huge numbers). With `0.001` it is heading the right way, but after 2000 steps it hasn't finished (w ≈ 2.03 and b ≈ 0.92 — still noticeably off) — the steps are too small. Choosing the learning rate is a real part of training; Level 4 explains why.
2. Yes: set `ys = [-3*x + 4 for x in xs]`. Gradient descent doesn't know the rule — it only follows the error downhill, so any straight line works.
3. Use `std::chrono::steady_clock` around the loop. With `-O2` the loop is vectorised (SIMD) and typically 5–10× faster than with `-O0`.
:::

## External resources

- **3Blue1Brown — "Neural Networks"** (YouTube): the best visual intuition for what's coming.
- **Andrew Ng — Machine Learning Specialization** (Coursera): gentle and very clear.
- **fast.ai — Practical Deep Learning for Coders**: top-down, code-first; a great complement.
- **NumPy quickstart**: numpy.org/doc/stable/user/quickstart.html
- **Book — *Deep Learning* by Goodfellow, Bengio & Courville** (free online at deeplearningbook.org): the "textbook" of an MS course; use it as a reference.
