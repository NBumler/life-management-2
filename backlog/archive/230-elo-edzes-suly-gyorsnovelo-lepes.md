---
id: 230
type: change-request
status: done
title: Élő edzés — a súly gyors-növelő gombjai +0,5 kg / +1 kg legyenek
specs:
  - "[[Edzésnapló]]"
flag:
created: 2026-10-21
closed: 2026-10-21
---

# 230 — Élő edzés — a súly gyors-növelő gombjai +0,5 kg / +1 kg legyenek

## Motiváció / probléma

Az élő edzés (`active-workout`) szettenkénti súly-gyorsgombjai (`+2.5 kg` / `+5 kg`) túl nagy lépések —
a felhasználó finomabb, `+0,5` és `+1` kg-os lépéseket szeretne.

## Jelenlegi működés

[[Edzésnapló]] „Szettek” pont: az Active Workout gyors-növelő gombjai `+2.5 kg` / `+5 kg` súlyos,
`+1 ism.` repses gyakorlatnál, szettenként a mezők alatt.

## Elfogadási kritériumok

- [x] Az élő edzés súlyos szettjeinél a két gomb `+0.5 kg` és `+1 kg`, és ennyivel növeli a szett súlyát.
- [x] Az `+1 ism.` gomb, a progresszió-javaslat (`PROGRESSION_STEP_KG = 2.5`) és a bemelegítés 2,5 kg-os
      kerekítése változatlan.

## Terv / döntési napló

- 2026-10-21 — felvéve és kész. Csak a sablon gombjai változtak (`bump(set.weightKg, 0.5 | 1)`); a CSS-osztályok
  (`bump-weight-small` / `bump-weight-large`) maradtak. A felirat a meglévő gombokhoz és a „Legutóbb” sorhoz
  igazodva ponttal írja a tizedest (`+0.5 kg`).

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] (Szettek: gyors-növelő gombok `+0.5 kg` / `+1 kg`)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-21 — #230
- Kód: `frontend/src/app/pages/workout/log/active-workout.page.html` (+ `.spec.ts`)
