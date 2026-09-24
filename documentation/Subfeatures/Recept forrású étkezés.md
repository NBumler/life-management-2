---
verifikalva: 2026-09-24
verifikalt_commit: f866e86
---

# Recept forrású étkezés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Étkezés]] |
| **Kapcsolódó** | [[Recept]], [[Élelmiszer tárolás]], [[Szöveges keresés]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Étkezés-tétel egy meglévő [[Recept]] alapján: élő `recipeId` + adagszorzó + opcionális hozzávalónkénti mennyiség-felülírás erre az étkezésre (`backlog/121`); tápanyag / ár = a recept hozzávalói (felülírva, ahol van felülírás) × szorzó; készletlevonás ugyanebből × szorzó. A [[Recept]] maga sosem változik.

### Funkcionális leírás

- Forrás típus: `RECIPE`.
- Recept választó a [[Recept]] katalógusból ([[Szöveges keresés]]); **többszörös kijelölés** → minden kiválasztott recept külön tételsor. Adagszorzó UI default: **`1`** (módosítható, `> 0`).
- Tárolás: `recipeId` + `servings` + `ingredientOverrides` (nincs tápanyag-snapshot).
- **Hozzávaló-felülírás** (`backlog/121`): a tétel-szerkesztőben kinyitható „Hozzávalók" rész listázza a recept élő hozzávalóit **egy adagra** vett mennyiséggel; soronként [[Mennyiség mező]]rel felülírható — a beírt érték a **ténylegesen felhasznált** mennyiség, ami erre az étkezésre a recept mennyiségét **helyettesíti** (0 = kimaradt). A recept szerinti érték visszaírása / „Recept szerint" gomb eldobja a felülírást. A sor mutatja a recept szerinti és az összesített (× `servings`) mennyiséget.
  - Effektív hozzávaló = `(felülírt ?? recept szerinti) × servings` — egyetlen tiszta függvény (`recipe-overrides.ts` `effectiveRecipeIngredients`) hajtja a makrókat / árat és a készletlevonást is.
  - Felülírás `{recipeIngredientId, foodId, quantityAmount, quantityUnit}`; `foodId` snapshot: ha a hozzávaló később kikerül a receptből, a felülírás **„recepten kívüli"** jelöléssel tovább számol (a „Recept szerint" ekkor eltávolítja).
  - Recepttől eltérő tétel „Eltér a recepttől" jelzést kap a tétellistán és a szerkesztőben. Recepten kívüli új hozzávaló felvétele nem itt, hanem külön [[Élelmiszer forrású étkezés]] tétellel.
- Effektív makrók / ár: [[Recept]] aktuális összegzése (a felülírásokkal) × `servings`.
- Készlet (étkezés **létrehozás** mentésekor): minden hozzávaló effektív mennyisége (`(felülírt ?? hozzávaló) × servings`) levonása az [[Élelmiszer tárolás]]ból (opened-first szabályok ott). Szerkesztés / törlés: nincs készlet-visszapótlás ([[Étkezés]]).
- Recept törlésekor: cascade soft delete a hivatkozó tételekre / étkezésekre ([[Recept]], [[Étkezés]]). A törlés-megerősítő nem sorolja fel a hivatkozó étkezéseket — tervezett: `backlog/009-katalogus-recept-etkezes-torles-megerosito-nem-sorolja-fel-a-cas.md`.

### UI/UX elvárások

Tételsor: recept neve (élő), adagszorzó, számított makrók/ár (read-only, élő). Tétel törölhető.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Recept multi-select → `MealItem` sorok; élő kalkuláció a recept store-ból.

#### Backend-offline

Helyi recept + meal store; create-kor helyi készletlevonás; outbox. Lásd [[Backend-offline first]], [[Étkezés]].

### Backend

`MealItem` `type=RECIPE`: `recipeId`, `servings`, `ingredientOverrides` (`meal_item.ingredient_overrides jsonb`, `V47__meal_item_ingredient_overrides.sql`; natív `SCHEMA_V44` TEXT; FOOD / CUSTOM tételnél mindig üres; ugyanarra a `recipeIngredientId`-ra két felülírás → 400 `VALIDATION`). Nem önálló szinkronizált entitás — nincs saját id / tombstone, a tétellel együtt íródik (a `HikeRoute.days` mintája). Outbox payload-séma v12 → v13 (identity). FK / cascade a `Recipe` törlésre.

### Nyitott kérdések

Nincs nyitott kérdés.
