---
id: 121
type: feature
status: done
title: Recept forrású étkezés — hozzávalók mennyiségének étkezés-szintű felülírása (a recept változatlan)
specs:
  - "[[Recept forrású étkezés]]"
  - "[[Étkezés]]"
  - "[[Élelmiszer tárolás]]"
flag:
created: 2026-09-24
closed: 2026-09-24
---

# 121 — Recept forrású étkezés — hozzávalók mennyiségének étkezés-szintű felülírása (a recept változatlan)

## Motiváció / probléma

Receptből főzve gyakran eltér a ténylegesen felhasznált mennyiség a recepttől (pl. 500 g helyett
400 g túró, vagy épp több). Ezt az adott étkezésnél kell tudni rögzíteni úgy, hogy **maga a recept
ne változzon**, a tápérték/ár és a **tárolóból levont készlet a módosított mennyiséget** kövesse.

## Jelenlegi működés

[[Recept forrású étkezés]]: a `MealItem` (`type = RECIPE`) csak `recipeId` + `servings` szorzót
tárol, tápanyag-snapshot nélkül. Makrók / ár = a recept **élő** összegzése × `servings`. Mentéskor
(csak létrehozáskor) minden hozzávaló `mennyiség × servings` értéke vonódik le az
[[Élelmiszer tárolás]]ból. Hozzávalónkénti eltérést nem lehet megadni — csak a teljes receptet
lehet arányosan skálázni.

## Elfogadási kritériumok

- [x] A recept-tételsoron kinyitható „Hozzávalók" rész, amely listázza a recept élő hozzávalóit a
      recept szerinti (1 adagszorzóra vett) alapértelmezett mennyiséggel; minden sor mennyisége
      szerkeszthető ([[Mennyiség mező]] komponens, mértékegységgel). A beírt érték a recept
      hozzávaló-mennyiségét **helyettesíti** erre az étkezésre, és a `servings` ezt is szorozza
      (effektív = felülírt mennyiség × `servings`); a UI mutatja az effektív mennyiséget is.
- [x] Egy hozzávaló 0-ra állítható (kimaradt), és a felülírás visszaállítható az alapértékre.
- [x] A felülírás **nem** módosítja a `Recipe` / `RecipeIngredient` sorokat.
- [x] A tétel makrói / ára hozzávalónként `(felülírt ?? recept szerinti mennyiség) × servings`
      alapján számolódnak; a UI jelzi, hogy a tétel el van térítve a recepttől.
- [x] Készletlevonás létrehozáskor ugyanezzel az effektív mennyiséggel történik
      (`(felülírt ?? recept szerinti) × servings`), nem a recept szerintivel.
- [x] Új, szinkronizált gyerek-entitás (javaslat: `MealItemIngredientOverride`: `mealItemId`,
      `recipeIngredientId`, `foodId` snapshot, `quantityAmount`, `quantityUnit`), a `Meal` nested
      aggregate PUT-jában mentve (`NestedChildResolver` minta), soft delete-tel.
- [x] Flyway + natív `SCHEMA_Vn` + OpenAPI + `gen:api`; `verify:outbox` snapshot frissítés
      (+ `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump, migrációs lépés: régi payload → üres override-lista).
- [x] Offline: a felülírás és a levonás is a helyi tranzakcióban történik ([[Backend-offline first]]).
- [x] Zöld lint + test:ci + build + backend test + verify:outbox.

## Terv / döntési napló

- **Döntés (2026-09-24):** a beírt mennyiség a ténylegesen felhasznált mennyiség a recept
  hozzávalója helyett, és az adagszorzó ezt is szorozza — azaz a felülírás a recept-hozzávaló
  mennyiségét cseréli, a `servings` utána ugyanúgy skáláz, mint a nem felülírt soroknál.
- Nyitott: mi történik, ha a receptből utólag törlődik egy hozzávaló, amire override van
  (javaslat: az override a `foodId` snapshot alapján tovább számol, „recepten kívüli" jelöléssel).
- **Döntés (implementáció, 2026-09-24):** a gyerek-entitás javaslat helyett a felülírások a `MealItem`
  `ingredientOverrides` JSON-tömbjében élnek (jsonb / natívan TEXT): nincs saját id-juk, semmi nem
  hivatkozik rájuk és csak a tétellel együtt változnak — a `HikeRoute.days` mintája. Így nincs új
  szinkronizált tábla, `sync_changes` view-bővítés és tombstone-kezelés; a nested aggregate PUT
  változatlanul egyben írja. A nyitott kérdés a javaslat szerint: recepten kívüli felülírás a `foodId`
  snapshottal tovább számol, „recepten kívüli" jelöléssel.
- Nem scope: recepten kívüli új hozzávaló felvétele a tételbe — erre ott a külön élelmiszer-tétel
  ([[Élelmiszer forrású étkezés]]).
- Szerkesztésnél továbbra sincs készlet-visszapótlás / újralevonás ([[Étkezés]] meglévő szabálya).

## Lezáráskor (on-done)

- Frissített specek: [[Recept forrású étkezés]], [[Étkezés]], [[Élelmiszer tárolás]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #121
- Kód: `V47__meal_item_ingredient_overrides.sql`, `food/MealItem*` + `MealService` (backend), `SCHEMA_V44`, `pages/food/meal/recipe-overrides.ts`, `meal-item-editor.component.*`, `meal-item-row.ts`, `meal-item-summary.ts`, `core/data/meal.repository.ts`
