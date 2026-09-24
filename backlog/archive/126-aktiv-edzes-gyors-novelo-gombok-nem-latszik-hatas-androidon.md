---
id: 126
type: bug
status: done
title: Aktív edzés — a +2.5 / +5 / +1 gyors-növelő gombok hatása nem látszik (Android)
specs:
  - "[[Edzésnapló]]"
flag:
created: 2026-09-24
closed: 2026-09-24
---

# 126 — Aktív edzés — a +2.5 / +5 / +1 gyors-növelő gombok hatása nem látszik (Android)

## Motiváció / probléma

„Edzés indítása" után az aktív edzés felületén a szettsorokban `+2.5`, `+5`, `+1` gombok vannak.
Androidon ezekre nyomva láthatóan semmi nem változik. Gyanú: a sorban nem fér ki minden, és az
érintett input nem látszik (vagy le van vágva).

## Jelenlegi működés

`pages/workout/log/active-workout.page.html`: egy `ion-item` szettsorban balra checkbox +
sorszám-label (`slot="start"`), középen `.set-fields` (típus-select + reps / súly / … inputok),
jobbra `ion-buttons slot="end"` — súlyos gyakorlatnál `+2.5`, `+5`, repses gyakorlatnál `+1`, plusz
`✕`. A gombok a `bump(field, delta)`-t hívják (`active-workout.page.ts`), ami a szett signalját
frissíti (`(value ?? 0) + delta`) és `persist()`-et hív; az inputok `[value]="set.weightKg()"` /
`[value]="set.reps()"` kötéssel olvasnak.

Keskeny kijelzőn a sor tartalma (checkbox + túl széles sorszám-oszlop, ld. #124 + select + 2 input
+ 4 gomb) nem fér el, a `.set-fields` inputjai összenyomódhatnak / levágódhatnak.

## Elfogadási kritériumok

- [x] Reprodukálva Android eszközön / emulátoron (≈360 px szélesség); gyökérok eldöntve:
      (a) layout — az input nem látszik; (b) a `bump` ténylegesen nem frissíti a megjelenített
      `ion-input` értéket (pl. `[value]` kötés + gépelt érték eltérés); (c) mindkettő.
- [x] Gombnyomásra a megfelelő mező értéke láthatóan változik, és a változás perzisztálódik.
- [x] A szettsor keskeny kijelzőn is áttekinthető: pl. a gyors-növelő gombok a mező alá / mellé
      kerülnek, vagy a mező melletti kompakt `+` / `−` stepperré alakulnak — minden mező és gomb
      látható, vízszintes levágás nélkül.
- [x] Regressziós spec-teszt a `bump` → megjelenített érték útra.
- [x] Zöld lint + test:ci + build; ellenőrzés telefonon.

## Terv / döntési napló

_Érdemes a #124-gyel (sorszám-oszlop szélessége) együtt csinálni, mert ugyanazt a sort érinti._

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #126
- Kód: `pages/workout/log/active-workout.page.*`, `shared/styles/_set-row.scss`
- Megjegyzés: Gyökérok: (a) layout — a `bump` logika helyes volt, az összenyomott input nem mutatta. Gyors-növelők a mezők alá; 360 px-es iframe-mérés + DOM-regressziós spec. Telefonos ellenőrzés a következő telepítéskor.
