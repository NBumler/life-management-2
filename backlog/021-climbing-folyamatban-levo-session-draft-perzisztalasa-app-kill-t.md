---
id: 21
type: feature
status: backlog
title: Climbing: folyamatban levo session draft perzisztalasa (app-kill tuleles)
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-02
closed:
---

# 21 — Climbing: folyamatban levo session draft perzisztalasa (app-kill tuleles)

## Motiváció / probléma

A spec: 'aktiv session = kliens-lokalis draft ... app-kill utan helyreall'. A naplo edit page-ek csak memoriaban tartanak state-et; nincs localStorage/SQLite draft.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]], [[Indoor boulder napló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
