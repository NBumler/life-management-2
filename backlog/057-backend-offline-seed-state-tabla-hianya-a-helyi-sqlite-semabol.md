---
id: 57
type: chore
status: backlog
title: Backend-offline: seed_state tabla hianya a helyi SQLite semabol
specs:
  - "[[Backend-offline first]]"
flag:
created: 2026-09-02
closed:
---

# 57 — Backend-offline: seed_state tabla hianya a helyi SQLite semabol

## Motiváció / probléma

A local-database.service.ts nem definial seed_state tablat, pedig a Backend-offline first.md 3. szakasz explicit felsorolja.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
