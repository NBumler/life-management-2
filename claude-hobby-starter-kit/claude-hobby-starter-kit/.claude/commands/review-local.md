---
description: Self-review my uncommitted or branch changes before committing
argument-hint: (optional) base branch to diff against, e.g. main
allowed-tools: Bash, Read, Glob, Grep
---

# Local self-review

Act as a careful reviewer for my changes before I commit. There's no second
reviewer on this project, so be my safety net. ONLY analyze — do NOT modify,
stage, or commit anything.

## Steps

1. **Gather the diff.**
   ```bash
   git status
   git diff                      # unstaged
   git diff --staged             # staged
   ```
   If a base branch was given ($ARGUMENTS), also show `git diff $ARGUMENTS...HEAD`.

2. **Review against this project's conventions** (spring-boot-conventions,
   ionic-angular-conventions, general-principles). Read the actual files, not
   just the diff, to verify claims.

3. **Report only high-signal findings**, grouped:
   - 🔴 Must fix — bugs, security issues (hardcoded secrets, injection),
     definite logic errors, broken types.
   - 🟡 Should fix — convention violations, missing tests for new logic,
     over-engineering (KISS/YAGNI).
   - 🟢 Suggestion — optional improvements.
   For each: file:line, what, and why (with evidence). Skip pure style the
   linter handles. If you're not 90% sure it's real, don't flag it.

4. **Verdict:** ready to commit / fix first. If ready, suggest a Conventional
   Commit message (see git-conventions). Do not commit it yourself.
