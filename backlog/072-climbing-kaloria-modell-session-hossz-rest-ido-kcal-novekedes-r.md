---
id: 72
type: change-request
status: backlog
title: Mászó kalória-modell felülvizsgálat — a puszta session-hossz (rest MET 2.0) is növeli a kcal-t
specs:
  - "[[Mászónapló]]"
  - "[[Tápérték kalkulátor]]"
flag:
created: 2026-09-06
closed:
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

- Frissített specek: [[Mászónapló]] (`#### Kalória`), [[Tápérték kalkulátor]] (activity kcal)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` `shared/climbing/` + `climbing-metrics.ts` + `core/data/activity-kcal.ts`, opc. backend paritás
