# Embedded Software Architecture

Embedded design interviews ask things like "Design the firmware for a smart thermostat" or "How would you structure a motor controller?" They test layering, real-time thinking, concurrency with interrupts, robustness, and testability.

## 1. Layered architecture

```text
 ┌─────────────────────────────────────────────┐
 │ Application (business logic, state machines) │  portable, unit-testable on host
 ├─────────────────────────────────────────────┤
 │ Services / middleware (logging, comms stack,  │
 │ file system, OTA, power management)           │
 ├─────────────────────────────────────────────┤
 │ Device drivers (sensor, display, flash chip)  │  talk to HAL, not registers
 ├─────────────────────────────────────────────┤
 │ HAL — hardware abstraction (GPIO, SPI, I2C,   │  MCU-specific
 │ UART, timers, ADC)                            │
 ├─────────────────────────────────────────────┤
 │ BSP / startup / RTOS / vendor SDK             │
 └─────────────────────────────────────────────┘
```

**Rule:** dependencies point downward only, through interfaces. The application should compile and run on a PC against fake drivers.

```cpp
// HAL interface (C++), implemented per MCU and by a fake for tests
struct II2c {
    virtual ~II2c() = default;
    virtual bool write_read(uint8_t addr, std::span<const uint8_t> tx, std::span<uint8_t> rx) = 0;
};

class Tmp117 {                                     // driver depends only on II2c
    II2c& bus_;
    static constexpr uint8_t kAddr = 0x48, kTempReg = 0x00;
public:
    explicit Tmp117(II2c& bus) : bus_(bus) {}
    std::optional<float> celsius() {
        std::array<uint8_t, 2> rx{};
        if (!bus_.write_read(kAddr, std::array<uint8_t, 1>{kTempReg}, rx)) return std::nullopt;
        int16_t raw = static_cast<int16_t>((rx[0] << 8) | rx[1]);
        return raw * 0.0078125f;                    // 7.8125 m°C per LSB
    }
};
```

In C, the same idea uses a struct of function pointers (`const i2c_ops_t *ops`) — the Linux kernel's driver model.

## 2. Execution models

| Model | Description | Good for |
|---|---|---|
| **Super loop** | `while(1) { poll(); process(); }` + ISRs set flags | simple devices, deterministic, tiny |
| **Super loop + cooperative scheduler** | tasks run to completion from a timer tick list | small systems with several periodic jobs |
| **Event-driven / active objects** | each component has an event queue + state machine (QP framework) | reactive systems, low power |
| **Preemptive RTOS** (FreeRTOS, Zephyr, ThreadX) | prioritised tasks, queues, semaphores, timers | multiple concurrent timing requirements, comms stacks |
| Embedded Linux | processes, drivers in kernel | rich UI, networking, high compute |

```c
/* Super loop with ISR flags */
static volatile bool tick_10ms;
void SysTick_Handler(void) { static int n; if (++n == 10) { n = 0; tick_10ms = true; } }

int main(void) {
    board_init();
    for (;;) {
        if (tick_10ms) { tick_10ms = false; control_loop_step(); }
        comms_poll();
        __WFI();                       /* sleep until next interrupt */
    }
}
```

## 3. Interrupt design rules

- **Keep ISRs short:** read hardware, clear flags, push data to a buffer/queue, signal a task. Defer processing ("top half / bottom half").
- **No blocking** in ISRs: no `malloc`, `printf`, mutexes, or long loops. Use ISR-safe RTOS APIs (`xQueueSendFromISR`).
- Shared data: `volatile` + atomic access or short critical sections; ring buffers (SPSC) are ideal.
- Know your **interrupt priorities** and nesting (ARM NVIC); RTOS-aware priority limits (`configMAX_SYSCALL_INTERRUPT_PRIORITY`).
- Measure **interrupt latency** and worst-case execution time (toggle a GPIO, scope it).

## 4. State machines everywhere

Embedded behaviour is naturally modelled as finite state machines (FSMs) or hierarchical state machines (HSMs / statecharts).

```c
typedef enum { S_IDLE, S_HEATING, S_COOLING, S_FAULT, S_COUNT } state_t;
typedef enum { E_TICK, E_TOO_COLD, E_TOO_HOT, E_SENSOR_FAIL, E_RESET, E_COUNT } event_t;

typedef state_t (*handler_t)(void);
static state_t start_heat(void) { heater_on();  return S_HEATING; }
static state_t start_cool(void) { cooler_on();  return S_COOLING; }
static state_t go_idle(void)    { all_off();    return S_IDLE; }
static state_t fault(void)      { all_off(); alarm(); return S_FAULT; }
static state_t stay(void)       { return (state_t)-1; }   /* sentinel: no transition */

static const handler_t fsm[S_COUNT][E_COUNT] = {
    /*            TICK  TOO_COLD    TOO_HOT     SENSOR_FAIL RESET   */
    [S_IDLE]    = {stay, start_heat, start_cool, fault,      stay},
    [S_HEATING] = {stay, stay,       go_idle,    fault,      stay},
    [S_COOLING] = {stay, go_idle,    stay,       fault,      stay},
    [S_FAULT]   = {stay, stay,       stay,       stay,       go_idle},
};

static state_t current = S_IDLE;
void dispatch(event_t e) {
    state_t next = fsm[current][e]();
    if (next != (state_t)-1) current = next;
}
```

Table-driven FSMs are explicit, reviewable, and easy to test exhaustively (every state × event).

## 5. RTOS task design

- One task per **independent timing requirement** or blocking resource (comms, control loop, UI), not one per function.
- Assign priorities by **rate-monotonic** reasoning: shorter period → higher priority.
- Communicate with **queues** (copy data), not shared globals. Use **mutexes with priority inheritance** for shared resources; **semaphores** for signalling (ISR → task).
- Size stacks by measurement (`uxTaskGetStackHighWaterMark`), enable stack overflow checks.
- Avoid priority inversion, deadlocks (lock ordering), and starvation.
- Watchdog strategy: each task checks in to a supervisor, which kicks the hardware watchdog only if *all* tasks are healthy.

## 6. Memory strategy

- **Static allocation** at compile/link time for everything you can (`static` buffers, RTOS static task creation).
- If dynamic: allocate only at init, or use **fixed-block pools** (deterministic, no fragmentation).
- Place large constant tables in flash (`const`); use linker sections for DMA buffers in specific RAM banks; align DMA buffers to cache lines (on Cortex-M7, clean/invalidate D-cache around DMA).

## 7. Robustness & safety

- **Watchdog timer** (independent clock source) to recover from hangs.
- **Brown-out detection**, safe defaults on reset, a fault handler that logs the stacked PC/LR to retained RAM before resetting.
- **Defensive checks:** range-check sensor values, CRC on stored config and communication frames, plausibility checks (redundant sensors).
- **Fail-safe states:** motors off, valves closed, heaters off on fault.
- Standards: MISRA C/C++, IEC 61508 (industrial), ISO 26262 (automotive), IEC 62304 (medical), DO-178C (avionics).

## 8. Bootloader & OTA updates

```text
 Flash layout (A/B scheme)
 ┌───────────┬──────────────┬──────────────┬─────────┐
 │Bootloader │  Slot A      │  Slot B      │ Config  │
 │ (immutable│  (active)    │  (download)  │ + flags │
 │  root of  │              │              │         │
 │  trust)   │              │              │         │
 └───────────┴──────────────┴──────────────┴─────────┘
```

1. App downloads the new image into the inactive slot (resumable, CRC per chunk).
2. Verify **signature** (ECDSA/Ed25519) and version (anti-rollback counter).
3. Mark slot as "pending", reboot.
4. Bootloader boots the new slot in *trial* mode; app must confirm health (e.g. connected to server) within N boots, else the bootloader **rolls back**.

MCUboot (used by Zephyr) implements exactly this.

## 9. Power management

- Sleep whenever idle (`WFI`), choose the deepest sleep mode that meets wake-up latency.
- Event-driven design (interrupts, timers) instead of busy polling.
- Gate peripheral clocks; lower core frequency/voltage (DVFS); batch radio transmissions.
- Measure with a power analyser — estimates are usually wrong.

## 10. Testing embedded software

- **Unit tests on host** (GoogleTest/Unity/CppUTest) with fake HALs — the reason for layering.
- **Hardware-in-the-loop (HIL)** tests on real boards in CI.
- Static analysis (clang-tidy, cppcheck, MISRA checkers), sanitizers on host builds.
- Simulation/emulation (QEMU, Renode).
- Fault injection: corrupt flash, drop packets, brown-outs.

## Example interview prompt: "Design a smart thermostat"

1. **Requirements:** read temperature/humidity every second, control HVAC relay with hysteresis, schedule, Wi-Fi app control, OTA, display, 5-year reliability.
2. **Hardware assumptions:** Cortex-M4 + Wi-Fi module over UART/SPI, I2C sensor, relay GPIO, SPI display.
3. **Architecture:** RTOS with tasks: *Control* (high priority, 1 Hz FSM with hysteresis and minimum on/off times to protect the compressor), *Comms* (MQTT over TLS), *UI* (display + buttons), *Storage* (config with CRC + wear levelling).
4. **Safety:** relay off on sensor failure; independent watchdog; max run-time limit.
5. **Data flow:** sensor ISR/driver → queue → Control task → relay; Control publishes state → Comms task → cloud.
6. **OTA:** A/B slots with signed images.
7. **Testing:** control FSM unit-tested on host with simulated temperatures.

## Interview Q&A

- **What should an interrupt service routine do and not do?** Do: acknowledge the source, move data into a buffer, signal a task. Don't: block, allocate, print, or run long loops — defer heavy work to the main loop or a task.
- **Why layer firmware into application, drivers and HAL?** Dependencies point downward through interfaces, so business logic can be unit-tested on a PC with fake drivers and ported to new hardware by replacing only the HAL.
- **How do you implement a safe OTA firmware update?** A/B slots: download to the inactive slot, verify a signature and version, boot it in trial mode, and roll back automatically if the new image doesn't confirm it's healthy.
- **How should the watchdog be kicked in an RTOS system?** From a supervisor that only kicks it when every task has checked in recently — not from a timer ISR, which keeps running even if tasks hang.
- **Super loop vs RTOS: when do you choose each?** Super loop for simple, single-purpose, very constrained devices; RTOS when there are several independent timing requirements, blocking comms stacks or complex concurrency.
