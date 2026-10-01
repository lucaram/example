import type { LlmClient, LlmRequest, LlmResponse } from './client.ts';

const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Groq exposes an OpenAI-compatible endpoint. Free tier: https://console.groq.com
export class GroqClient implements LlmClient {
  readonly name = 'groq';
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const started = Date.now();
    for (let attempt = 1; ; attempt++) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          temperature: req.temperature ?? 0,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
          ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      // Free tiers are rate limited (429). Wait as long as the provider asks, then try again.
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000, 30_000));
        continue;
      }
      if (!res.ok) {
        // Never echo headers or the key. Status and the provider's message are enough.
        throw new Error(`Groq request failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
      }
      const body = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      return {
        text: body.choices[0]?.message.content ?? '',
        model: this.model,
        latencyMs: Date.now() - started,
        usage: body.usage
          ? { promptTokens: body.usage.prompt_tokens, completionTokens: body.usage.completion_tokens }
          : undefined,
      };
    }
  }
}
