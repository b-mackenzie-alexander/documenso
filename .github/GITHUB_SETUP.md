# GitHub Repository Configuration

Manual settings that must be applied in the GitHub UI after forking. Workflow files alone cannot enforce these. Apply before anyone opens a PR.

---

## Branch Protection — `main`

**Settings → Branches → Add ruleset (or classic protection rule) for `main`**

- [ ] Require a pull request before merging
  - [ ] Required approvals: **1**
  - [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require status checks to pass before merging
  - [ ] Require branches to be up to date before merging
  - [ ] Required status checks (these are the job names from `ci.yml`):
    - `Branch Guard`
    - `Quality Checks`
    - `Security Checks`
    - `Build App`
- [ ] Require review from Code Owners (enforces `.github/CODEOWNERS`)
- [ ] Do not allow bypassing the above settings
- [ ] Restrict who can push to matching branches — no direct pushes

---

## Repository Settings

**Settings → General**

- [ ] Default branch: `main`
- [ ] Merge button options:
  - [ ] Allow squash merging — enabled (use for feature branches into `main`)
  - [ ] Allow merge commits — enabled
  - [ ] Allow rebase merging — your preference; squash is recommended for clean history
- [ ] Automatically delete head branches after merge — enabled

---

## Dependabot

**Settings → Code security → Dependabot**

- [ ] Dependabot alerts — enabled
- [ ] Dependabot security updates — enabled

The `dependabot.yml` file is already committed. No additional UI config required. Dependabot PRs target `main` directly and use the `dependabot/` branch prefix, which the branch guard allows.

---

## Code Owners

The `.github/CODEOWNERS` file is committed. It takes effect automatically once branch protection has "Require review from Code Owners" enabled (step above).

Covered paths and their owner:
- `.github/` — CI/CD and project config
- `packages/prisma/` — schema and migrations
- `packages/lib/jobs/` — scheduled job logic
- `packages/lib/server-only/` — server-side business logic
- `packages/lib/types/document-audit-logs.ts` and `document-email.ts` — shared type contracts
- `packages/email/` — email templates
- `CLAUDE.md`, `AGENTS.md` — project configuration files

The owner listed is `@b-mackenzie-alexander`. Update this to your actual GitHub handle if different.

---

## Repository Secrets

**Settings → Secrets and variables → Actions**

No additional secrets are required for CI. The CI workflow uses only:
- `GITHUB_TOKEN` (automatic, always available)

If you add production deployment workflows later, add those secrets at that time.

---

## Verification Checklist

Run through this after applying all settings:

- [ ] Open a test PR from a branch named `feat/doc-test-branch` — confirm `Branch Guard`, `Quality Checks`, `Security Checks`, and `Build App` status checks appear as pending
- [ ] Open a test PR from a branch named `bad-branch-name` — confirm `Branch Guard` fails with a clear error
- [ ] Attempt a direct push to `main` — confirm it is rejected
- [ ] Confirm Dependabot PRs (if any open) target `main` with `dependabot/` prefix
- [ ] Confirm a PR touching `packages/prisma/` requires `@b-mackenzie-alexander` review
