import type { RuleId } from '@preclear/contracts';

// Deterministic business rules. docs/business-rules/trading.yaml is the human-owned source;
// tests/unit/rules.spec.ts checks that the IDs here match it.

const RESTRICTED_LIST = ['ACME', 'ZENITH CORP', 'INITECH'];

export function normalise(security: string): string {
  return security.trim().replace(/\s+/g, ' ').toUpperCase();
}

/** BR-007: a security on the restricted list is blocked. Exact match only: "ACME Holdings" is not "ACME". */
export function isRestricted(security: string): boolean {
  return RESTRICTED_LIST.includes(normalise(security));
}

export function rulesTriggered(security: string): RuleId[] {
  return isRestricted(security) ? ['BR-007'] : [];
}
