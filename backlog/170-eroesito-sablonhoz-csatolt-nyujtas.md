---
id: 170
type: feature
status: ready
title: Erősítő sablonhoz csatolt nyújtó sablon — edzés végén felajánlott nyújtás
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag: edzes.nyujtas
created: 2026-10-17
closed:
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

- [ ] `WorkoutPlan.stretchPlanId`: opcionális UUID → `StretchPlan` (**hivatkozás, nem tulajdonlás**).
      Backend: Flyway nullable FK oszlop `workout_plan.stretch_plan_id`, OpenAPI, mapper. Helyi
      séma, outbox payload verzió + migrációs lépés (`stretchPlanId: null`), `verify:outbox`.
- [ ] Erősítő sablon-szerkesztő: „Nyújtás az edzés után” választó (egy darab, csak aktív nyújtó
      sablon, „Nincs” opcióval). Egy nyújtó sablon **több** erősítő sablonhoz is csatolható.
      A sablon listában a soron „· + Nyújtás: <név>” utótag.
- [ ] **Életciklus:** a nyújtó sablon módosítása mindenhol érvényes, ahol csatolva van (élő
      hivatkozás, nincs másolat). Inaktív nyújtó sablon csatolva marad és működik, a szerkesztő
      „inaktív” jelzést mutat; a picker újraválasztásra nem kínálja fel. **Törölt** nyújtó sablont
      a csatolás figyelmen kívül hagy (mintha nem lenne). A nyújtó sablon törlés-dialógusa
      jelzi, ha erősítő sablon(ok) hivatkoznak rá („N erősítő sablonhoz csatolva”).
      A nyújtó sablon törlése nem módosítja az erősítő sablonokat (nincs cascade-írás); a szerkesztő
      következő mentésekor a törölt hivatkozás `null`-ra tisztul.
- [ ] **Edzés vége:** ha a session `planId`-jéhez tartozó erősítő sablonnak van élő csatolt
      nyújtó sablonja, a „Befejezés” mentése **után** egy lap jelenik meg:
      „Nyújtás: <sablon> (~N perc) — **Indítás** / **Később**”.
      - Indítás → a [[169-nyujto-session-vezetett-idozito-es-naplo]] élő nézete a nyújtó sablonnal,
        `workoutSessionId` = az épp mentett erősítő session.
      - Később → az Edzésnapló dashboardon **aznap** megjelenik egy „Nyújtás indítása: <sablon>”
        kártya, amíg aznapra nincs a sessionhöz kötött nyújtó session, vagy a kártyát el nem
        rejtem (×). Az állapot a sessionből származik (`workoutSessionId`-re szűrve), nem külön
        tárolt flag.
      - Az erősítő session a nyújtástól függetlenül mentve van; a nyújtás elmaradása semmit nem ront.
- [ ] Ad-hoc (terv nélküli) erősítő edzés után nincs felajánlás.
- [ ] Specek: [[Heti terv]] (`stretchPlanId`, életciklus), [[Edzésnapló]] (befejezés utáni flow,
      dashboard-kártya); `#### Backend-offline` (outbox verzió).

## Terv / döntési napló

- 2026-10-17 — Felajánlás (Indítás / Később), nem automatikus indítás: a mentés és a nyújtás
  szétválik, egy félbehagyott nyújtás nem veszélyezteti az edzésnaplót. (Felhasználói döntés.)
- 2026-10-17 — Hivatkozás FK-val, nem nested child: a nyújtó sablon saját életciklusú, megosztható
  entitás. (Felhasználói igény: „nem az erősítő sablon fogja tulajdonolni”.)
- 2026-10-17 — Az inaktiválás a csatolást nem bontja: az `active` a pickerek és a lista szűrésére
  szolgál, ahogy a [[Heti terv]]ben a kézi felülírás / múltbeli `planId` is érvényes marad inaktív
  sablonra.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] — …; [[Edzésnapló]] — …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #170 csatolt nyújtás
- Kód: `workout` (backend), `pages/workout/plan/plan-edit.page.ts`, `pages/workout/log/active-workout.page.ts`, local schema, outbox migrator
