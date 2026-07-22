---
description: Scaffold a new feature across backend and frontend consistently
argument-hint: <feature-name> (e.g. "order-history")
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Scaffold a new feature: $ARGUMENTS

Create a consistent, minimal skeleton for a new feature across the monorepo,
following this project's conventions (spring-boot-conventions +
ionic-angular-conventions). Keep it minimal — KISS/YAGNI, no speculative code.

## Step 0: Validate

If no feature name was given, STOP and ask for one (kebab-case, e.g. `order-history`).

## Backend (`backend/`) — feature-based package

Create under the base package, in a folder named after the feature:
- `{Feature}Controller.java` — thin, DTO in/out, `@Valid`
- `{Feature}Service.java` — `@Transactional`, constructor injection
- `{Feature}Repository.java` — Spring Data interface
- `dto/{Feature}Request.java`, `dto/{Feature}Response.java`
- (if it needs persistence) an entity + a DB migration — ask which migration
  tool is in use (Flyway/Liquibase) if not obvious

## Frontend (`frontend/`) — pages-based

- A page under `src/app/pages/{feature}/` (`.page.ts/.html/.scss`), standalone + OnPush
- A thin feature service wrapping the generated API client
- Add i18n keys under a `{FEATURE}.*` namespace in every `assets/i18n/*.json`
- Wire up the route

## After scaffolding

1. Show me the created file tree.
2. Point out the TODOs I need to fill in.
3. Do NOT implement business logic or commit — just the skeleton.
