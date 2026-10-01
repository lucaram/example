// Pillar 5/6: a tiny static AI quality dashboard (reports/dashboard.html) built from the CI outputs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (p) => (existsSync(resolve(root, p)) ? JSON.parse(readFileSync(resolve(root, p), 'utf8')) : null);
const score = read('evals/.out/scorecard.json');
const gate = read('evals/.out/gate.json');
const cal = read('evals/.out/calibration.json');
const eng = read('evals/.out/engineering.json');
const trace = read('reports/trace-report.json');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (n) => (typeof n === 'number' ? `${(n * 100).toFixed(0)}%` : 'n/a');
const covered = trace ? trace.requirements.filter((r) => r.covered).length : null;

const tiles = [
  ['Release decision', gate?.decision ?? 'not decided'],
  ['Deterministic eval pass', pct(score?.deterministicPassRate)],
  ['Judge pass rate', pct(score?.judgePassRate)],
  ['Judge vs human (kappa)', cal ? `${cal.kappa} (n=${cal.n})${cal.trusted ? '' : ' not trusted'}` : 'not calibrated'],
  ['AI-generated test checks', eng ? `${eng.passed}/${eng.total}` : 'n/a'],
  ['Requirements with tests', trace ? `${covered}/${trace.requirements.length}` : 'n/a'],
  ['Eval mode', score?.mode ?? 'n/a'],
];

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PreClear AI quality</title>
<style>
:root{--bg:#f7f7f5;--fg:#1a1a1a;--card:#fff;--line:#d8d8d2;--muted:#666}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#ececec;--card:#1f1f1f;--line:#333;--muted:#9a9a9a}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:900px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px}
.tile b{display:block;font-size:1.4rem}.tile span{color:var(--muted);font-size:.85rem}
</style><main><h1>PreClear AI quality</h1>
<p style="color:var(--muted)">Generated ${esc(new Date().toISOString())}. Prompt ${esc(score?.promptVersion ?? 'n/a')}, judge ${esc(score?.judgeVersion ?? 'n/a')}.</p>
<div class="grid">${tiles.map(([k, v]) => `<div class="tile"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
${gate ? `<h2>Gate reasons</h2><ul>${[...gate.hold.map((m) => `HOLD: ${m}`), ...gate.review.map((m) => `REVIEW: ${m}`), ...gate.ok.map((m) => `ok: ${m}`)].map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
</main></html>`;

mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports/dashboard.html'), html);
console.log('Wrote reports/dashboard.html');
