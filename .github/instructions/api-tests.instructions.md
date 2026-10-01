---
applyTo: "tests/api/**"
---
- Use Playwright's `request` fixture. Identity headers come from tests/fixtures/actors.ts.
- Cover, for each endpoint: success, validation (400), missing identity (401), wrong role (403), unknown id (404), state conflict (409).
- Parse successful responses with the Zod schemas from `@preclear/contracts` so the test fails if the contract drifts.
- Reset state in `beforeEach` with POST /__test/reset.
- Never assert on values copied from the golden dataset (you cannot see it). Take expected results from docs/business-rules/ only.
