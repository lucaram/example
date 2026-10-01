// Provider-neutral LLM interface. The pipeline never depends on one vendor:
// swapping Groq for Claude or Gemini means adding one class here and changing config.

export interface LlmRequest {
  system: string;
  user: string;
  temperature?: number;
  json?: boolean;
}

export interface LlmResponse {
  text: string;
  model: string;
  latencyMs: number;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LlmClient {
  readonly name: string;
  complete(req: LlmRequest): Promise<LlmResponse>;
}
