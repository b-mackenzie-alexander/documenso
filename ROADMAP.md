# Roadmap: Automatic Document Signing Reminders

Feature contribution for [documenso/documenso](https://github.com/documenso/documenso).  
See `docs/PRD.md` for full requirements and `docs/ARCHITECTURE.md` for system design.

---

## Prerequisites — align before anyone writes code

- [x] All five members have read `docs/PRD.md` and `docs/ARCHITECTURE.md`
- [x] Schema fields agreed on (see PRD §6) — Person 1 owns this, others unblock against it
- [x] Props contract for both email templates agreed on (see PRD §7) — Person 3 unblocks Person 2
- [x] GitHub branch protection configured per `.github/GITHUB_SETUP.md`
- [x] Each member has a GitHub issue or task assigned with an ID for branch naming (`feat/doc-{id}-{description}`)

---

## Person 1 — Schema + Job Infrastructure

**Status: MERGED** (PR #12 → `main`)

**Files owned:**
- `packages/prisma/schema.prisma`
- `packages/lib/jobs/definitions/internal/send-reminders-sweep.ts`
- `packages/lib/jobs/definitions/internal/send-reminders-sweep.handler.ts`
- `packages/lib/jobs/client.ts` (registration only)
- `packages/lib/types/document-email.ts` (new fields — coordinate with Person 4)

**Checklist:**

- [x] Add `reminderEnabled Boolean @default(false)` and `reminderIntervalDays Int?` to `DocumentMeta` in `schema.prisma`
- [x] Add `DocumentReminderLog` model to `schema.prisma` (see PRD §6.2 for exact schema)
- [x] Add `Envelope` and `Recipient` back-relations for `DocumentReminderLog`
- [x] Generate and commit Prisma migration (`npx prisma migrate dev --name add-document-reminder-log`)
- [x] Verify migration is additive only — no `NOT NULL` on existing columns, no destructive changes
- [x] Add `ownerReminderDigest` boolean to `ZDocumentEmailSettingsSchema` and `DocumentEmailEvents` enum in `document-email.ts` (coordinate with Person 4 — one of you edits, the other rebases)
- [x] Write `send-reminders-sweep.ts` definition file — cron `*/15 * * * *`, empty payload, following `expire-recipients-sweep.ts` pattern exactly
- [x] Write `send-reminders-sweep.handler.ts`:
  - [x] Query pending envelopes with `reminderEnabled = true`
  - [x] For each, check `DocumentReminderLog` to determine if interval has elapsed since last send (or since `sentAt` if no log exists)
  - [x] Cap at 1,000 recipients per run (matching `expire-recipients-sweep.handler.ts`)
  - [x] Fan out `send.recipient.reminder.email` jobs via `Promise.allSettled`
  - [x] Group by `(teamId, userId)` and fan out one `send.owner.reminder.digest.email` job per document owner
  - [x] Rejection logging for failed fan-out jobs
- [x] Register all three new job definitions in `packages/lib/jobs/client.ts`
- [x] Confirm `npm run build` passes

---

## Person 2 — Email Dispatch + Template Integration

**Status: MERGED** (PR #14 → `main`)

**Files owned:**
- `packages/lib/jobs/definitions/emails/send-recipient-reminder-email.ts`
- `packages/lib/jobs/definitions/emails/send-recipient-reminder-email.handler.ts`
- `packages/lib/jobs/definitions/emails/send-owner-reminder-digest-email.ts`
- `packages/lib/jobs/definitions/emails/send-owner-reminder-digest-email.handler.ts`
- `packages/lib/types/document-audit-logs.ts` (new type only)
- `packages/lib/server-only/document/find-document-audit-logs.ts` (filter update)

**Dependency:** Person 3 must finish `document-reminder` template before handler can be completed. `sender-reminder-digest` template also needed. ✓ Unblocked.

**Checklist:**

- [x] Add `'REMINDER_SENT'` to `ZDocumentAuditLogTypeSchema` in `document-audit-logs.ts`
- [x] Add `REMINDER_SENT` data schema to the union type in `document-audit-logs.ts`
- [x] Add `REMINDER_SENT` to the `filterForRecentActivity` OR clause in `find-document-audit-logs.ts`
- [x] Write `send-recipient-reminder-email.ts` definition
- [x] Write `send-recipient-reminder-email.handler.ts`:
  - [x] Fetch envelope, recipient, and team via Prisma
  - [x] Return early if envelope no longer PENDING or recipient has already signed
  - [x] Use `getEmailContext`, `renderEmailWithI18N`, `mailer.sendMail`
  - [x] Insert `DocumentReminderLog` row for this recipient after send
  - [x] Write `DocumentAuditLog` entry with type `REMINDER_SENT`
  - [x] All write steps wrapped in `io.runTask()`
- [x] Write `send-owner-reminder-digest-email.ts` definition (includes `userId` in payload schema)
- [x] Write `send-owner-reminder-digest-email.handler.ts`:
  - [x] Fetch envelopes filtered by `teamId`, `userId`, and `status: PENDING`
  - [x] Check `extractDerivedDocumentEmailSettings(documentMeta).ownerReminderDigest` — return early if false
  - [x] Build digest data array, render template, send mail
  - [x] Insert one `DocumentReminderLog` row per envelope (recipientId: null = digest entry)
  - [x] All write steps wrapped in `io.runTask()`
  - [x] Subject uses Lingui `plural()` for correct i18n pluralization
- [x] Confirm `npm run build` passes

---

## Person 3 — Email Templates

**Status: COMPLETE** (committed to `main` via scaffold — `634e1e62`; stale TODO removed via PR #16)

**Files owned:**
- `packages/email/template-components/template-document-reminder.tsx`
- `packages/email/templates/document-reminder.tsx`
- `packages/email/template-components/template-sender-reminder-digest.tsx`
- `packages/email/templates/sender-reminder-digest.tsx`

**Checklist:**

- [x] Study `template-document-invite.tsx` + `template-recipient-expired.tsx` for layout reference
- [x] Study `bulk-send-complete.tsx` for list rendering reference (digest)
- [x] Write `template-document-reminder.tsx` (inner content component):
  - [x] Props: `senderName`, `recipientName`, `documentName`, `signDocumentLink`, `daysRemaining`, `assetBaseUrl`
  - [x] Use `TemplateDocumentImage` with `className="mt-6"`
  - [x] Headline text: urgency copy using `daysRemaining` — centered, `text-primary`, `font-semibold`
  - [x] Body text: `text-slate-400`, centered
  - [x] CTA button: `bg-documenso-500 text-black` — "Sign Document" — links to `signDocumentLink`
  - [x] All strings wrapped in `<Trans>` from `@lingui/react/macro`
- [x] Write `document-reminder.tsx` (full email shell):
  - [x] Copy `recipient-expired.tsx` structure — same HTML wrapper, logo, branding guard, footer
  - [x] Default props for preview (name, document name, etc.)
  - [x] Preview text: "Reminder: you have N days to sign [document]"
- [x] Write `template-sender-reminder-digest.tsx` (inner content component):
  - [x] Props: `ownerName`, `teamName`, `pendingDocuments: Array<{ documentName, pendingRecipientCount, daysRemaining, documentLink }>`, `assetBaseUrl`
  - [x] Render list of pending documents — one row per document with name, recipient count, days remaining, and link
  - [x] All strings wrapped in `<Trans>`
- [x] Write `sender-reminder-digest.tsx` (full email shell)
- [x] Preview both templates locally with react-email dev server
- [x] Share previews with team before handing off to Person 2

---

## Person 4 — Send Flow UI (Frontend)

**Status: MERGED** (PR #11 → `main`)

**Files owned:**
- `packages/ui/components/document/document-email-checkboxes.tsx` (new checkbox)
- `apps/remix/app/components/general/envelope-editor/envelope-editor-settings-dialog.tsx` (reminder fields)
- `packages/lib/types/document-email.ts` (new enum + schema field — coordinate with Person 1)

**Checklist:**

- [x] Add `OwnerReminderDigest = 'ownerReminderDigest'` to `DocumentEmailEvents` enum in `document-email.ts`
- [x] Add `ownerReminderDigest` to `ZDocumentEmailSettingsSchema` with `z.boolean().default(false)` and description
- [x] Add `ownerReminderDigest` to `DEFAULT_DOCUMENT_EMAIL_SETTINGS` with value `false`
- [x] Add new checkbox to `document-email-checkboxes.tsx`:
  - [x] `id={DocumentEmailEvents.OwnerReminderDigest}`
  - [x] Label: "Send me a reminder digest when recipients haven't signed"
  - [x] Tooltip: explain that this aggregates all pending documents into one email per team
- [x] Add reminder fields to `ZAddSettingsFormSchema` in `envelope-editor-settings-dialog.tsx`:
  - [x] `reminderEnabled: z.boolean().default(false)` inside `meta`
  - [x] `reminderIntervalDays: z.number().int().min(1).max(30).optional()` inside `meta`
  - [x] Cross-field validation: interval required when reminders enabled (`.superRefine()`)
- [x] Wire form defaults from `envelope.documentMeta`
- [x] Add reminder UI to the `general` tab, immediately after `ExpirationPeriodPicker` block:
  - [x] Toggle (`Switch` primitive) for `reminderEnabled`
  - [x] Interval input (1–30 days) — only visible when toggle is on
  - [x] Both fields disabled when `envelopeHasBeenSent`
  - [x] Toggle disabled with tooltip when no expiration date set (reactive via `form.watch()`)
- [x] Include `reminderEnabled` and `reminderIntervalDays` in the tRPC mutation payload
- [x] Confirm UI matches existing design system — no custom styles, use existing shadcn/ui primitives only
- [x] Confirm `npm run build` passes

**Security fixes applied (B. Mackenzie review):**
- Server-side `.superRefine()` added to `ZDocumentMetaCreateSchema` — rejects `reminderEnabled: true` without interval or expiration period
- `ownerReminderDigest` default changed `true` → `false` (opt-in)
- `parseInt()` replaces `Number()` coercion in interval input handler
- `ZDocumentMetaFieldsSchema` extracted so existing `.pick()` callers remain unbroken

---

## Person 5 — Activity Feed Display

**Status: MERGED** (PR #15 → `main`)

**Files owned:**
- `apps/remix/app/components/general/document/document-page-view-recent-activity.tsx`

**Checklist:**

- [x] Read `document-page-view-recent-activity.tsx` fully — understand existing match/render pattern
- [x] Identify where new audit log types are rendered (the `match` block over `auditLog.type`)
- [x] Add a render case for `DOCUMENT_AUDIT_LOG_TYPE.REMINDER_SENT`:
  - [x] Use `MailOpen` icon (already imported at line 6)
  - [x] Label: "Reminder sent to [recipient name]" for per-recipient entries
  - [x] Label: "Reminder digest sent to owner" for digest entries (`recipientId` null)
  - [x] Same `DateTime` relative formatting used by adjacent cases
  - [x] Same `text-slate-400` + icon layout used by adjacent cases
- [x] Verify no new imports needed beyond what's already in the file
- [x] Confirm the feed correctly shows both recipient reminder events and digest events
- [x] Confirm `npm run build` passes

**Fixes applied during review:**
- `recipientId` made nullable in `ZDocumentAuditLogEventReminderSentSchema` to support digest entries
- Digest handler writes `DocumentAuditLog` per envelope so digest sends appear in the feed
- `formatDocumentAuditLogAction` renders "Reminder digest sent to owner" when `recipientId` is null

---

## Integration & Review

- [x] All branches rebased to latest `main` before opening PRs
- [x] PRs opened in dependency order: Person 1 → Person 2 + Person 3 (parallel) → Person 4 + Person 5 (parallel)
- [x] Security reviewer (B. Mackenzie) reviewed all PRs touching `packages/prisma/`, `packages/lib/jobs/`, `packages/lib/types/`, `packages/email/`
- [x] Post-merge security review run against integrated `main` — three blocking findings fixed (see below)
- [ ] Full end-to-end test: send document with reminders enabled → wait one interval → confirm recipient email fires → confirm sender digest fires → confirm both appear in activity feed
- [x] `npm run build` passes (verified locally; CI Build App passes on all PRs)
- [x] Local API test suite: 258 passed, 5 flaky (retried and passed), 10 skipped — no failures
- [ ] PR description follows upstream Documenso template and references the issue
- [ ] No unreviewed AI-generated code in any PR (CONTRIBUTING.md requirement)

**Post-merge fixes applied (B. Mackenzie):**
- `send-recipient-reminder-email.handler.ts`: added `reminderEnabled` gate — handler now returns early if owner disabled reminders between sweep and execution
- `send-owner-reminder-digest-email.handler.ts`: filters all envelopes by `ownerReminderDigest` (not just `firstEnvelope`); added `status: PENDING` + `teamId` + `userId` scoping to `findMany`; fixed subject pluralization to use Lingui `plural()` macro
- `packages/lib/server-only/ai/google.ts`: applied `as any` cast to suppress pre-existing upstream TS2353 error (`apiKey` removed from `GoogleVertexProviderSettings` in current SDK version)

**Note:** E2E tests were bypassed on all PRs due to a persistent Warp runner queue issue (jobs stuck in `queued` state indefinitely). All code was reviewed manually. Local API test suite ran clean. UI E2E tests could not complete locally due to auth cookie setup issue in dev environment (unrelated to reminder code). A full E2E pass should be completed before opening the upstream contribution PR.
