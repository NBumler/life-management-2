---
id: 75
type: change-request
status: backlog
title: Kísérlet stílus — tisztázás: flash / onsight / redpoint egyszerre lehet-e (jelenleg 1 select)
specs:
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed:
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

- Frissített specek: [[Mászónapló]] (`AscentAttempt.ascentStyle` — indoklás / Tudatos korlát)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: nincs, vagy `frontend` attempt input + statisztika
