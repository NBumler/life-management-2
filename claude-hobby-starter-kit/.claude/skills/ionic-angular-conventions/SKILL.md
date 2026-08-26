---
name: ionic-angular-conventions
description: >
  Personal Ionic Angular conventions for this hobby project. Use whenever
  writing, reviewing, or planning frontend code — pages, components, services,
  routing, forms, HTTP calls, translations, or tests in the Ionic/Angular app.
  Hungarian triggers: "frontend", "angular", "ionic", "komponens", "oldal",
  "page", "fordítás", "i18n". Covers: pages-based structure, standalone
  components, OnPush change detection, strict TypeScript, RxJS discipline,
  ngx-translate i18n, generated OpenAPI client usage, and testing. Do NOT use
  for Java/Spring backend code → use spring-boot-conventions.
---

# Ionic Angular Conventions

## Overview

Personal, lightweight conventions for the Ionic Angular frontend. KISS + YAGNI:
build the simplest thing that works. Detailed rules live in `references/` — load
them only when working in that specific area.

## Core rules (always apply)

- **Standalone components** (no NgModules). Import what each component needs.
- **`ChangeDetectionStrategy.OnPush`** on every component. Drive updates through
  inputs and observables, not mutation.
- **Strict TypeScript.** No `any`. Type everything; let the compiler help you.
- **Smart vs presentational:** page components fetch data and hold state; child
  components take `@Input()`, emit `@Output()`, and stay dumb.
- **RxJS discipline:** use the `async` pipe in templates instead of manual
  `subscribe`. If you must subscribe in code, unsubscribe (`takeUntilDestroyed`).
- **HTTP through the generated API client** (see below) or a thin service — never
  scatter raw `HttpClient` calls across components.
- **No hardcoded user-facing text** — use ngx-translate keys (see references).

## Pages-based structure

Organize by screen (page). Child components live inside their parent's folder —
this is also how `ionic generate page` thinks, so it fits Ionic naturally.

```
frontend/src/app/
├── pages/
│   ├── home/
│   │   ├── home.page.ts
│   │   ├── home.page.html
│   │   └── home.page.scss
│   └── user-list/
│       ├── user-list.page.ts
│       └── user-list-item/          # child component INSIDE the parent
│           └── user-list-item.component.ts
├── shared/                          # reused across pages: components, pipes, utils
├── core/                            # singletons: guards, interceptors, config
└── api/                             # GENERATED OpenAPI client — do not hand-edit
```

## Generated API client

- The Angular client is **generated** from the backend's OpenAPI spec.
- Regenerate after backend API changes (`/gen-api-client`); never hand-edit files
  under `api/`.
- Consume the generated services in your own thin feature services if you need
  extra logic (caching, mapping) — keep components clean.

## Detailed references (load on demand)

- `references/i18n.md` — ngx-translate setup, key naming, usage patterns
- `references/testing.md` — component and service testing

## File naming

| Type | Pattern |
|------|---------|
| Page | `{name}.page.ts` |
| Component | `{name}.component.ts` |
| Service | `{name}.service.ts` |
| Guard | `{name}.guard.ts` |
