---
verifikalva:
verifikalt_commit:
---

# AYCM tracker

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[AYCM elfogadóhely hozzáadása]], [[AYCM Check-In]], [[AYCM Statisztikák]], [[Rendszeres kiadások]], [[Pénzügyek]], [[Szöveges keresés]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

AYCM használat követése: elfogadóhelyek + árszabályok, napi Check-In, megtérülés. Belépés: **Menü**. Vékony dashboard + drill-down a három gyerekre; bérlet-kötés a hubon (`AycmSettings`).

**Ownership:** **user-owned** — [[Bejelentkezés]]. Nincs hivatalos AYCM-API / térkép / import.

**Nem scope (MVP):** hivatalos partner-import; térkép; éjfélen átnyúló ársáv; több belinkelt kiadás; több Check-In ugyanazon a naptári napon; naptár-producer; értesítés; 4. gyerek.

### Funkcionális leírás

#### Gyerekek

- [[AYCM elfogadóhely hozzáadása]] (`Kész`) — partner + árszabály (idősáv).
- [[AYCM Check-In]] (`Kész`) — napi egy belépés, snapshot; múlt/jövő dátum szabad.
- [[AYCM Statisztikák]] (`Kész`) — preset ablakok, helyszín, látogatáslista; a hub csak az **aktuális naptári hónapot** mutatja.

Nincs 4. gyerek. A `linkedRecurringExpenseId` **itt** él, nem a [[Pénzügyek]]ben.

#### Entitás — `AycmSettings` (1:1 user)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja az első mentéskor |
| `linkedRecurringExpenseId` | Opcionális UUID → [[Rendszeres kiadások]] `RecurringExpense`. Nincs DB-FK kényszer a Pénzügyek táblára (laza csatolás); a kliens a helyi store-ból olvassa. |
| `createdAt` / `updatedAt` | Audit |

Nincs saját `amountHuf`. Üres start: nincs belinkelt kiadás.

**Picker:** csak **beszámított** kiadás (`deleted = false` ∧ `active = true`). Link törlése (null) megengedett.

**Deep-link:** ha a **Pénzügyek** flag be van kapcsolva → új `RecurringExpense` create ([[Rendszeres kiadások]]), visszatéréskor a létrehozott `id` belinkelhető. Pénzügyek flag ki → nincs create; a picker üres lehet.

**Visszatérés mechanizmusa:** a picker az `AycmSettings` képernyőről Angular Router `navigate`-tel nyit a Rendszeres kiadások create route-jára, egy `returnTo=/tabs/menu/aycm` query paraméterrel. A create form mentés után erre a `returnTo` route-ra navigál vissza, a frissen létrehozott `RecurringExpense.id`-t egy `createdExpenseId` query paraméterben átadva. Az `AycmSettings` picker megnyitáskor ellenőrzi ezt a paramétert: ha jelen van, automatikusan kiválasztja / linkeli a hivatkozott kiadást, majd a paramétert eltávolítja az URL-ből (`replaceUrl`). Megszakítás (vissza gomb create közben) esetén nincs `createdExpenseId`, a picker a normál (üres) állapotban nyílik.

#### Bérletköltség / megéri-e (fogyasztói szerződés)

Havi bérlet: a belinkelt sor `monthlyEquivalentHuf` — SSOT [[Rendszeres kiadások]]. Ez a hub **nem** másolja a képletet.

`passCostComputable` = Pénzügyek flag **be** ∧ van `linkedRecurringExpenseId` ∧ a sor **beszámított**.

Különben a megéri-e kártya **`~` / homokóra**. Nincs saját összeg-fallback.

#### Látogatás értéke (hub-szintű szerződés)

SSOT a Check-In snapshot `visitValueHuf`. **`visitValueHuf = listPriceHuf`**. A `coPaymentHuf` metaadat, **nem** adódik hozzá. Részletek: [[AYCM Check-In]], [[AYCM elfogadóhely hozzáadása]].

Hub e havi Σ: az aktuális naptári hónap (kliens TZ) **élő** (`deleted = false`) Check-Injeinek `visitValueHuf` összege. Üres → **0 Ft** (nem `~`).

Látogatásszám: ugyanennek a halmaznak a darabszáma (0 OK).

**Megéri-e (hub):** ha `passCostComputable`: `Σ visitValueHuf − monthlyEquivalentHuf` (előjeles egész Ft, nincs 0-ra clamp). Különben `~`. A Σ ettől függetlenül szám.

Hosszabb ablak / helyszín: [[AYCM Statisztikák]].

#### Check-In — hub-szabályok (részletek a gyerekben)

- **Max 1 Check-In / user / naptári nap** (kliens TZ), élő sorokra. Múlt **és jövő** dátum szabad. Második create ugyanarra a napra → validációs hiba; a meglévő szerkeszthető.
- Rögzítéskor / szerkesztéskor **snapshot** (partnernév, sáv címke, `listPriceHuf`, `coPaymentHuf`, `visitValueHuf`); szerkesztés = újraillesztés a jelenlegi sávokkal.
- Nincs illeszkedő ársáv: `visitValueHuf = 0`, sárga jelzés, a sor **mégis** mentődik.

#### Árszabály — hub-szabályok (részletek a gyerekben)

Árszabály = idősáv + ár, `[startTime, endTime)` félig zárt. Nincs külön nyitvatartás. Ugyanazon a héten napon **nincs átfedés**. Nincs éjfél-átlépés; a nap vége: `endTime = 24:00`.

#### Feature flag

**Egy** flag (registry kulcs: `menu.aycm` — [[Frontend]]): Menü-pont + hub + három gyerek. Ki → menü rejtve.

A [[Pénzügyek]] flag **független** (fent: `passCostComputable`).

### UI/UX elvárások

- **Belépés:** Menü → AYCM. Flag ki → a menüsor nincs.
- **Dashboard** (i18n: [[Nyelv választás]]):
  1. **E havi látogatások** — darabszám (mindig szám).
  2. **E havi érték** — Σ `visitValueHuf` (mindig szám, 0 OK).
  3. **Megéri-e** — előjeles Ft vagy `~`. Tap → [[AYCM Statisztikák]].
  4. **Bérlet** — belinkelt kiadás neve + havi ekvivalens, vagy CTA a pickerre / deep-link. `~` ha nem `passCostComputable`.
- **FAB / elsődleges CTA:** [[AYCM Check-In]] (ha ma már van Check-In → a mai szerkesztő, ne második create). **Most** a Check-In űrlapon: ma + jelenlegi idő.
- További belépők: elfogadóhelyek listája; statisztika.
- Kontraszt: `~` / szám — [[Dark&Light mode]].

### Megjegyzések

A három gyerek `Kész`. A dashboard / settings / napi-egy / `visitValue` / snapshot / statisztika-ablak szerződés zárt.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyő: `AycmDashboardPage`. Route pl. `/tabs/menu/aycm`. Gyerekek: `/tabs/menu/aycm/partners`, `/tabs/menu/aycm/check-in`, `/tabs/menu/aycm/stats` (pontos path a gyerek specekben).
- Store: `AycmSettings` + Check-In lista (havi szűrés) + `monthlyEquivalentHuf` import a [[Rendszeres kiadások]]ból.
- Picker: beszámított kiadások; Pénzügyek flag ki → üres + magyarázat.
- Feature flag: menü registry + child guard.

#### Backend-offline

- Dashboard olvasás helyi store-ból Backend-offline / Full-offline.
- `AycmSettings` `PUT` → outbox + kliens UUID; sync: [[Szinkronizációs központ]].
- Megéri-e / havi Σ **pure TS** (nincs homokóra a számítás miatt — `~` csak `passCostComputable = false`).
- Check-In / partner mutáció: a gyerekek outboxa. Lásd [[Backend-offline first]].

### Backend

- Tábla: `aycm_settings` (`id` UUID, `user_id` unique, `linked_recurring_expense_id` UUID nullable, audit). Nincs FK a `recurring_expense` táblára (laza csatolás; a kliens ellenőrzi a beszámítást).
- OpenAPI (singleton):

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` `PUT` | `/api/aycm-settings` | User 1:1; `GET` üresen `{ linkedRecurringExpenseId: null }` (létrehozás első `PUT`-kor vagy lazy) |

- Partner / Check-In / szabály API: gyerek specek. User scope: [[Bejelentkezés]].

### Nyitott kérdések

Nincs nyitott kérdés.
