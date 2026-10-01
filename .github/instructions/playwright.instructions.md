---
applyTo: "tests/e2e/**"
---
- Use role-based locators (getByRole, getByLabel). No CSS or XPath selectors.
- No fixed waits. Rely on Playwright auto-waiting and web-first assertions.
- One behaviour per test, named after the rule it proves.
- Tag every test with its requirement and rule IDs: `{ tag: ['@REQ-142', '@BR-007'] }`.
- Set the acting user with the `preclear.actor` localStorage key (see tests/e2e/pre-clearance.spec.ts), not by clicking through setup.
- Reset state in `beforeEach` with POST /__test/reset.
