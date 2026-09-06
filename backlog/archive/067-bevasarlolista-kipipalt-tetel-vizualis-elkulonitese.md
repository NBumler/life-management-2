---
id: 67
type: change-request
status: done
title: Bevásárlólistán a kipipált tétel legyen vizuálisan elkülönítve
specs:
  - "[[Bevásárlólista írás]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 67 — Bevásárlólistán a kipipált tétel legyen vizuálisan elkülönítve

## Motiváció / probléma

Vásárlás közben a kipipált („megvettem”) tételek ott maradnak a nem-pipáltak között, így nehéz
átlátni, mi van még hátra. A kipipált tételek külön szekcióba (pl. lista aljára) csoportosítása
vagy erős vizuális megkülönböztetése (áthúzás + halványítás + rendezés) gyorsabbá tenné a
maradék végigvásárlását.

## Jelenlegi működés

[[Bevásárlólista írás]] → „Tételek **pipálhatók** … A pipa csak UI / állapot a listán”. A
UI/UX elvárások közt: „tételek listája, pipa kontroll tételenként” — nincs kikötve, hogy a
kipipáltak elkülönülnek vagy a lista aljára kerülnek.

## Elfogadási kritériumok

- [ ] Kipipált tételek a lista alján, külön szekcióban (fejléc pl. „Kosárban (N)”), vagy stabil
      másodlagos rendezési kulcsként a pipa-állapot.
- [ ] A nem-pipált tételek relatív sorrendje ne változzon pipáláskor.
- [ ] Vizuális jelzés a kipipálton (áthúzott név, halványított sor).
- [ ] Összecsukható „kész” szekció opcionális.
- [ ] Tisztán UI/állapot változás — nincs backend / outbox hatás; a [[Bevásárlás teljesítve]]
      flow bemenete változatlan.

## Terv / döntési napló

_Döntés: külön szekció + fejléc vs. csak rendezés + stílus. Előbbi tisztább nagy listán._

## Lezáráskor (on-done)

- A `shopping-list-editor` a tételeket két származtatott csoportra bontja: `uncheckedItems()` a
  húzható `app-reorder-list`-ben (változatlan), `checkedItems()` egy külön `ion-list`-ben a lista
  alján `Kosárban (N)` (`SHOPPING.LIST.CHECKED_HEADER`) `ion-item-divider` fejléccel, halványítva
  (`opacity`) + áthúzott névvel. Vissza-pipálásra a tétel visszakerül az eredeti helyére.
- A kanonikus, sorrendtartó `items()` signal nem változik a pipálástól; `onUncheckedReordered`
  a húzott sorrendet visszafűzi az `items()`-be a kipipáltak abszolút pozíciójának megtartásával.
  A mentett `sortOrder` / `checked` érintetlen — nincs backend / outbox hatás.
- Frissített specek: [[Bevásárlólista írás]] (`### Funkcionális leírás`, `### UI/UX elvárások`, `### Frontend`)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — Bevásárlólistán a kipipált tételek külön szekcióba (#67)
- Kód: `frontend/src/app/pages/menu/shopping/shopping-list-editor.page.{ts,html}` (+ 2 új teszt)
