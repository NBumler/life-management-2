---
id: 189
type: change-request
status: backlog
title: Túra — az ajánlott túra előnézeti vonala nem tüntethető el
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 189 — Túra — az ajánlott túra előnézeti vonala nem tüntethető el

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Egy ajánlott túra előnézete után a cián vonal a térképen marad rajzolás,
automatikus tervezés és mentés közben is, és nincs vezérlő az eltüntetésére.

## Jelenlegi működés

`tura.page.ts` `previewedCuratedRoute` signal — `previewCuratedRoute()` beállítja, de nincs
felhasználói művelet, ami törli.

## Elfogadási kritériumok

- [ ] Az előnézet eltüntethető (pl. bezáró gomb / tipp-sáv, vagy automatikusan, amikor a felhasználó rajzolni kezd) — a választott viselkedés a jegyben rögzítve.
- [ ] Opcionálisan: az előnézetből „átvétel saját útvonalként”, ha a döntés így szól.

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #189
- Kód: <fő fájlok>
