# Math for Embedded Systems

Firmware runs on CPUs that may lack an FPU, with tight timing and memory budgets. These are the math techniques embedded interviews expect you to know.

## 1. Fixed-point arithmetic (Q format)

Represent a real number as an integer scaled by 2ⁿ. **Qm.n:** m integer bits, n fractional bits.

- Q15 (`int16_t`): range [−1, 1 − 2⁻¹⁵], resolution 2⁻¹⁵ ≈ 3.05 × 10⁻⁵. Standard in DSP.
- Q16.16 (`int32_t`): range ±32768, resolution 1.5 × 10⁻⁵.

```c
#include <stdint.h>
typedef int32_t q16_16;
#define Q16_ONE        (1 << 16)
#define TO_Q16(x)      ((q16_16)((x) * Q16_ONE))          /* compile-time constants only */
#define Q16_TO_FLOAT(q) ((float)(q) / Q16_ONE)

static inline q16_16 q16_add(q16_16 a, q16_16 b) { return a + b; }          /* same scale: plain add */
static inline q16_16 q16_mul(q16_16 a, q16_16 b) {
    return (q16_16)(((int64_t)a * b) >> 16);           /* widen, multiply, rescale */
}
static inline q16_16 q16_div(q16_16 a, q16_16 b) {
    return (q16_16)(((int64_t)a << 16) / b);           /* pre-scale the dividend */
}

/* Q15 multiply with rounding and saturation (like ARM's QDMULH / SSAT) */
static inline int16_t q15_mul(int16_t a, int16_t b) {
    int32_t p = ((int32_t)a * b + (1 << 14)) >> 15;    /* +0.5 LSB for rounding */
    if (p > INT16_MAX) p = INT16_MAX;                  /* -1 * -1 overflows Q15 */
    return (int16_t)p;
}
```

Key rules:
- Adding/subtracting requires the **same** Q format.
- Multiplying Qa × Qb gives Q(a+b) — shift right by the extra fractional bits; use a wider intermediate.
- Watch overflow → use **saturating** arithmetic for signals (clipping is better than wrapping from +max to −max).
- Right-shifting negatives rounds toward −∞; add half an LSB first for round-to-nearest.

## 2. Scaling ADC readings

A 12-bit ADC with 3.3 V reference: `V = raw × 3.3 / 4095` (or `/4096` depending on the converter's transfer function — check the datasheet).

```c
/* Integer-only millivolts: no floats, no overflow (4095 * 3300 fits in uint32_t) */
static inline uint32_t adc_to_mv(uint16_t raw) { return ((uint32_t)raw * 3300u + 2047u) / 4095u; }

/* Linear sensor: T = (mv - offset) / slope. TMP36: 500 mV at 0 °C, 10 mV/°C → tenths of a degree */
static inline int32_t tmp36_deci_c(uint32_t mv) { return (int32_t)mv - 500; }   /* 1 mV == 0.1 °C */
```

**Linear calibration (two-point):** measure raw values r₁, r₂ at known references y₁, y₂; then gain = (y₂ − y₁)/(r₂ − r₁), offset = y₁ − gain·r₁. Store gain/offset (with CRC) in flash.

**Effective resolution:** averaging 4ᵏ samples (with noise ≥ 1 LSB) yields k extra bits (oversampling & decimation).

## 3. Digital filters

### Moving average (FIR, boxcar)

```c
#define N 8                                   /* power of two -> shift instead of divide */
typedef struct { uint16_t buf[N]; uint32_t sum; uint8_t idx; } movavg_t;

uint16_t movavg_update(movavg_t *f, uint16_t x) {
    f->sum += x - f->buf[f->idx];             /* O(1): add new, subtract oldest */
    f->buf[f->idx] = x;
    f->idx = (f->idx + 1) & (N - 1);
    return (uint16_t)(f->sum >> 3);           /* / 8 */
}
```

### Exponential moving average (first-order IIR low-pass)

y[n] = y[n−1] + α (x[n] − y[n−1]), with 0 < α ≤ 1. Smaller α = smoother, slower.

```c
/* α = 1/16 using shifts; keep extra fractional bits in the state for precision */
typedef struct { int32_t acc; } ema_t;        /* acc holds y << 4 */
int16_t ema_update(ema_t *f, int16_t x) {
    f->acc += x - (f->acc >> 4);
    return (int16_t)(f->acc >> 4);
}
```

Relation to an RC filter: α = Δt / (RC + Δt); time constant τ = RC; cut-off f_c = 1/(2πRC).

### Median filter

Removes impulse noise (spikes) while preserving edges. A median of 3 or 5 samples is cheap to compute with a few compare-swaps.

### Sampling theory

- **Nyquist:** sample at > 2× the highest frequency of interest; otherwise **aliasing** folds high frequencies into low ones. Use an analog anti-aliasing filter before the ADC.
- Frequency resolution of an N-point FFT at sample rate fs: Δf = fs / N.

## 4. PID control

u(t) = Kp·e(t) + Ki·∫e dt + Kd·de/dt, where e = setpoint − measurement.

```c
typedef struct {
    float kp, ki, kd;
    float integ, prev_meas;
    float out_min, out_max;
} pid_t;

float pid_step(pid_t *p, float setpoint, float meas, float dt) {
    float err = setpoint - meas;
    float P = p->kp * err;

    p->integ += p->ki * err * dt;
    if (p->integ > p->out_max) p->integ = p->out_max;     /* anti-windup: clamp integrator */
    if (p->integ < p->out_min) p->integ = p->out_min;

    float D = -p->kd * (meas - p->prev_meas) / dt;        /* derivative on measurement: no kick on setpoint change */
    p->prev_meas = meas;

    float out = P + p->integ + D;
    if (out > p->out_max) out = p->out_max;
    if (out < p->out_min) out = p->out_min;
    return out;
}
```

Talking points: P reduces error but leaves steady-state offset; I removes offset but causes overshoot and **windup**; D damps but amplifies noise (low-pass filter it). Tune with Ziegler–Nichols or step-response methods; run the loop at a fixed rate from a timer.

## 5. Checksums & CRC

| Method | Detects | Cost |
|---|---|---|
| Sum / XOR checksum | some single-bit errors | trivial |
| Fletcher / Adler | better, still cheap | cheap |
| **CRC** | all single, double, odd-count, and burst errors ≤ width | table lookup / hardware |
| Cryptographic hash/MAC | malicious tampering | expensive |

CRC = remainder of polynomial division over GF(2) (XOR arithmetic).

```c
/* CRC-32 (IEEE 802.3, reflected, poly 0xEDB88320) — bitwise version */
uint32_t crc32(const uint8_t *data, size_t len) {
    uint32_t crc = 0xFFFFFFFFu;
    while (len--) {
        crc ^= *data++;
        for (int k = 0; k < 8; ++k)
            crc = (crc >> 1) ^ (0xEDB88320u & (uint32_t)-(int32_t)(crc & 1u));  /* branchless */
    }
    return ~crc;
}
/* crc32("123456789") == 0xCBF43926 — the standard check value */
```

Speed up with a 256-entry table (1 lookup per byte), or use the MCU's CRC peripheral. Common variants: CRC-8 (sensors, SMBus), CRC-16-CCITT (Modbus uses CRC-16/MODBUS), CRC-32 (Ethernet, zip), CRC-32C (iSCSI, SSE4.2 instruction).

## 6. Interpolation & lookup tables

Replace expensive functions (sin, log, sensor linearisation curves) with a table + linear interpolation:

```c
/* y = table value interpolated at x in [0, 255] with 16 segments */
static const int16_t lut[17] = { /* precomputed */ };
int16_t lut_interp(uint8_t x) {
    uint8_t i = x >> 4, frac = x & 0x0F;                /* segment index, position within it */
    int32_t a = lut[i], b = lut[i + 1];
    return (int16_t)(a + (((b - a) * frac) >> 4));
}
```

Linear interpolation: y = y₀ + (x − x₀)(y₁ − y₀)/(x₁ − x₀).

## 7. Fast approximations

- **Integer square root** (bitwise, no division):

```c
uint32_t isqrt(uint32_t n) {
    uint32_t root = 0, bit = 1u << 30;
    while (bit > n) bit >>= 2;
    while (bit) {
        if (n >= root + bit) { n -= root + bit; root = (root >> 1) + bit; }
        else root >>= 1;
        bit >>= 2;
    }
    return root;
}
```

- **Multiply instead of divide:** x / 10 ≈ (x × 0xCCCD) >> 19 for 16-bit x (compilers do this automatically for constants).
- **Powers of two:** `x * 8` → `x << 3`, `x % 16` → `x & 15` (unsigned only).
- **CORDIC:** computes sin/cos/atan with only shifts and adds — used in FPGAs and FPU-less MCUs.
- **Newton–Raphson:** xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ), e.g. 1/√x iteration (the famous Quake fast inverse square root).

## 8. Timing math

- Timer frequency: f_timer = f_clk / ((PSC + 1) × (ARR + 1)). For 1 kHz from 72 MHz: PSC = 71, ARR = 999.
- PWM duty cycle = CCR / (ARR + 1).
- UART baud divisor = f_clk / (16 × baud) — check the error percentage (< 2%).
- Wrap-safe tick comparison: `(int32_t)(now - deadline) >= 0` works across 32-bit overflow (as long as intervals are < 2³¹ ticks).
- 32-bit millisecond counter wraps after ~49.7 days — a real bug source ("reboot every 49 days").

## 9. Units & dimensional sanity

Always track units (mV vs V, ms vs µs, °C × 10). In C++, `std::chrono` durations and strong types catch unit mix-ups at compile time.

## Practice

1. Represent 0.75 in Q15. → 0.75 × 32768 = **24576 (0x6000)**.
2. Multiply Q8.8 values 1.5 (0x0180) and 2.25 (0x0240). → (384 × 576) >> 8 = 864 = **0x0360 = 3.375** ✔
3. 10-bit ADC, 5 V reference, raw = 512 → ≈ **2.50 V**.
4. EMA with α = 0.1 at 100 Hz sampling — time constant? τ ≈ Δt/α = **0.1 s**.
