---
id: 66
type: feature
status: backlog
title: Gyakorlatnak opcionális leírás / megjegyzés mező
specs:
  - "[[Gyakorlat]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-06
closed:
---

# 66 — Gyakorlatnak opcionális leírás / megjegyzés mező

## Motiváció / probléma

Ha egy gyakorlatot pontosan akarok azonosítani (fogásszélesség, szerszám, variáns, cél), most
mindent bele kell zsúfolni a `name`-be — így hosszú, csúnya nevek jönnek létre, amik a listákban
és a session entry snapshotban is rosszul néznek ki. Egy külön, opcionális leírás mező feloldaná
ezt: rövid név + részletek külön.

## Jelenlegi működés

[[Gyakorlat]] → `#### Entitás — Exercise`: a mezők `id`, `name` (kötelező, egyedi az élő
katalóguson), `category`, `kind`, `defaultRestTimeSeconds`, `isFavorite`. **Nincs** szabad
szöveges leírás / cue / megjegyzés mező.

## Elfogadási kritériumok

- [ ] `Exercise.description` (vagy `notes`) opcionális szabad szöveg, hossz-limit meghatározva.
- [ ] Nem része a [[Névegyediség]] összehasonlításnak.
- [ ] Flyway migráció + helyi SQLite `SCHEMA_Vn` új blokk + OpenAPI séma.
- [ ] Gyakorlat szerkesztő űrlapon multi-line mező; a katalógus listában max. 1–2 sor csonkolással.
- [ ] Döntés: az [[Edzésnapló]] session entry snapshotolja-e a leírást is (valószínűleg **nem**
      kell — a leírás nem viselkedést befolyásoló adat, mint a `category`/`kind`).
- [ ] Megjelenik-e élő session közben (pl. felugró cue a szett felett) — opcionális, külön scope.

## Terv / döntési napló

_Vékony feature. A fő döntés a snapshot-kérdés és hogy kell-e a napló-flow-ban megjeleníteni._

## Lezáráskor (on-done)

- Frissített specek: [[Gyakorlat]] (`Exercise` entitás tábla), esetleg [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `hu.bumler.lm2.workout` + Flyway, `frontend` gyakorlat szerkesztő + local schema
