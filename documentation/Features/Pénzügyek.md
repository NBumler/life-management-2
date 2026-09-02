---
verifikalva:
verifikalt_commit:
---

# Pénzügyek

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Nettó fizetés kalkulátor]], [[Rendszeres kiadások]], [[Profile]], [[AYCM tracker]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

Pénzügyi **hub**: belépéskor három szám (nettó, havi fix kiadás, maradék), onnan drill-down a két gyerekre. Belépés: **Menü** (lásd [[Frontend]]).

**Ownership:** **user-owned** — [[Bejelentkezés]]. A hubnak nincs saját entitása.

**Nem scope (MVP):** egyszeri tranzakció; banki szinkron; envelope / keret; más pénznem; bér melletti bevétel; lakásrezsi mint külön gyerek; befektetés; számla. Közelgő fizetés-értesítés: kint az MVP-ből ([[Értesítések]] későbbi típus; forrás: [[Rendszeres kiadások]]).

### Funkcionális leírás

#### Gyerekek

- [[Nettó fizetés kalkulátor]] (`Kész`) — alkalmazotti nettó utility; bontás a gyerek képernyőn.
- [[Rendszeres kiadások]] (`Kész`) — CRUD + havi ekvivalens + beszámított-halmaz (`deleted = false` ∧ `active = true`).

Nincs harmadik gyerek.

#### Szerep

A hub **fogyasztó**. Nem ír kiadást, nem tárol nettót, nincs saját OpenAPI.

- Nettó: [[Nettó fizetés kalkulátor]] `net` (bruttó kitöltve; 25 év: `birthDate` + `age < 25` + plafon — részletek a gyerekben). Hiányzó születési dátum **nem** `~`.
- Havi kiadás: [[Rendszeres kiadások]] `monthlyEquivalentHuf` a **beszámított** sorokra (`deleted = false` ∧ `active = true`), majd **összeg**.
- Maradék: `nettó − havi kiadás összeg` (egész Ft, előjeles; nincs 0-ra clamp).

#### Hiányjelzés (`~` / homokóra)

Ugyanaz a minta, mint a [[Tápérték kalkulátor]] / [[Profile]]: hiányos bemenetnél a szám **nem számolható** → `~` / homokóra. A sor **látszik**, nem rejtjük.

| Kártya | Mikor szám | Mikor `~` |
|---|---|---|
| Nettó | `grossMonthlySalaryHuf` **ki van töltve** (0 is érvényes → nettó a képlet szerint, jellemzően 0) | a mező **üres** / hiányzik |
| Havi kiadás | mindig (üres lista → **0 Ft**) | soha |
| Maradék | a nettó számolható | a nettó `~` |

Nincs profil-kitöltöttségi gate: a hub és a gyerekek üres bruttó mellett is nyithatók.

#### AYCM

A Pénzügyek **generikus SSOT**. Nincs AYCM mező, jelölő, UI a hubon vagy a kiadás soron.

A kötés az [[AYCM tracker]] spechen él: `AycmSettings.linkedRecurringExpenseId` → egy rendszeres kiadás; picker / deep-link a hubon. A „megéri-e” az AYCM-ben a [[Rendszeres kiadások]] `monthlyEquivalentHuf` utility-jét olvassa a **beszámított** soron. Ha nincs link, a sor nem beszámított, vagy a Pénzügyek flag ki van kapcsolva → AYCM oldalon `~`.

#### Feature flag

**Egy** flag (registry kulcs: `menu.penzugyek` — [[Frontend]]): Menü-pont + mindkét gyerek. Ki → a menüpont rejtve, a gyerek route-ok nem elérhetők.

Az [[AYCM tracker]] flag **független**. Pénzügyek ki + AYCM be: nincs kiadás-CRUD; megtérülés `~`; AYCM **nem** tárol saját `amountHuf`-ot.

### UI/UX elvárások

- **Belépés:** Menü → Pénzügyek. Flag ki → a menüsor nincs.
- **Dashboard** (egy képernyő), három kártya egymás alatt (i18n: [[Nyelv választás]]):
  1. **Nettó** — szám vagy `~`; tap → [[Nettó fizetés kalkulátor]].
  2. **Havi kiadások** — egész Ft; tap → [[Rendszeres kiadások]] lista.
  3. **Maradék** — szám vagy `~` (előjeles, ha szám); tap → [[Rendszeres kiadások]] lista. Nincs külön maradék-képernyő.
- Nincs CRUD a hubon. Üres kiadáslistánál a havi kártya 0 Ft; a lista üres állapota / create CTA a gyereken.
- Kontraszt: `~` / szám dark és light témában — [[Dark&Light mode]].
- Bruttó **nem** szerkeszthető itt — [[Profile]].

### Megjegyzések

A dashboard, a kiadás-CRUD és a nettó képlet zárt. Mindkét gyerek `Kész`.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyő: `FinanceDashboardPage`. Route pl. `/tabs/menu/finance`. Gyerekek: `/tabs/menu/finance/net-pay`, `/tabs/menu/finance/recurring-expenses` (pontos path a gyerek specekben is).
- Mapper: Profile store → nettó utility; kiadás store → havi ekvivalens összeg; maradék csak ha a nettó nem `~`.
- Képletek **nem** másolódnak ide: import a [[Nettó fizetés kalkulátor]] és [[Rendszeres kiadások]] utility-kből.
- Feature flag: menü registry + child guard.

#### Backend-offline

- Olvasás a gyerek / Profile helyi store-jából Backend-offline és Full-offline esetén is.
- A hubnak **nincs** saját mutációja → **nincs** outbox ebben a spechen.
- Nettó / havi ekvivalens / maradék **mindig** kliens pure TS (nincs homokóra a számítás miatt — `~` csak hiányzó bruttónál). Lásd [[Backend-offline first]].
- Kiadás create/update/delete: [[Rendszeres kiadások]] outboxa, sync: [[Szinkronizációs központ]].

### Backend

_Nincs backend érintettség._ (kiadás OpenAPI: [[Rendszeres kiadások]]; nettó nincs szerver-számítás)

### Nyitott kérdések

Nincs nyitott kérdés.
