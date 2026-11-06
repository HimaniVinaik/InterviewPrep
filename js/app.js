/* PrepForge — single-page app (hash routing, no build step, GitHub Pages friendly). */
(function () {
  'use strict';
  const M = window.MANIFEST;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = MD.esc;
  const app = $('#app');

  /* ---------------- Storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('pf.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pf.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const solved = store.get('solved', {});   // problemKey -> timestamp
  const starred = store.get('starred', {}); // problemKey -> 1
  const readMap = store.get('read', {});    // section/id -> timestamp
  const notes = store.get('notes', {});     // problemKey -> { text, updated }
  const save = () => { store.set('solved', solved); store.set('starred', starred); store.set('read', readMap); store.set('notes', notes); };

  /* ---------------- Icons ---------------- */
  const ICON = {
    home: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    problems: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
    docs: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h10"/></svg>',
    design: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    math: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M18 4H6l7 8-7 8h12"/></svg>',
    learn: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    course: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H19v-5"/><path d="M9 8h6M9 12h4"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    timer: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3"/></svg>',
    flame: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 22c4 0 7-3 7-7 0-5-4-7-5-11-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 9 0 4 3 7 7 7z"/></svg>',
  };
  const NAV = [
    ['', 'Home', 'home'], ['problems', 'Problems', 'problems'], ['docs', 'Docs', 'docs'],
    ['design', 'Design', 'design'], ['math', 'Math', 'math'], ['learn', 'Learn', 'learn'], ['courses', 'Courses', 'course'], ['mock', 'Mock', 'timer'],
  ];
  function buildNav() {
    // Hide tabs whose content isn't present (e.g. Courses before any course exists)
    for (let i = NAV.length - 1; i >= 0; --i) { const r = NAV[i][0]; if (r && !['problems', 'mock'].includes(r) && !M.sections[r]) NAV.splice(i, 1); }
    const html = NAV.map(([r, label, ic]) => `<a href="#/${r}" data-route="${r}">${ICON[ic]}<span>${label}</span></a>`).join('');
    $('#topnav').innerHTML = html;
    // Phones: 4 main tabs + a "More" sheet for the reference sections
    const primary = ['', 'problems', 'courses', 'mock'];
    const link = ([r, label, ic]) => `<a href="#/${r}" data-route="${r}">${ICON[ic]}<span>${label}</span></a>`;
    $('#bottomnav').innerHTML = NAV.filter(n => primary.includes(n[0])).map(link).join('') +
      `<button type="button" id="moreBtn" data-route="more">${ICON.more}<span>More</span></button>`;
    const sheet = document.createElement('div');
    sheet.className = 'more-sheet'; sheet.id = 'moreSheet'; sheet.hidden = true;
    sheet.innerHTML = `<div class="more-panel">${NAV.filter(n => !primary.includes(n[0])).map(link).join('')}</div>`;
    document.body.appendChild(sheet);
    $('#moreBtn').addEventListener('click', () => { sheet.hidden = !sheet.hidden; });
    sheet.addEventListener('click', () => { sheet.hidden = true; });
  }
  function markNav(top) {
    document.querySelectorAll('#topnav a, #bottomnav a, #moreSheet a').forEach(a => a.classList.toggle('active', a.dataset.route === top));
    const mb = document.getElementById('moreBtn');
    if (mb) mb.classList.toggle('active', ['docs', 'design', 'math', 'learn'].includes(top));
  }

  /* ---------------- Theme ---------------- */
  $('#themeBtn').addEventListener('click', () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('pf.theme', t); } catch (e) { }
  });

  /* ---------------- Content loading ---------------- */
  const cache = {};
  async function fetchText(path) {
    if (cache[path]) return cache[path];
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load ' + path + ' (' + res.status + ')');
    const t = await res.text();
    cache[path] = t;
    return t;
  }

  const TREE_IDS = M.patterns.levels.flat();
  const EXTRA_IDS = M.patterns.extra || [];          // standalone paths outside the roadmap tree
  const PATTERN_IDS = TREE_IDS.concat(EXTRA_IDS);
  let problemsPromise = null;
  // Parse a pattern markdown file into { intro, problems[] }
  function parsePattern(id, text) {
    const chunks = text.replace(/\r\n?/g, '\n').split(/\n(?=## )/);
    let intro = chunks.shift().replace(/^# .*\n/, '').trim();
    const problems = chunks.map((chunk, idx) => {
      const lines = chunk.split('\n');
      const title = lines.shift().replace(/^##\s+/, '').trim();
      const meta = {};
      while (lines.length && /^\s*-\s*\w+\s*:/.test(lines[0])) {
        const m = lines.shift().match(/^\s*-\s*(\w+)\s*:\s*(.*)$/);
        meta[m[1].toLowerCase()] = m[2].trim();
      }
      const body = lines.join('\n');
      const parts = body.split(/\n(?=### )/);
      const prompt = parts.shift().trim();
      const sec = {};
      parts.forEach(p => {
        const nl = p.indexOf('\n');
        const name = p.slice(4, nl < 0 ? undefined : nl).trim().toLowerCase();
        sec[name] = nl < 0 ? '' : p.slice(nl + 1).trim();
      });
      const slug = meta.slug || MD.slugify(title);
      return {
        key: id + '/' + slug, slug, title, pattern: id, idx,
        difficulty: meta.difficulty || 'Medium',
        lc: meta.leetcode || '',
        url: meta.url || (meta.leetcode && meta.leetcode !== '-' ? 'https://leetcode.com/problems/' + slug + '/' : ''),
        prompt, hint: sec.hint || '', solution: sec.solution || '', explanation: sec.explanation || '',
        c: sec['c version'] || '',
      };
    });
    return { id, intro, problems };
  }
  // Companion file <pattern>.more.md: "## <slug>" blocks with "### Approach N: Name" and "### Walkthrough" sections
  function mergeMore(pat, text) {
    const bySlug = {};
    pat.problems.forEach(p => { bySlug[p.slug] = p; p.approaches = p.approaches || []; p.walkthrough = p.walkthrough || ''; p.complexity = p.complexity || ''; });
    text.replace(/\r\n?/g, '\n').split(/\n(?=## )/).forEach(chunk => {
      if (!chunk.startsWith('## ')) return;
      const nl = chunk.indexOf('\n');
      const p = bySlug[chunk.slice(3, nl < 0 ? undefined : nl).trim()];
      if (!p || nl < 0) return;
      chunk.slice(nl + 1).split(/\n(?=### )/).forEach(sec => {
        if (!sec.startsWith('### ')) return;
        const e = sec.indexOf('\n');
        const name = sec.slice(4, e < 0 ? undefined : e).trim();
        const body = e < 0 ? '' : sec.slice(e + 1).trim();
        if (/^approach/i.test(name)) p.approaches.push({ name: name.replace(/^approach\s*\d*\s*[:.-]?\s*/i, ''), body });
        else if (/^walkthrough/i.test(name)) p.walkthrough = body;
        else if (/^complexity/i.test(name)) p.complexity = body;
      });
    });
    return pat;
  }
  // Companion file <pattern>.solutions.md: "## <slug>" blocks with "### Approach N: Name" and "### Optimal: Name".
  // When present, these replace the approaches from .more.md and the base solution/explanation.
  function mergeSolutions(pat, text) {
    const bySlug = {};
    pat.problems.forEach(p => { bySlug[p.slug] = p; });
    text.replace(/\r\n?/g, '\n').split(/\n(?=## )/).forEach(chunk => {
      if (!chunk.startsWith('## ')) return;
      const nl = chunk.indexOf('\n');
      const p = bySlug[chunk.slice(3, nl < 0 ? undefined : nl).trim()];
      if (!p || nl < 0) return;
      const approaches = [];
      let optimal = null;
      chunk.slice(nl + 1).split(/\n(?=### )/).forEach(sec => {
        if (!sec.startsWith('### ')) return;
        const e = sec.indexOf('\n');
        const name = sec.slice(4, e < 0 ? undefined : e).trim();
        const body = e < 0 ? '' : sec.slice(e + 1).trim();
        if (/^approach/i.test(name)) approaches.push({ name: name.replace(/^approach\s*\d*\s*[:.-]?\s*/i, ''), body });
        else if (/^optimal/i.test(name)) optimal = { name: name.replace(/^optimal\s*[:.-]?\s*/i, '') || 'Optimal', body };
      });
      if (approaches.length || optimal) { p.approaches = approaches; if (optimal) p.optimal = optimal; }
    });
    return pat;
  }
  function loadProblems() {
    if (!problemsPromise) {
      problemsPromise = Promise.all(PATTERN_IDS.map(id =>
        fetchText('content/problems/' + id + '.md').then(t => parsePattern(id, t))
          .then(pat => fetchText('content/problems/' + id + '.more.md').then(t => mergeMore(pat, t), () => pat))
          .then(pat => fetchText('content/problems/' + id + '.complexity.md').then(t => mergeMore(pat, t), () => pat))
          .then(pat => fetchText('content/problems/' + id + '.solutions.md').then(t => mergeSolutions(pat, t), () => pat))
          .catch(e => ({ id, intro: '⚠️ ' + e.message, problems: [] }))
      )).then(list => { const o = {}; list.forEach(p => { o[p.id] = p; }); return o; });
    }
    return problemsPromise;
  }

  /* ---------------- Helpers ---------------- */
  function bar(done, total) {
    const pct = total ? Math.round(done / total * 100) : 0;
    return `<div class="bar-row"><div class="bar"><span style="width:${pct}%"></span></div><span>${done}/${total}</span></div>`;
  }
  function allArticles() {
    const out = [];
    for (const [sec, S] of Object.entries(M.sections)) for (const g of S.groups) for (const it of g.items) out.push({ ...it, section: sec, group: g.name });
    return out;
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
  }
  function renderMd(text, toc) {
    return MD.render(text, { toc });
  }
  function footer() {
    return `<footer class="site-foot">PrepForge · progress is saved in this browser · <a href="#/notes">My notes</a> · <a href="#/" data-action="export">Export progress &amp; notes</a> · <a href="#/" data-action="import">Import</a></footer>`;
  }

  /* ---------------- Views ---------------- */
  async function viewHome() {
    const P = await loadProblems();
    const probs = PATTERN_IDS.flatMap(id => P[id].problems);
    const solvedN = probs.filter(p => solved[p.key]).length;
    const allArts = allArticles();
    const arts = allArts.filter(a => a.section !== 'courses');          // guides
    const levels = allArts.filter(a => a.section === 'courses');        // course levels
    const readN = arts.filter(a => readMap[a.section + '/' + a.id]).length;
    const levelsN = levels.filter(a => readMap[a.section + '/' + a.id]).length;
    const focus = arts.filter(a => a.focus);
    // next problem in roadmap order
    const next = probs.find(p => !solved[p.key]);
    const starredList = probs.filter(p => starred[p.key]);
    const tiles = [
      ['problems', 'Problems', `${probs.length} curated LeetCode-style problems across ${PATTERN_IDS.length} patterns, with C++ solutions & explanations.`],
      ['docs', 'C / C++ Docs', 'Pointers, smart pointers, lambdas, OOP, templates, C++20, CMake, Make and more.'],
      ['design', 'Design', 'Design patterns in C++, low-level design, high-level system design, embedded architecture.'],
      ['math', 'Math', 'Complexity, combinatorics, probability, number theory, floats, fixed-point, linear algebra.'],
      ['learn', 'Learn', 'Algorithms, data structures, debugging, coding standards, embedded, OS, CUDA, AI, Python.'],
    ];
    if (levels.length) tiles.push(['courses', 'Courses', `AI & Machine Learning from zero: ${levels.length} hands-on levels — maths, NumPy, C++, PyTorch, CNNs, transformers.`]);
    app.innerHTML = `
      <section class="hero">
        <h1>Forge your interview skills.</h1>
        <p>A pattern-first roadmap of the most common coding interview problems, solved in modern C++ — plus deep-dive guides on C/C++, design, math and embedded systems.</p>
        <div class="btn-row">
          ${next ? `<a class="btn btn-primary" href="#/problems/${next.pattern}/${next.slug}">${ICON.flame} Continue: ${esc(next.title)}</a>` : '<span class="btn">🎉 All problems solved</span>'}
          <a class="btn" href="#/problems">View roadmap</a>
          <a class="btn" href="#/mock">${ICON.timer} Mock interview</a>
          <button class="btn" data-action="random">${ICON.shuffle} Random problem</button>
        </div>
      </section>
      <div class="stats">
        <div class="card stat"><div class="num">${solvedN}<span class="faint" style="font-size:16px">/${probs.length}</span></div><div class="lbl">Problems solved</div>${bar(solvedN, probs.length)}</div>
        <div class="card stat"><div class="num">${readN}<span class="faint" style="font-size:16px">/${arts.length}</span></div><div class="lbl">Guides completed</div>${bar(readN, arts.length)}</div>
        <div class="card stat"><div class="num">${PATTERN_IDS.filter(id => P[id].problems.length && P[id].problems.every(p => solved[p.key])).length}<span class="faint" style="font-size:16px">/${PATTERN_IDS.length}</span></div><div class="lbl">Patterns mastered</div></div>
        ${levels.length ? `<div class="card stat"><div class="num">${levelsN}<span class="faint" style="font-size:16px">/${levels.length}</span></div><div class="lbl">AI course levels done</div>${bar(levelsN, levels.length)}</div>` : ''}
        <div class="card stat"><div class="num">${starredList.length}</div><div class="lbl">Starred for review</div></div>
      </div>
      <h2 class="section-title">🎯 Focus areas</h2>
      <p class="muted" style="margin-top:-6px">Topics you flagged as weak — work through these first.</p>
      <div class="chip-list">${focus.map(a => `<a class="chip weak ${readMap[a.section + '/' + a.id] ? 'done' : ''}" href="#/${a.section}/${a.id}">${readMap[a.section + '/' + a.id] ? '✓ ' : ''}${esc(a.title)}</a>`).join('')}</div>
      <h2 class="section-title">Sections</h2>
      <div class="grid grid-3">${tiles.map(([r, t, d]) => `<a class="card tile" href="#/${r}"><span class="tile-icon">${ICON[r] || ICON.course}</span><h3>${t}</h3><p>${d}</p></a>`).join('')}</div>
      ${starredList.length ? `<h2 class="section-title">⭐ Review list</h2><div class="card plist">${starredList.map(problemRow).join('')}</div>` : ''}
      <h2 class="section-title">Suggested weekly plan</h2>
      <div class="card prose" style="font-size:15.5px">
        <ol>
          <li><strong>Daily:</strong> 2–3 problems from the roadmap in order. Try for 25 minutes before revealing the answer. Re-solve starred ones after 3 days.</li>
          <li><strong>3× per week:</strong> one focus-area doc (smart pointers → lambdas → OOP → C++20 → CMake/Make → design patterns → embedded).</li>
          <li><strong>Weekly:</strong> one design topic (LLD example or HLD case study) out loud, timed to 35 minutes.</li>
          <li><strong>Weekly:</strong> one Math or Learn guide (embedded math, number representation, CUDA, AI).</li>
        </ol>
      </div>
      ${footer()}`;
  }

  const hasNote = k => !!(notes[k] && notes[k].text && notes[k].text.trim());
  function problemRow(p) {
    return `<div class="prow">
      <input type="checkbox" class="check" data-solve="${p.key}" ${solved[p.key] ? 'checked' : ''} aria-label="Mark solved">
      <div><a class="ptitle" href="#/problems/${p.pattern}/${p.slug}">${esc(p.title)}</a>${hasNote(p.key) ? ' <span class="note-dot" title="You have notes on this problem">📝</span>' : ''}
        <div class="pmeta">${esc(M.patterns.meta[p.pattern].title)}${p.lc && p.lc !== '-' ? ' · LC ' + esc(p.lc) : ''}</div></div>
      <span class="diff ${p.difficulty}">${p.difficulty}</span>
      <button class="star ${starred[p.key] ? 'on' : ''}" data-star="${p.key}" aria-label="Star for review">★</button>
    </div>`;
  }

  async function viewRoadmap() {
    const P = await loadProblems();
    const total = PATTERN_IDS.reduce((s, id) => s + P[id].problems.length, 0);
    const done = PATTERN_IDS.reduce((s, id) => s + P[id].problems.filter(p => solved[p.key]).length, 0);
    let html = `<div class="page-head"><h1>Problem Roadmap</h1>
      <p>Work top-down. Each node is a pattern; master the earlier ones first — later patterns build on them. Every problem has a hint, a C++ solution and an explanation behind <em>Show Answer</em>.</p></div>
      <div class="card" style="margin-bottom:20px">${bar(done, total)}
        <div class="btn-row" style="margin-top:12px"><button class="btn btn-sm" data-action="random">${ICON.shuffle} Random unsolved</button><a class="btn btn-sm" href="#/problems/all">All problems list</a><a class="btn btn-sm" href="#/notes">📝 My notes</a><a class="btn btn-sm" href="#/mock">⏱ Mock interview</a></div></div>
      <div class="roadmap">`;
    M.patterns.levels.forEach((lvl, li) => {
      if (li) html += '<div class="rm-connector"></div>';
      html += '<div class="rm-level">' + lvl.map(id => {
        const ps = P[id].problems; const d = ps.filter(p => solved[p.key]).length;
        return `<a class="card rm-node ${ps.length && d === ps.length ? 'complete' : ''}" href="#/problems/${id}">
          <span class="rm-title">${esc(M.patterns.meta[id].title)} <span class="rm-count">${d}/${ps.length}</span></span>
          <div class="bar"><span style="width:${ps.length ? d / ps.length * 100 : 0}%"></span></div></a>`;
      }).join('') + '</div>';
    });
    html += '</div>';
    if (EXTRA_IDS.length) {
      html += `<h2 class="section-title" style="margin-top:34px">Standalone paths</h2>
        <p class="muted" style="margin-top:-6px">Separate from the tree — do these any time.</p><div class="grid grid-2">` +
        EXTRA_IDS.map(id => {
          const ps = P[id].problems; const d = ps.filter(p => solved[p.key]).length;
          return `<a class="card rm-node extra ${ps.length && d === ps.length ? 'complete' : ''}" href="#/problems/${id}">
            <span class="rm-title">${esc(M.patterns.meta[id].title)} <span class="rm-count">${d}/${ps.length}</span></span>
            <span class="muted" style="font-size:14px">${esc(M.patterns.meta[id].blurb)}</span>
            <div class="bar"><span style="width:${ps.length ? d / ps.length * 100 : 0}%"></span></div></a>`;
        }).join('') + '</div>';
    }
    html += footer();
    app.innerHTML = html;
  }

  async function viewNotes() {
    const P = await loadProblems();
    const list = PATTERN_IDS.flatMap(id => P[id].problems).filter(p => hasNote(p.key))
      .sort((a, b) => (notes[b.key].updated || 0) - (notes[a.key].updated || 0));
    app.innerHTML = `<div class="crumbs"><a href="#/problems">Roadmap</a> / <span>My notes</span></div>
      <div class="page-head"><h1>My notes</h1><p>Every problem you've written notes on, most recently edited first. Notes are saved in this browser and included in <em>Export progress</em>.</p></div>
      ${list.length ? list.map(p => `<div class="card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
            <a class="ptitle" style="font-weight:650" href="#/problems/${p.pattern}/${p.slug}">${esc(p.title)}</a>
            <span class="faint" style="font-size:13px">${esc(M.patterns.meta[p.pattern].title)} · ${new Date(notes[p.key].updated).toLocaleString()}</span>
          </div>
          <div class="prose" style="margin-top:8px;font-size:15px">${renderMd(notes[p.key].text)}</div></div>`).join('')
        : '<div class="card sr-empty">No notes yet. Open any problem and use the <strong>My notes</strong> box.</div>'}
      ${footer()}`;
  }

  const listState = { q: '', diff: 'All', hide: false };
  async function viewPattern(id) {
    const P = await loadProblems();
    const isAll = id === 'all';
    if (!isAll && !P[id]) return viewNotFound();
    const meta = isAll ? { title: 'All Problems', blurb: 'Every problem across the roadmap.' } : M.patterns.meta[id];
    const probs = isAll ? PATTERN_IDS.flatMap(x => P[x].problems) : P[id].problems;
    const idx = PATTERN_IDS.indexOf(id);
    app.innerHTML = `
      <div class="crumbs"><a href="#/problems">Roadmap</a> / <span>${esc(meta.title)}</span></div>
      <div class="page-head"><h1>${esc(meta.title)}</h1><p>${esc(meta.blurb)}</p></div>
      ${!isAll && P[id].intro ? `<details class="card" style="margin-bottom:16px" open><summary style="cursor:pointer;font-weight:650">Pattern guide — how to recognise it</summary><div class="prose" style="margin-top:10px">${renderMd(P[id].intro)}</div></details>` : ''}
      <div class="toolbar">
        <input type="search" id="pq" placeholder="Filter problems…" value="${esc(listState.q)}">
        <div class="seg" id="pdiff">${['All', 'Easy', 'Medium', 'Hard'].map(d => `<button class="${listState.diff === d ? 'on' : ''}" data-d="${d}">${d}</button>`).join('')}</div>
        <label class="muted" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" class="check" id="phide" ${listState.hide ? 'checked' : ''}> Hide solved</label>
      </div>
      <div class="card" style="margin-bottom:12px" id="pbar"></div>
      <div class="card plist" id="plist"></div>
      ${!isAll ? `<div class="pager">
        ${idx > 0 ? `<a class="card" href="#/problems/${PATTERN_IDS[idx - 1]}"><small>← Previous pattern</small>${esc(M.patterns.meta[PATTERN_IDS[idx - 1]].title)}</a>` : '<span></span>'}
        ${idx < PATTERN_IDS.length - 1 ? `<a class="card next" href="#/problems/${PATTERN_IDS[idx + 1]}"><small>Next pattern →</small>${esc(M.patterns.meta[PATTERN_IDS[idx + 1]].title)}</a>` : ''}
      </div>` : ''}${footer()}`;
    const draw = () => {
      const q = listState.q.toLowerCase();
      const f = probs.filter(p => (listState.diff === 'All' || p.difficulty === listState.diff) && (!listState.hide || !solved[p.key]) && (!q || p.title.toLowerCase().includes(q) || p.lc === q));
      $('#plist').innerHTML = f.length ? f.map(problemRow).join('') : '<div class="sr-empty">No problems match.</div>';
      $('#pbar').innerHTML = bar(probs.filter(p => solved[p.key]).length, probs.length);
    };
    draw();
    $('#pq').addEventListener('input', e => { listState.q = e.target.value; draw(); });
    $('#pdiff').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; listState.diff = b.dataset.d; [...$('#pdiff').children].forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('#phide').addEventListener('change', e => { listState.hide = e.target.checked; draw(); });
    app._redraw = draw;
  }

  async function viewProblem(pid, slug) {
    const P = await loadProblems();
    const pat = P[pid];
    const p = pat && pat.problems.find(x => x.slug === slug);
    if (!p) return viewNotFound();
    const flat = PATTERN_IDS.flatMap(x => P[x].problems);
    const gi = flat.indexOf(p);
    const prev = flat[gi - 1], next = flat[gi + 1];
    app.innerHTML = `
      <div class="crumbs"><a href="#/problems">${EXTRA_IDS.includes(pid) ? 'Problems' : 'Roadmap'}</a> / <a href="#/problems/${pid}">${esc(M.patterns.meta[pid].title)}</a> / <span>${p.idx + 1} of ${pat.problems.length}</span></div>
      <div class="problem-head">
        <h1>${esc(p.title)}</h1>
        <span class="diff ${p.difficulty}">${p.difficulty}</span>
        ${p.lc && p.lc !== '-' ? `<span class="chip">LeetCode ${esc(p.lc)}</span>` : '<span class="chip">Classic</span>'}
        ${p.url ? `<a class="btn btn-sm" href="${p.url}" target="_blank" rel="noopener">Practice on LeetCode ${ICON.ext}</a>` : ''}
      </div>
      <div class="btn-row" style="margin:12px 0 4px">
        <label class="btn btn-sm"><input type="checkbox" class="check" data-solve="${p.key}" ${solved[p.key] ? 'checked' : ''} style="width:18px;height:18px"> Solved</label>
        <button class="btn btn-sm star ${starred[p.key] ? 'on' : ''}" data-star="${p.key}" style="font-size:14px">★ ${starred[p.key] ? 'Starred' : 'Star for review'}</button>
      </div>
      <div class="card panel"><h2>Problem</h2><div class="prose">${renderMd(p.prompt)}</div></div>
      ${p.hint ? `<div class="card panel"><h2>Hint</h2><div id="hintBox"><button class="btn btn-sm" id="hintBtn">💡 Show hint</button></div></div>` : ''}
      <div class="card panel" id="answerPanel">
        <h2>Answer</h2>
        <div class="reveal-box" id="revealBox"><p>Give it a real attempt first — about 20–25 minutes. Then compare.</p><button class="btn btn-primary" id="showAns">Show Answer</button></div>
      </div>
      <div class="card panel notes-panel">
        <h2>My notes</h2>
        <div class="seg note-tabs"><button class="on" data-mode="edit">Write</button><button data-mode="preview">Preview</button></div>
        <textarea id="noteBox" class="note-box" rows="6" placeholder="Your approach, mistakes you made, edge cases, complexity, things to remember… (Markdown supported)">${esc((notes[p.key] && notes[p.key].text) || '')}</textarea>
        <div id="notePreview" class="prose note-preview" hidden></div>
        <div class="note-status faint" id="noteStatus">${notes[p.key] && notes[p.key].updated ? 'Saved · ' + new Date(notes[p.key].updated).toLocaleString() : 'Autosaves as you type'}</div>
      </div>
      <div class="pager">
        ${prev ? `<a class="card" href="#/problems/${prev.pattern}/${prev.slug}"><small>← Previous</small>${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="card next" href="#/problems/${next.pattern}/${next.slug}"><small>Next →</small>${esc(next.title)}</a>` : ''}
      </div>${footer()}`;
    const box = $('#noteBox'), status = $('#noteStatus');
    let noteTimer = null;
    const saveNote = () => {
      const text = box.value;
      if (text.trim()) notes[p.key] = { text, updated: Date.now() }; else delete notes[p.key];
      save();
      status.textContent = text.trim() ? 'Saved ✓ · ' + new Date().toLocaleTimeString() : 'Note cleared';
    };
    box.addEventListener('input', () => { status.textContent = 'Saving…'; clearTimeout(noteTimer); noteTimer = setTimeout(saveNote, 400); });
    box.addEventListener('blur', () => { if (noteTimer) { clearTimeout(noteTimer); noteTimer = null; saveNote(); } });
    $('.note-tabs').addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      $('.note-tabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      const prev = b.dataset.mode === 'preview';
      box.hidden = prev; $('#notePreview').hidden = !prev;
      if (prev) $('#notePreview').innerHTML = box.value.trim() ? renderMd(box.value) : '<p class="faint">Nothing written yet.</p>';
    });
    if (p.hint) $('#hintBtn').addEventListener('click', () => { $('#hintBox').innerHTML = `<div class="prose">${renderMd(p.hint)}</div>`; });
    $('#showAns').addEventListener('click', () => {
      const tabs = (p.approaches || []).map(a => ({ name: a.name, html: renderMd(a.body) }));
      if (p.optimal) tabs.push({ name: 'Optimal: ' + p.optimal.name, html: renderMd(p.optimal.body), optimal: true });
      else tabs.push({ name: 'Optimal' + (tabs.length ? '' : ' solution'), html: renderMd(p.solution) + (p.c ? '<h3>C version</h3>' + renderMd(p.c) : '') + '<h3>Explanation</h3>' + renderMd(p.explanation), optimal: true });
      const last = tabs.length - 1;
      $('#answerPanel').innerHTML = `<h2>${tabs.length > 1 ? 'Approaches (' + tabs.length + ')' : 'Solution'}</h2>
        ${tabs.length > 1 ? `<div class="seg approach-tabs" role="tablist">${tabs.map((t, i) => `<button role="tab" class="${i === last ? 'on' : ''}" data-tab="${i}">${i + 1}. ${esc(t.name)}${t.optimal ? ' ★' : ''}</button>`).join('')}</div>` : ''}
        ${tabs.map((t, i) => `<div class="prose approach-pane" data-pane="${i}" ${i === last ? '' : 'hidden'}>${t.html}</div>`).join('')}
        <p class="faint tab-hint">Each tab has its own code and explanation — compare them. ★ = the optimal solution.</p>
        ${p.walkthrough ? `<h2 style="margin-top:22px">Step-by-step walkthrough (optimal solution)</h2><div class="prose">${renderMd(p.walkthrough)}</div>` : ''}
        ${p.complexity ? `<h2 style="margin-top:22px">Complexity analysis (optimal)</h2><div class="prose">${renderMd(p.complexity)}</div>` : ''}
        <div class="btn-row" style="margin-top:14px"><button class="btn btn-sm" id="hideAns">Hide answer</button></div>`;
      const tabBar = $('#answerPanel .approach-tabs');
      if (tabBar) tabBar.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        tabBar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        $('#answerPanel').querySelectorAll('.approach-pane').forEach(pn => { pn.hidden = pn.dataset.pane !== b.dataset.tab; });
      });
      $('#hideAns').addEventListener('click', () => viewProblem(pid, slug));
    });
  }

  function viewSection(sec) {
    const S = M.sections[sec];
    app.innerHTML = `<div class="page-head"><h1>${esc(S.title)}</h1><p>${esc(S.blurb)}</p></div>
      ${S.groups.map(g => {
        const done = g.items.filter(it => readMap[sec + '/' + it.id]).length;
        return `<section class="group-block"><h2>${esc(g.name)} <span class="faint" style="font-weight:500;font-size:14px">· ${done}/${g.items.length}</span></h2>
        <div class="grid grid-2">${g.items.map(it => `<a class="card article-card" href="#/${sec}/${it.id}">
          <h3><span>${readMap[sec + '/' + it.id] ? '✓ ' : ''}${esc(it.title)}</span>${it.focus ? '<span class="tag">Focus</span>' : ''}</h3>
          <p>${esc(it.desc)}</p></a>`).join('')}</div></section>`;
      }).join('')}${footer()}`;
  }

  function sidebarHtml(sec, cur) {
    const S = M.sections[sec];
    return S.groups.map(g => `<h4>${esc(g.name)}</h4>` + g.items.map(it =>
      `<a href="#/${sec}/${it.id}" class="${it.id === cur ? 'active' : ''}"><span class="dot ${readMap[sec + '/' + it.id] ? 'read' : ''}"></span>${esc(it.title)}</a>`).join('')).join('');
  }

  async function viewArticle(sec, id) {
    const S = M.sections[sec];
    const items = S.groups.flatMap(g => g.items);
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return viewNotFound();
    const it = items[i];
    app.innerHTML = `<div class="loading">Loading ${esc(it.title)}…</div>`;
    let text;
    try { text = await fetchText(`content/${sec}/${id}.md`); }
    catch (e) { text = `# ${it.title}\n\n> **Warning:** Could not load this article (${e.message}). If you opened index.html directly from disk, serve the folder over HTTP instead (e.g. \`python3 -m http.server\`).`; }
    if (location.hash.split('/')[2] !== id) return; // navigated away while loading
    const toc = [];
    const body = renderMd(text, toc);
    const key = sec + '/' + id;
    const prev = items[i - 1], next = items[i + 1];
    app.innerHTML = `<div class="article-layout">
      <aside class="sidebar">${sidebarHtml(sec, id)}</aside>
      <div>
        <div class="crumbs"><a href="#/${sec}">${esc(S.title)}</a> / <span>${esc(it.title)}</span></div>
        <details class="card mobile-toc"><summary>📚 ${esc(S.title)} — all topics</summary><div class="sidebar">${sidebarHtml(sec, id)}</div></details>
        ${toc.filter(t => t.lvl === 2).length > 2 ? `<details class="card" style="margin-bottom:18px;padding:12px 16px"><summary style="cursor:pointer;font-weight:600">On this page</summary><div class="prose" style="font-size:14.5px;margin-top:8px"><ul>${toc.filter(t => t.lvl === 2).map(t => `<li><a href="#/${sec}/${id}" data-anchor="${t.id}">${MD.inline(t.text)}</a></li>`).join('')}</ul></div></details>` : ''}
        <article class="prose">${body}</article>
        <label class="card read-toggle"><input type="checkbox" class="check" data-read="${key}" ${readMap[key] ? 'checked' : ''}> <span><strong>Mark as completed</strong><br><span class="muted" style="font-size:14px">Tracks your progress through ${esc(S.title)}.</span></span></label>
        <div class="pager">
          ${prev ? `<a class="card" href="#/${sec}/${prev.id}"><small>← Previous</small>${esc(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a class="card next" href="#/${sec}/${next.id}"><small>Next →</small>${esc(next.title)}</a>` : ''}
        </div>
        ${footer()}
      </div></div>`;
  }

  /* ---------------- Mock interview ---------------- */
  // State persisted in localStorage so a refresh or navigating away doesn't lose the interview.
  let mock = store.get('mock', null);                 // the active (or just-finished) interview
  const mockHistory = store.get('mockHistory', []);   // finished interviews, newest first
  const saveMock = () => { store.set('mock', mock); store.set('mockHistory', mockHistory); };
  const MOCK_DEFAULTS = { minutes: 45, problems: 2, source: 'roadmap', diff: 'any', unsolved: true, concepts: 3, sections: ['docs', 'design', 'math', 'learn'], focusOnly: false };
  const mockPrefs = Object.assign({}, MOCK_DEFAULTS, store.get('mockPrefs', {}));

  // Pull interview Q&A pairs out of every guide (Interview Q&A lists, numbered Q&A, Practice problems).
  let qaPromise = null;
  function extractQA(md) {
    const out = [];
    let heading = '';
    md.split('\n').forEach(line => {
      const h = line.match(/^#{2,3}\s+(.*)/);
      if (h) { heading = h[1]; return; }
      let m = line.match(/^- \*\*(.+?)\*\*:?\s+(.+)$/);
      if (m && (/\?\s*$/.test(m[1]) || /Q&A|Interview/i.test(heading))) { out.push({ q: m[1].trim(), a: m[2].trim() }); return; }
      m = line.match(/^\*\*\d+\.\s+(.+?)\*\*\s+(.+)$/);
      if (m) { out.push({ q: m[1].trim(), a: m[2].trim() }); return; }
      m = line.match(/^\d+\.\s+(.+?\?)\s+(?:→\s*)?(.*\*\*.+\*\*.*)$/);
      if (m && /Practice/i.test(heading)) out.push({ q: m[1].trim(), a: m[2].trim() });
    });
    return out;
  }
  function loadQA() {
    if (!qaPromise) {
      qaPromise = Promise.all(allArticles().map(a =>
        fetchText(`content/${a.section}/${a.id}.md`)
          .then(t => extractQA(t).map((qa, i) => ({ ...qa, id: `${a.section}/${a.id}#${i}`, section: a.section, article: a.id, title: a.title, focus: !!a.focus })))
          .catch(() => [])
      )).then(lists => lists.flat());
    }
    return qaPromise;
  }

  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; --i) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmtTime = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const mockRemaining = () => mock ? mock.started + mock.minutes * 60000 - Date.now() : 0;
  const mockActive = () => !!(mock && !mock.ended);

  function pickProblems(P, prefs) {
    const ids = prefs.source === 'classics' ? ['classics'] : prefs.source === 'embedded' ? ['c-embedded']
      : prefs.source === 'all' ? PATTERN_IDS : TREE_IDS.filter(id => id !== 'c-embedded');
    const okDiff = { any: () => true, easymed: d => d !== 'Hard', medhard: d => d !== 'Easy', hard: d => d === 'Hard' }[prefs.diff] || (() => true);
    let pool = ids.flatMap(id => P[id].problems).filter(p => okDiff(p.difficulty));
    if (prefs.unsolved) { const un = pool.filter(p => !solved[p.key]); if (un.length >= prefs.problems) pool = un; }
    const picked = [];
    for (const p of shuffle(pool)) {                       // prefer different patterns
      if (picked.length >= prefs.problems) break;
      if (!picked.some(x => x.pattern === p.pattern) || pool.length < 2 * prefs.problems) picked.push(p);
    }
    for (const p of shuffle(pool)) { if (picked.length >= prefs.problems) break; if (!picked.includes(p)) picked.push(p); }
    return picked;
  }

  async function startMock(prefs) {
    const P = await loadProblems();
    const probs = pickProblems(P, prefs);
    let qs = [];
    if (prefs.concepts > 0) {
      let all = (await loadQA()).filter(q => prefs.sections.includes(q.section));
      if (prefs.focusOnly) { const f = all.filter(q => q.focus); if (f.length >= prefs.concepts) all = f; }
      qs = shuffle(all).slice(0, prefs.concepts);
    }
    if (!probs.length && !qs.length) { toast('No questions match those settings'); return; }
    mock = {
      id: Date.now(), started: Date.now(), minutes: prefs.minutes, ended: null, current: 0,
      items: [
        ...probs.map(p => ({ type: 'problem', key: p.key, pattern: p.pattern, slug: p.slug, title: p.title, difficulty: p.difficulty })),
        ...qs.map(q => ({ type: 'concept', qid: q.id, q: q.q, a: q.a, section: q.section, article: q.article, title: q.title })),
      ].map(it => ({ ...it, answer: '', grade: null, hint: false, revealed: false, peeked: false })),
    };
    saveMock();
    location.hash = '#/mock';
    if (location.hash === '#/mock') await route();   // same hash: no hashchange event fires
    window.scrollTo(0, 0);
  }

  function finishMock(reason) {
    if (!mock || mock.ended) return;
    mock.ended = Date.now();
    mock.endReason = reason;
    const used = Math.min(mock.ended - mock.started, mock.minutes * 60000);
    const pts = { solved: 2, partial: 1, missed: 0, got: 2 };
    const max = mock.items.length * 2;
    const score = mock.items.reduce((s, it) => s + (pts[it.grade] || 0), 0);
    if (mock.markSolved !== false)
      mock.items.forEach(it => { if (it.type === 'problem' && it.grade === 'solved' && !solved[it.key]) solved[it.key] = Date.now(); });
    mockHistory.unshift({
      id: mock.id, date: mock.started, minutes: mock.minutes, used, score, max,
      items: mock.items.map(it => ({ type: it.type, title: it.type === 'problem' ? it.title : it.q, grade: it.grade, hint: it.hint, peeked: it.peeked })),
    });
    mockHistory.splice(50);
    save(); saveMock();
  }

  function mockSetupHtml() {
    const pr = mockPrefs;
    const sel = (name, opts) => `<select data-pref="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(pr[name]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const hist = mockHistory.length ? `<h2 class="section-title">Past interviews</h2>
      <div class="card table-card"><div class="table-wrap" style="border:0;margin:0"><table class="mock-table"><thead><tr><th>Date</th><th>Time used</th><th>Score</th><th>Questions</th></tr></thead><tbody>
      ${mockHistory.map(h => `<tr><td>${new Date(h.date).toLocaleString()}</td><td>${fmtTime(h.used)} / ${h.minutes}:00</td>
        <td><strong>${Math.round(h.score / h.max * 100)}%</strong></td>
        <td>${h.items.map(it => `<span class="grade-chip ${it.grade || 'none'}" title="${esc(it.title)}">${it.type === 'problem' ? 'Code' : 'Q'}</span>`).join(' ')}</td></tr>`).join('')}
      </tbody></table></div></div>` : '';
    return `<div class="page-head"><h1>Mock Interview</h1>
      <p>A timed, interview-style session: coding problems picked at random plus knowledge questions drawn from the Docs, Design, Math and Learn guides. Talk through your approach, write your answer, then grade yourself honestly.</p></div>
      <div class="card mock-setup">
        <div class="form-grid">
          <label>Duration ${sel('minutes', [[30, '30 minutes'], [45, '45 minutes'], [60, '60 minutes']])}</label>
          <label>Coding problems ${sel('problems', [[1, '1 problem'], [2, '2 problems'], [3, '3 problems']])}</label>
          <label>Problem source ${sel('source', [['roadmap', 'Roadmap patterns'], ['classics', 'Classics'], ['embedded', 'C & Embedded'], ['all', 'Everything']])}</label>
          <label>Difficulty ${sel('diff', [['any', 'Any'], ['easymed', 'Easy & Medium'], ['medhard', 'Medium & Hard'], ['hard', 'Hard only']])}</label>
          <label>Knowledge questions ${sel('concepts', [[0, 'None'], [2, '2 questions'], [3, '3 questions'], [4, '4 questions'], [6, '6 questions']])}</label>
        </div>
        <div class="mock-checks">
          <span class="muted">Knowledge questions from:</span>
          ${[['docs', 'C / C++ Docs'], ['design', 'Design'], ['math', 'Math'], ['learn', 'Learn'], ['courses', 'Courses (AI)']].filter(([v]) => M.sections[v]).map(([v, l]) => `<label><input type="checkbox" class="check" data-sec="${v}" ${pr.sections.includes(v) ? 'checked' : ''}> ${l}</label>`).join('')}
        </div>
        <div class="mock-checks">
          <label><input type="checkbox" class="check" data-pref-bool="focusOnly" ${pr.focusOnly ? 'checked' : ''}> Only my focus topics</label>
          <label><input type="checkbox" class="check" data-pref-bool="unsolved" ${pr.unsolved ? 'checked' : ''}> Prefer problems I haven't solved</label>
        </div>
        <div class="btn-row" style="margin-top:16px"><button class="btn btn-primary" id="mockStart">▶ Start interview</button></div>
        <p class="faint" style="font-size:13px;margin:12px 0 0">Tips: aim for ~20 minutes per coding problem and ~3 minutes per knowledge question. Hints and peeking at answers are allowed but recorded in your results.</p>
      </div>${hist}`;
  }

  function mockItemHtml(it, i) {
    const ended = !!mock.ended;
    const head = it.type === 'problem'
      ? `<div class="mock-q-head"><span class="chip">Coding ${i + 1}</span><span class="diff ${it.difficulty}">${it.difficulty}</span>${it.revealed || ended ? `<span class="chip">${esc(M.patterns.meta[it.pattern].title)}</span>` : ''}</div><h2 class="mock-title">${esc(it.title)}</h2>`
      : `<div class="mock-q-head"><span class="chip">Knowledge ${i + 1}</span><span class="chip">${esc(M.sections[it.section].title)}</span></div><h2 class="mock-title">${MD.inline(it.q)}</h2>`;
    const grades = it.type === 'problem' ? [['solved', 'Solved'], ['partial', 'Partially'], ['missed', "Didn't solve"]] : [['got', 'Got it'], ['partial', 'Partially'], ['missed', 'Missed it']];
    return `<div class="card mock-item">${head}
      ${it.type === 'problem' ? `<div class="prose" data-prompt>${'<p class="faint">Loading…</p>'}</div>
        <div class="btn-row" style="margin:6px 0 12px">${it.hint ? '' : '<button class="btn btn-sm" data-mock="hint">💡 Hint</button>'}</div><div class="prose" data-hint></div>` : ''}
      <label class="mock-label">${it.type === 'problem' ? 'Your approach & code' : 'Your answer'}</label>
      <textarea class="note-box mock-answer" data-mock-answer rows="${it.type === 'problem' ? 12 : 5}" placeholder="${it.type === 'problem' ? 'Clarify, plan, then code. State the time and space complexity.' : 'Answer as you would out loud in the interview…'}">${esc(it.answer)}</textarea>
      <div class="btn-row" style="margin-top:12px">${it.revealed ? '' : `<button class="btn btn-sm" data-mock="reveal">${ended ? 'Show answer' : '👀 Reveal answer'}</button>`}</div>
      <div data-reveal></div>
      <div class="grade-row"><span class="muted">How did it go?</span>
        ${grades.map(([g, l]) => `<button class="btn btn-sm grade-btn ${it.grade === g ? 'on ' + g : ''}" data-grade="${g}" ${ended ? 'disabled' : ''}>${l}</button>`).join('')}</div>
    </div>`;
  }

  async function fillMockItem(it) {
    const box = app.querySelector('.mock-item');
    if (!box) return;
    if (it.type === 'problem') {
      const P = await loadProblems();
      const p = P[it.pattern] && P[it.pattern].problems.find(x => x.slug === it.slug);
      if (!p) return;
      box.querySelector('[data-prompt]').innerHTML = renderMd(p.prompt);
      if (it.hint && p.hint) box.querySelector('[data-hint]').innerHTML = `<blockquote class="tip">${renderMd(p.hint)}</blockquote>`;
      if (it.revealed || mock.ended) {
        if (it.revealed) box.querySelector('[data-reveal]').innerHTML = `<div class="mock-answer-box"><h3>Optimal solution</h3><div class="prose">${renderMd(p.solution)}${renderMd(p.explanation)}</div>
          <a class="btn btn-sm" href="#/problems/${p.pattern}/${p.slug}" target="_blank" rel="noopener">Open full problem (all approaches, walkthrough, complexity) ↗</a></div>`;
      }
    } else if (it.revealed) {
      box.querySelector('[data-reveal]').innerHTML = `<div class="mock-answer-box"><h3>Model answer</h3><div class="prose">${renderMd(it.a)}</div>
        <a class="btn btn-sm" href="#/${it.section}/${it.article}" target="_blank" rel="noopener">Read the guide: ${esc(it.title)} ↗</a></div>`;
    }
  }

  function viewMockResults() {
    const h = mockHistory.find(x => x.id === mock.id);
    const pct = h ? Math.round(h.score / h.max * 100) : 0;
    const coding = mock.items.filter(i => i.type === 'problem'), concept = mock.items.filter(i => i.type === 'concept');
    const label = { solved: 'Solved', got: 'Got it', partial: 'Partial', missed: 'Missed', null: 'Not graded' };
    const verdict = pct >= 80 ? 'Strong hire territory — keep the streak going.' : pct >= 55 ? 'Solid, with gaps to review below.' : 'Good practice run — review the answers and retry these topics.';
    return `<div class="page-head"><h1>Interview results</h1><p>${esc(verdict)}</p></div>
      <div class="stats">
        <div class="card stat"><div class="num">${pct}%</div><div class="lbl">Score (${h ? h.score : 0}/${h ? h.max : 0} pts)</div></div>
        <div class="card stat"><div class="num">${fmtTime(h ? h.used : 0)}</div><div class="lbl">Time used of ${mock.minutes}:00${mock.endReason === 'time' ? ' — time ran out' : ''}</div></div>
        <div class="card stat"><div class="num">${coding.filter(i => i.grade === 'solved').length}/${coding.length}</div><div class="lbl">Coding problems solved</div></div>
        <div class="card stat"><div class="num">${concept.filter(i => i.grade === 'got').length}/${concept.length}</div><div class="lbl">Knowledge questions correct</div></div>
      </div>
      <div class="card plist">${mock.items.map((it, i) => `<div class="prow mock-row">
        <span class="grade-chip ${it.grade || 'none'}">${it.type === 'problem' ? 'Code' : 'Q'}</span>
        <div><a class="ptitle" href="#/mock" data-mock-goto="${i}">${it.type === 'problem' ? esc(it.title) : MD.inline(it.q)}</a>
          <div class="pmeta">${it.type === 'problem' ? esc(M.patterns.meta[it.pattern].title) + ' · ' + it.difficulty : esc(it.title)}${it.hint ? ' · used hint' : ''}${it.peeked ? ' · peeked at answer' : ''}</div></div>
        <span class="faint" style="font-size:13px">${label[it.grade]}</span></div>`).join('')}</div>
      <p class="muted" style="font-size:14px">Scoring: Solved / Got it = 2 pts, Partial = 1, Missed or ungraded = 0. Problems you graded "Solved" were marked solved on the roadmap.</p>
      <div class="btn-row"><button class="btn btn-primary" data-mock="review">Review all answers</button><button class="btn" data-mock="new">New interview</button></div>
      ${footer()}`;
  }

  async function viewMock() {
    if (mockActive() && mockRemaining() <= 0) { finishMock('time'); mock.view = 'results'; saveMock(); }
    if (mock && mock.ended && !mock.view) { mock.view = 'results'; saveMock(); }
    if (!mock || mock.view === 'setup') {
      app.innerHTML = mockSetupHtml() + footer();
      app.querySelectorAll('[data-pref]').forEach(s => s.addEventListener('change', () => {
        const v = s.value; mockPrefs[s.dataset.pref] = /^\d+$/.test(v) ? +v : v; store.set('mockPrefs', mockPrefs);
      }));
      app.querySelectorAll('[data-pref-bool]').forEach(c => c.addEventListener('change', () => { mockPrefs[c.dataset.prefBool] = c.checked; store.set('mockPrefs', mockPrefs); }));
      app.querySelectorAll('[data-sec]').forEach(c => c.addEventListener('change', () => {
        mockPrefs.sections = [...app.querySelectorAll('[data-sec]')].filter(x => x.checked).map(x => x.dataset.sec);
        store.set('mockPrefs', mockPrefs);
      }));
      $('#mockStart').addEventListener('click', async () => {
        if (mockPrefs.concepts > 0 && !mockPrefs.sections.length) return toast('Pick at least one section for knowledge questions');
        $('#mockStart').disabled = true; $('#mockStart').textContent = 'Preparing…';
        await startMock(mockPrefs);
      });
      return;
    }
    if (mock.ended && mock.view !== 'review') { app.innerHTML = viewMockResults(); return; }

    // Live interview (or review after it ended)
    const it = mock.items[mock.current];
    const ended = !!mock.ended;
    app.innerHTML = `<div class="mock-bar card ${ended ? 'ended' : ''}" id="mockBar">
        <div class="mock-clock"><span id="mockClock">${ended ? 'Review' : fmtTime(mockRemaining())}</span><small>${ended ? 'interview finished' : 'remaining'}</small></div>
        <div class="bar mock-progress"><span id="mockProgress" style="width:${ended ? 100 : Math.min(100, (1 - mockRemaining() / (mock.minutes * 60000)) * 100)}%"></span></div>
        ${ended ? '<button class="btn btn-sm" data-mock="results">Results</button><button class="btn btn-sm" data-mock="new">New interview</button>' : '<button class="btn btn-sm" data-mock="end">Finish<span class="hide-sm"> interview</span></button>'}
      </div>
      <div class="mock-tabs">${mock.items.map((x, i) => `<button class="mock-tab ${i === mock.current ? 'on' : ''} ${x.grade ? 'graded ' + x.grade : ''}" data-mock-goto="${i}">${x.type === 'problem' ? 'Code' : 'Q'} ${i + 1}</button>`).join('')}</div>
      ${mockItemHtml(it, mock.current)}
      <div class="pager">
        ${mock.current > 0 ? `<button class="card" data-mock-goto="${mock.current - 1}"><small>← Previous</small>Question ${mock.current}</button>` : '<span></span>'}
        ${mock.current < mock.items.length - 1 ? `<button class="card next" data-mock-goto="${mock.current + 1}"><small>Next →</small>Question ${mock.current + 2}</button>`
          : ended ? '' : '<button class="card next" data-mock="end"><small>Done?</small>Finish interview</button>'}
      </div>`;
    fillMockItem(it);
    const ta = app.querySelector('[data-mock-answer]');
    let t = null;
    ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { it.answer = ta.value; saveMock(); }, 300); });
    ta.addEventListener('blur', () => { clearTimeout(t); it.answer = ta.value; saveMock(); });
  }

  // Clicks inside the mock page
  document.addEventListener('click', async e => {
    if (!mock || !location.hash.startsWith('#/mock')) return;
    const goto = e.target.closest('[data-mock-goto]');
    const act = e.target.closest('[data-mock]');
    const grade = e.target.closest('[data-grade]');
    const ta = app.querySelector('[data-mock-answer]');
    if (ta && mock.items[mock.current]) mock.items[mock.current].answer = ta.value;   // keep typed text
    if (goto) {
      e.preventDefault();
      mock.current = +goto.dataset.mockGoto;
      if (mock.ended) mock.view = 'review';
      saveMock(); await viewMock(); window.scrollTo(0, 0);
    } else if (grade && !mock.ended) {
      const it = mock.items[mock.current];
      it.grade = it.grade === grade.dataset.grade ? null : grade.dataset.grade;
      saveMock(); await viewMock();
    } else if (act) {
      e.preventDefault();
      const a = act.dataset.mock, it = mock.items[mock.current];
      if (a === 'hint') { it.hint = true; saveMock(); await viewMock(); }
      else if (a === 'reveal') {
        if (!mock.ended && !confirm('Reveal the answer now? It will be recorded as "peeked" in your results.')) return;
        it.revealed = true; if (!mock.ended) it.peeked = true;
        saveMock(); await viewMock();
      } else if (a === 'end') {
        const ungraded = mock.items.filter(x => !x.grade).length;
        if (!confirm(ungraded ? `Finish now? ${ungraded} question(s) are not graded yet (they'll count as 0).` : 'Finish the interview and see your results?')) return;
        finishMock('manual'); mock.view = 'results'; saveMock(); await viewMock(); window.scrollTo(0, 0);
      } else if (a === 'results') { mock.view = 'results'; saveMock(); await viewMock(); }
      else if (a === 'review') { mock.view = 'review'; mock.current = 0; mock.items.forEach(x => { x.revealed = true; }); saveMock(); await viewMock(); window.scrollTo(0, 0); }
      else if (a === 'new') { mock.view = 'setup'; saveMock(); await viewMock(); window.scrollTo(0, 0); }
    }
  });

  // One clock for everything: updates the timer, the floating pill on other pages, and ends the interview at 0:00.
  function mockTick() {
    const pill = $('#mockPill');
    if (!mockActive()) { if (pill) pill.hidden = true; return; }
    const left = mockRemaining();
    if (left <= 0) {
      finishMock('time');
      mock.view = 'results'; saveMock();
      if (location.hash.startsWith('#/mock')) viewMock(); else toast('⏰ Mock interview time is up — see your results');
      if (pill) pill.hidden = true;
      return;
    }
    const cls = left < 60000 ? 'crit' : left < 5 * 60000 ? 'warn' : '';
    const clock = $('#mockClock');
    if (clock) {
      clock.textContent = fmtTime(left);
      $('#mockBar').className = 'mock-bar card ' + cls;
      $('#mockProgress').style.width = Math.min(100, (1 - left / (mock.minutes * 60000)) * 100) + '%';
    }
    if (pill) {
      pill.hidden = location.hash.startsWith('#/mock');
      pill.className = 'mock-pill ' + cls;
      pill.innerHTML = `⏱ Mock interview · <strong>${fmtTime(left)}</strong> left`;
    }
  }
  setInterval(mockTick, 1000);

  function viewNotFound() {
    app.innerHTML = `<div class="page-head"><h1>Not found</h1><p>That page doesn't exist. <a href="#/">Go home</a>.</p></div>`;
  }

  /* ---------------- Router ---------------- */
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
    const top = parts[0] || '';
    markNav(top);
    app._redraw = null;
    try {
      if (!top) await viewHome();
      else if (top === 'problems') {
        if (!parts[1]) await viewRoadmap();
        else if (parts[1] === 'notes') await viewNotes();
        else if (!parts[2]) await viewPattern(parts[1]);
        else await viewProblem(parts[1], parts[2]);
      } else if (top === 'notes') { markNav('problems'); await viewNotes();
      } else if (top === 'mock') { await viewMock();
      } else if (M.sections[top]) {
        if (!parts[1]) viewSection(top); else await viewArticle(top, parts[1]);
      } else viewNotFound();
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="page-head"><h1>Something went wrong</h1><p>${esc(e.message)}</p></div>`;
    }
    const titleEl = app.querySelector('h1');
    document.title = (titleEl && top ? titleEl.textContent + ' · ' : '') + 'PrepForge';
    mockTick();                                   // refresh the timer pill immediately on every page change
  }
  window.addEventListener('hashchange', () => { route().then(() => window.scrollTo(0, 0)); });

  /* ---------------- Global interactions ---------------- */
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.solve) {
      if (t.checked) solved[t.dataset.solve] = Date.now(); else delete solved[t.dataset.solve];
      save(); document.querySelectorAll(`[data-solve="${t.dataset.solve}"]`).forEach(x => { x.checked = t.checked; });
      if (app._redraw) app._redraw();
      if (t.checked) toast('Nice! Marked solved ✓');
    } else if (t.dataset.read) {
      if (t.checked) readMap[t.dataset.read] = Date.now(); else delete readMap[t.dataset.read];
      save();
      document.querySelectorAll('.sidebar a.active .dot').forEach(d => d.classList.toggle('read', t.checked));
      if (t.checked) toast('Marked as completed ✓');
    }
  });

  document.addEventListener('click', async e => {
    const star = e.target.closest('[data-star]');
    if (star) {
      const k = star.dataset.star;
      if (starred[k]) delete starred[k]; else starred[k] = 1;
      save();
      document.querySelectorAll(`[data-star="${k}"]`).forEach(b => {
        b.classList.toggle('on', !!starred[k]);
        if (b.classList.contains('btn')) b.textContent = '★ ' + (starred[k] ? 'Starred' : 'Star for review');
      });
      return;
    }
    const copy = e.target.closest('.copy-btn');
    if (copy) {
      const code = copy.closest('.codeblock').querySelector('code').innerText;
      try { await navigator.clipboard.writeText(code); copy.textContent = 'Copied!'; }
      catch (err) { copy.textContent = 'Select & copy'; }
      setTimeout(() => { copy.textContent = 'Copy'; }, 1400);
      return;
    }
    const anchor = e.target.closest('[data-anchor]');
    if (anchor) { e.preventDefault(); const el = document.getElementById(anchor.dataset.anchor); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
    const act = e.target.closest('[data-action]');
    if (act) {
      e.preventDefault();
      const a = act.dataset.action;
      if (a === 'random') {
        const P = await loadProblems();
        const pool = PATTERN_IDS.flatMap(id => P[id].problems).filter(p => !solved[p.key]);
        if (!pool.length) return toast('Everything is solved 🎉');
        const p = pool[Math.floor(Math.random() * pool.length)];
        location.hash = `#/problems/${p.pattern}/${p.slug}`;
      } else if (a === 'export') {
        const blob = new Blob([JSON.stringify({ solved, starred, read: readMap, notes, mockHistory }, null, 1)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const l = document.createElement('a'); l.href = url; l.download = 'prepforge-progress.json'; l.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (a === 'import') {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
        inp.onchange = async () => {
          try {
            const d = JSON.parse(await inp.files[0].text());
            Object.assign(solved, d.solved || {}); Object.assign(starred, d.starred || {}); Object.assign(readMap, d.read || {}); Object.assign(notes, d.notes || {});
            if (Array.isArray(d.mockHistory)) { const ids = new Set(mockHistory.map(h => h.id)); d.mockHistory.forEach(h => { if (!ids.has(h.id)) mockHistory.push(h); }); mockHistory.sort((a, b) => b.date - a.date); saveMock(); }
            save(); toast('Progress imported'); route();
          } catch (err) { toast('Invalid file'); }
        };
        inp.click();
      }
    }
  });

  /* ---------------- Search ---------------- */
  const ov = $('#searchOverlay'), si = $('#searchInput'), sr = $('#searchResults');
  let sel = 0, results = [];
  async function openSearch() {
    ov.hidden = false; si.value = ''; si.focus(); sr.innerHTML = '<div class="sr-empty">Type to search problems, patterns and guides.</div>';
    await loadProblems();
  }
  function closeSearch() { ov.hidden = true; }
  async function doSearch() {
    const q = si.value.trim().toLowerCase();
    if (!q) { sr.innerHTML = '<div class="sr-empty">Type to search problems, patterns and guides.</div>'; return; }
    const P = await loadProblems();
    const items = [];
    PATTERN_IDS.forEach(id => {
      items.push({ t: M.patterns.meta[id].title, s: 'Pattern', h: '#/problems/' + id, x: M.patterns.meta[id].blurb });
      P[id].problems.forEach(p => items.push({ t: p.title, s: p.difficulty + (p.lc && p.lc !== '-' ? ' · LC ' + p.lc : ''), h: `#/problems/${id}/${p.slug}`, x: p.lc }));
    });
    allArticles().forEach(a => items.push({ t: a.title, s: M.sections[a.section].title, h: `#/${a.section}/${a.id}`, x: a.desc }));
    const terms = q.split(/\s+/);
    results = items.map(it => {
      const T = it.t.toLowerCase(), X = (it.x || '').toLowerCase();
      if (!terms.every(w => T.includes(w) || X.includes(w))) return null;
      return { it, score: (T.startsWith(q) ? 3 : 0) + (T.includes(q) ? 2 : 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 40).map(r => r.it);
    sel = 0;
    sr.innerHTML = results.length ? results.map((r, i) => `<a class="sr-item ${i === 0 ? 'sel' : ''}" href="${r.h}"><span>${esc(r.t)}</span><small>${esc(r.s)}</small></a>`).join('') : '<div class="sr-empty">No results.</div>';
  }
  $('#searchBtn').addEventListener('click', openSearch);
  $('#searchClose').addEventListener('click', closeSearch);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.sr-item')) closeSearch(); });
  si.addEventListener('input', doSearch);
  si.addEventListener('keydown', e => {
    const els = sr.querySelectorAll('.sr-item');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!els.length) return;
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length;
      els.forEach((el, i) => el.classList.toggle('sel', i === sel)); els[sel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && els[sel]) { location.hash = els[sel].getAttribute('href'); closeSearch(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !ov.hidden) closeSearch();
    else if (e.key === '/' && ov.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  buildNav();
  route();
})();
