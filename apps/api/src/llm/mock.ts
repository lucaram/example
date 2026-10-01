import type { LlmClient, LlmRequest, LlmResponse } from './client.ts';

// Deterministic fake used by unit tests, e2e and CI. It reads the facts the prompt gives it
// and ignores the free-text note, which is exactly how a well-behaved model should treat it.
export class MockLlmClient implements LlmClient {
  readonly name = 'mock';

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const rules = /Rules triggered: (.*)/.exec(req.user)?.[1]?.trim() ?? 'none';
    const cited = rules === 'none' ? [] : rules.split(',').map((r) => r.trim());
    const restricted = cited.includes('BR-007');
    const body = {
      risk: restricted ? 'high' : 'low',
      reasons: [restricted ? 'The security is on the restricted list.' : 'No business rule was triggered.'],
      citedRules: cited,
    };
    return { text: JSON.stringify(body), model: 'mock-1', latencyMs: 1 };
  }
}
