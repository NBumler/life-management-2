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

**Nem scope (MVP):** nap / hét rács; év nézet; hét számok; húzással átütemezés; kereső; naptárból create; hónap-rácson időzített sáv (az idő a napi listán); Google Calendar; utolsó nézett hónap / szűrő megjegyzése eszközön; lead-time értesítés a naptár előfordulásairól (háztartási digest / esemény: [[Értesítések]]).

### Funkcionális leírás

#### Szerep

A naptár **fogyasztó**. Az előfordulásokat a producer specek számolják (háztartás: [[Háztartási feladatok]]; esemény: [[Események]]). Itt nincs occurrence-tábla, nincs saját OpenAPI.

#### Producer registry

Chip és előfordulás csak **élő** producerből: a forrás-spec `Kész`, a feature flagje be van kapcsolva, **és** a spec producer-szerződést ír (`MVP` = Igen). A spec `Kész` **önmagában nem** elég (lásd [[Élet tervek]]).

| `source` | Spec | MVP |
|---|---|---|
| `HOUSEHOLD_TASK` | [[Háztartási feladatok]] | Igen |
| `EVENT` | [[Események]] | Igen (saját Események flag is kell) |
| `LIFE_PLAN` | [[Élet tervek]] | Nem (spec `Kész`; lista-only, nincs emit / chip) |

Új producer: a saját specje leírja a vetítést **és** ez a tábla `Igen`-re vált; a naptár chipje akkor lép be. A naptár specet a fogyasztói szerződés (DTO / nézet) változásakor is bántani kell.

#### Előfordulás DTO (fogyasztói szerződés)

Kliensoldali, nem persistált. Egyedi kulcs: `source` + `sourceEntityId` + `date`.

| Mező | Típus / szabály |
|---|---|
| `source` | Enum (fenti registry) |
| `sourceEntityId` | UUID a producer entitásra (háztartás: `taskId`; esemény: `CalendarEvent.id`) |
| `date` | `YYYY-MM-DD`, kliens naptári nap |
| `allDay` | Háztartás: mindig `true`. Esemény: a sorozat `allDay` mezője. |
| `startTime` / `endTime` | `HH:mm`; csak `allDay = false` (esemény). Háztartás: nincs. |
| `title` | Kötelező (háztartás: feladat `name`; esemény: `title`) |
| `subtitle` | Opcionális (háztartás: helyiség `name`; esemény: `location`) |
| `completable` | Háztartás: `true`; esemény: `false` |
| `overdue` | Háztartás: `date < ma`. Esemény: mindig `false` (nem pipálható, a napján marad). |
| `energyLevel` / `estimatedMinutes` | Háztartás: a lista-sorhoz; más producer elhagyhatja |

Háztartási emit + sapkák: **SSOT** [[Háztartási feladatok]]. Esemény-vetítés (ma±1 év, ritmus, nincs darabszám-sapka): **SSOT** [[Események]]. A naptár nem vetít újra.

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
- Múltbeli nap **figyelmeztető szín** csak ha a szűrt előfordulások között van `overdue = true` (háztartási lejárt `nextDue`). Csak múltbeli esemény → **nem** figyelmeztető (neutrális + badge). Ma: külön kiemelés. Jövő: neutrális + badge.
- Napra tap (üres is) → napi lista. Nincs kijelölés-állapot a rácson tap előtt; visszaérkezéskor az a nap, ahonnan jöttünk, legyen kiemelve (ne resetelődjön mára, kivéve Ma gomb).

#### Napi lista

- Cím: a nap dátuma (i18n). Előző / következő nap chevron; **Ma** → mai napi lista.
- Vissza → a hónap rács, ahonnan nyitottuk, azzal a nappal kiemelve.
- Sor: **pipa** csak ha `completable`; tap a sorra → producer szerkesztő. Háztartás: feladat create/edit + pipálás = `PUT` (`nextDue`, `lastCompletedAt`) — [[Háztartási feladatok]]. Esemény: **nincs pipa**; tap → sorozat szerkesztő ([[Események]] / [[Új esemény hozzáadása]]). Nincs undo; pipára nincs külön confirm.
- Háztartási sor: cím, alcím (helyiség), energia, perc; `overdue` → figyelmeztető szín + lemaradás (`ma − date` nap).
- Esemény sor: cím; időzítettnél `startTime–endTime`; egész naposnál i18n „egész nap”; alcím = helyszín.
- Sorrend a napon: **egész napos** (`allDay`) elöl — háztartás, majd esemény, azon belül helyiség `sortOrder` / `title` — utána időzítettek `startTime`, majd `title`.
- Producer store változás után a **badge és a lista azonnal** újraszámolódik. Háztartás pipálás: lekerül erről a napról, új `nextDue` a jövőben ([[Háztartási feladatok]]). Esemény marad a napján.
- Üres nap: szöveg („nincs tétel”), **nincs CTA** (nincs create).
- Szűrt üres (chip ki) ≠ „nincs naptárad”: „nincs találat” / forrás kikapcsolva, nincs create CTA.

#### Forrás-szűrő (chipek)

- Multi-select, **VAGY** (unió). Alap: minden **élő** chip be.
- Élő chipek: Háztartási; **Események** ha a spec `Kész` és az Események flag be. [[Élet tervek]] chip **nincs** (nem producer; opcionális `targetDate` csak a terv-listán).
- Minden chip ki → üres rács és üres napi listák (a chipek maradnak, vissza lehet kapcsolni).
- A szűrő a hónap és a napi listán **ugyanaz**; a napi képernyőn is látszanak / állíthatók.
- Nyitáskor a chipek újra mind be (nincs device-local szűrő-memória).
- Badge és lista a szűrő után számol.

#### Create / üres tap

Nincs `+` gomb, nincs long-press create. Üres nap = napi lista üres állapottal. Új háztartási feladat: [[Háztartási feladatok]]. Új esemény: [[Események]] lista / űrlap (nem a naptárból).

#### Értesítések

A naptár **nem** ütemez értesítést. Háztartási digest: [[Értesítések]] `HOUSEHOLD_TASK_DUE`. Esemény: `EVENT_OCCURRENCE` ([[Események]]). Háztartási tap → lista Lejárt+Ma; esemény tap → esemény szerkesztő — **nem** a naptár.

### UI/UX elvárások

- **Belépés:** [[Tennivalók]] hub → Naptár csempe.
- Feature flag: **saját** Naptár flag ([[Life Management 2.0]]). Ki → a hub csempe rejtve; a [[Háztartási feladatok]] ettől függetlenül megy (a [[Tennivalók]] flagje).
- Hónap rács + napi lista, fentiek szerint.
- Chipek a rács tetején (és a napi listán).
- Kontraszt: badge / overdue / ma kiemelés dark és light témában — [[Dark&Light mode]].
- Nincs kereső.

### Megjegyzések

A Feladatok tab IA (négy csempe) a [[Tennivalók]] speché. Timed sáv a hónap rácson és naptárból create továbbra sincs.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: `CalendarMonthPage`, `CalendarDayPage`. Route pl. `/tabs/tasks/calendar`, `/tabs/tasks/calendar/:date` (`YYYY-MM-DD`).
- `CalendarOccurrence` mapper: élő producerek → DTO tömb; szűrő; naponkénti groupBy a badge-hez.
- Producer vetítés **nem** másolódik ide — import: [[Háztartási feladatok]], [[Események]].
- Pipálás / open: a producer store + route (háztartás `PUT`; esemény szerkesztő, nincs complete).
- Dátumok: kliens TZ naptári nap; `ma` íráskor / renderkor a készülék napja.
- i18n hónap / nap / Ma / chipek / üres szövegek: [[Nyelv választás]].

#### Backend-offline

- Olvasás a producer helyi store-jából Backend-offline és Full-offline esetén is.
- A naptárnak **nincs** saját mutációja → **nincs** outbox ebben a spechen.
- Pipálás / szerkesztés: a producer outboxa (`OfflineQueueService`) — [[Háztartási feladatok]], [[Események]], [[Szinkronizációs központ]].
- Nincs homokóra: a vetítés pure TS. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (producer API: [[Háztartási feladatok]], [[Események]]. [[Élet tervek]] nem producer.)

### Nyitott kérdések

Nincs nyitott kérdés.
