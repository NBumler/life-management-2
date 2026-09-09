---
id: 84
type: change-request
status: backlog
title: Mászás — a szektor a session szintről a kísérlet (attempt) szintre kerüljön
specs:
  - "[[Mászónapló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Outdoor köteles napló]]"
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-09
closed:
---

# 84 — Mászás — a szektor a session szintről a kísérlet (attempt) szintre kerüljön

## Motiváció / probléma

Jelenleg a `sectorId` a `ClimbingSession` szinten van (egy session = egy crag + egy szektor).
A valóságban egy session alatt gyakran több szektorban is mászunk — pl. Rókahegyen belül
oda-vissza sétálgatva 4 szektort is érinthetünk egy alkalommal. A szektort ezért **kísérletenként**
(`AscentAttempt` szinten) kell megadni, nem a session tetején.

## Jelenlegi működés

- [[Outdoor boulder napló]]: „Helyszín — `cragId` + `sectorId` (+ snapshot nevek)" a session
  szinten; `aspect` = Sector default, session szinten felülírható.
- [[Outdoor köteles napló]]: `rockType` / `aspect` öröklési sorrend Route → Sector default →
  session felülírás.
- [[Mászónapló]] `ClimbingSession`: `gymId` / crag–sector hivatkozások a session mezői közt;
  `AscentAttempt`-nek nincs saját szektor mezője.

## Elfogadási kritériumok

- [ ] `AscentAttempt` kap opcionális `sectorId` (+ snapshot név) mezőt; a `Crag` marad session
      szinten (egy session = egy crag), a szektor kísérletenként választható.
- [ ] Új kísértnél a szektor **előtöltődik** az előző kísérlet szektorával (a gyakori eset:
      több egymást követő út ugyanabban a szektorban), de átváltható.
- [ ] Az `aspect` / `rockType` öröklés a kísérlet szektorából számol (a session-szintű
      felülírás megszűnik vagy az attempt-szintű alá kerül) — az öröklési sorrend újradefiniálva
      a [[Mászónapló]] / [[Outdoor köteles napló]] specben.
- [ ] Migráció: a meglévő session-szintű `sectorId` lekerül minden kísérletére (backend Flyway +
      helyi `SCHEMA_Vn`); a session `sectorId` oszlop sorsa eldöntve (drop vs. „utolsó használt").
- [ ] OpenAPI `ClimbingSession` / `AscentAttempt` séma + `gen:api`.
- [ ] A statisztikák / szektor-szűrők a kísérlet szektorát használják.
- [ ] Nem érinti az indoor kontextusokat (ott `gymId` marad session szinten).

## Terv / döntési napló

_Döntés a scopingban: a `Crag` maradjon-e kötelezően egy session-re egy, vagy az is menjen
attemptre. Jelen javaslat: `Crag` session-szintű marad, csak a `Sector` költözik — a legtöbb
alkalom egy craghez tartozik, csak a szektorok váltakoznak._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] (`AscentAttempt` `sectorId` + öröklési sorrend),
  [[Outdoor boulder napló]] / [[Outdoor köteles napló]] (Helyszín / `aspect` / `rockType` sorok),
  [[Outdoor boulder admin]] / [[Outdoor köteles admin]] (öröklés jegyzet)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: backend `hu.bumler.lm2.climbing` (`AscentAttempt` entitás/mapper/service, `V<n>` migráció),
  OpenAPI `ClimbingSession` / `AscentAttempt`; frontend `core/storage/*`, `local-rows.ts`,
  `SCHEMA_V<n>`, `naplo/outdoor-*-session-edit.*`, érintett `*.spec.ts`
