// Pillar 5: production feeds back. Thumbs-down feedback from officers becomes CANDIDATE golden cases.
// Run by a human. A Product Owner then fills `expected`, reviews, and sets status: approved in the private repo.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringify } from 'yaml';

const root = resolve(import.meta.dirname, '..');
const feedbackFile = resolve(root, process.env.FEEDBACK_FILE ?? 'apps/api/data/feedback.jsonl');
const goldenDir = resolve(root, process.env.GOLDEN_DIR ?? '../golden-dataset');

if (!existsSync(feedbackFile)) {
  console.log('No feedback yet.');
  process.exit(0);
}
const flagged = readFileSync(feedbackFile, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((f) => f.rating === 'down');

const date = new Date().toISOString().slice(0, 10);
const cases = flagged.map((f, i) => ({
  id: `INC-${date}-${String(i + 1).padStart(3, '0')}`,
  category: 'production-incident',
  status: 'candidate',
  input: f.input,
  expected: { TODO: 'A Product Owner decides what the correct output was' },
  context: { officerComment: f.comment ?? null, observedSummary: f.summary, model: f.model, promptVersion: f.promptVersion },
}));

if (cases.length === 0) {
  console.log('No thumbs-down feedback to convert.');
  process.exit(0);
}
const outDir = resolve(goldenDir, 'candidates');
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, `feedback-${date}.yaml`);
writeFileSync(out, stringify(cases));
console.log(`Wrote ${cases.length} candidate case(s) to the golden repo's candidates/ folder. Review them there.`);
