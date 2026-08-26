---
name: git-conventions
description: >
  Personal Git conventions for this hobby project. Use when making commits,
  writing commit messages, creating branches, or preparing to push. Hungarian
  triggers: "commit", "commitolj", "branch", "ág", "commit üzenet", "pushold".
  Covers Conventional Commits format, branch naming, and small-commit hygiene.
  Applies even when working solo — future-you is the audience.
---

# Git Conventions

## Overview

Even on a solo hobby project, consistent history pays off: it makes `git log`
readable and lets you find when something changed. Keep it lightweight.

## Commit messages — Conventional Commits

Format: `<type>(<optional scope>): <short summary>`

```
feat(user): add password reset endpoint
fix(order): correct total when discount is null
refactor(auth): extract token parsing into service
test(user): cover email validation edge cases
docs: update README setup steps
chore(deps): bump spring boot to 3.3.2
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`.

Rules:
- Summary in imperative mood ("add", not "added"), lowercase, no trailing period.
- Keep the summary under ~72 chars. Details go in the body (blank line after summary).
- One logical change per commit. If you wrote "and" in the summary, consider splitting.

## Branch naming

```
feat/user-password-reset
fix/order-total-rounding
chore/upgrade-angular-18
```

- `<type>/<kebab-case-description>`. Short but descriptive.
- Branch off the main branch; keep branches short-lived.

## Hygiene

- Commit small and often; don't bundle unrelated changes.
- Never commit secrets or local config (see `.gitignore`).
- Do NOT rewrite pushed history, force-push, or delete branches without being asked.
- Review your own diff before committing (see the `/review-local` command).
