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

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] — …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #169 nyújtó session
- Kód: `workout` (backend), `pages/workout/stretch/` (új), `training-load.ts`, local schema, outbox
