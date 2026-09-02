---
verifikalva:
verifikalt_commit:
---

# Új esemény hozzáadása

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Események]] |
| **Kapcsolódó** | [[Naptár]], [[Értesítések]], [[Google Calendar szinkronizálása]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

`CalendarEvent` create / edit űrlap. Entitás, lista, naptár-vetítés, törlés, OpenAPI: [[Események]].

### Funkcionális leírás

Az űrlap a szülő spechen: mezők, defaultok (időzített, 15 perc kerekítés, +1 óra, éjfél-csapda), validáció, sorozat-szerkesztés (nincs „csak ez az alkalom”).

Belépés: Események lista CTA / FAB / sor tap; naptár előfordulás tap → ugyanaz a képernyő. Naptárból **új** create nincs ([[Naptár]]).

### UI/UX elvárások

Lásd [[Események]] „Create / edit űrlap”. `title` auto-focus create-nél.

### Megjegyzések

Ez a jegyzet a wiki-link / eredeti subfeature-split. A kanonikus spec a szülő.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

`EventEditPage`; route a szülőben. Offline réteg a szülő mutációin.

#### Backend-offline

Create / update helyi store + outbox + kliens UUID. Lásd [[Események]], [[Backend-offline first]], [[Szinkronizációs központ]].

### Backend

_Nincs backend érintettség._ (API: [[Események]])

### Nyitott kérdések

Nincs nyitott kérdés.
