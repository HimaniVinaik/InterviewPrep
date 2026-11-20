/* PrepForge PDF book renderer (print.html).
 * Renders every problem, solution and article into one long, print-styled document.
 * tools/build-pdf.js loads print.html?part=<all|problems|docs|...>, waits for PFPrint.ready,
 * then prints it to PDF twice: pass 1 finds the page of every table-of-contents entry,
 * pass 2 fills those page numbers in (applyPageNumbers).
 */
(function (global) {
  'use strict';
  const M = global.MANIFEST;
  const MD = global.MD;
  const C = global.PFContent;
  const esc = MD.esc;

  // Book order = the site's navigation order.
  const PARTS = [
    { id: 'problems', title: 'Problems', blurb: 'A pattern-first roadmap of interview problems, each with a hint, several approaches with C++ code, a walkthrough and a complexity analysis.' },
    ...['docs', 'design', 'math', 'learn', 'courses'].filter(id => M.sections[id]).map(id => ({ id, title: M.sections[id].title, blurb: M.sections[id].blurb })),
  ];

  const state = { ready: false, errors: [], targets: [], warnings: [] };
  let markCount = 0;

  function partList(which) {
    if (!which || which === 'all') return PARTS;
    const p = PARTS.filter(x => x.id === which);
    if (!p.length) throw new Error('Unknown part "' + which + '"');
    return p;
  }

  // A table-of-contents target: an invisible marker (found in pass 1 via the PDF's text) + an anchor id.
  function target(id, title, level) {
    const n = ++markCount;
    state.targets.push({ n, id, title, level });
    return '<span class="pdf-mark" data-mark="' + n + '">@@PFMARK' + n + '@@</span>';
  }

  // Shift markdown headings so the book outline nests correctly (h1 part > h2 chapter > h3 ...).
  function shiftHeadings(root, by, prefix) {
    root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      const lvl = Math.min(6, +h.tagName[1] + by);
      const n = document.createElement('h' + lvl);
      for (const a of h.attributes) n.setAttribute(a.name, a.value);
      if (h.id) n.id = prefix + '--' + h.id;          // heading ids repeat across articles
      n.innerHTML = h.innerHTML;
      h.replaceWith(n);
    });
  }

  function md(text, by, prefix) {
    const box = document.createElement('div');
    box.innerHTML = MD.render(text || '');
    shiftHeadings(box, by, prefix);
    return box.innerHTML;
  }

  const probAnchor = p => 'prob-' + p.pattern + '-' + p.slug;
  const artAnchor = (sec, id) => 'art-' + sec + '-' + id;

  function renderProblem(p, num) {
    const pre = probAnchor(p);
    const tabs = C.answerTabs(p);
    let h = '<section class="problem" id="' + pre + '">';
    h += '<h3 class="problem-title">' + target(pre, num + '. ' + p.title, 2) + '<span class="pnum">' + num + '.</span> ' + esc(p.title) + '</h3>';
    h += '<div class="problem-meta"><span class="diff ' + esc(p.difficulty) + '">' + esc(p.difficulty) + '</span>' +
      (p.lc && p.lc !== '-' ? '<span class="chip">LeetCode ' + esc(p.lc) + '</span>' : '<span class="chip">Classic</span>') +
      (p.url ? '<a class="chip link" href="' + esc(p.url) + '">Practice online ↗</a>' : '') + '</div>';
    h += '<h4 class="block-title">Problem</h4><div class="prose">' + md(p.prompt, 3, pre) + '</div>';
    if (p.hint) h += '<div class="hint"><div class="hint-label">💡 Hint</div><div class="prose">' + md(p.hint, 4, pre + '-hint') + '</div></div>';
    h += '<h4 class="block-title answer-title">' + (tabs.length > 1 ? 'Solutions (' + tabs.length + ' approaches)' : 'Solution') + '</h4>';
    tabs.forEach((t, i) => {
      const name = (tabs.length > 1 ? 'Approach ' + (i + 1) + ': ' : '') + t.name + (t.optimal && tabs.length > 1 ? ' ★' : '');
      h += '<div class="approach' + (t.optimal ? ' optimal' : '') + '"><h5 class="approach-title">' + esc(name) + '</h5><div class="prose">' +
        md(t.md, 4, pre + '-a' + i) +
        (t.c ? '<h6>C version</h6>' + md(t.c, 4, pre + '-c' + i) : '') +
        (t.explanation !== undefined && t.explanation !== '' ? '<h6>Explanation</h6>' + md(t.explanation, 4, pre + '-e' + i) : '') +
        '</div></div>';
    });
    if (p.walkthrough) h += '<h4 class="block-title">Step-by-step walkthrough (optimal solution)</h4><div class="prose">' + md(p.walkthrough, 3, pre + '-w') + '</div>';
    if (p.complexity) h += '<h4 class="block-title">Complexity analysis (optimal)</h4><div class="prose">' + md(p.complexity, 3, pre + '-x') + '</div>';
    return h + '</section>';
  }

  async function renderProblemsPart(part) {
    const P = await C.loadProblems();
    const toc = [];
    let body = '';
    C.PATTERN_IDS.forEach((id, pi) => {
      const pat = P[id];
      if (pat.error) state.errors.push('problems/' + id + ': ' + pat.error);
      const meta = M.patterns.meta[id];
      const anchor = 'pat-' + id;
      const entry = { id: anchor, title: meta.title, level: 1, items: [] };
      body += '<section class="chapter pattern" id="' + anchor + '">';
      body += '<div class="chapter-kicker">' + (C.EXTRA_IDS.includes(id) ? 'Standalone path' : 'Pattern ' + (pi + 1)) + ' · ' + pat.problems.length + ' problems</div>';
      body += '<h2>' + target(anchor, meta.title, 1) + esc(meta.title) + '</h2><p class="lede">' + esc(meta.blurb) + '</p>';
      if (pat.intro) body += '<div class="pattern-guide"><div class="guide-label">Pattern guide — how to recognise it</div><div class="prose">' + md(pat.intro, 2, anchor) + '</div></div>';
      body += '</section>';
      pat.problems.forEach((p, i) => {
        body += renderProblem(p, i + 1);
        entry.items.push({ id: probAnchor(p), title: (i + 1) + '. ' + p.title, level: 2, diff: p.difficulty });
      });
      toc.push(entry);
    });
    return { toc, body };
  }

  async function renderSectionPart(part) {
    const S = M.sections[part.id];
    const toc = [];
    let body = '';
    for (const g of S.groups) {
      toc.push({ group: g.name });
      body += '<div class="group-label">' + esc(g.name) + '</div>';
      const texts = await Promise.all(g.items.map(it => C.fetchText('content/' + part.id + '/' + it.id + '.md').catch(e => {
        state.errors.push(part.id + '/' + it.id + ': ' + e.message);
        return '# ' + it.title + '\n\n*This article could not be loaded.*';
      })));
      g.items.forEach((it, k) => {
        const anchor = artAnchor(part.id, it.id);
        let text = texts[k].replace(/\r\n?/g, '\n');
        // The article's own "# Title" becomes the chapter heading (h2); fall back to the manifest title.
        const h1 = text.match(/^#\s+(.*)$/m);
        const title = h1 ? h1[1].trim() : it.title;
        if (h1) text = text.replace(h1[0], '');
        body += '<section class="chapter article" id="' + anchor + '">';
        body += '<div class="chapter-kicker">' + esc(g.name) + '</div>';
        body += '<h2>' + target(anchor, it.title, 1) + MD.inline(title) + '</h2>';
        if (it.desc) body += '<p class="lede">' + esc(it.desc) + '</p>';
        body += '<div class="prose">' + md(text, 1, anchor) + '</div></section>';
        toc.push({ id: anchor, title: it.title, level: 1 });
      });
    }
    return { toc, body };
  }

  function tocHtml(parts) {
    let h = '<section class="toc" id="toc"><h1 class="toc-title">Contents</h1>';
    for (const part of parts) {
      h += '<div class="toc-part"><a href="#part-' + part.id + '"><span class="t">' + esc(part.title) + '</span><span class="lead"></span><span class="pg" data-pg="part-' + part.id + '">000</span></a></div>';
      for (const e of part.toc) {
        if (e.group) { h += '<div class="toc-group">' + esc(e.group) + '</div>'; continue; }
        h += '<div class="toc-l1"><a href="#' + e.id + '"><span class="t">' + esc(e.title) + '</span><span class="lead"></span><span class="pg" data-pg="' + e.id + '">000</span></a></div>';
        for (const it of e.items || []) {
          h += '<div class="toc-l2"><a href="#' + it.id + '"><span class="t">' + esc(it.title) +
            (it.diff ? ' <span class="toc-diff ' + esc(it.diff) + '">' + esc(it.diff[0]) + '</span>' : '') +
            '</span><span class="lead"></span><span class="pg" data-pg="' + it.id + '">000</span></a></div>';
        }
      }
    }
    return h + '</section>';
  }

  // Internal site links (#/docs/x, #/problems/p/slug) become links inside the PDF when the target is in this book.
  function fixLinks(root) {
    const ids = new Set([...root.querySelectorAll('[id]')].map(e => e.id));
    root.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href.startsWith('#/')) return;
      const parts = href.slice(2).split('?')[0].split('/').filter(Boolean);
      let to = null;
      if (parts[0] === 'problems' && parts[2]) to = 'prob-' + parts[1] + '-' + parts[2];
      else if (parts[0] === 'problems' && parts[1]) to = 'pat-' + parts[1];
      else if (parts[0] === 'problems') to = 'part-problems';
      else if (M.sections[parts[0]]) to = parts[1] ? artAnchor(parts[0], parts[1]) : 'part-' + parts[0];
      if (to && ids.has(to)) a.setAttribute('href', '#' + to);
      else { const s = document.createElement('span'); s.innerHTML = a.innerHTML; a.replaceWith(s); }
    });
  }

  function polish(root) {
    // Solutions inside "Practice" blocks are always shown in the book.
    root.querySelectorAll('details').forEach(d => {
      d.open = true;
      const s = d.querySelector('summary');
      if (s) s.textContent = s.textContent.replace(/^\s*show\s+/i, '').replace(/^./, c => c.toUpperCase());
    });
    root.querySelectorAll('.copy-btn').forEach(b => b.remove());
    root.querySelectorAll('.codeblock').forEach(cb => {
      const code = cb.querySelector('pre code');
      if (!code) return;
      // One block per source line so a wrapped line gets a hanging indent (CSS .cl) instead of
      // restarting at the left edge. Highlight spans are split at line breaks, keeping their class.
      const lines = [[]];
      (function walk(node, cls) {
        node.childNodes.forEach(n => {
          if (n.nodeType === 3) {
            n.nodeValue.split('\n').forEach((piece, k) => {
              if (k) lines.push([]);
              if (piece) lines[lines.length - 1].push([piece, cls]);
            });
          } else if (n.nodeType === 1) walk(n, n.className || cls);
        });
      })(code, '');
      const before = code.textContent;
      if (lines.map(segs => segs.map(s => s[0]).join('')).join('\n') !== before) {
        state.errors.push('code block changed while splitting lines: ' + before.slice(0, 50));
        return;
      }
      const hang = segs => {           // continuation indent = the line's own indentation + 4 columns
        const lead = (segs.map(s => s[0]).join('').match(/^[ \t]*/)[0]).replace(/\t/g, '    ').length;
        return ' style="padding-left:' + (lead + 4) + 'ch;text-indent:-' + (lead + 4) + 'ch"';
      };
      code.innerHTML = lines.map(segs => '<span class="cl"' + hang(segs) + '>' + (segs.length ? segs.map(([t, c]) =>
        c ? '<span class="' + esc(c) + '">' + esc(t) + '</span>' : esc(t)).join('') : '​') + '</span>').join('');
      // Keep short code blocks on one page; long ones are allowed to split.
      if (lines.length <= 12) cb.classList.add('keep');
    });
  }

  function countAll(parts, probs) {
    const bits = [];
    for (const p of parts) {
      if (p.id === 'problems') bits.push(probs + ' problems with solutions');
      else {
        const n = M.sections[p.id].groups.reduce((s, g) => s + g.items.length, 0);
        const label = { docs: 'C/C++ guides', design: 'design guides', math: 'math guides', learn: 'Learn guides', courses: 'AI course levels' }[p.id] || p.title + ' guides';
        bits.push(n + ' ' + label);
      }
    }
    return bits;
  }

  async function render() {
    const q = new URLSearchParams(location.search);
    const parts = partList(q.get('part'));
    const out = [];
    let probCount = 0;
    for (const part of parts) {
      const r = part.id === 'problems' ? await renderProblemsPart(part) : await renderSectionPart(part);
      if (part.id === 'problems') probCount = r.toc.reduce((s, e) => s + (e.items ? e.items.length : 0), 0);
      part.toc = r.toc;
      out.push('<section class="part" id="part-' + part.id + '"><div class="part-inner">' +
        '<div class="part-kicker">Part ' + (out.length + 1) + '</div>' +
        '<h1>' + target('part-' + part.id, part.title, 0) + esc(part.title) + '</h1>' +
        '<p class="part-blurb">' + esc(part.blurb) + '</p></div></section>' + r.body);
    }
    const single = parts.length === 1;
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const cover = '<section class="cover"><div class="cover-logo">&lt;/&gt;</div>' +
      '<h1 class="cover-title">PrepForge</h1>' +
      '<p class="cover-sub">' + (single ? esc(parts[0].title) : 'The complete C/C++ interview prep book') + '</p>' +
      '<ul class="cover-list">' + countAll(parts, probCount).map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' +
      '<div class="cover-how"><strong>How to use this book.</strong> Problems come with a hint first; try each one for 20–25 minutes before reading the solutions. ' +
      'Every approach shows the code and the reasoning, and the ★ marks the optimal one. Tap any entry in the contents (or use your PDF reader\'s bookmarks) to jump to it.</div>' +
      '<p class="cover-meta">Generated ' + esc(date) + ' · <span id="pageTotal">0000</span> pages</p></section>';
    const book = document.getElementById('book');
    book.innerHTML = cover + tocHtml(parts) + out.join('');
    fixLinks(book);
    polish(book);
    // Record each target's visible heading text so the build can check it is on the page the contents claims.
    book.querySelectorAll('.pdf-mark').forEach(m => {
      const t = state.targets[+m.dataset.mark - 1];
      const heading = m.parentElement;
      t.text = [...heading.childNodes].filter(n => n !== m).map(n => n.textContent).join('').trim();
    });
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    // Anything wider than the page would be cut off in the PDF: record it so the build can fail.
    const limit = book.getBoundingClientRect().width + 1;
    book.querySelectorAll('pre, table, p, li, h2, h3, h4, h5, .problem-meta').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().width > limit) {
        state.warnings.push('too wide: <' + el.tagName.toLowerCase() + '> ' + el.textContent.slice(0, 60).replace(/\s+/g, ' '));
      }
    });
    document.title = 'PrepForge — ' + (single ? parts[0].title : 'Complete book');
  }

  // Pass 2: write the real page numbers into the contents and the cover, and drop the pass-1 markers.
  function applyPageNumbers(pages, total) {
    document.querySelectorAll('.toc .pg').forEach(el => {
      const t = state.targets.find(x => x.id === el.dataset.pg);
      const pg = t && pages[t.n];
      el.textContent = pg ? String(pg) : '';
    });
    const tot = document.getElementById('pageTotal');
    if (tot) tot.textContent = String(total);
    document.querySelectorAll('.pdf-mark').forEach(m => { m.textContent = ''; });
  }

  global.PFPrint = Object.assign(state, { applyPageNumbers });
  render().then(() => { state.ready = true; document.body.dataset.ready = '1'; })
    .catch(e => { state.errors.push(e.message); state.ready = true; document.body.dataset.ready = 'error'; console.error(e); });
})(window);
