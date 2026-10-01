// Dependency allow-list (risk: hallucinated or malicious packages added by an AI agent).
// A new direct dependency fails CI until a human adds it to docs/policy/dependency-allowlist.json.
//   node scripts/check-deps.mjs            check
//   node scripts/check-deps.mjs --update   regenerate the list FOR HUMAN REVIEW
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const listFile = resolve(root, 'docs/policy/dependency-allowlist.json');
const manifests = ['package.json', 'apps/api/package.json', 'apps/web/package.json', 'packages/contracts/package.json'];

const used = new Set();
for (const m of manifests) {
  const pkg = JSON.parse(readFileSync(resolve(root, m), 'utf8'));
  for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]) {
    if (!name.startsWith('@preclear/')) used.add(name);
  }
}

if (process.argv.includes('--update')) {
  mkdirSync(dirname(listFile), { recursive: true });
  writeFileSync(
    listFile,
    JSON.stringify({ _comment: 'Approved direct dependencies. Owner: Security. Changes need review (CODEOWNERS).', approved: [...used].sort() }, null, 2) + '\n',
  );
  console.log(`Wrote ${used.size} packages. A human must review this file before merging.`);
} else {
  const approved = new Set(JSON.parse(readFileSync(listFile, 'utf8')).approved);
  const unapproved = [...used].filter((n) => !approved.has(n)).sort();
  if (unapproved.length) {
    console.error(`Unapproved dependencies: ${unapproved.join(', ')}\nAsk Security to add them to docs/policy/dependency-allowlist.json after review.`);
    process.exit(1);
  }
  console.log(`All ${used.size} direct dependencies are on the allow-list.`);
}
