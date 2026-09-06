---
id: 79
type: feature
status: backlog
title: Mászó admin — opcionális topó-sorszám az utakhoz, alfanumerikus rendezés a pickerekben
specs:
  - "[[Outdoor köteles admin]]"
  - "[[Outdoor boulder admin]]"
  - "[[Indoor boulder admin]]"
  - "[[Indoor köteles admin]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed:
---

# 79 — Mászó admin — opcionális topó-sorszám az utakhoz, alfanumerikus rendezés a pickerekben

## Motiváció / probléma

Az utak / problémák sokszor felmászókönyvből (topó) kerülnek be. Jó lenne opcionálisan megadni a
topó **sorszámát** minden úthoz, hogy:
1. könnyű legyen a könyv ↔ app megfeleltetés (ránézésre stimmel-e),
2. ahol az utakat listázzuk / választjuk (admin lista **és** a session kísérlet-hozzáadás
   select-je), a sorszám szerint legyenek rendezve — a topó sorrendjében, ne név szerint.

Az index **nem csak szám**: van „5/a” és „5/b” típusú jelölés is, tehát természetes
alfanumerikus (numerikus prefix + betű) rendezés kell, nem sima string-sort (különben „10”
a „2” elé kerül).

## Jelenlegi működés

[[Outdoor köteles admin]] `Route`: `name`, `guidebookGrade`, `lengthInMeters`, `totalPitches`,
`rockType`, `aspect`, soft delete. [[Outdoor boulder admin]] `BoulderProblem`: név,
`guidebookGrade`, `sectorId`. **Nincs** topó-sorszám mező. A route/probléma pickerek rendezése a
specben nincs kikötve (feltehetően név vagy felvételi sorrend).

## Elfogadási kritériumok

- [ ] Opcionális `topoNumber` (vagy `guidebookIndex`) szabad szöveg mező a `Route` /
      `BoulderProblem` / `IndoorRoute` entitásokon (rövid string, pl. „12”, „5/a”, „5b”).
- [ ] Természetes rendező kulcs: numerikus rész számként, a maradék betű másodlagos kulcsként
      (`2` < `5/a` < `5/b` < `10`); üres `topoNumber` a lista végére (vagy elejére — döntés).
- [ ] A rendezés érvényes: admin lista(k) + a session „kísérlet hozzáadása” út/probléma
      select — ha van `topoNumber` a szektorban, az szerint; különben fallback (név / grade).
- [ ] Flyway migráció + helyi SQLite `SCHEMA_Vn` új blokk + OpenAPI séma.
- [ ] Nem uniqueness-kényszerített (két úton lehet elírásból ugyanaz), de figyelmeztetés opcionális.
- [ ] Parity: a natural-sort összehasonlító kliens + (ha rendez) backend azonos — fixture.

## Terv / döntési napló

_A `topoNumber` szektor-scope-ban értelmezett (egy topó = egy szektor/terület számozás). A
natural-sort util újrahasznosítható másutt is. Döntés: a picker mutassa-e a sorszámot a név előtt
(pl. „12 · Sárga áthajlás 6b”)._

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor köteles admin]], [[Outdoor boulder admin]], [[Indoor boulder admin]],
  [[Indoor köteles admin]] (`Route`/`BoulderProblem`/`IndoorRoute` mezők + rendezés),
  [[Mászónapló]] (picker rendezés, ha ott dokumentált)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `hu.bumler.lm2.climbing` (mező + migráció), `frontend` admin listák + climbing session edit route picker + natural-sort util
