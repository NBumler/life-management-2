---
id: 18
type: change-request
status: backlog
title: Auth: proaktiv csendes access-token frissites lejarat elott
specs:
  - "[[Bejelentkezés]]"
flag:
created: 2026-09-02
closed:
---

# 18 — Auth: proaktiv csendes access-token frissites lejarat elott

## Motiváció / probléma

A refresh jelenleg csak reaktiv (401 utan); az accessTokenExpiresSoon() holt kod. A spec hatter-megujitast ir le lejarat elott.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Bejelentkezés]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
