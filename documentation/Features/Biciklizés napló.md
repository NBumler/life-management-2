# Biciklizés napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Úszás napló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Célállapot

Kerékpáros utak naplózása az [[Edzés]] tab alatt. Egy naplóbejegyzés = egy út. A nap hozzájárulása az `activityExtraKcal`-hoz a [[Tápérték kalkulátor]] univerzális MET képletével számolódik; a táv és a szintemelkedés csak napló / statisztika (és MET-kategória választási segéd), nem része a kalóriaszámításnak.

### Funkcionális leírás

#### Entitás — `BikeRideLog`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja létrehozáskor |
| `date` | Naptári dátum (kliens TZ); aznapi `activityExtraKcal` összegzéshez. Start/end időpont **nincs** az első körben. |
| `durationMinutes` | Kötelező; egész szám, `> 0` |
| `intensity` | Kötelező enum — lásd MET tábla |
| `distanceKm` | Opcionális; `≥ 0`; tisztán napló / statisztika + átlagsebesség-hint |
| `elevationGainMeters` | Opcionális; `≥ 0`; tisztán napló / statisztika |
| `createdAt` / `updatedAt` | Audit (kliens + szerver) |

**Egy napló = egy út.** Nincs szakaszokra bontás.

CRUD: lista, létrehozás, szerkesztés, törlés (hard delete).

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

\[\text{kcal} = \text{MET}(\text{intensity}) \times m \times \frac{\text{durationMinutes}}{60}\]

- \(m\): aktuális testsúly kg-ban a [[Profile]]-ból — **nem** fagyasztódik a naplóba.
- A napló **nem tárol** `activityExtraKcal` / testsúly mezőt; a napi összeg a Tápérték kalkulátor pure utility-je számolja (profilsúly / napló változásra újraszámol).
- `distanceKm` és `elevationGainMeters` **nem** szerepelnek a képletben.

| `intensity` | MET | Megjegyzés |
|---|---|---|
| `CITY` | 4.0 | &lt;16 km/h, kényelmes városi |
| `STATIONARY` | 6.0 | Szobabicikli / görgő |
| `ROAD_LEISURE` | 6.8 | 16–22 km/h |
| `MOUNTAIN_TRAIL` | 8.5 | MTB / trail |
| `ROAD_VIGOROUS` | 10.0 | &gt;22 km/h |

#### Átlagsebesség-hint (csak UI)

Ha `distanceKm` és `durationMinutes` megvan:

\[\text{avgSpeedKmH} = \frac{\text{distanceKm}}{\text{durationMinutes} / 60}\]

Soft javaslat (nem írja felül a user `intensity` választását):

| `avgSpeedKmH` | Javasolt |
|---|---|
| &lt; 16 | `CITY` |
| 16–22 | `ROAD_LEISURE` |
| &gt; 22 | `ROAD_VIGOROUS` |

`STATIONARY` és `MOUNTAIN_TRAIL`: nincs sebesség-alapú javaslat.

### UI/UX elvárások

- Belépés: [[Edzés]] tab → Biciklizés napló.
- **Lista:** időrend (újabb elöl); soron: dátum, időtartam, `intensity`, opcionális táv / emelkedés; megjelenített kcal = utility számítás (Profile `m` + MET).
- **Új / szerkesztés űrlap:** dátum, `durationMinutes`, `intensity` (kötelező); `distanceKm`, `elevationGainMeters` (opcionális); élő kcal előnézet; ha van táv+idő → `avgSpeedKmH` + soft MET-hint.
- **Törlés:** megerősítő dialógus, majd hard delete.
- Első fókusz: `durationMinutes` (vagy a platformon legkényelmesebb kötelező mező).

### Megjegyzések

- GPS / külső eszköz sync: későbbi scope (nincs az első körben).
- Mintázatban rokon: [[Úszás napló]] (MET napló, Edzés tab).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: lista, create/edit form, delete confirm.
- Shared MET / kcal utility a [[Tápérték kalkulátor]] kanonikus képletével (`TdeeCalculatorUtil` vagy ekvivalens bike ág); testsúly: [[Profile]] store.
- `avgSpeedKmH` + hint: pure TS, csak prezentáció.
- OpenAPI generált kliens a CRUD-hoz; mutációk az offline rétegen keresztül.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Kcal előnézet és napi `activityExtraKcal`: mindig kliensoldali pure számítás (Profile + naplók); nincs külön sync a kcal-hoz.
- Lásd [[Backend-offline first]].

### Backend

- OpenAPI CRUD: `BikeRideLog` (`id` UUID, `date`, `durationMinutes`, `intensity` enum, opcionális `distanceKm`, `elevationGainMeters`).
- Nincs szerveroldali kcal mező az entitáson; opcionális szerveroldali ellenőrzés / újraszámolás ugyanazzal a MET táblával (paritás a [[Tápérték kalkulátor]]ssal), ha a backend TDEE-t is számol.
- Auth / user scope: a bejelentkezett user saját naplói.

### Nyitott kérdések

Nincs nyitott kérdés.
