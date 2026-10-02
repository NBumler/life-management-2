---
id: 144
type: change
status: in-progress
title: "Heti terv: rotációs előrejelzés + kézi felülírás a fix napi kiosztás helyett; „Ugyanaz, mint legutóbb” megszűnik"
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-10-02
closed:
---

# 144 — Rotációs előrejelzés a fix heti kiosztás helyett

## Motiváció / probléma

A #143 utáni végigpróbálás (Chrome demó) után a felhasználó szerint két párhuzamos „terv” van: a
[[Heti terv]] fix napi sablon-kiosztása (örökléssel, „Mostantól / Csak erre a hétre” fülekkel,
„Ütközés” jelvénnyel) és az [[Edzésnapló]] dátumhoz nem kötött rotációs javaslata (amely egy nap
alatt végigpörgethető, pihenőnapot nem tervez). Rendszertelen mászás mellett a fix kiosztás nem
használható, a kettő együtt zavaros; a „Mostantól / Csak erre a hétre” mód-kapcsoló fülnek látszik
(rossz UX); az „Ütközés” jelentése nem érthető. Az „Ugyanaz, mint legutóbb” gombra nincs szükség.

## Jelenlegi működés

[[Heti terv]]: `WeeklyPlan` slotok (nap → sablon), öröklés előre (`resolveEffectiveWeek`),
„Teljesítve” adherence, „Ütközés” jelvény; [[Edzésnapló]] gyorsindító: mai slot + „Következő
javasolt (rotáció)” (`suggestNextPlan`), „Ugyanaz, mint legutóbb”.

## Elfogadási kritériumok

- [x] „Ugyanaz, mint legutóbb” gomb és logika törölve.
- [x] `WeeklyPlanSlot.kind` (`PLAN` | `REST`), `planId` csak `PLAN`-nál kötelező; Flyway + OpenAPI +
      SQLite + outbox-verzió. A slot = egy napra szóló kézi felülírás (nincs öröklés).
- [x] Tiszta TS előrejelző (múlt: rögzített adat; ma / jövő napról napra):
  - [x] kézi felülírás nyer (sablon / pihenő);
  - [x] tervezett mászás → mászónap (terhelő, edzés nélkül);
  - [x] terhelő blokk limit felváltva 2 / 3 (előző blokk ≥ 3 → most 2, különben 3) → Pihenő;
  - [x] egyébként edzés: a rotáció következő sablonja (legrégebben csinált; az előrejelzett és a
        felülírt napok is léptetik), mászás előtti napon ujjmentes;
  - [x] javasolt, de nem rögzített múltbeli nap = pihenőnap (a blokk újraindul);
  - [x] ma már rögzített edzés után aznapra nincs újabb javaslat.
- [x] [[Edzésnapló]] gyorsindító: „Mai javaslat: X [Indítás]” / „Ma pihenőnap” / „Ma mászás” /
      „Mai edzés kész · Következő: X (nap)”; „Terv indítása…” marad.
- [ ] [[Heti terv]] napsorok: múlt = tényleges jelvények („Edzés: sablonnév”); ma / jövő =
      előrejelzés („Javasolt: X” / „Pihenő” / „Mászás (tervezett)”, „kézi” jelölés); tap →
      action sheet: Automatikus (rotáció) / aktív sablonok / Pihenő. Megszűnik: slot-legördülő,
      „Mostantól / Csak erre a hétre”, öröklés, „Ütközés”, „Teljesítve”.
- [x] `NO_REST_AHEAD` az előrejelzésből számol.
- [x] Napváltás: a gyorsindító és a Heti terv a következő megjelenéskor az új napra számol.
- [ ] Specek frissítve.

## Terv / döntési napló

- 2026-10-02: felhasználói döntés: „Csak rotáció + előrejelzés”, kézi felülírással („pl. ha épp
  fáj valamim”), a felülírt értéktől folytatódik a rotáció. Pihenő-szabály: felváltva 2, illetve 3
  terhelő nap után pihenő; a javasolt, de nem rögzített nap pihenőnapnak számít.
- A kézi felülírás a meglévő `WeeklyPlan` slot-sorokat használja (determinisztikus heti UUID,
  nested PUT, szinkron változatlan), öröklés nélkül; a régi slotok a saját napjukra szóló
  felülírássá válnak.
- Implementáció három részben: 1) „Ugyanaz, mint legutóbb” törlés + adatmodell; 2) előrejelző +
  gyorsindító + figyelmeztetések; 3) Heti terv UI + specek.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor
