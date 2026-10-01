// Pillar 3: traceability. requirement -> business rules -> tests -> results, plus the context commit,
// model and prompt versions and eval results. Run after the Playwright tests (needs test-results/results.json).
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JUDGE_VERSION } from '../evals/judge.ts';
import { PROMPT_VERSION } from '../apps/api/src/risk-summary.ts';

const root = resolve(import.meta.dirname, '..');
const strict = process.argv.includes('--strict');

interface Req {
  id: string;
  rules: string[];
  file: string;
}
interface TestResult {
  title: string;
  project: string;
  status: string;
  tags: string[];
}

// 1. Requirements and their rules, from the Gherkin tags.
const reqs: Req[] = [];
for (const file of globSync('docs/requirements/*.feature', { cwd: root })) {
  const text = readFileSync(resolve(root, file), 'utf8');
  for (const m of text.matchAll(/^((?:@\S+\s*)+)\r?\nFeature:/gm)) {
    const tags = m[1]!.trim().split(/\s+/).map((t) => t.replace(/^@/, ''));
    const id = tags.find((t) => /^REQ-\d+$/.test(t));
    if (id) reqs.push({ id, file, rules: tags.filter((t) => t.startsWith('rule-')).map((t) => t.replace('rule-', '')) });
  }
}

// 2. Test results from the Playwright JSON report.
const tests: TestResult[] = [];
const resultsFile = resolve(root, 'test-results/results.json');
if (existsSync(resultsFile)) {
  const walk = (suite: any, project?: string) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const tags: string[] = [...(spec.tags ?? []), ...(t.tags ?? [])].map((x: string) => x.replace(/^@/, ''));
        const last = t.results?.[t.results.length - 1];
        tests.push({ title: spec.title, project: t.projectName ?? project ?? '', status: last?.status ?? t.status ?? 'unknown', tags });
      }
    }
    for (const child of suite.suites ?? []) walk(child, project);
  };
  for (const s of JSON.parse(readFileSync(resultsFile, 'utf8')).suites ?? []) walk(s);
}

const rows = reqs.map((r) => {
  const linked = tests.filter((t) => t.tags.includes(r.id));
  return {
    requirement: r.id,
    rules: r.rules,
    tests: linked.map((t) => ({ title: t.title, project: t.project, status: t.status })),
    covered: linked.length > 0,
    passing: linked.length > 0 && linked.every((t) => t.status === 'passed' || t.status === 'expected'),
  };
});
const untraced = tests.filter((t) => !t.tags.some((x) => /^REQ-\d+$/.test(x))).map((t) => t.title);

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
};
const optional = (p: string) => (existsSync(resolve(root, p)) ? JSON.parse(readFileSync(resolve(root, p), 'utf8')) : null);
const scorecard = optional('evals/.out/scorecard.json');
const gate = optional('evals/.out/gate.json');
const calibration = optional('evals/.out/calibration.json');

const report = {
  generatedAt: new Date().toISOString(),
  context: { commit: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD') },
  versions: { prompt: PROMPT_VERSION, judge: JUDGE_VERSION, appModel: scorecard?.appModel ?? 'n/a', judgeModel: scorecard?.judgeModel ?? 'n/a' },
  requirements: rows,
  untracedTests: untraced,
  eval: scorecard && { mode: scorecard.mode, total: scorecard.total, deterministicPassRate: scorecard.deterministicPassRate, judgePassRate: scorecard.judgePassRate },
  judgeCalibration: calibration && { n: calibration.n, kappa: calibration.kappa, trusted: calibration.trusted },
  releaseDecision: gate?.decision ?? 'not decided',
};

const icon = (r: (typeof rows)[number]) => (!r.covered ? 'NO TESTS' : r.passing ? 'pass' : 'FAIL');
const md = [
  '# Traceability report',
  '',
  `Context commit: \`${report.context.commit}\` (${report.context.branch}) · prompt \`${report.versions.prompt}\` · judge \`${report.versions.judge}\``,
  `Models: generator \`${report.versions.appModel}\`, judge \`${report.versions.judgeModel}\` · release decision: **${report.releaseDecision}**`,
  '',
  '| Requirement | Rules | Tests | Result |',
  '|---|---|---|---|',
  ...rows.map((r) => `| ${r.requirement} | ${r.rules.join(', ') || '-'} | ${r.tests.length} | ${icon(r)} |`),
  '',
  untraced.length ? `Tests without a requirement tag: ${untraced.length}` : 'Every test is linked to a requirement.',
].join('\n');

mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports/trace-report.json'), JSON.stringify(report, null, 2));
writeFileSync(resolve(root, 'reports/trace-report.md'), md);
console.log(md);

if (strict && (rows.some((r) => !r.covered) || untraced.length > 0)) {
  console.error('\nTraceability gap: a requirement has no test, or a test has no requirement tag.');
  process.exit(1);
}
