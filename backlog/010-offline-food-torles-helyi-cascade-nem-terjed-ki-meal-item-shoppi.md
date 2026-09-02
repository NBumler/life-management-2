---
id: 10
type: bug
status: backlog
title: Offline Food-torles helyi cascade nem terjed ki meal_item / shopping_list_item sorokra
specs:
  - "[[Élelmiszerek]]"
flag:
created: 2026-09-02
closed:
---

# 10 — Offline Food-torles helyi cascade nem terjed ki meal_item / shopping_list_item sorokra

## Motiváció / probléma

A sqlite-storage-backend.deleteFood csak stored_food + recipe_ingredient sorokat torol helyben; a backend cascade mind a 4 hivatkozo tablat + az uresre fogyott meal-eket kezeli. Az offline store atmenetileg inkonzisztens a kovetkezo delta pull-ig.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszerek]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
