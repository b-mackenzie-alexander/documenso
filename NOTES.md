# Process Notes

Running log for the automatic document signing reminders contribution.  
Architecture decisions live in `docs/ARCHITECTURE.md`. Requirements live in `docs/PRD.md`.

---

## Decision Log

### 2026-04-14

**Reminder feature scoping**
Chose email reminders as the improvement feature. Backend-heavy but with clear frontend surface area in the document send flow UI and activity feed.

**Email template ownership**
Split-ownership (Option 3): Person 3 builds templates with mock props and previews locally. Person 2 integrates and passes real data. Props contract agreed on before either starts. Unblocks parallel work.

**Digest vs. per-document sender notifications**
Decided: sender receives one aggregated digest per team, not one email per document. Reason: preventing inbox spam for senders with many pending documents was the primary UX concern. A sender with 50 pending documents and a 3-day interval would otherwise receive 50 emails every 3 days.

### 2026-04-15

**Clock start point**
First reminder fires `reminderIntervalDays` days after `sentAt`. Not relative to expiration. Simpler to implement and more predictable for users.

**Team scoping**
Digest is scoped by `envelope.teamId`. Users with documents in multiple teams receive one digest per team. Consistent with Documenso's existing data boundary throughout the application.

**Idempotency strategy**
New `DocumentReminderLog` join table instead of a single timestamp on `Recipient`. Rationale: full history is queryable, supports both recipient and digest entries in one table via nullable `recipientId`, and doesn't couple reminder state to the `Recipient` model.

**Sender opt-out storage**
Stored in existing `emailSettings` JSON on `DocumentMeta` as `ownerReminderDigest: boolean`. Follows the established pattern — no new column, consistent with all other per-document email toggles.

**"Feels native" design constraint**
No new pages, routes, or navigation items. All UI additions live inside the existing settings dialog (`envelope-editor-settings-dialog.tsx`). Reminder controls in the `general` tab, opt-out checkbox in the `email` tab. Activity feed renders new event type with existing icon and layout.

**Digest cadence**
No separate digest cadence setting. The digest fires whenever the sweep detects documents due for reminders, on the same `*/15 * * * *` cadence as the existing `expire-recipients-sweep`. The per-document `reminderIntervalDays` controls when documents become "due" — the sweep just aggregates whatever is due on each run.

---

## Open Questions

All pre-PRD questions resolved. New questions go here as they arise during implementation.

| # | Question | Raised by | Status |
|---|---|---|---|
| — | — | — | — |

---

## Blockers Log

| Date | Blocker | Affects | Resolution |
|---|---|---|---|
| — | `document-email.ts` is modified by Person 1 and Person 4 | Both | Person 1 merges first; Person 4 rebases |
| — | Person 2 blocked on email templates for integration | Person 2 | Person 3 finishes templates early, shares previews |

---

## PR Order

PRs should merge in dependency order to avoid rebase conflicts on shared files:

```
1. Person 1 (schema + sweep) ──────────────────────────────────────────┐
                                                                         │
2a. Person 3 (email templates) ─────┐                                   │ unblocks
                                     ├─→ 3. Person 2 (email dispatch) ──┤
2b. Person 4 (UI) ──────────────────┘                                   │
                                                                         ▼
                                                           4. Person 5 (activity feed)
                                                           (needs REMINDER_SENT type from Person 2)
```

Persons 3 and 4 can open PRs simultaneously. Person 2 and Person 5 open after their dependencies merge.

---

## Contribution Compliance Checklist

Per [CONTRIBUTING.md](./CONTRIBUTING.md):

- [ ] CLA accepted by all contributors
- [ ] Branch naming: `feat/doc-{issue-id}-{description}` for each PR
- [ ] `npm run build` passes before any PR is opened
- [ ] No unreviewed AI-generated code in any submission
- [ ] PR targets `main` branch
- [ ] PR references the related issue

---

## Security — Known Upstream Vulnerability Inventory

> **As of 2026-04-16.** These are pre-existing vulnerabilities in `documenso/documenso`'s dependency tree.
> They must **not** be patched in this fork (doing so pollutes the upstream PR diff).
> Each should be reported as an issue on the upstream repo if not already tracked there.
> Our CI omits `npm audit` for this reason; TruffleHog still runs for secrets.

| Package | Severity | Advisory | Status |
|---------|----------|----------|--------|
| `axios ≤ 1.14.0` | **Critical** | GHSA (SSRF / credential leak) | Report upstream |
| `follow-redirects ≤ 1.15.11` | Moderate | GHSA-cxjh-pqwp-8mfp (auth header leak on redirect) | Report upstream |
| `lodash-es ≤ 4.17.23` | High | Prototype pollution, code injection via `_.template` | Report upstream |
| `nodemailer ≤ 8.0.4` | Moderate | SMTP command injection via CRLF | Report upstream |
| `path-to-regexp ≤ 0.1.12, 8.0.0–8.3.0` | High | ReDoS via wildcard routes | Report upstream |
| `socket.io-parser 4.0.0–4.2.5` | High | Unbounded binary attachment count | Report upstream |
| `tar ≤ 7.5.10` | High | Symlink path traversal | Report upstream |
| `vite 7.0.0–7.3.1` | High | Path traversal, server.fs.deny bypass, arbitrary file read | Report upstream |

Total as of scan: 33 vulnerabilities (1 critical, 24 high, 5 moderate, 3 low).

---

## Notes on Documenso Upstream Considerations

The `codeql-analysis.yml` and `semantic-pull-requests.yml` workflows in the upstream repo will run on our PRs. Semantic PR titles are enforced — use `feat:`, `fix:`, or `chore:` prefixes on PR titles.

The `translations-upload.yml` workflow will fire when strings are added. This is fine — Documenso handles translation PRs separately. Our `<Trans>` additions will be picked up in their next translation cycle.
