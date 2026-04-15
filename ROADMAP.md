# Roadmap: Automatic Document Signing Reminders

Feature contribution for [documenso/documenso](https://github.com/documenso/documenso).  
See `docs/PRD.md` for full requirements and `docs/ARCHITECTURE.md` for system design.

---

## Prerequisites — align before anyone writes code

- [ ] All five members have read `docs/PRD.md` and `docs/ARCHITECTURE.md`
- [ ] Schema fields agreed on (see PRD §6) — Person 1 owns this, others unblock against it
- [ ] Props contract for both email templates agreed on (see PRD §7) — Person 3 unblocks Person 2
- [ ] GitHub branch protection configured per `.github/GITHUB_SETUP.md`
- [ ] Each member has a GitHub issue or task assigned with an ID for branch naming (`feat/doc-{id}-{description}`)

---

## Person 1 — Schema + Job Infrastructure

**Files owned:**
- `packages/prisma/schema.prisma`
- `packages/lib/jobs/definitions/internal/send-reminders-sweep.ts`
- `packages/lib/jobs/definitions/internal/send-reminders-sweep.handler.ts`
- `packages/lib/jobs/client.ts` (registration only)
- `packages/lib/types/document-email.ts` (new fields — coordinate with Person 4)

**Checklist:**

- [ ] Add `reminderEnabled Boolean @default(false)` and `reminderIntervalDays Int?` to `DocumentMeta` in `schema.prisma`
- [ ] Add `DocumentReminderLog` model to `schema.prisma` (see PRD §6.2 for exact schema)
- [ ] Add `Envelope` and `Recipient` back-relations for `DocumentReminderLog`
- [ ] Generate and commit Prisma migration (`npx prisma migrate dev --name add-document-reminder-log`)
- [ ] Verify migration is additive only — no `NOT NULL` on existing columns, no destructive changes
- [ ] Add `ownerReminderDigest` boolean to `ZDocumentEmailSettingsSchema` and `DocumentEmailEvents` enum in `document-email.ts` (coordinate with Person 4 — one of you edits, the other rebases)
- [ ] Write `send-reminders-sweep.ts` definition file — cron `*/15 * * * *`, empty payload, following `expire-recipients-sweep.ts` pattern exactly
- [ ] Write `send-reminders-sweep.handler.ts`:
  - [ ] Query pending envelopes with `reminderEnabled = true`
  - [ ] For each, check `DocumentReminderLog` to determine if interval has elapsed since last send (or since `sentAt` if no log exists)
  - [ ] Cap at 1,000 recipients per run (matching `expire-recipients-sweep.handler.ts`)
  - [ ] Fan out `send.recipient.reminder.email` jobs via `Promise.allSettled`
  - [ ] Group by `teamId` and fan out one `send.owner.reminder.digest.email` job per team
  - [ ] Wrap each step in `io.runTask()` for idempotency
- [ ] Register all three new job definitions in `packages/lib/jobs/client.ts`
- [ ] Confirm `npm run build` passes

---

## Person 2 — Email Dispatch + Template Integration

**Files owned:**
- `packages/lib/jobs/definitions/emails/send-recipient-reminder-email.ts`
- `packages/lib/jobs/definitions/emails/send-recipient-reminder-email.handler.ts`
- `packages/lib/jobs/definitions/emails/send-owner-reminder-digest-email.ts`
- `packages/lib/jobs/definitions/emails/send-owner-reminder-digest-email.handler.ts`
- `packages/lib/types/document-audit-logs.ts` (new type only)
- `packages/lib/server-only/document/find-document-audit-logs.ts` (filter update)

**Dependency:** Person 3 must finish `document-reminder` template before handler can be completed. `sender-reminder-digest` template also needed.

**Checklist:**

- [ ] Add `'REMINDER_SENT'` to `ZDocumentAuditLogTypeSchema` in `document-audit-logs.ts`
- [ ] Add `REMINDER_SENT` data schema to the union type in `document-audit-logs.ts` (follow `EMAIL_SENT` pattern at line 247)
- [ ] Add `REMINDER_SENT` to the `filterForRecentActivity` OR clause in `find-document-audit-logs.ts` (line 62)
- [ ] Write `send-recipient-reminder-email.ts` definition (follows `send-signing-email.ts` pattern)
- [ ] Write `send-recipient-reminder-email.handler.ts`:
  - [ ] Fetch envelope, recipient, and team via Prisma (follow `send-signing-email.handler.ts` structure)
  - [ ] Check `extractDerivedDocumentEmailSettings` — no new settings needed, reminder is always on for recipient if `reminderEnabled = true`
  - [ ] Use `getEmailContext`, `renderEmailWithI18N`, `mailer.sendMail` (identical pipeline to existing handlers)
  - [ ] Insert `DocumentReminderLog` row for this recipient after send
  - [ ] Write `DocumentAuditLog` entry with type `REMINDER_SENT`
  - [ ] All steps wrapped in `io.runTask()`
- [ ] Write `send-owner-reminder-digest-email.ts` definition
- [ ] Write `send-owner-reminder-digest-email.handler.ts`:
  - [ ] Fetch all pending envelopes for the team from payload
  - [ ] Check `extractDerivedDocumentEmailSettings(documentMeta).ownerReminderDigest` — return early if false
  - [ ] Build digest data array, render template, send mail
  - [ ] Insert one `DocumentReminderLog` row per envelope (recipientId: null = digest entry)
  - [ ] All steps wrapped in `io.runTask()`
- [ ] Confirm `npm run build` passes

---

## Person 3 — Email Templates

**Files owned:**
- `packages/email/template-components/template-document-reminder.tsx`
- `packages/email/templates/document-reminder.tsx`
- `packages/email/template-components/template-sender-reminder-digest.tsx`
- `packages/email/templates/sender-reminder-digest.tsx`

**Note:** This work is fully independent and can be done before backend is complete. Use react-email dev server to preview. Finish early — Person 2 is blocked on these.

**Checklist:**

- [ ] Study `template-document-invite.tsx` + `template-recipient-expired.tsx` for layout reference
- [ ] Study `bulk-send-complete.tsx` for list rendering reference (digest)
- [ ] Write `template-document-reminder.tsx` (inner content component):
  - [ ] Props: `senderName`, `recipientName`, `documentName`, `signDocumentLink`, `daysRemaining`, `assetBaseUrl`
  - [ ] Use `TemplateDocumentImage` with `className="mt-6"`
  - [ ] Headline text: urgency copy using `daysRemaining` — centered, `text-primary`, `font-semibold`
  - [ ] Body text: `text-slate-400`, centered
  - [ ] CTA button: `bg-documenso-500 text-black` — "Sign Document" — links to `signDocumentLink`
  - [ ] All strings wrapped in `<Trans>` from `@lingui/react/macro`
- [ ] Write `document-reminder.tsx` (full email shell):
  - [ ] Copy `recipient-expired.tsx` structure — same HTML wrapper, logo, branding guard, footer
  - [ ] Default props for preview (name, document name, etc.)
  - [ ] Preview text: "Reminder: you have N days to sign [document]"
- [ ] Write `template-sender-reminder-digest.tsx` (inner content component):
  - [ ] Props: `ownerName`, `teamName`, `pendingDocuments: Array<{ documentName, pendingRecipientCount, daysRemaining, documentLink }>`, `assetBaseUrl`
  - [ ] Render list of pending documents — one row per document with name, recipient count, days remaining, and link
  - [ ] All strings wrapped in `<Trans>`
- [ ] Write `sender-reminder-digest.tsx` (full email shell)
- [ ] Preview both templates locally with react-email dev server
- [ ] Share previews with team before handing off to Person 2

---

## Person 4 — Send Flow UI (Frontend)

**Files owned:**
- `packages/ui/components/document/document-email-checkboxes.tsx` (new checkbox)
- `apps/remix/app/components/general/envelope-editor/envelope-editor-settings-dialog.tsx` (reminder fields)
- `packages/lib/types/document-email.ts` (new enum + schema field — coordinate with Person 1)

**Checklist:**

- [ ] Add `OwnerReminderDigest = 'ownerReminderDigest'` to `DocumentEmailEvents` enum in `document-email.ts` (coordinate timing with Person 1 — one edits, one rebases)
- [ ] Add `ownerReminderDigest` to `ZDocumentEmailSettingsSchema` with `z.boolean().default(true)` and description
- [ ] Add `ownerReminderDigest` to `DEFAULT_DOCUMENT_EMAIL_SETTINGS` with value `true`
- [ ] Add new checkbox to `document-email-checkboxes.tsx`:
  - [ ] Copy the `ownerRecipientExpired` block (lines 333–370) as the structural template
  - [ ] `id={DocumentEmailEvents.OwnerReminderDigest}`
  - [ ] Label: "Send me a reminder digest when recipients haven't signed"
  - [ ] Tooltip: explain that this aggregates all pending documents into one email per team
- [ ] Add reminder fields to `ZAddSettingsFormSchema` in `envelope-editor-settings-dialog.tsx`:
  - [ ] `reminderEnabled: z.boolean().default(false)` inside `meta`
  - [ ] `reminderIntervalDays: z.number().int().min(1).max(30).optional()` inside `meta`
- [ ] Wire form defaults from `envelope.documentMeta` (follow `envelopeExpirationPeriod` pattern at line 224)
- [ ] Add reminder UI to the `general` tab, immediately after `ExpirationPeriodPicker` block:
  - [ ] Toggle (`Switch` primitive) for `reminderEnabled`
  - [ ] Interval selector (1–30 days) — only visible when toggle is on
  - [ ] Both fields disabled when `envelopeHasBeenSent`
  - [ ] If no expiration date set, disable toggle with tooltip: "Set an expiration date to enable reminders"
- [ ] Include `reminderEnabled` and `reminderIntervalDays` in the tRPC mutation payload (follow how other `meta` fields are submitted)
- [ ] Confirm UI matches existing design system — no custom styles, use existing shadcn/ui primitives only
- [ ] Confirm `npm run build` passes

---

## Person 5 — Activity Feed Display

**Files owned:**
- `apps/remix/app/components/general/document/document-page-view-recent-activity.tsx`

**Dependency:** Person 2 must add `REMINDER_SENT` to `ZDocumentAuditLogTypeSchema` and `filterForRecentActivity` before this renders real data. Can build the render case against the mock type in the meantime.

**Checklist:**

- [ ] Read `document-page-view-recent-activity.tsx` fully — understand existing match/render pattern
- [ ] Identify where new audit log types are rendered (the `match` block over `auditLog.type`)
- [ ] Add a render case for `DOCUMENT_AUDIT_LOG_TYPE.REMINDER_SENT`:
  - [ ] Use `MailOpen` icon (already imported at line 6)
  - [ ] Label: "Reminder sent to [recipient name]" for per-recipient entries
  - [ ] Label: "Reminder digest sent to owner" for digest entries (`recipientId` null)
  - [ ] Same `DateTime` relative formatting used by adjacent cases
  - [ ] Same `text-slate-400` + icon layout used by adjacent cases
- [ ] Verify no new imports needed beyond what's already in the file
- [ ] Confirm the feed correctly shows both recipient reminder events and digest events
- [ ] Confirm `npm run build` passes

---

## Integration & Review

- [ ] All five branches rebased to latest `main` before opening PRs
- [ ] PRs opened in dependency order: Person 1 → Person 2 + Person 3 (parallel) → Person 4 + Person 5 (parallel)
- [ ] Security reviewer (B. Mackenzie) approves all PRs touching `packages/prisma/`, `packages/lib/jobs/`, `packages/lib/types/`, `packages/email/`
- [ ] Full end-to-end test: send document with reminders enabled → wait one interval → confirm recipient email fires → confirm sender digest fires → confirm both appear in activity feed
- [ ] `npm run build` passes on the integration branch
- [ ] PR description follows upstream Documenso template and references the issue
- [ ] No unreviewed AI-generated code in any PR (CONTRIBUTING.md requirement)
