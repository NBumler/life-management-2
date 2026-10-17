---
id: 156
type: change-request
status: in-progress
title: Színsáv — a felesleges „Változat” (variant) mező megszüntetése
specs:
  - "[[Indoor boulder admin]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-17
---

# 156 — Színsáv — a felesleges „Változat” (variant) mező megszüntetése

## Motiváció / probléma

Felhasználói észrevétel: a mászó admin színsáv-szerkesztőjében van egy „Változat” választó
(`PLUS` / `MINUS` / `NEUTRAL`), aminek nincs értelme. A sávon belüli +/− pozíciót a beltéri boulder
kísérlet `bandModifier`-e (`backlog/122`) már rögzíti — az a sáv alsó / közép / felső indexét
választja —, a sáv saját `variant`-ja semmibe nem számít bele.

## Jelenlegi működés

- [[Indoor boulder admin]] adatmodell: `variant` enum, kötelező; a szerkesztő `ion-select`-tel kéri,
  alapértéke `NEUTRAL`.
- Semmilyen számítás (index, statisztika, kalória) nem olvassa; egyedül a terem szerkesztő
  sávlistája írja ki nyersen (`6A–6B · NEUTRAL`).
- [[Mászónapló]] `bandModifier`: „Független a sáv admin-oldali `variant`-jától”.

## Elfogadási kritériumok

- [ ] A színsáv szerkesztőben nincs „Változat” mező; a terem sávlistája csak a fokozat-sávot írja ki.
- [ ] `GymColorBand` OpenAPI séma, backend entitás / mapper / service: nincs `variant`; Flyway
      migráció eldobja a `gym_color_band.variant` oszlopot.
- [ ] Helyi SQLite: az oszlop holt mezőként marad (precedens: V30 / V36 — nem minden on-device
      SQLite build enged `DROP COLUMN`-t); a row-mapper nem olvassa, az írás konstans `'NEUTRAL'`-lal
      tölti a `NOT NULL` megkötés miatt.
- [ ] Outbox: `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump, a függő `GymColorBand` payloadokból a migrátor
      leveszi a `variant` kulcsot.
- [ ] A `bandModifier` működése változatlan.

## Terv / döntési napló

- Nincs adat-átmentés: a `variant` érték sehol nem hordozott jelentést, eldobható.

## Lezáráskor (on-done)

- Frissített specek: [[Indoor boulder admin]] — adatmodellből a `variant` kikerül; [[Mászónapló]] — a
  `bandModifier` sorból a „független a variant-tól” megjegyzés kikerül
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #156 színsáv `variant` mező megszüntetése
- Kód: `climbing` (backend), `gym-color-band-edit.page`, `gym-color-band.repository`, `local-rows`, `outbox-migrator`
