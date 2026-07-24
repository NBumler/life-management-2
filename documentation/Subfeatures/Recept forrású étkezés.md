# Recept forrású étkezés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Étkezés]] |
| **Kapcsolódó** | [[Recept]], [[Élelmiszer tárolás]], [[Szöveges keresés]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Célállapot

Étkezés-tétel egy meglévő [[Recept]] alapján: élő `recipeId` + adagszorzó; tápanyag / ár = aktuális receptösszeg × szorzó; készletlevonás a recept hozzávalóiból × szorzó.

### Funkcionális leírás

- Forrás típus: `RECIPE`.
- Recept választó a [[Recept]] katalógusból ([[Szöveges keresés]]); **többszörös kijelölés** → minden kiválasztott recept külön tételsor. Adagszorzó UI default: **`1`** (módosítható, `> 0`).
- Tárolás: `recipeId` + `servings` (nincs tápanyag-snapshot).
- Effektív makrók / ár: [[Recept]] aktuális összegzése × `servings`.
- Készlet (étkezés **létrehozás** mentésekor): minden hozzávaló effektív mennyisége (`hozzávaló × servings`) levonása az [[Élelmiszer tárolás]]ból (opened-first szabályok ott). Szerkesztés / törlés: nincs készlet-visszapótlás ([[Étkezés]]).
- Recept törlésekor: warning + cascade ([[Recept]], [[Étkezés]]).

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

`MealItem` `type=RECIPE`: `recipeId`, `servings`. FK / cascade a `Recipe` törlésre.

### Nyitott kérdések

Nincs nyitott kérdés.
