---
id: 169
type: feature
status: ready
title: Nyújtó session — vezetett időzítős élő nézet, napló, MET-kalória
specs:
  - "[[Edzésnapló]]"
  - "[[Heti terv]]"
  - "[[Tápérték kalkulátor]]"
flag: edzes.nyujtas
created: 2026-10-17
closed:
---

# 169 — Nyújtó session — vezetett időzítős élő nézet, napló, MET-kalória

> Függ: [[167-nyujto-gyakorlat-katalogus]], [[168-nyujto-sablonok]]. Követi:
> [[170-eroesito-sablonhoz-csatolt-nyujtas]].

## Motiváció / probléma

Egy nyújtó sablont végig kell tudni csinálni úgy, hogy közben ne kelljen a telefont nyomkodni.
Az időzítő számolja a tartást, és jelez oldal- és tételváltásnál. Az elvégzett nyújtás látsszon az
előzményben és a heti nézetben, és számoljon kalóriát, mint a többi napló.

## Jelenlegi működés

Nyújtó session nincs. Az [[Edzésnapló]] élő nézete (`active-workout.page.ts`) szett-alapú, pipás,
pihenő-időzítővel; a draft helyi store-ban túléli az app-kill-t.

## Elfogadási kritériumok

- [ ] Új, user-owned entitás **`StretchSession`**: `id`, `date`, `startTime` / `endTime`,
      `durationMinutes` (> 0; alapból a mért idő, kézzel felülírható), `stretchPlanId` (opcionális →
      `StretchPlan`; `null` = ad-hoc), `workoutSessionId` (opcionális → `WorkoutSession`; a
      [[170-eroesito-sablonhoz-csatolt-nyujtas]] tölti), `notes`, `deleted`, audit.
      Nested **`StretchSessionItem`**: `id`, `stretchExerciseId` (opcionális), snapshot `stretchName` /
      `stretchCategory`, `orderIndex`, `holdSeconds`, `perSide`, `repetitions`, `completed` (boolean).
      Nested aggregate PUT, sync delta, helyi séma, outbox.
- [ ] **Élő, vezetett nézet:** a sablon tételei sorban. Tételenként visszaszámláló (`holdSeconds`).
      `perSide`-nál „Bal” → „Jobb” fázis, `repetitions`-szer ismételve. Fázisok között rövid
      átállási visszaszámlálás (konstans, pl. 5 mp). Fázisváltáskor és a végén haptic + hang (a Rest
      Timer mintájára). Képernyő-ébrentartás a session alatt.
      Vezérlők (thumb-zone): Szünet / Folytatás, Kihagyás (a tétel `completed = false`), Vissza,
      Befejezés. A kijelzőn a gyakorlat neve, leírása, az oldal, a hátralévő idő, valamint a
      „következő: …” előnézet.
- [ ] **Draft-tartósság:** az aktív nyújtó session állapota (aktuális tétel / fázis / hátralévő idő)
      helyi store-ban, app-kill vagy háttér után helyreáll. Ilyenkor szüneteltetve indul, nem
      fut tovább „láthatatlanul”. Egyszerre legfeljebb egy aktív nyújtó draft lehet; az erősítő
      drafttól független.
- [ ] **Indítási pontok:** az Edzésnapló „Terv indítása…” action sheetje a nyújtó sablonokat is
      felkínálja külön csoportban („Nyújtás · <név>”). A heti nézet mai sorában, `STRETCH`
      felülírásnál „Nyújtás indítása” gomb. Ad-hoc „Új nyújtás” (üres session + nyújtó picker).
- [ ] **Napló:** az Edzésnapló lista időrendben összefésülve a nyújtó sessionöket is mutatja,
      megkülönböztető jelöléssel („Nyújtás · <sablon>”, időtartam, kcal). Szerkeszthető és törölhető
      (soft delete; nem szinkronizált draft → hard remove + outbox purge).
- [ ] **Terhelés:** a nyújtó session **nem** terhelő nap. A `training-load.ts` `rest`-je változatlan
      (csak mászás és erősítő edzés tör pihenőt). A heti nézet múltbeli soraiban „Nyújtás” jelvény
      jelenik meg, a „Pihenő” jelvény megmarad mellette.
- [ ] **Kalória:** nettó MET **1.3** (bruttó 2.3 = Compendium, enyhe nyújtás, − 1 nyugalmi, a
      röplabdánál bevezetett és a [[164-met-brutto-netto-dupla-szamolas]] irányába mutató nettó
      konvenció szerint): `kcal = 1.3 × m × durationMinutes / 60`. Beleszámít az aznapi
      `activityExtraKcal`-ba. A MET-tábla a [[Tápérték kalkulátor]]ban is szerepel.
- [ ] Specek: [[Edzésnapló]] (új „Nyújtó session” szakasz vagy saját subfeature-spec, ha túl nagy),
      [[Heti terv]] (jelvény, indítás), [[Tápérték kalkulátor]] (MET); `#### Backend-offline`.

## Terv / döntési napló

- 2026-10-17 — Vezetett időzítő + napló; a nyújtó sessionre az aktív/passzív MET egyszerűsítés nem kell,
  a teljes `durationMinutes`-re 1.3 nettó MET. (Felhasználói döntés: időzítő + napló, kalória igen.)
- 2026-10-17 — Külön `StretchSession`, nem `WorkoutSession.workoutType = STRETCH`: így a terhelés-,
  rotáció-, volumen- és PR-logika érintetlen, és a „nyújtó nap = pihenőnap” szabály magától teljesül.
- Spec-elhelyezés implementáláskor: ha az [[Edzésnapló]] spec túlnő, új subfeature-spec
  („Nyújtás”) a [[SPEC-TEMPLATE]] szerint, [[Edzés]] alá linkelve.

- 2026-10-17 — Képernyő ébren tartása a böngésző **Screen Wake Lock API**-jával (`navigator.wakeLock`,
  Android WebView-ban elérhető). Nincs új Capacitor plugin; ha az API hiányzik, a funkció
  csendben kimarad.
- 2026-10-17 — Az időzítő falióra-alapú (`phaseEndsAtMs`, mint a stopper `startedAtMs`-e), nem
  tick-számláló. Így háttérbe kerülés után sem csúszik el. A draft csak fázisváltáskor és
  szüneteltetéskor íródik, nem tickenként.

### Implementációs terv (2026-10-17)

Várható verziók (commit előtt újraellenőrizni): Flyway `V59`, `SCHEMA_V54`, outbox `v24`.

1. **Flyway `V59__stretch_session.sql`**
   - `stretch_session` tábla: `id`, `user_id`, `session_date`, `start_time`, `end_time`,
     `duration_minutes CHECK (> 0 AND ≤ 240)`, `stretch_plan_id` FK nullable,
     `workout_session_id` FK nullable, `notes`, `deleted`, audit.
     Indexek: `(user_id, updated_at)`, `(user_id, session_date)`, `(workout_session_id)`.
   - `stretch_session_item` tábla: `session_id` FK, `stretch_exercise_id` FK nullable,
     `stretch_name`, `stretch_category` (CHECK), `order_index`, `hold_seconds`, `per_side`,
     `repetitions`, `completed`, `deleted`, audit.
   - View + `StretchSession` és `StretchSessionItem`.
2. **OpenAPI + Java**
   - `StretchSession.yaml` (nested `items`), `StretchSessionItem.yaml`, `StretchSessionList.yaml`,
     `/api/stretch-sessions[/{id}]`.
   - `StretchSession*` entity / service (`saveTree`) / controller / sync loaderek. Idegen
     `stretchPlanId` / `workoutSessionId` → 404.
   - Unit- és integration tesztek.
3. **Frontend adatréteg**
   - `gen:api`, `SCHEMA_V54`, local-rows, `saveStretchSession()` id-diff tranzakció, HTTP backend,
     sync-engine ágak, registry.
   - outbox **v24** identity.
   - `core/data/stretch-session.repository.ts`: `items()`, `save`, `delete`,
     `byWorkoutSession(id)`.
4. **Idővonal (pure):** `pages/workout/stretch/stretch-timeline.ts`
   - `buildTimeline(items)`: lapos `Phase[]`. Egy fázis mezői: `itemIndex`, `rep`,
     `side: 'LEFT' | 'RIGHT' | null`, `kind: 'HOLD' | 'TRANSITION'`, `seconds`. Átállás a tartások
     között, az első előtt egy „Készülj” átállás.
   - Navigáció: `nextPhase`, `previousPhase`, `skipItem`.
   - `completedItems(timeline, reachedPhase, skipped)`.
   - `stretch-timeline.spec.ts`: oldalanként / ismétlés / kihagyás / vissza / utolsó fázis.
5. **Draft:** `core/data/stretch-draft.service.ts`, a `WorkoutDraftService` mintája.
   - Tárolás: `Preferences` kulcs `lm2_stretch_draft`.
   - Tartalom: `sessionId`, `date`, `startedAtMs`, `stretchPlanId`, `workoutSessionId`, `items`,
     `phaseIndex`, `phaseEndsAtMs | pausedRemainingMs`, `skippedItemIndexes`, `pausedMs`.
   - `restore()` mindig szüneteltetett állapotba tölt.
6. **Közös segédek**
   - A rest-timer WebAudio beep és haptic kiemelése az `active-workout.page.ts`-ből egy
     `shared/alert-tone.ts`-be (`playBeep()`, `notifyHaptic()`), egy újrahasznált `AudioContext`-tel.
     Az `active-workout` is ezt használja; viselkedése nem változik.
   - `shared/screen-wake-lock.ts`: `acquire()` / `release()`, `visibilitychange`-re újrakér.
7. **Élő nézet:** `pages/workout/stretch/active-stretch.page.ts/.html`
   - Route: `/tabs/workout/log/stretch/active?stretchPlanId=&workoutSessionId=`,
     `featureFlagGuard('edzes.nyujtas')`.
   - Indulás: draft, ha van; különben a sablonból (tételek snapshot-másolata) vagy üresen.
   - Kijelző: nagy visszaszámláló, név, leírás, oldal-felirat, „következő: …”, haladás (N / M).
   - Vezérlők az alsó harmadban: Szünet / Folytatás, Vissza, Kihagyás, Befejezés. Ad-hoc módban
     „+ Nyújtás” (picker a 168-ból).
   - 250 ms-os `setInterval`, a falióra alapján. Fázisváltáskor beep + haptic, a draft mentése.
   - Befejezés: összegző (időtartam percben, felfelé kerekítve, ≥ 1, szerkeszthető; megjegyzés) →
     `StretchSessionRepository.save`. Utána `navigateBack('/tabs/workout/log')` (`backlog/148`).
     Elvetés megerősítéssel.
8. **Utólagos szerkesztő:** `pages/workout/stretch/stretch-session-edit.page.ts`
   (`/log/stretch/:id`). Mezők: dátum, kezdés, időtartam, megjegyzés, tételenként `completed`
   toggle. Törlés megerősítéssel.
9. **Belépők**
   - `plan-quick-start.component.ts` „Terv indítása…”: nyújtó csoport „Nyújtás · <név>”.
   - A dashboardon „Nyújtás folytatása”, ha van nyújtó draft.
   - `workout-log-list.page`: „Új nyújtás” (ad-hoc) belépő.
   - `weekly-plan.page.ts`: a mai `STRETCH` felülírású sor „Nyújtás indítása” gombja.
10. **Napló lista** (`workout-log-list.page.ts`): diszkriminált, dátum szerint csökkenő
    összefésülés. A nyújtó sor: „Nyújtás · <sablon / Ad-hoc>”, időtartam, kcal; tap a nyújtó
    szerkesztőre visz.
11. **Kalória**
    - `pages/workout/stretch/stretch-metrics.ts`: `STRETCH_NET_MET = 1.3`, `stretchKcal(session, m)`.
    - `core/data/activity-kcal.ts`: `stretchKcalForDay`. Bekötés mind a négy fogyasztóba, ahol a
      `volleyballKcalForDay` is szerepel: `today-workouts.service.ts` (+ `stretch` tally),
      `today-nutrition.service.ts`, `meal-dashboard.page.ts`, `notification-scheduler.service.ts`.
    - Ha a Kezdőlap edzés-widget típusonként listáz, a `home-widget-registry.ts` kap egy
      `stretch` sort (`edzes.nyujtas` flaggel).
12. **Heti jelvény**
    - `training-load.ts` `DayLoad` + `stretch: number`. A `rest` számítás változatlan.
    - `weekly-plan.page` „Nyújtás” jelvény; múltbeli napon a „Pihenő” mellett marad.
    - Tesztek: `training-load.spec.ts` (nyújtás nem töri a pihenőt).
13. **Tesztek**: timeline, metrics, activity-kcal, draft service, `active-stretch.page.spec.ts`
    (indulás sablonból, fázisléptetés fake clockkal, szünet, kihagyás → `completed = false`,
    befejezés ment, restore szüneteltetve), edit page, log-list összefésülés, sync / local-rows.
14. **Lezárás**:
    - új subfeature-spec `documentation/Subfeatures/Nyújtás.md` a [[SPEC-TEMPLATE]] szerint
      (session, időzítő, napló, kcal, Backend-offline), [[Edzés]] alá linkelve;
    - [[Edzésnapló]] (lista + belépők), [[Heti terv]] (jelvény, indítás),
      [[Tápérték kalkulátor]] (MET);
    - gate, status, archiválás.

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] — …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #169 nyújtó session
- Kód: `workout` (backend), `pages/workout/stretch/` (új), `training-load.ts`, local schema, outbox
