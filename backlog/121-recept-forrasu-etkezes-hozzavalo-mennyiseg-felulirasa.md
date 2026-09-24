---
id: 121
type: feature
status: backlog
title: Recept forrású étkezés — hozzávalók mennyiségének étkezés-szintű felülírása (a recept változatlan)
specs:
  - "[[Recept forrású étkezés]]"
  - "[[Étkezés]]"
  - "[[Élelmiszer tárolás]]"
flag:
created: 2026-09-24
closed:
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

- [ ] A recept-tételsoron kinyitható „Hozzávalók" rész, amely listázza a recept élő hozzávalóit a
      `servings`-szel skálázott alapértelmezett mennyiséggel; minden sor mennyisége szerkeszthető
      ([[Mennyiség mező]] komponens, mértékegységgel).
- [ ] Egy hozzávaló 0-ra állítható (kimaradt), és a felülírás visszaállítható az alapértékre.
- [ ] A felülírás **nem** módosítja a `Recipe` / `RecipeIngredient` sorokat.
- [ ] A tétel makrói / ára a felülírt mennyiségekkel számolódnak (nem felülírt hozzávaló: recept ×
      `servings`); a UI jelzi, hogy a tétel el van térítve a recepttől.
- [ ] Készletlevonás létrehozáskor a **felülírt** mennyiséggel történik (a nem felülírt
      hozzávalóknál a mai `hozzávaló × servings` szabály marad).
- [ ] Új, szinkronizált gyerek-entitás (javaslat: `MealItemIngredientOverride`: `mealItemId`,
      `recipeIngredientId`, `foodId` snapshot, `quantityAmount`, `quantityUnit`), a `Meal` nested
      aggregate PUT-jában mentve (`NestedChildResolver` minta), soft delete-tel.
- [ ] Flyway + natív `SCHEMA_Vn` + OpenAPI + `gen:api`; `verify:outbox` snapshot frissítés
      (+ `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump, migrációs lépés: régi payload → üres override-lista).
- [ ] Offline: a felülírás és a levonás is a helyi tranzakcióban történik ([[Backend-offline first]]).
- [ ] Zöld lint + test:ci + build + backend test + verify:outbox.

## Terv / döntési napló

- Nyitott: a felülírt mennyiség **abszolút** érték-e az adott étkezésre (javaslat: igen — a user
  a ténylegesen felhasznált mennyiséget írja be; a `servings` utólagos változtatása a felülírt
  sorokat nem skálázza, csak a nem felülírtakat), vagy adagonkénti és `servings`-szel szorzódik.
- Nyitott: mi történik, ha a receptből utólag törlődik egy hozzávaló, amire override van
  (javaslat: az override a `foodId` snapshot alapján tovább számol, „recepten kívüli" jelöléssel).
- Nem scope: recepten kívüli új hozzávaló felvétele a tételbe — erre ott a külön élelmiszer-tétel
  ([[Élelmiszer forrású étkezés]]).
- Szerkesztésnél továbbra sincs készlet-visszapótlás / újralevonás ([[Étkezés]] meglévő szabálya).

## Lezáráskor (on-done)

- Frissített specek: [[Recept forrású étkezés]], [[Étkezés]], [[Élelmiszer tárolás]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
