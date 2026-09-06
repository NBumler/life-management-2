---
id: 80
type: bug
status: done
title: Outbox — elavult payload robusztusság (unknown-field tolerancia + migrátor-lépés kikényszerítése)
specs:
  - "[[Backend-offline first]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 80 — Outbox — elavult payload robusztusság (unknown-field tolerancia + migrátor-lépés kikényszerítése)

## Motiváció / probléma

Egy telefonon beragadt egy `ClimbingSession` POST outbox-elem: a payloadja még a #77 előtti
appal készült, és tartalmazza az `attempts[].failurePoint` mezőt, amit a #77
(`V31__ascent_attempt_merge_failure_point_into_notes.sql`) beolvasztott a `notes`-ba és kivett az
`AscentAttempt` sémából. A drain hibája:

```
HttpMessageNotReadableException: JSON parse error: Unrecognized field "failurePoint"
  (class hu.bumler.lm2.api.model.AscentAttempt), not marked as ignorable
```

Három hiba esik egybe:

1. **`OutboxMigrator` kimaradt** — a #77 nem bumpolta az `OUTBOX_PAYLOAD_SCHEMA_VERSION`-t és nem
   regisztrált lépést, ami kiszedné a `failurePoint`-ot a függő payloadból. A [[Backend-offline first]]
   §7 „Fejlesztői szabály" prózai, nincs mögötte mechanikus őr — pont ezért maradt le.
2. **Backend nem toleráns az ismeretlen mezőkre** — `JacksonConfig.generatedModelObjectMapper()`
   egy sima `new ObjectMapper()`, amin a `FAIL_ON_UNKNOWN_PROPERTIES` be van kapcsolva. Egy régi
   offline payloadból eltávolított mező így parse-hibát dob.
3. **Nincs handler a parse-hibára** — a `GlobalExceptionHandler`-ben nincs
   `@ExceptionHandler(HttpMessageNotReadableException.class)`, így a generikus `Exception` ágra esik
   → **HTTP 500** + „Unhandled exception" log. A frontend `classifyAndHandle` az `>= 500`-at 5×
   újrapróbálja, mielőtt ERROR-ba tenné.

A queue-t nem blokkolja (a drain `'continue'`-val megy tovább), de az elem menthetetlen: a payload
strukturálisan rossz, a sync centerben csak a Drop segít — az viszont elveszti a session-t.

## Jelenlegi működés

[[Backend-offline first]] §7: minden outbox-hordozott DTO-mezőtörléshez / -átnevezéshez bumpolni
kell az `OUTBOX_PAYLOAD_SCHEMA_VERSION`-t és regisztrálni migrátor-lépést. Ez ma csak prózai
szabály; a `MIGRATIONS` map compile-time guardja (`ALL_ENTITY_TYPES_EXHAUSTIVE`) csak azt nézi, hogy
minden entitásnak van `:1` lépése — nem azt, hogy a séma tényleg nem változott verziobump nélkül.

Backend: `JacksonConfig` bare `ObjectMapper`; `GlobalExceptionHandler` generikus `Exception` fallback
500-zal.

## Elfogadási kritériumok

- [ ] Backend: `generatedModelObjectMapper()` `FAIL_ON_UNKNOWN_PROPERTIES` off — egy régi offline
      payloadból eltávolított/átnevezett mezőt csendben elhagyja, nem 500.
- [ ] Backend: `@ExceptionHandler(HttpMessageNotReadableException.class)` → `400` + stabil `code`
      (`MALFORMED_REQUEST`), stacktrace nélkül, `warn` (nem `error`) log.
- [ ] Frontend: `OUTBOX_PAYLOAD_SCHEMA_VERSION` 2 → 3; `ClimbingSession:2` migrátor-lépés kiszedi a
      `attempts[].failurePoint`-ot, és ha van tartalma, a #77 összevonási szabálya szerint a
      `notes`-ba forgatja. A többi entitásra `:2` no-op (identity) lépés.
- [ ] Őr A — séma-drift check: `npm run verify:outbox` minden outbox-hordozott DTO OpenAPI-alakját
      hasheli, és egy commitolt snapshothoz veti; mezőalak-változás piros, amíg a version-bump +
      migrátor-lépés + `--write` meg nem történt. Bekerül a zöld-check kapuba + CLAUDE.md.
- [ ] Őr B — verzió→lépések teljesség: teszt, hogy minden `entityType:v` (v = 1 … `VERSION`−1)
      lépés regisztrálva van a `MIGRATIONS`-ban.
- [ ] A beragadt telefon-elem a következő app-frissítéskor magától átmegy (a `ClimbingSession:2`
      lépés révén), adatvesztés nélkül.

## Terv / döntési napló

### Döntések

- **A hiba forrása a #77** (nem #71 — az a súgó-gomb jegy), `V31__ascent_attempt_merge_failure_point_into_notes.sql`.
- **Backend tolerancia:** `JacksonConfig.generatedModelObjectMapper()` `FAIL_ON_UNKNOWN_PROPERTIES`
  **off**. Egy régi offline payloadból eltávolított/átnevezett mezőt a szerver csendben elhagy. A
  `@Valid` a hiányzó **kötelező** mezőt így is elkapja (`MethodArgumentNotValidException` →
  `VALIDATION_ERROR`), tehát csak az extra/elavult kulcsok esnek ki némán — ez az offline-first
  szerződésnek megfelelő tartás (régi kliens, újabb szerver).
- **Tiszta 400:** `@ExceptionHandler(HttpMessageNotReadableException.class)` → `400` +
  `MALFORMED_REQUEST` code, `warn` log, stacktrace nélkül. Eddig a generikus `Exception` → `500`
  ágra esett, amit a drain `>= 500`-ként **5×** újrapróbált.
- **Migrátor `STEPS_BY_VERSION`:** a `MIGRATIONS` map generatívan épül — per verzió egy `default`
  lépés + entitás-specifikus `overrides`, minden entitástípusra minden `v < VERSION`-ra. v2 → v3:
  `default = identityStep`, `overrides = { ClimbingSession: stripClimbingSessionFailurePoint }`. A
  lépés a `V31` `CASE`-szabályát tükrözi: `attempts[].failurePoint` kiszedve, nem üres szöveg a
  `notes`-ba (`notes\nfailurePoint`, vagy csak `failurePoint`, ha `notes` üres).
- **Őr A (séma-drift):** `scripts/verify-outbox-payload-schema.mjs` YAML-parser nélkül dolgozik —
  `$ref`-tranzitív fájlzárt tartalom-hash entitásonként, commitolt `outbox-payload-schema.snapshot.json`.
  `--check` (alap) piros, ha egy alak elmozdult; `--write` újra-elfogadja, de **megtagadja**, ha az
  alak változott és az `OUTBOX_PAYLOAD_SCHEMA_VERSION` nem mozdult a snapshothoz képest. Az
  entitás→gyökér-séma leképezés `<Type>.yaml` alapból, egy override (`ShoppingListComplete` →
  `ShoppingListCompleteRequest.yaml`); a lista az `ALL_ENTITY_TYPES`-ból olvasva, így új entitás
  típus leképezés nélkül elhasal. Bekerül a zöld-check kapuba + CLAUDE.md.
- **Őr B (verzió→lépések):** a `buildMigrations()` modultöltéskor dob, ha egy `v < VERSION`-hoz
  nincs `STEPS_BY_VERSION` bejegyzés; az `outbox-migrator.spec.ts` külön asszertálja a per-kulcs
  (`${type}:${v}`) teljességet (`expectedMigrationKeys` vs `registeredMigrationKeys`).
- **A beragadt telefon-elem** a következő app-frissítéskor (v3) a `ClimbingSession:2` lépéssel
  magától átmegy, adatvesztés nélkül — nem kell Drop.

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]] §7 (a „Fejlesztői szabály" mögé a két mechanikus őr +
  a szerver-oldali unknown-field tolerancia), [[Mászónapló]] `#### Backend-offline` (a #77 stale-payload
  eset + a v2→v3 lépés); mind `verifikalt_commit: 651f710`
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #080 outbox stale-payload robusztusság
- Kód backend: `JacksonConfig` (`FAIL_ON_UNKNOWN_PROPERTIES` off), `GlobalExceptionHandler`
  (`HttpMessageNotReadableException` → `400 MALFORMED_REQUEST`), `GlobalExceptionHandlerTest` +
  `ClimbingSessionIntegrationTest` (stale-field 200 + broken-JSON 400)
- Kód frontend: `offline-queue.service.ts` (`OUTBOX_PAYLOAD_SCHEMA_VERSION` 2 → 3),
  `outbox-migrator.ts` (`identityStep`, `stripClimbingSessionFailurePoint`, `STEPS_BY_VERSION` +
  `buildMigrations` + `expectedMigrationKeys`/`registeredMigrationKeys`), `outbox-migrator.spec.ts`,
  `scripts/verify-outbox-payload-schema.mjs` + `outbox-payload-schema.snapshot.json` +
  `package.json` `verify:outbox` script, CLAUDE.md (Commands + green-gate)
