---
id: 171
type: change-request
status: done
title: Mászás pihenőkalória — a pihenő MET a mászás gyakoriságától függ
specs:
  - "[[Mászónapló]]"
  - "[[Tápérték kalkulátor]]"
flag:
created: 2026-10-17
closed: 2026-10-17
---

# 171 — Mászás pihenőkalória: gyakoriságfüggő pihenő MET

## Motiváció / probléma

Felhasználói észrevétel (2026-10-17): a pihenőzóna `sessionHossz − Σ aktív perc`, és a teljes
hosszát a REST MET-en (kötél 2.0, boulder 3.0) számolta, függetlenül attól, milyen sűrűn mászol.
Egy 4 órás sessionben 4 boulderrel (óránként egy) 237 perc „emelt” pihenő jött ki (70 kg-nál ~553
kcal), pedig ennyi idő alatt a szervezet teljesen visszaáll. Ilyenkor a pihenő gyakorlatilag
tétlen állás. Fordítva: ha alig jössz le a falról, a pihenőben is emelt az égetés.

## Jelenlegi működés

[[Mászónapló]] „Kalória (kanonikus)”: rest = `(REST − 1) × m × t_restMin / 60`, a REST fix
(kötél 2.0, boulder 3.0).

## Elfogadási kritériumok

- [x] Minden naplózott erőfeszítés regenerációs ablakot nyit: boulder 5 perc / go (`Σ attemptCount`),
      kötél 15 perc / pitch (single-pitch = 1).
- [x] `f = min(1, erőfeszítések × ablak / t_restMin)`; `MET_rest = 1.5 + (REST − 1.5) × f`; a `netMet()` marad.
- [x] Sűrű session (és a fallback-hosszú session) eredménye változatlan; a felhasználói példa ~583 → ~203 kcal.
- [x] Spec frissítve, forrásokkal; tesztek a példára, a 10 perc / go esetre (f = 0.5) és a multi-pitchre.

## Terv / döntési napló

- Sporttudomány: szimulált boulderversenyen (5 perc pihenő) a kardiorespiratorikus értékek ~4 percen
  belül visszaálltak az alapszintre (PubMed 32813982); az EPOC gyors komponense ~2–5 perc. Rövid
  pihenős intervallumoknál a VO₂ / pulzus a szünetben is emelt marad.
- A felvetett „gyakorisággal szorzás” egy regenerációs ablakkal van levezetve: f = ablak / átlagos szünet.
- Ablak boulderen először 4 perc lett volna; 5 perc lett, mert 4-gyel a #130 plauzibilitási esete (könnyű,
  60 perces, 10 go-s session ≥ 170 kcal 76 kg-nál) ~164-re esett. Hobbi mászónál lassabb a visszaállás,
  és az átsétálás is ide tartozik. Mellékhatás: mindkét ablak megegyezik a duration fallbackkal (5 / 15
  perc / sor), így hossz nélküli session pihenője sosem ritkul.
- Tétlen szint 1.5 MET (nem az otthoni 1.0–1.3): a teremben állsz, sétálsz, beszélgetsz.
- Vállalt korlát: a nem naplózott go-k nem nyitnak ablakot (lásd a spec `#### Tudatos korlát` szakaszát).

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] — „Pihenő gyakorisága” szakasz, tétlen MET-sor, ritka-mászás példa,
  új tudatos korlát; [[Tápérték kalkulátor]] — a mászás-összefoglaló rest-mondata.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #171
- Kód: `frontend/src/app/pages/workout/climbing/climbing-metrics.ts` (`restFrequencyFactor`, `restMet`)
