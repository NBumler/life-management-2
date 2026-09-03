---
id: 64
type: bug
status: done
title: Feature-flag route-guard hianyzik a gear menu al-route-fan
specs:
  - "[[GearCheck]]"
  - "[[Frontend]]"
flag:
created: 2026-09-03
closed: 2026-09-03
---

# 64 — Feature-flag route-guard hianyzik a gear menu al-route-fan

## Motiváció / probléma

A `#012` (shopping + tasks al-route guard) lezárásakor derült ki, hogy a
`/tabs/menu/gear` route-fa ugyanezt a hibát mutatja: a `menu.gearcheck` flag
csak a menü-csempét rejti (`menu.page.ts` → `gearCheckEnabled`), a route-fa
maga (`gear`, `gear/items`, `gear/templates*`, `gear/sessions*`) nincs
`featureFlagGuard('menu.gearcheck')` mögött, így deep linkkel a letiltott
feature elérhető marad. Minden testvér menü-route (`finance`, `aycm`, `steps`,
`shopping` a #012 után) a route-fa tetején guardolt.

Forrás: `#012` döntési napló (2026-09-03).

## Jelenlegi működés

`frontend/src/app/app.routes.ts` — a `menu` gyerek `gear` node-ján nincs
`canActivate`. A `featureFlagGuard` factory + a `finance` minta készen áll.

## Elfogadási kritériumok

- [x] `app.routes.ts`: `featureFlagGuard('menu.gearcheck')` a `gear` route-fa tetején
      (a `finance` / `aycm` / `shopping` minta); deep link letiltott flaggel → `/tabs/menu`.
- [x] `app.routes.spec.ts`: `gear` eset a meglévő táblázathoz (flag ki → `/tabs/menu`, be → aktiválható).
- [x] `npm run lint` + `npm run test:ci` + `npm run build` zöld.
- [x] [[GearCheck]] Frontend szakasz: a `menu.gearcheck` flag a csempét **és** a
      `/tabs/menu/gear` route-fát fedi; [[Frontend]] „Feature flag-ek → Mechanizmus" felsorolás bővítve.

## Terv / döntési napló

_Nincs — mechanikus, a #012-vel azonos minta egyetlen további route-fára._

## Lezáráskor (on-done)

- Frissített specek: [[GearCheck]] (Frontend szakasz), [[Frontend]] (ha a felsorolás bővül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #064 featureFlagGuard a gear menü-al-route-fán
- Kód: `frontend/src/app/app.routes.ts` (+ `app.routes.spec.ts`)
