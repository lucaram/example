# PreClear

A small personal-trade pre-clearance app, built to demonstrate AI quality engineering with the seven pillars of the 30-60-90 plan.
An employee asks to trade a security. Deterministic code checks the restricted list (BR-007). A compliance officer decides. An AI assistant writes an advisory risk summary and never decides (BR-020).

Stack: Next.js (React) · Node + Fastify · Playwright · Vitest · Stryker · k6 · GitHub Actions · Promptfoo + LLM-as-judge (Groq free tier).

## Run it
```
npm install
npm run dev:api          # http://127.0.0.1:4000  (mock AI by default)
npm run dev:web          # http://127.0.0.1:3000
```
Use the "Acting as" menu to switch between an employee and a compliance officer. Try `ACME` (blocked) and `ACME Holdings` (allowed).

To use the real model for the AI summary: copy `.env.example` to `.env`, add a free `GROQ_API_KEY`, set `LLM_MODE=live`.

## Test it
```
npm run typecheck && npm run test:unit
npm run build && npm run test:api && npm run test:e2e   # Playwright starts both servers itself
npm run test:mutation                                   # does the test suite catch bugs?
npm run lint:tests && npm run contracts:check && npm run deps:check
```

## Evaluate the AI (needs the private golden repo)
```
git clone https://github.com/lucaram/golden-dataset ../golden-dataset
npm run llm:models                  # which free models can my key use?
npm run eval && npm run eval:summary
npm run eval:engineering
npm run eval:calibrate              # judge vs human labels (kappa)
npm run gate && npm run trace && npm run dashboard
```
No key yet? `EVAL_MODE=mock` runs the whole eval pipeline offline (it proves the wiring, not model quality). Golden cases start as `draft`; use `EVAL_INCLUDE_DRAFTS=1` until a Product Owner approves them.

## The seven pillars, where they live
| Pillar | Where |
|---|---|
| 1. Versioned context | `docs/` (requirements, business rules, ADRs, contract, test strategy), `AGENTS.md`, `.github/agents|instructions|skills` |
| 2. Evals | `evals/` (Promptfoo config, provider, deterministic asserts, judge, calibration), golden data in the private repo |
| 3. Traceability and governance | `scripts/trace-report.ts`, `pull_request_template.md`, `traceability.yml`, `docs/policy/`, `.github/hooks/`, `.claude/settings.json` |
| 4. Quality and release gates | `.github/workflows/`, `docs/test-strategy/gates.*`, `scripts/release-gate.mjs`, k6, Stryker, CodeQL, gitleaks |
| 5. Production intelligence | structured API logs (model, prompt version, latency, tokens), officer feedback, `scripts/flag-to-case.mjs`, `scripts/dashboard.mjs` |
| 6. People and enablement | `docs/playbook/`, workflow pulse issue form |
| 7. Operating model | `.github/CODEOWNERS` and the table below |

## Ownership
| Role | Owns |
|---|---|
| Product Owner | `docs/requirements/`, `docs/business-rules/`, golden-case approval |
| Software engineers | `apps/`, unit tests, prompts (with an eval run) |
| AI Quality Engineers | `tests/`, `evals/`, golden dataset, judge calibration, test strategy and gates |
| DevOps | `.github/workflows/`, environments |
| Security and Compliance | `docs/policy/`, agent permissions, hooks, dependency allow-list |

Setup steps for GitHub (secrets, environments, branch protection): [docs/playbook](docs/playbook/README.md#7-one-time-github-setup).
