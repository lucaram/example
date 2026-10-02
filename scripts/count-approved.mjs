// Counts what is ready to gate in the golden dataset. Prints and exports COUNTS ONLY, never content.
// CI uses this to run a step only when it has approved cases (or labelled items) to run, and to let it fail hard then.
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '..');
const goldenDir = resolve(root, process.env.GOLDEN_DIR ?? '../golden-dataset');
const load = (file) => (existsSync(file) ? (parse(readFileSync(file, 'utf8')) ?? []) : []);

const productDir = resolve(goldenDir, 'product');
const product = existsSync(productDir)
  ? readdirSync(productDir).filter((f) => f.endsWith('.yaml')).flatMap((f) => load(resolve(productDir, f)))
  : [];
const engineering = load(resolve(goldenDir, 'engineering/cases.yaml'));
const calibration = load(resolve(goldenDir, 'calibration/judge-labels.yaml'));

const counts = {
  product: product.filter((c) => c.status === 'approved').length,
  engineering: engineering.filter((c) => c.status === 'approved').length,
  calibration: calibration.filter((i) => i.human_label === 'pass' || i.human_label === 'fail').length,
};

console.log(`Ready to gate: product=${counts.product}, engineering=${counts.engineering}, labelled calibration items=${counts.calibration}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(counts).map(([k, v]) => `${k}=${v}\n`).join(''));
}
