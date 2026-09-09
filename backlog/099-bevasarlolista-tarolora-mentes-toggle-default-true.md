---
id: 99
type: change-request
status: backlog
title: Bevásárlólista — „tárolóba mentés" toggle (alapból bekapcsolva)
specs:
  - "[[Bevásárlólista írás]]"
  - "[[Bevásárlás teljesítve]]"
  - "[[Élelmiszer tárolás]]"
flag:
created: 2026-09-09
closed:
---

# 99 — Bevásárlólista — „tárolóba mentés" toggle (alapból bekapcsolva)

## Motiváció / probléma

A bevásárlólistán legyen egy kapcsoló: **teljesítéskor a pipált tételek bekerüljenek-e a
tárolóba (`StoredFood`)** vagy sem. Alapértelmezés: **be** (a jelenlegi viselkedés). Az ok:
nem mindig otthonra vásárolok — pl. útközben, más helyre írok bevásárlólistát, és olyankor nem
akarom a saját otthoni készletembe felvenni a tételeket.

## Jelenlegi működés

[[Bevásárlás teljesítve]]: a pipált élelmiszer → tárolási tétel(ek) (`StoredFood`), a darabolási
szabályok szerint. Ez **mindig** megtörténik, nincs kikapcsolási lehetőség. A nem-élelmiszer
tételek eleve nem kerülnek tárolóba.

## Elfogadási kritériumok

- [ ] Lista-szintű `saveToStorage` (v. `addToInventory`) boolean a bevásárlólistán, default `true`.
- [ ] A [[Bevásárlás teljesítve]] wizard tiszteletben tartja: `false` esetén **nem** hoz létre
      `StoredFood` sorokat, a többi (előzménybe zárás, listák állapota) változatlan.
- [ ] A kapcsoló elérhető a lista szerkesztőn és/vagy a teljesítés wizard elején (döntés a
      scopingban; a wizard eleji a láthatóbb).
- [ ] Perzisztált mező a `ShoppingList`-en (OpenAPI + `SCHEMA_Vn`), hogy több eszközön is
      konzisztens; outbox-hatás ellenőrizve (`verify:outbox`).
- [ ] `#### Backend-offline`: a toggle és a teljesítés Full-offline is működik; a `StoredFood`
      írás elmaradása helyben és a szerveren azonos. Lásd [[Backend-offline first]].

## Terv / döntési napló

_A `splitCountFor` / darabolási logika érintetlen — csak az a döntés változik, hogy a wizard
kiírja-e a `StoredFood` sorokat. Nyitott: a nem-élelmiszer tételekre nincs hatás (eddig sem
volt)._

## Lezáráskor (on-done)

- Frissített specek: [[Bevásárlólista írás]] (lista mező + UI), [[Bevásárlás teljesítve]]
  (teljesítés ága a toggle szerint), [[Élelmiszer tárolás]] (bevásárlásból létrehozás — feltétel)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: backend `ShoppingList` (mező + `V<n>` + OpenAPI + `ShoppingListService.complete`);
  frontend `shopping-list-*` page, `shopping-list-complete.ts`, `SCHEMA_V<n>`, `verify:outbox`
  snapshot, érintett `*.spec.ts`
