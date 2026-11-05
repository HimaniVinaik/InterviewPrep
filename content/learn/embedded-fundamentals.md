# Embedded Programming Fundamentals

Embedded software runs on dedicated hardware with tight constraints: kilobytes of RAM, no OS (or a small RTOS), real-time deadlines, and direct hardware access. This guide covers what you need for firmware interviews, using ARM Cortex-M as the reference architecture (by far the most common).

## 1. The microcontroller (MCU)

```text
 ┌───────────────────────── MCU ─────────────────────────┐
 │  CPU core (Cortex-M4 @ 80–180 MHz)  + NVIC + SysTick   │
 │  Flash (256 KB–2 MB): code, constants                  │
 │  SRAM (32–512 KB): data, stack, heap                   │
 │  Bus matrix (AHB/APB) ──┬── GPIO   ┬── Timers / PWM    │
 │  DMA controller         ├── UART   ├── ADC / DAC       │
 │  Clock tree (PLL, HSE)  ├── SPI    ├── Watchdog        │
 │  Power management       ├── I2C    ├── RTC             │
 │                         └── CAN / USB / Ethernet       │
 └────────────────────────────────────────────────────────┘
```

| | Microcontroller (MCU) | Microprocessor (MPU / SoC) |
|---|---|---|
| Memory | on-chip flash + SRAM | external DRAM, eMMC |
| OS | bare metal / RTOS | Linux / Android |
| MMU | no (maybe an MPU) | yes |
| Boot time | microseconds–milliseconds | seconds |
| Examples | STM32, nRF52, ESP32, RP2040 | Raspberry Pi (BCM2711), i.MX8 |

**Harvard vs von Neumann:** Cortex-M uses separate instruction and data buses (modified Harvard) within one unified memory map.

## 2. Memory map & memory-mapped I/O

Everything — flash, RAM, peripheral registers — lives in one 32-bit address space:

| Region | Typical addresses (STM32) |
|---|---|
| Flash | 0x0800_0000 |
| SRAM | 0x2000_0000 |
| Peripherals | 0x4000_0000 – 0x5FFF_FFFF |
| Cortex-M system (NVIC, SysTick, SCB) | 0xE000_0000 |

Peripherals are controlled by reading/writing their **registers** at fixed addresses:

```c
#include <stdint.h>

typedef struct {
    volatile uint32_t MODER;    /* 0x00 mode: input/output/alternate/analog (2 bits per pin) */
    volatile uint32_t OTYPER;   /* 0x04 output type */
    volatile uint32_t OSPEEDR;  /* 0x08 */
    volatile uint32_t PUPDR;    /* 0x0C pull-up / pull-down */
    volatile uint32_t IDR;      /* 0x10 input data (read-only) */
    volatile uint32_t ODR;      /* 0x14 output data */
    volatile uint32_t BSRR;     /* 0x18 bit set/reset: atomic writes */
} gpio_t;

#define GPIOA ((gpio_t *)0x48000000UL)

void led_init(void) {
    RCC_AHB2ENR |= (1u << 0);                          /* 1. enable the GPIOA clock first! */
    GPIOA->MODER = (GPIOA->MODER & ~(3u << (5 * 2)))   /* 2. clear pin 5's mode bits */
                 | (1u << (5 * 2));                    /*    set to 01 = output */
}
void led_on(void)  { GPIOA->BSRR = 1u << 5; }          /* set: atomic, no read-modify-write */
void led_off(void) { GPIOA->BSRR = 1u << (5 + 16); }   /* reset half of BSRR */
```

Vendor headers (CMSIS device headers) define these structs for you; HAL libraries (STM32 HAL/LL, nRF SDK, Zephyr drivers) wrap them further.

> **Gotcha:** Forgetting to enable the **peripheral clock** is the #1 "my peripheral does nothing" bug.

## 3. `volatile`, and why it matters

Without `volatile`, the compiler may cache a register value in a CPU register, remove "redundant" reads/writes, or reorder accesses:

```c
while (!(UART->SR & TXE)) { }      /* needs volatile SR, or the loop may read once and spin forever */
```

Use `volatile` for: hardware registers, variables shared with ISRs, and memory changed by DMA. It does **not** make operations atomic. See *Docs → C Essentials* for depth.

## 4. Boot sequence

1. Reset: the core reads the **initial stack pointer** from address 0x0000_0000 (aliased to flash) and the **reset handler** address from 0x0000_0004 — the start of the **vector table**.
2. `Reset_Handler` (startup code, often assembly): copy `.data` from flash to RAM, zero `.bss`, set up the FPU and clocks (`SystemInit`), call C++ static constructors (`__libc_init_array`).
3. Jump to `main()`. `main` should never return in firmware.

```c
/* Minimal vector table in C */
extern uint32_t _estack;
void Reset_Handler(void);
void SysTick_Handler(void);
__attribute__((section(".isr_vector")))
void (*const vector_table[])(void) = {
    (void (*)(void))&_estack,   /* 0: initial SP */
    Reset_Handler,              /* 1: reset */
    NMI_Handler, HardFault_Handler, /* ... */
    [15] = SysTick_Handler,
};
```

## 5. Interrupts

An interrupt is a hardware signal that makes the CPU pause, save context, run an **ISR** (interrupt service routine), and resume.

On Cortex-M:
- The **NVIC** manages up to 240 interrupts with configurable priorities (lower number = higher priority), nesting and tail-chaining.
- On entry the hardware automatically stacks R0–R3, R12, LR, PC, xPSR — so ISRs are plain C functions.
- Latency ~12 cycles.

```c
volatile uint32_t g_ticks;

void SysTick_Handler(void) { g_ticks++; }                 /* 1 ms tick */

void USART2_IRQHandler(void) {
    if (USART2->ISR & USART_ISR_RXNE) {                    /* which event? */
        uint8_t b = (uint8_t)USART2->RDR;                  /* reading RDR clears RXNE */
        rb_push(&rx_buf, b);                               /* hand off: keep the ISR short */
    }
}

void uart_init_irq(void) {
    NVIC_SetPriority(USART2_IRQn, 5);
    NVIC_EnableIRQ(USART2_IRQn);
}
```

**ISR rules:** short and deterministic; clear the interrupt flag (or it re-fires forever); no blocking calls; defer heavy work to the main loop/task; protect shared data.

### Critical sections

```c
uint32_t primask = __get_PRIMASK();
__disable_irq();                 /* atomic section */
shared_counter += 2;             /* read-modify-write now safe from ISRs */
__set_PRIMASK(primask);          /* restore (supports nesting) */
```

Keep critical sections tiny — they add interrupt latency. Alternatives: LDREX/STREX-based atomics (C11 `atomic_fetch_add`), BASEPRI masking only lower-priority interrupts, lock-free SPSC ring buffers.

## 6. Polling vs interrupts vs DMA

| Method | CPU cost | Latency | Use |
|---|---|---|---|
| **Polling** | CPU busy-waits | lowest & predictable | very simple systems, short waits |
| **Interrupts** | per event | low | event-driven I/O, low data rates |
| **DMA** | almost none | hardware moves data | high throughput: ADC streams, SPI displays, UART bulk, audio |

**DMA** (Direct Memory Access) copies data between peripherals and memory without the CPU. Configure source, destination, length, increment mode; get an interrupt on half/complete transfer. **Double-buffering / circular mode:** process half A while DMA fills half B. On cores with data cache (Cortex-M7), clean/invalidate cache lines around DMA buffers.

## 7. Timers

- **SysTick:** 24-bit down-counter in every Cortex-M — the OS/HAL time base.
- **General-purpose timers:** counter + prescaler + auto-reload; modes for periodic interrupts, **PWM** output, **input capture** (measure pulse widths/frequency), output compare.
- f_update = f_timer_clk / ((PSC + 1)(ARR + 1)); PWM duty = CCR / (ARR + 1).
- **Watchdog (IWDG/WWDG):** resets the MCU if not "kicked" in time — recovery from hangs. Kick only from a place that proves the whole system is healthy.
- **RTC:** low-power real-time clock on a 32.768 kHz crystal (2¹⁵ Hz → divide to 1 Hz with a 15-bit counter).

## 8. Communication protocols

| | UART | SPI | I2C | CAN |
|---|---|---|---|---|
| Wires | TX, RX (+GND) | SCLK, MOSI, MISO, CS per device | SDA, SCL (open-drain + pull-ups) | CANH, CANL (differential) |
| Clock | asynchronous (agreed baud) | synchronous (master clock) | synchronous | asynchronous, bit-timed |
| Topology | point-to-point | 1 master, many slaves (CS lines) | multi-master, 7-bit addresses | multi-master bus |
| Speed | 9.6 k–few Mbps | 1–100 MHz | 100 k / 400 k / 1 M / 3.4 MHz | 125 k–1 Mbps (CAN FD 5–8 Mbps) |
| Duplex | full | full | half | half |
| Ack / error detection | parity (optional) | none | ACK bit per byte | CRC, ACK, error frames, auto-retransmit |
| Typical use | debug console, GPS, modems | flash, displays, ADCs, SD cards | sensors, EEPROMs, PMICs | automotive, industrial |

**UART frame (8N1):** idle high → start bit (0) → 8 data bits LSB first → stop bit (1). 10 bits per byte → 115200 baud ≈ 11.5 KB/s.

**SPI modes:** CPOL (clock idle level) × CPHA (sample edge) → modes 0–3; must match the device datasheet.

**I2C transaction:** START → 7-bit address + R/W → ACK → data bytes (each ACKed) → STOP. Repeated START for register reads: write the register address, repeated START, read. Clock stretching lets slaves slow the master. Bus hangs (SDA stuck low) are recovered by clocking SCL 9 times.

**CAN:** message-based (11/29-bit identifiers, not addresses); lower ID = higher priority via **non-destructive bitwise arbitration** (dominant 0 wins); up to 8 data bytes (64 in CAN FD); hardware CRC and error confinement.

Others to recognise: USB, Ethernet (RMII), 1-Wire, LIN, Modbus (RS-485), I2S (audio), SDIO, QSPI (external flash), BLE/Wi-Fi/LoRa (wireless).

## 9. ADC & DAC

- **Resolution** (bits): 12-bit → 4096 levels; LSB = Vref / 4096.
- **Sampling rate** must satisfy Nyquist (> 2× signal bandwidth) — add an anti-aliasing filter.
- SAR ADCs (most MCUs), sigma-delta (high resolution, audio/precision).
- Error sources: offset, gain, INL/DNL, noise, source impedance vs sample time.
- See *Math → Math for Embedded Systems* for scaling, filtering and fixed point.

## 10. GPIO details

- Modes: input (floating / pull-up / pull-down), output (push-pull / open-drain), alternate function (peripheral), analog.
- **Floating inputs** pick up noise — always pull up/down unused or button pins.
- **Open-drain** allows wired-AND buses (I2C) and level shifting with an external pull-up.
- **Debounce** mechanical inputs (see *Problems → C & Embedded → Debounce*).
- External interrupts (EXTI) on edges.

## 11. RTOS concepts

| Concept | Meaning |
|---|---|
| Task / thread | independent function with its own stack and priority |
| Scheduler | preemptive priority-based (highest ready task runs); round-robin among equals |
| Tick | periodic timer interrupt driving time slicing and delays |
| Queue | thread-safe FIFO for passing data between tasks/ISRs |
| Semaphore (binary/counting) | signalling, e.g. ISR → task "data ready" |
| Mutex | mutual exclusion with ownership & **priority inheritance** |
| Event groups / flags | wait on combinations of events |
| Software timers | callbacks after a delay |
| Context switch | save/restore registers + stack pointer (PendSV on Cortex-M) |

```c
/* FreeRTOS: ISR signals a task via a queue */
static QueueHandle_t rx_q;

void USART2_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    uint8_t b = (uint8_t)USART2->RDR;
    xQueueSendFromISR(rx_q, &b, &woken);
    portYIELD_FROM_ISR(woken);           /* switch immediately if a higher-priority task woke */
}

static void rx_task(void *arg) {
    (void)arg;
    uint8_t b;
    for (;;) {
        if (xQueueReceive(rx_q, &b, portMAX_DELAY) == pdTRUE) parser_feed(b);
    }
}

int main(void) {
    hw_init();
    rx_q = xQueueCreate(128, sizeof(uint8_t));
    xTaskCreate(rx_task, "rx", 512, NULL, tskIDLE_PRIORITY + 2, NULL);
    vTaskStartScheduler();               /* never returns */
}
```

Real-time terms: **hard** real-time (missing a deadline = failure: airbags, motor control) vs **soft** (degraded quality: audio glitches). **Determinism** and **worst-case execution time (WCET)** matter more than average speed. **Jitter** = variation in timing.

## 12. Low-power design

- Sleep modes: Sleep (CPU stopped) → Stop (clocks stopped, RAM retained) → Standby/Shutdown (most off; wake via RTC/pin, often a reset).
- `__WFI()` / `__WFE()` to sleep until an interrupt/event; RTOS tickless idle.
- Clock gating unused peripherals, lowering frequency, batching work, turning off radios.
- Current budget math: average current = Σ (Iᵢ × tᵢ) / T; battery life = capacity (mAh) / I_avg.

## 13. Memory constraints & toolchain

- Know your sizes: `arm-none-eabi-size fw.elf` → text (flash), data (flash + RAM), bss (RAM).
- Stack sizing: measure via stack painting; enable MPU guard regions.
- Avoid heap fragmentation: static allocation, pools.
- Optimise for size: `-Os`, `-ffunction-sections -fdata-sections -Wl,--gc-sections`, LTO, newlib-nano, avoid `printf` with floats.
- Linker scripts place sections; startup code initialises them (see *Docs → Compilation & Linking*).
- Flash: erase granularity is a **page/sector** (erase sets bits to 1; writes can only clear bits), limited endurance (~10 k–100 k cycles) → wear levelling for frequently-written data.

## 14. Embedded C++

Zero-cost abstractions shine: `constexpr` register configs, templates for pins/peripherals, `enum class`, RAII critical-section guards, `std::array`, `std::span`, `std::optional`. Typically `-fno-exceptions -fno-rtti`, no heap after init, no iostreams. Libraries: ETL (Embedded Template Library), CMSIS, Zephyr's C++ support.

```cpp
class CriticalSection {                      // RAII interrupt lock
    uint32_t primask_;
public:
    CriticalSection() : primask_(__get_PRIMASK()) { __disable_irq(); }
    ~CriticalSection() { __set_PRIMASK(primask_); }
    CriticalSection(const CriticalSection&) = delete;
    CriticalSection& operator=(const CriticalSection&) = delete;
};

void bump() {
    CriticalSection cs;                     // released on every return path
    ++shared_counter;
}
```

## 15. Learning path (hands-on)

1. Get a cheap board: **STM32 Nucleo** (e.g. F411/G431/L476) or Raspberry Pi **Pico (RP2040/RP2350)**, plus a logic analyser clone.
2. Blink an LED with **registers only** (no HAL), reading the reference manual.
3. UART printf → interrupt-driven RX with a ring buffer → DMA TX.
4. Read an I2C sensor; decode the transaction with the logic analyser.
5. PWM a servo/LED; input capture a signal frequency.
6. Port it to FreeRTOS or Zephyr with tasks and queues.
7. Add a bootloader and OTA update.
8. Unit test the logic on your PC with CMake + GoogleTest.

Good references: the MCU **reference manual** and **datasheet**, "Making Embedded Systems" (Elecia White), "The Definitive Guide to ARM Cortex-M3/M4" (Joseph Yiu), Memfault's *Interrupt* blog, FreeRTOS and Zephyr docs.
