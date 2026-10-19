---
id: 178
type: change-request
status: backlog
title: Frontend rétegzés — a core/ ne importáljon a pages/ rétegből
specs:
  - "[[Frontend]]"
flag:
created: 2026-10-19
closed:
---

# 178 — Frontend rétegzés: a `core/` ne importáljon a `pages/` rétegből

## Motiváció / probléma

A [[177-tura-offline-route-graph-core-geo-ba]] (túra viewport-gráf a `core/geo`-ba) során derült ki,
hogy a `core/` réteg több helyen a `pages/` rétegből importál. A függőség iránya fordított: a
[[Frontend]] „Rétegzés” táblája szerint a `pages/` „csak repositoryt és shared komponenst használ”, a
számítási utility-k pure TS-ben, framework-függetlenül élnek — vagyis a `core/` és a `shared/` az
alsó réteg, a `pages/` a felső. Ha a `core` a `pages`-re támaszkodik, egy képernyő-mappa átszervezése
a data-réteget töri, és körkörös függőség is kialakulhat.

A spec ezt a szabályt ma **nem mondja ki explicit módon**, és semmi nem ellenőrzi.

## Jelenlegi működés

`core/` → `pages/` importok (spec-fájlok nélkül, 2026-10-19):

| `core/` fájl | importált `pages/` modul | Jelleg |
|---|---|---|
| `core/data/activity-kcal.ts` | `workout/climbing/climbing-attempt-input`, `climbing/climbing-metrics`, `cycling/bike-metrics`, `log/workout-metrics`, `stretch/stretch-metrics`, `swimming/swim-metrics`, `volleyball/volleyball-metrics` | pure kalória-utility |
| `core/data/swim-log.repository.ts` | `workout/swimming/swim-metrics` | pure utility |
| `core/data/climbing-live-session.service.ts` | `workout/climbing/climbing-contexts` | konstans / konfiguráció |
| `core/data/meal.repository.ts` | `food/food-quantity`, `food/meal/recipe-overrides`, `food/storage/stock-consumption` | pure utility |
| `core/data/today-nutrition.service.ts` | `food/meal/daily-nutrition` | pure utility |
| `core/notifications/notification-scheduler.service.ts` | `food/meal/daily-nutrition` | pure utility |
| `core/notifications/notification-rules.ts` | `food/storage/shelf-life` | pure utility |
| `core/data/recurring-expense.repository.ts` | `menu/finance/recurring-expense-math` | pure utility |
| `core/data/trail-segment.repository.ts` | `menu/tura/offline-region.repository` | **repository a képernyő mappájában** |

## Elfogadási kritériumok

- [ ] Döntés a célhelyről: a több rétegből használt pure számítási utility-k a `shared/`
      (framework-független, [[Frontend]] „shared/ … pure TS utility-k”) vagy egy `core/<domain>/`
      almappa alá kerülnek — egységesen, nem esetenként másként.
- [ ] A fenti listán minden import megszűnik: az utility-k átköltöznek (`git mv`, API változatlan),
      a `pages/` és a `core/` is az új helyről importál.
- [ ] `OfflineRegionRepository` → `core/data/` (a többi repository mellé), a túra oldal onnan importál.
- [ ] A [[Frontend]] „Rétegzés” szakasza kimondja a függőségi irányt (`pages` → `core` / `shared` →
      `api`; a `core` és a `shared` nem importál a `pages`-ből).
- [ ] Automatikus őr: ESLint `no-restricted-imports` (vagy `import/no-restricted-paths`) szabály a
      `core/**` és a `shared/**` fájlokra, ami a `pages/` importot hibának jelzi — a `npm run lint`
      része, így a green gate megfogja a visszacsúszást.
- [ ] Viselkedés változatlan: a meglévő tesztek (áthelyezve) zöldek.

## Terv / döntési napló

- Tisztán szerkezeti refaktor; egy vagy több szeletben (pl. edzés-metrikák / étel / pénzügy / túra),
  mindegyik után zöld gate. Az ESLint-szabály az utolsó szeletben kapcsol be, amikor már nincs
  megsértő import.

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]] — „Rétegzés”: függőségi irány + lint-őr
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #178 core → pages importok megszüntetése
- Kód: `core/data/`, `core/notifications/`, `shared/` (vagy `core/<domain>/`), `pages/`, `eslint.config.*`
