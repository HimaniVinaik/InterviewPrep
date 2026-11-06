# Level 18 · Capstones, Papers & the MS Roadmap

> **Key idea:** you now know how every major piece of modern AI works, because you've built each one. The final step — the same as in a master's programme — is to **build something substantial on your own**, learn to **read and reproduce research**, and fill in the remaining theory. This level gives you projects, a method for papers, the full curriculum map, and an interview question bank.

## 1. Capstone projects

Pick **one** to start; each takes 2–6 weeks. Every project has a C++ angle, because that combination (ML + systems) is rare and valuable.

### Project A — "MicroTorch": a tensor library with autograd in C++

- **Goal:** a small C++20 library with an N-dimensional `Tensor`, broadcasting, matmul, conv2d, ReLU/softmax/cross-entropy, reverse-mode autograd (Level 9 at tensor level), SGD/Adam (Level 10), and a training loop that reaches > 98% on MNIST with a CNN.
- **Milestones:** (1) Tensor storage + strides + broadcasting with unit tests; (2) autograd graph with `shared_ptr` nodes and topological backward; (3) layers + optimisers; (4) MNIST MLP then CNN; (5) speed: im2col + a tiled/BLAS matmul, OpenMP.
- **Stretch:** a CUDA backend for matmul and element-wise ops; a Python binding with pybind11.

### Project B — Train and deploy a small language model

- **Goal:** train a 10–50M-parameter GPT (Level 14) on a dataset you care about (code, a book series, your notes), with a BPE tokenizer you trained, and serve it from C++.
- **Milestones:** tokenizer → data pipeline → training with AdamW + cosine schedule + mixed precision → evaluation (validation loss, sample quality) → KV-cache generation → export (ONNX or `torch.export`) → a C++ command-line chat program.
- **Stretch:** int8/int4 weight quantisation of your model (Level 17), LoRA fine-tuning on an instruction dataset.

### Project C — Edge AI: keyword spotting on a microcontroller

- **Goal:** recognise 2–10 spoken words ("yes", "no", "stop") on an Arm Cortex-M or ESP32 board, in real time.
- **Milestones:** record/obtain audio (e.g. the Speech Commands dataset) → compute MFCC/log-mel features → train a small CNN in PyTorch → quantise to int8 → hand-write (or generate with TFLite Micro / CMSIS-NN) the int8 inference code in C → measure latency, RAM and flash on the board.
- **Stretch:** your own fixed-point feature extraction in C; a power measurement; on-device anomaly detection.

### Project D — Computer vision application

- **Goal:** fine-tune a pretrained CNN or ViT (Level 12 transfer learning) on your own photos (e.g. 5 kinds of plants), reach a strong validation accuracy, and build a demo.
- **Milestones:** collect & clean ~100 images per class → baseline → augmentation → fine-tuning schedule → error analysis (look at the confusion matrix and the misclassified images) → export to ONNX → C++ or web demo.
- **Stretch:** object detection (YOLO-style) or segmentation (U-Net) instead of classification.

### Project E — Reinforcement learning agent

- **Goal:** implement PPO from scratch and solve a continuous-control task (e.g. Gymnasium's LunarLander or a MuJoCo environment), or write your own simulated environment in C++ and train an agent on it.
- **Milestones:** actor-critic (Level 16 exercise 4) → GAE advantages → PPO clipping → hyper-parameter study → write-up with learning curves over 3+ seeds.

### What "done" looks like

1. A **GitHub repository** with a README: problem, approach, results table, how to run it.
2. **Reproducible** results: fixed seeds, a `requirements.txt` / CMake build, a script that regenerates every number.
3. An **honest evaluation**: a held-out test set, baselines, and a "what didn't work" section.
4. A short **write-up or blog post** — explaining your work is half the skill.

## 2. How to read a research paper

Use the **three-pass method** (S. Keshav, "How to Read a Paper"):

1. **Pass 1 (10 minutes):** title, abstract, introduction, section headings, figures, conclusion. Question: *what problem, what idea, does it matter to me?*
2. **Pass 2 (1 hour):** read the whole paper, skipping proofs. Understand every figure and table. Write a 5-sentence summary in your own words.
3. **Pass 3 (several hours):** re-derive the key equations and **re-implement the core idea**. This is where real understanding comes from.

**Reproducing a paper** is the best exercise in an MS programme: pick a classic with a small compute budget (e.g. the original ResNet on CIFAR-10, a DCGAN, DDPM on MNIST, DQN on CartPole), reproduce its main table, and write down every discrepancy you find.

### A reading list, in order

| # | Paper | Why |
|---|---|---|
| 1 | Rumelhart, Hinton & Williams 1986 — "Learning representations by back-propagating errors" | The origin of backprop |
| 2 | LeCun et al. 1998 — "Gradient-based learning applied to document recognition" | CNNs (LeNet) |
| 3 | Krizhevsky, Sutskever & Hinton 2012 — AlexNet | The deep-learning breakthrough |
| 4 | Kingma & Ba 2014 — Adam | The default optimiser |
| 5 | Ioffe & Szegedy 2015 — Batch Normalization | Training deep nets |
| 6 | He et al. 2016 — Deep Residual Learning | Skip connections |
| 7 | Vaswani et al. 2017 — Attention Is All You Need | Transformers |
| 8 | Devlin et al. 2019 — BERT; Radford et al. 2019 — GPT-2 | Pre-training |
| 9 | Kaplan et al. 2020; Hoffmann et al. 2022 — Scaling laws | Why bigger works |
| 10 | Ho et al. 2020 — DDPM; Rombach et al. 2022 — Latent Diffusion | Image generation |
| 11 | Mnih et al. 2015 — DQN; Schulman et al. 2017 — PPO | Deep RL |
| 12 | Ouyang et al. 2022 — InstructGPT; Rafailov et al. 2023 — DPO | Aligning LLMs |
| 13 | Dosovitskiy et al. 2021 — Vision Transformer | Transformers for images |
| 14 | Dao et al. 2022 — FlashAttention; Hu et al. 2021 — LoRA | Efficient LLMs |

Find papers on arXiv; **Papers with Code** links many of them to implementations and benchmark results.

## 3. The theory an MS programme adds

This course was deliberately practical. An MS in AI also covers more theory; here's what each topic is and where to learn it once you're comfortable with the practice.

| Topic | What it gives you | Where to learn |
|---|---|---|
| **Optimisation theory** | Convexity, convergence rates of GD/SGD, why Adam works (and when it doesn't), second-order methods | Boyd & Vandenberghe *Convex Optimization* (free); Bottou, Curtis & Nocedal "Optimization Methods for Large-Scale ML" |
| **Statistical learning theory** | Why models generalise: PAC learning, VC dimension, Rademacher complexity, bias–variance, double descent | Shalev-Shwartz & Ben-David *Understanding Machine Learning* (free) |
| **Kernel methods & SVMs** | Maximum-margin classifiers, the kernel trick, Gaussian processes | CS229 notes; Rasmussen & Williams *Gaussian Processes for ML* (free) |
| **Probabilistic modelling** | Graphical models, EM algorithm, variational inference, MCMC, Bayesian deep learning | Bishop *Pattern Recognition and ML*; Murphy *Probabilistic Machine Learning* (free) |
| **Information theory** | Entropy, KL, mutual information — the language of losses and compression | MacKay *Information Theory, Inference and Learning Algorithms* (free) |
| **Causality** | Correlation vs causation, interventions, counterfactuals | Pearl *The Book of Why*; Peters et al. *Elements of Causal Inference* (free) |
| **Responsible AI** | Fairness metrics, privacy (differential privacy), interpretability, safety | Barocas, Hardt & Narayanan *Fairness and Machine Learning* (free) |

As a taste of the classical side, here is a **linear SVM** trained with the same gradient-descent recipe you know — only the loss changes (the **hinge loss** wants each point on the correct side of the boundary **with a margin**):

```python
import numpy as np

rng = np.random.default_rng(0)
X = np.vstack([rng.normal([-2, -2], 1, (100, 2)), rng.normal([2, 2], 1, (100, 2))])
y = np.concatenate([-np.ones(100), np.ones(100)])        # SVM labels are -1 / +1

w, b, lam, lr = np.zeros(2), 0.0, 0.01, 0.1
for epoch in range(200):
    margins = y * (X @ w + b)
    violators = margins < 1                              # inside the margin or misclassified
    # hinge loss: mean(max(0, 1 - y(w·x + b))) + lam/2 * |w|^2
    grad_w = lam * w - (y[violators, None] * X[violators]).sum(0) / len(y)
    grad_b = -y[violators].sum() / len(y)
    w -= lr * grad_w
    b -= lr * grad_b

acc = np.mean(np.sign(X @ w + b) == y)
print(f"linear SVM: w = {w.round(3)}, b = {b:.3f}, training accuracy {acc:.3f}, margin width {2 / np.linalg.norm(w):.2f}")
assert acc > 0.95
```

## 4. Your full learning path

| Stage | Do | Time |
|---|---|---|
| 1. This course, Levels 0–18 | Every code block typed and run, every exercise attempted | 4–6 months |
| 2. One structured MS-level course with assignments | **CS231n** (vision) *or* **CS224n** (NLP) — do the assignments | 2–3 months |
| 3. A capstone (section 1) | Public repo + write-up | 1–2 months |
| 4. Theory deepening | One book from section 3, reading alongside papers | ongoing |
| 5. Reproduce a paper | Section 2 | 1 month |
| 6. Specialise | Vision / NLP & LLMs / RL / ML systems & edge AI | ongoing |

### Free MS-level courses, by topic

- **Machine learning:** Stanford CS229 (Andrew Ng / Tengyu Ma) — lectures and notes online.
- **Deep learning:** Stanford CS230; NYU Deep Learning (Yann LeCun & Alfredo Canziani); MIT 6.S191.
- **Vision:** Stanford CS231n. **NLP:** Stanford CS224n. **Generative models:** Stanford CS236.
- **Reinforcement learning:** David Silver's UCL course; Berkeley CS285 (Sergey Levine).
- **ML systems:** CMU 10-414/714 "Deep Learning Systems" (build your own framework — a perfect follow-on to Project A); MIT 6.5940 (efficient ML / TinyML).
- **Books to keep on your desk:** *Deep Learning* (Goodfellow et al.), *Dive into Deep Learning* (d2l.ai), *Understanding Deep Learning* (Prince), *Mathematics for Machine Learning* (Deisenroth et al.).

## 5. ML interview question bank

These come up in ML engineer / research engineer interviews. Each answer is short on purpose — expand from the relevant level.

### Interview Q&A

- **What is the bias–variance trade-off?** Simple models are consistently wrong in the same way (high bias, underfitting); complex models change a lot with the training sample (high variance, overfitting). You balance them with model size, regularisation and more data (Level 6).
- **Why do we need a validation set if we have a test set?** The validation set is for choosing hyper-parameters; using the test set for that leaks information and makes the final score optimistic (Level 6).
- **Explain backpropagation in one minute.** Run the network forward and keep every intermediate value; then apply the chain rule from the loss backwards, each layer turning the gradient of its output into gradients for its weights and its input (Level 8).
- **Why does the gradient of softmax + cross-entropy equal p − y?** The log in cross-entropy cancels the exponentials in softmax; differentiating −z_y + log Σ e^(z_j) gives softmax(z) − onehot(y) (Levels 5, 8).
- **What causes vanishing gradients and how do we fix them?** Repeated multiplication by small derivatives (saturating sigmoids/tanh, small weights, long RNN chains). Fixes: ReLU, He/Xavier init, normalisation, residual connections, LSTMs (Levels 10, 13).
- **What does batch normalisation do, and how does it behave at test time?** It normalises each feature over the batch and re-scales with learned γ, β, making training faster and more stable; at test time it uses running averages of the mean and variance (Level 10).
- **How does dropout work, and why scale by 1/(1 − p)?** Randomly zero activations during training so the network can't rely on any single unit; scaling the survivors keeps the expected activation equal so nothing changes at test time (Level 10).
- **Adam vs SGD with momentum?** Adam adapts a per-parameter step size from running gradient moments and works well with little tuning; SGD + momentum with a good schedule often generalises slightly better for CNNs (Level 10).
- **Why are convolutions better than fully connected layers for images?** Local connectivity and weight sharing give translation equivariance and far fewer parameters (Level 11).
- **What problem do residual connections solve?** They give gradients a direct path through the network and let blocks default to the identity, making very deep networks trainable (Level 11).
- **What are Q, K and V in attention?** Queries ask what each token is looking for, keys describe what each token offers, values are what gets passed on; weights = softmax(QKᵀ/√d), output = weights · V (Level 14).
- **Why divide by √d in attention?** Dot products of d-dimensional vectors grow with d; without scaling the softmax saturates and its gradients vanish (Level 14).
- **What is a KV cache?** During generation, store each layer's keys and values for past tokens so each new token only computes its own, turning quadratic recomputation into linear work per step (Level 14).
- **How is BERT different from GPT?** BERT is an encoder with bidirectional attention trained to fill in masked tokens (good for understanding/embeddings); GPT is a decoder with causal attention trained on next-token prediction (good for generation) (Level 14).
- **What is the reparameterisation trick?** Sample ε ~ N(0, 1) and compute z = μ + σε, so the sampling step becomes differentiable with respect to μ and σ (Level 15).
- **Why is GAN training unstable?** It's a two-player game rather than minimising one loss, so it can oscillate or collapse onto a few modes (Level 15).
- **What does a diffusion model learn?** To predict the noise that was added to a sample at a given noise level; generation runs that denoiser repeatedly starting from pure noise (Level 15).
- **Q-learning vs policy gradients?** Q-learning learns action values and acts greedily (off-policy, value-based); policy gradients directly adjust a stochastic policy to make high-return actions more likely (on-policy) (Level 16).
- **How would you make a model 4× smaller for a phone?** Int8 quantisation (possibly per-channel, with calibration or quantisation-aware training), then consider pruning, distillation or a mobile architecture (Level 17).
- **Your model's training loss won't go down. What do you check first?** The initial loss value, whether it can overfit a single small batch, the learning rate, the data and labels after preprocessing, and gradient checks for custom code (Level 10).
- **How do you handle a heavily imbalanced classification problem?** Use precision/recall/F1 or PR-AUC instead of accuracy, re-weight or re-sample classes, and tune the decision threshold (Level 5).
- **What is data leakage? Give an example.** When information from the validation/test data influences training — e.g. normalising features with statistics computed on the full dataset, or having near-duplicate images in train and test (Levels 4, 6).

## 6. Final checkpoint

You've completed the course when you can:

- [ ] explain, from memory, how a CNN and a transformer are trained — from the loss down to the weight update;
- [ ] implement an MLP with backprop in both Python and C++ without looking anything up;
- [ ] train, debug, export and deploy a PyTorch model, and run it from C++;
- [ ] read a new deep-learning paper and re-implement its core idea;
- [ ] show a finished capstone project in a public repository.

**Congratulations — that's the practical core of a master's in AI. Keep building.**

## External resources

- **S. Keshav — "How to Read a Paper"** (2-page PDF).
- **Papers with Code** (paperswithcode.com) and **arXiv Sanity / alphaXiv** for finding and discussing papers.
- **Chip Huyen — *Machine Learning Interviews*** (free online book): the most complete ML interview guide.
- **Full Stack Deep Learning** (fullstackdeeplearning.com): building real ML products.
- **Distill.pub** archive: beautifully explained research articles.
- **Communities:** r/MachineLearning, Hugging Face forums, EleutherAI Discord, local ML meetups and reading groups.
