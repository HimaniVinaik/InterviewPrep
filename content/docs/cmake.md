# Modern CMake

CMake is a **build system generator**: you describe targets in `CMakeLists.txt`, and CMake generates Ninja files, Makefiles, Visual Studio or Xcode projects. "Modern CMake" (3.x, target-based) is about **targets and their usage requirements**, not global variables.

> **Key:** Think in **targets** (`add_library`, `add_executable`) with **properties** (`target_include_directories`, `target_link_libraries`, `target_compile_features`) and **visibility** (`PRIVATE` / `PUBLIC` / `INTERFACE`). Avoid `include_directories()`, `link_libraries()`, and setting `CMAKE_CXX_FLAGS` globally.

## 1. The basic workflow

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release   # configure + generate
cmake --build build -j                                     # build
ctest --test-dir build --output-on-failure                 # run tests
cmake --install build --prefix /opt/myapp                  # install
```

Always build **out of source** (`-B build`). Delete `build/` to start fresh.

## 2. A minimal project

```cmake
cmake_minimum_required(VERSION 3.20)
project(Sensors VERSION 1.0 LANGUAGES CXX)

add_executable(sensors src/main.cpp)
target_compile_features(sensors PRIVATE cxx_std_20)   # preferred over CMAKE_CXX_STANDARD
```

## 3. Libraries and visibility

```cmake
add_library(filters STATIC
    src/filters/moving_average.cpp
    src/filters/kalman.cpp)

target_include_directories(filters
    PUBLIC  ${CMAKE_CURRENT_SOURCE_DIR}/include   # users of `filters` need these headers
    PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)      # only filters' own .cpp files need these

target_compile_features(filters PUBLIC cxx_std_20) # consumers must also use C++20
target_compile_options(filters PRIVATE -Wall -Wextra -Wpedantic)

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE filters)        # inherits filters' PUBLIC include dirs & features
```

| Keyword | Applies to the target itself | Propagates to dependents |
|---|---|---|
| `PRIVATE` | ✅ | ❌ |
| `PUBLIC` | ✅ | ✅ |
| `INTERFACE` | ❌ | ✅ (header-only libs) |

**Rule of thumb:** if a dependency appears in your **public headers**, link it `PUBLIC`; if only in `.cpp` files, `PRIVATE`.

```cmake
# Header-only library
add_library(ringbuf INTERFACE)
target_include_directories(ringbuf INTERFACE include)
target_compile_features(ringbuf INTERFACE cxx_std_20)

# Namespaced alias (mirrors what find_package provides)
add_library(Sensors::filters ALIAS filters)
```

Library types: `STATIC`, `SHARED`, `MODULE` (plugins), `OBJECT` (object files reused by other targets), `INTERFACE`. Without a type, `BUILD_SHARED_LIBS` decides.

## 4. Recommended project layout

```text
project/
├── CMakeLists.txt
├── CMakePresets.json
├── cmake/                  # helper modules, toolchain files
├── include/sensors/*.h     # public headers
├── src/                    # implementation + private headers
│   └── CMakeLists.txt
├── tests/
│   └── CMakeLists.txt
└── third_party/
```

```cmake
# top-level CMakeLists.txt
cmake_minimum_required(VERSION 3.24)
project(Sensors VERSION 1.2.0 LANGUAGES CXX)

option(SENSORS_BUILD_TESTS "Build unit tests" ON)

add_subdirectory(src)
if (SENSORS_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
```

## 5. Build types & configuration

```cmake
if (NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()
# Debug (-O0 -g), Release (-O3 -DNDEBUG), RelWithDebInfo (-O2 -g), MinSizeRel (-Os)

# Generator expressions: evaluated at build-generation time
target_compile_definitions(app PRIVATE $<$<CONFIG:Debug>:ENABLE_TRACE=1>)
target_compile_options(app PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wshadow>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>)
```

### Sanitizer option

```cmake
option(ENABLE_ASAN "AddressSanitizer + UBSan" OFF)
if (ENABLE_ASAN)
    target_compile_options(app PRIVATE -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(app PRIVATE -fsanitize=address,undefined)
endif()
```

## 6. Dependencies

### `find_package` (installed libraries)

```cmake
find_package(Threads REQUIRED)
find_package(fmt 10 CONFIG REQUIRED)
target_link_libraries(app PRIVATE Threads::Threads fmt::fmt)
```

Imported targets like `fmt::fmt` carry their include directories and flags — you just link them.

### `FetchContent` (download at configure time)

```cmake
include(FetchContent)
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.15.2)
FetchContent_MakeAvailable(googletest)
```

Other options: package managers (**vcpkg**, **Conan**), `add_subdirectory(third_party/lib)`, CPM.cmake.

## 7. Testing with CTest + GoogleTest

```cmake
# tests/CMakeLists.txt
include(FetchContent)
FetchContent_Declare(googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.15.2)
FetchContent_MakeAvailable(googletest)

add_executable(filters_test test_moving_average.cpp)
target_link_libraries(filters_test PRIVATE filters GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(filters_test)     # registers each TEST() with ctest
```

```bash
ctest --test-dir build -R MovingAverage --output-on-failure -j
```

## 8. CMake Presets

`CMakePresets.json` checks shared configurations into the repo — no more long command lines:

```json
{
  "version": 6,
  "configurePresets": [
    { "name": "debug", "generator": "Ninja", "binaryDir": "build/debug",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug", "ENABLE_ASAN": "ON" } },
    { "name": "release", "generator": "Ninja", "binaryDir": "build/release",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" } }
  ],
  "buildPresets": [ { "name": "debug", "configurePreset": "debug" } ],
  "testPresets":  [ { "name": "debug", "configurePreset": "debug",
                      "output": { "outputOnFailure": true } } ]
}
```

```bash
cmake --preset debug && cmake --build --preset debug && ctest --preset debug
```

## 9. Cross-compiling for embedded (toolchain file)

```cmake
# cmake/arm-none-eabi.cmake
set(CMAKE_SYSTEM_NAME Generic)            # bare metal: no OS
set(CMAKE_SYSTEM_PROCESSOR arm)
set(CMAKE_C_COMPILER   arm-none-eabi-gcc)
set(CMAKE_CXX_COMPILER arm-none-eabi-g++)
set(CMAKE_ASM_COMPILER arm-none-eabi-gcc)
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)   # can't link test executables without a .ld
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
```

```cmake
# CMakeLists.txt for firmware
cmake_minimum_required(VERSION 3.22)
project(Firmware LANGUAGES C CXX ASM)

set(MCU_FLAGS -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard)

add_executable(fw.elf src/main.cpp src/uart.cpp startup_stm32f4.s)
target_compile_options(fw.elf PRIVATE ${MCU_FLAGS} -Os -ffunction-sections -fdata-sections
                                      $<$<COMPILE_LANGUAGE:CXX>:-fno-exceptions -fno-rtti>)
target_link_options(fw.elf PRIVATE ${MCU_FLAGS} -T${CMAKE_SOURCE_DIR}/stm32f4.ld
                                   -Wl,--gc-sections -Wl,-Map=fw.map --specs=nano.specs)
target_compile_features(fw.elf PRIVATE cxx_std_20)

add_custom_command(TARGET fw.elf POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:fw.elf> fw.bin
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:fw.elf>)
```

```bash
cmake -S . -B build-arm -G Ninja -DCMAKE_TOOLCHAIN_FILE=cmake/arm-none-eabi.cmake
cmake --build build-arm
```

## 10. Installing & exporting (so others can `find_package` you)

```cmake
include(GNUInstallDirs)
install(TARGETS filters EXPORT SensorsTargets
        ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
        LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR})
install(DIRECTORY include/ DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(EXPORT SensorsTargets NAMESPACE Sensors:: DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Sensors)

target_include_directories(filters PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>   # when building
    $<INSTALL_INTERFACE:include>)                             # after install
```

## 11. Handy extras

```cmake
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)       # compile_commands.json for clangd / clang-tidy
set(CMAKE_CXX_CLANG_TIDY clang-tidy)        # run clang-tidy during compilation
set_target_properties(app PROPERTIES INTERPROCEDURAL_OPTIMIZATION ON)   # LTO
configure_file(version.h.in version.h)      # inject @PROJECT_VERSION@ into a header
message(STATUS "Compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
```

## 12. Anti-patterns to avoid

```cmake
include_directories(include)                  # ❌ global: leaks into every target
link_libraries(foo)                           # ❌ global
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3") # ❌ overrides build types, not per-target
file(GLOB_RECURSE SRCS *.cpp)                 # ⚠ new files not noticed without re-configure
                                              #   (if used, add CONFIGURE_DEPENDS)
target_link_libraries(app foo)                # ⚠ always specify PRIVATE/PUBLIC/INTERFACE
```

## Interview Q&A

- **What does CMake actually do?** Configures (probes compilers, evaluates CMakeLists) and generates native build files; the native tool (Ninja/Make/MSBuild) does the building.
- **PRIVATE vs PUBLIC vs INTERFACE?** Whether a usage requirement applies to the target, its consumers, or both.
- **How do you add a third-party library?** `find_package` for installed packages; `FetchContent`/vcpkg/Conan otherwise; link the imported target.
- **How do you cross-compile?** A toolchain file setting the compilers and `CMAKE_SYSTEM_NAME`, passed with `-DCMAKE_TOOLCHAIN_FILE`.
- **What is a generator expression?** `$<...>` syntax evaluated at generation time — per-config or per-compiler settings.
- **Why out-of-source builds?** Keep the source tree clean; multiple build dirs (debug/release/arm) from one source.
