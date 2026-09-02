---
id: 19
type: change-request
status: backlog
title: Profile: kliensoldali 1-tizedes bevitel-validacio a suly mezokre
specs:
  - "[[Profile]]"
flag:
created: 2026-09-02
closed:
---

# 19 — Profile: kliensoldali 1-tizedes bevitel-validacio a suly mezokre

## Motiváció / probléma

A spec 'max 1 tizedes'; a kliens csak min/max-ot validal, a DB numeric(5,1) skalajara hagyatkozik.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Profile]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
