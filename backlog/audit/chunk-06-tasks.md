# Audit — Chunk 06: Tasks / Tennivalók
Audit commit: `ff23984`
Specek: `documentation/Features/Tennivalók.md`, `documentation/Subfeatures/Élet tervek.md`, `documentation/Subfeatures/Háztartási feladatok.md`, `documentation/Features/Események.md`, `documentation/Features/Naptár.md`, `documentation/Subfeatures/Új esemény hozzáadása.md`
Kód: `backend/src/main/java/hu/bumler/lm2/tasks/**` (LifePlan*, HouseholdRoom*, HouseholdTask*, CalendarEvent* — controller/service/mapper/repository/entity/syncDataLoader), Flyway `V9__life_plan.sql`, `V10__household.sql`, `V11__calendar_event.sql`; `frontend/src/app/pages/tasks/**` (hub, life-plans, household, events, calendar), `frontend/src/app/core/data/{life-plan,household-room,household-task,calendar-event}.repository.ts`, `core/data/household-occurrence.ts`, `core/data/event-occurrence.ts`, `pages/tasks/calendar/calendar-occurrence.ts`, `calendar-month-grid.ts`, `pages/tasks/*/​*-sections.ts`, `events/event-time-defaults.ts`, `core/notifications/notification-rules.ts` (`householdTaskDueRule`, `eventOccurrenceRules`), `core/notifications/notification-types.ts` (`NOTIFICATION_SOURCE_FLAG`), `app.routes.ts`, `assets/config/features.json`
Tesztek: backend `tasks/{CalendarEvent,HouseholdRoom,HouseholdTask,LifePlan}{Service,Integration}Test.java` (8); frontend `pages/tasks/**/*.spec.ts` (13: calendar-month-grid, calendar-occurrence, event-{edit,list,sections,time-defaults}, household-{room-manager,sections,task-edit,task-list}, life-plan-{edit,list,sections}) + `core/data/{event-occurrence,household-occurrence}.spec.ts`

---

## documentation/Features/Tennivalók.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Alsó tab **Feladatok**; belépő a Feladatok tabon (Business / UI/UX) | Implemented | `app.routes.ts:198` `path: 'tasks'` + `TABS.FELADATOK`; tab-registry chunk 14 | — |
| 2 | Hub **négy csempe**: Háztartási \| Élet tervek \| Naptár \| Események (UI/UX) | Implemented | `tennivalok-hub.page.html:9-30` four `ion-item`s; `tennivalok-hub.page.spec.ts` | — |
| 3 | Háztartási csempe mindig látszik (nincs saját flag; `tab.feladatok` fedi) (UI/UX) | Implemented | `tennivalok-hub.page.html:9` unconditional `routerLink="household"` | — |
| 4 | Élet tervek / Naptár / Események: **saját** flag; ki → csempe rejtve (UI/UX) | Implemented | `tennivalok-hub.page.ts:22-24` `feladatok.{eletTervek,naptar,esemenyek}`; `@if` guards in HTML | — |
| 5 | Tab flag ki → az egész hub (és minden csempe) eltűnik (UI/UX) | Implemented | `app.routes.ts:199` `canActivate: [featureFlagGuard('tab.feladatok')]` on `tasks` parent | — |
| 6 | Hub nem CRUD; a gyerekek a saját specükben (Funkcionális) | Implemented | hub is pure navigation list | — |
| 7 | Élet tervek **nem** naptár-producer; nincs háztartási kapocs (Funkcionális / UI/UX) | Implemented | `calendar-occurrence.ts:11` `CalendarSource = 'HOUSEHOLD_TASK' \| 'EVENT'` only | — |
| 8 | Backend-offline: olvasás/írás helyi store, mutáció outboxba, kliens UUID (Architektúra) | Implemented | per-entity repos `requestDrainIfNative()`; `*SyncDataLoader.java` for all four; `sync_changes` view `V9/V10/V11` | — |
| 9 | Nincs saját backend érintettség (Architektúra / Backend) | Implemented | no `Tennivalok*` backend class; endpoints live under child features | — |
| 10 | Al-route-ok flag ki mellett is elérhetők (deep link) — spec: "csempe rejtve" (implicit UI/UX) | Partial | `app.routes.ts:202-233` `life-plans` / `events` / `calendar` children have **no** `featureFlagGuard`; only the hub tile is hidden. `Frontend.md` konvenció: kikapcsolt flag a **guarded route**-ot is elveszi | change-request jegy |

---

## documentation/Subfeatures/Élet tervek.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | `LifePlan` mezők: `id` (kliens UUID), `title`, `notes?`, `status`, `targetDate?`, `completedAt?`, `deleted`, audit (Entitás) | Implemented | `V9__life_plan.sql:4-19`; `LifePlanEntity.java`; `components/schemas/LifePlan.yaml` | — |
| 2 | `title` kötelező, trim után nem üres, **nem** egyedi (Entitás) | Implemented | `V9` no unique index; `life-plan-edit.page.ts:64` `Validators.required`; `LifePlanService` no name check | — |
| 3 | `status` enum `PLANNED \| IN_PROGRESS \| DONE`, kötelező (Entitás) | Implemented | `V9:9` `CHECK (status IN …)`; `LifePlan.StatusEnum` | — |
| 4 | `targetDate` opcionális `YYYY-MM-DD`, csak listán, **nincs** naptár-emit (Entitás / Céldátum) | Implemented | `V9:10` `target_date date`; no LIFE_PLAN in `calendar-occurrence.ts` | — |
| 5 | `completedAt`: `DONE` belépésekor `now`, kilépéskor `null` (Entitás / Állapotgép) | Implemented | `LifePlanEntity.applyStatus`; `life-plan-sections.spec.ts` / `life-plan-edit.page.spec.ts` completedAt side effect | — |
| 6 | Nincs occurrence-tábla, nincs `lifePlanId` idegen entitáson, nincs mérföldkő (Entitás) | Implemented | no `life_plan_*` child table; `household_task` / `calendar_event` have no `life_plan_id` | — |
| 7 | Create default `PLANNED`; bármely állapotból bármelyikbe (Állapotgép) | Implemented | `life-plan-edit.page.ts:65` default `Planned`; `ion-segment` free choice; no transition guard | — |
| 8 | Szerver: ellentmondó `status`/`completedAt` pár → **400** (Állapotgép / Backend) | Implemented | `LifePlanService.applyFields:80-85` `ValidationException`; `LifePlanServiceTest` | — |
| 9 | DB check: `(status = DONE) = (completed_at IS NOT NULL)` (Backend) | Implemented | `V9:18` `CHECK ((status = 'DONE') = (completed_at IS NOT NULL))` | — |
| 10 | Lejárt (lista): élő ∧ `status ≠ DONE` ∧ van `targetDate` ∧ `targetDate < ma`; `DONE` soha nem lejárt (Céldátum) | Implemented | `life-plan-sections.ts:8` `isLifePlanOverdue`; `life-plan-sections.spec.ts` | — |
| 11 | Lemaradás = `ma − targetDate` nap (Céldátum) | Implemented | `life-plan-sections.ts:13` `lifePlanLagDays` | — |
| 12 | Lista szekciók Folyamatban / Terv / Kész; üres szekció rejtve (UI/UX) | Implemented | `life-plan-sections.ts:30` `groupLifePlans`; `life-plan-list.page.html` `@if` per section | — |
| 13 | Folyamatban/Terv rendezés: lejárt elöl, `targetDate` növ., dátum nélküli végén, majd `title` (UI/UX) | Implemented | `life-plan-sections.ts:39` `compareActive`; spec teszt | — |
| 14 | Kész rendezés: `completedAt` csökkenő, majd `title` (UI/UX) | Implemented | `life-plan-sections.ts:59` `compareDone` | — |
| 15 | Kereső `title` + `notes`; szűrt üres ≠ globális üres (UI/UX) | Implemented | `life-plan-list.page.ts:61` `matchesSearch`; `isEmpty` / `hasNoResults`; HTML `EMPTY` vs `NO_RESULTS` | — |
| 16 | Üres állapot: CTA új tervre (UI/UX) | Implemented | `life-plan-list.page.html:20` `ion-item button routerLink="new"` + empty label | — |
| 17 | Create/edit űrlap: `title` (create auto-focus), `status` szegmens, opcionális `targetDate` (törölhető), `notes` (UI/UX) | Implemented | `life-plan-edit.page.ts:63-68` form; `ion-segment`; nullable `targetDate`/`notes` | — |
| 18 | Törlés: megerősítés a címmel → soft delete; nincs undelete; `DONE` sor is törölhető (CRUD / Törlés) | Implemented | `life-plan-edit.page.ts:97` `AlertController` w/ title; `LifePlanService.delete` soft; no undelete path | — |
| 19 | Duplikálás nincs (CRUD) | Implemented | no duplicate action in page/repo | — |
| 20 | OpenAPI `GET POST /api/life-plans`, `GET PUT DELETE /api/life-plans/{id}`; `DELETE` = soft, idempotens (Backend) | Implemented | `openapi/paths/life-plans{,-item}.yaml`; `LifePlanController.java`; `LifePlanIntegrationTest` idempotent delete | — |
| 21 | User scope: idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted` (Backend) | Implemented | `LifePlanService.get` `findByIdAndUserId` → 404; deleted row still mapped 200; `LifePlanIntegrationTest` | — |
| 22 | `PUT` törölt entitáson **nem** undo (409 ENTITY_DELETED); pull után pending PUT eldobandó (Törlés) | Implemented | `LifePlanService.update:52` `EntityDeletedException`; outbox coalescing chunk 14 | — |
| 23 | Lista `ORDER BY createdAt ASC` (Backend implicit) | Implemented | `LifePlanRepository.findByUserIdAndDeletedFalseOrderByCreatedAtAsc` | — |
| 24 | Backend-offline / Full-offline: teljes olvasás+írás lokálisan; lejárt/szekció **mindig** kliens pure TS (Backend-offline) | Implemented | `life-plan-sections.ts` pure; `LifePlanSyncDataLoader.java` delta pull | — |
| 25 | **Nem scope (MVP):** naptár-producer, értesítés, mérföldkő/checklist, FK, kategória, prioritás, %-progress, duplikálás, seed, undelete, skip/snooze (Business) | Describes-future | Nincs ilyen kód; `calendar-occurrence.ts` szándékosan kihagyja `LIFE_PLAN`-t; `NOTIFICATION_SOURCE_FLAG` nincs life-plan típus | jegy (deferred scope) + `LIFE_PLAN`-nincs-producer marad Tudatos korlát |
| 26 | Nincs helyi notification trigger / naptár-mapper (Architektúra / Frontend) | Implemented | `life-plan.repository.ts` no scheduler call; no life-plan branch in `notification-rules.ts` | — |

---

## documentation/Subfeatures/Háztartási feladatok.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | `HouseholdRoom`: `id` (kliens UUID), `name`, `sortOrder`, `deleted`, audit; csak név+sorrend (Entitás) | Implemented | `V10:3-13`; `HouseholdRoomEntity.java`; `schemas/HouseholdRoom.yaml` | — |
| 2 | Szoba `name` egyedi a user **élő** helyiségei közt; törölt név újra felvehető (Entitás) | Implemented | `V10:16` partial unique `(user_id, name_normalized) WHERE deleted = false`; `HouseholdRoomService.applyName` pre-check; `HouseholdRoomServiceTest` | — |
| 3 | Üres start: nincs seed helyiség (Entitás) | Implemented | no seed migration / bootstrap for `household_room` | — |
| 4 | `HouseholdTask`: `id`, `roomId` (kötelező), `name`, `energyLevel` enum, `estimatedMinutes ≥ 1`, `intervalDays ≥ 1`, `nextDue` date (default ma), `lastCompletedAt?`, `notes?`, `deleted`, audit (Entitás) | Implemented | `V10:24-40` w/ CHECKs; `HouseholdTaskEntity.java`; `household-task-edit.page.ts:80-88` defaults (`estimatedMinutes` 15, `intervalDays` 7, `nextDue` `today()`) | — |
| 5 | Feladatnév egyedi az **adott helyiség** élő feladatai közt; más helyiségben ugyanaz OK (Entitás) | Implemented | `V10:43` partial unique `(room_id, name_normalized) WHERE deleted = false`; `HouseholdTaskService.applyName` (scope = room) | — |
| 6 | Nincs `lifePlanId`, nincs occurrence-tábla (a naptár számított) (Entitás) | Implemented | `V10` no such columns/tables; `household-occurrence.ts` projects | — |
| 7 | Multi-room create: N független `HouseholdTask` sor, külön UUID, azonos mezők (Modell / Feladat CRUD) | Implemented | `household-task-edit.page.ts:152-169` loop over `selectedRoomIds`, one `taskRepository.save` each | — |
| 8 | Szerkesztés: egy példány / egy helyiség; helyiség áttehető; cél-helyiség névütközés → validációs hiba (Modell) | Implemented | `household-task-edit.page.ts:179-201` single `roomId`; `HouseholdTaskService.applyName` re-checks target room; `HouseholdTaskNameConflictError` | — |
| 9 | `intervalDays`/energia/perc/név/helyiség módosítás **nem** számol újra `nextDue`-t (Modell) | Implemented | `household-task-edit.page.ts:184-193` passes existing `nextDue`; `HouseholdTaskService.applyFields` stores as-is | — |
| 10 | Helyiség CRUD + **manuális sorrend** (web drag&drop; telefon fel/le nyíl); új szoba `sortOrder` = max élő + 1 (Helyiség CRUD) | Implemented | `household-room-manager.page.ts:67` `isNative` branch, `moveUp/moveDown` vs `onIonReorder`; `nextSortOrder()` | — |
| 11 | Inline helyiség-create a feladat-űrlapról; trim után nem üres (Helyiség CRUD / Feladat CRUD) | Implemented | `household-task-edit.page.ts:122-141` `addInlineRoom`; `roomRepository.save` + auto-select | — |
| 12 | Szoba törlés: megerősítő dialógus, **cascade** soft delete a szoba + élő feladatai, dialógus **név szerint** felsorolja (Helyiség CRUD / Backend) | Implemented | `household-room-manager.page.ts:135-149` + `buildDeleteConfirmMessage`; `HouseholdRoomService.delete:65-79` cascade; `HouseholdRoomIntegrationTest.delete_cascadesToLiveTasksInTheRoom` | — |
| 13 | Feladat create: helyiség-checklist **≥ 1** (mentés enélkül tiltott) (Feladat CRUD) | Implemented | `household-task-edit.page.ts:153-156` `roomIds.length === 0` → error | — |
| 14 | Névütközés egy kijelölt helyiségben: az bukik, a többi létrejön; UI jelzi melyik (Feladat CRUD) | Implemented | `household-task-edit.page.ts:157-173` `failedRoomNames` collected & shown | — |
| 15 | Feladat törlés: megerősítés (feladat neve) → soft delete a feladaton (szoba marad) (Feladat CRUD) | Implemented | `household-task-edit.page.ts:205-219`; `HouseholdTaskService.delete` (room untouched) | — |
| 16 | Pipálás pure TS: `nextDue = ma + intervalDays`, `lastCompletedAt = most`; késés a pipálás napjához igazodik; korai ugyanígy (Pipálás) | Implemented | `household-occurrence.ts:19` `rollForwardHouseholdTask` (roll from `today`, not old `nextDue`); `household-occurrence.spec.ts` | — |
| 17 | Pipálás művelet, nem checked-állapot; a sor átkerül szekcióba (Pipálás / UI/UX) | Implemented | `household-task-list.page.ts:111` `complete()` → repo `PUT`; list re-groups via signal | — |
| 18 | Undo/skip/snooze nincs; `nextDue` kézzel szerkeszthető (Pipálás) | Implemented | no skip/snooze; `household-task-edit.page.ts:85` `nextDue` control | — |
| 19 | Naptárból pipálás = **ugyanaz** a mutáció (Pipálás / Naptár-szerződés) | Implemented | `calendar-day.page.ts:116` `complete()` → `householdTaskRepository.complete(...)` (same call) | — |
| 20 | Naptár-producer: `horizon = ma + 1 év`; `nextDue ≤ horizon` → emit (múltbeli is, eredeti napján) (Naptár-szerződés) | Implemented | `household-occurrence.ts:41-46`; `household-occurrence.spec.ts` | — |
| 21 | Producer: max **10** előfordulás, jövőbeli/mai lépések (a további múltbeli lépéseket kihagyja) (Naptár-szerződés) | Implemented | `household-occurrence.ts:48-57` `while (occurrences.length < 10)` + `if (d >= today)` | — |
| 22 | Producer: `nextDue > horizon` → **0** előfordulás (feladat a listán marad) (Naptár-szerződés) | Implemented | `household-occurrence.ts:44` guarded push; loop `if (d > horizon) break` | — |
| 23 | Emit mezők: all-day; cím = feladat `name`; alcím = helyiség `name`; `taskId`; `date`; `completable = true`; `overdue = date < ma` (Naptár-szerződés / Naptár DTO) | Implemented | `calendar-occurrence.ts:50-64` maps exactly this (+ `energyLevel`/`estimatedMinutes`/`roomSortOrder`) | — |
| 24 | Értesítés `HOUSEHOLD_TASK_DUE`: napi **09:00** digest, `nextDue ≤ ma` élő feladatok, 1/nap, 0 → nincs, tap → Lejárt+Ma lista (Értesítések) | Implemented | `notification-rules.ts:187` `householdTaskDueRule` (`fireAt` `T09:00:00`, key `todayIso`, `HOUSEHOLD_ROUTE`); `NOTIFICATION_SOURCE_FLAG.HOUSEHOLD_TASK_DUE = 'tab.feladatok'` | — |
| 25 | Lista szekciók Lejárt (`nextDue < ma`) / Ma / Később; üres rejtve; rendezés `nextDue` növ., helyiség `sortOrder`, feladatnév (UI/UX) | Implemented | `household-sections.ts:15` `groupHouseholdTasks`; `household-sections.spec.ts` | — |
| 26 | Szűrők **ÉS**: helyiség, energia, max. perc; kereső feladatnév + helyiségnév (UI/UX) | Implemented | `household-task-list.page.ts:71-89` combined predicate; `matchesSearch` on name + room name | — |
| 27 | Lejárt sor: figyelmeztető szín + lemaradás `ma − nextDue` nap (UI/UX) | Implemented | `household-task-list.page.ts:103` `isOverdue`, `:107` `lagDays` → `householdTaskLagDays` | — |
| 28 | Szűrt üres ≠ globális üres; üres állapot CTA új helyiségre/feladatra (UI/UX) | Implemented | `household-task-list.page.ts:92-93` `isEmpty`/`hasNoResults`; HTML `EMPTY` vs `NO_RESULTS` + `routerLink="new"` / `routerLink="rooms"` | — |
| 29 | OpenAPI: `GET POST /api/household-rooms`, `GET PUT DELETE /api/household-rooms/{id}` (DELETE = soft + cascade); `GET POST /api/household-tasks`, `GET PUT DELETE /api/household-tasks/{id}` (pipálás = PUT) (Backend) | Implemented | `openapi/paths/household-rooms{,-item}.yaml`, `household-tasks{,-item}.yaml`; `HouseholdRoomController` / `HouseholdTaskController` | — |
| 30 | User scope: idegen `id` → 404; saját törölt `GET` by id → 200 + `deleted`; `DELETE` idempotens; `PUT` törölt soron → 409 ENTITY_DELETED (Backend / Törlés) | Implemented | `HouseholdRoomService`/`HouseholdTaskService` `findByIdAndUserId`; `EntityDeletedException` on update; `HouseholdRoom/TaskIntegrationTest` idempotent delete + 200-deleted | — |
| 31 | `updated_at` DB triggerből, bulk cascade update-nél is (delta pull-hoz load-bearing) (Backend) | Implemented | `V10:19-22,47-50` `set_updated_at` `BEFORE INSERT OR UPDATE` triggers; cascade path re-saves each task | — |
| 32 | Többhelyiséges create outbox sorrend: előbb inline `POST` szoba, aztán feladat `POST`-ok (FIFO + függőség) (Architektúra / Frontend) | Implemented | `household-task-edit.page.ts:130` inline room saved first, then tasks; outbox `dependsOn` chunk 14 | — |
| 33 | Digest helyi store-ból, net nélkül is (Backend-offline) | Implemented | `notification-rules.ts` pure over loaded snapshot; scheduler local | — |
| 34 | **Nem scope (MVP):** kapcsolat Élet tervekkel; egyszeri (nem ismétlődő) feladat; heti-nap/havi/szezonális ritmus; skip/snooze/szünet/undo; duplikálás; seed; teljes elvégzés-előzmény lista; kapacitás-tervező; lead time az értesítésen; undelete UI (Business) | Describes-future | Nincs kód ezekhez; `interval_days` az egyetlen ritmusmodell; `last_completed_at` egyetlen mező (nincs history tábla) | jegy (deferred scope) |

---

## documentation/Features/Események.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | `CalendarEvent` mezők: `id`, `title`, `location?`, `notes?`, `allDay`, `date`, `startTime?`/`endTime?`, `frequency?`, `interval` (default 1), `deleted`, audit (Entitás) | Implemented | `V11:4-19`; `CalendarEventEntity.java`; `schemas/CalendarEvent.yaml` | — |
| 2 | `title` kötelező trim után; **nem** egyedi (Entitás) | Implemented | `V11` no unique index; `event-edit.page.ts:70` `Validators.required`; `calendar-event.repository.ts:36` comment | — |
| 3 | `allDay = true` → mindkét idő `null`; `allDay = false` → mindkettő kötelező, `endTime > startTime`, ugyanaz a nap (Entitás) | Implemented | `V11:20-23` CHECK; `CalendarEventService.applyFields:76-90`; `event-edit.page.ts:116-121`; `CalendarEventServiceTest` | — |
| 4 | `frequency` enum `DAILY \| WEEKLY \| YEARLY`; üres = egyszeri (Entitás) | Implemented | `V11:14` CHECK; `event-occurrence.ts:63` null → one-off | — |
| 5 | `interval ≥ 1`; `frequency` nélkül figyelmen kívül (tárolt default 1) (Entitás) | Implemented | `V11:15` CHECK `interval >= 1`; `event-edit.page.ts:133` `frequency === null ? 1 : interval` | — |
| 6 | `date` egyszerinél az a nap, ismétlődőnél a sorozat kezdete (`dtstart`) (Entitás) | Implemented | `event-occurrence.ts:59-81` `current = event.date` seed | — |
| 7 | **WEEKLY** = a `date` hét napja, minden `interval`. hét (Entitás / next) | Implemented | `event-occurrence.ts:41-43` `+ interval*7` nap; `event-occurrence.spec.ts` | — |
| 8 | **YEARLY** = ugyanaz a hó.nap; **feb. 29.** nem-szökőévben kihagyva → következő érvényes feb. 29. (Entitás / next) | Implemented | `event-occurrence.ts:19-23` `addYearsToDate` `valid` flag, `:44-51` skip loop; `event-occurrence.spec.ts:49` "Feb 29 dtstart skips non-leap years" | — |
| 9 | Idő falóra a `date` napján, nincs TZ-mező, DST mellett 15:00 marad 15:00 (Entitás) | Implemented | `start_time`/`end_time` `varchar(5)` stored as `HH:mm`; no tz math | — |
| 10 | Szerkesztés/törlés **mindig a sorozatra**; nincs "csak ez az alkalom" (Modell) | Implemented | `CalendarEventService.update` full replace of the row; `event-edit.page.ts` no instance concept | — |
| 11 | Nem pipálható; előfordulás a napján marad (Modell / Naptár DTO) | Implemented | `calendar-occurrence.ts:80-82` `completable: false`, `overdue: false`; `calendar-day.page.html:40` checkbox only `@if row.completable` | — |
| 12 | Előfordulás-vetítés: `windowStart = ma − 1 év`, `windowEnd = ma + 1 év`, **nincs** darabszám-sapka (Előfordulás-vetítés) | Implemented | `event-occurrence.ts:60-61,75-81`; `event-occurrence.spec.ts` (no cap) | — |
| 13 | Egyszeri: emit `date` ha ablakban; `date > windowEnd` → 0 (Előfordulás-vetítés) | Implemented | `event-occurrence.ts:63-65` | — |
| 14 | Ismétlődő: `d = dtstart`, előre `while d < windowStart`, majd emit `while d ≤ windowEnd` (Előfordulás-vetítés) | Implemented | `event-occurrence.ts:67-81` | — |
| 15 | Producer emit mezők: `source = EVENT`, `sourceEntityId = id`, `date`, `allDay`, timed `startTime`/`endTime`, `title`, `subtitle = location`, `completable = false`, `overdue = false` (Előfordulás-vetítés / Naptár DTO) | Implemented | `calendar-occurrence.ts:70-84` maps exactly this | — |
| 16 | Élő producer feltétel: spec `Kész` **és** Események flag be; chip rejtve ha flag ki; a vetítésből is kiesik (Naptár-szerződés) | Implemented | `calendar-month.page.ts:74-82` `eventsSourceAvailable` gates both chip and `activeSources`; `calendar-month.page.html:21` `@if` | — |
| 17 | Értesítés `EVENT_OCCURRENCE`: timed → `startTime`; all-day → **09:00**; 1/(`eventId`+nap); múltbeli előfordulásra nincs utólagos fire; tap → szerkesztő (Értesítések) | Implemented | `notification-rules.ts:211` `eventOccurrenceRules` (`fireAt` startTime vs `T09:00:00`, key `${id}:${date}`, `if (fireAt <= nowWallClock) continue`, route `/tabs/tasks/events/${id}`); `NOTIFICATION_SOURCE_FLAG.EVENT_OCCURRENCE = 'feladatok.esemenyek'` | — |
| 18 | Lista szekciók **Ma / Közelgő / Múlt** az **előfordulásokból** (nem nyers sorokból); üres rejtve (UI/UX) | Implemented | `event-sections.ts:17` `buildEventOccurrenceRows` + `:49` `groupEventOccurrences`; `event-list.page.ts:59-66`; `event-sections.spec.ts` | — |
| 19 | Ma/Közelgő rendezés: egész napos elöl, majd `startTime`, majd `title`; Múlt: `date` csökkenő, napon belül egész napos elöl majd `startTime` csökkenő (UI/UX) | Implemented | `event-sections.ts:55-73` `compareWithinDay` w/ `startTimeDescending`; spec teszt | — |
| 20 | Soron: cím; timed `startTime–endTime`; all-day i18n "egész nap"; helyszín ha van; ismétlődőnél ritmus-címke i18n; nincs pipa (UI/UX) | Implemented | `event-list.page.ts:74-84` `timeLabel` / `rhythmLabelKey`; `event-list.page.html` | — |
| 21 | Kereső cím + helyszín; szűrt üres ≠ globális üres; üres állapot CTA (UI/UX) | Implemented | `event-list.page.ts:61-68` `matchesSearch` title+location, `isEmpty`/`hasNoResults`; HTML CTA `routerLink="new"` | — |
| 22 | Create/edit űrlap: `title` auto-focus; `allDay` kapcsoló (create default **ki**); `date` default **ma** (Create/edit) | Implemented | `event-edit.page.ts:71-72` `allDay` default `false`, `date` default `today()`; `event-edit.page.html` autofocus | — |
| 23 | Timed default: `startTime` = most felfelé 15 percre (pontos határ marad); **éjfél-csapda** (23:46–23:59 → `22:59`/`23:59`); egyébként `endTime = startTime + 1h`, nap-átlépés → `23:59`, majd fallback `22:59`/`23:59` (Create/edit) | Implemented | `event-time-defaults.ts:7` `computeDefaultTimedTimes`; `event-time-defaults.spec.ts` | — |
| 24 | Ritmus választó: nincs / DAILY / WEEKLY / YEARLY + `interval` (default 1, `≥ 1`) (Create/edit) | Implemented | `event-edit.page.ts:75-76` `frequency` + `interval` controls; `ion-select` options | — |
| 25 | Validáció: cím nem üres; timed-nél mindkét idő + `endTime > startTime`; `interval ≥ 1` ha van `frequency` (Create/edit) | Implemented | `event-edit.page.ts:110-121` + `Validators.min(1)` | — |
| 26 | Törlés: megerősítés a címmel; ismétlődőnél "az egész sorozat" szöveg; soft delete (CRUD / Törlés) | Implemented | `event-edit.page.ts:138-156` `isRecurring` message key branch; `CalendarEventService.delete` soft | — |
| 27 | OpenAPI `GET POST /api/events`, `GET PUT DELETE /api/events/{id}`; `DELETE` = soft, idempotens; idegen `id` → 404; saját törölt `GET` → 200 + `deleted`; `PUT` törölt → 409 ENTITY_DELETED (Backend) | Implemented | `openapi/paths/events{,-item}.yaml`; `CalendarEventController` / `CalendarEventService`; `CalendarEventIntegrationTest` (idempotent delete, 200-deleted, ENTITY_DELETED, cross-user 404) | — |
| 28 | Backend-offline: helyi store olvasás+írás; vetítés **mindig** kliens pure TS; create/update/delete → outbox + kliens UUID (Backend-offline) | Implemented | `calendar-event.repository.ts` (uuidV4, `requestDrainIfNative`); `CalendarEventSyncDataLoader.java`; `event-occurrence.ts` pure | — |
| 29 | Google: **egyirányú export** (LM2 → Google), device-local export-állapot, az entitást/végpontokat nem érinti; Fejléc belépő "Google export" ha `feladatok.googleExport` flag be (Megjegyzések / UI/UX) | Describes-future | `features.json:14` `"feladatok.googleExport": false`; nincs Google export belépő az `event-list.page.html`-ben; nincs export-kód | ld. jegy #1 (google-calendar-export) — átírásban `> Tervezett: [[backlog/001-google-calendar-export]]` |
| 30 | **Nem scope (MVP):** naptárból create; hónap-rácson timed sáv; "csak ez az előfordulás"/kivételek; többnapos/éjfélen átnyúló esemény; RRULE (havi, heti napok mix, COUNT); skip/snooze/undo; duplikálás; vendégek; eseményenkénti lead time; seed (Business) | Describes-future | Nincs kód; `frequency` csak DAILY/WEEKLY/YEARLY + skalár `interval`; nincs `+`/long-press a naptárban | jegy (deferred scope) |

---

## documentation/Features/Naptár.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Aggregált, fogyasztó naptár; nincs saját entitás, nincs create a naptárból, nincs saját OpenAPI (Jelenlegi működés / Szerep / Backend) | Implemented | `calendar-occurrence.ts` reads producer utilities; nincs `calendar*` migráció/endpoint; `calendar-day.page` no `+` | — |
| 2 | Producer registry: `HOUSEHOLD_TASK` Igen; `EVENT` Igen (Események flag is kell); `LIFE_PLAN` **Nem** (Producer registry) | Implemented | `calendar-occurrence.ts:11` `CalendarSource` union csak a kettő; `eventsSourceAvailable` gate | — |
| 3 | Előfordulás DTO (kliensoldali, nem persistált); egyedi kulcs `source` + `sourceEntityId` + `date` (Előfordulás DTO) | Implemented | `calendar-occurrence.ts:18-34` `CalendarOccurrence` interface; `calendar-day.page.html:38` `track row.source + row.sourceEntityId` | — |
| 4 | DTO mezők típusai: háztartás `allDay` mindig `true` / esemény a sorozat `allDay`; times csak esemény timed; `completable` HT `true` / EVENT `false`; `overdue` HT `date < ma` / EVENT mindig `false`; `energyLevel`/`estimatedMinutes` háztartás-only (Előfordulás DTO) | Implemented | `calendar-occurrence.ts:50-84` | — |
| 5 | A naptár **nem** vetít újra — a két producer utility kimenetét olvassa (Előfordulás DTO / Frontend) | Implemented | `calendar-occurrence.ts:4-5` imports `projectHouseholdTaskOccurrences` / `projectEventOccurrences` | — |
| 6 | Két képernyő: hónap rács + napi lista (külön képernyő, a nap tapja nyitja); nincs nap/hét rács MVP-ben (Nézet) | Implemented | `app.routes.ts:228-232` `calendar` + `calendar/:date`; `CalendarMonthPage` / `CalendarDayPage` | — |
| 7 | Hónap rács nyitás: **aktuális hónap**, mai nap kiemelve, nem jegyzi meg az utolsó hónapot (Hónap rács) | Implemented | `calendar-month.page.ts:68-70` `viewYear/viewMonth` from `todayIso`; no persistence | — |
| 8 | Hét kezdete **hétfő** (ISO-8601), hu és en (Hónap rács) | Implemented | `calendar-month-grid.ts:12` `(getUTCDay() + 6) % 7`; `calendar-month-grid.spec.ts` | — |
| 9 | Előző/következő hónap: chevron **és** vízszintes swipe (Ionic Gesture) (Hónap rács) | Implemented | `calendar-month.page.html:8-14` chevron buttons; `calendar-month.page.ts:115-147` `gestureController.create` `direction: 'x'`, `SWIPE_DISTANCE_PX = 60`, `onSwipeEnd` | — |
| 10 | Cím (hónap + év), nem nyit year-pickert (Hónap rács) | Implemented | `calendar-month.page.html:6` `ion-title` static; `monthLabel()` | — |
| 11 | **Ma** gomb: aktuális hónap + mai nap kiemelve; ha ott vagyunk, no-op (Hónap rács) | Implemented | `calendar-month.page.ts:187-190` `goToday()` sets view to today's y/m | — |
| 12 | Szomszédos hónap napjai a szélein **szürkén**; tap → az a napi lista (Hónap rács) | Implemented | `calendar-month-grid.ts:23` `inCurrentMonth` flag; `calendar-month.page.html:41` `[class.other-month]`; `openDay` navigates for any cell | — |
| 13 | Szomszédos napra tap után **a rács hónapja visszaérkezéskor marad, nem ugrik át** (Hónap rács) / "Vissza → a hónap rács, **ahonnan nyitottuk**" (Napi lista) | Missing | `calendar-month.page.ts:192-194` `openDay` **nem** viszi tovább az origin hónapot; `calendar-day.page.ts:123-125` `goBack()` a `month` paramot `this.date().slice(0,7)`-ből számolja → szürke szomszéd-nap (vagy nap-chevronnal elsodródott dátum) tapja után a rács a **másik** hónapra ugrik | **bug jegy** |
| 14 | Cellában: dátumszám + **szám-badge** = aznapi előfordulások száma a **szűrő után**; 0 → nincs badge; ≥ 100 → `99+` (Hónap rács) | Implemented | `calendar-month.page.ts:149-159` `badgeCount` / `badgeLabel` (`count >= 100 ? '99+'`); `calendar-month.page.html:47-49` `@if (badgeCount > 0)` | — |
| 15 | Múltbeli nap figyelmeztető szín **csak** ha a szűrt előfordulások közt van `overdue = true`; csak múltbeli esemény → neutrális; Ma külön kiemelés; jövő neutrális + badge (Hónap rács) | Implemented | `calendar-month.page.ts:161-167` `isOverdue` (`date < today && some(overdue)`), `isToday`; `calendar-month.page.html:42-44` classes | — |
| 16 | Napra tap (üres is) → napi lista; nincs kijelölés-állapot a rácson tap előtt; visszaérkezéskor az a nap kiemelve (nem reset mára, kivéve Ma) (Hónap rács / Napi lista) | Partial | `highlightedDate` a `highlight` query paramból helyreáll (`calendar-month.page.ts:72`), kezdőérték `null`; a **nap** kiemelése OK — de a **hónap** helyreállítás hibás (ld. #13) | ld. #13 jegy |
| 17 | Napi lista: cím a nap dátuma; előző/következő nap chevron; **Ma** gomb; vissza → a hónap rács azzal a nappal kiemelve (Napi lista) | Partial | `calendar-day.page.ts:89-99` `prevDay`/`nextDay`/`goToday`; `goBack` átadja `highlight` — a nap-kiemelés OK, a hónap nem (ld. #13) | ld. #13 jegy |
| 18 | Napi lista sor: **pipa** csak `completable`-ön; tap a sorra → producer szerkesztő (háztartás lista/edit + pipálás `PUT`; esemény → sorozat szerkesztő, nincs pipa); nincs undo, nincs confirm a pipára (Napi lista) | Implemented | `calendar-day.page.html:40-51` checkbox `@if row.completable`; `calendar-day.page.ts:111-121` `open()` routes `/tabs/tasks/household` vs `/tabs/tasks/events`, `complete()` = repo `complete` | — |
| 19 | Háztartási sor: cím, alcím (helyiség), energia, perc; `overdue` → figyelmeztető szín + lemaradás (Napi lista) | Partial | `calendar-day.page.html:43-50` cím + alcím + `overdue` szín; energia/perc a DTO-ban ott van (`calendar-occurrence.ts:62-63`) de a **napi lista HTML nem jeleníti meg** energia/perc-et, és nincs "lemaradás nap" szöveg | change-request jegy (napi lista sor hiányos mezők) |
| 20 | Esemény sor: cím; timed `startTime–endTime`; all-day i18n "egész nap"; alcím = helyszín (Napi lista) | Implemented | `calendar-day.page.html:44-50` + `timeLabel()` (`:85-87`) `?? ALL_DAY` | — |
| 21 | Sorrend a napon: egész napos elöl (háztartás, majd esemény, azon belül helyiség `sortOrder` / `title`), utána timed `startTime`, majd `title` (Napi lista) | Implemented | `calendar-occurrence.ts:112-131` `compareDayOrder`; `calendar-occurrence.spec.ts` | — |
| 22 | Producer store változás után badge + lista **azonnal** újraszámol (Napi lista) | Implemented | `calendar-month.page.ts:84-94` / `calendar-day.page.ts:68-79` `computed` over repo `items()` signals | — |
| 23 | Üres nap: "nincs tétel", **nincs CTA**; szűrt üres ≠ "nincs naptárad" (Napi lista) | Implemented | `calendar-day.page.html:33-37` `DAY_EMPTY` label only, no button | — |
| 24 | Forrás-szűrő chipek: multi-select **VAGY** (unió); alap minden élő chip be; minden chip ki → üres rács + üres napi listák; a szűrő hónap és nap közt **ugyanaz**, mindkét képernyőn állítható; nyitáskor újra mind be (Forrás-szűrő) | Implemented | `calendar-month.page.ts:80-82,169-177` `activeSources` Set + `toggleSource`; `calendar-day.page.ts:64-66,101-109` ugyanaz; init minden élő chip; nincs perzisztencia | — |
| 25 | [[Élet tervek]] chip **nincs** (nem producer) (Forrás-szűrő) | Implemented | `calendar-month.page.html:18-25` csak HOUSEHOLD_TASK + (opcionálisan) EVENT chip | — |
| 26 | A naptár **nem** ütemez értesítést; háztartási tap → Lejárt+Ma lista, esemény tap → esemény szerkesztő (Értesítések) | Implemented | `notification-rules.ts` routes: `HOUSEHOLD_ROUTE = '/tabs/tasks/household'`, event → `/tabs/tasks/events/${id}`; nincs naptár-scheduler | — |
| 27 | Feature flag: **saját** Naptár flag; ki → hub csempe rejtve; a háztartási ettől függetlenül megy (UI/UX) | Partial | `tennivalok-hub.page.ts:23` `naptarEnabled` hides tile; de a `/tabs/tasks/calendar` route **nincs** `featureFlagGuard('feladatok.naptar')` mögött (ld. Tennivalók #10) | ld. Tennivalók #10 jegy |
| 28 | Kontraszt: badge / overdue / ma kiemelés dark és light témában (UI/UX) | Implemented | `calendar-month.page.scss` theme-token colors (chunk 14 téma-audit hatókör) | — |
| 29 | Nincs kereső a naptárban (UI/UX) | Implemented | nincs `ion-searchbar` a `calendar-*.page.html`-ekben | — |
| 30 | Backend-offline: olvasás a producer helyi store-jából; a naptárnak **nincs** saját mutációja / outboxa; pipálás/szerkesztés a producer outboxán; nincs homokóra (Backend-offline) | Implemented | `calendar-*.page.ts` csak repo `load()` + `complete()` (household repo); nincs `calendar` repo/outbox | — |
| 31 | **Nem scope (MVP):** nap/hét rács; év nézet; hét számok; húzással átütemezés; kereső; naptárból create; hónap-rácson timed sáv; utolsó nézett hónap/szűrő megjegyzése; lead-time értesítés a naptár előfordulásairól; Google Calendar (Business) | Describes-future | Nincs ilyen kód; hónap rács + napi lista az egyetlen két nézet | jegy (deferred scope); Google → jegy #1 |

---

## documentation/Subfeatures/Új esemény hozzáadása.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | `CalendarEvent` create/edit űrlap; entitás/lista/vetítés/törlés/OpenAPI a szülő [[Események]]-en (Jelenlegi működés) | Implemented | `EventEditPage` (`event-edit.page.ts`); a szülő-spec állításai fent (Események.md #22–26) | — |
| 2 | Belépés: Események lista CTA / FAB / sor tap; naptár előfordulás tap → **ugyanaz** a képernyő; naptárból új create **nincs** (Funkcionális) | Implemented | `event-list.page.html` `routerLink="new"` / `[routerLink]="[event.id]"`; `calendar-day.page.ts:112-114` `open()` → `/tabs/tasks/events/:id`; nincs create a naptárból | — |
| 3 | `title` auto-focus create-nél (UI/UX) | Implemented | `event-edit.page.html` autofocus a `title` inputon | — |
| 4 | Az űrlap mezői/defaultjai/validációja a szülő "Create / edit űrlap" szekcióban (kanonikus spec a szülő) (Megjegyzések) | Implemented | ld. Események.md #22–25 | — |
| 5 | Offline réteg a szülő mutációin (create/update helyi store + outbox + kliens UUID) (Backend-offline) | Implemented | `calendar-event.repository.ts` (`uuidV4`, `upsertEvent`, `requestDrainIfNative`) | — |

---

## Rollup

- **Állítások összesen: 128** — Implemented **114** / Partial **5** (Tennivalók #10; Naptár #16, #17, #19, #27) / Missing **1** (Naptár #13) / Describes-future **7** (Élet tervek #25, Háztartás #34, Események #29, Események #30, Naptár #31, + Tennivalók #10 párja, + Naptár Google-sor) / Accepted-limitation **1** (`LIFE_PLAN`-nincs-producer, ld. Élet tervek #25 / Naptár #2)
- **Blokkoló eltérések (spec szerint `Kész`, kód nincs, NEM jövő-címkés):**
  - **Naptár #13** — a napi listáról visszalépve a hónap rács a *megtekintett nap* hónapjára áll vissza, nem az *eredeti* rács-hónapra; szürke szomszéd-hónap napjának tapja (vagy nap-chevronos elsodródás) után a rács átugrik a másik hónapra. A `Naptár.md` explicit: "a rács hónapja visszaérkezéskor marad, nem ugrik át" + "Vissza → a hónap rács, ahonnan nyitottuk". `calendar-month.page.ts:192` `openDay` nem adja tovább az origin hónapot; `calendar-day.page.ts:124` `goBack` a `date`-ből számol.
- **Draft jegyek:**
  - `bug — "Naptár: napi listáról visszatérve a rács a megtekintett nap hónapjára ugrik, nem az eredetire" -> documentation/Features/Naptár.md — a szomszédos hónap napjának tapja (vagy nap-chevronnal elsodródott dátum) után a hónap rács átvált a másik hónapra; a spec szerint az eredeti (ahonnan nyitottuk) hónapnak kell maradnia, a megnyitott nappal kiemelve. Az origin hónapot át kell adni openDay → day → goBack láncon.`
  - `change-request — "Feladatok al-route-ok nincsenek feature-flag-guard mögött" -> documentation/Features/Tennivalók.md, documentation/Subfeatures/Élet tervek.md, documentation/Features/Események.md, documentation/Features/Naptár.md — /tabs/tasks/{life-plans,events,calendar} csak a hub-csempét rejti el kikapcsolt feladatok.{eletTervek,esemenyek,naptar} flag mellett; a route-ok maguk nincsenek featureFlagGuard mögött, így deep link megnyitja a letiltott feature-t (Frontend.md konvenció: kikapcsolt flag a guarded route-ot is elveszi).`
  - `change-request — "Naptár napi lista háztartási sora nem mutat energiát / percet / lemaradás-napot" -> documentation/Features/Naptár.md — a spec szerint a háztartási napi-lista sor tartalma: cím, alcím, energia, perc, és overdue esetén lemaradás nap; a calendar-day.page.html csak címet, alcímet és idő/all-day feliratot renderel (a DTO viszi az energyLevel/estimatedMinutes mezőket).`
  - `feature — "Élet tervek MVP-utáni bővítmények (mérföldkő/checklist, prioritás, kategória, %-progress, duplikálás, undelete UI)" -> documentation/Subfeatures/Élet tervek.md — a spec "Nem scope (MVP)" listája; a vault governance szerint jegy + Tervezett-pointer váltja ki a "Nem scope" keretezést.`
  - `feature — "Háztartási feladatok MVP-utáni bővítmények (egyszeri feladat, heti-nap/havi/szezonális ritmus, skip/snooze/szünet/undo, teljes elvégzés-előzmény, kapacitás-tervező, értesítés lead time, undelete UI, seed helyiségek)" -> documentation/Subfeatures/Háztartási feladatok.md — a spec "Nem scope (MVP)" listája.`
  - `feature — "Események MVP-utáni bővítmények (RRULE: havi / heti napok mix / COUNT, több­napos / éjfélen átnyúló esemény, instance-kivétel, naptárból create, hónap-rácson timed sáv, skip/snooze/undo, duplikálás, vendégek, eseményenkénti lead time, seed)" -> documentation/Features/Események.md — a spec "Nem scope (MVP)" listája.`
  - `feature — "Naptár MVP-utáni bővítmények (nap/hét rács, év nézet, hét számok, húzással átütemezés, kereső, naptárból create, hónap-rácson timed sáv, utolsó nézett hónap/szűrő megjegyzése, naptár-előfordulás lead-time értesítés)" -> documentation/Features/Naptár.md — a spec "Nem scope (MVP)" listája.`
  - (Google Calendar export: **meglévő jegy #1** — `backlog/001-google-calendar-export.md` fedi az `Események.md` / `Naptár.md` "Nem scope: Google Calendar" állításokat; nincs új jegy.)
- **Spec-átírás vázlat (per spec):**
  - **Tennivalók.md** — `### Jelenlegi működés` már jelen idejű, marad. `#### Backend-offline` pontos. Kiegészítés: a három sub-feature flag jelenleg csak a hub-csempét rejti, a route nem guarded → jegy + `> Tervezett` pointer. Nincs "Nem scope" blokk eltávolítani.
  - **Élet tervek.md** — `### Jelenlegi működés` jó. **"Nem scope (MVP)" bekezdés törlése** → mozgatás `### Megjegyzések` alá "Tudatos korlát" felirattal a `LIFE_PLAN`-nincs-producer sorra, a többi (mérföldkő/prioritás/kategória/progress/duplikálás/undelete/skip) → `> Tervezett: [[backlog/NNN-elet-tervek-bovitmenyek]]`. `#### Backend-offline` marad. Az állapotgép / lejárt / szekció leírás pontos, marad jelen időben.
  - **Háztartási feladatok.md** — `### Jelenlegi működés` jó. **"Nem scope (MVP)" bekezdés** → `> Tervezett: [[backlog/NNN-haztartasi-bovitmenyek]]`; a "nincs teljes előzmény-napló" és "egy feladat = egy helyiség" mint `### Megjegyzések` "Tudatos korlát". A producer-algoritmus (10-sapka, horizon, múltbeli emit) és a `HOUSEHOLD_TASK_DUE` digest leírás bit-pontos, marad.
  - **Események.md** — `### Jelenlegi működés` jó. **"Nem scope (MVP)" bekezdés** → RRULE / többnapos / instance-kivétel / naptárból-create / skip / duplikálás / vendégek / lead time / seed: `> Tervezett: [[backlog/NNN-esemenyek-bovitmenyek]]`; Google Calendar: `> Tervezett: [[backlog/001-google-calendar-export]]`. A "falóra idő, nincs TZ-mező, DST" mint `### Megjegyzések` "Tudatos korlát". A feb-29-skip és a ±1 év / nincs-sapka vetítés leírás pontos, marad.
  - **Naptár.md** — `### Jelenlegi működés` jó. **"Nem scope (MVP)" bekezdés** → nap/hét rács / év nézet / drag-átütemezés / kereső / timed sáv / utolsó-hónap-memória: `> Tervezett: [[backlog/NNN-naptar-bovitmenyek]]`; Google: `> Tervezett: [[backlog/001-google-calendar-export]]`. **`#### Napi lista` javítás**: a #13 bug és a #19 hiányzó sor-mezők miatt a spec pontos, a *kód* tér el — a spec marad, a jegyek fedik. A "row-level, nincs saját mutáció" leírás pontos.
  - **Új esemény hozzáadása.md** — nincs érdemi eltérés; a jegyzet a kanonikus szülőre mutat, marad. Nincs "Nem scope" blokk.
- **Verdikt: RED** — egy `Kész` `Naptár.md` állítást (napi listáról visszatérve a rács hónapja marad / "ahonnan nyitottuk") a kód megsért (Naptár #13). Minden más állítás Implemented vagy jelen-idejű átírással / deferred-scope jeggyel rendezhető; a backend + a producer-vetítés + az értesítés-hookok teljesek és teszteltek.
