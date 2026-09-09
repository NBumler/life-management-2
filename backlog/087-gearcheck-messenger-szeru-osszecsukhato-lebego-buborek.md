---
id: 87
type: feature
status: deferred
title: GearCheck — messenger-szerű összecsukható lebegő buborék (specifikálásra vár)
specs:
  - "[[GearCheck]]"
  - "[[Pakolás]]"
flag:
created: 2026-09-09
closed:
---

# 87 — GearCheck — messenger-szerű összecsukható lebegő buborék (specifikálásra vár)

## Motiváció / probléma

Ötlet: a GearCheck (aktív pakolás) elérhető legyen egy Messenger-chatfejhez hasonló,
összecsukható **lebegő buborékként** — más appok / képernyők fölött is látszana, egy tapra
kinyílna a pakolólista, hogy pakolás közben ne kelljen az appot előtérbe hozni.

**Tudatosan félretéve.** Ezt még át kell gondolni: az újabb Android-verziók már engednek
kis-ablakot (freeform / bubble / picture-in-picture), ami lehet, hogy kiváltja ezt a saját
megoldást. Ezért a jegy **`deferred`**, csak dokumentálva van — jó ideig ne foglalkozzunk vele.

## Jelenlegi működés

[[Pakolás]] / [[GearCheck]]: az aktív pakolás csak az appon belül, a GearCheck hub alatt érhető
el. Nincs rendszerszintű overlay / buborék / kis-ablak támogatás.

## Elfogadási kritériumok

- [ ] Scoping-jegy: döntés a rendszer-natív út (Android bubble / freeform / PiP) vs. saját
      `SYSTEM_ALERT_WINDOW` overlay között; iOS-korlátok tisztázása.
- [ ] Engedély-UX (Android „megjelenítés más appok felett") és a Full-offline működés.
- [ ] Mit mutat a buborék összecsukva (hátralévő tételek száma?) és kinyitva.

## Terv / döntési napló

_`deferred` — „idővel lehet". Előbb megvárjuk, hogy az OS-szintű kis-ablak megoldások mennyire
lefedik az igényt. Nincs adat- vagy modell-hatás, amíg nem indul._

## Lezáráskor (on-done)

- Frissített specek: [[Pakolás]] / [[GearCheck]] (a korlát feloldása / szűkítése)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <még nincs meghatározva>
