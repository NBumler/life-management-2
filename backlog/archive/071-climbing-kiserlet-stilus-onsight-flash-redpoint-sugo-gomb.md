---
id: 71
type: feature
status: done
title: Kísérlet stílus (onsight / flash / redpoint) mellé súgó gomb a jelentésekkel
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 71 — Kísérlet stílus (onsight / flash / redpoint) mellé súgó gomb a jelentésekkel

## Motiváció / probléma

A kísérlet `ascentStyle` választónál (ONSIGHT / FLASH / REDPOINT) egy súgó (ⓘ) gomb kellene, ami
röviden elmondja, melyik mit jelent — nem mindenki tudja fejből a különbséget (főleg onsight vs.
flash), és a rossz kiválasztás rontja a statisztikát (sikerarány-bontás, piramis).

## Jelenlegi működés

[[Mászónapló]] `AscentAttempt.ascentStyle`: „Opcionális, ha `isSuccess`: `ONSIGHT` \| `FLASH` \|
`REDPOINT` (kontextus szerinti whitelist)”. [[Indoor boulder napló]]: „Ha siker: `FLASH` \|
`REDPOINT` \| `ONSIGHT` (ONSIGHT megengedett fallback)”. Nincs magyarázó UI a választó mellett.

## Elfogadási kritériumok

- [ ] ⓘ gomb az `ascentStyle` választó mellett; tap → rövid popover / sheet a definíciókkal
      (onsight: első próbára, előzetes infó nélkül; flash: első próbára, de kaptál bétát/láttál
      másást; redpoint: sikeres átmászás korábbi próbák után).
- [ ] i18n kulcsok (HU/EN), a szöveg fordítása kódoldali.
- [ ] Ugyanez a súgó elérhető minden kontextus napló-formjában (boulder + kötél, indoor + outdoor),
      a whitelistelt értékekhez igazítva.
- [ ] Tisztán frontend; nincs adatmodell-változás.

## Terv / döntési napló

_Újrahasznosítható „info popover” minta; a [[075-climbing-kiserlet-tobb-ascent-style-cimke-egyszerre]]
kérdés jó eséllyel itt, a súgószövegben oldódik meg (a három stílus egymást kizárja)._

## Lezáráskor (on-done)

- Új `app-help-button` shared komponens (bare trailing ⓘ gomb → `AlertController` a kapott
  i18n kulcsokkal); a `HelpInputComponent` testvére, de érték nélkül, így `ion-select` mellé is
  tehető. Bekötve mind a 4 mászó session-edit form Stílus választójába.
- Súgószöveg: `WORKOUT.CLIMBING.ASCENT_STYLE.HELP_TITLE` / `HELP_TEXT` (hu + en) — onsight / flash /
  redpoint definíció + miért zárják ki egymást.
- A 075-ös jegy (flash + onsight egyszerre?) kérdését ez a súgószöveg megválaszolja; a 075 külön zárul.
- Frissített specek: [[Mászónapló]] (`AscentAttempt.ascentStyle` sor + `### UI/UX elvárások`),
  [[Indoor boulder napló]] / [[Outdoor köteles napló]] / [[Outdoor boulder napló]] /
  [[Indoor köteles napló]] (`### UI/UX elvárások` — súgó gomb)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — Kísérlet stílus súgó gomb (#71)
- Kód: `frontend/src/app/shared/help-button/` (+ spec), `pages/workout/climbing/naplo/*-session-edit.page.{ts,html}`,
  `assets/i18n/{hu,en}.json`
