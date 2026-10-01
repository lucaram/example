import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// Loads the golden dataset from a SEPARATE private repo, cloned outside this workspace.
// Agents never see these files (see AGENTS.md and .claude/settings.json).
const repoRoot = resolve(import.meta.dirname, '..');
const goldenDir = resolve(repoRoot, process.env.GOLDEN_DIR ?? '../golden-dataset');

export default function generateTests() {
  const dir = resolve(goldenDir, 'product');
  if (!existsSync(dir)) {
    throw new Error('Golden dataset not found. Set GOLDEN_DIR to a clone of the golden-dataset repo (see docs/playbook).');
  }
  const includeDrafts = process.env.EVAL_INCLUDE_DRAFTS === '1' || process.env.EVAL_INCLUDE_DRAFTS === 'true';
  const cases = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .flatMap((f) => parse(readFileSync(resolve(dir, f), 'utf8')) ?? []);

  const selected = cases.filter((c) => includeDrafts || c.status === 'approved');
  if (selected.length === 0) {
    throw new Error('No approved golden cases. A Product Owner must set status: approved (or use EVAL_INCLUDE_DRAFTS=1 locally).');
  }
  return selected.map((c) => ({
    // The description is public (it appears in summaries): ID and category only, never content.
    description: `${c.id} ${c.category}`,
    vars: {
      id: c.id,
      category: c.category,
      security: c.input.security,
      side: c.input.side ?? 'buy',
      quantity: c.input.quantity ?? 100,
      note: c.input.note ?? '',
      expected: c.expected,
    },
  }));
}
