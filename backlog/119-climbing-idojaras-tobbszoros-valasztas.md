---
id: 119
type: change-request
status: backlog
title: Mászó session — időjárás többszörös választással, bővebb címkekészlettel
specs:
  - "[[Mászónapló]]"
  - "[[Outdoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
flag:
created: 2026-09-24
closed:
---

# 119 — Mászó session — időjárás többszörös választással, bővebb címkekészlettel

## Motiváció / probléma

Az időjárás ma egyetlen, összevont értéket vehet fel (pl. csak „meleg, párás" van, „meleg, száraz"
nincs). A valóságban egy session alatt változhatnak a körülmények: egy több kötélhosszas út elején
meleg volt, a végén hideg; száraz volt, aztán eleredt az eső. Ezért **bármely kombináció egyszerre
választható** kell legyen — egymásnak ellentmondó címkék (meleg + hideg) is.

## Jelenlegi működés

`ClimbingSession.weatherConditions`: egyetlen nullable enum — `COLD_DRY | HOT_HUMID | WINDY | WET`
(csak kültéri session). A két hőmérséklet-érték páratartalommal van összevonva, így pl. „meleg +
száraz" vagy „hideg + párás" nem fejezhető ki, és egyszerre csak egy érték adható meg.

## Elfogadási kritériumok

- [ ] A mező többértékű lesz: `weatherConditions: WeatherCondition[]` (üres lista = nincs megadva).
- [ ] Atomi (nem összevont) címkék, javaslat: `HOT`, `MILD`, `COLD`, `DRY`, `HUMID`, `WINDY`,
      `RAIN` (esett / eleredt), `WET_ROCK` (vizes szikla), `SUNNY`, `SHADE` — a végleges lista a
      scopingkor rögzítendő.
- [ ] Nincs kölcsönös kizárás: bármely kombináció menthető (pl. `HOT` + `COLD`).
- [ ] UI: toggle-chipek (több kiválasztható), nem egyválasztós select.
- [ ] Adatmigráció a meglévő értékekre: `COLD_DRY → [COLD, DRY]`, `HOT_HUMID → [HOT, HUMID]`,
      `WINDY → [WINDY]`, `WET → [WET_ROCK]` (vagy `RAIN` — döntendő) — Flyway + natív `SCHEMA_Vn`.
- [ ] Outbox: payload-alak változik → `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump + `outbox-migrator.ts`
      lépés a `ClimbingSession`-re (régi skalár → lista, ugyanazzal a leképezéssel), `verify:outbox
      -- --write`.
- [ ] Megjelenítés a session listában / részleteknél több címkével; i18n hu/en.
- [ ] Zöld lint + test:ci + build + backend test.

## Terv / döntési napló

- Tárolás: Postgres `text[]` oszlop + `CHECK` az elemekre, vagy külön gyerektábla. Javaslat: `text[]`
  (a session nested PUT-ja amúgy is egyben írja; nincs szükség saját sync-sorra). Natív SQLite-ban
  JSON-szöveg oszlop.
- Nyitott: a végleges címkekészlet (fent javaslat), és hogy a `WET` régi érték `RAIN`-re vagy
  `WET_ROCK`-ra képeződjön.
- Nyitott: beltéri sessionöknél továbbra sem jelenik meg (javaslat: igen, csak kültéri).

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]], [[Outdoor köteles napló]], [[Outdoor boulder napló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
