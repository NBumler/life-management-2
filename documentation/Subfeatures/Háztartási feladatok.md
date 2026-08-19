# Háztartási feladatok

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Tennivalók]] |
| **Kapcsolódó** | [[Naptár]], [[Értesítések]], [[Szöveges keresés]], [[Nyelv választás]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Lakás körüli, helyiséghez kötött, ismétlődő teendők. A Feladatok tabon a [[Tennivalók]] hubból nyílik; előfordulásai a [[Naptár]]ban jelennek meg; esedékes / lejárt tételekről napi digest [[Értesítések]].

**Ownership:** **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP):** kapcsolat [[Élet tervek]]kel; egyszeri (nem ismétlődő) feladat; heti-nap / havi / szezonális ritmus; skip / snooze / szünet / undo; duplikálás; seed helyiségek; teljes elvégzés-előzmény lista; kapacitás-tervező (napi perc/energia keret); lead time az értesítésen (előző este / N nappal korábban); undelete UI.

### Funkcionális leírás

#### Modell: egy feladat = egy helyiség

A feladat példány mindig **pontosan egy** helyiséghez tartozik. Create-kor a user **több helyiséget** is bepipálhat: a rendszer helyiségenként **független** `HouseholdTask` sort hoz létre (ugyanaz a név / ritmus / energia / perc / `nextDue` / megjegyzés, külön UUID, külön `nextDue` gördülés innentől).

Szerkesztés: egy példány, egy helyiség (a helyiség áttehető; élő helyiségek pickerében; névütközés a cél-helyiségben → validációs hiba). `intervalDays` / energia / perc / név / megjegyzés / helyiség változtatása **nem** számolja újra a `nextDue`-t — az csak pipáláskor vagy kézi dátumszerkesztéskor változik.

#### Entitás — `HouseholdRoom`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; **egyedi a user élő helyiségei között** — összehasonlítási szabály: [[Névegyediség]] |
| `sortOrder` | Egész; manuális sorrend a helyiséglistában |
| `deleted` | Soft delete (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Csak név + sorrend. **Üres start:** nincs seed (konyha / WC nem előre töltve).

Törölt helyiség neve **újra felvehető** (egyediség csak `deleted = false` sorokra — [[Névegyediség]]).

#### Entitás — `HouseholdTask`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `roomId` | UUID → `HouseholdRoom`; kötelező |
| `name` | Kötelező; **egyedi az adott helyiség élő feladatai között** — összehasonlítási szabály: [[Névegyediség]]. Más helyiségben ugyanaz a név OK. |
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

- Lista, létrehozás, átnevezés, törlés, **manuális sorrend** (web drag-and-drop; telefon fel / le nyilak — [[Sablonok]] / [[Pakolás]] mintára). Új helyiség `sortOrder` = jelenlegi max élő + 1 (lista vége).
- Create a helyiségkezelőből **vagy inline** a feladat-űrlapról (név trim után nem üres → új `HouseholdRoom`, kijelölve marad). Üres / csak-szóköz név invalid.
- **Törlés:** megerősítő dialógus kötelező. **Cascade:** a helyiség + az összes hozzá tartozó (élő) feladat soft delete. A dialógus **név szerint felsorolja** a törlődő feladatokat (üres helyiségnél: csak a helyiség).
- Átnevezés szabad (élő egyediség ellenőrzése).

#### Feladat CRUD

- Lista, létrehozás, szerkesztés, törlés. **Duplikálás nincs.**
- Create űrlap: név, helyiség-checklist (**≥ 1**, mentés enélkül tiltott), energia, perc, `intervalDays`, `nextDue` (default ma), opcionális megjegyzés; inline új helyiség. Nulla helyiségnél a checklist üres — előbb inline create vagy helyiségkezelő.
- Több helyiség a checklisten → N független feladat, N kliens UUID.
- Ha a név egy kijelölt helyiségben már foglalt: az a helyiség hibás, a többi létrejöhet; a UI jelzi, melyik helyiség bukott el.
- **Törlés:** megerősítés (feladat neve) → soft delete a feladaton (helyiség marad). Naptár-előfordulásai eltűnnek; a következő digestből kiesik. Törölt feladaton pipálás nincs.

#### Pipálás (kész)

- Bármely **élő** feladaton (lejárt / ma / későbbi — a későbbi = korai elvégzés).
- A lista-pipa **művelet**, nem tartós checked-állapot: pipálás után a sor az új `nextDue` szerint más szekcióba kerül (vagy Később), nem marad kipipálva.
- Számítás **kliens naptári nap** (a dátum TZ nélkül tárolt `YYYY-MM-DD`; a „ma” a kliens aktuális naptári napja íráskor), pure TS:

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

Algoritmus élő (`deleted = false`) feladaton. A „következő 10” **jövőbeli** (és mai) előfordulás; a lejártból csak az élő `nextDue` marad az eredeti napján — ne töltse fel a naptárt 10 múltbeli nappal, ha a ritmus rövid és régóta csúszik.

`horizon = ma + 1 év` (kliens naptári nap).

1. Ha `nextDue ≤ horizon`: emit `nextDue` (múltbeli is — lejárt az **eredeti** napján).
2. `d = nextDue + intervalDays`. Amíg az emitált darabszám &lt; **10**:
   - ha `d > horizon` → stop;
   - ha `d ≥ ma`: emit `d`;
   - `d = d + intervalDays` (a további múltbeli lépéseket kihagyja).
3. Ha a `nextDue` maga `> horizon`: **0** előfordulás (a sapka vág; a feladat a listán marad).

Emit mezők: all-day; **cím** = feladat `name`; **alcím** = helyiség `name`; `taskId`; `date`. Fél éves ritmusnál jellemzően 2 db a horizonon belül.

Tap az előfordulásra → feladat részletek / szerkesztő. Pipálás a naptárból megengedett. Forrás szerinti naptár-szűrő, hónap rács, napi lista: [[Naptár]].

#### Értesítések

Aktív típus: `HOUSEHOLD_TASK_DUE` — szabályok SSOT: [[Értesítések]]. Röviden: napi **09:00** digest, `nextDue ≤ ma` élő feladatok, 1 / naptári nap; 0 találat → nincs értesítés; tap → ez a lista Lejárt+Ma. A naptár 10 előfordulása **nem** 10 értesítés.

#### Törlés (soft delete) — közös

Szinkronizált entitás törlése: **soft delete** (`deleted` / `deletedAt`), hogy a tombstone multi-device synchelhető legyen — [[Backend-offline first]]. A usernek ez törlés (nem látszik a listákon, nincs undelete).

Kivétel: soha nem szinkronizált helyi draft → helyi **hard remove** + outbox tisztítás ([[Szinkronizációs központ]]).

HTTP `DELETE` a szerződésben marad; a szerver tombstone-t ír, nem fizikai dropot. Már törölt ID-re `DELETE` → **200** (idempotens). Listák: `deleted = false`. Saját törölt ID `GET` by id: **200** + `deleted = true` (ne 404). `PUT` törölt entitáson **nem** undo; a kliens pull után eldobja a pending `PUT`-ot.

### UI/UX elvárások

- **Belépés:** [[Tennivalók]] hub (Feladatok tab) → Háztartási feladatok csempe. A többi hub-csempe a szülő spechen.
- Feature flag: a [[Tennivalók]] flagje fedi (nincs külön háztartási flag).
- **Lista (alapnézet):** szekciók **Lejárt** (`nextDue < ma`) / **Ma** (`nextDue = ma`) / **Később** (`nextDue > ma`). Üres szekció **rejtve**. Szekción belül: `nextDue` növekvő, majd helyiség `sortOrder`, majd feladatnév.
- Soron: pipa (művelet), név, helyiség, `nextDue`, energia, perc. Lejárt: figyelmeztető szín; a dátum mellett a lemaradás (`ma − nextDue` nap). Energia címkék i18n ([[Nyelv választás]]); tárolt érték az enum.
- Szűrők **ÉS** kapcsolatban (opcionális): helyiség, energia, max. perc. Kereső: [[Szöveges keresés]] (feladatnév + helyiségnév). Szűrt üres lista ≠ globális üres állapot (nincs CTA, inkább „nincs találat”).
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
- Egyediség (élő sorok): `(user_id, name_normalized)` a helyiségen; `(room_id, name_normalized)` a feladaton — partial unique `WHERE deleted = false`. A normalizálás SSOT-ja (és miért nem elég a `lower(name)`): [[Névegyediség]].
- `DELETE /api/household-rooms/{id}`: soft delete a szobára + cascade soft delete a userhez tartozó feladataira. Confirmation listát a kliens a helyi store-ból állítja.
- `DELETE /api/household-tasks/{id}`: soft delete a feladaton.
- OpenAPI (elvárás; lista implicit `deleted = false`):

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` `POST` | `/api/household-rooms` | Lista / create |
| `GET` `PUT` `DELETE` | `/api/household-rooms/{id}` | `DELETE` = soft delete + cascade feladatok |
| `GET` `POST` | `/api/household-tasks` | Lista / create (egy feladat, egy `roomId`; a multi-room create N `POST`) |
| `GET` `PUT` `DELETE` | `/api/household-tasks/{id}` | Pipálás = `PUT` (`nextDue`, `lastCompletedAt`) |

- User scope: [[Bejelentkezés]] (idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted`). `DELETE` idempotens.
- Nincs occurrence tábla; a naptár a kliensen számol.

### Nyitott kérdések

Nincs nyitott kérdés.
