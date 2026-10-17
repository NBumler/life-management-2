---
id: 170
type: feature
status: done
title: Erősítő sablonhoz csatolt nyújtó sablon — edzés végén felajánlott nyújtás
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag: edzes.nyujtas
created: 2026-10-17
closed: 2026-10-17
---

# 170 — Erősítő sablonhoz csatolt nyújtó sablon — edzés végén felajánlott nyújtás

> Függ: [[168-nyujto-sablonok]], [[169-nyujto-session-vezetett-idozito-es-naplo]].

## Motiváció / probléma

Egy erősítő edzés után legtöbbször ugyanaz a nyújtás jön. Az erősítő sablonhoz egy nyújtó sablont
akarok csatolni, hogy az edzés befejezése után az induljon. A nyújtó sablon nem az erősítő sablon
része, csak hivatkozott: több erősítő sablon is ugyanazt használhatja.

## Jelenlegi működés

[[Heti terv]] `WorkoutPlan`: nincs hivatkozás nyújtásra. [[Edzésnapló]] „Befejezés”
(`active-workout.page.ts` `finish()`): elmenti a sessiont, majd visszanavigál.

## Elfogadási kritériumok

- [x] `WorkoutPlan.stretchPlanId`: opcionális UUID → `StretchPlan` (**hivatkozás, nem tulajdonlás**).
      Backend: Flyway nullable FK oszlop `workout_plan.stretch_plan_id`, OpenAPI, mapper. Helyi
      séma, outbox payload verzió + migrációs lépés (`stretchPlanId: null`), `verify:outbox`.
- [x] Erősítő sablon-szerkesztő: „Nyújtás az edzés után” választó (egy darab, csak aktív nyújtó
      sablon, „Nincs” opcióval). Egy nyújtó sablon **több** erősítő sablonhoz is csatolható.
      A sablon listában a soron „· + Nyújtás: <név>” utótag.
- [x] **Életciklus:** a nyújtó sablon módosítása mindenhol érvényes, ahol csatolva van (élő
      hivatkozás, nincs másolat). Inaktív nyújtó sablon csatolva marad és működik, a szerkesztő
      „inaktív” jelzést mutat; a picker újraválasztásra nem kínálja fel. **Törölt** nyújtó sablont
      a csatolás figyelmen kívül hagy (mintha nem lenne). A nyújtó sablon törlés-dialógusa
      jelzi, ha erősítő sablon(ok) hivatkoznak rá („N erősítő sablonhoz csatolva”).
      A nyújtó sablon törlése nem módosítja az erősítő sablonokat (nincs cascade-írás); a szerkesztő
      következő mentésekor a törölt hivatkozás `null`-ra tisztul.
- [x] **Edzés vége:** ha a session `planId`-jéhez tartozó erősítő sablonnak van élő csatolt
      nyújtó sablonja, a „Befejezés” mentése **után** egy lap jelenik meg:
      „Nyújtás: <sablon> (~N perc) — **Indítás** / **Később**”.
      - Indítás → a [[169-nyujto-session-vezetett-idozito-es-naplo]] élő nézete a nyújtó sablonnal,
        `workoutSessionId` = az épp mentett erősítő session.
      - Később → az Edzésnapló dashboardon **aznap** megjelenik egy „Nyújtás indítása: <sablon>”
        kártya, amíg aznapra nincs a sessionhöz kötött nyújtó session, vagy a kártyát el nem
        rejtem (×). Az állapot a sessionből származik (`workoutSessionId`-re szűrve), nem külön
        tárolt flag.
      - Az erősítő session a nyújtástól függetlenül mentve van; a nyújtás elmaradása semmit nem ront.
- [x] Ad-hoc (terv nélküli) erősítő edzés után nincs felajánlás.
- [x] Specek: [[Heti terv]] (`stretchPlanId`, életciklus), [[Edzésnapló]] (befejezés utáni flow,
      dashboard-kártya); `#### Backend-offline` (outbox verzió).

## Terv / döntési napló

- 2026-10-17 — Felajánlás (Indítás / Később), nem automatikus indítás: a mentés és a nyújtás
  szétválik, egy félbehagyott nyújtás nem veszélyezteti az edzésnaplót. (Felhasználói döntés.)
- 2026-10-17 — Hivatkozás FK-val, nem nested child: a nyújtó sablon saját életciklusú, megosztható
  entitás. (Felhasználói igény: „nem az erősítő sablon fogja tulajdonolni”.)
- 2026-10-17 — Az inaktiválás a csatolást nem bontja: az `active` a pickerek és a lista szűrésére
  szolgál, ahogy a [[Heti terv]]ben a kézi felülírás / múltbeli `planId` is érvényes marad inaktív
  sablonra.

- 2026-10-17 — A „Később” kártya elrejtése (×) eszköz-lokális megjelenítési állapot: `Preferences`, a
  rejtett `workoutSessionId`-k listája, mai napra szűrve. A „van-e még nyújtás” állapot ettől függetlenül
  a `StretchSession.workoutSessionId`-ből származik.

### Implementációs terv (2026-10-17)

Várható verziók (commit előtt újraellenőrizni): Flyway `V60`, `SCHEMA_V55`, outbox `v25`.

1. **Flyway `V60__workout_plan_stretch_plan.sql`:** `ALTER TABLE workout_plan ADD COLUMN
   stretch_plan_id uuid REFERENCES stretch_plan (id)`, nullable.
2. **OpenAPI / Java**
   - `WorkoutPlan.yaml` + nullable `stretchPlanId`; `WorkoutPlanMapper`.
   - `WorkoutPlanService.saveTree`: nem saját vagy nem létező nyújtó sablon → 404. Törölt nyújtó
     sablonra mutató érték elfogadott (FK él); a kliens tisztítja.
   - `WorkoutPlanIntegrationTest` bővítés.
3. **Frontend adatréteg**
   - `gen:api`.
   - `SCHEMA_V55`: `ALTER TABLE workout_plan ADD COLUMN stretch_plan_id TEXT`.
   - `local-rows.ts` workout plan row ↔ DTO; a `workoutPlanApplyTasks` és a
     `workoutPlanLocalWriteTask` viszi az oszlopot.
   - outbox **v25** identity (opcionális mező, hiánya = `null`). `verify:outbox -- --write`.
4. **Pure helper:** `pages/workout/stretch/linked-stretch.ts`.
   - `linkedStretchPlan(plan, stretchPlans)`: élő (nem törölt) nyújtó sablon vagy `null`; az
     inaktív is érvényes.
   - `pendingLinkedStretches(today, sessions, plans, stretchPlans, stretchSessions, dismissed)`:
     a mai, sablonos erősítő sessionök, amelyeknek van csatolt nyújtásuk, de nincs hozzájuk kötött
     élő `StretchSession`.
   - Spec: törölt / inaktív / ad-hoc / már elvégzett / elrejtett esetek.
5. **Sablon-szerkesztő** (`plan-edit.page.ts/.html`)
   - „Nyújtás az edzés után” `ion-select`, csak `edzes.nyujtas` mellett.
   - Opciók: „Nincs” + aktív nyújtó sablonok. A jelenlegi inaktív csatolás „(inaktív)” címkével
     megjelenik.
   - Törölt hivatkozás → a mező „Nincs”-et mutat, és mentéskor `null`.
   - `plan-list.page`: alcím-utótag „· + Nyújtás: <név>”.
6. **Nyújtó sablon törlése** (`stretch-plan-edit.page.ts`): a megerősítő szöveg a hivatkozó élő
   erősítő sablonok számával bővül (`WorkoutPlanRepository.items()` szűrése).
7. **Edzés vége** (`active-workout.page.ts` `finish()`)
   - Mentés után, ha a draft `planId`-jére a `linkedStretchPlan` nem `null` → alert / action sheet:
     „Nyújtás: <név> (~N perc)” (`stretchPlanDurationSeconds`).
   - **Indítás:** `navigateRoot`-szerű csere az `active-stretch` route-ra (`stretchPlanId`,
     `workoutSessionId`), hogy a vissza gomb ne az üres élő edzésre vigyen. A `backlog/148`
     navigációs szabályt ellenőrizni.
   - **Később:** a meglévő `navigateBack('/tabs/workout/log')`.
   - Ha van már folyamatban lévő nyújtó draft, az „Indítás” előbb rákérdez az elvetésére.
8. **Dashboard-kártya**
   - `workout-log-list.page` / `plan-quick-start`: „Nyújtás indítása: <név>” kártya a
     `pendingLinkedStretches` alapján. × → a `Preferences` rejtett-lista.
   - Az élő nyújtásból mentett session `workoutSessionId`-je zárja a kártyát.
9. **Tesztek**:
   - `linked-stretch.spec.ts`;
   - `active-workout.page.spec.ts`: finish csatolással / nélküle / ad-hoc; Indítás navigációja,
     Később;
   - `plan-edit.page.spec.ts`: select, inaktív címke, törölt → null;
   - log-list kártya; local-rows / sync spec.
10. **Lezárás**:
    - [[Heti terv]] (`stretchPlanId`, életciklus), [[Edzésnapló]] (befejezés utáni flow, kártya),
      `Nyújtás` spec (a 169-ből) kereszthivatkozás;
    - gate, status, archiválás.

- 2026-10-17 — Implementáláskor: a felajánlás egy alert (Indítás / Később), a háttérre koppintás „Később”-nek számít.
  Indításkor előbb `navigateBack` a listára, majd `navigateForward` a nyújtásra — így az élő edzés oldala lekerül
  az Ionic stackről (`backlog/148`).
- 2026-10-17 — Implementáláskor: a `WorkoutPlanDraft.stretchPlanId` opcionális (hiánya = `null`), így a meglévő
  draft-építők (pl. a csoport-aktiválás `setActive`-ja, ami explicit továbbadja) nem igényeltek módosítást.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] — `stretchPlanId` mező és életciklus, szerkesztő-választó, lista-utótag,
  törlés-figyelmeztetés, Backend-offline (`SCHEMA_V55`, outbox v25), Backend (`V60`); [[Edzésnapló]] — befejezés
  utáni felajánlás, „Nyújtás az edzés után” kártya; [[Nyújtás]] — indítási pontok.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #170 csatolt nyújtás
- Kód: `WorkoutPlan*` (backend), `V60__workout_plan_stretch_plan.sql`, `pages/workout/stretch/linked-stretch.ts`,
  `core/data/stretch-offer-dismissals.service.ts`, `pages/workout/plan/` (szerkesztő, lista, nyújtó törlés),
  `pages/workout/log/active-workout.page.ts`, `workout-log-list.page.*`, local schema, outbox migrator
