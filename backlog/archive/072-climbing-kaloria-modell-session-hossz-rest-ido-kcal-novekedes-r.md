---
id: 72
type: change-request
status: done
title: Mászó kalória-modell felülvizsgálat — a puszta session-hossz (rest MET 2.0) is növeli a kcal-t
specs:
  - "[[Mászónapló]]"
  - "[[Tápérték kalkulátor]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 72 — Mászó kalória-modell felülvizsgálat — a puszta session-hossz (rest MET 2.0) is növeli a kcal-t

## Motiváció / probléma

„Csak az, hogy ott voltam a sziklafalnál 2 órát — hogy növeli a kalóriát?” A jelenlegi modellben a
nem-aktív idő (`t_restMin = totalSessionDurationMinutes − t_activeMin`) MET 2.0-val és a
testsúllyal beszámít. Egy 2 órás session, amiben csak pár rövid mászás volt, így is jelentős
passzív kcal-t ad (2.0 × ~75 kg × ~1.7 h ≈ 250+ kcal), pusztán attól, hogy a `totalSessionDuration`
nagy. A user szerint ez félrevezető — a „lógás a szikla alatt” nem edzés-kalória.

## Jelenlegi működés

[[Mászónapló]] → `#### Kalória`:

```
kcal = (MET_active × pump) × m_eff × t_activeMin/60  +  2.0 × m × t_restMin/60
```

ahol `t_restMin = max(0, totalSessionDurationMinutes − t_activeMin)`, „Rest / üresjárat /
biztosítás a földön” MET = **2.0**. A `totalSessionDurationMinutes` felhasználó által megadott
mező; ha hiányzik, kísérletszám-alapú fallback.

## Elfogadási kritériumok

- [ ] Döntés a rest-zóna kezeléséről, opciók:
      (a) marad, de az UI külön bontja „aktív / passzív” kcal-ra, hogy átlátható legyen;
      (b) a rest MET 2.0 → 1.3 (ülő pihenő) vagy 0 (nem számít bele);
      (c) rest-idő sapka (pl. max. `t_activeMin × k`), a fölötte lévő „csak jelenlét” nem számít;
      (d) `totalSessionDurationMinutes` jelentésének átdefiniálása „tényleges edzésidő”-re.
- [ ] Az [[Tápérték kalkulátor]] `activityExtraKcal` összegzés és az élő UI-előnézet ugyanazzal a
      képlettel.
- [ ] Paritás: pure TS képlet + opcionális szerveroldali paritás; teszt-fixture frissítés.
- [ ] A [[Úszás napló]] / [[Edzésnapló]] konzisztencia átgondolva (ne legyen a mászás kirívóan más
      elvű).

## Terv / döntési napló

_Ez tudatos modellezési döntés volt (§ Kalória a specben) — a jegy a felülvizsgálatról szól, nem
feltétlen bug. Legvalószínűbb kimenet: (a) + (b) kombináció (UI-bontás + alacsonyabb rest MET)._

## Lezáráskor (on-done)

**Döntés: a MET-alapú modell marad (a pihenő is éget valamennyit), de minden zóna ezután `(bruttó
MET − 1)` = nettó MET-en számol** — az ACSM nettó-energia konvenció. Ez a tudományilag helyes
forma ehhez a felhasználáshoz: a mászás-kcal a `activityExtraKcal`-ba megy, ami a napi **TDEE fölé
adódik**, a TDEE viszont a 24 órás nyugalmi anyagcserét (RMR ≈ 1 MET) már számolja. Bruttó
MET-tel a modell ~1 MET-nyit duplázott a session teljes hosszán; ez okozta a „meglepően nagy"
számot, főleg a rest zónában (bruttó 2.0 → **nettó 1.0**, azaz feleződik).

A bruttó MET-értékek (boulder 8.0, kötél elöl 7.0, rest 2.0, másod ×0.8) a
[Compendium of Physical Activities](https://pacompendium.com) (Ainsworth 2011) sziklamászás-kódjaival
összevetve rendben vannak (ascending high-difficulty ≈ 7.5; low-to-moderate ≈ 5.8; rappelling 5.0;
állás/biztosítás ≈ 2.0) — nem kellett őket hangolni, csak a nettósítás.

- `climbing-metrics.ts`: új `RESTING_MET = 1.0` export + `netMet(gross) = max(0, gross − 1)` helper;
  minden `MET × … × m × perc/60` hívási hely `netMet(...)`-tel; a pump- és másod-mászó-szorzó a
  bruttó MET-en marad, a `−1` utána jön (`netMet(met × pump)`). Az `activity-kcal.ts` (napi
  `activityExtraKcal` összegzés) és a napló-form élő előnézete automatikusan követi (ugyanaz a
  függvény). A múltbeli sessionök kcal-ja retroaktívan csökken (a mászás-kcal sosincs fagyasztva —
  élőben számol) — ez szándékos korrekció.
- Nincs adatmodell- / séma- / OpenAPI-változás. Backend paritás: a szerver úgysem számol kcal-t
  (a `ClimbingSession`-nek nincs `calculatedCalories` mezője).
- Frissített spec: [[Mászónapló]] `#### Kalória` (MET-tábla „bruttó" címke + Compendium-hivatkozás,
  nettó-MET bekezdés, képlet `(MET × pump − 1)` / `(2.0 − 1)`). `verifikalt_commit` bump.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #72 mászás-kcal: nettó MET (grossMET − 1) minden zónában
- Kód: `frontend/src/app/pages/workout/climbing/climbing-metrics.ts` (+ spec: 2 új / átírt teszt).
