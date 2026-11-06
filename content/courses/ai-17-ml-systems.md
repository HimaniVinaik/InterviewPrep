# Level 17 · ML Systems: Speed, Deployment & Edge AI

> **Key idea:** a model that's accurate but too slow, too big or too power-hungry is useless in a product. ML systems engineering is about making models run **fast and cheaply** — on servers, phones and tiny microcontrollers. This is where strong C++ skills are a real advantage.

**Goals of this level**
- Reason about cost: **FLOPs, memory, bandwidth**, and why matrix multiplication speed is everything.
- Speed up matmul in C++ (cache tiling) and measure it.
- **Quantise** a network to int8 — maths, NumPy, C++ integer inference, and PyTorch.
- **Export** models (ONNX, TorchScript, `torch.export`) and run them with ONNX Runtime.
- Write a **CUDA kernel** for ML, and understand **TinyML** on microcontrollers.

## 1. Where the time goes

Almost all deep-learning compute is matrix multiplication (linear layers, convolutions via im2col, attention).

```text
(M × K) · (K × N): 2·M·N·K FLOPs   (one multiply + one add per term)

A 4096 × 4096 linear layer on a batch of 32:  2 · 32 · 4096 · 4096 ≈ 1.07 GFLOP
GPT-style model, forward pass per token:      ≈ 2 · (number of parameters) FLOPs
Training (forward + backward):                ≈ 6 · parameters · tokens FLOPs
```

Two limits decide the speed of each operation:

- **Compute-bound:** the chip can't do the arithmetic fast enough (big matmuls).
- **Memory-bound:** the chip waits for data from memory (element-wise ops like ReLU, LayerNorm, softmax; LLM decoding with batch size 1).

**Arithmetic intensity** = FLOPs per byte moved. High intensity → compute-bound. This is the idea behind the **roofline model**, and the reason frameworks **fuse** operations (do bias + ReLU + dropout in one pass over memory instead of three).

```python
import time
import numpy as np

n = 512
A = np.random.rand(n, n).astype(np.float32)
B = np.random.rand(n, n).astype(np.float32)

def matmul_python(A, B, size):
    C = [[0.0] * size for _ in range(size)]
    for i in range(size):
        for k in range(size):
            a = A[i][k]
            for j in range(size):
                C[i][j] += a * B[k][j]
    return C

small = 64
t0 = time.perf_counter()
matmul_python(A[:small, :small].tolist(), B[:small, :small].tolist(), small)
t_python = time.perf_counter() - t0
gflops_python = 2 * small ** 3 / t_python / 1e9

t0 = time.perf_counter()
for _ in range(10):
    A @ B
t_blas = (time.perf_counter() - t0) / 10
gflops_blas = 2 * n ** 3 / t_blas / 1e9
print(f"pure Python: {gflops_python:.3f} GFLOP/s   NumPy (BLAS): {gflops_blas:.1f} GFLOP/s   "
      f"-> {gflops_blas / gflops_python:,.0f}x faster")
```

## 2. Faster matmul in C++: loop order and tiling

Level 1 showed that loop order matters. **Tiling** (blocking) goes further: work on small sub-blocks that fit in the CPU cache, so each number loaded from memory is reused many times.

```cpp
#include <cassert>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <random>
#include <vector>

using Clock = std::chrono::steady_clock;

void matmulNaive(const float* A, const float* B, float* C, int n) {     // i-j-k: strided reads of B
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            float s = 0.0f;
            for (int k = 0; k < n; k++) {
                s += A[i * n + k] * B[k * n + j];
            }
            C[i * n + j] = s;
        }
    }
}

void matmulIKJ(const float* A, const float* B, float* C, int n) {       // contiguous inner loop
    for (int i = 0; i < n * n; i++) {
        C[i] = 0.0f;
    }
    for (int i = 0; i < n; i++) {
        for (int k = 0; k < n; k++) {
            float a = A[i * n + k];
            for (int j = 0; j < n; j++) {
                C[i * n + j] += a * B[k * n + j];
            }
        }
    }
}

void matmulTiled(const float* A, const float* B, float* C, int n, int T = 64) {
    for (int i = 0; i < n * n; i++) {
        C[i] = 0.0f;
    }
    for (int ii = 0; ii < n; ii += T) {                 // loop over tiles...
        for (int kk = 0; kk < n; kk += T) {
            for (int jj = 0; jj < n; jj += T) {
                // ...and multiply one T x T tile, which stays in cache.
                for (int i = ii; i < std::min(ii + T, n); i++) {
                    for (int k = kk; k < std::min(kk + T, n); k++) {
                        float a = A[i * n + k];
                        for (int j = jj; j < std::min(jj + T, n); j++) {
                            C[i * n + j] += a * B[k * n + j];
                        }
                    }
                }
            }
        }
    }
}

int main() {
    const int n = 256;
    std::mt19937 rng(0);
    std::uniform_real_distribution<float> u(-1.0f, 1.0f);
    std::vector<float> A(n * n), B(n * n), C1(n * n), C2(n * n), C3(n * n);
    for (float& x : A) {
        x = u(rng);
    }
    for (float& x : B) {
        x = u(rng);
    }

    auto time = [&](auto fn, std::vector<float>& C) {
        auto t0 = Clock::now();
        fn(A.data(), B.data(), C.data(), n);
        return std::chrono::duration<double>(Clock::now() - t0).count();
    };
    double tNaive = time(matmulNaive, C1);
    double tIKJ = time(matmulIKJ, C2);
    double tTiled = time([](const float* a, const float* b, float* c, int m) { matmulTiled(a, b, c, m); }, C3);
    double flops = 2.0 * n * n * n;
    std::printf("naive %.2f GFLOP/s | i-k-j %.2f GFLOP/s | tiled %.2f GFLOP/s\n",
                flops / tNaive / 1e9, flops / tIKJ / 1e9, flops / tTiled / 1e9);

    for (int i = 0; i < n * n; i++) {
        assert(std::fabs(C1[i] - C2[i]) < 1e-3 && std::fabs(C1[i] - C3[i]) < 1e-3);   // same answer
    }
    return 0;
}
```

Measured on this site's test machine, compiled with `-O3 -march=native` (no sanitizers):

| n | naive i-j-k | i-k-j | simple tiling |
|---|---|---|---|
| 256 | 2.1 GFLOP/s | 18.3 GFLOP/s | 14.8 GFLOP/s |
| 512 | 2.2 GFLOP/s | 17.3 GFLOP/s | 13.4 GFLOP/s |
| 1024 | **0.23** GFLOP/s | 11.5 GFLOP/s | 11.8 GFLOP/s |

**What this teaches:**
- **Memory access order is the big win:** i-k-j is ~8× faster than i-j-k because its inner loop reads contiguous memory, which the compiler also turns into SIMD instructions. At n = 1024 the naive version falls off a cliff (B no longer fits in cache, and every inner step is a cache miss).
- **Simple tiling alone doesn't help much here** — i-k-j already streams well, and the `std::min` bounds in the tiled inner loop make vectorisation harder. Tiling pays off once you also do what BLAS libraries do: **pack** tiles into contiguous buffers, keep a small block of C in **registers** (register blocking), and hand-tune the inner "micro-kernel". That's how OpenBLAS/MKL reach 100+ GFLOP/s per core.
- **Always measure.** Optimisations that "should" help sometimes don't.

Add `-fopenmp` and `#pragma omp parallel for` on the outer loop to use all cores. In production, **always use a BLAS library** (OpenBLAS, MKL, Apple Accelerate) or Eigen — NumPy's 360 GFLOP/s above comes from exactly that.

## 3. Quantisation: smaller and faster numbers

Storing weights as 8-bit integers instead of 32-bit floats makes a model **4× smaller**, and integer arithmetic is faster and uses less energy (crucial on phones and microcontrollers).

**Affine (asymmetric) quantisation** maps a float range [min, max] onto integers [−128, 127]:

```text
scale      = (max − min) / 255
zero_point = round(−128 − min / scale)
q = clamp(round(x / scale) + zero_point, −128, 127)       (quantise)
x ≈ (q − zero_point) · scale                              (dequantise)
```

**Symmetric** quantisation (common for weights) uses zero_point = 0 and scale = max|x| / 127.

An int8 matrix multiply accumulates products in **int32** (so they don't overflow), then rescales once at the end:

```text
y ≈ scale_w · scale_x · Σ (q_w · q_x)          (symmetric case)
```

```python
import gzip, os, struct, urllib.request
import numpy as np

# Train the Level 8 MNIST MLP quickly, then quantise its weights to int8.
URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"
def load(name, images):
    os.makedirs("mnist", exist_ok=True)
    p = os.path.join("mnist", name)
    if not os.path.exists(p):
        urllib.request.urlretrieve(URL + name, p)
    with gzip.open(p) as f:
        if images:
            f.read(16)
            return np.frombuffer(f.read(), np.uint8).reshape(-1, 784).astype(np.float32) / 255.0
        f.read(8)
        return np.frombuffer(f.read(), np.uint8).astype(np.int64)

Xtr, ytr = load("train-images-idx3-ubyte.gz", True), load("train-labels-idx1-ubyte.gz", False)
Xte, yte = load("t10k-images-idx3-ubyte.gz", True), load("t10k-labels-idx1-ubyte.gz", False)
rng = np.random.default_rng(0)
W1 = rng.normal(0, np.sqrt(2 / 784), (128, 784)).astype(np.float32)
b1 = np.zeros(128, np.float32)
W2 = rng.normal(0, np.sqrt(2 / 128), (10, 128)).astype(np.float32)
b2 = np.zeros(10, np.float32)
for epoch in range(3):
    for s in range(0, 60000, 64):
        X, y = Xtr[s:s + 64], ytr[s:s + 64]
        Z1 = X @ W1.T + b1
        A1 = np.maximum(0, Z1)
        Z2 = A1 @ W2.T + b2
        P = np.exp(Z2 - Z2.max(1, keepdims=True))
        P /= P.sum(1, keepdims=True)
        P[np.arange(len(y)), y] -= 1
        dZ2 = P / len(y)
        dZ1 = (dZ2 @ W2) * (Z1 > 0)
        W2 -= 0.1 * dZ2.T @ A1
        b2 -= 0.1 * dZ2.sum(0)
        W1 -= 0.1 * dZ1.T @ X
        b1 -= 0.1 * dZ1.sum(0)

def accuracy(W1, b1, W2, b2):
    return np.mean((np.maximum(0, Xte @ W1.T + b1) @ W2.T + b2).argmax(1) == yte)

def quantise_symmetric(W):
    scale = np.abs(W).max() / 127.0
    q = np.clip(np.round(W / scale), -127, 127).astype(np.int8)
    return q, scale

q1, s1 = quantise_symmetric(W1)
q2, s2 = quantise_symmetric(W2)
fp32 = accuracy(W1, b1, W2, b2)
int8 = accuracy(q1.astype(np.float32) * s1, b1, q2.astype(np.float32) * s2, b2)
print(f"float32 accuracy {fp32:.4f}   int8-weight accuracy {int8:.4f}")
print(f"weight memory: {(W1.nbytes + W2.nbytes) / 1024:.0f} KB -> {(q1.nbytes + q2.nbytes) / 1024:.0f} KB")
assert abs(fp32 - int8) < 0.01
```

Accuracy barely changes while the weights shrink 4×. Tricks for harder cases: **per-channel** scales (one scale per output row), **quantisation-aware training** (simulate rounding during training), and 4-bit formats (GPTQ, AWQ) for LLMs.

### Integer inference in C++

On a microcontroller without a floating-point unit, you run the whole layer in integers. Here, inputs and weights are int8, accumulation is int32, and a single float rescale happens at the end (in real firmware even that becomes a fixed-point multiply + shift).

```cpp
#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <random>
#include <vector>

// Symmetric int8 quantisation: q = round(x / scale), scale = max|x| / 127
float quantise(const std::vector<float>& x, std::vector<int8_t>& q) {
    float maxAbs = 0.0f;
    for (float v : x) {
        maxAbs = std::max(maxAbs, std::fabs(v));
    }
    float scale = maxAbs / 127.0f;
    q.resize(x.size());
    for (size_t i = 0; i < x.size(); i++) {
        q[i] = int8_t(std::clamp(std::lround(x[i] / scale), -127L, 127L));
    }
    return scale;
}

// y[o] = sum_i W[o][i] * x[i], all in integers, then one rescale.
std::vector<float> linearInt8(const std::vector<int8_t>& W, float sW, const std::vector<int8_t>& x, float sX,
                              int out, int in) {
    std::vector<float> y(out);
    for (int o = 0; o < out; o++) {
        int32_t acc = 0;                                   // int32 accumulator: no overflow
        for (int i = 0; i < in; i++) {
            acc += int32_t(W[o * in + i]) * int32_t(x[i]);
        }
        y[o] = float(acc) * sW * sX;                       // back to real units
    }
    return y;
}

int main() {
    const int in = 256;
    const int out = 64;
    std::mt19937 rng(0);
    std::normal_distribution<float> n(0.0f, 1.0f);
    std::vector<float> W(out * in), x(in);
    for (float& v : W) {
        v = n(rng) * 0.05f;
    }
    for (float& v : x) {
        v = n(rng);
    }

    // Float reference
    std::vector<float> ref(out, 0.0f);
    for (int o = 0; o < out; o++) {
        for (int i = 0; i < in; i++) {
            ref[o] += W[o * in + i] * x[i];
        }
    }

    std::vector<int8_t> qW, qx;
    float sW = quantise(W, qW);
    float sX = quantise(x, qx);
    std::vector<float> y = linearInt8(qW, sW, qx, sX, out, in);

    double maxErr = 0.0;
    double maxRef = 0.0;
    for (int o = 0; o < out; o++) {
        maxErr = std::max(maxErr, double(std::fabs(y[o] - ref[o])));
        maxRef = std::max(maxRef, double(std::fabs(ref[o])));
    }
    std::printf("int8 layer: max error %.4f relative to max output %.4f (%.2f%%), weights %zu -> %zu bytes\n",
                maxErr, maxRef, 100.0 * maxErr / maxRef, W.size() * sizeof(float), qW.size());
    assert(maxErr / maxRef < 0.03);
    return 0;
}
```

### Quantisation in PyTorch

```python
import torch
import torch.nn as nn

torch.manual_seed(0)
model = nn.Sequential(nn.Linear(256, 512), nn.ReLU(), nn.Linear(512, 10)).eval()
# Dynamic quantisation: weights stored in int8, activations quantised on the fly.
qmodel = torch.ao.quantization.quantize_dynamic(model, {nn.Linear}, dtype=torch.qint8)

x = torch.randn(64, 256)
with torch.no_grad():
    diff = (model(x) - qmodel(x)).abs().max().item()
size_fp32 = sum(p.numel() * 4 for p in model.parameters())
print(f"max output difference {diff:.4f}; fp32 weights {size_fp32 / 1024:.0f} KB -> roughly a quarter in int8")
assert diff < 0.05
```

## 4. Other ways to shrink a model

| Technique | Idea | Typical gain |
|---|---|---|
| **Pruning** | Remove weights (or whole channels) with small magnitude, fine-tune | 2–10× fewer weights; channel pruning gives real speed-ups |
| **Knowledge distillation** | Train a small "student" to match a big "teacher"'s output probabilities | Small model with much of the big one's accuracy |
| **Efficient architectures** | MobileNet (depthwise-separable convs), EfficientNet, small transformers | 5–20× less compute |
| **Low-rank factorisation** | Replace W (m×n) with A (m×r) · B (r×n) | Fewer parameters; also the idea behind LoRA |
| **Operator fusion & compilation** | `torch.compile`, TensorRT, XLA, TVM fuse ops and pick fast kernels | 1.3–3× faster |

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

# Knowledge distillation loss: match the teacher's softened probabilities.
def distillation_loss(student_logits, teacher_logits, labels, T=4.0, alpha=0.7):
    soft = F.kl_div(F.log_softmax(student_logits / T, dim=1),
                    F.softmax(teacher_logits / T, dim=1), reduction="batchmean") * T * T
    hard = F.cross_entropy(student_logits, labels)
    return alpha * soft + (1 - alpha) * hard

torch.manual_seed(0)
s, t = torch.randn(8, 10), torch.randn(8, 10)
y = torch.randint(0, 10, (8,))
print("distillation loss:", round(distillation_loss(s, t, y).item(), 4))
```

The temperature T > 1 reveals the teacher's "dark knowledge" — e.g. that a 7 looks a bit like a 1 — which a one-hot label doesn't contain.

## 5. Exporting models: ONNX and friends

**ONNX** is a standard file format for neural networks. Export once from PyTorch, then run it with **ONNX Runtime** (CPU/GPU, Python/C++/C#/Java/JS), **TensorRT** (NVIDIA GPUs) or **OpenVINO** (Intel) — no PyTorch needed at inference time.

```python
import numpy as np
import onnxruntime as ort
import torch
import torch.nn as nn

torch.manual_seed(0)
model = nn.Sequential(nn.Conv2d(1, 8, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d(1),
                      nn.Flatten(), nn.Linear(8, 10)).eval()
example = torch.randn(1, 1, 28, 28)
torch.onnx.export(model, (example,), "model.onnx", input_names=["image"], output_names=["logits"],
                  dynamic_axes={"image": {0: "batch"}})           # allow any batch size

session = ort.InferenceSession("model.onnx", providers=["CPUExecutionProvider"])
batch = np.random.rand(4, 1, 28, 28).astype(np.float32)
ort_out = session.run(None, {"image": batch})[0]
torch_out = model(torch.from_numpy(batch)).detach().numpy()
print("ONNX Runtime matches PyTorch:", np.allclose(ort_out, torch_out, atol=1e-5), ort_out.shape)
assert np.allclose(ort_out, torch_out, atol=1e-5)
```

| Path | When |
|---|---|
| **ONNX → ONNX Runtime / TensorRT** | Portable deployment, many languages and hardware vendors. |
| `torch.export` → **AOTInductor** | Compile a PyTorch model into a shared library callable from C++. |
| TorchScript → LibTorch | Older but simple (Level 12); still widely deployed. |
| **TensorFlow Lite / LiteRT, ExecuTorch** | Phones and embedded devices. |

## 6. Writing a CUDA kernel for ML

GPUs run thousands of threads in parallel. A matrix multiply kernel gives each thread one output element, and uses **shared memory tiles** so each value loaded from slow global memory is reused by many threads (the GPU version of section 2's tiling). The repository's **Learn → CUDA Programming** guide covers the GPU basics in depth.

> **Note:** this code needs an NVIDIA GPU and `nvcc`; it isn't run by this site's automatic tests (no GPU available), so treat it as a reference implementation to compile yourself.

```cuda
// matmul.cu — nvcc -O3 matmul.cu -o matmul
#include <cstdio>
#include <cuda_runtime.h>

constexpr int TILE = 16;

// C (M x N) = A (M x K) * B (K x N), row-major floats.
__global__ void matmulTiled(const float* A, const float* B, float* C, int M, int N, int K) {
    __shared__ float As[TILE][TILE];       // a tile of A, shared by the whole thread block
    __shared__ float Bs[TILE][TILE];
    int row = blockIdx.y * TILE + threadIdx.y;
    int col = blockIdx.x * TILE + threadIdx.x;
    float acc = 0.0f;
    for (int t = 0; t < (K + TILE - 1) / TILE; t++) {
        int aCol = t * TILE + threadIdx.x;
        int bRow = t * TILE + threadIdx.y;
        // Each thread loads one element of each tile (0 outside the matrix).
        As[threadIdx.y][threadIdx.x] = (row < M && aCol < K) ? A[row * K + aCol] : 0.0f;
        Bs[threadIdx.y][threadIdx.x] = (bRow < K && col < N) ? B[bRow * N + col] : 0.0f;
        __syncthreads();                    // wait until the whole tile is loaded
        for (int k = 0; k < TILE; k++) {
            acc += As[threadIdx.y][k] * Bs[k][threadIdx.x];
        }
        __syncthreads();                    // wait before overwriting the tiles
    }
    if (row < M && col < N) {
        C[row * N + col] = acc;
    }
}

int main() {
    const int M = 512, N = 512, K = 512;
    size_t bytesA = M * K * sizeof(float), bytesB = K * N * sizeof(float), bytesC = M * N * sizeof(float);
    float *hA = new float[M * K], *hB = new float[K * N], *hC = new float[M * N];
    for (int i = 0; i < M * K; i++) { hA[i] = 1.0f; }
    for (int i = 0; i < K * N; i++) { hB[i] = 2.0f; }

    float *dA, *dB, *dC;
    cudaMalloc(&dA, bytesA);
    cudaMalloc(&dB, bytesB);
    cudaMalloc(&dC, bytesC);
    cudaMemcpy(dA, hA, bytesA, cudaMemcpyHostToDevice);
    cudaMemcpy(dB, hB, bytesB, cudaMemcpyHostToDevice);

    dim3 block(TILE, TILE);
    dim3 grid((N + TILE - 1) / TILE, (M + TILE - 1) / TILE);
    matmulTiled<<<grid, block>>>(dA, dB, dC, M, N, K);
    cudaMemcpy(hC, dC, bytesC, cudaMemcpyDeviceToHost);
    printf("C[0] = %.1f (expected %.1f)\n", hC[0], 2.0f * K);    // 1 * 2 summed K times

    cudaFree(dA); cudaFree(dB); cudaFree(dC);
    delete[] hA; delete[] hB; delete[] hC;
    return 0;
}
```

Other ML kernels worth writing yourself: **softmax** (one block per row: reduce the max, then the sum), **LayerNorm**, a **fused bias + GELU**, and a **reduction**. Then look at **Triton** (write GPU kernels in Python) and **CUTLASS** (NVIDIA's C++ templates for fast GEMM). FlashAttention is "just" a very clever tiled attention kernel.

## 7. TinyML: neural networks on microcontrollers

Microcontrollers (Arm Cortex-M, ESP32, RISC-V) have **kilobytes** of RAM, no operating system and milliwatt power budgets — yet they run keyword spotting ("Hey device"), gesture recognition, vibration anomaly detection and small vision models.

| Constraint | Typical value | Consequence |
|---|---|---|
| Flash (stores weights) | 256 KB – 2 MB | int8 weights, small models (10–500k parameters) |
| RAM (activations) | 32 – 512 KB | Plan buffer reuse; peak activation memory matters most |
| No / slow FPU | | int8 arithmetic with fixed-point rescaling |
| No `malloc` | | Static arenas allocated at compile time |

The embedded toolchain:

- **TensorFlow Lite Micro / LiteRT for Microcontrollers** — interpreter with a static memory arena.
- **CMSIS-NN** — Arm's optimised int8 kernels using SIMD instructions on Cortex-M.
- **Edge Impulse**, **STM32Cube.AI**, **ExecuTorch** — end-to-end deployment tools.

In firmware, the float rescale from section 3 becomes a **fixed-point multiplier**: represent the real multiplier M = s_w·s_x / s_y as an int32 M₀ and a right shift n (M ≈ M₀ · 2⁻ⁿ), so the whole layer runs in integer arithmetic:

```cpp
#include <cassert>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <initializer_list>

// Represent a real multiplier 0 < m < 1 as (m0, shift): m ≈ m0 * 2^-shift, m0 in [2^30, 2^31).
void quantiseMultiplier(double m, int32_t& m0, int& shift) {
    shift = 0;
    while (m < 0.5) {
        m *= 2.0;
        shift++;
    }
    m0 = int32_t(std::lround(m * (1LL << 31)));
    shift += 31;
}

// Integer-only rescale of an int32 accumulator, with rounding: (acc * m0) >> shift
int32_t rescale(int32_t acc, int32_t m0, int shift) {
    int64_t prod = int64_t(acc) * int64_t(m0);
    int64_t round = int64_t(1) << (shift - 1);
    return int32_t((prod + round) >> shift);
}

int main() {
    const double realMultiplier = 0.0123456;   // e.g. s_w * s_x / s_y
    int32_t m0;
    int shift;
    quantiseMultiplier(realMultiplier, m0, shift);
    for (int32_t acc : {12345, -9876, 250000, 7}) {
        int32_t integerOnly = rescale(acc, m0, shift);
        long expected = std::lround(acc * realMultiplier);
        std::printf("acc %7d -> integer rescale %5d (float reference %5ld)\n", acc, integerOnly, expected);
        assert(std::labs(long(integerOnly) - expected) <= 1);
    }
    return 0;
}
```

## 8. Serving models in production

- **Latency vs throughput:** batching many requests together raises throughput (GPU efficiency) but adds waiting time. Servers use **dynamic batching** (Triton Inference Server, TorchServe).
- **LLM serving** is dominated by memory bandwidth and the **KV cache** (Level 14); systems like **vLLM** (PagedAttention) and **TensorRT-LLM** manage it efficiently, with continuous batching and speculative decoding.
- **Monitoring:** watch input distributions for **data drift**, track accuracy on labelled samples, log latency percentiles (p50/p99), and keep the ability to roll back a model.
- **Reproducibility:** version data, code, model weights and the exact preprocessing together (MLflow, DVC, Weights & Biases).

## Checkpoint

- [ ] I can estimate the FLOPs of a matrix multiply and of a transformer forward pass.
- [ ] I can explain compute-bound vs memory-bound and why operator fusion helps.
- [ ] I can quantise a tensor to int8 by hand and explain int32 accumulation.
- [ ] I exported a model to ONNX and ran it with ONNX Runtime.
- [ ] I can describe what changes when deploying to a microcontroller.

## Exercises

1. A 7-billion-parameter model in float16: how much memory do the weights need? In int4? How many FLOPs to generate one token?
2. Add `#pragma omp parallel for` to the outer loop of `matmulTiled` and compile with `-fopenmp`. How does GFLOP/s scale with the number of cores?
3. Implement **per-channel** quantisation (one scale per row of W1) in the NumPy MNIST example. Compare the accuracy with per-tensor quantisation when you quantise to **4 bits** (range −7…7).
4. Prune the 80% smallest-magnitude weights of W1 (set them to 0) and measure accuracy. Then fine-tune for one epoch keeping the zeros fixed.
5. Write a CUDA (or plain C++) **softmax** kernel for a (rows × cols) matrix that is numerically stable.

:::details Show solution
1. Weights: 7e9 × 2 bytes = **14 GB** in float16; 7e9 × 0.5 bytes = **3.5 GB** in int4. One token ≈ 2 × 7e9 = **14 GFLOP**. (Generation at batch size 1 is memory-bound: every token reads all 14 GB of weights, so memory bandwidth, not FLOPs, sets the speed.)
2. Parallelise over `ii` (independent rows of C, so no data races). Speed-up is close to the number of physical cores for large n, then flattens as memory bandwidth becomes the limit.
3. `scale = np.abs(W).max(axis=1, keepdims=True) / 7` and `q = np.clip(np.round(W / scale), -7, 7)`. With 4 bits, per-tensor quantisation loses noticeably more accuracy than per-channel, because one outlier row forces a coarse scale on every row.
4. `mask = np.abs(W1) >= np.quantile(np.abs(W1), 0.8); W1 *= mask`. Accuracy drops a little; fine-tuning with `W1 -= lr * dW1 * mask` recovers most of it — 80% of the first layer's weights are redundant.
5. One thread block per row: (1) parallel reduction to find the row max, (2) compute exp(x − max) and reduce the sum, (3) divide. In C++: the same three passes over each row.
:::

## External resources

- **"Efficient Deep Learning" / MIT 6.5940 TinyML and Efficient Deep Learning Computing** (Song Han; lectures free on YouTube, hanlab.mit.edu): quantisation, pruning, distillation, efficient LLM serving.
- **CS 329S — Machine Learning Systems Design** (Stanford) and **Chip Huyen — *Designing Machine Learning Systems*** (O'Reilly).
- **"Making Deep Learning Go Brrrr From First Principles"** — Horace He (blog): compute vs memory vs overhead.
- **Jacob et al. 2018** — "Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference" (the int8 scheme above).
- **ONNX Runtime docs**, **NVIDIA TensorRT docs**, **TensorFlow Lite Micro** and **CMSIS-NN** on GitHub, ***TinyML*** by Warden & Situnayake (O'Reilly).
- **Programming Massively Parallel Processors** (Hwu, Kirk, El Hajj) — the CUDA textbook; **Triton tutorials** (triton-lang.org).
