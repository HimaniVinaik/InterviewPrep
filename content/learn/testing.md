# Testing C/C++ Code

Interviewers increasingly ask "How would you test this?" — and for embedded roles, "How do you test firmware without hardware?" Here's the toolkit.

## 1. The test pyramid

```text
          /\        End-to-end / HIL tests (few, slow, realistic)
         /  \
        /----\      Integration tests (modules together, real I/O mocked at the edge)
       /      \
      /--------\    Unit tests (many, fast, isolated, run on every commit)
```

## 2. GoogleTest basics

```cpp
#include <gtest/gtest.h>
#include "moving_average.hpp"

TEST(MovingAverage, ReturnsZeroWhenEmpty) {
    MovingAverage<4> f;
    EXPECT_EQ(f.value(), 0);
}

TEST(MovingAverage, AveragesLastNSamples) {
    MovingAverage<4> f;
    for (int x : {4, 8, 12, 16, 20}) f.push(x);     // window = 8, 12, 16, 20
    EXPECT_EQ(f.value(), 14);
}

// Fixture: shared setup
class RingBufferTest : public ::testing::Test {
protected:
    RingBuffer<int, 3> rb;
    void SetUp() override { rb.push(1); rb.push(2); }
};
TEST_F(RingBufferTest, PopsInFifoOrder) {
    EXPECT_EQ(rb.pop(), 1);
    EXPECT_EQ(rb.pop(), 2);
    EXPECT_FALSE(rb.pop().has_value());
}

// Parameterised tests
class CrcTest : public ::testing::TestWithParam<std::pair<std::string, uint32_t>> {};
TEST_P(CrcTest, MatchesKnownVectors) {
    auto [input, expected] = GetParam();
    EXPECT_EQ(crc32(input), expected);
}
INSTANTIATE_TEST_SUITE_P(Vectors, CrcTest, ::testing::Values(
    std::pair{std::string("123456789"), 0xCBF43926u},
    std::pair{std::string(""), 0x00000000u}));
```

`EXPECT_*` continues after failure; `ASSERT_*` aborts the test. Useful matchers: `EXPECT_NEAR(a, b, tol)` for floats, `EXPECT_THROW`, `EXPECT_THAT(v, ElementsAre(1, 2))`, death tests `EXPECT_DEATH`.

CMake integration: see *Docs → Modern CMake* (`FetchContent` + `gtest_discover_tests`).

## 3. Test doubles: fakes, stubs, mocks

| Double | What it does |
|---|---|
| Dummy | passed but never used |
| Stub | returns canned answers |
| Fake | working lightweight implementation (in-memory flash, simulated clock) |
| Spy | records calls for later assertions |
| Mock | pre-programmed expectations verified automatically |

```cpp
#include <gmock/gmock.h>

struct ITransport {
    virtual ~ITransport() = default;
    virtual bool send(std::span<const uint8_t>) = 0;
};
struct MockTransport : ITransport {
    MOCK_METHOD(bool, send, (std::span<const uint8_t>), (override));
};

TEST(Telemetry, RetriesOnceOnFailure) {
    MockTransport t;
    EXPECT_CALL(t, send(::testing::_))
        .WillOnce(::testing::Return(false))
        .WillOnce(::testing::Return(true));
    Telemetry tel(t);
    EXPECT_TRUE(tel.publish(Packet{}));
}
```

Prefer **fakes** for stateful collaborators (they make tests less brittle than strict mocks); use mocks to verify interactions (retries, call order).

### Seams for testability in C++

- **Interface (virtual) injection** — shown above.
- **Template/concept injection** — zero runtime cost: `template <Transport T> class Telemetry`.
- **Link-time substitution** — link the test binary against `fake_hal.c` instead of `stm32_hal.c` (very common in C firmware).
- **Injectable time** — a clock interface instead of calling `now()` directly.

## 4. Testing embedded code off-target

1. Keep business logic **hardware-independent** (layered architecture; see *Design → Embedded Software Architecture*).
2. Compile those modules for the host with GCC/Clang and run unit tests in CI (fast, sanitizers available).
3. Fake the HAL: register-level fakes (a struct standing in for the peripheral registers) or function-level fakes.
4. C unit-test frameworks: **Unity + CMock** (Ceedling), **CppUTest**, **fff** (fake function framework).

```c
/* fff example: fake a HAL function and assert on it */
#include "fff.h"
DEFINE_FFF_GLOBALS;
FAKE_VOID_FUNC(hal_gpio_write, int, bool);

void test_led_turns_on(void) {
    RESET_FAKE(hal_gpio_write);
    led_set(LED_STATUS, true);
    TEST_ASSERT_EQUAL(1, hal_gpio_write_fake.call_count);
    TEST_ASSERT_EQUAL(LED_STATUS_PIN, hal_gpio_write_fake.arg0_val);
}
```

5. **Simulation / emulation:** QEMU, Renode, vendor simulators for running the actual firmware image.
6. **Hardware-in-the-loop (HIL):** real boards on a CI rack, stimulated by test equipment (signal generators, CAN interfaces, programmable power supplies).

## 5. What to test (and how to choose cases)

- **Equivalence classes & boundary values:** empty, one, many, max; min−1, min, max, max+1.
- **Error paths:** allocation failures, timeouts, malformed input, full buffers.
- **State machines:** every state × event, including invalid events.
- **Concurrency:** stress tests under TSan; deterministic schedulers for unit-testing async code.
- **Regression tests** for every bug fixed.

## 6. Beyond example-based tests

- **Property-based testing:** generate random inputs and check invariants (e.g. `decode(encode(x)) == x`, sorted output is a permutation of the input). Libraries: RapidCheck, `rc::check`.
- **Fuzzing:** libFuzzer / AFL++ feed mutated inputs to parsers to find crashes (combine with ASan!).

```cpp
// libFuzzer entry point: clang++ -fsanitize=fuzzer,address parser_fuzz.cpp parser.cpp
extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
    parse_packet(std::span(data, size));   // must never crash, hang, or trigger UB
    return 0;
}
```

- **Benchmarks:** Google Benchmark for micro-benchmarks; guard against regressions in CI.
- **Coverage:** gcov/lcov or `llvm-cov` — aim for meaningful coverage of logic, not a vanity number. Safety standards may require MC/DC coverage.
- **Static analysis** and **code review** catch whole classes of bugs tests miss.

## 7. TDD in one paragraph

**Red → Green → Refactor:** write a failing test for the next small behaviour, write the minimal code to pass it, then clean up with the safety net in place. It naturally produces testable, decoupled designs — and it's a nice way to structure an LLD interview answer ("here's the test I'd write first").

## Interview Q&A

- **How would you test a function that reads the current time?** Inject a clock (interface or template parameter) and use a fake clock in tests.
- **How do you unit-test a driver?** Separate the protocol logic from register access; fake the register block or the HAL functions; verify sequences of writes.
- **Mock vs fake?** Mocks verify interactions with expectations; fakes are simplified working implementations.
- **How do you test code with randomness?** Inject the RNG/seed; test statistical properties with fixed seeds.
