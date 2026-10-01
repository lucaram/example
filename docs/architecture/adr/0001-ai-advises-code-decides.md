# ADR 0001: The AI advises, deterministic code decides

- Status: accepted
- Owner: architect / tech lead
- Related: BR-007, BR-020, REQ-142, REQ-160

## Context
PreClear serves a regulated use case. A restricted-list decision must be repeatable, explainable and auditable. A language model is none of those on its own.

## Decision
Block and allow decisions come only from deterministic code (`apps/api/src/rules.ts`) and a human officer. The AI produces a risk summary for the officer and never changes a request's status. The deterministic rule results are passed into the prompt as facts ("Rules triggered: BR-007").

## Consequences
- A model failure, hallucination or prompt injection cannot approve or block a trade.
- AI quality is measured on the summary (grounded, injection-safe), not on the decision.
- The summary endpoint can fail (502) and the officer can still decide.
