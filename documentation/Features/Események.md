# Események

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tennivalók]], [[Naptár]], [[Új esemény hozzáadása]], [[Google Calendar szinkronizálása]], [[Értesítések]], [[Szöveges keresés]], [[Nyelv választás]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Saját, user-owned naptári események: egyszeri vagy egyszerűen ismétlődő, egész napos vagy időzített. Lista a Feladatok tab hubjáról; előfordulások a [[Naptár]]ban; emlékeztető: [[Értesítések]] `EVENT_OCCURRENCE`.

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP):** [[Google Calendar szinkronizálása]]; naptárból create; hónap-rácson timed sáv; „csak ez az előfordulás” / kivételek; többnapos / éjfélen átnyúló esemény; RRULE (havi, heti napok mix, COUNT); skip / snooze / undo; duplikálás; vendégek; eseményenkénti lead time; seed.

A create/edit űrlap mezői itt élnek; a [[Új esemény hozzáadása]] erre a specre mutat.

### Funkcionális leírás

#### Modell: egy sor = egy sorozat

Egy `CalendarEvent` sor egy **egyszeri** napot vagy egy **ismétlődő sorozatot** ír le. Nincs occurrence-tábla; a naptár és a lista előfordulásait a kliens vetíti.

Szerkesztés / törlés **mindig a sorozatra** vonatkozik (múltbeli megjelenített napok is átrendeződnek, ha a `date` / ritmus változik). Nincs „csak ez az alkalom”.

Nem pipálható: az előfordulás a napján marad (múltbeli is látszik a horizonon belül).

#### Entitás — `CalendarEvent`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `title` | Kötelező; trim után nem üres. **Nem** egyedi (több „Fogorvos” OK). |
| `location` | Opcionális szabad szöveg |
| `notes` | Opcionális szabad szöveg |
| `allDay` | Kötelező boolean |
| `date` | Kötelező `YYYY-MM-DD` (kliens naptári nap). Egyszerinél az a nap; ismétlődőnél a **sorozat kezdete** (`dtstart`). |
| `startTime` / `endTime` | `HH:mm` (24h, perc). `allDay = true` → mindkettő `null`. `allDay = false` → mindkettő kötelező, **ugyanaz a naptári nap**, `endTime > startTime`. |
| `frequency` | Opcionális enum: `DAILY` \| `WEEKLY` \| `YEARLY`. Üres / `null` = egyszeri. |
| `interval` | Egész `≥ 1`. `frequency` nélkül figyelmen kívül (tárolt default `1`). |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

**WEEKLY:** a `date` hét napja a ritmus (pl. csütörtök → minden `interval`. hét csütörtökje). **YEARLY:** ugyanaz a hó.nap; **feb. 29.** nem-szökőévben **kihagyva** (nincs előfordulás abban az évben; a következő érvényes feb. 29.).

Idő **falóra** a `date` napján (kliens TZ). Nincs külön TZ-mező; DST mellett 15:00 marad 15:00.

#### CRUD

- Lista, létrehozás, szerkesztés, törlés. **Duplikálás nincs.**
- Create / edit: [[Új esemény hozzáadása]] űrlap (mezők / defaultok alább, UI/UX-ben).
- **Törlés:** megerősítés a címmel. Ismétlődőnél a szöveg: az **egész sorozat** törlődik. Soft delete; naptár-előfordulások és jövőbeli értesítések kiesnek.
- `date` / `frequency` / `interval` / idő változtatása: a vetítés azonnal az új szabály szerint (nincs instance-kivétel).

#### Előfordulás-vetítés (producer)

Horizon (kliens naptári nap): `windowStart = ma − 1 év`, `windowEnd = ma + 1 év`. **Nincs** darabszám-sapka (heti esemény a távoli hónapban is kell).

Egyszeri: emit `date`, ha `windowStart ≤ date ≤ windowEnd`.

Ismétlődő: `d = date` (dtstart). Amíg `d < windowStart`: `d = next(d)`. Amíg `d ≤ windowEnd`: emit `d`, `d = next(d)`. `date > windowEnd` → 0 előfordulás.

`next(d)`:

- `DAILY`: `d + interval` nap
- `WEEKLY`: `d + interval × 7` nap
- `YEARLY`: év `+ interval`, ugyanaz a hó.nap; ha a dátum érvénytelen (feb. 29.) → újabb `+ interval` év, amíg érvényes

Emit mezők a [[Naptár]] DTO-hoz: `source = EVENT`; `sourceEntityId = id`; `date`; `allDay`; timed: `startTime` / `endTime`; `title`; `subtitle` = `location` (ha van); `completable = false`; `overdue = false`.

#### Naptár-szerződés

Élő producer: ez a spec `Kész` **és** az Események feature flag be. Chip: Események. Fogyasztói DTO / napi sorrend / overdue-szín: [[Naptár]] (ott frissítve). Nincs create a naptárból. Tap az előfordulásra → sorozat szerkesztő (ugyanaz, mint a listáról).

#### Értesítések

Aktív típus: `EVENT_OCCURRENCE` — szabályok SSOT: [[Értesítések]]. Röviden: időzített → az előfordulás `startTime`-ja; egész napos → **09:00** aznap; 1 / (`eventId` + előfordulás-nap); múltbeli előfordulásra nincs utólagos fire; tap → ez a szerkesztő.

#### Törlés (soft delete) — közös

Szinkronizált entitás: **soft delete** (`deleted` / `deletedAt`) — [[Backend-offline first]]. A usernek ez törlés (nincs undelete).

Kivétel: soha nem szinkronizált helyi draft → helyi **hard remove** + outbox tisztítás ([[Szinkronizációs központ]]).

HTTP `DELETE` marad; a szerver tombstone-t ír. Már törölt ID-re `DELETE` → **200**. Listák: `deleted = false`. Saját törölt `GET` by id: **200** + `deleted = true`. `PUT` törölt entitáson **nem** undo; a kliens pull után eldobja a pending `PUT`-ot.

### UI/UX elvárások

- **Belépés:** [[Tennivalók]] hub → Események csempe (4. csempe).
- Feature flag: **saját** Események flag ([[Life Management 2.0]]). Ki → hub csempe rejtve; a naptár EVENT chipje is rejtve ([[Naptár]] élő-producer szabály).
- **Lista:** szekciók **Ma** / **Közelgő** / **Múlt** a horizonbeli **előfordulásokból** (nem a nyers sorozat-sorokból). Üres szekció **rejtve**.
  - Ma: `date = ma`; sor: egész napos elöl, majd `startTime`, majd `title`.
  - Közelgő: `date > ma`; `date` növekvő, napon belül ugyanaz, mint Ma.
  - Múlt: `date < ma`; `date` csökkenő (újabb elöl), napon belül egész napos elöl, majd `startTime` csökkenő.
- Soron: cím; időzítettnél `startTime–endTime`; egész naposnál i18n „egész nap”; helyszín ha van; ismétlődőnél ritmus-címke (i18n, [[Nyelv választás]]). Nincs pipa.
- Kereső: [[Szöveges keresés]] (cím + helyszín). Szűrt üres ≠ globális üres (nincs CTA, „nincs találat”).
- Üres állapot (nincs élő esemény): CTA új eseményre.
- Create / edit: lásd [[Új esemény hozzáadása]] + alább.
- Törlés: confirmation; ismétlődőnél sorozat-figyelmeztetés.

#### Create / edit űrlap

- `title` auto-focus create-nél.
- `allDay` kapcsoló. **Create default: ki** (időzített).
- `date` default: **ma**.
- Időzített default: `startTime` = most **felfelé** a következő 15 percre (pontos 15-perc-határ marad); `endTime` = `startTime + 1 óra`. Ha ez **átlépné** a naptári napot: `endTime = 23:59`; ha akkor `endTime ≤ startTime`: `startTime = 22:59`, `endTime = 23:59`.
- Ritmus: nincs (egyszeri) / `DAILY` / `WEEKLY` / `YEARLY` + `interval` (default 1, `≥ 1`). WEEKLY/YEARLY magyarázat: a `date` napja / hó.napja.
- Opcionális helyszín, megjegyzés.
- Validáció: cím nem üres; időzítettnél mindkét idő, `endTime > startTime`; `interval ≥ 1` ha van `frequency`.

### Megjegyzések

A Feladatok tab csempéi: [[Tennivalók]]. A naptár fogyasztói szerződés: [[Naptár]]. Google: [[Google Calendar szinkronizálása]] (`TODO`).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: előfordulás-lista, create/edit (`EventEditPage`). Route pl. `/tabs/tasks/events`, `/tabs/tasks/events/new`, `/tabs/tasks/events/:id`.
- Pure TS: `next` / horizon vetítés; Ma/Közelgő/Múlt besorolás; 15 perc kerekítés; `EVENT_OCCURRENCE` ütemezési időpont.
- Megosztott kereső: [[Szöveges keresés]].
- OpenAPI generált kliens; mutációk offline rétegen.
- Naptár: a vetítés kimenetét olvassa ([[Naptár]]); tap → ez a szerkesztő.
- Értesítés: helyi scheduler a store + vetítésből; create/update/delete után újraértékelés — [[Értesítések]].

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Vetítés **mindig** kliens pure TS (nincs homokóra).
- Soft delete: helyi `deleted = true` + outbox `DELETE`. Soha nem syncelt draft: helyi hard remove + outbox purge.
- Pull: `deleted = true` → kiesik; pending `PUT` ugyanarra az ID-ra eldobandó.
- Értesítés: helyi store, net nélkül is. Lásd [[Backend-offline first]].

### Backend

- Tábla `calendar_event` (`id` UUID, `user_id`, `title`, `location` nullable, `notes` nullable, `all_day`, `date`, `start_time` / `end_time` nullable, `frequency` nullable, `interval`, `deleted` / `deleted_at`, audit).
- Nincs egyediség a címen. Nincs occurrence tábla.
- Check: `all_day = true` ↔ idők `null`; `all_day = false` → mindkét idő NOT NULL és `end_time > start_time`.
- OpenAPI (lista implicit `deleted = false`):

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` `POST` | `/api/events` | Lista / create |
| `GET` `PUT` `DELETE` | `/api/events/{id}` | `DELETE` = soft delete |

- User scope: [[Bejelentkezés]] (idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted`). `DELETE` idempotens.

### Nyitott kérdések

Nincs nyitott kérdés.
