---
id: 74
type: bug
status: backlog
title: Kísérletben az út módosításakor a nehézség (absoluteDifficultyIndex) nem frissül
specs:
  - "[[Mászónapló]]"
  - "[[Outdoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed:
---

# 74 — Kísérletben az út módosításakor a nehézség (absoluteDifficultyIndex) nem frissül

## Motiváció / probléma

Ha egy meglévő kísérletben átállítom a hivatkozott utat / problémát / szín-sávot egy másikra
(vagy módosítom a grade-et), a levezetett nehézség (`absoluteDifficultyIndex`, és a grade-szöveg
snapshot) nem számolódik újra — a régi út indexe marad. Így a Volumen és a max-grade statisztika
hibás lesz.

> Megjegyzés: verifikálandó a scoping során — a napló session-edit oldalakon
> (`frontend/src/app/pages/workout/climbing/naplo/*-session-edit.page.ts`) hol fut a
> route-picker → grade/index előtöltés, és reagál-e `Route` / `BoulderProblem` / `colorBandId`
> változásra, vagy csak első kiválasztáskor.

## Jelenlegi működés

[[Mászónapló]]: az `absoluteDifficultyIndex` a szín-sávból (`resolveIndex()` → `colorBandMidIndex`,
`floor`) vagy a parserből származik; a snapshot mezők (`colorName`, `hexColor`, `gradeRange`, ill.
`guidebookGrade`) az út/probléma kiválasztásakor töltődnek. A várt viselkedés: az út/grade
**bármely** módosítása újraszámolja az indexet és újraírja a snapshotot, még meglévő kísérlet
szerkesztésekor is.

## Elfogadási kritériumok

- [ ] Meglévő kísérletben út/probléma/szín-sáv váltásra az `absoluteDifficultyIndex` és a
      grade-szöveg snapshot újraszámolódik.
- [ ] Kézi grade (`userRawInput` / `rawGrade`) módosítására szintén újraszámol.
- [ ] Ha a user szándékosan felülírta az indexet kézzel, azt ne írja felül némán (döntés:
      „dirty” jelölés vagy megerősítés).
- [ ] Regressziós teszt a session-edit page spec-ben mindkét ágra (szín-sáv és parser).
- [ ] Volumen / max-grade statisztika a javított indexszel helyes.

## Terv / döntési napló

_Scoping: reprodukció + a hibás signal/effect azonosítása a 4 session-edit page valamelyikében
(közös komponens?). Valószínű ok: az index számítás csak a picker `(ionChange)` első ágán fut,
nem derived a kiválasztott entitásból._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] (`AscentAttempt` / index számítás — ha a leírás pontosítandó)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend/src/app/pages/workout/climbing/naplo/*-session-edit.page.ts` + climbing-attempt-input
