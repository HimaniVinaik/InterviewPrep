# Computer Architecture for Programmers

Modern CPUs are fast only when your code cooperates with caches, pipelines and branch predictors. This knowledge separates "it's O(n)" answers from "it's O(n) *and* 10× faster" answers — and it's essential for embedded, HPC, games and CUDA work.

## 1. The memory hierarchy

| Level | Size | Latency (approx.) |
|---|---|---|
| Registers | ~1 KB | 0 cycles |
| L1 cache (per core, split I/D) | 32–64 KB | ~4 cycles (~1 ns) |
| L2 cache (per core) | 256 KB–2 MB | ~12 cycles |
| L3 cache (shared) | 8–100+ MB | ~40 cycles |
| DRAM | GBs | ~200+ cycles (~80–100 ns) |
| NVMe SSD | TBs | ~20–100 µs |

Caches work on **cache lines** (64 bytes on x86 and most ARM). Fetching one byte brings in the whole line.

**Locality:**
- *Spatial:* nearby addresses are used together → arrays, contiguous structs.
- *Temporal:* recently used data is reused → keep working sets small, block/tile loops.

```cpp
// Row-major traversal: sequential, prefetcher-friendly
for (int r = 0; r < N; ++r) for (int c = 0; c < N; ++c) sum += m[r][c];   // fast
// Column-major traversal of a row-major array: one cache line per element
for (int c = 0; c < N; ++c) for (int r = 0; r < N; ++r) sum += m[r][c];   // often 5-10x slower
```

### Data-oriented design

```cpp
// Array of Structs (AoS): iterating x drags y, z, mass, name through the cache
struct Particle { float x, y, z, vx, vy, vz; char name[40]; };
std::vector<Particle> ps;

// Struct of Arrays (SoA): each loop touches only what it needs; SIMD-friendly
struct Particles { std::vector<float> x, y, z, vx, vy, vz; };
```

## 2. Cache mapping & misses

- **Direct-mapped / set-associative / fully associative** caches: an address maps to a set by its index bits; within a set, any of N ways.
- Miss types (the "3 Cs"): **compulsory** (first access), **capacity** (working set too large), **conflict** (addresses mapping to the same set — e.g. power-of-two strides).
- **Write-back** (dirty lines written on eviction) vs **write-through**.
- **Cache coherence** (MESI protocol) keeps cores' caches consistent — which is what makes false sharing expensive.

### False sharing

```cpp
struct Counters { std::atomic<long> a, b; };               // a and b share one cache line
// Thread 1 increments a, thread 2 increments b: the line ping-pongs between cores.

struct alignas(64) Padded { std::atomic<long> v; };        // one counter per cache line
Padded counters[NUM_THREADS];
// C++17: std::hardware_destructive_interference_size
```

## 3. Pipelining & superscalar execution

A CPU overlaps instruction stages (fetch → decode → execute → memory → write-back) and issues several instructions per cycle, **out of order**, as long as dependencies allow.

- **Data hazards:** an instruction needs a previous result → forwarding or stalls. Long dependency chains limit throughput:

```cpp
// One accumulator: every add depends on the previous one (latency-bound)
double s = 0; for (double x : v) s += x;
// Multiple accumulators: independent chains run in parallel (throughput-bound)
double s0 = 0, s1 = 0, s2 = 0, s3 = 0;
for (size_t i = 0; i + 3 < v.size(); i += 4) { s0 += v[i]; s1 += v[i+1]; s2 += v[i+2]; s3 += v[i+3]; }
```

- **Control hazards:** branches → solved by prediction.

## 4. Branch prediction

The CPU guesses branch outcomes and speculatively executes; a misprediction flushes the pipeline (~15–20 cycles).

```cpp
// Famous example: summing elements > 128 is several times faster on SORTED data,
// because the branch becomes predictable.
for (int x : data) if (x >= 128) sum += x;

// Branchless alternative (compiler may emit cmov / SIMD)
for (int x : data) sum += (x >= 128) ? x : 0;
```

Tips: make branches predictable, move rare cases out of hot loops, `[[likely]]`/`[[unlikely]]` hints (C++20), lookup tables instead of chains of `if`s, sort or partition data first.

**Speculative execution side channels** (Spectre/Meltdown, 2018) exploit the cache footprint of mis-speculated instructions.

## 5. SIMD (vectorisation)

One instruction operates on multiple data elements: SSE/AVX/AVX-512 on x86 (128/256/512-bit), NEON/SVE on ARM, Helium (MVE) on Cortex-M55/M85.

```cpp
#include <immintrin.h>
void add(float* __restrict a, const float* __restrict b, size_t n) {
    size_t i = 0;
    for (; i + 8 <= n; i += 8) {                         // 8 floats per AVX instruction
        __m256 va = _mm256_loadu_ps(a + i), vb = _mm256_loadu_ps(b + i);
        _mm256_storeu_ps(a + i, _mm256_add_ps(va, vb));
    }
    for (; i < n; ++i) a[i] += b[i];                     // scalar tail
}
```

Usually you let the compiler **auto-vectorise** (`-O3 -march=native`, check with `-fopt-info-vec`): use contiguous arrays, simple loops, no aliasing (`__restrict`), no early exits. `std::simd` arrives in C++26.

## 6. Multicore & memory ordering

- Each core has private L1/L2; L3 shared; coherence via MESI-style protocols.
- CPUs and compilers **reorder** memory operations. x86 is relatively strong (TSO: only store→load reordering); ARM and RISC-V are weakly ordered — hence `std::atomic` memory orders and barriers (`DMB` on ARM).
- **NUMA:** on multi-socket servers, memory attached to another socket is slower — pin threads and allocate locally.

## 7. Instruction set architectures

| | x86-64 | ARM (AArch64 / Thumb-2) | RISC-V |
|---|---|---|---|
| Type | CISC (decoded into micro-ops) | RISC | RISC, open standard |
| Where | PCs, servers | phones, Apple silicon, servers, MCUs (Cortex-M) | MCUs, accelerators, growing |
| Encoding | variable 1–15 bytes | fixed 32-bit (A64), 16/32 Thumb-2 | 32-bit + compressed 16-bit |

Calling conventions: arguments in registers (x86-64 SysV: rdi, rsi, rdx, rcx, r8, r9; AArch64: x0–x7; ARM AAPCS: r0–r3), return in rax/x0/r0, caller- vs callee-saved registers. Knowing this helps read disassembly and debug crashes.

## 8. Embedded architecture notes (Cortex-M)

- No data cache on M0–M4 (M7/M55/M85 have caches → DMA coherency management).
- **Flash wait states** at high clock speeds; ART accelerators / instruction caches mitigate. Run hot code from RAM (`.ramfunc`) or TCM (tightly coupled memory) for determinism.
- 3-stage (M3/M4) pipeline — branches cost ~1–3 cycles, so branch prediction matters little.
- Single-cycle multiply, hardware divide (2–12 cycles) on M3+; no divide on M0.
- FPU (single precision) on M4F; double precision on some M7.
- Bit-banding (M3/M4) maps each bit of SRAM/peripheral space to a word for atomic bit access.

## 9. Measuring performance

```bash
perf stat -e cycles,instructions,cache-misses,branch-misses ./app
perf record -g ./app && perf report
valgrind --tool=cachegrind ./app
```

- **IPC** (instructions per cycle): < 1 suggests stalls (cache misses, mispredictions).
- Benchmark properly: warm-up, many iterations, prevent dead-code elimination (`benchmark::DoNotOptimize`), pin CPU frequency.
- Check the generated assembly on Compiler Explorer.

## Interview Q&A

- **Why is iterating a `std::vector` faster than a `std::list`?** Contiguity: sequential cache lines + hardware prefetching vs a likely cache miss per node.
- **What is a cache line, and why does it matter?** The 64-byte unit of transfer between memory and cache; determines locality effects and false sharing.
- **What is false sharing?** Independent variables on the same cache line written by different cores, causing coherence traffic.
- **Why can sorted data make code faster?** Predictable branches → fewer pipeline flushes.
- **What does `restrict` enable?** The compiler can assume no aliasing → vectorisation and fewer reloads.
- **What's the difference between latency and throughput?** Time for one operation vs operations completed per unit time; pipelining improves throughput, not latency.
