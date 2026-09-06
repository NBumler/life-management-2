---
id: 74
type: bug
status: done
title: Kísérletben az út módosításakor a nehézség (absoluteDifficultyIndex) nem frissül
specs:
  - "[[Mászónapló]]"
  - "[[Outdoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Indoor köteles napló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
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

Reprodukció megvolt a `Route` / `BoulderProblem` / `IndoorRoute` mestert használó 3 formban
(`outdoor-rope`, `outdoor-boulder`, `indoor-rope`). Ok: a `pickRoute` / `pickProblem` a fokozatot
csak akkor töltötte elő, ha az üres volt (`if (!row.userRawInput()?.trim())`), és a `resolveIndex`
a `userRawInput`-ot előrébb sorolta a kiválasztott út fokozatánál — így útváltáskor az előző út
fokozata (és indexe) bennragadt. Az `indoor-boulder` **nem érintett**: ott a `resolveIndex` mindig
élőben számol a `colorBandId` / `userRawInput` signalokból, és a `pickBand` nem ír `userRawInput`-ot.

Javítás: per-attempt-sor `gradeAutoFilled` (+ `lengthAutoFilled` az outdoor-rope hossznál)
provenance-flag. Útváltáskor a fokozat/hossz újratöltődik, ha az érték még az előző útból származik
(flag = true) vagy üres; kézi szerkesztés (`onRawGradeInput` / `onLengthInput`) törli a flaget, így
a kézzel megadott érték megmarad. Betöltött (mentett) sornál a flag heurisztikából jön: igaz, ha a
tárolt fokozat még pontosan egyezik a linkelt út fokozatával — így egy korábban kézzel átírt érték
nem íródik felül némán.

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] (`AscentAttempt` `userRawInput` / `absoluteDifficultyIndex`
  sorok — útváltás-szabály), [[Outdoor köteles napló]] / [[Outdoor boulder napló]] /
  [[Indoor köteles napló]] (`Út` / `Probléma` sor + `### UI/UX elvárások`)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — Útváltáskor a nehézségi index nem frissült (#74, bug)
- Kód: `frontend/src/app/pages/workout/climbing/naplo/{outdoor-rope,outdoor-boulder,indoor-rope}-session-edit.page.{ts,html}`
  (+ specek: 3 új regressziós teszt)
