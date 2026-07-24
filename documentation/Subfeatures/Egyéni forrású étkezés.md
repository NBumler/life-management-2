# Egyéni forrású étkezés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Étkezés]] |
| **Kapcsolódó** | [[Étkezés]], [[Tápérték kalkulátor]], [[Élelmiszer tárolás]], [[Backend-offline first]] |

### Célállapot

Étkezés-tétel katalógus nélkül (vendégség, étterem, becslés): kézi makrók / ár / megjelenő név + adagszorzó. **Nem** módosítja az [[Élelmiszer tárolás]] készletet.

### Funkcionális leírás

- Forrás típus: `CUSTOM` (korábbi munkanév: „ismeretlen forrású” — kanonikus név: **egyéni**).
- Mezők:

| Mező | Szabály |
|---|---|
| **Megjelenő név** | Kötelező (pl. vendégség torta). |
| **Kalória (kcal)** | Kötelező. |
| **Fehérje (g)** | Opcionális (üres → 0 az összegzésben). |
| **Szénhidrát (g)** | Opcionális (üres → 0). |
| **Zsír (g)** | Opcionális (üres → 0). |
| **Ár (Ft)** | Opcionális (üres → 0). |
| **Adagszorzó** | `> 0`; effektív értékek = begépelt × szorzó. |

- Nincs `foodId` / `recipeId`.
- Készlet: **soha** nem von le / nem pótol.
- Későbbi scope (nem most): étel típus (péksüti, tészta, …) becsléshez.

### UI/UX elvárások

Kézi űrlapmezők a tételsoron / expandolt szerkesztőben; adagszorzó; számított effektív összeg jelzése opcionális (begépelt × szorzó).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Custom tétel form; effektív = mezők × servings a napi összeghez.

#### Backend-offline

Helyi meal store; outbox; nincs storage hívás. Lásd [[Backend-offline first]], [[Étkezés]].

### Backend

`MealItem` `type=CUSTOM`: `displayName`, `caloriesKcal`, `proteinG`, `carbsG`, `fatG`, `priceHuf`, `servings`.

### Nyitott kérdések

Nincs nyitott kérdés.
