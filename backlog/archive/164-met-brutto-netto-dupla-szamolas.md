---
id: 164
type: change-request
status: done
title: MET naplók — bruttó MET a PAL 1.2 mellett (nyugalmi égetés dupla számolása?)
specs:
  - "[[Tápérték kalkulátor]]"
  - "[[Úszás napló]]"
  - "[[Biciklizés napló]]"
  - "[[Edzésnapló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-17
closed: 2026-10-17
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

- [x] Döntés: nettó MET-re váltás (`(MET − 1) × m × óra`) az összes naplóban, vagy tudatos korlátként
      dokumentálás.
- [x] Ha váltás: minden `*-metrics.ts` és a specek MET-képlete frissül, a tesztek átírva.

## Terv / döntési napló

- **2026-10-17 — döntés: nettó MET** (a user a javasolt irányt jóváhagyta). A bruttó táblák maradnak
  (Compendium-értékek, a specben „bruttó” jelöléssel), a levonás egy helyen: `shared/net-met.ts`
  (`RESTING_MET = 1.0`, `netMet()` = `max(0, MET − 1)`).
- Átállítva: erőedzés (`sessionKcal`), úszás (`swimKcal`), bicikli (`bikeKcal`). Hatás: 75 kg-nál
  edzésóránként −75 kcal (pl. 1 óra általános súlyzós 375 → 300 kcal).
- A mászás **már nettó** volt (`climbing-metrics.ts`, a pihenő-zóna is) — a privát `netMet` /
  `RESTING_MET` átkerült a közös modulba, viselkedés nem változott. A röplabda és a nyújtás eleve fix
  nettó konstanssal számol — nem érintett.
- A lépéskalória (`max(0, lépés − 3000) × m × 0.00045`) nem MET-alapú, nem érintett.
- Tisztán kliensoldali számítás: nincs séma-, outbox- vagy backend-változás; a múltbeli napok is az új
  képlettel számolódnak (a kcal sehol nincs tárolva).

## Lezáráskor (on-done)

- Frissített specek: [[Tápérték kalkulátor]] (Edzéskalória: nettó képlet + magyarázat, a táblák bruttónak jelölve),
  [[Úszás napló]], [[Biciklizés napló]], [[Edzésnapló]] (kanonikus képlet `(MET − 1)`, „MET (bruttó)” oszlop).
  [[Mászónapló]] változatlan (már nettó volt).
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #164 nettó MET az erőedzés / úszás / bicikli kalóriában
- Kód: `shared/net-met.ts`, `pages/workout/{log/workout-metrics,swimming/swim-metrics,cycling/bike-metrics,climbing/climbing-metrics}.ts`
