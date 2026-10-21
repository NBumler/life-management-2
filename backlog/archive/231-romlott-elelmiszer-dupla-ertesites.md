---
id: 231
type: change-request
status: done
title: Élelmiszer tároló — romlott tételről ne jöjjön naponta dupla értesítés
specs:
  - "[[Értesítések]]"
  - "[[Élelmiszer tárolás]]"
flag:
created: 2026-10-21
closed: 2026-10-21
---

# 231 — Élelmiszer tároló — romlott tételről ne jöjjön naponta dupla értesítés

## Motiváció / probléma

Bejelentés (bugként): egy megromlott élelmiszerről dupla értesítés jön — „Élelmiszer hamarosan lejár” és
„Élelmiszer megromlott” —, és a romlás után minden nap újra ott van a „hamarosan lejár”. Romlott tételre a
„hamarosan lejár” félrevezető és zaj.

## Jelenlegi működés

[[Értesítések]] §1–2: a `FOOD_EXPIRING_DAILY` a lead-time napjától napi 09:00-kor megy, **amíg a tétel a
tárolóban van — romlott vagy sem** („A napi `FOOD_EXPIRING_DAILY` ettől függetlenül mehet…”); mellette a
`FOOD_SPOILED_ONCE` élettartam alatt egyszer. A kód ezt pontosan így valósította meg
(`foodExpiringDailyRules`, teszt: „keeps firing after the item has spoiled”), tehát spec-szerinti viselkedés
szándékos megváltoztatása → `change-request`.

## Elfogadási kritériumok

- [x] A `FOOD_EXPIRING_DAILY` a lead-time napjától a lejárat napjáig (azt is beleértve) megy; `expiresOn < ma`
      (romlott, a tárolólista jelvényével azonos szabály) tételre nem.
- [x] A `FOOD_SPOILED_ONCE` változatlan: romláskor egyszer.
- [x] A háttér-worker terve ugyanazokat a szabályfüggvényeket használja, így ott sincs romlott tételre napi
      emlékeztető.
- [x] A Menü → Értesítések kapcsoló-magyarázat (hu/en) a lejárat napjáig tartó ablakot írja.

## Terv / döntési napló

- 2026-10-21 — felvéve és kész. A `FOOD_SPOILED_ONCE` élettartam-dedupéja (registry → dedupe, háttér-ledger
  merge, prune-mentesség) átnézve: nem talált hibát; a napi ismétlődés a `FOOD_EXPIRING_DAILY` romlás utáni
  folytatásából jött. Egy guard a `foodExpiringDailyRules` elején (`item.expiresOn < todayIso` → skip).

## Lezáráskor (on-done)

- Frissített specek: [[Értesítések]] (§1 ütemezés: a lejárat napjáig; §2: romlott tételre nincs napi emlékeztető),
  [[Élelmiszer tárolás]] (Értesítések „Küldés” sor)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-21 — #231
- Kód: `frontend/src/app/core/notifications/notification-rules.ts` (+ `.spec.ts`), `assets/i18n/{hu,en}.json`
