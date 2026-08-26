# Database Migrations

**Decision needed:** pick Flyway OR Liquibase and stick with it. Both keep the
schema in version control so it rebuilds identically on any machine. Never rely
on Hibernate `ddl-auto: update` beyond throwaway prototyping.

## Which to pick?

- **Flyway** — simplest. Plain SQL files, run in version order. Pick this if you
  are comfortable writing SQL and want minimal ceremony. (Recommended for a
  hobby project.)
- **Liquibase** — changeSets in XML/YAML/SQL, database-agnostic, more features
  (rollback, contexts). Pick this if you may target multiple DB engines or want
  structured, tool-managed changes.

## Flyway layout

```
backend/src/main/resources/db/migration/
├── V1__create_user_table.sql
├── V2__add_email_index.sql
└── V3__create_order_table.sql
```

- Filenames: `V<version>__<description>.sql`. Version numbers strictly increasing.
- **Never edit an applied migration.** Add a new one instead — applied files are
  immutable history.

## Liquibase layout

```
backend/src/main/resources/db/changelog/
├── db.changelog-master.yaml      # includes the others in order
├── 001-create-user.yaml
└── 002-add-email-index.yaml
```

- One changeSet = one logical change, with a unique `id` + `author`.
- Same rule: never modify an applied changeSet; add a new one.

## Universal rules

- One migration per logical change; commit it with the code that needs it.
- Test that the app boots against a fresh DB (Testcontainers covers this).
- Keep migrations forward-only in practice; treat "undo" as a new migration.
