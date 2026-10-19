---
id: 188
type: bug
status: done
title: Túra — a napi szakaszok szintemelkedésének összege eltér a teljes útvonalétól
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 188 — Túra — a napi szakaszok szintemelkedésének összege eltér a teljes útvonalétól

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A „Teszt Pilis kor” mentett útvonal (2 nap): teljes ↑56,5 m / ↓93 m, a napoké
↑46,3 + 4,8 = **51,1 m** és ↓61,5 + 26,0 = **87,5 m** (adatbázisból kiolvasva). A táv összege
egyezik (906 + 1071 ≈ 1977 m).

## Jelenlegi működés

`tura.page.ts` `computeDaySegmentMetrics()` napszakaszonként külön hívja a metrika-számítást:
a 50 m-es DEM-mintavétel és a 2 m-es zajküszöb ([[176-kozos-dem-mintavetel-tura-bicikli]])
minden nap elején újraindul, ezért a határokon elvész / máshogy számolódik emelkedés.

## Elfogadási kritériumok

- [x] Döntés: a napi értékek a teljes útvonal egyetlen mintasorából, a napváltó pontoknál felosztva számolódnak (így az összeg pontosan a teljes érték), vagy az eltérés tudatos korlátként a specbe kerül.
- [x] Unit teszt: két napra bontott útvonal napi összegei = teljes érték (a választott megoldás szerint).

## Terv / döntési napló

- 2026-10-19 — döntés (felhasználó): **pontos felosztás**.
- Megvalósítva: `core/geo/route-metrics.ts` `splitRouteMetrics()` a teljes útvonal egyetlen
  magasság-mintasorán futtatja a zajküszöbös akkumulátort (közös `elevationSteps()` a
  `computeRouteMetrics`-szel), és minden elfogadott lépést abba a napba számol, amelyik szakaszára a
  mintája esik. A napi táv a napváltó pontok közötti hossz, az időtartam napi Naismith (naponként
  kerekítve, így az összeg ±1 percen belül egyezik). `RouteMetricsRepository.computeWithDays()`
  egyetlen magasság-lekéréssel adja a route- és a napi metrikát; a `TuraPage` mentéskor ezt használja
  napra bontott útvonalnál (korábban N külön lekérés).
- Tesztek: `route-metrics.spec.ts` (napi összeg = teljes; a régi, napi újraindítás eltér; napi táv és
  Naismith; sík útvonal; magasság nélkül `null`), `route-metrics.repository.spec.ts` (egy lekérés).
- Emulátoron mentett kétnapos útvonal (83,5 km), Postgresből kiolvasva: ↑ 189,23 + 151,87 = 341,10 m
  (teljes 341,10), ↓ 170,70 + 186,41 = 357,12 m (teljes 357,12), 502 + 534 = 1036 perc (teljes 1036),
  a táv is pontosan összeadódik.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #188
- Kód: `frontend/src/app/core/geo/route-metrics.ts`, `core/data/route-metrics.repository.ts` (+ specek), `pages/menu/tura/tura.page.ts`.
