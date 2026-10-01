// AI engineering quality: do the (AI-generated) tests contain what the golden checks demand?
// The golden checks live in the private repo, so the agent that wrote the tests never saw them.
import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const repoRoot = resolve(import.meta.dirname, '../..');
const goldenDir = resolve(repoRoot, process.env.GOLDEN_DIR ?? '../golden-dataset');
const file = resolve(goldenDir, 'engineering/cases.yaml');
if (!existsSync(file)) {
  console.error('Golden dataset not found. Set GOLDEN_DIR.');
  process.exit(1);
}
const includeDrafts = ['1', 'true'].includes(process.env.EVAL_INCLUDE_DRAFTS ?? '');
const cases = (parse(readFileSync(file, 'utf8')) ?? []).filter((c) => includeDrafts || c.status === 'approved');

const rows = cases.map((c) => {
  const files = globSync(c.files, { cwd: repoRoot });
  const text = files.map((f) => readFileSync(resolve(repoRoot, f), 'utf8')).join('\n');
  const missing = (c.must_match ?? []).some((re) => !new RegExp(re).test(text));
  const forbidden = (c.must_not_match ?? []).some((re) => new RegExp(re).test(text));
  return { id: c.id, category: c.category, pass: files.length > 0 && !missing && !forbidden };
});

const failed = rows.filter((r) => !r.pass).map((r) => r.id);
// Public-safe output: IDs and categories only, never the expected patterns.
const out = { generatedAt: new Date().toISOString(), total: rows.length, passed: rows.length - failed.length, failedIds: failed, rows };
mkdirSync(resolve(repoRoot, 'evals/.out'), { recursive: true });
writeFileSync(resolve(repoRoot, 'evals/.out/engineering.json'), JSON.stringify(out, null, 2));
console.log(`Engineering checks: ${out.passed}/${out.total} passed${failed.length ? `. Failed: ${failed.join(', ')}` : ''}`);
