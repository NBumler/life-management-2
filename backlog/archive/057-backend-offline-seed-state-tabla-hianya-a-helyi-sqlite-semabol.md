---
id: 57
type: chore
status: done
title: Backend-offline: seed_state tabla hianya a helyi SQLite semabol
specs:
  - "[[Backend-offline first]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 57 — Backend-offline: seed_state tabla hianya a helyi SQLite semabol

## Motiváció / probléma

A local-database.service.ts nem definial seed_state tablat, pedig a Backend-offline first.md 3. szakasz explicit felsorolja.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

`local-database.service.ts` `SCHEMA_V29`: `seed_state (seed_key TEXT PK, seed_version INTEGER,
applied_at TEXT)`. `SCHEMA_VERSION` 28 → 29.

`exercise-seed.ts`: `EXERCISE_SEED_KEY = 'exercise'`, `EXERCISE_SEED_VERSION = 1` — a latch
identitása; a verziót bumpolva az `exercise-seed.json` bővülése meglévő telepítésekre is lemegy.

`SqliteStorageBackend.seedExercises` (natív): a `seed_state` latch dönt — ha a `seed_key`-hez tárolt
`seed_version >= EXERCISE_SEED_VERSION`, no-op (akkor is, ha a user közben minden gyakorlatot
törölt). Egyébként: ha az `exercise_catalog` üres, lefut a seed; a végén a latch `ON CONFLICT`
upsert. A „katalógus már nem üres" check továbbra is rövidre zárja a másik eszközről
beszinkronizált katalógust.

`HttpStorageBackend.seedExercises` (web): a per-user `localStorage` kulcs mostantól a `seed_version`-t
tárolja (`Number(stored) >= EXERCISE_SEED_VERSION` → no-op) — a natív `seed_state` on-device
analógja. A korábbi `'1'` érték továbbra is latch-elt (`1 >= 1`).

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
      (`[[Backend-offline first]]` §3 „helyi séma" + §15 „Seed és statikus asset".)
- [x] Ha „Nem scope” blokkból jött: n/a — audit-találat.

## Terv / döntési napló

- **A tábla nem „holt séma"** — a natív seed-latchet ténylegesen erre kötöttük, így web és natív
  szimmetrikus (mindkettő `seed_version`-alapú latch), nem csak deklaráltuk a táblát a spec-paritásért.
- **`seed_version` oszlop az egyszerű bool helyett** — jövőbeli seed-bővítés (`exercise-seed.json` új
  sorai) így célzottan újrafuttatható meglévő telepítéseken a konstans bumpjával, séma-migráció nélkül.
- **Nincs V29 adat-backfill** — meglévő telepítésen az első `seedExercises()` hívás a „katalógus már
  nem üres" ágon ír latchet, dupla seed nélkül.
- **Nincs új unit teszt** — a két storage backend Karma alatt nincs lefedve (natív SQLite plugin /
  élő API kell), a `seedExercises` viselkedést az `exercise.repository.spec.ts` a backend-mockon
  keresztül fedi; a végpontok zöld lint + build + a teljes 1454-es suite igazolja a nem-regressziót.

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]] (§3 helyi séma, §15 Seed és statikus asset)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #057 seed_state helyi latch tábla + natív verzió-latch
- Kód: `frontend` `core/storage/local-database.service.ts` (SCHEMA_V29), `core/data/exercise-seed.ts`, `core/storage/{sqlite,http}-storage-backend.ts`
