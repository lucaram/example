import type { LlmClient } from './client.ts';
import { GroqClient } from './groq.ts';
import { MockLlmClient } from './mock.ts';

export type { LlmClient } from './client.ts';

export const DEFAULT_APP_MODEL = 'qwen/qwen3.8-27b';
export const DEFAULT_JUDGE_MODEL = 'openai/gpt-oss-120b';

export function createLlmClient(env: NodeJS.ProcessEnv = process.env): LlmClient {
  if ((env.LLM_MODE ?? 'mock') === 'live') {
    const key = env.GROQ_API_KEY;
    if (!key) throw new Error('LLM_MODE=live needs GROQ_API_KEY (see .env.example)');
    return new GroqClient(key, env.LLM_MODEL ?? DEFAULT_APP_MODEL);
  }
  return new MockLlmClient();
}
