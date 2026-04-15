# PRD: Automatic Document Signing Reminders

**Version:** 0.1  
**Status:** Draft  
**Team:** 5-person contribution team (Pursuit)  
**Target repo:** documenso/documenso (fork)  
**Last updated:** 2026-04-15

---

## 1. Problem Statement

When a document is sent for signing, the sender has no automated way to prompt recipients who have not yet completed it. If a document has an expiration date, recipients may miss the deadline simply because they forgot. Senders must currently follow up manually, which does not scale. Organizations sending documents in bulk face a compounded version of this problem — tracking which recipients are overdue across dozens of pending documents is a manual, error-prone process.

---

## 2. Goals

- Allow senders to configure automatic reminders at a set interval between the document send date and the expiration date.
- Notify both the recipient (to prompt action) and the sender (to maintain awareness), with the sender able to opt out of their own notifications.
- Aggregate sender-facing notifications into a single digest per team rather than sending one email per document, preventing inbox spam at scale.
- Provide a full audit history of reminder sends through a dedicated log table.
- Surface reminder activity in the existing document timeline without creating new UI surfaces.

---

## 3. Non-Goals

- Reminders for documents without an expiration date set (out of scope for v1).
- SMS or in-app push notifications (email only).
- Configuring reminders after a document has already been sent (settings are locked at send time).
- Custom reminder message body per send (reminders use a standardized template).
- Admin-level global reminder settings overriding per-document configuration.

---

## 4. User Stories

**As a document sender,** I want to set a reminder interval when I send a document so that recipients who haven't signed are automatically nudged without me having to follow up manually.

**As a document sender,** I want to be able to opt out of receiving reminder digest emails so that I'm not notified on every reminder cycle when I have many pending documents.

**As a document sender with multiple pending documents,** I want any reminder notifications I do receive to be aggregated into a single digest per team rather than arriving as separate emails per document.

**As a recipient,** I want to receive a reminder email when I have an outstanding document to sign, so that I don't miss a deadline due to forgetting.

**As a document sender reviewing activity,** I want to see reminder sends in the document timeline so that I have a complete record of when recipients were contacted.

---

## 5. Functional Requirements

### 5.1 Reminder Configuration

- The sender configures reminders in the document settings dialog before sending, under the existing **General** tab, immediately after the Expiration field.
- Configuration consists of two controls:
  - A toggle to enable/disable reminders (`reminderEnabled`). Default: off.
  - A numeric interval input in days (`reminderIntervalDays`, 1–30). Only visible when the toggle is on.
- Both controls are disabled once the document has been sent (`envelopeHasBeenSent`). Reminder settings cannot be modified on an in-flight document.
- Reminder settings require an expiration date to be set. If no expiration is configured, the reminder toggle is disabled with an explanatory tooltip.

### 5.2 Sender Notification Opt-Out

- A new checkbox in the existing **Email** tab, within `DocumentEmailCheckboxes`, allows the sender to control whether they receive the reminder digest. Label: "Send me a reminder digest when recipients haven't signed."
- This setting is stored as `ownerReminderDigest` in the existing `emailSettings` JSON field on `DocumentMeta`, following the same pattern as all other email event toggles.
- Default: on (sender receives the digest unless they opt out).

### 5.3 Recipient Reminder Email

- Fires on a recurring schedule. The first reminder fires `reminderIntervalDays` after the document `sentAt` timestamp. Subsequent reminders fire every `reminderIntervalDays` thereafter.
- Sent to each unsigned, non-rejected recipient individually.
- Stops sending to a recipient once they have signed or the document has reached a terminal state (completed, cancelled, deleted, expired).
- Contains: document name, sender name, days remaining until expiration, and the recipient's unique signing link.

### 5.4 Sender Digest Email

- Fires on the same sweep cycle as recipient reminders. When the sweep detects one or more recipient reminders due for a given team's documents, it sends one digest email to the document owner.
- Scope: team-scoped. A user who owns documents across multiple teams receives one digest per team, not one combined digest.
- Contains: a list of all documents with pending reminders in that team, including the document name, number of unsigned recipients, and days remaining until expiration.
- Respects the `ownerReminderDigest` setting. If the sender has opted out, no digest is sent for that sweep run.

### 5.5 Reminder History

- Every reminder send (both recipient and digest) is recorded in a new `DocumentReminderLog` table.
- Each row captures: `envelopeId`, `recipientId` (null for digest entries), and `createdAt`.
- The sweep uses this table to determine whether enough time has passed since the last reminder before firing again (prevents duplicate sends within the same interval).
- Reminder send events appear in the document's Recent Activity feed as a distinct event type (`REMINDER_SENT`).

### 5.6 Sweep Job

- A new cron job (`send-reminders-sweep`) runs every 15 minutes, consistent with the existing `expire-recipients-sweep` cadence.
- On each run it: queries for pending envelopes with `reminderEnabled = true`, calculates which recipients are due for a reminder based on the last `DocumentReminderLog` entry (or `sentAt` if no entry exists), groups due documents by `teamId`, and fans out to per-recipient email jobs and one digest job per team.
- Processing cap of 1,000 recipients per sweep run, matching the `expire-recipients-sweep` pattern. Overflow is picked up on the next run.

---

## 6. Data Model Changes

### 6.1 `DocumentMeta` — new fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `reminderEnabled` | `Boolean` | `false` | Master toggle |
| `reminderIntervalDays` | `Int?` | `null` | Required when `reminderEnabled = true` |

The sender opt-out is stored in the existing `emailSettings` JSON field as `ownerReminderDigest: boolean`, not as a separate column.

### 6.2 New model: `DocumentReminderLog`

```prisma
model DocumentReminderLog {
  id          String     @id @default(cuid())
  createdAt   DateTime   @default(now())

  envelopeId  String
  envelope    Envelope   @relation(fields: [envelopeId], references: [id], onDelete: Cascade)

  recipientId String?
  recipient   Recipient? @relation(fields: [recipientId], references: [id], onDelete: SetNull)

  @@index([envelopeId])
  @@index([recipientId])
}
```

`recipientId: null` indicates a sender digest entry. `recipientId: set` indicates a per-recipient reminder entry.

---

## 7. Email Templates

### 7.1 Recipient Reminder (`document-reminder`)

- **To:** unsigned recipient
- **Subject:** "Reminder: please sign [document name]"
- **Props:** `senderName`, `recipientName`, `documentName`, `signDocumentLink`, `daysRemaining`, `assetBaseUrl`
- **Style:** follows existing `document-invite` template structure — same layout, same `TemplateDocumentImage`, same CTA button style (`bg-documenso-500`)

### 7.2 Sender Digest (`sender-reminder-digest`)

- **To:** document owner
- **Subject:** "Reminder: [N] document(s) are awaiting signatures"
- **Props:** `ownerName`, `teamName`, `pendingDocuments: Array<{ documentName, pendingRecipientCount, daysRemaining, documentLink }>`, `assetBaseUrl`
- **Style:** list-based layout; reference `bulk-send-complete` template for multi-item rendering pattern

All user-facing strings must be wrapped in `<Trans>` from `@lingui/react/macro`.

---

## 8. Audit Log Integration

- Add `'REMINDER_SENT'` to `ZDocumentAuditLogTypeSchema` in `packages/lib/types/document-audit-logs.ts`.
- Add `REMINDER_SENT` to the `filterForRecentActivity` OR clause in `find-document-audit-logs.ts` so reminder events appear in the document timeline.
- Render `REMINDER_SENT` events in `document-page-view-recent-activity.tsx` using the existing `MailOpen` icon and date formatting pattern.

---

## 9. Job Registration

Three new job definitions are added to `packages/lib/jobs/client.ts`:

| Job ID | Type | Trigger |
|---|---|---|
| `internal.send-reminders-sweep` | Sweep | Cron `*/15 * * * *` |
| `send.recipient.reminder.email` | Email dispatch | Triggered by sweep |
| `send.owner.reminder.digest.email` | Email dispatch | Triggered by sweep |

---

## 10. Success Metrics

- Reminder emails are delivered without duplicates across sweep runs.
- Sender digest aggregates correctly across all pending documents for a team.
- Sender opt-out is respected on the first sweep run after the setting is changed.
- All reminder activity is queryable via the `DocumentReminderLog` table.
- Reminder events appear in the document timeline within one sweep cycle of firing.
- No regression in existing email event behavior (confirmed by existing test suite passing).
