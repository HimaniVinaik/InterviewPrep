/* PrepForge content loading + parsing, shared by the app (index.html) and the PDF export (print.html).
 * Exposes window.PFContent. Depends on window.MANIFEST (manifest.js) and window.MD (markdown.js).
 */
(function (global) {
  'use strict';
  const M = global.MANIFEST;
  const MD = global.MD;

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

  // Parse a pattern markdown file into { intro, problems[] }
  function parsePattern(id, text) {
    const chunks = text.replace(/\r\n?/g, '\n').split(/\n(?=## )/);
    const intro = chunks.shift().replace(/^# .*\n/, '').trim();
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

  let problemsPromise = null;
  function loadProblems() {
    if (!problemsPromise) {
      problemsPromise = Promise.all(PATTERN_IDS.map(id =>
        fetchText('content/problems/' + id + '.md').then(t => parsePattern(id, t))
          .then(pat => fetchText('content/problems/' + id + '.more.md').then(t => mergeMore(pat, t), () => pat))
          .then(pat => fetchText('content/problems/' + id + '.complexity.md').then(t => mergeMore(pat, t), () => pat))
          .then(pat => fetchText('content/problems/' + id + '.solutions.md').then(t => mergeSolutions(pat, t), () => pat))
          .catch(e => ({ id, intro: '⚠️ ' + e.message, problems: [], error: e.message }))
      )).then(list => { const o = {}; list.forEach(p => { o[p.id] = p; }); return o; });
    }
    return problemsPromise;
  }

  // The answer tabs exactly as the problem page shows them: earlier approaches, then the optimal one.
  function answerTabs(p) {
    const tabs = (p.approaches || []).map(a => ({ name: a.name, md: a.body }));
    if (p.optimal) tabs.push({ name: 'Optimal: ' + p.optimal.name, md: p.optimal.body, optimal: true });
    else {
      tabs.push({
        name: 'Optimal' + (tabs.length ? '' : ' solution'), optimal: true,
        md: p.solution, c: p.c, explanation: p.explanation,
      });
    }
    return tabs;
  }

  function allArticles() {
    const out = [];
    for (const [sec, S] of Object.entries(M.sections)) for (const g of S.groups) for (const it of g.items) out.push({ ...it, section: sec, group: g.name });
    return out;
  }

  global.PFContent = { fetchText, loadProblems, answerTabs, allArticles, TREE_IDS, EXTRA_IDS, PATTERN_IDS };
})(window);
