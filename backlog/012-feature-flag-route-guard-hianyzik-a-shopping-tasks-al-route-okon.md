---
id: 12
type: bug
status: backlog
title: Feature-flag route-guard hianyzik a shopping + tasks al-route-okon
specs:
  - "[[Bevásárlás]]"
  - "[[Tennivalók]]"
  - "[[Frontend]]"
flag:
created: 2026-09-02
closed:
---

# 12 — Feature-flag route-guard hianyzik a shopping + tasks al-route-okon

## Motiváció / probléma

A menu.bevasarlas es a harom feladatok.* csempe-flag csak a menu/hub csempet rejti, a /tabs/menu/shopping* es a Feladatok al-route-ok deep-linkkel elerhetok maradnak. Minden testver menu-route fel van guardolva; az app.routes.ts komment is 'gyerek route-ok is guardoltak'-at ir elo.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Bevásárlás]], [[Tennivalók]], [[Frontend]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
