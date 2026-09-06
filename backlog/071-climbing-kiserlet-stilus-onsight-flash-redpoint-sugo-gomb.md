---
id: 71
type: feature
status: backlog
title: Kísérlet stílus (onsight / flash / redpoint) mellé súgó gomb a jelentésekkel
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed:
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

- Frissített specek: [[Mászónapló]] / [[Indoor boulder napló]] (`### UI/UX elvárások` — súgó)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` climbing attempt input + i18n
