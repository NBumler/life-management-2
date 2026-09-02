---
id: 56
type: bug
status: backlog
title: Backend: tombstone fizikai torles (180 nap) utemezett job hianyzik
specs:
  - "[[Backend]]"
flag:
created: 2026-09-02
closed:
---

# 56 — Backend: tombstone fizikai torles (180 nap) utemezett job hianyzik

## Motiváció / probléma

A 410 CURSOR_TOO_OLD ag es a sync_meta.tombstone_horizon olvasas all, de nincs @Scheduled cleanup / horizon-frissito job.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Backend]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
