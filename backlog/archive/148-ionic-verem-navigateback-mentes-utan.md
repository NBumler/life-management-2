---
id: 148
type: bug
status: done
title: "Szerkesztő oldalak: mentés után előre-navigálás a listára — az Ionic veremben maradt űrlap újrahasznosul"
specs: ["[[Frontend]]"]
flag:
created: 2026-10-02
closed: 2026-10-02
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

- [x] Minden szerkesztő oldal mentés / törlés / „nem található” után a szülő listára `navigateBack`-kel
      (vagy egységes helperrel) lép vissza — az oldal lekerül a veremről.
- [x] A felülírás-gyanús oldalakon reprodukálva / kizárva (két egymás utáni „Új …” → két külön entitás).
- [x] Regressziós teszt legalább a felülírás-gyanús oldalakra.
- [x] Megfontolandó: lint-szabály vagy közös helper, hogy új szerkesztő oldal ne kerüljön vissza a mintába.

## Terv / döntési napló

- 2026-10-02: az Ionic `StackController` forrása alapján pontosítva a mechanizmus. Előre-navigálásnál, ha a
  cél-URL már bent van a stackben, az Ionic **levágja** az utána lévő oldalakat. A régi minta tehát csak akkor
  hagyta bent a szerkesztőt, ha a lista **nem** volt a stackben, vagyis a szerkesztő más képernyőről nyílt
  (pl. Kaja-statisztika → recept / étkezés, Naptár / Heti terv → esemény, értesítés-előzmény).
  Böngészőben, a régi kóddal reprodukálva: Kaja-statisztika → recept szerkesztő → (módosítás) → előre a recept
  listára → ugyanaz a recept újra megnyitva → **ugyanaz a példány**, a nem mentett értékkel. A javított kóddal
  friss példány, a valódi értékekkel. A lista felől nyitott „Új …” → mentés → „Új …” útvonalon (étkezés, aktív
  edzés, indoor boulder) a régi kóddal sem jött elő újrahasznosítás; a #145-ben megfigyelt felülírás pontos
  útvonalát ezért nem sikerült újra előállítani. A szerkesztőben ragadt példány így elsősorban **régi értékeket**
  mutat (ha közben szinkron / más eszköz módosított, a mentés azokat írná vissza); két külön „új” entitás
  egymásba írása a mai belépőkön nem valószínű.
- Javítás egységesen, minden szerkesztő / űrlap oldalon (29 db): `NavController.navigateBack` a szülőre
  (query paraméterrel is, pl. `returnTo`); új entitás saját szerkesztőjére `navigateForward(..., { replaceUrl: true })`
  (terem, szikla, szektor, AYCM partner). Közös helper helyett **lint-szabály** (`no-restricted-syntax`) a
  `*-edit` / `*-editor` / `active-workout` oldalakon: ez kevesebb absztrakció, és az új oldalt is fogja.
- Regressziós tesztek: a meglévő specek mentés / törlés / „nem található” ágai `NavController.navigateBack`-re
  állítanak; új: edzéssablon, AYCM partner (új + meglévő), pakolási sablon, mászó admin létrehozás (3),
  `WorkoutSessionEditPage` (új spec).

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]] — „Szerkesztő oldal elhagyása (stack-szabály)”
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-02 — #148
- Kód: `0a9f1bb` — 29 `pages/**` oldal + specek, `frontend/.eslintrc.json`
