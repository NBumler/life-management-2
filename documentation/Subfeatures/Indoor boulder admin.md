---
verifikalva: 2026-09-02
verifikalt_commit: dac7f81
---

# Indoor boulder admin

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Névegyediség]], [[Backend-offline first]] |

### Jelenlegi működés

Beltéri boulder **terem + szín-sáv** törzsadat. Egyedi boulder problémák **nincsenek** az adminban (gyors forgás a falakon) — a napló szín-sávval / ad-hoc grade-del dolgozik.

### Funkcionális leírás

#### Entitás — `Gym` (indoor, boulder használat)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `name` | Kötelező |
| `address` | Opcionális |
| `disciplines` | Legalább boulder jelölés / flag (ugyanaz a `Gym` kötélnél is bővíthető — [[Indoor köteles admin]]) |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

#### Entitás — `GymColorBand`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `gymId` | FK → `Gym` |
| `name` | Kötelező (pl. „Piros”) |
| `hexColor` | Kötelező; **egyedi a terem élő szín-sávjai között** (nem lehet két azonos hex). Kanonikus alak (`#rrggbb`, rövid forma kifejtve, kisbetűs) és összehasonlítás: [[Névegyediség]] |
| `variant` | Enum: `PLUS` \| `MINUS` \| `NEUTRAL` (`+` / `−` / semleges) |
| `gradeLower` | [[Nehézségi szint skálája]] — alsó bound (boulder skála) |
| `gradeUpper` | Felső bound |
| `absoluteDifficultyIndexLower` / `Upper` | Mátrixból számolt |
| `deleted` | Soft delete |

CRUD: terem lista, szín-sávok nested vagy külön; soft delete; megerősítés.

### UI/UX elvárások

- Belépés: [[Mászónapló]] hub Admin, vagy Indoor Boulder napló jobb felső admin.
- Terem szerkesztő + színlista; színválasztó + grade alsó/felső a shared nehézség komponenssel.
- Egyedi hex validáció mentéskor (a kanonikus alakon — [[Névegyediség]]).

### Megjegyzések

Reference admin a többi indoor masterhez. Outdoor: [[Outdoor boulder admin]] (Crag hierarchia).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Terem / szín-sáv CRUD; offline store.

#### Backend-offline

Helyi store + outbox; kliens UUID; soft delete. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

Táblák: `gym`, `gym_color_band`. OpenAPI a [[Mászónapló]] climbing master tag alatt. Auth / user scope (saját termek).

### Nyitott kérdések

Nincs nyitott kérdés.
