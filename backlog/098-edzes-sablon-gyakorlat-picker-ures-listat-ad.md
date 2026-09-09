---
id: 98
type: bug
status: in-progress
title: Edzés — új sablonban a gyakorlat-hozzáadás pickere üres listát ad (keresésre / szűrőre is)
specs:
  - "[[Heti terv]]"
  - "[[Gyakorlat]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-09
closed:
---

# 98 — Edzés — új sablonban a gyakorlat-hozzáadás pickere üres listát ad (keresésre / szűrőre is)

## Motiváció / probléma

Edzéssablon (`WorkoutPlan`) szerkesztésekor a „gyakorlat hozzáadása" ablakban a lista **üres**,
és keresésre / szűrőre is teljesen üres marad. Ugyanakkor, ha nem sablonból nézem a
gyakorlatokat, hanem a [[Gyakorlat]] törzsadat-képernyőn, ott minden gyakorlat megvan.

Valószínű ok: a `backlog/065` ([[065]]) az `ExerciseCategory` enumot felbontotta
(`ARMS` → `BICEPS`/`TRICEPS`, `CORE` → `ABS`/`LOWER_BACK`/`OBLIQUES`) — a sablon-picker
kategória-szűrője / label-lookup-ja / `PLAN_TO_ENTRY_CATEGORY` hídja valahol a régi
`ARMS`/`CORE` értékekre épül, vagy egy ismeretlen enum-értéknél kivételt dob / kiüríti a listát.

## Jelenlegi működés

[[Heti terv]] `WorkoutPlanExercise`: „meglévő `GearItem`… " — pardon, gyakorlat hozzáadása
**pickerrel** a [[Gyakorlat]] katalógusból; a picker a `WorkoutPlan` szerkesztőn belül él.
[[Gyakorlat]] `#### Migrációs jegyzet — ARMS / CORE felbontás`: `V35` / `SCHEMA_V34`, 11-értékű
`ExerciseCategory`; a frontend a `PLAN_TO_ENTRY_CATEGORY` hidat (`workout-fields.ts`) és az
`EXERCISE_CATEGORY_LABEL_KEYS`-t (`exercise-labels.ts`) sorolja fel.

## Elfogadási kritériumok

- [ ] A sablon gyakorlat-picker a teljes (nem törölt) gyakorlat-katalógust listázza, ugyanúgy,
      mint a [[Gyakorlat]] képernyő.
- [ ] Kategória-szűrő működik mind a 11 új `ExerciseCategory` értékre; ismeretlen / régi érték
      nem üríti ki a listát és nem dob kivételt.
- [ ] Keresés ([[Szöveges keresés]]) a pickerben visszaadja a találatokat.
- [ ] Regressziós teszt: sablon-szerkesztő picker nem üres, adott kategóriára szűrve helyes.
- [ ] Ellenőrzés a [[Edzésnapló]] ad-hoc gyakorlat-pickerén is (ugyanaz a komponens?).
- [ ] Gyökérok rögzítve a döntési naplóban (mi tört el a 065-tel).

## Terv / döntési napló

_Scoping: a sablon-picker komponens (`pages/workout/weekly-plan/*` vagy megosztott
`exercise-picker`) kategória-map / label-lookup lekövetése; console-hiba ellenőrzése a picker
megnyitásakor. Ha `EXERCISE_CATEGORY_LABEL_KEYS` / `PLAN_TO_ENTRY_CATEGORY` hiányos, kiegészíteni._

### Kód-recon (2026-09-09)

- A `plan-edit.page` (`/tabs/workout/weekly-plan/plans/new`) **ugyanazt** a
  `shared/exercise-picker/exercise-picker.component.ts`-t használja `<ion-modal>`-ben, mint a
  `workout-session-edit.page` és az `active-workout.page` — a `<ion-modal [isOpen]>` +
  `<app-exercise-picker>` wiring bitre azonos.
- A picker a `providedIn: 'root'` **singleton** `ExerciseRepository.items()` signalból renderel
  (`filtered()` computed). Ugyanezt a signalt olvassa a `exercise-list.page` (Gyakorlat katalógus),
  ami a bejelentő szerint helyesen tele van → a signal **tud** feltöltődni.
- A `#065` commit (`651f710`) **nem** nyúlt a pickerhez, a repóhoz, a storage backendhez vagy a
  `listExercises`-hez; frontend oldalon csak generált modell-enum + `exercise-labels.ts` +
  `workout-fields.ts` `PLAN_TO_ENTRY_CATEGORY` + i18n + `SCHEMA_V34` (6 db `UPDATE`, natív).
  A picker a `exercise-labels.ts`-t **nem** használja (saját inline `WORKOUT.EXERCISES.CATEGORY.${v}`).
- A generált `Exercise` modell `as const` map — **nincs** runtime enum-validáció, tehát egy
  migrálatlan `ARMS`/`CORE` sor nem dobja el a `listExercises()` választ. A natív
  `exercise_catalog.category` `TEXT` **CHECK nélkül**.
- **Következtetés:** statikusan nincs olyan kódág, ami „pickerben üres, katalógus-listában tele"
  eredményt adna közös singleton signal mellett → az ok vagy (a) tranziens repository-állapot /
  csendes `load()`/`seed()` hiba egy adott session-ben (a picker `ngOnInit`-je `void
  this.repository.load()`-ot hív, nem `await`-el; ha a `readIntoSignal()` a `this.loaded.set(true)`
  előtt dob, az `items` `[]` marad, a hiba elnyelődik), vagy (b) a bejelentő a **munkanapló**
  pickerét nem tesztelte, és a „máshol megvan" a Gyakorlat **katalógus-listára** vonatkozik.

### Nyitott — a bejelentőtől kell

1. Platform: Android natív build vagy web (`npm start`)?
2. A **munkanapló** gyakorlat-pickere (Edzésnapló → edzés szerkesztése → „gyakorlat hozzáadása")
   **is** üres, vagy csak a sablon (Heti terv → Sablonok → új sablon) pickeré? Ez a kérdés
   dönti el, hogy picker-szintű vagy csak plan-szintű a hiba.
3. Van-e konzol-hiba a picker megnyitásakor (natív: `chrome://inspect`; web: DevTools)?

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]] / [[Gyakorlat]] (ha a picker viselkedése pontosul)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `exercise-labels.ts` / `workout-fields.ts` / a picker komponens, érintett
  `*.spec.ts`
