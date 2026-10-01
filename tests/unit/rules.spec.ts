import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { RULE_IDS } from '@preclear/contracts';
import { isRestricted, normalise, rulesTriggered } from '../../apps/api/src/rules.ts';

describe('BR-007 restricted list', () => {
  it('matches a restricted security', () => {
    expect(isRestricted('ACME')).toBe(true);
    expect(rulesTriggered('ACME')).toEqual(['BR-007']);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(isRestricted('  acme ')).toBe(true);
  });

  it('does not match a similar name (the tricky edge)', () => {
    expect(isRestricted('ACME Holdings')).toBe(false);
    expect(rulesTriggered('ACME Holdings')).toEqual([]);
  });

  it('does not match an unrelated security', () => {
    expect(isRestricted('GLOBEX')).toBe(false);
  });

  it.each(['ACME', 'ZENITH CORP', 'INITECH'])('every restricted name is blocked: %s', (name) => {
    expect(isRestricted(name)).toBe(true);
    expect(rulesTriggered(name)).toEqual(['BR-007']);
  });

  it('collapses inner whitespace and ignores case', () => {
    expect(normalise('  zenith    corp ')).toBe('ZENITH CORP');
    expect(isRestricted('zenith    corp')).toBe(true);
  });

  it('does not match a partial name', () => {
    expect(isRestricted('ZENITH')).toBe(false);
    expect(isRestricted('ZENITH CORP LTD')).toBe(false);
    expect(isRestricted('')).toBe(false);
  });
});

describe('context stays in sync with code (pillar 1)', () => {
  it('rule IDs in the contract equal the IDs in docs/business-rules/trading.yaml', () => {
    const yamlPath = resolve(import.meta.dirname, '../../docs/business-rules/trading.yaml');
    const rules = parse(readFileSync(yamlPath, 'utf8')) as { id: string }[];
    expect(rules.map((r) => r.id).sort()).toEqual([...RULE_IDS].sort());
  });
});
