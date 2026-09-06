---
id: 75
type: change-request
status: dropped
title: Kísérlet stílus — tisztázás: flash / onsight / redpoint egyszerre lehet-e (jelenleg 1 select)
specs:
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 75 — Kísérlet stílus — tisztázás: flash / onsight / redpoint egyszerre lehet-e (jelenleg 1 select)

## Motiváció / probléma

„Flash, onsight — ezek nem lehetnek egyszerre? Jelenleg csak 1 select van rá.” Meg kell nézni, hogy
az egyválasztós `ascentStyle` helyes-e, vagy van értelme több címkének egy sikeres kísérleten.

Első elemzés: a három érték **definíció szerint egymást kizárja** (onsight és flash is első
próbára szól, a különbség csak a előzetes infó; redpoint = korábbi próbák után) — tehát az
egyválasztós UI valószínűleg helyes, és a kérdést a [[071-climbing-kiserlet-stilus-onsight-flash-redpoint-sugo-gomb]]
súgószövege oldja meg. Ez a jegy azért van, hogy a döntés le legyen írva, ne térjen vissza.

## Jelenlegi működés

[[Mászónapló]] `AscentAttempt.ascentStyle`: egyetlen opcionális enum (`ONSIGHT` \| `FLASH` \|
`REDPOINT`), csak `isSuccess` esetén. A statisztika sikerarány-bontása is egyértékű besorolást
feltételez (rögzített stílus nélküli siker = redpoint).

## Elfogadási kritériumok

- [ ] Döntés dokumentálva: marad egyválasztós (várható), vagy indokolt esetben többértékű.
- [ ] Ha marad: a döntés indoklása bekerül a spec `#### Tudatos korlát` / Megjegyzések szakaszába,
      és a súgó (071) egyértelműsíti, miért kizáró.
- [ ] Ha többértékű lesz: enum → set, migráció, a sikerarány-statisztika besorolási szabálya
      újragondolva.

## Terv / döntési napló

_Valószínű: `dropped` vagy „nincs kódváltás, csak spec-jegyzet + súgó”. A 070/071 jegyekkel együtt
zárható._

## Lezáráskor (on-done)

**`dropped` — nincs kódváltás.** Az elemzés eredménye: a három érték (`ONSIGHT` / `FLASH` /
`REDPOINT`) definíció szerint egymást kizárja — mindegyik egy sikeres kísérlet **egyetlen**
minősítése, nem egymásra rakható címkék. Az egyválasztós `ascentStyle` helyes; a #071 súgószövege
(`WORKOUT.CLIMBING.ASCENT_STYLE.HELP_*`) elmagyarázza, miért. Ha később elkülönült „clean / no
falls" jelző kell (a stílustól függetlenül), az önálló mező lesz, nem az `ascentStyle` set-esítése.

- Frissített spec: [[Mászónapló]] `### Megjegyzések` → `#### Tudatos korlát — egy ascent-style / kísérlet`
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #75 dropped (egyválasztós ascentStyle szándékos)
- Kód: nincs
