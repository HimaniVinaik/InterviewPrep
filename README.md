# PrepForge — C/C++ Interview Prep

A static, mobile-friendly study site (dark mode included) for software / embedded interviews, hosted on GitHub Pages.

- **Problems** — a NeetCode-style roadmap of 162 problems across 19 patterns (arrays → DP → graphs → C & embedded classics). Each has a hint, and a **Show Answer** button that reveals a modern C++ (or C) solution and an explanation with complexity.
- **Docs** — in-depth C/C++ guides: raw & smart pointers, RAII, move semantics, OOP, lambdas, templates & concepts, C++20/23, STL, concurrency, Make, CMake, C essentials, UB, Q&A.
- **Design** — SOLID, creational / structural / behavioral patterns in C++, LLD framework + worked examples, HLD fundamentals + case studies, embedded architecture.
- **Math** — complexity, discrete math, probability, number theory, binary/floats, embedded math (fixed-point, filters, PID, CRC), linear algebra, geometry, calculus for ML.
- **Learn** — problem solving, data structures, algorithms, debugging, C++/C coding standards, testing, embedded fundamentals & Q&A, OS, computer architecture, Python, CUDA, AI/ML.

Progress (solved, starred, guides completed) is stored in your browser's `localStorage`; use *Export/Import progress* in the footer to move it between devices.

## Hosting on GitHub Pages

1. Repo **Settings → Pages**.
2. *Source*: **Deploy from a branch**, Branch: **main**, folder **/ (root)**. Save.
3. The site appears at `https://<user>.github.io/<repo>/` after a minute.

No build step: plain HTML/CSS/JS plus Markdown content files.

## Run locally

Content is loaded with `fetch`, so serve the folder over HTTP (opening `index.html` from disk won't load the content):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding content

- **Article:** add `content/<section>/<id>.md`, then register `{ id, title, desc }` in `js/manifest.js`.
- **Problem:** append to the pattern file `content/problems/<pattern>.md`:

````markdown
## Problem Title
- difficulty: Medium
- leetcode: 123          (use - for non-LeetCode problems)
- slug: problem-title    (LeetCode URL slug)

Problem statement...

### Hint
...

### Solution
```cpp
// code
```

### Explanation
... **Time:** O(n) · **Space:** O(1)
````

## Layout

```
index.html          app shell
css/style.css       theme (light/dark), layout, mobile nav
js/manifest.js      sections, patterns, roadmap order
js/markdown.js      tiny Markdown renderer + syntax highlighter (no dependencies)
js/app.js           router, views, progress, search
content/            all study material as Markdown
```
