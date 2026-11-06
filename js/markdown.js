/* Tiny, dependency-free Markdown renderer + syntax highlighter for PrepForge.
 * Supports: headings, paragraphs, fenced code, tables, nested lists, blockquotes
 * (with Tip / Warning / Danger callouts), hr, inline code/bold/italic/links.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function slugify(s) {
    return s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  }

  /* ---------------- Syntax highlighting ---------------- */
  const CPP_KW = 'alignas alignof and asm auto break case catch char8_t class co_await co_return co_yield concept const consteval constexpr constinit const_cast continue decltype default delete do dynamic_cast else enum explicit export extern false final for friend goto if import inline module mutable namespace new noexcept not nullptr operator or override private protected public register reinterpret_cast requires return sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union using virtual volatile while __global__ __device__ __host__ __shared__ __syncthreads __restrict__ restrict _Atomic _Bool _Static_assert _Generic';
  const CPP_TY = 'bool char char16_t char32_t double float int long short signed unsigned void wchar_t size_t ssize_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t uintptr_t intptr_t ptrdiff_t std string vector map unordered_map set unordered_set multiset deque queue stack priority_queue pair tuple array list optional variant any span string_view unique_ptr shared_ptr weak_ptr function thread jthread mutex atomic size_type iterator FILE dim3 cudaError_t';
  const PY_KW = 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case self';
  const PY_TY = 'int float str list dict set tuple bool bytes object type range len print enumerate zip map filter sorted super isinstance';
  const SH_KW = 'if then else elif fi for while do done case esac in function return export local echo cd sudo set';
  const CMAKE_KW = 'cmake_minimum_required project add_executable add_library target_link_libraries target_include_directories target_compile_options target_compile_features target_compile_definitions find_package include FetchContent_Declare FetchContent_MakeAvailable set option if else elseif endif foreach endforeach message add_subdirectory enable_testing add_test install PUBLIC PRIVATE INTERFACE REQUIRED VERSION LANGUAGES CONFIG GIT_REPOSITORY GIT_TAG STATIC SHARED CMAKE_CXX_STANDARD CMAKE_CXX_STANDARD_REQUIRED CMAKE_BUILD_TYPE include_guard function endfunction gtest_discover_tests';

  function words(s) { const o = Object.create(null); s.split(/\s+/).forEach(w => { if (w) o[w] = 1; }); return o; }
  const LANGS = {
    cpp: { kw: words(CPP_KW), ty: words(CPP_TY), line: '//', block: true, pre: true },
    py: { kw: words(PY_KW), ty: words(PY_TY), line: '#', block: false, pre: false, triple: true },
    sh: { kw: words(SH_KW), ty: words(''), line: '#', block: false, pre: false },
    cmake: { kw: words(CMAKE_KW), ty: words(''), line: '#', block: false, pre: false, ci: true },
    make: { kw: words('ifeq ifneq ifdef ifndef else endif include define endef export override .PHONY'), ty: words('CC CXX CFLAGS CXXFLAGS LDFLAGS LDLIBS CPPFLAGS'), line: '#', block: false, pre: false },
    asm: { kw: words('mov ldr str add sub b bl bx cmp beq bne push pop ret call jmp lea'), ty: words(''), line: ';', block: false, pre: false },
  };
  const ALIAS = { c: 'cpp', 'c++': 'cpp', cc: 'cpp', h: 'cpp', hpp: 'cpp', cu: 'cpp', cuda: 'cpp', python: 'py', bash: 'sh', shell: 'sh', console: 'sh', makefile: 'make', text: null, txt: null, '': null, json: 'cpp', js: 'cpp', javascript: 'cpp', java: 'cpp', sql: null };

  function highlight(code, lang) {
    const key = lang in ALIAS ? ALIAS[lang] : lang;
    const L = LANGS[key];
    if (!L) return esc(code);
    let out = '', i = 0;
    const n = code.length;
    const span = (cls, s) => '<span class="tk-' + cls + '">' + esc(s) + '</span>';
    let lineStart = true;
    while (i < n) {
      const c = code[i];
      // preprocessor at line start
      if (L.pre && lineStart && /[ \t]/.test(c)) { out += c; i++; continue; }
      if (L.pre && lineStart && c === '#') {
        let j = code.indexOf('\n', i); if (j < 0) j = n;
        let line = code.slice(i, j);
        // split trailing comment
        const ci = line.indexOf('//');
        if (ci > 0) { out += span('pre', line.slice(0, ci)) + span('com', line.slice(ci)); }
        else {
          const m = line.match(/^(#\s*include\s*)(<[^>]*>|"[^"]*")(.*)$/);
          if (m) out += span('pre', m[1]) + span('str', m[2]) + esc(m[3]);
          else out += span('pre', line);
        }
        i = j; lineStart = false; continue;
      }
      lineStart = false;
      if (c === '\n') { out += c; i++; lineStart = true; continue; }
      // line comment
      if (code.startsWith(L.line, i)) {
        let j = code.indexOf('\n', i); if (j < 0) j = n;
        out += span('com', code.slice(i, j)); i = j; continue;
      }
      if (L.block && code.startsWith('/*', i)) {
        let j = code.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
        out += span('com', code.slice(i, j)); i = j; continue;
      }
      if (L.triple && (code.startsWith('"""', i) || code.startsWith("'''", i))) {
        const q = code.slice(i, i + 3);
        let j = code.indexOf(q, i + 3); j = j < 0 ? n : j + 3;
        out += span('str', code.slice(i, j)); i = j; continue;
      }
      if (c === '"' || c === "'" || (c === '`' && key !== 'cpp')) {
        // C++ digit separator 1'000'000: treat ' after digit as part of number (handled in number branch)
        let j = i + 1;
        while (j < n && code[j] !== c && code[j] !== '\n') { if (code[j] === '\\') j++; j++; }
        j = Math.min(j + 1, n);
        out += span('str', code.slice(i, j)); i = j; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) {
        const m = code.slice(i).match(/^(0[xX][0-9a-fA-F']+|0[bB][01']+|[0-9][0-9']*\.?[0-9']*(?:[eE][+-]?[0-9]+)?|\.[0-9]+)[uUlLfFzZ]*/);
        if (m) { out += span('num', m[0]); i += m[0].length; continue; }
      }
      if (/[A-Za-z_$@]/.test(c)) {
        const m = code.slice(i).match(/^[A-Za-z_$@][A-Za-z0-9_$]*/);
        const w = m[0];
        const lw = L.ci ? w : w;
        if (L.kw[lw] || (L.ci && L.kw[w.toLowerCase()])) out += span('kw', w);
        else if (L.ty[w]) out += span('type', w);
        else if (code[i + w.length] === '(') out += span('fn', w);
        else out += esc(w);
        i += w.length; continue;
      }
      out += esc(c); i++;
    }
    return out;
  }

  /* ---------------- Inline ---------------- */
  function inline(text) {
    const codes = [];
    let s = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const ext = /^https?:/.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, k) => '<code>' + esc(codes[+k]) + '</code>');
    return s;
  }

  /* ---------------- Blocks ---------------- */
  const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

  function isBlockStart(l) {
    return /^```/.test(l) || /^:::/.test(l) || /^#{1,6}\s/.test(l) || /^>/.test(l) || /^\|/.test(l) || LIST_RE.test(l) || /^\s*(-{3,}|\*{3,})\s*$/.test(l);
  }

  function codeBlock(code, lang) {
    const label = lang || 'text';
    return '<div class="codeblock"><div class="code-head"><span>' + esc(label) + '</span><button class="copy-btn" type="button">Copy</button></div><pre><code>' + highlight(code, lang.toLowerCase()) + '</code></pre></div>';
  }

  function splitRow(r) {
    r = r.trim().replace(/^\|/, '').replace(/\|$/, '');
    // allow escaped pipes \| inside cells (no regex lookbehind for older Safari)
    return r.replace(/\\\|/g, '\u0001').split('|').map(c => c.trim().replace(/\u0001/g, '|'));
  }

  function render(src, opts) {
    opts = opts || {};
    const lines = src.replace(/\r\n?/g, '\n').split('\n'); // tabs preserved (Makefiles!)
    let html = '';
    let i = 0;
    const toc = opts.toc || null;
    while (i < lines.length) {
      const l = lines[i];
      if (/^\s*$/.test(l)) { i++; continue; }

      let m;
      if ((m = l.match(/^(\s*)```\s*([\w+#-]*)/))) {
        const indent = m[1].length;
        const lang = m[2] || '';
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i].slice(Math.min(indent, lines[i].search(/\S|$/)))); i++; }
        i++;
        html += codeBlock(buf.join('\n'), lang);
        continue;
      }
      // Collapsible block:  :::details Summary text  …  :::   (used for exercise solutions)
      if ((m = l.match(/^:::\s*details\s*(.*)$/))) {
        const buf = [];
        let inFence = false;
        i++;
        while (i < lines.length && !(!inFence && /^:::\s*$/.test(lines[i]))) {
          if (/^\s*```/.test(lines[i])) inFence = !inFence;
          buf.push(lines[i]); i++;
        }
        i++;
        html += '<details class="md-details"><summary>' + inline(m[1] || 'Show') + '</summary><div class="md-details-body">' + render(buf.join('\n')) + '</div></details>';
        continue;
      }
      if ((m = l.match(/^(#{1,6})\s+(.*?)\s*#*$/))) {
        const lvl = m[1].length;
        const id = slugify(m[2]);
        if (toc && (lvl === 2 || lvl === 3)) toc.push({ lvl, id, text: m[2].replace(/`/g, '') });
        html += '<h' + lvl + ' id="' + id + '">' + inline(m[2]) + '</h' + lvl + '>';
        i++; continue;
      }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { html += '<hr>'; i++; continue; }
      if (/^>/.test(l)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        const first = buf[0] || '';
        let cls = '';
        if (/^\*\*(Warning|Caution|Pitfall|Gotcha)/i.test(first)) cls = 'warn';
        else if (/^\*\*(Danger|Bug|UB|Never)/i.test(first)) cls = 'danger';
        else if (/^\*\*(Tip|Interview|Pro tip|Rule of thumb|Key)/i.test(first)) cls = 'tip';
        html += '<blockquote' + (cls ? ' class="' + cls + '"' : '') + '>' + render(buf.join('\n')) + '</blockquote>';
        continue;
      }
      if (/^\|/.test(l) && i + 1 < lines.length && /^\|?\s*:?-+/.test(lines[i + 1])) {
        const head = splitRow(l);
        const aligns = splitRow(lines[i + 1]).map(c => /^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : '');
        i += 2;
        let t = '<div class="table-wrap"><table><thead><tr>' + head.map((h, k) => '<th' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>';
        while (i < lines.length && /^\|/.test(lines[i])) {
          const cells = splitRow(lines[i]);
          t += '<tr>' + cells.map((c, k) => '<td' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(c) + '</td>').join('') + '</tr>';
          i++;
        }
        html += t + '</tbody></table></div>';
        continue;
      }
      if ((m = l.match(LIST_RE))) {
        const baseIndent = m[1].length;
        const ordered = /\d/.test(m[2]);
        const startNum = ordered ? parseInt(m[2], 10) : 1;
        const items = [];
        let cur = null;
        while (i < lines.length) {
          const li = lines[i];
          const mm = li.match(LIST_RE);
          if (mm && mm[1].length === baseIndent && /\d/.test(mm[2]) === ordered) {
            cur = [mm[3]]; items.push(cur); i++; continue;
          }
          if (/^\s*$/.test(li)) {
            // blank: continue list only if next non-blank line is indented or a sibling item
            let k = i + 1; while (k < lines.length && /^\s*$/.test(lines[k])) k++;
            if (k < lines.length) {
              const nx = lines[k]; const nm = nx.match(LIST_RE);
              const ind = nx.search(/\S/);
              if ((nm && nm[1].length === baseIndent && /\d/.test(nm[2]) === ordered) || ind > baseIndent) { cur.push(''); i++; continue; }
            }
            break;
          }
          const ind = li.search(/\S/);
          if (ind > baseIndent) { cur.push(li.slice(Math.min(ind, baseIndent + 2 + (ordered ? 1 : 0)))); i++; continue; }
          if (!isBlockStart(li) && cur) { cur.push(li.trim()); i++; continue; } // lazy continuation
          break;
        }
        const tag = ordered ? 'ol' : 'ul';
        html += '<' + tag + (ordered && startNum !== 1 ? ' start="' + startNum + '"' : '') + '>';
        for (const it of items) {
          // first paragraph lines until a blank or block start
          let k = 0; const para = [];
          while (k < it.length && it[k] !== '' && !(k > 0 && isBlockStart(it[k]))) { para.push(it[k]); k++; }
          const rest = it.slice(k).join('\n');
          let first = inline(para.join(' '));
          // Task-list items: "[ ] text" / "[x] text" become (read-only) checkboxes.
          const task = first.match(/^\[( |x|X)\]\s+/);
          if (task) first = '<span class="task-box' + (task[1] === ' ' ? '' : ' done') + '" aria-hidden="true"></span>' + first.slice(task[0].length);
          html += '<li' + (task ? ' class="task-item"' : '') + '>' + first + (rest.trim() ? render(rest) : '') + '</li>';
        }
        html += '</' + tag + '>';
        continue;
      }
      // paragraph
      const buf = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !(buf.length && isBlockStart(lines[i]))) { buf.push(lines[i].trim()); i++; }
      html += '<p>' + inline(buf.join(' ')).replace(/ {2,}/g, ' ') + '</p>';
    }
    return html;
  }

  global.MD = { render, inline, highlight, esc, slugify };
})(window);
