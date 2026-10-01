# Quality and release gates

The machine-readable version is [gates.json](gates.json), read by `scripts/release-gate.mjs`. Change both together.

## Decision rules
- **Promote**: every check is green and the judge is trusted.
- **Human review**: nothing is broken, but a person must look (judge not calibrated yet, judge or mutation score in the grey zone). In `release.yml` this waits on the `compliance-review` environment.
- **Hold**: a deterministic check failed, evidence is missing, or an eval ran in mock mode. The release job fails.

## Thresholds
| Check | Promote | Human review | Hold |
|---|---|---|---|
| Deterministic eval checks (schema, rules, injection) | 100% | - | below 100% |
| Provider errors during evals | 0 | - | any |
| LLM judge pass rate | >= 90% | 80% to 90% | below 80% |
| Judge trusted (kappa >= 0.7 on >= 50 human labels) | yes | not yet | - |
| AI-generated test checks (engineering track) | all pass | - | any fail |
| Mutation score on business logic | >= 70 | 60 to 70 | below 60 |
| k6 p95 latency on `POST /requests` | < 300 ms | - | >= 300 ms |
| Secrets, high-severity vulnerabilities, unapproved dependency | none | - | any |
| Requirements without a tagged test | none | - | any |

## Rollout of the judge
1. Non-blocking: the scorecard is reported only (`EVALS_BLOCKING` unset).
2. Calibrate: label 50 to 100 items in `calibration/judge-labels.yaml`, run `npm run eval:calibrate`.
3. Blocking: when kappa >= 0.7, set the repo variable `EVALS_BLOCKING=true`.
