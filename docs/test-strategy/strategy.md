# Test strategy

Owner: AI Quality Engineering lead. Thresholds: [gates.md](gates.md) and [gates.json](gates.json).

## Test levels
| Level | Tool | Owner | What it proves | Model calls |
|---|---|---|---|---|
| Unit | Vitest (`tests/unit`) | Software engineers | Rules, prompt building, output parsing, statistics | none (mock) |
| API | Playwright `request` (`tests/api`) | AI Quality Engineers | Every endpoint: success, 400, 401, 403, 404, 409, and contract shape | none (mock) |
| UI / critical journey | Playwright (`tests/e2e`) | AI Quality Engineers | Employee submits, officer reviews, AI advice shown, access denied | none (mock) |
| Mutation | Stryker | AI Quality Engineers | Do the unit tests catch bugs in the rules and parser? | none |
| Performance | k6 smoke | DevOps | p95 latency on `POST /requests` | none |
| Security | CodeQL, gitleaks, `npm audit`, dependency allow-list | Security | Vulnerable code, secrets, hallucinated or unapproved packages | none |
| AI product evals | Promptfoo + judge (`evals/`) | AI Quality Engineers | The risk summary is correct, grounded and injection-safe | live (free tier) |
| AI engineering evals | `evals/engineering/check-tests.mjs` | AI Quality Engineers | AI-generated tests contain what the golden checks demand | none |

## Principles
1. Deterministic checks first, then the LLM judge. The judge never sees the expected answer.
2. Tests are tagged `@REQ-` and `@BR-`. A requirement without a test, or a test without a requirement, fails the traceability report.
3. Real model calls only happen in `evals.yml`. Everything else is mocked, so it is fast, free and stable.
4. No retries on Playwright tests: a retry hides flakiness, and flaky rate is a success measure.
5. The judge is non-blocking until it agrees with human labels (kappa >= 0.7 on at least 50 items).

## Risk map
See [risk-map.md](risk-map.md).
