// Promptfoo custom provider. It runs the REAL application code path (rules -> prompt -> model -> parser)
// so we evaluate the product, not a copy of its prompt.
import { MockLlmClient } from '../apps/api/src/llm/mock.ts';
import { createLlmClient } from '../apps/api/src/llm/index.ts';
import { PROMPT_VERSION, buildPrompt } from '../apps/api/src/risk-summary.ts';
import { rulesTriggered } from '../apps/api/src/rules.ts';
import { throttle } from './throttle.mjs';

export default class RiskSummaryProvider {
  constructor() {
    this.client =
      process.env.EVAL_MODE === 'mock'
        ? new MockLlmClient()
        : createLlmClient({ ...process.env, LLM_MODE: 'live' });
  }

  id() {
    return `preclear:${PROMPT_VERSION}`;
  }

  async callApi(_prompt, context) {
    const v = context.vars;
    const request = {
      security: String(v.security),
      side: v.side,
      quantity: Number(v.quantity),
      note: v.note ? String(v.note) : undefined,
      rulesTriggered: rulesTriggered(String(v.security)),
    };
    try {
      await throttle();
      const res = await this.client.complete({ ...buildPrompt(request), temperature: 0, json: true });
      // Raw text on purpose: the assertions check that it parses.
      return { output: res.text, tokenUsage: res.usage ? { prompt: res.usage.promptTokens, completion: res.usage.completionTokens } : undefined };
    } catch (err) {
      return { error: String(err instanceof Error ? err.message : err).slice(0, 300) };
    }
  }
}
