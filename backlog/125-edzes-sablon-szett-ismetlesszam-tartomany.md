---
id: 125
type: feature
status: ready
title: Edzés sablon — szett cél-értéke tartományként ("8-12"), számként tárolt alsó/felső határral
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-24
closed:
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

- [ ] A sablon szerkesztőben az érintett mező(k) szöveges inputként fogadják a `N` és `N-M` alakot
      (szóközök tűrve, `–` en-dash is elfogadva); `N-M` esetén `N ≤ M` kötelező, egyébként inline
      hiba.
- [ ] Tárolás számként, additív módon: a meglévő `reps` marad az alsó határ / egyetlen érték, új
      nullable `repsMax` a felső határ (`null` = nem tartomány). Meglévő adatok migráció nélkül
      érvényesek.
- [ ] Megjelenítés tartományként (`8–12`) a sablonban és a heti terv nézetben.
- [ ] Edzés indításakor a session szett előtöltése: `reps = ceil((alsó + felső) / 2)` (pl.
      `8–12 → 10`, `8–11 → 10`); a tartomány célként látszik az aktív edzés felületen.
- [ ] Parse-logika tiszta függvényben, unit tesztekkel (érvényes / érvénytelen / fordított / üres).
- [ ] Flyway + natív `SCHEMA_Vn` + OpenAPI + `gen:api`; `verify:outbox` snapshot frissítés
      (+ `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump; migráció: régi payload → `repsMax = null`).
- [ ] Zöld lint + test:ci + build + backend test + verify:outbox.

## Terv / döntési napló

- **Döntés (2026-09-24):** első körben **csak az ismétlésszám** (`reps` + `repsMax`). Más
  cél-mezőkre (súly, tartási idő, táv, pihenő) később várhatóan kelleni fog — ezért a parse- és
  megjelenítő logika legyen mezőtől független, újrahasznosítható (`<mező>` + `<mező>Max` minta),
  hogy a bővítés csak új oszlop + bekötés legyen.
- **Döntés (2026-09-24):** előtöltés a két határ átlagával, felfelé kerekítve.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
