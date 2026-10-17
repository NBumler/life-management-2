---
id: 168
type: feature
status: ready
title: Nyújtó sablonok — StretchPlan, aktív/inaktív, rotáción kívül, heti „Nyújtás” felülírás
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag: edzes.nyujtas
created: 2026-10-17
closed:
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

- [ ] **Meglévő sablonok = erősítő sablonok:** adatmigráció nélkül; a `workout_plan` tábla az erősítő
      sablonok tábla. UI: „Erősítő sablon” / „Nyújtó sablon”.
- [ ] Új, user-owned entitás **`StretchPlan`**: `id`, `name` (kötelező, egyedi a user élő nyújtó
      sablonjai között), `notes`, `active` (default `true`), `goalLabel` (opcionális, mint a
      `WorkoutPlan`-nál), `deleted`, audit. Nincs `inRotation`, mert a nyújtó sablon soha nem rotál.
- [ ] Nested gyerek **`StretchPlanItem`**: `id`, `stretchExerciseId` → [[Gyakorlat]] `StretchExercise`,
      snapshot `stretchName` / `stretchCategory` (mint a `WorkoutPlanExercise`), `orderIndex`,
      `holdSeconds` (kötelező, > 0; alapból 30), `perSide` (boolean; `true` → bal, majd jobb oldal),
      `repetitions` (kötelező, ≥ 1; alapból 1), `notes` (opcionális, max. 200).
      Mentés: **nested aggregate PUT** (`NestedChildResolver`; kliens tükör a
      `sqlite-storage-backend.ts`-ben, egy tranzakció + egy outbox elem).
- [ ] Sablon-szerkesztő a nyújtó típushoz: név, megjegyzés, címke; rendezhető tétellista; nyújtó
      gyakorlat **picker** (kereső, kategória-chipek, Kedvencek, csak nyújtó gyakorlatok). A tétel
      sorában: tartás (mp), oldalanként kapcsoló, ismétlés, megjegyzés. Számított teljes időtartam
      előnézet: `Σ holdSeconds × repetitions × (perSide ? 2 : 1)`.
- [ ] **Sablon lista:** típus-szűrő chipek (**Erősítés** / **Nyújtás**, többes kiválasztás, mint a
      [[167-nyujto-gyakorlat-katalogus]] katalógusánál) a meglévő Aktív / Inaktív / Mind szűrő
      mellett. Soronkénti aktív kapcsoló a nyújtó sablonon is. A `goalLabel` csoport-műveletek
      (`backlog/140`) mindkét típusra hatnak.
- [ ] Új sablon létrehozásakor először a típust kell választani (Erősítés / Nyújtás).
- [ ] **Rotáció:** a nyújtó sablon **soha** nem kerül a rotációs előrejelzésbe, a blokklimitbe, a
      terhelés-figyelmeztetésekbe és az ujjterhelés-számításba.
- [ ] **Heti kézi felülírás:** új slot-kind **`STRETCH`** (új nullable `stretch_plan_id` FK →
      `stretch_plan`; CHECK: `STRETCH` ↔ `stretch_plan_id` nem null és `plan_id` null). A felülíró
      action sheetben az aktív nyújtó sablonok is szerepelnek (pl. „Nyújtás · <név>”).
      A `STRETCH` nap az előrejelzésben **pihenőnap** (a blokk lezárul, a rotáció nem lép). A chipen
      „Nyújtás: <sablon> · kézi” látszik.
- [ ] Soft delete megerősítéssel (+ tételek cascade). A törölt nyújtó sablonra mutató `STRETCH`
      felülírást az előrejelzés figyelmen kívül hagyja (a nap automatikus).
- [ ] Helyi SQLite séma (`SCHEMA_Vn`), outbox payload verzió + migrációs lépés (`WeeklyPlan` slot
      `stretchPlanId: null` default), `verify:outbox` snapshot.
- [ ] Specek: [[Heti terv]] (két sablontípus, `STRETCH` slot, rotációs szabály), [[Edzésnapló]]
      ahol a „Terv indítása…” hivatkozik; `#### Backend-offline`.

## Terv / döntési napló

- 2026-10-17 — **Külön `StretchPlan` entitás**, nem `WorkoutPlan.type`: a cél-szett modell (`setType`,
  `reps`, `weightKg`, RPE, bemelegítés-generálás) a nyújtásnál értelmetlen, a tétel-mezők (tartás,
  oldalanként, ismétlés) pedig erősítésnél.
- 2026-10-17 — A nyújtó nap pihenőnapnak számít. Ez illeszkedik a [[Heti terv]] terhelés-szabályához:
  az úszás és a bicikli sem töri meg a pihenőnapot. (Felhasználói igény.)
- 2026-10-17 — Külön `stretch_plan_id` oszlop, mert a `weekly_plan_slot.plan_id` FK a `workout_plan`-ra
  mutat (`V19`).

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] — …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #168 nyújtó sablonok
- Kód: `workout` (backend), `pages/workout/plan/`, `training-forecast.ts`, `weekly-plan/`, local schema, outbox migrator
