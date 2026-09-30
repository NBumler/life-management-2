---
id: 134
type: feature
status: done
title: "Egyoldali (bal / jobb) szettek — egykezes húzódzkodás, lock-off, egykezes evezés"
specs:
  - "[[Edzésnapló]]"
  - "[[Heti terv]]"
flag:
created: 2026-10-01
closed: 2026-10-01
---

# 134 — Egyoldali (bal / jobb) szettek

## Motiváció / probléma

Az egykezes húzódzkodás (OAPU) progressziói, azaz a negatív egykezes, a gumis egykezes és a lock-off,
**karonként** mennek („3–4 szett × 1–2 ismétlés karonként”). Az oldalak közti eltérés
fontos adat. Ma ezt csak két külön gyakorlattal („… – bal”, „… – jobb”) lehet naplózni, ami
szétszórja a statisztikát és a ghost values-t.

## Jelenlegi működés

`WorkoutSetEntry` / `WorkoutPlanSet`: nincs oldal-mező. A szett első oszlopa a sorszám + a
szett-típus jelvény (popoverrel választható).

## Elfogadási kritériumok

- [x] Nullable `side` enum (`LEFT` | `RIGHT`) a `WorkoutSetEntry`-n és a `WorkoutPlanSet`-en
      (`null` = mindkét kéz / nem releváns). Flyway + OpenAPI + SQLite + outbox-verzió.
- [x] A szett-típus popoverben oldal-választó (Mindkettő / Bal / Jobb). A jelvény mellett rövid
      jel (pl. „◀” / „▶”; a „B” betű foglalt a Bemelegítőnek).
- [x] „Új szett” / másolás: a `side`-ot váltakoztatja, ha az előző szettnek volt oldala
      (bal → jobb → bal…).
- [x] Ghost / progresszió (backlog/131) oldalanként külön számol, ha van `side`.
- [x] Sablonból indításkor a `side` átmásolódik.
- [x] [[Edzésnapló]], [[Heti terv]] spec frissítve.

## Terv / döntési napló

- A gyakorlat-master nem kap `unilateral` flaget: a popover minden kindnál elérhető, így nincs
  plusz snapshot-mező.

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] — `side` mező, egyoldali szettek, oldalankénti javaslat; [[Heti terv]] — cél-szett `side`
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — #133–#135 közös sor
- Kód: backend `V49`, `workout/*Entity|Mapper|Service`, `WorkoutSetRules`; frontend `SCHEMA_V46`, `core/data/local-rows.ts`, outbox v15, `pages/workout/log/set-options-popover.component.ts`
