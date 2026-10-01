---
id: 143
type: feature
status: done
title: "Tervezett mászás (mászás típusú esemény) — a terhelés, figyelmeztetések és rotáció előre is számol"
specs:
  - "[[Események]]"
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
  - "[[Naptár]]"
flag:
created: 2026-10-01
closed: 2026-10-01
---

# 143 — Tervezett mászás

## Motiváció / probléma

A felhasználó rendszertelenül mászik, de gyakran napokkal / egy héttel előre tudja, mikor fog.
A backlog/137–139 terhelés-áttekintés, figyelmeztetések és rotáció ma csak a már rögzített
mászásokat látja, így előre nem tud igazítani (pl. mászás előtti napon ujjedzést javasol).

## Jelenlegi működés

[[Heti terv]]: a heti terhelés csak a [[Mászónapló]] rögzített sessionjeiből számol; jövőbeli
mászást megadni nem lehet. [[Események]]: típus nélküli `CalendarEvent`.

## Elfogadási kritériumok

- [x] `CalendarEvent.activityType` (opcionális enum, egyelőre `CLIMBING`; `null` = általános
      esemény). Flyway + OpenAPI + SQLite + outbox-verzió. A tervezett mászás egy mászás típusú
      esemény (egyszeri vagy ismétlődő), így szinkronizál, és a [[Naptár]]ban / eseménylistában is látszik.
- [x] Esemény-űrlap: „Típus: Esemény / Mászás”; mászásnál a cím előtöltve „Mászás”, alapból egész napos.
- [x] [[Heti terv]] napsor (ma / jövő): „+ Mászás” kapcsoló → egyszeri, egész napos mászás-esemény
      létrehozása / törlése; ismétlődő mászásnál a kapcsoló a szerkesztőt nyitja (nincs előfordulás-kivétel).
- [x] Jelvények: „Mászás (tervezett)” (ma / jövő), szürke „Elmaradt” (múlt, terv volt, rögzítés nincs),
      „Ütközés — edzés áthelyezése javasolt” (beosztott edzés + tervezett mászás egy napon);
      összesítő: „Mászás X nap (+Y tervezett)”.
- [x] Számítás: múltra mindig a rögzített adat, mára / jövőre a terv is:
  - [x] ma tervezett mászás = „ma már másztál” (pihenő / prehab tipp);
  - [x] holnap mászás → info, és a rotáció kihagyja az ujj-gyakorlatos (FOREARM_FINGERS /
        HANGBOARD_PINCH) sablonokat; ujj-gyakorlatos mai slotnál figyelmeztetés;
  - [x] „sok mászás a héten” a tervezettekkel együtt, a teljes naptári hétre;
  - [x] előrejelzett pihenőhiány: a következő 7 napban (ma is) nincs szabad nap (tervezett mászás
        vagy heti slot nélküli nap) → figyelmeztetés.
- [x] Specek frissítve.

## Terv / döntési napló

- 2026-10-01: külön entitás helyett az [[Események]] bővítése — ingyen jár a szinkron, a naptár,
  a helyszín, az időpont és az ismétlődés. Mellékhatás (elfogadva): egész napos mászás-eseményről
  09:00-kor értesítés jön, mint minden egész napos eseményről.
- Implementáció három részben: A) adat + esemény-űrlap; B) számítások; C) Heti terv UI + specek.

## Lezáráskor (on-done)

- Frissített specek: [[Események]], [[Heti terv]], [[Edzésnapló]], [[Naptár]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — #143 tervezett mászás
- Kód: A `6a2598d` (V51, `CalendarEvent.activityType`, esemény-űrlap), B `01ddd30` (`training-load.ts`,
  `load-warnings.ts`, `rotation-suggestion.ts`, gyorsindító), C `e59bc75` (Heti terv kapcsoló + jelvények)
