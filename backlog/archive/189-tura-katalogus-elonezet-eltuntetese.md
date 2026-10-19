---
id: 189
type: change-request
status: done
title: Túra — az ajánlott túra előnézeti vonala nem tüntethető el
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 189 — Túra — az ajánlott túra előnézeti vonala nem tüntethető el

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Egy ajánlott túra előnézete után a cián vonal a térképen marad rajzolás,
automatikus tervezés és mentés közben is, és nincs vezérlő az eltüntetésére.

## Jelenlegi működés

`tura.page.ts` `previewedCuratedRoute` signal — `previewCuratedRoute()` beállítja, de nincs
felhasználói művelet, ami törli.

## Elfogadási kritériumok

- [x] Az előnézet eltüntethető (pl. bezáró gomb / tipp-sáv, vagy automatikusan, amikor a felhasználó rajzolni kezd) — a választott viselkedés a jegyben rögzítve.
- [x] Opcionálisan: az előnézetből „átvétel saját útvonalként”, ha a döntés így szól.

## Terv / döntési napló

- 2026-10-19 — döntés (felhasználó): mindhárom rész — automatikus eltüntetés, bezáró gomb **és** átvétel saját útvonalként.
- Megvalósítva: amíg az előnézet látszik, a fejlécben egy sáv mutatja a túra nevét (egy sorban, levágva), egy
  „Átvétel” és egy „Előnézet bezárása” gombbal (`TURA.PREVIEW.*`). A Rajzolás / Automatikus mód
  bekapcsolása az előnézetet eltünteti. Az átvétel a túra vonalát a rajzba teszi egy visszavonható lépésként
  (#190), a nevet kitölti, ha még üres, és a túra napváltóit (`days[].endWaypointIndex` / `overnightName`)
  napváltóként és kijelölt pontként veszi át — így a Napok panelen szerkeszthetők maradnak.
- Közben javítva: a sáv megjelenése lejjebb tolja a térképet, de az `ion-toolbar` aszinkron renderel, így az
  előnézet-vágás a régi magasságra igazított és a túra alja levágódott. A `fitBounds` most a térkép-konténer
  `ResizeObserver`-éből újrafut, amíg a felhasználó meg nem mozdítja a térképet.
- Emulátoron ellenőrizve: előnézet → a teljes túra látszik a sáv alatt; „Átvétel” → név + 2 nap, körrel csak a
  kezdőpont és a napváltó; egy visszavonás az egészet visszavonja (a név is törlődik); bezáró gomb; Rajzolás
  előnézet közben → eltűnik.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #189
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `assets/i18n/{hu,en}.json`.
