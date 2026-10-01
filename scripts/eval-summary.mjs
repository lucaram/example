// Turns Promptfoo's raw results (which contain the golden expected answers) into a PUBLIC-SAFE scorecard:
// case IDs, categories and pass/fail only. This is what CI uploads and prints in a public repo.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JUDGE_VERSION } from '../evals/judge.ts';
import { PROMPT_VERSION } from '../apps/api/src/risk-summary.ts';

const root = resolve(import.meta.dirname, '..');
const input = resolve(root, 'evals/.out/results.json');
if (!existsSync(input)) {
  console.error('No evals/.out/results.json. Run: npm run eval');
  process.exit(1);
}
const data = JSON.parse(readFileSync(input, 'utf8'));

const rows = data.results.results.map((r) => {
  const comps = r.gradingResult?.componentResults ?? [];
  const metric = (m) => comps.find((c) => c.assertion?.metric === m)?.pass === true;
  const [id, ...category] = String(r.testCase?.description ?? r.description ?? '?').split(' ');
  return {
    id,
    category: category.join(' '),
    deterministic: metric('deterministic'),
    judge: metric('judge'),
    // Only the generic, answer-free reason from the deterministic check is kept.
    reason: comps.find((c) => c.assertion?.metric === 'deterministic' && !c.pass)?.reason,
    // failureReason 2 = the provider itself errored. 1 = an assertion failed (that is a quality result, not an error).
    error: r.failureReason === 2 || Boolean(r.response?.error),
  };
});

const rate = (key) => (rows.length ? rows.filter((r) => r[key]).length / rows.length : 0);
const mock = process.env.EVAL_MODE === 'mock';
const scorecard = {
  generatedAt: new Date().toISOString(),
  mode: mock ? 'mock' : 'live',
  promptVersion: PROMPT_VERSION,
  judgeVersion: JUDGE_VERSION,
  appModel: mock ? 'mock-1' : (process.env.LLM_MODEL ?? 'qwen/qwen3.8-27b'),
  judgeModel: mock ? 'mock' : (process.env.JUDGE_MODEL ?? 'openai/gpt-oss-120b'),
  total: rows.length,
  deterministicPassRate: Number(rate('deterministic').toFixed(3)),
  judgePassRate: Number(rate('judge').toFixed(3)),
  errors: rows.filter((r) => r.error).length,
  tokens: data.results.stats?.tokenUsage?.total ?? 0,
  failedIds: rows.filter((r) => !r.deterministic || !r.judge).map((r) => r.id),
  rows,
};

mkdirSync(resolve(root, 'evals/.out'), { recursive: true });
writeFileSync(resolve(root, 'evals/.out/scorecard.json'), JSON.stringify(scorecard, null, 2));

const pct = (n) => `${(n * 100).toFixed(0)}%`;
const md = [
  `### AI eval scorecard (${scorecard.mode})`,
  '',
  `| Measure | Result |`,
  `|---|---|`,
  `| Cases | ${scorecard.total} |`,
  `| Deterministic checks | ${pct(scorecard.deterministicPassRate)} |`,
  `| LLM judge (${scorecard.judgeVersion}, ${scorecard.judgeModel}) | ${pct(scorecard.judgePassRate)} |`,
  `| Provider errors | ${scorecard.errors} |`,
  `| Prompt / generator | ${scorecard.promptVersion} / ${scorecard.appModel} |`,
  scorecard.failedIds.length ? `\nFailed case IDs: ${scorecard.failedIds.join(', ')}` : '\nAll cases passed.',
  scorecard.mode === 'mock' ? '\n> Mock mode: proves the plumbing only, not model quality.' : '',
].join('\n');

console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
