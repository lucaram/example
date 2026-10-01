// Pillar 4: the release gate. Reads results, applies docs/test-strategy/gates.json and decides:
//   promote       everything is green and trusted
//   human-review  something needs a person (judge not yet calibrated, judge or mutation in the grey zone)
//   hold          a deterministic check failed, or required evidence is missing
// Every decision is written to evals/.out/gate.json so it can be traced.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (p) => {
  const f = resolve(root, p);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};

const gates = read('docs/test-strategy/gates.json');
const scorecard = read('evals/.out/scorecard.json');
const engineering = read('evals/.out/engineering.json');
const calibration = read('evals/.out/calibration.json');
const mutation = read('reports/mutation/mutation.json');
const perfRaw = read('perf/out/summary.json');
const p95 = perfRaw?.metrics?.http_req_duration?.['p(95)'];
const perf = typeof p95 === 'number' ? { p95 } : null;

const hold = [];
const review = [];
const ok = [];

if (!scorecard) {
  hold.push('no eval scorecard (evidence missing)');
} else {
  if (scorecard.mode === 'mock' && !process.argv.includes('--allow-mock')) hold.push('eval ran in mock mode (not valid evidence)');
  if (scorecard.errors > 0) hold.push(`${scorecard.errors} eval case(s) errored`);
  if (scorecard.deterministicPassRate < gates.deterministic.promoteAt) {
    hold.push(`deterministic checks ${(scorecard.deterministicPassRate * 100).toFixed(0)}% (needs ${gates.deterministic.promoteAt * 100}%)`);
  } else ok.push('deterministic checks 100%');

  const j = scorecard.judgePassRate;
  const trusted =
    calibration && !calibration.mock && calibration.n >= gates.judge.requiresCalibration.minItems && calibration.kappa >= gates.judge.requiresCalibration.minKappa;
  if (!trusted) review.push('LLM judge is not calibrated yet (needs kappa and enough human labels), so it cannot block or promote alone');
  if (j < gates.judge.humanReviewAt) hold.push(`judge pass rate ${(j * 100).toFixed(0)}% is below ${gates.judge.humanReviewAt * 100}%`);
  else if (j < gates.judge.promoteAt) review.push(`judge pass rate ${(j * 100).toFixed(0)}% is in the human-review band`);
  else ok.push(`judge pass rate ${(j * 100).toFixed(0)}%`);
}

if (engineering) {
  if (engineering.failedIds.length > gates.engineering.maxFailures) hold.push(`AI-generated test checks failed: ${engineering.failedIds.join(', ')}`);
  else ok.push('AI-generated test checks passed');
} else review.push('no engineering-track result');

if (mutation) {
  // Stryker's JSON report lists mutants per file. Score = killed (+timeout) / valid mutants.
  const mutants = Object.values(mutation.files ?? {}).flatMap((f) => f.mutants ?? []);
  const valid = mutants.filter((m) => !['CompileError', 'Ignored'].includes(m.status));
  const score = valid.length ? (valid.filter((m) => ['Killed', 'Timeout'].includes(m.status)).length / valid.length) * 100 : undefined;
  if (typeof score === 'number') {
    if (score < gates.mutation.humanReviewAt) hold.push(`mutation score ${score.toFixed(0)} is below ${gates.mutation.humanReviewAt}`);
    else if (score < gates.mutation.promoteAt) review.push(`mutation score ${score.toFixed(0)} is in the human-review band`);
    else ok.push(`mutation score ${score.toFixed(0)}`);
  }
}

if (perf) {
  if (perf.p95 > gates.perf.p95Ms) hold.push(`p95 latency ${perf.p95.toFixed(0)}ms exceeds ${gates.perf.p95Ms}ms`);
  else ok.push(`p95 latency ${perf.p95.toFixed(0)}ms`);
}

const decision = hold.length ? 'hold' : review.length ? 'human-review' : 'promote';
const result = { decidedAt: new Date().toISOString(), decision, hold, review, ok };
mkdirSync(resolve(root, 'evals/.out'), { recursive: true });
writeFileSync(resolve(root, 'evals/.out/gate.json'), JSON.stringify(result, null, 2));

const lines = [
  `### Release gate: ${decision.toUpperCase()}`,
  ...hold.map((m) => `- HOLD: ${m}`),
  ...review.map((m) => `- REVIEW: ${m}`),
  ...ok.map((m) => `- ok: ${m}`),
];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `decision=${decision}\n`);
process.exit(decision === 'hold' ? 1 : 0);
