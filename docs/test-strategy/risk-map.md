# Risk map

| Risk | Impact | Likelihood | Controls |
|---|---|---|---|
| A restricted trade is allowed | High (regulatory) | Low | BR-007 in deterministic code; unit, API, UI tests; mutation tests on `rules.ts`; AI cannot change status (BR-020) |
| A similar name is wrongly blocked (false flag) | Medium (friction) | Medium | Edge cases in tests and golden dataset (`ACME Holdings`) |
| Employee performs an officer action | High | Low | BR-012 enforced server-side; API and UI permission tests |
| Prompt injection through the free-text note | High | Medium | Note is delimited and sanitised; deterministic rules passed as facts; injection cases in the golden dataset; judge criterion 4 |
| The AI cites a rule that did not fire, or invents reasons | Medium | Medium | Parser rejects unknown rule IDs; deterministic eval check; judge criteria 1 and 2 |
| Model or prompt change silently changes behaviour | Medium | Medium | Pinned model ids; prompt versioned in a file; evals re-run on any change to prompts, rules or `evals/` |
| LLM judge is wrong or inconsistent | Medium | Medium | Calibration against human labels; judge versioned; deterministic checks first; judge cannot block until trusted |
| AI-generated tests are weak | Medium | Medium | Test lint; engineering golden checks; mutation score; human review before merge |
| Secrets or personal data leak into prompts or logs | High | Low | Synthetic data only; `.env` ignored; gitleaks; logs hold model and token counts, never prompts or notes |
| Hallucinated or malicious dependency | High | Low | Dependency allow-list; `npm audit`; CodeQL |
| Golden answers leak | Medium | Low | Separate private repo; agent deny rules and hook; no raw results uploaded in public CI |
