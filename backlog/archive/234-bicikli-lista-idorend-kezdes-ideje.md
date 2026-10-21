---
id: 234
type: change-request
status: done
title: Biciklizés napló — fordított időrend és kezdési idő (óra:perc) kézi bevitelnél is
specs:
  - "[[Biciklizés napló]]"
flag:
created: 2026-10-21
closed: 2026-10-21
---

# 234 — Biciklizés napló — fordított időrend és kezdési idő (óra:perc) kézi bevitelnél is

## Motiváció / probléma

A bicikli edzések listája legyen fordított időrendben (legfrissebb legfelül), és az ugyanazon a
napon lévő utak is rendeződjenek időrendbe. Ehhez óra:perc pontosságú kezdési idő kell minden
bejegyzésen — kézi bevitelnél is, nem csak az élő menetnél.

## Jelenlegi működés

- [[Biciklizés napló]] „Lista: időrend (újabb elöl)” — a tárolók (`SQLite` / backend) `ride_date DESC,
  created_at DESC` sorrendben adják vissza, de a repository mentés után a listavégre fűzi az új/szerkesztett
  sort, így a képernyőn a legutóbb mentett út alulra kerül, amíg nincs újratöltés.
- `startedAt` (timestamptz) már létezik: az élő (LIVE/ESTIMATED) menet kitölti, kézi bejegyzésnél `null`.
  A kézi űrlapon nincs időmező, így az egy napon belüli sorrend csak a létrehozás idején múlik.

## Elfogadási kritériumok

- [x] A lista mindig fordított időrendű: `date` csökkenő, azon belül `startedAt` csökkenő (idő nélküli
      régi bejegyzés az adott nap időzített útjai után), végül `createdAt` csökkenő — mentés után is,
      újratöltés nélkül.
- [x] A kézi űrlapon „Kezdés ideje” (óra:perc) mező; új bejegyzésnél az aktuális idő az alapérték.
      Mentéskor `startedAt` = `date` + idő a kliens időzónájában. Üresen hagyható (régi, idő nélküli sor).
- [x] Élő menet összegzője az indulás idejével előtöltve mutatja ugyanezt a mezőt; szerkesztéskor egy
      meglévő út ideje előtöltődik; ha dátum/idő nem változott, a tárolt `startedAt` (másodpercekkel) marad.
- [x] A listakártyán a dátum mellett az óra:perc is látszik, ha van.
- [x] Nincs séma-/API-/outbox-változás: a meglévő `startedAt` mezőt használjuk minden `trackingMode`-ra.

## Terv / döntési napló

- Új oszlop helyett a meglévő `startedAt` kapja a kézi idő szerepét is (a backend már most is minden
  módban elfogadja és tárolja) — nincs migráció, nincs outbox payload-séma bump.
- A rendezés kliensoldali, egy megosztott komparátorral (`shared/workout/bike-metrics.ts`), így a web
  (online-only) és a natív build ugyanúgy rendez.

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] — `startedAt` mező leírása, űrlap „Kezdés ideje”, Lista sorrend
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-21 — #234 bicikli lista fordított időrend + kezdési idő
- Kód: `frontend/src/app/pages/workout/cycling/`, `frontend/src/app/shared/workout/bike-metrics.ts`
