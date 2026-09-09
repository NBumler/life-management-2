---
id: 88
type: change-request
status: done
title: Mászás — szektor-szintű alapértelmezett úthossz, az adott útnál felülírható
specs:
  - "[[Outdoor köteles admin]]"
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles napló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 88 — Mászás — szektor-szintű alapértelmezett úthossz, az adott útnál felülírható

## Motiváció / probléma

Egy szektorban az utak jellemzően hasonló hosszúak. Jó lenne a **szektoron** megadni egy
alapértelmezett úthosszt, amit az egyes utak (és a naplóbeli kísérletek) örökölnek, de
felül lehet írni — pontosan úgy, ahogy az égtáj (`aspect`) és a kőzettípus (`rockType`)
öröklődik ([[Outdoor boulder admin]] mintája).

## Jelenlegi működés

- [[Outdoor köteles admin]] `Route`: `lengthInMeters` per út (opcionális).
- `Sector`: `cragId`, `name`, default `aspect` — **nincs** default hossz mező.
- [[Outdoor köteles napló]]: `lengthInMeters` a Route-ból vagy kézzel; útváltáskor újratöltődik
  (kivéve kézi felülírás — [[Mászónapló]] `AscentAttempt`, `lengthAutoFilled` provenance).

## Elfogadási kritériumok

- [x] `Sector` kap opcionális `defaultLengthInMeters` mezőt (a `Route.lengthInMeters` marad).
- [x] Öröklési sorrend: **1.** `Route.lengthInMeters` (ha kitöltött) → **2.** `Sector.defaultLengthInMeters`
      → **3.** napló kísérlet szinten felülírható. A `lengthAutoFilled` provenance-flag kiterjesztve
      a szektor-defaultra is (`pickSector` / `pickRoute` / `rowFrom` az `outdoor-rope-session-edit`-ben).
- [x] Szektor szerkesztő: sima szám-input méterben (`type="number"`, `Validators.min(1)`, `0`/negatív
      → `null`) + tájékoztató hint.
- [x] Flyway `V38__sector_default_length.sql` + helyi `SCHEMA_V37` + OpenAPI `Sector` séma + `gen:api`.
- [x] A kötél-kalória (`lengthInMeters × {25|45|60}`) a feloldott hosszt használja (`resolveLength`
      → `metricAttempts` → `climbingKcal`, változtatás nélkül).
- [x] Boulder-oldal: a `Sector` közös entitás — a mező a boulder szektor-szerkesztőn is megjelenik,
      **nem rejtjük el** (opcionális, a hint jelzi, hogy a boulder napló nem használja).
- [x] Outbox `OUTBOX_PAYLOAD_SCHEMA_VERSION` v5 → v6 + `STEPS_BY_VERSION[5] = { default: identityStep }`
      (új nullable mező, a hiányzó kulcs = „nincs default" — nincs payload-transzformáció) + snapshot.

## Terv / döntési napló

_Kapcsolódik: [[084-climbing-szektor-a-sessionrol-a-kiserletre-attempt-szintre]] — a `#84` után
készült; a hossz-öröklés a **kísérlet szektorának** `defaultLengthInMeters`-éből számol. A `Mennyiség
mező` komponens helyett sima méter-szám-input (a szektor-szerkesztő nem használ `quantity` mezőt
máshol sem)._

## Lezáráskor (on-done)

- Frissített + `verifikalt_commit: b5d1556`-re stampelt specek: [[Outdoor köteles admin]]
  (`Sector.defaultLengthInMeters` + öröklési sorrend + backend `V38`), [[Outdoor boulder admin]]
  (közös `Sector` mező-sor + „nincs hossz-fogyasztó" jegyzet + backend), [[Outdoor köteles napló]]
  (`lengthInMeters` öröklési sor + Backend), [[Mászónapló]] (`AscentAttempt` `lengthInMeters`
  öröklés / provenance + backend).
- `IMPLEMENTATION_STATUS.md`: `2026-09-09 — #88` sor.
- Kód: backend `SectorEntity`/`SectorMapper`/`SectorService` + `V38__sector_default_length.sql` +
  OpenAPI `Sector.yaml` + `SectorServiceTest`. Frontend `gen:api`, `core/data/local-rows.ts`
  (`SectorRow` + mapperek + write task-ok), `core/storage/local-database.service.ts` (`SCHEMA_V37`),
  `core/data/sector.repository.ts` (`SectorSaveInput`), `core/sync/{offline-queue.service,outbox-migrator}.ts`
  + snapshot, `pages/workout/climbing/admin/sector-edit.{ts,html}` + i18n hu/en,
  `pages/workout/climbing/naplo/outdoor-rope-session-edit.page.ts`, és a `*.spec.ts`-ek.
- Zöld kapu: FE lint ✓ · `test:ci` 1624 ✓ · build ✓ · `verify:outbox` v6 / 36 ✓ · BE `./gradlew test` ✓.
