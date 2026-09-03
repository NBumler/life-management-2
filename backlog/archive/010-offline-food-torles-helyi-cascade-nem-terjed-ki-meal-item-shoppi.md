---
id: 10
type: bug
status: done
title: Offline Food-torles helyi cascade nem terjed ki meal_item / shopping_list_item sorokra
specs:
  - "[[Élelmiszerek]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 10 — Offline Food-torles helyi cascade nem terjed ki meal_item / shopping_list_item sorokra

## Motiváció / probléma

A sqlite-storage-backend.deleteFood csak stored_food + recipe_ingredient sorokat torol helyben; a backend cascade mind a 4 hivatkozo tablat + az uresre fogyott meal-eket kezeli. Az offline store atmenetileg inkonzisztens a kovetkezo delta pull-ig.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

`SqliteStorageBackend.deleteFood` (`frontend/src/app/core/storage/sqlite-storage-backend.ts`)
egyetlen `executeTransaction`-ben soft-delete-eli a `food_id`-re hivatkozó élő
`stored_food`, `recipe_ingredient`, `meal_item` és `shopping_list_item` sorokat, majd
soft-delete-eli azokat a `meal` sorokat, amelyek a `meal_item`-cascade után 0 élő
tétellel maradnak — a szerveroldali `FoodService.delete` + `MealCascade` viselkedését
tükrözve. A bevásárlólistát üresen is meghagyja. Külön outbox DELETE tételenként nincs;
a drain utáni delta pull soronként megerősíti (a testvér `deleteGearItem` /
`deleteHouseholdRoom` mintája).

## Elfogadási kritériumok

- [x] `deleteFood` helyi cascade a `meal_item` sorokra (`food_id` szerint), `mealItemLocalRemoveTask`.
- [x] `deleteFood` helyi cascade a `shopping_list_item` sorokra (`food_id` szerint), a listát nem bántva.
- [x] A cascade után 0 élő tétellel maradó `meal` soft delete (szerver `MealCascade` tükör).
- [x] `npm run lint` + `npm run test:ci` (1447) + `npm run build` zöld.
- [x] [[Élelmiszerek]] „Törlés" + „Backend-offline" szakasz a leszállított viselkedést írja le.

## Terv / döntési napló

- A helyi cascade-nek nincs unit-harness a repóban (a `sqlite-storage-backend.ts`
  cascade-metódusait — `deleteGearItem`, `deleteHouseholdRoom`, `deleteRecipe`,
  `deleteMeal` — a repository-specek a teljes `StorageBackend` mockolásával kerülik
  meg). A minta konzisztens tartása kedvéért nem épült bespoke fake-DB harness csak
  ehhez az egy metódushoz; a szerveroldali cascade (mind a 4 tábla + üres meal) a
  `FoodServiceTest`-ben teljesen fedett, a frontend ezt tükrözi 1:1-ben.
- Az üresre fogyott `meal` felismerése JS-ben: `food_id` szerinti `meal_item`-ek
  meal-enkénti számából kivonva az élő `meal_item` count — ha `<= 0`, a meal is megy.
- A `deleteRecipe` ugyanígy nem tükrözi a szerver `MealCascade`-jét a recept-forrású
  `meal_item`-ekre — külön, `[[Recept]]` / `[[Étkezés]]` hatókörű kérdés, nem ennek a
  jegynek a scope-ja.

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszerek]] — „Törlés (soft delete)" + „Backend-offline" jelen időbe (a helyi cascade a szerveroldalival azonos 4 tábla + üres étkezés); frontmatter `verifikalva: 2026-09-03`, `verifikalt_commit: b56be9c`.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #010 offline Food-törlés helyi cascade meal_item + shopping_list_item + üres meal.
- Kód: `frontend/src/app/core/storage/sqlite-storage-backend.ts` (`deleteFood`); fix commit `b56be9c`.
