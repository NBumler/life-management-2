---
id: 157
type: feature
status: in-progress
title: Röplabda napló — nagyon óvatos (alulbecslő) MET kalória
specs:
  - "[[Röplabda napló]]"
  - "[[Tápérték kalkulátor]]"
  - "[[Edzés]]"
  - "[[Frontend]]"
flag: edzes.roplabda
created: 2026-10-17
closed:
---

# 157 — Röplabda napló — nagyon óvatos (alulbecslő) MET kalória

## Motiváció / probléma

Új sport: (terem)röplabda naplózása az Edzés tab alatt, hozzájárulással az `activityExtraKcal`-hoz.
A gond: az időtartamon kívül semmi nem mérhető könnyen, az intenzitás pedig nagyon széles skálán mozog
(könnyű ellenfélnél alig kell mozogni, erősnél rengeteget). **A felhasználó elvárása: semmilyen
körülmények között ne becsüljön felül** — inkább alulbecsüljön.

### Kutatási háttér (2026-10-17)

- **2024 Adult Compendium of Physical Activities** (pacompendium.com/sports): röplabda nem
  versenyszerű (6–9 fős csapat) **3.0 MET**; versenyszerű, teremben **6.0**; strand **8.0**;
  régi Taylor-kód 4.0. → 2–2,7× szórás, csak időtartamból középértékkel ±250–350 kcal / 90 perc.
- **Time-motion vizsgálatok** (NCAA D-I női; profi strand; brazil ifi): a labda az idő
  **17–29%-ában** van játékban, labdamenet átlag 6–8 s, pihenő 18–33 s. A kalóriát a labdamenetek
  száma/hossza (≈ az ellenfél szintje) dönti el, nem az alkalom hossza.
- **Mért mérkőzésérték** (thai disszertáció, kis minta): poszttól függően **5.0–6.7 kcal/perc**
  (≈4,5–5,5 bruttó MET 70 kg-nál), átlagpulzus ~140. → a 6.0 MET inkább felső érték.
- Amatőr edzés Polar-pulzusbecsléssel ~580 kcal/óra (Sport i Turystyka 2019) — pulzusalapú
  becslés szakaszos sportban felfelé torzít.
- Szakaszos csapatsportban az eszközös (GPS / metabolic power) becslések is gyengék
  (Tutu Dasa et al. 2022, női foci, indirekt kalorimetria vs. eszköz).

## Jelenlegi működés

Nincs röplabda az appban. Rokon minta: [[Úszás napló]], [[Biciklizés napló]] (lapos MET napló).

## Elfogadási kritériumok

- [ ] Lapos, user-owned `VolleyballLog` entitás (backend + OpenAPI + sync + lokális SQLite + outbox),
      az `SwimLog` mintájára: `date`, `durationMinutes` (1–240, **pályán töltött idő**),
      opcionális `intensity` (`LIGHT`/`MODERATE`/`HARD`, csak statisztika), opcionális `setsPlayed`,
      opcionális `notes`.
- [ ] `kcal = VOLLEYBALL_NET_MET (2.0) × m × durationMinutes / 60` — **egyetlen fix nettó MET**,
      az `intensity` nem befolyásolja (75 kg × 90 perc = 225 kcal bármilyen meccsre).
- [ ] `durationMinutes` > 240 → 400 a backenden, az űrlap nem engedi menteni.
- [ ] Edzés tab „Röplabda” szegmens `edzes.roplabda` flag mögött (lista + szerkesztő, élő kcal
      előnézet, súgók: pályán töltött idő; intenzitás csak statisztika; óvatos becslés).
- [ ] `activityExtraKcal` és a Kezdőlap „mai edzések” widget tartalmazza.
- [ ] Spec: új [[Röplabda napló]], [[Tápérték kalkulátor]] MET tábla, [[Edzés]], [[Frontend]].

## Terv / döntési napló

- **Egy fix MET, nincs intenzitásfüggés:** egy rossz önértékelés („kemény” egy könnyű meccsre)
  ~1,5× felülbecslést adna — ez sérti a „soha ne becsüljön felül” elvárást.
- **Nettó MET (bruttó − 1):** a nyugalmi égetést már fedezi a `maintenanceKcal = BMR × 1.2`.
  2.0 nettó = 3.0 bruttó = a Compendium legalacsonyabb röplabda-értéke; minden mért meccsérték
  felette van. Kemény meccsen akár ~2,5× alulbecslés — tudatosan vállalt.
- **Csak pályán töltött idő:** a kispad / várakozás nem számít.
- **240 perces plafon:** egy elgépelés ne fújhassa fel a keretet.
- Strandröplabda nincs (8.0 MET mellett túl nagy a tévedési kockázat).
- A meglévő MET naplók bruttó vs. nettó kérdése külön jegy: [[158-met-brutto-netto-dupla-szamolas]].

## Lezáráskor (on-done)

- Frissített specek: …
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: …
