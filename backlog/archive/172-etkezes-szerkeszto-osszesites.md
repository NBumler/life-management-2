---
id: 172
type: change-request
status: done
title: Étkezés-szerkesztő — az étkezés összesített makrói és ára
specs:
  - "[[Étkezés]]"
flag:
created: 2026-10-18
closed: 2026-10-18
---

# 172 — Étkezés-szerkesztő — az étkezés összesített makrói és ára

## Motiváció / probléma

Étkezés rögzítésekor / szerkesztésekor, miután a tételek ki vannak választva, nem látszik, mennyi
az adott étkezés egészére a kalória, a makrók (fehérje / szénhidrát / zsír) és az ár. Csak
tételenként van egy „effektív kcal, Ft" sor, makrók egyáltalán nincsenek, összeg nincs.

## Jelenlegi működés

[[Étkezés]] „UI/UX elvárások": a tétellista kompakt összegző sorai „mennyiség · adagszorzó ·
effektív kcal/ár"-t mutatnak; étkezés-szintű összesítő nincs. Makró-összesítés csak a napi
dashboardon (progress barok + napi ár) látszik, mentés után.

## Elfogadási kritériumok

- [x] Az étkezés-szerkesztő láblécében, a Mentés gomb fölött, ha van legalább egy tétel, élő
      összesítő látszik: kcal + ár, és fehérje / szénhidrát / zsír grammban.
- [x] Az összesítő a tételek effektív (adagszorzós, felülírásos) értékeinek összege — ugyanazzal a
      `computeMealItemEffective` számítással, mint a tételsor és a napi dashboard.
- [x] Élőben követi a tétel-szerkesztő modal változtatásait, tétel hozzáadását / törlését.
- [x] Ha egy tételhez hiányzik katalógusadat, „becsült" jelzés látszik (mint a dashboardon).
- [x] hu/en i18n paritás.

## Terv / döntési napló

- A lábléc mindig látszik (görgetéstől függetlenül), ezért oda került, nem a lista alá.
- Számítás: `meal-item-summary.ts` `sumMealItemEffective()` — tisztán, a sor-modelltől függetlenül
  összead; a page egy `computed`-ban hívja (a sorok signal-mezői miatt a modal szerkesztése is
  újraszámol). Kiürítetlen FOOD mennyiség 0-nak számít (a `toSaveItem` meglévő viselkedése).

## Lezáráskor (on-done)

- Frissített specek: [[Étkezés]] — UI/UX elvárások: étkezés-szintű élő összesítő a láblécben.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-18 — #172 étkezés-szerkesztő összesítő.
- Kód: `frontend/src/app/pages/food/meal/meal-edit.page.*`, `meal-item-summary.ts`, i18n.
