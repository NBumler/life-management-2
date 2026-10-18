---
id: 173
type: change-request
status: ready
title: Erőedzés-kalória — izomcsoport-, terhelési idő- és sűrűségfüggő MET
specs:
  - "[[Edzésnapló]]"
  - "[[Tápérték kalkulátor]]"
flag:
created: 2026-10-18
closed:
---

# 173 — Erőedzés-kalória — izomcsoport-, terhelési idő- és sűrűségfüggő MET

## Motiváció / probléma

Sporttudományos átnézés (2026-10-18) a `#171` mászás-pihenő modell után. Az erőedzés-kalória ma
csak a session típusát, hosszát és a testsúlyt nézi; az, hogy *mit* csináltál, nem számít:

- **Izomcsoport:** az O₂-fogyasztás az aktív izomtömeggel és a mechanikai munkával skálázódik
  (Lytle et al., MSSE 2019: az erőedzés-EE legerősebb prediktora a testtömeg és a megmozgatott
  volumen). Egy guggolás-sorozat többszörösen drágább egy bicepsz- vagy ujjgyakorlatnál.
- **Sűrűség:** szettenként csak ~30–60 s a terhelés, a session nagy része pihenő; a pulzus és a VO₂
  ~2–3 perc alatt visszaáll (rövidebb pihenő → magasabb percenkénti EE, Ratamess et al. 2007). Egy
  90 perces, 12 szettes, beszélgetős session ma többet ér, mint egy 45 perces, 25 szettes sűrű — ez
  fordított.
- **Alap-MET magas:** Compendium (Ainsworth 2011 / Herrmann 2024) „multiple exercises, 8–15 reps,
  varied resistance” = **3.5 MET**; az 5.0 a guggolás-, a 6.0 a „vigorous” érték. A tiszta VO₂-mérés
  ugyanakkor alulbecsüli a szett anaerob részét (C. Scott) → a szett *alatti* MET bőkezű lehet, a
  session-átlag 3.5–4.5 körül reális.
- **Hangboard / pinch / campus / izometrikus sessionök** is 5.0 MET-et kapnak (kis izomtömeg, rövid
  függések, hosszú pihenők) — 70 kg, 45 perc ma ~210 kcal, reálisan ~70–100 kcal. Ez a legnagyobb
  túlbecslés.
- **RPE** (RIR-alapú 6–10, Zourdos 2016) a kudarchoz közelséget méri, nem az egész test megerőltetését
  — gyenge kcal-prediktor, legfeljebb kis módosító.
- **EPOC** (Schuenke 2002; LaForgia 2006 review) abszolút értékben a session-EE ~5–15%-a → továbbra
  is kihagyható.

## Jelenlegi működés

[[Edzésnapló]] „Kalória (kanonikus)”, `frontend/src/app/pages/workout/log/workout-metrics.ts`
`sessionKcal`:

\[\text{kcal} = (\text{MET}(\text{workoutType}) - 1) \times m \times \frac{\text{durationMinutes}}{60}\]

`GENERAL_WEIGHTS` 5.0, `HIIT_CIRCUIT` 8.0 (bruttó, nettóként számolva, `backlog/164`). Időtartam:
kézi → `endTime − startTime` → `szettek × 3 perc` fallback. Izomcsoport (`Exercise.category`), RPE,
ismétlésszám, súly nem része a kalóriának.

## Elfogadási kritériumok

- [ ] `GENERAL_WEIGHTS` session kcal = Σ szett-terhelés + pihenő, a `#171` szerkezetével analóg módon
      (minden érték bruttó MET, `netMet()`-tel számolva):
  - **terhelési idő / szett** = `reps × 3 s` (vagy `holdTimeSeconds`, ha van; ha egyik sincs, egy
        kind-szerinti alapérték);
  - **szett alatti MET** a gyakorlat `category`-jéből osztályozva — nagy (`LEGS`, `BACK`, `FULL_BODY`,
        `HIPS`) ~8; közepes (`CHEST`, `SHOULDERS`, `LOWER_BACK`) ~6; kicsi (`BICEPS`, `TRICEPS`, `ABS`,
        `OBLIQUES`, `NECK`, `FOREARM_FINGERS`) ~4–5;
  - **RPE-módosító** csak rögzített RPE esetén, kis lineáris szorzó a szett alatti MET-en
        (RPE 6 → ~0.9 … RPE 10 → ~1.1); RPE nélkül 1.0;
  - **pihenő** = időtartam − Σ terhelési idő; szettenként ~2–3 perces regenerációs ablak emelt MET-en
        (~2.5–3), azon túl tétlen szint (1.5) — a `#171` `f = min(1, szett × ablak / pihenőPerc)` képletével.
- [ ] A végleges konstansokat úgy kalibrálni, hogy egy tipikus session (60 perc, ~18 összetett szett)
      a Compendium 3.5–6 MET sávjába essen — ez plauzibilitási teszt (mint a `#130`-é).
- [ ] Bemelegítő (`WARMUP`) szett beleszámít (dolgozik az izom), de a szett alatti MET-je nem kap
      RPE-szorzót.
- [ ] A szett-adatok nélküli session (csak kézi időtartam) egy fix, csökkentett alap-MET-et kap
      (javaslat: 4.0 az 5.0 helyett).
- [ ] `HIIT_CIRCUIT` változatlan, 8.0 fix (definíció szerint sűrű).
- [ ] A `szettek × 3 perc` fallback-időtartamú session kcal-ja ne essen a régi érték töredékére (a
      fallback-időn belül az ablakok fedjék le a pihenőt — mint a `#171`-nél).
- [ ] Az élő és utólagos kcal-előnézet ugyanazt a függvényt használja; a lista-kcal is.
- [ ] Unit tesztek: izomcsoport-osztályok, RPE-módosító, sűrű vs ritka session, hangboard-session,
      szett nélküli session, fallback-időtartam, plauzibilitási sáv.
- [ ] [[Edzésnapló]] „Kalória (kanonikus)” és [[Tápérték kalkulátor]] „Erőedzés” átírva a forrásokkal
      és egy kidolgozott példával; `#### Tudatos korlát`: a nem naplózott szettek nem nyitnak ablakot.

## Terv / döntési napló

- Javaslat-szintű hatás (70 kg): 60 perc / 18 összetett szett ~280 → ~180 kcal (≈ 3.6 MET);
  60 perc kar / izoláció ~280 → ~125 kcal; 45 perc hangboard ~210 → ~80 kcal; 90 perc / 12 szett
  beszélgetős erősen csökken.
- A szett alatti MET-re kevés a mért adat → a konstansok a session-szintű Compendium-sávhoz
  kalibrálandók, nem fordítva. A becslés hibája így is ~±30%, de reagál a tényleges munkára.
- A súly (`weightKg`) / volumen közvetlen használatát elvetettük az első körben: a mozgatási távolság
  (ROM) gyakorlatonként ismeretlen, a testsúlyos és rásegített (negatív kg) szettek torzítanák.
- A kcal élőben számolódik → a múltbeli napok erőedzés-kalóriája **visszamenőleg** változik (mint
  `#130`, `#164`, `#171`).
- Backend, OpenAPI, séma, outbox, i18n várhatóan nem érintett (tiszta kliensoldali számítás).

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] — Kalória (kanonikus); [[Tápérték kalkulátor]] — Erőedzés
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #173 izomcsoport- és sűrűségfüggő erőedzés-kalória
- Kód: `frontend/src/app/pages/workout/log/workout-metrics.ts` (+ spec)
