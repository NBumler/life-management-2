---
id: 67
type: change-request
status: backlog
title: Bevásárlólistán a kipipált tétel legyen vizuálisan elkülönítve
specs:
  - "[[Bevásárlólista írás]]"
flag:
created: 2026-09-06
closed:
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

- Frissített specek: [[Bevásárlólista írás]] (`### UI/UX elvárások`)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` aktív bevásárlólista képernyő
