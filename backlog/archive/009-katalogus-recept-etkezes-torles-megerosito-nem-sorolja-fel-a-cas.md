---
id: 9
type: bug
status: done
title: Katalogus/recept/etkezes torles-megerosito nem sorolja fel a cascade-hivatkozasokat
specs:
  - "[[Élelmiszerek]]"
  - "[[Recept]]"
  - "[[Étkezés]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 9 — Katalogus/recept/etkezes torles-megerosito nem sorolja fel a cascade-hivatkozasokat

## Motiváció / probléma

A specek szerint a megerosito dialogusnak fel kell sorolnia, mi torlodik egyutt (tarolas, recept-hozzavalo, bevasarlolista-tetel, etkezes-tetel) es jeleznie a shared-katalogus miatti tobb-userre kiterjedo hatast. Jelenleg csak generikus figyelmeztetes; a DELETE_CONFIRM_MESSAGE_WITH_REFS i18n kulcs hasznalatlan.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/` (chunk-09 T1 + chunk-10 törlés-megerősítő).

## Jelenlegi működés

A Food- és a Recept-katalógus törlés-megerősítő dialógusa (`food-list.page` /
`food-edit.page`, `recipe-list.page` / `recipe-edit.page`) törlés előtt lekéri a
hivatkozás-számokat a repository-n át (`countReferences` →
`StorageBackend.countFood/RecipeReferences`), és a
`pages/food/shared-catalog-delete-confirm.ts` helper építi a szöveget:

- **Natív** (van helyi store): a `SqliteStorageBackend` a hivatkozó élő sorokat
  számolja (`stored_food` / `recipe_ingredient` / `meal_item` /
  `shopping_list_item` a Food-nál; `meal_item WHERE recipe_id` a Receptnél), és a
  `DELETE_CONFIRM_MESSAGE_WITH_REFS` fix sorrendben kiírja a nem-üres csoportokat
  („2 tárolási tétel, 3 étkezés-tétel").
- **Web / nincs hivatkozás**: a `HttpStorageBackend` `null`-t ad → a generikus
  `DELETE_CONFIRM_MESSAGE`, ami (mindkét katalógusnál) jelzi a közös-katalógus,
  minden-felhasználós hatást.

A meal saját törlés-megerősítője változatlan: user-owned, nincs bejövő
hivatkozás, nincs több-user hatás.

## Elfogadási kritériumok

- [x] Food törlés-megerősítő: natívon felsorolja a 4 cascade-tábla hivatkozás-számát, web-en a generikus szöveg.
- [x] Recept törlés-megerősítő: natívon kiírja a hivatkozó `meal_item` darabszámot; a generikus szöveg is jelzi a közös-katalógus / több-user hatást (eddig sima név-alapú volt).
- [x] A `DELETE_CONFIRM_MESSAGE_WITH_REFS` i18n kulcs használatban (FOOD.CATALOG); új `FOOD.RECIPE.*` párja + `DELETE_REF_*` kulcsok hu + en.
- [x] `StorageBackend`: `FoodReferenceCounts` / `RecipeReferenceCounts` + `countFood/RecipeReferences` (Sqlite: COUNT lekérdezések; Http: `null`).
- [x] Unit tesztek: `shared-catalog-delete-confirm.spec.ts` (branch-logika), `food/recipe.repository.spec.ts` (delegálás).
- [x] `npm run lint` + `npm run test:ci` (1454) + `npm run build` zöld.
- [x] [[Élelmiszerek]] / [[Recept]] / [[Étkezés]] „Törlés" + „Backend-offline" szakasza a leszállított viselkedést írja le.

## Terv / döntési napló

- A hivatkozás-szám csak natívon számolható (helyi store); web-re nincs backend
  végpont — a `GearItem` törlés-megerősítő mintáját követi (`null` → generikus
  szöveg).
- Közös `shared-catalog-delete-confirm.ts` helper a Food + Recept változattal, egy
  belső join-maggal — a `catalog/food-delete-confirm.ts` ide olvadt.
- A meal (`[[Étkezés]]`) saját törlés-megerősítőjén nincs teendő; a spec-pointer
  ott is a Food/Recept-törlés dialógusáról szólt.
- A `deleteRecipe` helyi cascade-je (mint a `deleteFood` a #010 előtt) nem
  tükrözi a `meal_item` / üres-meal cascade-et — külön, a #010-hez hasonló
  hatókörű kérdés, **nem** ennek a jegynek a scope-ja; a hivatkozás-szám a
  megerősítőben ettől függetlenül helyes.

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszerek]] („Törlés (soft delete)" + UI/UX + „Backend-offline"), [[Recept]] („CRUD / törlés"), [[Étkezés]] („Élő hivatkozás") — mind jelen időbe; frontmatter `verifikalva: 2026-09-03`, `verifikalt_commit: bdf5680`.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #009 törlés-megerősítő felsorolja a cascade-hivatkozásokat (Food + Recept).
- Kód: `frontend/src/app/core/storage/{storage-backend,sqlite-storage-backend,http-storage-backend}.ts`, `core/data/{food,recipe}.repository.ts`, `pages/food/shared-catalog-delete-confirm.ts`, `pages/food/{catalog,recipe}/*.page.ts`, `assets/i18n/{hu,en}.json`; fix commitok `e1f31e1`, `bdf5680`.
