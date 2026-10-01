# ADR 0002: Provider-neutral LLM client on free tiers

- Status: accepted
- Owner: architect / tech lead
- Related: pillar 2 (evals), pillar 4 (gates)

## Context
This is a learning project with no API budget. The plan also says the pipeline must not depend on one vendor, and that the judge should be a different model from the generator.

## Decision
- `LlmClient` (`apps/api/src/llm/client.ts`) is the only way the app talks to a model. Implementations: Groq (free tier), and a deterministic mock for tests and CI.
- Generator: `qwen/qwen3.8-27b`. Judge: `openai/gpt-oss-120b`. Both are configurable (`LLM_MODEL`, `JUDGE_MODEL`) and are recorded in the scorecard and trace report. Check current free model ids with `npm run llm:models`.
- Unit, API and UI tests always use the mock. Only `evals.yml` calls a real model.
- Eval calls are throttled and retried on 429 because free tiers are rate limited.

## Consequences
- Free to run. Switching to Claude, Gemini or another provider is one new class plus config.
- Free-tier models change. Pin ids in repo variables, and re-run the golden dataset and judge calibration before switching.
- Free-tier data may be used for provider training: only synthetic data is allowed (see the AI quality policy).
