# Rendszeres kiadások

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Pénzügyek]] |
| **Kapcsolódó** | [[Pénzügyek]], [[Nettó fizetés kalkulátor]], [[AYCM tracker]], [[Értesítések]], [[Szöveges keresés]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Ismétlődő, fix összegű kiadások (előfizetés, bérlet, biztosítás) nyilvántartása. A [[Pénzügyek]] dashboard a **havi ekvivalens összegét** innen olvassa. Az [[AYCM tracker]] opcionálisan **egy** sort belinkel (`linkedRecurringExpenseId` az AYCM oldalon) — **ezen a spechen nincs AYCM mező**.

Belépés: [[Pénzügyek]] hub → Havi kiadások / Maradék kártya, vagy közvetlen gyerek-route.

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP):** egyszeri tranzakció; fizetési előzmény-tábla; `WEEKLY` / tetszőleges `interval`; envelope; más pénznem; naptár-producer ([[Naptár]]); közelgő fizetés-értesítés ([[Értesítések]] — továbbra is későbbi típus); duplikálás; seed; undelete; `endDate`; banki szinkron.

### Funkcionális leírás

#### Entitás — `RecurringExpense`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; trim után nem üres. **Nem** egyedi (két „Internet” OK). |
| `amountHuf` | Kötelező egész `≥ 1` (HUF, nincs tizedes) |
| `frequency` | Kötelező enum: `MONTHLY` \| `QUARTERLY` \| `YEARLY` |
| `category` | Kötelező enum: `ENTERTAINMENT` \| `SPORT` \| `UTILITIES` \| `INSURANCE` \| `OTHER` |
| `nextBillingDate` | Kötelező `YYYY-MM-DD`, kliens naptári nap. A **következő** várt terhelés napja. Nincs auto-roll. |
| `billingDayOfMonth` | Kötelező egész `1`–`31`. A **szándékolt** nap a periódusban (a 12-e 12-e maradjon; 31-edike rövid hónapban clamp, utána visszaáll). Lásd léptetés. |
| `active` | Kötelező boolean, default `true`. `false` = szünet: a listán marad, a dashboard / AYCM összegből **kiesik**. |
| `notes` | Opcionális szabad szöveg |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Nincs `lastPaidAt`, nincs occurrence-tábla, nincs AYCM flag.

#### Beszámított sor (fogyasztói szerződés)

Egy sor **beleszámít** a havi összegbe és az AYCM olvasásba, ha:

`deleted = false` **és** `active = true`.

Dashboard-összeg: Σ `monthlyEquivalentHuf(row)` a beszámított sorokra. Üres halmaz → **0 Ft**.

AYCM: ha a `linkedRecurringExpenseId` nincs, vagy a sor nem beszámított (törölt / szünet / hiányzik) → `~`. Ez a spec **nem** módosítja az AYCM FK-t.

#### Havi ekvivalens (fogyasztói szerződés)

SSOT **itt**; a [[Pénzügyek]] dashboard és az [[AYCM tracker]] „megéri-e” ezt hívja (nem másol képletet).

`monthlyEquivalentHuf(row)` — egész Ft, `Math.round` (0.5 fel):

| `frequency` | Képlet |
|---|---|
| `MONTHLY` | `amountHuf` |
| `QUARTERLY` | `round(amountHuf / 3)` |
| `YEARLY` | `round(amountHuf / 12)` |

Összeg: soronként kerekítve, aztán Σ.

#### Dátumléptetés (`addPeriod`)

Cél: a **szándékolt nap** megmaradjon. Ha csak a clampelt `nextBillingDate` napját léptetnénk, jan. 31. → febr. 28. → márc. 28. (a 31 elveszne). Ezért kell a `billingDayOfMonth`.

```
addPeriod(nextBillingDate, frequency, billingDayOfMonth) → új nextBillingDate

months = MONTHLY → 1; QUARTERLY → 3; YEARLY → 12
(year, month) = nextBillingDate év-hó + months   // naptári hónap, túlcsordulás évben
last = az (year, month) utolsó napja
day = min(billingDayOfMonth, last)
return YYYY-MM-DD(year, month, day)
```

Példa: `billingDayOfMonth = 31`, jan. 31. → Fizetve → febr. 28. (vagy 29.); következő Fizetve → márc. 31.

Feb. 29. mint szándékolt nap: nem-szökőévben clamp 28-ra; következő szökőévben újra 29., ha `billingDayOfMonth` 29 maradt.

**Nincs auto-roll** (app-nyitás nem léptet). Lejárt dátum lejárt marad, amíg a user **Fizetve**-t nyom vagy kézzel dátumot szerkeszt.

#### Fizetve

- Csak **élő, aktív** soron (`deleted = false`, `active = true`).
- Művelet, nem tartós checked-állapot: `nextBillingDate = addPeriod(...)`; `billingDayOfMonth` **változatlan**.
- Egy tap = **egy** periódus a **tárolt** `nextBillingDate`-hez (nem `ma + periódus`). Három hónap csúszásnál egy tap után még lejárt lehet.
- Lista soron és szerkesztőn ugyanaz a `PUT`.
- Nincs undo; a dátum kézzel szerkeszthető.
- Szüneteltetett soron Fizetve **nincs** (előbb aktiválás).

#### `billingDayOfMonth` szinkron

- **Create:** a választott `nextBillingDate` napja (1–31).
- **Kézi `nextBillingDate` szerkesztés:** `billingDayOfMonth :=` az új dátum napja (szándékos felülírás, pl. 31. → 15.).
- **Fizetve / `frequency` / összeg / név / kategória / notes / `active`:** `billingDayOfMonth` nem változik.
- Create/edit után a `nextBillingDate` érvényes naptári nap; a `billingDayOfMonth` **lehet nagyobb**, mint a jelenlegi hónap hossza (csak a megjelenített dátum van clampelve).

#### CRUD

- Lista, létrehozás, szerkesztés, törlés, szünet / élesítés, Fizetve. **Duplikálás nincs.**
- **Create defaultok:** `frequency = MONTHLY`, `nextBillingDate = ma` (kliens naptári nap), `billingDayOfMonth =` ma napja, `active = true`, `category = OTHER`. `name` auto-focus. `amountHuf` üres, amíg a user ki nem tölti (`≥ 1` mentéskor).
- **Törlés:** megerősítés a `name`-mel → soft delete. Kiesik a listából (nem a Szüneteltetettbe kerül), a dashboard összegből és az AYCM beszámításból. Nincs undelete.
- **Szünet:** `active = false` (nincs kötelező confirm — visszafordítható). **Élesítés:** `active = true`; a `nextBillingDate` **nem** ugrik magától.
- `frequency` / `amountHuf` változtatás **nem** lépteti a dátumot.
- Soft delete szerződés: [[Backend-offline first]] / háztartási mintára. Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás ([[Szinkronizációs központ]]). HTTP `DELETE` tombstone; már törölt `DELETE` → **200**. Listák: `deleted = false` (az inaktívak **benne** vannak). Saját törölt `GET` by id → **200** + `deleted = true`. `PUT` törölt entitáson **nem** undo; pull után pending `PUT` eldobandó.

#### Fogyasztók

- [[Pénzügyek]] dashboard: Σ beszámított `monthlyEquivalentHuf`.
- [[AYCM tracker]]: egy beszámított sor havi ekvivalense; különben `~`. Setup UI később.
- [[Naptár]]: **nem** producer.
- [[Értesítések]]: közelgő fizetés **nem** az első kör; a típus hook marad a spechen.

### UI/UX elvárások

- **Belépés:** [[Pénzügyek]] dashboard kártya (Havi kiadások / Maradék). Feature flag: a **Pénzügyek** flag (nincs külön gyerek-flag).
- **Lista** — szekciók (üres **rejtve**):
  1. **Lejárt** — `active` és `nextBillingDate < ma`
  2. **Ma** — `active` és `nextBillingDate = ma`
  3. **Később** — `active` és `nextBillingDate > ma`
  4. **Szüneteltetett** — `active = false` (dátumtól függetlenül; szürkítve)
- Szekción belül: `nextBillingDate` növekvő, majd `name`. Szüneteltetett: `name`.
- Soron: **Fizetve** (csak aktív), név, `amountHuf` + ritmus i18n, **havi ekvivalens**, `nextBillingDate`. Lejárt: figyelmeztető szín + lemaradás (`ma − nextBillingDate` nap). Kategória címke i18n ([[Nyelv választás]]). Kontraszt: [[Dark&Light mode]].
- **Fizetve** a listán művelet-gomb / pipa-szerű kontroll, nem tartós checkbox.
- Szünet / törlés: sliding (`ion-item-sliding`) **törlés** megerősítéssel; szünet a sliding második akciója **vagy** a szerkesztő `active` kapcsolója (mindkettő ugyanaz a `PUT`).
- **Szűrő:** kategória-chipek, **VAGY** (unió). Alap: mind az **öt** chip be. Minden chip ki → üres lista, a chipek maradnak („nincs találat”, nincs create CTA). Kereső: [[Szöveges keresés]] (`name` + `notes`). Szűrő és kereső **ÉS**. Szűrt üres ≠ globális üres (globális üres: CTA új kiadásra).
- Create / edit: név, összeg (Ft), ritmus, kategória, `nextBillingDate`, notes; edit: `active`. `name` auto-focus create-nél.
- Törlés: confirmation a névvel.

### Megjegyzések

A hub három száma a [[Pénzügyek]] speché. Itt a CRUD, a dátumléptetés, a beszámított-halmaz és a havi ekvivalens SSOT.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: `RecurringExpenseListPage`, `RecurringExpenseEditPage`. Route pl. `/tabs/menu/finance/recurring-expenses`, `/tabs/menu/finance/recurring-expenses/new`, `…/:id`.
- Pure TS: `monthlyEquivalentHuf`, `addPeriod`, Lejárt/Ma/Később/Szüneteltetett, `countsInMonthlyEquivalent`.
- Kereső: [[Szöveges keresés]]. i18n enumok: [[Nyelv választás]].
- OpenAPI generált kliens; mutációk offline rétegen.
- Fizetve / szünet / szerkesztés: `PUT`. Törlés: `DELETE` (soft).
- Dashboard: import `countsInMonthlyEquivalent` + `monthlyEquivalentHuf` — nem másolja a képletet ([[Pénzügyek]]).

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update (Fizetve, `active`, mezők) / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- `addPeriod` és havi ekvivalens **mindig** kliens pure TS (nincs homokóra).
- Soft delete: helyi `deleted = true` + outbox `DELETE`. Soha nem syncelt draft: helyi hard remove + outbox purge.
- Pull: `deleted = true` → kiesik a listából; pending `PUT` ugyanarra az ID-ra eldobandó.
- Dashboard / AYCM olvasás helyi store, net nélkül. Lásd [[Backend-offline first]].

### Backend

- Tábla: `recurring_expense` (`id` UUID, `user_id`, `name`, `amount_huf`, `frequency`, `category`, `next_billing_date` date, `billing_day_of_month` smallint, `active` boolean, `notes` nullable, `deleted` / `deleted_at`, audit).
- Nincs unique a névre. Check: `amount_huf ≥ 1`, `billing_day_of_month` 1–31, enumok.
- OpenAPI (lista implicit `deleted = false`; inaktív **benne**):

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` `POST` | `/api/recurring-expenses` | Lista / create |
| `GET` `PUT` `DELETE` | `/api/recurring-expenses/{id}` | Fizetve / szünet = `PUT`; `DELETE` = soft delete |

- User scope: [[Bejelentkezés]] (idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted`). `DELETE` idempotens.
- A szerver **nem** auto-rollol és **nem** számol havi ekvivalenst a dashboardhoz — az a kliens utility. Nincs AYCM FK ezen a táblán.

### Nyitott kérdések

Nincs nyitott kérdés.
