# Playbook: working the PreClear way
The policy is written for people, and nothing feeds them to an agent automatically.

Purpose: a practical how-to for the team: add a feature, add a golden case, read a failed gate, calibrate the judge, set up GitHub.

Who should own it: AI Quality Engineers and AI champions, who keep it up to date as the process changes.

Status here: also drafted by me. A human should read it, run through it once and fix anything that doesn't match reality.

The general rule for this project: AI can draft this document, but a human must own and approve. That's why CODEOWNERS lists docs/policy/ for review.

For engineers and AI champions. Short on purpose.

## 1. Add a feature
1. Write the requirement as Gherkin in `docs/requirements/`, tagged `@REQ-nnn` (and `@rule-BR-nnn`). A Product Owner reviews it.
2. If it adds a rule, add it to `docs/business-rules/trading.yaml` and `RULE_IDS` in `packages/contracts/src/index.ts`. A unit test fails if they differ.
3. Change the contract in `packages/contracts/src/index.ts`, run `npm run contracts:build`, and have the owner review `docs/contracts/openapi.yaml`.
4. Ask the QE Planner agent for scenarios, review them, then the Test Writer for tests, then the Test Reviewer. You approve each handoff.
5. Run `npm run lint:tests`, `npm run test:unit`, `npm run build && npm run test:api && npm run test:e2e`, `npm run trace -- --strict`.
6. Open a PR and fill the AI assistance section honestly.

## 2. Add a golden case (private repo)
1. In `golden-dataset/product/*.yaml` add the input and the expected result. Use the clear match, the clear non-match and the tricky edge for each rule.
2. Leave `status: draft`. A Product Owner or compliance expert reviews it and sets `status: approved`.
3. Never copy a golden case into this repo, an issue, a PR comment or a chat with an agent.

## 3. Read a failed gate
| You see | Meaning | Do this |
|---|---|---|
| `HOLD: deterministic checks 9x%` | A schema, rule or injection check failed | Open the scorecard, note the failed case IDs, reproduce locally with `npm run eval` |
| `HOLD: AI-generated test checks failed: ENG-00x` | A generated test is missing something required | Ask the Test Writer to cover that category; do not ask it for the golden check itself |
| `HOLD: mutation score` | Tests do not catch bugs | Add tests for the surviving mutants in `reports/mutation` |
| `HOLD: p95 latency` | Too slow | Profile the endpoint |
| `REVIEW: LLM judge is not calibrated` | The judge cannot decide alone yet | A human reviews the release; the team calibrates the judge |
| `REVIEW: judge pass rate in the human-review band` | Quality is borderline | A human reads the failing summaries before approving |

## 4. When a human must review
Always for: changes to rules, prompts, permissions, contracts or the gate thresholds; any AI-generated test before merge; any release in the human-review band.

## 5. Calibrate the judge
1. Open `golden-dataset/calibration/judge-labels.yaml`.
2. For each item, apply `evals/judge/rubric.v1.md` yourself and fill `human_label: pass|fail`. Aim for 50 to 100 items, including tricky ones.
3. Run `npm run eval:calibrate`. It prints agreement and kappa and writes `evals/.out/calibration.json`.
4. If kappa >= 0.7, set the repo variable `EVALS_BLOCKING=true`. If not, improve the rubric, bump its version, and calibrate again.

## 6. Close the production loop
Officers flag a wrong summary in the UI. Run `npm run feedback:to-cases` to create candidates in `golden-dataset/candidates/`. A Product Owner completes `expected`, reviews and approves them.

## 7. One-time GitHub setup
In the `example` repo, Settings:
- **Secrets and variables > Actions > Secrets**: `GROQ_API_KEY` (free key from console.groq.com), `GOLDEN_READ_TOKEN` (fine-grained token, read-only Contents, only for `lucaram/golden-dataset`).
- **Variables** (optional): `LLM_MODEL`, `JUDGE_MODEL`, `EVAL_INCLUDE_DRAFTS` (`true` until the Product Owner approves cases), `EVALS_BLOCKING` (leave unset until the judge is calibrated).
- **Environments**: `production-sim` (no reviewers) and `compliance-review` (required reviewer: yourself).
- **Branches > main**: require a PR, require status checks (`Static checks and security`, `Unit tests`, `Playwright API and UI tests`, `Mutation score`, `Performance smoke`), require review from Code Owners. Branch protection is free on public repos.
- **Actions > General**: do not enable "send secrets to workflows from fork pull requests".
