# Structural Patterns

Structural patterns are about **composing classes and objects** into larger structures while keeping them flexible.

| Pattern | Intent | One-liner |
|---|---|---|
| Adapter | make an incompatible interface fit | wrap a legacy/C API behind your interface |
| Decorator | add behaviour dynamically by wrapping | `Buffered(Compressed(File))` |
| Facade | simple interface over a complex subsystem | `Camera::capture()` hides 12 driver calls |
| Proxy | stand-in that controls access | lazy loading, remote, access control, caching |
| Composite | tree of objects treated uniformly | files & folders, UI widgets |
| Bridge | split abstraction from implementation | `Shape` × `Renderer` without class explosion |
| Flyweight | share common state across many objects | glyphs, tiles |
| PImpl | hide implementation behind a pointer | ABI stability, compile firewall |

## 1. Adapter

**Intent:** convert one interface into another clients expect. Extremely common when wrapping C SDKs or vendor HALs.

```cpp
// Our interface
struct ITempSensor {
    virtual ~ITempSensor() = default;
    virtual float celsius() = 0;
};

// Vendor C API we can't change
extern "C" {
    int  vendor_read_raw(int channel);     // returns tenths of a degree Fahrenheit
}

class VendorTempAdapter : public ITempSensor {
    int channel_;
public:
    explicit VendorTempAdapter(int ch) : channel_(ch) {}
    float celsius() override {
        float f = vendor_read_raw(channel_) / 10.0f;
        return (f - 32.0f) * 5.0f / 9.0f;
    }
};
```

*Object adapter* (composition, shown above) is preferred over *class adapter* (multiple inheritance).

## 2. Decorator

**Intent:** attach responsibilities to an object dynamically, by wrapping it in objects with the **same interface**.

```cpp
struct IStream {
    virtual ~IStream() = default;
    virtual void write(std::span<const std::byte> data) = 0;
};

struct FileStream : IStream {
    void write(std::span<const std::byte> d) override { /* fwrite */ }
};

class StreamDecorator : public IStream {
protected:
    std::unique_ptr<IStream> inner_;
public:
    explicit StreamDecorator(std::unique_ptr<IStream> s) : inner_(std::move(s)) {}
};

struct CrcStream : StreamDecorator {
    using StreamDecorator::StreamDecorator;
    uint32_t crc = 0;
    void write(std::span<const std::byte> d) override {
        crc = crc32_update(crc, d);       // add behaviour...
        inner_->write(d);                 // ...then delegate
    }
};
struct LoggingStream : StreamDecorator {
    using StreamDecorator::StreamDecorator;
    void write(std::span<const std::byte> d) override {
        std::println("writing {} bytes", d.size());
        inner_->write(d);
    }
};

auto out = std::make_unique<LoggingStream>(
              std::make_unique<CrcStream>(
                  std::make_unique<FileStream>()));
```

Decorators compose at runtime and avoid a subclass for every combination (`LoggingCrcFileStream`…). Compile-time variant: template mixins / policy classes.

## 3. Facade

**Intent:** provide a single simplified interface to a complex subsystem.

```cpp
class CameraModule {          // facade
    I2cBus& i2c_; DmaController& dma_; ImageSensor sensor_; Isp isp_;
public:
    CameraModule(I2cBus& i2c, DmaController& dma) : i2c_(i2c), dma_(dma), sensor_(i2c), isp_(dma) {}
    Image capture() {
        sensor_.power_on();
        sensor_.configure(Resolution::HD, Format::RAW10);
        auto raw = dma_.receive(sensor_.frame_size());
        return isp_.process(raw);           // demosaic, white balance, gamma...
    }
};
```

Callers use `capture()`; experts can still reach the subsystem directly.

## 4. Proxy

**Intent:** a surrogate controlling access to another object with the same interface.

| Kind | Example |
|---|---|
| Virtual (lazy) | load a large image only on first `draw()` |
| Protection | check permissions before forwarding |
| Remote | local stub for an RPC service |
| Caching | memoise results |
| Smart reference | `std::shared_ptr` is a proxy that counts references |

```cpp
struct IImage { virtual ~IImage() = default; virtual void draw() = 0; };
struct RealImage : IImage {
    explicit RealImage(std::string path) { /* expensive decode */ }
    void draw() override { /* blit */ }
};
class LazyImage : public IImage {
    std::string path_;
    std::unique_ptr<RealImage> real_;
public:
    explicit LazyImage(std::string p) : path_(std::move(p)) {}
    void draw() override {
        if (!real_) real_ = std::make_unique<RealImage>(path_);   // load on first use
        real_->draw();
    }
};
```

## 5. Composite

**Intent:** compose objects into trees and treat leaves and composites uniformly.

```cpp
struct Node {
    virtual ~Node() = default;
    virtual std::size_t size() const = 0;
    virtual void print(int depth = 0) const = 0;
};
struct File : Node {
    std::string name; std::size_t bytes;
    File(std::string n, std::size_t b) : name(std::move(n)), bytes(b) {}
    std::size_t size() const override { return bytes; }
    void print(int d) const override { std::println("{:{}}{} ({})", "", d * 2, name, bytes); }
};
struct Folder : Node {
    std::string name;
    std::vector<std::unique_ptr<Node>> children;
    explicit Folder(std::string n) : name(std::move(n)) {}
    void add(std::unique_ptr<Node> n) { children.push_back(std::move(n)); }
    std::size_t size() const override {
        std::size_t s = 0;
        for (const auto& c : children) s += c->size();     // recursive aggregation
        return s;
    }
    void print(int d) const override {
        std::println("{:{}}{}/", "", d * 2, name);
        for (const auto& c : children) c->print(d + 1);
    }
};
```

## 6. Bridge

**Intent:** decouple an abstraction from its implementation so both can vary independently — avoids an M×N class explosion.

```cpp
struct IRenderer {                                // implementation hierarchy
    virtual ~IRenderer() = default;
    virtual void circle(float x, float y, float r) = 0;
};
struct OpenGlRenderer : IRenderer { void circle(float, float, float) override; };
struct SvgRenderer    : IRenderer { void circle(float, float, float) override; };

class Shape {                                     // abstraction hierarchy
protected:
    IRenderer& r_;                                // the "bridge"
public:
    explicit Shape(IRenderer& r) : r_(r) {}
    virtual ~Shape() = default;
    virtual void draw() = 0;
};
class Circle : public Shape {
    float x_, y_, rad_;
public:
    Circle(IRenderer& r, float x, float y, float rad) : Shape(r), x_(x), y_(y), rad_(rad) {}
    void draw() override { r_.circle(x_, y_, rad_); }
};
```

Without Bridge you'd need `OpenGlCircle`, `SvgCircle`, `OpenGlSquare`, `SvgSquare`…

## 7. Flyweight

**Intent:** share intrinsic (common) state among many fine-grained objects to save memory.

```cpp
struct GlyphData { /* bitmap, metrics — large, shared */ };
class GlyphCache {
    std::unordered_map<char32_t, std::shared_ptr<const GlyphData>> cache_;
public:
    std::shared_ptr<const GlyphData> get(char32_t c) {
        auto& slot = cache_[c];
        if (!slot) slot = std::make_shared<const GlyphData>(load_glyph(c));
        return slot;
    }
};
struct PlacedGlyph { std::shared_ptr<const GlyphData> glyph; int x, y; };   // extrinsic: position
```

## 8. PImpl (Pointer to Implementation)

**Intent:** hide private members behind an opaque pointer. Benefits: **ABI stability** for shared libraries, **faster builds** (headers don't pull in heavy dependencies), true encapsulation.

```cpp
// widget.h — no implementation details, no heavy includes
#include <memory>
class Widget {
public:
    Widget();
    ~Widget();                              // must be declared here, defined in .cpp
    Widget(Widget&&) noexcept;
    Widget& operator=(Widget&&) noexcept;
    void draw();
private:
    struct Impl;                            // forward declaration
    std::unique_ptr<Impl> impl_;
};

// widget.cpp
#include "widget.h"
#include <heavy_graphics_lib.h>
struct Widget::Impl {
    HeavyTexture tex;
    std::vector<Vertex> verts;
    void draw() { /* ... */ }
};
Widget::Widget() : impl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;                // Impl is complete here -> unique_ptr can delete it
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;
void Widget::draw() { impl_->draw(); }
```

> **Gotcha:** If you let the compiler generate `~Widget()` in the header, it tries to delete an incomplete `Impl` → compile error. Declare it in the header and `= default` it in the `.cpp`.

Cost: one heap allocation and one indirection per object.

## Quick recognition guide

- "Wrap the vendor SDK" → **Adapter**.
- "Add logging/encryption/compression optionally, in any combination" → **Decorator**.
- "Give the app team a simple API to our 10-module subsystem" → **Facade**.
- "Load lazily / check permissions / talk to remote" → **Proxy**.
- "Tree of things with the same operations" → **Composite**.
- "Two independent dimensions of variation" → **Bridge**.
- "Millions of similar objects" → **Flyweight**.
- "Header changes force rebuilding everything / need stable ABI" → **PImpl**.

## Interview Q&A

- **Adapter vs Decorator vs Proxy?** Adapter converts one interface into another; Decorator keeps the same interface and adds behaviour by wrapping; Proxy keeps the same interface and controls access (lazy loading, permissions, remote).
- **What is the PImpl idiom and what are its benefits?** Private members live in a forward-declared `Impl` behind a `std::unique_ptr`. It gives ABI stability, faster builds (headers don't include heavy dependencies) and stronger encapsulation.
- **Why must a PImpl class define its destructor in the .cpp file?** `unique_ptr<Impl>` needs `Impl` to be a complete type when it deletes it; defining the destructor where `Impl` is complete avoids an incomplete-type compile error.
- **When is the Composite pattern a good fit?** For tree structures where leaves and containers should be treated uniformly — file systems, UI widget trees, scene graphs.
- **What problem does the Bridge pattern solve?** It separates an abstraction from its implementation so both can vary independently, avoiding an M×N explosion of subclasses (e.g. shapes × renderers).
