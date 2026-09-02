---
verifikalva:
verifikalt_commit:
---

# Élet tervek

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Tennivalók]] |
| **Kapcsolódó** | [[Naptár]], [[Események]], [[Háztartási feladatok]], [[Értesítések]], [[Szöveges keresés]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

Hosszabb távú, user-owned életcélok (pl. jogosítvány, rope-solo, költözés). Lista a Feladatok tab hubjáról. **Nem** naptári időpont és **nem** ismétlődő háztartási teendő.

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Határ a szomszédokhoz:**

| | Ide tartozik | Nem ide |
|---|---|---|
| [[Események]] | A cél maga („meglegyen a jogosítvány”) | A konkrét vizsga 10:00-kor |
| [[Háztartási feladatok]] | — | Ismétlődő, helyiséghez kötött teendő; **nincs** `lifePlanId` |

**Nem scope (MVP):** naptár-producer ([[Naptár]] `LIFE_PLAN` chip / előfordulás); értesítés ([[Értesítések]]); mérföldkő / checklist a terven; FK [[Háztartási feladatok]]hez vagy [[Események]]hez; kategória; prioritás; százalékos progress; duplikálás; seed; undelete; skip / snooze.

### Funkcionális leírás

#### Entitás — `LifePlan`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `title` | Kötelező; trim után nem üres. **Nem** egyedi (két „Maraton” OK). |
| `notes` | Opcionális szabad szöveg |
| `status` | Kötelező enum: `PLANNED` \| `IN_PROGRESS` \| `DONE` |
| `targetDate` | Opcionális `YYYY-MM-DD` (kliens naptári nap). Csak a **listán** jelenik meg — **nincs** naptár-emit. |
| `completedAt` | Opcionális timestamptz. `DONE` belépésekor a kliens `now`; `DONE`-ból kilépéskor `null`. |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Nincs occurrence-tábla, nincs `lifePlanId` a háztartási / esemény entitásokon, nincs mérföldkő-gyerek.

#### Állapotgép

Create default: **`PLANNED`**.

Mind a három állapotból **bármelyik** másikba szabad lépni (űrlap). Nincs kényszerített sorrend: `PLANNED` → `DONE` OK; `DONE` → `IN_PROGRESS` vagy `PLANNED` = visszanyitás.

| Átmenet | Mellékhatás |
|---|---|
| bármely → `DONE` | `completedAt = most` (ISO). A `targetDate` **nem** változik. |
| `DONE` → `PLANNED` vagy `IN_PROGRESS` | `completedAt = null` |
| egyéb | `completedAt` érintetlen |

Nincs pipa a listán (nem háztartási complete). A „kész” = `status` mező.

#### Céldátum (lista, nem naptár)

Opcionális. Üres = nincs horizon a kártyán.

**Lejárt** (csak listán): `deleted = false` ∧ `status ≠ DONE` ∧ van `targetDate` ∧ `targetDate < ma` (kliens naptári nap). A lemaradás: `ma − targetDate` nap. `DONE` **soha** nem lejárt, még múltbeli `targetDate` mellett sem.

A [[Naptár]] **nem** olvassa ezt a store-t. `LIFE_PLAN` producer / chip: [[Naptár]] (MVP = nem). Időzített nap = [[Események]].

#### CRUD

- Lista, létrehozás, szerkesztés, törlés. **Duplikálás nincs.**
- **Törlés:** megerősítés a címmel → soft delete. Nincs undelete. `DONE` sor is törölhető.

#### Törlés (soft delete) — közös

Szinkronizált entitás: **soft delete** (`deleted` / `deletedAt`) — [[Backend-offline first]]. A usernek ez törlés (nincs undelete).

Kivétel: soha nem szinkronizált helyi draft → helyi **hard remove** + outbox tisztítás ([[Szinkronizációs központ]]).

HTTP `DELETE` marad; a szerver tombstone-t ír. Már törölt ID-re `DELETE` → **200**. Listák: `deleted = false`. Saját törölt `GET` by id: **200** + `deleted = true`. `PUT` törölt entitáson **nem** undo; a kliens pull után eldobja a pending `PUT`-ot.

#### Értesítések

Nincs aktív típus. Későbbi hook: [[Értesítések]].

### UI/UX elvárások

- **Belépés:** [[Tennivalók]] hub → Élet tervek csempe (2. csempe).
- Feature flag: **saját** Élet tervek flag ([[Life Management 2.0]]). Ki → hub csempe rejtve. A [[Tennivalók]] flagje a tabot / háztartási csempét fedi: tab ki → ez a csempe sem látszik. A naptárat a flag **nem** érinti (nincs producer).
- **Lista:** szekciók **Folyamatban** (`IN_PROGRESS`) / **Terv** (`PLANNED`) / **Kész** (`DONE`). Üres szekció **rejtve**. Nincs pipa; tap a sorra → szerkesztő.
  - Folyamatban / Terv: lejárt elöl, majd `targetDate` növekvő, dátum nélküli a szekció **végén**, majd `title`.
  - Kész: `completedAt` csökkenő (újabb elöl), majd `title`.
- Soron: cím; státusz-címke i18n ([[Nyelv választás]]); `targetDate` ha van. Lejárt: figyelmeztető szín + lemaradás nap. `DONE` + múltbeli dátum: neutrális (nem overdue). Kontraszt: [[Dark&Light mode]].
- Kereső: [[Szöveges keresés]] (`title` + `notes`). Szűrt üres ≠ globális üres (nincs CTA, „nincs találat”).
- Üres állapot (nincs élő terv): CTA új tervre.
- Create / edit: `title` auto-focus create-nél; `status` szegmens (kötelező; create: `PLANNED`); opcionális `targetDate` (dátum-picker, törölhető); opcionális `notes`. Validáció: cím nem üres trim után.
- Törlés: confirmation a címmel.

### Megjegyzések

A Feladatok tab csempéi: [[Tennivalók]]. A naptár `LIFE_PLAN` slotja foglalt, de ez a spec **nem** producer — chip a producer-szerződésig rejtve ([[Naptár]]).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: `LifePlanListPage`, `LifePlanEditPage`. Route pl. `/tabs/tasks/life-plans`, `/tabs/tasks/life-plans/new`, `/tabs/tasks/life-plans/:id`.
- Pure TS: lejárt feltétel; szekció-besorolás; `completedAt` mellékhatás státuszváltáskor.
- Megosztott kereső: [[Szöveges keresés]].
- OpenAPI generált kliens; mutációk offline rétegen.
- Nincs naptár-mapper, nincs local notification trigger.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Lejárt / szekció **mindig** kliens pure TS (nincs homokóra).
- Soft delete: helyi `deleted = true` + outbox `DELETE`. Soha nem syncelt draft: helyi hard remove + outbox purge.
- Pull: `deleted = true` → kiesik; pending `PUT` ugyanarra az ID-ra eldobandó. Lásd [[Backend-offline first]].

### Backend

- Tábla `life_plan` (`id` UUID, `user_id`, `title`, `notes` nullable, `status`, `target_date` date nullable, `completed_at` timestamptz nullable, `deleted` / `deleted_at`, audit).
- Nincs egyediség a címen. Nincs occurrence / milestone tábla.
- Check: `status = DONE` → `completed_at` NOT NULL; különben `completed_at` NULL. (A kliens tartja; a szerver elutasíthatja a ellentmondó `PUT`-ot **400**-zal.)
- OpenAPI (lista implicit `deleted = false`):

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` `POST` | `/api/life-plans` | Lista / create |
| `GET` `PUT` `DELETE` | `/api/life-plans/{id}` | `DELETE` = soft delete |

- User scope: [[Bejelentkezés]] (idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted`). `DELETE` idempotens.

### Nyitott kérdések

Nincs nyitott kérdés.
