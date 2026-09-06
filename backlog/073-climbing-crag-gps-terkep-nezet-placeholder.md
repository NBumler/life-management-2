---
id: 73
type: feature
status: deferred
title: Mászás — szélességi/hosszúsági fok térképes felhasználása (placeholder, még nincs konkrétum)
specs:
  - "[[Mászónapló]]"
  - "[[Outdoor boulder admin]]"
flag:
created: 2026-09-06
closed:
---

# 73 — Mászás — szélességi/hosszúsági fok térképes felhasználása (placeholder, még nincs konkrétum)

## Motiváció / probléma

A `Crag`-nek van opcionális GPS (`latitude` / `longitude`) mezője, de semmi sem használja.
Kezdhetnénk vele valamit térkép-vonalon: crag-ok térképen, „hozzám legközelebbi” rendezés,
session helyszín pin, útvonal a craghoz, terület-böngészés. **Egyelőre nincs konkrét terv** — ez a
jegy csak azért létezik, hogy dokumentálva legyen, hogy foglalkozni akarunk vele.

## Jelenlegi működés

[[Outdoor boulder admin]]: „`Crag` … opcionális GPS … Térkép/fotó UI: **nem** 2.0 (csak opcionális
GPS mező).” [[Mászónapló]] → `#### Soft delete / offline`: „térképnézet / fotó (a `crag.latitude`
/ `longitude` oszlop létezik, a térkép-UI nincs).”

## Elfogadási kritériumok

- [ ] Scoping-jegy: konkrét use-case(ek) kiválasztása és önálló `ready` jeggyé bontása.
- [ ] Térkép-szolgáltató döntés offline-first korláttal (a natív app hálózat nélkül is használható
      kell legyen — offline térkép-csempe? csak online térkép, offline fallback listára?).
- [ ] GPS bevitel UX: kézi koordináta / „jelenlegi pozíció” gomb / térképről pin.

## Terv / döntési napló

_Deferred — „idővel lehet”. A GPS oszlop már megvan, adatvesztés nincs, ha később jön a UI._

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor boulder admin]], [[Mászónapló]] (térkép-korlát feloldása / szűkítése)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` új térkép nézet, esetleg Capacitor geolocation plugin
