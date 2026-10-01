---
name: generate-api-tests
description: Generate Playwright API tests from the OpenAPI contract, covering success, validation and permission cases.
---
1. Read the endpoint in docs/contracts/openapi.yaml and the rules it cites in docs/business-rules/.
2. Copy template.spec.ts from this folder to tests/api/ and fill one test per response code (200/201, 400, 401, 403, 404, 409 where the contract lists them).
3. Tag each test with the requirement and rule IDs.
4. Run `npm run lint:tests` and fix every finding, then `npm run test:api`.
