---
name: spring-boot-conventions
description: >
  Personal Java Spring Boot conventions for this hobby project. Use whenever
  writing, reviewing, or planning Java backend code — controllers, services,
  repositories, entities, DTOs, error handling, tests, or database migrations.
  Hungarian triggers: "spring", "backend", "java kód", "endpoint", "service",
  "migráció". Covers: feature-based package structure, constructor injection,
  transaction boundaries, @RestControllerAdvice error handling, DTO validation,
  integration testing with Testcontainers, and Flyway/Liquibase migration
  rules. Do NOT use for frontend/Angular code → use ionic-angular-conventions.
---

# Spring Boot Conventions

## Overview

Personal, lightweight Spring Boot conventions for a hobby project. The guiding
rule is KISS + YAGNI: prefer the simplest thing that works, add structure only
when a real need appears. For detailed rules load the files under `references/`
only when actually working in that area.

## Core rules (always apply)

- **Constructor injection**, never field `@Autowired`. Use `final` fields;
  Lombok `@RequiredArgsConstructor` is fine to cut boilerplate.
- **Layering:** Controller -> Service -> Repository. Controllers stay thin
  (validation + delegation); business logic lives in services.
- **DTOs at the boundary:** controllers accept/return DTOs, never JPA entities.
  Map between them explicitly (a mapper or plain code — no need for MapStruct
  unless it earns its place).
- **`@Transactional` on the service layer**, not on controllers or repositories.
- **Validation:** annotate DTOs with `jakarta.validation` (`@NotNull`, `@Email`,
  `@Size`) and use `@Valid` on the controller parameter. Let the global handler
  turn violations into a clean response.
- **No secrets in code or in `application.yml`.** Use environment variables
  or a local, git-ignored `application-local.yml`.

## Package structure — feature-based

Group by feature, not by technical layer. Everything about "user" lives together:

```
com.example.app/
├── user/
│   ├── UserController.java
│   ├── UserService.java
│   ├── UserRepository.java
│   ├── User.java              # entity
│   └── dto/
│       ├── UserRequest.java
│       └── UserResponse.java
├── order/
│   └── ...
└── common/                    # cross-cutting: config, error handling, utils
```

Avoid the classic `controllers/`, `services/`, `repositories/` top-level split —
it scatters one feature across the whole tree.

## Detailed references (load on demand)

- `references/error-handling.md` — global exception handling, error response shape
- `references/testing.md` — test strategy, Testcontainers, slice tests
- `references/database-migrations.md` — Flyway vs Liquibase, migration rules

## When writing code

1. Match existing patterns in the module before inventing new ones.
2. Keep methods small and named for intent.
3. Add a test for new business logic (see `references/testing.md`).
4. If touching the API surface, remember the frontend client is generated from
   the OpenAPI spec — keep the spec/annotations accurate.
