---
id: 167
type: feature
status: ready
title: Nyújtó gyakorlatok — külön adatmodell, típusválasztás és többes chip-szűrő a katalógusban
specs:
  - "[[Gyakorlat]]"
  - "[[Edzés]]"
  - "[[Frontend]]"
flag: edzes.nyujtas
created: 2026-10-17
closed:
---

# 167 — Nyújtó gyakorlatok — külön adatmodell, típusválasztás és többes chip-szűrő a katalógusban

> Sorozat: **167** (katalógus) → [[168-nyujto-sablonok]] → [[169-nyujto-session-vezetett-idozito-es-naplo]]
> → [[170-eroesito-sablonhoz-csatolt-nyujtas]].

## Motiváció / probléma

Az [[Edzés]] feature ma csak terhelő / erősítő gyakorlatokat ismer. Nyújtásra külön gyakorlattípus
kell. Az erősítő gyakorlat űrlapjának több mezője (`kind` → szett-mezők, `defaultRestTimeSeconds`) a
nyújtásnál értelmetlen. A naplóbejegyzések ráadásul snapshotolják a `kind`-ot, és arra épül a szett-UI.
Ezért a nyújtás **saját adatmodellt** kap; az `Exercise` nem kap nullable mezőket.

## Jelenlegi működés

[[Gyakorlat]]: egyetlen `Exercise` entitás (`exercise_catalog`): `name`, `category`
(`ExerciseCategory`, 11 érték), `kind`, `defaultRestTimeSeconds`, `isFavorite`, `equipment`,
`description`. Katalógus lista (`pages/workout/exercises/exercise-list.page.ts`): kereső,
**egyszerre egy** kategória-chip (`categoryFilter` signal, újratapra törlődik), Kedvencek chip.

## Elfogadási kritériumok

- [ ] Új, user-owned entitás: **`StretchExercise`** — `id` (kliens UUID), `name` (kötelező, egyedi a
      user élő nyújtó gyakorlatai között — [[Névegyediség]], `name_normalized` partial unique index),
      `category` (kötelező, közös `ExerciseCategory`), `description` (opcionális, max. 1000 karakter),
      `equipment` (opcionális), `isFavorite` (default `false`), `defaultHoldSeconds` (kötelező
      egész > 0, alapból 30), `defaultPerSide` (boolean, alapból `false`), `deleted` / `deleted_at`,
      audit. A két `default*` mező csak előtöltés: a [[168-nyujto-sablonok]] sablon-tételébe
      felvételkor másolódik, utólagos módosításuk a meglévő sablon-tételeket nem írja át.
      Backend: Flyway tábla `stretch_exercise`, OpenAPI CRUD + `GET /api/sync/changes` delta,
      `*SyncDataLoader`. Frontend: helyi SQLite séma (új `SCHEMA_Vn`), repository, outbox.
- [ ] A névegyediség **típusonként külön** névtér: lehet „Hát” nevű erősítő és nyújtó gyakorlat is.
- [ ] **`ExerciseCategory` bővítés** két új értékkel: `HIPS` (Csípő / farizom) és `NECK` (Nyak). Mindkét
      típus használhatja. Backend CHECK constraint-ek (`exercise_catalog`, `workout_exercise_entry`,
      `workout_plan_exercise` snapshot, új `stretch_exercise`), OpenAPI enum, i18n címkék.
      Meglévő sorokat nem módosít (bővítés, nem felbontás).
- [ ] **Meglévő gyakorlatok = erősítő:** a meglévő `exercise_catalog` sorok adatmigráció nélkül
      erősítőként jelennek meg (a tábla maga az erősítő katalógus). A UI-szövegekben az eddigi
      „Gyakorlat” helyett „Erősítő gyakorlat” / „Nyújtó gyakorlat” áll, ahol a típus számít.
- [ ] **Új gyakorlat felület:** első mezőként szegmens: **Erősítés** | **Nyújtás** (alapból
      Erősítés). Nyújtásnál csak a nyújtó mezők látszanak: Név, Kategória, Leírás / megjegyzés,
      Eszközigény, Kedvenc, valamint **Alap tartás (mp)** és **Oldalanként** kapcsoló (segédszöveg:
      „Sablonba felvételkor ezzel töltődik elő.”). Szerkesztésnél a típus **nem** váltható (két külön entitás); a szegmens
      ilyenkor csak megjelenik, nem állítható.
- [ ] **Katalógus lista** egyben mutatja a két típust (név szerint rendezve). A soron a típus jelölése:
      erősítőnél a mai „kategória · kind”, nyújtónál „kategória · Nyújtás”. A kereső a nyújtó
      gyakorlatoknál is a névre, eszközigényre és leírásra illeszt.
- [ ] **Többes chip-szűrő:** új chip-csoport **Erősítés** / **Nyújtás**. A kategória-chipek
      **többszörösen** kiválaszthatók.
      Szabály: csoporton belül **VAGY**, a csoportok (típus, kategória, Kedvencek) között **ÉS**.
      Példák: „Hát + Nyújtás” = hát kategóriás nyújtások; „Hát + Mell” = hát vagy mell, mindkét
      típusból; semmi kijelölve = minden. A szűrési logika tiszta, unit-tesztelt függvény.
- [ ] A meglévő erősítő pickerek (Edzésnapló, sablon-szerkesztő) továbbra is **csak erősítő**
      gyakorlatot kínálnak. A nyújtó picker a [[168-nyujto-sablonok]] része.
- [ ] Törlés: soft delete megerősítéssel; soha nem szinkronizált draft → helyi hard remove + outbox
      purge (mint az `Exercise`).
- [ ] Feature flag **`edzes.nyujtas`** (`features.json`, alapból `true`). Kikapcsolva rejtve marad: a
      típus-szegmens, a Nyújtás chip és a nyújtó sorok; a route-ok guardoltak.
- [ ] Seed: nincs kötelező nyújtó seed. Opcionálisan néhány alap nyújtás (determinisztikus v5 UUID:
      `StretchExercise:<userId>:<normalizedName>`) — implementáláskor dönthető.
- [ ] Specek: [[Gyakorlat]] (új „Nyújtó gyakorlat” entitás + szűrő), [[Edzés]], [[Frontend]]
      flag registry; `#### Backend-offline` frissítve. `verify:outbox` snapshot + payload verzió, ha
      kell.

## Terv / döntési napló

- 2026-10-17 — **Külön entitás**, nem `Exercise.type` diszkriminátor. Az `Exercise` `kind`-ja kötelező,
  a napló- és sablon-snapshot erre épít; nullable mezőkkel a szett-UI-t és a CHECK-eket mindenhol
  típusra kellene ágaztatni. Külön táblával a „meglévők erősítőként” migráció adatmódosítás nélkül
  megvan, és a nyújtó gyakorlat technikailag sem kerülhet erősítő sablonba. (Felhasználói igény:
  „új adat model”.)
- 2026-10-17 — Közös `ExerciseCategory` + `HIPS` / `NECK`, hogy a „Hát + Nyújtás” chip-kombináció
  egységesen működjön. (Felhasználói döntés.)
- 2026-10-17 — A seedben lévő „Tricepsz nyújtás” valójában kábeles tricepsz-gyakorlat (`WEIGHTED_REPS`),
  nem nyújtás; erősítőként marad.
- 2026-10-17 — A nyújtó gyakorlat kap `defaultHoldSeconds` + `defaultPerSide` mezőt, hogy a
  [[168-nyujto-sablonok]] tétele előtöltődjön. Az „oldalanként” jelleg a nyújtás sajátja (pl. combhajlító
  nyújtás). A sablon-tétel saját értéket tárol (másolat, nem élő hivatkozás), így sablononként
  felülírható. (Felhasználói döntés.)

### Implementációs terv (2026-10-17)

Verziószámok a mostani állapot szerint (a commit előtt újra ellenőrizni — párhuzamos munka):
Flyway `V57`, helyi `SCHEMA_V52`, outbox payload `v22`.

1. **Flyway `V57__stretch_exercise.sql`**
   - `stretch_exercise` tábla: `id`, `user_id`, `name`, `name_normalized`, `category` (CHECK, 13
     érték), `description` (CHECK ≤ 1000), `equipment`, `is_favorite`,
     `default_hold_seconds integer NOT NULL DEFAULT 30 CHECK (> 0)`,
     `default_per_side boolean NOT NULL DEFAULT false`, `deleted` / `deleted_at`, audit.
   - Partial unique index `(user_id, name_normalized) WHERE deleted = false`,
     `(user_id, updated_at)` index, `set_updated_at` trigger.
   - `HIPS` / `NECK`: a `V35` mintájára DROP + ADD a három meglévő category CHECK-en
     (`exercise_catalog`, `workout_exercise_entry`, `workout_plan_exercise`). UPDATE nincs.
   - `sync_changes` view teljes újradefiniálása a `V55` alapján, `+ 'StretchExercise'` sorral.
2. **OpenAPI**
   - Új sémák: `StretchExercise.yaml` és `StretchExerciseList.yaml`.
   - Új path-ok: `stretch-exercises.yaml` és `stretch-exercises-item.yaml`
     (`/api/stretch-exercises[/{id}]`), bekötve az `openapi.yaml`-ba.
   - `HIPS` / `NECK` az inline category enumokba: `Exercise.yaml`, `WorkoutExerciseEntry.yaml`,
     `WorkoutPlanExercise.yaml`. Inline marad (nem `$ref`), mert egy közös komponens a generált
     `Exercise.CategoryEnum` típusneveket mindenhol átírná.
3. **Backend Java** (`hu.bumler.lm2.workout`): `StretchExercise{Entity,Repository,Mapper,Service,
   Controller,SyncDataLoader}` az `Exercise*` 1:1 tükreként. Ugyanaz a névnormalizálás és
   `409 UNIQUE_VIOLATION` + `conflictingId`, POST-upsert, `PUT` törölt soron `409 ENTITY_DELETED`.
   Tesztek:
   - `StretchExerciseServiceTest`;
   - `StretchExerciseIntegrationTest`: CRUD, idempotens POST, élő-sor egyediség, külön névtér az
     `exercise_catalog`-tól, sync feed, idegen sor 404;
   - `ExerciseIntegrationTest`: `HIPS` / `NECK` elfogadva.
4. **Frontend adatréteg**
   - `npm run gen:api`.
   - `local-database.service.ts` `SCHEMA_V52`: `stretch_exercise` tábla (a helyi `exercise_catalog`
     tükre, + `default_hold_seconds`, `default_per_side`).
   - `core/data/local-rows.ts`: `StretchExerciseRow`, `stretchExerciseRowToDto`,
     `stretchExerciseLocalWriteTask`, `stretchExerciseServerApplyTask`.
   - `StorageBackend`: `listStretchExercises` / `upsertStretchExercise` / `deleteStretchExercise`;
     SQLite és HTTP implementáció a `VolleyballLog` mintájára (never-synced draft → hard remove).
   - `sync-engine.service.ts`: `buildServerApplyTasks`, `applyTombstone`, `buildApplyTasks`,
     `refetchNeeded` ágak.
   - `outbox-entity-registry.ts`: bejegyzés + név-ütközés Fix ág (mint az `Exercise`-nél).
   - `offline-queue.service.ts` v21 → **v22** identity (új entitás + enum-bővítés), változásnapló
     sor. `npm run verify:outbox -- --write`.
   - `core/data/stretch-exercise.repository.ts`: signal-os `items()`, `save`, `setFavorite`,
     `delete`, az `ExerciseRepository` tükre.
5. **Kategória-címkék**: `exercise-labels.ts` `EXERCISE_CATEGORIES` + `HIPS` / `NECK` label kulcs,
   `hu.json` / `en.json`. A két generált enum-típus (`Exercise.CategoryEnum`,
   `StretchExercise.CategoryEnum`) azonos literál-unió, ezért egy közös
   `type ExerciseCategory = Exercise.CategoryEnum` alias elég.
6. **Flag**
   - `feature-flags.service.ts`: `'edzes.nyujtas'` a unióba, a listába, és szülőnek `tab.edzes`.
   - `assets/config/features.json`: `"edzes.nyujtas": true`.
7. **Szűrő-logika (pure):** `pages/workout/exercises/catalog-filter.ts`.
   - `CatalogEntry = { type: 'STRENGTH'; exercise } | { type: 'STRETCH'; stretch }`.
   - `filterCatalog(entries, { types: ReadonlySet, categories: ReadonlySet, favoritesOnly, query })`:
     csoporton belül VAGY, csoportok között ÉS, üres halmaz = nincs szűrés.
   - A [[168-nyujto-sablonok]] sablonlistája és nyújtó pickere is ezt használja.
8. **Katalógus lista** (`exercise-list.page.ts/.html`)
   - Szűrő-állapot: `typeFilter` és `categoryFilter` → `signal<Set<…>>`; a toggle kivesz vagy
     hozzáad.
   - A két repository összefésülve, `byCatalogName` sorrendben.
   - Típus-chipek csak `edzes.nyujtas` mellett.
   - A sor alcíme típus szerint; tap → `exercises/:id` vagy `exercises/stretch/:id`.
   - A kedvenc-csillag a megfelelő repositoryt hívja.
9. **Szerkesztő**
   - Új `pages/workout/exercises/stretch-exercise-edit.page.ts`, a mezők a jegy szerint.
   - Route-ok: `exercises/stretch/new` és `exercises/stretch/:id`, `featureFlagGuard('edzes.nyujtas')`.
   - Létrehozáskor mindkét szerkesztő tetején Erősítés / Nyújtás szegmens; váltáskor
     `navigateForward(..., { replaceUrl: true })` a másik `new` route-ra. A szegmens az első mező,
     így gépelt adat még nem vész el.
   - Szerkesztéskor a szegmens nem jelenik meg.
10. **Tesztek**:
    - `catalog-filter.spec.ts`: VAGY / ÉS, üres halmazok, kereső a leírásra / eszközre;
    - `stretch-exercise.repository.spec.ts`;
    - `exercise-list.page.spec.ts`: többes chip, típus-chip flag nélkül rejtve;
    - `stretch-exercise-edit.page.spec.ts`;
    - local-rows, registry és sync-engine apply specek.
11. **Lezárás**:
    - zöld gate: `./gradlew test`, `test:ci`, `lint`, `build`, `verify:outbox`;
    - [[Gyakorlat]]: új „Entitás — `StretchExercise`” szakasz, enum + `HIPS` / `NECK`, lista UI,
      Backend-offline, Backend;
    - [[Edzés]] és [[Frontend]] flag registry;
    - `IMPLEMENTATION_STATUS.md`, archiválás.

## Lezáráskor (on-done)

- Frissített specek: [[Gyakorlat]] — …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #167 nyújtó gyakorlatok
- Kód: `workout` (backend), `pages/workout/exercises/`, local schema, outbox
