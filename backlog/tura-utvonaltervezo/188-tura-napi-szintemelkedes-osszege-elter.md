---
id: 188
type: bug
status: backlog
title: Túra — a napi szakaszok szintemelkedésének összege eltér a teljes útvonalétól
specs: []
flag: menu.tura
created: 2026-10-19
closed:
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

- [ ] Döntés: a napi értékek a teljes útvonal egyetlen mintasorából, a napváltó pontoknál felosztva számolódnak (így az összeg pontosan a teljes érték), vagy az eltérés tudatos korlátként a specbe kerül.
- [ ] Unit teszt: két napra bontott útvonal napi összegei = teljes érték (a választott megoldás szerint).

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #188
- Kód: <fő fájlok>
