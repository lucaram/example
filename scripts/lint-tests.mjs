// Cheap deterministic lint for (AI-generated) tests. Used by the generate-api-tests skill and CI.
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const problems = [];

for (const file of globSync('tests/{api,e2e}/**/*.spec.ts', { cwd: root })) {
  const text = readFileSync(resolve(root, file), 'utf8');
  const isE2e = file.replaceAll('\\', '/').includes('tests/e2e/');
  if (/waitForTimeout\(/.test(text)) problems.push(`${file}: fixed wait (waitForTimeout). Use web-first assertions.`);
  if (isE2e && /\.locator\(\s*['"`]/.test(text)) problems.push(`${file}: CSS/XPath locator. Use getByRole or getByLabel.`);
  if (/\b\w[\w.+-]*@(?!example\.)\w[\w-]*\.\w+/.test(text.replace(/'@(REQ|BR)-\d+'/g, ''))) problems.push(`${file}: looks like a real email address. Use synthetic data.`);
  const tests = (text.match(/^\s*test\(/gm) ?? []).length;
  const tagged = (text.match(/tag:\s*\[/g) ?? []).length;
  if (tagged < tests) problems.push(`${file}: ${tests - tagged} test(s) have no { tag: ['@REQ-...'] }`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Test lint passed.');
