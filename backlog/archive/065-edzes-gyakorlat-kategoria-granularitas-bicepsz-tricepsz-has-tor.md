---
id: 65
type: change-request
status: done
title: ExerciseCategory finomabb felbontás — kar → bicepsz/tricepsz, core → has/mélyhát/oldalsó törzs
specs:
  - "[[Gyakorlat]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 65 — ExerciseCategory finomabb felbontás — kar → bicepsz/tricepsz, core → has/mélyhát/oldalsó törzs

## Motiváció / probléma

Két észrevétel ugyanarról:

1. A gyakorlat kategóriáknál csak `ARMS` (kar) van, nincs külön bicepsz és tricepsz — pedig
   push/pull bontásban ez két külön edzett izomcsoport, és a statisztika (per-kategória volumen,
   piramis) így összemossa őket.
2. „A has és a törzs az más?” — jelenleg csak `CORE` van, ami a spec szerint egyszerre jelenti a
   hasat, a mélyhátat és a törzset. Ezek anatómiailag és edzésmódszertanilag különböznek
   (rectus abdominis vs. erector spinae / mély stabilizátorok / oldalsó törzs). A 4-es észrevétel
   feltételes volt („csak akkor kell jegy, ha különbözik a kettő”) — különbözik, ezért ide került.

## Jelenlegi működés

[[Gyakorlat]] → `#### Enum — ExerciseCategory`:

| Érték | Jelentés |
|---|---|
| `ARMS` | Kar (bicepsz, tricepsz) |
| `CORE` | Has, mélyhát, törzs |

A `category` kötelező mező az `Exercise`-en, és az [[Edzésnapló]] session entry **snapshotolja**
(`exerciseId` + név + `ExerciseCategory` + `ExerciseKind`), tehát bármilyen enum-változás
visszafelé kompatibilitási kérdést vet fel a régi snapshotokra.

## Elfogadási kritériumok

- [ ] Döntés: (a) enum-értékek bővítése (`BICEPS`/`TRICEPS`, `ABS`/`LOWER_BACK`/`OBLIQUES`…),
      vagy (b) elsődleges kategória + opcionális „al-izomcsoport” mező, vagy (c) marad, csak a
      megjelenítés/leírás pontosul. Alternatíva: szabad címkézés (tag-ek) a merev enum helyett.
- [ ] Migráció a meglévő `Exercise.category` sorokra és az [[Edzésnapló]] snapshotokra
      (a régi `ARMS`/`CORE` értékek értelmezése ne törjön).
- [ ] Parity fixture / seed `Exercise` sorok frissítése, ha determinisztikus v5 id-t érint.
- [ ] Statisztika (per-kategória volumen, grade/kategória piramis) az új felbontással.
- [ ] Frontend picker chipek + [[Edzésnapló]] szűrők.

## Terv / döntési napló

### Döntések

- **Taxonómia:** (a) **enum-értékek helyben bővítése** — nem kétszintű (fő + al) taxonómia, nem
  szabad tag-elés. `ARMS` → `BICEPS` + `TRICEPS`; `CORE` → `ABS` + `LOWER_BACK` + `OBLIQUES`. Az új
  teljes `ExerciseCategory`: `CHEST`, `BACK`, `LEGS`, `SHOULDERS`, `BICEPS`, `TRICEPS`, `ABS`,
  `LOWER_BACK`, `OBLIQUES`, `FOREARM_FINGERS`, `FULL_BODY` (11 érték). A kétszintű megoldás
  jövőállóbb lenne (láb-/hát-bontás), de jelentősen több UI, és most nincs rá igény — ha kell,
  külön jegy.
- **Migráció (lossy, elfogadott):** `V35__exercise_category_split_arms_core.sql` — `ARMS` → `BICEPS`,
  `CORE` → `ABS` a `exercise_catalog.category` sorokon **és** a snapshot oszlopokon
  (`workout_exercise_entry.exercise_category`, `workout_plan_exercise.exercise_category`); a régi
  CHECK-et `DROP CONSTRAINT IF EXISTS` + új CHECK a 11 értékre, mindhárom táblán. On-device tükre
  `SCHEMA_V34` (6 `UPDATE`, natíven nincs CHECK). A régi tricepszes / oldalsó-törzs sorok is
  `BICEPS` / `ABS` lesznek — a felhasználó a gyakorlat-szerkesztőben átállíthatja, a snapshotok nem
  viselkedést befolyásoló adatok.
- **Seed:** az `exercise-seed.json` 3 érintett sora a **pontos** új értéket kapja („Bicepsz
  hajlítás" → `BICEPS`, „Tricepsz nyújtás" → `TRICEPS`, „Plank" → `ABS`). A `category` **nem** része
  a determinisztikus v5 seed-id-nek (`Exercise:${userId}:${normalizeName(name)}`), így nincs id- /
  parity-hatás; `EXERCISE_SEED_VERSION` nem bővül (a 3 sor id-je változatlan). Egy már leseedelt
  telepítés a lossy `ARMS→BICEPS` értéket kapja a „Tricepsz nyújtás" sorra, egy friss a `TRICEPS`-et.
- **Statisztika:** jelenleg **nincs** per-kategória volumen / piramis feature a (nem-mászó) edzés-
  statisztikában, így az AC ott tárgytalan — az új enum automatikusan érvényes, ha ilyen készül.
- **Nincs Java kód-ág** `ARMS`/`CORE`-ra (az entitások `String`-et tárolnak, a mapperek
  `.fromValue()`-t hívnak); frontend csak a `PLAN_TO_ENTRY_CATEGORY` híd (`workout-fields.ts`) és a
  `EXERCISE_CATEGORY_LABEL_KEYS` (`exercise-labels.ts`) sorolja fel az értékeket.

## Lezáráskor (on-done)

- Frissített specek: [[Gyakorlat]] (`ExerciseCategory` tábla 11 értékre + `#### Migrációs jegyzet`),
  [[Edzésnapló]] (`exerciseCategory` snapshot sor + `V35` jegyzet); mind `verifikalt_commit: 6ca6bc6`
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #065 ExerciseCategory `ARMS`/`CORE` felbontás
- Kód backend: `V35__exercise_category_split_arms_core.sql` (3 tábla: `DROP CONSTRAINT IF EXISTS` +
  `ARMS→BICEPS` / `CORE→ABS` `UPDATE` + új CHECK), OpenAPI `Exercise` / `WorkoutExerciseEntry` /
  `WorkoutPlanExercise` séma `enum` bővítés
- Kód frontend: `gen:api` (3 model `CategoryEnum`), `exercise-labels.ts` (5 új label-kulcs),
  `workout-fields.ts` `PLAN_TO_ENTRY_CATEGORY` (5 új sor), `exercise-seed.json` (3 sor pontos új
  érték), `SCHEMA_V34` (6 `UPDATE`, `SCHEMA_VERSION = 34`), i18n `hu`/`en`
  (`WORKOUT.EXERCISES.CATEGORY.{BICEPS,TRICEPS,ABS,LOWER_BACK,OBLIQUES}`, `ARMS`/`CORE` törölve)
