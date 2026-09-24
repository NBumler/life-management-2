---
id: 119
type: change-request
status: done
title: Mászó session — időjárás többszörös választással, bővebb címkekészlettel
specs:
  - "[[Mászónapló]]"
  - "[[Outdoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
flag:
created: 2026-09-24
closed: 2026-09-24
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

- [x] A mező többértékű lesz: `weatherConditions: WeatherCondition[]` (üres lista = nincs megadva).
- [x] Atomi (nem összevont) címkék: `HOT` (meleg), `MILD` (mérsékelt), `COLD` (hideg), `DRY`
      (száraz), `HUMID` (párás), `WINDY` (szeles), `RAIN` (eső — esett / eleredt), `WET_ROCK`
      (vizes szikla), `SUNNY` (napos), `SHADE` (árnyékos).
- [x] Nincs kölcsönös kizárás: bármely kombináció menthető (pl. `HOT` + `COLD`).
- [x] UI: toggle-chipek (több kiválasztható), nem egyválasztós select.
- [x] Adatmigráció a meglévő értékekre: `COLD_DRY → [COLD, DRY]`, `HOT_HUMID → [HOT, HUMID]`,
      `WINDY → [WINDY]`, `WET → [RAIN]` — Flyway + natív `SCHEMA_Vn`.
- [x] Outbox: payload-alak változik → `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump + `outbox-migrator.ts`
      lépés a `ClimbingSession`-re (régi skalár → lista, ugyanazzal a leképezéssel), `verify:outbox
      -- --write`.
- [x] Megjelenítés a session listában / részleteknél több címkével; i18n hu/en.
- [x] Zöld lint + test:ci + build + backend test.

## Terv / döntési napló

- Tárolás: Postgres `text[]` oszlop + `CHECK` az elemekre, vagy külön gyerektábla. Javaslat: `text[]`
  (a session nested PUT-ja amúgy is egyben írja; nincs szükség saját sync-sorra). Natív SQLite-ban
  JSON-szöveg oszlop.
- **Döntés (2026-09-24):** a címkekészlet a fenti 10 érték; a régi `WET` → `RAIN` (nem `WET_ROCK`).
- Beltéri sessionöknél továbbra sem jelenik meg (csak kültéri).

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]], [[Outdoor köteles napló]], [[Outdoor boulder napló]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #119
- Kód: `V45__climbing_session_weather_multi.sql`, `climbing/ClimbingSession*` (backend), `SCHEMA_V42`, `shared/climbing/weather.ts`, `shared/weather-chips/`, `core/sync/outbox-migrator.ts` (v10→v11)
- Tárolás: Postgres `text[]` (a javaslat szerint), natívan JSON-szöveg.
