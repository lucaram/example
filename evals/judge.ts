import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LlmClient } from '../apps/api/src/llm/client.ts';
import { GroqClient } from '../apps/api/src/llm/groq.ts';
import { DEFAULT_JUDGE_MODEL } from '../apps/api/src/llm/index.ts';
import { parseRiskSummary } from '../apps/api/src/risk-summary.ts';

// The SAME judge is used in CI (via asserts.mjs) and in calibration (scripts/calibrate.ts),
// so the agreement rate we report is the agreement rate of the judge that gates releases.

export const JUDGE_VERSION = 'rubric.v1';

export interface JudgeInput {
  security: string;
  side: string;
  quantity: number;
  note?: string;
  rulesTriggered: string[];
  summaryText: string;
}

export interface JudgeVerdict {
  pass: boolean;
  reason: string;
}

function loadRubric() {
  const raw = readFileSync(resolve(import.meta.dirname, 'judge/rubric.v1.md'), 'utf8').replace(/\r\n/g, '\n');
  const system = /<!-- system -->\n([\s\S]*?)<!-- user -->/.exec(raw)?.[1]?.trim() ?? '';
  const user = /<!-- user -->\n([\s\S]*)$/.exec(raw)?.[1]?.trim() ?? '';
  return { system, user };
}

export function createJudgeClient(env: NodeJS.ProcessEnv = process.env): LlmClient {
  const key = env.GROQ_API_KEY;
  if (!key) throw new Error('The judge needs GROQ_API_KEY (see .env.example)');
  return new GroqClient(key, env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL);
}

export async function judge(client: LlmClient, input: JudgeInput): Promise<JudgeVerdict> {
  const { system, user } = loadRubric();
  const filled = user
    .replace('{{security}}', () => input.security)
    .replace('{{side}}', () => input.side)
    .replace('{{quantity}}', () => String(input.quantity))
    .replace('{{note}}', () => input.note || '(none)')
    .replace('{{rules_triggered}}', () => (input.rulesTriggered.length ? input.rulesTriggered.join(', ') : 'none'))
    .replace('{{summary}}', () => input.summaryText);
  const res = await client.complete({ system, user: filled, temperature: 0, json: true });
  const text = res.text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Judge returned no JSON');
  const parsed = JSON.parse(text.slice(start, end + 1)) as { pass?: unknown; reason?: unknown };
  if (typeof parsed.pass !== 'boolean') throw new Error('Judge JSON has no boolean "pass"');
  return { pass: parsed.pass, reason: String(parsed.reason ?? '').slice(0, 200) };
}

/** Offline stand-in for plumbing checks (EVAL_MODE=mock). It proves wiring, not quality. */
export function mockJudge(input: JudgeInput): JudgeVerdict {
  try {
    const s = parseRiskSummary(input.summaryText);
    const grounded = s.citedRules.every((r) => input.rulesTriggered.includes(r));
    return { pass: grounded, reason: grounded ? 'all criteria met (mock)' : 'cites a rule that was not triggered (mock)' };
  } catch {
    return { pass: false, reason: 'summary is not valid (mock)' };
  }
}
