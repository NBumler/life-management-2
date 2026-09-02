# Audit — Chunk 01: Steps / Lépésszám
Audit commit: ff23984
Specek: documentation/Features/Lépésszám követés.md, documentation/Subfeatures/Lépésszám kézzel manuálisan megadása.md, documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md
Kód: backend/src/main/java/hu/bumler/lm2/steps/*, backend/src/main/resources/db/migration/V29__daily_step_log.sql, backend/src/main/resources/openapi/{paths/daily-step-logs*.yaml,components/schemas/DailyStepLog*.yaml}, frontend/src/app/pages/menu/steps/*, frontend/src/app/core/health/*, frontend/src/app/core/data/daily-step-log.repository.ts, frontend/src/app/core/data/activity-kcal.ts, frontend/src/app/core/storage/{sqlite,http}-storage-backend.ts, frontend/src/app/core/notifications/notification-rules.ts, frontend/android/app/src/main/java/hu/bumler/lm2/health/HealthConnectStepsPlugin.kt, frontend/android/app/src/main/java/hu/bumler/lm2/notifications/{ReminderWorker,ReminderScheduler}.kt, frontend/android/app/src/main/AndroidManifest.xml
Tesztek: backend/src/test/java/hu/bumler/lm2/steps/{DailyStepLogServiceTest,DailyStepLogIntegrationTest}.java, frontend/src/app/core/health/{activity-step-sync.service,step-sync-plan}.spec.ts, frontend/src/app/core/data/{daily-step-log.repository,activity-kcal}.spec.ts

## documentation/Features/Lépésszám követés.md
| # | Spec-állítás (rövid idézet/parafrázis + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Napi lépésszám rögzítése manuális és/vagy Android Health Connect / Samsung Health (Jelenlegi működés) | Implemented | step-tracker.page.ts, activity-step-sync.service.ts, health/HealthConnectStepsPlugin.kt | — |
| 2 | A lépésszám a Tápérték kalkulátor `activityExtraKcal` lépéságát hajtja (Jelenlegi működés) | Implemented | activity-kcal.ts:stepKcalForDay; meal-dashboard.page.ts:activityExtraKcal; activity-kcal.spec.ts | — |
| 3 | Nincs ki/be kapcsoló; ha a flag engedi, a modell mindig aktív (PAL 1.2 + lépéskalória) (Jelenlegi működés) | Implemented | step-tracker/step-log-edit pages have no toggle; tdee-calculator.ts:`const PAL = 1.2`; features.json:`menu.lepesszam` | — |
| 4 | Entitás `DailyStepLog` — 1 nap = 1 rekord / user (Entitás) | Implemented | V29:`idx_daily_step_log_user_id_log_date ... WHERE deleted = false`; DailyStepLogEntity | — |
| 5 | `id` UUID, kliens-generált (Entitás) | Implemented | DailyStepLogEntity:`@Id UUID id` (no IDENTITY); daily-step-log.repository.ts:`uuidV5("DailyStepLog:<userId>:<date>")` | — |
| 6 | `date` naptári dátum (kliens TZ); egyedi kulcs user+date (Entitás) | Implemented | V29:`log_date date NOT NULL` + partial unique index; DailyStepLog.yaml:`date`/`format: date` | — |
| 7 | `stepCount` egész, `≥ 0` (Entitás) | Implemented | V29:`step_count integer NOT NULL CHECK (step_count >= 0)`; DailyStepLog.yaml:`minimum: 0`; repo:`Math.max(0, Math.round())` | — |
| 8 | `updatedAt` utolsó módosítás (Entitás) | Implemented | V29:`updated_at` + `daily_step_log_set_updated_at` trigger; DailyStepLogEntity:`@Generated ... updatedAt`; DailyStepLogMapper | — |
| 9 | Hiányzó nap = 0 lépés a Tápérték és az összehasonlítások szempontjából (Entitás) | Implemented | activity-kcal.ts:stepKcalForDay `?? 0`; repository.ts:stepsForDay `?? 0`; notification-rules.ts:stepsLowRule; activity-kcal.spec.ts "treats a missing day as 0 steps" | — |
| 10 | PAL mindig 1.2 (nincs Profile aktivitási szint, nincs fallback) (SSOT) | Implemented | tdee-calculator.ts:`const PAL = 1.2` (egyetlen konstans, nincs elágazás) | — |
| 11 | Lépéskalória: `max(0, stepCount - 3000) × m × 0.00045` (SSOT) | Implemented | activity-kcal.ts:stepKcalForDay, `STEP_BASELINE=3000`, `STEP_KCAL_PER_STEP=0.00045`; activity-kcal.spec.ts (252 kcal példa) | — |
| 12 | `STEP_BASELINE = 3000` fix (SSOT) | Implemented | activity-kcal.ts:`export const STEP_BASELINE = 3000` | — |
| 13 | Aznapi 0 lépés → lépéskalória 0 (baseline a 1.2 PAL-ban) (SSOT) | Implemented | activity-kcal.ts:`Math.max(0, stepCount - STEP_BASELINE)`; activity-kcal.spec.ts "is 0 at or below the 3000 baseline" | — |
| 14 | Manuális mentés mindig felülírja az aznapi `stepCount`-ot — kisebb és nagyobb értékkel is (Felülírási szabály) | Implemented | repository.ts:saveManual→upsert (feltétel nélkül); daily-step-log.repository.spec.ts; DailyStepLogIntegrationTest:createIsIdempotent_andLastWriteWins_evenWithASmallerValue | — |
| 15 | Samsung / Health Connect sync csak akkor ír felül, ha a syncelt szám nagyobb (hiányzó = 0) (Felülírási szabály) | Implemented | repository.ts:maxWinsUpsert `if (incoming <= this.stepsForDay(date)) return`; daily-step-log.repository.spec.ts "writes only when the incoming count beats the stored one" | — |
| 16 | 20:00-kor, ha a mai `stepCount` < 2000 → Értesítések (Értesítés) | Implemented | notification-rules.ts:stepsLowRule (`AT_2000`, `DEFAULT_STEPS_LOW_THRESHOLD`=2000); ReminderWorker.kt:evaluateStepsLow (`threshold`, 2000 default) | — |
| 17 | Belépés: Menü tab (nem Edzés) (UI/UX) | Implemented | app.routes.ts:`/tabs/menu` → `steps` (`featureFlagGuard('menu.lepesszam')`); menu.page.html:`routerLink="steps"` | — |
| 18 | Nincs követés ki/be kapcsoló (UI/UX) | Implemented | step-tracker.page.html / step-log-edit.page.html — nincs toggle vezérlő | — |
| 19 | Mai érték kiemelése; múltbeli napok listája / szerkesztése (UI/UX) | Implemented | step-tracker.page.html: Today input + `pastDays()` lista + `editDay()` → step-log-edit.page.ts (`?date=`) | — |
| 20 | Samsung engedély / sync státusz a Samsung gyerek szerint (UI/UX) | Implemented | step-tracker.page.html HC-szekció: `HC_GRANTED`, `HC_LAST_SYNC`, `HC_GRANT`/`HC_BG_GRANT` promptok; stepSync.permission/lastSyncAt jelek | — |
| 21 | iOS Health: későbbi scope (Megjegyzések) | Describes-future | health-connect.plugin.ts doc "iOS is a later scope"; nincs iOS natív modul | Ref #2 (backlog/002-ios-health-lepes-forras.md) |
| 22 | Feature flag off: nincs lépés UI; TDEE továbbra PAL=1.2, lépéság = 0 (edzés MET marad) (Megjegyzések) | Implemented | route `featureFlagGuard('menu.lepesszam')` + menu.page.html `@if (lepesszamEnabled)`; PAL konstans független; stepKcalForDay üres rekordlistán 0 | — |
| 23 | Shell képernyő + gyerek flow-k; `DailyStepLog` helyi store (Arch/Frontend) | Implemented | step-tracker.page.ts + step-log-edit.page.ts; DailyStepLogRepository `inject(STORAGE_BACKEND)` | — |
| 24 | Lépésváltozás → TDEE utility újrafuttatás (Arch/Frontend) | Implemented | step-tracker.page.ts:`todayKcal` computed(stepKcalForDay); meal-dashboard.page.ts újraszámol signal + ionViewWillEnter újratöltés révén | — |
| 25 | OpenAPI generált kliens; mutációk offline rétegen (Arch/Frontend) | Implemented | api/api/dailyStepLogs.service.ts (generált); sqlite-storage-backend.ts:upsertDailyStepLog (local write + outbox egy tranzakcióban); http-storage-backend.ts | — |
| 26 | Backend-offline: manuális mentés helyi store + outbox Backend-offline és Full-offline esetén is | Implemented | sqlite-storage-backend.ts:upsertDailyStepLog `executeTransaction([dailyStepLogLocalWriteTask(log), ...enqueue.outboxTasks])` | — |
| 27 | Backend-offline: Health Connect olvasás eszközön helyi; saját backendre írás outboxba | Implemented | HealthConnectStepsPlugin.kt (közvetlen HC hívás); repository.maxWinsUpsert → upsert → outbox | — |
| 28 | Backend-offline: napi upsert outbox — ugyanarra a `date`-re meglévő `PENDING` payload frissítése (ne duplikáljon), sync és manuális után is | Implemented | offline-queue.service.ts:buildEnqueueTasks coalesce PUT/POST azonos `targetEntityId`-re (= v5 id `userId:date`); sqlite-storage-backend.ts:upsertDailyStepLog POST/PUT ág | — |
| 29 | Sync UI: Szinkronizációs központ (Backend-offline) | Implemented | általános outbox/sync-center mechanizmus (`/tabs/menu/sync`), nem lépés-specifikus | — |
| 30 | Backend: OpenAPI `DailyStepLog` upsert user+`date` szerint (`stepCount`, UUID) (Arch/Backend) | Implemented | daily-step-logs.yaml:`createDailyStepLog` (idempotens upsert a v5 id-n); DailyStepLog.yaml; DailyStepLogService.create | — |
| 31 | Backend: Auth / user scope (Arch/Backend) | Implemented | DailyStepLogController:`currentUser.id()`; DailyStepLogService:findByIdAndUserId/requireOwner; DailyStepLogIntegrationTest:get_returnsNotFound_whenLogBelongsToAnotherUser | — |

## documentation/Subfeatures/Lépésszám kézzel manuálisan megadása.md
| # | Spec-állítás (rövid idézet/parafrázis + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Napi lépésszám kézi rögzítése / módosítása (Jelenlegi működés) | Implemented | step-log-edit.page.ts; step-tracker.page.ts:saveToday | — |
| 2 | Egy nap = egy `DailyStepLog`; a manuális mentés mindig felülírja a `stepCount`-ot (kisebb és nagyobb értékkel is) (Jelenlegi működés) | Implemented | repository.ts:saveManual/upsert; daily-step-log.repository.spec.ts "overwrites the stored value ... larger or smaller"; DailyStepLogServiceTest:create_isIdempotentUpsert_andOverwritesWithASmallerValue | — |
| 3 | Mező: `stepCount` (egész, `≥ 0`) egy kiválasztott `date`-re (alap: ma) (Funkc. leírás) | Implemented | step-log-edit.page.ts:`canSave` (`value >= 0 && Number.isFinite`), `date = signal(today())`; repository.saveManual `Math.round` | — |
| 4 | Mentés = upsert a `DailyStepLog` modellre (Funkc. leírás) | Implemented | repository.ts:upsert → storage.upsertDailyStepLog | — |
| 5 | Múltbeli napok szerkeszthetők ugyanezzel a szabállyal (Funkc. leírás) | Implemented | step-log-edit.page.ts:`applyDate(dateParam)`; step-log-edit.page.html:`[max]="todayIso"` (jövő tiltva, múlt engedve) | — |
| 6 | Kalória: nem külön képlet — Tápérték kalkulátor SSOT (`STEP_BASELINE` + Profile `m`) (Funkc. leírás) | Implemented | activity-kcal.ts:stepKcalForDay az egyetlen forrás; step-tracker.page.ts hívja | — |
| 7 | Konfliktus Samsunggal: manuális mindig nyer mentéskor; későbbi Samsung sync csak nagyobb értéket visz feljebb (Funkc. leírás) | Implemented | repository.ts:saveManual vs maxWinsUpsert | — |
| 8 | A Lépésszám követés képernyőn: mai érték szerkesztő + múltbeli lista / nap választó (UI/UX) | Implemented | step-tracker.page.html: Today `ion-input` + `pastDays()` + `addOtherDay()` → step-log-edit (`type="date"` picker) | — |
| 9 | Explicit Mentés; offline is menthető (UI/UX) | Implemented | step-tracker.page.html / step-log-edit.page.html `STEPS.SAVE` gomb; sqlite-storage-backend nem függ hálózattól | — |
| 10 | Mentés után TDEE / Étkezés keret frissül, ha számolható (UI/UX) | Implemented | step-tracker.page.ts:`todayKcal` computed (null ha nincs testsúly); meal-dashboard.page.ts reaktív újraszámolás | — |
| 11 | Manuális űrlap; helyi store upsert; TDEE újraszámolás (Arch/Frontend) | Implemented | step-log-edit.page.ts + repository.upsert + computed jelek | — |
| 12 | Backend-offline: olvasás/írás helyi store; create/update outbox (`OfflineQueueService`) + kliens UUID; napi `PENDING` deduplikáció | Implemented | sqlite-storage-backend.ts:upsertDailyStepLog; offline-queue.service.ts:buildEnqueueTasks (coalesce); repository:uuidV5 | — |
| 13 | Full-offline mentés támogatott (Backend-offline) | Implemented | sqlite-storage-backend.ts — csak helyi SQLite + outbox tranzakció, backend nem szükséges | — |
| 14 | Nincs külön backend érintettség (ugyanaz a `DailyStepLog` upsert a szülőben) (Arch/Backend) | Implemented | ugyanaz a `/api/daily-step-logs` endpoint; nincs subfeature-specifikus backend kód | — |

## documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md
| # | Spec-állítás (rövid idézet/parafrázis + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| 1 | Android Health Connect (Samsung Health adatforrás) lépésszámának átvétele (Jelenlegi működés) | Implemented | HealthConnectStepsPlugin.kt:readDailySteps `aggregate(StepsRecord.COUNT_TOTAL)`; health-connect-step-source.service.ts | — |
| 2 | Csak nagyobb érték írja felül a mentettet (Jelenlegi működés) | Implemented | repository.ts:maxWinsUpsert; daily-step-log.repository.spec.ts | — |
| 3 | iOS: későbbi scope (Jelenlegi működés) | Describes-future | nincs iOS natív modul; HealthConnectStepsPlugin.kt doc "iOS is a later scope" | Ref #2 |
| 4 | Nincs óránkénti sync (Jelenlegi működés) | Implemented | csak app-open/`resume` (activity-step-sync.service.ts:init) + 09:00 worker; nincs óránkénti ütemezés sehol | — |
| 5 | App megnyitás: lekéri a mai napi lépésszámot Health Connectből (Mikor kell sync 1) | Implemented | activity-step-sync.service.ts:syncNow `source.readDailySteps(todayIso)` → `maxWinsUpsert`; init() cold start + `App` `resume` listener | — |
| 6 | Önjavító backfill: elmúlt 7 naptári nap (ma nélkül), amelyikre nincs helyi `DailyStepLog` sor → lekéri és max-wins upsertolja (Mikor kell sync 1) | Implemented | step-sync-plan.ts:datesNeedingBackfill(todayIso, knownDates, 7); syncNow backfill ciklus; step-sync-plan.spec.ts; activity-step-sync.service.spec.ts "upserts today plus every gap day in the 7-day window" | — |
| 7 | A backfill véd a 08:00-as háttérfeladat OS-szintű elhalasztása/kilövése ellen; legkésőbb a következő app-nyitáskor pótlódik, amíg a HC retenció fedi (Mikor kell sync 1) | Implemented | step-sync-plan.ts doc; a backfill a tartalék út — a rationale mondat "08:00" hivatkozása elavult (a worker 09:00-kor fut, lásd #8) | Spec-átírás: "08:00" → "09:00" a rationale mondatban | 
| 8 | Napi 09:00 (kliens TZ) háttérfeladat: lekéri a tegnapi lépésszámot; a mai napot nem érinti (Mikor kell sync 2) | Implemented | ReminderScheduler.kt:`MORNING_HOUR = 9`; ReminderWorker.kt:stashYesterdaySteps (`yesterday = LocalDate.now().minusDays(1)`, csak tegnap) | — |
| 9 | Az Értesítések 08:00/20:00 háttér-workerével közös 09:00-as `AlarmManager` futásba összevonva (Mikor kell sync 2) | Implemented | ReminderScheduler.kt: `arm(SLOT_MORNING, 9)` + `arm(SLOT_EVENING, 20)`; közös ReminderWorker.kt (`SLOT_MORNING` → stash, `SLOT_EVENING` → STEPS_LOW) | — |
| 10 | A háttér-worker Kotlinból csak a `@capacitor/preferences` (`steps.pendingHealthConnect.<dátum>`) kulcsba stasheli a tegnapi értéket — nem ír SQLite-ba / outboxba (Mikor kell sync 2) | Implemented | ReminderWorker.kt:stashYesterdaySteps `prefs.edit().putString(PENDING_STEP_PREFIX + yesterday, ...)`; `PENDING_STEP_PREFIX = "steps.pendingHealthConnect."` | — |
| 11 | A következő app-nyitáskor az `ActivityStepSyncService` olvassa be és `maxWinsUpsert`-eli (a live HC-olvasás előtt) (Mikor kell sync 2) | Implemented | activity-step-sync.service.ts:syncNow `await this.drainPendingNativeReadings()` az engedélykapu és a live read ELŐTT; step-sync-plan.ts:drainPendingNativeStepReadings; activity-step-sync.service.spec.ts "folds in and clears the native worker step stashes before the live read" | — |
| 12 | Összehasonlítás: hiányzó nap = 0 (Mikor kell felülírni) | Implemented | repository.ts:stepsForDay `?? 0` | — |
| 13 | `healthConnectSteps > storedSteps` → mentés / upsert az új értékkel (Mikor kell felülírni) | Implemented | repository.ts:maxWinsUpsert `incoming <= stepsForDay(date)` különben `upsert` | — |
| 14 | `healthConnectSteps ≤ storedSteps` → nincs változtatás (Mikor kell felülírni) | Implemented | repository.ts:maxWinsUpsert korai return; daily-step-log.repository.spec.ts | — |
| 15 | Manuális mentés mindig engedi a tetszőleges (akár kisebb) értéket; a következő sync csak nagyobb HC-t visz feljebb (Mikor kell felülírni) | Implemented | repository.ts:saveManual (feltétel nélkül) vs maxWinsUpsert | — |
| 16 | Kanonikus képlet: `max(0, steps - 3000) × m × 0.00045`; a "steps × m × 0.00045" baseline nélkül nem érvényes (Kalória) | Implemented | activity-kcal.ts:stepKcalForDay | — |
| 17 | Android Health Connect; háttér: natív `AlarmManager` + `WorkManager` (`ReminderWorker`, Értesítések körrel közös) a 09:00-as tegnapi stashhez (Platform) | Implemented | ReminderScheduler.kt (AlarmManager) → ReminderWorker.kt (CoroutineWorker); ProfileInstaller/WorkManager wiring | — |
| 18 | A `@capacitor/background-runner` nem került be (Platform) | Implemented (pontos állítás) | nincs ilyen függőség a package.json-ban; activity-step-sync.service.ts doc megerősíti | — |
| 19 | Engedélykérés UI; megtagadás esetén csak manuális út marad (Platform) | Implemented | step-tracker.page.html:`HC_GRANT` gomb (denied ág); activity-step-sync.service.ts:syncNow `if (this.permission() !== 'granted') return` a drain után | — |
| 20 | A háttér-olvasáshoz `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND` grant is kell (Platform) | Implemented | AndroidManifest.xml:98 `READ_HEALTH_DATA_IN_BACKGROUND`; ReminderWorker.kt:aggregateSteps ellenőrzi `PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND` + `getReadPermission(StepsRecord)` | — |
| 21 | Külön "háttér-hozzáférés" prompt a Lépésszám képernyőn, csak a foreground `READ_STEPS` után kérhető (Platform) | Implemented | activity-step-sync.service.ts:requestBackgroundPermission `if (this.permission() !== 'granted') return`; step-tracker.page.html:`HC_BG_GRANT` csak a `granted` ágban; HealthConnectStepsPlugin.kt:requestBackgroundPermission | — |
| 22 | Megtagadva a 09:00-as stash és a STEPS_LOW esti értékelése kimarad, a manuális + app-nyitáskori út marad (Platform) | Implemented | ReminderWorker.kt:aggregateSteps null-t ad bg grant nélkül → stashYesterdaySteps és evaluateStepsLow is kihagy; foreground + app-open backfill megmarad | — |
| 23 | Engedély / "utolsó sync" jelzés a Lépésszám követés képernyőn (UI/UX) | Implemented | step-tracker.page.html:`HC_GRANTED` + `HC_LAST_SYNC` (`lastSyncAt`); activity-step-sync.service.ts:`LAST_SYNC_KEY` Preferences | — |
| 24 | Nincs külön kötelező sync gomb: app-nyitás + `resume` az elsődleges (UI/UX) | Implemented | activity-step-sync.service.ts:init() (main.ts cold start) + `App.addListener('resume', ...)` | — |
| 25 | Opcionális "Frissítés most" gomb (a foreground engedély után), ami a `syncNow()` kört (mai nap + 7 napos backfill) futtatja (UI/UX) | Implemented | step-tracker.page.ts:refreshNow → `stepSync.syncNow()`; step-tracker.page.html:`HC_REFRESH_NOW` a `granted` ágban; IMPLEMENTATION_STATUS.md "„Frissítés most" gomb — Kész (2026-09-01)". Megj.: a `refreshNow()` JSDoc még "későbbi scope"-nak jelöli — elavult kód-komment, nem spec-eltérés | — |
| 26 | A Health Connect hívás a kliensről megy (nincs backend proxy) (Megjegyzések) | Implemented | health-connect.plugin.ts:`registerPlugin('HealthConnectSteps')`; nincs proxy endpoint | — |
| 27 | Saját backendre írás outboxon keresztül (Megjegyzések) | Implemented | repository.maxWinsUpsert → upsert → sqlite-storage-backend outbox task | — |
| 28 | HC plugin: app-lokális Capacitor plugin (`HealthConnectStepsPlugin`, Kotlin, `androidx.health.connect:connect-client`), csak olvasás — elérhetőség, READ_STEPS grant, napi aggregátum (`StepsRecord.COUNT_TOTAL`) (Arch/Frontend) | Implemented | HealthConnectStepsPlugin.kt (`@CapacitorPlugin(name="HealthConnectSteps")`, `isAvailable`/`checkPermission`/`readDailySteps` `COUNT_TOTAL`); MainActivity.java:`registerPlugin(HealthConnectStepsPlugin.class)` | — |
| 29 | `ActivityStepSyncService`: max-wins upsert a helyi `DailyStepLog`-ra (`DailyStepLogRepository.maxWinsUpsert`) (Arch/Frontend) | Implemented | activity-step-sync.service.ts:syncNow → `this.repository.maxWinsUpsert(...)` | — |
| 30 | App lifecycle: cold/warm start → `steps.pendingHealthConnect.*` stashek beolvasása → mai sync + 7 napos hiánypótló backfill (csak a `DailyStepLog` nélküli napokra) (Arch/Frontend) | Implemented | activity-step-sync.service.ts:init() (cold) + resume; syncNow sorrend: drain → live today → backfill (`datesNeedingBackfill` gap-only) | — |
| 31 | Scheduled 09:00 háttér-worker → tegnapi lépésszám prefbe stashelése (nincs közvetlen store-írás) (Arch/Frontend) | Implemented | ReminderWorker.kt:stashYesterdaySteps | — |
| 32 | TDEE újraszámolás sikeres nagyobb upsert után (Arch/Frontend) | Implemented | reaktív: repository.items signal → step-tracker `todayKcal` computed; refreshNow újratölt; meal-dashboard ionViewWillEnter | — |
| 33 | Backend-offline: HC olvasás Backend-offline és Full-offline is (helyi API) (Backend-offline) | Implemented | HealthConnectStepsPlugin.kt helyi hívás; health-connect-step-source.service.ts web → no-op | — |
| 34 | A 09:00-as háttér-worker (natív, DI nélküli, JS-mentes kontextus) csak a `@capacitor/preferences` fájlba stashel (Backend-offline) | Implemented | ReminderWorker.kt: `SharedPreferences("CapacitorStorage")` írás, nincs SQLite/outbox hozzáférés | — |
| 35 | Saját backend írás: outbox; ugyanarra a napra `PENDING` payload frissítése az új (nagyobb) `stepCount`-tal (Backend-offline) | Implemented | offline-queue.service.ts:buildEnqueueTasks coalesce azonos `targetEntityId`-re | — |
| 36 | Sync: Szinkronizációs központ (Backend-offline) | Implemented | általános sync-center | — |
| 37 | Backend: ugyanaz a `DailyStepLog` upsert; szerveroldali max-wins opcionális (kliens már max-wins) (Arch/Backend) | Implemented | DailyStepLogService: sima last-write-wins upsert; DailyStepLogIntegrationTest:createIsIdempotent_andLastWriteWins_evenWithASmallerValue | — |

## Rollup
- Állítások összesen: 82 — Implemented 80 / Partial 0 / Missing 0 / Describes-future 2 / Accepted-limitation 0
- Blokkoló eltérések (spec szerint kész, kód nincs, NEM jövő-címkés): [] (nincs)
- Draft jegyek: [] (nincs — az egyetlen jövő-scope állítás, iOS Health lépés-forrás, a meglévő #2 jegy alá esik)
- Spec-átírás vázlat:
  - **Lépésszám követés.md**
    - Nincs érdemi átírás: a `### Jelenlegi működés` / `### Funkcionális leírás` / `#### Backend-offline` már jelen időben, a kódot pontosan írja le.
    - "Megjegyzések" — az "iOS Health: későbbi scope" maradhat (legitim jövő-scope, #2 fedi); esetleg egészítsük ki "(lásd #2 backlog jegy)"-gyel.
    - Opcionálisan: "20:00-kor, ha a mai `stepCount` < 2000" mellé a küszöb konfigurálható (`NotificationTuningService.stepsLowThreshold`, alap 2000) — jelenleg a spec fixként írja.
  - **Lépésszám kézzel manuálisan megadása.md**
    - Nincs átírás: minden állítás jelen idejű és fedett.
  - **Lépésszám átszinkronizálása a Samsung Health-ből.md**
    - "Mikor kell sync" 1. pont rationale-mondatában a "08:00-as háttérfeladat" → "09:00-as háttérfeladat" (a `ReminderScheduler.MORNING_HOUR = 9`; a 2. pont már helyesen 09:00-at ír — belső ellentmondás).
    - "UI/UX elvárások" — a "Frissítés most" gomb már él; a spec szövege ("van egy opcionális … gomb") helyes, csak a hozzá tartozó `refreshNow()` JSDoc-komment elavult a kódban ("(opcionális, későbbi scope)") — kód-oldali takarítás, nem spec.
    - Egyebekben a spec jelen idejű és a kódot pontosan írja le.
- Verdikt: GREEN
