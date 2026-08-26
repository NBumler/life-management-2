---
description: Stage sensible changes and write a Conventional Commit message
argument-hint: (optional) hint about what the change is
allowed-tools: Bash, Read, Grep
---

# Commit helper

Help me commit following git-conventions (Conventional Commits). Be careful:
show me the plan and the message, and let ME confirm before committing.

## Steps

1. **Inspect.** Run `git status` and `git diff` (staged + unstaged). Understand
   what changed. Context hint from me: $ARGUMENTS

2. **Safety checks (STOP and warn if triggered):**
   - Any secrets/keys/passwords in the diff → warn, do not commit.
   - Unrelated changes mixed together → suggest splitting into separate commits.

3. **Propose a message** in Conventional Commits format:
   ```
   <type>(<scope>): <imperative summary>

   <optional body: what and why>
   ```
   Pick the type (feat/fix/refactor/test/docs/chore/...) from the actual change.

4. **Confirm with me**, then:
   ```bash
   git add <the relevant files>
   git commit -m "..."
   ```
   Do NOT push. Do NOT `git add -A` blindly — stage only what belongs in this commit.
