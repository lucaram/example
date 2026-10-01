# ADR 0004: Node runs TypeScript directly in the API

- Status: accepted
- Owner: tech lead

## Decision
The API, eval scripts and tests run TypeScript with Node 24's built-in type stripping (no tsx, no build step). `tsc --noEmit` is the type check.

## Consequences
- Only erasable TypeScript syntax is allowed (`erasableSyntaxOnly` is on): no enums, no constructor parameter properties, no namespaces.
- Local imports use the `.ts` extension, and type-only imports use `import type`.
- The Next.js app has its own tsconfig and is built by Next.
