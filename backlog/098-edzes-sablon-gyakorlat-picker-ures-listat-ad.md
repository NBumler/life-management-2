---
id: 98
type: bug
status: backlog
title: Edzés — új sablonban a gyakorlat-hozzáadás pickere üres listát ad (keresésre / szűrőre is)
specs:
  - "[[Heti terv]]"
  - "[[Gyakorlat]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-09
closed:
---

# 98 — Edzés — új sablonban a gyakorlat-hozzáadás pickere üres listát ad (keresésre / szűrőre is)

## Motiváció / probléma

Edzéssablon (`WorkoutPlan`) szerkesztésekor a „gyakorlat hozzáadása" ablakban a lista **üres**,
és keresésre / szűrőre is teljesen üres marad. Ugyanakkor, ha nem sablonból nézem a
gyakorlatokat, hanem a [[Gyakorlat]] törzsadat-képernyőn, ott minden gyakorlat megvan.

Valószínű ok: a `backlog/065` ([[065]]) az `ExerciseCategory` enumot felbontotta
(`ARMS` → `BICEPS`/`TRICEPS`, `CORE` → `ABS`/`LOWER_BACK`/`OBLIQUES`) — a sablon-picker
kategória-szűrője / label-lookup-ja / `PLAN_TO_ENTRY_CATEGORY` hídja valahol a régi
`ARMS`/`CORE` értékekre épül, vagy egy ismeretlen enum-értéknél kivételt dob / kiüríti a listát.

## Jelenlegi működés

[[Heti terv]] `WorkoutPlanExercise`: „meglévő `GearItem`… " — pardon, gyakorlat hozzáadása
**pickerrel** a [[Gyakorlat]] katalógusból; a picker a `WorkoutPlan` szerkesztőn belül él.
[[Gyakorlat]] `#### Migrációs jegyzet — ARMS / CORE felbontás`: `V35` / `SCHEMA_V34`, 11-értékű
`ExerciseCategory`; a frontend a `PLAN_TO_ENTRY_CATEGORY` hidat (`workout-fields.ts`) és az
`EXERCISE_CATEGORY_LABEL_KEYS`-t (`exercise-labels.ts`) sorolja fel.

## Elfogadási kritériumok

- [ ] A sablon gyakorlat-picker a teljes (nem törölt) gyakorlat-katalógust listázza, ugyanúgy,
      mint a [[Gyakorlat]] képernyő.
- [ ] Kategória-szűrő működik mind a 11 új `ExerciseCategory` értékre; ismeretlen / régi érték
      nem üríti ki a listát és nem dob kivételt.
- [ ] Keresés ([[Szöveges keresés]]) a pickerben visszaadja a találatokat.
- [ ] Regressziós teszt: sablon-szerkesztő picker nem üres, adott kategóriára szűrve helyes.
- [ ] Ellenőrzés a [[Edzésnapló]] ad-hoc gyakorlat-pickerén is (ugyanaz a komponens?).
- [ ] Gyökérok rögzítve a döntési naplóban (mi tört el a 065-tel).

## Terv / döntési napló

_Scoping: a sablon-picker komponens (`pages/workout/weekly-plan/*` vagy megosztott
`exercise-picker`) kategória-map / label-lookup lekövetése; console-hiba ellenőrzése a picker
megnyitásakor. Ha `EXERCISE_CATEGORY_LABEL_KEYS` / `PLAN_TO_ENTRY_CATEGORY` hiányos, kiegészíteni._

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] / [[Gyakorlat]] (ha a picker viselkedése pontosul)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `exercise-labels.ts` / `workout-fields.ts` / a picker komponens, érintett
  `*.spec.ts`
