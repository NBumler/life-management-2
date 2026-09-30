---
id: 132
type: feature
status: ready
title: "Bemelegítő-szett generátor (ramping warm-up) a sablon- és az edzés-szerkesztőkben"
specs:
  - "[[Edzésnapló]]"
  - "[[Heti terv]]"
flag:
created: 2026-10-01
closed:
---

# 132 — Bemelegítő-szett generátor (ramping)

## Motiváció / probléma

Edzés-elemzés (2026-09-30): nehéz gyakorlat előtt fáradtságmentes, felfelé skálázott bemelegítés
kell: 5 ismétlés minimális súllyal (1 perc pihenő), 2–3 ismétlés a munkasúly ~60–70%-ával
(1,5 perc), 1 ismétlés ~85–90%-kal (2 perc). Ezt minden gyakorlatnál kézzel beírni lassú.

## Jelenlegi működés

A sablon (`targetSets`) és a session is tetszőleges `WARMUP` szetteket tud, de mindet kézzel
kell felvenni. A spec szerint nincs %-os 1RM-mátrix, mindig abszolút kg mentődik.

## Elfogadási kritériumok

- [ ] A gyakorlat ⋮ menüjében „Bemelegítés generálása” (csak `WEIGHTED_REPS` /
      `BODYWEIGHT_REPS` kindnál), ha a gyakorlat első `WORKING` szettjén van súly (≠ 0). Ha nincs,
      a menüpont info-toastot ad („Előbb add meg a munkasúlyt”).
- [ ] 3 `WARMUP` szettet szúr a munkaszettek elé: 5 × ~30%, 3 × ~65%, 1 × ~87% a munkasúlyból,
      2,5 kg-ra kerekítve, pihenő 60 / 90 / 120 mp. Negatív (rásegített) munkasúlynál a
      rásegítés arányosan nagyobb (ugyanazzal a kisebb terhelés-hányaddal a testsúlyhoz képest).
- [ ] Ha a gyakorlatnak már vannak `WARMUP` szettjei, a generálás ezeket lecseréli.
- [ ] Mentve abszolút kg — nincs %-mező a modellben. Pure TS utility unit-teszttel.
- [ ] Sablon-szerkesztőben, utólagos formban és Active Workoutban egyaránt elérhető.
- [ ] [[Edzésnapló]], [[Heti terv]] spec frissítve.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]], [[Heti terv]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
