---
id: 235
type: feature
status: backlog
title: Túra — útvonal és felvett nyomvonal exportja GPX-be
specs: []
flag:
created: 2026-10-21
closed:
---

# 235 — Túra — útvonal és felvett nyomvonal exportja GPX-be

## Motiváció / probléma

A #106 tervezésekor (D4) a GPX-export külön jegybe került: a felvett túra és a tervezett útvonal más appba
(Strava, Wikiloc, Garmin, turistautak.openstreetmap.hu) csak GPX-fájlként vihető át. Ehhez fájl-megosztás
kell (megosztó plugin / Filesystem), ami a #106-ban nem volt benne.

## Jelenlegi működés

A tervezett és a felvett útvonal is `HikeRoute`-ként mentődik az Útvonalaim közé (koordináták + metrika,
`backlog/archive/106-tura-gps-navigacio-elo-helymegosztas.md`); exportálni sehogy nem lehet.

## Elfogadási kritériumok

- [ ] Az útvonal-kártyán (Útvonalaim) „Exportálás GPX-be”: a rendszer megosztó lapja nyílik egy `.gpx`
      fájllal (név = az útvonal neve), FULL_OFFLINE is (a fájl az eszközön készül).
- [ ] A GPX 1.1 érvényes: `trk` / `trkseg` / `trkpt` (lat, lon), napváltónként külön `trkseg` vagy a
      döntés szerint; a magasság (`ele`), ha a DEM-ből ismert.
- [ ] Web buildben letöltés (fájl mentése), megosztó lap nélkül — vagy tudatosan csak natív (döntés).

## Terv / döntési napló

Nyitott döntések:

- Új natív függőség: `@capacitor/share` + `@capacitor/filesystem` (a Filesystem már megvan a #105 óta), vagy
  más megoldás.
- Időbélyeg (`time`) a pontokon: a felvett nyomvonal pontjai mentéskor egyszerűsödnek, és a `HikeRoute` nem
  tárol időt (#106 D3) — idő nélküli GPX, vagy előbb a felvétel idejének megőrzése (séma-változás, külön jegy).
- Import (GPX → útvonal) ide tartozik-e, vagy külön jegy.

## Lezáráskor (on-done)

- Frissített specek: [[…]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
