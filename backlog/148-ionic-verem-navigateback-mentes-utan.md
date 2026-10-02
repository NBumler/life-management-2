---
id: 148
type: bug
status: backlog
title: "Szerkesztő oldalak: mentés után előre-navigálás a listára — az Ionic veremben maradt űrlap újrahasznosul"
specs: []
flag:
created: 2026-10-02
closed:
---

# 148 — Mentés utáni `navigateByUrl` → újrahasznosított szerkesztő oldal (app-szintű)

## Motiváció / probléma

A #145 oka (mászó session űrlap) app-szintű minta: sok szerkesztő oldal mentés / törlés után
`router.navigateByUrl(<lista>)`-val lép vissza. Az Ionic ezt **előre** navigálásnak veszi, így az
„új” / szerkesztő oldal bent marad a veremben ([lista, új, lista]), és a következő azonos útvonalra
navigálás (pl. újra „Új …”) **ezt a régi példányt** hozza vissza: `ngOnInit` nem fut újra, az űrlap a
korábbi értékekkel nyílik. Ahol az oldal mentés után megtartja a mentett entitás azonosítóját, a
második mentés **felülírja** az előzőt (adatvesztés); máshol „csak” régi értékekkel előtöltött űrlap.

Mentés után a mentett id-t megtartó (felülírás-gyanús) oldalak — 2026-10-02-i grep szerint:
`food/meal/meal-edit`, `food/recipe/recipe-edit`, `menu/aycm/aycm-partner-edit`,
`menu/gear/templates/packing-template-editor`, `menu/shopping/shopping-list-editor`,
`workout/log/workout-session-edit`, `workout/plan/plan-edit`.

Mentés után előre-navigáló, de id-t nem tartó oldalak (régi értékek): `food/catalog/food-edit`,
`food/storage/storage-edit`, `menu/aycm/aycm-check-in`, `menu/finance/recurring-expense-edit`,
`menu/steps/step-log-edit`, `tasks/events/event-edit`, `tasks/household/household-task-edit`,
`tasks/life-plans/life-plan-edit`, `workout/climbing/admin/*-edit` (7 db), `workout/cycling/bike-ride-log-edit`,
`workout/exercises/exercise-edit`, `workout/swimming/swim-log-edit`.

## Jelenlegi működés

A #145 óta csak a négy mászó session-űrlap lép vissza `NavController.navigateBack`-kel.

## Elfogadási kritériumok

- [ ] Minden szerkesztő oldal mentés / törlés / „nem található” után a szülő listára `navigateBack`-kel
      (vagy egységes helperrel) lép vissza — az oldal lekerül a veremről.
- [ ] A felülírás-gyanús oldalakon reprodukálva / kizárva (két egymás utáni „Új …” → két külön entitás).
- [ ] Regressziós teszt legalább a felülírás-gyanús oldalakra.
- [ ] Megfontolandó: lint-szabály vagy közös helper, hogy új szerkesztő oldal ne kerüljön vissza a mintába.

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: [[…]]
- `IMPLEMENTATION_STATUS.md` sor
