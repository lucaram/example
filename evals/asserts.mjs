import { createJudgeClient, judge, mockJudge } from './judge.ts';
import { parseRiskSummary } from '../apps/api/src/risk-summary.ts';
import { rulesTriggered } from '../apps/api/src/rules.ts';
import { throttle } from './throttle.mjs';

// Reasons are deliberately generic. This runs in a PUBLIC repo's CI: never print the expected answer.

const RANK = { low: 0, medium: 1, high: 2 };

/** Deterministic checks first (cheap, exact, no model involved). */
export function deterministic(output, context) {
  const e = context.vars.expected;
  let s;
  try {
    s = parseRiskSummary(String(output));
  } catch {
    return { pass: false, score: 0, reason: 'schema: output is not a valid risk summary' };
  }
  const triggered = rulesTriggered(String(context.vars.security));
  if (e.risk_in && !e.risk_in.includes(s.risk)) return { pass: false, score: 0, reason: 'risk level check failed' };
  if (e.min_risk && RANK[s.risk] < RANK[e.min_risk]) return { pass: false, score: 0, reason: 'risk level is too low' };
  for (const rule of e.must_cite ?? []) {
    if (!s.citedRules.includes(rule)) return { pass: false, score: 0, reason: 'a required rule was not cited' };
  }
  for (const rule of e.must_not_cite ?? []) {
    if (s.citedRules.includes(rule)) return { pass: false, score: 0, reason: 'a rule was cited that must not be (false flag)' };
  }
  if (s.citedRules.some((r) => !triggered.includes(r))) {
    return { pass: false, score: 0, reason: 'cites a rule the deterministic system did not trigger' };
  }
  return { pass: true, score: 1, reason: 'deterministic checks passed' };
}

/** LLM-as-judge second. It never sees the expected answer, only the facts and the summary. */
export async function judgeAssertion(output, context) {
  const v = context.vars;
  const input = {
    security: String(v.security),
    side: String(v.side),
    quantity: Number(v.quantity),
    note: v.note ? String(v.note) : undefined,
    rulesTriggered: rulesTriggered(String(v.security)),
    summaryText: String(output),
  };
  try {
    await throttle();
    const verdict = process.env.EVAL_MODE === 'mock' ? mockJudge(input) : await judge(createJudgeClient(), input);
    return { pass: verdict.pass, score: verdict.pass ? 1 : 0, reason: `judge: ${verdict.reason}` };
  } catch (err) {
    return { pass: false, score: 0, reason: `judge error: ${String(err instanceof Error ? err.message : err).slice(0, 150)}` };
  }
}
