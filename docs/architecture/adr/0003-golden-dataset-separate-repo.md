# ADR 0003: The golden dataset lives in a separate private repository

- Status: accepted
- Owner: AI Quality Engineering lead
- Related: pillar 2, pillar 3

## Context
A golden dataset pairs inputs with confirmed answers. If an agent can read the answers it can pass the eval without being right. This repo is public.

## Decision
- Golden cases live in `lucaram/golden-dataset` (private). CI reads it with a read-only fine-grained token (`GOLDEN_READ_TOKEN`).
- Agents are blocked from it by deny rules in `.claude/settings.json` and by `.github/hooks/protect-owned-files.cjs`.
- CI never prints or uploads anything that contains expected answers: promptfoo output is discarded and only a scorecard of case IDs and pass/fail is published (`scripts/eval-summary.mjs`).
- Cases start as `status: draft`. A Product Owner sets `approved`. Only approved cases gate anything.

## Consequences
- The expected answers are not visible to agents working in this repo or to people reading the public repo.
- Anyone with access to the private repo can see them: access is the control.
- Real StarCompliance use should add stricter access reviews and an audit log on the golden repo.
