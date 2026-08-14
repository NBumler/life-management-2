# Háztartási feladatok

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Tennivalók]] |
| **Kapcsolódó** | [[Naptár]], [[Értesítések]], [[Szöveges keresés]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Lakás körüli, helyiséghez kötött, ismétlődő teendők. A Feladatok tabon a [[Tennivalók]] hubból nyílik; előfordulásai a [[Naptár]]ban jelennek meg; esedékes / lejárt tételekről napi digest [[Értesítések]].

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP):** kapcsolat [[Élet tervek]]kel; egyszeri (nem ismétlődő) feladat; heti-nap / havi / szezonális ritmus; skip / snooze / szünet / undo; duplikálás; seed helyiségek; teljes elvégzés-előzmény lista; kapacitás-tervező (napi perc/energia keret); lead time az értesítésen (előző este / N nappal korábban); undelete UI.

### Funkcionális leírás

#### Modell: egy feladat = egy helyiség

A feladat példány mindig **pontosan egy** helyiséghez tartozik. Create-kor a user **több helyiséget** is bepipálhat: a rendszer helyiségenként **független** `HouseholdTask` sort hoz létre (ugyanaz a név / ritmus / energia / perc / `nextDue` / megjegyzés, külön UUID, külön `nextDue` gördülés innentől).

Szerkesztés: egy példány, egy helyiség (a helyiség áttehető; névütközés az cél-helyiségben → validációs hiba).

#### Entitás — `HouseholdRoom`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; **egyedi a user élő helyiségei között** (case-insensitive, trim) |
| `sortOrder` | Egész; manuális sorrend a helyiséglistában |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Csak név + sorrend. **Üres start:** nincs seed (konyha / WC nem előre töltve).

Törölt helyiség neve **újra felvehető** (egyediség csak `deleted = false` sorokra).

#### Entitás — `HouseholdTask`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `roomId` | UUID → `HouseholdRoom`; kötelező |
| `name` | Kötelező; **egyedi az adott helyiség élő feladatai között** (case-insensitive, trim). Más helyiségben ugyanaz a név OK. |
| `energyLevel` | Kötelező enum: `LOW` \| `MEDIUM` \| `HIGH` (Alacsony / Közepes / Magas) |
| `estimatedMinutes` | Kötelező egész `≥ 1` |
| `intervalDays` | Kötelező egész `≥ 1` (hány naponta). Nincs felső korlát; a naptár 1 éves sapkája vágja a vetítést. |
| `nextDue` | Kötelező dátum (`YYYY-MM-DD`), kliens naptári nap (TZ). Create alapértelmezés: **ma**. Később kézzel szerkeszthető. |
| `lastCompletedAt` | Opcionális dátum-idő; utolsó pipálás. Nincs teljes előzmény-napló. |
| `notes` | Opcionális szabad szöveg |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Nincs `lifePlanId`. Nincs külön occurrence tábla: a naptár-előfordulások **számítottak**.

#### Helyiség CRUD

- Lista, létrehozás, átnevezés, törlés, **manuális sorrend** (web drag-and-drop; telefon fel / le nyilak — [[Sablonok]] / [[Pakolás]] mintára).
- Create a helyiségkezelőből **vagy inline** a feladat-űrlapról (név → új `HouseholdRoom`, kijelölve marad).
- **Törlés:** megerősítő dialógus kötelező. **Cascade:** a helyiség + az összes hozzá tartozó (élő) feladat soft delete. A dialógus **név szerint felsorolja** a törlődő feladatokat (üres helyiségnél: csak a helyiség).
- Átnevezés szabad (élő egyediség ellenőrzése).

#### Feladat CRUD

- Lista, létrehozás, szerkesztés, törlés. **Duplikálás nincs.**
- Create űrlap: név, helyiség-checklist (**≥ 1**), energia, perc, `intervalDays`, `nextDue` (default ma), opcionális megjegyzés; inline új helyiség.
- Több helyiség a checklisten → N független feladat, N kliens UUID.
- Ha a név egy kijelölt helyiségben már foglalt: az a helyiség hibás, a többi létrejöhet; a UI jelzi, melyik helyiség bukott el.
- **Törlés:** megerősítés → soft delete a feladaton (helyiség marad). Naptár-előfordulásai eltűnnek; a következő digestből kiesik.

#### Pipálás (kész)

- Bármely feladaton (lejárt / ma / későbbi — a későbbi = korai elvégzés).
- Számítás **kliens naptári nap**, pure TS:

```
today = kliens TZ naptári dátum
lastCompletedAt = most (ISO dátum-idő)
nextDue = today + intervalDays
```

- Ha 3 napot késtél: **nem** marad azonnal újra esedékes; a ritmus a pipálás napjához igazodik.
- Korai pipálás: ugyanígy `ma + intervalDays`.
- Undo / skip / snooze nincs; a `nextDue` kézzel szerkeszthető.
- Naptárból pipálás: **ugyanaz** a mutáció.

#### Naptár-szerződés (producer)

A [[Naptár]] ezeket az all-day előfordulásokat olvassa; nincs saját háztartási naptár-tábla.

Algoritmus élő (`deleted = false`) feladaton:

1. `d = nextDue` (lehet múltbeli — lejárt az **eredeti** napján marad).
2. Amíg van kevesebb mint **10** előfordulás, és `d ≤ ma + 1 év`:
   - emit: all-day; **cím** = feladat `name`; **alcím** = helyiség `name`; `taskId`; `date = d`.
   - `d = d + intervalDays`.
3. `d > ma + 1 év` → stop (fél éves ritmusnál jellemzően 2 db).

Tap az előfordulásra → feladat részletek / szerkesztő. Pipálás a naptárból megengedett. Forrás szerinti naptár-szűrő: [[Naptár]] spec (később).

#### Értesítések

Aktív típus: `HOUSEHOLD_TASK_DUE` — szabályok SSOT: [[Értesítések]]. Röviden: napi **09:00** digest, `nextDue ≤ ma` élő feladatok, 1 / naptári nap, tap → ez a lista Lejárt+Ma. A naptár 10 előfordulása **nem** 10 értesítés.

#### Törlés (soft delete) — közös

Szinkronizált entitás törlése: **soft delete** (`deleted` / `deletedAt`), hogy a tombstone multi-device synchelhető legyen — [[Backend-offline first]]. A usernek ez törlés (nem látszik a listákon, nincs undelete).

Kivétel: soha nem szinkronizált helyi draft → helyi **hard remove** + outbox tisztítás ([[Szinkronizációs központ]]).

HTTP `DELETE` a szerződésben marad; a szerver tombstone-t ír, nem fizikai dropot. Már törölt ID-re `DELETE` → **200** (idempotens). Listák: `deleted = false`. Saját törölt ID `GET` by id: **200** + `deleted = true` (ne 404). `PUT` törölt entitáson **nem** undo; a kliens pull után eldobja a pending `PUT`-ot.

### UI/UX elvárások

- **Belépés:** [[Tennivalók]] (Feladatok tab) → Háztartási feladatok. A hub csempéi ([[Naptár]], [[Élet tervek]]) a szülő spechen maradnak.
- **Lista (alapnézet):** szekciók **Lejárt** (`nextDue < ma`) / **Ma** (`nextDue = ma`) / **Később** (`nextDue > ma`). Szekción belül: `nextDue` növekvő, majd helyiség `sortOrder`, majd feladatnév.
- Soron: pipa, név, helyiség, `nextDue`, energia, perc.
- Szűrők (opcionális): helyiség, energia, max. perc. Kereső: [[Szöveges keresés]] (feladatnév + helyiségnév).
- Create / edit: fenti mezők; create-nél helyiség-checklist + inline helyiség; `name` auto-focus create-nél.
- Helyiségkezelő: lista, átnevezés, reorder, törlés a cascade-listás confirmationnel.
- Üres állapot: CTA új helyiségre / feladatra.
- Törlés: confirmation; helyiségnél a cascade-elt feladatok nevei.

### Megjegyzések

A Feladatok tab IA (hub vs közvetlen lista) a [[Tennivalók]] speché. Ez a spec a háztartási CRUD + naptár-producer + értesítés-forrás.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: feladat lista (szekciók / szűrők / kereső), feladat create/edit, helyiségkezelő.
- Pure TS: pipálás `nextDue` / `lastCompletedAt`; naptár-előfordulás vetítés; Lejárt/Ma/Később besorolás; 09:00 digest feltétel.
- Megosztott kereső: [[Szöveges keresés]]. Platformos reorder a helyiségeken.
- OpenAPI generált kliens; mutációk offline rétegen.
- Értesítés: helyi scheduler a store-ból; `nextDue` / törlés / pipálás után újraértékelés — [[Értesítések]].
- Naptár: az előfordulás-utility kimenetét olvassa ([[Naptár]]); pipálás innen ugyanaz a task `PUT`.
- Többhelyiséges create: egy user-akció → N helyi feladat; outbox: előbb az inline `POST` helyiség (ha van), aztán a feladat `POST`-ok (FIFO + `targetEntityId` függőség).

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete / complete (`PUT` a gördített mezőkkel) → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- `nextDue` számítás és naptár-vetítés **mindig** kliens pure TS (nincs homokóra).
- Soft delete: helyi `deleted = true` + outbox `DELETE`; cascade helyiségnél a feladatok is. Soha nem syncelt draft: helyi hard remove + outbox purge.
- Pull: `deleted = true` → kiesik az élő listákból; pending `PUT` ugyanarra az ID-ra eldobandó (nem resurrect).
- Digest: helyi store, net nélkül is. Lásd [[Backend-offline first]].

### Backend

- Táblák:
  - `household_room` (`id` UUID, `user_id`, `name`, `sort_order`, `deleted` / `deleted_at`, audit)
  - `household_task` (`id` UUID, `user_id`, `room_id`, `name`, `energy_level`, `estimated_minutes`, `interval_days`, `next_due` date, `last_completed_at` timestamptz nullable, `notes` nullable, `deleted` / `deleted_at`, audit)
- Egyediség (élő sorok): `(user_id, lower(name))` a helyiségen; `(room_id, lower(name))` a feladaton — partial unique `WHERE deleted = false`.
- `DELETE /api/household-rooms/{id}`: soft delete a szobára + cascade soft delete a userhez tartozó feladataira. Confirmation listát a kliens a helyi store-ból állítja.
- `DELETE /api/household-tasks/{id}`: soft delete a feladaton.
- OpenAPI CRUD; pipálás = `PUT` a taskon (nincs külön complete végpont kötelező). User scope: [[Bejelentkezés]] (idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted`).
- Nincs occurrence tábla; a naptár a kliensen számol.

### Nyitott kérdések

Nincs nyitott kérdés.
