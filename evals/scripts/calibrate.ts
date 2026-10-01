import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { rulesTriggered } from '../../apps/api/src/rules.ts';
import { JUDGE_VERSION, createJudgeClient, judge, mockJudge } from '../judge.ts';
import { compare } from '../stats.ts';
import type { Label } from '../stats.ts';

// Calibrates the LLM judge against human labels (pillar 2). Reports raw agreement and Cohen's kappa.
// The judge may only become a BLOCKING gate once kappa >= 0.7 on at least 50 labelled items.
const MIN_ITEMS = 50;
const MIN_KAPPA = 0.7;

interface Item {
  id: string;
  request: { security: string; side: string; quantity: number; note?: string };
  summary: string;
  human_label: Label | null;
}

const repoRoot = resolve(import.meta.dirname, '../..');
const goldenDir = resolve(repoRoot, process.env.GOLDEN_DIR ?? '../golden-dataset');
const items = (parse(readFileSync(resolve(goldenDir, 'calibration/judge-labels.yaml'), 'utf8')) as Item[]).filter(
  (i) => i.human_label === 'pass' || i.human_label === 'fail',
);

if (items.length === 0) {
  console.error('No human-labelled items. Fill human_label (pass | fail) in calibration/judge-labels.yaml first.');
  process.exit(1);
}

const mock = process.env.EVAL_MODE === 'mock';
const client = mock ? null : createJudgeClient();
const pauseMs = Number(process.env.EVAL_MIN_INTERVAL_MS ?? 6000);

const judged: Label[] = [];
const human: Label[] = [];
const disagreements: string[] = [];

for (const item of items) {
  const input = {
    ...item.request,
    rulesTriggered: rulesTriggered(item.request.security),
    summaryText: item.summary,
  };
  if (!mock) await new Promise((r) => setTimeout(r, pauseMs));
  const verdict = mock ? mockJudge(input) : await judge(client!, input);
  const label: Label = verdict.pass ? 'pass' : 'fail';
  judged.push(label);
  human.push(item.human_label!);
  if (label !== item.human_label) disagreements.push(item.id);
}

const result = compare(judged, human);
const trusted = !mock && result.n >= MIN_ITEMS && result.kappa >= MIN_KAPPA;

const out = {
  generatedAt: new Date().toISOString(),
  judgeVersion: JUDGE_VERSION,
  judgeModel: mock ? 'mock' : (process.env.JUDGE_MODEL ?? 'openai/gpt-oss-120b'),
  n: result.n,
  agreement: Number(result.agreement.toFixed(3)),
  kappa: Number(result.kappa.toFixed(3)),
  confusion: result.confusion,
  disagreementIds: disagreements,
  trusted,
  mock,
};
mkdirSync(resolve(repoRoot, 'evals/.out'), { recursive: true });
writeFileSync(resolve(repoRoot, 'evals/.out/calibration.json'), JSON.stringify(out, null, 2));

console.log(`Judge ${out.judgeVersion} on ${out.judgeModel}: n=${out.n} agreement=${out.agreement} kappa=${out.kappa}`);
if (disagreements.length) console.log(`Disagreements with the human label: ${disagreements.join(', ')}`);
if (result.n < MIN_ITEMS) console.log(`Only ${result.n} labelled items. Need ${MIN_ITEMS}-100 before the judge may block releases.`);
console.log(trusted ? 'TRUSTED: the judge may be a blocking gate.' : 'NOT TRUSTED yet: keep the judge non-blocking (human review).');
