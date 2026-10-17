---
id: 164
type: change-request
status: backlog
title: MET naplók — bruttó MET a PAL 1.2 mellett (nyugalmi égetés dupla számolása?)
specs:
  - "[[Tápérték kalkulátor]]"
  - "[[Úszás napló]]"
  - "[[Biciklizés napló]]"
  - "[[Edzésnapló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-17
closed:
---

# 164 — MET naplók — bruttó MET a PAL 1.2 mellett (nyugalmi égetés dupla számolása?)

## Motiváció / probléma

A [[163-roplabda-naplo]] kutatása közben derült ki. A [[Tápérték kalkulátor]] a napi alapot
`maintenanceKcal = BMR × 1.2` szerint számolja, erre jön rá az `activityExtraKcal`. Az edzésnaplók
viszont **bruttó** MET-tel számolnak (`MET × m × óra`), ami a nyugalmi 1 MET-et is tartalmazza.
Edzésóránként így kb. `1 × m` kcal (75 kg-nál ~75 kcal/óra) valószínűleg kétszer számolódik.

## Jelenlegi működés

[[Tápérték kalkulátor]] „Edzéskalória — univerzális MET”: `kcal = MET × m × durationMinutes / 60`,
bruttó MET-ekkel (úszás, bicikli, erőedzés, mászás). A röplabda (163) már nettó MET-tel számol.

## Elfogadási kritériumok

- [ ] Döntés: nettó MET-re váltás (`(MET − 1) × m × óra`) az összes naplóban, vagy tudatos korlátként
      dokumentálás.
- [ ] Ha váltás: minden `*-metrics.ts` és a specek MET-képlete frissül, a tesztek átírva.

## Terv / döntési napló

_Kivizsgálandó: a mászás aktív/passzív modellje (rest MET 2.0/3.0) külön mérlegelést igényel._

## Lezáráskor (on-done)

- Frissített specek: …
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: …
