---
verifikalva: 2026-10-17
verifikalt_commit: f5e98c3
---

# Röplabda napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Úszás napló]], [[Kezdőlap]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

(Terem)röplabda-alkalmak naplózása az [[Edzés]] tab „Röplabda” szegmensében (`edzes.roplabda` flag). Egy naplóbejegyzés = egy alkalom. A nap `activityExtraKcal` hozzájárulása **egyetlen fix, szándékosan alulbecslő nettó MET-tel** számolódik, kizárólag a **pályán töltött időből**. Az intenzitás, a szettszám és a megjegyzés **csak napló / statisztika** — a kalóriát nem befolyásolják.

### Funkcionális leírás

#### Entitás — `VolleyballLog`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja létrehozáskor |
| `date` | Naptári dátum (kliens TZ); aznapi `activityExtraKcal` összegzéshez. Start/end időpont **nincs**. |
| `durationMinutes` | Kötelező; egész, **1–240**. **Pályán töltött idő** — a kispadon / várakozással töltött idő nem számít. |
| `intensity` | Opcionális enum: `LIGHT` / `MODERATE` / `HARD` — **csak statisztika** |
| `setsPlayed` | Opcionális; egész, `> 0` — csak statisztika |
| `notes` | Opcionális szöveg |
| `deleted` | Soft delete (`false` default) |
| `createdAt` / `updatedAt` | Audit |

CRUD: lista (`deleted = false`), létrehozás, szerkesztés, törlés (soft delete).

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

\[\text{kcal} = 2.0 \times m \times \frac{\min(\text{durationMinutes},\,240)}{60}\]

- `VOLLEYBALL_NET_MET = 2.0` **nettó** MET (bruttó 3.0 − a nyugalmi 1 MET, amit a `maintenanceKcal = BMR × 1.2` már fedez).
- \(m\): aktuális testsúly kg a [[Profile]]-ból — **nem** fagyasztódik a naplóba.
- Az `intensity` **nem** bemenet: 75 kg × 90 perc = **225 kcal**, bármilyen intenzitással vagy anélkül.
- 240 perces plafon: a backend és az űrlap elutasítja a nagyobb értéket, a kliens számítás pedig clampel.

### UI/UX elvárások

- Belépés: [[Edzés]] tab → „Röplabda” szegmens.
- **Lista:** időrend (újabb elöl); soron: dátum, opcionális intenzitás + szettszám, pályán töltött idő, kcal.
- **Új / szerkesztés:** dátum, pályán töltött idő (kötelező, súgó: „csak a pályán töltött idő számít”), opcionális intenzitás („Nincs megadva” alapértelmezés; alatta: „Csak statisztika — a kalóriát nem befolyásolja”), szettszám, megjegyzés; élő kcal előnézet „Óvatos becslés — kemény meccsen a valós érték magasabb lehet” felirattal. 240 perc felett hibaüzenet, a mentés blokkolva.
- **Törlés:** megerősítés, soft delete; szinkronizálatlan helyi only → hard remove + outbox tisztítás. Lásd [[Backend-offline first]].
- [[Kezdőlap]] „Mai edzések” widget: „Röplabda” sor (`basketball-outline` ikon — az ionicons-ban nincs röplabda).

### Megjegyzések

#### Tudatos korlát

**A kalória szándékosan alulbecsül, és nem pontos.** Kutatási háttér (backlog/163):

- 2024 Adult Compendium of Physical Activities: nem versenyszerű röplabda 3.0, versenyszerű (terem) 6.0, strand 8.0 MET — 2–2,7× szórás.
- Time-motion vizsgálatok: a labda az idő csak ~17–29%-ában van játékban, labdamenet ~6–8 s. A valós égetést a labdamenetek száma/hossza (≈ az ellenfél szintje) dönti el, amit az időtartam nem mutat.
- Mért mérkőzésérték ~5–6,7 kcal/perc (≈4,5–5,5 bruttó MET); szakaszos sportban a pulzus- és mozgásalapú becslés is gyenge.

Ezért egyetlen fix érték van a Compendium **legalacsonyabb** röplabda-értékén: így egy rossz önértékelés sem tud felülbecslést okozni, kemény meccsen viszont akár ~2,5× alulbecslés is lehet. Strandröplabda nincs.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: lista (`pages/workout/volleyball/volleyball-log-list.page`), create/edit form (`volleyball-log-edit.page`), delete confirm.
- `volleyball-metrics.ts`: `VOLLEYBALL_NET_MET`, `VOLLEYBALL_MAX_DURATION_MINUTES`, `volleyballKcal()`; napi összeg: `core/data/activity-kcal.ts` `volleyballKcalForDay()` → Étkezés dashboard, Kezdőlap, kalória-túllépés értesítés.
- `core/data/volleyball-log.repository.ts`; route `/tabs/workout/volleyball` (`featureFlagGuard('edzes.roplabda')`).

#### Backend-offline

- Olvasás / írás helyi SQLite-ból (`volleyball_log`, `SCHEMA_V50`) Backend-offline és Full-offline esetén is.
- Create / update / delete → outbox (`OfflineQueueService`, `entityType: 'VolleyballLog'`) + kliens UUID; delta pull és Fix/Drop: [[Szinkronizációs központ]].
- Kcal: mindig kliensoldali pure számítás; nincs kcal mező az entitáson.
- Web build: online-only, közvetlen API hívás.
- Lásd [[Backend-offline first]].

### Backend

- `hu.bumler.lm2.workout.VolleyballLog*`; OpenAPI CRUD `/api/volleyball-logs` (`POST` idempotens upsert, `GET`/`PUT`/`DELETE` `/{id}`).
- `V55__volleyball_log.sql`: tábla + `sync_changes` view (`VolleyballLog`).
- Validáció: `durationMinutes` 1–240 (generált bean validation + service), `intensity` enum vagy null, `setsPlayed > 0`.
- Soft delete; listák `deleted = false`; idegen user sora `404`.
- Nincs szerveroldali kcal mező.

### Nyitott kérdések

Nincs nyitott kérdés.
