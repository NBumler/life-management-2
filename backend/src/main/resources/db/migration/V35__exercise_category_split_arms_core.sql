-- backlog/065 — az ExerciseCategory finomabb felbontása. Eddig egy `ARMS` (kar) és egy `CORE`
-- (has + mélyhát + törzs) érték volt; push/pull bontásban és a statisztikában ez összemos külön
-- edzett izomcsoportokat. Az enumot **helyben bővítjük**:
--   ARMS  -> BICEPS, TRICEPS
--   CORE  -> ABS, LOWER_BACK, OBLIQUES
--
-- Migráció a meglévő adatokra (a `category` kötelező, és az Edzésnapló / Heti terv sorok
-- SNAPSHOT-olják): a régi értékeket a legvalószínűbb új értékre képezzük — **ARMS -> BICEPS**,
-- **CORE -> ABS** —, mindhárom táblán (`exercise_catalog`, `workout_exercise_entry`,
-- `workout_plan_exercise`). Ez tudatosan **lossy** (egy régi „tricepszes" gyakorlat is BICEPS-re
-- kerül): a felhasználó utólag átállíthatja a helyes értékre, a snapshotok pedig nem
-- viselkedést befolyásoló adatok. A `category` `text` oszlop marad, csak a CHECK bővül, így a
-- `sync_changes` view érintetlen.

-- exercise_catalog.category
ALTER TABLE exercise_catalog DROP CONSTRAINT IF EXISTS exercise_catalog_category_check;
UPDATE exercise_catalog SET category = 'BICEPS' WHERE category = 'ARMS';
UPDATE exercise_catalog SET category = 'ABS' WHERE category = 'CORE';
ALTER TABLE exercise_catalog ADD CONSTRAINT exercise_catalog_category_check CHECK (category IN (
    'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'ABS', 'LOWER_BACK', 'OBLIQUES',
    'FOREARM_FINGERS', 'FULL_BODY'));

-- workout_exercise_entry.exercise_category (Edzésnapló snapshot)
ALTER TABLE workout_exercise_entry DROP CONSTRAINT IF EXISTS workout_exercise_entry_exercise_category_check;
UPDATE workout_exercise_entry SET exercise_category = 'BICEPS' WHERE exercise_category = 'ARMS';
UPDATE workout_exercise_entry SET exercise_category = 'ABS' WHERE exercise_category = 'CORE';
ALTER TABLE workout_exercise_entry ADD CONSTRAINT workout_exercise_entry_exercise_category_check CHECK (exercise_category IN (
    'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'ABS', 'LOWER_BACK', 'OBLIQUES',
    'FOREARM_FINGERS', 'FULL_BODY'));

-- workout_plan_exercise.exercise_category (Heti terv snapshot)
ALTER TABLE workout_plan_exercise DROP CONSTRAINT IF EXISTS workout_plan_exercise_exercise_category_check;
UPDATE workout_plan_exercise SET exercise_category = 'BICEPS' WHERE exercise_category = 'ARMS';
UPDATE workout_plan_exercise SET exercise_category = 'ABS' WHERE exercise_category = 'CORE';
ALTER TABLE workout_plan_exercise ADD CONSTRAINT workout_plan_exercise_exercise_category_check CHECK (exercise_category IN (
    'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'ABS', 'LOWER_BACK', 'OBLIQUES',
    'FOREARM_FINGERS', 'FULL_BODY'));
