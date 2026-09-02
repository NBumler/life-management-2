---
verifikalva: 2026-09-03
verifikalt_commit: b9d7577
---

# Élelmiszer forrású étkezés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Étkezés]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer tárolás]], [[Mennyiség mező]], [[Szöveges keresés]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Étkezés-tétel egy [[Élelmiszerek]] tételből: élő `foodId` + mennyiség + adagszorzó; effektív mennyiség = mennyiség × szorzó; tápanyag / ár a katalógusból az effektív mennyiségre; készletlevonás.

### Funkcionális leírás

- Forrás típus: `FOOD`.
- Élelmiszer választó ([[Szöveges keresés]]), **többszörös kijelölés** → minden kiválasztott élelmiszer külön tételsor; mennyiség mezők **üresek** (nincs előtöltés) — mentés előtt ki kell tölteni ([[Mennyiség mező]] `quantity`).
- **Adagszorzó** `> 0` (pl. mennyiség `350g`, szorzó `2` → effektív `700g` a kalkulációhoz és a készletlevonáshoz).
- Tárolás: `foodId` + `quantityAmount` + `quantityUnit` + `servings` (nem az effektív mennyiség külön oszlopként kötelező — az számított; opcionális denormalizálás tilos követelmény).
- Effektív tápanyag / ár: ugyanaz a modell, mint [[Recept]] (`resolveFoodQuantity` → `{ packages, baseAmount }`; ár = `packages × priceHuf`, tápanyag = `baseAmount/100 × per100`) az **effektív** mennyiségre. `cs` a nettó tartalmon, `db` a darab-definíción át old fel; definíció nélkül `1 db = 1 cs`. Hiányos katalógusmező → 0 az adott mutatóban + hiányos jelzés.
- Készlet: create mentéskor effektív mennyiség levonása ([[Élelmiszer tárolás]]). Szerkesztés / törlés: nincs visszapótlás.
- Élelmiszer törlésekor: cascade soft delete az érintett tételekre / étkezésekre ([[Élelmiszerek]], [[Étkezés]]). A törlés-megerősítő nem sorolja fel a hivatkozó étkezéseket — tervezett: `backlog/009-katalogus-recept-etkezes-torles-megerosito-nem-sorolja-fel-a-cas.md`.

### UI/UX elvárások

Tételsor: élelmiszer neve, mennyiség (üresen indul multi-select után), adagszorzó, számított makrók/ár (élő). Tétel törölhető.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Food multi-select; quantity + servings; élő kalkuláció.

#### Backend-offline

Helyi food + meal + storage store; create-kor levonás; outbox. Lásd [[Backend-offline first]], [[Étkezés]].

### Backend

`MealItem` `type=FOOD`: `foodId`, `quantityAmount`, `quantityUnit` (`cs` / `db` / SI — [[Mennyiség mező]]), `servings`. Cascade a `Food` törlésre. A tápanyag/ár számítás teljesen kliensoldali; a szerver a `db` feloldást nem futtatja.

### Nyitott kérdések

Nincs nyitott kérdés.
