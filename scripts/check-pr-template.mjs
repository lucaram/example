// Pillar 3: a pull request must say how AI was used, so every AI-assisted change is traceable.
// Reads the PR description from $PR_BODY or from the file given as the first argument.
import { readFileSync } from 'node:fs';

const raw = process.env.PR_BODY ?? (process.argv[2] ? readFileSync(process.argv[2], 'utf8') : '');
const body = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '');
const problems = [];

const field = (label) => new RegExp(`^\\s*-?\\s*${label}:[ \\t]*(.*)$`, 'mi').exec(body)?.[1]?.trim() ?? '';

if (!/^\s*Requirement:[ \t]*(REQ-\d+|none)/mi.test(body)) problems.push('Requirement: must be a REQ-<number>, or "none" for a chore');

const noAi = /-\s*\[x\]\s*No AI used/i.test(body);
if (!noAi) {
  for (const label of ['Agent\\(s\\)', 'Model\\(s\\)', 'Prompt version', 'Context commit', 'Human reviewer of AI-generated tests']) {
    if (!field(label)) problems.push(`AI assistance: "${label.replace(/\\/g, '')}" is empty (tick "No AI used" if none was used)`);
  }
  if (!/https?:\/\//.test(field('Eval run'))) problems.push('Evidence: "Eval run" needs a link to the CI run');
}

if (problems.length) {
  console.error('PR description is incomplete:\n' + problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log(noAi ? 'PR description OK (no AI used).' : 'PR description OK (AI use is recorded).');
