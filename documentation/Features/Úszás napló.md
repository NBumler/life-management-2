# Úszás napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Biciklizés napló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Célállapot

Úszóedzések naplózása az [[Edzés]] tab alatt. Egy naplóbejegyzés = egy edzés. A nap `activityExtraKcal` hozzájárulása a [[Tápérték kalkulátor]] univerzális MET képletével számolódik. Medencehossz, körök és abból számolt táv **csak napló / statisztika** — nem része a kalóriaszámításnak.

### Funkcionális leírás

#### Entitás — `SwimLog`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja létrehozáskor |
| `date` | Naptári dátum (kliens TZ); aznapi `activityExtraKcal` összegzéshez. Start/end időpont **nincs**. |
| `durationMinutes` | Kötelező; egész szám, `> 0` |
| `intensity` | Kötelező enum — lásd MET tábla |
| `poolLengthMeters` | Opcionális; `> 0` (tipikus: 25 / 50). Medenceedzéshez. |
| `lapCount` | Opcionális; egész, `> 0`. **Egy kör = egy egyirányú hossz** (nem oda-vissza). |
| `distanceMeters` | Opcionális; `≥ 0`. Ha `poolLengthMeters` és `lapCount` megvan → **számított**: `poolLengthMeters × lapCount` (nem külön begépelt, felülírható manuálisan nem kell). Nyílt víz (`OPEN_WATER`): medence mezők rejtve / üresek; a táv kézzel opcionálisan megadható. |
| `createdAt` / `updatedAt` | Audit |

**Egy napló = egy edzés.** Nincs szakaszokra / váltott úszásnemekre bontás (ehhez `MIXED` vagy a domináns `intensity`).

CRUD: lista, létrehozás, szerkesztés, törlés (hard delete).

**Medence mezők együtt:** ha az egyik (`poolLengthMeters` / `lapCount`) ki van töltve, mentéskor a másik is kötelező. `OPEN_WATER` esetén mindkettő üres / nem validált.

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

\[\text{kcal} = \text{MET}(\text{intensity}) \times m \times \frac{\text{durationMinutes}}{60}\]

- \(m\): aktuális testsúly kg a [[Profile]]-ból — **nem** fagyasztódik a naplóba.
- A napló **nem tárol** `activityExtraKcal` / testsúly mezőt; a napi összeg a Tápérték utility számolja.
- `poolLengthMeters`, `lapCount`, `distanceMeters` **nem** szerepelnek a képletben.
- Nincs sebesség- / MET-auto-hint (szándékosan, ellentétben a [[Biciklizés napló]]val).

| `intensity` | MET | Megjegyzés |
|---|---|---|
| `CASUAL` | 5.5 | Könnyű / laza |
| `BREASTSTROKE` | 5.5 | Mellúszás |
| `BACKSTROKE` | 7.0 | Hátúszás |
| `CRAWL_FREESTYLE` | 8.0 | Gyors / crawl |
| `OPEN_WATER` | 9.5 | Nyílt víz |
| `BUTTERFLY` | 11.0 | Pillangó |
| `VIGOROUS` | 11.0 | Intenzív (nem stroke-specifikus) |
| `MIXED` | 5.5 | Vegyes; default mint `CASUAL` |

Egyetlen kötelező választó — nincs külön `swimmingIntensity` + `strokeType` páros.

### UI/UX elvárások

- Belépés: [[Edzés]] tab → Úszás napló.
- **Lista:** időrend (újabb elöl); soron: dátum, időtartam, `intensity`, opcionális táv (számított vagy kézi); megjelenített kcal = utility (Profile `m` + MET).
- **Új / szerkesztés:** dátum, `durationMinutes`, `intensity` kötelező; medencehossz + körök (együtt); `OPEN_WATER`-nél medence mezők rejtve, opcionális `distanceMeters`; élő kcal előnézet.
- Számított táv megjelenítése, ha van medence + kör.
- **Törlés:** megerősítés, hard delete.
- Első fókusz: `durationMinutes` (vagy platform szerint a legkényelmesebb kötelező mező).

### Megjegyzések

- Külső sync / óra: későbbi scope.
- Mintázatban rokon: [[Biciklizés napló]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: lista, create/edit form, delete confirm.
- Shared MET / kcal utility ([[Tápérték kalkulátor]]); testsúly: [[Profile]] store.
- `distanceMeters` = `poolLengthMeters × lapCount` pure TS, ha mindkettő megvan; `OPEN_WATER` kézi táv.
- OpenAPI generált kliens; mutációk offline rétegen.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Kcal: mindig kliensoldali pure számítás; nincs kcal mező az entitáson.
- Lásd [[Backend-offline first]].

### Backend

- OpenAPI CRUD: `SwimLog` (`id` UUID, `date`, `durationMinutes`, `intensity` enum, opcionális `poolLengthMeters`, `lapCount`, `distanceMeters`).
- Validáció: medence mezők együttese; `OPEN_WATER`-nél medence mezők null.
- Nincs szerveroldali kcal mező; opcionális MET-paritás ellenőrzés a [[Tápérték kalkulátor]]ssal.
- Auth / user scope: a bejelentkezett user saját naplói.

### Nyitott kérdések

Nincs nyitott kérdés.
