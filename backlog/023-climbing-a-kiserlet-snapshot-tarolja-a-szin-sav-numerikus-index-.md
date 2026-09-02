---
id: 23
type: feature
status: backlog
title: Climbing: a kiserlet-snapshot tarolja a szin-sav numerikus index-tartomanyat
specs:
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-02
closed:
---

# 23 — Climbing: a kiserlet-snapshot tarolja a szin-sav numerikus index-tartomanyat

## Motiváció / probléma

A spec attempt-snapshotja tartalmazza az 'index tartomany'-t; rowToSaveItem csak gradeRange szoveget + egy absoluteDifficultyIndex-et ir, az AscentAttempt-nek nincs lower/upper index oszlopa.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Indoor boulder napló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
