---
id: 125
type: feature
status: done
title: Edzés sablon — szett cél-értéke tartományként ("8-12"), számként tárolt alsó/felső határral
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-24
closed: 2026-09-24
---

# 125 — Edzés sablon — szett cél-értéke tartományként ("8-12"), számként tárolt alsó/felső határral

## Motiváció / probléma

Edzéstervben gyakori a tartomány (pl. 8–12 ismétlés). A sablon szettjénél kötőjellel (`-`) lehessen
tartományt megadni. **Nem stringként** tároljuk: a bevitelt parse-oljuk, és az alsó / felső határ
számként mentődik.

## Jelenlegi működés

`WorkoutPlanSet` ([[Heti terv]] „targetSets") cél-mezői egyetlen számok: `reps`, `weightKg`,
`holdTimeSeconds`, `edgeSizeMm`, `distanceMeters`, `restTimeSeconds`. A sablon szerkesztő
(`pages/workout/plan/plan-edit.page.html`) `type="number"` inputokat használ, így `8-12` be sem
írható. Edzés indításakor az [[Edzésnapló]] a sablon értékeit előtöltésként másolja a session
szettjeibe.

## Elfogadási kritériumok

- [x] A sablon szerkesztőben az érintett mező(k) szöveges inputként fogadják a `N` és `N-M` alakot
      (szóközök tűrve, `–` en-dash is elfogadva); `N-M` esetén `N ≤ M` kötelező, egyébként inline
      hiba.
- [x] Tárolás számként, additív módon: a meglévő `reps` marad az alsó határ / egyetlen érték, új
      nullable `repsMax` a felső határ (`null` = nem tartomány). Meglévő adatok migráció nélkül
      érvényesek.
- [x] Megjelenítés tartományként (`8–12`) a sablonban és a heti terv nézetben.
- [x] Edzés indításakor a session szett előtöltése: `reps = ceil((alsó + felső) / 2)` (pl.
      `8–12 → 10`, `8–11 → 10`); a tartomány célként látszik az aktív edzés felületen.
- [x] Parse-logika tiszta függvényben, unit tesztekkel (érvényes / érvénytelen / fordított / üres).
- [x] Flyway + natív `SCHEMA_Vn` + OpenAPI + `gen:api`; `verify:outbox` snapshot frissítés
      (+ `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump; migráció: régi payload → `repsMax = null`).
- [x] Zöld lint + test:ci + build + backend test + verify:outbox.

## Terv / döntési napló

- **Döntés (2026-09-24):** első körben **csak az ismétlésszám** (`reps` + `repsMax`). Más
  cél-mezőkre (súly, tartási idő, táv, pihenő) később várhatóan kelleni fog — ezért a parse- és
  megjelenítő logika legyen mezőtől független, újrahasznosítható (`<mező>` + `<mező>Max` minta),
  hogy a bővítés csak új oszlop + bekötés legyen.
- **Döntés (2026-09-24):** előtöltés a két határ átlagával, felfelé kerekítve.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #125
- Kód: `V46__workout_plan_set_reps_max.sql`, `workout/WorkoutPlan*` (backend), `SCHEMA_V43`, `shared/target-range.ts`, `pages/workout/plan/plan-edit.page.*`, `pages/workout/log/active-workout.page.*`
- Megjegyzés: a heti terv nézet szett-szintű célokat nem listáz, így ott nincs mit tartományként mutatni — a megjelenítés a sablon-szerkesztőben és az aktív edzés segédszövegében van.
