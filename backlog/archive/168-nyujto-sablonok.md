---
id: 168
type: feature
status: done
title: Nyújtó sablonok — StretchPlan, aktív/inaktív, rotáción kívül, heti „Nyújtás” felülírás
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag: edzes.nyujtas
created: 2026-10-17
closed: 2026-10-17
---

# 168 — Nyújtó sablonok — StretchPlan, aktív/inaktív, rotáción kívül, heti „Nyújtás” felülírás

> Függ: [[167-nyujto-gyakorlat-katalogus]]. Követi: [[169-nyujto-session-vezetett-idozito-es-naplo]],
> [[170-eroesito-sablonhoz-csatolt-nyujtas]].

## Motiváció / probléma

Nyújtó rutinokat ugyanúgy sablonként akarok tárolni, mint az erősítőket, és ugyanúgy aktiválni /
deaktiválni. A nyújtó nap **nem terhelő nap**, ezért a 2/3-as blokk-rotációba nem számít bele. Kézzel
viszont bármelyik napra kiválasztható.

## Jelenlegi működés

[[Heti terv]]: egyetlen sablontípus, a `WorkoutPlan` (gyakorlatok + cél-szettek, `active`,
`inRotation`, `goalLabel`). A rotációs előrejelzés (`training-forecast.ts`) az aktív, rotációban lévő
sablonokból választ. A heti kézi felülírás (`WeeklyPlanSlot.kind` = `PLAN` | `REST`) `plan_id`-je
FK a `workout_plan`-ra.

## Elfogadási kritériumok

- [x] **Meglévő sablonok = erősítő sablonok:** adatmigráció nélkül; a `workout_plan` tábla az erősítő
      sablonok tábla. UI: „Erősítő sablon” / „Nyújtó sablon”.
- [x] Új, user-owned entitás **`StretchPlan`**: `id`, `name` (kötelező; **nem** egyedi, mint a
      `WorkoutPlan`-nál), `notes`, `active` (default `true`), `goalLabel` (opcionális, mint a
      `WorkoutPlan`-nál), `deleted`, audit. Nincs `inRotation`, mert a nyújtó sablon soha nem rotál.
- [x] Nested gyerek **`StretchPlanItem`**: `id`, `stretchExerciseId` → [[Gyakorlat]] `StretchExercise`,
      snapshot `stretchName` / `stretchCategory` (mint a `WorkoutPlanExercise`), `orderIndex`,
      `holdSeconds` (kötelező, > 0; felvételkor a gyakorlat `defaultHoldSeconds`-ából), `perSide`
      (boolean; `true` → bal, majd jobb oldal; felvételkor a gyakorlat `defaultPerSide`-jából),
      `repetitions` (kötelező, ≥ 1; alapból 1), `notes` (opcionális, max. 200).
      Mentés: **nested aggregate PUT** (`NestedChildResolver`; kliens tükör a
      `sqlite-storage-backend.ts`-ben, egy tranzakció + egy outbox elem).
- [x] Sablon-szerkesztő a nyújtó típushoz: név, megjegyzés, címke; rendezhető tétellista; nyújtó
      gyakorlat **picker** (kereső, kategória-chipek, Kedvencek, csak nyújtó gyakorlatok). A tétel
      sorában: tartás (mp), oldalanként kapcsoló, ismétlés, megjegyzés. Számított teljes időtartam
      előnézet: `Σ holdSeconds × repetitions × (perSide ? 2 : 1)`.
- [x] **Sablon lista:** típus-szűrő chipek (**Erősítés** / **Nyújtás**, többes kiválasztás, mint a
      [[167-nyujto-gyakorlat-katalogus]] katalógusánál) a meglévő Aktív / Inaktív / Mind szűrő
      mellett. Soronkénti aktív kapcsoló a nyújtó sablonon is. A `goalLabel` csoport-műveletek
      (`backlog/140`) mindkét típusra hatnak.
- [x] Új sablon létrehozásakor először a típust kell választani (Erősítés / Nyújtás).
- [x] **Rotáció:** a nyújtó sablon **soha** nem kerül a rotációs előrejelzésbe, a blokklimitbe, a
      terhelés-figyelmeztetésekbe és az ujjterhelés-számításba.
- [x] **Heti kézi felülírás:** új slot-kind **`STRETCH`** (új nullable `stretch_plan_id` FK →
      `stretch_plan`; CHECK: `STRETCH` ↔ `stretch_plan_id` nem null és `plan_id` null). A felülíró
      action sheetben az aktív nyújtó sablonok is szerepelnek (pl. „Nyújtás · <név>”).
      A `STRETCH` nap az előrejelzésben **pihenőnap** (a blokk lezárul, a rotáció nem lép). A chipen
      „Nyújtás: <sablon> · kézi” látszik.
- [x] Soft delete megerősítéssel (+ tételek cascade). A törölt nyújtó sablonra mutató `STRETCH`
      felülírást az előrejelzés figyelmen kívül hagyja (a nap automatikus).
- [x] Helyi SQLite séma (`SCHEMA_Vn`), outbox payload verzió + migrációs lépés (`WeeklyPlan` slot
      `stretchPlanId: null` default), `verify:outbox` snapshot.
- [x] Specek: [[Heti terv]] (két sablontípus, `STRETCH` slot, rotációs szabály), [[Edzésnapló]]
      ahol a „Terv indítása…” hivatkozik; `#### Backend-offline`.

## Terv / döntési napló

- 2026-10-17 — **Külön `StretchPlan` entitás**, nem `WorkoutPlan.type`: a cél-szett modell (`setType`,
  `reps`, `weightKg`, RPE, bemelegítés-generálás) a nyújtásnál értelmetlen, a tétel-mezők (tartás,
  oldalanként, ismétlés) pedig erősítésnél.
- 2026-10-17 — A nyújtó nap pihenőnapnak számít. Ez illeszkedik a [[Heti terv]] terhelés-szabályához:
  az úszás és a bicikli sem töri meg a pihenőnapot. (Felhasználói igény.)
- 2026-10-17 — Külön `stretch_plan_id` oszlop, mert a `weekly_plan_slot.plan_id` FK a `workout_plan`-ra
  mutat (`V19`).

- 2026-10-17 — A `StretchPlan.name` **nem egyedi** (a jegy első változatától eltérően). A `WorkoutPlan`
  neve sem az (`outbox-entity-registry.ts`), és az egyediség csak egy 409 / Fix utat hozna,
  haszon nélkül.
- 2026-10-17 — Nyújtó picker: csak meglévő nyújtó gyakorlatot választ, ad-hoc létrehozás nincs (az a
  katalógusban van). Így a sablon-tétel `stretchExerciseId`-je mindig kitöltött.

### Implementációs terv (2026-10-17)

Várható verziók (commit előtt újraellenőrizni): Flyway `V58`, `SCHEMA_V53`, outbox `v23`.

1. **Flyway `V58__stretch_plan.sql`**
   - `stretch_plan` tábla: `id`, `user_id`, `name`, `notes`, `active boolean NOT NULL DEFAULT true`,
     `goal_label`, `deleted`, audit; `(user_id, updated_at)` index, trigger.
   - `stretch_plan_item` tábla: `plan_id` FK, `stretch_exercise_id` FK, `stretch_name`,
     `stretch_category` (CHECK, 13 érték), `order_index`, `hold_seconds CHECK (> 0)`, `per_side`,
     `repetitions CHECK (≥ 1)`, `notes CHECK (≤ 200)`, `deleted`, audit. `user_id` nincs, a
     tulajdon a szülőn át jön (mint a `workout_plan_exercise`-nél).
   - `weekly_plan_slot`:
     - `ADD COLUMN stretch_plan_id uuid REFERENCES stretch_plan (id)`;
     - `kind` CHECK + `STRETCH`;
     - a `V52` PLAN ↔ `plan_id` CHECK cseréje háromágúra: `PLAN` → csak `plan_id`; `REST` → egyik
       sem; `STRETCH` → csak `stretch_plan_id`.
   - `sync_changes` view + `StretchPlan` és `StretchPlanItem` (join a szülőn).
2. **OpenAPI**
   - `StretchPlan.yaml` (nested `items`), `StretchPlanItem.yaml`, `StretchPlanList.yaml`.
   - Path-ok: `/api/stretch-plans[/{id}]` (nested PUT).
   - `WeeklyPlanSlot.yaml`: `kind` enum + `STRETCH`, nullable `stretchPlanId`.
3. **Backend Java**
   - `StretchPlan{Entity,Repository,Mapper,Service,Controller,SyncDataLoader}` és
     `StretchPlanItem{Entity,Repository,Mapper,SyncDataLoader}`.
   - `StretchPlanService.saveTree`: `NestedChildResolver`, a `WorkoutPlanService` mintája.
     `DELETE` → soft delete, cascade a tételekre.
   - `WeeklyPlanService`: `STRETCH` slotnál a `stretchPlanId` kötelező (különben 400
     `VALIDATION`, field `stretchPlanId`), és saját nyújtó sablon kell (idegen → 404); a `planId`-t
     `null`-ra állítja. A `PLAN` / `REST` ág a `stretchPlanId`-t nullázza.
   - Tesztek:
     - `StretchPlanServiceTest` és `StretchPlanIntegrationTest`: tree create / update / child
       soft-delete / undelete, sync feed;
     - `WeeklyPlanIntegrationTest`: `STRETCH` slot validáció + CHECK.
4. **Frontend adatréteg**
   - `gen:api`.
   - `SCHEMA_V53`: `stretch_plan` és `stretch_plan_item` tábla,
     `ALTER TABLE weekly_plan_slot ADD COLUMN stretch_plan_id TEXT`.
   - `local-rows.ts`: sor-típusok és apply-taskok. A weekly slot row ↔ DTO kezeli a
     `stretchPlanId`-t.
   - `sqlite-storage-backend.ts` `saveStretchPlan()`: id-diff + egy `executeTransaction`, a
     `saveRecipe` / packing-template mintája.
   - HTTP backend; `sync-engine.service.ts` `stretchPlanApplyTasks` (a `workoutPlanApplyTasks`
     tükre) és a többi ág; registry.
   - outbox **v23** identity (új entitás; a `stretchPlanId` opcionális, hiánya = `null`).
     `verify:outbox -- --write`.
   - `core/data/stretch-plan.repository.ts` (`items()`, `activePlans()`, `save`, `setActive`,
     `delete`). `weekly-plan.repository.ts` slot-típus bővítés.
5. **Időtartam (pure):** `pages/workout/stretch/stretch-timing.ts`
   - `STRETCH_TRANSITION_SECONDS = 5`;
   - `stretchItemSeconds(item)` = `holdSeconds × repetitions × (perSide ? 2 : 1)`;
   - `stretchPlanDurationSeconds(items)`: Σ + átállások.
   - A 169 (idővonal) és a 170 (`~N perc`) is ezt használja.
6. **Nyújtó picker:** `shared/stretch-picker/stretch-picker.component.ts`
   - Az `exercise-picker` szerkezete (kereső, kategória-chipek, Kedvencek, `ion-modal-host-fill`).
   - A 167-es `filterCatalog`-ot használja, ad-hoc létrehozás nincs.
   - A tétel felvételkor a `defaultHoldSeconds` / `defaultPerSide` értékkel, `repetitions = 1`
     értékkel előtöltődik.
7. **Szerkesztő:** `pages/workout/plan/stretch-plan-edit.page.ts/.html`
   - Route-ok: `weekly-plan/plans/stretch/new`, `.../stretch/:id`, `featureFlagGuard('edzes.nyujtas')`.
   - Mezők: név, megjegyzés, `goalLabel`.
   - Tétellista: platformos reorder, mint a `plan-edit`; soronként tartás, oldalanként toggle,
     ismétlés, megjegyzés, eltávolítás.
   - Lábléc: „Összesen ~N perc”. Törlés megerősítéssel.
8. **Sablon lista** (`plan-list.page.ts`)
   - Összefésült, diszkriminált lista; típus-chipek a 167-es szűrő-mintával.
   - A soronkénti aktív kapcsoló a megfelelő repositoryra megy. Nyújtó sor alcíme: „N nyújtás · ~M perc”.
   - „Új sablon” → action sheet (Erősítő / Nyújtó); flag nélkül egyenesen az erősítő.
   - `plan-group-activation.ts`: a `planGroupActivationChanges` típusfüggetlen bemenetet kap
     (`{ id, goalLabel, active, type }`), a hívó a változásokat típus szerint menti. Teszt bővítés.
9. **Előrejelzés** (`training-forecast.ts`)
   - `DayOverride.kind` + `STRETCH` és `stretchPlanId`. Az `overridesByDate` tölti; törölt / ismeretlen
     nyújtó sablon → nincs felülírás (a forrásba bekerül a `stretchPlans`).
   - `trainingForecast` 1. lépés: `STRETCH` → `{ kind: 'REST', reason: 'OVERRIDE', stretchPlan }`.
     Ugyanúgy pihenő, mint a `REST` felülírás: lezárja a blokkot, a rotáció nem lép.
   - `ForecastDay` + opcionális `stretchPlan`. A `load-warnings.ts` `NO_REST_AHEAD` így automatikusan
     pihenőnek látja.
   - Tesztek: `training-forecast.spec.ts` (STRETCH nap pihenő, blokk újraindul, törölt nyújtó sablon
     → automatikus, rotáció nem lép).
10. **Heti nézet** (`weekly-plan.page.ts`)
    - `openOverride`: az aktív nyújtó sablonok `Nyújtás · <név>` gombként, a „Pihenőnap” előtt.
    - `OverrideChoice` + `{ kind: 'STRETCH', stretchPlanId }`; a `setOverride` az `others`
      leképezésben a `stretchPlanId`-t is megtartja.
    - Chip: „Nyújtás: <név> · kézi”.
11. **i18n, tesztek**:
    - `stretch-plan.repository.spec.ts`, `stretch-plan-edit.page.spec.ts`, `stretch-timing.spec.ts`,
      `plan-list.page.spec.ts`, `weekly-plan.page.spec.ts` (STRETCH override mentés);
    - local-rows, registry és sync specek.
12. **Lezárás**:
    - [[Heti terv]]: két sablontípus, `StretchPlan` / `StretchPlanItem` entitás, `STRETCH` slot,
      rotációs szabály, Backend-offline (v23, `SCHEMA_V53`), Backend;
    - [[Edzésnapló]] érintett hivatkozásai;
    - gate, status, archiválás.

- 2026-10-17 — Implementáláskor: a nyújtó sablon-tétel sorrendje fel / le nyilakkal állítható (a sablon-szerkesztő
  ⋮ menü helyett közvetlen gombok — egy tételnek nincs más művelete). Külön `StretchPlanServiceTest` nem készült:
  a nested fa minden ágát a `StretchPlanIntegrationTest` valódi DB-n fedi.
- 2026-10-17 — Implementáláskor: a `ForecastDay.stretchPlan` opcionális mező (nem új `ForecastKind`), így a
  meglévő `REST` ág (blokk-lezárás, figyelmeztetések) változatlanul érvényes rá.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] — két sablontípus, `StretchPlan` / `StretchPlanItem` entitás, időtartam-szabály,
  `STRETCH` slot, rotációs szabály (1. lépés), sablon-lista / nyújtó szerkesztő / felülíró menü UI, Backend-offline
  (`SCHEMA_V53`, outbox v23), Backend (`V58`).
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #168 nyújtó sablonok
- Kód: `hu.bumler.lm2.workout.StretchPlan*`, `WeeklyPlanService`, `V58__stretch_plan.sql`, `core/data/stretch-plan.repository.ts`,
  storage backendek, sync engine, outbox, `shared/stretch-picker/`, `pages/workout/plan/` (lista, `stretch-plan-edit.page.*`,
  `plan-group-activation.ts`), `pages/workout/stretch/stretch-timing.ts`, `training-forecast.ts`, `weekly-plan/`
