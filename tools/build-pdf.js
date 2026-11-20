#!/usr/bin/env node
/* Builds the downloadable PDF books into export/ (used by the site's "Download PDF" page).
 *
 *   node tools/build-pdf.js            # all books: everything + one per section
 *   node tools/build-pdf.js docs       # just some parts
 *
 * Needs: Playwright with Chromium (npm i playwright && npx playwright install chromium),
 *        poppler's pdftotext/pdfinfo/pdffonts (apt install poppler-utils), Python with pypdf (pip install pypdf),
 *        and the fonts used by css/print.css
 *        (fonts-liberation, fonts-dejavu-core, fonts-noto-color-emoji).
 *
 * How page numbers work: print.html renders the book with an invisible marker in every contents target.
 * Pass 1 prints the PDF and reads each marker's page with pdftotext; pass 2 writes those numbers into the
 * contents and prints again. The script then re-checks every entry against the final PDF and fails on any
 * mismatch, render error, missing glyph font, or content wider than the page.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'export');
const PARTS = [
  { part: 'all', title: 'Everything', file: 'prepforge-complete.pdf' },
  { part: 'problems', title: 'Problems & solutions', file: 'prepforge-problems.pdf' },
  { part: 'docs', title: 'C and C++ Docs', file: 'prepforge-docs.pdf' },
  { part: 'design', title: 'Design', file: 'prepforge-design.pdf' },
  { part: 'math', title: 'Math', file: 'prepforge-math.pdf' },
  { part: 'learn', title: 'Learn', file: 'prepforge-learn.pdf' },
  { part: 'courses', title: 'Courses', file: 'prepforge-courses.pdf' },
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json' };

function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const pdfText = file => execFileSync('pdftotext', ['-enc', 'UTF-8', file, '-'], { maxBuffer: 1 << 30 }).toString('utf8').split('\f');
const pdfPages = file => +execFileSync('pdfinfo', [file]).toString().match(/Pages:\s+(\d+)/)[1];
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const FOOTER = `<div style="width:100%;font:7pt 'Liberation Sans','DejaVu Sans',sans-serif;color:#8a90a3;padding:0 0.5in;display:flex;justify-content:space-between">
  <span>PrepForge</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

async function printPdf(page, file) {
  await page.pdf({
    path: file, preferCSSPageSize: true, printBackground: true,   // no 'tagged': it ~2.5x the size (bookmarks are added by pdf_outline.py)
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: FOOTER,
  });
}

async function buildOne(browser, base, spec, tmp) {
  const t0 = Date.now();
  const page = await browser.newPage();
  page.setDefaultTimeout(15 * 60 * 1000);
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(`${base}/print.html?part=${spec.part}`);
  await page.waitForFunction(() => window.PFPrint && window.PFPrint.ready);
  const st = await page.evaluate(() => ({ errors: PFPrint.errors, warnings: PFPrint.warnings, targets: PFPrint.targets }));
  const problems = [...st.errors, ...consoleErrors];
  if (problems.length) throw new Error(`${spec.file}: render errors:\n  ` + problems.join('\n  '));
  if (st.warnings.length) throw new Error(`${spec.file}: content wider than the page:\n  ` + st.warnings.join('\n  '));

  // Pass 1: locate every contents target.
  const pass1 = path.join(tmp, 'pass1-' + spec.file);
  await printPdf(page, pass1);
  const pages1 = pdfText(pass1);
  const where = {};
  pages1.forEach((txt, i) => { for (const m of txt.matchAll(/@@PFMARK(\d+)@@/g)) where[m[1]] = i + 1; });
  const missing = st.targets.filter(t => !where[t.n]);
  if (missing.length) throw new Error(`${spec.file}: ${missing.length} contents targets not found in pass 1 (e.g. ${missing[0].title})`);
  const total1 = pdfPages(pass1);

  // Pass 2: real page numbers.
  await page.evaluate(([w, total]) => PFPrint.applyPageNumbers(w, total), [where, total1]);
  const out = path.join(OUT, spec.file);
  await printPdf(page, out);
  await page.close();

  // Bookmarks (PDF reader sidebar): part > pattern/article > problem, at the pages found in pass 1.
  const outlineFile = path.join(tmp, spec.part + '-outline.json');
  const outline = st.targets.map(t => ({ title: t.title, page: where[t.n], level: t.level }))
    .sort((a, b) => a.page - b.page || a.level - b.level);       // reading order; a part comes before its chapters
  fs.writeFileSync(outlineFile, JSON.stringify(outline));
  execFileSync('python3', [path.join(__dirname, 'pdf_outline.py'), out, outlineFile], { stdio: ['ignore', 'ignore', 'inherit'] });

  // Verify: same pagination, no leftover markers, every heading on the page the contents claims.
  const total2 = pdfPages(out);
  if (total2 !== total1) throw new Error(`${spec.file}: page count changed between passes (${total1} -> ${total2})`);
  const pages2 = pdfText(out);
  if (pages2.some(t => t.includes('@@PFMARK'))) throw new Error(`${spec.file}: markers left in the final PDF`);
  const wrong = st.targets.filter(t => !norm(pages2[where[t.n] - 1] || '').includes(norm(t.text).slice(0, 40)));
  if (wrong.length) throw new Error(`${spec.file}: ${wrong.length} contents entries point at the wrong page, e.g. "${wrong[0].text}" -> p.${where[wrong[0].n]}`);
  const fonts = execFileSync('pdffonts', [out]).toString();
  if (!/LiberationSans/i.test(fonts) || !/DejaVuSansMono/i.test(fonts)) throw new Error(`${spec.file}: expected fonts not embedded:\n${fonts}`);

  const bytes = fs.statSync(out).size;
  const hash = crypto.createHash('sha1').update(fs.readFileSync(out)).digest('hex').slice(0, 10);
  console.log(`  ${spec.file}: ${total2} pages, ${(bytes / 1048576).toFixed(1)} MB, ${st.targets.length} contents entries verified (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  return { part: spec.part, title: spec.title, file: 'export/' + spec.file, pages: total2, bytes, hash };
}

(async () => {
  const want = process.argv.slice(2);
  const specs = want.length ? PARTS.filter(p => want.includes(p.part)) : PARTS;
  if (!specs.length) { console.error('Unknown part. Choose from: ' + PARTS.map(p => p.part).join(', ')); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pfpdf-'));
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const manifestFile = path.join(OUT, 'manifest.json');
  const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { files: [] };
  let failed = false;
  const built = [];
  try {
    for (const spec of specs) {
      try { built.push(await buildOne(browser, base, spec, tmp)); } catch (e) { failed = true; console.error('FAIL ' + e.message); }
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (failed) process.exit(1);
  // Keep entries for parts not rebuilt this time, in the canonical order.
  const byPart = Object.fromEntries(previous.files.map(f => [f.part, f]));
  built.forEach(b => { byPart[b.part] = b; });
  const files = PARTS.map(p => byPart[p.part]).filter(Boolean);
  fs.writeFileSync(manifestFile, JSON.stringify({ generated: new Date().toISOString(), files }, null, 2) + '\n');
  console.log('wrote export/manifest.json');
})().catch(e => { console.error(e); process.exit(1); });
