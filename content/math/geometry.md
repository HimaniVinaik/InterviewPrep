# Computational Geometry

Geometry problems appear in graphics, robotics, GIS/maps, games and some coding interviews. The key skill: use **exact integer arithmetic** (cross products) instead of angles and floating-point slopes wherever possible.

## 1. Points and the 2D cross product

```cpp
struct P { long long x, y; };
P operator-(P a, P b) { return {a.x - b.x, a.y - b.y}; }
long long cross(P a, P b) { return a.x * b.y - a.y * b.x; }     // z-component of the 3D cross product
long long dot(P a, P b)   { return a.x * b.x + a.y * b.y; }

// Orientation of the turn a -> b -> c
int orient(P a, P b, P c) {
    long long v = cross(b - a, c - a);
    return (v > 0) - (v < 0);        // +1 counter-clockwise (left turn), -1 clockwise, 0 collinear
}
```

`cross(b − a, c − a)` = twice the signed area of triangle abc. This one primitive powers most of computational geometry.

## 2. Distances

```cpp
double dist(P a, P b) { return std::hypot(double(a.x - b.x), double(a.y - b.y)); }
long long dist2(P a, P b) { auto d = a - b; return dot(d, d); }        // compare without sqrt
long long manhattan(P a, P b) { return std::llabs(a.x - b.x) + std::llabs(a.y - b.y); }

// Distance from point p to the infinite line through a, b
double point_line(P p, P a, P b) { return std::fabs(double(cross(b - a, p - a))) / dist(a, b); }

// Distance from p to segment ab
double point_segment(P p, P a, P b) {
    P ab = b - a, ap = p - a;
    long long t = dot(ap, ab), len2 = dot(ab, ab);
    if (len2 == 0 || t <= 0) return dist(p, a);
    if (t >= len2) return dist(p, b);
    return std::fabs(double(cross(ab, ap))) / std::sqrt(double(len2));
}
```

## 3. Segment intersection

```cpp
bool on_segment(P a, P b, P p) {   // p collinear with ab and within its bounding box
    return std::min(a.x, b.x) <= p.x && p.x <= std::max(a.x, b.x) &&
           std::min(a.y, b.y) <= p.y && p.y <= std::max(a.y, b.y);
}

bool segments_intersect(P p1, P p2, P q1, P q2) {
    int d1 = orient(q1, q2, p1), d2 = orient(q1, q2, p2);
    int d3 = orient(p1, p2, q1), d4 = orient(p1, p2, q2);
    if (d1 != d2 && d3 != d4) return true;            // proper crossing
    if (d1 == 0 && on_segment(q1, q2, p1)) return true;   // touching / collinear cases
    if (d2 == 0 && on_segment(q1, q2, p2)) return true;
    if (d3 == 0 && on_segment(p1, p2, q1)) return true;
    if (d4 == 0 && on_segment(p1, p2, q2)) return true;
    return false;
}
```

Each segment's endpoints must lie on opposite sides of the other segment's line.

## 4. Polygon area (Shoelace formula)

```cpp
// Twice the signed area: positive if vertices are counter-clockwise
long long area2(const std::vector<P>& poly) {
    long long s = 0;
    for (size_t i = 0, n = poly.size(); i < n; ++i) s += cross(poly[i], poly[(i + 1) % n]);
    return s;
}
// area = |area2| / 2.0
```

**Pick's theorem** (lattice polygons): Area = I + B/2 − 1 (I interior lattice points, B boundary points).

## 5. Point in polygon

**Ray casting:** shoot a ray to the right; an odd number of edge crossings means inside.

```cpp
bool inside(const std::vector<P>& poly, P p) {
    bool in = false;
    for (size_t i = 0, j = poly.size() - 1; i < poly.size(); j = i++) {
        const P &a = poly[i], &b = poly[j];
        if ((a.y > p.y) != (b.y > p.y)) {
            // x-coordinate of the edge at height p.y, compared without division
            long long lhs = (p.x - a.x) * (b.y - a.y);
            long long rhs = (b.x - a.x) * (p.y - a.y);
            if ((b.y - a.y > 0) ? lhs < rhs : lhs > rhs) in = !in;
        }
    }
    return in;
}
```

For convex polygons, an O(log n) binary search over the fan of triangles works.

## 6. Convex hull (Andrew's monotone chain)

```cpp
std::vector<P> convex_hull(std::vector<P> pts) {
    std::ranges::sort(pts, [](P a, P b) { return a.x < b.x || (a.x == b.x && a.y < b.y); });
    if (pts.size() < 3) return pts;
    std::vector<P> h(2 * pts.size());
    size_t k = 0;
    for (const P& p : pts) {                                       // lower hull
        while (k >= 2 && cross(h[k - 1] - h[k - 2], p - h[k - 2]) <= 0) --k;
        h[k++] = p;
    }
    for (size_t i = pts.size() - 1, t = k + 1; i-- > 0; ) {        // upper hull
        while (k >= t && cross(h[k - 1] - h[k - 2], pts[i] - h[k - 2]) <= 0) --k;
        h[k++] = pts[i];
    }
    h.resize(k - 1);                                               // last point == first
    return h;                                                      // counter-clockwise
}
```

O(n log n). Applications: collision detection (bounding hulls), farthest pair (rotating calipers), LeetCode 587 "Erect the Fence".

## 7. Circles, rectangles, and angles

- Point in circle: dist²(p, c) ≤ r².
- Two circles intersect: |r₁ − r₂| ≤ d ≤ r₁ + r₂.
- Axis-aligned rectangles [x1,x2]×[y1,y2] overlap iff `max(x1a, x1b) < min(x2a, x2b)` and the same in y (LeetCode 836/223).
- Angle of a vector: `std::atan2(y, x)` ∈ (−π, π] — handles all quadrants (never `atan(y/x)`).
- Degrees ↔ radians: rad = deg × π / 180.
- Sorting points by polar angle: compare by half-plane then cross product (exact), not by `atan2` (floating).

## 8. Lines

- Through two points: a·x + b·y = c with a = y₂ − y₁, b = x₁ − x₂, c = a·x₁ + b·y₁.
- Intersection of two lines (Cramer's rule): det = a₁b₂ − a₂b₁; x = (b₂c₁ − b₁c₂)/det, y = (a₁c₂ − a₂c₁)/det; det = 0 → parallel.
- **Max points on a line (LeetCode 149):** for each anchor, count normalised direction vectors (dx, dy)/gcd with a consistent sign — avoid floating slopes.

## 9. Spatial data structures

| Structure | Use |
|---|---|
| Uniform grid / spatial hash | games, particle collisions |
| Quadtree / octree | maps, images, 3D scenes |
| k-d tree | nearest-neighbour search in low dimensions |
| R-tree | databases (PostGIS), bounding boxes |
| BVH | ray tracing |
| Geohash / S2 cells | "find nearby drivers" in HLD |

## 10. Earth geometry

Great-circle distance between latitude/longitude points (haversine):

```cpp
double haversine_km(double lat1, double lon1, double lat2, double lon2) {
    constexpr double R = 6371.0, D = std::numbers::pi / 180.0;
    double dlat = (lat2 - lat1) * D, dlon = (lon2 - lon1) * D;
    double a = std::sin(dlat / 2) * std::sin(dlat / 2) +
               std::cos(lat1 * D) * std::cos(lat2 * D) * std::sin(dlon / 2) * std::sin(dlon / 2);
    return 2 * R * std::asin(std::sqrt(a));
}
```

## Practice

1. Orientation of (0,0) → (1,0) → (1,1)? cross = 1 → **counter-clockwise (left turn)**.
2. Area of triangle (0,0), (4,0), (0,3)? |cross|/2 = **6**.
3. Do segments (0,0)–(2,2) and (0,2)–(2,0) intersect? **Yes**, at (1,1).
