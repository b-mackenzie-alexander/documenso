## Description

<!-- What does this PR do? One or two sentences. -->

## Related Issue

<!-- Reference the issue this PR addresses: "Fixes #123" or "Addresses #456" -->

## Changes Made

<!-- Bullet points of what changed. -->

- 

## Testing Performed

<!-- How was this tested? -->

- [ ] Type checked locally (`npx tsc --noEmit`)
- [ ] Built locally (`npm run build`)
- [ ] Manually tested the affected flow end-to-end
- [ ] Tested edge cases (empty states, error states, boundary values)

## Checklist

- [ ] Branch name follows `feat/doc-{id}-{description}` format
- [ ] `npm run build` passes locally
- [ ] All user-facing strings are wrapped in `<Trans>` or `msg` + `i18n._()`
- [ ] Any job handler steps use `io.runTask` wrappers (if applicable)
- [ ] Any Prisma migration is additive only — no destructive changes (if applicable)
- [ ] No unreviewed AI-generated code (Documenso CONTRIBUTING.md requirement)
- [ ] PR title follows semantic format: `feat:` / `fix:` / `chore:`

## Security Checklist

<!-- Required for PRs touching jobs, schema, server-only, or email packages -->

- [ ] No secrets, tokens, or credentials in any committed file
- [ ] User input is validated at the boundary (tRPC input schema or Zod)
- [ ] No internal error details or stack traces exposed to the client
- [ ] If adding a job handler: idempotency guard present (`io.runTask` on all side effects)
- [ ] If modifying schema: migration is additive only, reviewed for unintended data loss

## Additional Notes

<!-- Anything reviewers should know: design decisions, known limitations, follow-up work. -->
