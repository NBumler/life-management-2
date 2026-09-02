---
id: 9
type: bug
status: backlog
title: Katalogus/recept/etkezes torles-megerosito nem sorolja fel a cascade-hivatkozasokat
specs:
  - "[[Élelmiszerek]]"
  - "[[Recept]]"
  - "[[Étkezés]]"
flag:
created: 2026-09-02
closed:
---

# 9 — Katalogus/recept/etkezes torles-megerosito nem sorolja fel a cascade-hivatkozasokat

## Motiváció / probléma

A specek szerint a megerosito dialogusnak fel kell sorolnia, mi torlodik egyutt (tarolas, recept-hozzavalo, bevasarlolista-tetel, etkezes-tetel) es jeleznie a shared-katalogus miatti tobb-userre kiterjedo hatast. Jelenleg csak generikus figyelmeztetes; a DELETE_CONFIRM_MESSAGE_WITH_REFS i18n kulcs hasznalatlan.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszerek]], [[Recept]], [[Étkezés]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
