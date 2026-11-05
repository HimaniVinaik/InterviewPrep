# AI & Machine Learning Fundamentals

A practical tour from classical ML to transformers and LLMs — enough to hold a solid conversation in interviews, contribute to ML infrastructure (where C++/CUDA skills are in demand), and keep learning.

## 1. The landscape

```text
 AI ⊃ Machine Learning ⊃ Deep Learning ⊃ Transformers / LLMs
```

| Paradigm | Data | Examples |
|---|---|---|
| **Supervised** | labelled (x, y) | classification (spam), regression (price) |
| **Unsupervised** | unlabelled | clustering (k-means), dimensionality reduction (PCA) |
| **Self-supervised** | labels derived from the data itself | next-token prediction (LLMs), masked image modelling |
| **Reinforcement learning** | rewards from an environment | robotics, games, RLHF for chatbots |

## 2. The ML workflow

1. Define the problem and the metric that matters.
2. Collect and clean data; split into **train / validation / test** (never tune on test).
3. Choose a baseline (simple model) → iterate.
4. Train: minimise a loss with gradient descent (see *Math → Calculus for ML*).
5. Evaluate on held-out data; analyse errors.
6. Deploy, monitor drift, retrain.

## 3. Classical models you should know

| Model | Idea | Notes |
|---|---|---|
| Linear regression | ŷ = w·x + b, MSE loss | closed form or GD |
| Logistic regression | σ(w·x + b), cross-entropy | linear decision boundary; strong baseline |
| k-NN | vote of nearest neighbours | no training; slow inference |
| Decision trees | recursive feature splits | interpretable; overfit alone |
| Random forest / **gradient boosting** (XGBoost, LightGBM) | ensembles of trees | best for tabular data |
| SVM | max-margin boundary (+ kernels) | |
| k-means | iterate: assign to nearest centroid, recompute | clustering |
| PCA | project onto top eigenvectors of covariance | compression/visualisation |

```cpp
// k-means in C++ (Lloyd's algorithm) — ML is just math + loops
std::vector<int> kmeans(const std::vector<std::array<float, 2>>& pts, int k, int iters) {
    std::vector<std::array<float, 2>> c(pts.begin(), pts.begin() + k);   // naive init
    std::vector<int> label(pts.size());
    for (int it = 0; it < iters; ++it) {
        for (size_t i = 0; i < pts.size(); ++i) {                           // assign
            float best = 1e30f;
            for (int j = 0; j < k; ++j) {
                float dx = pts[i][0] - c[j][0], dy = pts[i][1] - c[j][1], d = dx * dx + dy * dy;
                if (d < best) { best = d; label[i] = j; }
            }
        }
        std::vector<std::array<float, 3>> acc(k, {0, 0, 0});               // update
        for (size_t i = 0; i < pts.size(); ++i) { auto& a = acc[label[i]]; a[0] += pts[i][0]; a[1] += pts[i][1]; a[2] += 1; }
        for (int j = 0; j < k; ++j) if (acc[j][2] > 0) c[j] = {acc[j][0] / acc[j][2], acc[j][1] / acc[j][2]};
    }
    return label;
}
```

## 4. Generalisation: bias, variance, overfitting

- **Underfitting** (high bias): too simple — poor on train and test.
- **Overfitting** (high variance): memorises training data — great on train, poor on test.
- Remedies for overfitting: more data, augmentation, regularisation (L2/weight decay, dropout), early stopping, simpler models, cross-validation for model selection.

### Metrics

| Task | Metrics |
|---|---|
| Classification | accuracy, **precision** = TP/(TP+FP), **recall** = TP/(TP+FN), F1, ROC-AUC, confusion matrix |
| Imbalanced data (fraud, faults) | precision/recall, PR-AUC — accuracy is misleading |
| Regression | MAE, RMSE, R² |
| Ranking / retrieval | precision@k, NDCG, MRR |
| LLMs | perplexity, task benchmarks, human/LLM-judge evals |

## 5. Neural networks

A **neuron**: y = activation(w·x + b). Stack them into layers; stack layers into networks. With non-linear activations (ReLU, GELU), networks approximate arbitrary functions.

**Training loop:** forward pass → loss → **backpropagation** (chain rule computes ∂loss/∂every weight) → optimiser step (SGD/Adam). Repeat over mini-batches for several epochs.

```python
# PyTorch: a complete training loop for a small classifier
import torch, torch.nn as nn

model = nn.Sequential(
    nn.Linear(784, 256), nn.ReLU(),
    nn.Dropout(0.1),
    nn.Linear(256, 10),                       # logits for 10 classes
)
opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
loss_fn = nn.CrossEntropyLoss()
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)

for epoch in range(5):
    model.train()
    for x, y in train_loader:                 # mini-batches from a DataLoader
        x, y = x.to(device).view(x.size(0), -1), y.to(device)
        logits = model(x)                     # forward
        loss = loss_fn(logits, y)
        opt.zero_grad()
        loss.backward()                       # autograd = backprop
        opt.step()                            # update weights
    model.eval()
    with torch.no_grad():                     # evaluation: no gradients
        acc = sum((model(x.to(device).view(x.size(0), -1)).argmax(1) == y.to(device)).sum().item()
                  for x, y in val_loader) / len(val_loader.dataset)
    print(f"epoch {epoch}: loss={loss.item():.3f} val_acc={acc:.3f}")
```

### Architectures

| Architecture | Inductive bias | Use |
|---|---|---|
| MLP (fully connected) | none | tabular, small problems, heads of bigger models |
| **CNN** (convolutions) | local patterns, translation invariance | images, audio spectrograms, sensor signals |
| RNN / LSTM / GRU | sequence order, recurrence | older NLP/time-series (largely replaced) |
| **Transformer** | attention: any token can attend to any other | language, vision (ViT), audio, multimodal |
| Diffusion models | iterative denoising | image/video/audio generation |
| GNN | graph structure | molecules, social graphs |

Training essentials: normalisation layers (BatchNorm/LayerNorm/RMSNorm), residual connections, good initialisation, learning-rate schedules, mixed precision (FP16/BF16), gradient clipping.

## 6. Transformers & attention

**Self-attention:** each token produces a query q, key k and value v (linear projections). Attention weights = softmax(QKᵀ / √d), output = weights · V. Each token gathers information from the tokens most relevant to it.

```python
import torch, math
def attention(Q, K, V, causal=False):                 # shapes: (batch, heads, seq, d)
    scores = Q @ K.transpose(-2, -1) / math.sqrt(Q.size(-1))
    if causal:                                        # decoder: can't look at future tokens
        T = Q.size(-2)
        scores = scores.masked_fill(torch.triu(torch.ones(T, T, dtype=torch.bool, device=Q.device), 1), float("-inf"))
    return torch.softmax(scores, dim=-1) @ V
```

A transformer block = multi-head attention + MLP, each wrapped in residual connections and normalisation. Positional information comes from positional encodings (e.g. RoPE). Attention cost is O(n²) in sequence length → FlashAttention (IO-aware CUDA kernels), sparse/linear attention, KV caching.

## 7. Large language models (LLMs)

1. **Tokenisation:** text → subword tokens (BPE). ~4 characters per token in English.
2. **Pre-training:** predict the next token over trillions of tokens (self-supervised) → a base model.
3. **Post-training:** supervised fine-tuning on instructions + preference optimisation (RLHF, DPO, constitutional methods) → a helpful assistant.
4. **Inference:** autoregressive decoding — generate one token at a time, sampling with temperature/top-p; the **KV cache** stores past keys/values so each step is cheap.

Using LLMs in applications:
- **Prompting** (instructions, examples, structured output).
- **RAG (retrieval-augmented generation):** embed documents into vectors, retrieve the most similar chunks for a query (vector search), and include them in the prompt.
- **Tool use / agents:** the model calls functions/APIs in a loop to complete tasks.
- **Fine-tuning:** full or parameter-efficient (**LoRA/QLoRA**) adaptation to a domain.
- **Evaluation:** task-specific test sets; watch for hallucinations and prompt injection.

## 8. Where C++ and CUDA engineers fit

ML systems are full of performance-critical C++:
- **Kernels:** matmul/attention/convolution in CUDA, Triton, CUTLASS (see *CUDA Programming*).
- **Inference engines:** TensorRT, ONNX Runtime, llama.cpp / ggml (C/C++, quantised CPU+GPU inference), vLLM (paged KV cache), PyTorch's C++ core (ATen, libtorch).
- **Quantisation:** INT8/INT4/FP8 weights to cut memory and bandwidth — a fixed-point problem you already understand from embedded work.
- **TinyML / edge AI:** running models on microcontrollers with TensorFlow Lite Micro, CMSIS-NN, Edge Impulse; NPUs on MCUs (e.g. Arm Ethos-U). Keyword spotting, anomaly detection on vibration sensors, gesture recognition — a sweet spot combining embedded and AI.
- **Distributed training infrastructure:** NCCL collectives, data loaders, checkpointing.

## 9. Learning path

1. Python + NumPy fluency (see *Python for C++ Developers*).
2. Andrew Ng's ML/DL courses or fast.ai for intuition; *Math → Linear Algebra* and *Calculus for ML* here.
3. Build an MLP from scratch in NumPy (forward + backward) — then the same in PyTorch.
4. Train a CNN on CIFAR-10; a small transformer on text (Karpathy's "Neural Networks: Zero to Hero" / nanoGPT).
5. Run an open LLM locally with llama.cpp; read its C++ source.
6. Write a CUDA or Triton kernel for softmax/layer-norm and benchmark it against PyTorch.
7. Deploy a tiny model on an MCU (TensorFlow Lite Micro) to merge your embedded and AI skills.

## Interview Q&A

- **Bias vs variance?** Error from overly simple assumptions vs sensitivity to the specific training set.
- **Why do we need non-linear activations?** Without them, stacked linear layers collapse into one linear map.
- **What does backprop compute?** Gradients of the loss with respect to every parameter, via the chain rule in reverse topological order.
- **Why use a validation set?** To tune hyperparameters and detect overfitting without contaminating the test estimate.
- **What is attention?** A learned, data-dependent weighted average: each token mixes information from others according to query–key similarity.
- **Why are GPUs used for deep learning?** Training and inference are dominated by large matrix multiplications — massively parallel, high-bandwidth workloads.
- **What is quantisation?** Representing weights/activations with fewer bits (INT8/INT4/FP8) to reduce memory and speed up inference, with calibration to limit accuracy loss.
