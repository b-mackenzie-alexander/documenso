# Agent Guidelines for Documenso

## Build/Test/Lint Commands

- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run lint:fix` - Auto-fix linting issues
- `npm run test:e2e` - Run E2E tests with Playwright
- `npm run test:dev -w @documenso/app-tests` - Run single E2E test in dev mode
- `npm run test-ui:dev -w @documenso/app-tests` - Run E2E tests with UI
- `npm run format` - Format code with Prettier
- `npm run dev` - Start development server for Remix app

**Important:** Do not run `npm run build` to verify changes unless explicitly asked. Builds take a long time (~2 minutes). Use `npx tsc --noEmit` for type checking specific packages if needed.

## Code Style Guidelines

- Use TypeScript for all code; prefer `type` over `interface`
- Use functional components with `const Component = () => {}`
- Never use classes; prefer functional/declarative patterns
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)
- Directory names: lowercase with dashes (auth-wizard)
- Use named exports for components
- Never use 'use client' directive
- Never use 1-line if statements
- Structure files: exported component, subcomponents, helpers, static content, types

## Error Handling & Validation

- Use custom AppError class when throwing errors
- When catching errors on the frontend use `const error = AppError.parse(error)` to get the error code
- Use early returns and guard clauses
- Use Zod for form validation and react-hook-form for forms
- Use error boundaries for unexpected errors

## UI & Styling

- Use Shadcn UI, Radix, and Tailwind CSS with mobile-first approach
- Use `<Form>` `<FormItem>` elements with fieldset having `:disabled` attribute when loading
- Use Lucide icons with longhand names (HomeIcon vs Home)

## TRPC Routes

- Each route in own file: `routers/teams/create-team.ts`
- Associated types file: `routers/teams/create-team.types.ts`
- Request/response schemas: `Z[RouteName]RequestSchema`, `Z[RouteName]ResponseSchema`
- Only use GET and POST methods in OpenAPI meta
- Deconstruct input argument on its own line
- Prefer route names such as get/getMany/find/create/update/delete
- "create" routes request schema should have the ID and data in the top level
- "update" routes request schema should have the ID in the top level and the data in a nested "data" object

## Translations & Remix

- Use `<Trans>string</Trans>` for JSX translations from `@lingui/react/macro`
- Use `t\`string\`` macro for TypeScript translations
- Use `(params: Route.Params)` and `(loaderData: Route.LoaderData)` for routes
- Directly return data from loaders, don't use `json()`
- Use `superLoaderJson` when sending complex data through loaders such as dates or prisma decimals

---

## Automatic Reminders Feature — Contributor Guide

This section is specific to the reminder feature contribution being developed by the Pursuit team. See `docs/PRD.md` for full requirements and `docs/ARCHITECTURE.md` for system design.

### What we're building

A scheduled email reminder system: recipients get nudged when they have unsigned documents approaching expiration, and document owners receive a single aggregated digest per team rather than one email per document.

### Branch naming (enforced by CI)

Format: `feat/doc-{issue-id}-{short-description}`  
Allowed prefixes: `feat/`, `fix/`, `chore/`, `test/`, `doc/`, `docs/`, `hotfix/`  
Direct pushes to `main` are blocked.

### Additional rules for this feature

- All job handler steps must be wrapped in `io.runTask('unique-key', fn)` — this is the idempotency mechanism and is non-negotiable. Reference: `packages/lib/jobs/definitions/emails/send-owner-recipient-expired-email.handler.ts`
- Prisma migrations must be additive only. No `DROP COLUMN`, no `NOT NULL` added to existing populated columns without a default.
- No unreviewed AI-generated code per Documenso's CONTRIBUTING.md — contributors who submit it are blocked from the repo.

### Patterns to match

| Task | Reference file |
|---|---|
| New cron sweep job | `packages/lib/jobs/definitions/internal/expire-recipients-sweep.ts` + `.handler.ts` |
| New email dispatch job | `packages/lib/jobs/definitions/emails/send-owner-recipient-expired-email.handler.ts` |
| New email template | `packages/email/template-components/template-recipient-expired.tsx` |
| New email shell | `packages/email/templates/recipient-expired.tsx` |
| New email settings toggle | `packages/ui/components/document/document-email-checkboxes.tsx` |
| Document settings UI control | `apps/remix/app/components/general/envelope-editor/envelope-editor-settings-dialog.tsx` line ~717 |
| Activity feed render case | `apps/remix/app/components/general/document/document-page-view-recent-activity.tsx` |

### Shared file coordination

`packages/lib/types/document-email.ts` is modified by Person 1 and Person 4. Coordinate who edits first — the second person must rebase, not merge.

### Security review required

PRs touching `packages/prisma/`, `packages/lib/jobs/`, `packages/lib/server-only/`, `packages/email/`, or `.github/` require approval from @b-mackenzie-alexander in addition to a peer review. This is enforced via `.github/CODEOWNERS`.

### PR checklist

- [ ] `npm run build` passes locally
- [ ] Branch name follows the required format
- [ ] All user-facing strings use `<Trans>` or `msg` + `i18n._()`
- [ ] All job handler steps use `io.runTask` wrappers
- [ ] Any Prisma migration is additive only
- [ ] No unreviewed AI-generated code
- [ ] PR title is semantic: `feat: ...` / `fix: ...` / `chore: ...`
- [ ] PR targets `main`
