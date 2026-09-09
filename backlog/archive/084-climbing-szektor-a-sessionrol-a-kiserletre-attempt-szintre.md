---
id: 84
type: change-request
status: done
title: Mászás — a szektor a session szintről a kísérlet (attempt) szintre kerüljön
specs:
  - "[[Mászónapló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Outdoor köteles napló]]"
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-09
closed: 2026-09-09
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

- [x] `AscentAttempt` kap opcionális `sectorId` (+ `sectorName` snapshot) mezőt; a `Crag` marad
      session szinten (egy session = egy crag), a szektor kísérletenként választható.
- [x] Új kísérletnél a szektor **előtöltődik** az előző kísérlet szektorával (első sornál az
      utolsó ilyen kontextusú session utolsó kísérletének szektorából), de átváltható; a `Crag`
      váltása minden sor szektorát törli.
- [x] Az `aspect` / `rockType` **teljesen kikerült** a session (és a napló) szintjéről: ezek a
      törzsadat (út / szektor / szikla) tulajdonságai, a napló legfeljebb megjeleníti a
      `Route` → `Sector` / `Crag` láncból feloldva. Öröklési sorrend újradefiniálva a
      [[Mászónapló]] / [[Outdoor köteles napló]] / admin specekben.
- [x] Migráció: `V37__climbing_sector_to_attempt.sql` — `ascent_attempt` kap `sector_id` (valós FK)
      + `sector_name` oszlopot, a meglévő session-szektor lemegy minden kísérletére, a
      `climbing_session` 4 oszlopa (`sector_id`, `sector_name`, `rock_type`, `aspect`) **eldobva**.
      Helyi `SCHEMA_V36`: `ascent_attempt` oszlopok + backfill; a `climbing_session` oszlopok
      helyben megmaradnak dead NULL oszlopként (natív SQLite `DROP COLUMN` óvatosság).
- [x] OpenAPI `ClimbingSession` / `AscentAttempt` séma + `gen:api`.
- [x] Nem érinti az indoor kontextusokat (ott `gymId` marad session szinten; `AscentAttempt.sectorId`
      indoornál `null`).
- [x] Outbox `OUTBOX_PAYLOAD_SCHEMA_VERSION` v4 → v5 + `ClimbingSession` migrátor-lépés
      (`moveClimbingSessionSectorToAttempts`) + snapshot újra-elfogadva.

_(A statisztikák / szektor-szűrők nem használják a szektort — a `climbing-stats` modul nem
hivatkozza; nincs teendő.)_

## Terv / döntési napló

_Döntés a scopingban (a felhasználóval egyeztetve): a `Crag` session-szintű marad, csak a `Sector`
költözik a kísérletre. A session `sector_id` oszlop **teljes eltávolítása** (nem „utolsó használt").
Az `aspect` / `rockType` a felhasználó javaslatára **teljesen kikerül** a session/kísérlet szintjéről
— a szikla helyben marad, ezek a törzsadat tulajdonságai; a napló csak megjeleníti. Elfogadott
következmény: egy régi session a szektora / sziklája **aktuális** `defaultAspect` / `defaultRockType`
értékét mutatja (a divergáló session-szintű felülírás nem őrződik meg) — személyes naplónál rendben._

## Lezáráskor (on-done)

- Frissített + `verifikalt_commit: 05094a4`-re stampelt specek: [[Mászónapló]] (`AscentAttempt`
  `sectorId` / `sectorName` sor, `ClimbingSession` mezőtábla, `aspect` próza + backend),
  [[Outdoor köteles napló]] / [[Outdoor boulder napló]] (Helyszín / `rockType` / `aspect` sorok,
  UI/UX, Backend), [[Outdoor köteles admin]] / [[Outdoor boulder admin]] (öröklés jegyzet).
- `IMPLEMENTATION_STATUS.md`: `2026-09-09 — #84` sor a „Lezárt jegyek (restructure után)" tetején.
- Kód: backend `AscentAttemptEntity`/`AscentAttemptMapper`, `ClimbingSessionEntity`/`Mapper`/`Service`,
  `V37__climbing_sector_to_attempt.sql`, OpenAPI `AscentAttempt.yaml` + `ClimbingSession.yaml`,
  `ClimbingSessionServiceTest` + `ClimbingSessionIntegrationTest`. Frontend `gen:api`,
  `core/data/local-rows.ts`, `core/storage/{storage-backend,sqlite-storage-backend,http-storage-backend,
  local-database.service}.ts` (`SCHEMA_V36`), `core/sync/{offline-queue.service,outbox-migrator}.ts` +
  snapshot, `naplo/outdoor-{rope,boulder}-session-edit.{ts,html}`, `naplo/indoor-{rope,boulder}-session-edit.ts`,
  és a mászás `*.spec.ts`-ek.
- Zöld kapu: FE lint ✓ · `test:ci` 1621 ✓ · build ✓ · `verify:outbox` v5 / 36 ✓ · BE `./gradlew test` ✓.
- Követő jegy: `backlog/088` (szektor-szintű alapértelmezett úthossz) — a szektor költözése után az
  attempt szektorából számol.
