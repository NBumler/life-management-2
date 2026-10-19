---
id: 182
type: bug
status: done
title: Túra — nincs töltésjelző az automatikus útvonaltervezés alatt
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 182 — Túra — nincs töltésjelző az automatikus útvonaltervezés alatt

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A végpont kiválasztása után a tervezés másodpercekig (offline ~30 s-ig, lásd
[[181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf]]) fut, és ezalatt a képernyőn semmi
nem változik: a „Válaszd ki a végpontot” felirat marad. A teszt közben ezért többször is
másodszor koppintottam — elsőre úgy tűnt, az app elnyeli a koppintást.

## Jelenlegi működés

`RouteSuggestionRepository.loading` signal létezik (`core/data/route-suggestion.repository.ts`),
de a `tura.page.html` automatikus módja nem jeleníti meg; a térképkoppintás tervezés közben is
fogadható.

## Elfogadási kritériumok

- [x] Tervezés közben látható töltésjelző (pl. spinner a tipp-sávban, i18n szöveggel hu + en).
- [x] Tervezés közbeni térképkoppintás nem indít új tervezést (vagy a futót egyértelműen lecseréli).
- [x] Unit / komponens teszt a `loading` megjelenítésére.

## Terv / döntési napló

- 2026-10-19 — megvalósítva: a tipp-sáv új `AutoRouteHintComponent`-be költözött
  (`pages/menu/tura/auto-route-hint.component.ts`, komponens-teszttel); tervezés közben
  `ion-spinner` + `TURA.AUTO_ROUTING` (hu + en) áll a tipp helyén, draft mellett is.
- Az ok nem csak a hiányzó jelző volt: az Automatikus gombban már volt egy apró spinner, de a
  `loading` jelzés után a helyi A* szinkron, a fő szálon futott, így a jelző ki sem rajzolódott.
  `RouteSuggestionRepository.suggest()` most egy képkockát kivár (`requestAnimationFrame` +
  `setTimeout`) a számítás előtt.
- A tervezés közbeni koppintás már eddig sem indított új tervezést (`handleAutoModeClick` őr).
- Emulátoron ellenőrizve: a „Planning the route…” sáv a végpont koppintása után azonnal megjelenik.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #180–#182
- Kód: `frontend/src/app/pages/menu/tura/auto-route-hint.component.ts` (+ spec), `tura.page.html`,
  `core/data/route-suggestion.repository.ts`, `assets/i18n/{hu,en}.json`.
