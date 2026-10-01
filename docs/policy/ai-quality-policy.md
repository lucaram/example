# AI quality policy (draft v0.1)

Owner: Security and Compliance. Demo policy for PreClear, not StarCompliance policy.

## 1. Scope
Any change produced or assisted by an AI agent, and the AI feature inside the product.

## 2. Roles of AI
- The AI feature is advisory only and never decides (BR-020, ADR 0001).
- AI agents may read the repository and run tests locally. They may not change production resources or merge to protected branches.
- Human review is required before merge for all AI-generated tests and code.

## 3. Data handling
- Only synthetic or anonymised data in prompts, tests, fixtures and golden cases. No real client or employee data.
- Free-tier model providers may use inputs for training, which is why real data is not allowed.
- Only approved models and providers may be used. Approved for this demo: Groq (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`) and the Claude coding agent in the developer's IDE.
- Secrets live in `.env` (local, ignored) or GitHub secrets. They never appear in prompts, logs, hooks, instructions or context files.

## 4. Prompt injection
- Free text from users, tickets or test data is untrusted data, never instructions.
- Untrusted text is delimited and sanitised before it reaches a prompt.
- Every new injection technique becomes a golden case.

## 5. Dependencies and code
- New direct dependencies need Security approval (`docs/policy/dependency-allowlist.json`).
- Every change runs secret scanning, CodeQL and `npm audit`.
- Generated code must keep the licence of the project. Do not paste code of unknown origin.

## 6. Agent permissions
| Capability | Allowed |
|---|---|
| Read repository, docs, tests | yes |
| Edit `tests/`, `evals/` (via human-reviewed PR) | yes |
| Edit `docs/business-rules/`, `docs/contracts/` | only with explicit human approval (hook asks) |
| Read the golden dataset | never (denied by settings and hook) |
| Read `.env` | never |
| Merge to `main`, change production, change branch protection | never |

## 7. Human review thresholds
A person must review before release when: the judge is not calibrated, the judge pass rate is between 80% and 90%, mutation score is between 60 and 70, or the change touches rules, prompts or permissions.

## 8. Traceability and audit
Every AI-assisted PR records agent, model, prompt version, context commit and eval run (`pull_request_template.md`, enforced by `traceability.yml`). Agent tool calls are logged by the hook to `.audit/`. `scripts/trace-report.ts` links requirement, rules, tests and results.

## 9. Incidents
A production failure or an officer's thumbs-down becomes a candidate golden case (`npm run feedback:to-cases`), reviewed by the Product Owner.
