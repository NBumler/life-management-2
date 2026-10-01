---
id: 136
type: change-request
status: done
title: "Napi lépéscél a Profilban (pl. 13 000) — widget és lépés-képernyő haladása ehhez mér"
specs:
  - "[[Profile]]"
  - "[[Lépésszám követés]]"
  - "[[Android kezdőképernyő widget]]"
flag:
created: 2026-10-01
closed: 2026-10-01
---

# 136 — Napi lépéscél a Profilban

## Motiváció / probléma

A felhasználó célja a napi 13 000 lépés (fogyás). Az appban nincs lépéscél: az Android widget
haladás-sávja a „kevés lépés” értesítési küszöbhöz (`stepsLowThreshold`, alapból 2000) mér,
ezért a sáv már kora délután 100%-on áll, és ez félrevezető.

## Jelenlegi működés

[[Android kezdőképernyő widget]]: „A »lépés-cél« nem dedikált beállítás — az [[Értesítések]]
`stepsLowThreshold` hangolási értékét” használja (`widget-snapshot.service.ts`). A [[Profile]]
nem tárol lépéscélt.

## Elfogadási kritériumok

- [x] `UserProfile.dailyStepGoal` (opcionális egész, 1000–100 000). Flyway + OpenAPI + SQLite +
      outbox-verzió; Profil-szerkesztőben mező.
- [x] Android widget lépés-haladás: `dailyStepGoal`, ennek hiányában a régi fallback
      (`stepsLowThreshold`).
- [x] A [[Lépésszám követés]] képernyőn a mai nap haladás-sávja a célhoz mér, a listában
      jelölve, mely napokon teljesült a cél.
- [x] A `STEPS_LOW` értesítés küszöbe változatlanul külön beállítás marad.
- [x] Specek frissítve.

## Terv / döntési napló

- A cél a Profilon él (syncel), nem device-local: több eszközön is ugyanaz legyen.

## Lezáráskor (on-done)

- Frissített specek: [[Profile]], [[Lépésszám követés]], [[Android kezdőképernyő widget]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — #136 napi lépéscél
- Kód: `V50__user_profile_daily_step_goal.sql`, `profile/ProfileEntity|Mapper`, `shared/step-goal.ts`,
  `core/widget/widget-snapshot.service.ts`, `pages/menu/profile/`, `pages/menu/steps/step-tracker.page.*`,
  SQLite `SCHEMA_V47`, outbox v16 (`4dbe414`)
