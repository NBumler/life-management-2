# Naptár

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tennivalók]], [[Háztartási feladatok]], [[Események]], [[Élet tervek]], [[Értesítések]], [[Nyelv választás]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Aggregált naptár: a producer-feature-ök előfordulásait mutatja. Belépés: [[Tennivalók]] hub → Naptár csempe (Feladatok tab). Nincs saját naptár-entitás és nincs create a naptárból.

**Ownership:** nincs saját adat; a producer entitások **user-owned** — [[Bejelentkezés]].

**Nem scope (MVP):** nap / hét rács; év nézet; hét számok; húzással átütemezés; kereső; naptárból create (háztartási feladat vagy esemény); időzített sávok (timed events — [[Események]] spec `Kész` után); Google Calendar; utolsó nézett hónap / szűrő megjegyzése eszközön; lead-time értesítés a naptár előfordulásairól (háztartási digest: [[Értesítések]]).

### Funkcionális leírás

#### Szerep

A naptár **fogyasztó**. Az előfordulásokat a producer specek számolják (háztartási vetítés: [[Háztartási feladatok]]). Itt nincs occurrence-tábla, nincs saját OpenAPI.

#### Producer registry

Chip és előfordulás csak **élő** producerből: a forrás-spec `Kész`, és a feature flagje be van kapcsolva.

| `source` | Spec | MVP |
|---|---|---|
| `HOUSEHOLD_TASK` | [[Háztartási feladatok]] | Igen |
| `EVENT` | [[Események]] | Nem (spec `TODO`) |
| `LIFE_PLAN` | [[Élet tervek]] | Nem (spec `TODO`) |

Új producer: a saját specje leírja a vetítést; a naptár chipje automatikusan belép. A naptár specet csak akkor kell bántani, ha a fogyasztói szerződés (DTO / nézet) változik.

#### Előfordulás DTO (fogyasztói szerződés)

Kliensoldali, nem persistált. Egyedi kulcs: `source` + `sourceEntityId` + `date`.

| Mező | Típus / szabály |
|---|---|
| `source` | Enum (fenti registry) |
| `sourceEntityId` | UUID a producer entitásra (háztartás: `taskId`) |
| `date` | `YYYY-MM-DD`, kliens naptári nap |
| `allDay` | MVP: mindig `true` |
| `title` | Kötelező (háztartás: feladat `name`) |
| `subtitle` | Opcionális (háztartás: helyiség `name`) |
| `completable` | Háztartás: `true`; pipálás a producer mutációja |
| `overdue` | `date < ma` (kliens naptári nap) |
| `energyLevel` / `estimatedMinutes` | Háztartás: a lista-sorhoz; más producer elhagyhatja |

Háztartási emit + sapkák (10 előfordulás, 1 év, lejárt csak az élő `nextDue` napján): **SSOT** [[Háztartási feladatok]]. A naptár nem vetít újra.

#### Nézet: csak hónap + napi drill-down

Két képernyő:

1. **Hónap rács**
2. **Napi lista** (külön képernyő; a rács napjára tap nyitja)

Nincs nap / hét rács az MVP-ben.

#### Hónap rács

- Nyitás (hub csempe): **aktuális hónap**, a **mai nap** kiemelve. Nem jegyzi meg az utolsó hónapot.
- Hét kezdete: **hétfő** (hu és en UI-n is; ISO-8601). Napnevek i18n: [[Nyelv választás]].
- Előző / következő hónap: chevron + **vízszintes swipe**. Cím (hónap + év) nem nyit year-picker az MVP-ben.
- **Ma** gomb: aktuális hónap + mai nap kiemelve. Ha már ott vagyunk, no-op a rácson (a mai napra tap továbbra is nyitja a napi listát).
- Szomszédos hónap napjai a rács szélein **szürkén** látszanak; tap → az a napi lista (a rács hónapja visszaérkezéskor **marad**, nem ugrik át).
- Cellában: dátumszám + **szám-badge** = aznapi előfordulások száma a **aktuális szűrő után**. 0 → nincs badge. ≥ 100 → `99+`.
- Múltbeli nap, ahol van előfordulás: a dátumszám **figyelmeztető szín** (háztartásnál ez lejárt, pipálatlan `nextDue`). Ma: külön kiemelés (keret / fill). Jövő: neutrális + badge.
- Napra tap (üres is) → napi lista. Nincs kijelölés-állapot a rácson tap előtt; visszaérkezéskor az a nap, ahonnan jöttünk, legyen kiemelve (ne resetelődjön mára, kivéve Ma gomb).

#### Napi lista

- Cím: a nap dátuma (i18n). Előző / következő nap chevron; **Ma** → mai napi lista.
- Vissza → a hónap rács, ahonnan nyitottuk, azzal a nappal kiemelve.
- Sor: **pipa** (ha `completable`) + tap a sorra → producer szerkesztő. Háztartás: ugyanaz a feladat create/edit képernyő, mint a [[Háztartási feladatok]] listáról; pipálás **ugyanaz** a mutáció (`PUT` `nextDue` + `lastCompletedAt`). Nincs undo, nincs külön confirm a pipára.
- Háztartási sor: cím, alcím (helyiség), energia, perc; `overdue` → figyelmeztető szín + lemaradás (`ma − date` nap), mint a háztartási listán.
- Sorrend: `source` (MVP egy van), majd helyiség `sortOrder`, majd `title`.
- Pipálás / producer store változás után a **badge és a lista azonnal** újraszámolódik. Háztartás: a tétel lekerül erről a napról, az új `nextDue` a jövőben jelenik meg (korai pipálás is: `ma + intervalDays` — [[Háztartási feladatok]]).
- Üres nap: szöveg („nincs tétel”), **nincs CTA** (nincs create).
- Szűrt üres (chip ki) ≠ „nincs naptárad”: „nincs találat” / forrás kikapcsolva, nincs create CTA.

#### Forrás-szűrő (chipek)

- Multi-select, **VAGY** (unió). Alap: minden **élő** chip be.
- MVP: egy chip — Háztartási. [[Események]] / [[Élet tervek]] chip **nincs**, amíg a specjük nem `Kész`.
- Minden chip ki → üres rács és üres napi listák (a chipek maradnak, vissza lehet kapcsolni).
- A szűrő a hónap és a napi listán **ugyanaz**; a napi képernyőn is látszanak / állíthatók.
- Nyitáskor a chipek újra mind be (nincs device-local szűrő-memória).
- Badge és lista a szűrő után számol.

#### Create / üres tap

Nincs `+` gomb, nincs long-press create. Üres nap = napi lista üres állapottal. Új háztartási feladat: [[Háztartási feladatok]] feature. Esemény: későbbi spec.

#### Értesítések

A naptár **nem** ütemez értesítést. Háztartási digest: [[Értesítések]] `HOUSEHOLD_TASK_DUE` (09:00, élő `nextDue`, nem a 10 előfordulás). Értesítés tap → háztartási lista Lejárt+Ma, **nem** a naptár.

### UI/UX elvárások

- **Belépés:** [[Tennivalók]] hub → Naptár csempe.
- Feature flag: **saját** Naptár flag ([[Life Management 2.0]]). Ki → a hub csempe rejtve; a [[Háztartási feladatok]] ettől függetlenül megy (a [[Tennivalók]] flagje).
- Hónap rács + napi lista, fentiek szerint.
- Chipek a rács tetején (és a napi listán).
- Kontraszt: badge / overdue / ma kiemelés dark és light témában — [[Dark&Light mode]].
- Nincs kereső.

### Megjegyzések

A Feladatok tab IA (három csempe) a [[Tennivalók]] speché. Timed esemény-sáv és naptárból create az [[Események]] készültekor nyitható újra.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: `CalendarMonthPage`, `CalendarDayPage`. Route pl. `/tabs/tasks/calendar`, `/tabs/tasks/calendar/:date` (`YYYY-MM-DD`).
- `CalendarOccurrence` mapper: élő producerek → DTO tömb; szűrő; naponkénti groupBy a badge-hez.
- Háztartási vetítés **nem** másolódik ide — import a [[Háztartási feladatok]] utility-jéből.
- Pipálás / open: háztartási store + ugyanaz a `PUT` / szerkesztő route, mint a feladatlistán.
- Dátumok: kliens TZ naptári nap; `ma` íráskor / renderkor a készülék napja.
- i18n hónap / nap / Ma / chipek / üres szövegek: [[Nyelv választás]].

#### Backend-offline

- Olvasás a producer helyi store-jából Backend-offline és Full-offline esetén is.
- A naptárnak **nincs** saját mutációja → **nincs** outbox ebben a spechen.
- Pipálás / szerkesztés: a producer outboxa (`OfflineQueueService`) — [[Háztartási feladatok]], [[Szinkronizációs központ]].
- Nincs homokóra: a vetítés pure TS. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (producer API: [[Háztartási feladatok]]; később [[Események]] / [[Élet tervek]])

### Nyitott kérdések

Nincs nyitott kérdés.
