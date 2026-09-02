---
id: 14
type: feature
status: backlog
title: Nyelv valasztas: Angular LOCALE_ID / registerLocaleData bekotese
specs:
  - "[[Nyelv választás]]"
flag:
created: 2026-09-02
closed:
---

# 14 — Nyelv valasztas: Angular LOCALE_ID / registerLocaleData bekotese

## Motiváció / probléma

Nincs locale-regisztracio; a datum/szam pipe-ok mindig en-US szerint formaznak. A spec hu / en-GB megjelenitest var.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
