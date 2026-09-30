---
id: 133
type: feature
status: ready
title: "Sablon-gyakorlat megjegyzés (pl. padállás „szék: 5”, tempó) — látszik az élő edzésben"
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-10-01
closed:
---

# 133 — Sablon-gyakorlat megjegyzés

## Motiváció / probléma

A felhasználó a gyakorlatait padbeállítással jegyzi („Incline bench press (szék: 4)”,
„Vállból nyomás (szék: max)”), és ugyanaz a gyakorlat sablononként más beállítással megy.
A negatív egykezes húzódzkodásnál a tempó (3–5 mp leengedés) is sablon-szintű utasítás.
Ma ez csak a gyakorlat nevébe vagy a globális `description`-be írható.

## Jelenlegi működés

`WorkoutPlanExercise` mezői: snapshotok, `orderIndex`, `supersetGroup`, `targetSets`, és nincs
megjegyzés. A session entry-n sincs megjegyzés (csak a session `notes`).

## Elfogadási kritériumok

- [ ] `WorkoutPlanExercise.notes` (opcionális, max. 200 karakter): Flyway + OpenAPI + SQLite
      `SCHEMA_Vn` + outbox payload-verzió emelés / migrátor lépés.
- [ ] Sablon-szerkesztőben a gyakorlat-fejléc alatt egysoros mező.
- [ ] Terv-indításkor a megjegyzés az Active Workout / utólagos form gyakorlat-fejléce alatt
      segédszövegként látszik (display-only a draftban, mint a `repsTarget`). A session
      entry nem tárolja.
- [ ] [[Heti terv]], [[Edzésnapló]] spec frissítve.

## Terv / döntési napló

- A backlog/134 és /135 ugyanabba a séma-körbe kerül (egy Flyway + egy `SCHEMA_Vn` +
  egy outbox-verzió).

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
