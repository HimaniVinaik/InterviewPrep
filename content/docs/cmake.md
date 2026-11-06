# Modern CMake

> **Key idea:** CMake is a **build-system generator**. You describe *what* to build in `CMakeLists.txt`, and CMake generates the files for a native tool (Ninja, Make, Visual Studio, Xcode), which then does the building. "Modern CMake" (3.x) is **target-based**. Every library and executable is a **target** with **properties** (sources, include directories, compile definitions, options, features, link dependencies). Each property is either **PRIVATE** (only for building this target), **INTERFACE** (only for consumers) or **PUBLIC** (both). Link targets together and their usage requirements propagate automatically. Avoid global variables and global commands like `include_directories()` or `CMAKE_CXX_FLAGS`.

**What you'll be able to do after this guide**
- Run the configure → generate → build → test → install workflow, and explain what happens in each phase.
- Structure a multi-directory project with libraries, executables and tests.
- Choose `PRIVATE`/`PUBLIC`/`INTERFACE` correctly and predict what propagates to consumers.
- Use build types, options, cache variables, generator expressions and presets.
- Bring in dependencies with `find_package`, `FetchContent`, `add_subdirectory` or package managers.
- Make your library installable and consumable with `find_package(YourLib CONFIG)`.
- Cross-compile firmware with a toolchain file, and spot common anti-patterns in code review.

> **Note:** The sample project in §3 was built and tested with CMake 3.28 and Ninja. The outputs shown are real. Testing the install step caught a real ordering bug, described in §8.

---

## 1. The workflow and CMake's phases

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release   # configure + generate
```

```bash
cmake --build build -j                                     # build (runs ninja/make/msbuild for you)
```

```bash
ctest --test-dir build --output-on-failure                 # run the tests
```

```bash
cmake --install build --prefix /opt/sensors                # install
```

| Phase | What happens | Output |
|---|---|---|
| **Configure** | runs your `CMakeLists.txt` scripts; probes the compiler; evaluates `find_package`, options, `if()` | `CMakeCache.txt`, an in-memory target graph |
| **Generate** | writes native build files; evaluates **generator expressions** `$<...>` | `build.ninja` / `Makefile` / `.sln` |
| **Build** | the native tool compiles and links; CMake re-runs automatically if a `CMakeLists.txt` changed | binaries |
| **Test / Install / Package** | `ctest`, `cmake --install`, `cpack` | test results, install tree, archives/installers |

**Always build out of source** (`-B build`). One source tree can then have `build/debug`, `build/release`, `build/arm` and `build/asan` side by side, and `rm -rf build` resets everything.

**The cache:** `-DNAME=value` and `option()` values are stored in `build/CMakeCache.txt` and **persist** across runs. If a configure "ignores" a change, the old value is probably cached. Use `cmake -U NAME` or `--fresh` (3.24+), or delete the build directory. You can inspect values with `cmake -LH build` or edit them interactively with `ccmake build`.

---

## 2. A minimal project

```cmake
cmake_minimum_required(VERSION 3.24)          # also sets policies to that version's behaviour
project(Hello VERSION 1.0 LANGUAGES CXX)      # defines PROJECT_NAME, PROJECT_VERSION, ...

add_executable(hello src/main.cpp)
target_compile_features(hello PRIVATE cxx_std_20)   # "this target needs at least C++20"
```

`target_compile_features(... cxx_std_20)` is the target-based way to request a standard. `set(CMAKE_CXX_STANDARD 20)` (plus `CMAKE_CXX_STANDARD_REQUIRED ON` and `CMAKE_CXX_EXTENSIONS OFF`) sets a project-wide default. That is fine for applications, but a library should state its requirement as a `PUBLIC` feature so that consumers inherit it.

---

## 3. A realistic project, end to end

```text
sensors/
├── CMakeLists.txt
├── CMakePresets.json
├── cmake/
│   ├── version.h.in
│   └── SensorsConfig.cmake.in
├── include/sensors/          # PUBLIC headers (consumers include these)
│   ├── filters.h
│   └── ring_buffer.h         # header-only
├── src/
│   ├── CMakeLists.txt
│   ├── main.cpp
│   └── filters/
│       ├── detail.h          # PRIVATE header
│       ├── moving_average.cpp
│       └── median.cpp
└── tests/
    ├── CMakeLists.txt
    └── test_filters.cpp
```

### 3.1 Top-level `CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.24)
project(Sensors VERSION 1.2.0 LANGUAGES CXX)

option(SENSORS_BUILD_TESTS "Build the unit tests" ON)
option(SENSORS_ENABLE_ASAN "Build with AddressSanitizer + UBSan" OFF)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)   # compile_commands.json for clangd / clang-tidy
include(GNUInstallDirs)                 # BEFORE add_subdirectory: defines CMAKE_INSTALL_INCLUDEDIR etc.

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# Shared warning/sanitizer settings as an INTERFACE "options" target.
add_library(sensors_warnings INTERFACE)
target_compile_options(sensors_warnings INTERFACE
  $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic -Wshadow>
  $<$<CXX_COMPILER_ID:MSVC>:/W4>)

if(SENSORS_ENABLE_ASAN)
  target_compile_options(sensors_warnings INTERFACE -fsanitize=address,undefined -fno-omit-frame-pointer)
  target_link_options(sensors_warnings INTERFACE -fsanitize=address,undefined)
endif()

# Generate a header from a template: @PROJECT_VERSION@ is replaced.
configure_file(cmake/version.h.in ${CMAKE_CURRENT_BINARY_DIR}/generated/sensors/version.h)

add_subdirectory(src)

if(SENSORS_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

# Installation and package export (see section 8).
include(CMakePackageConfigHelpers)
install(TARGETS filters ringbuf EXPORT SensorsTargets
        ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
        LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR})
install(DIRECTORY include/ DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/generated/sensors/version.h
        DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/sensors)
install(EXPORT SensorsTargets NAMESPACE Sensors::
        DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Sensors)
configure_package_config_file(cmake/SensorsConfig.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/SensorsConfig.cmake
  INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Sensors)
write_basic_package_version_file(${CMAKE_CURRENT_BINARY_DIR}/SensorsConfigVersion.cmake
  COMPATIBILITY SameMajorVersion)
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/SensorsConfig.cmake
              ${CMAKE_CURRENT_BINARY_DIR}/SensorsConfigVersion.cmake
        DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Sensors)
```

`cmake/version.h.in`:

```cpp
// no-test (template processed by configure_file)
#pragma once
#define SENSORS_VERSION "@PROJECT_VERSION@"
#define SENSORS_VERSION_MAJOR @PROJECT_VERSION_MAJOR@
```

### 3.2 `src/CMakeLists.txt`: targets and usage requirements

```cmake
add_library(filters STATIC
  filters/moving_average.cpp
  filters/median.cpp)
add_library(Sensors::filters ALIAS filters)        # same name consumers get from find_package

target_include_directories(filters
  PUBLIC                                           # filters' .cpp files AND every consumer
    $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/include>
    $<BUILD_INTERFACE:${PROJECT_BINARY_DIR}/generated>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE                                          # only filters' own .cpp files
    ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_features(filters PUBLIC cxx_std_20)  # the public headers use std::span
target_link_libraries(filters PRIVATE $<BUILD_INTERFACE:sensors_warnings>)

# Header-only library: nothing to compile, only usage requirements.
add_library(ringbuf INTERFACE)
add_library(Sensors::ringbuf ALIAS ringbuf)
target_include_directories(ringbuf INTERFACE
  $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>)
target_compile_features(ringbuf INTERFACE cxx_std_20)

add_executable(sensors_app main.cpp)
target_link_libraries(sensors_app PRIVATE Sensors::filters Sensors::ringbuf sensors_warnings)
target_compile_definitions(sensors_app PRIVATE $<$<CONFIG:Debug>:SENSORS_TRACE=1>)
```

```cpp
// no-test (src/main.cpp of the sample project; needs the generated headers)
#include <cstdio>
#include <vector>
#include "sensors/filters.h"
#include "sensors/ring_buffer.h"
#include "sensors/version.h"

int main() {
    sensors::RingBuffer<double, 4> rb;
    for (double v : {20.0, 21.0, 22.0, 35.0, 23.0}) { rb.push(v); }
    std::vector<double> last;
    for (std::size_t i = 0; i < rb.size(); ++i) { last.push_back(rb[i]); }
#ifdef SENSORS_TRACE
    std::printf("[trace] %zu samples buffered\n", last.size());
#endif
    std::printf("sensors %s: avg(3)=%.2f median=%.1f\n", SENSORS_VERSION,
                sensors::movingAverage(last, 3), sensors::median(last));
}
```

### 3.3 `tests/CMakeLists.txt` with plain CTest

```cmake
add_executable(filters_test test_filters.cpp)
target_link_libraries(filters_test PRIVATE Sensors::filters sensors_warnings)

add_test(NAME filters.moving_average COMMAND filters_test moving_average)
add_test(NAME filters.median         COMMAND filters_test median)
set_tests_properties(filters.median PROPERTIES TIMEOUT 5 LABELS fast)
```

A test passes when its command exits with 0.

### 3.4 Running it (real output)

```text
$ cmake --preset release
-- Configuring done (0.2s)
-- Generating done (0.0s)
-- Build files have been written to: .../sensors/build/release

$ cmake --build --preset release
[5/7] Linking CXX static library src/libfilters.a
[6/7] Linking CXX executable src/sensors_app
[7/7] Linking CXX executable tests/filters_test

$ ./build/release/src/sensors_app
sensors 1.2.0: avg(3)=26.67 median=23.0

$ ctest --test-dir build/release
    Start 1: filters.moving_average
1/2 Test #1: filters.moving_average ...........   Passed    0.00 sec
    Start 2: filters.median
2/2 Test #2: filters.median ...................   Passed    0.00 sec
100% tests passed, 0 tests failed out of 2

$ cmake --preset debug && cmake --build --preset debug && ./build/debug/src/sensors_app
[trace] 4 samples buffered                      <- $<$<CONFIG:Debug>:SENSORS_TRACE=1>
sensors 1.2.0: avg(3)=26.67 median=23.0
```

---

## 4. Targets and usage requirements: `PRIVATE`, `PUBLIC`, `INTERFACE`

| Keyword | Used when building **this** target | Propagated to targets that **link** it |
|---|---|---|
| `PRIVATE` | ✅ | ❌ |
| `PUBLIC` | ✅ | ✅ |
| `INTERFACE` | ❌ | ✅ |

The rule of thumb: if something is needed by your **public headers**, make it `PUBLIC`. If only your `.cpp` files need it, make it `PRIVATE`. A header-only library has nothing to build, so everything about it is `INTERFACE`.

Here is what happens in the sample project:
- `sensors_app` links `Sensors::filters`. It therefore gets `include/` and `build/generated` on its include path (PUBLIC), and `cxx_std_20` (PUBLIC feature). It does **not** get `src/` (PRIVATE), and it doesn't inherit `filters`' warning flags (linked PRIVATE).
- If `filters.h` included `<fmt/format.h>`, then `filters` would need `target_link_libraries(filters PUBLIC fmt::fmt)`, because consumers compile that header too.
- Transitive propagation: if `B` links `A` PUBLIC and `C` links `B`, then `C` gets `A`'s interface requirements too.

The `target_*` commands, all of which take a visibility keyword:

| Command | Sets |
|---|---|
| `target_sources` | source files (also `FILE_SET HEADERS` / `CXX_MODULES`) |
| `target_include_directories` | `-I` paths |
| `target_compile_definitions` | `-D` macros |
| `target_compile_options` | raw compiler flags |
| `target_compile_features` | language standard / features (`cxx_std_20`) |
| `target_link_libraries` | other targets, imported targets, or raw libraries |
| `target_link_options` | raw linker flags |
| `target_precompile_headers` | precompiled headers |
| `set_target_properties` | anything else: `OUTPUT_NAME`, `CXX_VISIBILITY_PRESET`, `POSITION_INDEPENDENT_CODE`, `INTERPROCEDURAL_OPTIMIZATION`, ... |

### 4.1 Library types

| `add_library(name TYPE ...)` | What it produces |
|---|---|
| `STATIC` | `.a` / `.lib` archive |
| `SHARED` | `.so` / `.dll` (+ import `.lib`) / `.dylib` |
| `MODULE` | a plugin loaded with `dlopen`; never linked against |
| `OBJECT` | just the object files, which other targets can reuse without an archive |
| `INTERFACE` | no build output; only usage requirements (header-only libraries, "options" targets) |
| *(no type)* | `STATIC` or `SHARED`, depending on `BUILD_SHARED_LIBS` |
| `IMPORTED` | describes a library built elsewhere (what `find_package` creates) |
| `ALIAS` | a read-only alternative name, e.g. `Sensors::filters` |

> **Tip:** Always link through the **namespaced alias** (`Sensors::filters`). A name containing `::` must be a target. A typo is then a configure-time error, instead of silently becoming `-lSensors::filters` at link time.

---

## 5. Variables, cache, options and control flow

```cmake
set(SOURCES a.cpp b.cpp)                         # a normal variable: a ;-separated list
list(APPEND SOURCES c.cpp)
message(STATUS "Sources: ${SOURCES}")            # Sources: a.cpp;b.cpp;c.cpp

set(MAX_SENSORS 8 CACHE STRING "Maximum sensors") # cached: user-overridable with -DMAX_SENSORS=16
option(USE_SIMD "Enable SIMD paths" ON)           # cached BOOL

if(USE_SIMD AND CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64|AMD64")
  target_compile_definitions(filters PRIVATE USE_AVX2=1)
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "arm|aarch64")
  target_compile_definitions(filters PRIVATE USE_NEON=1)
endif()

foreach(tool IN ITEMS calibrate dump flash)
  add_executable(${tool} tools/${tool}.cpp)
  target_link_libraries(${tool} PRIVATE Sensors::filters)
endforeach()

function(sensors_add_test name)                  # functions have their own variable scope
  add_executable(${name} ${name}.cpp)
  target_link_libraries(${name} PRIVATE Sensors::filters)
  add_test(NAME ${name} COMMAND ${name})
endfunction()
```

| Concept | Notes |
|---|---|
| Normal variables | scoped to the directory or function; `set(X v PARENT_SCOPE)` writes to the caller |
| Cache variables | global and persistent in `CMakeCache.txt`; a normal variable with the same name hides the cache entry |
| Environment | `$ENV{HOME}` reads it at configure time only |
| Lists | strings separated by `;`. `"${LIST}"` keeps one argument; `${LIST}` splits into several |
| `if(VAR)` | truthy unless empty, `0`, `OFF`, `NO`, `FALSE`, `N`, `IGNORE`, `NOTFOUND` or `*-NOTFOUND` |

Useful built-in variables: `CMAKE_SOURCE_DIR`/`CMAKE_BINARY_DIR` (top of the whole build), `PROJECT_SOURCE_DIR` (the nearest `project()`), `CMAKE_CURRENT_SOURCE_DIR`/`CMAKE_CURRENT_BINARY_DIR` (the current `CMakeLists.txt`), `CMAKE_CXX_COMPILER_ID`, `CMAKE_SYSTEM_NAME`, `CMAKE_BUILD_TYPE`. Prefer `PROJECT_SOURCE_DIR` and `CMAKE_CURRENT_*` over `CMAKE_SOURCE_DIR`, so your project still works when someone else uses it via `add_subdirectory`.

---

## 6. Build types and generator expressions

| `CMAKE_BUILD_TYPE` | GCC/Clang flags |
|---|---|
| `Debug` | `-g` |
| `Release` | `-O3 -DNDEBUG` |
| `RelWithDebInfo` | `-O2 -g -DNDEBUG` |
| `MinSizeRel` | `-Os -DNDEBUG` |

**Single-config generators** (Ninja, Makefiles) choose one type at configure time with `-DCMAKE_BUILD_TYPE`. **Multi-config generators** (Visual Studio, Xcode, `Ninja Multi-Config`) choose at build time with `cmake --build build --config Release`. That's why `if(CMAKE_BUILD_TYPE STREQUAL "Debug")` is fragile and `$<CONFIG:Debug>` is correct: generator expressions are evaluated *per configuration* when the files are generated.

```cmake
target_compile_definitions(app PRIVATE
  $<$<CONFIG:Debug>:ENABLE_TRACE=1>                      # only in Debug
  PLATFORM_$<UPPER_CASE:${CMAKE_SYSTEM_NAME}>)            # PLATFORM_LINUX
target_compile_options(app PRIVATE
  $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wshadow>
  $<$<CXX_COMPILER_ID:MSVC>:/W4 /permissive->
  $<$<COMPILE_LANGUAGE:CXX>:-fno-exceptions>)             # not applied to C or ASM files
add_custom_command(TARGET app POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:app> ${CMAKE_SOURCE_DIR}/dist/)
```

| Expression | Value |
|---|---|
| `$<CONFIG:Debug>` | `1` in Debug, else `0` |
| `$<cond:text>` | `text` if `cond` is `1` |
| `$<IF:cond,a,b>` | `a` or `b` |
| `$<CXX_COMPILER_ID:GNU,Clang>` | `1` for those compilers |
| `$<TARGET_FILE:t>` | the full path of the built file |
| `$<BUILD_INTERFACE:x>` / `$<INSTALL_INTERFACE:x>` | `x` only when used from the build tree / from an install |
| `$<COMPILE_LANGUAGE:CXX>` | `1` while compiling C++ sources |

Debugging generator expressions: `file(GENERATE OUTPUT dbg.txt CONTENT "$<TARGET_PROPERTY:app,INCLUDE_DIRECTORIES>")` writes the evaluated value at generate time.

---

## 7. Dependencies

| Method | When | Example |
|---|---|---|
| `find_package(X CONFIG REQUIRED)` | the dependency is installed (system, vcpkg, Conan, your own install prefix) | `find_package(fmt 10 CONFIG REQUIRED)` |
| `FetchContent` | download and build from source at configure time | GoogleTest, small libraries |
| `add_subdirectory(third_party/x)` | vendored source (git submodule) | embedded SDKs |
| **vcpkg** / **Conan** | a package manager provides binaries and a toolchain file | larger dependency sets |

```cmake
find_package(Threads REQUIRED)
find_package(fmt 10 CONFIG REQUIRED)
target_link_libraries(app PRIVATE Threads::Threads fmt::fmt)   # imported targets carry their flags
```

`find_package` first looks for `<Name>Config.cmake` (shipped by the package: *config mode*) on `CMAKE_PREFIX_PATH` and the system prefixes, then for `Find<Name>.cmake` (*module mode*, e.g. CMake's own `FindThreads`, `FindOpenSSL`). Point it at custom installs with `-DCMAKE_PREFIX_PATH=/opt/sensors` or `-D<Name>_DIR=/path/to/lib/cmake/<Name>`.

```cmake
include(FetchContent)
FetchContent_Declare(googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG        v1.15.2            # pin a tag or commit hash, never a moving branch
  GIT_SHALLOW    TRUE
  FIND_PACKAGE_ARGS NAMES GTest)    # 3.24+: use an installed GTest if one exists, else download
FetchContent_MakeAvailable(googletest)

add_executable(math_test math_test.cpp)
target_link_libraries(math_test PRIVATE GTest::gtest_main)
include(GoogleTest)
gtest_discover_tests(math_test)     # registers every TEST() as its own ctest test
```

> **Tip:** Run `ctest --test-dir build -R MathTest --output-on-failure -j8` to filter tests by regex, show the output of failures, and run them in parallel. `--rerun-failed` and `--repeat until-fail:100` are useful for flaky tests.

---

## 8. Installing and exporting: making `find_package(Sensors)` work

The goal is that another project can write:

```cmake
cmake_minimum_required(VERSION 3.24)
project(Consumer LANGUAGES CXX)
find_package(Sensors 1.0 CONFIG REQUIRED)
add_executable(consumer main.cpp)
target_link_libraries(consumer PRIVATE Sensors::filters)   # include paths and C++20 come along
```

The install rules from §3.1 produce this tree (real `cmake --install build/release --prefix install`):

```text
install/include/sensors/filters.h
install/include/sensors/ring_buffer.h
install/include/sensors/version.h
install/lib/cmake/Sensors/SensorsConfig.cmake
install/lib/cmake/Sensors/SensorsConfigVersion.cmake
install/lib/cmake/Sensors/SensorsTargets-release.cmake
install/lib/cmake/Sensors/SensorsTargets.cmake
install/lib/libfilters.a
```

```text
$ cmake -S consumer -B build/consumer -G Ninja -DCMAKE_PREFIX_PATH=$PWD/install
$ cmake --build build/consumer && ./build/consumer/consumer
consumer using Sensors 1.2.0: median=2.0
```

The pieces:
- `install(TARGETS ... EXPORT SensorsTargets)` installs the binaries and records the targets in an *export set*.
- `install(EXPORT ... NAMESPACE Sensors::)` writes `SensorsTargets.cmake`, which creates `IMPORTED` targets named `Sensors::filters` and so on.
- `SensorsConfig.cmake` (from `configure_package_config_file`) is the file `find_package` looks for. It includes the targets file, and it is also where you call `find_dependency(...)` for any `PUBLIC` dependencies.
- `SensorsConfigVersion.cmake` lets `find_package(Sensors 1.0)` check version compatibility (`SameMajorVersion`).
- `$<BUILD_INTERFACE:...>` vs `$<INSTALL_INTERFACE:...>`: absolute source-tree paths must never leak into an installed package.

`cmake/SensorsConfig.cmake.in`:

```cmake
@PACKAGE_INIT@
include(CMakeFindDependencyMacro)
# find_dependency(fmt 10)        # one line per PUBLIC dependency of your targets
include("${CMAKE_CURRENT_LIST_DIR}/SensorsTargets.cmake")
check_required_components(Sensors)
```

> **Danger (real bug found while testing this page):** The first version of the sample called `include(GNUInstallDirs)` *after* `add_subdirectory(src)`. When `src/CMakeLists.txt` ran, `${CMAKE_INSTALL_INCLUDEDIR}` was still empty, so the exported target got an empty include directory. The consumer failed with `fatal error: sensors/filters.h: No such file or directory`. Variables are read when each line runs, so define them before the subdirectories that use them.

---

## 9. Presets: shared, reproducible configurations

`CMakePresets.json` is checked into the repository. Users (`CMakeUserPresets.json`, git-ignored) and IDEs (VS Code, CLion, Visual Studio) understand it, which replaces long command lines in READMEs:

```json
{
  "version": 6,
  "configurePresets": [
    {
      "name": "base", "hidden": true, "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/${presetName}"
    },
    {
      "name": "debug", "inherits": "base",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug", "SENSORS_ENABLE_ASAN": "ON" }
    },
    {
      "name": "release", "inherits": "base",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" }
    }
  ],
  "buildPresets": [
    { "name": "debug", "configurePreset": "debug" },
    { "name": "release", "configurePreset": "release" }
  ],
  "testPresets": [
    { "name": "debug", "configurePreset": "debug", "output": { "outputOnFailure": true } }
  ]
}
```

```bash
cmake --preset debug && cmake --build --preset debug && ctest --preset debug
```

```bash
cmake --list-presets
```

---

## 10. Cross-compiling for embedded: toolchain files

A **toolchain file** describes the target platform. It is read *before* the compiler is probed, so it must be passed on the first configure, and it shouldn't contain project logic.

```cmake
# cmake/arm-none-eabi.cmake
set(CMAKE_SYSTEM_NAME Generic)                      # bare metal: no OS
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER   arm-none-eabi-gcc)
set(CMAKE_CXX_COMPILER arm-none-eabi-g++)
set(CMAKE_ASM_COMPILER arm-none-eabi-gcc)
set(CMAKE_OBJCOPY      arm-none-eabi-objcopy)
set(CMAKE_SIZE         arm-none-eabi-size)

# Compiler probing can't link an executable without a linker script, so test with a static library.
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

# Search for programs on the host, but libraries and headers only in the target sysroot.
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
```

```cmake
# CMakeLists.txt for the firmware
cmake_minimum_required(VERSION 3.22)
project(Firmware LANGUAGES C CXX ASM)

set(MCU_FLAGS -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard)
set(LINKER_SCRIPT ${CMAKE_SOURCE_DIR}/stm32f407.ld)

add_executable(fw.elf src/main.cpp src/uart.cpp src/system.c startup_stm32f407.s)
target_compile_definitions(fw.elf PRIVATE STM32F407xx)
target_include_directories(fw.elf PRIVATE inc drivers/CMSIS/Include)
target_compile_features(fw.elf PRIVATE cxx_std_20)
target_compile_options(fw.elf PRIVATE ${MCU_FLAGS} -Os -ffunction-sections -fdata-sections
  $<$<COMPILE_LANGUAGE:CXX>:-fno-exceptions -fno-rtti -fno-threadsafe-statics>)
target_link_options(fw.elf PRIVATE ${MCU_FLAGS} -T${LINKER_SCRIPT}
  -Wl,--gc-sections -Wl,-Map=$<TARGET_FILE_DIR:fw.elf>/fw.map
  --specs=nano.specs --specs=nosys.specs -Wl,--print-memory-usage)
set_target_properties(fw.elf PROPERTIES LINK_DEPENDS ${LINKER_SCRIPT})   # relink when the .ld changes

add_custom_command(TARGET fw.elf POST_BUILD
  COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:fw.elf> $<TARGET_FILE_DIR:fw.elf>/fw.bin
  COMMAND ${CMAKE_SIZE} $<TARGET_FILE:fw.elf>
  COMMENT "Creating fw.bin")

add_custom_target(flash
  COMMAND st-flash write $<TARGET_FILE_DIR:fw.elf>/fw.bin 0x08000000
  DEPENDS fw.elf)
```

```bash
cmake -S . -B build-arm -G Ninja -DCMAKE_TOOLCHAIN_FILE=cmake/arm-none-eabi.cmake
```

```bash
cmake --build build-arm && cmake --build build-arm --target flash
```

A common layout keeps hardware-independent logic (filters, protocol parsers, state machines) in a library that builds for **both** the host and the target. The host build runs the unit tests in CI, and the target build links the same library into the firmware.

---

## 11. Handy extras

```cmake
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)                     # compile_commands.json for tools
set(CMAKE_CXX_CLANG_TIDY clang-tidy -checks=-*,bugprone-*) # run clang-tidy as part of compilation
set_target_properties(app PROPERTIES INTERPROCEDURAL_OPTIMIZATION ON)   # LTO (check with CheckIPOSupported)
set_target_properties(plugin PROPERTIES CXX_VISIBILITY_PRESET hidden VISIBILITY_INLINES_HIDDEN ON)
target_precompile_headers(app PRIVATE <vector> <string> <map>)
find_program(CCACHE ccache)
if(CCACHE)
  set(CMAKE_CXX_COMPILER_LAUNCHER ${CCACHE})              # compiler cache
endif()
add_custom_command(OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/table.cpp   # code generation, tracked as a dependency
  COMMAND python3 ${CMAKE_CURRENT_SOURCE_DIR}/gen_table.py > table.cpp
  DEPENDS gen_table.py)
target_sources(app PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/table.cpp)
```

| Command | Use |
|---|---|
| `cmake --build build --target help` | list the targets |
| `cmake --build build -v` | show the full compiler command lines |
| `cmake -LH build` | list cached variables with help text |
| `cmake --graphviz=deps.dot build` | target dependency graph |
| `cmake --trace-expand` | trace every evaluated command (configure debugging) |
| `cmake -E copy/make_directory/rm/env` | portable shell commands for custom commands |

---

## 12. Anti-patterns to catch in code review

```cmake
include_directories(include)                   # ❌ global: leaks into every target in the directory
link_libraries(foo)                            # ❌ global
add_definitions(-DDEBUG)                       # ❌ global; use target_compile_definitions
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")  # ❌ fights the build types, applies to everything
target_link_libraries(app foo)                 # ⚠ always give PRIVATE/PUBLIC/INTERFACE
target_include_directories(lib PUBLIC ${CMAKE_SOURCE_DIR}/include)  # ⚠ breaks under add_subdirectory and install
file(GLOB_RECURSE SRCS *.cpp)                  # ⚠ new files aren't seen until re-configure
                                               #   (add CONFIGURE_DEPENDS, or list files explicitly)
if(CMAKE_BUILD_TYPE STREQUAL "Debug")          # ⚠ wrong for multi-config generators; use $<CONFIG:Debug>
cmake_minimum_required(VERSION 2.8)            # ❌ ancient policies; use 3.20+ for new projects
```

---

## 13. Interview checklist

- [ ] Configure vs generate vs build; generators; out-of-source builds; the cache.
- [ ] Targets and usage requirements; `PRIVATE`/`PUBLIC`/`INTERFACE` with the "does it appear in my public headers?" rule.
- [ ] Library types including `INTERFACE`, `OBJECT`, `IMPORTED`, `ALIAS`; namespaced aliases.
- [ ] Build types; single- vs multi-config generators; generator expressions.
- [ ] `find_package` config vs module mode; `CMAKE_PREFIX_PATH`; `FetchContent`; vcpkg/Conan.
- [ ] CTest: `add_test`, `gtest_discover_tests`, `ctest` options.
- [ ] Install/export: export sets, `Config.cmake`, version files, `BUILD_INTERFACE`/`INSTALL_INTERFACE`, `find_dependency`.
- [ ] Presets.
- [ ] Toolchain files and embedded post-build steps (objcopy, size, map file, `LINK_DEPENDS`).
- [ ] Anti-patterns: global commands, `CMAKE_CXX_FLAGS`, `CMAKE_SOURCE_DIR`, `GLOB`.

---

## Practice

1. Library `net` uses `boost::asio` only inside `net.cpp`, but its public header `net.h` includes `<openssl/ssl.h>`. Write the `target_link_libraries` call.
2. Why might `if(CMAKE_BUILD_TYPE STREQUAL "Debug") add_compile_definitions(TRACE) endif()` do nothing in a Visual Studio build? Rewrite it.
3. A consumer project calls `find_package(Sensors CONFIG REQUIRED)` and gets "Could not find a package configuration file provided by Sensors". Give three ways to fix it.
4. Write a CMake function `add_unit_test(name)` that creates an executable from `name.cpp`, links `Sensors::filters`, and registers it with CTest under a `unit` label.
5. Your firmware build doesn't relink after you edit the linker script. Why, and how do you fix it?

:::details Show solution
1. Asio is only an implementation detail, so link it `PRIVATE`. OpenSSL appears in the public header, so consumers compile against it: link it `PUBLIC`.
```cmake
find_package(Boost REQUIRED)              # Asio is header-only
find_package(OpenSSL REQUIRED)
target_link_libraries(net
  PUBLIC  OpenSSL::SSL
  PRIVATE Boost::headers)
```
2. Visual Studio is a **multi-config** generator. `CMAKE_BUILD_TYPE` is empty at configure time, because you pick Debug or Release in the IDE or with `--config`. Use a generator expression, which is evaluated per configuration:
```cmake
target_compile_definitions(app PRIVATE $<$<CONFIG:Debug>:TRACE>)
```
3. (a) Pass the install prefix: `-DCMAKE_PREFIX_PATH=/path/to/install`. (b) Point at the config directory directly: `-DSensors_DIR=/path/to/install/lib/cmake/Sensors`. (c) Make sure the library actually installs a `SensorsConfig.cmake`, via `install(EXPORT ...)` and `configure_package_config_file`. Alternatively, consume it as source with `add_subdirectory` or `FetchContent` instead.
4.
```cmake
function(add_unit_test name)
  add_executable(${name} ${name}.cpp)
  target_link_libraries(${name} PRIVATE Sensors::filters)
  add_test(NAME ${name} COMMAND ${name})
  set_tests_properties(${name} PROPERTIES LABELS unit TIMEOUT 30)
endfunction()

add_unit_test(test_median)
add_unit_test(test_moving_average)
# run only these: ctest --test-dir build -L unit
```
5. The linker script is passed as a flag (`-T...`), not as a source, so the build tool doesn't know the executable depends on it. Declare the dependency: `set_target_properties(fw.elf PROPERTIES LINK_DEPENDS ${LINKER_SCRIPT})`. In Make, list the `.ld` file as a prerequisite of the `.elf`.
:::

---

## Interview Q&A

- **What does CMake actually do?** Configures (probes compilers, evaluates CMakeLists) and generates native build files; the native tool (Ninja/Make/MSBuild) does the building.
- **PRIVATE vs PUBLIC vs INTERFACE?** Whether a usage requirement applies to the target, its consumers, or both.
- **How do you add a third-party library?** `find_package` for installed packages; `FetchContent`/vcpkg/Conan otherwise; link the imported target.
- **How do you cross-compile?** A toolchain file setting the compilers and `CMAKE_SYSTEM_NAME`, passed with `-DCMAKE_TOOLCHAIN_FILE`.
- **What is a generator expression?** `$<...>` syntax evaluated at generation time — per-config or per-compiler settings.
- **Why out-of-source builds?** Keep the source tree clean; multiple build dirs (debug/release/arm) from one source.
- **What's "Modern CMake"?** A target-centric style: every setting is attached to a target with a visibility keyword and propagated through `target_link_libraries`, instead of global variables and directory-wide commands.
- **Why link to `Foo::bar` instead of `bar`?** A name with `::` must be a target, so typos fail at configure time; it also matches the imported target name consumers get from `find_package`, so the same code works with an installed or a subdirectory build.
- **What's the difference between `find_package` config mode and module mode?** Config mode loads a `<Pkg>Config.cmake` shipped by the package itself; module mode runs a `Find<Pkg>.cmake` script (from CMake or your project) that searches for the files.
- **What are `BUILD_INTERFACE` and `INSTALL_INTERFACE` for?** Giving a target different include paths when used from the build tree versus after installation, so absolute source paths don't leak into exported packages.
- **Why is `file(GLOB)` for sources discouraged?** CMake only evaluates the glob at configure time, so adding or removing files doesn't trigger a rebuild of the build system; `CONFIGURE_DEPENDS` helps but costs time and isn't reliable on all generators.
- **Single-config vs multi-config generators?** Ninja/Makefiles pick the build type at configure time (`CMAKE_BUILD_TYPE`); Visual Studio/Xcode/Ninja Multi-Config hold all configs and pick at build time (`--config`).
- **What does `enable_testing()` + `add_test()` give you?** CTest integration: tests are registered in the build tree and run with `ctest`, with filtering, parallelism, timeouts and labels.

---

## External resources

- **CMake documentation** (cmake.org/cmake/help/latest): the `cmake-buildsystem(7)`, `cmake-generator-expressions(7)`, `cmake-packages(7)` and `cmake-presets(7)` manuals.
- **Craig Scott — *Professional CMake: A Practical Guide*** (kept up to date with each CMake release).
- **Henry Schreiner — "An Introduction to Modern CMake"** (cliutils.gitlab.io/modern-cmake).
- **Daniel Pfeifer — "Effective CMake"** (C++Now 2017 talk).
- **Deniz Bahadir — "More Modern CMake"** (Meeting C++ 2018).
- **vcpkg** and **Conan** documentation for dependency management.
