---
id: 79
type: feature
status: done
title: Mászó admin — opcionális topó-sorszám az utakhoz, alfanumerikus rendezés a pickerekben
specs:
  - "[[Outdoor köteles admin]]"
  - "[[Outdoor boulder admin]]"
  - "[[Indoor köteles admin]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
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

### Döntések

- **Mező neve:** `topoNumber` (rövid szabad szöveg, backend + OpenAPI `maxLength: 32`, frontend
  `Validators.maxLength(32)` + `<ion-input maxlength=”32”>`).
- **Scope:** szektor- (outdoor) ill. terem- (indoor) scope; nem uniqueness-kényszerített.
- **Rendezés:** természetes alfanumerikus — numerikus prefix számként, a maradék karakter-chunk
  másodlagos kulcsként (`2` < `5/a` < `5/b` < `10`); numerikus chunk a nem-numerikus elé; betű
  kis-/nagybetű-független, nyers code-unit a tie-break. Üres / hiányzó `topoNumber` a lista **végére**
  kerül, ott név szerint. Pinnelve: `shared/fixtures/natural-sort.json`.
- **Backend rendez-e?** **Nem.** A `route` / `boulder_problem` / `indoor_route` lista-végpontok név
  szerint maradnak; a topó-rendezés tisztán kliensoldali (`shared/natural-sort.ts`), a repository
  `forSector()` / `forGym()` seam-jén — így minden fogyasztó (admin szektor/terem lista + mind a 3
  napló-picker) egyszerre kapja. Ezért **nincs** Java komparátor / backend fixture-fogyasztó.
- **Picker megjelenítés:** a sorszám az opció-címke / lista-sor elé kerül (`12 · Név`).
- **`[[Indoor boulder admin]]` kivéve a `specs`-ből:** az a spec nem hivatkozik `IndoorRoute`-ra
  (Gym + GymColorBand), az indoor-boulder naplónak nincs út-pickere — nem érintett.

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor köteles admin]], [[Outdoor boulder admin]], [[Indoor köteles admin]]
  (`Route`/`BoulderProblem`/`IndoorRoute` `topoNumber` mező + rendezés), [[Mászónapló]] (picker
  rendezés + backend oszlopjegyzet); mind `verifikalt_commit: 99ba651`
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #079 climbing `topoNumber` + természetes rendezés
- Kód backend: `V33__climbing_route_topo_number.sql` (3 tábla), `RouteEntity`/`BoulderProblemEntity`/
  `IndoorRouteEntity` + mapperek + service `applyFields`, OpenAPI `Route`/`BoulderProblem`/`IndoorRoute`
  séma, `Route`/`BoulderProblem`/`IndoorRouteServiceTest`
- Kód frontend: `gen:api` (3 model), `shared/natural-sort.ts` + `.spec.ts` + `shared/fixtures/natural-sort.json`,
  `SCHEMA_V32` (3 `ALTER TABLE ... ADD COLUMN`, `SCHEMA_VERSION = 32`), `local-rows.ts` (3 row + write /
  server-apply task), `route`/`boulder-problem`/`indoor-route.repository.ts` (`*SaveInput` + `forSector`/
  `forGym` természetes rendezés), 3 admin edit page (`<ion-input>` + form control), admin lista +
  napló picker megjelenítés (sorszám-prefix), 2 napló ad-hoc `save()` hívás, i18n `hu`/`en`
  (`FIELD_TOPO_NUMBER`(`_PLACEHOLDER`) × 3 szekció), érintett `*.spec.ts`-ek
