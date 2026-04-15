# Architecture: Automatic Document Signing Reminders

Reference document for the reminder feature contribution to documenso/documenso.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript | Strict mode throughout |
| Framework | React Router (Remix) | App lives in `apps/remix/` |
| ORM | Prisma | Schema at `packages/prisma/schema.prisma` |
| API layer | tRPC | Routers in `packages/trpc/` |
| Job queue | Inngest / BullMQ / Local | Abstracted via `JobClient` — provider set by `NEXT_PRIVATE_JOBS_PROVIDER` env var |
| Email rendering | react-email | Templates in `packages/email/` |
| Email delivery | Nodemailer (mailer.ts) | Transport configured via environment |
| Styling | Tailwind CSS + shadcn/ui | Email templates use `@react-email/tailwind` |
| i18n | Lingui | All UI strings via `<Trans>`, email strings via `msg` + `useLingui` |
| Database | PostgreSQL (via Prisma) | |

---

## Repository Structure (relevant paths)

```
packages/
  prisma/
    schema.prisma               ← data model — the source of truth
    migrations/                 ← Prisma migration history
  lib/
    jobs/
      client.ts                 ← JobClient instantiation — register all jobs here
      client/                   ← JobClient implementation (Inngest, BullMQ, Local)
      definitions/
        emails/                 ← one job per email type sent
        internal/               ← sweep jobs, maintenance jobs
    server-only/
      document/                 ← document business logic
      email/                    ← email context helpers
    types/
      document-audit-logs.ts    ← audit log type enum + Zod schemas
      document-email.ts         ← email settings schema + event enum
    constants/
      envelope-expiration.ts    ← expiration period helpers
  email/
    templates/                  ← full email shells (HTML wrapper + props defaults)
    template-components/        ← inner content blocks (reusable across shells)
    components.ts               ← re-exports from @react-email/*
    mailer.ts                   ← Nodemailer transport
  ui/
    components/document/        ← shared document UI components
    primitives/                 ← shadcn/ui primitives
apps/
  remix/
    app/
      components/general/
        document/               ← document page components (activity feed, etc.)
        envelope-editor/        ← document send flow UI
```

---

## Existing Patterns This Feature Extends

### Job pattern

Every async operation uses a two-file structure:

```
definitions/{category}/{job-name}.ts          ← definition (ID, schema, cron, handler import)
definitions/{category}/{job-name}.handler.ts  ← implementation
```

The definition file imports the handler dynamically and delegates. The handler receives `{ payload, io }` where `io` provides `io.runTask(key, fn)` for idempotent step execution. All database writes and email sends are wrapped in `io.runTask`.

Reference: `expire-recipients-sweep.ts` + `expire-recipients-sweep.handler.ts`

### Email handler pattern

```
1. Fetch envelope + recipient from Prisma
2. Check extractDerivedDocumentEmailSettings() — return early if disabled
3. getEmailContext() — resolves branding, language, sender address
4. createElement(Template, props)
5. renderEmailWithI18N() — produces HTML + plain text
6. mailer.sendMail()
7. Write DocumentAuditLog entry
```

All wrapped in `io.runTask`. Reference: `send-owner-recipient-expired-email.handler.ts`

### Email template pattern

Two-layer structure for every email:

```
template-components/{name}.tsx    ← inner content (Section, Text, Button)
templates/{name}.tsx              ← shell (Html, Head, Body, logo, footer, Preview)
```

Shell imports the inner component and provides default props for preview mode. Reference: `template-recipient-expired.tsx` + `template-components/template-recipient-expired.tsx`

### Email settings pattern

Per-document email feature flags live in `DocumentMeta.emailSettings` as a JSON column, typed by `ZDocumentEmailSettingsSchema`. New toggles are added as boolean fields with a default. The `extractDerivedDocumentEmailSettings()` function is the single read path. Reference: `packages/lib/types/document-email.ts`

---

## New Components: Reminder Feature

### Data flow — recipient reminder

```
[Cron: every 15 min]
        │
        ▼
send-reminders-sweep.handler
  • Query: pending envelopes where reminderEnabled=true
  • For each recipient: check DocumentReminderLog for last send
  • If (now - lastSent) >= reminderIntervalDays → due
        │
        ▼ (per recipient)
send-recipient-reminder-email.handler
  • Fetch envelope + recipient + team
  • Render DocumentReminderTemplate
  • mailer.sendMail → recipient
  • INSERT DocumentReminderLog (recipientId=set)
  • INSERT DocumentAuditLog (type=REMINDER_SENT)
```

### Data flow — sender digest

```
send-reminders-sweep.handler
  • Group due envelopes by teamId
        │
        ▼ (per team)
send-owner-reminder-digest-email.handler
  • Check ownerReminderDigest setting → return early if false
  • Build pendingDocuments[] from payload
  • Render SenderReminderDigestTemplate
  • mailer.sendMail → envelope.user (owner)
  • INSERT DocumentReminderLog per envelope (recipientId=null)
```

### Schema additions

```prisma
// On DocumentMeta (existing model):
reminderEnabled      Boolean  @default(false)
reminderIntervalDays Int?

// emailSettings JSON gains:
ownerReminderDigest: boolean  // default true

// New model:
model DocumentReminderLog {
  id          String     @id @default(cuid())
  createdAt   DateTime   @default(now())
  envelopeId  String
  envelope    Envelope   @relation(...)
  recipientId String?
  recipient   Recipient? @relation(...)
  @@index([envelopeId])
  @@index([recipientId])
}
```

### New files

| File | Owner | Description |
|---|---|---|
| `packages/lib/jobs/definitions/internal/send-reminders-sweep.ts` | Person 1 | Cron job definition |
| `packages/lib/jobs/definitions/internal/send-reminders-sweep.handler.ts` | Person 1 | Sweep logic + fan-out |
| `packages/lib/jobs/definitions/emails/send-recipient-reminder-email.ts` | Person 2 | Job definition |
| `packages/lib/jobs/definitions/emails/send-recipient-reminder-email.handler.ts` | Person 2 | Dispatch + audit log |
| `packages/lib/jobs/definitions/emails/send-owner-reminder-digest-email.ts` | Person 2 | Job definition |
| `packages/lib/jobs/definitions/emails/send-owner-reminder-digest-email.handler.ts` | Person 2 | Digest dispatch |
| `packages/email/template-components/template-document-reminder.tsx` | Person 3 | Inner content block |
| `packages/email/templates/document-reminder.tsx` | Person 3 | Full email shell |
| `packages/email/template-components/template-sender-reminder-digest.tsx` | Person 3 | Inner content block |
| `packages/email/templates/sender-reminder-digest.tsx` | Person 3 | Full email shell |

### Modified files

| File | Owner | Change |
|---|---|---|
| `packages/prisma/schema.prisma` | Person 1 | New fields + new model |
| `packages/lib/jobs/client.ts` | Person 1 | Register 3 new jobs |
| `packages/lib/types/document-email.ts` | Person 1 + 4 | New enum value + schema field |
| `packages/lib/types/document-audit-logs.ts` | Person 2 | Add `REMINDER_SENT` type |
| `packages/lib/server-only/document/find-document-audit-logs.ts` | Person 2 | Add to `filterForRecentActivity` |
| `packages/ui/components/document/document-email-checkboxes.tsx` | Person 4 | New opt-out checkbox |
| `apps/remix/app/components/general/envelope-editor/envelope-editor-settings-dialog.tsx` | Person 4 | Reminder interval UI |
| `apps/remix/app/components/general/document/document-page-view-recent-activity.tsx` | Person 5 | Render `REMINDER_SENT` events |

---

## Key Constraints

**Idempotency is mandatory in all job handlers.** Every database write and every email send must be wrapped in `io.runTask(uniqueKey, fn)`. Without this, Inngest/BullMQ retries will send duplicate emails.

**Prisma migrations are irreversible in production.** Only additive changes — new columns with defaults, new models. Never drop a column or add `NOT NULL` to an existing populated column without a default.

**All user-facing strings require i18n wrapping.** Components: `<Trans>` from `@lingui/react/macro`. Email handlers: `msg` template literal + `i18n._()` from `getI18nInstance`. No plain string literals in any rendered text.

**`document-email.ts` is a shared type file.** Person 1 and Person 4 both modify it. Whoever edits second must rebase against the first merged PR, not merge against it.

**`npm run build` must pass before any PR.** This is Documenso's own contribution requirement (CONTRIBUTING.md). Build failures block code review.
