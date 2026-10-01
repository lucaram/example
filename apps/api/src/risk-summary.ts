import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RiskSummary } from '@preclear/contracts';
import type { PreClearanceRequest } from '@preclear/contracts';
import type { LlmClient } from './llm/client.ts';

export const PROMPT_VERSION = 'risk-summary.v1';

const promptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../prompts/risk-summary.v1.md');

interface PromptParts {
  system: string;
  user: string;
}

export function loadPrompt(): PromptParts {
  const raw = readFileSync(promptPath, 'utf8').replace(/\r\n/g, '\n');
  const system = /<!-- system -->\n([\s\S]*?)<!-- user -->/.exec(raw)?.[1]?.trim();
  const user = /<!-- user -->\n([\s\S]*)$/.exec(raw)?.[1]?.trim();
  if (!system || !user) throw new Error(`Prompt file is missing its system/user markers: ${promptPath}`);
  return { system, user };
}

/** The note is untrusted. Stop it from closing the <note> delimiter and escaping into the prompt. */
export function sanitiseNote(note: string | undefined): string {
  return (note ?? '').replace(/<\/?note>/gi, '[tag removed]');
}

export function buildPrompt(
  req: Pick<PreClearanceRequest, 'security' | 'side' | 'quantity' | 'note' | 'rulesTriggered'>,
): PromptParts {
  const { system, user } = loadPrompt();
  const filled = user
    .replace('{{security}}', () => req.security)
    .replace('{{side}}', () => req.side)
    .replace('{{quantity}}', () => String(req.quantity))
    .replace('{{rules_triggered}}', () => (req.rulesTriggered.length ? req.rulesTriggered.join(', ') : 'none'))
    .replace('{{note}}', () => sanitiseNote(req.note));
  return { system, user: filled };
}

/** Models sometimes wrap JSON in code fences or emit <think> blocks. Strip both, then validate hard. */
export function parseRiskSummary(text: string): RiskSummary {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model output contains no JSON object');
  return RiskSummary.parse(JSON.parse(cleaned.slice(start, end + 1)));
}

export interface SummaryResult {
  summary: RiskSummary;
  model: string;
  promptVersion: string;
  latencyMs: number;
  usage?: { promptTokens: number; completionTokens: number };
}

export async function generateRiskSummary(
  client: LlmClient,
  req: Pick<PreClearanceRequest, 'security' | 'side' | 'quantity' | 'note' | 'rulesTriggered'>,
): Promise<SummaryResult> {
  const prompt = buildPrompt(req);
  const res = await client.complete({ ...prompt, temperature: 0, json: true });
  return {
    summary: parseRiskSummary(res.text),
    model: res.model,
    promptVersion: PROMPT_VERSION,
    latencyMs: res.latencyMs,
    usage: res.usage,
  };
}
