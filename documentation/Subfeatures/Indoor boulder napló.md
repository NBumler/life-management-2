# Indoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder admin]], [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Profile]], [[Backend-offline first]] |

### Célállapot

Beltéri boulder sessionök és kísérletek naplózása. Dashboard belépő: **Indoor Boulder** → ez a form (nincs location/discipline választó).

Közös session modell: [[Mászónapló]] (`locationType=INDOOR`, `discipline=BOULDER`). Ez a **reference napló-spec**; a többi kontextus innen ágazik el.

### Funkcionális leírás

#### Session mezők (e kontextus)

| Mező | Szabály |
|---|---|
| `date`, `totalSessionDurationMinutes` | [[Mászónapló]]; fallback: kísérletek × 5 perc |
| `gymId` | Kötelező választás [[Indoor boulder admin]] teremből (legutóbbi terem előtöltés). A picker csak azokat a termeket listázza, amelyek `Gym.disciplines`-e tartalmazza a boulder jelölést. |
| `gymName` | Snapshot |
| `pumpRating` / `headspaceRating` / `notes` / `climbingPartners` | [[Mászónapló]] — pump ajánlott, többi opcionális |
| `attempts` | ≥0; élő pipálás vagy utólag |

`weatherConditions` **nincs** (indoor).

#### Attempt mezők (indoor boulder)

| Mező | Szabály |
|---|---|
| `colorBandId` | Opcionális; ha van → elsődleges gyorsválasztás |
| Snapshot | `colorName`, `hexColor`, `gradeRange` (pl. `6A–6B`), index tartomány |
| `userRawInput` | Opcionális / alternatív: [[Nehézségi szint skálája]] Font/V parser |
| `absoluteDifficultyIndex` | Szín közép / parsed grade |
| `isSuccess` | Boolean |
| `attemptCount` | Opcionális `≥ 1` (próbák az adott problémán) |
| `ascentStyle` | Ha siker: `FLASH` \| `REDPOINT` \| `ONSIGHT` (ONSIGHT megengedett fallback) |
| `notes` | Opcionális (pl. top fogás) — sikertelennél `failurePoint` helyett / mellett rövid note |

Nincs `safetyStyle`, `lengthInMeters`, `PitchLog`.

Kalória / volumen: [[Mászónapló]] (boulder 60 s/kísérlet; volume = sikeres × 4 m × \(I\)).

CRUD: nested session mentés; soft delete; draft élő sessionhez.

### UI/UX elvárások

- Flow: Hub → Indoor Boulder csempe → Active session (vagy utólagos) → kísérlet hozzáadás (szín chip / parser) → pipa → Befejezés.
- Szín-sáv chip-ek a kiválasztott teremből; mellettük szöveges grade.
- Thumb-zone: új kísérlet / siker toggle / session vége.
- Lista: közös Mászónapló lista, szűrő: Indoor Boulder.
- Admin: jobb felső → [[Indoor boulder admin]].

### Megjegyzések

1.0 fájdalom: túl sok kötelező mező — itt minimális kötelező: dátum + terem + legalább idő vagy kísérletek (duration fallback).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kontextus-fix; shared session store; grade + calorie utilities; draft storage.

#### Backend-offline

Helyi store + outbox; nested PUT/POST; soft delete; draft nem outbox amíg nincs mentés. Lásd [[Backend-offline first]], [[Mászónapló]].

### Backend

`ClimbingSession` + `AscentAttempt` discriminator `INDOOR`+`BOULDER`; opcionális `colorBandId` + snapshot JSON/oszlopok. Közös API: [[Mászónapló]].

### Nyitott kérdések

Nincs nyitott kérdés.
