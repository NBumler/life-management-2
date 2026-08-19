# AYCM tracker

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Rendszeres kiadások]], [[Pénzügyek]], [[AYCM Statisztikák]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

AYCM elfogadóhelyek, check-in-ek és megtakarítás / használat statisztikák követése. Belépés: Menü.

**Ownership:** **user-owned** (partnerek, check-in-ek, szabályok) — [[Bejelentkezés]].

### Funkcionális leírás

Subfeature lista:

- [[AYCM elfogadóhely hozzáadása]]
- [[AYCM Check-In]]
- [[AYCM Statisztikák]]

A bérlet / előfizetés költségét **nem** itt kell külön tárolni, és a [[Pénzügyek]] / [[Rendszeres kiadások]] **nem** tud az AYCM-ről.

**Kötés (AYCM-oldali FK):** `linkedRecurringExpenseId` → egy `RecurringExpense` `id`. Setup UI (választás / create deep-link) később, az AYCM specek kidolgozásakor.

Az AYCM setup és a [[AYCM Statisztikák]] „megéri-e” kalkulációja a belinkelt sor `amountHuf` + `frequency` értékét olvassa, a havi leosztás a [[Rendszeres kiadások]] `monthlyEquivalentHuf` utility-je (nincs adatduplikáció).

**`~` / homokóra** a megtérülésnél, ha: nincs `linkedRecurringExpenseId`; a belinkelt sor nincs / nem számít a havi ekvivalensbe; vagy a **Pénzügyek** feature flag ki van kapcsolva. Az AYCM flag ettől **független**. Saját `amountHuf` mező tilos.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Menü alatti AYCM belépő; subfeature képernyők; `linkedRecurringExpenseId` + SSOT olvasás a [[Rendszeres kiadások]] store-ból / `monthlyEquivalentHuf`-ból.

#### Backend-offline

Partner / check-in mutáció: helyi store + outbox; kliens UUID. Sync: [[Szinkronizációs központ]].

„Megéri-e”: a belinkelt [[Rendszeres kiadások]] sor helyi olvasása + `monthlyEquivalentHuf` (pure TS). Hiányzó link / Pénzügyek flag ki → `~` / homokóra, nincs saját összeg-fallback. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (partner / check-in / szabály API — gyerekekben vagy itt később; Auth / user scope: [[Bejelentkezés]])

### Nyitott kérdések

Nincs nyitott kérdés.
