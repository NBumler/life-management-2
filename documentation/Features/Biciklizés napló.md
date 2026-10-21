---
verifikalva: 2026-10-20
verifikalt_commit: c79ac1c
---

# Biciklizés napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Úszás napló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Kerékpáros utak naplózása az [[Edzés]] tab alatt. Egy naplóbejegyzés = egy út. Az út kézzel rögzíthető, vagy natív appban **élő edzésként** (`backlog/150`): Pontos (folyamatos GPS) vagy Becsült (csak kezdő- és végpont) módban, a végén szerkeszthető összegzővel, amit ugyanaz a mentés ír a naplóba. A nap hozzájárulása az `activityExtraKcal`-hoz a [[Tápérték kalkulátor]] univerzális MET képletével számolódik; a táv és a szintemelkedés csak napló / statisztika (és MET-kategória választási segéd), nem része a kalóriaszámításnak.

### Funkcionális leírás

#### Entitás — `BikeRideLog`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja létrehozáskor |
| `date` | Naptári dátum (kliens TZ); aznapi `activityExtraKcal` összegzéshez. |
| `durationMinutes` | Kötelező; egész szám, `> 0` |
| `intensity` | Kötelező enum — lásd MET tábla |
| `distanceKm` | Opcionális; `≥ 0`; tisztán napló / statisztika + átlagsebesség-hint |
| `elevationGainMeters` | Opcionális; `≥ 0`; tisztán napló / statisztika |
| `trackingMode` | Opcionális enum: `MANUAL` / `LIVE` (Pontos) / `ESTIMATED` (Becsült). Hiányzó / `null` = kézi (a #150 előtti sorok is). Az űrlapon nem látszik; szerkesztéskor megmarad. |
| `startedAt` | Opcionális időbélyeg: az élő menet indulása. Kézi bejegyzésnél `null`; szerkesztéskor megmarad. |
| `deleted` | Soft delete (`false` default) |
| `createdAt` / `updatedAt` | Audit (kliens + szerver) |

**Egy napló = egy út.** Nincs szakaszokra bontás.

CRUD: lista (`deleted = false`), létrehozás, szerkesztés, törlés (soft delete).

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

\[\text{kcal} = (\text{MET}(\text{intensity}) - 1) \times m \times \frac{\text{durationMinutes}}{60}\]

- **Nettó MET** (`backlog/164`): a táblázat **bruttó** (Compendium-)értékeiből a nyugalmi 1 MET levonódik (`(MET − 1)`, `shared/net-met.ts`), mert azt a `maintenanceKcal = BMR × 1.2` már fedezi — így edzésóránként ~`1 × m` kcal nem számolódik kétszer. Lásd [[Tápérték kalkulátor]].
- \(m\): aktuális testsúly kg-ban a [[Profile]]-ból — **nem** fagyasztódik a naplóba.
- A napló **nem tárol** `activityExtraKcal` / testsúly mezőt; a napi összeg a Tápérték kalkulátor pure utility-je számolja (profilsúly / napló változásra újraszámol).
- `distanceKm` és `elevationGainMeters` **nem** szerepelnek a képletben.

| `intensity` | MET (bruttó) | Megjegyzés |
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

#### Élő edzés (`backlog/150`)

Csak natív appban (`offlineCapable`) és `edzes.bicikli` flaggel. Egyszerre egy élő menet létezhet; állapota eszköz-lokális draft (`Preferences`), így túléli az app bezárását / újraindítását. A GPS-t a Túra oldal navigációja is használja: amíg ott egy navigáció vagy felvétel fut (vagy összegzésre vár), élő menet nem indul, „GPS foglalt” üzenettel (`backlog/106`, `core/geo/gps-session-lock.ts`), és fordítva.

| Mód | Gyűjtés | Táv | Szintemelkedés |
|---|---|---|---|
| **Pontos** (`LIVE`) | Folyamatos háttér-GPS (`@capgo/background-geolocation`, Androidon foreground service + a plugin tartós értesítése), zárolt képernyővel is | A szűrt pontok közti szakaszok összege, szünetenként külön szakasz | Az eszközön tárolt DEM-ből a track mentén |
| **Becsült** (`ESTIMATED`) | Csak induláskor és befejezéskor egy-egy hely; menet közben nincs GPS | Eszközön futó bicikli-útvonaltervezés (`BIKE` profil) a két pont között | DEM az útvonal mentén |

- **Szintemelkedés (mindkét mód):** DEM-minta `ELEVATION_SAMPLE_SPACING_METERS` (50 m)-enként (legfeljebb `MAX_ELEVATION_SAMPLES` = 2000 / vonal), `ELEVATION_NOISE_THRESHOLD_METERS` (2 m) zajküszöbbel, szakaszonként összegezve — ugyanaz a mintavevő (`core/geo/route-metrics.ts` `elevationSamples()`), mint a túra útvonal-metrikáé, így ugyanarra a vonalra ugyanazt az értéket adják.
- **Pontszűrés (Pontos):** a `MAX_ACCEPTED_ACCURACY_METERS` (30 m)-nél pontatlanabb pont és a `MAX_PLAUSIBLE_SPEED_KMH` (80 km/h)-nál gyorsabb ugrást jelentő pont kimarad (a pontatlan pont „gyenge jel”-jelzést ad); `LIVE_DISTANCE_FILTER_METERS` (5 m) alatti elmozdulásra nincs új pont. A nyers pontok eszköz-lokálisak (track-buffer), mentés / elvetés után törlődnek.
- **Végponti hely (Becsült):** legfeljebb `ENDPOINT_FIX_TIMEOUT_SECONDS` (20 s) várakozás; `ENDPOINT_FIX_GOOD_ACCURACY_METERS` (20 m) pontosságnál korábban kész; timeout után a legjobb kapott hely; ha semmi nem jött, a pont sikertelen. Az időmérés a koppintástól indul, a kezdőpont a háttérben rögzül. Ha az app egy rögzítés közben bezáródik, az a pont újraindításkor sikertelen.
- **Becsült táv tartaléka:** ha nincs útvonal (lefedettségen kívül / nincs geo-csomag), légvonal × `ROAD_CIRCUITY_FACTOR` (1,3) — „durva becslés”, a szintemelkedés ekkor a légvonal mentén. Ha a kezdő- vagy a végpont sikertelen, a táv és a szintemelkedés **üres** (soha nem `0`).
- **Hihetőség (Becsült):** ha a becsült átlagsebesség `< MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH` (2 km/h) — körtúra, majdnem-körtúra, nagy kitérő —, az összegző figyelmeztet; a becsült táv előtöltve marad, felülírható / törölhető.
- **Szünet / folytatás:** a szünet nem számít a `durationMinutes`-ba; Pontos módban alatta nincs GPS-gyűjtés.
- **Időtartam:** aktív idő (indulás → befejezés, mínusz szünetek), percre kerekítve, legalább 1.
- **Összegző:** előtöltve `date`, `startedAt`, `durationMinutes`, `distanceKm`, `elevationGainMeters`, `trackingMode`; az `intensity` alapértéke `CITY`, a meglévő átlagsebesség-hint javasol. Mentés a meglévő `BikeRideLog` repository-n át, a menet saját UUID-jával; utána a draft törlődik. Elvetés megerősítéssel; a nyers pontok is törlődnek.
- Minden hangolható érték: `core/geo/tracking-config.ts`.

### UI/UX elvárások

- Belépés: [[Edzés]] tab → Biciklizés napló.
- **Lista:** időrend (újabb elöl); soron: dátum, időtartam, `intensity`, opcionális táv / emelkedés; megjelenített kcal = utility számítás (Profile `m` + MET).
- **Új / szerkesztés űrlap:** dátum, `durationMinutes`, `intensity` (kötelező); `distanceKm`, `elevationGainMeters` (opcionális); élő kcal előnézet; ha van táv+idő → `avgSpeedKmH` + soft MET-hint.
- **Élő edzés indítása (natív, ha nincs élő menet):** a listán mód-választó (Pontos / Becsült, mindegyiknél egy mondat a pontosság ↔ akkumulátor kompromisszumról + súgó ikon a részletes magyarázattal; a Becsült súgója a körtúra-korlátot is leírja), a választás eszköz-lokálisan megjegyezve alapértelmezésként (`lm2_bike_live_default_mode`), és „Élő edzés indítása” gomb. Megtagadott (vagy 60 mp-ig megválaszolatlan) helyhozzáférésnél azonnal magyarázó üzenet, a kézi napló marad (`backlog/229`: a hiányzó engedélyt a plugin `start()`-ja kéri, nem a `requestPermissions()`-e, ami Androidon elutasítás után soha nem tér vissza).
- **Élő képernyő** (`cycling/live`): aktív idő; Pontos módban táv és gyenge-jel jelzés; Becsült módban a kezdőpont állapota (rögzítés alatt / rögzítve / sikertelen), befejezéskor „Végpont rögzítése…”. Gombok: Szünet / Folytatás, Befejezés, Elvetés (megerősítéssel).
- **Live banner** a biciklis listán és az Edzés hub tetején, amíg élő menet létezik: állapot (felvétel / szünet / befejezve), Pontos módban táv, Becsült módban a mód neve, aktív idő; tap → élő képernyő, befejezett menetnél az összegző.
- **Tartós értesítés:** Becsült módban végig a sajátunk; Pontos módban felvétel közben a plugin foreground-service értesítése, szünetben a sajátunk.
- **Összegző** (`cycling/live/summary`): az új / szerkesztés űrlap élő változata saját címmel, előtöltve; jelzi a Becsült táv forrását (útvonal / durva becslés / hiányzó pont) és a hihetőség-figyelmeztetést; súgó ikon a menet módjának magyarázatával; „Elvetés” a törlés helyett.
- **Törlés:** megerősítő dialógus, soft delete (`deleted`); szinkronizálatlan helyi only → hard remove + outbox tisztítás. Lásd [[Backend-offline first]].
- A `durationMinutes` pozicionálisan a `date` utáni első kötelező numerikus kontroll (nincs explicit autofókusz-attribútum).

### Megjegyzések

- Külső eszköz (óra, kerékpáros komputer) sync: nincs implementálva.
- Energiatakarékos (ECO) mód nincs: a plugin nem tudja ritkábban ébreszteni a GPS-t (`backlog/150` 0. fázis, `backlog/153`).

#### Tudatos korlát

- **Becsült mód körtúrán / kitérőn:** csak a két végpont ismert, ezért körtúránál vagy nagy kitérőnél a becsült táv jóval rövidebb a valódinál. A hihetőség-figyelmeztetés csak a 2 km/h alatti esetet fogja meg; a súgó Pontos módot ajánl körtúrához.
- **Becsült út ≠ megtett út:** a tervezett bicikli-útvonal a legkedvezőbb út a két pont között, nem feltétlenül az, amerre a user ment.
- Mintázatban rokon: [[Úszás napló]] (MET napló, Edzés tab).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: lista, create/edit form, delete confirm; élő képernyő (`bike-live.page.ts`), összegző (ugyanaz az edit page `liveSummary` route-adattal), mód-választó (`bike-live-start.component.ts`), banner (`bike-live-banner.component.ts`, a listán és a `workout-log-list.page`-en).
- Élő menet állapotgép: `core/data/bike-live-session.service.ts` (start / szünet / folytatás / befejezés / elvetés / újraindítás, Preferences-draft, értesítések, `summary()`); GPS: `core/geo/location-tracking.service.ts` (`requestPermission()` engedélykérés, folyamatos követés + `acquireFix()` egyszeri végponti hely, `AbortSignal`-lal) és `track-buffer`; táv / DEM / útvonal: `core/geo/` (`geo-math`, `elevation.service`, `routing.service` `BIKE` profil). A natív-döntés `Capacitor.isNativePlatform()`, nem platform-string.
- Shared MET / kcal utility a [[Tápérték kalkulátor]] kanonikus képletével (`TdeeCalculatorUtil` vagy ekvivalens bike ág); testsúly: [[Profile]] store.
- `avgSpeedKmH` + hint: pure TS, csak prezentáció.
- OpenAPI generált kliens a CRUD-hoz; mutációk az offline rétegen keresztül.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Kcal előnézet és napi `activityExtraKcal`: mindig kliensoldali pure számítás (Profile + naplók); nincs külön sync a kcal-hoz.
- **Élő edzés:** teljesen eszközön fut, backend nélkül — Backend-offline és Full-offline esetén, soha nem bejelentkezett eszközön is mindkét mód végigvihető. A táv, a DEM-szintemelkedés és a Becsült mód bicikli-útvonaltervezése a geo build asset-ből számol (§15), Magyarország lefedettségén belül repülőgép módban is azonnal. A draft és a nyers pontok eszköz-lokálisak (`Preferences`), nem szinkronizálnak; csak a mentett `BikeRideLog` megy outboxon.
- **Lefedettségen kívül:** a szintemelkedés online az Open-Meteo-tól jön (kliens közvetlen hívása, §13), offline üres; a Becsült táv a légvonal × 1,3 tartalékra esik. Nem számolható érték üres, soha nem `0` (§14), kézzel pótolható.
- **Web build** (`offlineCapable = false`): nincs élő edzés, se mód-választó, se banner; a kézi napló változatlan.
- Lásd [[Backend-offline first]].

### Backend

- OpenAPI CRUD: `BikeRideLog` (`id` UUID, `date`, `durationMinutes`, `intensity` enum, opcionális `distanceKm`, `elevationGainMeters`, `trackingMode`, `startedAt`, `deleted`).
- Az élő edzéshez nincs külön végpont: a backend csak a kész bejegyzést kapja meg, minden számítás az eszközön fut.
- Soft delete; listák `deleted = false`.
- Nincs szerveroldali kcal mező az entitáson; opcionális szerveroldali ellenőrzés / újraszámolás ugyanazzal a MET táblával (paritás a [[Tápérték kalkulátor]]ssal), ha a backend TDEE-t is számol.
- Auth / user scope: a bejelentkezett user saját naplói.

### Nyitott kérdések

Nincs nyitott kérdés.
