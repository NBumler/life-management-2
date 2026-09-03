---
verifikalva: 2026-09-03
verifikalt_commit: 1917ba8
---

# GearCheck

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Eszközök]], [[Sablonok]], [[Pakolás]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

Felszerelés nyilvántartás, pakolási sablonok és aktív pakolások kezelése. Belépés: Menü (lásd [[Frontend]]). Három belépő: [[Eszközök]] | [[Sablonok]] | [[Pakolás]] (aktív sessionök; korlátlan párhuzamos futás).

**Ownership:** **user-owned** — [[Bejelentkezés]].

### Funkcionális leírás

Subfeature lista:

- [[Eszközök]]
- [[Sablonok]]
- [[Pakolás]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Menü alatti GearCheck belépő; három subfeature képernyő ([[Eszközök]], [[Sablonok]], [[Pakolás]]). Feature flag: `menu.gearcheck` — a kikapcsolása a menüpontot rejti **és** a `/tabs/menu/gear` route-fát a tetején `featureFlagGuard('menu.gearcheck')` blokkolja (a `finance` / `aycm` minta): deep link → `/tabs/menu`.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Részletek a gyerekekben. Lásd [[Backend-offline first]].

### Backend

Közös GearCheck API a gyerekekben: [[Eszközök]] (`GearItem`), [[Sablonok]] (`PackingTemplate` + items), [[Pakolás]] (`PackingSession` + items). Auth / user-owned: [[Bejelentkezés]].

### Nyitott kérdések

Nincs nyitott kérdés.
