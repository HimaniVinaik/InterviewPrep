# CUDA Programming

CUDA lets you run C++ on NVIDIA GPUs: thousands of lightweight threads executing the same kernel on different data. It powers deep learning, simulation, image processing and HPC. This guide gets you from zero to writing and optimising real kernels.

## 1. Why GPUs?

| | CPU | GPU |
|---|---|---|
| Cores | few (8–128), complex, out-of-order | thousands of simple cores grouped into SMs |
| Optimised for | latency of one thread | **throughput** of many threads |
| Latency hiding | caches, prediction | massive multithreading: switch warps while others wait on memory |
| Memory bandwidth | ~100 GB/s | ~1–8 TB/s (HBM) |

GPUs excel at **data-parallel** work: the same operation over large arrays/matrices/images.

## 2. Execution model

```text
 Grid (one kernel launch)
 ├── Block (0,0)   ├── Block (1,0)   ...      blocks run independently, in any order
 │   ├── Warp 0: threads 0-31                  a warp = 32 threads executing in lockstep (SIMT)
 │   ├── Warp 1: threads 32-63
 │   └── ...  (up to 1024 threads per block)
```

- A **kernel** is a function marked `__global__`, launched with `<<<blocks, threadsPerBlock>>>`.
- Each block is scheduled onto one **Streaming Multiprocessor (SM)**; threads in a block can cooperate via **shared memory** and `__syncthreads()`.
- Built-in indices: `threadIdx`, `blockIdx`, `blockDim`, `gridDim` (each `.x/.y/.z`).

## 3. Hello, vector add

```cpp
#include <cstdio>
#include <vector>
#include <cuda_runtime.h>

#define CUDA_CHECK(call) do {                                                   \
    cudaError_t err_ = (call);                                                  \
    if (err_ != cudaSuccess) {                                                  \
        std::fprintf(stderr, "CUDA error %s at %s:%d\n",                         \
                     cudaGetErrorString(err_), __FILE__, __LINE__);             \
        std::exit(1);                                                           \
    }                                                                           \
} while (0)

__global__ void vec_add(const float* a, const float* b, float* c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;      // global thread index
    if (i < n) c[i] = a[i] + b[i];                      // guard: grid may overshoot n
}

int main() {
    const int n = 1 << 24;
    const size_t bytes = n * sizeof(float);
    std::vector<float> ha(n, 1.0f), hb(n, 2.0f), hc(n);

    float *da, *db, *dc;
    CUDA_CHECK(cudaMalloc(&da, bytes));
    CUDA_CHECK(cudaMalloc(&db, bytes));
    CUDA_CHECK(cudaMalloc(&dc, bytes));
    CUDA_CHECK(cudaMemcpy(da, ha.data(), bytes, cudaMemcpyHostToDevice));
    CUDA_CHECK(cudaMemcpy(db, hb.data(), bytes, cudaMemcpyHostToDevice));

    int threads = 256;
    int blocks = (n + threads - 1) / threads;           // ceil division
    vec_add<<<blocks, threads>>>(da, db, dc, n);
    CUDA_CHECK(cudaGetLastError());                     // launch errors
    CUDA_CHECK(cudaDeviceSynchronize());                // execution errors

    CUDA_CHECK(cudaMemcpy(hc.data(), dc, bytes, cudaMemcpyDeviceToHost));
    std::printf("c[0] = %f\n", hc[0]);                  // 3.0
    cudaFree(da); cudaFree(db); cudaFree(dc);
}
```

```bash
nvcc -O3 -std=c++20 -arch=sm_86 vec_add.cu -o vec_add   # sm_86 = Ampere consumer GPUs
```

### Grid-stride loops (robust for any n)

```cpp
__global__ void scale(float* x, float s, int n) {
    for (int i = blockIdx.x * blockDim.x + threadIdx.x; i < n; i += blockDim.x * gridDim.x)
        x[i] *= s;
}
```

## 4. Memory hierarchy

| Memory | Scope | Speed | Notes |
|---|---|---|---|
| Registers | thread | fastest | spills go to "local memory" (slow, in DRAM) |
| **Shared memory** | block | ~L1 speed | programmer-managed scratchpad, 48–228 KB per SM |
| L1 / L2 cache | SM / device | fast | automatic |
| **Global memory** | device | slow (~400+ cycles), high bandwidth | `cudaMalloc` |
| Constant memory | device, read-only | cached, broadcast | small lookup tables |
| Host memory | CPU | across PCIe/NVLink | pinned (`cudaMallocHost`) for fast async copies |

**Unified memory** (`cudaMallocManaged`) gives one pointer valid on CPU and GPU, migrating pages on demand — convenient, but explicit copies are often faster.

## 5. Performance rule #1: coalesced memory access

When the 32 threads of a warp access **consecutive addresses**, the hardware combines them into a few wide transactions. Strided or random access wastes bandwidth.

```cpp
// ✅ coalesced: thread i reads element i
out[i] = in[i];
// ❌ strided: thread i reads element i*32 -> 32 separate transactions
out[i] = in[i * 32];
```

Prefer **Struct-of-Arrays** layouts on the GPU for this reason.

## 6. Shared memory & synchronisation: parallel reduction

Sum an array: each block reduces its chunk in shared memory, then results are combined.

```cpp
template <int BLOCK>
__global__ void reduce_sum(const float* in, float* out, int n) {
    __shared__ float smem[BLOCK];
    int tid = threadIdx.x;
    int i = blockIdx.x * BLOCK * 2 + tid;

    float v = 0.0f;                                   // each thread adds two elements first
    if (i < n) v = in[i];
    if (i + BLOCK < n) v += in[i + BLOCK];
    smem[tid] = v;
    __syncthreads();                                  // all writes visible to the block

    for (int s = BLOCK / 2; s > 32; s >>= 1) {        // tree reduction in shared memory
        if (tid < s) smem[tid] += smem[tid + s];
        __syncthreads();
    }
    if (tid < 32) {                                   // last warp: use warp shuffles
        float x = smem[tid] + smem[tid + 32];
        for (int off = 16; off > 0; off >>= 1)
            x += __shfl_down_sync(0xffffffff, x, off);
        if (tid == 0) atomicAdd(out, x);              // combine block results
    }
}
// launch: reduce_sum<256><<<(n + 511) / 512, 256>>>(d_in, d_out, n);  (d_out zeroed first)
```

Key ideas: `__syncthreads()` is a block-wide barrier (never put it inside divergent code that not all threads reach!); **warp shuffles** exchange registers within a warp without shared memory; `atomicAdd` safely accumulates across blocks. In production, use **CUB** (`cub::DeviceReduce::Sum`) or Thrust.

## 7. Tiled matrix multiplication

Naive matmul reads each element of A and B from global memory N times. Tiling loads `TILE×TILE` sub-blocks into shared memory once and reuses them `TILE` times.

```cpp
constexpr int TILE = 16;

__global__ void matmul_tiled(const float* A, const float* B, float* C, int N) {
    __shared__ float As[TILE][TILE];
    __shared__ float Bs[TILE][TILE];
    int row = blockIdx.y * TILE + threadIdx.y;
    int col = blockIdx.x * TILE + threadIdx.x;
    float acc = 0.0f;

    for (int t = 0; t < (N + TILE - 1) / TILE; ++t) {
        int aCol = t * TILE + threadIdx.x, bRow = t * TILE + threadIdx.y;
        As[threadIdx.y][threadIdx.x] = (row < N && aCol < N) ? A[row * N + aCol] : 0.0f;
        Bs[threadIdx.y][threadIdx.x] = (bRow < N && col < N) ? B[bRow * N + col] : 0.0f;
        __syncthreads();                               // tile fully loaded
        for (int k = 0; k < TILE; ++k) acc += As[threadIdx.y][k] * Bs[k][threadIdx.x];
        __syncthreads();                               // done using this tile
    }
    if (row < N && col < N) C[row * N + col] = acc;
}
// dim3 block(TILE, TILE); dim3 grid((N + TILE - 1) / TILE, (N + TILE - 1) / TILE);
// matmul_tiled<<<grid, block>>>(dA, dB, dC, N);
```

Real libraries (cuBLAS, CUTLASS) add register tiling, vectorised loads, double buffering, and **Tensor Cores** (mixed-precision matrix units via WMMA/MMA instructions) — 10–100× more throughput for FP16/BF16/FP8.

## 8. Other performance topics

- **Occupancy:** active warps per SM relative to the maximum; limited by registers, shared memory and block size. Enough occupancy hides memory latency. Use 128–256 threads per block as a starting point (a multiple of 32).
- **Warp divergence:** threads of a warp taking different branches execute both paths serially. Keep branches uniform per warp.
- **Shared memory bank conflicts:** 32 banks; threads in a warp hitting the same bank (different addresses) serialise. Pad arrays (`[TILE][TILE + 1]`) to avoid them in transposes.
- **Arithmetic intensity:** FLOPs per byte moved. Low-intensity kernels are memory-bound — fuse kernels to avoid round trips to global memory.
- **Host–device transfers** over PCIe (~25–64 GB/s) are slow relative to GPU memory: minimise them, batch them, use **pinned memory** and **streams** to overlap copies with compute.

```cpp
cudaStream_t s[2];
for (auto& st : s) cudaStreamCreate(&st);
for (int c = 0; c < chunks; ++c) {
    auto& st = s[c % 2];
    cudaMemcpyAsync(d_in + off(c), h_in + off(c), chunk_bytes, cudaMemcpyHostToDevice, st);
    process<<<grid, block, 0, st>>>(d_in + off(c), d_out + off(c), chunk_n);
    cudaMemcpyAsync(h_out + off(c), d_out + off(c), chunk_bytes, cudaMemcpyDeviceToHost, st);
}
cudaDeviceSynchronize();
```

## 9. Tools & libraries

| Tool | Use |
|---|---|
| **Nsight Systems** (`nsys`) | timeline: kernels, copies, CPU activity, overlap |
| **Nsight Compute** (`ncu`) | per-kernel metrics: occupancy, memory throughput, roofline |
| `compute-sanitizer` | out-of-bounds, races, uninitialised memory (the GPU's ASan) |
| cuBLAS / cuDNN / cuFFT / cuSPARSE / cuRAND | optimised math libraries |
| Thrust / CUB / libcu++ | STL-like parallel algorithms and primitives |
| CUTLASS / CuTe | templated high-performance GEMM building blocks |
| Triton (Python) | write GPU kernels in Python (used by PyTorch) |
| Numba / CuPy | GPU from Python |

```cpp
#include <thrust/device_vector.h>
#include <thrust/sort.h>
#include <thrust/reduce.h>
thrust::device_vector<int> d(h.begin(), h.end());
thrust::sort(d.begin(), d.end());                         // GPU radix sort
int total = thrust::reduce(d.begin(), d.end(), 0);
```

## 10. Learning path

1. Install the CUDA Toolkit; run `nvidia-smi` and the samples (or use a cloud GPU / Colab).
2. Write vector add, SAXPY, grid-stride loops; add error checking.
3. Implement a reduction (naive → shared memory → warp shuffle) and measure each.
4. Implement matrix transpose (naive → shared memory → padded) and tiled matmul; compare against cuBLAS.
5. Profile with Nsight Compute; learn the roofline model.
6. Use streams to overlap transfers and compute.
7. Write a custom PyTorch op (C++/CUDA extension) or a Triton kernel — where CUDA meets AI.

Resources: NVIDIA *CUDA C++ Programming Guide* and *Best Practices Guide*, "Programming Massively Parallel Processors" (Hwu, Kirk, El Hajj), GPU MODE community lectures.

## Interview Q&A

- **What's a warp?** 32 threads that execute the same instruction together (SIMT).
- **Block vs grid?** A block is a group of cooperating threads on one SM (shared memory, barriers); a grid is all blocks of a launch.
- **What is memory coalescing?** Consecutive threads accessing consecutive addresses so the hardware merges them into few transactions.
- **When would you use shared memory?** Data reused by multiple threads in a block (tiling), or for cooperative operations (reductions, scans, transposes).
- **What causes warp divergence?** Data-dependent branches that differ between threads of a warp.
- **How do you hide memory latency on a GPU?** High occupancy (many warps to switch between), ILP, asynchronous copies, prefetching into shared memory.
