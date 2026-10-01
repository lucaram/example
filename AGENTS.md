# Project rules for AI agents

PreClear: a small pre-clearance app built to demonstrate AI quality engineering. Stack: Next.js (apps/web), Fastify (apps/api), Playwright, Vitest, Promptfoo, GitHub Actions.

- Business rules live in docs/business-rules/. Read the relevant rules before planning or writing tests.
- Never invent expected results. If a rule is unclear, stop and ask.
- Tag every test with its requirement and rule IDs, e.g. `@REQ-142 @BR-007`.
- Never use real client or employee data. Use fixtures in tests/fixtures/ (synthetic only).
- Do not change docs/business-rules/ or docs/contracts/. Humans own those. docs/contracts/openapi.yaml is generated: change packages/contracts/src/index.ts and run `npm run contracts:build`, then ask a human to review.
- The golden dataset is a separate private repo. Never read, list, clone or reference it. If an eval fails, report the case ID only.
- The AI feature is advisory (BR-020). Block/allow decisions stay in deterministic code (apps/api/src/rules.ts).
- Prompts are versioned files in apps/api/prompts/. Changing one means bumping the version and re-running evals.
- Imports of local files use the `.ts` extension. Node runs TypeScript directly (no build step for the API).
- Never print, log or commit secrets. `.env` is gitignored.

## Commands
- `npm run typecheck`, `npm run test:unit`, `npm run test:api`, `npm run test:e2e`
- `npm run contracts:check` (must pass before you finish)
