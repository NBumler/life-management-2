---
id: 66
type: feature
status: done
title: Gyakorlatnak opcionális leírás / megjegyzés mező
specs:
  - "[[Gyakorlat]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 66 — Gyakorlatnak opcionális leírás / megjegyzés mező

## Motiváció / probléma

Ha egy gyakorlatot pontosan akarok azonosítani (fogásszélesség, szerszám, variáns, cél), most
mindent bele kell zsúfolni a `name`-be — így hosszú, csúnya nevek jönnek létre, amik a listákban
és a session entry snapshotban is rosszul néznek ki. Egy külön, opcionális leírás mező feloldaná
ezt: rövid név + részletek külön.

## Jelenlegi működés

[[Gyakorlat]] → `#### Entitás — Exercise`: a mezők `id`, `name` (kötelező, egyedi az élő
katalóguson), `category`, `kind`, `defaultRestTimeSeconds`, `isFavorite`. **Nincs** szabad
szöveges leírás / cue / megjegyzés mező.

## Elfogadási kritériumok

- [ ] `Exercise.description` (vagy `notes`) opcionális szabad szöveg, hossz-limit meghatározva.
- [ ] Nem része a [[Névegyediség]] összehasonlításnak.
- [ ] Flyway migráció + helyi SQLite `SCHEMA_Vn` új blokk + OpenAPI séma.
- [ ] Gyakorlat szerkesztő űrlapon multi-line mező; a katalógus listában max. 1–2 sor csonkolással.
- [ ] Döntés: az [[Edzésnapló]] session entry snapshotolja-e a leírást is (valószínűleg **nem**
      kell — a leírás nem viselkedést befolyásoló adat, mint a `category`/`kind`).
- [ ] Megjelenik-e élő session közben (pl. felugró cue a szett felett) — opcionális, külön scope.

## Terv / döntési napló

_Vékony feature. A fő döntés a snapshot-kérdés és hogy kell-e a napló-flow-ban megjeleníteni._

### Döntések

- **Mező neve:** `description` (nem `notes` — a „notes" a naplóban kísérlet-jegyzet).
- **Hossz-limit:** 1000 karakter (backend `CHECK char_length ≤ 1000`, OpenAPI `maxLength: 1000`,
  frontend `Validators.maxLength(1000)` + `<ion-textarea maxlength="1000">`).
- **Névegyediség:** nem része (csak `name_normalized`).
- **Snapshot:** az [[Edzésnapló]] session entry **nem** snapshotolja — nem viselkedést
  befolyásoló adat, szemben a `category` / `kind` mezőkkel. Ezért az `[[Edzésnapló]]` spec / kód
  változatlan (`spec:` listából kivéve).
- **Élő session cue:** nincs (külön scope, nem volt kérve).
- **Lista:** 2 soros CSS `line-clamp` csonkolás; a kereső a `description`-re is illeszt.

## Lezáráskor (on-done)

- Frissített spec: [[Gyakorlat]] (`Exercise` entitás tábla, UI/UX, Backend oszloplista;
  `verifikalt_commit: e1ed261`)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #066 gyakorlat opcionális `description` mező
- Kód backend: `V32__exercise_catalog_description.sql`, `ExerciseEntity` / `ExerciseMapper` /
  `ExerciseService`, `openapi/components/schemas/Exercise.yaml`, `ExerciseServiceTest`
- Kód frontend: `gen:api` (`exercise.ts`), `local-database.service.ts` (`SCHEMA_V31` → `SCHEMA_VERSION = 31`),
  `local-rows.ts` (`ExerciseRow` + write / server-apply task), `exercise.repository.ts`
  (`ExerciseSaveInput`), `exercise-seed.ts`, `exercise-edit.page.{ts,html}` (`<ion-textarea>`),
  `exercise-list.page.{ts,html}` (csonkolt sor + kereső), `exercise-picker.component.ts`,
  i18n `hu` / `en` (`FIELD_DESCRIPTION`(`_PLACEHOLDER`)), érintett `*.spec.ts`-ek
